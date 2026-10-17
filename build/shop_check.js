#!/usr/bin/env node
/*
 * shop_check.js — builds the "Yale Shop Check" page: the app's shop finder and Find
 * catalogue run live on one case (docs/add_by_link.md, Yale CBA).
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/shop_check_page.jsx appended; ShopCheck is mounted instead of App. No app function
 * is copied. The case and the git branch and commit it was built from are written in.
 *
 *   node build/shop_check.js      → build/dist/shop_check.html
 *
 * Publish to the check page only (its url: docs/add_by_link.md, Yale CBA), never her app.
 * Capabilities: mcp (Parallel Search Key: web_search, web_fetch), sample, db.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const PAGE = path.join(__dirname, 'shop_check_page.jsx');
const OUT = path.join(__dirname, 'dist', 'shop_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ShopCheck));';

// Her Find catalogue that showed the fault (lookup log L17922200292083pen) and the right
// answers, read live: Publications, Constable's own product page, its ISBN.
const CASE = {
  title: 'John Constable: The Landscape Reimagined',
  showUrl: 'https://britishart.yale.edu/exhibitions-programs/john-constable-landscape-reimagined',
  startDate: '2026-09-03', endDate: '2027-07-25',
  wantShelf: 'https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true',
  wantProduct: 'PRODUCTID=2409',
  wantIsbn: '9780300284669',
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-shop-'));
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
if (!/function ShopCheck\(/.test(js) || !/async function discoverShop\(/.test(js)) die('ShopCheck or discoverShop missing');

const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Yale Shop Check</title>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head + js + MOUNT + '\n' + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + build.branch + ' ' + build.commit + ', app ' + appVersion
  + ', ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB.');
