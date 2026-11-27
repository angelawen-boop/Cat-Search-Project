/**
 * test_proofs.js — no test is used until it is proven (hard-wired; docs/testing.md, "Proven checks").
 *
 * A test is proven when its planted-fault proof has passed on that exact version of it. The version is a
 * fingerprint of the test's own files, its proof and the proofs' shared kit; test_proofs.json remembers the
 * version each proof passed on. A test whose files have changed since then is REFUSED: it does not report
 * "passed", and the run fails, until its proof passes again (node scraper/run_tests.js --prove <name>).
 *
 * Tests that existed when this lock came in and have not been touched since are listed in test_proofs.json
 * under "unproven" by their fingerprint (a session's choice, not hers): they run as before. Touch one and it is
 * refused until it is given a proof here and proven. A new test is refused until the same.
 *
 * Every proof runs through the watched runner, so her expected-time line comes first. While a proof runs,
 * the runner sets CATWATCH_PROVING to the proven test's name, so the test can be run on its planted faults;
 * the Bash hook refuses that variable anywhere else.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const RECORD = process.env.CATWATCH_PROOF_RECORD || path.join(__dirname, 'test_proofs.json');
const KIT = 'build/proofs/kit.js';

// Each proven test: the files that make its version, and its proof.
const PROVEN = {
  join_guard:      { files: ['build/app_join.js', 'build/shared_from_scraper.js'], proof: 'build/proofs/join_guard.proof.js' },
  structure_check: { files: ['build/structure_check.js'], proof: 'build/proofs/structure_check.proof.js' },
  fact_check:      { files: ['build/fact_check.js', 'build/fact_check_known.json'], proof: 'build/proofs/fact_check.proof.js' },
  words_check:     { files: ['build/words_check.js'], proof: 'build/proofs/words_check.proof.js' },
  side_by_side:    { files: ['build/side_by_side.js'], proof: 'build/proofs/side_by_side.proof.js' },
  lock:            { files: ['scraper/test_proofs.js', 'scraper/run_tests.js', '.claude/hooks/test-guard.js'], proof: 'build/proofs/lock.proof.js' },
  sweep_nov_pages: { files: ['scraper/fixtures/sweep_nov_pages.js'], proof: 'build/proofs/sweep_nov_pages.proof.js' },
  khm_season_pages: { files: ['scraper/fixtures/khm_season_pages.js'], proof: 'build/proofs/khm_season_pages.proof.js' },
  pacing:          { files: ['scraper/pacing.test.js'], proof: 'build/proofs/pacing.proof.js' },
};

const rel = f => path.relative(ROOT, path.resolve(ROOT, f)).split(path.sep).join('/');
const readRecord = () => { try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')); } catch { return { proven: {}, unproven: {} }; } };
const hashFiles = files => {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort()) {
    h.update(f + '\u0000');
    try { h.update(fs.readFileSync(path.join(ROOT, f))); } catch { h.update('(missing)'); }
    h.update('\u0000');
  }
  return h.digest('hex').slice(0, 16);
};
// A proven test's version: its files, its proof, and the kit every proof shares.
const versionOf = name => hashFiles([...PROVEN[name].files, PROVEN[name].proof, KIT]);
const ownerOf = file => Object.keys(PROVEN).find(n => PROVEN[n].files.includes(rel(file)));

// Where one test file stands: { ok, why }.
function standing(file) {
  const f = rel(file), name = ownerOf(f), rec = readRecord();
  if (name) {
    const passed = rec.proven && rec.proven[name];
    if (passed && passed === versionOf(name)) return { ok: true, why: `proven (${name})` };
    return { ok: false, why: `${f} is part of ${name}, which ${passed ? 'has changed since its proof passed' : 'has never passed its proof'} — prove it: node scraper/run_tests.js --prove ${name}` };
  }
  const was = rec.unproven && rec.unproven[f];
  if (was && was === hashFiles([f])) return { ok: true, why: 'not yet proven, untouched since the lock' };
  return { ok: false, why: `${f} is ${was ? 'changed since the lock came in' : 'a new test'} and has no proof — give it one in scraper/test_proofs.js (PROVEN) and prove it: node scraper/run_tests.js --prove <its name>` };
}
// The test files a suite's command runs.
const filesOf = cmd => cmd.split(/\s+/).filter(w => /\.js$/.test(w) && fs.existsSync(path.join(ROOT, w))).map(rel);
function suiteStanding(cmd) {
  const bad = filesOf(cmd).map(standing).filter(s => !s.ok);
  return bad.length ? { ok: false, why: bad.map(s => s.why).join('; ') } : { ok: true, why: '' };
}

// Called at the top of a test's own run: refuse, exit 1, unless proven at this version — or this is its proof running.
function requireProven(file) {
  const name = ownerOf(file);
  if (name && process.env.CATWATCH_PROVING === name) return;
  const s = standing(file);
  if (s.ok) return;
  console.log('REFUSED — not proven at this version: ' + s.why);
  process.exit(1);
}

// After a proof passes: remember the version it passed on.
function recordProof(name, version) {
  const rec = readRecord();
  rec.proven = { ...(rec.proven || {}), [name]: version };
  rec.proven = Object.fromEntries(Object.keys(rec.proven).sort().map(k => [k, rec.proven[k]]));
  fs.writeFileSync(RECORD, JSON.stringify(rec, null, 1) + '\n');
}

module.exports = { PROVEN, KIT, RECORD, versionOf, hashFiles, standing, suiteStanding, filesOf, requireProven, recordProof, readRecord, ownerOf };
