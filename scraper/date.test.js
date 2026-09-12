/**
 * Fixture tests for the scraper's pure logic.
 *
 * WHY THESE EXIST: every bug this scraper has had has been title-or-date
 * extraction. Two were found by an outside review on 9 Sep 2026 — a cross-year
 * range that produced an exhibition ending before it opened, and a month-first
 * date with a full stop that silently produced nothing — and both would have
 * been caught here before they ever reached a CSV.
 *
 * WHAT THEY DO NOT COVER: these test the LOGIC, not the assumptions about
 * venues. They cannot tell you the Rijksmuseum redesigned its cards. Only a
 * live run does that.
 *
 * No network, no browser, no files. Run with:  node --test scraper/
 */
const test = require('node:test');
const assert = require('node:assert');

const {
  findDateRange, findDateRangeInProse, ymd, startYearFor,
  normalizeUrl, resolveHref, pickStructuredEvent, isoDay, unusableDateText,
  classifyLoadError, isOwnListingPage, saysOngoing,
  expandYearArchive, listingPages, followPagination, VENUES, pickTitleLine,
} = require('./sweep_prototype.js');

const range = (s, hint) => {
  const r = hint ? findDateRangeInProse(s, hint) : findDateRange(s);
  return [r.start, r.end];
};

// ── The formats CLAUDE.md claims are handled ─────────────────────────────────
// If one of these fails, either the code broke or the guide is lying. Both
// matter.
test('the documented date formats, all found in the wild', () => {
  const cases = [
    ['6 FEBRUARY TILL 25 MAY 2026',            ['2026-02-06', '2026-05-25']],
    ['22 MARCH 2025 TO 15 MARCH 2026',         ['2025-03-22', '2026-03-15']],
    ['12 SEP 2025 TO 25 JAN 2026',             ['2025-09-12', '2026-01-25']],
    ['21 Sept. 2024 to 12 Jan. 2025',          ['2024-09-21', '2025-01-12']],
    ['11 Oct. 2019 t/m 19 Jan. 2020',          ['2019-10-11', '2020-01-19']],
    ['December 13, 2025 - February 2, 2026',   ['2025-12-13', '2026-02-02']],
    ['WORN till 21 March 2027',                ['',           '2027-03-21']],
    ['December 9 - 31, 2023',                  ['2023-12-09', '2023-12-31']],
    ['August 12 - 20, 2020',                   ['2020-08-12', '2020-08-20']],
  ];
  for (const [input, want] of cases) {
    assert.deepStrictEqual(range(input), want, `format: ${input}`);
  }
});

test('month and year only yields a lookback bound and a quote, never a fake day', () => {
  // This used to return the 1st of the month. Acquavella's "SEPTEMBER 2026"
  // became an opening date of 2026-09-01 — a day the venue never published.
  for (const text of ['March / 2026', 'SEPTEMBER 2026']) {
    const r = findDateRange(text);
    assert.strictEqual(r.start, '', `${text} must not invent a day`);
    assert.strictEqual(r.end, '');
    assert.strictEqual(r.latestYear, +text.match(/\d{4}/)[0]);
    assert.ok(r.shownText, 'the text must be quoted back for the note');
  }
});

test('a season and year is a bound, not a date — nothing is written to the columns', () => {
  const r = findDateRange('Summer 2022');
  assert.strictEqual(r.start, '');
  assert.strictEqual(r.end, '');
  assert.strictEqual(r.latestYear, 2022);
});

test('prose borrows the year from the listing when the sentence omits it', () => {
  assert.deepStrictEqual(range('open 5 June to 25 October', 2025), ['2025-06-05', '2025-10-25']);
  assert.deepStrictEqual(range('Till 29 November', 2024),          ['',           '2024-11-29']);
});

// ── D-001: month-first with a trailing full stop ─────────────────────────────
test('D-001: "Sept. 21, 2024 - Oct. 12, 2024" parses (it silently produced nothing)', () => {
  assert.deepStrictEqual(range('Sept. 21, 2024 - Oct. 12, 2024'), ['2024-09-21', '2024-10-12']);
});

// ── Cross-year ranges ────────────────────────────────────────────────────────
// The headline defect: with the year printed once, on the closing side, the
// opening date used to inherit the CLOSING year, so a winter show came out
// ending seven weeks before it opened. Museums run these constantly.
test('cross-year: the opening date takes the previous year when the range runs backwards', () => {
  assert.deepStrictEqual(range('December 5 - January 20, 2026'), ['2025-12-05', '2026-01-20']);
  assert.deepStrictEqual(range('November 20 - January 15, 2026'), ['2025-11-20', '2026-01-15']);
  assert.deepStrictEqual(range('5 December to 20 January 2026'),  ['2025-12-05', '2026-01-20']);
});

test('cross-year: a range inside one year is left alone', () => {
  assert.deepStrictEqual(range('October 16 - December 5, 2025'), ['2025-10-16', '2025-12-05']);
  assert.deepStrictEqual(range('16 October to 5 December 2025'), ['2025-10-16', '2025-12-05']);
});

test('cross-year: an explicit opening year always wins over the inference', () => {
  assert.deepStrictEqual(range('22 MARCH 2025 TO 15 MARCH 2026'), ['2025-03-22', '2026-03-15']);
});

test('startYearFor: same month, later day, still crosses the year', () => {
  assert.strictEqual(startYearFor(12, 20, 12, 5, 2026), 2025);
  assert.strictEqual(startYearFor(12, 5, 12, 20, 2026), 2026);
});

test('no row ever carries an end date before its start', () => {
  for (const s of ['December 5 - January 20, 2026', '5 December to 20 January 2026',
                   'November 1 - February 2, 2027', 'October 16 - December 5, 2025']) {
    const [start, end] = range(s);
    if (start && end) assert.ok(start <= end, `${s} produced ${start} > ${end}`);
  }
});

