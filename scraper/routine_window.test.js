// THE ROUTINE WINDOW — her decision: a routine home sweep opens and writes only shows
// on, upcoming or closed in the last 6 months; --full reads back to the floor. Older
// shows are not in the CSV, yet the venue's count still holds them (Met 200 + 3 new = 203).
const assert = require('assert');
const { test } = require('node:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const W = require('./routine_window.js');
const D = require('./sweep_diff.js');
const { routineFrom, applyRoutineWindow } = require('./sweep_prototype.js');

const row = o => ({ venue_code:'met', title:'', start_date:'', end_date:'', summary:'text', url:'', notes:'', swept_at:'2026-10-15T08:00:00Z', ...o });
const shows = (n, end, tag) => Array.from({ length: n }, (_, i) => row({ title:`${tag} ${i}`, url:`https://m/${tag}${i}`, end_date:end }));
const FROM = '2026-04-15';
const noLog = () => ({ excluded: new Map(), linksSeen: new Map() });

test('RW-001: the window opens six calendar months before the sweep date', () => {
  assert.strictEqual(W.windowFrom('2026-10-15'), '2026-04-15');
  assert.strictEqual(W.windowFrom('2026-03-15'), '2025-09-15');
  assert.strictEqual(W.windowFrom('2026-08-31'), '2026-02-28');
});

test('RW-002: only a closing date before the window is outside it; no closing date is never outside', () => {
  assert.strictEqual(W.outsideWindow(row({ end_date:'2026-04-14' }), FROM), true);
  assert.strictEqual(W.outsideWindow(row({ end_date:FROM }), FROM), false);
  assert.strictEqual(W.outsideWindow(row({ end_date:'' }), FROM), false);
  assert.strictEqual(W.outsideWindow(row({ end_date:'2025-01-01' }), null), false);
});

test('RW-003: Met 200 after a full sweep, then a routine sweep gaining 3 new shows, counts 203', () => {
  const full = [...shows(150, '2025-06-01', 'old'), ...shows(50, '2026-09-01', 'recent')];
  const routine = [...shows(50, '2026-09-01', 'recent'), ...shows(3, '2027-01-01', 'new')];
  const known = W.knownAfter(W.knownAfter(null, full, null), routine, FROM);
  assert.strictEqual(known.length, 203);
});

test('RW-004: a full sweep replaces the known rows outright', () => {
  const known = W.knownAfter(shows(5, '2025-06-01', 'old'), shows(2, '2026-09-01', 'recent'), null);
  assert.deepStrictEqual(known.map(r => r.title), ['recent 0', 'recent 1']);
});

test('RW-005: a show inside the window that a routine sweep no longer finds is not carried', () => {
  const known = W.knownAfter(shows(2, '2026-09-01', 'recent'), shows(1, '2026-09-01', 'recent'), FROM);
  assert.deepStrictEqual(known.map(r => r.title), ['recent 0']);
});

test('RW-006: knownRows folds the runs on disk by their window.json; a full re-run clears it', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-'));
  const runs = ['a', 'b'].map(n => ({ abs: path.join(tmp, n) }));
  runs.forEach(r => fs.mkdirSync(r.abs));
  const data = { [runs[0].abs]: [...shows(4, '2025-06-01', 'old'), ...shows(2, '2026-09-01', 'recent')],
                 [runs[1].abs]: [...shows(2, '2026-09-01', 'recent'), ...shows(1, '2027-01-01', 'new')] };
  W.recordWindow(runs[1].abs, 'met', FROM);
  assert.strictEqual(W.knownRows('met', runs, abs => data[abs]).length, 7);
  W.recordWindow(runs[1].abs, 'met', null);
  assert.strictEqual(fs.existsSync(path.join(runs[1].abs, W.WINDOW_FILE)), false);
  assert.strictEqual(W.knownRows('met', runs, abs => data[abs]).length, 3);
  fs.rmSync(tmp, { recursive: true });
});

test('RW-007: QC — old shows a routine run did not sweep are not MISSING; a recent one gone still is', () => {
  const p = { run: 'run_2026-09-13_142632', rows: [...shows(3, '2025-06-01', 'old'), ...shows(2, '2026-09-01', 'recent')] };
  const out = D.diffVenue('met', shows(1, '2026-09-01', 'recent'), p, noLog(), '2026-10-15', FROM);
  assert.strictEqual(out.notSwept, 3);
  assert.deepStrictEqual(out.gone.map(g => g.title), ['recent 1']);
});

test('RW-008: QC — a full sweep after routine ones finds nothing new in the older shows it carried', () => {
  const known = W.knownAfter(W.knownAfter(null, [...shows(3, '2025-06-01', 'old'), ...shows(1, '2026-09-01', 'recent')], null),
    shows(1, '2026-09-01', 'recent'), FROM);
  const out = D.diffVenue('met', [...shows(3, '2025-06-01', 'old'), ...shows(1, '2026-09-01', 'recent')],
    { run: 'run_2026-11-15_100000', rows: known }, noLog(), '2026-12-15', null);
  assert.deepStrictEqual(out.added, []);
  assert.deepStrictEqual(out.gone, []);
});

test('RW-009: routine is the default for a home venue swept; --full, container venues and saved pages read in full', () => {
  const today = '2026-10-15';
  assert.strictEqual(routineFrom('moma', { asSweep: true, full: false, today }), FROM);
  assert.strictEqual(routineFrom('artic', { asSweep: true, full: true, today }), null);
  assert.strictEqual(routineFrom('ng', { asSweep: true, full: false, today }), null);
  assert.strictEqual(routineFrom('mad', { asSweep: false, full: false, today }), null);
});

test('RW-010: the cut before pages are opened keeps undated shows and marker rows', () => {
  const rows = [row({ title:'Old', end_date:'2025-01-01' }), row({ title:'Undated' }),
    row({ title:'Recent', end_date:'2026-05-01' }), row({ title:'[past page]', end_date:'' })];
  assert.deepStrictEqual(applyRoutineWindow(rows, FROM).map(r => r.title), ['Undated', 'Recent', '[past page]']);
  assert.strictEqual(applyRoutineWindow(rows, null), rows);
});
