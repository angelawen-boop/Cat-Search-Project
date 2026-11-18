// npm test — every suite, side by side (one per processor), each one's output
// printed whole and in list order. Exit code 1 if ANY suite failed; every
// suite runs either way, so one failure never hides the rest.
//
// RUN ONLY THE GROUP FOR THE WORK IN HAND (docs/testing.md). App-only work was
// running the scraper suites, and Add by link work the cloud-saving ones, so a
// session reported failures in suites that had nothing to do with its change.
//   npm run test:links     Add by link — reading a pasted page, venue link rules
//   npm run test:lookup    the shop finder and catalogue lookup
//   npm run test:saving    the cloud ledger, Save and Load
//   npm run test:screen    the import screen, cards, sorting, display
//   npm run test:app       the whole app half — once, before publishing
//   npm run test:scraper   scraper/ — the sweep, its recipes, QC, compression
//   npm test               both halves — the shared date reader or summary rules
// A suite tagged with both halves is where they genuinely meet: the app
// importing a scraper CSV, the shared date reader and summary rules, Add by
// link reading the scraper's venue list, compression reading the app's seed.
//
// A suite only one branch has goes in scraper/fixtures/branch_tests.txt on that
// branch (one command per line) — never in this list. Main never touches that
// file, so merging main into a branch never clashes over the test list. Those
// suites run with every app group (today there are none).

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const APP = 'app', SCRAPER = 'scraper', BOTH = [APP, SCRAPER];
const LINKS = 'links', LOOKUP = 'lookup', SAVING = 'saving', SCREEN = 'screen';
const GROUPS = [APP, SCRAPER, LINKS, LOOKUP, SAVING, SCREEN];
// Run one at a time, before the rest, with the machine to itself: the cloud-saving
// suites wait 8 seconds for a save, and failed only when other suites crowded the machine.
const ALONE = 'alone';
// Quick checks every app group runs: the import, and the page opens and draws.
const EVERY_APP = [APP, LINKS, LOOKUP, SAVING, SCREEN];
const SUITES = [
  [SCRAPER, 'node --test scraper/date.test.js scraper/qc.test.js scraper/sweep_log.test.js scraper/venue_status.test.js scraper/pacing.test.js scraper/sweep_diff.test.js scraper/routine_window.test.js'],
  [BOTH,    'node --test scraper/compress.test.js'],
  [[...BOTH, LINKS], 'node --test scraper/answer_check.test.js'],
  [[...BOTH, LINKS], 'node --test scraper/venue_register.test.js'],
  [[...EVERY_APP, SCRAPER], 'node --test scraper/test_watch.test.js'],
  [[...EVERY_APP, SCRAPER], 'node scraper/fixtures/intake_cases.js'],
  [EVERY_APP, 'node scraper/fixtures/page_loads.js'],
  [EVERY_APP, 'node scraper/fixtures/page_renders.js'],
  [[APP, SCREEN], 'node scraper/fixtures/app_decisions.js'],
  [[APP, SCREEN], 'node scraper/fixtures/list_drawing.js'],
  [[APP, SCREEN], 'node scraper/fixtures/period_sort.js'],
  [[APP, SCREEN], 'node scraper/fixtures/period_render.js'],
  [[APP, SCREEN], 'node scraper/fixtures/theme_count_venue_scrub.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/catalogue_lookup.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/catalogue_route.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/recheck_shop.js'],
  [[APP, LOOKUP], 'node scraper/fixtures/lookup_log.js'],
  [[APP, SAVING], 'node scraper/fixtures/cloud_ledger.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_app.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_two_copies.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/cloud_empty_import.js', ALONE],
  [[APP, SAVING], 'node scraper/fixtures/store_unread.js'],
  [SCRAPER, 'node scraper/fixtures/summary_pages.js'],
  [SCRAPER, 'node scraper/fixtures/orsay_pages.js'],
  [SCRAPER, 'node scraper/fixtures/pacing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mam_pages.js'],
  [SCRAPER, 'node scraper/fixtures/mad_pages.js'],
  [SCRAPER, 'node scraper/fixtures/brit_pages.js'],
  [SCRAPER, 'node scraper/fixtures/morgan_pages.js'],
  [SCRAPER, 'node scraper/fixtures/title_case_pages.js'],
  [SCRAPER, 'node scraper/fixtures/listing_pages.js'],
  [SCRAPER, 'node scraper/fixtures/met_exclusion_pages.js'],
  [SCRAPER, 'node scraper/fixtures/page_keep_pages.js'],
  [SCRAPER, 'node scraper/fixtures/moma_pages.js'],
  [SCRAPER, 'node scraper/fixtures/ashmolean_pages.js'],
  [SCRAPER, 'node scraper/fixtures/cincinnati_pages.js'],
  [SCRAPER, 'node scraper/fixtures/va_pages.js'],
  [SCRAPER, 'node scraper/fixtures/description_pages_oct.js'],
  [SCRAPER, 'node scraper/fixtures/bridge_reuse.js'],
  [SCRAPER, 'node scraper/fixtures/robots_pages.js'],
  [[...BOTH, LINKS, LOOKUP], 'node scraper/fixtures/add_by_link.js'],
  [[APP, LINKS], 'node scraper/fixtures/add_by_page.js'],
  [[APP, LINKS], 'node scraper/fixtures/add_by_paste.js'],
];


