#!/usr/bin/env node
/*
 * lock.proof.js — the lock (scraper/test_proofs.js, scraper/run_tests.js, .claude/hooks/test-guard.js)
 * proven by planted faults, on a copy of the project with its own record and its own run lock: a proven
 * check changed since its proof, never proven, or its proof or the kit changed; a new test; an old test
 * touched; a proof that fails, or whose test changes while it runs; a proof run by hand — each refused.
 * And what it must let through — a proven check as proven, an untouched old test, a proof's own run of
 * its test, a passing proof recorded — let through.
 * Run through the watched runner: node scraper/run_tests.js --prove lock
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { proof, ROOT } = require('./kit.js');

const P = proof('the lock');
fs.cpSync(path.join(ROOT, '.claude', 'hooks'), P.file('.claude/hooks'), { recursive: true });
const RECORD = P.file('scraper/test_proofs.json');
const LOCK = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cw-lock-proof-')), 'run.lock');
const env = { CATWATCH_LOCK: LOCK, CATWATCH_PROOF_RECORD: RECORD, CATWATCH_LOCAL_TIMES: path.join(path.dirname(LOCK), 'times.json'), CATWATCH_PROVING: '' };
// The copy's record: the four checks the runner runs first proven as they are in the copy (what is under proof
// here is the lock, not the checks); one planted suite as an untouched old test where a step says so.
const T = () => { for (const k of Object.keys(require.cache)) if (k.startsWith(P.root)) delete require.cache[k]; process.env.CATWATCH_PROOF_RECORD = RECORD; return require(P.file('scraper/test_proofs.js')); };
const proven = () => { const t = T(), out = {}; for (const n of ['join_guard', 'structure_check', 'fact_check', 'words_check']) out[n] = t.versionOf(n); return out; };
const SUITE = 'scraper/fixtures/planted_suite.js', SUITE_TEXT = "console.log('PLANTED SUITE RAN');\n";
const oldSuite = was => JSON.stringify({ ...JSON.parse(was), unproven: { [SUITE]: T().hashFiles([SUITE]) } });
const node = (args, e = {}) => P.run(args, { ...env, ...e });
const runner = args => node([P.file('scraper/run_tests.js'), ...args]);
const requireIt = (file, proving) => node(['-e', `require(${JSON.stringify(P.file('scraper/test_proofs.js'))}).requireProven(${JSON.stringify(P.file(file))}); console.log('ALLOWED')`], proving ? { CATWATCH_PROVING: proving } : {});
// The hook reads its input from stdin.
const hookSays = command => {
  const r = require('child_process').spawnSync(process.execPath, [P.file('.claude/hooks/test-guard.js')], { input: JSON.stringify({ tool_input: { command }, cwd: P.root }), encoding: 'utf8', env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: P.root } });
  return { status: /"deny"/.test(r.stdout) ? 1 : 0, out: 'FAIL ' + (r.stdout || '(allowed)') };
};
const addSuite = was => was.replace("const SUITES = [\n", "const SUITES = [\n  [APP, 'node " + SUITE + "'],\n");
const ran = r => ({ status: r.status, out: r.out + (/PLANTED SUITE RAN/.test(r.out) ? '\nRAN' : '') });
// Refused and never run: a run of the planted suite counts as not caught.
const unrun = r => ({ status: /PLANTED SUITE RAN/.test(r.out) ? 0 : r.status, out: r.out });
fs.writeFileSync(RECORD, JSON.stringify({ proven: proven(), unproven: {} }, null, 1) + '\n');
const record = () => fs.readFileSync(RECORD, 'utf8');

P.control('LK-00', 'a proven check, unchanged, is allowed', [], () => requireIt('build/structure_check.js'), /ALLOWED/);
P.fault('LK-01', 'a proven check changed since its proof is refused', [['build/structure_check.js', was => was + '\n// planted\n']], () => requireIt('build/structure_check.js'), /REFUSED — not proven .*has changed since its proof passed/);
P.fault('LK-02', 'a check that has never passed its proof is refused', [['scraper/test_proofs.json', was => JSON.stringify({ ...JSON.parse(was), proven: {} })]], () => requireIt('build/words_check.js'), /REFUSED — not proven .*has never passed its proof/);
P.fault('LK-03', "a check whose proof changed is refused", [['build/proofs/structure_check.proof.js', was => was + '\n// planted\n']], () => requireIt('build/structure_check.js'), /REFUSED .*has changed since its proof passed/);
P.fault('LK-04', 'a check whose proofs\' kit changed is refused', [['build/proofs/kit.js', was => was + '\n// planted\n']], () => requireIt('build/fact_check.js'), /REFUSED .*has changed since its proof passed/);
P.fault('LK-05', 'its proof\'s permission given to another test does not let a changed check through',
  [['build/structure_check.js', was => was + '\n// planted\n']], () => requireIt('build/structure_check.js', 'words_check'), /REFUSED/);
P.control('LK-C1', 'its own proof running may run a changed check', [['build/structure_check.js', was => was + '\n// planted\n']], () => requireIt('build/structure_check.js', 'structure_check'), /ALLOWED/);
P.fault('LK-06', 'a new test in the runner is refused, never run',
  [['scraper/run_tests.js', addSuite], [SUITE, SUITE_TEXT]], () => unrun(runner(['--only', 'planted_suite'])), /^REFUSED .*planted_suite\.js is a new test and has no proof/);
P.control('LK-C2', 'an old test untouched since the lock runs and passes',
  [['scraper/run_tests.js', addSuite], [SUITE, SUITE_TEXT], ['scraper/test_proofs.json', oldSuite]], () => ran(runner(['--only', 'planted_suite'])), /^RAN$/m);
P.fault('LK-07', 'an old test touched since the lock is refused, never run',
  [['scraper/run_tests.js', addSuite], [SUITE, SUITE_TEXT], ['scraper/test_proofs.json', oldSuite], [SUITE, SUITE_TEXT + '// planted\n']],
  () => unrun(runner(['--only', 'planted_suite'])), /^REFUSED \(not proven at this version\): node scraper\/fixtures\/planted_suite\.js/);
P.fault('LK-08', 'a check the runner runs first, changed since its proof, stops every run',
  [['scraper/run_tests.js', addSuite], [SUITE, SUITE_TEXT], ['scraper/test_proofs.json', oldSuite], ['build/fact_check.js', was => was + '\n// planted\n']],
  () => unrun(runner(['--only', 'planted_suite'])), /^REFUSED — not proven at this version: build\/fact_check\.js is part of fact_check/);
P.fault('LK-09', 'a proof that fails is not recorded',
  [['build/proofs/structure_check.proof.js', "process.exit(1);\n"]], () => {
    const before = record(); const r = runner(['--prove', 'structure_check']);
    return { status: r.status === 1 && record() === before ? 1 : 0, out: 'FAIL ' + (record() === before ? 'not recorded' : 'RECORDED') + '\n' + r.out };
  }, /^FAIL not recorded/);
P.fault('LK-10', 'a proof whose test changes while it runs is not recorded',
  [['build/proofs/structure_check.proof.js', `require('fs').appendFileSync(${JSON.stringify(P.file('build/structure_check.js'))}, '\\n// planted\\n');\n`], ['build/structure_check.js', was => was]], () => {
    const before = record(); const r = runner(['--prove', 'structure_check']);
    return { status: r.status === 1 && record() === before && /NOT RECORDED/.test(r.out) ? 1 : 0, out: 'FAIL ' + (record() === before ? 'not recorded' : 'RECORDED') + '\n' + r.out };
  }, /^FAIL not recorded/);
P.control('LK-C3', 'a proof that passes records the version it passed on, and the check is then allowed',
  [['build/structure_check.js', was => was + '\n// planted\n'], ['build/proofs/structure_check.proof.js', "process.exit(0);\n"], ['scraper/test_proofs.json', was => was]], () => {
    const r = runner(['--prove', 'structure_check']);
    if (r.status !== 0) return r;
    return requireIt('build/structure_check.js');
  }, /ALLOWED/);
P.fault('LK-11', 'a proof run by hand is refused by the hook', [], () => hookSays('node build/proofs/fact_check.proof.js'), /Run a proof through the watched runner/);
P.fault('LK-12', 'the proving variable set by hand is refused by the hook', [], () => hookSays('CATWATCH' + '_PROVING=fact_check node build/fact_check.js'), /is set only by the watched runner/);
P.fault('LK-13', 'the side-by-side check run by hand is refused by the hook', [], () => hookSays('node build/side_by_side.js --base main --changes-allowed'), /Run the side-by-side check through the watched runner/);
P.fault('LK-14', 'the side-by-side check, never proven, is refused when the runner runs it', [], () => runner(['--side-by-side', 'main']), /^REFUSED — not proven at this version: build\/side_by_side\.js is part of side_by_side/);
P.control('LK-C4', 'the hook lets a check run as usual, and the side-by-side check\'s own parts run for its proof', [],
  () => { const a = hookSays('node build/fact_check.js'), b = hookSays('node build/side_by_side.js --snapshot a.jsx b.json'); return { status: a.status || b.status, out: a.out + b.out }; });
P.done();
