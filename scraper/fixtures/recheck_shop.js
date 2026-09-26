/**
 * "RE-CHECK MUSEUM SHOP", PRESSED — her design, 25 Sep 2026.
 *
 * The functions behind it are asserted one by one in catalogue_lookup.js
 * (C-079 onward). This file does what that one cannot: it renders the real
 * app, loads a ledger through the real Load input, opens the catalogue tray and
 * PRESSES the buttons, with the connector and Claude played by a script. Then
 * it reads the card back out of the page — the words and the link she would
 * see — because a status that is right in the row and wrong on screen is the
 * failure she would meet.
 *
 * The rows are two from her own 24 Sep ledger (docs/ledger_2026-09-24/), plus
 * two made to be the other shapes: a catalogue found outside the museum shop,
 * and no catalogue at all.
 *
 * WHAT IT CANNOT KNOW: how a real shop words "sold out", or what the connector
 * really returns for a redirect. Those need a real case. It does know what a
 * real 404 looks like — the shape below was read off the live connector on
 * 25 Sep, against the Met's store.
 *
 *   node scraper/fixtures/recheck_shop.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const LEDGER = path.join(__dirname, '..', '..', 'docs', 'ledger_2026-09-24',
  'cat-watch-ledger-2026-09-24-1616.json');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-recheck-'));

// Prepared exactly as page_renders.js prepares it.
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'],
    { stdio: 'pipe' });
} catch { /* the emit is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) { console.log('FAIL  the page did not transpile'); process.exit(1); }
const code = fs.readFileSync(built, 'utf8');

const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react');

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

// ── the ledger: two of her real rows and two made shapes ──────────────────
const real = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).rows;
const miller = real.find(r => r.id === 'artic-leemillerfearless');
const hidden = real.find(r => r.id === 'met-hiddenfacescoveredportraitsoftherenaissance');
const base = { interested: true, watching: true, acquiring: 'yes', looked: true,
  addedAt: '2026-09-22T13:00:00.000Z', editedAt: null, startDate: '2026-09-01', endDate: '2026-12-31' };
const webRow = { ...base, id: 'ng-testwebrow', museumId: 'ng', title: 'Test Show Outside The Shop',
  summary: 'x', exUrl: 'https://www.nationalgallery.org.uk/exhibitions/test',
  hasCatalogue: 'yes', catalogueTitle: 'Test Show: The Catalogue', isbn13: null,
  publisher: 'Hannibal Books', publisherUrl: 'https://hannibalbooks.be/en/test-show',
  publisherResult: 'product', shopUrl: null, shopState: 'web', shopChange: null };
const noCatRow = { ...base, id: 'ng-testnocat', museumId: 'ng', title: 'Test Show With No Book',
  summary: 'x', exUrl: 'https://www.nationalgallery.org.uk/exhibitions/test2',
  hasCatalogue: 'no', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null,
  publisherResult: null, shopUrl: null, shopState: 'none', shopChange: null };
// A BLOCKED SHOP — her finding, 25 Sep, KHM. Her row exactly as it was
// filed: a ticket link, "In the museum shop", from a shop that answers every
// request with a 307 to its waiting room.
const TICKET = 'https://shop.khm.at/en/tickets/canaletto-bellotto-200000000008445-T429-01';
const khmBad = { ...base, id: 'khm-canalettobellotto', museumId: 'khm', title: 'Canaletto & Bellotto',
  summary: 'x', exUrl: 'https://www.khm.at/en/exhibitions/canaletto-bellotto', startDate: '2026-03-24', endDate: '2026-09-06',
  hasCatalogue: 'yes', catalogueTitle: 'Canaletto & Bellotto. Exhibition Catalogue 2026', isbn13: null,
  publisher: null, publisherUrl: null, publisherResult: 'unnamed', shopUrl: TICKET, shopState: 'shop', shopChange: null };
const fresh = (id, museumId, title) => ({ ...base, id, museumId, title, summary: 'x', exUrl: 'https://x.test/' + id,
  looked: false, hasCatalogue: null, catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null,
  publisherResult: null, shopUrl: null, shopState: null, shopChange: null });
const khmA = fresh('khm-testa', 'khm', 'Test KHM Show Alpha');
const khmB = fresh('khm-testb', 'khm', 'Test KHM Show Beta');
const khmC = fresh('khm-testc', 'khm', 'Test KHM Show Gamma');
const ngA = fresh('ng-testopens', 'ng', 'Test NG Show Opens');
const ngB = fresh('ng-testdead', 'ng', 'Test NG Show Dead Link');
const lgdRow = fresh('lgd-yvesklein', 'lgd', 'Yves Klein and the Tangible World');
const ngPub = fresh('ng-testpubdies', 'ng', 'Test NG Publisher Dies');
const ledger = { rows: [miller, hidden, webRow, noCatRow, khmBad, khmA, khmB, khmC, ngA, ngB, lgdRow, ngPub], ignored: [], lastRun: null };

// ── the runtime: a store, a download, and a scripted connector and Claude ──
const script = { mcp: null, sample: null };
const calls = [];
function runtime() {
  const store = new Map();
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
        return script.mcp(tool, args);
      } };
      if (name === 'sample') return { json: async prompt => {
        calls.push({ kind: 'sample', prompt });
        return script.sample(prompt);
      } };
      return null;
    },
    complete: async () => '',
  };
}
const refused = code => { const e = new Error('refused'); e.code = code; return e; };

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
  const realError = console.error;
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));

  const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
  const root = createRoot(win.document.getElementById('root'));
  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(
    React, win, win.document, win.localStorage);
  await act(async () => { root.render(React.createElement(App)); });
  await settle();

  // LOAD, through the real input.
  const input = win.document.querySelector('input[type=file][accept=".json"]');
  const file = new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
  await settle();

  const card = title => [...win.document.querySelectorAll('article')].find(a => a.textContent.includes(title));
  const button = (el, re) => el && [...el.querySelectorAll('button')].find(b => re.test(b.textContent));
  const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(); };
  const shopLink = el => el && [...el.querySelectorAll('a')].find(a => /Museum shop/.test(a.textContent));

  for (const t of [miller.title, webRow.title, noCatRow.title]) {
    const c = card(t);
    if (!c) { fail('the card for "' + t + '" is not on screen after Load — nothing below can run'); continue; }
    await click(button(c, /Catalogue/));
  }

  // ── V-001: a Levy Gorvy card carries the gallery's full name, her ruling
  // 25 Sep; its chip keeps the short one.
  {
    const c = card(lgdRow.title);
    ok(c && c.textContent.startsWith('Lévy Gorvy Dayan'), 'V-001: a Levy Gorvy card is headed "Lévy Gorvy Dayan"', c && c.textContent.slice(0, 40));
    ok([...win.document.querySelectorAll('button')].some(b => b.textContent === 'Levy Gorvy'), 'V-001a:   while its chip still reads "Levy Gorvy"');
  }

  // ── V-002: no "No catalogue" corner tag — the corner keeps the time tag.
  {
    const c = card(noCatRow.title);
    const head = c ? c.textContent.slice(0, 40) : '';
    ok(c && !/No catalogue/.test(head) && /Recently opened|On now/.test(head), 'V-002: a no-catalogue card keeps its time tag in the corner', head);
  }

  // ── R-001..R-004: CASE 1, the page is gone (a real 404's shape) ─────────
  {
    calls.length = 0;
    script.mcp = (tool, args) => ({ payload: { results: [], errors: [
      { url: args.urls[0], error_type: 'http_error', http_status_code: 404, content: null }] } });
    script.sample = () => { throw new Error('Claude must not be asked about a 404'); };
    let c = card(miller.title);
    const btn = button(c, /^Re-check museum shop$/);
    ok(!!btn, 'R-001: the tray of a catalogue she has searched shows "Re-check museum shop"');
    ok(!!button(c, /^Search again$/), 'R-001a:   beside "Search again"');
    if (btn) await click(btn);
    c = card(miller.title);
    const t = c ? c.textContent : '';
    ok(/No longer in the museum shop\./.test(t), 'R-002: a 404 turns the card red: "No longer in the museum shop."', t.slice(0, 200));
    const a = shopLink(c);
    ok(a && a.textContent.includes('Museum shop (last seen)'), 'R-003: the link stays, now "Museum shop (last seen)"', a && a.textContent);
    ok(a && a.getAttribute('href') === miller.shopUrl, 'R-003a:   and still goes to the same page');
    ok(calls.filter(x => x.kind === 'mcp').length === 1 && calls[0].tool === 'web_fetch'
       && calls[0].args.urls.length === 1 && calls[0].args.urls[0] === miller.shopUrl,
       'R-004: it read that ONE page and nothing else — no search, no Claude');
  }

  // ── R-005..R-007: CASE 3, it comes back ──────────────────────────────────
  {
    calls.length = 0;
    script.mcp = (tool, args) => ({ payload: { results: [{ url: args.urls[0], title: 'Lee Miller',
      excerpts: ['Lee Miller. Hardcover. $65.00. Add to cart. ' + 'Details. '.repeat(80)] }], errors: [] } });
    script.sample = () => ({ forSale: true, why: 'Add to cart is shown.' });
    await click(button(card(miller.title), /^Re-check museum shop$/));
    const c = card(miller.title);
    const t = c ? c.textContent : '';
    ok(/Back in the museum shop\./.test(t), 'R-005: buyable again reads "Back in the museum shop."', t.slice(0, 200));
    const a = shopLink(c);
    ok(a && /^Museum shop\s*↗?$/.test(a.textContent.trim()), 'R-006: and the link is plain "Museum shop" again', a && a.textContent);
    ok(!/No longer/.test(t), 'R-007: the red line is gone');
  }

  // ── R-008..R-010: a check that FAILED says so and changes nothing ────────
  {
    script.mcp = () => { throw refused('rate_limited'); };
    script.sample = () => ({ forSale: false, why: 'should never be asked' });
    await click(button(card(miller.title), /^Re-check museum shop$/));
    const t = card(miller.title).textContent;
    ok(/Re-check didn’t run/.test(t), 'R-008: a refused connector says the re-check didn’t run', t.slice(0, 300));
    ok(/Nothing changed\./.test(t), 'R-009:   and that nothing changed');
    ok(/Back in the museum shop\./.test(t) && !/No longer/.test(t), 'R-010: the status is exactly as before, not red');
  }

  // ── R-011..R-012: sold out on a page that still exists ──────────────────
  {
    script.mcp = (tool, args) => ({ payload: { results: [{ url: args.urls[0], title: 'Lee Miller',
      excerpts: ['Lee Miller. Hardcover. Sold out. ' + 'Details. '.repeat(80)] }], errors: [] } });
    script.sample = () => ({ forSale: false, why: 'The page says Sold out.' });
    await click(button(card(miller.title), /^Re-check museum shop$/));
    const t = card(miller.title).textContent;
    ok(/No longer in the museum shop\./.test(t), 'R-011: sold out reads "No longer in the museum shop."', t.slice(0, 200));
    ok(shopLink(card(miller.title)).textContent.includes('(last seen)'), 'R-012: with the link kept as "(last seen)"');
  }

  // ── R-013..R-017: CASE 2, it wasn't in the shop and now is ─────────────
  {
    calls.length = 0;
    const found = 'https://shop.nationalgallery.org.uk/test-show-the-catalogue.html';
    script.mcp = (tool, args) => ({ payload: { results: args.urls.map(u => ({ url: u, title: 'Shop',
      excerpts: ['Test Show: The Catalogue — ' + found + ' £40 ISBN 9781857096972'] })), errors: [] } });
    script.sample = () => ({ found: true, catalogueTitle: 'A Different Title From The Shop',
      isbn13: '9781857096972', publisher: 'Someone Else', publisherUrl: 'https://elsewhere.test/x', shopUrl: found });
    await click(button(card(webRow.title), /^Re-check museum shop$/));
    const c = card(webRow.title);
    const t = c ? c.textContent : '';
    ok(/Now in the museum shop\./.test(t), 'R-013: found in the shop reads "Now in the museum shop."', t.slice(0, 200));
    const a = shopLink(c);
    ok(a && a.getAttribute('href') === found, 'R-014: the Museum shop link is the book’s page just found', a && a.getAttribute('href'));
    ok(t.includes('Test Show: The Catalogue') && !t.includes('A Different Title'), 'R-015: the known title is kept, not replaced');
    ok(/978-1857096972/.test(t), 'R-016: the blank ISBN is filled', t.slice(0, 300));
    const pubLink = [...c.querySelectorAll('a')].find(x => x.getAttribute('href') === webRow.publisherUrl);
    ok(!!pubLink && t.includes('Hannibal Books') && !t.includes('Someone Else'), 'R-016a: the publisher and its link are untouched');
    ok(calls.every(x => x.kind === 'sample' || x.tool === 'web_fetch'), 'R-017: only the shop was opened — no web search, no publisher hunt',
       calls.map(x => x.tool || x.kind).join(','));
  }

  // ── R-018..R-019: CASE 2 finding nothing leaves the card as it was ─────
  {
    script.mcp = (tool, args) => ({ payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', excerpts: ['Other books.'] })), errors: [] } });
    script.sample = () => ({ found: false, catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, shopUrl: null });
    const btn = button(card(noCatRow.title), /^Re-check museum shop$/);
    ok(!!btn, 'R-018: a "no catalogue" tray has the button too');
    if (btn) await click(btn);
    const t = card(noCatRow.title).textContent;
    ok(/this book isn’t there/.test(t) && /No catalogue found/.test(t), 'R-019: nothing found says so, and the card is unchanged', t.slice(0, 200));
  }

  // ── R-020..R-021: Search again never takes away what was there ─────────
  {
    script.mcp = (tool) => ({ payload: { results: [], errors: [] } });
    script.sample = () => ({ found: false });
    const before = card(webRow.title).textContent;
    await click(button(card(webRow.title), /^Search again$/));
    const t = card(webRow.title).textContent;
    ok(/978-1857096972/.test(t) && t.includes('Hannibal Books'), 'R-020: a Search again that finds nothing keeps the ISBN and publisher', t.slice(0, 300));
    ok(/Now in the museum shop\./.test(t) && /Now in the museum shop\./.test(before), 'R-021: and does not move the shop status');
  }

  // ── R-022..R-023: Search again that FINDS the book elsewhere still cannot
  // move the shop status or replace what was known. R-020 cannot catch this:
  // a lookup finding nothing hands the old row back before the status matters.
  {
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: 'https://bookseller.test/x', title: 'Test Show', excerpts: ['Test Show catalogue ISBN 9780300000009'] }] } }
      : { payload: { results: [], errors: [] } };
    script.sample = () => ({ found: true, catalogueTitle: 'Test Show (bookseller)', isbn13: '9780300000009',
      publisher: 'Yale', publisherUrl: null, shopUrl: 'https://bookseller.test/x' });
    await click(button(card(webRow.title), /^Search again$/));
    const t = card(webRow.title).textContent;
    ok(/Now in the museum shop\./.test(t) && !/Not in the museum shop/.test(t),
       'R-022: a Search again finding the book at a bookseller leaves "Now in the museum shop." alone', t.slice(0, 300));
    ok(/978-1857096972/.test(t) && !/978-0300000009/.test(t) && t.includes('Test Show: The Catalogue'),
       'R-023: and keeps the ISBN and title it already had');
  }


  // ════ A BLOCKED SHOP, AND A SHOP LINK FROM THE WEB SEARCH — her rulings, 25 Sep ════
  //
  // The connector's answer for KHM, read off her diagnostic: "0 page(s), 1
  // refused (307)" for the shop search, and the same for the ticket address.
  const BLOCKED_FOUND = 'The museum shop is blocked - search it manually. The catalogue is stocked elsewhere.';
  const BLOCKED_NONE = 'The museum shop is blocked. The catalogue also does not appear to exist elsewhere. Search manually to confirm.';
  const r307 = u => ({ url: u, error_type: 'http_error', http_status_code: 307, content: null });
  const isKhm = u => /shop\.khm\.at/.test(u);
  const openTray = async t => { const c = card(t); if (c && !button(c, /Find catalogue|Search again|Re-check/)) await click(button(c, /Catalogue/)); };
  const kind = p => /"forSale"/.test(p) ? 'forsale' : /venue’s OWN shop pages/.test(p) ? 'shop' : /^\{"isbn13"|"isbn13": string\|null, "publisher": string\|null, "publisherUrl": string\|null\}/m.test(p) && !/"found"/.test(p) ? 'page' : 'web';
  const PRODUCT = 'https://shop.khm.at/en/products/ausstellungskatalog-2026-canaletto-bellotto-sprache-englisch-100000000039076-3631-02';

  // ── L-001..L-004: her case. Shop refused; the web search offers the TICKET.
  {
    calls.length = 0;
    await openTray(khmA.title);
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: TICKET, title: 'Canaletto & Bellotto', excerpts: ['Canaletto & Bellotto. Exhibition Catalogue 2026'] }] } }
      : { payload: { results: [], errors: args.urls.map(r307) } };
    script.sample = p => kind(p) === 'web'
      ? { found: true, catalogueTitle: 'Alpha. Exhibition Catalogue 2026', isbn13: null, publisher: null, publisherUrl: null, shopUrl: TICKET }
      : { found: false };
    await click(button(card(khmA.title), /Find catalogue/));
    const c = card(khmA.title), t = c ? c.textContent : '';
    ok(t.includes(BLOCKED_FOUND), 'L-001: shop refused, book found elsewhere — her sentence', t.slice(0, 300));
    ok(!/In the museum shop/.test(t), 'L-002: never "In the museum shop"');
    const a = shopLink(c);
    ok(a && a.getAttribute('href') === 'https://shop.khm.at/en/products?shop%5Bq%5D=Test%20KHM%20Show%20Alpha',
       'L-003: the Museum shop link is the shop’s own search, for the EXHIBITION’s name — not the book’s title', a && a.getAttribute('href'));
    ok(!calls.some(x => x.tool === 'web_fetch' && x.args.urls.includes(TICKET)), 'L-004: a ticket is never taken as the book, so it is never even opened');
  }

  // ── L-004a: the blocked headline is its own red, bold span; the rest grey.
  {
    const c = card(khmA.title);
    const head = c && [...c.querySelectorAll('span')].find(x => x.textContent === 'The museum shop is blocked');
    ok(head && head.style.fontWeight === '700' && head.style.color !== '' && head.parentElement.style.fontWeight === '',
       'L-004a: "The museum shop is blocked" is bold and coloured on its own; the rest of the line is plain');
  }

  // ── L-005..L-007: shop refused; the web search offers a real product page,
  // which then refuses too (307) — it is not "In the museum shop".
  {
    calls.length = 0;
    await openTray(khmB.title);
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: PRODUCT, title: 'Ausstellungskatalog 2026', excerpts: ['Catalogue'] }] } }
      : { payload: { results: [], errors: args.urls.map(r307) } };
    script.sample = p => kind(p) === 'web'
      ? { found: true, catalogueTitle: 'Test KHM Show Beta: The Catalogue', isbn13: '9781857096972', publisher: null, publisherUrl: null, shopUrl: PRODUCT }
      : { found: false };
    await click(button(card(khmB.title), /Find catalogue/));
    const t = card(khmB.title).textContent;
    ok(t.includes(BLOCKED_FOUND) && !/In the museum shop/.test(t), 'L-005: a shop link that will not open is not "In the museum shop"', t.slice(0, 300));
    ok(calls.filter(x => x.tool === 'web_fetch' && x.args.urls.includes(PRODUCT)).length === 1, 'L-006: it was opened once — never again by the ISBN step after failing');
    ok(!calls.some(x => x.kind === 'sample' && /"forSale"/.test(x.prompt)), 'L-007: and Claude is not asked about a page that never came back');
  }

  // ── L-008..L-009: shop refused and nothing anywhere ──────────────────────
  {
    await openTray(khmC.title);
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: 'https://news.test/x', title: 'Show review', excerpts: ['A review.'] }] } }
      : { payload: { results: [], errors: args.urls.map(r307) } };
    script.sample = () => ({ found: false, catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, shopUrl: null });
    await click(button(card(khmC.title), /Find catalogue/));
    const c = card(khmC.title), t = c ? c.textContent : '';
    ok(t.includes(BLOCKED_NONE) && !/No catalogue found for this exhibition/.test(t), 'L-008: shop refused, nothing elsewhere — her sentence, not "No catalogue found"', t.slice(0, 300));
    const a = shopLink(c);
    ok(a && /shop\.khm\.at\/en\/products\?shop%5Bq%5D=Test%20KHM%20Show%20Gamma/.test(a.getAttribute('href')), 'L-009: with a Museum shop link to search manually', a && a.getAttribute('href'));
  }

  // ── L-010..L-012: the shop answers; the web search offers a shop page that
  // OPENS and is the book — filed in the museum shop, the page read once.
  {
    calls.length = 0;
    await openTray(ngA.title);
    const link = 'https://shop.nationalgallery.org.uk/test-ng-show-opens.html';
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: link, title: 'Test', excerpts: ['Test NG Show Opens catalogue'] }] } }
      : args.urls.includes(link)
        ? { payload: { results: [{ url: link, title: 'Test NG Show Opens', excerpts: ['Hardback £40. Add to basket. Publisher: Yale. ' + 'Details. '.repeat(80)] }], errors: [] } }
        : { payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', excerpts: ['Other books.'] })), errors: [] } };
    script.sample = p => ({ forsale: { forSale: true, why: 'Add to basket.' },
      shop: { found: false }, page: { isbn13: null, publisher: 'Yale', publisherUrl: null },
      web: { found: true, catalogueTitle: 'Test NG Show Opens: Catalogue', isbn13: '9780300000009', publisher: null, publisherUrl: null, shopUrl: link } })[kind(p)];
    await click(button(card(ngA.title), /Find catalogue/));
    const c = card(ngA.title), t = c ? c.textContent : '';
    ok(/In the museum shop\./.test(t), 'L-010: a web-found shop link that opens and is for sale — "In the museum shop."', t.slice(0, 300));
    ok(shopLink(c) && shopLink(c).getAttribute('href') === link, 'L-011: the Museum shop link is that page');
    ok(calls.filter(x => x.tool === 'web_fetch' && x.args.urls.includes(link)).length === 1, 'L-012: the page was opened once, and the ISBN step reused it');
  }

  // ── L-013: the same, but the shop page is gone (404) — found on the web ──
  {
    await openTray(ngB.title);
    const link = 'https://shop.nationalgallery.org.uk/test-ng-show-dead.html';
    script.mcp = (tool, args) => tool === 'web_search'
      ? { payload: { results: [{ url: link, title: 'Test', excerpts: ['Test NG Show Dead Link catalogue'] }] } }
      : args.urls.includes(link)
        ? { payload: { results: [], errors: [{ url: link, error_type: 'http_error', http_status_code: 404, content: null }] } }
        : { payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', excerpts: ['Other books.'] })), errors: [] } };
    script.sample = p => kind(p) === 'web'
      ? { found: true, catalogueTitle: 'Dead Link Catalogue', isbn13: '9780300000009', publisher: 'Yale', publisherUrl: null, shopUrl: link }
      : { found: false };
    await click(button(card(ngB.title), /Find catalogue/));
    const t = card(ngB.title).textContent;
    ok(/Not in the museum shop/.test(t) && !/In the museum shop\./.test(t), 'L-013: a web-found shop link that is gone is filed as found on the web', t.slice(0, 300));
  }

  // ── P-001..P-002: her Timeless Tintoretto, 25 Sep. The shop finds the book
  // with its ISBN and publisher; the publisher search then fails
  // ("upstream_error — Connector call failed"). The card must not say
  // "No separate publisher page." as though that search had finished.
  {
    await openTray(ngPub.title);
    const link = 'https://shop.nationalgallery.org.uk/test-ng-publisher-dies.html';
    script.mcp = (tool, args) => {
      if (tool === 'web_search') { const e = new Error('Connector call failed'); e.code = 'upstream_error'; throw e; }
      return { payload: { results: args.urls.map(u => ({ url: u, title: 'Shop', excerpts: ['Test NG Publisher Dies — ' + link + ' £40'] })), errors: [] } };
    };
    script.sample = () => ({ found: true, catalogueTitle: 'Publisher Dies: The Catalogue', isbn13: '9782754117418',
      publisher: 'Editions Hazan', publisherUrl: null, shopUrl: link });
    await click(button(card(ngPub.title), /Find catalogue/));
    const t = card(ngPub.title).textContent;
    ok(/In the museum shop\./.test(t) && !/No separate publisher page/.test(t),
       'P-001: a publisher search that failed part-way claims nothing on the card', t.slice(0, 300));
    ok(/stopped part-way/.test(win.document.body.textContent), 'P-002: the banner says the search stopped part-way');
  }

  // ── L-014..L-016: her real row. Re-check with the shop still blocked. ─────
  {
    calls.length = 0;
    await openTray(khmBad.title);
    script.mcp = (tool, args) => ({ payload: { results: [], errors: args.urls.map(r307) } });
    script.sample = () => { throw new Error('Claude must not be asked'); };
    await click(button(card(khmBad.title), /^Re-check museum shop$/));
    const c = card(khmBad.title), t = c ? c.textContent : '';
    ok(!/ticket/.test(t) && t.includes(BLOCKED_FOUND) && /couldn’t be re-checked/.test(t), 'L-014: the ticket link is removed without a word about it, and the card says the shop is blocked', t.slice(0, 400));
    ok(shopLink(c) && shopLink(c).getAttribute('href') === 'https://shop.khm.at/en/products?shop%5Bq%5D=Canaletto%20%26%20Bellotto',
       'L-015: her card’s Museum shop link is KHM’s own search for "Canaletto & Bellotto" — not the ticket, not the book title', shopLink(c) && shopLink(c).getAttribute('href'));
    ok(!calls.some(x => x.tool === 'web_fetch' && x.args.urls.includes(TICKET)), 'L-016: the ticket page is not re-read');
  }

  // ── L-017..L-018: Re-check on a blocked row once the shop answers ────────
  {
    script.mcp = (tool, args) => ({ payload: { results: args.urls.map(u => ({ url: u, title: 'Shop',
      excerpts: ['Canaletto & Bellotto. Exhibition Catalogue 2026 — ' + PRODUCT + ' €39.90'] })), errors: [] } });
    script.sample = p => /"forSale"/.test(p) ? { forSale: true, why: 'x' } : /"found"/.test(p)
      ? { found: true, catalogueTitle: 'Canaletto & Bellotto. Exhibition Catalogue 2026', isbn13: null, publisher: null, publisherUrl: null, shopUrl: PRODUCT }
      : { isbn13: null, publisher: null, publisherUrl: null };
    await click(button(card(khmBad.title), /^Re-check museum shop$/));
    const c = card(khmBad.title), t = c ? c.textContent : '';
    ok(/Now in the museum shop\./.test(t) && !t.includes(BLOCKED_FOUND), 'L-017: the shop answering moves "blocked" to "Now in the museum shop."', t.slice(0, 300));
    ok(shopLink(c) && shopLink(c).getAttribute('href') === PRODUCT, 'L-018: with the book’s real page as the link');
  }

  // ── L-019: a blocked check on an ordinary row changes nothing ────────────
  {
    script.mcp = (tool, args) => ({ payload: { results: [], errors: args.urls.map(r307) } });
    const before = card(webRow.title).textContent;
    // webRow is "Now in the museum shop" with a link on file by now, so this
    // reads that page; use noCatRow, which has none.
    await click(button(card(noCatRow.title), /^Re-check museum shop$/));
    const t = card(noCatRow.title).textContent;
    ok(/museum shop is blocked\. Nothing changed\./.test(t) && /No catalogue found for this exhibition/.test(t),
       'L-019: a re-check refused by the shop says so and changes nothing', t.slice(0, 300));
    ok(card(webRow.title).textContent === before, 'L-019a: other cards untouched');
  }


  // ── S-001..S-003: the search narrows WITH the filters — her finding, 25 Sep.
  // It used to return early, so text in the box switched every filter off.
  {
    const doc = win.document;
    const titles = () => [...doc.querySelectorAll('article')].map(a => a.textContent);
    // The Search button focuses the box, and that React (see below) watches
    // through IE's attachEvent, which jsdom lacks. A no-op stands in for it.
    win.HTMLElement.prototype.attachEvent = function () {};
    win.HTMLElement.prototype.detachEvent = function () {};
    await click([...doc.querySelectorAll('button')].find(b => b.title === 'Search'));
    const box = doc.querySelector('input[placeholder^="Search exhibitions"]');
    // React was loaded before this jsdom existed, so it cannot hear a synthetic
    // input event here. Its own onChange is called instead — the same handler
    // a keystroke reaches in a browser.
    const props = box[Object.keys(box).find(k => k.startsWith('__reactProps'))];
    await act(async () => { props.onChange({ target: { value: 'Test' } }); });
    await settle();
    const all = titles();
    ok(all.some(x => x.includes(webRow.title)) && all.some(x => x.includes(khmA.title)), 'S-001: the search finds its matches across venues', all.length);
    const chip = [...doc.querySelectorAll('button')].find(b => b.textContent === 'KHM');
    await click(chip);
    const khmOnly = titles();
    ok(khmOnly.length === 3 && khmOnly.every(x => /Test KHM Show/.test(x)), 'S-002: with the search on, the KHM chip cuts it to KHM’s three', khmOnly.length + ': ' + khmOnly.map(x => x.slice(0, 40)).join(' | '));
    await click(chip);
    await click([...doc.querySelectorAll('button')].find(b => b.textContent === 'NG' || b.textContent === 'National Gallery'));
    const ng = titles();
    ok(ng.length > 0 && ng.every(x => /Test/.test(x)) && !ng.some(x => /KHM/.test(x)), 'S-003: and another venue’s chip cuts it to that venue', ng.length);
  }
  try { await act(async () => root.unmount()); } catch {}
  console.error = realError;
  const loud = shouted.filter(m => !/not wrapped in act|ReactDOMTestUtils/.test(m));
  if (loud.length) fail('React complained — ' + loud[0].slice(0, 160));
  console.log(failures ? failures + ' failed' : 'Re-check museum shop works when pressed');
  process.exit(failures ? 1 : 0);
})();
