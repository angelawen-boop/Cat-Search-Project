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
  const saves = [], files = [];
  if (save) {
    const store = new Map();
    win.claude = {
      use: async name => {
        if (name === 'db' && db) return { doc: key => ({
          get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
          set: async v => { store.set(key, v); } }) };
        if (name === 'downloads') return { save: async f => {
          saves.push(f.filename); files.push(f);
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
    win, doc, saves, files, downloads,
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
      if (!page.confirmShowing()) throw new Error('Reset to Seed did not ask (AD-001), so unsaved work cannot be read here');
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
    check(NAME + ': (setup) her two-show ledger is open', !!page.card(ALPHA) && !!page.card(BETA));

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


// Her catalogue versions on the card (docs/catalogue_versions.md): rows built from her
// cases (docs/lookup_proof_cards.json), as a lookup stores them.
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'lookup_proof_cards.json'), 'utf8')).cards;
const PROOF = {
  1: ['https://www.louvre.fr/editions/catalogue/giorgio-vasari-le-livre-des-dessins', 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings',
      'https://nationalmuseum.bokorder.se/en-us/shop/book/4580?slug=giorgio-vasari-the-book-of-drawings'],
  2: ['https://mini-site.louvre.fr/trimestriel/2016/publication.pdf', 'https://www.nga.gov/press/hubert-robert.pdf'],
  3: ['https://www.nga.gov/press/hubert-robert.pdf', 'https://mini-site.louvre.fr/trimestriel/2016/publication.pdf'],
  4: ['https://www.leslibraires.ca/en/livres/hammershoi-9789462302495.html', 'https://www.rizzoliusa.com/book/9780847899289'],
  8: ['https://hannibalbooks.be/2026.pdf', 'https://hannibalbooks.be/2026.pdf', 'https://hannibalbooks.be/2026.pdf'],
};
const EXTRA = { 1: [{}, {}, { city: 'Stockholm' }], 2: [{}, { city: 'Washington' }], 4: [{}, { year: 2023 }] };
function caseRow(n, start, versions) {
  const c = CASES.find(x => x.case === n);
  const vs = versions || c.versions;
  const editions = vs.map((v, i) => ({ title: c.title + ' (' + v.isbn13 + ')', note: null, city: null, year: null, ...v,
    proofUrl: (PROOF[n] || [])[i] || null, ...((EXTRA[n] || [])[i] || {}),
    card: { catalogueTitle: c.title + ' (' + v.isbn13 + ')', isbn13: v.isbn13, publisher: v.publisher, publisherUrl: null, publisherResult: null, shopState: 'web', shopUrl: null } }));
  const pick = editions.findIndex(v => v.isbn13 === c.pick);
  const book = pick < 0 ? { catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null, shopState: 'web', shopUrl: null } : editions[pick].card;
  return show('case-' + n, 'Case ' + n + ' ' + c.title, { museumId: c.venue, startDate: start, acquiring: 'yes', buyNext: false, looked: true, hasCatalogue: 'yes',
    englishCheck: null, editions: versions && versions.length < 2 ? editions.slice(0, versions.length) : editions, editionPick: pick < 0 ? null : pick, ...book });
}
async function openCard(page, title) {
  const b = [...(page.card(title) || { querySelectorAll: () => [] }).querySelectorAll('button')].find(x => /Catalogue$/.test(x.textContent.trim()));
  if (b) await page.click(b);
  return page.card(title);
}
const versionLinesOn = card => [...card.querySelectorAll('[aria-pressed]')].map(b => b.parentElement.textContent.trim());
const linksOn = card => [...card.querySelectorAll('a')].map(a => a.textContent.replace(/\s*\u2197$/, '').trim());
// The buy buttons: the links that end in an arrow.
const buttonsOn = card => [...card.querySelectorAll('a')].filter(a => /\u2197$/.test(a.textContent.trim())).map(a => a.textContent.replace(/\s*\u2197$/, '').trim()).filter(Boolean);

async function versionCards() {
  const NAME = 'AD-007 Her catalogue versions on the card';
  const vasari = caseRow(1, '2022-03-31'), hrL = caseRow(2, '2016-03-08'), hrN = caseRow(3, '2016-06-26'), ham = caseRow(4, '2019-03-14'), met = caseRow(8, '2026-02-20');
  const page = await mount({ save: 'ok', db: false });
  try {
    await page.loadFile({ rows: [vasari, hrL, hrN, ham, met], ignored: [] });
    let card = await openCard(page, vasari.title);
    check(NAME + ': Vasari — three lines in her words, the Louvre’s own number on the French, ● on Lienart’s English', JSON.stringify(versionLinesOn(card)) === JSON.stringify([
      '○ French · Louvre Éditions / Lienart · 978-2359063721 · also 978-2350317441 (the Louvre\'s own number for the same book) — the original edition. (source: louvre.fr)',
      '● English · paperback · Louvre Éditions / Lienart · 978-2359063738 — this venue\'s English edition. (source: lienarteditions.com)',
      '○ English · hardcover · Nationalmuseum · 978-9171009166 — from the show\'s Stockholm exhibition. (source: nationalmuseum.bokorder.se)']),
      JSON.stringify(versionLinesOn(card)));
    check(NAME + ': Vasari — each source is a link to the page that proved it, its host as the words',
      [...card.querySelectorAll('a')].filter(a => a.textContent === 'lienarteditions.com').every(a => a.href === PROOF[1][1]) && linksOn(card).includes('nationalmuseum.bokorder.se'));
    check(NAME + ': Vasari — no book title, publisher line, ISBN line or English line beside the list',
      !/ISBN 978|ISBN not confirmed/.test(card.textContent) && !card.textContent.includes(vasari.catalogueTitle));
    check(NAME + ': Vasari — buy buttons built from the picked book', [...card.querySelectorAll('a')].some(a => a.href === 'https://booko.au/9782359063738'));

    // Tapping ○ on the hardcover.
    const before = JSON.parse(JSON.stringify(vasari));
    await page.click(card.querySelectorAll('[aria-pressed]')[2]);
    card = page.card(vasari.title);
    const marks = versionLinesOn(card).map(l => l[0]).join('');
    check(NAME + ': Vasari — tapping ○ on Stockholm’s hardcover moves ●', marks === '○○●', marks);
    check(NAME + ': Vasari — the buy links now use 978-9171009166', [...card.querySelectorAll('a')].some(a => a.href === 'https://booko.au/9789171009166')
      && ![...card.querySelectorAll('a')].some(a => /9782359063738/.test(a.href)));
    await page.save();
    const saved = JSON.parse(page.files[page.files.length - 1].data).rows.find(x => x.id === vasari.id);
    const changed = Object.keys(saved).filter(k => JSON.stringify(saved[k]) !== JSON.stringify(before[k])).sort();
    check(NAME + ': Vasari — the ledger row’s editionPick is 2 and its book is the hardcover; nothing else in the row changes',
      saved.editionPick === 2 && saved.isbn13 === '9789171009166' && JSON.stringify(changed) === JSON.stringify(['catalogueTitle', 'editedAt', 'editionPick', 'isbn13', 'publisher']),
      JSON.stringify(changed));

    card = await openCard(page, hrL.title);
    check(NAME + ': Hubert Robert, Louvre card — nothing picked: the list, her grey line, and only the Museum shop button',
      versionLinesOn(card).every(l => l[0] === '○') && card.textContent.includes('Pick a version to see where to buy it.')
      && JSON.stringify(buttonsOn(card)) === JSON.stringify(['Museum shop']), JSON.stringify(buttonsOn(card)));
    check(NAME + ': Hubert Robert, Louvre card — the Museum shop button searches the exhibition’s title, and no status line shows for a book not picked',
      [...card.querySelectorAll('a')].some(a => a.textContent.startsWith('Museum shop') && a.href.endsWith(encodeURIComponent(hrL.title)))
      && !/Not in the museum shop|In the museum shop/.test(card.textContent));
    check(NAME + ': Hubert Robert, Louvre card — her two lines', JSON.stringify(versionLinesOn(card)) === JSON.stringify([
      '○ French · hardcover, 544 pp · Louvre Éditions / Somogy · 978-2757210642 · also 978-2350315355 (the Louvre\'s own number for the same book) — this showing\'s catalogue. (source: mini-site.louvre.fr)',
      '○ English · hardcover, 288 pp · National Gallery of Art / Lund Humphries · 978-1848221918 — a notably different book, from the show\'s Washington exhibition. (source: nga.gov)']),
      JSON.stringify(versionLinesOn(card)));
    card = await openCard(page, hrN.title);
    check(NAME + ': Hubert Robert, NGA card — its own book picked, the Paris book a notably different one', JSON.stringify(versionLinesOn(card)) === JSON.stringify([
      '● English · hardcover, 288 pp · National Gallery of Art / Lund Humphries · 978-1848221918 — this showing\'s catalogue. (source: nga.gov)',
      '○ French · hardcover, 544 pp · Louvre Éditions / Somogy · 978-2757210642 · also 978-2350315355 (the Louvre\'s own number for the same book) — a notably different book, from the show\'s Paris exhibition. (source: mini-site.louvre.fr)']),
      JSON.stringify(versionLinesOn(card)));
    card = await openCard(page, ham.title);
    check(NAME + ': Hammershøi — the original, and the English edition published later, picked', JSON.stringify(versionLinesOn(card)) === JSON.stringify([
      '○ French · Culturespaces / Fonds Mercator · 978-9462302495 — the original edition. (source: leslibraires.ca)',
      '● English · Rizzoli Electa · 978-0847899289 — the English edition, published later. (source: rizzoliusa.com)']),
      JSON.stringify(versionLinesOn(card)));
    card = await openCard(page, met.title);
    check(NAME + ': Metamorphoses — no notes, and one shared source line after the list',
      JSON.stringify(versionLinesOn(card)) === JSON.stringify(['● English · paperback · Hannibal · 978-9493416543.', '○ Dutch · Hannibal · 978-9493416550.', '○ Italian · Hannibal · 978-9493416857.'])
      && card.textContent.includes('(source for all three: hannibalbooks.be)') && !/\(source: /.test(card.textContent), JSON.stringify(versionLinesOn(card)));
  } finally { await page.close(); }
}

// A card with one version, or none, is drawn exactly as before versions existed.
async function oneVersionUnchanged() {
  const NAME = 'AD-008 A card with one version looks as it does now';
  const one = n => { const c = CASES.find(x => x.case === n); return caseRow(n, '2025-01-01', c.versions); };
  const millet = one(9), watteau = one(5);
  const strip = r => { const o = { ...r, id: r.id + '-old', title: r.title + ' (old)' }; delete o.editions; delete o.editionPick; return o; };
  const page = await mount({ save: 'ok', db: false });
  try {
    await page.loadFile({ rows: [millet, strip(millet), watteau, strip(watteau)], ignored: [] });
    for (const r of [millet, watteau]) {
      const a = await openCard(page, r.title), b = await openCard(page, strip(r).title);
      const html = el => el.innerHTML.split(encodeURIComponent(strip(r).title)).join(encodeURIComponent(r.title)).split(strip(r).title).join(r.title).split(strip(r).id).join(r.id);
      check(NAME + ': ' + r.title.replace(/^Case \d+ /, '') + ' — the same card as a row with no versions, no markers',
        !!a && !!b && html(a) === html(b) && !a.querySelector('[aria-pressed]') && a.textContent.includes('ISBN ' + r.isbn13.slice(0, 3) + '-' + r.isbn13.slice(3)),
        a && b ? (() => { const x = html(a), y = html(b); let k = 0; while (k < x.length && x[k] === y[k]) k++; return x.slice(k - 80, k + 80) + ' ≠ ' + y.slice(k - 80, k + 80); })() : 'no card');
    }
  } finally { await page.close(); }
}

// Rows saved before catalogue versions: the old fields, no `editions`. Her real ledger
// holds rows like these; loading and saving must leave them byte for byte as they were.
async function oldRowsUntouched() {
  const NAME = 'AD-006 An old row (originalEdition, otherVenueBook, alsoVersion, no editions) loads, shows and saves exactly as before';
  const found = { looked: true, hasCatalogue: 'yes', shopState: 'web', shopUrl: null, publisherUrl: null, publisherResult: null };
  const EN = show('fx-old-en', 'Fixture Old English Edition', { ...found, museumId: 'jacquemart',
    catalogueTitle: 'Hammershøi: Painter of Northern Light', isbn13: '9780847899289', publisher: 'Rizzoli Electa', englishCheck: 'english',
    originalEdition: { title: 'Hammershøi : le maître de la peinture danoise', isbn13: '9789462302495', publisher: 'Fonds Mercator' },
    otherVenueBook: null, alsoVersion: null });
  const ALSO = show('fx-old-also', 'Fixture Old Also Version', { ...found, museumId: 'louvre',
    catalogueTitle: 'Giorgio Vasari, the Book of Drawings', isbn13: '9789171009166', publisher: 'Nationalmuseum', englishCheck: 'english',
    originalEdition: { title: 'Giorgio Vasari, le Livre des dessins', isbn13: null, publisher: 'Musée du Louvre Editions / Lienart' },
    otherVenueBook: null, alsoVersion: { isbn13: '9782359063738', binding: 'paperback', publisher: 'Lienart' } });
  const OTHER = show('fx-old-other', 'Fixture Old Other Venue Book', { ...found, museumId: 'louvre',
    catalogueTitle: 'Hubert Robert, 1733-1808 : un peintre visionnaire', isbn13: '9782757210642', publisher: 'Somogy éditions d\'art', englishCheck: 'shops',
    originalEdition: null, otherVenueBook: { title: 'Hubert Robert', isbn13: '9781848221918', publisher: 'Lund Humphries' }, alsoVersion: null });
  const rows = [EN, ALSO, OTHER];
  const page = await mount({ save: 'ok', db: false });
  try {
    await page.loadFile({ rows, ignored: [] });
    const lines = {
      'Fixture Old English Edition': 'English edition of “Hammershøi : le maître de la peinture danoise” (Fonds Mercator).',
      'Fixture Old Also Version': 'ISBN 978-9171009166 · also 978-2359063738 (paperback, Lienart)',
      'Fixture Old Other Venue Book': 'No English edition. An English catalogue from the show’s other venue is a different book: Hubert Robert, Lund Humphries, ISBN 978-1848221918.',
    };
    for (const [title, line] of Object.entries(lines)) {
      const open = [...(page.card(title) || { querySelectorAll: () => [] }).querySelectorAll('button')].find(b => /Catalogue$/.test(b.textContent.trim()));
      if (open) await page.click(open);
      check(NAME + ': its card shows as before — ' + title, (page.card(title)?.textContent || '').includes(line), 'wanted: ' + line);
    }
    await page.save();
    const saved = page.files.length ? JSON.parse(page.files[page.files.length - 1].data).rows : [];
    const same = rows.every(r => { const s = saved.find(x => x.id === r.id); return s && JSON.stringify(s) === JSON.stringify(r); });
    check(NAME + ': saved byte for byte as loaded, no editions added', same && saved.every(s => !('editions' in s) && !('editionPick' in s)),
      JSON.stringify(saved.find(s => s.id === ALSO.id)));
  } finally { await page.close(); }
}

(async () => {
  for (const [tag, t] of [['AD-001', resetToSeedAsksFirst], ['AD-002', plainDownloadNeverClearsUnsaved],
                          ['AD-003', buyNextDot], ['AD-004', noStatusLineWithoutLedger], ['AD-005', dismissToast],
                          ['AD-006', oldRowsUntouched], ['AD-007', versionCards], ['AD-008', oneVersionUnchanged]]) {
    try { await t(); } catch (e) { check(tag + ' ran to the end', false, e && e.message); }
  }
  console.log(failures ? failures + ' failed' : 'her page decisions hold');
  process.exit(failures ? 1 : 0);
})();
