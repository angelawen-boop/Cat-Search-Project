/**
 * "ADD BY LINK", PRESSED — her design, 3–4 Oct 2026 (docs/picked_shows.md).
 *
 * Renders the real app, loads a ledger through the real Load input, opens
 * Import, pastes links into its pop-up the careless way she will, and
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
 * THE SHOP SEARCHES ARE REAL TOO: docs/link_pages/shop_search/ holds the four
 * searches the finder makes ("<venue> shop exhibition catalogues"), as the free
 * Parallel Search returned them on 4 Oct, trimmed, and Thyssen's own list of
 * shop sections. WHAT IT CANNOT KNOW: the shop pages a pick is opened to
 * check, and the Thyssen and Mauritshuis menus — made up below to the shapes
 * seen on those shops; a real link from the venue is the test of that.
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

// ── the shops: real searches, and pages made to real shapes ─────────────────
const SEARCH = name => JSON.parse(fs.readFileSync(path.join(PAGES, 'shop_search', name + '.json'), 'utf8'));
const DIA_MIXED_ONLY = { results: [SEARCH('detroit').results[2]] };   // made: the reply with only "Books & Stationery" in it
const SEARCHES = [[/DIA only mixed/, DIA_MIXED_ONLY], [/Courtauld/, SEARCH('courtauld')], [/Cleveland/, SEARCH('cleveland')],
  [/Mauritshuis/, SEARCH('mauritshuis')], [/Thyssen/, SEARCH('thyssen')], [/Detroit/, SEARCH('detroit')]];
const books = ' Hardcover. 240 pages. € 34,95 — Paperback catalogue. € 24,95 — Exhibition catalogue, hardcover. € 49,95.';
const SHOPS = {
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi': 'Catalogi' + books,
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi': 'Boeken & Catalogi' + books,
  'https://tienda.museothyssen.org/collections.json?limit=250': SEARCH('thyssen_collections').full_content,
  'https://tienda.museothyssen.org/en/': '[Print on demand](https://tienda.museothyssen.org/en/collections/print-on-demand) [Gifts](https://tienda.museothyssen.org/en/collections/regalos) [Museum publications](https://tienda.museothyssen.org/en/collections/publicaciones-museo) [Posters](https://tienda.museothyssen.org/en/collections/posters)',
  'https://tienda.museothyssen.org/en/collections/publicaciones-museo': 'Museum publications' + books,
  'https://diashop.org/dia-publications': SEARCH('detroit_publications').full_content,
  'https://diashop.org/dia-publications/': SEARCH('detroit_publications').full_content,   // the sidebar's own spelling
  'https://diashop.org/': '',
  // "Books & Stationery": its sidebar as on her 4 Oct screenshot, links as the
  // search excerpt gives them; products pens and books alike.
  'https://diashop.org/dia-museum-book-shop/': '# Books & Stationery\n[Notecards & Journals](https://diashop.org/notecards-journals/) [Art Supplies](https://diashop.org/art-supplies/) [Cookbooks](https://diashop.org/cookbooks-1/) [DIA Publications](https://diashop.org/dia-publications/) [Detroit & Michigan](https://diashop.org/detroit-michigan/) [Artist Monographs & Subjects](https://diashop.org/artist-monographs-subjects/) [Gift Books](https://diashop.org/book-gifts/)\n#### [Gold Fountain Pen - Wave](https://diashop.org/gold-fountain-pen-wave/) $26.95\n#### [Fineliners Set of 5](https://diashop.org/fineliners/) $21.95\n#### [Dutch Art in a Global Age](https://diashop.org/dutch-art-in-a-global-age/) $60.00',
};

// DIA's own search (BigCommerce) answers only at search.php, with the product
// the words name — made to the shape of DIA's own link to one
// (?searchuuid=…&search_query=…, 4 Oct). Every other address answers empty.
function DIA_SEARCH(u) {
  const m = u.match(/^https:\/\/diashop\.org\/search\.php\?search_query=(.+)$/);
  if (!m) return '';
  const words = decodeURIComponent(m[1]);
  const hit = Object.values(SHOPS).join('\n').match(new RegExp('\\[' + words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]\\((https://diashop\\.org/[^)]+)\\)'));
  return hit ? '# Search Results\n#### [' + words + '](' + hit[1] + '?searchuuid=1)$36.00' : '# Search Results\nNo products found';
}

// ── the runtime: a store, a scripted connector and a scripted Claude ───────
const calls = [];
const store = new Map();
// DIA already met, with her short name, its shop set aside ("Wrong shop"):
// the next link looks for the shop again and must keep her name.
store.set('venues/occasional', { venues: { 'occ-dia-org': { id: 'occ-dia-org', name: 'Detroit Institute of Arts Museum',
  short: 'Detroit', host: 'dia.org', shop: 'unknown', confirmed: false, rejected: [], addedAt: '2026-10-04T00:00:00.000Z' } } });
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
          const hit = SEARCHES.find(([re]) => re.test(q));
          if (hit) return { payload: { results: hit[1].results } };
          return { payload: { results: [{ url: 'https://www.royalacademy.org.uk/visit', title: 'Visit the RA' }] } };
        }
        // Several addresses in one call (the search proof): each answered alone.
        if (args.urls.length > 1) return { payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', full_content: DIA_SEARCH(u) || SHOPS[u] || '' })), errors: [] } };
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
  const discoverShop = new Function('React', 'window', 'document', 'localStorage', code + '\n;return discoverShop;')(
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
  // ── AL-015: a page title with the site's sections between show and site ─
  // Her NG link, 6 Oct: "… | Past exhibitions" came through on the title.
  {
    const split = new Function('React', 'window', 'document', 'localStorage', code + '\n;return splitPageTitle;')(React, win, win.document, win.localStorage);
    const r = split('Venice: Canaletto and His Rivals | Past exhibitions | National Gallery', 'www.nationalgallery.org.uk');
    ok(r.show === 'Venice: Canaletto and His Rivals' && r.site === 'National Gallery',
      'AL-015: several bars — the show is the first part, the site the last; the section between dropped', JSON.stringify(r));
  }
  // ── AL-001: Import opens ONE pop-up; nothing is added to the page ───────
  // Her ruling, 4 Oct: no new buttons and no text in the page's header.
  const dialog = () => win.document.querySelector('[role=dialog]');
  const headerButtons = () => [...win.document.querySelector('header').querySelectorAll('button')].map(b => b.textContent.trim());
  const before = headerButtons();
  ok(!dialog(), 'AL-001: before Import is pressed, no pop-up');
  await click(importBtn());
  ok(!!dialog(), 'AL-001a:  pressed, a pop-up opens');
  ok(JSON.stringify(headerButtons()) === JSON.stringify(before), 'AL-001b:  and not one button is added to the page itself', headerButtons().join(' | '));
  const inside = () => [...dialog().querySelectorAll('button')].map(b => b.textContent.trim()).join('|');
  const inDialog = t => [...dialog().querySelectorAll('button')].find(b => b.textContent === t);
  ok(inside() === 'CSV|Links|Cancel' && !dialog().querySelector('textarea'),
    'AL-001c:  small: CSV, Links, and Cancel under them — no box yet', inside());
  {
    const csvInput = win.document.querySelector('input[type=file][accept=".csv,text/csv"]');
    let opened = false; csvInput.click = () => { opened = true; };
    await click(inDialog('CSV'));
    ok(opened && !dialog(), 'AL-001d:  "CSV" closes it and opens the file picker, as Import always did');
  }
  await click(importBtn());
  await click(inDialog('Cancel'));
  ok(!dialog(), 'AL-001e:  "Cancel" closes it');
  await click(importBtn());
  await click(inDialog('Links'));
  const box = dialog().querySelector('textarea');
  {
    const [csvB, linksB] = [...dialog().querySelectorAll('button')];
    ok(linksB.style.background && linksB.style.background !== 'transparent' && csvB.style.background === 'transparent',
      'AL-002a:  the pressed one turns solid (Save\'s green), the other stays plain', linksB.style.background + ' / ' + csvB.style.background);
  }
  ok(!!box && inside() === 'CSV|Links|Read|Cancel', 'AL-002: "Links" opens the box and Read on the same pop-up, Cancel still below', inside());

  // ── AL-003: pasted carelessly — commas, spaces, lines, words, a repeat ─────
  const pasted = 'here you go: ' + WANT.slice(0, 4).map(w => urlOf(w[0])).join(', ') + ' ' + GRAND + '\n'
    + WANT.slice(4).map(w => urlOf(w[0])).join(' , ') + '\nand ' + urlOf('ra_guggenheim') + '.\n' + REFUSED + ';' + EMPTY;
  const setter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => { setter.call(box, pasted); box.dispatchEvent(new win.Event('input', { bubbles: true })); });
  await settle();
  calls.length = 0;
  await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
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
    ok(!store.has('links/pending'), 'AL-007c:  not stored yet — the import has not finished (her rule, 4 Oct)');
  }

  // ── AL-012: an import she does not finish keeps nothing (her rule, 4 Oct) ─
  const occStored = () => ((store.get('venues/occasional') || {}).venues) || {};
  const before12 = JSON.stringify(occStored());
  ok(Object.keys(occStored()).length === 1, 'AL-012: the Read stores no venue and no shop — only what was there before', Object.keys(occStored()).join(', '));
  {
    for (const b of buttons(/Add new entry$/)) await click(b);
    await click(buttons(/^Next$/)[0]);
    const scr = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New Venue Shops/.test(d.textContent));
    const card = name => [...scr().querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name && d.querySelector('button'));
    await click([...card('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')].find(x => x.textContent === 'Confirm'));
    ok(JSON.stringify(occStored()) === before12, 'AL-012a:  Confirm on the shop screen stores nothing yet');
    await click([...scr().querySelectorAll('button')].find(b => b.textContent === 'Back'));
    await click(buttons(/^Cancel import$/)[0]);
    ok(!scr() && JSON.stringify(occStored()) === before12, 'AL-012b:  Cancel import: the store is as it was before the Read');
    // The same links again, from the start: every venue is asked about again.
    const box2 = dialog().querySelector('textarea');
    await act(async () => { setter.call(box2, pasted); box2.dispatchEvent(new win.Event('input', { bubbles: true })); });
    await settle();
    calls.length = 0;
    await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Read'));
    await settle(30);
    const ex = buttons(/^Expand all venues$/)[0];
    if (ex) await click(ex);
  }

  // ── AL-008: the new venues' shops, as the finder found them ──────────────
  const fetched = u => calls.some(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls[0] === u);
  const searchedFor = re => calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search' && re.test(c.args.search_queries.join(' ')));
  ok(searchedFor(/Courtauld/).length === 1 && searchedFor(/Courtauld/)[0].args.search_queries[0] === 'Courtauld shop exhibition catalogues',
    'AL-008: her own query, "<venue> shop exhibition catalogues", searched once per venue', JSON.stringify(searchedFor(/Courtauld/).map(c => c.args.search_queries)));
  ok(!fetched('https://shop.clevelandart.org/collections/exhibitions') && !fetched('https://shop.courtauld.ac.uk/collections/courtauld-catalogues'),
    'AL-008c:  Courtauld\'s and Cleveland\'s sections proved shelves of books by the search\'s own excerpt — no page opened');
  ok(fetched('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'), 'AL-008d:  Mauritshuis: "Catalogi" opened to check, its excerpt being too thin');
  ok(fetched('https://tienda.museothyssen.org/collections.json?limit=250'), 'AL-008e:  Thyssen: the search found only single books, so the shop\'s section list was read');
  ok(fetched('https://diashop.org/dia-publications') && !fetched('https://diashop.org/dia-museum-book-shop/'),
    'AL-008f:  DIA: "DIA Publications", the 1st result of her keyed search (4 Oct), opened to check; "Books & Stationery" never offered');
  ok(searchedFor(/Detroit/).length === 1 && searchedFor(/Detroit/)[0].args.search_queries[1] === 'Detroit Institute of Arts Museum shop books publications',
    'AL-008f2:  the books section\'s own query rides in the same search call — without it Parallel never returned DIA Publications', JSON.stringify(searchedFor(/Detroit/).map(c => c.args.search_queries)));
  {
    const r = await discoverShop('https://diashop.org/', 'dia.org', 'DIA only mixed', []);
    ok(r.shopCatalogues === 'https://diashop.org/dia-publications/' && r.shelfKind === 'publications' && fetched('https://diashop.org/dia-museum-book-shop/'),
      'AL-008j:  a search that finds only "Books & Stationery" (pens, journals, books): never taken — opened, and its books-only "DIA Publications" taken', JSON.stringify(r));
    // Her finding, 6 Oct: DIA files a show's catalogue in the show's own
    // section, not on its shelf. Its whole-shop search is proved on a book
    // the shelf showed — BigCommerce's address, which nothing could name before.
    ok(r.shopSearch === 'https://diashop.org/search.php?search_query=' && r.finder === 3,
      'AL-008k:  DIA: its whole-shop search worked out, proved on a product seen on its own shop', JSON.stringify(r));
    const probe = calls.find(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.length > 1);
    ok(probe && probe.args.urls.length === 8 && probe.args.urls.every(u => u.startsWith('https://diashop.org/')),
      'AL-008k2:  the proof is ONE call: four shop softwares × two books seen, all on DIA\'s own shop', probe && JSON.stringify(probe.args.urls));
  }

  // ── AL-009: the shop screen, between the review and the ledger ───────────
  ok(!/Confirm|Wrong shop|Look again/.test(dialog() ? dialog().textContent : ''), 'AL-009: the import pop-up asks nothing about shops');
  // Her 4 Oct run: the RA's and the Courtauld's cards were not going in, and
  // their shops were left off the screen. Every new venue met is asked about.
  {
    const adds = buttons(/Add new entry$/);
    for (const b of adds) await click(b);
    const raAdd = adds.find(b => { let el = b; while (el && !/Peggy Guggenheim/.test(el.textContent)) el = el.parentElement; return el && el.textContent.length < 3000; });
    let el = raAdd; while (el && !/Peggy Guggenheim/.test(el.textContent)) el = el.parentElement;
    await click([...el.querySelectorAll('button')].find(b => /Reject$/.test(b.textContent.trim())));
  }
  const ledgerCards = () => win.document.querySelectorAll('article').length;
  const cardsBefore = ledgerCards();
  ok(buttons(/^Next$/).length === 1 && !buttons(/^Go ahead and update the ledger$/).length, 'AL-009a:  every card decided, the review\'s last button reads "Next"');
  await click(buttons(/^Next$/)[0]);
  const shops = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New Venue Shops/.test(d.textContent));
  ok(!!shops() && ledgerCards() === cardsBefore, 'AL-009b:  "Next" opens the shop screen; the ledger has not moved');
  const shopCard = name => [...shops().querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name && d.querySelector('button'));
  const press = async (name, label) => { const c = shopCard(name); const b = c && [...c.querySelectorAll('button')].find(x => x.textContent === label); if (b) await click(b); return !!b; };
  const footer = () => [...shops().querySelectorAll('button')].pop().textContent;
  ok(footer() === '6 still to decide' && !!shopCard('Royal Academy of Arts'), 'AL-009c:  six venues to answer — the RA too, its one card rejected — and the ledger button says so', footer());
  ok(shops().textContent.includes('Check and approve each shop link.'), 'AL-009c2:  her heading and line');
  {
    const has = (name, u) => shopCard(name).textContent.includes(u);
    ok(has('Courtauld', 'https://shop.courtauld.ac.uk/collections/courtauld-catalogues')
       && has('Cleveland Museum of Art', 'https://shop.clevelandart.org/collections/exhibitions')
       && has('Mauritshuis', 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi')
       && has('Museo Nacional Thyssen-Bornemisza', 'https://tienda.museothyssen.org/en/collections/publicaciones-museo'),
      'AL-009c3:  each card shows the section the finder took: Courtauld\'s catalogues (not the reseller\'s shelf), Cleveland\'s 4th result "Exhibition Catalogues", Mauritshuis\'s "Catalogi", Thyssen\'s menu "Museum publications"');
  }
  {
    const order = name => [...shopCard(name).querySelectorAll('button')].map(b => b.textContent).join('|');
    const conf = [...shopCard('Royal Academy of Arts').querySelectorAll('button')].find(b => b.textContent === 'Confirm');
    ok(shopCard('Royal Academy of Arts').textContent.includes('No museum shop found.') && order('Royal Academy of Arts') === 'Confirm|Look again|No shop'
       && conf.disabled && order('Courtauld') === 'Confirm|Look again|No shop',
      'AL-009d:  the same three buttons in the same places on every card; Confirm greyed where nothing was found', order('Royal Academy of Arts'));
  }
  ok(shopCard('Detroit Institute of Arts Museum').textContent.includes('https://diashop.org/dia-publications'), 'AL-009e0:  DIA\'s section shown, to confirm');
  // DIA Publications turned down: "Books & Stationery" is mixed, so it is only
  // looked inside — and holds no other books-only section.
  calls.length = 0;
  await press('Detroit Institute of Arts Museum', 'Look again'); await settle(10);
  ok(shopCard('Detroit Institute of Arts Museum').textContent.includes('Shop found, but not its books section: https://diashop.org/')
     && !shopCard('Detroit Institute of Arts Museum').textContent.includes('dia-museum-book-shop') && fetched('https://diashop.org/dia-museum-book-shop/'),
    'AL-009e:  Look again never offers a mixed books-and-stationery section; with nothing books-only left it says so and links the shop', shopCard('Detroit Institute of Arts Museum').textContent);
  await press('Museo Nacional Thyssen-Bornemisza', 'Confirm');
  ok(/^✓ Confirm$/.test([...shopCard('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')][0].textContent), 'AL-009f0:  Confirm ticks, as "Add new entry" does');
  ok(!(occStored()['occ-museothyssen-org'] || {}).confirmed && footer() === '5 still to decide',
    'AL-009f:  Confirm counts at once — one fewer to decide — but is not stored yet', footer());
  calls.length = 0;
  await press('Mauritshuis', 'Look again');
  await settle(10);
  ok(calls.some(c => c.tool === 'web_search') && shopCard('Mauritshuis').textContent.includes('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi')
     && !shopCard('Mauritshuis').textContent.includes('/catalogi/catalogi') && !/✓/.test(shopCard('Mauritshuis').textContent),
    'AL-009g:  Look again searches on the spot and skips only the page turned down — the same shop\'s other section offered, to confirm', shopCard('Mauritshuis').textContent);
  await click([...shops().querySelectorAll('button')].find(b => b.textContent === 'Back'));
  ok(!shops() && buttons(/^Next$/).length === 1, 'AL-009i:  Back returns to the review, decisions kept');
  await click(buttons(/^Next$/)[0]);
  ok(/^✓ Confirm$/.test([...shopCard('Museo Nacional Thyssen-Bornemisza').querySelectorAll('button')][0].textContent) && footer() === '5 still to decide',
    'AL-009i2:  and the shop answers given before Back are still there', footer());
  await press('Royal Academy of Arts', 'No shop');
  ok(/^✓ No shop$/.test([...shopCard('Royal Academy of Arts').querySelectorAll('button')][2].textContent), 'AL-009j:  No shop is an answer');
  await press('Detroit Institute of Arts Museum', 'No shop');
  await press('Courtauld', 'Confirm'); await press('Cleveland Museum of Art', 'Confirm'); await press('Mauritshuis', 'Confirm');
  ok(footer() === 'Go ahead and update the ledger', 'AL-009k:  every shop answered, the ledger may move', footer());
  await click([...shops().querySelectorAll('button')].pop());
  ok(!shops() && ledgerCards() > cardsBefore, 'AL-009l:  and does');
  ok((store.get('links/pending') || {}).text === REFUSED + '\n' + EMPTY, 'AL-007d:  the import finished, the two unread links are stored, so closing the page loses nothing');
  {
    const v = id => occStored()[id] || {};
    ok(Object.keys(occStored()).length === 6 && Object.values(occStored()).every(x => x.confirmed === true),
      'AL-009m:  only now are the six venues and her answers stored', JSON.stringify(Object.values(occStored()).map(x => [x.id, x.shop, x.confirmed])));
    ok(v('occ-courtauld-ac-uk').shelfKind === 'catalogues' && v('occ-clevelandart-org').shopSearch === 'https://shop.clevelandart.org/search?q='
       && v('occ-museothyssen-org').shelfKind === 'publications' && v('occ-mauritshuis-nl').shopCatalogues === 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi'
       && v('occ-mauritshuis-nl').turnedDown.includes('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'),
      'AL-009n:  stored as answered: the section, its kind, the shop\'s search, the pages turned down', JSON.stringify([v('occ-courtauld-ac-uk'), v('occ-mauritshuis-nl')]));
    ok(v('occ-royalacademy-org-uk').shop === 'none' && v('occ-dia-org').shop === 'none', 'AL-009o:  No shop stored: their lookups go to the web');
    ok(v('occ-museothyssen-org').english === false && v('occ-dia-org').english === true && v('occ-courtauld-ac-uk').name === 'Courtauld',
      'AL-009p:  English-speaking or not, and the name from the page title, stored with them');
  }

  // ── AL-010: accepted, they file under their venues and the one chip ─────
  ok(!!dialog() && /Links/.test(dialog().textContent), 'AL-010z:  two links could not be read, so the import pop-up waits under it');
  await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Cancel'));
  const chip = buttons(/^Occasional$/)[0];
  ok(!!chip, 'AL-010: an "Occasional" chip sits with the venue chips');
  await click(chip);
  const arts = [...win.document.querySelectorAll('article')];
  ok(arts.length === 9, 'AL-010a:  pressed, it shows the nine occasional shows accepted (the RA one rejected) and nothing else', arts.length);
  const cle = arts.find(a => a.textContent.includes('Filippino Lippi'));
  ok(cle && /^Cleveland Museum of Art/.test(cle.textContent), 'AL-010b:  each card is headed by its venue', cle && cle.textContent.slice(0, 60));

  const dia = arts.find(a => a.textContent.includes('Caravaggio'));
  ok(dia && /^Detroit/.test(dia.textContent) && !/^Detroit Institute/.test(dia.textContent), 'AL-011: a venue\'s short name, hers, heads its cards', dia && dia.textContent.slice(0, 40));
  ok((((store.get('venues/occasional') || {}).venues || {})['occ-dia-org'] || {}).short === 'Detroit', 'AL-011a:   and survives its shop being looked for again');
  // ── AL-013: a CSV import keeps nothing until it finishes either ─────────
  {
    const csv = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n'
      + 'met,A Show Never Seen,2026-11-01,2027-02-01,A test row.,https://www.metmuseum.org/exhibitions/a-show-never-seen,,2026-10-03T00:00:00.000Z\n';
    const feed = async () => {
      const input = win.document.querySelector('input[type=file][accept=".csv,text/csv"]');
      Object.defineProperty(input, 'files', { value: [new win.File([csv], 'sweep.csv', { type: 'text/csv' })], configurable: true });
      await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
      await settle(10);
    };
    await feed();
    ok(buttons(/Add new entry$/).length === 1 && !store.has('sweeps/venues'), 'AL-013: a CSV read: its card shown, the sweep log not stored yet');
    await click(buttons(/^Cancel import$/)[0]);
    ok(!store.has('sweeps/venues'), 'AL-013a:  Cancel import: the sweep log still not stored');
    await feed();
    await click(buttons(/Add new entry$/)[0]);
    await click(buttons(/^Go ahead and update the ledger$/)[0]);
    ok(!!((store.get('sweeps/venues') || {}).venues || {}).met, 'AL-013b:  the import finished: the sweep log stored', JSON.stringify(store.get('sweeps/venues')));
  }
  // ── AL-014: a venue met before searches were proved gets one ────────────
  // Her store as it stood 6 Oct: Detroit confirmed on 4 Oct with its shelf and
  // NO search, so "Georgia O'Keeffe: Architecture" — filed in the show's own
  // section, not on the shelf — was missed. Its first lookup works the search
  // out from the shelf, stores it, and searches the whole shop.
  {
    await act(async () => { root.unmount(); });
    store.set('venues/occasional', { venues: { 'occ-dia-org': { id: 'occ-dia-org', name: 'Detroit Institute of Arts Museum', short: 'Detroit',
      host: 'www.dia.org', english: true, shop: 'found', confirmed: true, finder: 2, shelfKind: 'publications',
      shopHome: 'https://diashop.org/', shopCatalogues: 'https://diashop.org/dia-publications/', shopSearch: null,
      turnedDown: [], addedAt: '2026-10-04T00:00:00.000Z' } } });
    const okeeffe = { ...ledger.rows[0], id: 'occ-dia-org-okeeffe', museumId: 'occ-dia-org', title: 'Georgia O’Keeffe: Architecture',
      startDate: '2026-09-11', endDate: '2027-01-03', exUrl: urlOf('dia_okeeffe'), acquiring: 'yes', looked: true, hasCatalogue: 'no' };
    const root2 = createRoot(win.document.getElementById('root'));
    await act(async () => { root2.render(React.createElement(App)); });
    await settle();
    const input2 = win.document.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input2, 'files', { value: [new win.File([JSON.stringify({ ...ledger, rows: [okeeffe] })], 'ledger.json', { type: 'application/json' })], configurable: true });
    await act(async () => { input2.dispatchEvent(new win.Event('change', { bubbles: true })); });
    await settle();
    calls.length = 0;
    const drawer = buttons(/Catalogue$/)[0];
    if (drawer) await click(drawer);
    const again = buttons(/^Search again$/)[0];
    ok(!!again, 'AL-014: the O\'Keeffe card, looked up before, offers Search again');
    if (again) { await click(again); await settle(20); }
    const dia = ((store.get('venues/occasional') || {}).venues || {})['occ-dia-org'] || {};
    ok(dia.shopSearch === 'https://diashop.org/search.php?search_query=' && dia.finder === 3 && dia.short === 'Detroit' && dia.confirmed === true,
      'AL-014a:  its search worked out from its own shelf and stored; her name and her Confirm kept', JSON.stringify(dia));
    const shopCall = calls.find(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.includes('https://diashop.org/dia-publications/?page=2'));
    ok(shopCall && shopCall.args.urls.includes("https://diashop.org/search.php?search_query=Georgia%20O'Keeffe%3A%20Architecture"),
      'AL-014b:  the lookup reads the shelf AND searches the whole shop, the curly apostrophe straightened', shopCall && JSON.stringify(shopCall.args.urls));
    calls.length = 0;
    if (!buttons(/^Search again$/)[0] && buttons(/Catalogue$/)[0]) await click(buttons(/Catalogue$/)[0]);
    ok(!!buttons(/^Search again$/)[0], 'AL-014c0:  Search again still offered');
    if (buttons(/^Search again$/)[0]) { await click(buttons(/^Search again$/)[0]); await settle(20); }
    ok(!calls.some(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls.length === 8),
      'AL-014c:  worked out once: the next lookup does not prove it again');
  }
  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) fail('React complained: ' + shouted.find(s => /Warning/.test(s)));
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_link: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
