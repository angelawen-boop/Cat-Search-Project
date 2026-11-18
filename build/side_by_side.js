#!/usr/bin/env node
/*
 * side_by_side.js — do two versions of the app give the same results? (docs/restructure.md, "The checks")
 *
 * Each version is built the way the build builds it, then run in a stand-in browser (jsdom) with
 * the same clock, the same random numbers and the same inputs. Compared, old against new:
 *   - every top-level value the page defines (each table and list, each function's text);
 *   - the walk, every step once and in order (STEPS in snapshot(); each step names the steps it needs):
 *     opening; her test ledger loaded (docs/ledger_2026-09-24, every 9th row given a period, so the Period
 *     sort and theme chips show cards); the Import pop-up and each of its four tabs; a venue chip; a theme
 *     chip; the Period sort; a card opened; card marks, every sort and chip, and their combinations; Save now
 *     (screen, every store record, the downloaded file); the Cloud Saves drawer; her 15 Oct sweep file read
 *     (the review), a mixed apply and an all-accept apply (screen, store); Reset (screen, store);
 *   - the Read job for Pages (her saved page) and Paste (a short pasted text), and with --live for Links (two
 *     proof pages fetched live once per run through the free Parallel server): the review, and every call made
 *     to the web and to Claude. Claude answers both versions with the same fixed reply;
 *   - the jobs, on her test ledger with one card that has versions: Label (its progress at 0 and after one
 *     batch, its line, the diagnostic), Relabel and "Do not regroup"; Find catalogue (its progress line),
 *     Search again, Re-check museum shop, a Find catalogue whose shop page dies and one whose publisher page
 *     dies after the book is found; a digital link (words that are not a link, then a link); the catalogue
 *     pick; a Paste from a venue outside her list through the review to the shop screen, once ending in Cancel
 *     import, once through Confirm, No shop, Add, Look again, Back, Next and Apply. Each: the screen, the
 *     store, every call. The web and Claude answer with fixed replies shaped on the fixtures'
 *     (catalogue_route.js, recheck_shop.js, add_by_link.js);
 *   - the pieces no step opens, drawn; the store's sequence of reads and writes (opening to the first automatic
 *     save after her ledger loads, and the whole run); anything the page shouts on the console.
 * The page's own timers run on a stand-in clock, fired as they fall due, never waited for in real time.
 * A screen a version never reached is a FAIL, never an empty pass. Any difference prints where it is,
 * and the exit code is 1. Not used until proven at this version (build/proofs/side_by_side.proof.js).
 *
 *   node build/side_by_side.js <old.jsx> <new.jsx> [--changes-allowed] [--live]
 *   node build/side_by_side.js --base <git ref> [--changes-allowed] [--live]   old = Cat_Watch.jsx at that commit
 *
 * --changes-allowed: a function's text may differ; every other top-level value (tables, lists,
 * regexes, strings, numbers, a table's own values with its functions set aside) must not; a name in
 * one version only is allowed only if it is a function there, or, new only, a named text or pattern or
 * a block of functions and named texts (namedTexts). Every screen and store record must
 * still be identical.
 */
'use strict';
const { WORDS, wordsRe } = require('../scraper/fixtures/words.js');   // the app's sentences, from its words list
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json');
const SWEEP = path.join(ROOT, 'scraper', 'output', 'stitch_20261015_0920', 'sweep_compressed.csv');
const SAVED_PAGE = path.join(ROOT, 'docs', 'link_pages', 'saved', 'prm_titian.mht');
const NOW = Date.parse('2026-11-05T10:00:00Z');
// The Links read's live pages (docs/link_proof_pages.json): a venue with its own link rules, and one without.
const LIVE_URLS = ['https://galleriaborghese.cultura.gov.it/en/exhibition/metamorphoses/',
  'https://www.nationalgallery.org.uk/exhibitions/renoir-and-love'];
// Her Met paste (scraper/fixtures/add_by_paste.js, PS-004).
const PASTE_URL = 'https://www.metmuseum.org/met-publications/age-of-spirituality-a-symposium';
const PASTE_TEXT = 'The Age of Spirituality: Late Antique and Early Christian Art, Third to Seventh Century was a landmark exhibition held at The Metropolitan Museum of Art from November 19, 1977 to February 12, 1978.';

// Her test ledger, with every 9th row labelled with a period, and some with a theme, so the Period sort
// and the theme chip have cards to show (her ledger was saved before the Period sort existed).
function ledgerText() {
  const hers = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const periods = [['antiquity', -300], ['gothic', 1300], ['highren', 1510], ['baroque', 1650], ['impressionism', 1875]];
  const themes = [['sculpture'], ['architecture'], []];
  hers.rows = hers.rows.map((r, i) => (i % 9 ? r : { ...r, period: periods[(i / 9) % 5][0], periodYear: periods[(i / 9) % 5][1], themes: themes[(i / 9) % 3] }));
  return JSON.stringify(hers);
}

