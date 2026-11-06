#!/usr/bin/env node
/*
 * build_app.js — turn Cat_Watch.jsx into the page she opens.
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
 *   means reading every line of the saved copy — about 6,600 lines. No hook
 *   and no script can do that reading; only the session can. What a script CAN
 *   do is make sure the session reads it FIRST, in one pass, instead of
 *   discovering the rule by being refused. So this file ends by printing the
 *   order.
 *
 * THE TRIGGER SITS NEXT TO THE CODE, which is her rule for this guide: a
 * session that is publishing runs this script, so the steps arrive exactly
 * when they are needed and cost nothing on the sessions that never publish.
 *
 * PUBLISHING: the steps this script prints. A session's first publish is refused
 * twice by design (not viewed, then resent unchanged) and the third goes through;
 * reading the page first does not count as viewing it unless every line of the
 * saved file is read, so no read is made.
 *
 *   Publish only on her say-so; once she has said to publish, do it without asking again (CLAUDE.md §1).
 *   Her ledger lives IN that page until she Exports.
 *
 * Usage:
 *   node build/build_app.js [--test-page] --venues <store's venues/occasional.json> --names <review page's names dir>
 *       Built on main for publishing, it first files the store's waiting venues and her review-page names into
 *       venues/register.js (it says how to read them when they are missing).
 *   node build/build_app.js --local      a build to check, never published: files nothing
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
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
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

// ── the venues waiting in the store, filed into the code (docs/restructure.md, 4A) ───────────────
//
// A build that will be published files what the page's store holds for venues first: the waiting
// room (`venues/occasional`) into venues/register.js, and her names from the venue review page. The
// build cannot reach a store, so the session reads both into files and passes them; without them a
// build for publishing stops. Nothing else is written; the fact check must pass after.
const argOf = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const venuesFile = argOf('--venues'), namesDir = argOf('--names');
let gitBranch = '';
try { gitBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a checkout */ }
const STORE_OF = { app: 'https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5', test: 'https://claude.ai/artifact/Ju1pKP84Gi3VNL1b2SULc5' };
const REVIEW = require('./venue_review.js');
const filedLines = [];
// `--local`: a build for checking only (list_timing.js), never published; it files nothing.
const localOnly = args.includes('--local');
if (gitBranch === 'main' && !shellFrom && !localOnly) {
  const store = args.includes('--test-page') ? STORE_OF.test : STORE_OF.app;
  if (!venuesFile || !namesDir) die('a build for publishing files the store\'s waiting venues first. Read them, then run again:\n'
    + '  1. ArtifactData get url:"' + store + '" collection:"venues" doc_id:"occasional" out_dir:"<dir>"\n'
    + '  2. ArtifactData list url:"' + REVIEW.REVIEW_PAGE + '" collection:"names" out_dir:"<dir>"\n'
    + '  3. node build/build_app.js' + (args.includes('--test-page') ? ' --test-page' : '') + ' --venues <dir>/venues/occasional.json --names <dir>/names');
  const F = require('./file_venues.js');
  let data;
  try { data = JSON.parse(fs.readFileSync(venuesFile, 'utf8')); } catch (e) { die('cannot read ' + venuesFile + ' — ' + e.message); }
  const waiting = data && data.venues && typeof data.venues === 'object' ? data.venues : (data && data.data && data.data.venues) || data;
  const names = {};
  for (const f of fs.existsSync(namesDir) ? fs.readdirSync(namesDir) : die('no folder ' + namesDir)) {
    if (!f.endsWith('.json')) continue;
    const j = JSON.parse(fs.readFileSync(path.join(namesDir, f), 'utf8')), d = j.data || j;
    if (d && d.wanted) names[f.replace(/\.json$/, '')] = d.wanted;
  }
  const REG_FILE = path.join(ROOT, 'venues', 'register.js');
  const before = fs.readFileSync(REG_FILE, 'utf8');
  const r1 = F.file(before, F.evalRegister(before), waiting);
  const r2 = F.fileNames(r1.text, names);
  for (const l of [...r1.lines, ...r2.lines]) console.log('filed: ' + l), filedLines.push(l);
  if (r2.text !== before) {
    fs.writeFileSync(REG_FILE, r2.text);
    const j = spawnSync('node', [path.join(__dirname, 'app_join.js')], { encoding: 'utf8' });
    if (j.status !== 0) die((j.stderr || j.stdout || 'app_join.js failed').trim());
  }
  const fc = spawnSync('node', [path.join(__dirname, 'fact_check.js')], { encoding: 'utf8' });
  if (fc.status !== 0) die('the fact check fails after filing:\n' + (fc.stdout || fc.stderr).trim());
  REVIEW.build();
}

// Cat_Watch.jsx must be what the parts in app/ join to, or the build stops (docs/restructure.md).
{
  const j = spawnSync('node', [path.join(__dirname, 'app_join.js'), '--check'], { encoding: 'utf8' });
  if (j.status !== 0) die((j.stderr || j.stdout || 'app_join.js --check failed').trim());
}

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

// ── the description examples, re-taken ──────────────────────────────────────
//
// Links, Pages and Paste show Claude the sweep's own examples (re-taken by build/sync_shared.js); every
// build re-takes them from the runs on disk, so a published page never carries an old set.
execFileSync('node', [path.join(__dirname, 'sync_shared.js')], { stdio: 'inherit' });