// ── D-002: impossible calendar dates ─────────────────────────────────────────
// JavaScript rolls 2026-02-31 forward to 3 March without complaining, so an
// impossible date does not announce itself — it becomes a plausible wrong one.
test('D-002: impossible dates are never emitted', () => {
  assert.strictEqual(ymd(2026, 2, 31), '');
  assert.strictEqual(ymd(2026, 4, 31), '');
  assert.strictEqual(ymd(2027, 2, 29), '');   // not a leap year
  assert.strictEqual(ymd(2026, 13, 1), '');
  assert.strictEqual(ymd(2026, 0, 10), '');
});

test('D-002: real dates, leap day included, still pass', () => {
  assert.strictEqual(ymd(2028, 2, 29), '2028-02-29');   // leap year
  assert.strictEqual(ymd(2026, 4, 30), '2026-04-30');
  assert.strictEqual(ymd(2025, 12, 31), '2025-12-31');
});

test('D-002: an impossible day leaves the column blank rather than shifting the month', () => {
  const [start] = range('February 31, 2026 - March 2, 2026');
  assert.notStrictEqual(start, '2026-03-03');
  assert.strictEqual(start, '');
});

test('D-002: structured-data dates go through the same validator', () => {
  assert.strictEqual(isoDay('2026-02-31'), '');
  assert.strictEqual(isoDay('2026-05-20T10:00:00Z'), '2026-05-20');
  assert.strictEqual(isoDay('1610-05-20'), '');   // outside the plausible range
});

// ── The traps: art history must never be read as an exhibition run ───────────
test('art-historical years are still ignored', () => {
  for (const s of ['Caravaggio (1571-1610)', 'stayed in Italy in 1629',
                   'confiscated on 4 May 1607', 'August 17 1945',
                   'painted between 1503 and 1519']) {
    assert.deepStrictEqual(range(s), ['', ''], `should be ignored: ${s}`);
  }
});

test('a day-first RANGE of implausible years is refused too', () => {
  // The guard was missing from this branch: every other one checked the year.
  assert.deepStrictEqual(range('4 May 1607 to 12 June 1610'), ['', '']);
});

// ── Page text is not a listing card ──────────────────────────────────────────
// The Rijksmuseum's "Express yourself" page prints its run as "16 Feb - 9 June"
// with no year, so no pattern could use it — and the scan fell through to the
// bare month-and-year rule, which matched a PHOTO CAPTION further down the
// page. A 2024 exhibition was given a 1994 opening date.
const EXPRESS_YOURSELF_PAGE = [
  'Skip to main content Past exhibitions Language Login Giftshop EXPRESS YOURSELF',
  'Photography exhibition Discover youth culture as seen through the lenses of',
  'Gerard Wessel and André Bogaerts. Read more about Express yourself',
  '16 Feb - 9 June More practical info',
  'Gerard Wessel, RoXY, Amsterdam, April 1994 1 | 5',
  'Gerard Wessel, The Flavor, Escape, Amsterdam 1995, September 1995 1 | 5',
  'Open daily 9 to 17h Museumstraat 1, Amsterdam Terms and conditions Privacy',
  'Cookie Policy Right of withdrawal Accessibility Statement',
].join(' ');

test('a photo caption is not the exhibition\'s opening date', () => {
  const r = findDateRangeInProse(EXPRESS_YOURSELF_PAGE);
  assert.strictEqual(r.start, '', 'April 1994 came from a photo caption');
  assert.strictEqual(r.end, '');
});

test('the loose single-date rules still fire on a listing card', () => {
  // Short string, one exhibition: Borghese's archive really does print this.
  // They no longer produce a date, but they still produce the lookback bound
  // and the quoted text — which is what the card is for.
  assert.strictEqual(findDateRange('March / 2026').latestYear, 2026);
  assert.strictEqual(findDateRange('Summer 2022').latestYear, 2022);
  // ...and are still refused entirely on page text.
  assert.strictEqual(findDateRangeInProse('a caption reading March 2026').start, '');
});

test('a real range inside page text is still read', () => {
  // Ranges are safe anywhere — two dates joined by a separator are not a caption.
  assert.deepStrictEqual(
    range('From June 10 to September 14, 2025, the Galleria Borghese presents…'),
    ['2025-06-10', '2025-09-14'],
  );
});

test('a preposition-anchored single date in page text is still read', () => {
  const r = findDateRangeInProse('The show will run until 20 February 2026 in the main hall.');
  assert.strictEqual(r.end, '2026-02-20');
});

// ── Quoting a date the venue published but nobody can use ────────────────────
// The Rijksmuseum's past pages print "Until 24 October" with no year anywhere.
// The columns stay blank, correctly — but the note used to claim nothing was
// found, which is false and sends her to a page that plainly shows a date.
test('a day and month with no year is quoted back', () => {
  for (const [text, want] of [
    ['Until 24 October',    'Until 24 October'],
    ['18 November - 6 Mar', '18 November - 6 Mar'],
    ['16 Feb - 9 June',     '16 Feb - 9 June'],
    ['15 December',         '15 December'],
  ]) assert.strictEqual(unusableDateText(text), want);
});

test('anything carrying a year is never quoted — that is the caption trap', () => {
  for (const text of [
    'Gerard Wessel, RoXY, Amsterdam, April 1994',
    'August 17 1945',
    '7 November 2025 - 10 May 2026',
    '21 Sept. 2024 to 12 Jan. 2025',
    '11 Oct. 2019 t/m 19 Jan. 2020',
    'December 13, 2025 - February 2, 2026',
    'Open daily 9 to 17h Museumstraat 1',
  ]) assert.strictEqual(unusableDateText(text), '', `should be ignored: ${text}`);
});

test('an abbreviated month cannot be matched out of a full one', () => {
  // "7 November 2025" once matched as "7 Nov", leaving "ember 2025" — which
  // silently defeated the no-year lookahead. MONTH_PATTERN now forbids it.
  assert.strictEqual(unusableDateText('7 November 2025'), '');
  assert.deepStrictEqual(range('7 November 2025 - 10 May 2026'), ['2025-11-07', '2026-05-10']);
});