// ── the jobs (run A3-0): the stand-in web and Claude for Label, Relabel, the lookups and a new venue ──
// The same test ledger, plus one card with catalogue versions (her ledger has none): Vasari, her case 1
// (docs/lookup_proof_cards.json), each version carrying its book as pickRow reads it (catalogue_route.js, PK-).
const PROOF_CARDS = path.join(ROOT, 'docs', 'lookup_proof_cards.json');
const PICK_TITLE = 'Giorgio Vasari: The Book of Drawings';
function jobsLedgerText() {
  const L = JSON.parse(ledgerText());
  const c = JSON.parse(fs.readFileSync(PROOF_CARDS, 'utf8')).cards.find(x => x.case === 1);
  const book = v => ({ catalogueTitle: v.title, isbn13: v.isbn13, publisher: v.publisher, publisherUrl: null, publisherResult: null, shopState: 'web', shopUrl: null });
  const editions = c.versions.map(v => ({ title: v.title, note: null, city: null, year: null, proofUrl: null, ...v, card: book(v) }));
  const pick = editions.findIndex(v => v.isbn13 === c.pick);
  L.rows.push({ ...L.rows[1], id: 'louvre-vasaritest', museumId: c.venue, title: c.title, startDate: '2022-03-31', endDate: '2022-07-04',
    summary: 'The Book of Drawings.', exUrl: 'https://www.louvre.fr/en/vasari-test', interested: true, acquiring: null, looked: true,
    hasCatalogue: 'yes', ...book(editions[pick]), editions, editionPick: pick });
  return JSON.stringify(L);
}
// The lookups' stand-in replies, shaped as catalogue_route.js's WL-030 (a third-party publisher at an English
// venue): the shop's shelf carries the book, the book's page its ISBN, the publisher's site its page.
const isShopRead = p => /venue’s OWN shop pages/.test(p);
const isJudge = p => /"kind": "book"\|"listing"\|"other"/.test(p);
const LOOK_BOOK = 'https://shop.nationalgallery.org.uk/test-hannibal-book.html';
const LOOK_PUB = 'https://hannibalbooks.be/en/test-hannibal-book#1';
function lookupWeb(T, how) {
  const fails = () => { const e = new Error('upstream'); e.code = 'upstream_error'; throw e; };
  return (tool, args) => {
    if (tool === 'web_search') {
      const q = args.search_queries.join(' | ');
      if (q.startsWith('Hannibal Books')) return { payload: { results: [{ url: 'https://hannibalbooks.be/en/about', title: 'Hannibal Books', excerpts: ['Hannibal'] }] } };
      if (q.startsWith('site:hannibalbooks.be')) return { payload: { results: [{ url: LOOK_PUB, title: T + ' | Hannibal', excerpts: [T] }] } };
      return { payload: { results: [] } };
    }
    if (how === 'shopDies') fails();
    if (args.urls.includes(LOOK_BOOK)) return { payload: { errors: [], results: [{ url: LOOK_BOOK, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 9789493416543\n£40\n' + 'x '.repeat(300) }] } };
    if (args.urls.includes(LOOK_PUB)) { if (how === 'pubFails') fails(); return { payload: { errors: [], results: [{ url: LOOK_PUB, title: T, excerpts: [], full_content: '# ' + T + '\nISBN 9789493416543\n' + 'Essays. '.repeat(80) }] } }; }
    return { payload: { errors: [], results: args.urls.map(u => ({ url: u, title: 'Exhibition catalogues', excerpts: ['[' + T + ' £40](' + LOOK_BOOK + ')\n' + 'Another catalogue · €35. '.repeat(20)] })) } };
  };
}
// Re-check's question about the book's page: sold out (recheck_shop.js's reply), so the card changes.
const lookupClaude = T => p => (/"forSale"/.test(p) ? { forSale: false, why: 'The page says Sold out.' } : isShopRead(p) ? { found: true, thisVenue: true, catalogueTitle: T, isbn13: null, publisher: 'Hannibal Books', publisherUrl: null, shopUrl: LOOK_BOOK }
  : isJudge(p) ? { kind: 'book', bookUrl: null } : {});
// A Paste from a venue outside her list. Its shop search is the Courtauld's real one (docs/link_pages/shop_search/
// courtauld.json, add_by_link.js AL-008) moved onto a made-up museum, so the finder takes its catalogues section.
const NEW_HOST = 'testhausmuseum.org';
const NEW_URL = 'https://www.' + NEW_HOST + '/exhibitions/testhaus-treasures';
const NEW_TEXT = 'Testhaus Treasures: Drawings from the Collection was shown at the Testhaus Museum from March 3, 2025 to June 15, 2025, with drawings from five centuries.';
const NEW_REPLY = { summary: 'Five centuries of drawings from the Testhaus collection.', title: 'Testhaus Treasures: Drawings from the Collection',
  dates: 'March 3, 2025 to June 15, 2025', english: '', englishSpeaking: true, gallery: false, venue: 'The Testhaus Museum', venueShort: 'Testhaus',
  venueCity: 'London', venueCountry: 'United Kingdom', venueOwnPage: true };
function newVenueWeb() {
  const real = fs.readFileSync(path.join(ROOT, 'docs', 'link_pages', 'shop_search', 'courtauld.json'), 'utf8');
  const moved = JSON.parse(real.split('courtauld.ac.uk').join(NEW_HOST).split('Courtauld').join('Testhaus'));
  return (tool, args) => (tool === 'web_search'
    ? { payload: { results: /Testhaus/.test(args.search_queries.join(' ')) ? moved.results : [] } }
    : { payload: { results: args.urls.map(u => ({ url: u, title: '', full_content: '' })), errors: [] } });
}

// ── the live pages: fetched once per run, through the free Parallel server (docs/testing.md) ──
async function fetchLive(outFile) {
  const W = require(path.join(ROOT, 'scraper', 'test_watch.js'));
  const EP = 'https://search.parallel.ai/mcp';
  const H = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  let sid = null, id = 1;
  const rpc = async body => {
    const r = await W.timedFetch(EP, { method: 'POST', headers: { ...H, ...(sid ? { 'Mcp-Session-Id': sid } : {}) }, body: JSON.stringify(body) });
    const t = await r.text(); let j = null;
    try { j = JSON.parse(t); } catch { const m = t.match(/^data: (.*)$/m); if (m) try { j = JSON.parse(m[1]); } catch {} }
    sid = r.headers.get('mcp-session-id') || sid;
    if (!r.ok && !j) throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 200));
    return j;
  };
  await rpc({ jsonrpc: '2.0', id: id++, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cw-side-by-side', version: '1' } } });
  await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const out = {};
  for (const u of LIVE_URLS) {
    const j = await rpc({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name: 'web_fetch',
      arguments: { urls: [u], full_content: true, objective: "The exhibition's title, dates and description.", session_id: 'cwsidebyside' + '0'.repeat(22) } } });
    if (!j || j.error) throw new Error('refused ' + u + ': ' + JSON.stringify((j && j.error) || 'no reply').slice(0, 300));
    const c = ((j.result || {}).content || []).find(x => x.type === 'text');
    let payload = null; try { payload = JSON.parse(c.text); } catch {}
    if (!payload || !Array.isArray(payload.results) || !payload.results.some(r => r && (r.full_content || '').length > 200))
      throw new Error('no page came back for ' + u + ': ' + JSON.stringify(j).slice(0, 300));
    out[u] = { results: payload.results, errors: payload.errors || [] };
  }
  fs.writeFileSync(outFile, JSON.stringify(out));
}

// ── one version: build it, run it, write what it showed ─────────────────────
const PLANTED = '\n// PLANTED FAULT (build/proofs/side_by_side.proof.js)\n';
// `only`: run just that step and the steps it needs (its proof's planted faults), not the whole walk.
async function snapshot(jsxFile, outFile, liveFile, only) {
  const ts = require('typescript');
  const whole = fs.readFileSync(jsxFile, 'utf8');
  // A fault its proof plants: plain script after the PLANTED line, run with the page as part of it. The page
  // above the line is transpiled once and kept (by its fingerprint), so each planted fault costs no new build.
  const cut = whole.indexOf(PLANTED);
  const src = cut < 0 ? whole : whole.slice(0, cut), planted = cut < 0 ? '' : whole.slice(cut);
  const key = require('crypto').createHash('sha1').update(src).digest('hex');
  const cacheDir = path.join(os.tmpdir(), 'cw-sbs-built'), cached = path.join(cacheDir, key + '.js');
  if (!fs.existsSync(cached)) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
    // Prepared exactly as page_renders.js and build_app.js prepare it.
    const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
      + src.replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){');
    fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
    try {
      execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
        '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
    } catch { /* type errors are expected; the emit is what matters */ }
    if (!fs.existsSync(path.join(tmp, 'app.js'))) throw new Error('did not transpile: ' + jsxFile);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.renameSync(path.join(tmp, 'app.js'), cached);
  }
  const code = fs.readFileSync(cached, 'utf8') + '\n' + planted;

  // Every name the page declares at the top level.
  const sf = ts.createSourceFile('a.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = [];
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
  }

  // The same clock and the same "random" numbers for both versions.
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(NOW); }
    static now() { return NOW; }
  }
  let seed = 7;
  Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const { JSDOM } = require('jsdom');
  const { fakeStore } = require(path.join(ROOT, 'scraper', 'fixtures', 'fake_store.js'));
  const { batchReply } = require(path.join(ROOT, 'scraper', 'fixtures', 'batch_reply.js'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  win.__catWatchTest = true;   // draws Reset to Seed, as the tests' page has it
  const store = fakeStore();

  // The page's own timers run on a stand-in clock: never waited for, fired in order of when they fall due,
  // only once nothing else is moving (below). The long repeating ones (the one-tab heartbeat every 20 seconds,
  // the half-minute "x ago" refresh) never fire: when they fell used to depend on the machine, not the page.
  let vnow = 0, vseq = 0;
  const timers = new Map();
  const vSetTimeout = (fn, ms, ...a) => { const id = ++vseq; timers.set(id, { due: vnow + Math.max(0, +ms || 0), fn, a, seq: id }); return id; };
  const vSetInterval = (fn, ms, ...a) => { const id = ++vseq; if (+ms >= 10000) return id; timers.set(id, { due: vnow + Math.max(1, +ms || 0), every: Math.max(1, +ms || 0), fn, a, seq: id }); return id; };
  const vClear = id => { timers.delete(id); };
  const nextTimer = () => { let best = null; for (const t of timers.values()) if (!best || t.due < best.due || (t.due === best.due && t.seq < best.seq)) best = t; return best; };
  const shouted = [];
  const fire = t => {
    vnow = Math.max(vnow, t.due);
    if (t.every) t.due = vnow + t.every; else timers.delete(t.seq);
    try { typeof t.fn === 'function' && t.fn(...t.a); } catch (e) { shouted.push('a timer threw: ' + (e && e.message)); }
  };
  // Real work the page waits on (compression, hashing): its answer is held, and handed back one at a time, in
  // the order it was asked, only when the page is otherwise still — never when the machine happens to finish it
  // (two lookup-log saves once interleaved their writes in whichever order their compression ended).
  const held = [];
  const track = (obj, m) => {
    const f = obj && obj[m]; if (typeof f !== 'function') return;
    try { obj[m] = function (...a) {
      const item = { done: false }; held.push(item);
      const answer = new Promise((res, rej) => { item.res = res; item.rej = rej; });
      Promise.resolve().then(() => f.apply(this, a)).then(v => { item.done = true; item.ok = true; item.v = v; }, e => { item.done = true; item.ok = false; item.v = e; });
      return answer;
    }; } catch {}
  };
  // The oldest held answer, if its work has finished: handed back. True when one was.
  const release = () => { const h = held[0]; if (!h || !h.done) return false; held.shift(); h.ok ? h.res(h.v) : h.rej(h.v); return true; };
  track(Response.prototype, 'arrayBuffer'); track(Response.prototype, 'text'); track(Blob.prototype, 'text');
  track(win.Blob.prototype, 'text'); track(globalThis.crypto && globalThis.crypto.subtle, 'digest');
  // A file being read: counted until it has been read.
  let busy = 0;
  for (const m of ['readAsText', 'readAsArrayBuffer', 'readAsDataURL']) {
    const f = win.FileReader.prototype[m];
    win.FileReader.prototype[m] = function (...a) { busy++; this.addEventListener('loadend', () => { busy--; }, { once: true }); return f.apply(this, a); };
  }

  // The store as the page reaches it: every read, write, delete and list logged in order (the operation and the
  // record's name, never its contents), and a record four steps deep (the lookup log's pieces) reached through its
  // parent, as the platform's store allows.
  const seq = [];
  const logOp = (op, p) => { seq.push(op + ' ' + p); };
  const docOf = p => ({
    get: () => { logOp('read', p); return store.doc(p).get(); },
    set: v => { logOp('write', p); return store.doc(p).set(v); },
    update: async v => { logOp('update', p); const d = store.docs.get(p); return store.doc(p).set({ ...(d ? JSON.parse(d) : {}), ...v }); },
    delete: () => { logOp('delete', p); return store.doc(p).delete(); },
    collection: c => collOf(p + '/' + c),
  });
  const collOf = c => {
    let q = store.collection(c);
    const out = { doc: id => docOf(c + '/' + id), orderBy: (f, d) => { q = q.orderBy(f, d); return out; }, limit: n => { q = q.limit(n); return out; },
      get: () => { logOp('list', c); return q.get(); } };
    return out;
  };
  const logged = { doc: docOf, collection: collOf };
  const saved = [];
  // The web answers only during the Read jobs. Claude answers throughout (the period labels after an
  // import ask it), so no failed question is retried later inside another step.
  const live = liveFile ? JSON.parse(fs.readFileSync(liveFile, 'utf8')) : {};
  let reading = false;
  const calls = [];
  let pending = 0;   // calls not yet answered: a screen is not steady while one is out
  const answering = fn => async (...a) => { pending++; try { return await fn(...a); } finally { pending--; } };
  const mcp = { callTool: answering(async (server, tool, args) => {
    calls.push('web ' + server + ' ' + tool + ' ' + JSON.stringify(args));
    const u = (args.urls || [])[0];
    if (tool === 'web_fetch' && live[u]) return { payload: live[u] };
    return { payload: { results: [], errors: [] } };
  }) };
  // Claude's fixed reply, in the shape the app reads (scraper/fixtures/add_by_link.js, add_by_paste.js).
  // The jobs' steps hand in their own web and Claude (jobWeb, jobClaude); `gate`, while set, holds every such
  // call until it is opened, so a progress line can be seen part-way.
  let jobWeb = null, jobClaude = null, gate = null;
  const makeGate = () => { let open; const p = new Promise(r => { open = r; }); return { p, open }; };
  const jobMcp = { callTool: answering(async (server, tool, args) => {
    calls.push('web ' + server + ' ' + tool + ' ' + JSON.stringify(args));
    if (gate) await gate.p;
    return jobWeb(tool, args);
  }) };
  const sample = { json: answering(async (full, opts) => {
    calls.push('claude ' + JSON.stringify(opts || {}) + '\n' + full);
    if (jobClaude) { if (gate) await gate.p; const r = await jobClaude(full); if (r !== undefined) return r; }
    // The period labels (scraper/fixtures/period_render.js): every show asked about is Baroque, 1650.
    if (/name the art period/.test(full)) return { labels: full.split('Exhibitions:\n')[1].split('\n').filter(Boolean).map(l => ({ i: JSON.parse(l).i, period: 'baroque', year: 1650, themes: [] })) };
    return batchReply(full, async prompt => {
      if (/pasted or typed by hand/.test(prompt)) return { summary: 'Landmark Late Antique and Early Christian art at the Met.',
        title: 'The Age of Spirituality: Late Antique and Early Christian Art, Third to Seventh Century', dates: 'November 19, 1977 to February 12, 1978',
        english: '', englishSpeaking: true, venue: 'The Metropolitan Museum of Art', venueShort: 'Met', venueCity: 'New York', venueCountry: 'United States', venueOwnPage: true };
      const t = (prompt.match(/EXHIBITION TITLE, as the page gives it: (".*")/) || [])[1];
      const title = t ? JSON.parse(t) : '';
      const reply = { summary: 'A summary of ' + String(title).split(/\s+/).slice(0, 6).join(' ') + '.', english: '', englishSpeaking: true };
      if (/venueOwnPage/.test(prompt)) Object.assign(reply, { venue: 'Palazzo Reale Milano', venueShort: 'Palazzo Reale', venueCity: 'Milan', venueCountry: 'Italy', venueOwnPage: true });
      return reply;
    });
  }) };
  win.claude = { use: async name => (name === 'db' ? logged : name === 'downloads' ? { save: async f => { saved.push(f); } }
    : name === 'mcp' && reading ? mcp : name === 'mcp' && jobWeb ? jobMcp : name === 'sample' ? sample : null) };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
    'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader',
    'File', 'DOMParser', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  console.error = (...a) => shouted.push(String(a[0]));

  // Which step is running, for the page to see (window.__sbsAt): its proof plants a fault that shows only then.
  let curStep = 'opening';
  const at = name => { win.__sbsAt = name; };
  at('opening');
  global.Date = FixedDate;
  const ret = names.map(n => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',\n');
  const env = new Function('React', 'window', 'document', 'localStorage', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    code + '\n;return {' + ret + '};')(React, win, doc, win.localStorage, vSetTimeout, vClear, vSetInterval, vClear);

  const show = (v, fnText) => {
    const f = x => (fnText ? 'function ' + String(x) : 'function');
    if (typeof v === 'function') return f(v);
    try { return JSON.stringify(v, (k, x) => (typeof x === 'function' ? f(x) : x instanceof RegExp ? String(x) : x)); }
    catch (e) { return 'unshowable: ' + e.message; }
  };
  // values: in full; plain: functions set aside (for --changes-allowed); kinds: typeof.
  const values = {}, plain = {}, kinds = {};
  for (const n of names) { values[n] = show(env[n], true); plain[n] = show(env[n], false); kinds[n] = typeof env[n]; }

  // Steady, with no idle wait: the page has nothing left to do — no call out, no real work running, nothing
  // drawn, stored or handed over for a few turns of the event loop — and no timer of its own falls due within
  // 0.8 s of the last change (longer than the 0.6 s automatic save). A timer that does is fired at once.
  let mutations = 0;
  new win.MutationObserver(() => { mutations++; }).observe(doc.body, { subtree: true, childList: true, attributes: true, characterData: true });
  const tick = () => new Promise(r => setImmediate(r));
  const fp = () => mutations + ':' + seq.length + ':' + saved.length + ':' + calls.length + ':' + pending + ':' + busy + ':' + held.length + ':' + timers.size;
  const LIMIT_MS = 20000;
  const settled = async (t0, changed) => {   // turns of the event loop until nothing moves; false past the limit
    let last = fp(), same = 0;
    for (;;) {
      if (RealDate.now() - t0 > LIMIT_MS) return false;
      await tick(); const f = fp();
      if (f === last && !pending && !busy) same++; else { same = 0; last = f; changed(); }
      if (same < 4) continue;
      if (!held.length) return true;
      if (release()) same = 0;
    }
  };
  const steady = async () => {
    const t0 = RealDate.now(); let changedAt = vnow;
    for (;;) {
      if (!await settled(t0, () => { changedAt = vnow; })) return;
      const t = nextTimer();
      if (!t || t.due > changedAt + 800) return;
      fire(t);
    }
  };
  // Until fn() holds (looked at whenever something moved), firing the page's timers as they fall due, up to
  // `ms` of stand-in time; false once nothing is moving, nothing falls due, and fn() still does not hold.
  const until = async (fn, ms = 15000) => {
    const t0 = RealDate.now(), vstart = vnow; let seen = null, still = 0;
    while (RealDate.now() - t0 < ms) {
      const f = fp();
      if (f !== seen) { seen = f; still = 0; if (fn()) return true; }
      await tick();
      if (fp() !== f || pending || busy) continue;
      if (++still < 4) continue;
      if (held.length) { if (release()) still = 0; continue; }
      const t = nextTimer();
      if (t && t.due <= vstart + ms) { fire(t); still = 0; continue; }
      if (still > 200) return !!fn();
    }
    return !!fn();
  };
  const screens = {}, missed = {}, meta = {};
  // One capture: what kind of record it is, and the step and marker it was taken under (its proof plants its
  // fault there). A step that never reached its screen is recorded as missed, and the comparison fails on it.
  const capture = (name, reached, value, kind = 'screen') => {
    if (!reached) missed[name] = true;
    screens[name] = reached ? value() : '';
    meta[name] = { kind, step: curStep, at: win.__sbsAt };
  };
  const screen = () => doc.body.innerHTML;
  const text = () => doc.body.textContent;
  const buttons = re => [...doc.querySelectorAll('button')].filter(b => re.test(b.textContent.trim()));
  const button = re => buttons(re)[0];
  const dialog = () => doc.querySelector('[role=dialog]');
  const inDialog = re => dialog() && [...dialog().querySelectorAll('button')].find(b => re.test(b.textContent.trim()));
  const click = el => { if (el) el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); return !!el; };
  const type = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  };
  const rowOf = label => { const s = [...doc.querySelectorAll('span')].find(x => x.textContent === label); return s ? [...s.parentNode.querySelectorAll('button')] : []; };
  const lit = b => !!b && b.style.background !== 'transparent' && b.style.background !== '';
  const DEBUG = !!process.env.SBS_DEBUG, t0 = RealDate.now();
  const step = async (name, fn) => {   // a step that throws is a missed screen, not a crash
    try { await fn(); } catch (e) { missed[name] = true; screens[name] = ''; meta[name] = { kind: 'screen', step: curStep, at: win.__sbsAt }; console.log('step ' + name + ' threw: ' + (e && e.stack || e)); }
    if (DEBUG) console.log(((RealDate.now() - t0) / 1000).toFixed(1) + 's ' + name + (missed[name] ? ' MISSED: ' + (dialog() ? dialog().textContent : text()).slice(0, 600) : ''));
  };

  const { act } = React;
  const root = createRoot(doc.getElementById('root'));
  await act(async () => { root.render(React.createElement(env.App)); });
  global.IS_REACT_ACT_ENVIRONMENT = false;
  await steady();
  capture('opening', true, screen);

  const give = (sel, files) => {
    const input = doc.querySelector(sel);
    if (!input) throw new Error('no file input ' + sel);
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  };

  // ── THE WALK: every step, in order, each with the steps it needs before it ─────────────────────────────
  // The check runs them all, in this order, once. A proof runs one step and the steps it needs (`only`).
  const STEPS = [];
  const def = (name, needs, fn) => STEPS.push({ name, needs, fn });
  const storeText = () => [...store.docs.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + ' = ' + v).join('\n');

  def('opening', [], async () => {});
  let loaded = false, atLoad = 0;
  def('afterLedger', [], async () => {
    const before = screen();
    atLoad = seq.length;
    give('input[type=file][accept=".json"]', [new win.File([ledgerText()], 'ledger.json', { type: 'application/json' })]);
    loaded = await until(() => screen() !== before && doc.querySelectorAll('article').length > 0);
    await steady();
    capture('afterLedger', loaded, screen);
    capture('afterLedger-store', loaded, storeText, 'store');
  });
  // The store's sequence from opening to the first automatic save after her ledger is loaded (its switch to the
  // new live ledger and anything that save does after it): the opening reads keep their order.
  def('store-sequence', ['afterLedger'], async () => {
    const sw = seq.findIndex((s, i) => i >= atLoad && s === 'write ledger/live');
    let end = sw; while (end >= 0 && end + 1 < seq.length && !/^(read|list) /.test(seq[end + 1])) end++;
    capture('store-sequence', loaded && sw >= 0, () => seq.slice(0, end + 1).join('\n'), 'sequence');
  });

  // The Import pop-up and its four tabs.
  def('importPopup', ['afterLedger'], async () => {
    click(button(/^Import$/));
    const ok = await until(() => !!inDialog(/^Paste$/));
    await steady(); capture('importPopup', ok, screen);
  });
  def('importCsv', ['importPopup'], async () => {
    const csv = doc.querySelector('input[type=file][accept=".csv,text/csv"]');
    let picked = false; if (csv) csv.click = () => { picked = true; mutations++; };
    click(inDialog(/^CSV$/));
    const ok = await until(() => picked && !dialog());
    await steady(); capture('importCsv', ok, screen);
  });
  def('importLinks', ['afterLedger'], async () => {
    click(button(/^Import$/)); await until(() => !!inDialog(/^Links$/));
    click(inDialog(/^Links$/));
    const ok = await until(() => !!(dialog() && dialog().querySelector('textarea')));
    await steady(); capture('importLinks', ok, screen);
  });
  def('importPages', ['importLinks'], async () => {
    click(inDialog(/^Pages$/));
    const ok = await until(() => !!button(/^Choose pages$/));
    await steady(); capture('importPages', ok, screen);
  });
  def('importPaste', ['importPages'], async () => {
    click(inDialog(/^Paste$/));
    const ok = await until(() => doc.querySelectorAll('input[aria-label="Link"]').length > 0);
    await steady(); capture('importPaste', ok, screen);
    click(inDialog(/^Cancel$/)); await until(() => !dialog()); await steady();
  });

  // The venue chip and the theme chip, each pressed and then released.
  def('venueChip', ['afterLedger'], async () => {
    click(rowOf(WORDS.sortVenue)[0]);
    const ok = await until(() => lit(rowOf(WORDS.sortVenue)[0]));
    await steady(); capture('venueChip', ok, screen);
    click(rowOf(WORDS.sortVenue)[0]); await until(() => !lit(rowOf(WORDS.sortVenue)[0])); await steady();
  });
  def('themeChip', ['afterLedger'], async () => {
    const pick = () => rowOf(WORDS.themeRow).find(b => /^Sculpture( · \d+)?$/.test(b.textContent)); // a picked chip shows its count (59.1)
    click(pick());
    const ok = await until(() => lit(pick()));
    await steady(); capture('themeChip', ok, screen);
    click(pick()); await until(() => !lit(pick())); await steady();
  });
  def('periodSort', ['afterLedger'], async () => {
    const pick = re => rowOf(WORDS.sortRow).find(b => re.test(b.textContent));
    click(pick(/^Period/));
    const ok = await until(() => lit(pick(/^Period/)));
    await steady(); capture('periodSort', ok, screen);
    click(pick(/^Date/)); await until(() => lit(pick(/^Date/))); await steady();
  });
  def('cardOpened', ['afterLedger'], async () => {
    const card = doc.querySelector('article');
    click(card && [...card.querySelectorAll('button')].find(b => wordsRe(WORDS.catalogue).test(b.textContent) && !/Digital/.test(b.textContent)));
    const ok = await until(() => !!(doc.querySelector('article') && [...doc.querySelector('article').querySelectorAll('button')].some(b => b.textContent.trim() === WORDS.hide)));
    await steady(); capture('cardOpened', ok, screen);
    click([...doc.querySelector('article').querySelectorAll('button')].find(b => b.textContent.trim() === WORDS.hide)); await steady();
  });

  // The walk of the main screen: card marks, every sort, every chip. Each capture is the screen's fingerprint
  // and the cards in order, so a difference says which card moved. Each press is its own capture and marker.
  const brief = () => require('crypto').createHash('sha1').update(screen()).digest('hex') + '\n' +
    [...doc.querySelectorAll('article')].map(a => a.textContent.slice(0, 70)).join('\n');
  const cardBtn = (n, find) => () => { const a = doc.querySelectorAll('article')[n]; return a && [...a.querySelectorAll('button')].find(find); };
  const press = async (name, find) => {
    at(name);
    await step(name, async () => { const before = screen(); const had = click(find()); const ok = had && await until(() => screen() !== before, 4000);
      await steady(); capture(name, ok, brief); });
    at(curStep);
  };
  const MARKS = [
    ['mark-watch', cardBtn(0, b => b.title === WORDS.watch)], ['mark-unwatch', cardBtn(0, b => b.title === WORDS.unwatch)],
    ['mark-watch-2', cardBtn(7, b => b.title === WORDS.watch)], ['mark-yes', cardBtn(0, b => b.textContent === WORDS.yes)],
    ['mark-buynext', cardBtn(0, b => b.title === WORDS.buyNext)], ['mark-yes-2', cardBtn(2, b => b.textContent === WORDS.yes)],
    ['mark-buynext-2', cardBtn(2, b => b.title === WORDS.buyNext)], ['mark-yes-3', cardBtn(3, b => b.textContent === WORDS.yes)],
    ['mark-buynext-3', cardBtn(3, b => b.title === WORDS.buyNext)], ['mark-buynext-3-off', cardBtn(3, b => b.title === WORDS.notBuyingNext)],
    ['mark-no', cardBtn(3, b => b.textContent === 'No')], ['mark-acquired', cardBtn(4, b => b.textContent === WORDS.acquired)],
    ['mark-dismiss', cardBtn(5, b => b.title === WORDS.notInterested)], ['mark-undo', () => button(/^Undo$/)],
    ['mark-dismiss-2', cardBtn(6, b => b.title === WORDS.notInterested)],
  ];
  MARKS.forEach(([name, find], k) => def(name, [k ? MARKS[k - 1][0] : 'afterLedger'], () => press(name, find)));
  def('marks-store', ['mark-dismiss-2'], async () => { await steady(); capture('marks-store', true, storeText, 'store'); });
  const chipRow = async (label, tag) => {
    const n = rowOf(label).length; if (!n) { missed[tag] = true; screens[tag] = ''; meta[tag] = { kind: 'screen', step: curStep, at: win.__sbsAt }; return; }
    for (let i = 0; i < n; i++) { const t = rowOf(label)[i].textContent.trim(); if (/^Clear all$/.test(t)) continue;
      await press(tag + '-' + t, () => rowOf(label)[i]);
      if (label === WORDS.sortRow && /^(Date|Period)/.test(t)) await press(tag + '-' + t + '-again', () => rowOf(label)[i]);
      else { click(rowOf(label)[i]); await steady(); } }
  };
  def('chips-sort', ['marks-store'], async () => { await chipRow(WORDS.sortRow, 'sort'); click(rowOf(WORDS.sortRow)[0]); await steady(); });
  const ROWS = [['when', WORDS.whenRow], ['venue', WORDS.sortVenue], ['theme', WORDS.themeRow], ['acquiring', WORDS.acquiringRow], ['showing', WORDS.showingRow]];
  ROWS.forEach(([key, label]) => def('chips-' + key, ['chips-sort'], () => chipRow(label, 'chip-' + label)));
  // Combinations: Wanted beside Owned; Buy next in her order, by period, by date and reversed; Dismissed; a search; Clear all.
  const acq = t => () => rowOf(WORDS.acquiringRow).find(b => b.textContent.trim() === t), sortBtn = re => () => rowOf(WORDS.sortRow).find(b => re.test(b.textContent));
  const showing = re => () => rowOf(WORDS.showingRow).find(b => re.test(b.textContent.trim()));
  def('mix-wanted', ['chips-sort'], () => press('mix-wanted', acq(WORDS.chipWanted)));
  def('mix-wanted-owned', ['mix-wanted'], () => press('mix-wanted-owned', acq(WORDS.chipOwned)));
  def('mix-wanted-owned-buynext', ['mix-wanted-owned'], () => press('mix-wanted-owned-buynext', acq(WORDS.buyNext)));
  def('mix-buynext', ['mix-wanted-owned-buynext'], async () => {
    click(acq(WORDS.chipWanted)()); click(acq(WORDS.chipOwned)()); await steady();
    capture('mix-buynext', lit(acq(WORDS.buyNext)()), brief);
  });
  def('mix-buynext-period', ['mix-buynext'], () => press('mix-buynext-period', sortBtn(/^Period/)));
  def('mix-buynext-period-again', ['mix-buynext-period'], () => press('mix-buynext-period-again', sortBtn(/^Period/)));
  def('mix-buynext-date', ['mix-buynext-period-again'], () => press('mix-buynext-date', sortBtn(/^Date/)));
  def('mix-buynext-date-again', ['mix-buynext-date'], () => press('mix-buynext-date-again', sortBtn(/^Date/)));
  def('mix-buynext-date-off', ['mix-buynext-date-again'], () => press('mix-buynext-date-off', sortBtn(/^Date/)));
  def('mix-clear', ['mix-buynext-date-off'], () => press('mix-clear', showing(/^Clear all$/)));
  def('mix-search', ['mix-clear'], async () => {
    at('mix-search-none');
    const was = screen(); click(doc.querySelector('button[aria-label="Search"]') || [...doc.querySelectorAll('button')].find(b => /search/i.test(b.title || b.getAttribute('aria-label') || '')));
    const ok = await until(() => !!doc.querySelector('input:not([type=file])') && screen() !== was, 4000);
    const box = [...doc.querySelectorAll('input:not([type=file])')][0]; if (box) type(box, 'bocklin van');
    await steady(); capture('mix-search-none', ok, brief);
    at('mix-search');
    if (box) type([...doc.querySelectorAll('input:not([type=file])')][0], 'van');
    await steady(); capture('mix-search', ok, brief);
  });
  def('mix-search-dismissed', ['mix-search'], () => press('mix-search-dismissed', showing(new RegExp('^' + WORDS.chipDismissed + '$'))));
  def('mix-clear-2', ['mix-search-dismissed'], () => press('mix-clear-2', showing(/^Clear all$/)));

  // Save now: the screen, every store record, the file handed over.
  def('saveNow', ['afterLedger'], async () => {
    click(button(/^Save$/));
    await until(() => !!button(/^Save now$/));
    click(button(/^Save now$/));
    const ok = await until(() => saved.length > 0 && /Local file saved/.test(text()));
    await steady();
    capture('saveNow', ok, screen);
    capture('saveNow-store', ok, storeText, 'store');
    capture('saveNow-download', ok, () => JSON.stringify(saved), 'download');
  });
  def('cloudDrawer', ['saveNow'], async () => {
    click(button(/^Cloud Saves$/));
    const ok = await until(() => !!button(/^Roll back$/));
    await steady(); capture('cloudDrawer', ok, screen);
    click(button(/^Cloud Saves$/)); await steady();
  });

  // Her 15 Oct sweep file: the review, then every card accepted and applied.
  const giveSweep = () => give('input[type=file][accept=".csv,text/csv"]', [new win.File([fs.readFileSync(SWEEP, 'utf8')], 'sweep.csv', { type: 'text/csv' })]);
  let reviewed = false;
  def('review', ['afterLedger'], async () => {
    giveSweep();
    reviewed = await until(() => /proposed change/.test(text()) && !!button(/^Cancel import$/));
    await steady();
    capture('review', reviewed, screen);
  });
  // A mixed review first: cards decided in turn add, reject, never add, left undecided; field edits
  // accepted and rejected in turn; then the partial apply. Every outcome the apply counts is reached.
  def('appliedMixed', ['review'], async () => {
    at('reviewMixed');
    if (!reviewed) throw new Error('no review to apply');
    const expand = button(/^Expand all venues$/); if (expand) { click(expand); await steady(); }
    const cardBtns = buttons(/^(✓ )?Add new entry$/);
    const fieldBtns = buttons(/^(✓ )?Accept edit$/);
    if (cardBtns.length < 4) throw new Error('fewer than four new-entry cards to mix');
    cardBtns.forEach((b, k) => {
      const row = b.parentElement, pick = k % 4;
      if (pick === 3) return;
      const want = pick === 0 ? /Add new entry$/ : pick === 1 ? /Reject$/ : /Never add this$/;
      const t = [...row.querySelectorAll('button')].find(x => want.test(x.textContent.trim()));
      if (t) click(t);
    });
    fieldBtns.forEach((b, k) => {
      if (k % 2 === 0) { click(b); return; }
      const t = [...b.parentElement.querySelectorAll('button')].find(x => /^Reject$/.test(x.textContent.trim()));
      if (t) click(t);
    });
    await steady();
    capture('reviewMixed', true, screen);
    at('appliedMixed');
    const partial = button(/^Update with the \d+ I.ve decided$/);
    if (!partial) throw new Error('no partial apply offered');
    click(partial);
    await until(() => !!button(/^Continue$/));
    click(button(/^Continue$/));
    const ok = await until(() => /Import complete/.test(text()) && !button(/^Cancel import$/));
    await steady();
    capture('appliedMixed', ok, screen);
    capture('appliedMixed-store', ok, storeText, 'store');
    // The same sweep file again, for the all-accept apply below.
    giveSweep();
    await until(() => /proposed change/.test(text()) && !!button(/^Cancel import$/));
    await steady();
  });
  def('applied', ['appliedMixed'], async () => {
    if (!reviewed) throw new Error('no review to apply');
    const expand = button(/^Expand all venues$/); if (expand) { click(expand); await steady(); }
    for (let round = 0; round < 5; round++) {
      const todo = buttons(/^(Add new entry|Accept edit)$/);
      if (!todo.length) break;
      for (const b of todo) click(b);
      await steady();
    }
    click(button(/^Go ahead and update the ledger$/));
    const ok = await until(() => /Import complete/.test(text()) && !button(/^Cancel import$/));
    await steady();
    capture('applied', ok, screen);
    capture('applied-store', ok, storeText, 'store');
  });

  // Reset, confirmed.
  def('reset', ['afterLedger'], async () => {
    click(button(/^Reset to Seed$/));
    await until(() => !!button(/^Continue$/));
    click(button(/^Continue$/));
    const ok = await until(() => /Starter set loaded/.test(text()));
    await steady();
    capture('reset', ok, screen);
    capture('reset-store', ok, storeText, 'store');
  });

  // The Read job for Links (live only), Pages and Paste: the review it gives, and every call it made.
  const readJob = async (name, tab, fill) => {
    reading = true; calls.length = 0;
    try {
      click(button(/^Import$/)); await until(() => !!inDialog(new RegExp('^' + tab + '$')));
      click(inDialog(new RegExp('^' + tab + '$'))); await steady();
      await fill(); await steady();
      if (DEBUG) console.log('  before Read: ' + (dialog() ? dialog().textContent : 'no dialog').slice(0, 400));
      click(buttons(/^Read$/).pop());
      const ok = await until(() => !!button(/^Cancel import$/), 60000);
      await steady();
      capture(name, ok, screen);
      capture(name + '-calls', ok, () => calls.join('\n\n'), 'calls');
      click(button(/^Cancel import$/)); await steady();
      if (dialog()) { click(inDialog(/^Cancel$/)); await steady(); }
    } finally { reading = false; }
  };
  if (liveFile) def('readLinks', ['afterLedger'], () => readJob('readLinks', WORDS.tabLinks, async () => type(dialog().querySelector('textarea'), LIVE_URLS.join('\n'))));
  def('readPages', ['afterLedger'], () => readJob('readPages', WORDS.tabPages, async () => {
    give('input[type=file][multiple]', [new win.File([fs.readFileSync(SAVED_PAGE)], 'titian.mht')]);
    await until(() => /Titian/.test(text()));
  }));
  def('readPaste', ['afterLedger'], () => readJob('readPaste', WORDS.tabPaste, async () => {
    type(doc.querySelector('input[aria-label="Link"]'), PASTE_URL);
    type(doc.querySelector('textarea[aria-label="Text"]'), PASTE_TEXT);
  }));

  // ── THE JOBS: pressed with fixed stand-in replies ───────────────────────────────────────────────────────
  // Each capture: the screen's fingerprint, the lines above the cards (progress, Label's line, the banner, the
  // diagnostic) and the card in hand; then the store (every record, a long one by its fingerprint, the cards in
  // hand read back from the live ledger, and any lookup-log record the step wrote, read back); then every call.
  const zlib = require('zlib'), sha1 = t => require('crypto').createHash('sha1').update(t).digest('hex');
  const articleOf = title => [...doc.querySelectorAll('article')].find(a => { const h = a.querySelector('h3'); return h && h.firstChild && h.firstChild.textContent === title; });
  const inCard = (title, re) => { const a = articleOf(title); return a && [...a.querySelectorAll('button')].find(b => re.test(b.textContent.trim())); };
  const head = () => { const a = doc.querySelector('article'); if (!a) return text(); const r = doc.createRange(); r.setStart(doc.body, 0); r.setEndBefore(a); return r.toString(); };
  const view = title => sha1(screen()) + '\n-- above the cards --\n' + head() + '\n-- the card --\n' + ((title && articleOf(title))
    ? articleOf(title).textContent + [...articleOf(title).querySelectorAll('input')].map(i => '\n[a box holding "' + i.value + '"]').join('') : '(none)');
  const unzip = b64 => { try { return zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'); } catch (e) { return '(unreadable: ' + e.message + ')'; } };
  const rec = k => { const v = store.docs.get(k); return v ? JSON.parse(v) : null; };
  const tapeKeys = () => [...store.docs.keys()].filter(k => /^lookups\/[^/]+$/.test(k)).sort();
  const storeView = (titles, tapesBefore) => {
    const lines = [...store.docs.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => k + ' = ' + (v.length > 3000 ? 'sha1 ' + sha1(v) + ' (' + v.length + ' characters)' : v));
    const liveRec = rec('ledger/live');
    if (liveRec) {
      let z = ''; for (let i = 0; i < liveRec.parts; i++) z += (rec('ledgerParts/' + liveRec.id + '-' + i) || {}).z || '';
      let rows = []; try { rows = JSON.parse(unzip(z)).rows || []; } catch {}
      lines.push('-- the live ledger: ' + rows.length + ' rows; the cards in hand --');
      for (const t of titles) lines.push(JSON.stringify(rows.filter(r => r.title === t)));
    }
    for (const k of tapeKeys().filter(k => !tapesBefore.includes(k))) {
      const h = rec(k); let z = ''; for (let i = 0; i < (h.pieces || 0); i++) z += (rec(k + '/pieces/' + i) || {}).text || '';
      lines.push('-- lookup log ' + k + ' --\n' + (h.enc === 'gzip-base64' ? unzip(z) : z));
    }
    return lines.join('\n');
  };
  // One job step: `run` presses and waits (true when the step reached its screen); the view, store and calls
  // captured. `card`: the title of the card in hand, or a function giving it once the step has run.
  const job = (name, needs, card, run) => def(name, needs, async () => {
    calls.length = 0; const tapes = tapeKeys();
    const ok = await run();
    await steady();
    const t = typeof card === 'function' ? card() : card;
    capture(name, ok, () => view(t));
    capture(name + '-store', ok, () => storeView(t ? [t] : [], tapes), 'store');
    capture(name + '-calls', ok, () => calls.join('\n\n'), 'calls');
  });
  // A card's job has finished: a call was made, none is out, no card's button is greyed.
  const jobDone = () => until(() => calls.length > 0 && !pending && !doc.querySelector('article button[disabled]'), 30000);

  // Her test ledger (after Reset, in the walk), with the Vasari card that has versions.
  def('jobs-ledger', [], async () => {
    const was = screen();
    give('input[type=file][accept=".json"]', [new win.File([jobsLedgerText()], 'ledger.json', { type: 'application/json' })]);
    const ok = await until(() => screen() !== was && !!articleOf(PICK_TITLE));
    await steady(); capture('jobs-ledger', ok, () => view(PICK_TITLE));
  });

  // 1. Label, the toolbar's button: Claude holds back its first two answers so the progress line is seen at 0 and
  // after one batch. Every show gets Gothic, 1300; every other one "Test Artist" as its artist; every fifth Sculpture.
  const periodLines = full => full.split('Exhibitions:\n')[1].split('\n').filter(Boolean).map(l => JSON.parse(l));
  job('label', ['jobs-ledger'], null, async () => {
    at('label-progress-0');
    jobWeb = null;
    jobClaude = full => (/name the art period/.test(full) ? { labels: periodLines(full).map(s => ({ i: s.i, period: 'gothic', year: 1300, response: false,
      artist: s.i % 2 ? '' : 'Test Artist', themes: s.i % 5 ? [] : ['sculpture'], why: 'The stand-in’s answer.' })) } : undefined);
    gate = makeGate();
    click(button(/^Label$/));
    const ok0 = await until(() => /\b0\/\d+ · Labelling periods/.test(text()));
    capture('label-progress-0', ok0, () => view(null));
    at('label-progress-1');
    const g1 = gate; gate = makeGate(); g1.open();
    const ok1 = await until(() => /\b40\/\d+ · Labelling periods/.test(text()));
    capture('label-progress-1', ok1, () => view(null));
    at('label');
    const g2 = gate; gate = null; g2.open();
    const ok = await until(() => /Label: (all|\d+ of)/.test(head()) && !/Labelling periods/.test(text()), 60000);
    await steady();
    const show = button(/^Show diagnostic$/); if (show) click(show);
    return ok && await until(() => !!doc.querySelector('pre'));
  });

  // Relabel on the first card: Baroque, 1650, "Test Artist" — whose other shows are Gothic, so the card offers
  // "Do not regroup"; pressed.
  const firstTitle = () => { const h = doc.querySelector('article h3'); return h ? h.firstChild.textContent : ''; };
  let relabelled = '';
  job('relabel', ['label'], () => relabelled, async () => {
    relabelled = firstTitle();
    jobClaude = full => (/name the art period/.test(full) ? { labels: [{ i: 0, period: 'baroque', year: 1650, response: false, artist: 'Test Artist', themes: [], why: 'The stand-in’s answer.' }] } : undefined);
    click(inCard(relabelled, /^Catalogue|Catalogue$/)); await until(() => !!inCard(relabelled, /^Relabel$/));
    click(inCard(relabelled, /^Relabel$/));
    return await until(() => /Relabelled: /.test((articleOf(relabelled) || {}).textContent || ''));
  });
  job('keep-period', ['relabel'], () => relabelled, async () => {
    const b = inCard(relabelled, /^Do not regroup$/); click(b);
    const ok = !!b && await until(() => /no regrouping/.test((articleOf(relabelled) || {}).textContent || ''));
    jobClaude = null;
    return ok;
  });

  // 2. Find catalogue on a card not yet looked up (it finds a book: the web holds back its first answer so the
  // progress line is seen), Search again, Re-check museum shop; one Find catalogue where the shop's page dies, and
  // one where the publisher's page dies after the book is found.
  const lookStep = (name, needs, title, how, re, first) => job(name, needs, title, async () => {
    jobWeb = lookupWeb(title + ': The Catalogue', how); jobClaude = lookupClaude(title + ': The Catalogue');
    try {
      if (first) { at(name + '-progress'); click(inCard(title, /^Catalogue$/)); await until(() => !!inCard(title, re)); }
      const b = inCard(title, re); if (!b) return false;
      if (first) gate = makeGate();
      click(b);
      if (first) {
        const seen = await until(() => /Searching venue shop/.test((articleOf(title) || {}).textContent || ''));
        capture(name + '-progress', seen, () => view(title));
        at(name);
        const g = gate; gate = null; g.open();
      }
      return await jobDone();
    } finally { jobWeb = null; jobClaude = null; }
  });
  lookStep('find', ['jobs-ledger'], 'Zurbarán', null, /^Find catalogue$/, true);
  lookStep('search-again', ['find'], 'Zurbarán', null, /^Search again$/);
  lookStep('recheck', ['search-again'], 'Zurbarán', null, /^Re-check museum shop$/);
  lookStep('find-died', ['jobs-ledger'], 'Monet and Renoir: Painting Side by Side', 'shopDies', /^Find catalogue$/, true);
  lookStep('find-trouble', ['jobs-ledger'], 'Waldmüller: Landscapes', 'pubFails', /^Find catalogue$/, true);

  // 3. Her digital catalogue link on the card just found: words that are not a link (the box stays open), then a link.
  const digital = (name, needs, typed) => job(name, needs, 'Zurbarán', async () => {
    if (!articleOf('Zurbarán').querySelector('input')) click(inCard('Zurbarán', /^Digital catalogue$/));
    const box = await until(() => !!articleOf('Zurbarán').querySelector('input')) && articleOf('Zurbarán').querySelector('input');
    if (!box) return false;
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(box, typed);
    box.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await steady(); return true;
  });
  digital('digital-not-a-link', ['recheck'], 'not a link');
  digital('digital', ['digital-not-a-link'], 'https://example.org/zurbaran-catalogue.pdf');
  // The catalogue pick on the card with versions: the third block (Stockholm's hardcover).
  job('pick', ['jobs-ledger'], PICK_TITLE, async () => {
    click(inCard(PICK_TITLE, wordsRe(WORDS.catalogue))); await until(() => !!articleOf(PICK_TITLE).querySelector('[role=radio]'));
    const r = [...articleOf(PICK_TITLE).querySelectorAll('[role=radio]')].find(x => x.getAttribute('aria-checked') !== 'true');
    if (!r) return false;
    const k = [...articleOf(PICK_TITLE).querySelectorAll('[role=radio]')].indexOf(r);
    click(r);
    return await until(() => articleOf(PICK_TITLE).querySelectorAll('[role=radio]')[k].getAttribute('aria-checked') === 'true');
  });

  // 4. A Paste from a venue outside her list, through the review to the shop screen. First ending in Cancel import
  // (from the shop screen: Confirm, Back, Cancel import); then the same read again: Confirm, No shop, her own link,
  // Look again, Back, Next, Confirm, Apply.
  const shops = () => [...doc.querySelectorAll('[role=dialog]')].find(d => wordsRe(WORDS.newVenueShops).test(d.textContent));
  // The review panel: the fixed layer holding "Cancel import".
  const reviewPanel = () => { let el = button(/^Cancel import$/); while (el && el.parentElement && !(el.style && el.style.position === 'fixed')) el = el.parentElement; return el; };
  const shopView = () => sha1(screen()) + '\n-- the shop screen --\n' + (shops() ? shops().textContent : '(none)')
    + '\n-- the review --\n' + (reviewPanel() ? reviewPanel().textContent : '(none)') + '\n-- above the cards --\n' + head();
  const shopBtn = label => shops() && [...shops().querySelectorAll('button')].find(b => b.textContent.replace(/^✓ /, '') === label);
  const shopStep = (name, needs, run) => def(name, needs, async () => {
    calls.length = 0;
    jobWeb = newVenueWeb();
    jobClaude = full => (/Testhaus Treasures/.test(full) && !/name the art period/.test(full) ? batchReply(full, async p => (/Testhaus Treasures/.test(p) ? NEW_REPLY : undefined)) : undefined);
    const ok = await run();
    await steady();
    capture(name, ok, shopView);
    capture(name + '-store', ok, () => storeView([], tapeKeys()), 'store');
    capture(name + '-calls', ok, () => calls.join('\n\n'), 'calls');
  });
  const pasteRead = (name, needs) => shopStep(name, needs, async () => {
    click(button(/^Import$/)); await until(() => !!inDialog(/^Paste$/));
    click(inDialog(/^Paste$/)); await steady();
    type(doc.querySelector('input[aria-label="Link"]'), NEW_URL); type(doc.querySelector('textarea[aria-label="Text"]'), NEW_TEXT);
    await steady();
    click(buttons(/^Read$/).pop());
    const ok = await until(() => !!button(/^Cancel import$/), 60000);
    await steady();
    for (const b of buttons(/^Add new entry$/)) click(b);
    await steady();
    return ok && !!button(/^Next$/);
  });
  const shopPress = (name, needs, label, wait) => shopStep(name, needs, async () => { const b = typeof label === 'string' ? shopBtn(label) : label(); if (!b) return false; click(b); return wait ? await until(wait, 30000) : true; });
  pasteRead('paste-new', ['jobs-ledger']);
  shopPress('shop-screen', ['paste-new'], () => button(/^Next$/), () => !!shops());
  shopPress('shop-confirm', ['shop-screen'], WORDS.confirm);
  shopPress('shop-back', ['shop-confirm'], WORDS.back, () => !shops());
  shopPress('cancel-import', ['shop-back'], () => button(/^Cancel import$/), () => !button(/^Cancel import$/));
  pasteRead('paste-new-again', ['cancel-import']);
  shopPress('shop-screen-again', ['paste-new-again'], () => button(/^Next$/), () => !!shops());
  shopPress('shop-confirm-again', ['shop-screen-again'], WORDS.confirm);
  shopPress('shop-no-shop', ['shop-confirm-again'], WORDS.noShop);
  shopStep('shop-add', ['shop-no-shop'], async () => {
    const b = shopBtn(WORDS.add); if (!b) return false; click(b);
    const box = await until(() => !!shops().querySelector('input')) && shops().querySelector('input');
    if (!box) return false;
    type(box, 'shop.' + NEW_HOST + '/collections/books'); await steady();
    box.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return await until(() => !shops().querySelector('input'));
  });
  shopPress('shop-look-again', ['shop-add'], WORDS.lookAgain, () => !wordsRe(WORDS.looking).test(shops().textContent));
  shopPress('shop-back-again', ['shop-look-again'], WORDS.back, () => !shops());
  shopPress('shop-next', ['shop-back-again'], () => button(/^Next$/), () => !!shops());
  shopPress('shop-answered', ['shop-next'], () => shopBtn(WORDS.confirm) && !shopBtn(WORDS.confirm).disabled ? shopBtn(WORDS.confirm) : shopBtn(WORDS.noShop));
  shopPress('shop-apply', ['shop-answered'], () => shops() && [...shops().querySelectorAll('button')].pop(), () => !shops() && /Import complete/.test(text()));
  def('shops-done', ['shop-apply'], async () => { jobWeb = null; jobClaude = null; if (dialog()) { click(inDialog(/^Cancel$/)); await steady(); } });

  // 6. Drawing: the pieces no earlier step opens, each in full.
  const draw = (name, needs, find, back) => def(name, needs, async () => {
    const was = screen(); const ok = click(find()) && await until(() => screen() !== was, 4000);
    await steady(); capture(name, ok, screen); if (back !== false) { click((back || find)()); await steady(); }
  });
  const bottom = t => () => [...doc.querySelectorAll('button')].filter(b => b.textContent.trim() === t).pop();
  draw('draw-dark', ['afterLedger'], () => doc.querySelector('button[title="Switch to dark"]'), () => doc.querySelector('button[title="Switch to light"]'));
  draw('draw-sweep-log', ['afterLedger'], () => button(/^Details$/), () => button(/^Hide details$/));
  draw('draw-quarantine', ['appliedMixed'], bottom(WORDS.quarantine));
  draw('draw-reset-cards', ['afterLedger'], bottom(WORDS.clearSearch));
  draw('draw-cloud-saves', ['afterLedger'], bottom(WORDS.cloudSaves));
  draw('draw-save-panel', ['afterLedger'], () => button(/^Save$/), false);
  draw('draw-search-box', ['afterLedger'], () => doc.querySelector('button[title="Search"]'));

  // Run the walk: every step in order, or one step and the steps it needs.
  const byName = new Map(STEPS.map(s => [s.name, s]));
  let wanted = null;
  if (only) {
    if (!byName.has(only)) throw new Error('no step "' + only + '"; the steps: ' + STEPS.map(s => s.name).join(', '));
    wanted = new Set();
    const add = n => { if (wanted.has(n)) return; for (const m of byName.get(n).needs) add(m); wanted.add(n); };
    add(only);
  }
  for (const s of STEPS) {
    if (wanted && !wanted.has(s.name)) continue;
    curStep = s.name; at(s.name);
    await step(s.name, s.fn);
  }
  curStep = 'end'; at('end');

  // The run's store sequence, opening to here.
  capture('store-sequence-all', true, () => seq.join('\n'), 'sequence');
  screens.consoleErrors = shouted.join('\n');
  meta.consoleErrors = { kind: 'console', step: 'end', at: 'opening' };
  fs.writeFileSync(outFile, JSON.stringify({ values, plain, kinds, screens, missed, meta, only: only || null, steps: STEPS.map(s => ({ name: s.name, needs: s.needs })) }));
  root.unmount();
  process.exit(0);
}

// ── compare two versions ────────────────────────────────────────────────────
function firstDifference(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { at: i, old: a.slice(Math.max(0, i - 60), i + 100), now: b.slice(Math.max(0, i - 60), i + 100) };
}

// One version's snapshot, in its own process, so neither sees the other's clock or store.
function snap(file, out, liveFile, only) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [__filename, '--snapshot', file, out, liveFile || '-', only || '-'], { cwd: ROOT });
    let said = '';
    child.stdout.on('data', d => { said += d; }); child.stderr.on('data', d => { said += d; });
    const stop = setTimeout(() => child.kill(), 480000);
    child.on('close', status => { clearTimeout(stop); resolve({ ok: status === 0 && fs.existsSync(out), said }); });
  });
}

