/**
 * PAGES — a show page she saved, imported as a link is (her design; docs/add_by_link.md,
 * "Saved pages").
 *
 * Palazzo Reale Milano's pages on the city council's site refuse Parallel (403), so her
 * saved pages are the proof (her decision): docs/link_pages/saved/ holds two of them as
 * Chrome saved them on her phone, cut to the page itself (the photos and fonts packed in
 * the file dropped). Titles and dates are read by CODE, so those expectations are hard;
 * what Claude says is scripted.
 *
 * Then the real app: Import → Pages, files chosen through the real input, Read, the
 * review, Cancel, a partial apply, Clear, and the list kept across a reload — each as
 * the Links box behaves.
 *
 *   node scraper/fixtures/add_by_page.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const SAVED = path.join(__dirname, '..', '..', 'docs', 'link_pages', 'saved');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-pages-'));
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
let React, createRoot, act;

let failures = 0;
function ok(cond, m, got) { if (cond) console.log('PASS  ' + m); else { console.log('FAIL  ' + m + (got !== undefined ? ' — got: ' + got : '')); failures++; } }

const TITIAN = fs.readFileSync(path.join(SAVED, 'prm_titian.mht'), 'latin1');
const SOUTINE = fs.readFileSync(path.join(SAVED, 'prm_soutine.mht'), 'latin1');
const TITIAN_URL = 'https://www2.comune.milano.it/en/web/palazzo-reale-milano/-/tiziano-e-l-immagine-della-donna-nel-cinquecento-veneziano-1';
const SOUTINE_URL = 'https://www2.comune.milano.it/en/web/palazzo-reale-milano/-/chaim-soutine';
// A page saved as plain .html, the address in its canonical link (made, to the site's shape).
const MADE_URL = 'https://www2.comune.milano.it/en/web/palazzo-reale-milano/-/made-show';
const MADE = '<!doctype html><html><head><title>Made Show - Palazzo Reale Milano - Comune di Milano</title>'
  + '<link rel="canonical" href="' + MADE_URL + '"></head><body><h1>Navigation</h1><p>Skip to Content</p>'
  + '<h1>Made Show - Palazzo Reale Milano</h1><h2>Made Show</h2><p>from 3 March 2027 to 4 July 2027</p>'
  + '<p>' + 'A made exhibition of drawings from the palace collections, shown together for the first time. '.repeat(4) + '</p>'
  + '<h2>Upcoming Exhibitions</h2><p>from 17 Oct 2026 to 01 Nov 2026</p></body></html>';
// A page with no dates at all (made): it cannot be read, so it stays in the list.
const UNDATED_URL = 'https://www2.comune.milano.it/en/web/palazzo-reale-milano/-/undated-show';
const UNDATED = '<!doctype html><html><head><title>Undated - Palazzo Reale Milano</title><link rel="canonical" href="' + UNDATED_URL + '"></head>'
  + '<body><h1>Undated - Palazzo Reale Milano</h1><p>' + 'A show with no dates printed anywhere on its page, as some press pages are. '.repeat(16) + '</p></body></html>';
// Typed in capitals, as the site types some names (CASORATI; made to its shape).
const CAPS_URL = 'https://www2.comune.milano.it/en/web/palazzo-reale-milano/-/casorati';
const CAPS = MADE.replace(MADE_URL, CAPS_URL).replace(/Made Show/g, 'CASORATI');
const NO_ADDRESS = '<!doctype html><html><head><title>Somewhere</title></head><body><h1>A show</h1><p>from 3 March 2027 to 4 July 2027</p></body></html>';

const ledger = { rows: [{ id: 'occ-palazzorealemilano-it-ibrueghel', museumId: 'occ-palazzorealemilano-it',
  title: 'I Brueghel', startDate: '2026-09-29', endDate: '2027-01-31', summary: 'The Brueghel dynasty.',
  exUrl: 'https://www.palazzorealemilano.it/en/-/brueghel', interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null, addedAt: '2026-10-01T00:00:00.000Z', editedAt: null }], ignored: [], lastRun: null };

const store = fakeStore();
// Palazzo Reale Milano already met, "No shop" answered (as in her app): no shop screen.
store.doc('venues/occasional').set({ venues: { 'occ-palazzorealemilano-it': { id: 'occ-palazzorealemilano-it', name: 'Palazzo Reale Milano',
  host: 'palazzorealemilano.it', shop: 'none', confirmed: true, turnedDown: [], addedAt: '2026-10-17T00:00:00.000Z' } } });
const fetched = [];
const runtime = () => ({
  use: async name => {
    if (name === 'db') return store;
    if (name === 'downloads') return { save: async () => ({ ok: true }) };
    if (name === 'mcp') return { callTool: async (server, tool, args) => { fetched.push(args); return { payload: { results: [], errors: [] } }; } };
    if (name === 'sample') return { json: async prompt => {
      const t = (prompt.match(/EXHIBITION TITLE, as the page gives it: (".*")/) || [])[1];
      return { summary: 'A summary of ' + (t ? JSON.parse(t) : '') + '.', english: '', englishSpeaking: false };
    } };
    return null;
  },
  complete: async () => '',
});

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window;
  win.claude = runtime();
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'Blob', 'DOMParser']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));
  const fn = name => new Function('React', 'window', 'document', 'localStorage', code + '\n;return ' + name + ';')(React, win, win.document, win.localStorage);
  const parse = h => new win.DOMParser().parseFromString(h, 'text/html');

  // ── AP-001–004: the saved pages, read by the real reader ─────────────────
  {
    const reply = fn('savedPageReply'), read = fn('readShowPage'), readVenue = fn('linkReadVenue'), venue = fn('linkVenue');
    const t = reply(TITIAN, parse);
    ok(t.ok && t.res.url === TITIAN_URL && /^# Titian and the Image of Women in 16th-Century Venice - Palazzo Reale, Milan$/m.test(t.res.full_content),
      'AP-001: Titian (.mht from her phone): the address read off the file, the page turned into the text a link gives, headings marked', t.ok ? t.res.url : t.why);
    const r = read(t.res, t.res.url, readVenue(t.res.url));
    ok(r.ok && venue(t.res.url, r).id === 'occ-palazzorealemilano-it',
      'AP-001a:  the city council\'s address files under Palazzo Reale Milano, by its path', r.ok && venue(t.res.url, r).id);
    ok(r.ok && r.base === 'Titian and the Image of Women in 16th-Century Venice' && r.start === '2022-02-23' && r.end === '2022-06-05',
      'AP-001b:  title without "- Palazzo Reale, Milan", dates 23 Feb – 5 Jun 2022', JSON.stringify([r.base, r.start, r.end, r.why]));
    ok(r.ok && /^Tiziano e l'immagine/.test(r.raw) && !/Skip to Content|Tickets and Booking/.test(r.raw) && !/Upcoming Exhibitions|17 October 2026/.test(r.raw),
      'AP-001c:  the text handed to Claude starts at the show, not the site\'s menu, and stops before the box of other shows', r.raw && r.raw.slice(0, 80));
    const s = reply(SOUTINE, parse);
    const sr = read(s.res, s.res.url, readVenue(s.res.url));
    ok(s.ok && sr.ok && sr.start === '2027-09-01' && sr.end === '2028-01-31' && sr.monthsOnly === 'september 2027 - january 2028',
      'AP-002: Soutine: only months printed ("september 2027 - january 2028") — 1 Sep 2027 to 31 Jan 2028 (her decision), never another show\'s dates', JSON.stringify([sr.start, sr.end, sr.monthsOnly, sr.why]));
    const other = read({ url: 'https://example.org/x', title: 'X', full_content: '# X\n\nseptember 2027 - january 2028\n\n' + 'Text about the show. '.repeat(20) }, 'https://example.org/x', null);
    ok(!other.ok && /Only the month and year are published/.test(other.why), 'AP-002a:  anywhere else months only are not read as dates, and said so', other.why);
    const md = fn('DATES').findMonthRange;
    ok(md('March – June 2027').end === '2027-06-30' && md('november 2026 - february 2027').end === '2027-02-28' && md('September - January 2027').start === '2026-09-01' && md('from 17 Oct 2026 to 01 Nov 2026') === null,
      'AP-002b:  months to days: the last day of the closing month (Feb 28), a year across new year, a dated range left alone');
    const m = reply(MADE, parse);
    ok(m.ok && m.res.url === MADE_URL, 'AP-003: a page saved as .html: the address from its canonical link', m.ok ? m.res.url : m.why);
    const n = reply(NO_ADDRESS, parse);
    ok(!n.ok && /doesn.t say its web address/.test(n.why), 'AP-003a:  a saved page with no address is refused, and says why', n.why);
    const j = reply('just some words', parse);
    ok(!j.ok, 'AP-003b:  a file that is no web page is refused', j.why);
  }

  // ── AP-011–012: the title rules of San Marco and Palazzo Reale (her decision) ─
  {
    const read = fn('readShowPage'), readVenue = fn('linkReadVenue');
    const body = d => '\n\n' + d + '\n\n' + 'Testo della mostra al Museo di San Marco. '.repeat(10);
    // The page titles as Parallel returned them live (18 Oct), the double space included.
    const rothkoUrl = 'https://museitoscana.cultura.gov.it/news/rothko-a-firenze/';
    const rothko = read({ url: rothkoUrl, title: 'Mostra “Rothko a Firenze”. Sezioni speciali al Museo di San Marco e alla Biblioteca medicea Laurenziana – Direzione regionale Musei nazionali Toscana',
      full_content: '# Mostra “Rothko a Firenze”. Sezioni speciali al Museo di San Marco e alla Biblioteca medicea Laurenziana' + body('Dal 14 marzo al 23 agosto 2026') }, rothkoUrl, readVenue(rothkoUrl));
    ok(rothko.ok && rothko.base === 'Rothko a Firenze', 'AP-011: San Marco Rothko: the headline\'s first sentence, without "Mostra" or the quotation marks', JSON.stringify([rothko.base, rothko.why]));
    const angUrl = 'https://museitoscana.cultura.gov.it/news/beato-angelico-una-straordinaria-mostra-dedicata-a-fra-giovanni-da-fiesole-detto-beato-angelico/';
    const ang = read({ url: angUrl, title: 'BEATO ANGELICO.  Una straordinaria mostra dedicata a Fra Giovanni da Fiesole detto Beato Angelico, artista simbolo dell’arte del Quattrocento a Firenze. – Direzione regionale Musei nazionali Toscana',
      full_content: '# BEATO ANGELICO.  Una straordinaria mostra dedicata a Fra Giovanni da Fiesole detto Beato Angelico, artista simbolo dell’arte del Quattrocento a Firenze.' + body('26 settembre 2025 - 25 gennaio 2026') }, angUrl, readVenue(angUrl));
    const opts = fn('linkOptions'), caps = fn('DATES').capsTitleParts;
    ok(ang.ok && ang.base === 'BEATO ANGELICO' && opts('occ-museitoscana-cultura-gov-it').capsTitles && caps(ang.base) === 'Beato Angelico',
      'AP-011a:  San Marco Beato Angelico: the first sentence, its capitals recased — "Beato Angelico"', JSON.stringify([ang.base, ang.why]));
    ok(opts('occ-palazzorealemilano-it').capsTitles && caps('CASORATI') === 'Casorati' && caps('I am LEONOR FINI') === 'I am LEONOR FINI',
      'AP-012: Palazzo Reale Milano recases a title typed in capitals (CASORATI → Casorati); a mixed one stays as typed (her decision)');
  }

  // ── AP-005 onward: the button, pressed ─────────────────────────────────
  let root = createRoot(win.document.getElementById('root'));
  const App = fn('App');
  const settle = async (n = 8) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
  await act(async () => { root.render(React.createElement(App)); });
  await settle();
  const choose = async (input, files) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    await act(async () => { input.dispatchEvent(new win.Event('change', { bubbles: true })); });
    await settle(12);
  };
  await choose(win.document.querySelector('input[type=file][accept=".json"]'), [new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' })]);
  const buttons = re => [...win.document.querySelectorAll('button')].filter(b => re.test(b.textContent.trim()));
  const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(12); };
  const stored = () => [...store.docs.keys()].filter(k => k.startsWith('links_pages/')).map(k => JSON.parse(store.docs.get(k)).url).sort();
  const pagesInput = () => win.document.querySelector('input[type=file][multiple]');
  const listed = () => { const c = buttons(/^Choose pages$/)[0]; return c ? c.parentElement.previousElementSibling.textContent : ''; };
  const file = (text, name) => new win.File([Buffer.from(text, 'latin1')], name);

  await click(buttons(/^Import$/)[0]);
  const row = buttons(/^Links$/)[0].parentElement;
  ok([...row.querySelectorAll('button')].map(b => b.textContent).join() === 'CSV,Links,Pages', 'AP-005: Import offers CSV · Links · Pages, Pages after Links (her design)');
  await click(buttons(/^Pages$/)[0]);
  await choose(pagesInput(), [file(TITIAN, 'titian.mht'), file(SOUTINE, 'soutine.mht'), file(UNDATED, 'undated.html'), file(NO_ADDRESS, 'nowhere.html')]);
  ok(/Titian and the Image of Women/.test(listed()) && /Chaïm Soutine/.test(listed()) && /Undated/.test(listed()) && !/Somewhere/.test(listed()),
    'AP-005a:  every page chosen at once is listed by its title; one with no address is not', listed());
  ok(/nowhere\.html: The saved page doesn.t say its web address/.test(win.document.body.textContent), 'AP-005b:  and that one is named, with why');
  ok(JSON.stringify(stored()) === JSON.stringify([SOUTINE_URL, TITIAN_URL, UNDATED_URL].sort()), 'AP-005c:  the list is kept in the page\'s store at once, as text', JSON.stringify(stored()));
  ok(store.docs.get('links_pages/' + fn('pageDocId')(TITIAN_URL)).length < 20000, 'AP-005d:  as the page\'s text only — not the 20 MB file');

  // Read: Titian and Soutine come to cards; the undated page stays in the list, with why.
  await click(buttons(/^Read$/).pop());
  const cardTitle = t => [...win.document.querySelectorAll('div')].some(d => d.textContent === t);
  ok(cardTitle('Titian and the Image of Women in 16th-Century Venice') && cardTitle('Chaïm Soutine'), 'AP-006: Read: Titian and Soutine come to cards in the review');
  ok(/Only the months are published \(“september 2027 - january 2028”\): dates set to the first and last day\./.test(win.document.body.textContent),
    'AP-006c:  Soutine\'s approval card says only the months are published (her decision: the approval card only)');
  ok(!fetched.length, 'AP-006a:  nothing fetched — no Parallel, no network', fetched.length);
  ok(/Undated/.test(listed()) && !/Titian|Soutine/.test(listed()) && /No dates found under the show/.test(win.document.body.textContent),
    'AP-006b:  the undated page, not read, stays in the list with why; the two read left it', listed() + ' / ' + (win.document.body.textContent.match(/Undated - Palazzo Reale Milano — [^.]*\./) || [''])[0]);

  // Cancel import: every page read goes back to the list (as Links).
  await click(buttons(/^Cancel import$/)[0]);
  ok(/Titian/.test(listed()) && /Soutine/.test(listed()) && stored().length === 3, 'AP-007: Cancel import puts the pages read back in the list, stored', listed());

  // A partial apply: add the made page; reject it, accept Titian → the made page returns.
  await click(buttons(/^Clear$/)[0]);
  await choose(pagesInput(), [file(TITIAN, 'titian.mht'), file(MADE, 'made.html'), file(UNDATED, 'undated.html'), file(CAPS, 'casorati.html')]);
  await click(buttons(/^Read$/).pop());
  ok(cardTitle('Casorati'), 'AP-012a:  CASORATI comes to its card as Casorati');
  const cardOf = b => { let el = b.parentElement; while (el.parentElement && el.parentElement.querySelectorAll('button').length <= 3) el = el.parentElement; return el; };
  const adds = buttons(/^Add new entry$/);
  ok(adds.length === 3, 'AP-008: three pages read, three cards', adds.length);
  const cardFor = re => buttons(/^Add new entry$/).find(b => re.test(cardOf(b).textContent));
  await click(cardFor(/Titian/));
  await click([...cardOf(cardFor(/Made Show/)).querySelectorAll('button')].find(b => /Reject$/.test(b.textContent.trim())));
  await click(cardFor(/Casorati/));
  await click(buttons(/^Go ahead and update the ledger$/)[0]);
  ok(JSON.stringify(stored()) === JSON.stringify([MADE_URL, UNDATED_URL].sort()), 'AP-008a:  Titian and Casorati imported; the rejected page goes back to the list beside the unread one, stored', JSON.stringify(stored()));

  // Kept across a reload, as the Links box is.
  await act(async () => { root.unmount(); });
  root = createRoot(win.document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(12);
  await choose(win.document.querySelector('input[type=file][accept=".json"]'), [new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' })]);
  await click(buttons(/^Import$/)[0]);
  await click(buttons(/^Pages$/)[0]);
  ok(/Made Show/.test(listed()) && /Undated/.test(listed()), 'AP-009: the list comes back after the page is closed and reopened', listed());

  // Clear empties the list and the store.
  await click(buttons(/^Clear$/)[0]);
  ok(/No pages chosen/.test(listed()) && stored().length === 0, 'AP-010: Clear empties the list and the store', JSON.stringify(stored()));

  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) { ok(false, 'React complained', shouted.find(s => /Warning/.test(s))); }
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_page: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
