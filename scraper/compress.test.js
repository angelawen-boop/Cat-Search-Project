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
  decide, validateAnswer, normalizeRaw, addNote, MAX_WORDS, SKIP_NOTE, groupIdenticalRaw,
  TRAVELLING_LOCATIONS, travellingKey, groupTravellingRuns, mergeSeedMemory,
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

// ---------------------------------------------------------------------------
// ID-001 to ID-005 — IDENTICAL CURATORIAL TEXT IS ONE QUESTION.
//
// Stitching two machines' output into one file means a venue swept on both
// appears twice, carrying the same raw text. decide() already refuses to pay
// twice for identical text, but its memory is the PREVIOUS run, so it cannot
// see the copy beside it. On a double sweep that is most of the file.
//
// Asking twice is worse than wasteful: each row is one isolated question, so
// the model re-derives the answer knowing nothing of the one it just wrote and
// can word it differently — which then reaches her as a conflict to resolve.

const rawRow = (index, raw) => ({ index, raw, title: 't' + index, venue_code: 'louvre' });

test('ID-001: two rows with the same text are one group', () => {
  const g = groupIdenticalRaw([rawRow(1, 'Renoir gathered works on love.'),
                               rawRow(2, 'Renoir gathered works on love.')]);
  assert.equal(g.size, 1);
  assert.deepEqual([...g.values()][0].map(r => r.index), [1, 2]);
});

test('ID-002: a row with no twin is not a group', () => {
  const g = groupIdenticalRaw([rawRow(1, 'One.'), rawRow(2, 'Two.')]);
  assert.equal(g.size, 0);
});

test('ID-003: grouping survives whitespace, as reuse does', () => {
  // normalizeRaw is the same gate decide() uses, so the two cannot disagree
  // about whether a text has changed.
  const g = groupIdenticalRaw([rawRow(1, 'Renoir gathered works on love.'),
                               rawRow(2, '  Renoir gathered works\n  on love.  ')]);
  assert.equal(g.size, 1);
});

test('ID-004: empty text is never grouped', () => {
  // Those rows never reach the model, so grouping them would fold unrelated
  // rows together for no saving at all.
  const g = groupIdenticalRaw([rawRow(1, ''), rawRow(2, ''), rawRow(3, '   ')]);
  assert.equal(g.size, 0);
});

test('ID-005: it groups on TEXT, never on which exhibition it is', () => {
  // Deliberately different venues and titles. The question being answered is
  // only "what do these words say", so the answer is the same either way —
  // and this is what makes it safe: it is not a claim that two rows are the
  // same exhibition, which is the judgement that cost 29 NG exhibitions.
  const g = groupIdenticalRaw([
    { index: 1, raw: 'Same blurb.', title: 'A', venue_code: 'ng' },
    { index: 2, raw: 'Same blurb.', title: 'B', venue_code: 'met' },
  ]);
  assert.equal(g.size, 1);
});

// ── Her seed wording versus a previous run's ────────────────────────────────
// These pin down the failure found on 19 Sep — 13 Acquavella summaries she had
// written herself came back as proposed rewrites — AND the shape of the repair:
// hers replaces the compressor's only under --seed-wins, never as the standing
// rule, because a standing rule would revert every legitimate update forever.

const seedRow = (o = {}) => ({
  venue_code: 'acq', title: 'Tom Sachs: Bronze (New York)',
  start_date: '2025-05-01', end_date: '2025-06-20',
  url: 'https://www.acquavellagalleries.com/exhibitions/tom-sachs-bronze',
  raw: '', summary: 'New York. Bricolage in bronze.', fromSeed: true, ...o,
});
const runRow = (o = {}) => ({
  venue_code: 'acq', title: 'TOM SACHS BRONZE NEW YORK',
  start_date: '2025-05-01', end_date: '2025-06-20',
  url: 'https://www.acquavellagalleries.com/exhibitions/tom-sachs-bronze',
  raw: 'Sachs recasts canonical modern sculpture in bronze.',
  summary: 'Sachs recasts Picasso and Brâncuși sculptures in bronze.', ...o,
});