async function run(oldFile, newFile, { changesAllowed, live }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
  let diffs = 0, liveFile = null;
  if (live) {
    liveFile = path.join(tmp, 'live.json');
    try { await fetchLive(liveFile); console.log('live  ' + LIVE_URLS.length + ' pages fetched through the free Parallel server'); }
    catch (e) {
      diffs++; liveFile = null;
      console.log('FAIL  live: the free Parallel server did not give the pages, so the Links read was not compared — ' + (e && e.message || e));
    }
  }
  if (!live) console.log('note  the Links read is compared only with --live (it needs pages fetched live)');
  const [o, n] = await Promise.all([[oldFile, 0], [newFile, 1]].map(async ([f, k]) => {
    const out = path.join(tmp, k + '.json'), r = await snap(f, out, liveFile, null), who = k ? 'new' : 'old';
    if (!r.ok) { console.log('FAIL  the ' + who + ' version could not be run: ' + r.said.slice(-800)); process.exit(1); }
    if (r.said.trim()) console.log(r.said.trim().split('\n').map(l => '      (' + who + ') ' + l).join('\n'));
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  }));
  diffs += compare(o, n, changesAllowed);
  if (diffs) console.log(`both runs kept: ${path.join(tmp, '0.json')} (old), ${path.join(tmp, '1.json')} (new)`);
  console.log(diffs ? `SIDE BY SIDE: ${diffs} difference(s).` : 'SIDE BY SIDE: identical.');
  process.exit(diffs ? 1 : 0);
}

