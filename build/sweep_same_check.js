#!/usr/bin/env node
/*
 * sweep_same_check.js — proves the scraper-side round (docs/restructure.md, "Round scraper side") changed
 * nothing a sweep writes and nothing the app reads: the code in an old tree (a checkout of main) beside this
 * one, on the sweep files on disk. No network; nothing under scraper/output is written (the writers run in
 * copies of each tree's scraper, in a temporary folder).
 *
 *   node build/sweep_same_check.js --old <tree>      exit 1 on any difference
 *
 * Each part proves one claim:
 *  (a) The readers read the same: every sweep CSV under scraper/output, read by compress.parseCsv,
 *      compress.readProForma, show_tags' readCsv and the app's csvParse, old and new, gives the same rows;
 *      and the app's whole CSV analysis (analyzeProForma, on an empty ledger) gives the same cards.
 *  (b) The writers write the same: the rows of the newest stitched sweep (stitch_20261015_0920) written by
 *      the old and the new writer give the same bytes — compress.writeCsv, the sweep's writeVenueCsv and
 *      rebuildSweepCsv, stitch.js (run on that stitch's own source runs), reread_kept.writeRows and the
 *      app's proFormaCsv.
 *  (c) The shared values are the same: MONTHS (every name to the same number), MONTH_PATTERN (the same
 *      string), GERMAN_DAY_DOT (the same source and flags), dates.js the same text outside its month block;
 *      the column list; the marker sentence in every place it was written, and every marker test on every
 *      note on disk.
 *  (d) The sweep-log merge gives the same log: sweep_log.js's fold and the app's mergeSweepLog, old and new,
 *      on made-up logs, and the log `sweep_log.js` builds from every file on disk.
 *  (e) The Topic note reads the same: every notes value in the sweep CSVs gives the same topic by the app's
 *      old topicOf and its new one, and compress writes the same note for every topic and venue.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const NEW = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const OLD = argv.includes('--old') ? path.resolve(argv[argv.indexOf('--old') + 1]) : null;
if (!OLD || !fs.existsSync(path.join(OLD, 'scraper', 'compress.js'))) {
  console.error('usage: node build/sweep_same_check.js --old <a checkout of main, with node_modules>');
  process.exit(2);
}
const OUTPUT = path.join(NEW, 'scraper', 'output');
const STITCH = path.join(OUTPUT, 'stitch_20261015_0920');

let failures = 0;
const pass = m => console.log('PASS  ' + m);
const fail = m => { console.log('FAIL  ' + m); failures++; };
const J = v => JSON.stringify(v, (k, x) => x instanceof RegExp ? String(x) : x instanceof Set ? [...x] : x);
// The first place two texts differ, for the report.
const where = (x, y) => { let i = 0; while (i < x.length && x[i] === y[i]) i++; return i; };
const same = (label, x, y) => {
  if (x === y) return true;
  const i = where(x, y);
  fail(label + ' — differ at ' + i + ': old …' + JSON.stringify(x.slice(Math.max(0, i - 40), i + 60)) + ' / new …' + JSON.stringify(y.slice(Math.max(0, i - 40), i + 60)));
  return false;
};

// ── Each tree's code ──────────────────────────────────────────────────────────
const sources = tree => f => fs.readFileSync(path.join(tree, f), 'utf8');

// The app's prelude, lifted as scraper/fixtures/harness.js lifts it: plain code, no screen.
function appOf(tree) {
  const src = fs.readFileSync(path.join(tree, 'Cat_Watch.jsx'), 'utf8');
  const a = src.indexOf('const VENUE_REGISTER='), b = src.indexOf('// URGENCY COLOURS, ONE SET PER THEME', a);
  if (a < 0 || b < 0) throw new Error(tree + ': the app prelude\'s anchors are gone');
  return new Function(src.slice(a, b) + '\nreturn { csvParse, proFormaCsv, isMarkerRow, topicOf, mergeSweepLog, analyzeProForma };')();
}

// show_tags.js runs a browser on load, so its reader is lifted by its text.
function showTagsReader(tree) {
  const src = sources(tree)('scraper/show_tags.js');
  const a = src.indexOf('function readCsv('), b = src.indexOf('\n}\n', a);
  const parseCsv = fs.existsSync(path.join(tree, 'scraper', 'pro_forma.js')) ? require(path.join(tree, 'scraper', 'pro_forma.js')).parseCsv : undefined;
  return new Function('fs', 'parseCsv', src.slice(a, b + 2) + '\nreturn readCsv;')(fs, parseCsv);
}

// dates.js's month values, by its text: GERMAN_DAY_DOT is not exported.
function monthsOf(tree) {
  const src = sources(tree)('scraper/dates.js');
  const body = src.slice(src.indexOf("'use strict';") + 13, src.indexOf('\nmodule.exports'))
    .replace(/^const REGISTER = require\('\.\.\/venues\/register\.js'\)\.VENUES; \/\/@register$/m, 'const REGISTER = [];');
  // Its keys line (`require('./keys.js')`) reads that tree's own scraper/keys.js.
  const req = f => require(path.join(tree, 'scraper', f));
  return new Function('require', body + '\nreturn { MONTHS, MONTH_PATTERN, GERMAN_DAY_DOT };')(req);
}

const T = tree => ({
  C: require(path.join(tree, 'scraper', 'compress.js')),
  SL: require(path.join(tree, 'scraper', 'sweep_log.js')),
  RK: require(path.join(tree, 'scraper', 'reread_kept.js')),
  app: appOf(tree),
  tags: showTagsReader(tree),
  months: monthsOf(tree),
  text: sources(tree),
});
const O = T(OLD), N = T(NEW);

function csvFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) csvFiles(p, out); else if (e.name.endsWith('.csv')) out.push(p);
  }
  return out.sort();
}
const FILES = csvFiles(OUTPUT);

// ── (a) the readers ───────────────────────────────────────────────────────────
{
  const readers = [
    ['compress.parseCsv', g => f => g.C.parseCsv(fs.readFileSync(f, 'utf8'))],
    ['compress.readProForma', g => f => g.C.readProForma(f)],
    ["show_tags' readCsv", g => f => g.tags(f)],
    ["the app's csvParse", g => f => g.app.csvParse(fs.readFileSync(f, 'utf8'))],
    ["the app's analyzeProForma", g => f => g.app.analyzeProForma(fs.readFileSync(f, 'utf8'), [], new Set(), {})],
  ];
  for (const [label, make] of readers) {
    const o = make(O), n = make(N);
    let bad = 0;
    for (const f of FILES) {
      let x, y;
      try { x = J(o(f)); } catch (e) { x = 'THROWS ' + e.message; }
      try { y = J(n(f)); } catch (e) { y = 'THROWS ' + e.message; }
      if (x !== y) { if (!bad) same(label + ' on ' + path.relative(NEW, f), x, y); bad++; }
    }
    bad ? fail(label + ': ' + bad + ' of ' + FILES.length + ' files read differently') : pass(label + ': all ' + FILES.length + ' sweep CSVs read the same');
  }
}

// ── (b) the writers ───────────────────────────────────────────────────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sweep-same-'));
// A copy of a tree's scraper (no output) and venues, with the stitch's source runs as its output.
function copyTree(tree, label) {
  const to = path.join(TMP, label);
  fs.mkdirSync(path.join(to, 'scraper'), { recursive: true });
  for (const e of fs.readdirSync(path.join(tree, 'scraper'), { withFileTypes: true })) {
    if (e.name === 'output' || e.name === 'node_modules') continue;
    fs.cpSync(path.join(tree, 'scraper', e.name), path.join(to, 'scraper', e.name), { recursive: true });
  }
  fs.cpSync(path.join(tree, 'venues'), path.join(to, 'venues'), { recursive: true });
  fs.symlinkSync(path.join(NEW, 'node_modules'), path.join(to, 'node_modules'));
  const runs = fs.readFileSync(path.join(STITCH, 'sources.txt'), 'utf8').match(/run_[0-9_-]+/g) || [];
  for (const r of [...new Set(runs)]) fs.cpSync(path.join(OUTPUT, r), path.join(to, 'scraper', 'output', r), { recursive: true });
  return { root: to, runs: [...new Set(runs)] };
}
{
  const rows = () => N.C.readProForma(path.join(STITCH, 'sweep.csv'));
  if (!rows().length) fail('no rows in ' + STITCH);
  const bytes = f => fs.readFileSync(f).toString('latin1');
  const out = (label, f) => path.join(TMP, label + '-' + f);

  O.C.writeCsv(out('old', 'compress.csv'), rows()); N.C.writeCsv(out('new', 'compress.csv'), rows());
  same('compress.writeCsv', bytes(out('old', 'compress.csv')), bytes(out('new', 'compress.csv'))) && pass('compress.writeCsv: the same bytes');

  O.RK.writeRows(out('old', 'reread.csv'), rows()); N.RK.writeRows(out('new', 'reread.csv'), rows());
  same('reread_kept.writeRows', bytes(out('old', 'reread.csv')), bytes(out('new', 'reread.csv'))) && pass('reread_kept.writeRows: the same bytes');

  same("the app's proFormaCsv", O.app.proFormaCsv(rows()), N.app.proFormaCsv(rows())) && pass("the app's proFormaCsv: the same text");

  // The sweep's writers and stitch.js, each run in its own copy of the tree.
  const copies = { old: copyTree(OLD, 'old'), new: copyTree(NEW, 'new') };
  const got = {};
  for (const [label, c] of Object.entries(copies)) {
    const stitched = path.join(TMP, label + '-stitch.csv');
    execFileSync('node', [path.join(c.root, 'scraper', 'stitch.js'), ...c.runs, '--out=' + stitched], { cwd: c.root, stdio: 'pipe' });
    // writeVenueCsv per venue, then rebuildSweepCsv, in a run folder of the copy.
    const script = `
      const fs = require('fs'), path = require('path');
      const S = require(${JSON.stringify(path.join(c.root, 'scraper', 'sweep_prototype.js'))});
      const C = require(${JSON.stringify(path.join(c.root, 'scraper', 'compress.js'))});
      fs.mkdirSync(S.RUN_DIR, { recursive: true });
      const rows = C.readProForma(${JSON.stringify(path.join(STITCH, 'sweep.csv'))});
      const venues = [...new Set(rows.map(r => r.venue_code))];
      for (const v of venues) S.writeVenueCsv(v, rows.filter(r => r.venue_code === v));
      S.rebuildSweepCsv();
      const files = {};
      for (const f of fs.readdirSync(S.RUN_DIR).filter(f => f.endsWith('.csv')).sort()) files[f] = fs.readFileSync(path.join(S.RUN_DIR, f), 'latin1');
      process.stdout.write(JSON.stringify(files));`;
    const sweep = JSON.parse(execFileSync('node', ['-e', script], { cwd: c.root, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }).toString());
    got[label] = { stitch: bytes(stitched), sweep };
  }
  same('stitch.js', got.old.stitch, got.new.stitch) && pass('stitch.js: the same bytes (' + copies.new.runs.join(', ') + ')');
  const names = Object.keys(got.new.sweep);
  if (same('the sweep\'s run files', Object.keys(got.old.sweep).join(','), names.join(','))) {
    const bad = names.filter(f => !same('the sweep\'s ' + f, got.old.sweep[f], got.new.sweep[f]));
    if (!bad.length) pass('writeVenueCsv and rebuildSweepCsv: the same bytes in all ' + names.length + ' files');
  }
}

// ── (c) the shared values ─────────────────────────────────────────────────────
{
  const sorted = m => J(Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1));
  same('MONTHS', sorted(O.months.MONTHS), sorted(N.months.MONTHS)) && pass('MONTHS: the same ' + Object.keys(N.months.MONTHS).length + ' names, each to the same number');
  same('MONTH_PATTERN', O.months.MONTH_PATTERN, N.months.MONTH_PATTERN) && pass('MONTH_PATTERN: the same string');
  same('GERMAN_DAY_DOT', O.months.GERMAN_DAY_DOT.source + '/' + O.months.GERMAN_DAY_DOT.flags, N.months.GERMAN_DAY_DOT.source + '/' + N.months.GERMAN_DAY_DOT.flags)
    && pass('GERMAN_DAY_DOT: the same source and flags');
  // dates.js outside the month block: the text before the weekday rule, and from the month pattern to monthNum, cut out.
  const cut = (t, from, to) => { const a = t.indexOf(from), b = t.indexOf(to, a); if (a < 0 || b < 0) throw new Error('dates.js: ' + from + ' gone'); return t.slice(0, a) + t.slice(b); };
  const keepOut = t => cut(cut(t, '// ── Date helpers', '/**\n * A weekday in front'), '// One month pattern for every parser', '// Month name to number, tolerating');
  // The code from 'use strict' on, the keys round's shared accent strip read as the text it stands for
  // (scraper/keys.js stripAccents: the keys line gone, each call written out).
  const code = t => t.slice(t.indexOf("'use strict';"));
  const keysRead = t => t.replace(/^const \{ stripAccents \} = require\('\.\/keys\.js'\);\n/m, '')
    .replace(/stripAccents\((String\(s \|\| ''\))\)/g, "$1.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')");
  same('dates.js outside the month block', keepOut(code(O.text('scraper/dates.js'))), keepOut(code(keysRead(N.text('scraper/dates.js')))))
    && pass('dates.js: the same code outside the month block');

  const PF = require(path.join(NEW, 'scraper', 'pro_forma.js'));
  // An old tree from after the scraper-side round writes these in its own scraper/pro_forma.js.
  const OPF = fs.existsSync(path.join(OLD, 'scraper', 'pro_forma.js')) ? require(path.join(OLD, 'scraper', 'pro_forma.js')) : null;
  // The column list, wherever the old tree wrote it.
  const oldCols = OPF ? [['pro_forma.js CSV_HEADER', OPF.CSV_HEADER], ['pro_forma.js COLUMNS', OPF.COLUMNS.join(',')], ["the app's proFormaCsv", O.app.proFormaCsv([]).trim()]] : [
    ['compress.js CSV_HEADER', (O.text('scraper/compress.js').match(/const CSV_HEADER = '([^']+)'/) || [])[1]],
    ['sweep_prototype.js CSV_HEADER', (O.text('scraper/sweep_prototype.js').match(/const CSV_HEADER = '([^']+)'/) || [])[1]],
    ['stitch.js COLS', ((O.text('scraper/stitch.js').match(/const COLS = \[([^\]]+)\]/) || [])[1] || '').replace(/['\s]/g, '')],
    ['reread_kept.js cols', ((O.text('scraper/reread_kept.js').match(/const cols = \[([^\]]+)\]/) || [])[1] || '').replace(/['\s]/g, '')],
    ["the app's proFormaCsv", O.app.proFormaCsv([]).trim()],
  ];
  const bad = oldCols.filter(([, v]) => v !== PF.CSV_HEADER || PF.COLUMNS.join(',') !== v);
  bad.length ? fail('the column list differs from ' + bad.map(b => b[0] + ' (' + b[1] + ')').join('; ')) : pass('the column list: the same as in all ' + oldCols.length + ' old places');
  same("the app's proFormaCsv header", O.app.proFormaCsv([]), N.app.proFormaCsv([]));

  // The marker sentence, wherever the old tree wrote it.
  const oldMarkers = OPF ? [['pro_forma.js MARKER_SENTINEL', OPF.MARKER_SENTINEL]] : ['scraper/qc.js', 'scraper/routine_window.js', 'scraper/sweep_diff.js']
    .map(f => [f, (O.text(f).match(/const MARKER_SENTINEL = '([^']+)'/) || [])[1]])
    .concat([["the app's isMarkerRow", (O.text('Cat_Watch.jsx').match(/const MARKER_SENTINEL = "([^"]+)"/) || [])[1]]]);
  const badM = oldMarkers.filter(([, v]) => v !== PF.MARKER_SENTINEL);
  badM.length ? fail('the marker sentence differs from ' + badM.map(b => b[0]).join(', ')) : pass('the marker sentence: the same as in all ' + oldMarkers.length + ' old constants');
  // The sweep's five marker notes: the old lines with the sentence named are the new lines.
  const lit = ' ' + PF.MARKER_SENTINEL + '`';
  const oldLines = OPF ? O.text('scraper/sweep_prototype.js').split('\n').filter(l => l.includes(' ${MARKER_SENTINEL}`'))
    : O.text('scraper/sweep_prototype.js').split('\n').filter(l => l.includes(lit)).map(l => l.split(lit).join(' ${MARKER_SENTINEL}`'));
  const newLines = N.text('scraper/sweep_prototype.js').split('\n').filter(l => l.includes(' ${MARKER_SENTINEL}`'));
  same("the sweep's marker notes", oldLines.join('\n'), newLines.join('\n')) && oldLines.length && pass('the sweep\'s ' + oldLines.length + ' marker notes: the same sentence');
  // Every marker test on every note on disk, and some made up.
  const notes = new Set(['', ' Marker row, not an exhibition. ', 'Marker row, not an exhibition', 'x. Marker row, not an exhibition.\n', null, undefined, 0]);
  for (const f of FILES) for (const r of O.C.readProForma(f)) notes.add(r.notes);
  const tests = [
    ['qc.isMarker', require(path.join(OLD, 'scraper', 'qc.js')).isMarker, require(path.join(NEW, 'scraper', 'qc.js')).isMarker, n => ({ notes: n })],
    ["the app's isMarkerRow", O.app.isMarkerRow, N.app.isMarkerRow, n => n],
  ];
  for (const [label, o, n, arg] of tests) {
    const diff = [...notes].filter(x => o(arg(x)) !== n(arg(x)));
    diff.length ? fail(label + ' differs on ' + J(diff.slice(0, 3))) : pass(label + ': the same on all ' + notes.size + ' notes');
  }
}

// ── (d) the sweep-log merge ───────────────────────────────────────────────────
{
  const A = '2026-10-01T00:00:00.000Z', B = '2026-10-15T00:00:00.000Z', Cc = '2026-11-01T00:00:00.000Z';
  const M = 'Refused. Marker row, not an exhibition.';
  const row = (v, at, notes = '') => ({ venue_code: v, title: 'X', swept_at: at, notes });
  const cases = [
    [{}, [row('met', A), row('met', B)]],
    [{ met: { attempted: Cc, returned: A } }, [row('met', B), row('met', B, M)]],
    [{ moma: { attempted: A, returned: null } }, [row('moma', B, M), row('moma', A, M)]],
    [{ ng: { attempted: B, returned: B } }, [row('ng', A), row('ng', '', ''), row('nosuch', Cc), row('', Cc)]],
    [{ borghese: { attempted: A } }, [row('borghese', Cc, M), row('borghese', B), row('artic', A)]],
    [null, [row(' met ', A), row('met', ' ' + B + ' ')]],
  ];
  let bad = 0;
  for (const [prev, rows] of cases) {
    if (J(O.SL.fold(rows, prev)) !== J(N.SL.fold(rows, prev))) { bad++; same('sweep_log.fold ' + J(prev), J(O.SL.fold(rows, prev)), J(N.SL.fold(rows, prev))); }
    const seen = { attempted: {}, returned: {} };
    for (const r of rows) { seen.attempted[r.venue_code] = r.swept_at; if (!r.notes) seen.returned[r.venue_code] = r.swept_at; }
    for (const s of [seen, { attempted: seen.attempted }, {}, null]) {
      if (J(O.app.mergeSweepLog(prev, s)) !== J(N.app.mergeSweepLog(prev, s))) { bad++; fail("the app's mergeSweepLog on " + J([prev, s])); }
    }
  }
  bad ? fail('the merge differs on ' + bad + ' made-up logs') : pass('the merge: sweep_log.fold and the app\'s mergeSweepLog the same on ' + cases.length + ' made-up logs');
  const files = O.SL.csvFilesUnder(OUTPUT);
  // `used` names each file from the tree's own output folder; both are the same files.
  const scanned = (g, tree) => { const r = g.SL.scan(files); return J({ ...r, used: r.used.map(u => [path.resolve(tree, 'scraper', 'output', u.file), u.rows]) }); };
  same('the log sweep_log.js builds from disk', scanned(O, OLD), scanned(N, NEW)) && pass('the log built from all ' + files.length + ' files on disk: the same');
  // The app's import of every file on disk, merged in turn, as a sequence of imports would.
  let lo = {}, ln = {};
  for (const f of FILES) {
    const t = fs.readFileSync(f, 'utf8');
    const so = O.app.analyzeProForma(t, [], new Set(), {}).seen, sn = N.app.analyzeProForma(t, [], new Set(), {}).seen;
    if (so) lo = O.app.mergeSweepLog(lo, so);
    if (sn) ln = N.app.mergeSweepLog(ln, sn);
  }
  same("the app's log after importing every file", J(lo), J(ln)) && pass("the app's log after importing all " + FILES.length + ' files in turn: the same');
}

// ── (e) the Topic note ────────────────────────────────────────────────────────
{
  const notes = new Set(['Topic: Asian art.', 'Found on x. Topic: Asian art.', 'Topic: A', 'xTopic: Asian art.', '']);
  for (const f of FILES) for (const r of O.C.readProForma(f)) notes.add(r.notes);
  const diff = [...notes].filter(n => O.app.topicOf(n) !== N.app.topicOf(n));
  const found = [...notes].filter(n => N.app.topicOf(n)).length;
  diff.length ? fail("the app's topicOf differs on " + J(diff.slice(0, 3))) : pass("the app's topicOf: the same on all " + notes.size + ' notes (' + found + ' with a topic)');
  const venues = require(path.join(NEW, 'venues', 'register.js')).VENUES.map(v => v.id);
  const keys = [...Object.keys(N.C.TOPICS), 'none', 'NONE', ' asian ', 'nosuch', '', null];
  let bad = 0;
  for (const k of keys) for (const v of venues) if (J(O.C.resolveTopic(k, v)) !== J(N.C.resolveTopic(k, v))) bad++;
  for (const k of Object.keys(N.C.TOPICS)) if (O.C.topicNote(k) !== N.C.topicNote(k) || N.app.topicOf(N.C.topicNote(k)) !== N.C.TOPICS[k]) bad++;
  same('TOPIC_PREFIX', O.C.TOPIC_PREFIX, N.C.TOPIC_PREFIX);
  bad ? fail('compress writes a different note in ' + bad + ' cases') : pass('compress: the same note for every topic at every venue, and the app reads each back');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? '\n' + failures + ' difference(s).' : '\nSAME  nothing a sweep writes and nothing the app reads changed.');
process.exit(failures ? 1 : 0);