test('SM-001: her wording replaces a previous run\'s for the same exhibition', () => {
  const memory = indexPrevious([runRow()]);
  const res = mergeSeedMemory(memory, [seedRow()], { seedWins: true });
  assert.equal(res.overrode, 1);
  assert.equal(res.added, 0);
  assert.equal(findPrevious(memory, runRow()).summary, 'New York. Bricolage in bronze.');
});

test('SM-002: the RUN\'s raw text survives, so unchanged text is still a FREE reuse', () => {
  // This is the whole trick. Taking the seed wholesale would lose the raw text
  // and turn every seeded row into a model call; taking the run wholesale
  // loses her wording. One field from each.
  const memory = indexPrevious([runRow()]);
  mergeSeedMemory(memory, [seedRow()], { seedWins: true });
  const row = { ...runRow(), summary: runRow().raw };   // a sweep row: raw in `summary`
  const d = decide(row, findPrevious(memory, row));
  assert.equal(d.action, 'reuse');
  assert.equal(d.summary, 'New York. Bricolage in bronze.');
});

test('SM-003: changed text sends HER wording to be checked, not a model\'s', () => {
  const memory = indexPrevious([runRow()]);
  mergeSeedMemory(memory, [seedRow()], { seedWins: true });
  const row = { ...runRow(), summary: 'The venue has rewritten this page entirely.' };
  const d = decide(row, findPrevious(memory, row));
  assert.equal(d.action, 'review');
  assert.equal(d.previousSummary, 'New York. Bricolage in bronze.');
});

test('SM-004: a skip is cleared — she wrote a description, so there is one', () => {
  // `skipped` records a model deciding the page text was not a description.
  // Her having written one settles that question the other way.
  const memory = indexPrevious([runRow({ summary: '', skipped: true })]);
  mergeSeedMemory(memory, [seedRow()], { seedWins: true });
  const hit = findPrevious(memory, runRow());
  assert.equal(hit.skipped, false);
  assert.equal(hit.summary, 'New York. Bricolage in bronze.');
});

test('SM-005: an exhibition the run never saw is still ADDED, as before', () => {
  const memory = indexPrevious([]);
  const res = mergeSeedMemory(memory, [seedRow()]);
  assert.equal(res.added, 1);
  assert.equal(res.overrode, 0);
  assert.equal(findPrevious(memory, runRow()).summary, 'New York. Bricolage in bronze.');
});

test('SM-006: a RECYCLED address does not hand one edition the other\'s words', () => {
  // Same URL, runs a year apart. findPrevious refuses the match, so the seed
  // must not overwrite it — the guard that protects the rest of the memory has
  // to protect this path too.
  const memory = indexPrevious([runRow({ start_date: '2024-05-01', end_date: '2024-06-20',
                                         title: 'SOMETHING ELSE ENTIRELY' })]);
  const res = mergeSeedMemory(memory, [seedRow()], { seedWins: true });
  assert.equal(res.overrode, 0);
});

test('SM-007: identical wording is not counted as a restore', () => {
  const memory = indexPrevious([runRow({ summary: 'New York. Bricolage in bronze.' })]);
  assert.equal(mergeSeedMemory(memory, [seedRow()], { seedWins: true }).overrode, 0);
});

test('SM-008: BY DEFAULT the seed does NOT overrule the previous run', () => {
  // The standing behaviour, and the reason for it: where a venue rewords its
  // page the review half updates the summary, and a standing override would
  // reset the memory to her seed wording on the very next run and propose
  // changing it straight back — forever.
  const memory = indexPrevious([runRow()]);
  const res = mergeSeedMemory(memory, [seedRow()]);
  assert.equal(res.overrode, 0);
  assert.equal(findPrevious(memory, runRow()).summary,
               'Sachs recasts Picasso and Brâncuși sculptures in bronze.');
});

test('SM-009: by default the seed still FILLS A GAP the run knows nothing about', () => {
  const memory = indexPrevious([]);
  assert.equal(mergeSeedMemory(memory, [seedRow()]).added, 1);
});

// ── Putting the file back together ──────────────────────────────────────────
// The rebuild used to key finished rows by URL-or-title. Several rows can share
// one key, so the map kept the last and every colliding position received it.

