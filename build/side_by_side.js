#!/usr/bin/env node
/*
 * side_by_side.js — do two versions of the app give the same results? (docs/restructure.md, gate 3)
 *
 * Each version is built the way the build builds it, then run in a stand-in browser (jsdom) with
 * the same clock, the same random numbers and the same inputs:
 *   - every top-level value the page defines (each table and list, each function's text);
 *   - the opening screen;
 *   - the screen after importing the test ledger (docs/ledger_2026-09-24);
 *   - the review screen after reading the test sweep file (her 15 Oct import).
 * Any difference is printed with where it is, and the exit code is 1.
 *
 *   node build/side_by_side.js <old.jsx> <new.jsx>
 *   node build/side_by_side.js --base <git ref>        old = Cat_Watch.jsx at that commit, new = the file now
 *
 * What it cannot see: a click on any other button, and anything that needs the web or Claude.
 * For a pure move (every piece unchanged letter for letter) the value check already covers those.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json');
const SWEEP = path.join(ROOT, 'scraper', 'output', 'stitch_20261015_0920', 'sweep_compressed.csv');
const NOW = Date.parse('2026-11-05T10:00:00Z');

// ── one version: build it, run it, write what it showed ─────────────────────
async function snapshot(jsxFile, outFile) {
  const ts = require('typescript');
  const src = fs.readFileSync(jsxFile, 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
  // Prepared exactly as page_renders.js and build_app.js prepare it.
  const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + src.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){');
  fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
  try {
    execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
      '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
  } catch { /* type errors are expected; the emit is what matters */ }
  if (!fs.existsSync(path.join(tmp, 'app.js'))) throw new Error('did not transpile: ' + jsxFile);
  const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

  // Every name the page declares at the top level.
  const sf = ts.createSourceFile('a.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = [];
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
  }

  // The same clock and the same "random" numbers for both versions.
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(NOW); }
    static now() { return NOW; }
  }
  let seed = 7;
  Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const { JSDOM } = require('jsdom');
  const { fakeStore } = require(path.join(ROOT, 'scraper', 'fixtures', 'fake_store.js'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const store = fakeStore();
  const saved = [];
  win.claude = { use: async name => (name === 'db' ? store : name === 'downloads' ? { save: async f => { saved.push(f); } } : null) };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
    'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader',
    'File', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));

  global.Date = FixedDate;
  const ret = names.map(n => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',\n');
  const env = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {' + ret + '};')(
    React, win, doc, win.localStorage);

  const show = v => {
    if (typeof v === 'function') return 'function ' + String(v);
    try { return JSON.stringify(v, (k, x) => (typeof x === 'function' ? 'function ' + String(x) : x instanceof RegExp ? String(x) : x)); }
    catch (e) { return 'unshowable: ' + e.message; }
  };
  const values = {};
  for (const n of names) values[n] = show(env[n]);

  const settle = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 15000) => { const t = RealDate.now(); while (RealDate.now() - t < ms) { if (fn()) return true; await settle(40); } return false; };
  const steady = async () => { let last = '', same = 0; const t = RealDate.now();
    while (RealDate.now() - t < 15000) { const h = doc.body.innerHTML; same = h === last ? same + 1 : 0; last = h; if (same >= 8) return; await settle(50); } };
  const screens = {};
  const { act } = React;
  const root = createRoot(doc.getElementById('root'));
  await act(async () => { root.render(React.createElement(env.App)); });
  global.IS_REACT_ACT_ENVIRONMENT = false;
  await steady();
  screens.opening = doc.body.innerHTML;

  const give = (accept, name, type, text) => {
    const input = doc.querySelector(`input[type=file][accept="${accept}"]`);
    if (!input) throw new Error('no file input accepting ' + accept);
    Object.defineProperty(input, 'files', { value: [new win.File([text], name, { type })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const before = doc.body.innerHTML;
  give('.json', 'ledger.json', 'application/json', fs.readFileSync(LEDGER, 'utf8'));
  await until(() => doc.body.innerHTML !== before);
  await steady();
  screens.afterLedger = doc.body.innerHTML;

  give('.csv,text/csv', 'sweep.csv', 'text/csv', fs.readFileSync(SWEEP, 'utf8'));
  await until(() => /proposed change/.test(doc.body.textContent));
  await steady();
  screens.review = doc.body.innerHTML;

  screens.storeWritten = [...store.docs.keys()].sort().join('\n');
  screens.consoleErrors = shouted.join('\n');
  fs.writeFileSync(outFile, JSON.stringify({ values, screens }));
  root.unmount();
  process.exit(0);
}

// ── compare two versions ────────────────────────────────────────────────────
function firstDifference(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { at: i, old: a.slice(Math.max(0, i - 60), i + 100), now: b.slice(Math.max(0, i - 60), i + 100) };
}

function run(oldFile, newFile) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
  const snaps = [oldFile, newFile].map((f, k) => {
    const out = path.join(tmp, k + '.json');
    const r = spawnSync(process.execPath, [__filename, '--snapshot', f, out], { encoding: 'utf8', cwd: ROOT, timeout: 240000 });
    if (r.status !== 0 || !fs.existsSync(out)) {
      console.log('FAIL  the ' + (k ? 'new' : 'old') + ' version could not be run: ' + (r.stderr || r.stdout || '').slice(-800));
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  });
  const [o, n] = snaps;
  let diffs = 0;
  const names = [...new Set([...Object.keys(o.values), ...Object.keys(n.values)])];
  for (const k of names) {
    if (o.values[k] === n.values[k]) continue;
    diffs++;
    if (!(k in o.values)) console.log(`DIFF  value ${k}: only in the new version`);
    else if (!(k in n.values)) console.log(`DIFF  value ${k}: only in the old version`);
    else { const d = firstDifference(o.values[k], n.values[k]); console.log(`DIFF  value ${k}:\n   old …${d.old}…\n   new …${d.now}…`); }
  }
  console.log(`${names.length - diffs} of ${names.length} top-level values identical`);
  for (const s of Object.keys(o.screens)) {
    if (o.screens[s] === n.screens[s]) { console.log(`same  screen: ${s} (${o.screens[s].length} characters)`); continue; }
    diffs++;
    const d = firstDifference(o.screens[s], n.screens[s]);
    console.log(`DIFF  screen: ${s}, at character ${d.at}:\n   old …${d.old}…\n   new …${d.now}…`);
  }
  if (!/proposed change/.test(o.screens.review)) { diffs++; console.log('FAIL  the review screen never opened — the check did not run'); }
  console.log(diffs ? `SIDE BY SIDE: ${diffs} difference(s).` : 'SIDE BY SIDE: identical.');
  process.exit(diffs ? 1 : 0);
}

const args = process.argv.slice(2);
if (args[0] === '--snapshot') snapshot(args[1], args[2]).catch(e => { console.log(String(e && e.stack || e)); process.exit(1); });
else if (args[0] === '--base') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
  const old = path.join(tmp, 'old.jsx');
  fs.writeFileSync(old, execFileSync('git', ['show', args[1] + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 64 << 20 }));
  run(old, path.join(ROOT, 'Cat_Watch.jsx'));
} else if (args.length === 2) run(path.resolve(args[0]), path.resolve(args[1]));
else { console.log('usage: node build/side_by_side.js <old.jsx> <new.jsx> | --base <git ref>'); process.exit(2); }
