#!/usr/bin/env node
/*
 * live_check.js — builds the "Cat Watch live check" page (CLAUDE.md §7.4).
 *
 * The page runs the app's real catalogue lookup on the cases, in rounds, with her
 * connector and the in-page Claude, and grades each by her Stage 1 pass test
 * (build/stage1_grade.js; answers docs/stage1_answers.json). A catalogue-lookup change is
 * "fixed" only when it passes, run more than once (docs/handover_search_stage1.md).
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/stage1_grade.js and build/live_check_page.jsx appended; LiveCheck is mounted instead of App. No app
 * function is copied. The cases (build/live_check_cases.json), the answers, the
 * git branch and commit it was built from are written in as constants.
 *
 *   node build/live_check.js      → build/dist/live_check.html
 *   require('./live_check.js').prepare()   → the same page's code, for tests
 *
 * Publish to the live check page only (its url: CLAUDE.md §7.4), never her app or test
 * page. Capabilities: mcp (Parallel Search Key: web_search, web_fetch), sample, db.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const PAGE = path.join(__dirname, 'live_check_page.jsx');
const CASES = path.join(__dirname, 'live_check_cases.json');
const ANSWERS = path.join(ROOT, 'docs', 'stage1_answers.json');
const GRADE = path.join(__dirname, 'stage1_grade.js');
const OUT = path.join(__dirname, 'dist', 'live_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(LiveCheck));';

const git = a => { try { return execFileSync('git', a, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

// Cat_Watch.jsx and the page, transpiled and parsed, without the mount line. `build`
// overrides the branch, commit and time written in as LC_BUILD (tests pass their own).
// `opts.edit(source)` returns an altered copy of Cat_Watch.jsx for a test; the file is never written.
function prepare(build = {}, opts = {}) {
  const app = opts.edit ? opts.edit(fs.readFileSync(JSX, 'utf8')) : fs.readFileSync(JSX, 'utf8');
  const appVersion = (app.match(/^const APP_VERSION = "([^"]+)"/m) || [])[1];
  if (!appVersion) throw new Error('no APP_VERSION in Cat_Watch.jsx');
  const dirty = git(['status', '--porcelain', '--', 'Cat_Watch.jsx']) ? ' + uncommitted changes to Cat_Watch.jsx' : '';
  const commit = build.commit || (git(['rev-parse', '--short', 'HEAD']) || 'unknown') + dirty;
  const branch = build.branch || git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';

  const cases = JSON.parse(fs.readFileSync(CASES, 'utf8'));
  const answers = JSON.parse(fs.readFileSync(ANSWERS, 'utf8')).cases;
  for (const c of cases.cases) if (!answers[c.case]) throw new Error('case ' + c.case + ' has no answers in docs/stage1_answers.json');

  const consts = 'const LC_CASES = ' + JSON.stringify(cases.cases) + ';\n'
    + 'const LC_ANSWERS = ' + JSON.stringify(answers) + ';\n'
    + 'const LC_VENUES = ' + JSON.stringify(cases.venues || {}) + ';\n'
    + 'const LC_BUILD = ' + JSON.stringify({ branch, commit, appVersion, builtAt: build.builtAt || new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }) + ';\n';

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-live-'));
  const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + app.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){')
    + '\n' + consts + fs.readFileSync(GRADE, 'utf8') + '\n' + fs.readFileSync(PAGE, 'utf8');
  fs.writeFileSync(path.join(tmp, 'page.tsx'), prepared);
  try {
    execFileSync('npx', ['tsc', path.join(tmp, 'page.tsx'), '--jsx', 'react',
      '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
  } catch { /* type errors are expected; the emit is what matters */ }
  const built = path.join(tmp, 'page.js');
  if (!fs.existsSync(built)) throw new Error('the page did not transpile');
  const js = fs.readFileSync(built, 'utf8').replace(/\n*$/, '\n');
  try { new Function(js); } catch (e) { throw new Error('the page does not parse — ' + e.message); }
  if (!/function LiveCheck\(/.test(js) || !/async function lookupCatalogue\(/.test(js)) throw new Error('LiveCheck or lookupCatalogue missing');
  return { js, branch, commit, appVersion, caseCount: cases.cases.length };
}
module.exports = { prepare };

if (require.main === module) {
  let r;
  try { r = prepare(); } catch (e) { console.error('BUILD FAILED — ' + e.message); process.exit(1); }
  const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Cat Watch Live Check</title>');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, head + r.js + MOUNT + '\n' + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));
  console.log('built ' + path.relative(ROOT, OUT) + ' — branch ' + r.branch + ', commit ' + r.commit + ', '
    + r.caseCount + ' cases, ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB.');
}