const { rebuildInOrder } = require('./compress.js');
const marker = (v, what, url) => ({
  venue_code: v, title: '[' + what + ' page]', start_date: '', end_date: '',
  summary: '', url, notes: 'Could not be read. ' + SKIP_NOTE,
});

test('RB-001: every row comes back in its own position', () => {
  const raw = [row({ title: 'A' }), row({ title: 'B' }), row({ title: 'C' })];
  const out = rebuildInOrder(raw, [
    { ...raw[2], summary: 'third.', _row: 2 },
    { ...raw[0], summary: 'first.', _row: 0 },
  ]);
  assert.deepStrictEqual(out.map(r => r.title), ['A', 'B', 'C']);
  assert.deepStrictEqual(out.map(r => r.summary), ['first.', '', 'third.']);
});

test('RB-002: rows sharing ONE URL keep their own titles — the real bug', () => {
  // The Morgan's three unreadable listing pages all report the venue's base
  // address. Keyed by URL they collapsed to one and the coverage panel said
  // every page was the "past" page.
  const base = 'https://www.themorgan.org/exhibitions';
  const raw = [marker('morgan', 'current', base),
               marker('morgan', 'upcoming', base),
               marker('morgan', 'past', base)];
  const out = rebuildInOrder(raw, raw.map((r, i) => ({ ...r, _row: i })));
  assert.deepStrictEqual(out.map(r => r.title),
    ['[current page]', '[upcoming page]', '[past page]']);
});

test('RB-003: two rows with no URL and the same title stay separate', () => {
  // The title fallback collided too, and this one would lose an exhibition.
  const a = row({ title: 'Untitled', url: '', summary: 'one.' });
  const b = row({ title: 'Untitled', url: '', summary: 'two.' });
  const out = rebuildInOrder([a, b], [{ ...a, _row: 0 }, { ...b, _row: 1 }]);
  assert.deepStrictEqual(out.map(r => r.summary), ['one.', 'two.']);
});

test('RB-004: the row count out always equals the row count in', () => {
  const raw = [row({ title: 'A' }), row({ title: 'B' })];
  assert.equal(rebuildInOrder(raw, []).length, 2);
  assert.equal(rebuildInOrder(raw, [{ ...raw[0], _row: 0 }]).length, 2);
});

test('RB-005: a finished row with no position is ignored, never guessed at', () => {
  const raw = [row({ title: 'A' })];
  const out = rebuildInOrder(raw, [{ ...raw[0], summary: 'lost.' }]);
  assert.equal(out[0].summary, '');
});

test('RB-006: a position outside the file cannot write into it', () => {
  const raw = [row({ title: 'A' })];
  assert.equal(rebuildInOrder(raw, [{ ...raw[0], summary: 'x.', _row: 9 }]).length, 1);
  assert.equal(rebuildInOrder(raw, [{ ...raw[0], summary: 'x.', _row: -1 }])[0].summary, '');
});

// ---------------------------------------------------------------------------
// IT-001 to IT-010 — Italian titles, her rulings 23 and 24 Sep. The English
// title opens the description in HER format, written by CODE from plain
// strings; the model is never asked for format.

const IT = require('./compress.js');
const ITRAW = 'Una mostra omaggio dedicata a Carlo Maria Mariani nel museo.';
const capoRow = (o = {}) => ({ venue_code: 'capo', title: 'I Segni dei Tempi', url: 'https://c.it/a', summary: ITRAW, ...o });

test('IT-001: only the three Italian-titling venues are asked', () => {
  for (const v of ['capo', 'brera', 'uffizi']) assert.equal(IT.asksEnglishTitle({ venue_code: v }), true, v);
  // Borghese titles in English (24 Sep).
  for (const v of ['borghese', 'met', 'ng', 'tate-modern', 'louvre', 'acq']) assert.equal(IT.asksEnglishTitle({ venue_code: v }), false, v);
});

test('IT-002: code writes her format from two plain strings', () => {
  assert.equal(IT.composeSummary('Carlo Maria Mariani. Art Beyond Time', "Sixteen works spanning Mariani's fifty-year career."),
    'In English: "Carlo Maria Mariani. Art Beyond Time." Sixteen works spanning Mariani\'s fifty-year career.');
  // A title ending in its own ? or ! keeps it and gains no full stop.
  assert.equal(IT.composeSummary('Why Paint?', 'Painting questioned.'), 'In English: "Why Paint?" Painting questioned.');
  // No English title: the description alone.
  assert.equal(IT.composeSummary('', 'Armani at Brera.'), 'Armani at Brera.');
});

