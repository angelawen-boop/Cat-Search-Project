// Rebuilding the app's freshness drawer from the sweep files on disk.
// §7 step 7's drill: the page's store is wiped, and the sweep dates come back
// from here rather than from her choosing between sweep files by hand.
const assert = require('assert');
const { test } = require('node:test');
const SL = require('./sweep_log.js');
const APP = require('./fixtures/harness.js');

const row = o => ({ venue_code:'', title:'', start_date:'', end_date:'', summary:'',
                    url:'', notes:'', swept_at:'', ...o });
const MARKER = 'The venue refused us. Marker row, not an exhibition.';

const T = {
  early: '2026-09-12T16:04:08.334Z',
  late:  '2026-09-13T04:27:50.275Z',
};

test('S-001: a real row sets both dates; a marker row sets only "tried"', () => {
  const { venues } = SL.fold([
    row({ venue_code:'ng',   title:'Zurbaran',    swept_at:T.early }),
    row({ venue_code:'moma', title:'[past page]', swept_at:T.early, notes:MARKER }),
  ], {});
  assert.deepStrictEqual(venues.ng,   { attempted:T.early, returned:T.early });
  assert.deepStrictEqual(venues.moma, { attempted:T.early, returned:null });
});

test('S-002: the Borghese gap — tried later than it last brought rows', () => {
  // Her file's real shape: rows from the 2am run, a refusal from the
  // afternoon. The drawer must show BOTH, because the gap is the signal.
  const { venues } = SL.fold([
    row({ venue_code:'borghese', title:'A Real Show',  swept_at:T.early }),
    row({ venue_code:'borghese', title:'[past page]',  swept_at:T.late, notes:MARKER }),
  ], {});
  assert.deepStrictEqual(venues.borghese, { attempted:T.late, returned:T.early });
});

test('S-003: order cannot change the answer — an older file never pushes a date back', () => {
  // This is the whole reason she does not have to know which sweep file is
  // the latest. Feed them in either order and land in the same place.
  const older = [row({ venue_code:'met', title:'X', swept_at:T.early })];
  const newer = [row({ venue_code:'met', title:'X', swept_at:T.late })];
  const forwards  = SL.fold(newer, SL.fold(older, {}).venues).venues;
  const backwards = SL.fold(older, SL.fold(newer, {}).venues).venues;
  assert.deepStrictEqual(forwards, backwards);
  assert.deepStrictEqual(forwards.met, { attempted:T.late, returned:T.late });
});

test('S-004: the rebuilder and the APP agree — read from the real JSX, not a copy', () => {
  // The rule is restated in sweep_log.js rather than imported, because the
  // app has no build step and nothing to import from. So it is held against
  // the app's own mergeSweepLog here, or the two drift silently — which is
  // the failure this repo keeps recording.
  //
  // THE ROW ORDER HERE IS DELIBERATE: the LATER stamp comes FIRST at every
  // venue. A rule that simply takes the last row it saw would agree with the
  // app on newest-first input and diverge on this, so ordering it this way is
  // what gives the fixture its teeth. Confirmed by replacing the rule with
  // last-wins and watching this case fail.
  const rows = [
    row({ venue_code:'borghese', title:'[past page]', swept_at:T.late, notes:MARKER }),
    row({ venue_code:'borghese', title:'A Real Show', swept_at:T.early }),
    row({ venue_code:'moma',     title:'[past page]', swept_at:T.late, notes:MARKER }),
    row({ venue_code:'moma',     title:'[past page]', swept_at:T.early, notes:MARKER }),
    row({ venue_code:'met',      title:'Y',           swept_at:T.late }),
    row({ venue_code:'met',      title:'Y',           swept_at:T.early }),
  ];
  const mine = SL.fold(rows, {}).venues;

  // The app folds the SAME rows through its own intake and merge.
  const seen = { attempted:{}, returned:{} };
  for (const r of rows) {
    const v = r.venue_code;
    const marker = String(r.notes||'').trim().endsWith('Marker row, not an exhibition.');
    if (!seen.attempted[v] || r.swept_at > seen.attempted[v]) seen.attempted[v] = r.swept_at;
    if (!marker && (!seen.returned[v] || r.swept_at > seen.returned[v])) seen.returned[v] = r.swept_at;
  }
  const theirs = APP.mergeSweepLog({}, seen);
  assert.deepStrictEqual(mine, theirs);
});

test('S-005: a row the app would refuse contributes nothing', () => {
  const { venues, contributed } = SL.fold([
    row({ venue_code:'nosuch', title:'X', swept_at:T.late }),   // unknown venue
    row({ venue_code:'',       title:'X', swept_at:T.late }),   // no venue code
    row({ venue_code:'ng',     title:'X', swept_at:''     }),   // no stamp at all
  ], {});
  assert.deepStrictEqual(venues, {});
  assert.strictEqual(contributed, 0);
});

test('S-006: a file with no swept_at column is skipped, not read as blanks', () => {
  // Every sweep before 20 Sep predates the column. Reading one must leave the
  // log alone rather than write empty dates over good ones.
  const fs = require('fs'), os = require('os'), path = require('path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-'));
  const old = path.join(d, 'old.csv');
  fs.writeFileSync(old, 'venue_code,title,start_date,end_date,summary,url,notes\nng,X,,,,,\n');
  assert.strictEqual(SL.hasSweptAt(old), false);
  const { venues, used, skipped } = SL.scan([old]);
  assert.deepStrictEqual(venues, {});
  assert.strictEqual(used.length, 0);
  assert.strictEqual(skipped, 1);
});