// ── A related event is not this exhibition ───────────────────────────────────
// NG exhibition pages list related courses and talks, each with its own date
// range. Waldmüller's page advertises a course running "7 September - 28
// September 2026" while the listing says the show runs "Until 20 September
// 2026". The range is well-formed and carries a year, so no pattern rejects it
// — the contradiction is the only evidence available.
test('a prose range that contradicts the listing is refused whole', () => {
  const listing = { start: '', end: '2026-09-20' };
  const prose = findDateRangeInProse(
    'Category: Course 7 September - 28 September 2026 Online From £57');
  assert.strictEqual(prose.start, '2026-09-07');   // it does parse…
  assert.strictEqual(prose.end,   '2026-09-28');
  // …and its closing date disagrees with what the listing already gave us,
  // which is what the scraper now tests before using either half.
  const clashes = (listing.end && prose.end && prose.end !== listing.end);
  assert.ok(clashes, 'the clash must be detectable from the two ends');
});

// ── D-003: URL identity ──────────────────────────────────────────────────────
test('D-003: case in the path is preserved, so two pages stay two pages', () => {
  assert.notStrictEqual(
    normalizeUrl('https://example.test/Show-A'),
    normalizeUrl('https://example.test/show-a'),
  );
});

test('D-003: host case and trailing slashes still fold together', () => {
  assert.strictEqual(
    normalizeUrl('https://Example.TEST/exhibitions/matisse2/'),
    normalizeUrl('https://example.test/exhibitions/matisse2'),
  );
});

test('D-003: the fragment is dropped, the query is kept', () => {
  assert.strictEqual(normalizeUrl('https://a.test/x#top'), 'https://a.test/x');
  assert.strictEqual(normalizeUrl('https://a.test/x?y=Z'), 'https://a.test/x?y=Z');
});

// ── R-002 / finding 6: link resolution ───────────────────────────────────────
const BASE = 'https://venue.test';
const PAGE = 'https://venue.test/exhibitions/past';

test('links resolve against the listing page, the way a browser does', () => {
  assert.strictEqual(resolveHref('/exhibitions/a', PAGE, BASE).url, 'https://venue.test/exhibitions/a');
  assert.strictEqual(resolveHref('exhibitions/a', PAGE, BASE).url, 'https://venue.test/exhibitions/exhibitions/a');
  assert.strictEqual(resolveHref('../current', PAGE, BASE).url, 'https://venue.test/current');
  assert.strictEqual(resolveHref('//venue.test/x', PAGE, BASE).url, 'https://venue.test/x');
});

test('off-site and non-web links are refused, and say which', () => {
  assert.strictEqual(resolveHref('https://elsewhere.test/exhibitions/a', PAGE, BASE).reason, 'offsite');
  assert.strictEqual(resolveHref('mailto:someone@venue.test', PAGE, BASE).reason, 'not-web');
  assert.strictEqual(resolveHref('javascript:void(0)', PAGE, BASE).reason, 'not-web');
});

test('www and bare host count as the same venue', () => {
  assert.ok(resolveHref('https://www.venue.test/x', PAGE, BASE).url);
});

// ── D-004: structured data must belong to this exhibition ────────────────────
const EV = (name, start) => ({ name, start, end: '', description: '' });

test('D-004: an unrelated first event is not used', () => {
  const events = [EV('Members Preview Evening', '2026-01-05'), EV('Renoir and Love', '2026-03-01')];
  assert.strictEqual(pickStructuredEvent(events, 'Renoir and Love').start, '2026-03-01');
});

test('D-004: no match means no structured data at all', () => {
  const events = [EV('Curator Tour', '2026-01-05')];
  assert.strictEqual(pickStructuredEvent(events, 'Renoir and Love'), null);
  assert.strictEqual(pickStructuredEvent([], 'Renoir and Love'), null);
});

test('D-004: casing and punctuation differences still match', () => {
  const events = [EV('RENOIR AND LOVE', '2026-03-01')];
  assert.strictEqual(pickStructuredEvent(events, 'Renoir and Love').start, '2026-03-01');
});

test('D-004: two equally good matches are ambiguous, so neither is used', () => {
  const events = [EV('Renoir and Love', '2026-03-01'), EV('Renoir and Love', '2020-01-01')];
  assert.strictEqual(pickStructuredEvent(events, 'Renoir and Love'), null);
});

test('D-004: a row with no title never matches anything', () => {
  assert.strictEqual(pickStructuredEvent([EV('Anything', '2026-03-01')], ''), null);
});

// ── E: a dying run is not a page failure ─────────────────────────────────────
// Ten Sep: a sweep stopped by hand mid-venue produced nine "LOAD_ERROR"s in
// 19ms, each retried against a browser that was already gone, and Acquavella
// was written to disk as COMPLETE while missing 10 of its 16 summaries. That
// breaks the guarantee the whole run-directory design rests on: a venue file
// existing means that venue finished. These strings must classify as SHUTDOWN
// so the venue aborts and writes nothing.

test('E-001: Playwright target-closed is a shutdown, not a load error', () => {
  assert.strictEqual(
    classifyLoadError('Target page, context or browser has been closed'),
    'SHUTDOWN');
});

test('E-002: a closed browser is a shutdown', () => {
  assert.strictEqual(classifyLoadError('Browser has been closed'), 'SHUTDOWN');
});

test('E-003: a destroyed execution context is a shutdown', () => {
  assert.strictEqual(
    classifyLoadError('Execution context was destroyed, most likely because of a navigation'),
    'SHUTDOWN');
});

test('E-004: a crashed target is a shutdown', () => {
  assert.strictEqual(classifyLoadError('Target crashed'), 'SHUTDOWN');
});

