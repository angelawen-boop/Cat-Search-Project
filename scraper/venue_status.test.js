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
const W = require('./routine_window.js');

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
  // hold 24 listing rows read before its exhibition pages refused. brit left
  // it on 28 Sep: her laptop's headed sweep, 33 rows. morgan, the last, left
  // it on 30 Sep: her laptop's headed sweep. No real venue is blocked-only now,
  // so the rule is asked of whichever ones are — and morgan's move is checked
  // directly, so this test still says something while that list is empty.
  // A venue wired but not yet swept (cincinnati, 4 Oct) has no rows AND no
  // try — the table prints "never swept". That is allowed only when no run
  // file holds the code at all, read here from the files themselves.
  const all = collect();
  const held = new Set();
  for (const run of allRuns()) {
    try { for (const r of C.readProForma(path.join(__dirname, 'output', run.rel, 'sweep.csv'))) held.add(r.venue_code); } catch {}
  }
  assert.ok(held.has('ng'), 'the run files were read');
  for (const v of all.filter(x => x.rows === null && !x.triedFrom)) {
    assert.ok(!held.has(v.code), `${v.code} is in a run but records no try`);
  }
  const morgan = all.find(x => x.code === 'morgan');
  assert.ok(morgan && morgan.rows > 0, 'morgan brought rows on 30 Sep and should be credited with them');
});

test('V-003 a row count is the known rows as of the run it cites — a routine run plus the older shows before it', () => {
  // A routine run of a laptop venue reads only recent shows, so the count is that
  // run's rows plus the older shows the runs before it brought (mad, 15 Oct: 8 + 14
  // = the full sweep's 22). Rebuilt here from the files, by the shared rule.
  const runs = allRuns();
  const read = abs => C.readProForma(path.join(abs, 'sweep.csv'));
  for (const v of collect()) {
    if (v.rows === null) continue;
    const upTo = runs.findIndex(r => r.name === v.rowsFrom);
    assert.ok(upTo >= 0, `${v.code} cites run ${v.rowsFrom}, which is not on disk`);
    const cited = runs.slice(0, upTo + 1).map(r => ({ abs: path.join(OUTPUT_DIR, r.rel) }));
    assert.ok(venueShape(read(cited[upTo].abs)).get(v.code).real > 0, `${v.code}: ${v.rowsFrom} holds no rows of it`);
    const known = W.knownRows(v.code, cited, abs => { try { return read(abs); } catch { return []; } });
    assert.strictEqual(v.rows, known.length, `${v.code} reports ${v.rows} rows but its runs up to ${v.rowsFrom} know ${known.length}`);
  }
});

test('V-003b mad, 15 Oct: a routine run of 8 still counts the full sweep\'s 22', () => {
  const mad = collect().find(x => x.code === 'mad');
  if (mad.rowsFrom !== 'run_2026-10-15_230242') return;   // a later mad run supersedes this case
  assert.strictEqual(mad.rows, 22);
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
