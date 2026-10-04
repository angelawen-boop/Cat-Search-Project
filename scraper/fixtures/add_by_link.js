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
const SEARCHES = [[/Courtauld/, SEARCH('courtauld')], [/Cleveland/, SEARCH('cleveland')],
  [/Mauritshuis/, SEARCH('mauritshuis')], [/Thyssen/, SEARCH('thyssen')]];
const books = ' Hardcover. 240 pages. € 34,95 — Paperback catalogue. € 24,95 — Exhibition catalogue, hardcover. € 49,95.';
const SHOPS = {
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi': 'Catalogi' + books,
  'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi': 'Boeken & Catalogi' + books,
  'https://tienda.museothyssen.org/collections.json?limit=250': SEARCH('thyssen_collections').full_content,
  'https://tienda.museothyssen.org/en/': '[Print on demand](https://tienda.museothyssen.org/en/collections/print-on-demand) [Gifts](https://tienda.museothyssen.org/en/collections/regalos) [Museum publications](https://tienda.museothyssen.org/en/collections/publicaciones-museo) [Posters](https://tienda.museothyssen.org/en/collections/posters)',
  'https://tienda.museothyssen.org/en/collections/publicaciones-museo': 'Museum publications' + books,
  'https://diashop.org/': '',
};

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
    ok((store.get('links/pending') || {}).text === REFUSED + '\n' + EMPTY, 'AL-007c:  kept in the page\'s store, so closing the page loses nothing');
  }

  // ── AL-008: the new venues and their shops, kept in the store ────────────
  const venues = (store.get('venues/occasional') || {}).venues || {};
  const v = id => venues[id] || {};
  ok(Object.keys(venues).length === 6, 'AL-008: six new venues kept', Object.keys(venues).join(', '));
  const fetched = u => calls.some(c => c.kind === 'mcp' && c.tool === 'web_fetch' && c.args.urls[0] === u);
  const searchedFor = re => calls.filter(c => c.kind === 'mcp' && c.tool === 'web_search' && re.test(c.args.search_queries.join(' ')));
  ok(searchedFor(/Courtauld/).length === 1 && searchedFor(/Courtauld/)[0].args.search_queries[0] === 'Courtauld shop exhibition catalogues',
    'AL-008: her own query, "<venue> shop exhibition catalogues", searched once per venue', JSON.stringify(searchedFor(/Courtauld/).map(c => c.args.search_queries)));
  ok(v('occ-courtauld-ac-uk').shopCatalogues === 'https://shop.courtauld.ac.uk/collections/courtauld-catalogues' && v('occ-courtauld-ac-uk').shelfKind === 'catalogues',
    'AL-008a:  Courtauld: its catalogues section — not the reseller\'s Courtauld shelf, the museum library\'s catalogues page, the front page or one book', v('occ-courtauld-ac-uk').shopCatalogues);
  ok(v('occ-clevelandart-org').shopCatalogues === 'https://shop.clevelandart.org/collections/exhibitions'
     && v('occ-clevelandart-org').shopSearch === 'https://shop.clevelandart.org/search?q=',
    'AL-008b:  Cleveland: the 4th result, "Exhibition Catalogues" — not "Arts & Crafts" ranked 1st, nor "All Products (not Catalogues)"; Shopify\'s search kept', JSON.stringify(v('occ-clevelandart-org')));
  ok(!fetched('https://shop.clevelandart.org/collections/exhibitions') && !fetched('https://shop.courtauld.ac.uk/collections/courtauld-catalogues'),
    'AL-008c:  both proved shelves of books by the search\'s own excerpt — no page opened');
  ok(v('occ-mauritshuis-nl').shopCatalogues === 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi' && fetched('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'),
    'AL-008d:  Mauritshuis: "Catalogi", opened to check, its excerpt being too thin to prove it', v('occ-mauritshuis-nl').shopCatalogues);
  ok(fetched('https://tienda.museothyssen.org/collections.json?limit=250')
     && v('occ-museothyssen-org').shopCatalogues === 'https://tienda.museothyssen.org/en/collections/publicaciones-museo' && v('occ-museothyssen-org').shelfKind === 'books',
    'AL-008e:  Thyssen: the search found only single books; the shop\'s section list held none (Balenciaga\'s "…catalogos" handle not taken); its menu\'s "Museum publications"', JSON.stringify(v('occ-museothyssen-org')));
  ok(v('occ-dia-org').shop === 'noshelf' && v('occ-dia-org').shopHome === 'https://diashop.org/' && !v('occ-dia-org').shopCatalogues,
    'AL-008f:  DIA: a shop with no books section found claims none — never its front page', JSON.stringify(v('occ-dia-org')));
  ok(v('occ-royalacademy-org-uk').shop === 'none', 'AL-008g:  RA: no shop found is "none", never a guess', v('occ-royalacademy-org-uk').shop);
  ok(v('occ-museothyssen-org').english === false && v('occ-dia-org').english === true, 'AL-008h:  whether a venue is English-speaking is kept, for the lookup\'s language check');
  ok(v('occ-dia-org').name === 'Detroit Institute of Arts Museum' && v('occ-courtauld-ac-uk').name === 'Courtauld', 'AL-008i:  a venue is named from the page title\'s site part', v('occ-courtauld-ac-uk').name);

  // ── AL-009: the shop screen, between the review and the ledger ───────────
  ok(!/Confirm|Wrong shop|Look again/.test(dialog() ? dialog().textContent : ''), 'AL-009: the import pop-up asks nothing about shops');
  for (const b of buttons(/Add new entry$/)) await click(b);
  const ledgerCards = () => win.document.querySelectorAll('article').length;
  const cardsBefore = ledgerCards();
  ok(buttons(/^Next$/).length === 1 && !buttons(/^Go ahead and update the ledger$/).length, 'AL-009a:  every card decided, the review\'s last button reads "Next"');
  await click(buttons(/^Next$/)[0]);
  const shops = () => [...win.document.querySelectorAll('[role=dialog]')].find(d => /New venues/.test(d.textContent));
  ok(!!shops() && ledgerCards() === cardsBefore, 'AL-009b:  "Next" opens the shop screen; the ledger has not moved');
  const shopCard = name => [...shops().querySelectorAll('div')].find(d => d.firstChild && d.firstChild.textContent === name && d.querySelector('button'));
  const press = async (name, label) => { const c = shopCard(name); const b = c && [...c.querySelectorAll('button')].find(x => x.textContent === label); if (b) await click(b); return !!b; };
  const footer = () => [...shops().querySelectorAll('button')].pop().textContent;
  ok(footer() === '6 still to decide', 'AL-009c:  six venues to answer, and the ledger button says so', footer());
  ok(shopCard('Royal Academy of Arts').textContent.includes('No museum shop found.')
     && [...shopCard('Royal Academy of Arts').querySelectorAll('button')].map(b => b.textContent).join('|') === 'Look again|No shop',
    'AL-009d:  no shop found: Look again · No shop, and no Confirm', shopCard('Royal Academy of Arts').textContent);
  ok(shopCard('Detroit Institute of Arts Museum').textContent.includes('Books section not found.'), 'AL-009e:  a shop with no books section says so');
  await press('Museo Nacional Thyssen-Bornemisza', 'Confirm');
  ok(((store.get('venues/occasional') || {}).venues['occ-museothyssen-org'] || {}).confirmed === true && footer() === '5 still to decide',
    'AL-009f:  Confirm is kept at once, and one fewer to decide', footer());
  calls.length = 0;
  await press('Mauritshuis', 'Look again');
  await settle(10);
  {
    const m = (store.get('venues/occasional') || {}).venues['occ-mauritshuis-nl'] || {};
    ok(calls.some(c => c.tool === 'web_search') && m.shopCatalogues === 'https://shop.mauritshuis.nl/product-categorie/boeken-catalogi'
       && (m.turnedDown || []).includes('https://shop.mauritshuis.nl/product-categorie/boeken-catalogi/catalogi'),
      'AL-009g:  Look again searches on the spot and skips only the page turned down — the same shop\'s other section is offered', JSON.stringify(m));
    ok(shopCard('Mauritshuis').textContent.includes('boeken-catalogi') && !m.confirmed, 'AL-009h:   shown on the same card, to confirm');
  }
  await click([...shops().querySelectorAll('button')].find(b => b.textContent === 'Back'));
  ok(!shops() && buttons(/^Next$/).length === 1, 'AL-009i:  Back returns to the review, decisions kept');
  await click(buttons(/^Next$/)[0]);
  await press('Royal Academy of Arts', 'No shop');
  ok(((store.get('venues/occasional') || {}).venues['occ-royalacademy-org-uk'] || {}).confirmed === true, 'AL-009j:  No shop is an answer, kept: its lookups go to the web');
  await press('Detroit Institute of Arts Museum', 'No shop');
  await press('Courtauld', 'Confirm'); await press('Cleveland Museum of Art', 'Confirm'); await press('Mauritshuis', 'Confirm');
  ok(footer() === 'Go ahead and update the ledger', 'AL-009k:  every shop answered, the ledger may move', footer());
  await click([...shops().querySelectorAll('button')].pop());
  ok(!shops() && ledgerCards() > cardsBefore, 'AL-009l:  and does');

  // ── AL-010: accepted, they file under their venues and the one chip ─────
  ok(!!dialog() && /Links/.test(dialog().textContent), 'AL-010z:  two links could not be read, so the import pop-up waits under it');
  await click([...dialog().querySelectorAll('button')].find(b => b.textContent === 'Cancel'));
  const chip = buttons(/^Occasional$/)[0];
  ok(!!chip, 'AL-010: an "Occasional" chip sits with the venue chips');
  await click(chip);
  const arts = [...win.document.querySelectorAll('article')];
  ok(arts.length === 10, 'AL-010a:  pressed, it shows the ten occasional shows and nothing else', arts.length);
  const ra = arts.find(a => a.textContent.includes('Peggy Guggenheim'));
  ok(ra && /Royal Academy of Arts/.test(ra.textContent), 'AL-010b:  each card is headed by its venue', ra && ra.textContent.slice(0, 60));

  const dia = arts.find(a => a.textContent.includes('Caravaggio'));
  ok(dia && /^Detroit/.test(dia.textContent) && !/^Detroit Institute/.test(dia.textContent), 'AL-011: a venue\'s short name, hers, heads its cards', dia && dia.textContent.slice(0, 40));
  ok((((store.get('venues/occasional') || {}).venues || {})['occ-dia-org'] || {}).short === 'Detroit', 'AL-011a:   and survives its shop being looked for again');
  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) fail('React complained: ' + shouted.find(s => /Warning/.test(s)));
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_link: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
