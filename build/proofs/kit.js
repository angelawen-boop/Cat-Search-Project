/*
 * kit.js — what the planted-fault proofs share (docs/testing.md, "Proven checks").
 *
 * A proof copies the project into a scratch folder (the project itself is never touched), plants one
 * fault at a time in the copy, runs the check under proof on it with --root, and requires the check to
 * fail on that fault's own rule; then puts the copy back as it was. A control (the clean copy, or a
 * change the check must let through) must pass. Exit 1 if any fault went uncaught or any control failed.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SKIP = /^(node_modules|output|chrome_profile|\.git)$/;

// A copy of what the checks read: the parts, the joined page, the register, the scraper (not its runs),
// the build. node_modules is linked, so the copy's files load the same packages.
function copyProject() {
  const to = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-proof-'));
  const copy = rel => fs.cpSync(path.join(ROOT, rel), path.join(to, rel), { recursive: true, filter: s => !SKIP.test(path.basename(s)) });
  for (const rel of ['app', 'venues', 'scraper', 'build', 'Cat_Watch.jsx', 'package.json']) copy(rel);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(to, 'node_modules'));
  return to;
}

function proof(title) {
  let bad = 0, faults = 0, controls = 0;
  const say = (good, m, detail) => {
    if (good) console.log('PASS  ' + m);
    else { bad++; console.log('FAIL  ' + m + (detail ? '\n' + detail.split('\n').slice(0, 12).map(l => '      ' + l).join('\n') : '')); }
  };
  const root = copyProject();
  const file = rel => path.join(root, rel);
  const read = rel => fs.readFileSync(file(rel), 'utf8');
  // Plant: each change is a [file, new text or null to delete] pair, given the copy's current text; undone after.
  const withChanges = (changes, fn) => {
    const before = changes.map(([rel]) => [rel, fs.existsSync(file(rel)) ? read(rel) : null]);
    try {
      for (const [rel, make] of changes) {
        const was = fs.existsSync(file(rel)) ? read(rel) : null;
        const now = typeof make === 'function' ? make(was) : make;
        if (now === null) fs.rmSync(file(rel), { force: true });
        else { fs.mkdirSync(path.dirname(file(rel)), { recursive: true }); fs.writeFileSync(file(rel), now); }
      }
      return fn();
    } finally {
      for (const [rel, was] of before) {
        if (was === null) fs.rmSync(file(rel), { force: true });
        else fs.writeFileSync(file(rel), was);
      }
    }
  };
  const run = (args, env) => {
    const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, ...env } });
    return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };
  return {
    root, file, read, run,
    // A fault: the check must exit 1 with a failure line matching `own` (its own rule).
    fault(id, what, changes, check, own) {
      faults++;
      withChanges(changes, () => {
        const r = check();
        say(r.status === 1 && r.out.split('\n').some(l => own.test(l)), `${id}: ${what} — caught` + (r.status === 1 ? '' : ' (it passed)'), r.out);
      });
    },
    // A control: the check must exit 0 (optionally printing a line matching `must`).
    control(id, what, changes, check, must) {
      controls++;
      withChanges(changes, () => {
        const r = check();
        say(r.status === 0 && (!must || must.test(r.out)), `${id}: ${what} — passes`, r.out);
      });
    },
    done() {
      fs.rmSync(root, { recursive: true, force: true });
      console.log(bad ? `PROOF FAILED (${title}): ${bad} of ${faults + controls} not as required.`
        : `PROOF PASSED (${title}): ${faults} planted faults each caught by its own rule; ${controls} controls pass.`);
      process.exit(bad ? 1 : 0);
    },
  };
}

// A piece added at the end of a part: `//@piece <id>` and its text.
const addPiece = (id, text) => was => (was || '') + (was && !was.endsWith('\n') ? '\n' : '') + '//@piece ' + id + '\n\n' + text + '\n';

module.exports = { proof, addPiece, ROOT };