// An object (as shown, functions set aside) holding only functions, texts, patterns and lists of texts.
function namedTexts(shown) {
  let v; try { v = JSON.parse(shown); } catch { return false; }
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.values(v).every(x => typeof x === 'string' || (Array.isArray(x) && x.every(y => typeof y === 'string')));
}

// Old against new, two snapshots; prints each value and screen, returns the number of differences.
function compare(o, n, changesAllowed) {
  let diffs = 0;
  const names = [...new Set([...Object.keys(o.values), ...Object.keys(n.values)])];
  let compared = 0, fnSkipped = 0;
  for (const k of names) {
    const inO = k in o.values, inN = k in n.values;
    if (changesAllowed) {
      if (!inO || !inN) {
        const kind = inO ? o.kinds[k] : n.kinds[k];
        if (kind === 'function') { console.log(`NOTE  value ${k}: a function only in the ${inO ? 'old' : 'new'} version (allowed)`); continue; }
        // A text or pattern that was written inline and now has a name: new, and nothing old is gone.
        // What it changes, if anything, shows in the screens and records compared below.
        if (!inO && (kind === 'string' || /^"\/.*\/[a-z]*"$/.test(n.plain[k]))) { console.log(`NOTE  value ${k}: a named text or pattern only in the new version (allowed)`); continue; }
        // A shared block the join writes from the scraper (PRO_FORMA): functions, and texts, patterns and lists of
        // texts that were written inline before. Allowed on the same terms.
        if (!inO && kind === 'object' && namedTexts(n.plain[k])) { console.log(`NOTE  value ${k}: a shared block of functions and named texts only in the new version (allowed)`); continue; }
        diffs++; console.log(`DIFF  value ${k}: only in the ${inO ? 'old' : 'new'} version, and it is not a function (${kind})`); continue;
      }
      compared++;
      if (o.kinds[k] === 'function' && n.kinds[k] === 'function') { if (o.values[k] !== n.values[k]) fnSkipped++; continue; }
      if (o.plain[k] === n.plain[k]) continue;
      diffs++;
      const d = firstDifference(o.plain[k], n.plain[k]);
      console.log(`DIFF  value ${k}:\n   old …${d.old}…\n   new …${d.now}…`);
      continue;
    }
    compared++;
    if (o.values[k] === n.values[k]) continue;
    diffs++;
    if (!inO) console.log(`DIFF  value ${k}: only in the new version`);
    else if (!inN) console.log(`DIFF  value ${k}: only in the old version`);
    else { const d = firstDifference(o.values[k], n.values[k]); console.log(`DIFF  value ${k}:\n   old …${d.old}…\n   new …${d.now}…`); }
  }
  console.log(changesAllowed
    ? `values: ${compared} compared, functions' text set aside (${fnSkipped} changed), every other value checked`
    : `${names.length - diffs} of ${names.length} top-level values identical`);
  for (const s of [...new Set([...Object.keys(o.screens), ...Object.keys(n.screens)])]) {
    const gone = ['old', 'new'].filter((w, i) => [o, n][i].missed[s] || !(s in [o, n][i].screens));
    if (gone.length) { diffs++; console.log(`FAIL  screen: ${s} — the ${gone.join(' and the ')} version never reached it, so the check did not run`); continue; }
    if (o.screens[s] === n.screens[s]) { console.log(`same  screen: ${s} (${o.screens[s].length} characters)`); continue; }
    diffs++;
    const d = firstDifference(o.screens[s], n.screens[s]);
    console.log(`DIFF  screen: ${s}, at character ${d.at}:\n   old …${d.old}…\n   new …${d.now}…`);
  }
  // The whole walk must have reached the review; a run of one step (a proof's) reaches what that step does.
  if (!o.only && !/proposed change/.test(o.screens.review || '')) { diffs++; console.log('FAIL  the review screen never opened — the check did not run'); }
  return diffs;
}

