/**
 * THE MAIN LIST, DRAWN AS SHE SCROLLS (her decision, with redrawing only the card that
 * changed; docs/scalability.md). Renders the real page in jsdom on a 2,000-row copy of
 * her 24 Sep ledger, with a stand-in IntersectionObserver she "scrolls" by firing.
 *
 * What it cannot see: speed. Timing is build/list_timing.js, in a real browser.
 *
 *   node scraper/fixtures/list_drawing.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-draw-'));
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
let React, createRoot, act;

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

// Her ledger repeated to 2,000 rows: new ids, dates moved back two months a copy.
const hers = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json'), 'utf8'));
const shift = (d, m) => { if (!d) return d; const x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() - m); return x.toISOString().slice(0, 10); };
const rows = [];
while (rows.length < 2000) {
  const n = rows.length, r = hers.rows[n % hers.rows.length], m = Math.floor(n / hers.rows.length) * 2;
  rows.push({ ...r, id: r.id + '-c' + n, startDate: shift(r.startDate, m), endDate: shift(r.endDate, m) });
}
const BIG = JSON.stringify({ ...hers, rows });

const settle = async (ms = 50) => { await new Promise(r => setTimeout(r, ms)); };
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  // The stand-in observer: `scroll()` tells every watched end-of-list that it is in view.
  const watching = new Set();
  class IO { constructor(cb) { this.cb = cb; } observe(el) { this.el = el; watching.add(this); } disconnect() { watching.delete(this); } }
  const scroll = () => { for (const o of [...watching]) o.cb([{ isIntersecting: true, target: o.el }]); };
  win.IntersectionObserver = IO; global.IntersectionObserver = IO;
  let scrolledTo = null;
  win.scrollTo = o => { scrolledTo = o; };
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

  const cards = () => doc.querySelectorAll('article').length;
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const typeInto = async (input, value) => {
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    await until(() => input.value === value);
  };

  try {
    const shown = rows.filter(r => r.interested).length;
    const input = doc.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([BIG], 'ledger.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    await until(() => cards() > 0);
    await settle(100);
    ok(shown > 400, `LD-000: the test ledger shows more than 400 cards on All venues (${shown})`);
    ok(cards() === 200, 'LD-001: a 2,000-row ledger draws the first 200 cards', String(cards()));

    scroll(); await until(() => cards() === 400);
    ok(cards() === 400, 'LD-002: the end of the list nearing the screen draws 200 more', String(cards()));

    // A mark still lands on the card pressed, through the memoised card.
    const firstWatch = [...doc.querySelectorAll('article')][0].querySelector('button[title="Watch"],button[title="Unwatch"]');
    const was = firstWatch.title;
    click(firstWatch); await settle(100);
    const now = [...doc.querySelectorAll('article')][0].querySelector('button[title="Watch"],button[title="Unwatch"]');
    ok(now && now.title !== was, 'LD-003: a star on a drawn card changes that card', was + ' -> ' + (now && now.title));
    ok(cards() === 400, 'LD-003b: a mark does not send the list back to its first 200', String(cards()));

    // A new search starts from the top again.
    click([...doc.querySelectorAll('button')].find(b => b.title === 'Search'));
    await until(() => doc.querySelector('input[placeholder^="Search exhibitions"]'));
    await typeInto(doc.querySelector('input[placeholder^="Search exhibitions"]'), 'e');
    await settle(100);
    ok(cards() === 200, 'LD-004: a new search draws from the top again (200)', String(cards()));

    // Jump to bottom draws everything first, then scrolls.
    Object.defineProperty(win, 'scrollY', { value: 1000, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await until(() => doc.querySelector('button[aria-label="Jump to bottom"]'));
    await typeInto(doc.querySelector('input[placeholder^="Search exhibitions"]'), '');
    await settle(100);
    scrolledTo = null;
    click(doc.querySelector('button[aria-label="Jump to bottom"]'));
    await until(() => cards() === shown && scrolledTo);
    ok(cards() === shown, `LD-005: Jump to bottom draws every card (${shown})`, String(cards()));
    ok(scrolledTo && scrolledTo.top !== undefined, 'LD-005b: and then scrolls to the bottom');

    ok(!shouted.some(s => /Error|Warning/.test(s)), 'LD-006: nothing written to the console as an error', shouted.slice(0, 2).join(' | '));
  } catch (e) {
    fail++; console.log('FAIL  the suite threw: ' + (e && e.stack || e));
  }
  console.error = realError;
  root.unmount();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