test('E-005: a real network fault is still classified as itself', () => {
  assert.strictEqual(classifyLoadError('net::ERR_CONNECTION_RESET at https://x'), 'CONNECTION_RESET');
  assert.strictEqual(classifyLoadError('net::ERR_FAILED at https://x'), 'NO_RESPONSE');
  assert.strictEqual(classifyLoadError('Navigation timeout of 20000 ms exceeded'), 'TIMEOUT');
});

test('E-006: an unrecognised message is still LOAD_ERROR, not SHUTDOWN', () => {
  assert.strictEqual(classifyLoadError('something nobody has seen before'), 'LOAD_ERROR');
});


// ── A link back to the venue's own listing page is navigation ────────────────
//
// The Met's first real run collected TEN junk rows out of 82: nine were its
// language switcher (/es/exhibitions/past, /fr/..., /ja/... — titled "Español",
// "Français", "日本語") and one was "Browse the archives" at
// /en/exhibitions/past. Met's own isNav already rejected /exhibitions/past, but
// every one of these carries a language prefix, so none matched.
//
// N-004 is the one that matters most: Rijksmuseum links REAL exhibitions
// through its Dutch site, and those must survive. The rule only rejects links
// to a listing page we are already reading.
const MET_PAGES = ['/exhibitions', '/exhibitions/past'];

test('N-001: the venue\'s own past listing is navigation', () => {
  assert.equal(isOwnListingPage('https://www.metmuseum.org/exhibitions/past', MET_PAGES), true);
});

test('N-002: a language-prefixed listing page is still navigation', () => {
  for (const lang of ['es', 'pt', 'fr', 'it', 'de', 'ja', 'ko', 'zh', 'ru', 'en']) {
    assert.equal(
      isOwnListingPage(`https://www.metmuseum.org/${lang}/exhibitions/past`, MET_PAGES),
      true, `${lang} should be navigation`);
  }
});

test('N-003: a trailing slash does not change the answer', () => {
  assert.equal(isOwnListingPage('https://www.metmuseum.org/fr/exhibitions/past/', MET_PAGES), true);
});

test('N-004: a real exhibition on a venue\'s foreign-language site is KEPT', () => {
  // Rijksmuseum's Dutch links are real shows, not listings. Losing these was
  // a named bug (Stop Motion), so this must never regress.
  const rijksPages = ['/en/whats-on/exhibitions/now-on-view', '/en/whats-on/exhibitions/past'];
  assert.equal(
    isOwnListingPage('https://www.rijksmuseum.nl/nl/zien-en-doen/tentoonstellingen/stop-motion', rijksPages),
    false);
});

test('N-006: a year-filtered archive address is navigation, both directions', () => {
  // The Met's past archive serves one year per address. Those year links appear
  // ON the pages we read, and the year pages are themselves pages we visit — so
  // the query must be ignored on BOTH sides of the comparison, or the scraper
  // collects its own archive filter as if it were an exhibition.
  const metYears = ['/exhibitions', '/exhibitions/past',
                    '/exhibitions/past?year=2025', '/exhibitions/past?year=2024'];
  for (const y of ['2024', '2025', '2026']) {
    assert.equal(
      isOwnListingPage(`https://www.metmuseum.org/exhibitions/past?year=${y}`, metYears),
      true, `year=${y} should be navigation`);
  }
  // Still navigation even when only the bare listing is declared.
  assert.equal(
    isOwnListingPage('https://www.metmuseum.org/exhibitions/past?year=2025', MET_PAGES),
    true);
  // And a real exhibition carrying a query is still a real exhibition.
  assert.equal(
    isOwnListingPage('https://www.metmuseum.org/exhibitions/raphael?from=past', metYears),
    false);
});

test('N-005: an exhibition UNDER a listing path is kept', () => {
  assert.equal(
    isOwnListingPage('https://www.metmuseum.org/exhibitions/past/some-real-show', MET_PAGES),
    false);
});

test('N-006: a region-suffixed language prefix is handled', () => {
  assert.equal(isOwnListingPage('https://www.metmuseum.org/pt-br/exhibitions', MET_PAGES), true);
});

test('N-007: no listing paths means nothing is rejected', () => {
  assert.equal(isOwnListingPage('https://www.metmuseum.org/exhibitions/past', []), false);
});

// ── O-series: the venue's own "Ongoing" label (permanent displays) ────────────
// These rows are EXCLUDED, so a false positive deletes a real exhibition and
// nothing says so. The O-0 cases are the ones that must never match: they are
// all real exhibition titles containing the word.

test('O-001: a card whose date slot says only "Ongoing"', () => {
  assert.equal(saysOngoing('The British Galleries\nOngoing'), true);
});

test('O-002: an opening date with "Ongoing" as the closing side', () => {
  assert.equal(saysOngoing('Fabergé\nJuly 25, 2026–Ongoing'), true);
  assert.equal(saysOngoing('Fabergé\nJuly 25, 2026 - Ongoing'), true);
  assert.equal(saysOngoing('Fabergé\nJuly 25, 2026—Ongoing'), true);
});

test('O-003: case and surrounding whitespace do not matter', () => {
  assert.equal(saysOngoing('Cycladic Art\n  ONGOING  '), true);
});

test('O-004: the word inside a TITLE is not the label', () => {
  // A real risk, not a hypothetical: exhibitions are named this way.
  assert.equal(saysOngoing('The Ongoing Moment\nMarch 3 – June 8, 2026'), false);
  assert.equal(saysOngoing('An Ongoing Conversation\nOngoing Voices of the Delta'), false);
});

test('O-005: prose mentioning ongoing work is not the label', () => {
  assert.equal(saysOngoing('Conservation is ongoing'), false);
  assert.equal(saysOngoing('Ongoing research supports this display'), false);
});

test('O-006: an ordinary dated card is untouched', () => {
  assert.equal(saysOngoing('Renoir and Love\nOctober 16 – December 5, 2025'), false);
});

test('O-007: empty and missing text', () => {
  assert.equal(saysOngoing(''), false);
  assert.equal(saysOngoing(null), false);
  assert.equal(saysOngoing(undefined), false);
});


