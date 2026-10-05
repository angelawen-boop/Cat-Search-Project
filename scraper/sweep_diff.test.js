// SWEEP DIFF — each case is a mistake the 5 Oct unattended report made, now
// answered by code. Built on diffVenue() with rows made here; no run on disk.
const assert = require('assert');
const { test } = require('node:test');
const D = require('./sweep_diff.js');

const row = o => ({ venue_code:'v', title:'', start_date:'', end_date:'', summary:'text', url:'', notes:'', swept_at:'2026-10-04T15:00:00Z', ...o });
const MARK = 'Marker row, not an exhibition.';
const log = (excluded = {}, links = {}) => ({
  excluded: new Map(Object.entries(excluded)),
  linksSeen: new Map(Object.entries(links).map(([v, m]) => [v, new Map(Object.entries(m))])),
});
const prev = rows => ({ run: 'run_2026-09-13_142632', rows });

test('SD-001: a row the log says was excluded by a ruling is explained, not "turnover" (Tate Britain 5 Oct)', () => {
  const p = [row({ title:'Tate Britain Commission: Alvaro Barrington: Grace', url:'https://t/ab', end_date:'2025-01-26' })];
  const out = D.diffVenue('v', [], prev(p), log({ v: [{ reason:'not a temporary exhibition (venue rule)', title:'Commission: Alvaro Barrington: Grace' }] }));
  assert.strictEqual(out.gone.length, 1);
  assert.ok(out.gone[0].proven);
  assert.match(out.gone[0].cause, /venue rule/);
});

test('SD-002: a row that left with no cause in the run is UNEXPLAINED', () => {
  const out = D.diffVenue('v', [], prev([row({ title:'Mystery', url:'https://t/m', end_date:'2027-01-01' })]), log());
  assert.strictEqual(out.gone[0].cause, 'UNEXPLAINED');
  assert.strictEqual(out.gone[0].proven, false);
});

test('SD-003: the same name at a new address is MOVED, never gone-plus-new (Rijksmuseum 5 Oct)', () => {
  const out = D.diffVenue('v',
    [row({ title:'Fiep Westendorp', url:'https://r/past/fiep' })],
    prev([row({ title:'FIEP WESTENDORP', url:'https://r/fiep' })]), log());
  assert.strictEqual(out.moved.length, 1);
  assert.strictEqual(out.gone.length, 0);
  assert.strictEqual(out.added.length, 0);
});

test('SD-004: two addresses with one name are reported as kept by design, not as a duplicate to remove', () => {
  const out = D.diffVenue('v', [row({ title:'Ed van der Elsken', url:'https://r/a' }), row({ title:'Ed van der Elsken', url:'https://r/b' })], null, log());
  assert.strictEqual(out.sameName.length, 1);
});

test('SD-005: an old opening date with no closing date is KEPT BY RULE, not "outside the lookback" (Acquavella 5 Oct)', () => {
  const out = D.diffVenue('v', [row({ title:'Rosenquist', start_date:'2012-01-26', url:'https://a/r' })], null, log());
  assert.strictEqual(out.keptNoEnd.length, 1);
  const both = D.diffVenue('v', [row({ title:'Old', start_date:'2012-01-26', end_date:'2012-05-01', url:'https://a/o' })], null, log());
  assert.strictEqual(both.keptNoEnd.length, 0);
});

test('SD-006: a lost description says why, read from the row\'s note (Louvre 5 Oct)', () => {
  const note = "Found on the venue's \"past\" listing page. This exhibition's own page could not be read: the venue’s site refused us (HTTP 403).";
  const out = D.diffVenue('v', [row({ title:'Olympism', url:'https://l/o', summary:'', notes:note })],
    prev([row({ title:'OLYMPISM', url:'https://l/o', summary:'had text' })]), log());
  assert.strictEqual(out.lostSummary.length, 1);
  assert.match(out.lostSummary[0].why, /HTTP 403/);
});

