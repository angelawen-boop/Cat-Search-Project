/*
 * catalogue_versions.js — her catalogue versions, as blocks (docs/catalogue_versions.md).
 *
 * VR-: her three live lookups on 43 (Vasari, Hubert Robert, Hammershøi) replayed whole —
 * the results and Claude's answers she got (docs/lookup_results/*_43.json) fed back in.
 * The one step her records lack, the Nationalmuseum's shop finder, is answered by its
 * live replies, saved by script (louvre_vasari_43_live.json). Each card is then drawn
 * and its blocks read off the page, word for word, beside the versions stored.
 * VN-: her finding rules, one case each, on the real pages where she has them. SH-: each
 * block's own museum shop and the Museum shop button. RV-: Re-check on a card with
 * several versions.
 *
 *   node scraper/fixtures/catalogue_versions.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const React = require('react');
const { act } = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM, VirtualConsole } = require('jsdom');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const RESULTS = path.join(__dirname, '..', '..', 'docs', 'lookup_results');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-versions-'));
// Prepared exactly as catalogue_route.js prepares it.
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

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function eq(got, want, m) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass(m);
  else fail(m + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
}
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

// The page's own functions, with a runtime whose connector and Claude a script plays.
const NAMES = 'lookupCatalogue, versionBlocks, foldCoEditions, versionFacts, pagesByAddress, bindingOn, publisherShown, buyLinks, bookOnShop, museumOf, otherShopFacts, recheckVersions, pickRow, MU';
function lift(script, calls) {
  const win = { document: {}, localStorage: {}, claude: { use: async name => {
    if (name === 'mcp') return { callTool: async (server, tool, args) => {
      calls.push({ tool, args });
      return script.mcp(tool, args);
    } };
    if (name === 'sample') return { json: async prompt => { calls.push({ tool: 'sample', prompt }); return script.sample(prompt); } };
    return null;
  } } };
  return new Function('React', 'window', 'document', 'localStorage', code + '\n;return { ' + NAMES + ' };')(React, win, win.document, win.localStorage);
}
const api = lift({ mcp: () => ({ payload: { results: [] } }), sample: () => ({}) }, []);

// HER RECORD, PLAYED BACK. Searches answer by their objective, pages by their addresses,
// Claude's reads in the order she got them; a call her record lacks is answered from the
// live replies saved for it, else counted as unrecorded (and answered empty).
const load = f => JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8'));
function replayScript(rec, live) {
  const used = new Set(), usedLive = new Set(), misses = [];
  const take = (list, set, pred) => { const i = list.findIndex((c, k) => !set.has(k) && pred(c)); if (i < 0) return null; set.add(i); return list[i]; };
  return {
    misses,
    mcp: (tool, args) => {
      let c = tool === 'web_search'
        ? take(rec.calls, used, c => c.kind === 'search' && String(c.objective).slice(0, 40) === String(args.objective).slice(0, 40))
        : take(rec.calls, used, c => c.kind === 'open' && JSON.stringify(c.urls) === JSON.stringify(args.urls));
      if (!c && live) c = take(live.calls, usedLive, c => tool === 'web_search'
        ? c.kind === 'search' && c.objective === args.objective && JSON.stringify(c.queries) === JSON.stringify(args.search_queries)
        : c.kind === 'open' && JSON.stringify(c.urls) === JSON.stringify(args.urls) && !!c.full === !!args.full_content);
      if (!c) { misses.push(tool + ' ' + JSON.stringify(args.urls || args.search_queries)); return { payload: { results: [], errors: [] } }; }
      return { payload: { results: c.results || [], errors: c.errors || [] } };
    },
    sample: prompt => { const c = take(rec.calls, used, c => c.kind === 'claude'); if (!c) { misses.push('claude read'); return {}; } return c.data; },
    unusedRecorded: () => rec.calls.filter((c, i) => !used.has(i)).length,
    unusedLive: () => live ? live.calls.filter((c, i) => !usedLive.has(i)).length : 0,
  };
}
async function replay(file, liveFile) {
  const rec = load(file), live = liveFile ? load(liveFile) : null;
  const script = replayScript(rec, live), calls = [];
  const run = lift(script, calls);
  const c = rec.card;
  const row = { id: c.id, museumId: c.museumId, title: c.title, startDate: c.startDate, endDate: c.endDate, exUrl: c.exUrl,
    summary: 'x', interested: true, watching: false, acquiring: 'yes', buyNext: false, looked: false, hasCatalogue: 'unknown' };
  const out = await run.lookupCatalogue(row, {});
  return { out, row: out.row, script, calls };
}

// THE PAGE, DRAWN: the ledger loaded through Load, each card opened, its blocks read.
const GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
  'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader'];
async function drawn(rows, fn) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/', virtualConsole: new VirtualConsole() });
  const win = dom.window;
  const saved = {};
  for (const k of GLOBALS) { saved[k] = global[k]; try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const realError = console.error; console.error = () => {};
  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(React, win, win.document, win.localStorage);
  const root = createRoot(win.document.getElementById('root'));
  const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
  try {
    await act(async () => { root.render(React.createElement(App)); });
    await settle();
    const input = win.document.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([JSON.stringify({ rows, ignored: [] })], 'ledger.json', { type: 'application/json' })], configurable: true });
    Object.defineProperty(input, 'value', { get: () => 'C:\\fakepath\\ledger.json', set() {}, configurable: true });
    await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
    for (let i = 0; i < 5; i++) await settle();
    const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(); };
    const card = title => [...win.document.querySelectorAll('article')].find(a => (a.querySelector('h3')?.textContent || '').includes(title));
    const open = async title => { const b = [...card(title).querySelectorAll('button')].find(x => /Catalogue$/.test(x.textContent.trim())); if (b) await click(b); return card(title); };
    await fn({ open, card, click });
  } finally {
    try { await act(async () => root.unmount()); } catch {}
    console.error = realError;
    for (const k of GLOBALS) { try { if (saved[k] === undefined) delete global[k]; else global[k] = saved[k]; } catch {} }
    delete global.IS_REACT_ACT_ENVIRONMENT;
    win.close();
  }
}
// Each block as its lines: the marker, then every line in order.
const blocksOn = card => [...card.querySelectorAll('[role=radio]')].map(b => [b.children[0].textContent, ...[...b.children[1].children].map(x => x.textContent.trim())]);
const buttonsOn = card => [...card.querySelectorAll('a')].filter(a => /\u2197$/.test(a.textContent.trim()) && !a.closest('h3'))
  .map(a => [a.textContent.replace(/\s*\u2197$/, '').trim(), a.href]);
const NOT_IN = 'Not in the museum shop \u2014 shop link opens the general store.';
const brief = vs => vs.map(v => [v.lang, v.isbn13, v.alsoIsbn13, v.showing]);

(async () => {
  // ── VR-001..VR-049: her three 43 lookups, replayed whole and drawn ───────────
  const vas = await replay('louvre_vasari_43.json', 'louvre_vasari_43_live.json');
  const hub = await replay('louvre_hubert_43.json');
  const ham = await replay('jacquemart_hammershoi_43.json');
  for (const [name, r] of [['Vasari', vas], ['Hubert Robert', hub], ['Hammershøi', ham]])
    eq([r.script.misses, r.script.unusedRecorded(), r.script.unusedLive()], [[], 0, 0],
      'VR-000: ' + name + ' — every call her record holds is replayed, and nothing else is asked (the Nationalmuseum’s finder from its saved live replies)');

  await drawn([vas.row, hub.row, ham.row], async ({ open, card, click }) => {
    // Vasari, Louvre 2022.
    let c = await open(vas.row.title);
    eq(blocksOn(c), [
      ['\u25cb', NOT_IN, 'Giorgio Vasari. Le Livre des dessins', 'Musée du Louvre Editions / Lienart', 'French \u00b7 Paperback \u00b7 240 pp', 'ISBN 978-2359063721', 'The original edition. Source: louvre.fr'],
      ['\u25cf', NOT_IN, 'Giorgio Vasari. The Book of Drawings', 'Musée du Louvre Editions / Lienart', 'English \u00b7 Paperback \u00b7 240 pp', 'ISBN 978-2359063738', 'This venue\'s English edition. Source: lienarteditions.com'],
      ['\u25cb', 'In the museum shop.', 'Giorgio Vasari The Book of Drawings. The fate of a mythical collection', 'Nationalmuseum', 'English \u00b7 Hardcover \u00b7 240 pp', 'ISBN 978-9171009166', 'From the show\'s Stockholm exhibition. Source: nationalmuseum.bokorder.se']],
      'VR-001: Vasari — three blocks: the French original, Lienart’s English paperback picked (lienarteditions.com), and the Nationalmuseum’s hardcover in its own block, in its own museum’s shop');
    ok(!/own number/.test(c.textContent), 'VR-002:   no "Louvre’s own number" anywhere on the card — the WorldCat list joined nothing');
    eq(buttonsOn(c).map(b => b[0]), ['Museum shop', 'Publisher', 'Amazon AU', 'AbeBooks AU', 'Alibris', 'Booko AU'], 'VR-003:   below the blocks, once: Museum shop, Publisher and the four bookstores');
    ok(buttonsOn(c).some(b => b[0] === 'Publisher' && b[1] === 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings')
      && buttonsOn(c).some(b => b[0] === 'Museum shop' && /boutique\.louvre\.fr\/en\/search/.test(b[1])),
      'VR-004:   the Publisher button is Lienart’s page for the picked book; the Museum shop button the Louvre’s search, as today', JSON.stringify(buttonsOn(c)));
    await click(c.querySelectorAll('[role=radio]')[2]);
    c = card(vas.row.title);
    eq(buttonsOn(c).map(b => b[0]), ['Museum shop', 'Amazon AU', 'AbeBooks AU', 'Alibris', 'Booko AU'], 'VR-005:   Stockholm’s picked: the same names, no Publisher button (its page on the publisher’s site is not in hand)');
    ok(buttonsOn(c)[0][1] === 'https://nationalmuseum.bokorder.se/en-us/article/4580/giorgio-vasari-the-book-of-drawings'
      && !buttonsOn(c).some(b => /louvre\.fr/.test(b[1])) && buttonsOn(c).some(b => b[1] === 'https://booko.au/9789171009166'),
      'VR-006:   its Museum shop button opens the Nationalmuseum’s page for the book — never the Louvre’s shop — and the bookstores its ISBN', JSON.stringify(buttonsOn(c)));

    // Hubert Robert, Louvre 2016.
    c = await open(hub.row.title);
    eq(blocksOn(c), [
      ['\u25cb', NOT_IN + ' Couldn\u2019t work out the publisher\u2019s own website, so there\u2019s no link to it.', 'Hubert Robert, 1733-1808 : un peintre visionnaire',
        'Louvre \u00c9ditions / Somogy \u00c9ditions d\'Art', 'French \u00b7 Hardcover \u00b7 544 pp', 'ISBN 978-2757210642; 978-2350315355 (Louvre\'s own number for the same book)', 'This show\'s catalogue. Source: louvre.fr'],
      ['\u25cb', NOT_IN, 'Hubert Robert', 'Lund Humphries', 'English \u00b7 288 pp', 'ISBN 978-1848221918', 'A different book, from the show\'s Washington exhibition. Source: enfilade18thc.com']],
      'VR-020: Hubert Robert — the French catalogue with the Louvre’s own number beside Somogy’s, its publishers split at " : ", the Louvre’s first, capitalised; Lund Humphries’ different book with no binding found');
    eq([hub.row.editionPick, buttonsOn(c).map(b => b[0])], [null, ['Museum shop']], 'VR-022:   nothing picked: only the Museum shop button');
    ok(/One book, two numbers: ISBN 9782757210642 \(Somogy[^)]*\), also 9782350315355 \(mur[^)]*Louvre\) — https:\/\/archive\.org\//.test(hub.out.detail),
      'VR-021:   the two numbers joined on the book’s own copyright page (archive.org), not the Paris Musées record’s bare list', hub.out.detail.split('\n').filter(l => /two numbers/.test(l)).join(' | '));

    // Hammershøi, Jacquemart-André 2019.
    c = await open(ham.row.title);
    eq(blocksOn(c), [
      ['\u25cb', NOT_IN, 'Hammershoi. Le maître de la peinture danoise', 'Fonds Mercator', 'French \u00b7 Hardcover', 'ISBN 978-9462302495', 'The original edition. Source: amazon.com'],
      ['\u25cf', NOT_IN + ' No publisher was named for this book, so none was looked for.', 'Hammershøi : painter of northern light', 'English \u00b7 Hardcover', 'ISBN 978-0847899289', 'The English edition. Source: searchworks.stanford.edu']],
      'VR-040: Hammershøi — the French original, and the English edition picked, with no publisher and no year: no page found prints them (her rule 2)');
  });

  // The versions as stored.
  const V = vas.row.editions, H = hub.row.editions, M = ham.row.editions;
  eq(brief(V), [['French', '9782359063721', null, 'this'], ['English', '9782359063738', null, 'this'], ['English', '9789171009166', null, 'this']],
    'VR-007: Vasari — stored: the French, Lienart’s English and Stockholm’s English, each its own version; nothing folded');
  eq([V[2].shop.state, V[2].shop.url, V[2].shop.museum && V[2].shop.museum.name, V[1].shop.museum, V[0].shop.museum],
    ['shop', 'https://nationalmuseum.bokorder.se/en-us/article/4580/giorgio-vasari-the-book-of-drawings', 'Nationalmuseum', null, null],
    'VR-008:   Stockholm’s shop is the Nationalmuseum’s; the Louvre’s two printings have the venue’s');
  eq([V[1].binding, V[1].pages, V[1].proofUrl, V[2].binding, V[2].publisher], ['paperback', 240, 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings', 'hardcover', 'Nationalmuseum'],
    'VR-009:   Lienart’s binding read off its own page (AbeBooks’ filter menu ignored), its source the publisher’s page opened late; Stockholm’s publisher from its own page, not WorldCat’s');
  eq([brief(H), H[0].alsoOf, H[0].binding, H[0].pages, H[1].binding, H[1].pages, H[1].city],
    [[['French', '9782757210642', '9782350315355', 'this'], ['English', '9781848221918', null, 'other']], 'Louvre', 'hardcover', 544, null, 288, 'Washington'],
    'VR-023: Hubert Robert — stored: one French block with both numbers, Somogy’s first; the English book’s page count with no binding');
  eq([brief(M), M[1].publisher, M[1].year, ham.row.editionPick], [[['French', '9789462302495', null, 'this'], ['English', '9780847899289', null, 'this']], null, null, 1],
    'VR-041: Hammershøi — stored: no publisher and no year on the English edition');

  // ── VN-001..VN-009: her finding rules, one case each ────────────────────────
  {
    const all = f => load(f).calls.flatMap(c => c.results || []);
    const worldcat = all('louvre_vasari_43.json').find(x => /worldcat/.test(x.url));
    const vs = [{ title: 'Giorgio Vasari. The Book of Drawings', lang: 'English', publisher: 'Musée du Louvre Editions / Lienart', isbn13: '9782359063738', alsoIsbn13: null, showing: 'this' },
      { title: 'Giorgio Vasari The Book of Drawings. The fate of a mythical collection', lang: 'English', publisher: 'Nationalmuseum', isbn13: '9789171009166', alsoIsbn13: null, showing: 'this' }];
    api.foldCoEditions(vs, [worldcat], 'louvre', []);
    eq(brief(vs), [['English', '9782359063738', null, 'this'], ['English', '9789171009166', null, 'this']],
      'VN-001: Vasari — WorldCat’s record listing Lienart’s and Stockholm’s numbers ("LienArt ; Nationalmuseum … ISBN: 9782359063738, 9789171009166") joins nothing: two blocks');
    const colophon = all('louvre_hubert_43.json').find(x => /archive\.org\/download/.test(x.url) && /ISBN mur/.test(JSON.stringify(x)));
    const fr = [{ title: 'Hubert Robert, 1733-1808 : un peintre visionnaire', lang: 'French', publisher: 'Somogy éditions d\'art', isbn13: '9782757210642', alsoIsbn13: null, showing: 'this' }];
    api.foldCoEditions(fr, [colophon], 'louvre', []);
    eq([fr[0].isbn13, fr[0].alsoIsbn13, fr[0].alsoOf], ['9782757210642', '9782350315355', 'Louvre'],
      'VN-002: Hubert Robert — the book’s copyright page ("ISBN murée du Louvre : 978-2-35031-535-5 ISBN Somogy éditions dare: 978-2-7572-1064-2") joins the Louvre’s number to Somogy’s, Somogy’s first');
    const abebooks = all('louvre_vasari_43.json').find(x => /abebooks\.com\/9782359063738/.test(x.url));
    eq([/Softcover \(0\)/.test(abebooks.excerpts.join('\n')), api.bindingOn(abebooks.excerpts.join('\n'))], [true, 'paperback'],
      'VN-003: Vasari — AbeBooks’ filter menu ("Softcover (0) Hardcover (0)") is not a binding; its "Binding: Paperback" is');
    eq([api.publisherShown('Somogy éditions d\'art : Louvre éditions', 'louvre'), api.publisherShown('Musée du Louvre Editions / Lienart', 'louvre'),
        api.publisherShown('Fonds Mercator / Musée Jacquemart-André', 'jacquemart'), api.publisherShown('The Museum of Modern Art, New York', 'moma'), api.publisherShown('LIENART', 'louvre')],
      ['Louvre \u00c9ditions / Somogy \u00c9ditions d\'Art', 'Musée du Louvre Editions / Lienart', 'Musée Jacquemart-André / Fonds Mercator', 'The Museum of Modern Art, New York', 'LIENART'],
      'VN-004: Hubert Robert — " : " splits co-publishers, the venue’s house first, each word capitalised but the small joining ones; never a comma, nothing lowercased or renamed');
    const vb = api.versionBlocks({ museumId: 'louvre', startDate: '2016-03-09', editions: [
      { title: 'A', lang: 'French', binding: 'hardcover', pages: 544, publisher: 'Somogy', isbn13: '9782757210642', showing: 'this' },
      { title: 'B', lang: 'English', binding: null, pages: 288, publisher: 'Lund Humphries', isbn13: '9781848221918', showing: 'other' },
      { title: 'C', lang: 'English', binding: 'paperback', pages: null, publisher: 'Lund Humphries', isbn13: '9781848221918', showing: 'other' }] });
    eq(vb.map(b => b.facts), ['French \u00b7 Hardcover \u00b7 544 pp', 'English \u00b7 288 pp', 'English \u00b7 Paperback'],
      'VN-005: Hubert Robert — page count and binding are separate items: one never changes how the other shows');
    const pages = api.pagesByAddress(all('louvre_vasari_43.json'));
    const en = { isbn13: '9782359063738', publisher: 'Musée du Louvre Editions / Lienart' };
    api.versionFacts(en, pages, 'louvre', new Map([['9782359063738', 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings']]));
    eq(en.proofUrl, 'https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings',
      'VN-006: Vasari — the source is the most authoritative page about the book, from every page in hand: Lienart’s own, never the first search result (amazon.com)');
    const stock = { isbn13: '9789171009166', publisher: null };
    api.versionFacts(stock, pages, 'louvre', null);
    eq([stock.binding, stock.pages, stock.proofUrl], ['hardcover', 240, 'https://nationalmuseum.bokorder.se/en-us/article/4580/giorgio-vasari-the-book-of-drawings'],
      'VN-007: Vasari — Stockholm’s facts come only from its own page; WorldCat’s record of two books is about neither');
  }

  // ── SH-001..SH-006: each block's own museum shop, and the Museum shop button ──
  {
    const BOK = 'https://nationalmuseum.bokorder.se/en-us/article/4580/giorgio-vasari-the-book-of-drawings';
    const museum = { id: null, name: 'Nationalmuseum', home: 'https://nationalmuseum.bokorder.se/en-us/', search: null, catalogues: null };
    const vasRow = (pick, url) => ({ museumId: 'louvre', title: 'Giorgio Vasari: The Book of Drawings', editionPick: pick, isbn13: pick === 1 ? '9789171009166' : '9782359063738',
      catalogueTitle: 'x', shopUrl: pick === 1 ? url : null, shopState: pick === 1 && url ? 'shop' : 'web', editions: [
        { title: 'Giorgio Vasari. The Book of Drawings', isbn13: '9782359063738', shop: { state: 'web', url: null, museum: null } },
        { title: 'Giorgio Vasari The Book of Drawings', isbn13: '9789171009166', shop: { state: url ? 'shop' : 'web', url, museum } }] });
    const shopLink = r => (api.buyLinks(r).find(l => /^Museum shop/.test(l.name)) || {}).href || null;
    eq([shopLink(vasRow(1, BOK)), shopLink(vasRow(1, null)), shopLink({ ...vasRow(1, null), editions: vasRow(1, null).editions.map((v, i) => i ? { ...v, shop: { ...v.shop, museum: { ...museum, search: 'https://shop.test/search?q=' } } } : v) }),
        shopLink({ ...vasRow(1, null), editions: vasRow(1, null).editions.map((v, i) => i ? { ...v, shop: { ...v.shop, museum: { ...museum, home: null } } } : v) })],
      [BOK, 'https://nationalmuseum.bokorder.se/en-us/', 'https://shop.test/search?q=Giorgio%20Vasari%20The%20Book%20of%20Drawings', null],
      'SH-001: Vasari, Stockholm’s picked — the Museum shop button: its page in the Nationalmuseum’s shop, else that shop’s search for the book, else its home, else none; never the Louvre’s shop');
    ok(/boutique\.louvre\.fr/.test(shopLink(vasRow(0, null))), 'SH-002:   Lienart’s picked — the Louvre’s shop search, as today');
    const shelf = [{ url: 'https://boutique.louvre.fr/en/products/400001-exhibition-catalogues/', title: 'Exhibition catalogues', excerpts: [
      '[Giorgio Vasari. Le Livre des dessins](https://boutique.louvre.fr/en/product/1-vasari-fr.html) €29\n[Giorgio Vasari. The Book of Drawings](https://boutique.louvre.fr/en/product/2-vasari-en.html) €29\n[Another catalogue](https://boutique.louvre.fr/en/product/3-other.html) €35'] }];
    eq([api.bookOnShop(shelf, { title: 'Giorgio Vasari. Le Livre des dessins', isbn13: '9782359063721' }, 'boutique.louvre.fr'),
        api.bookOnShop(shelf, { title: 'Giorgio Vasari. The Book of Drawings', isbn13: '9782359063738' }, 'boutique.louvre.fr')],
      ['https://boutique.louvre.fr/en/product/1-vasari-fr.html', 'https://boutique.louvre.fr/en/product/2-vasari-en.html'],
      'SH-003: two stocked editions on one shelf each keep their own product page — neither vanishes');
    eq([api.museumOf({ publisher: 'Lund Humphries' }, 'louvre', []), api.museumOf({ publisher: 'Musée du Louvre Editions / Lienart' }, 'louvre', []),
        api.museumOf({ publisher: 'Nationalmuseum' }, 'louvre', [{ url: BOK }]), api.museumOf({ publisher: 'Louvre éditions / Somogy' }, 'occ-nga-gov', [])],
      [null, null, { name: 'Nationalmuseum', page: BOK }, { id: 'louvre', name: 'Louvre' }],
      'SH-004: a commercial publisher’s version, or the venue’s own house, has the venue’s shop; the Nationalmuseum’s printing its own; the Louvre’s book on another card the Louvre’s');
    const failing = lift({ mcp: () => { throw Object.assign(new Error('down'), { code: 'upstream_error' }); }, sample: () => ({}) }, []);
    const io = { fetch: async () => ({ ok: false, results: [], detail: 'down' }) };
    const s = await failing.otherShopFacts({ title: 'Some book', isbn13: '9789171009166' }, { name: 'Some Museum', page: 'https://shop.some-museum.test/book/1' }, [], io);
    eq([s.state, s.url], ['unfinished', null], 'SH-005: the shop finder failing is a step that did not finish — never "not in the museum shop"');
    const vb = api.versionBlocks({ museumId: 'louvre', editions: [{ title: 'A', isbn13: '9782359063721', showing: 'this', shop: { state: 'web' } }, { title: 'B', isbn13: '9789171009166', showing: 'this', shop: s }] });
    eq(vb.map(b => b.shop.state), ['web', 'unfinished'], 'SH-006:   that block’s shop line says the check didn’t finish');
  }

  // ── RV-001..RV-003: Re-check on a card with several versions ────────────────
  {
    const BOK = 'https://nationalmuseum.bokorder.se/en-us/article/4580/giorgio-vasari-the-book-of-drawings';
    const base = { id: 'rv', museumId: 'louvre', title: 'Giorgio Vasari: The Book of Drawings. The Fate of a Legendary Collection', looked: true, hasCatalogue: 'yes', editions: [
      { title: 'Giorgio Vasari. Le Livre des dessins', lang: 'French', isbn13: '9782359063721', showing: 'this', shop: { state: 'web', url: null, change: null, museum: null }, card: { catalogueTitle: 'Giorgio Vasari. Le Livre des dessins', isbn13: '9782359063721', shopState: 'web', shopUrl: null } },
      { title: 'Giorgio Vasari. The Book of Drawings', lang: 'English', isbn13: '9782359063738', showing: 'this', shop: { state: 'web', url: null, change: null, museum: null }, card: { catalogueTitle: 'Giorgio Vasari. The Book of Drawings', isbn13: '9782359063738', shopState: 'web', shopUrl: null } },
      { title: 'Giorgio Vasari The Book of Drawings', lang: 'English', isbn13: '9789171009166', showing: 'this', shop: { state: 'shop', url: BOK, change: null, museum: { id: null, name: 'Nationalmuseum', home: 'https://nationalmuseum.bokorder.se/en-us/', search: null, catalogues: null } }, card: { catalogueTitle: 'Giorgio Vasari The Book of Drawings', isbn13: '9789171009166', shopState: 'shop', shopUrl: BOK } }] };
    let calls = [];
    const soldOut = lift({ mcp: (tool, args) => ({ payload: { errors: [], results: args.urls.map(u => ({ url: u, title: 'Giorgio Vasari The Book of Drawings', excerpts: [], full_content: 'Giorgio Vasari The Book of Drawings. SEK 425. Sold out. '.repeat(20) })) } }),
      sample: () => ({ forSale: false, why: 'The page says Sold out.' }) }, calls);
    let out = await soldOut.recheckVersions({ ...base, editionPick: 2, shopState: 'shop', shopUrl: BOK }, {});
    const opened = calls.filter(c => c.tool === 'web_fetch').map(c => c.args.urls.join(' '));
    eq([opened, out.row.editions.map(v => v.shop.state), out.row.shopState, out.row.shopUrl], [[BOK], ['web', 'web', 'gone'], 'gone', BOK],
      'RV-001: Vasari, Stockholm’s picked — Re-check re-reads only its page in the Nationalmuseum’s shop and updates only its block (and the card); the Louvre’s shop is not opened');
    calls = [];
    const louvreShop = lift({ mcp: (tool, args) => ({ payload: { errors: [], results: args.urls.map(u => ({ url: u, title: 'Exhibition catalogues', excerpts: [
        '[Giorgio Vasari. Le Livre des dessins](https://boutique.louvre.fr/en/product/1-vasari-fr.html) €29 ' + 'Another catalogue · €35. '.repeat(20)] })) } }),
      sample: p => /OWN shop pages/.test(p) ? { found: true, thisVenue: true, catalogueTitle: 'Giorgio Vasari. Le Livre des dessins', isbn13: null, publisher: null, publisherUrl: null, shopUrl: 'https://boutique.louvre.fr/en/product/1-vasari-fr.html' } : {} }, calls);
    out = await louvreShop.recheckVersions({ ...base, editionPick: 1, shopState: 'web', shopUrl: null }, {});
    eq([out.said, out.row.editions.map(v => v.shop.state), out.row.shopState], ['Re-checked the museum shop: this book isn\u2019t there.', ['web', 'web', 'shop'], 'web'],
      'RV-002: Vasari, Lienart’s English picked — the Louvre’s shop has only the French book: the English is not marked in the shop, and no other block changes');
    out = await louvreShop.recheckVersions({ ...base, editionPick: 0, shopState: 'web', shopUrl: null }, {});
    eq([out.said, out.row.editions[0].shop, out.row.shopUrl], ['Re-checked: now in the museum shop.', { state: 'shop', url: 'https://boutique.louvre.fr/en/product/1-vasari-fr.html', change: 'now', museum: null }, 'https://boutique.louvre.fr/en/product/1-vasari-fr.html'],
      'RV-003: Vasari, the French picked — now in the museum shop, its own page on file, card and block together');
  }

  console.log(failures ? failures + ' failed' : 'her catalogue versions hold');
  process.exit(failures ? 1 : 0);
})();