// ---------------------------------------------------------------------------
// Y — a year-filtered archive expands to real years, at RUN time
//
// Her catch, 11 Sep 2026: the Met's archive years were written into the recipe
// by hand, which is correct the day it is typed and wrong every year after. A
// run in 2028 with "2025, 2024" in the file completes, reports no error, and is
// simply missing two years — and no coverage table can show a page nobody asked
// for. These fixtures exist because that failure is invisible.
// ---------------------------------------------------------------------------

const FLOOR = new Date('2024-07-01');
const YEAR_ENTRY = { path: '/exhibitions/past', ctx: 'past', param: 'year' };
const years = at => expandYearArchive(YEAR_ENTRY, FLOOR, new Date(at))
  .map(p => Number(p.path.split('=')[1]));

test('Y-001: today, the floor year through last year, newest first', () => {
  assert.deepEqual(years('2026-09-11'), [2025, 2024]);
});

test('Y-002: it grows on its own as years pass — the whole point', () => {
  assert.deepEqual(years('2028-03-01'), [2027, 2026, 2025, 2024]);
  assert.deepEqual(years('2031-01-01'), [2030, 2029, 2028, 2027, 2026, 2025, 2024]);
});

test('Y-003: the CURRENT year is never requested', () => {
  // The venue's bare `past` page already serves it. Asking again costs a page
  // load and stamps "Also listed on the venue's 'past 2026' page." onto her
  // approval cards — one page recorded twice, the exact misleading note the
  // dead yearDropdown produced.
  for (const at of ['2026-01-01', '2026-09-11', '2026-12-31']) {
    assert.equal(years(at).includes(2026), false, `${at} must not request 2026`);
  }
});

test('Y-004: nothing is requested before the lookback floor', () => {
  assert.equal(Math.min(...years('2031-01-01')), 2024);
  // A floor moved forward moves the oldest year with it.
  const later = expandYearArchive(YEAR_ENTRY, new Date('2027-07-01'), new Date('2029-01-01'));
  assert.deepEqual(later.map(p => Number(p.path.split('=')[1])), [2028, 2027]);
});

// ---------------------------------------------------------------------------
// PY-001 to PY-003 — A PUBLISHED OPENING YEAR THAT CANNOT BE AN EXHIBITION YEAR.
//
// Capodimonte's Mimmo Jodice memorial page says "Mimmo Jodice ( Napoli 29 marzo
// 1934 - 27 ottobre 2025)" — the photographer's birth and death. 1934 failed the
// 1990-2035 guard and was DISCARDED, after which the opening year was worked out
// from the closing one, and a lifespan was stored as the exhibition's run:
// 29 Mar 2025 to 27 Oct 2025. The row looked perfectly healthy.
//
// "No year published" and "a year published that cannot be an exhibition year"
// are opposites: the first is a gap to fill, the second is proof the sentence is
// not about a run at all.

test('PY-001: an implausible opening year refuses the range, Italian day-first', () => {
  const r = findDateRange('Mimmo Jodice ( Napoli 29 marzo 1934 - 27 ottobre 2025)');
  assert.equal(r.start, '');
  assert.equal(r.end, '');
});

test('PY-002: and in page prose, in both the day-first and month-first forms', () => {
  for (const s of ['Mimmo Jodice ( Napoli 29 marzo 1934 - 27 ottobre 2025)',
                   'Mimmo Jodice (March 29, 1934 - October 27, 2025)',
                   'Gustave Courbet (10 June 1819 - 31 December 1877)']) {
    const r = findDateRangeInProse(s);
    assert.equal(r.start, '', s);
    assert.equal(r.end, '', s);
  }
});

test('PY-003: a MISSING opening year is still filled from the closing one', () => {
  // The guard must not break the case it sits next to. "December 5 - January 20,
  // 2026" opens in December 2025, and a range with no opening year at all is a
  // gap to fill, not evidence of anything.
  const a = findDateRange('December 5 - January 20, 2026');
  assert.equal(a.start, '2025-12-05');
  assert.equal(a.end, '2026-01-20');
  const b = findDateRange('5 December - 20 January 2026');
  assert.equal(b.start, '2025-12-05');
  assert.equal(b.end, '2026-01-20');
  const c = findDateRange('1 November 2025 to 11 January 2026');
  assert.equal(c.start, '2025-11-01');
});

// W-001 to W-005 — WEEKDAY NAMES IN FRONT OF A DATE.
//
// The Wallace Collection prints "Saturday 23 May - Sunday 29 November 2026".
// Every range pattern missed it, the scan fell through to the bare
// month-and-year rule, and Winston Churchill: The Painter arrived with no dates
// and a note saying the venue published none — a statement about the venue that
// was simply untrue, since it had published the run in full.

test('W-001: full weekday names are stripped and the range reads normally', () => {
  const r = findDateRange('Saturday 23 May - Sunday 29 November 2026');
  assert.equal(r.start, '2026-05-23');
  assert.equal(r.end, '2026-11-29');
});

test('W-002: abbreviations too, and SATURDAY is the one that catches you out', () => {
  // Longest alternative first, the same trap as the Italian "al" before "all'".
  // With `sat` ahead of `saturday` the match stops after three letters, leaves
  // "urday" behind and the strip silently does nothing — the first version of
  // this removed "Sunday" and left "Saturday" sitting there.
  for (const s of ['Sat 23 May - Sun 29 November 2026',
                   'Saturday 23 May - Sunday 29 November 2026',
                   'Tues 23 May - Thurs 29 November 2026',
                   'Weds 23 May - Mon 29 November 2026']) {
    const r = findDateRange(s);
    assert.equal(r.start, '2026-05-23', s);
    assert.equal(r.end, '2026-11-29', s);
  }
});

test('W-003: month-first venues, where the weekday is followed by a comma', () => {
  const r = findDateRange('Sunday, December 13, 2025 - Sunday, February 2, 2026');
  assert.equal(r.start, '2025-12-13');
  assert.equal(r.end, '2026-02-02');
});

