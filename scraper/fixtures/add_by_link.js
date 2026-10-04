/**
 * "ADD BY LINK", PRESSED — her design, 3–4 Oct 2026 (docs/picked_shows.md).
 *
 * Renders the real app, loads a ledger through the real Load input, opens
 * Import Refresh → Paste links, pastes links the careless way she will, and
 * presses Read — with the connector and Claude played by a script. Then it
 * reads the review back off the screen: the titles and dates she would see.
 *
 * THE PAGES ARE REAL. docs/link_pages/ holds the ten show pages read through
 * her keyed connector on 3 Oct, as the connector returned them (the eight
 * written down by hand are trimmed of footers; every date-bearing line is
 * kept — those are the trap). Titles and dates are read by CODE, so those
 * expectations are hard. What the MODEL says is scripted here, so this file
 * proves only what code does with an answer, never that an answer is good.
 *
 * WHAT IT CANNOT KNOW: a real shop's menu. The shop pages below are made up
 * to the shapes seen on real shops (a "Catálogos" link, a Shopify
 * collection); a real venue's first link is the test of that.
 *
 *   node scraper/fixtures/add_by_link.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const PAGES = path.join(__dirname, '..', '..', 'docs', 'link_pages');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-links-'));

const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* the emit is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) { console.log('FAIL  the page did not transpile'); process.exit(1); }
const code = fs.readFileSync(built, 'utf8');

const { JSDOM } = require('jsdom');
// React and react-dom are required AFTER the page's globals exist (below):
// react-dom decides at load whether the browser fires 'input' events, and
// loaded with no window it decides not — typing into the box then never
// reaches the app. Clicks work either way, which is why other files did not
// meet this.
let React, createRoot, act;

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

// ── the pages, and what each must come out as ───────────────────────────────
const page = name => JSON.parse(fs.readFileSync(path.join(PAGES, name + '.json'), 'utf8'));
const P = Object.fromEntries(fs.readdirSync(PAGES).filter(f => f.endsWith('.json'))
  .map(f => { const p = page(f.replace(/\.json$/, '')); return [p.url, p]; }));
const WANT = [
  ['thyssen_hammershoi', 'Hammershøi. The Eye that Listens', '17 Feb 2026', '31 May 2026'],
  ['thyssen_rubens', 'Rubens. The Restoration of Venus and Cupid', '16 Jun 2026', '13 Sep 2026'],
  ['mauritshuis_hoogstraten', 'Samuel van Hoogstraten', '16 Sep 2027', '9 Jan 2028'],
  ['ra_guggenheim', 'Peggy Guggenheim in London: The Making of a Collector', '21 Nov 2026', '14 Mar 2027'],
  ['courtauld_okeeffe', "Georgia O'Keeffe: Ghost Ranch", '1 Oct 2027', '30 Jan 2028'],
  ['dia_caravaggio', "Caravaggio's Models: Friends, Lovers, Rivals", '21 Mar 2027', '18 Jul 2027'],
  ['dia_okeeffe', 'Georgia O’Keeffe: Architecture', '11 Sep 2026', '3 Jan 2027'],
  ['cleveland_manet_morisot', 'Manet & Morisot', '29 Mar 2026', '5 Jul 2026'],
  ['cleveland_filippino', 'Filippino Lippi and Rome', '26 Nov 2025', '22 Feb 2026'],
];
const urlOf = name => page(name).url;
const GRAND = urlOf('mauritshuis_grand_tour');
const REFUSED = 'https://www.example-museum.org/exhibitions/refused-show';
const EMPTY = 'https://www.example-museum.org/exhibitions/empty-show';

// Her ledger already holds the Grand Tour exactly as the link reads it: no card.
const GRAND_SUMMARY = 'British Grand Tour souvenirs from country houses.';
const ledger = { rows: [{ id: 'occ-mauritshuis-nl-thegrandtourdestinationitaly', museumId: 'occ-mauritshuis-nl',
  title: 'The Grand Tour - Destination Italy', startDate: '2025-09-18', endDate: '2026-01-04', summary: GRAND_SUMMARY,
  exUrl: GRAND, interested: true, watching: false, acquiring: null, looked: false, hasCatalogue: 'unknown',
  catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null, addedAt: '2026-10-01T00:00:00.000Z', editedAt: null }],
  ignored: [], lastRun: null };

// ── the shops, made to real shapes ──────────────────────────────────────────
const filler = ' Gift ideas, posters, homeware. '.repeat(20);
const SHOPS = {
  'https://tienda.museothyssen.org/en': '[Catálogos](https://tienda.museothyssen.org/en/catalogos) [Libros](https://tienda.museothyssen.org/en/libros) [Regalos](https://tienda.museothyssen.org/en/regalos)' + filler,
  'https://shop.mauritshuis.nl/': '[Books](https://shop.mauritshuis.nl/en/books) [Prints](https://shop.mauritshuis.nl/en/prints)' + filler,
  'https://shop.clevelandart.org/': '[Exhibition Catalogs](https://shop.clevelandart.org/collections/exhibition-catalogs) [Mugs](https://shop.clevelandart.org/collections/mugs) [A Book](https://shop.clevelandart.org/products/a-book)' + filler,
  'https://shop.courtauld.ac.uk/': '[Exhibition catalogues](https://shop.courtauld.ac.uk/exhibition-catalogues/) [Books](https://shop.courtauld.ac.uk/books/)' + filler,
};

// ── the runtime: a store, a scripted connector and a scripted Claude ───────
const calls = [];
const store = new Map();
function runtime() {
  const doc = key => ({
    get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
    set: async v => { store.set(key, v); },
  });
  return {
    use: async name => {
      if (name === 'db') return { doc };
      if (name === 'downloads') return { save: async () => ({ ok: true }) };
      if (name === 'mcp') return { callTool: async (server, tool, args) => {
        calls.push({ kind: 'mcp', tool, args });
        if (tool === 'web_search') {
          const q = args.search_queries.join(' ');
          if (/Mauritshuis/.test(q)) return { payload: { results: [
            { url: 'https://www.mauritshuis.nl/en/visit', title: 'Visit' },
            { url: 'https://shop.mauritshuis.nl/en/', title: 'Mauritshuis shop' }] } };
          return { payload: { results: [{ url: 'https://www.royalacademy.org.uk/visit', title: 'Visit the RA' }] } };
        }
        const u = args.urls[0];
        if (u === REFUSED) return { payload: { results: [], errors: [{ url: u, error_type: 'http_error', http_status_code: 403 }] } };
        if (u === EMPTY) return { payload: { results: [{ url: u, title: 'Empty', full_content: 'Loading…' }], errors: [] } };
        if (P[u]) return { payload: { results: [P[u]], errors: [] } };
        if (SHOPS[u] !== undefined) return { payload: { results: [{ url: u, title: 'Shop', full_content: SHOPS[u] }], errors: [] } };
        return { payload: { results: [{ url: u, title: '', full_content: '' }], errors: [] } };
      } };
      if (name === 'sample') return { json: async prompt => {
        calls.push({ kind: 'sample', prompt });
        const t = (prompt.match(/EXHIBITION TITLE, as the page gives it: (".*")/) || [])[1];
        const title = t ? JSON.parse(t) : '';
        if (/Peggy/.test(title)) return { summary: 'Guggenheim Jeune, her radical London gallery, revisited.', subtitle: 'The Making of a Collector', english: '', englishSpeaking: true };
        if (/Manet/.test(title)) return { summary: 'Manet and Morisot, friends and rivals.', subtitle: 'A Study in Friendship', english: '', englishSpeaking: true };
        if (/Rubens/.test(title)) return { summary: 'Rubens restored.', english: '"Rubens. The Restoration of Venus and Cupid"', englishSpeaking: false };
        if (/Hammersh/.test(title)) return { summary: 'First Spanish retrospective of Hammershøi.', english: '', englishSpeaking: false };
        if (/Grand Tour/.test(title)) return { summary: GRAND_SUMMARY, english: '', englishSpeaking: false };
        return { summary: 'A summary of ' + title + '.', english: '', englishSpeaking: true };
      } };
      return null;
    },
    complete: async () => '',
  };
}

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window;
  win.claude = runtime();
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event',
    'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'Blob'];
  for (const k of globals) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));

  const settle = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
  const root = createRoot(win.document.getElementById('root'));
  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(
    React, win, win.document, win.localStorage);
  await act(async () => { root.render(React.createElement(App)); });
  await settle();

  const input = win.document.querySelector('input[type=file][accept=".json"]');
  const file = new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
  await settle();

  const buttons = re => [...win.document.querySelectorAll('button')].filter(b => re.test(b.textContent.trim()));
  const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(); };

  // The sweep-file button: "Import Refresh" on main, "Import" on the cloud
  // branch (where main's ledger "Import" is "Load").
  const importBtn = () => buttons(/^Import Refresh$/)[0] || buttons(/^Import$/)[0];
  // ── AL-001: Import Refresh opens the two ways in, and nothing else ────────
  ok(buttons(/^CSV file$/).length === 0 && buttons(/^Paste links$/).length === 0, 'AL-001: before Import Refresh is pressed, neither choice is on screen');
  await click(importBtn());
  ok(buttons(/^CSV file$/).length === 1 && buttons(/^Paste links$/).length === 1, 'AL-001a:  pressed, it offers "CSV file" and "Paste links"');
  {
    const csvInput = win.document.querySelector('input[type=file][accept=".csv,text/csv"]');
    let opened = false; csvInput.click = () => { opened = true; };
    await click(buttons(/^CSV file$/)[0]);
    ok(opened, 'AL-001b:  "CSV file" opens the file picker, as Import Refresh always did');
  }
  await click(importBtn());
  await click(buttons(/^Paste links$/)[0]);
  const box = win.document.querySelector('textarea');
  ok(!!box && buttons(/^Read$/).length === 1, 'AL-002: "Paste links" opens one box and a Read button');

  // ── AL-003: pasted carelessly — commas, spaces, lines, words, a repeat ─────
  const pasted = 'here you go: ' + WANT.slice(0, 4).map(w => urlOf(w[0])).join(', ') + ' ' + GRAND + '\n'
    + WANT.slice(4).map(w => urlOf(w[0])).join(' , ') + '\nand ' + urlOf('ra_guggenheim') + '.\n' + REFUSED + ';' + EMPTY;
  const setter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => { setter.call(box, pasted); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
  await settle();
  calls.length = 0;
  await click(buttons(/^Read$/)[0]);
  await settle(30);
  const expand = buttons(/^Expand all venues$/)[0];
  if (expand) await click(expand);

  const showFetches = calls.filter(c => c.kind === 'mcp' && c.tool === 'web_fetch' && (P[c.args.urls[0]] || c.args.urls[0] === REFUSED || c.args.urls[0] === EMPTY));
  ok(showFetches.length === 12, 'AL-003: twelve different links, the repeated RA one read once — twelve page reads', showFetches.length);
  ok(calls.filter(c => c.kind === 'sample').length === 10, 'AL-003a:  and one Claude call per page that read, ten', calls.filter(c => c.kind === 'sample').length);

  // ── AL-004: each card's title and dates — read by code ────────────────────
  const adds = buttons(/Add new entry$/);
  ok(adds.length === 9, 'AL-004: nine Add cards (the Grand Tour is already in her ledger, unchanged)', adds.length);
  const cardOf = title => {
    for (const b of adds) { let el = b; while (el && !el.textContent.includes(title)) el = el.parentElement; if (el && el.textContent.length < 3000) return el; }
    return null;
  };
  for (const [name, title, from, to] of WANT) {
    const c = cardOf(title);
    ok(!!c, 'AL-004 ' + name + ': a card titled "' + title + '"');
    if (c) ok(c.textContent.includes(from) && c.textContent.includes(to), 'AL-004 ' + name + ':   dated ' + from + ' to ' + to, c.textContent.slice(0, 260));
  }
  ok(!cardOf('Manet & Morisot: A Study'), 'AL-005: a subtitle Claude gives that is NOT on the page is ignored');
  {
    const c = cardOf('Rubens. The Restoration');
    ok(c && c.textContent.includes('In English: "Rubens. The Restoration of Venus and Cupid." Rubens restored.'),
      'AL-006: a translation opens the description, in her format, quotes stripped from Claude\'s answer', c && c.textContent.slice(0, 300));
  }

  // ── AL-007: what could not be read is a line, and stays in the box ───────
  {
    const text = win.document.body.textContent;
    ok(text.includes(REFUSED + ' — The museum refused the page (403).'), 'AL-007: a refused page is a line naming the link and why');
    ok(text.includes(EMPTY + ' — The page came back empty.'), 'AL-007a:  so is an empty one');
    ok(win.document.querySelector('textarea').value === REFUSED + '\n' + EMPTY, 'AL-007b:  and the box now holds exactly those two links', JSON.stringify(win.document.querySelector('textarea').value));
    ok((store.get('links/pending') || {}).text === REFUSED + '\n' + EMPTY, 'AL-007c:  kept in the page\'s store, so closing the page loses nothing');
  }

  // ── AL-008: the new venues and their shops, kept in the store ────────────
  const venues = (store.get('venues/occasional') || {}).venues || {};
  const v = id => venues[id] || {};
  ok(Object.keys(venues).length === 6, 'AL-008: six new venues kept', Object.keys(venues).join(', '));
  ok(v('occ-museothyssen-org').shopCatalogues === 'https://tienda.museothyssen.org/en/catalogos', 'AL-008a:  Thyssen: the show page\'s own Shop link, then its catalogues shelf', v('occ-museothyssen-org').shopCatalogues);
  ok(v('occ-mauritshuis-nl').shopCatalogues === 'https://shop.mauritshuis.nl/en/books' && v('occ-mauritshuis-nl').shelfKind === 'books', 'AL-008b:  Mauritshuis: no link on the page, one search, then its books shelf', v('occ-mauritshuis-nl').shopCatalogues);
  ok(v('occ-royalacademy-org-uk').shop === 'none', 'AL-008c:  RA: nothing found is "none", never a guess', v('occ-royalacademy-org-uk').shop);
  ok(v('occ-clevelandart-org').shopCatalogues === 'https://shop.clevelandart.org/collections/exhibition-catalogs'
     && v('occ-clevelandart-org').shopSearch === 'https://shop.clevelandart.org/search?q=', 'AL-008d:  Cleveland: the catalogues collection, not mugs or a product, and Shopify\'s search', JSON.stringify(v('occ-clevelandart-org')));
  ok(v('occ-dia-org').shopHome === 'https://diashop.org/' && !v('occ-dia-org').shopCatalogues, 'AL-008e:  DIA: a shop whose menu came back empty keeps its address and claims no shelf');
  ok(v('occ-museothyssen-org').english === false && v('occ-dia-org').english === true, 'AL-008f:  whether a venue is English-speaking is kept, for the lookup\'s language check');
  ok(v('occ-dia-org').name === 'Detroit Institute of Arts Museum' && v('occ-courtauld-ac-uk').name === 'Courtauld', 'AL-008g:  a venue is named from the page title\'s site part', v('occ-courtauld-ac-uk').name);

  // ── AL-009: she confirms a shop, or says it is wrong ─────────────────────
  ok(buttons(/^Confirm$/).length === 6, 'AL-009: one Confirm per new venue', buttons(/^Confirm$/).length);
  const lineOf = name => [...win.document.querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name
    && [...d.children].some(b => b.tagName === 'BUTTON' && b.textContent === 'Confirm'));
  await click([...lineOf('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')].find(b => b.textContent === 'Confirm'));
  ok(((store.get('venues/occasional') || {}).venues['occ-museothyssen-org'] || {}).confirmed === true && !lineOf('Museo Nacional Thyssen-Bornemisza'),
    'AL-009a:  Confirm keeps it and the line goes');
  await click([...lineOf('Mauritshuis').querySelectorAll('button')].find(b => b.textContent === 'Wrong shop'));
  {
    const m = (store.get('venues/occasional') || {}).venues['occ-mauritshuis-nl'] || {};
    ok(m.shop === 'unknown' && (m.rejected || []).includes('shop.mauritshuis.nl') && !lineOf('Mauritshuis'),
      'AL-009b:  "Wrong shop" sets it aside and remembers not to pick it again', JSON.stringify(m));
  }
  ok(!lineOf('Royal Academy of Arts') || ![...lineOf('Royal Academy of Arts').querySelectorAll('button')].some(b => b.textContent === 'Wrong shop'),
    'AL-009c:  a venue with no shop found offers Confirm only');

  // ── AL-010: accepted, they file under their venues and the one chip ─────
  for (const b of buttons(/Add new entry$/)) await click(b);
  await click(buttons(/^Go ahead and update the ledger$/)[0]);
  const chip = buttons(/^Occasional$/)[0];
  ok(!!chip, 'AL-010: an "Occasional" chip sits with the venue chips');
  await click(chip);
  const arts = [...win.document.querySelectorAll('article')];
  ok(arts.length === 10, 'AL-010a:  pressed, it shows the ten occasional shows and nothing else', arts.length);
  const ra = arts.find(a => a.textContent.includes('Peggy Guggenheim'));
  ok(ra && /Royal Academy of Arts/.test(ra.textContent), 'AL-010b:  each card is headed by its venue', ra && ra.textContent.slice(0, 60));

  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) fail('React complained: ' + shouted.find(s => /Warning/.test(s)));
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_link: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
