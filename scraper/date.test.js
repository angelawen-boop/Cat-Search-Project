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
  expandYearArchive, listingPages, VENUES,
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
  // Only the venue's INSTALLATION label means a standing hang. A ROTATION is a
  // dated temporary show and must survive the lookback as one.
  assert.equal(VENUES.artic.excludeLabelled.test('COLLECTION ROTATION'), false,
    'a rotation must not be excluded as a permanent display');
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
