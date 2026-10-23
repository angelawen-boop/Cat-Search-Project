/**
 * A STORE READ THAT FAILS — driven through the app, as cloud_app.js drives it.
 *
 * Her case: on one opening her link venues came up as bare web addresses (the read of
 * venues/occasional failed and was taken as "no venues"), and the next import would have
 * written the list back holding only its new venue. Now:
 *   SU-001  every part of the store that could not be read is named on the page, not shown as empty
 *   SU-002  the quarantine's failed read keeps its own banner
 *   SU-003  nothing the page does on opening writes over a part it could not read
 *   SU-004  the link venues' write refuses after a failed read; the stored list is untouched
 *   SU-005  a read that worked, of a part simply empty, writes as before
 *
 *   node scraper/fixtures/store_unread.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-unread-'));
const src = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + src.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){');
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
const settle = async (ms = 50) => { await new Promise(r => setTimeout(r, ms)); };
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

// The store, with reads of the named documents and collections failing as a dropped connection would.
function brokenReads(store, paths) {
  const broken = p => paths.some(x => p === x || p.startsWith(x + '/'));
  return {
    docs: store.docs,
    doc(p) { const d = store.doc(p); return { ...d, async get() { if (broken(p)) throw { code: 'unavailable', message: 'injected' }; return d.get(); } }; },
    collection(c) {
      const q = store.collection(c), real = q.get;
      q.get = async () => { if (broken(c)) throw { code: 'unavailable', message: 'injected' }; return real(); };
      return q;
    },
  };
}

(async () => {
  // ── SU-004/005: the write itself, lifted from the page ──
  const sec = src.slice(src.indexOf('// A STORE READ THAT FAILED'), src.indexOf('// ── PAGES:'));
  const lift = db => new Function('useCap', 'OCC_DOC', sec + '\nreturn {readOccasional,writeOccasional};')(async () => db, 'venues/occasional');
  const held = fakeStore();
  await held.doc('venues/occasional').set({ venues: { 'occ-a': { id: 'occ-a', name: 'Museum A' }, 'occ-b': { id: 'occ-b', name: 'Museum B' } } });
  const kept = held.docs.get('venues/occasional');
  const L = lift(brokenReads(held, ['venues/occasional']));
  const got = await L.readOccasional();
  const wrote = await L.writeOccasional({ 'occ-new': { id: 'occ-new', name: 'New' } });
  ok(Object.keys(got).length === 0 && wrote === false && held.docs.get('venues/occasional') === kept,
    'SU-004: after a failed read the link venues are not written; the stored list keeps both venues', JSON.stringify([wrote, held.docs.get('venues/occasional')]));
  const empty = fakeStore();
  const E = lift(empty);
  const none = await E.readOccasional();
  ok(Object.keys(none).length === 0 && await E.writeOccasional({ 'occ-new': { id: 'occ-new', name: 'New' } }) === true && empty.docs.has('venues/occasional'),
    'SU-005: a store that simply holds no link venues yet is read as empty and written to as before');

  // ── SU-001–003: the page, opened on a store whose reads fail ──
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const base = fakeStore();
  await base.doc('venues/occasional').set({ venues: { 'occ-a': { id: 'occ-a', name: 'Museum A' } } });
  await base.doc('links/pending').set({ text: 'https://example.org/show' });
  await base.doc('sweeps/venues').set({ venues: { met: { at: '2026-10-15' } } });
  await base.doc('quarantine/rows').set({ rows: { x: { title: 'Held' } } });
  const before = new Map(base.docs);
  const store = brokenReads(base, ['venues/occasional', 'links/pending', 'links_pages', 'sweeps/venues', 'quarantine/rows']);
  win.claude = { use: async name => (name === 'db' ? store : null) };
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent'];
  for (const k of globals) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const realError = console.error; console.error = () => {};
  try {
    const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(React, win, doc, win.localStorage);
    const root = createRoot(doc.getElementById('root'));
    await act(async () => { root.render(React.createElement(App)); });
    global.IS_REACT_ACT_ENVIRONMENT = false;
    const text = () => doc.getElementById('root').textContent;
    const named = ['the link venues', 'the links waiting in the Links box', 'the pages waiting in the Pages list', 'the sweep log'];
    ok(await until(() => /STORE NOT READ/.test(text()) && named.every(n => text().includes(n))),
      'SU-001: every part that could not be read is named on the page ("STORE NOT READ"), not shown as empty', text().slice(0, 300));
    ok(/QUARANTINE — Couldn’t read the quarantine list/.test(text()), 'SU-002: the quarantine\'s failed read keeps its own banner');
    await settle(300);
    ok(['venues/occasional', 'links/pending', 'sweeps/venues', 'quarantine/rows'].every(k => base.docs.get(k) === before.get(k)),
      'SU-003: opening the page writes over nothing it could not read');
    await act(async () => { root.unmount(); });
  } catch (e) {
    fail++; console.log('FAIL  store_unread crashed — ' + (e && (e.stack || e.message)));
  } finally { console.error = realError; }
  console.log(`\nstore_unread: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