test('IT-003: a marked row answers with strings; the word cap is the description\'s', () => {
  const p = { englishTitle: true, action: 'fresh' };
  const r = IT.resolveAnswer({ summary: 'Lotto portrait amid fashion-history talks.', english: 'The Bergamask Guest. Lucina Brembati by Lorenzo Lotto. Capodimonte Is in Fashion' }, p);
  assert.equal(r.ok, true);
  assert.equal(r.text, 'In English: "The Bergamask Guest. Lucina Brembati by Lorenzo Lotto. Capodimonte Is in Fashion." Lotto portrait amid fashion-history talks.');
  assert.equal(IT.resolveAnswer({ summary: 'one two three four five six seven eight nine ten eleven.', english: 'Thirst' }, p).ok, false);
  // Already English: "" and the description alone.
  assert.equal(IT.resolveAnswer({ summary: 'Armani at Brera.', english: '' }, p).text, 'Armani at Brera.');
});

test('IT-004: formatting from the model is refused, never parsed', () => {
  const p = { englishTitle: true, action: 'fresh' };
  // The whole line written by the model — the 23 Sep shape.
  assert.equal(IT.resolveAnswer('In English: Thirst. — Fugazza on thirst.', p).ok, false);
  assert.equal(IT.resolveAnswer({ summary: 'In English: Thirst. — Fugazza.', english: '' }, p).ok, false);
  assert.equal(IT.resolveAnswer({ summary: 'Fugazza on thirst.', english: '"Thirst"' }, p).ok, false);
  // And on an unmarked row, an object or an "In English" line is refused.
  assert.equal(IT.resolveAnswer({ summary: 'x.', english: 'y' }, { action: 'fresh' }).ok, false);
  assert.equal(IT.resolveAnswer('In English: "Thirst." Fugazza.', { action: 'fresh' }).ok, false);
});

test('IT-005: a retitle row answers the English title only; the description is kept by code', () => {
  const p = { englishTitle: true, action: 'retitle', previousSummary: 'Mariani homage.' };
  assert.equal(IT.resolveAnswer({ english: 'The Signs of the Times' }, p).text, 'In English: "The Signs of the Times." Mariani homage.');
  assert.equal(IT.resolveAnswer({ english: '' }, p).text, 'Mariani homage.');
  // A summary handed back is refused: the description is not the model's to touch.
  assert.equal(IT.resolveAnswer({ english: 'X', summary: 'Mariani homage.' }, p).ok, false);
  assert.equal(IT.resolveAnswer(null, p).ok, false);
});

test('IT-006: unchanged text reuses the whole field, English title included — no model call', () => {
  const prev = { raw: ITRAW, summary: 'In English: "The Signs of the Times." Mariani homage.', titleJudged: true };
  const d = IT.decide(capoRow(), prev);
  assert.equal(d.action, 'reuse');
  assert.equal(d.summary, prev.summary);
});

test('IT-007: memory from before the rule is asked ONCE, at Italian venues only', () => {
  const old = { raw: ITRAW, summary: 'Mariani homage.', titleJudged: false };
  assert.equal(IT.decide(capoRow(), old).action, 'retitle');
  assert.equal(IT.decide(capoRow(), old).previousSummary, 'Mariani homage.');
  assert.equal(IT.decide(capoRow({ venue_code: 'ng' }), old).action, 'reuse');
  // Seed memory carries no mark at all, and must not be re-asked for it.
  assert.equal(IT.decide(capoRow(), { raw: ITRAW, summary: 'Mariani homage.' }).action, 'reuse');
});

test('IT-008: identical text under different Italian titles is NOT one question', () => {
  const rows = [capoRow({ title: 'A', index: 0 }), capoRow({ title: 'B', index: 1 })];
  assert.equal(IT.groupIdenticalRaw(rows).size, 0);
  const ng = [capoRow({ venue_code: 'ng', title: 'A' }), capoRow({ venue_code: 'ng', title: 'B' })];
  assert.equal(IT.groupIdenticalRaw(ng).size, 1);
});