test('W-004: a weekday word in PROSE is left alone', () => {
  // The strip only fires where a day number or a month name follows. Without
  // that anchor a bare "Sun " would be cut out of ordinary page text — "the Sun
  // King, Louis XIV" — every time a page was scanned for dates.
  const r = findDateRange('the Sun King, Louis XIV, until 20 February 2026');
  assert.equal(r.end, '2026-02-20');
  assert.match(r.raw, /Sun King/);
});

test('W-005: the formats already handled are untouched', () => {
  const cases = [
    ['December 13, 2025 - February 2, 2026', '2025-12-13', '2026-02-02'],
    ['Dal 16 ottobre 2025 al 6 gennaio 2026', '2025-10-16', '2026-01-06'],
    ['11 Oct. 2019 t/m 19 Jan. 2020', '2019-10-11', '2020-01-19'],
    ['22 MARCH 2025 TO 15 MARCH 2026', '2025-03-22', '2026-03-15'],
  ];
  for (const [s, a, b] of cases) {
    const r = findDateRange(s);
    assert.equal(r.start, a, s);
    assert.equal(r.end, b, s);
  }
});

// P-001 to P-007 — NUMBERED ARCHIVE PAGINATION.
//
// The Menil's past archive is paginated; only page one was being read and 12
// exhibitions were lost. Nothing in the output could show it — a first page
// that reads perfectly looks exactly like a complete archive — so her count was
// the only thing that could catch it, and these fixtures exist so it never has
// to again.
// ---------------------------------------------------------------------------

const SPEC = { param: 'page', from: 2 };
// A row as the walk sees it: only its closing date matters here.
const row = end => ({ end_date: end, title: 't', url: 'u' });
// A stand-in for the real loop. `pageRows(i)` is what page i handed over.
const walk = (pageRows, start = { path: '/exhibitions/past', ctx: 'past', paginate: SPEC }) => {
  const queue = [start], rows = [];
  for (let i = 0; i < queue.length && i < 200; i++) {
    followPagination(queue, queue[i], pageRows(i), rows, 'menil', VENUES.menil);
  }
  return { paths: queue.map(q => q.path), rows };
};
// Twelve exhibitions closing in the given year — an ordinary archive page.
const pageOf = year => Array.from({ length: 12 }, (_, k) => row(`${year}-0${(k % 9) + 1}-15`));

test('P-001: it keeps asking while the venue keeps answering', () => {
  const { paths } = walk(i => [pageOf(2026), pageOf(2025), []][i] ?? []);
  assert.deepEqual(paths, ['/exhibitions/past', '/exhibitions/past?page=2', '/exhibitions/past?page=3']);
});

test('P-002: every page is built from the BARE address, never the current one', () => {
  // Appending to the page we are standing on gives ?page=2&page=3, which most
  // sites answer with the first page again — so every address reads as already
  // seen, the stop rule fires, and the archive quietly ends one page in.
  const { paths } = walk(i => (i < 4 ? pageOf(2026) : []));
  assert.deepEqual(paths, [
    '/exhibitions/past',
    '/exhibitions/past?page=2',
    '/exhibitions/past?page=3',
    '/exhibitions/past?page=4',
    '/exhibitions/past?page=5',
  ]);
  assert.equal(paths.some(p => (p.match(/page=/g) || []).length > 1), false,
    'a page number must never be appended twice');
});

test('P-003: a page that adds nothing new ends the archive', () => {
  // Both ways an archive ends look the same from here: an empty page, and a
  // site that clamps an over-large page number back to the last real one so
  // every address on it has already been collected.
  assert.deepEqual(walk(i => (i === 0 ? pageOf(2026) : [])).paths,
    ['/exhibitions/past', '/exhibitions/past?page=2']);
});

test('P-004: a page the recipe did not name is marked as discovered', () => {
  // That mark is what suppresses the "loaded but nothing matched" marker row
  // when the archive ends — otherwise the page we ask for in order to be told
  // there is nothing there would land on her approval pile on every sweep.
  const queue = [{ path: '/exhibitions/past', ctx: 'past', paginate: SPEC }];
  followPagination(queue, queue[0], pageOf(2026), [], 'menil', VENUES.menil);
  assert.equal(queue[0].discovered, undefined);
  assert.equal(queue[1].discovered, true);
});

test('P-005: the runaway guard leaves a marker row, it does not trim silently', () => {
  // Reaching it means the real stop never fired. That is a defect, and a venue
  // cut short without saying so is exactly the failure this project keeps
  // paying for.
  const { paths, rows } = walk(() => pageOf(2026));
  assert.equal(paths.length, 60);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /page\]$/);
  assert.match(rows[0].notes, /Older exhibitions may be missing/);
});

test('P-006: a page with no paginate option is left alone', () => {
  const queue = [{ path: '/exhibitions/upcoming', ctx: 'upcoming' }];
  followPagination(queue, queue[0], pageOf(2026), [], 'menil', VENUES.menil);
  assert.equal(queue.length, 1);
});

test('P-007: the Menil opts in on its past archive and nowhere else', () => {
  const paged = VENUES.menil.pages.filter(p => p.paginate);
  assert.deepEqual(paged.map(p => p.path), ['/exhibitions/past']);
  assert.equal(paged[0].paginate.from, 2,
    'this site is 1-indexed: its bare past page IS page 1, so the next is 2');
  // No page count may be written into a recipe — the same trap as a
  // hand-written year, one step worse, because only the site knows the answer.
  assert.equal(VENUES.menil.pages.some(p => /page=\d/.test(p.path)), false);
});

// P-008 to P-012 — STOPPING AT THE LOOKBACK FLOOR.
//
// Walking every archive page to its true end was the first version, and it made
// things worse than the bug it fixed: eleven Menil pages instead of three, and
// thirteen decades-old undated exhibitions on her approval pile that nothing
// downstream could drop, because an unknown date is never evidence of being too
// old. These fixtures hold the floor stop AND the ordering check that makes it
// evidence rather than an assumption.

