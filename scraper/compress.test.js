/**
 * Fixture tests for the compressor's pure logic.
 *
 * WHY: everything that decides whether a model is asked, and whether a summary
 * she already has survives, lives in `decide()` and the matching functions. A
 * bug there is invisible — it looks like a slightly different description, not
 * like a failure — so it is exactly the kind of thing that must be pinned down
 * before it reaches a CSV.
 *
 * No network, no model, no files.  Run with:  npm test
 */
const test = require('node:test');
const assert = require('node:assert');

const {
  parseCsv, urlKey, titleKey, indexPrevious, findPrevious,
  decide, validateAnswer, normalizeRaw, addNote, MAX_WORDS, SKIP_NOTE,
  TRAVELLING_LOCATIONS, travellingKey, groupTravellingRuns,
} = require('./compress.js');

const row = (o = {}) => ({
  venue_code: 'ng', title: 'Renoir and Love', start_date: '', end_date: '',
  summary: '', url: 'https://www.nationalgallery.org.uk/exhibitions/renoir', notes: '', ...o,
});

// ── F: CSV parsing ───────────────────────────────────────────────────────────
// Curatorial text is full of commas, quotes and newlines. The scraper only
// writes CSV, so this parser is new code and gets checked.

test('F-001: a quoted cell keeps its commas', () => {
  const t = parseCsv('a,b\n1,"x, y"\n');
  assert.deepStrictEqual(t[1], ['1', 'x, y']);
});

test('F-002: a doubled quote is one literal quote', () => {
  const t = parseCsv('a\n"she said ""no"""\n');
  assert.strictEqual(t[1][0], 'she said "no"');
});

test('F-003: a newline inside quotes does not end the row', () => {
  const t = parseCsv('a,b\n1,"line one\nline two"\n');
  assert.strictEqual(t.length, 2);
  assert.strictEqual(t[1][1], 'line one\nline two');
});

// ── G: matching a row to the same exhibition last run ────────────────────────

test('G-001: a trailing slash is the same address', () => {
  assert.strictEqual(
    urlKey(row({ url: 'https://x.org/a/b/' })),
    urlKey(row({ url: 'https://x.org/a/b' })));
});

test('G-002: the host is case-insensitive, the path is not', () => {
  assert.strictEqual(urlKey(row({ url: 'https://X.ORG/a' })), urlKey(row({ url: 'https://x.org/a' })));
  assert.notStrictEqual(urlKey(row({ url: 'https://x.org/A' })), urlKey(row({ url: 'https://x.org/a' })));
});

test('G-003: the same slug at two venues is not the same exhibition', () => {
  assert.notStrictEqual(
    urlKey(row({ venue_code: 'ng', url: 'https://x.org/a' })),
    urlKey(row({ venue_code: 'acq', url: 'https://x.org/a' })));
});

test('G-004: a moved URL still matches on title — the case URL keys alone lose', () => {
  const before = row({ url: 'https://ng.org/exhibitions/renoir' });
  const after = row({ url: 'https://ng.org/exhibitions/past/renoir' });
  const found = findPrevious(indexPrevious([before]), after);
  assert.strictEqual(found, before);
});

test('G-005: same title at different venues never matches', () => {
  const ngRow = row({ venue_code: 'ng', url: '' });
  const acqRow = row({ venue_code: 'acq', url: '' });
  assert.strictEqual(findPrevious(indexPrevious([ngRow]), acqRow), null);
});

test('G-006: a repeated title within one venue is distinguished by its year', () => {
  const y25 = row({ title: 'Take One Picture 2025', url: '' });
  const y26 = row({ title: 'Take One Picture 2026', url: '' });
  assert.strictEqual(findPrevious(indexPrevious([y25]), y26), null);
});

test('G-007: URL wins over title when both are available', () => {
  const a = row({ title: 'Renoir and Love', url: 'https://ng.org/a' });
  const b = row({ title: 'Something Else', url: 'https://ng.org/a' });
  assert.strictEqual(findPrevious(indexPrevious([a]), b), a);
});

test('G-008: a row with no URL and no title matches nothing', () => {
  assert.strictEqual(findPrevious(indexPrevious([row()]), row({ url: '', title: '' })), null);
});

// ── H: the decision — when is a model asked at all ───────────────────────────

const RAW = 'Renoir gathered works around the theme of love, shown together for the first time.';

test('H-001: unchanged text reuses the previous wording and asks nobody', () => {
  const d = decide(row({ summary: RAW }), { raw: RAW, summary: 'Renoir gathered around the theme of love.' });
  assert.strictEqual(d.action, 'reuse');
  assert.strictEqual(d.summary, 'Renoir gathered around the theme of love.');
});

