// Fixtures for venue_status.js — the script that PRINTS the venue table the
// project guide used to carry by hand.
//
// What is worth testing here is not the arithmetic. It is the two ways a
// derived table can lie: by leaving a venue out entirely (the old table's
// exact failure — it said artic had never run while four artic runs sat
// committed), and by attributing rows to a run that does not hold them.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('./compress.js');
const { venueShape } = require('./qc.js');
const { VENUES } = require('./sweep_prototype.js');
const { collect, allRuns, runDate } = require('./venue_status.js');

const OUTPUT_DIR = path.join(__dirname, 'output');

test('V-001 every wired venue appears, whether or not it has ever returned a row', () => {
  const codes = collect().map(v => v.code);
  for (const code of Object.keys(VENUES)) {
    assert.ok(codes.includes(code), `${code} has a recipe but is missing from the table`);
  }
  assert.strictEqual(codes.length, Object.keys(VENUES).length);
});

test('V-002 a blocked venue is present with no rows, never silently dropped', () => {
  // The venues that have never returned an exhibition are the ones most at risk
  // of vanishing from a derived table, because nothing they produce is real.
  // moma left this list on 26 Sep: her laptop's 16 Sep runs, pushed that day,
  // hold 24 listing rows read before its exhibition pages refused.
  for (const code of ['brit', 'morgan']) {
    const v = collect().find(x => x.code === code);
    assert.ok(v, `${code} missing`);
    assert.strictEqual(v.rows, null, `${code} should have no rows`);
    assert.ok(v.triedFrom, `${code} should still record that it was tried`);
  }
});

test('V-003 a row count is only ever attributed to a run that actually holds it', () => {
  for (const v of collect()) {
    if (v.rows === null) continue;
    const run = allRuns().find(r => r.name === v.rowsFrom);
    assert.ok(run, `${v.code} cites run ${v.rowsFrom}, which is not on disk`);
    const shape = venueShape(C.readProForma(path.join(OUTPUT_DIR, run.rel, 'sweep.csv')));
    assert.strictEqual(shape.get(v.code).real, v.rows,
      `${v.code} reports ${v.rows} rows but ${v.rowsFrom} holds ${shape.get(v.code).real}`);
  }
});

test('V-004 the run cited for rows is never later than the run cited for the attempt', () => {
  // Folder names sort as dates. Rows come from the last run that brought any;
  // the attempt from the last run that held the venue at all. The first can
  // equal the second and can precede it, but can never follow it.
  for (const v of collect()) {
    if (!v.rowsFrom) continue;
    assert.ok(v.rowsFrom <= v.triedFrom,
      `${v.code}: rows from ${v.rowsFrom} but last tried ${v.triedFrom}`);
  }
});

test('V-005 archived runs are counted', () => {
  // The bug qc.js recorded: a run read out of archive/ was invisible, so the
  // history ran backwards. If anything is in archive/, it must be in the list.
  const archived = fs.existsSync(path.join(OUTPUT_DIR, 'archive'))
    ? fs.readdirSync(path.join(OUTPUT_DIR, 'archive')).filter(d => d.startsWith('run_'))
    : [];
  if (!archived.length) return;
  const names = allRuns().map(r => r.name);
  for (const d of archived) {
    if (!fs.existsSync(path.join(OUTPUT_DIR, 'archive', d, 'sweep.csv'))) continue;
    assert.ok(names.includes(d), `archived run ${d} is missing from the history`);
  }
});

test('V-006 a run folder name reads back as its own date', () => {
  assert.strictEqual(runDate('run_2026-09-13_142632'), '13 Sep 2026');
  assert.strictEqual(runDate('run_2026-01-01_000000'), '1 Jan 2026');
});