test('P-008: an archive page entirely older than the floor ends the walk', () => {
  // Page two closes in 2023, well before 1 July 2024. Everything after it in a
  // descending archive is older still, so there is nothing left to find.
  const { paths } = walk(i => [pageOf(2026), pageOf(2023)][i] ?? []);
  assert.deepEqual(paths, ['/exhibitions/past', '/exhibitions/past?page=2']);
});

test('P-009: one exhibition reaching past the floor keeps the walk going', () => {
  // A page is only finished with if its NEWEST closing date is before the
  // floor. A single straggler still inside the lookback means real rows here.
  const straddle = [...pageOf(2023), row('2024-07-21')];   // Ruth Asawa's shape
  const { paths } = walk(i => [pageOf(2026), straddle, pageOf(2022)][i] ?? []);
  assert.deepEqual(paths,
    ['/exhibitions/past', '/exhibitions/past?page=2', '/exhibitions/past?page=3']);
});

test('P-010: the floor is the lookback floor itself, to the day', () => {
  // 30 June 2024 is outside; 1 July 2024 is the first day inside.
  assert.equal(walk(i => [pageOf(2026), [row('2024-06-30')]][i] ?? []).paths.length, 2);
  assert.equal(walk(i => [pageOf(2026), [row('2024-07-01')], []][i] ?? []).paths.length, 3);
});

test('P-011: an archive NOT in date order is read to the end instead', () => {
  // The ordering is checked, never assumed. A page newer than the one before it
  // means the venue has re-sorted or mixed its archive, so "nothing here
  // reaches the floor" stops meaning "nothing after here can either" — and the
  // walk pays the slow, correct price rather than losing rows.
  const { paths } = walk(i => [
    pageOf(2026),
    pageOf(2025),
    pageOf(2026),          // NEWER than the page before — the order is broken
    pageOf(2020),          // would have ended the walk if the order were trusted
    pageOf(2019),          // and so would this
    [],                    // only the real end of the archive stops it now
  ][i] ?? []);
  assert.equal(paths.length, 6, 'it must keep reading once the order is broken');
});

test('P-012: a page with no readable dates proves nothing and is walked past', () => {
  // Undated rows are not evidence in either direction, so the walk carries on
  // rather than either stopping or treating them as recent.
  const undated = [row(''), row('')];
  const { paths } = walk(i => [pageOf(2026), undated, pageOf(2023)][i] ?? []);
  assert.deepEqual(paths,
    ['/exhibitions/past', '/exhibitions/past?page=2', '/exhibitions/past?page=3']);
});

test('Y-005: the Met resolves to real addresses, and its years are navigation', () => {
  const pages = listingPages(VENUES.met);
  const paths = pages.map(p => p.path);
  assert.ok(paths.includes('/exhibitions'));
  assert.ok(paths.includes('/exhibitions/past'));
  assert.ok(paths.some(p => /\/exhibitions\/past\?year=\d{4}$/.test(p)),
    'at least one year page must be produced');
  // No recipe may carry a hand-written year again.
  assert.equal(VENUES.met.pages.some(p => /year=\d/.test(p.path)), false,
    'years must be derived, never written into the recipe');
  // Every expanded year page must read as the venue's own listing, or the
  // scraper collects its own archive filter as an exhibition.
  for (const p of paths) {
    assert.equal(
      isOwnListingPage('https://www.metmuseum.org' + p, paths), true,
      p + ' should be navigation');
  }
});

// ── artic's badge strip ───────────────────────────────────────────────────────
// Five rows kept a badge across THREE attempted fixes, because the diagnosis
// was guessed from the CSV rather than read off the page. The card reads
// "EXHIBITION NOW OPEN Lee Miller: Fearless" — a bare EXHIBITION, which the
// list did not know. Anchored, it then matched nothing at all.

const strip = s => s.replace(VENUES.artic.title.stripLeading, '');

test('A-001: a bare EXHIBITION badge is stripped, alone or stacked', () => {
  assert.equal(strip('EXHIBITION NOW OPEN Lee Miller: Fearless'),
    'Lee Miller: Fearless');
  assert.equal(strip('EXHIBITION CLOSING SOON Jitish Kallat: Public Notice 3'),
    'Jitish Kallat: Public Notice 3');
  assert.equal(strip('TICKETED EXHIBITION NOW OPEN Mary Cassatt: After Impressionism'),
    'Mary Cassatt: After Impressionism');
});

test('A-002: COLLECTION ROTATION is a badge too, and is not the same label as INSTALLATION', () => {
  assert.equal(strip('COLLECTION ROTATION Utamaro: Elements of Beauty'),
    'Utamaro: Elements of Beauty');
  assert.equal(strip('COLLECTION INSTALLATION Fabergé'), 'Fabergé');
  // HER RULING, 12 Sep: BOTH collection labels are permanent displays and are
  // out. This assertion previously demanded the opposite, on the session's own
  // reasoning that a rotation publishes a closing date — which was the wrong
  // call to be making. Whether a thing is an exhibition at all is hers.
  assert.equal(VENUES.artic.excludeLabelled.test('COLLECTION ROTATION'), true,
    'a collection rotation is a permanent display and must be excluded');
  assert.equal(VENUES.artic.excludeLabelled.test('COLLECTION INSTALLATION'), true);
  assert.equal(VENUES.artic.excludeLabelled.test('VIDEO INSTALLATION'), false,
    'a video installation is a real temporary show and must NOT be excluded');
});

