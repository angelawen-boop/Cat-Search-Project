/**
 * PASTE — a page's text pasted by hand beside its link, for sites that refuse Parallel
 * (docs/add_by_link.md, "Pasted pages"). Her design: one box per page, the link and the text in
 * separate boxes, two to start and + for more. Also the own-site rule every way in shares
 * (ownMuseumNamed): a page on another part of one of her museums' site files under that museum.
 *
 * Her three pastes from the Tate library's catalogue and her Met paste are the proof (pasted by her,
 * so no live fetch exists to test against). Claude gives the title and copies the date words (her
 * decision: pasted text has no layout for the page reader); what Claude says is scripted, and the
 * code's checks on it — word for word in the text, dates read with no year floor — are hard.
 *
 *   node scraper/fixtures/add_by_paste.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-paste-'));
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

// Her three pastes from the Tate library's catalogue, exactly as she pasted them: the third box
// starts with Turner's summary left over from the second (her test of a lazy paste).
const PASTES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'link_pages', 'pasted_tate_library.json'), 'utf8'));
const [CARO, TURNER, STUBBS] = PASTES;

const ledger = { rows: [{ id: 'tate-britain-other', museumId: 'tate-britain', title: 'Another Show', startDate: '2026-01-01', endDate: '2026-05-01',
  summary: 'Another show.', exUrl: 'https://www.tate.org.uk/whats-on/tate-britain/another', interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null, addedAt: '2026-10-01T00:00:00.000Z', editedAt: null },
  { id: 'tate-modern-made', museumId: 'tate-modern', title: 'Made Show', startDate: '2027-03-03', endDate: '2027-07-04',
  summary: 'A summary of Made Show.', exUrl: 'https://www.tate.org.uk/whats-on/tate-modern/made-show', interested: true, watching: false, acquiring: null, looked: false,
  hasCatalogue: 'unknown', catalogueTitle: null, isbn13: null, publisher: null, publisherUrl: null, publisherResult: null,
  shopUrl: null, shopState: null, shopChange: null, addedAt: '2026-10-01T00:00:00.000Z', editedAt: null }], ignored: [], lastRun: null };

const store = fakeStore();
const fetched = [], asked = [];
// A Links read of a Tate research page (tate.org.uk, outside the two Tates' what's-on paths).
const RESEARCH = 'https://www.tate.org.uk/research/exhibition-histories/made-show';
const RESEARCH_PAGE = { url: RESEARCH, title: 'Made Show | Tate', full_content: '# Made Show\n\n3 March 2027 – 4 July 2027\n\n' + 'A made exhibition of paintings shown at Tate Modern. '.repeat(8) };
const runtime = () => ({
  use: async name => {
    if (name === 'db') return store;
    if (name === 'downloads') return { save: async () => ({ ok: true }) };
    if (name === 'mcp') return { callTool: async (server, tool, args) => { fetched.push(args);
      return { payload: { results: (args.urls || []).includes(RESEARCH) ? [RESEARCH_PAGE] : [], errors: [] } }; } };
    if (name === 'sample') return { json: async prompt => {
      asked.push(prompt);
      if (/pasted or typed by hand/.test(prompt)) {
        const [title, dates] = /George Stubbs/.test(prompt) ? ['George Stubbs : a celebration.', '21 Aug. 2006 - 1 Jan. 2007']
          : /Anthony Caro \/ edited/.test(prompt) ? ['Anthony Caro', '26 Jan. - 17 Apr. 2005'] : ['Turner and Venice', '9 Oct. 2003 - 11 Jan. 2004'];
        return { summary: /Stubbs/.test(title) ? null : 'A summary of ' + title + '.', title, dates, english: '', englishSpeaking: true,
          venue: 'Tate Britain', venueShort: 'Tate Britain', venueCity: 'London', venueCountry: 'United Kingdom', venueOwnPage: true };
      }
      const t = JSON.parse((prompt.match(/EXHIBITION TITLE, as the page gives it: (".*")/) || [])[1] || '""');
      // Claude names the Tate library's museum as the record does: Tate Britain (London); the
      // research page names Tate Modern.
      const v = /Made Show/.test(t) ? 'Tate Modern' : 'Tate Britain';
      return { summary: /Stubbs/.test(t) ? null : 'A summary of ' + t.split(/\s+/).slice(0, 4).join(' ') + '.', english: '', englishSpeaking: true,
        venue: v, venueShort: v, venueCity: 'London', venueCountry: 'United Kingdom', venueOwnPage: true };
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

  // ── PS-001–004: her pastes; Claude's title and date words checked and read by code ─────
  {
    const paste = fn('pastedPageReply'), page = fn('pastedPage'), faults = fn('pasteFaults'), dates = fn('pasteDates'), tidy = fn('pasteTitle');
    const read = (p, title, words) => { const r = paste(p.url, p.text); const pg = page(r.res.text, r.res.url);
      return { faults: faults({ title, dates: words }, pg), page: dates({ ...pg, base: tidy(title) }, words, 'tate-britain') }; };
    const c = read(CARO, 'Anthony Caro', '26 Jan. - 17 Apr. 2005');
    ok(!c.faults.length && c.page.start === '2005-01-26' && c.page.end === '2005-04-17' && !c.page.noDates,
      'PS-001: Caro: Claude\'s title and date words pass the word-for-word check; code reads the dates', JSON.stringify([c.faults, c.page.start, c.page.end]));
    const t = read(TURNER, 'Turner and Venice', '9 Oct. 2003 - 11 Jan. 2004');
    const bad = faults({ title: 'Turner in Venice', dates: '9 October 2003 - 11 January 2004' }, page(TURNER.text, TURNER.url));
    ok(!t.faults.length && t.page.start === '2003-10-09' && t.page.end === '2004-01-11' && bad.length === 2,
      'PS-002: Turner: a title or date words not in the text are faults, asked again — nothing made up passes', JSON.stringify([t.faults, bad]));
    const s = read(STUBBS, 'George Stubbs : a celebration.', '21 Aug. 2006 - 1 Jan. 2007');
    ok(!s.faults.length && s.page.base === 'George Stubbs: a celebration' && s.page.start === '2006-08-21',
      'PS-003: Stubbs: " : " read as ": ", the closing full stop dropped', JSON.stringify([s.faults, s.page.base]));
    const MET = 'The Age of Spirituality: Late Antique and Early Christian Art, Third to Seventh Century was a landmark exhibition held at The Metropolitan Museum of Art from November 19, 1977 to February 12, 1978.';
    const m = read({ url: 'https://www.metmuseum.org/met-publications/age-of-spirituality-a-symposium', text: MET },
      'The Age of Spirituality: Late Antique and Early\nChristian Art, Third to Seventh Century', 'November 19, 1977 to February 12, 1978');
    ok(paste('https://www.metmuseum.org/x', MET).ok && !m.faults.length && m.page.start === '1977-11-19' && m.page.end === '1978-02-12'
      && m.page.base === 'The Age of Spirituality: Late Antique and Early Christian Art, Third to Seventh Century',
      'PS-004: her Met paste: one sentence is read (no "too little text"); the title from inside it; 1977 read (no year floor for Paste)', JSON.stringify([m.faults, m.page.start, m.page.end, m.page.base]));
    const none = read(CARO, 'Anthony Caro', '');
    ok(!none.faults.length && none.page.noDates && !none.page.start, 'PS-004a: no date words given: undated, with the sweep\'s note');
    const metPage = page(MET, 'https://www.metmuseum.org/x'), T = 'The Age of Spirituality: Late Antique and Early Christian Art, Third to Seventh Century';
    const reworded = faults({ title: T, dates: 'November 19, 1977 to February 12, 1978', summary: 'Late Antique and Early Christian art, third to seventh century.' }, metPage);
    const fromRest = faults({ title: T, dates: 'November 19, 1977 to February 12, 1978', summary: 'Landmark Late Antique and Early Christian art at the Met.' }, metPage);
    ok(reworded.some(f => /only rewords the title/.test(f)) && !fromRest.length,
      'PS-004c: her Met paste: a summary that only rewords the title is refused and asked again; one with more passes', JSON.stringify([reworded, fromRest]));
    const D = fn('DATES');
    ok(!D.findDateRange('November 19, 1977 to February 12, 1978', { looseSingles: false }).start,
      'PS-004b: the sweep and the page reader keep the 1990 floor (a lifespan is never a run)');
    ok(!paste('', 'text').ok && !paste('not a link', 'text').ok && !paste('https://example.org/x', '  \n ').ok, 'PS-005: no link, a link box with no address, or no text: refused');
    ok(fn('ownMuseumNamed')({ venue: 'Tate Britain (London)' }, 'library.tate.org.uk') === 'tate-britain' && fn('ownMuseumNamed')({ venue: 'Tate Britain' }, 'example.org') === null,
      'PS-006: a page on another part of one of her museums\' own site files under the museum Claude names — only on that museum\'s site');
    const own = fn('ownMuseumNamed'), near = fn('nearMuseumSite');
    ok(own({ venue: 'Tate Gallery' }, 'library.tate.org.uk') === null && own({ venue: 'Tate Modern' }, 'library.tate.org.uk') === 'tate-modern',
      'PS-006a: "Tate Gallery" is neither Tate, so it stays its own venue (her decision); a Tate Modern record files under Tate Modern');
    ok(near('library.tate.org.uk') && near('tate.org.uk') && !near('capodimonte-shop.example.org') && own({ venue: 'Galleria Borghese' }, 'capodimonte.cultura.gov.it') === null,
      'PS-006b: only the museum\'s own site or a part under it — not a sister site on a shared ministry domain (cultura.gov.it)');
  }

  // ── PS-010 onward: the boxes, filled and read ──────────────────────────
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
  const openLedger = () => choose(win.document.querySelector('input[type=file][accept=".json"]'), [new win.File([JSON.stringify(ledger)], 'ledger.json', { type: 'application/json' })]);
  await openLedger();
  const buttons = re => [...win.document.querySelectorAll('button')].filter(b => re.test(b.textContent.trim()));
  const click = async el => { await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }); await settle(12); };
  const links = () => [...win.document.querySelectorAll('input[aria-label="Link"]')];
  const texts = () => [...win.document.querySelectorAll('textarea[aria-label="Text"]')];
  const type = async (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    await act(async () => { el.dispatchEvent(new win.Event('input', { bubbles: true })); });
  };
  // One document per box (the store caps a document), in the order the boxes were made.
  const stored = () => [...store.docs.entries()].filter(([p]) => p.startsWith('links_pastes/')).map(([, s]) => JSON.parse(s)).sort((a, b) => a.at - b.at);
  const cardTitle = t => [...win.document.querySelectorAll('div')].some(d => d.textContent === t);

  await click(buttons(/^Import$/)[0]);
  const row = buttons(/^Links$/)[0].parentElement;
  ok([...row.querySelectorAll('button')].map(b => b.textContent).join() === 'CSV,Links,Pages,Paste', 'PS-010: Import offers CSV · Links · Pages · Paste');
  await click(buttons(/^Paste$/)[0]);
  ok(links().length === 2 && texts().length === 2, 'PS-011: two boxes to start, each a link box and a separate text box (her design)', links().length + '/' + texts().length);
  await click(buttons(/^\+$/)[0]);
  ok(links().length === 3 && texts().length === 3, 'PS-012: + adds a box', links().length);
  ok(links().every(l => l.getAttribute('placeholder') === 'Link') && !win.document.querySelector('textarea[placeholder]'),
    'PS-013: a faint "Link" in each link box, nothing in the text boxes (her ask)');
  for (const [i, p] of PASTES.entries()) { await type(links()[i], p.url); await type(texts()[i], p.text); }
  await act(async () => { await new Promise(r => setTimeout(r, 900)); });
  ok(stored().length === 3 && stored()[2].url === STUBBS.url, 'PS-014: the boxes are kept in the page\'s store as she types', stored().length);

  // Kept across a reload.
  await act(async () => { root.unmount(); });
  root = createRoot(win.document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(12);
  await openLedger();
  await click(buttons(/^Import$/)[0]);
  await click(buttons(/^Paste$/)[0]);
  ok(links().length === 3 && links()[1].value === TURNER.url && texts()[0].value === CARO.text, 'PS-015: the boxes come back after the page is closed and reopened', links().map(l => l.value.slice(-12)).join());

  // Read: three Tate Britain cards; nothing fetched.
  await click(buttons(/^Read$/).pop());
  {
    const linkRow = [...win.document.querySelectorAll('b')].find(b => b.textContent === 'Link:');
    ok(linkRow && linkRow.parentElement.style.overflowWrap === 'anywhere', 'PS-029: a card\'s Link line wraps anywhere, so a long address stays inside the card');
  }
  ok(cardTitle('Anthony Caro') && cardTitle('Turner and Venice') && cardTitle('George Stubbs: a celebration'), 'PS-016: Read: the three come to cards');
  ok(!fetched.length, 'PS-017: nothing fetched — no Parallel, no network', fetched.length);
  const cardOf = b => { let el = b.parentElement; while (el.parentElement && el.parentElement.querySelectorAll('button').length <= 3) el = el.parentElement; return el; };
  const review = win.document.body.textContent.slice(win.document.body.textContent.indexOf('proposed changes found'));
  ok(/Tate Britain· 3· 3 to decide/.test(review) && !/library\.tate\.org\.uk·|Tate Library/i.test(review) && !buttons(/^Next$/).length,
    'PS-018: filed under Tate Britain, the museum Claude names, not a new venue for the library site (no shop screen)', review.slice(0, 400));
  ok(asked.filter(q => /pasted or typed by hand/.test(q)).every(q => /"title":/.test(q) && /"dates":/.test(q)) && /THE MUSEUM THIS CARD IS FOR|PAGE ADDRESS/.test(asked.find(q => /pasted or typed/.test(q)) || ''),
    'PS-019: Claude is handed the whole paste and asked for the title and the date words');

  // Cancel import: every box read goes back.
  await click(buttons(/^Cancel import$/)[0]);
  if (!links().length) { await click(buttons(/^Import$/)[0]); await click(buttons(/^Paste$/)[0]); }
  ok(links().length === 3 && links().map(l => l.value).join() === [CARO.url, TURNER.url, STUBBS.url].join(), 'PS-020: Cancel import puts every box read back, stored', stored().length);

  // Clear in one box empties that box only; Clear all empties every box, two left.
  await click(buttons(/^Clear$/)[1]);
  ok(links()[1].value === '' && texts()[1].value === '' && links()[0].value === CARO.url && links()[2].value === STUBBS.url, 'PS-022: Clear in a box empties that box only', links().map(l => l.value.slice(-8)).join());
  await act(async () => { await new Promise(r => setTimeout(r, 900)); });
  ok(stored().length === 2, 'PS-022a:  and the store', stored().length);
  await type(links()[1], TURNER.url); await type(texts()[1], TURNER.text);
  // A box with text and no link stays, with why; the others are read and leave.
  await type(links()[2], '');
  await click(buttons(/^Read$/).pop());
  ok(/The link box holds no web address\./.test(win.document.body.textContent), 'PS-021: a box with no link is a line saying why, never read');
  await click(buttons(/^Cancel import$/)[0]);
  if (!links().length) { await click(buttons(/^Import$/)[0]); await click(buttons(/^Paste$/)[0]); }
  {
    const ca = buttons(/^Clear all$/).pop(), row = ca && ca.closest('div[style*="grid"]');
    ok(row && buttons(/^\+$/).some(b => row.contains(b)) && buttons(/^Read$/).some(b => row.contains(b)) && row.style.gridTemplateColumns === '1fr auto 1fr',
      'PS-028: "Clear all" sits in the row with + and Read, in its centre column (her design)');
  }
  await click(buttons(/^Clear all$/).pop());
  ok(links().length === 2 && links().every(l => !l.value) && texts().every(t => !t.value) && stored().length === 0 && ![...win.document.querySelectorAll('[role=dialog] button')].some(b => /^Clear( all)?$/.test(b.textContent.trim())),
    'PS-023: Clear all empties every box and the store, two boxes left; no Clear shows on empty boxes', links().length + '/' + stored().length);

  ok(fetched.length === 0, 'PS-024: Paste fetched nothing all along', fetched.length);

  // A Links read of a page on another part of a Tate site files under the Tate Claude names, no shop asked.
  await click(buttons(/^Cancel$/).pop());
  await click(buttons(/^Import$/)[0]);
  await click(buttons(/^Links$/)[0]);
  await type(win.document.querySelector('[role=dialog] textarea'), RESEARCH);
  await click(buttons(/^Read$/).pop());
  const rv = win.document.body.textContent.slice(win.document.body.textContent.indexOf('proposed change'));
  ok(cardTitle('Made Show') && /Tate Modern· 1/.test(rv) && !/tate\.org\.uk·/i.test(rv) && !buttons(/^Next$/).length,
    'PS-025: the same rule by Links: a tate.org.uk research page files under Tate Modern, no new venue, no shop screen', rv.slice(0, 300));
  ok(/\bLink:/.test(rv) && !/Exhibition link:/.test(rv),
    'PS-027: the Change card names the field "Link", as a new show\'s card does (her decision; the two notes keep their wording)', rv.slice(0, 400));
  await click(buttons(/^Cancel import$/)[0]);

  // The store could not be read: what she types is never written over it (the lock Links and Pages have).
  {
    const locked = fakeStore();
    locked.docs.set('links_pastes/bkeep', JSON.stringify({ url: CARO.url, text: CARO.text, at: 1 }));
    const realColl = locked.collection.bind(locked);
    locked.collection = c => c === 'links_pastes' ? { orderBy() { return this; }, limit() { return this; }, get: async () => { throw { code: 'unavailable' }; } } : realColl(c);
    const before = win.claude;
    win.claude = { ...runtime(), use: async n => n === 'db' ? locked : runtime().use(n) };
    await act(async () => { root.unmount(); });
    root = createRoot(win.document.getElementById('root'));
    await act(async () => { root.render(React.createElement(App)); });
    await settle(12);
    await openLedger();
    await click(buttons(/^Import$/)[0]);
    await click(buttons(/^Paste$/)[0]);
    await type(links()[0], 'https://example.org/typed'); await type(texts()[0], 'Typed show');
    await act(async () => { await new Promise(r => setTimeout(r, 900)); });
    ok(JSON.parse(locked.docs.get('links_pastes/bkeep')).url === CARO.url && [...locked.docs.keys()].filter(k => k.startsWith('links_pastes/')).length === 1
      && /STORE NOT READ[^]*the boxes waiting in Paste/.test(win.document.body.textContent),
      'PS-026: the boxes could not be read: nothing she types is written over the store, and the page says so', [...locked.docs.keys()].join());
    win.claude = before;
  }

  if (shouted.some(s => /Warning: Each child|Cannot update|Maximum update/.test(s))) { ok(false, 'React complained', shouted.find(s => /Warning/.test(s))); }
  console.log(failures ? '\n' + failures + ' FAILED' : '\nadd_by_paste: all passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); process.exit(1); });
