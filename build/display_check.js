#!/usr/bin/env node
/*
 * display_check.js — builds the "Catalogue Display Check" page: her catalogue test cards in the
 * app itself (docs/catalogue_versions.md), plus a panel that watches what the change reaches.
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/display_check_page.jsx appended; DisplayCheck (the panel, then App) is mounted. No app
 * function is copied.
 *
 *   node build/display_check.js --ledger <her ledger.json> --venues <venues/occasional.json> --seed <dir>
 *       → build/dist/display_check.html, and in <dir> the store documents to seed the page with:
 *         her test cards as the page's cloud save (ledger/live, ledgerParts/…) and a copy of her
 *         link venues' records (venues/occasional). Her files are read, never written.
 *
 * Publish to the check page only (DISPLAY_CHECK), never her app; capabilities as her app's
 * (db, downloads, mcp Parallel Search Key, sample) and its runtime version 0.2.52.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const PAGE = path.join(__dirname, 'display_check_page.jsx');
const OUT = path.join(__dirname, 'dist', 'display_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(DisplayCheck));';
const DISPLAY_CHECK = 'https://claude.ai/artifact/E7uMEQVMoSFrx3EiJXwBe9';

// Her cases, by ledger id. Edward Lear (Yale) is left out on purpose: she adds it by link.
const CASES = [
  'occ-britishart-yale-edu-sensationandsensibilityviewinggainsboroughscottage',
  'occ-britishart-yale-edu-johnconstablethelandscapereimagined',
  'occ-britishart-yale-edu-gwenjohnstrangebeauties',
  'occ-britishart-yale-edu-victorianradicalsfromthepreraphaelitestotheartsand',
  'occ-britishart-yale-edu-canalettoinenglandavenetianartistabroad17461755',
  'occ-britishart-yale-edu-thebeautyoflifewilliammorrisandtheartofdesign',
  'occ-britishart-yale-edu-pearlstopyramidsbritishvisualcultureandthelevant16',
  'khm-canalettoandbellotto',
];
const YALE = 'occ-britishart-yale-edu';
const WATCHED = ['shop', 'confirmed', 'finder', 'shelfKind', 'shopHome', 'shopCatalogues', 'shopSearch', 'pageShop', 'host'];

const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }
const git = a => { try { return execFileSync('git', a, { cwd: ROOT }).toString().trim(); } catch { return ''; } };
const docOf = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j.data || j; };

const ledgerFile = arg('--ledger'), venuesFile = arg('--venues'), seedDir = arg('--seed');
if (!ledgerFile || !venuesFile || !seedDir) die('usage: --ledger <file> --venues <file> --seed <dir>');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const venues = docOf(venuesFile);
const yale = (venues.venues || {})[YALE];
if (!yale) die('no Yale venue record in ' + venuesFile);
const rows = CASES.map(id => ledger.rows.find(r => r.id === id) || die('case not in her ledger: ' + id));

const dirty = git(['status', '--porcelain', '--', 'Cat_Watch.jsx', 'build/display_check_page.jsx']) ? ' + uncommitted changes' : '';
const build = { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
  commit: (git(['rev-parse', '--short', 'HEAD']) || 'unknown') + dirty,
  builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' };
const base = { id: YALE, fields: WATCHED, venue: Object.fromEntries(WATCHED.map(k => [k, yale[k] === undefined ? null : yale[k]])) };

// ── the page ────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-display-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8').replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){')
  + '\nconst DC_BASE = ' + JSON.stringify(base) + ';\nconst DC_BUILD = ' + JSON.stringify(build) + ';\n'
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
if (!/function DisplayCheck\(/.test(js) || !/function App\(/.test(js)) die('DisplayCheck or App missing');
const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Catalogue Display Check</title>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head + js + MOUNT + '\n' + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));

// ── the store documents: a cloud save as the app writes one (cloudSaveLive) ──
const text = JSON.stringify({ rows, ignored: [], lastRun: null, exportedAt: new Date().toISOString() }, null, 2);
const z = zlib.gzipSync(Buffer.from(text, 'utf8')).toString('base64');
const PART = 180000, id = 'gdisplay' + Date.now().toString(36), parts = Math.max(1, Math.ceil(z.length / PART));
fs.mkdirSync(seedDir, { recursive: true });
const seed = [];
for (let i = 0; i < parts; i++) {
  const f = path.join(seedDir, 'ledgerParts__' + id + '-' + i + '.json');
  fs.writeFileSync(f, JSON.stringify({ z: z.slice(i * PART, (i + 1) * PART), i, of: parts }));
  seed.push({ collection: 'ledgerParts', doc_id: id + '-' + i, file: f });
}
const live = path.join(seedDir, 'ledger__live.json');
fs.writeFileSync(live, JSON.stringify({ id, parts, sha: crypto.createHash('sha256').update(text).digest('hex'), bytes: text.length,
  zbytes: z.length, savedAt: new Date().toISOString(), rows: rows.length, quarantined: 0 }));
const occ = path.join(seedDir, 'venues__occasional.json');
fs.writeFileSync(occ, JSON.stringify({ venues: venues.venues, updatedAt: venues.updatedAt || new Date().toISOString() }));
seed.push({ collection: 'venues', doc_id: 'occasional', file: occ }, { collection: 'ledger', doc_id: 'live', file: live });

console.log('built ' + path.relative(ROOT, OUT) + ' — ' + build.branch + ' ' + build.commit + ', '
  + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB, ' + rows.length + ' cases.');
console.log('Publish to ' + DISPLAY_CHECK + ' only. Then seed its store, in this order (parts before the live record):');
for (const s of seed) console.log('  ' + s.collection + '/' + s.doc_id + '  ←  ' + s.file);