test('IT-009: splitting reads her format, and recognises the withdrawn one', () => {
  assert.deepStrictEqual(IT.splitEnglishTitle('In English: "Thirst." Fugazza on thirst.'),
    { title: 'Thirst.', teaser: 'Fugazza on thirst.', old: false });
  assert.deepStrictEqual(IT.splitEnglishTitle('In English: Thirst. — Fugazza on thirst.'),
    { title: 'Thirst', teaser: 'Fugazza on thirst.', old: true });
  assert.deepStrictEqual(IT.splitEnglishTitle('Fugazza on thirst.'), { title: '', teaser: 'Fugazza on thirst.', old: false });
});

// ---------------------------------------------------------------------------
// MEM-001 to MEM-005 — memory sees EVERY finished compression, stitch_ folders
// included. Found 23 Sep: it saw only run_ folders, so the compression she
// imports — which lives in a stitch folder — was invisible to the next sweep,
// and a trial asked the model about 174 rows it had already answered.

const M = require('./compress.js');
const fsm = require('fs');
const os = require('os');
const pm = require('path');

function fakeOutput(folders) {
  const root = fsm.mkdtempSync(pm.join(os.tmpdir(), 'mem-'));
  for (const [name, files] of Object.entries(folders)) {
    fsm.mkdirSync(pm.join(root, name));
    for (const [f, rows] of Object.entries(files)) {
      const text = typeof rows === 'string' ? rows : null;
      if (text !== null) fsm.writeFileSync(pm.join(root, name, f), text);
      else M.writeCsv(pm.join(root, name, f), rows);
    }
  }
  return root;
}
const mrow = (o) => ({ venue_code: 'capo', title: 'Gaia Fugazza. Sete', url: 'https://c.it/sete', start_date: '', end_date: '', notes: '', ...o });

test('MEM-001: folder names on two clocks are put on one', () => {
  // run_ is Sydney wall-clock (UTC+10 in September), stitch_ is UTC.
  assert.equal(M.dirInstant('run_2026-09-13_142632'), Date.UTC(2026, 8, 13, 4, 26, 32));
  assert.equal(M.dirInstant('stitch_20260913_0442'), Date.UTC(2026, 8, 13, 4, 42));
  // And across daylight saving: January is UTC+11.
  assert.equal(M.dirInstant('run_2026-01-10_120000'), Date.UTC(2026, 0, 10, 1, 0, 0));
  assert.equal(M.dirInstant('archive'), null);
});

test('MEM-002: a stitch folder is memory, and its _clean file wins over the raw compression', () => {
  const root = fakeOutput({
    'run_2026-09-11_150556': { 'sweep.csv': [mrow({ summary: 'RAW' })], 'sweep_compressed.csv': [mrow({ summary: 'old words.' })] },
    'stitch_20260913_0442': {
      'sweep.csv': [mrow({ summary: 'RAW' })],
      'sweep_compressed.csv': [mrow({ summary: 'unrepaired.' })],
      'sweep_compressed_clean.csv': [mrow({ summary: 'In English: Gaia Fugazza. Thirst. — Fugazza on thirst.' })],
    },
  });
  const src = M.completedCompressions('run_2026-09-20_120000', root);
  assert.deepStrictEqual(src.map(s => `${s.dir}/${s.file}`),
    ['stitch_20260913_0442/sweep_compressed_clean.csv', 'run_2026-09-11_150556/sweep_compressed.csv']);
  const hit = M.findPrevious(M.loadMemory(src, root), mrow({ summary: 'RAW' }));
  // The 23 Sep line is never carried forward: its description is kept, its
  // English title dropped and asked again (IT-010).
  assert.equal(hit.summary, 'Fugazza on thirst.');
  assert.equal(hit.titleJudged, false);
});

