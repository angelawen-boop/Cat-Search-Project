/**
 * IMPORT ONTO AN EMPTY PAGE, AND A SAVE THAT SHRINKS THE LEDGER — driven through
 * the app, as cloud_app.js drives it.
 *
 * Her case: the page opened empty, she pressed Import, approved the cards, and
 * Saved — a file and a Cloud Save holding only the 2 imported rows. Now:
 *   EI-001–002  Import on an empty page offers only "Open last cloud save" and Load.
 *   EI-003–006  Save asks before writing fewer exhibitions than the cloud holds.
 *
 *   node scraper/fixtures/cloud_empty_import.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-empty-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
    '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

const { JSDOM } = require('jsdom');
// React and react-dom are loaded AFTER the browser globals are in place:
// react-dom decides at load whether typing events exist, and loaded first it
// decides they do not, so a typed label never reaches the page.
let React, createRoot, act;

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const HERS_FILE = path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json');
const HERS_TEXT = fs.readFileSync(HERS_FILE, 'utf8');
const hers = JSON.parse(HERS_TEXT);

// The storage code, lifted the same way cloud_ledger.js lifts it, to READ
// what the page wrote.
const src = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');
const sec = src.slice(src.indexOf('// ── THE CLOUD LEDGER — branch claude/ledger-cloud'), src.indexOf('// ── END OF THE CLOUD LEDGER'));
const C = new Function(sec + '\nreturn {cloudReadLive,cloudSaveLive,cloudListSnapshots};')();

const settle = async (ms = 50) => { await new Promise(r => setTimeout(r, ms)); };
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const store = fakeStore();
  const saved = [];
  win.claude = {
    use: async name => {
      if (name === 'db') return store;
      if (name === 'downloads') return { save: async f => { saved.push(f); } };
      return null;
    },
  };
  // Her full ledger is the cloud copy before the page opens.
  await C.cloudSaveLive(store, HERS_TEXT, { rows: hers.rows.length, quarantined: hers.ignored.length }, null);
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event',
    'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent'];
  for (const k of globals) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = [];
  const realError = console.error;
  console.error = (...a) => shouted.push(String(a[0]));

  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(React, win, doc, win.localStorage);
  const root = createRoot(doc.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await settle();
  global.IS_REACT_ACT_ENVIRONMENT = false;

  const text = () => doc.getElementById('root').textContent;
  const buttons = label => [...doc.querySelectorAll('button')].filter(b => b.textContent.trim() === label);
  const button = label => buttons(label)[0];
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const snapCount = () => [...store.docs.keys()].filter(k => k.startsWith('snapshots/')).length;
  const liveRows = async () => { const l = await C.cloudReadLive(store); return l.rec ? JSON.parse(l.text).rows.length : null; };
  const loadText = async t => {
    const input = doc.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([t], 'ledger.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const N = hers.rows.length;
  const two = JSON.stringify({ rows: hers.rows.slice(0, 2), ignored: hers.ignored, lastRun: null });

  try {
    await until(() => /Open it/.test(text()));

    // 1. Empty page: Import offers only the ways to open her ledger.
    click(button('Import'));
    await until(() => /Your ledger needs to be opened first\./.test(text()));
    ok(/Your ledger needs to be opened first\./.test(text()), 'EI-001: Import on an empty page says "Your ledger needs to be opened first."');
    ok(button('Open last cloud save') && button('Load') && !button('CSV') && !button('Links'),
      'EI-001b: it offers "Open last cloud save" and Load, and no CSV or Links');

    // 2. Open last cloud save: her ledger is on screen, and Import works.
    click(button('Open last cloud save'));
    ok(await until(() => new RegExp('Opened the cloud copy saved .* \\u2014 ' + N + ' exhibitions').test(text())),
      `EI-002: "Open last cloud save" opens her ${N}-row cloud copy`);
    ok(!/Your ledger needs to be opened first/.test(text()), 'EI-002b: and the message goes');
    click(button('Import'));
    ok(await until(() => button('CSV') && button('Links')), 'EI-002c: with her ledger open, Import offers CSV and Links');
    click(button('Cancel'));

    // 3. A 2-row file loaded over it; Save asks before writing it.
    await loadText(two);
    ok(await until(async () => (await liveRows()) === 2), 'EI-003: a 2-row file loaded becomes the cloud copy (its safety copy taken first)');
    const snapsBefore = snapCount();
    click(button('Save'));
    await until(() => button('Save now'));
    click(button('Save now'));
    const asked = new RegExp('You\\u2019re saving 2 exhibitions; your last cloud save has ' + N + '\\. Save anyway\\?');
    ok(await until(() => asked.test(text())), `EI-003b: Save asks "You're saving 2 exhibitions; your last cloud save has ${N}. Save anyway?"`);
    ok(saved.length === 0 && snapCount() === snapsBefore, 'EI-003c: nothing is written while it asks');

    // 4. Cancel: nothing written.
    { const c = buttons('Cancel'); click(c[c.length - 1]); }
    await settle(200);
    ok(!asked.test(text()) && saved.length === 0 && snapCount() === snapsBefore, 'EI-004: Cancel writes nothing');

    // 5. Save anyway: written as asked.
    click(button('Save now'));
    await until(() => button('Save anyway'));
    click(button('Save anyway'));
    ok(await until(() => saved.length === 1 && snapCount() === snapsBefore + 1), 'EI-005: "Save anyway" saves the file and its cloud copy');
    ok(JSON.parse(saved[0].data).rows.length === 2, 'EI-005b: holding the 2 rows on screen');

    // 6. Her full ledger again: same size as the cloud, so Save asks nothing.
    await loadText(HERS_TEXT);
    await until(async () => (await liveRows()) === N);
    if (!button('Save now')) click(button('Save'));
    await until(() => button('Save now'));
    click(button('Save now'));
    ok(await until(() => saved.length === 2), 'EI-006: a Save no smaller than the cloud asks nothing');
    ok(!/Save a smaller ledger\?/.test(text()), 'EI-006b: no question on screen');

    const real = shouted.filter(x => !/not wrapped in act|testing environment is not configured/.test(x));
    ok(real.length === 0, 'EI-007: nothing written to the console as an error throughout', real.slice(0, 2).join(' | '));
  } catch (e) {
    fail++; console.log('FAIL  cloud_empty_import crashed — ' + (e && (e.stack || e.message)));
  } finally {
    try { await act(async () => root.unmount()); } catch {}
    console.error = realError;
    win.close();
  }
  console.log(`\ncloud_empty_import: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
