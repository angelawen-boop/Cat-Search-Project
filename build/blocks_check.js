#!/usr/bin/env node
/*
 * blocks_check.js — builds the "Catalogue Blocks Check" page: her named test cards run live
 * through the app's own Find catalogue, drawn by the app's own drawer (CatalogueBox,
 * CatalogueNone), graded in code against her agreed spec (docs/catalogue_versions.md).
 *
 * Cat_Watch.jsx is bundled whole, prepared exactly as build_app.js prepares it, with
 * build/blocks_check_page.jsx appended; BlocksCheck is mounted instead of App. No app function
 * is copied. Each case starts from a BLANK card (only the show's own facts from her ledger), so
 * every result is today's code, never a card saved before it.
 *
 *   node build/blocks_check.js --ledger <her ledger.json> --venues <venues/occasional.json>
 *       → build/dist/blocks_check.html. Her files are read, never written.
 *
 * Publish to the check page only (BLOCKS_CHECK), never her app. Capabilities: db, mcp
 * (Parallel Search Key: web_search, web_fetch), sample; runtime version as her app's.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const PAGE = path.join(__dirname, 'blocks_check_page.jsx');
const OUT = path.join(__dirname, 'dist', 'blocks_check.html');
const MOUNT = 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(BlocksCheck));';
const BLOCKS_CHECK = 'https://claude.ai/artifact/TCGZyPJgUJmNS9bueC2Rds';

// Her named cases (docs/handover_catalogue_display.md), by ledger id.
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
// The show's own facts only: the card is blank, as Search again makes it.
const SHOW = ['id', 'museumId', 'title', 'startDate', 'endDate', 'summary', 'exUrl'];

const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }
const git = a => { try { return execFileSync('git', a, { cwd: ROOT }).toString().trim(); } catch { return ''; } };
const docOf = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j.data || j; };

const ledgerFile = arg('--ledger'), venuesFile = arg('--venues');
if (!ledgerFile || !venuesFile) die('usage: --ledger <file> --venues <file>');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const venues = docOf(venuesFile).venues || {};
const cases = CASES.map(id => {
  const r = (ledger.rows || ledger).find(x => x.id === id) || die('case not in her ledger: ' + id);
  return { ...Object.fromEntries(SHOW.map(k => [k, r[k] === undefined ? null : r[k]])),
    interested: true, watching: false, acquiring: null, buyNext: false, looked: false, hasCatalogue: 'unknown' };
});
// The link venues the cases file under, as her app's store holds them.
const occ = {};
for (const c of cases) if (c.museumId.startsWith('occ-')) occ[c.museumId] = venues[c.museumId] || die('no venue record for ' + c.museumId);

const dirty = git(['status', '--porcelain', '--', 'Cat_Watch.jsx', 'build/blocks_check_page.jsx']) ? ' + uncommitted changes' : '';
const build = { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
  commit: (git(['rev-parse', '--short', 'HEAD']) || 'unknown') + dirty,
  builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-blocks-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8').replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){')
  + '\nconst BC_CASES = ' + JSON.stringify(cases) + ';\nconst BC_VENUES = ' + JSON.stringify(occ)
  + ';\nconst BC_BUILD = ' + JSON.stringify(build) + ';\n'
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
if (!/function BlocksCheck\(/.test(js) || !/function CatalogueNone\(/.test(js)) die('BlocksCheck or CatalogueNone missing');
const head = fs.readFileSync(path.join(__dirname, 'shell_head.html'), 'utf8').replace('<title>Cat Watch</title>', '<title>Catalogue Blocks Check</title>');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head + js + MOUNT + '\n' + fs.readFileSync(path.join(__dirname, 'shell_tail.html'), 'utf8'));
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + build.branch + ' ' + build.commit + ', '
  + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB, ' + cases.length + ' cases.');
console.log('Publish to ' + BLOCKS_CHECK + ' only, never her app.');
