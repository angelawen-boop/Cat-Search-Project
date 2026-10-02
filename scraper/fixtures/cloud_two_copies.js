/**
 * TWO COPIES OF THE PAGE OPEN AT ONCE — her ruling, 1 Oct: the later one is
 * READ ONLY. Two real app instances, each in its own window, share one
 * stand-in store, as two tabs or two devices share the page's store.
 *
 *   node scraper/fixtures/cloud_two_copies.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-two-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
    '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');
const { JSDOM } = require('jsdom');
let React, createRoot, act;

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const HERS_TEXT = fs.readFileSync(path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json'), 'utf8');
const hers = JSON.parse(HERS_TEXT);
const settle = ms => new Promise(r => setTimeout(r, ms || 50));
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

(async () => {
  const store = fakeStore();
  const first = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
    'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader',
    'File', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent'];
  for (const k of globals) { try { global[k] = first.window[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = []; const realError = console.error; console.error = (...a) => shouted.push(String(a[0]));

  // One copy of the page: its own window, its own module state, the shared store.
  async function open(dom) {
    const win = (dom || new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' })).window;
    win.claude = { use: async name => (name === 'db' ? store : name === 'downloads' ? { save: async () => {} } : null) };
    const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(React, win, win.document, win.localStorage);
    const root = createRoot(win.document.getElementById('root'));
    global.IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => { root.render(React.createElement(App)); });
    await settle(150);
    global.IS_REACT_ACT_ENVIRONMENT = false;
    const doc = win.document;
    return {
      win, doc,
      text: () => doc.getElementById('root').textContent,
      click: el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })),
      star: () => [...doc.querySelectorAll('button')].find(b => b.title === 'Watch'),
      importText: t => {
        const input = doc.querySelector('input[type=file][accept=".json"]');
        Object.defineProperty(input, 'files', { value: [new win.File([t], 'ledger.json', { type: 'application/json' })], configurable: true });
        input.dispatchEvent(new win.Event('change', { bubbles: true }));
      },
    };
  }
  const liveSaved = () => (store.docs.has('ledger/live') ? JSON.parse(store.docs.get('ledger/live')).savedAt : null);
  const session = () => (store.docs.has('ledger/session') ? JSON.parse(store.docs.get('ledger/session')) : null);
  const RO = /Read only — Cat Watch is open in another tab or device/;

  try {
    // A: the first copy. It loads her ledger and saves it.
    const A = await open(first);
    A.importText(HERS_TEXT);
    ok(await until(() => liveSaved()), 'TC-001: the first copy loads her ledger and saves it to the cloud');
    const aId = session() && session().id;
    ok(!!aId && !RO.test(A.text()), 'TC-001b:   it holds the edit record and is not read only');

    // B: a second copy opens while A is open.
    const B = await open();
    ok(await until(() => RO.test(B.text())), 'TC-002: a copy opened while another is open says it is read only');
    ok(await until(() => new RegExp('Opened the cloud copy saved .* — ' + hers.rows.length + ' exhibitions').test(B.text())), 'TC-003:   and shows the cloud copy — all ' + hers.rows.length + ' exhibitions — though it cannot Load a file');
    ok(session().id === aId, 'TC-004:   the edit record still names the first copy');

    const before = liveSaved(), docsBefore = store.docs.size;
    B.click(B.star());
    await settle(1500);
    ok(liveSaved() === before && store.docs.size === docsBefore, 'TC-005: a star pressed in the read-only copy writes nothing');
    B.importText(HERS_TEXT);
    await settle(800);
    ok(liveSaved() === before && store.docs.size === docsBefore, 'TC-006: nor does loading a file in it');

    // A still edits.
    const b2 = liveSaved();
    A.click(A.star());
    ok(await until(() => liveSaved() !== b2), 'TC-007: the first copy still saves');

    // A copy that closed without letting go: its record goes stale and is taken over.
    store.docs.set('ledger/session', JSON.stringify({ id: 'tGONE', beat: new Date(Date.now() - 120000).toISOString() }));
    const C = await open();
    await settle(600);
    ok(!RO.test(C.text()) && session().id !== 'tGONE', 'TC-008: a record a minute stale is a closed copy — the new one edits');

    // A wakes up after C took over: its next save finds C and stops.
    const b3 = liveSaved();
    A.click(A.star());
    ok(await until(() => RO.test(A.text())), 'TC-009: a copy that slept while another took over turns read only on its next save');
    ok(liveSaved() === b3, 'TC-010:   and writes nothing over the other copy’s ledger');

    // The same tab, reloaded — her finding, 2 Oct: a republish swaps the open
    // page without its record being let go. The tab's own memory carries over.
    const cId = session().id;
    const sameTab = from => {
      const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
      const ss = from.win.sessionStorage;
      for (let i = 0; i < ss.length; i++) dom.window.sessionStorage.setItem(ss.key(i), ss.getItem(ss.key(i)));
      return dom;
    };
    // A DUPLICATED tab copies that memory while C is still open: still read only.
    const D = await open(sameTab(C));
    await settle(600);
    ok(RO.test(D.text()) && session().id === cId, 'TC-011: a duplicate of an open tab is still read only');
    // C leaves (the republish), and its record is left behind, fresh.
    C.win.dispatchEvent(new C.win.Event('pagehide'));
    await settle(100);
    store.docs.set('ledger/session', JSON.stringify({ id: cId, beat: new Date().toISOString() }));
    const E = await open(sameTab(C));
    await settle(600);
    ok(!RO.test(E.text()) && session().id !== cId, 'TC-012: the page that replaces it in the same tab edits, not read only');
  } catch (e) {
    fail++; console.log('FAIL  the run stopped — ' + (e && e.stack || e));
  }
  console.error = realError;
  console.log(`\ncloud_two_copies: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
