#!/usr/bin/env node
/*
 * live_check.js — builds the "Cat Watch live check" page (CLAUDE.md §7.4).
 *
 * The page runs the app's real catalogue lookup on her nine agreed cases, with her
 * connector and the in-page Claude, and grades each against
 * docs/lookup_proof_cards.json. A catalogue-lookup change is "fixed" only when it passes.
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/live_check_page.jsx appended; LiveCheck is mounted instead of App. No app
 * function is copied. The cards (build/live_check_cases.json), the right answers, the
 * version and the git commit are written in as constants.
 *
 *   node build/live_check.js      → build/dist/live_check.html
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
const CARDS = path.join(ROOT, 'docs', 'lookup_proof_cards.json');
const OUT = path.join(__dirname, 'dist', 'live_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(LiveCheck));';

function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }
const git = a => { try { return execFileSync('git', a, { cwd: ROOT }).toString().trim(); } catch { return ''; } };

const app = fs.readFileSync(JSX, 'utf8');
const version = (app.match(/^const APP_VERSION = "([^"]+)"/m) || [])[1];
if (!version) die('no APP_VERSION in Cat_Watch.jsx');
const dirty = git(['status', '--porcelain', '--', 'Cat_Watch.jsx']) ? ' + uncommitted changes to Cat_Watch.jsx' : '';
const commit = (git(['rev-parse', '--short', 'HEAD']) || 'unknown') + dirty;

const cases = JSON.parse(fs.readFileSync(CASES, 'utf8'));
const cards = JSON.parse(fs.readFileSync(CARDS, 'utf8')).cards;
for (const c of cases.cases) if (!cards.some(k => k.case === c.case)) die('case ' + c.case + ' has no right answers in docs/lookup_proof_cards.json');

const consts = 'const LC_CASES = ' + JSON.stringify(cases.cases) + ';\n'
  + 'const LC_CARDS = ' + JSON.stringify(cards) + ';\n'
  + 'const LC_VENUES = ' + JSON.stringify(cases.venues || {}) + ';\n'
  + 'const LC_BUILD = ' + JSON.stringify({ version, commit, builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }) + ';\n';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-live-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + app.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){')
  + '\n' + consts + fs.readFileSync(PAGE, 'utf8');
fs.writeFileSync(path.join(tmp, 'page.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'page.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const built = path.join(tmp, 'page.js');
if (!fs.existsSync(built)) die('the page did not transpile');
const js = fs.readFileSync(built, 'utf8').replace(/\n*$/, '\n') + MOUNT + '\n';
try { new Function(js); } catch (e) { die('the page does not parse — ' + e.message); }
if (!/function LiveCheck\(/.test(js) || !/async function lookupCatalogue\(/.test(js)) die('LiveCheck or lookupCatalogue missing');

const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Cat Watch Live Check</title>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head + js + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));
console.log('built ' + path.relative(ROOT, OUT) + ' — version ' + version + ', commit ' + commit + ', '
  + cases.cases.length + ' cases, ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB.');
