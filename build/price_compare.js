#!/usr/bin/env node
/*
 * price_compare.js — the proof for "one price rule" (docs/restructure.md, the fixes after item 4).
 * The shop finder and the catalogue lookup each decided "is this a price?" their own way; one rule
 * replaces them. This reads live shop pages under the old rules and the new one and prints every
 * difference, to be read line by line: each must be right in the real world.
 *
 *   node build/price_compare.js --fetch <dir>
 *       every venue's catalogue shelf (venues/register.js) and every right shop on the two standing
 *       check lists, fetched live and whole through the free Parallel server into <dir>.
 *   node build/price_compare.js --old <tree> --new <tree> <dir> [<dir> …]
 *       every page in the folders (as --fetch saves them, or as `scraper/shop_check.js --save=` does):
 *       each line under the old tests and the new, and what the finder and the lookup make of the page.
 *
 * Live only, never committed pages (her decision, docs/testing.md).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAll(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const { VENUES } = require(path.join(ROOT, 'venues', 'register.js'));
  const urls = new Map();
  const add = (u, who) => { if (u && /^https?:/.test(u) && !urls.has(u)) urls.set(u, who); };
  for (const v of Object.values(VENUES)) { add(v.shop && v.shop.catalogues, v.id); add(v.filed && v.filed.shopCatalogues, v.id); }
  for (const f of ['shop_check.json', 'gallery_shop_check.json']) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', f), 'utf8'));
    for (const v of j.venues || j.galleries || []) {
      add(v.shop, v.key); for (const a of v.also || []) add(a, v.key);
      const settled = (v.lastGood || []).filter(s => s.pick).pop(); if (settled) add(settled.pick, v.key);
    }
  }
  const EP = 'https://search.parallel.ai/mcp', H = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  let sid = null, rid = 1;
  const rpc = async body => {
    const r = await fetch(EP, { method: 'POST', headers: { ...H, ...(sid ? { 'Mcp-Session-Id': sid } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    const t = await r.text(); let j = null;
    try { j = JSON.parse(t); } catch { const m = t.match(/^data: (.*)$/m); if (m) j = JSON.parse(m[1]); }
    sid = r.headers.get('mcp-session-id') || sid; return j;
  };
  await rpc({ jsonrpc: '2.0', id: rid++, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cw-price-compare', version: '1' } } });
  await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  let n = 0;
  for (const [url, who] of urls) {
    const file = path.join(dir, String(++n).padStart(3, '0') + '-' + who.replace(/[^a-z0-9-]/gi, '_') + '.json');
    if (fs.existsSync(file)) continue;
    let page = null, note = '';
    for (let i = 0; i < 6 && !page; i++) {
      let j; try { j = await rpc({ jsonrpc: '2.0', id: rid++, method: 'tools/call', params: { name: 'web_fetch', arguments: { urls: [url], full_content: true, session_id: 'cwpricecompare' + '0'.repeat(20) } } }); } catch (e) { note = String(e.message || e); await sleep(5000); continue; }
      const msg = JSON.stringify((j && j.error) || '');
      if (/rate limit/i.test(msg)) { console.log('  (free tier\'s limit — waiting 120s)'); await sleep(120000); continue; }
      if (j && j.error) { note = msg.slice(0, 200); break; }
      const c = (((j || {}).result || {}).content || []).find(x => x.type === 'text');
      let p = null; try { p = c ? JSON.parse(c.text) : null; } catch { note = 'reply not JSON'; }
      page = p && (p.results || [])[0]; if (!page) { note = note || 'no page in the reply'; break; }
    }
    const text = page ? String(page.full_content || (page.excerpts || []).join('\n') || '') : '';
    fs.writeFileSync(file, JSON.stringify({ who, url, title: page && page.title, full_content: text, note }, null, 1));
    console.log(`${String(n).padStart(3)} ${who.padEnd(22)} ${String(text.length).padStart(7)} chars  ${url}${text ? '' : '   — NOT READ: ' + note}`);
  }
}

function compare(oldTree, newTree, dirs) {
  const load = require(path.join(ROOT, 'scraper', 'claude_read_check', 'load.js'));
  const NAMES = ['PRICE', 'PRICE_ONE', 'PRICE_ON_PAGE', 'GALLERY_PRICE', 'realPrice', 'hasPrice', 'foldText', 'looksLikeBookShelf', 'looksLikeOneBook', 'booksSeenOn', 'galleryBookPage', 'hostOf'];
  const lift = tree => load(path.join(tree, 'Cat_Watch.jsx'), NAMES.map(n => `${n}:typeof ${n}!=="undefined"?${n}:null`), {});
  const A = lift(oldTree), B = lift(newTree);
  if (!B.hasPrice) { console.error('The new tree has no hasPrice: nothing to compare.'); process.exit(2); }
  const re = (r, s) => !!r && new RegExp(r.source, r.flags.replace('g', '')).test(s);
  // Each old test, as its own code asked it of one line.
  const OLD = {
    'finder, a book\'s price (realPrice)': l => A.realPrice(l),
    'finder, a link\'s price (PRICE_ONE)': l => re(A.PRICE_ONE, l),
    'finder, shelf count (PRICE on folded text)': l => re(A.PRICE, A.foldText(l)),
    'lookup, whole page (PRICE_ON_PAGE)': l => re(A.PRICE_ON_PAGE, l),
    'gallery (GALLERY_PRICE on folded text)': l => re(A.GALLERY_PRICE, A.foldText(l)),
  };
  const pages = [];
  for (const d of dirs) for (const f of fs.readdirSync(d).filter(f => /\.json$/.test(f)).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    if (typeof j.full_content === 'string') pages.push({ from: f, url: j.url, text: j.full_content });
    else for (const r of ((j.payload || {}).results || [])) pages.push({ from: f, url: r.url, text: [r.full_content || '', (r.excerpts || []).join('\n')].filter(Boolean).join('\n') });
  }
  let differing = 0, read = 0;
  const seenLine = new Set();
  for (const p of pages) {
    if (!p.text) continue; read++;
    const out = [];
    const lines = p.text.split('\n');
    for (const raw of lines) {
      const l = raw.trim(); if (!l || !/\d/.test(l)) continue;
      const now = !!B.hasPrice(l);
      const was = Object.entries(OLD).map(([k, f]) => [k, !!f(l)]);
      const changed = was.filter(([, v]) => v !== now);
      if (!changed.length) continue;
      const sig = l.slice(0, 160) + '|' + now + '|' + changed.map(c => c[0]).join(',');
      if (seenLine.has(sig)) continue; seenLine.add(sig);
      out.push(`    ${now ? 'NOW A PRICE ' : 'NOT A PRICE '} ${JSON.stringify(l.slice(0, 150))}\n        changed for: ${changed.map(c => c[0]).join('; ')}`);
    }
    const host = (A.hostOf || B.hostOf)(p.url || '');
    const pageLevel = [
      ['finder: looks like a shelf of books', () => [A.looksLikeBookShelf(p.text), B.looksLikeBookShelf(p.text)]],
      ['finder: looks like one book', () => [A.looksLikeOneBook(p.text), B.looksLikeOneBook(p.text)]],
      ['finder: books seen on the page', () => [A.booksSeenOn(p.text, host, true).map(b => b.path), B.booksSeenOn(p.text, host, true).map(b => b.path)]],
      ['finder and lookup: some line holds a real price', () => [lines.some(A.realPrice), lines.some(B.realPrice || B.hasPrice)]],
      ['lookup: a price anywhere on the page', () => [re(A.PRICE_ON_PAGE, p.text), B.PRICE_ON_PAGE ? re(B.PRICE_ON_PAGE, p.text) : lines.some(l => B.hasPrice(l))]],
      ['gallery: a book\'s own page', () => [A.galleryBookPage(p.text), B.galleryBookPage(p.text)]],
    ];
    for (const [name, f] of pageLevel) {
      let a, b; try { [a, b] = f(); } catch (e) { out.push(`    PAGE  ${name}: THROWS ${e.message}`); continue; }
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      if (Array.isArray(a)) { const gone = a.filter(x => !b.includes(x)), come = b.filter(x => !a.includes(x)); out.push(`    PAGE  ${name}: ${a.length} → ${b.length}${gone.length ? '\n        gone: ' + gone.slice(0, 12).join('  ') : ''}${come.length ? '\n        new:  ' + come.slice(0, 12).join('  ') : ''}`); }
      else out.push(`    PAGE  ${name}: ${a} → ${b}`);
    }
    if (out.length) { differing++; console.log(`\n${p.url}   (${p.from})\n${out.join('\n')}`); }
  }
  console.log(`\n${read} pages read, ${differing} with a difference.`);
}

(async () => {
  if (opt('--fetch')) return fetchAll(path.resolve(opt('--fetch')));
  const dirs = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
  if (!opt('--old') || !opt('--new') || !dirs.length) { console.error('usage: see the top of this file'); process.exit(2); }
  compare(path.resolve(opt('--old')), path.resolve(opt('--new')), dirs.map(d => path.resolve(d)));
})();