test('MEM-003: nothing at or after the folder being compressed is memory', () => {
  const root = fakeOutput({
    'stitch_20260920_0000': { 'sweep.csv': [mrow({ summary: 'RAW' })], 'sweep_compressed.csv': [mrow({ summary: 'later.' })] },
    'run_2026-09-11_150556': { 'sweep.csv': [mrow({ summary: 'RAW' })] },   // swept, never compressed
  });
  assert.deepStrictEqual(M.completedCompressions('stitch_20260920_0000', root), []);
  assert.deepStrictEqual(M.completedCompressions('run_2026-09-15_000000', root), []);
});

test('MEM-004: two DIFFERENT raw texts for one address claim neither — review, never reuse', () => {
  const root = fakeOutput({
    'stitch_20260913_0442': {
      'sweep.csv': [mrow({ summary: 'first text' }), mrow({ summary: 'second text' })],
      'sweep_compressed_clean.csv': [mrow({ summary: 'Words.' })],
    },
  });
  const mem = M.loadMemory(M.completedCompressions('run_2026-09-20_000000', root), root);
  const d = M.decide(mrow({ summary: 'first text' }), M.findPrevious(mem, mrow({})));
  assert.equal(d.action, 'review');
});

test('MEM-005: the English-title marker covers only the files it names', () => {
  const root = fakeOutput({
    'stitch_20260913_0442': {
      'sweep.csv': [mrow({ summary: 'RAW' })],
      'sweep_compressed.csv': [mrow({ summary: 'Fugazza on thirst.' })],
      'sweep_compressed_clean.csv': [mrow({ summary: 'In English: "Gaia Fugazza. Thirst." Fugazza on thirst.' })],
      '.english_titles_v2': 'sweep_compressed_clean.csv\n',
    },
  });
  assert.equal(M.titleJudgedIn('stitch_20260913_0442', 'sweep_compressed_clean.csv', root), true);
  assert.equal(M.titleJudgedIn('stitch_20260913_0442', 'sweep_compressed.csv', root), false);
  const mem = M.loadMemory(M.completedCompressions('run_2026-09-20_000000', root), root);
  assert.equal(M.decide(mrow({ summary: 'RAW' }), M.findPrevious(mem, mrow({}))).action, 'reuse');
});

test('IT-010: a file judged under the 23 Sep marker is judged no longer', () => {
  const root = fakeOutput({
    'stitch_20260913_0442': {
      'sweep.csv': [mrow({ summary: 'RAW' })],
      'sweep_compressed_clean.csv': [mrow({ summary: 'In English: Gaia Fugazza. Thirst. — Fugazza on thirst.' })],
      '.english_titles': 'sweep_compressed_clean.csv\n',
    },
  });
  const mem = M.loadMemory(M.completedCompressions('run_2026-09-20_000000', root), root);
  const d = M.decide(mrow({ summary: 'RAW' }), M.findPrevious(mem, mrow({})));
  assert.equal(d.action, 'retitle');
  assert.equal(d.previousSummary, 'Fugazza on thirst.');
});

test('MEM-007: two sweeps of one address are told apart by swept_at', () => {
  // A stitch holds two sweeps; where their texts differ, the address alone
  // cannot say which one a description came from, but its sweep time can.
  const root = fakeOutput({
    'stitch_20260913_0442': {
      'sweep.csv': [mrow({ venue_code: 'ng', summary: 'first text', swept_at: '2026-09-11T05:00:00Z' }),
                    mrow({ venue_code: 'ng', summary: 'second text', swept_at: '2026-09-13T02:00:00Z' })],
      'sweep_compressed_clean.csv': [mrow({ venue_code: 'ng', summary: 'Words.', swept_at: '2026-09-13T02:00:00Z' })],
    },
  });
  const mem = M.loadMemory(M.completedCompressions('run_2026-09-20_000000', root), root);
  const ng = o => mrow({ venue_code: 'ng', ...o });
  assert.equal(M.decide(ng({ summary: 'second text' }), M.findPrevious(mem, ng({}))).action, 'reuse');
  assert.equal(M.decide(ng({ summary: 'first text' }), M.findPrevious(mem, ng({}))).action, 'review');
});

test('MEM-006: the compressor\'s clock is the sweeper\'s', () => {
  // compress.js must not require the scraper at runtime; this test is what
  // keeps the two copies of the time zone from drifting.
  assert.equal(M.RUN_TZ, require('./sweep_prototype.js').RUN_TZ);
});