// ── transpile ───────────────────────────────────────────────────────────────
//
// Prepared exactly as page_loads.js, page_renders.js and catalogue_lookup.js
// prepare it. Four things disagreeing about what the build is would be worse
// than one, and the render check is the only thing standing between a typo and
// a black screen.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-build-'));
const FOOTER = 'Art Watch {"\u00b7"} v {APP_VERSION}';
const TEST_FOOTER = 'Art Watch {"\u00b7"} TEST PAGE \u2014 not your app {"\u00b7"} v {APP_VERSION}';
const forRestructure = process.argv.includes('--test-page');
const source = fs.readFileSync(JSX, 'utf8');
// The restructure test page says in its footer that it is not her app (her ask).
if (forRestructure && !source.includes(FOOTER)) die('the footer line was not found — the test page could not be marked');
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + (forRestructure ? source.replace(FOOTER, TEST_FOOTER) : source)
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
// shipped a BLACK SCREEN twice. `npm run test:app` runs page_renders.js, which can;
// this only catches a stitch that produced something unparseable.
try { new Function(js); } catch (e) { die('the stitched page does not parse — ' + e.message); }
if (!/function App\(/.test(js)) die('the built page has no App component in it');

// Built on main, the page is her app; built on the cloud test branch, the test page
// under its own title (her decision when the cloud ledger merged). Anywhere else the
// page is not for publishing and the steps say so.
const HER_APP = 'https://claude.ai/artifact/E2WjpRgr4W5eSzYtxyfrt5';
const TEST_PAGE = 'https://claude.ai/artifact/CbUv5Fcwt1R3kug7azGNmf';
const TEST_BRANCH = 'claude/ledger-cloud';
let branch = '';
try { branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a checkout */ }
// The Period trial's own test page (her decision: a branch and a test page, never her app).
const PERIOD_PAGE = 'https://claude.ai/artifact/JeoJyWxJbU9RApY9q4sVni';
const PERIOD_BRANCH = 'claude/period-sort';
// The restructure's test page (docs/restructure.md, "Her tests"): built from main with --test-page.
const RESTRUCTURE_PAGE = 'https://claude.ai/artifact/Ju1pKP84Gi3VNL1b2SULc5';
const forTest = branch === TEST_BRANCH, forPeriod = branch === PERIOD_BRANCH;
const target = forRestructure ? (branch === 'main' ? RESTRUCTURE_PAGE : null) : branch === 'main' ? HER_APP : forTest ? TEST_PAGE : forPeriod ? PERIOD_PAGE : null;
let head = fs.readFileSync(HEAD, 'utf8');
if (forTest) head = head.replace('<title>Art Watch</title>', '<title>Art Watch Cloud Test</title>');
if (forPeriod) head = head.replace('<title>Art Watch</title>', '<title>Art Watch Period Test</title>');
if (forRestructure) head = head.replace('<title>Art Watch</title>', '<title>Art Watch Restructure Test</title>');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, head + js + fs.readFileSync(TAIL, 'utf8'));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + kb + ' KB, parses, App present.');
console.log('');
if (!target || localOnly) {
  console.log(localOnly ? 'NOT FOR PUBLISHING: a --local build files no venues.' : 'NOT FOR PUBLISHING: built on "' + (branch || '?') + '". Her app is published from main.');
  process.exit(0);
}
console.log((forRestructure ? 'FOR THE RESTRUCTURE TEST PAGE — title "Art Watch Restructure Test", footer marked TEST PAGE.' : forTest ? 'FOR THE CLOUD TEST PAGE — title set to "Art Watch Cloud Test".' : forPeriod ? 'FOR THE PERIOD TEST PAGE — title set to "Art Watch Period Test".' : 'FOR HER APP.') + ' Publishing is not');
console.log('automatable: the service refuses a session that has not viewed the live page. In order:');
console.log('');
console.log('  1. Artifact action:"publish" url:"' + target + '" file_path:"build/dist/index.html"');
console.log('     No `capabilities` (omitting carries all four forward). No read first: it does not');
console.log('     count as viewing the page. Already published this session? It goes through; skip to 4.');
console.log('  2. Refused as not viewed: expected. Either the refusal lists the live page\'s differences');
console.log('     (that counts as viewing it; check every "+" line is only the old side of your own change),');
console.log('     or it names a saved copy to read: then Read every line of that copy, in pieces, and');
console.log('     resending without the read is refused each time (her app, 15 Oct).');
console.log('  3. Send the same file again. Refused as "identical content ... resent unchanged":');
console.log('     expected. Send it once more and it goes through.');
console.log('  4. Push ' + branch + '. If anything else happens, update these lines.');
console.log('');
console.log('  5. Publish build/dist/venue_review.html to ' + REVIEW.REVIEW_PAGE + ' (her venue review page,');
console.log('     its list rebuilt from the register). Commit and push venues/register.js with the page.');
const filedVenues = filedLines.filter(l => !/: not filed/.test(l));
console.log('  6. Tell her, in one line: ' + (filedVenues.length
  ? '"FYI: your latest venue info from the store is now in the code too."'
  : 'nothing (no venue was waiting to be filed).'));
console.log('');
console.log('  Publish only on her say-so; once she has said to publish, do it without asking again (CLAUDE.md §1).');
console.log('  Run `npm run test:app` before publishing: page_renders.js is the only check that');
console.log('  catches a page which parses and still shows a black screen.');
