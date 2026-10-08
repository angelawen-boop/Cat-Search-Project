/**
 * Her decisions about how the page behaves, each checked on the rendered page:
 * it is built as the build does, drawn in jsdom, and clicked. Each check is
 * named after the decision it protects (AD-001 onwards). It runs unchanged on
 * `main` and `claude/ledger-cloud`: the few differences sit in one adapter
 * inside mount().
 *
 *   node scraper/fixtures/app_decisions.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-decide-'));

// The same preparation as page_renders.js.
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'],
    { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) { console.log('FAIL  the page did not transpile'); process.exit(1); }
const code = fs.readFileSync(built, 'utf8');

const { JSDOM, VirtualConsole } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react');

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

// A ledger of two current shows: one wanted (Yes), one not yet marked.
const ALPHA = 'Fixture Show Alpha', BETA = 'Fixture Show Beta';
const show = (id, title, extra) => ({
  id, museumId: 'met', title, startDate: '2026-09-01', endDate: '2027-03-01',
  summary: 'A fixture.', exUrl: 'https://www.metmuseum.org/exhibitions/' + id,
  interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null,
  publisherUrl: null, publisherResult: null, shopUrl: null, shopState: null,
  shopChange: null, ...extra });
const LEDGER = { rows: [show('fx-alpha', ALPHA, { acquiring: 'yes', buyNext: false }),
                        show('fx-beta', BETA)], ignored: [] };

const GLOBALS = ['window', 'document', 'navigator', 'localStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
  'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle',
  'OffscreenCanvas', 'FileReader'];

// save: undefined → no runtime (a plain browser); 'ok' → downloads.save
// resolves; 'refuse' → it rejects, as a cancel or refusal does. db: false →
// the runtime has no store (on the cloud branch, the cloud copy is off).
async function mount({ save, db = true, starMetrics } = {}) {
  const vc = new VirtualConsole();   // jsdom's "not implemented: navigation" is not the app's
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/', virtualConsole: vc });
  const win = dom.window;
  const saves = [];
  if (save) {
    const store = new Map();
    win.claude = {
      use: async name => {
        if (name === 'db' && db) return { doc: key => ({
          get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
          set: async v => { store.set(key, v); } }) };
        if (name === 'downloads') return { save: async f => {
          saves.push(f.filename);
          if (save === 'refuse') { const e = new Error('cancelled'); e.code = 'cancelled'; throw e; }
          return { ok: true }; } };
        return null;
      },
      complete: async () => '',
    };
  }
  const downloads = [];
  win.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  if (starMetrics) {
    win.OffscreenCanvas = function () {
      return { getContext: () => ({ font: '', measureText: () => ({
        actualBoundingBoxAscent: starMetrics.a, actualBoundingBoxDescent: starMetrics.d }) }) };
    };
  }
  const saved = {};
  for (const k of GLOBALS) { saved[k] = global[k]; try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const realError = console.error;
  console.error = () => {};

  const App = new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return App;')(React, win, win.document, win.localStorage);
  const root = createRoot(win.document.getElementById('root'));
  const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
  await act(async () => { root.render(React.createElement(App)); });
  await settle();

  const doc = win.document;
  const page = {
    win, doc, saves, downloads,
    text: () => doc.getElementById('root').textContent,
    buttons: label => [...doc.querySelectorAll('button')].filter(b =>
      b.textContent.trim() === label || b.getAttribute('title') === label),
    async click(el) { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(); },
    async press(label) {
      const b = page.buttons(label)[0];
      if (!b) throw new Error('no button "' + label + '"');
      await page.click(b);
    },
    async loadFile(ledger) {
      const input = doc.querySelector('input[type=file][accept=".json"]');
      const file = new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      // React fires onChange only when the input's value moves.
      Object.defineProperty(input, 'value', { get: () => 'C:\\fakepath\\ledger.json', set() {}, configurable: true });
      await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
      for (let i = 0; i < 5; i++) await settle();   // FileReader answers a few ticks later
    },
    confirmShowing: () => page.buttons('Continue').length > 0 && page.buttons('Cancel').length > 0,
    // The row holding Load/Import and Save; the theme switch sits in it on both branches.
    buttonRow: () => doc.querySelector('button[title^="Switch to"]').parentElement,

    // THE ADAPTER. Main: "Export / Save" and the red UNSAVED banner. The cloud
    // branch: "Load", "Save" → "Save now", and the banner off (her decision), so
    // unsaved work shows only in Reset to Seed's wording while the cloud copy is
    // not saving.
    cloud: () => page.buttons('Load').length > 0,
    async save() {
      if (!page.cloud()) return page.press('Export / Save');
      await page.press('Save');
      await page.press('Save now');
    },
    async unsaved() {
      if (!page.cloud()) return /UNSAVED CHANGES/.test(page.text());
      await page.press('Reset to Seed');
      const said = /changes since your last Save/.test(page.text());
      await page.press('Cancel');
      return said;
    },
    // The card whose heading is this title.
    card: title => [...doc.querySelectorAll('article')].find(a =>
      (a.querySelector('h3')?.textContent || '').includes(title)),
    async close() {
      try { await act(async () => root.unmount()); } catch {}
      console.error = realError;
      for (const k of GLOBALS) {
        try { if (saved[k] === undefined) delete global[k]; else global[k] = saved[k]; } catch {}
      }
      delete global.IS_REACT_ACT_ENVIRONMENT;
      win.close();
    },
  };
  return page;
}

// An edit that marks the ledger unsaved: watch a show.
async function makeAnEdit(page, title) {
  const star = page.card(title).querySelector('button[title="Watch"]');
  await page.click(star);
}

async function resetToSeedAsksFirst() {
  const NAME = 'AD-001 Reset to Seed always asks first while a ledger is open';
  const page = await mount();
  try {
    await page.press('Reset to Seed');
    check(NAME + ': with no ledger open it loads straight away',
      !page.confirmShowing() && /Starter set loaded/.test(page.text()));

    await page.loadFile(LEDGER);
    check(NAME + ': (setup) her two-show ledger is open',
      !!page.card(ALPHA) && !!page.card(BETA) && !(await page.unsaved()));

    await page.press('Reset to Seed');
    check(NAME + ': asks with no unsaved changes', page.confirmShowing());
    check(NAME + ': nothing replaced while it asks (no unsaved changes)',
      !!page.card(ALPHA) && !/Starter set loaded/.test(page.text()));
    await page.press('Cancel');
    check(NAME + ': Cancel keeps her ledger', !!page.card(ALPHA) && !page.confirmShowing());

    await makeAnEdit(page, ALPHA);
    check(NAME + ': (setup) the edit left unsaved changes', await page.unsaved());
    await page.press('Reset to Seed');
    check(NAME + ': asks with unsaved changes', page.confirmShowing());
    check(NAME + ': nothing replaced while it asks (unsaved changes)', !!page.card(ALPHA));

    await page.press('Continue');
    check(NAME + ': replaced only once she confirms',
      !page.card(ALPHA) && /Starter set loaded/.test(page.text()));
  } finally { await page.close(); }
}

async function plainDownloadNeverClearsUnsaved() {
  const NAME = 'AD-002 A plain browser download never clears the unsaved warning';
  for (const [save, label] of [[undefined, 'plain browser download'],
                               ['refuse', 'refused or cancelled save'],
                               ['ok', 'save the viewer confirms']]) {
    const page = await mount({ save, db: false });
    try {
      await page.loadFile(LEDGER);
      await makeAnEdit(page, ALPHA);
      const before = await page.unsaved();
      await page.save();
      const tried = save ? page.saves.length === 1 : page.downloads.length === 1;
      if (save === 'ok') {
        check(NAME + ': only a save the viewer confirms clears it',
          before && tried && !(await page.unsaved()) && /Saved|saved/.test(page.text()));
      } else {
        check(NAME + ': a ' + label + ' leaves it in place',
          before && tried && (await page.unsaved()) && !/Saved — safe to close/.test(page.text()));
      }
    } finally { await page.close(); }
  }
}

async function buyNextDot() {
  const NAME = 'AD-003 The Buy next dot is drawn at the star\'s measured size';
  // A star measured at 9 + 2 px gives a 9.5px dot (85%, to the half pixel);
  // anything not drawn from the measurement shows another size.
  const page = await mount({ starMetrics: { a: 9, d: 2 } });
  try {
    await page.loadFile(LEDGER);
    const dot = () => page.card(ALPHA).querySelector('button[title="Buy next"], button[title="Not buying next"]');
    const svg = dot()?.querySelector('svg');
    check(NAME + ': drawn at the star\'s measured size',
      !!svg && svg.getAttribute('width') === '9.5' && svg.getAttribute('height') === '9.5',
      svg ? 'drawn at ' + svg.getAttribute('width') + ' x ' + svg.getAttribute('height') : 'no dot');
    check(NAME + ': shows only on a Yes card',
      !!dot() && !page.card(BETA).querySelector('button[title="Buy next"], button[title="Not buying next"]'));

    await page.click(dot());
    const fill = () => dot()?.querySelector('circle').getAttribute('fill');
    check(NAME + ': (setup) the dot turns on', page.buttons('Not buying next').length === 1 && fill() !== 'none');

    const no = [...page.card(ALPHA).querySelectorAll('button')].find(b => b.textContent.trim() === 'No');
    await page.click(no);
    check(NAME + ': gone once the card leaves Yes', !dot());
    const yes = [...page.card(ALPHA).querySelectorAll('button')].find(b => b.textContent.trim() === 'Yes');
    await page.click(yes);
    check(NAME + ': leaving Yes cleared it — back on Yes it is off', !!dot() && fill() === 'none');
  } finally { await page.close(); }
}

async function noStatusLineWithoutLedger() {
  const NAME = 'AD-004 No status line when no ledger is open';
  // As her published page: nothing with words in it sits between the button row
  // and the "Last refreshed" line, except the cloud branch's own cloud line (☁).
  const page = await mount({ save: 'ok' });
  const between = () => {
    const out = [];
    for (let n = page.buttonRow().nextElementSibling; n && !/^Last refreshed/.test(n.textContent.trim()); n = n.nextElementSibling) {
      const t = n.textContent.trim();
      if (t && !t.startsWith('☁')) out.push(t);
    }
    return out;
  };
  try {
    const found = between();
    check(NAME, found.length === 0, 'found: "' + (found[0] || '').slice(0, 80) + '"');
    await page.loadFile(LEDGER);
    check(NAME + ': (control) a ledger open does show one', between().length > 0);
  } finally { await page.close(); }
}

async function dismissToast() {
  const NAME = 'AD-005 The dismiss toast says "Dismissed" with an "Undo" button';
  const page = await mount();
  try {
    await page.loadFile(LEDGER);
    await page.click(page.card(BETA).querySelector('button[title="Not interested"]'));
    const undo = page.buttons('Undo')[0];
    const words = undo && undo.previousElementSibling;
    check(NAME, !!undo && undo.tagName === 'BUTTON' && words && words.textContent.trim() === 'Dismissed',
      undo ? 'beside Undo: "' + (words ? words.textContent.trim() : '') + '"' : 'no Undo button');
    if (undo) {
      await page.click(undo);
      check(NAME + ': Undo brings the card back', !!page.card(BETA) && !page.buttons('Undo').length);
    }
  } finally { await page.close(); }
}

(async () => {
  for (const [tag, t] of [['AD-001', resetToSeedAsksFirst], ['AD-002', plainDownloadNeverClearsUnsaved],
                          ['AD-003', buyNextDot], ['AD-004', noStatusLineWithoutLedger], ['AD-005', dismissToast]]) {
    try { await t(); } catch (e) { check(tag + ' ran to the end', false, e && e.message); }
  }
  console.log(failures ? failures + ' failed' : 'her five page decisions hold');
  process.exit(failures ? 1 : 0);
})();
