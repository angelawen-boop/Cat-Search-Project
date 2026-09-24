// QC — the gate in front of her import file. §7 step 8.
// Every case here is a row that must never reach her, or a comparison that
// must not fire when nothing is wrong.
const assert = require('assert');
const { test } = require('node:test');
const QC = require('./qc.js');

const row = o => ({ venue_code:'', title:'', start_date:'', end_date:'', summary:'', url:'', notes:'', ...o });
const MARKER = 'The venue refused us. Marker row, not an exhibition.';

test('Q-001: a row with no title is fatal, and says which venue and address', () => {
  const f = QC.fatalRows([row({ venue_code:'capo', url:'https://capodimonte.cultura.gov.it/mostra/x/' })]);
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].kind, 'no title');
  assert.strictEqual(f[0].line, 2);
  assert.match(f[0].url, /mostra\/x/);
});

test('Q-002: a blank venue code is fatal, and is reported as a malformed file', () => {
  const f = QC.fatalRows([row({ title:'Real Show' })]);
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].kind, 'no venue code');
  assert.match(f[0].why, /malformed/);
});

test('Q-003: an unknown venue code is fatal — the app could only file it as junk', () => {
  const f = QC.fatalRows([row({ venue_code:'nosuch', title:'Real Show' })]);
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].kind, 'unknown venue code');
});

test('Q-004: one row can be faulty twice and both are named', () => {
  assert.strictEqual(QC.fatalRows([row({})]).length, 2);
});

test('Q-005: a healthy row is not fatal, and neither is a MARKER row', () => {
  const rows = [
    row({ venue_code:'ng', title:'Zurbaran', url:'https://nationalgallery.org.uk/z', summary:'x' }),
    row({ venue_code:'moma', title:'[past page]', url:'https://moma.org/past', notes:MARKER }),
  ];
  assert.deepStrictEqual(QC.fatalRows(rows), []);
});

test('Q-006: a marker row is not counted as an exhibition, so it cannot mask a venue going dark', () => {
  const shape = QC.venueShape([
    row({ venue_code:'moma', title:'[past page]', notes:MARKER }),
    row({ venue_code:'ng', title:'A', summary:'blurb' }),
  ]);
  assert.strictEqual(shape.get('moma').real, 0);
  assert.strictEqual(shape.get('moma').rows, 1);
  assert.strictEqual(shape.get('ng').real, 1);
  assert.strictEqual(shape.get('ng').summaries, 1);
});

test('Q-007: a row with a title but no description is an EXCEPTION, never fatal', () => {
  const rows = [row({ venue_code:'louvre', title:'Mamluks', url:'https://louvre.fr/a' })];
  assert.deepStrictEqual(QC.fatalRows(rows), []);
  assert.strictEqual(QC.venueShape(rows).get('louvre').summaries, 0);
});

// Q-008 to Q-010 — a row listed on a year's archive from before it opened.
const F = c => `Found on the venue's "${c}" listing page.`;
const A = c => ` Also listed on the venue's "${c}" page.`;

test('Q-008: a show listed on archives older than its opening year is reported, with those pages', () => {
  // The 13 Sep sweep's Mary Cassatt: the menu's promo card, read on every page.
  const L = QC.impossibleListings([row({ venue_code:'artic', title:'Mary Cassatt', start_date:'2026-09-06',
    notes: F('current') + A('upcoming') + A('past 2026') + A('past 2025') + A('past p2 2023') })]);
  assert.strictEqual(L.length, 1);
  assert.deepStrictEqual(L[0].pages, ['past 2025', 'past p2 2023']);
  assert.strictEqual(L[0].line, 2);
});

test('Q-009: real multi-year shows, seasons and year-less pages never fire', () => {
  const rows = [
    // The Met files a show under every year it was open.
    row({ venue_code:'met', title:'A Passion for Jade', start_date:'2022-07-02',
      notes: F('past') + A('past 2025') + A('past 2024') }),
    // A Morgan season is named for two years; opened in its second is fine.
    row({ venue_code:'morgan', title:'X', start_date:'2025-02-01', notes: F('past 2024-2025') }),
    // A page with no year in its name says nothing about years.
    row({ venue_code:'brera', title:'Y', start_date:'2027-01-01', notes: F('current') + A('past') }),
    // No opening date: nothing to compare against.
    row({ venue_code:'artic', title:'Z', notes: F('past 2023') }),
  ];
  assert.deepStrictEqual(QC.impossibleListings(rows), []);
});

test('Q-010: a marker row is never reported, whatever its notes say', () => {
  assert.deepStrictEqual(QC.impossibleListings([row({ venue_code:'artic', title:'[past page]',
    start_date:'2026-01-01', notes: F('past 2024') + ' ' + MARKER })]), []);
});