test('SD-007: a closed show leaving a venue that reads no past listing is explained; one that DOES read past is not', () => {
  const p = [row({ title:'Canaletto', url:'https://k/c', end_date:'2026-09-06', notes:'Found on the venue\'s "current" listing page.' })];
  assert.match(D.diffVenue('v', [], prev(p), log(), '2026-10-05').gone[0].cause, /reads no past listing/);
  const pastToo = [...p, row({ title:'Older', url:'https://k/o', end_date:'2025-01-01', notes:'Found on the venue\'s "past" listing page.' })];
  const now = [row({ title:'Older', url:'https://k/o', end_date:'2025-01-01', notes:'Found on the venue\'s "past" listing page.' })];
  assert.strictEqual(D.diffVenue('v', now, prev(pastToo), log(), '2026-10-05').gone[0].cause, 'UNEXPLAINED');
});

test('SD-008: a listing page that brought rows last time and a marker now is named, with the log\'s link count or failure', () => {
  const p = [row({ title:'A', url:'https://k/a', notes:'Found on the venue\'s "current" listing page.' })];
  const now = [row({ title:'[current page]', url:'https://k/ex', notes:`The venue's "current" listing page loaded but no exhibitions could be read from it. ${MARK}` })];
  const out = D.diffVenue('v', now, prev(p), log({}, { v: { current: 0 } }));
  assert.strictEqual(out.emptiedPages.length, 1);
  assert.strictEqual(out.emptiedPages[0].linksSeen, 0);
});

test('SD-009: junk patterns flag the 5 Oct junk and leave real descriptions alone', () => {
  assert.deepStrictEqual(D.junkIn("Explore the themes of 'Renoir and Love' further in the catalogue that accompanies the exhibition."), ['catalogue sales line']);
  assert.ok(D.junkIn('Ansel Adams (American, 1902–1984), The Tetons and the Snake River, 1942, gelatin silver print').includes('picture caption'));
  assert.ok(D.junkIn('Comitato scientifico: Alessandro Ballarin, Francesco Frangi').includes('credit or sponsor line'));
  // Real descriptions that tripped the first draft of the patterns:
  assert.deepStrictEqual(D.junkIn('This presentation featured 27 works from a gift to the museum by the Cy Twombly Foundation. The Gift of Drawing'), []);
  assert.deepStrictEqual(D.junkIn('Janet Sobel: All-Over focused on the abstract paintings made by Janet Sobel (1893–1968) during the 1940s.'), []);
});

test('SD-010: the log reader takes exclusions, link counts and failed pages', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-'));
  fs.writeFileSync(path.join(dir, 'log_x.txt'), [
    '[t] [mam]     not a temporary exhibition (venue rule), excluded: Prix Marcel Duchamp 2026',
    '[t] [khm]   current: 0 links seen -> 0 navigation',
    '[t] [louvre]   FAILED past 2024 — BLOCKED_HTTP_403',
  ].join('\n'));
  const L = D.readLogs(dir);
  assert.strictEqual(L.excluded.get('mam')[0].title, 'Prix Marcel Duchamp 2026');
  assert.strictEqual(L.linksSeen.get('khm').get('current'), 0);
  assert.match(L.linksSeen.get('louvre').get('past 2024'), /BLOCKED_HTTP_403/);
});

test('SD-011: a new row the LAST run excluded by name means the rule stopped firing (V&A 5 Oct)', () => {
  const p = prev([row({ title:'Kept show', url:'https://va/k' })]);
  p.log = log({ v: [{ reason:'the venue labels this a permanent installation', title:'Urushi Now: Contemporary Japanese Lacquer' }] });
  const out = D.diffVenue('v', [row({ title:'Kept show', url:'https://va/k' }), row({ title:'Urushi Now: Contemporary Japanese Lacquer', url:'https://va/u' })], p, log());
  assert.strictEqual(out.ruleStopped.length, 1);
  assert.strictEqual(out.added.length, 0);
  assert.match(out.ruleStopped[0].reason, /permanent/);
});