// No run is left unwatched (her decision; scraper/test_watch.js): one run at a time, its expected time
// printed first, and a suite that runs well past its usual time is stopped and re-run alone.
//   node scraper/run_tests.js links --only cloud_app   only the suites whose command holds "cloud_app"
//   node scraper/run_tests.js links --estimate         print the expected time and stop
//   node scraper/run_tests.js --save-times             keep this machine's usual times in test_times.json
//   node scraper/run_tests.js --prove <name…>          run those tests' planted-fault proofs (scraper/test_proofs.js)
//   node scraper/run_tests.js --side-by-side [<ref>] [--live]   the side-by-side check against the page at <ref> (default main)
const W = require('./test_watch.js');
// No test is used until it is proven (scraper/test_proofs.js).
const P = require('./test_proofs.js');

const branchFile = path.join(ROOT, 'scraper/fixtures/branch_tests.txt');
const branchSuites = () => (fs.existsSync(branchFile)
  ? fs.readFileSync(branchFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  : []);

// The doc budget and the guide check warn and never fail; they run last, on their
// own, so their report is the final thing printed.
const LAST = 'node scraper/doc_budget.js && node scraper/guide_check.js';
// The side-by-side check, whatever commit it compares with, has one usual time.
const SIDE_BY_SIDE = 'node build/side_by_side.js';
const timeKey = c => (c.startsWith(SIDE_BY_SIDE + ' ') ? SIDE_BY_SIDE : c);
const JOBS = Math.max(1, os.cpus().length);

// What a run's arguments pick: { half, all, alone, last, error }.
function plan(args) {
  const flags = new Set(), only = [], prove = [];
  let half = null, sideBySide = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only') { while (args[i + 1] && !args[i + 1].startsWith('--')) only.push(args[++i]); }
    else if (args[i] === '--prove') { while (args[i + 1] && !args[i + 1].startsWith('--')) prove.push(args[++i]); }
    else if (args[i] === '--side-by-side') sideBySide = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'main';
    else if (args[i].startsWith('--')) flags.add(args[i]);
    else if (!half) half = args[i];
  }
  if (half && !GROUPS.includes(half)) return { error: `Unknown group "${half}" — use ${GROUPS.join(', ')}, or nothing for both halves.` };
  // --side-by-side [<git ref>, default main]: the side-by-side check of the page now against the page at that commit
  // (build/side_by_side.js; with --live the Links read too), nothing else.
  if (sideBySide) {
    const cmd = SIDE_BY_SIDE + ' --base ' + sideBySide + ' --changes-allowed' + (flags.has('--live') ? ' --live' : '');
    return { half: null, all: [cmd], alone: new Set([cmd]), last: false, flags, only, prove };
  }
  // --prove <name…>: run those proofs (scraper/test_proofs.js), nothing else.
  if (prove.length) {
    const unknown = prove.filter(n => !P.PROVEN[n]);
    if (unknown.length) return { error: `No proof named ${unknown.join(', ')} — the proven tests are ${Object.keys(P.PROVEN).join(', ')}.` };
    return { half: null, all: prove.map(n => 'node ' + P.PROVEN[n].proof), alone: new Set(prove.map(n => 'node ' + P.PROVEN[n].proof)), last: false, flags, only, prove };
  }
  const chosen = SUITES.filter(([tags]) => !half || [].concat(tags).includes(half));
  let all = [...chosen.map(([, cmd]) => cmd), ...(half === SCRAPER ? [] : branchSuites())];
  if (only.length) {
    all = [...SUITES.map(([, cmd]) => cmd), ...branchSuites()].filter(c => only.some(o => c.includes(o)));
    if (!all.length) return { error: `No suite's command holds ${only.map(o => '"' + o + '"').join(' or ')}.` };
  }
  const alone = new Set(SUITES.filter(([, cmd, how]) => how === ALONE && all.includes(cmd)).map(([, cmd]) => cmd));
  return { half, all, alone, last: !only.length, flags, only, prove };
}

