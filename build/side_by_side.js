#!/usr/bin/env node
/*
 * side_by_side.js — do two versions of the app give the same results? (docs/restructure.md, gate 3)
 *
 * Each version is built the way the build builds it, then run in a stand-in browser (jsdom) with
 * the same clock, the same random numbers and the same inputs. Compared, old against new:
 *   - every top-level value the page defines (each table and list, each function's text);
 *   - the screens, in order: opening; her test ledger loaded (docs/ledger_2026-09-24, every 9th row
 *     given a period, so the Period sort and theme chips show cards); the Import pop-up and each of
 *     its four tabs; a venue chip; a theme chip; the Period sort; a card opened;
 *     Save now (screen, every store record, the downloaded file); the Cloud Saves drawer; her 15 Oct
 *     sweep file read (the review), every card accepted and applied (screen, store); Reset, confirmed
 *     (screen, store);
 *   - the Read job for Pages (her saved page) and Paste (a short pasted text): the review screen, and
 *     every call made to the web and to Claude. Claude answers both versions with the same fixed reply.
 *   - with --live, the Read job for Links too: two proof pages fetched live once per run through the
 *     free Parallel server, the same reply handed to both versions.
 * A screen a version never reached is a FAIL, never an empty pass. Any difference prints where it is,
 * and the exit code is 1.
 *
 *   node build/side_by_side.js <old.jsx> <new.jsx> [--changes-allowed] [--live]
 *   node build/side_by_side.js --base <git ref> [--changes-allowed] [--live]   old = Cat_Watch.jsx at that commit
 *
 * --changes-allowed: a function's text may differ; every other top-level value (tables, lists,
 * regexes, strings, numbers, a table's own values with its functions set aside) must not; a name in
 * one version only is allowed only if it is a function there. Every screen and store record must
 * still be identical.
 */
