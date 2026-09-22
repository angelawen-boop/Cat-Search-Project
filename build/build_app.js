#!/usr/bin/env node
/*
 * build_app.js — turn Cat_Watch_v10.2_haiku.jsx into the page she opens.
 *
 * WHY THIS EXISTS — her question, 22 Sep 2026, after watching a publish fail
 * and cost three round trips: "will putting it in the guide help future
 * sessions, or is there a hook that always fires?"
 *
 * THE TWO HALVES HAVE DIFFERENT ANSWERS, and separating them is the whole
 * point of this file.
 *
 *   BUILDING the page is one input with one correct answer — transpile the
 *   JSX, wrap it in the shell, check it parses. That is code's job by her own
 *   rule of 10 Sep, and it had been prose in CLAUDE.md that every session
 *   re-derived by hand. Prose also carried a real hazard: it said to take the
 *   shell from the published page, because rebuilding it from memory loses the
 *   pre-paint background. The shell is now committed beside this script, so
 *   there is nothing to remember and nothing to re-fetch.
 *
 *   PUBLISHING cannot be automated away. The artifact service refuses a
 *   publish from a session that has not VIEWED the live version, and viewing
 *   means reading every line of the saved copy — roughly 3,000 lines. No hook
 *   and no script can do that reading; only the session can. What a script CAN
 *   do is make sure the session reads it FIRST, in one pass, instead of
 *   discovering the rule by being refused. So this file ends by printing the
 *   order.
 *
 * THE TRIGGER SITS NEXT TO THE CODE, which is her rule for this guide: a
 * session that is publishing runs this script, so the steps arrive exactly
 * when they are needed and cost nothing on the sessions that never publish.
 *
 * ORDER THAT WORKS FIRST TIME, and both refusals below are ones I actually hit:
 *
 *   1. Artifact action:"read" on the artifact URL.
 *   2. Read EVERY LINE of the saved .html file that read names, in chunks of
 *      about 400 lines. Refusal one is skipping this.
 *   3. node build/build_app.js
 *   4. Artifact action:"publish" with `url` set to the artifact URL and
 *      `file_path` set to build/dist/index.html.
 *
 *   REFUSAL TWO IS SUBTLER AND COSTS ANOTHER PASS: if the publish was already
 *   refused once, sending the same bytes again is refused as "resent
 *   unchanged" even after the reading is done. The cure is one more
 *   action:"read" of the URL, then publish. Doing step 1 before step 3 avoids
 *   both.
 *
 *   NEVER REPUBLISH WHILE SHE HAS THE PAGE OPEN — house rule, CLAUDE.md §1.
 *   Her ledger lives IN that page until she Exports.
 *
 * Usage:
 *   node build/build_app.js
 *   node build/build_app.js --shell-from <saved-live-page.html>
 *       Re-reads the shell out of a live page saved by Artifact action:"read"
 *       and says whether the committed one still matches. Run it if the page
 *       ever comes back looking wrong around the edges; it changes nothing
 *       unless you also pass --write-shell.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch_v10.2_haiku.jsx');
const HEAD = path.join(__dirname, 'shell_head.html');
const TAIL = path.join(__dirname, 'shell_tail.html');
const OUT_DIR = path.join(__dirname, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

// The line the shell hands to the page after the component is defined. It is
// not in the JSX, which exports App instead, so the build supplies it.
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));';

const args = process.argv.slice(2);
const shellFrom = (() => { const i = args.indexOf('--shell-from'); return i < 0 ? null : args[i + 1]; })();
const writeShell = args.includes('--write-shell');

function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }

// ── the shell, and how to re-take it from a live page ───────────────────────
//
// It is everything before the app's own <script> body and the two lines after
// it. The platform writes the outer wrapper (line 1), so it is not ours to
// invent — it was captured from the published page and is committed here so
// no session has to fetch it or remember it.
function shellFromLivePage(file) {
  const h = fs.readFileSync(file, 'utf8');
  const open = h.lastIndexOf('\n<script>\n');
  const close = h.lastIndexOf('</script>');
  if (open < 0 || close < 0 || close < open) die('could not find the app script in ' + file);
  return { head: h.slice(0, open + '\n<script>\n'.length), tail: h.slice(close) };
}

if (shellFrom) {
  const live = shellFromLivePage(shellFrom);
  const same = live.head === fs.readFileSync(HEAD, 'utf8') && live.tail === fs.readFileSync(TAIL, 'utf8');
  console.log(same ? 'shell: the committed shell still matches the live page.'
                   : 'shell: THE LIVE PAGE DIFFERS from the committed shell.');
  if (!same && writeShell) {
    fs.writeFileSync(HEAD, live.head); fs.writeFileSync(TAIL, live.tail);
    console.log('shell: updated from ' + shellFrom + ' — commit it and say what changed.');
  } else if (!same) {
    console.log('shell: nothing written. Re-run with --write-shell to take the live one.');
  }
}

// ── transpile ───────────────────────────────────────────────────────────────
//
// Prepared exactly as page_loads.js, page_renders.js and catalogue_lookup.js
// prepare it. Four things disagreeing about what the build is would be worse
// than one, and the render check is the only thing standing between a typo and
// a black screen.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-build-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* tsc reports type errors it cannot fix; the EMIT is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) die('the page did not transpile at all');
// The emit already ends in a newline, so the mount line is appended flush —
// byte-for-byte the shape the published page has always had.
const js = fs.readFileSync(built, 'utf8').replace(/\n*$/, '\n') + MOUNT + '\n';

// ── prove it before writing it ──────────────────────────────────────────────
//
// A SYNTAX CHECK IS A FLOOR, NOT A PASS. It cannot catch a palette that
// defines itself, which is valid JavaScript that throws on first render and
// shipped a BLACK SCREEN twice. `npm test` runs page_renders.js, which can;
// this only catches a stitch that produced something unparseable.
try { new Function(js); } catch (e) { die('the stitched page does not parse — ' + e.message); }
if (!/function App\(/.test(js)) die('the built page has no App component in it');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, fs.readFileSync(HEAD, 'utf8') + js + fs.readFileSync(TAIL, 'utf8'));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + kb + ' KB, parses, App present.');
console.log('');
console.log('PUBLISHING IS NOT AUTOMATABLE. The artifact service refuses a publish from a');
console.log('session that has not viewed the live version, and only the session can do that');
console.log('reading. In this order, it works first time:');
console.log('');
console.log('  1. Artifact action:"read" url:"https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5"');
console.log('  2. Read EVERY LINE of the saved .html it names (~3,000 lines, ~400 at a time).');
console.log('  3. node build/build_app.js          <- you are here');
console.log('  4. Artifact action:"publish" url:<same url> file_path:"build/dist/index.html"');
console.log('');
console.log('  Skipping 1-2 is refused. Re-sending the same bytes after a refusal is refused');
console.log('  again as "resent unchanged" — read the url once more, then publish.');
console.log('');
console.log('  NEVER REPUBLISH WHILE SHE HAS THE PAGE OPEN (CLAUDE.md §1). Ask first.');
console.log('  Run `npm test` before publishing: page_renders.js is the only check that');
console.log('  catches a page which parses and still shows a black screen.');