// The expected time: the alone suites one after another, then the rest shared out as the workers take
// them, then the last check.
function estimate(args) {
  const p = plan(args);
  if (p.error) return 0;
  const t = c => W.usual(timeKey(c)) ?? W.UNKNOWN_S;
  let s = 0;
  const free = new Array(JOBS).fill(0);
  for (const c of p.all) {
    if (p.alone.has(c)) { s += t(c); continue; }
    const i = free.indexOf(Math.min(...free));
    free[i] += t(c);
  }
  return s + Math.max(...free) + (p.last ? t(LAST) : 0);
}

const running = new Set();
// One suite, stopped (its whole process group) once it passes `limit` seconds.
function run(cmd, limit, proving) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const env = { ...process.env }; delete env.CATWATCH_PROVING;
    if (proving) env.CATWATCH_PROVING = proving;
    const child = spawn(cmd, { cwd: ROOT, shell: true, detached: true, env });
    running.add(child);
    let out = '', stalled = false;
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const kill = sig => { try { process.kill(-child.pid, sig); } catch {} };
    const timer = limit ? setTimeout(() => { stalled = true; kill('SIGTERM'); setTimeout(() => kill('SIGKILL'), 5000).unref(); }, limit * 1000) : null;
    child.on('close', code => {
      clearTimeout(timer); running.delete(child);
      resolve({ cmd, code, out, stalled, secs: (Date.now() - t0) / 1000 });
    });
  });
}
process.on('exit', () => { for (const c of running) { try { process.kill(-c.pid, 'SIGKILL'); } catch {} } });

const usualText = c => (W.usual(timeKey(c)) == null ? 'no time on record' : `usually ${W.usual(timeKey(c)).toFixed(1)}s`);

