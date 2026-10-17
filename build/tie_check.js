#!/usr/bin/env node
/*
 * tie_check.js — builds the "Tie Check" page: the app's Find catalogue run live on her Yale
 * Turner case and the cases the tie must not break (TIE_RULES in Cat_Watch.jsx).
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/tie_check_page.jsx appended; TieCheck is mounted instead of App. No app function
 * is copied. The cases and the git branch and commit it was built from are written in.
 *
 *   node build/tie_check.js       → build/dist/tie_check.html
 *
 * Publish to the Tie Check page only, never her app.
 * Capabilities: mcp (Parallel Search Key: web_search, web_fetch), sample, db.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const PAGE = path.join(__dirname, 'tie_check_page.jsx');
const OUT = path.join(__dirname, 'dist', 'tie_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(TieCheck));';

// Her Yale Turner (lookup log L17922262169059mtk) and the cases the tie must leave as they
// were, each with the answer read live on 17 Oct 2026. `notIsbn`: must not be filed;
// `wantIsbn`: must be the card's book or one of its versions; `want: "yes"`: a catalogue filed.
const CASE = {
  yale: { showUrl: 'https://britishart.yale.edu/exhibitions-programs/j-m-w-turner-romance-and-reality' },
  cases: [
    { venue: 'yale', title: 'J. M. W. Turner: Romance and Reality', startDate: '2025-03-29', endDate: '2025-07-27',
      exUrl: 'https://britishart.yale.edu/exhibitions-programs/j-m-w-turner-romance-and-reality',
      notIsbn: '9780300279719', what: 'The Collection Series “Turner” is not filed as its catalogue' },
    { venue: 'yale', title: 'Gwen John: Strange Beauties', startDate: '2026-02-26', endDate: '2026-06-28',
      exUrl: 'https://britishart.yale.edu/exhibitions-programs/gwen-john-strange-beauties',
      want: 'yes', what: 'Its catalogue is still found' },
    { venue: 'yale', title: 'John Constable: The Landscape Reimagined', startDate: '2026-09-03', endDate: '2027-07-25',
      exUrl: 'https://britishart.yale.edu/exhibitions-programs/john-constable-landscape-reimagined',
      wantIsbn: '9780300284669', what: '“Constable” (Accompanying Publication) is still found' },
    { venue: 'louvre', title: 'Hubert Robert (1733–1808). A Visionary Painter', startDate: '2016-03-08', endDate: '2016-05-30',
      exUrl: 'https://www.louvre.fr/en/what-s-on/exhibitions/hubert-robert-1733-1808',
      wantIsbn: '9782757210642', what: 'The French catalogue is still found (her case 2)' },
    { venue: 'jacquemart', title: 'Hammershøi: the master of danish painting', startDate: '2019-03-14', endDate: '2019-07-22',
      exUrl: 'https://www.musee-jacquemart-andre.com/en/hammershoi',
      wantIsbn: '9789462302495', what: 'The French catalogue is still found (her case 4)' },
  ],
};

const git = a => { try { return execFileSync('git', a, { cwd: ROOT }).toString().trim(); } catch { return ''; } };
function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }

const app = fs.readFileSync(JSX, 'utf8');
const appVersion = (app.match(/^const APP_VERSION = "([^"]+)"/m) || [])[1];
if (!appVersion) die('no APP_VERSION in Cat_Watch.jsx');
const dirty = git(['status', '--porcelain', '--', 'Cat_Watch.jsx']) ? ' + uncommitted changes' : '';
const build = { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
  commit: (git(['rev-parse', '--short', 'HEAD']) || 'unknown') + dirty, appVersion,
  builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-tie-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + app.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){')
  + '\nconst SC_CASE = ' + JSON.stringify(CASE) + ';\nconst SC_BUILD = ' + JSON.stringify(build) + ';\n'
  + fs.readFileSync(PAGE, 'utf8');
fs.writeFileSync(path.join(tmp, 'page.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'page.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const built = path.join(tmp, 'page.js');
if (!fs.existsSync(built)) die('the page did not transpile');
const js = fs.readFileSync(built, 'utf8').replace(/\n*$/, '\n');
try { new Function(js); } catch (e) { die('the page does not parse — ' + e.message); }
if (!/function TieCheck\(/.test(js) || !/async function discoverShop\(/.test(js)) die('TieCheck or discoverShop missing');

const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Tie Check</title>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head + js + MOUNT + '\n' + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + build.branch + ' ' + build.commit + ', app ' + appVersion
  + ', ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB.');