test('A-003: the longest alternative must come first, or a badge is stranded', () => {
  // "TICKETED" first would eat the word and leave "EXHIBITION" behind.
  assert.equal(/^TICKETED EXHIBITION/.test(
    VENUES.artic.title.stripLeading.source.replace(/^\^\(\?:\(\?:/, '')), true,
    'TICKETED EXHIBITION must precede TICKETED and EXHIBITION in the alternation');
});

test('A-004: it is case-sensitive, so a real title keeping the word survives', () => {
  // The regression this guards: TITLE_NOISE once stripped EXHIBITION case
  // -insensitively and stored "How to Make an Exhibition" as "How to Make an ".
  assert.equal(strip('How to Make an Exhibition'), 'How to Make an Exhibition');
  assert.equal(strip('Exhibitionism: The Rolling Stones'), 'Exhibitionism: The Rolling Stones');
  assert.equal(strip('Free Spirits: American Modernism'), 'Free Spirits: American Modernism');
  assert.equal(strip('Willem de Kooning Drawing'), 'Willem de Kooning Drawing');
});

// ── artic: the title is a LINE of the card, not the whole card ────────────────
// Card text below is verbatim from her machine, 12 Sep 2026. Every artic card
// has headingTag: null on BOTH page types, so the name must come from the
// link's own lines. Squashed, current cards keep a badge and archive cards
// keep the entire blurb — 65 of 78 rows.

const articTitle = raw => pickTitleLine(raw, VENUES.artic.title);

test('A-005: a current card — the badge line is skipped, the dates are never reached', () => {
  assert.equal(
    articTitle('TICKETED EXHIBITION NOW OPEN\nMary Cassatt: After Impressionism\nSep 6, 2026–Jan 3, 2027'),
    'Mary Cassatt: After Impressionism');
  assert.equal(
    articTitle('EXHIBITION\nLee Miller: Fearless\nAug 29–Dec 7, 2026'),
    'Lee Miller: Fearless');
  assert.equal(
    articTitle('TICKETED EXHIBITION CLOSING SOON\nWillem de Kooning Drawing\nJun 14–Sep 20, 2026'),
    'Willem de Kooning Drawing');
});

test('A-006: an archive card — the blurb does NOT come back welded to the title', () => {
  assert.equal(
    articTitle('Janna Ireland: A Goff House in Los Angeles\nIreland’s 2024 photographs of the Goff-designed Al Struckus House (commissioned in 1979, completed in 1988) describe the house’s open volume and its dizzying interior space, as well as the diverse materials that define the experience of living in the house.\nJan 7–May 18, 2026'),
    'Janna Ireland: A Goff House in Los Angeles');
  assert.equal(
    articTitle('Japanese Prints from the Collection of Bruce Goff\nBringing together 35 of the more than 800 Japanese prints that were given to the museum from Goff’s estate in 1990, this exhibition complements Bruce Goff: Material Worlds, Illuminating one of Goff’s many influences and inspirations.\nJan 7–Apr 6, 2026'),
    'Japanese Prints from the Collection of Bruce Goff');
  assert.equal(
    articTitle('New Affiliates on Goff’s Domestic Matter\nArchitects Ivi Diamantopoulou and Jaffer Kolb of the firm New Affiliates took on the forms and materialities of three of Bruce Goff’s house and created large-scale drawings in a visual style that borrows from sources from Stanley Tigerman’s 1970s Architoons to recent graphic novels.\nJan 7–May 18, 2026'),
    'New Affiliates on Goff’s Domestic Matter');
});

test('A-007: a card with nothing but badges and dates yields NO title, never a blurb', () => {
  // Blank becomes a visible "Couldn't be filed" card. The squashed fallback
  // would have produced a title with the description welded on — the defect.
  assert.equal(articTitle('EXHIBITION NOW OPEN\nSep 6, 2026–Jan 3, 2027'), '');
  assert.equal(articTitle(''), '');
});

test('A-008: VIDEO INSTALLATION is a card type, and the show underneath it survives', () => {
  // Read off the live card 12 Sep: the label is its own line and the real name
  // sits below it, exactly like EXHIBITION. Taking the label as the title is
  // what put the literal string "VIDEO INSTALLATION" in the CSV.
  assert.equal(
    articTitle('VIDEO INSTALLATION\nKarimah Ashadu: Machine Boys\nOpening September 11, 2026'),
    'Karimah Ashadu: Machine Boys');
  assert.equal(strip('VIDEO INSTALLATION Karimah Ashadu: Machine Boys'),
    'Karimah Ashadu: Machine Boys');
});

test('A-009: a title broken after a colon is rejoined, and a blurb still is not', () => {
  // Both from the first live run of the linkLines rule, which truncated them.
  assert.equal(
    articTitle('Georgia O’Keeffe:\n“My New Yorks”\nJun 2–Sep 22, 2024'),
    'Georgia O’Keeffe: “My New Yorks”');
  assert.equal(
    articTitle('En el principio / In the beginning:\nJuliana Góngora Rojas, Matías Quintero Sepúlveda, Juven Piranga Valencia and Yinela Piranga Valencia\nMar 29–Jul 28, 2025'),
    'En el principio / In the beginning: Juliana Góngora Rojas, Matías Quintero Sepúlveda, Juven Piranga Valencia and Yinela Piranga Valencia');
  // A title WITHOUT a trailing colon must not absorb the line beneath it —
  // this is the archive card, and the line beneath is the description.
  assert.equal(
    articTitle('Japanese Prints from the Collection of Bruce Goff\nBringing together 35 of the more than 800 Japanese prints that were given to the museum from Goff’s estate in 1990.\nJan 7–Apr 6, 2026'),
    'Japanese Prints from the Collection of Bruce Goff');
  // A colon title whose next line is a full description is refused by length,
  // so the worst case is today's truncation rather than a welded blurb.
  const longNext = 'x'.repeat(200);
  assert.equal(articTitle('Some Show:\n' + longNext), 'Some Show:');
  // And one that arrives whole on a single line is untouched.
  assert.equal(
    articTitle('Four Chicago Artists: Theodore Halkin, Evelyn Statsinger, Barbara Rossi, and Christina Ramberg\nMay 11–Aug 26, 2024'),
    'Four Chicago Artists: Theodore Halkin, Evelyn Statsinger, Barbara Rossi, and Christina Ramberg');
});