test('H-002: whitespace-only differences are not differences', () => {
  const d = decide(row({ summary: `  Renoir gathered works around the theme\n  of love, shown together for the first time.  ` }),
                   { raw: RAW, summary: 'Renoir gathered around the theme of love.' });
  assert.strictEqual(d.action, 'reuse');
});

test('H-003: changed text asks the model AND hands it the old wording', () => {
  const d = decide(row({ summary: 'Renoir sculptures around the theme of love.' }),
                   { raw: RAW, summary: 'Renoir gathered around the theme of love.' });
  assert.strictEqual(d.action, 'review');
  assert.strictEqual(d.summary, null);
  assert.strictEqual(d.previousSummary, 'Renoir gathered around the theme of love.');
});

test('H-004: an exhibition never seen before is written fresh, with no old wording', () => {
  const d = decide(row({ summary: RAW }), null);
  assert.strictEqual(d.action, 'fresh');
  assert.strictEqual(d.previousSummary, null);
});

test('H-005: no text this time but wording remembered — carried over, and SAID SO', () => {
  const d = decide(row({ summary: '' }), { raw: RAW, summary: 'Renoir gathered around the theme of love.' });
  assert.strictEqual(d.action, 'carried');
  assert.strictEqual(d.summary, 'Renoir gathered around the theme of love.');
  assert.match(d.note, /carried over/i);
});

test('H-006: no text and nothing remembered stays empty — the scraper already says why', () => {
  const d = decide(row({ summary: '' }), null);
  assert.strictEqual(d.action, 'empty');
  assert.strictEqual(d.summary, '');
});

test('H-007: a previous row that never got wording is not treated as memory', () => {
  // The previous run collected this exhibition but its summary was empty, so
  // there is nothing to reuse and the model must be asked.
  const d = decide(row({ summary: RAW }), { raw: RAW, summary: '' });
  assert.strictEqual(d.action, 'fresh');
});

// ── I: what may be written into the CSV ──────────────────────────────────────

test('I-001: a missing full stop is added — all 110 of her summaries have one', () => {
  assert.strictEqual(validateAnswer('Mexico’s landscape painter').text, 'Mexico’s landscape painter.');
});

test('I-002: an existing full stop is not doubled', () => {
  assert.strictEqual(validateAnswer('Mexico’s landscape painter.').text, 'Mexico’s landscape painter.');
});

test('I-003: over the word cap is refused, not truncated', () => {
  const long = Array.from({ length: MAX_WORDS + 1 }, (_, i) => `w${i}`).join(' ');
  const v = validateAnswer(long);
  assert.strictEqual(v.ok, false);
  assert.match(v.reason, /cap is/);
});

test('I-004: exactly the cap is allowed', () => {
  const at = Array.from({ length: MAX_WORDS }, (_, i) => `w${i}`).join(' ');
  assert.strictEqual(validateAnswer(at).ok, true);
});

test('I-005: empty and whitespace are refused', () => {
  assert.strictEqual(validateAnswer('').ok, false);
  assert.strictEqual(validateAnswer('   ').ok, false);
  // `null` is deliberately NOT here — see K-001. It means "this text is not a
  // description and I will not invent one", which is a decision, not a failure.
});

test('I-006: a line break is refused — it would break the CSV row', () => {
  assert.strictEqual(validateAnswer('two\nlines').ok, false);
});

// ── J: notes ─────────────────────────────────────────────────────────────────

test('J-001: a note joins whatever the scraper already wrote', () => {
  assert.strictEqual(addNote('No end date.', 'Carried over.'), 'No end date. Carried over.');
});

test('J-002: the same note is never added twice across re-runs', () => {
  const once = addNote('No end date.', 'Carried over.');
  assert.strictEqual(addNote(once, 'Carried over.'), once);
});

test('J-003: an empty note leaves the notes alone', () => {
  assert.strictEqual(addNote('No end date.', undefined), 'No end date.');
});

// ── K: text that should not be compressed at all (DEF-03's second net) ───────
// Acquavella's James Rosenquist row is the live case: its entire page text is
// "For installation website ... please visit: http://..." — a link, not a
// description. There must be a way to say so, because the only alternative is
// inventing one, and keeping the raw text in the record exists precisely to
// make invention impossible.

test('K-001: an explicit null is a recorded decision, not a failure', () => {
  const v = validateAnswer(null);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.skip, true);
  assert.strictEqual(v.text, '');
});

test('K-002: an empty string is still refused — it is not the same as null', () => {
  assert.strictEqual(validateAnswer('').ok, false);
  assert.strictEqual(validateAnswer('   ').ok, false);
});