async function main() {
  const args = process.argv.slice(2);
  const p = plan(args);
  if (p.error) { console.error(p.error); process.exit(2); }
  if (p.flags.has('--save-times')) { console.log(`Kept the usual times of ${W.saveTimes()} parts in scraper/test_times.json.`); return; }
  const expected = estimate(args);
  if (p.flags.has('--estimate')) { console.log(W.line(expected)); return; }

  // The checks below, and every suite, must be proven at this version (scraper/test_proofs.js) — a proof run excepted.
  if (!p.prove.length) {
    const unproven = ['build/app_join.js', 'build/structure_check.js', 'build/fact_check.js', 'build/words_check.js'].map(P.standing).filter(x => !x.ok);
    if (unproven.length) { console.error(unproven.map(x => 'REFUSED — not proven at this version: ' + x.why).join('\n')); process.exit(1); }
  }
  // Cat_Watch.jsx must be what the parts in app/ and the scraper's rules join to (this replaces the old sync_shared --check suite), or the run fails before any suite (docs/restructure.md).
  if (!p.prove.length) {
  const join = spawnSync('node', [path.join(ROOT, 'build', 'app_join.js'), '--check'], { encoding: 'utf8' });
  if (join.status !== 0) { console.error((join.stderr || join.stdout || 'app_join.js --check failed').trim()); process.exit(1); }
  // No part names a higher one, only the store's door reaches the store, and hooks and JSX stay in the screens (build/structure_check.js).
  const structure = spawnSync('node', [path.join(ROOT, 'build', 'structure_check.js')], { encoding: 'utf8' });
  if (structure.status !== 0) { console.error((structure.stdout || structure.stderr || 'structure_check.js failed').trim()); process.exit(1); }
  // Every venue fact in venues/register.js, and no sentence, list or rule written twice in the parts (build/fact_check.js).
  const facts = spawnSync('node', [path.join(ROOT, 'build', 'fact_check.js')], { encoding: 'utf8' });
  if (facts.status !== 0) { console.error((facts.stdout || facts.stderr || 'fact_check.js failed').trim()); process.exit(1); }
  // Every sentence the app shows is on the words list, and the tests read them from it (build/words_check.js).
  const words = spawnSync('node', [path.join(ROOT, 'build', 'words_check.js')], { encoding: 'utf8' });
  if (words.status !== 0) { console.error((words.stdout || words.stderr || 'words_check.js failed').trim()); process.exit(1); }
  // Each passed, proven at this version: its own line, so the run shows they ran.
  for (const r of [join, structure, facts, words]) console.log((r.stdout || '').split('\n').filter(l => /^(PASS|join:)/.test(l)).join('\n'));
  }

  const what = 'node scraper/run_tests.js ' + args.join(' ');
  W.takeLock(what.trim(), expected);
  const t0 = Date.now();
  const bs = p.half === SCRAPER || p.only.length ? 0 : branchSuites().length;
  console.log(W.line(expected));
  console.log(`Running ${p.all.length} ${p.prove.length ? 'proofs' : 'suites'} (${p.prove.length ? p.prove.join(', ') : p.all[0].startsWith(SIDE_BY_SIDE) ? 'the side-by-side check' : p.only.length ? 'only ' + p.only.join(', ') : p.half || 'app and scraper'}), ${JOBS} at a time` +
    (bs ? ` (${bs} from this branch's branch_tests.txt)` : '') + '.');

  const start = {};
  // Every minute, which suites are still going and for how long — in the run's own output, for the session.
  const beat = setInterval(() => {
    const now = Object.entries(start).map(([c, t]) => `${c.replace(/^node (--test )?/, '')} (${Math.round((Date.now() - t) / 1000)}s, ${usualText(c)})`);
    if (now.length) console.log(`… ${Math.round((Date.now() - t0) / 1000)}s in; still running: ${now.join('; ')}`);
  }, 60000);
  beat.unref();
  // A suite not proven at this version is not run and does not pass. A proof runs with its test's name in
  // CATWATCH_PROVING, so the test can be run on its planted faults, and records the version it passed on.
  const proving = {};
  for (const n of p.prove) proving['node ' + P.PROVEN[n].proof] = { name: n, version: P.versionOf(n) };
  const timed = async c => {
    if (!proving[c]) { const s = P.suiteStanding(c); if (!s.ok) return { cmd: c, code: 1, out: 'REFUSED — not proven at this version: ' + s.why + '\n', stalled: false, secs: 0, refused: true }; }
    start[c] = Date.now(); const r = await run(c, W.stallLimit(W.usual(timeKey(c))), proving[c] && proving[c].name); delete start[c];
    if (proving[c] && r.code === 0 && !r.stalled) {
      if (P.versionOf(proving[c].name) === proving[c].version) { P.recordProof(proving[c].name, proving[c].version); r.out += `PROVEN — ${proving[c].name} at version ${proving[c].version}, kept in scraper/test_proofs.json.\n`; }
      else { r.code = 1; r.out += `NOT RECORDED — ${proving[c].name}'s files changed while its proof ran; prove it again.\n`; }
    }
    return r;
  };

  const results = new Array(p.all.length);
  let next = 0, printed = 0;
  const show = (r, label) => {
    const head = r.stalled ? `STALLED — stopped after ${r.secs.toFixed(0)}s (${usualText(r.cmd)})` : `${r.code === 0 ? 'PASS' : 'FAIL'} (${r.secs.toFixed(1)}s)`;
    console.log(`\n===== ${label || ''}${head} ${r.cmd}`);
    process.stdout.write(r.out);
  };
  const flush = () => { while (printed < p.all.length && results[printed]) show(results[printed++]); };
  const worker = async () => {
    while (next < p.all.length) {
      const i = next++;
      if (results[i]) continue;
      results[i] = await timed(p.all[i]);
      flush();
    }
  };
  for (let i = 0; i < p.all.length; i++) if (p.alone.has(p.all[i])) results[i] = await timed(p.all[i]);
  flush();
  await Promise.all(Array.from({ length: Math.min(JOBS, p.all.length) }, worker));

  // A stalled suite runs again with the machine to itself. Passing then says the crowding stalled it;
  // stalling again is a real fault.
  const retried = [];
  for (const r of results.filter(x => x.stalled)) {
    const again = await timed(r.cmd);
    show(again, 're-run alone: ');
    retried.push({ first: r, again });
  }

  let last = null;
  if (p.last) {
    last = await run(LAST, W.stallLimit(W.usual(LAST)));
    console.log(`\n===== ${last.stalled ? 'STALLED ' : ''}${LAST}`);
    process.stdout.write(last.out);
  }

  const finals = results.map(r => (r.stalled ? retried.find(x => x.first === r).again : r));
  const passed = [...finals, ...(last ? [last] : [])].filter(r => r.code === 0 && !r.stalled);
  W.record(Object.fromEntries(passed.map(r => [timeKey(r.cmd), r.secs])));

  const failed = finals.filter(r => r.code !== 0 || r.stalled);
  const secs = (Date.now() - t0) / 1000;
  console.log(`\n${p.all.length - failed.length} of ${p.all.length} suites passed in ${secs.toFixed(0)}s (expected ${W.phrase(expected)}).`);
  for (const { first, again } of retried) {
    console.log(again.stalled ? `STALLED TWICE (a real fault, not crowding): ${first.cmd}`
      : `STALLED with others running, then ${again.code === 0 ? 'passed' : 'FAILED'} alone in ${again.secs.toFixed(1)}s: ${first.cmd}`);
  }
  for (const r of failed) if (!r.stalled) console.log(`${r.refused ? 'REFUSED (not proven at this version)' : 'FAILED (exit ' + r.code + ')'}: ${r.cmd}`);
  process.exit(failed.length || (last && last.code) ? 1 : 0);
}

module.exports = { plan, estimate };
if (require.main === module) main();