'use strict';
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
async function snapshot(jsxFile, outFile, liveFile) {
  const ts = require('typescript');
  const src = fs.readFileSync(jsxFile, 'utf8');
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
  const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

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
  const saved = [];
  // The web and Claude answer only during the Read jobs; before that, as today, the page has neither.
  const live = liveFile ? JSON.parse(fs.readFileSync(liveFile, 'utf8')) : {};
  let reading = false;
  const calls = [];
  const mcp = { callTool: async (server, tool, args) => {
    calls.push('web ' + server + ' ' + tool + ' ' + JSON.stringify(args));
    const u = (args.urls || [])[0];
    if (tool === 'web_fetch' && live[u]) return { payload: live[u] };
    return { payload: { results: [], errors: [] } };
  } };
  // Claude's fixed reply, in the shape the app reads (scraper/fixtures/add_by_link.js, add_by_paste.js).
  const sample = { json: async (full, opts) => {
    calls.push('claude ' + JSON.stringify(opts || {}) + '\n' + full);
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
  } };
  win.claude = { use: async name => (name === 'db' ? store : name === 'downloads' ? { save: async f => { saved.push(f); } }
    : name === 'mcp' && reading ? mcp : name === 'sample' && reading ? sample : null) };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
    'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader',
    'File', 'DOMParser', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const shouted = [];
  console.error = (...a) => shouted.push(String(a[0]));

  global.Date = FixedDate;
  const ret = names.map(n => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',\n');
  const env = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {' + ret + '};')(
    React, win, doc, win.localStorage);

  const show = (v, fnText) => {
    const f = x => (fnText ? 'function ' + String(x) : 'function');
    if (typeof v === 'function') return f(v);
    try { return JSON.stringify(v, (k, x) => (typeof x === 'function' ? f(x) : x instanceof RegExp ? String(x) : x)); }
    catch (e) { return 'unshowable: ' + e.message; }
  };
  // values: in full; plain: functions set aside (for --changes-allowed); kinds: typeof.
  const values = {}, plain = {}, kinds = {};
  for (const n of names) { values[n] = show(env[n], true); plain[n] = show(env[n], false); kinds[n] = typeof env[n]; }

  const settle = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 15000) => { const t = RealDate.now(); while (RealDate.now() - t < ms) { if (fn()) return true; await settle(40); } return false; };
  // Steady: the screen, the store and the downloads unchanged for 0.8 s (longer than the 0.6 s automatic save).
  const storeText = () => [...store.docs.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + ' = ' + v).join('\n');
  const steady = async () => { let last = '', same = 0; const t = RealDate.now();
    while (RealDate.now() - t < 20000) { const h = doc.body.innerHTML + '\u0000' + store.docs.size + ':' + storeText().length + ':' + saved.length;
      same = h === last ? same + 1 : 0; last = h; if (same >= 16) return; await settle(50); } };
  const screens = {}, missed = {};
  // One capture. A step that never reached its screen is recorded as missed, and the comparison fails on it.
  const capture = (name, reached, value) => { if (!reached) missed[name] = true; screens[name] = reached ? value() : ''; };
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
    try { await fn(); } catch (e) { missed[name] = true; screens[name] = ''; console.log('step ' + name + ' threw: ' + (e && e.stack || e)); }
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
  const before = screen();
  give('input[type=file][accept=".json"]', [new win.File([ledgerText()], 'ledger.json', { type: 'application/json' })]);
  const loaded = await until(() => screen() !== before && doc.querySelectorAll('article').length > 0);
  await steady();
  capture('afterLedger', loaded, screen);
  capture('afterLedger-store', loaded, storeText);

  // The Import pop-up and its four tabs.
  await step('importPopup', async () => {
    click(button(/^Import$/));
    const ok = await until(() => !!inDialog(/^Paste$/));
    await steady(); capture('importPopup', ok, screen);
  });
  await step('importCsv', async () => {
    const csv = doc.querySelector('input[type=file][accept=".csv,text/csv"]');
    let picked = false; if (csv) csv.click = () => { picked = true; };
    click(inDialog(/^CSV$/));
    const ok = await until(() => picked && !dialog());
    await steady(); capture('importCsv', ok, screen);
  });
  await step('importLinks', async () => {
    click(button(/^Import$/)); await until(() => !!inDialog(/^Links$/));
    click(inDialog(/^Links$/));
    const ok = await until(() => !!(dialog() && dialog().querySelector('textarea')));
    await steady(); capture('importLinks', ok, screen);
  });
  await step('importPages', async () => {
    click(inDialog(/^Pages$/));
    const ok = await until(() => !!button(/^Choose pages$/));
    await steady(); capture('importPages', ok, screen);
  });
  await step('importPaste', async () => {
    click(inDialog(/^Paste$/));
    const ok = await until(() => doc.querySelectorAll('input[aria-label="Link"]').length > 0);
    await steady(); capture('importPaste', ok, screen);
    click(inDialog(/^Cancel$/)); await until(() => !dialog()); await steady();
  });

  // The venue chip and the theme chip, each pressed and then released.
  await step('venueChip', async () => {
    const chip = rowOf('Venue')[0];
    click(chip);
    const ok = await until(() => lit(rowOf('Venue')[0]));
    await steady(); capture('venueChip', ok, screen);
    click(rowOf('Venue')[0]); await until(() => !lit(rowOf('Venue')[0])); await steady();
  });
  await step('themeChip', async () => {
    const pick = () => rowOf('Theme').find(b => b.textContent === 'Sculpture');
    click(pick());
    const ok = await until(() => lit(pick()));
    await steady(); capture('themeChip', ok, screen);
    click(pick()); await until(() => !lit(pick())); await steady();
  });
  await step('periodSort', async () => {
    const pick = re => rowOf('Sort').find(b => re.test(b.textContent));
    click(pick(/^Period/));
    const ok = await until(() => lit(pick(/^Period/)));
    await steady(); capture('periodSort', ok, screen);
    click(pick(/^Date/)); await until(() => lit(pick(/^Date/))); await steady();
  });
  await step('cardOpened', async () => {
    const card = doc.querySelector('article');
    click(card && [...card.querySelectorAll('button')].find(b => /Catalogue/.test(b.textContent) && !/Digital/.test(b.textContent)));
    const ok = await until(() => !!(doc.querySelector('article') && [...doc.querySelector('article').querySelectorAll('button')].some(b => b.textContent.trim() === 'Hide')));
    await steady(); capture('cardOpened', ok, screen);
    click([...doc.querySelector('article').querySelectorAll('button')].find(b => b.textContent.trim() === 'Hide')); await steady();
  });

  // Save now: the screen, every store record, the file handed over.
  await step('saveNow', async () => {
    click(button(/^Save$/));
    await until(() => !!button(/^Save now$/));
    click(button(/^Save now$/));
    const ok = await until(() => saved.length > 0 && /Local file saved/.test(text()));
    await steady();
    capture('saveNow', ok, screen);
    capture('saveNow-store', ok, storeText);
    capture('saveNow-download', ok, () => JSON.stringify(saved));
  });
  await step('cloudDrawer', async () => {
    click(button(/^Cloud Saves$/));
    const ok = await until(() => !!button(/^Roll back$/));
    await steady(); capture('cloudDrawer', ok, screen);
    click(button(/^Cloud Saves$/)); await steady();
  });

  // Her 15 Oct sweep file: the review, then every card accepted and applied.
  give('input[type=file][accept=".csv,text/csv"]', [new win.File([fs.readFileSync(SWEEP, 'utf8')], 'sweep.csv', { type: 'text/csv' })]);
  const reviewed = await until(() => /proposed change/.test(text()) && !!button(/^Cancel import$/));
  await steady();
  capture('review', reviewed, screen);
  await step('applied', async () => {
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
    capture('applied-store', ok, storeText);
  });

  // Reset, confirmed.
  await step('reset', async () => {
    click(button(/^Reset to Seed$/));
    await until(() => !!button(/^Continue$/));
    click(button(/^Continue$/));
    const ok = await until(() => /Starter set loaded/.test(text()));
    await steady();
    capture('reset', ok, screen);
    capture('reset-store', ok, storeText);
  });

  // The Read job for Links (live only), Pages and Paste: the review it gives, and every call it made.
  const readJob = async (name, tab, fill) => {
    await step(name, async () => {
      reading = true; calls.length = 0;
      click(button(/^Import$/)); await until(() => !!inDialog(new RegExp('^' + tab + '$')));
      click(inDialog(new RegExp('^' + tab + '$'))); await steady();
      await fill(); await steady();
      if (DEBUG) console.log('  before Read: ' + (dialog() ? dialog().textContent : 'no dialog').slice(0, 400));
      click(buttons(/^Read$/).pop());
      if (DEBUG) { await settle(3000); console.log('  after Read: ' + (dialog() ? dialog().textContent : 'no dialog').slice(0, 400) + ' | calls ' + calls.length); }
      const ok = await until(() => !!button(/^Cancel import$/), 60000);
      await steady();
      capture(name, ok, screen);
      capture(name + '-calls', ok, () => calls.join('\n\n'));
      click(button(/^Cancel import$/)); await steady();
      if (dialog()) { click(inDialog(/^Cancel$/)); await steady(); }
      reading = false;
    });
  };
  if (liveFile) await readJob('readLinks', 'Links', async () => type(dialog().querySelector('textarea'), LIVE_URLS.join('\n')));
  await readJob('readPages', 'Pages', async () => {
    give('input[type=file][multiple]', [new win.File([fs.readFileSync(SAVED_PAGE)], 'titian.mht')]);
    await until(() => /Titian/.test(text()));
  });
  await readJob('readPaste', 'Paste', async () => {
    type(doc.querySelector('input[aria-label="Link"]'), PASTE_URL);
    type(doc.querySelector('textarea[aria-label="Text"]'), PASTE_TEXT);
  });

  screens.consoleErrors = shouted.join('\n');
  fs.writeFileSync(outFile, JSON.stringify({ values, plain, kinds, screens, missed }));
  root.unmount();
  process.exit(0);
}