module.exports = { compare, snap, fetchLive, LIVE_URLS, PLANTED };

if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = { changesAllowed: args.includes('--changes-allowed'), live: args.includes('--live') };
  const rest = args.filter(a => a !== '--changes-allowed' && a !== '--live');
  const opt = v => (v && v !== '-' ? v : null);
  // A snapshot is a part of a run (the check's own, or its proof's); everything else is the check, used only when proven.
  if (rest[0] !== '--snapshot') require('../scraper/test_proofs.js').requireProven(__filename);
  if (rest[0] === '--fetch-live') fetchLive(rest[1]).then(() => process.exit(0), e => { console.log(String(e && e.message || e)); process.exit(1); });
  else if (rest[0] === '--compare') {   // two snapshots already taken (its proof's)
    const d = compare(...[rest[1], rest[2]].map(f => JSON.parse(fs.readFileSync(f, 'utf8'))), flags.changesAllowed);
    console.log(d ? `SIDE BY SIDE: ${d} difference(s).` : 'SIDE BY SIDE: identical.');
    process.exit(d ? 1 : 0);
  } else if (rest[0] === '--snapshot') snapshot(rest[1], rest[2], opt(rest[3]), opt(rest[4])).catch(e => { console.log(String(e && e.stack || e)); process.exit(1); });
  else if (rest[0] === '--base') {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
    const old = path.join(tmp, 'old.jsx');
    fs.writeFileSync(old, execFileSync('git', ['show', rest[1] + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 64 << 20 }));
    run(old, path.join(ROOT, 'Cat_Watch.jsx'), flags);
  } else if (rest.length === 2) run(path.resolve(rest[0]), path.resolve(rest[1]), flags);
  else { console.log('usage: node build/side_by_side.js <old.jsx> <new.jsx> | --base <git ref>  [--changes-allowed] [--live]'); process.exit(2); }
}
