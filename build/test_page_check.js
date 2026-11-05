#!/usr/bin/env node
/*
 * test_page_check.js — before a test page goes to her: does it show what her app shows?
 * (docs/restructure.md, "Her tests" — a test page is a true test only if it is set up as her app is.)
 *
 * Runs her live version and the version built now in a stand-in browser, each with a store holding
 * copies of her app's records (link venues, quarantine, sweep log) and her current ledger loaded,
 * then compares: every venue's name as a card shows it, every venue chip, and the whole screen.
 * A venue name that is a web address or missing fails, in either version.
 *
 *   node build/test_page_check.js <store dir> <ledger.json> [--live <git ref>]
 *
 * <store dir> holds venues/occasional.json, quarantine/rows.json, sweeps/venues.json as ArtifactData
 * saves them; <ledger.json> is her ledger (decoded from her store's ledger/live). Neither is committed.
 * --live: the commit her app was last published from (default: the last "Version N" commit).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NOW = Date.parse('2026-11-05T10:00:00Z');

async function snapshot(jsxFile, storeDir, ledgerFile, outFile) {
  const src = fs.readFileSync(jsxFile, 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-tpc-'));
  fs.writeFileSync(path.join(tmp, 'app.tsx'), 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + src.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){'));
  try { execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' }); } catch {}
  const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

  const RealDate = Date;
  global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
  let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const { JSDOM } = require('jsdom');
  const { fakeStore } = require(path.join(ROOT, 'scraper', 'fixtures', 'fake_store.js'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const store = fakeStore();
  for (const p of ['venues/occasional', 'quarantine/rows', 'sweeps/venues']) {
    const f = path.join(storeDir, p + '.json');
    if (!fs.existsSync(f)) throw new Error('missing copy of her store record ' + p);
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    store.docs.set(p, JSON.stringify(d.data || d));
  }
  win.claude = { use: async name => (name === 'db' ? store : null) };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'HTMLInputElement']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  console.error = () => {};
  const env = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {MU, MUSEUMS, App};')(React, win, doc, win.localStorage);
  const settle = ms => new Promise(r => setTimeout(r, ms));
  const steady = async () => { let last = '', same = 0; const t = RealDate.now();
    while (RealDate.now() - t < 20000) { const h = doc.body.innerHTML; same = h === last ? same + 1 : 0; last = h; if (same >= 8) return; await settle(50); } };
  const root = createRoot(doc.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(env.App)); });
  global.IS_REACT_ACT_ENVIRONMENT = false;
  await steady();
  const input = doc.querySelector('input[type=file][accept=".json"]');
  Object.defineProperty(input, 'files', { value: [new win.File([fs.readFileSync(ledgerFile, 'utf8')], 'ledger.json', { type: 'application/json' })], configurable: true });
  input.dispatchEvent(new win.Event('change', { bubbles: true }));
  await settle(300); await steady();
  const rows = JSON.parse(fs.readFileSync(ledgerFile, 'utf8')).rows || [];
  const names = {};
  for (const id of [...new Set(rows.map(r => r.museumId))].sort()) { const mu = env.MU[id]; names[id] = mu ? (mu.card || mu.short || '') : ''; }
  const chips = [...doc.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean);
  fs.writeFileSync(outFile, JSON.stringify({ names, chips, screen: doc.body.innerHTML, rows: rows.length }));
  process.exit(0);
}

function main() {
  const a = process.argv.slice(2);
  if (a[0] === '--snapshot') return snapshot(a[1], a[2], a[3], a[4]).catch(e => { console.log(String(e.stack || e)); process.exit(1); });
  const [storeDir, ledger] = a;
  if (!storeDir || !ledger) { console.log('usage: node build/test_page_check.js <store dir> <ledger.json> [--live <git ref>]'); process.exit(2); }
  const li = a.indexOf('--live');
  const liveRef = li >= 0 ? a[li + 1] : execFileSync('git', ['log', '-1', '--format=%H', '--grep=^Version [0-9]'], { cwd: ROOT }).toString().trim();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-tpc-'));
  const liveJsx = path.join(tmp, 'live.jsx');
  fs.writeFileSync(liveJsx, execFileSync('git', ['show', liveRef + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 64 << 20 }));
  const snaps = [['her app (' + liveRef.slice(0, 7) + ')', liveJsx], ['now', path.join(ROOT, 'Cat_Watch.jsx')]].map(([label, f], k) => {
    const out = path.join(tmp, k + '.json');
    const r = spawnSync(process.execPath, [__filename, '--snapshot', f, path.resolve(storeDir), path.resolve(ledger), out], { encoding: 'utf8', cwd: ROOT, timeout: 300000 });
    if (r.status !== 0) { console.log('FAIL  ' + label + ' could not be run: ' + (r.stdout || r.stderr).slice(-600)); process.exit(1); }
    return { label, ...JSON.parse(fs.readFileSync(out, 'utf8')) };
  });
  let bad = 0;
  const looksLikeAddress = s => !s || (/\./.test(s) && !/\s/.test(s)) || /^occ-/.test(s);
  for (const s of snaps) {
    const wrong = Object.entries(s.names).filter(([, n]) => looksLikeAddress(n));
    if (wrong.length) { bad++; console.log('FAIL  ' + s.label + ': venue names that are an address or missing: ' + wrong.map(([id, n]) => id + ' → "' + n + '"').join(', ')); }
    else console.log('PASS  ' + s.label + ': every one of ' + Object.keys(s.names).length + ' venues in her ' + s.rows + ' shows has a name');
  }
  const [o, n] = snaps;
  const diffNames = Object.keys({ ...o.names, ...n.names }).filter(id => o.names[id] !== n.names[id]);
  if (diffNames.length) { bad++; console.log('FAIL  venue names differ from her app: ' + diffNames.map(id => id + ': "' + o.names[id] + '" → "' + n.names[id] + '"').join(', ')); }
  else console.log('PASS  every venue name is the same as in her app');
  if (o.chips.join('\n') !== n.chips.join('\n')) { bad++; console.log('FAIL  the buttons and chips differ from her app'); } else console.log('PASS  every button and chip is the same as in her app');
  if (o.screen !== n.screen) {
    let i = 0; while (o.screen[i] === n.screen[i]) i++;
    console.log('NOTE  the screen differs from her app at character ' + i + ':\n   hers …' + o.screen.slice(Math.max(0, i - 80), i + 80) + '…\n   now  …' + n.screen.slice(Math.max(0, i - 80), i + 80) + '…');
  } else console.log('PASS  the whole screen after loading her ledger is the same as in her app');
  console.log(bad ? 'TEST PAGE CHECK FAILED: ' + bad : 'TEST PAGE CHECK PASSED');
  process.exit(bad ? 1 : 0);
}
main();
