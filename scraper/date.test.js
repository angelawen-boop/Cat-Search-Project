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
  normalizeUrl, resolveHref, pickStructuredEvent, isoDay,
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

test('month and year only yields a start and a lookback bound, never a fake day', () => {
  const r = findDateRange('March / 2026');
  assert.strictEqual(r.start, '2026-03-01');
  assert.strictEqual(r.end, '');
  assert.strictEqual(r.latestYear, 2026);
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

test('the loose single-date rules still work on a listing card', () => {
  // Short string, one exhibition: Borghese's archive really does print this.
  assert.strictEqual(findDateRange('March / 2026').start, '2026-03-01');
  assert.strictEqual(findDateRange('Summer 2022').latestYear, 2022);
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