// ── compare two versions ────────────────────────────────────────────────────
function firstDifference(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { at: i, old: a.slice(Math.max(0, i - 60), i + 100), now: b.slice(Math.max(0, i - 60), i + 100) };
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
  // Both versions run at once; each in its own process, so neither sees the other's clock or store.
  const runOne = (f, k) => new Promise(resolve => {
    const out = path.join(tmp, k + '.json');
    const child = spawn(process.execPath, [__filename, '--snapshot', f, out].concat(liveFile ? [liveFile] : []), { cwd: ROOT });
    let said = '';
    child.stdout.on('data', d => { said += d; }); child.stderr.on('data', d => { said += d; });
    const stop = setTimeout(() => child.kill(), 480000);
    child.on('close', status => {
      clearTimeout(stop);
      const who = k ? 'new' : 'old';
      if (status !== 0 || !fs.existsSync(out)) {
        console.log('FAIL  the ' + who + ' version could not be run: ' + said.slice(-800));
        process.exit(1);
      }
      if (said.trim()) console.log(said.trim().split('\n').map(l => '      (' + who + ') ' + l).join('\n'));
      resolve(JSON.parse(fs.readFileSync(out, 'utf8')));
    });
  });
  const snaps = await Promise.all([runOne(oldFile, 0), runOne(newFile, 1)]);
  const [o, n] = snaps;
  const names = [...new Set([...Object.keys(o.values), ...Object.keys(n.values)])];
  let compared = 0, fnSkipped = 0;
  for (const k of names) {
    const inO = k in o.values, inN = k in n.values;
    if (changesAllowed) {
      if (!inO || !inN) {
        const kind = inO ? o.kinds[k] : n.kinds[k];
        if (kind === 'function') { console.log(`NOTE  value ${k}: a function only in the ${inO ? 'old' : 'new'} version (allowed)`); continue; }
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
  const valueDiffs = diffs;
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
  if (!/proposed change/.test(o.screens.review || '')) { diffs++; console.log('FAIL  the review screen never opened — the check did not run'); }
  console.log(diffs ? `SIDE BY SIDE: ${diffs} difference(s)${valueDiffs ? ` (${valueDiffs} in values)` : ''}.` : 'SIDE BY SIDE: identical.');
  process.exit(diffs ? 1 : 0);
}

const args = process.argv.slice(2);
const flags = { changesAllowed: args.includes('--changes-allowed'), live: args.includes('--live') };
const rest = args.filter(a => a !== '--changes-allowed' && a !== '--live');
if (rest[0] === '--fetch-live') fetchLive(rest[1]).then(() => process.exit(0), e => { console.log(String(e && e.message || e)); process.exit(1); });
else if (rest[0] === '--snapshot') snapshot(rest[1], rest[2], rest[3]).catch(e => { console.log(String(e && e.stack || e)); process.exit(1); });
else if (rest[0] === '--base') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-'));
  const old = path.join(tmp, 'old.jsx');
  fs.writeFileSync(old, execFileSync('git', ['show', rest[1] + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 64 << 20 }));
  run(old, path.join(ROOT, 'Cat_Watch.jsx'), flags);
} else if (rest.length === 2) run(path.resolve(rest[0]), path.resolve(rest[1]), flags);
else { console.log('usage: node build/side_by_side.js <old.jsx> <new.jsx> | --base <git ref>  [--changes-allowed] [--live]'); process.exit(2); }