test('K-003: undefined is refused — an unanswered row must never pass', () => {
  assert.strictEqual(validateAnswer(undefined).ok, false);
});

test('K-004: a remembered skip is not re-asked while the text is unchanged', () => {
  const raw = 'For installation website with interactive features, please visit: http://moma.org/f111';
  const d = decide(row({ summary: raw }), { raw, summary: '', skipped: true });
  assert.strictEqual(d.action, 'skipped');
  assert.strictEqual(d.summary, '');
  assert.strictEqual(d.note, SKIP_NOTE);
});

test('K-005: but if the venue writes something real, it IS asked again', () => {
  const d = decide(row({ summary: 'A survey of Rosenquist’s billboard-scale paintings.' }),
                   { raw: 'please visit: http://moma.org/f111', summary: '', skipped: true });
  assert.strictEqual(d.action, 'fresh');
});

test('K-006: a blank previous summary WITHOUT the skip note is not a skip', () => {
  // An ordinary empty summary means the page failed last time, not that a
  // decision was taken. Treating it as a skip would silence a real row forever.
  const raw = 'Renoir gathered works around the theme of love.';
  const d = decide(row({ summary: raw }), { raw, summary: '', skipped: false });
  assert.strictEqual(d.action, 'fresh');
});

// ── L: one exhibition, two cities ────────────────────────────────────────────
// Acquavella runs the same show in New York and Palm Beach. Both rows are kept
// — the scraper never de-duplicates — but if they end up with DIFFERENT
// summaries they read as two unrelated exhibitions on the approval cards.
//
// The first fix told the MODEL to notice the pair and match its own wording. It
// matched the words and carried Palm Beach's artist count (21) onto the New
// York row (17), so both rows became confidently wrong. Detecting the pair in
// code and asking once is what makes disagreement impossible.

const acq = (title) => ({ venue_code: 'acq', title });

test('L-001: the same show in two cities shares one identity', () => {
  assert.strictEqual(
    travellingKey(acq('PORTRAITURE: FROM CASSATT TO WARHOL NEW YORK')),
    travellingKey(acq('PORTRAITURE FROM CASSATT TO WARHOL PALM BEACH')));
});

test('L-002: punctuation between the two titles does not defeat it', () => {
  // The colon is the only difference besides the city, and it cost us before.
  assert.ok(travellingKey(acq('A B: C NEW YORK')));
  assert.strictEqual(travellingKey(acq('A B: C NEW YORK')), travellingKey(acq('A B C PALM BEACH')));
});

test('L-003: two different shows in the same city are not a pair', () => {
  assert.notStrictEqual(
    travellingKey(acq('TOM SACHS BRONZE NEW YORK')),
    travellingKey(acq('MATISSE THE PURSUIT OF HARMONY NEW YORK')));
});

test('L-004: a venue with one address is never grouped', () => {
  const rows = [{ venue_code: 'ng', title: 'Renoir and Love' },
                { venue_code: 'ng', title: 'Renoir and Love' }];
  assert.strictEqual(travellingKey(rows[0]), null);
  assert.strictEqual(groupTravellingRuns(rows).size, 0);
});

test('L-005: a title that is ONLY a city name is not an exhibition identity', () => {
  assert.strictEqual(travellingKey(acq('NEW YORK')), null);
});

test('L-006: a lone city run is not a group — it needs a second city', () => {
  assert.strictEqual(groupTravellingRuns([acq('PORTRAITURE NEW YORK')]).size, 0);
});

test('L-007: grouping finds the pair and leaves everything else alone', () => {
  const rows = [acq('PORTRAITURE: FROM CASSATT TO WARHOL NEW YORK'),
                acq('TOM SACHS BRONZE NEW YORK'),
                acq('PORTRAITURE FROM CASSATT TO WARHOL PALM BEACH'),
                { venue_code: 'ng', title: 'Renoir and Love' }];
  const g = groupTravellingRuns(rows);
  assert.strictEqual(g.size, 1);
  assert.strictEqual([...g.values()][0].length, 2);
});

test('L-008: the location list has not drifted from the scraper', () => {
  // compress.js deliberately does NOT require the scraper — that would drag
  // Playwright into a pure-text step — so the list is mirrored. This is the
  // only thing keeping the two honest: if they disagree, a travelling pair
  // gets two different summaries and nothing else notices.
  const { VENUES } = require('./sweep_prototype.js');
  for (const [code, locs] of Object.entries(TRAVELLING_LOCATIONS)) {
    assert.deepStrictEqual(locs, VENUES[code].locations,
      `compress.js TRAVELLING_LOCATIONS.${code} disagrees with the scraper`);
  }
});
