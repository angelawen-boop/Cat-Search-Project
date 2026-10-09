#!/usr/bin/env node
/*
 * link_vs_sweep.js — how closely "Add by link" reproduces the scraper's rows. Offline, read-only.
 *
 * Takes show pages already saved on disk, turns each into what the Parallel web_fetch
 * connector would return ({url, title, full_content}), runs the app's own readShowPage and
 * linkTitle (lifted from Cat_Watch.jsx, never copied), and compares title and dates with the
 * scraper's row for the same address. The model's subtitle is not reproduced: the code-only
 * title is linkTitle(base, "", between), and `between` shows what a model could have picked.
 *
 *   node scraper/link_vs_sweep.js [--out <file.md>] [--json <file.json>]
 *
 * Inputs: scraper/output/pages_kept/<venue>/*.html.gz, show pages in docs/*_pages/,
 * docs/link_pages/jacquemart_*.json. Truth: newest stitch, else newest run (sweep CSVs).
 * The HTML-to-text converter is a calibrated guess (see toParallel), not Parallel itself.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const OUT_DIR = path.join(__dirname, 'output');
const DOCS = path.join(ROOT, 'docs');
const argv = process.argv.slice(2);
const argOf = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const MD_OUT = argOf('--out') || '/tmp/claude-0/-home-user-Cat-Search-Project/af9eb123-8a0d-528b-b32e-53d55c8a301f/scratchpad/link_vs_sweep.md';
const JSON_OUT = argOf('--json');
const DUMP = argOf('--dump'); // print the converted text round the heading of pages whose address matches this regex

// ── The app's own functions, lifted by transpiling the JSX as the fixtures do ─────────
function liftApp() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-lvs-'));
  const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + fs.readFileSync(JSX, 'utf8')
        .replace(/^import React.*$/m, '')
        .replace(/^export default function App\(\)\{/m, 'function App(){');
  fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
  try {
    execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
      '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
  } catch { /* the emit is what matters */ }
  const built = path.join(tmp, 'app.js');
  if (!fs.existsSync(built)) throw new Error('the page did not transpile');
  const code = fs.readFileSync(built, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  const React = require('react');
  const win = { document: {}, localStorage: {}, claude: { use: async () => null } };
  return new Function('React', 'window', 'document', 'localStorage',
    code + '\n;return { readShowPage, linkTitle, normalizeUrlKey, csvParse, knownVenueFor, VENUE_SITES, hostOf, foldText };')(
    React, win, win.document, win.localStorage);
}

// ── HTML → what Parallel returns ──────────────────────────────────────────────────────
// Calibrated on docs/link_pages/dia_*.json (the connector's answers byte for byte): headings
// as "# ", links as [words](href), bullets as "* ", _italic_, **bold**, blank line between
// blocks, nav and cookie text kept, images gone but their alt text left as a line.
// Guesses: hard break as two spaces + newline, tables as "a | b" lines, a link wrapping blocks
// loses its brackets, hidden-until-clicked text is dropped only when marked hidden.
// Unknown: a heading holding <br> or <p> children (Orsay, MoMA). `mode` plays three guesses:
//   flat   — one heading line, the parts joined by a space (default)
//   split  — the heading ends at the break; the rest follows as plain lines
//   joined — one heading line, the parts run together with nothing between
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'svg', 'iframe', 'canvas', 'object', 'embed', 'link', 'meta']);
const BLOCK = new Set(('address article aside blockquote body caption dd details dialog div dl dt fieldset figcaption figure '
  + 'footer form h1 h2 h3 h4 h5 h6 header hgroup hr li main menu nav ol p pre section summary table tbody thead tfoot tr ul').split(' '));

function toParallel(html, url, JSDOM, mode) {
  const { VirtualConsole } = require('jsdom');
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
  const doc = dom.window.document;
  const title = (doc.title || '').replace(/\s+/g, ' ').trim();
  const out = [];
  let buf = '', prefix = '', inHead = false;
  const flush = () => {
    const t = buf.replace(/[ \t\r\n\f ]+/g, ' ').replace(/ ?\u0001 ?/g, '  \n ').trim();
    if (t) { out.push(prefix + t); prefix = ''; } else if (!inHead) prefix = '';
    buf = '';
  };
  const hidden = el => el.hasAttribute('hidden') || /display\s*:\s*none/i.test(el.getAttribute('style') || '');
  const inline = (el, sep = ' ') => { // the words of an element, flattened; `sep` stands in for a break
    let s = '';
    for (const c of el.childNodes) {
      if (c.nodeType === 3) s += c.data;
      else if (c.nodeType === 1 && !SKIP.has(c.tagName.toLowerCase()) && !hidden(c)) {
        const t = c.tagName.toLowerCase();
        if (t === 'br') s += sep;
        else if (t === 'img') s += c.getAttribute('alt') || '';
        else if (BLOCK.has(t)) s += sep + inline(c, sep) + sep;
        else s += inline(c, sep);
      }
    }
    return s.replace(/\s+/g, ' ').trim();
  };
  const hasBlock = el => !!el.querySelector([...BLOCK].join(','));
  function walk(node, depth) {
    if (node.nodeType === 3) { buf += node.data; return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (SKIP.has(tag) || hidden(node)) return;
    if (tag === 'br') { if (inHead) flush(); else buf += '\u0001'; return; }
    if (tag === 'img') {
      const alt = (node.getAttribute('alt') || '').trim();
      flush(); if (alt) out.push(alt); return;
    }
    if (tag === 'a' && !hasBlock(node)) {
      const href = node.getAttribute('href');
      const t = inline(node);
      buf += href ? '[' + t + '](' + href + ')' : t;
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      flush(); prefix = '#'.repeat(+tag[1]) + ' ';
      if (mode === 'split') {
        inHead = true; for (const c of node.childNodes) walk(c, depth); inHead = false; flush(); return;
      }
      buf += inline(node, mode === 'joined' ? '' : ' ').replace(/\|/g, '\\|'); flush(); return;
    }
    if (tag === 'em' || tag === 'i') { const t = inline(node); buf += t ? '_' + t + '_' : ''; return; }
    if (tag === 'strong' || tag === 'b') { const t = inline(node); buf += t ? '**' + t + '**' : ''; return; }
    if (tag === 'td' || tag === 'th') { buf += ' ' + inline(node) + ' | '; return; }
    const block = BLOCK.has(tag);
    const list = tag === 'ul' || tag === 'ol';
    if (block) flush();
    if (tag === 'li') prefix = '  '.repeat(Math.max(0, depth - 1)) + (depth % 2 ? '* ' : '+ ');
    for (const c of node.childNodes) walk(c, list ? depth + 1 : depth);
    if (block) flush();
  }
  walk(doc.body || doc.documentElement, 0);
  flush();
  return { url, title, full_content: out.join('\n\n') };
}

// ── Saved pages: .html, .html.gz, .mhtml ──────────────────────────────────────────────
function qpDecode(s) {
  const b = [];
  s = s.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { b.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else b.push(s.charCodeAt(i) & 255);
  }
  return Buffer.from(b);
}
function mhtmlParts(buf) {
  const s = buf.toString('latin1');
  const bm = s.match(/boundary="?([^";\r\n]+)"?/i);
  if (!bm) return { html: null, loc: null };
  const loc = (s.match(/^Content-Location:\s*(\S+)/mi) || [])[1] || null;
  for (const part of s.split('--' + bm[1])) {
    const cut = part.search(/\r?\n\r?\n/);
    if (cut < 0) continue;
    const head = part.slice(0, cut).replace(/\r?\n[ \t]+/g, ' ');
    if (!/Content-Type:\s*text\/html/i.test(head)) continue;
    const body = part.slice(cut).replace(/^\r?\n\r?\n/, '');
    const enc = (head.match(/Content-Transfer-Encoding:\s*(\S+)/i) || [])[1] || '';
    const cs = (head.match(/charset="?([\w-]+)/i) || [])[1] || 'utf-8';
    const bytes = /quoted/i.test(enc) ? qpDecode(body) : /base64/i.test(enc) ? Buffer.from(body.replace(/\s+/g, ''), 'base64') : Buffer.from(body, 'latin1');
    let html;
    try { html = new TextDecoder(cs).decode(bytes); } catch { html = bytes.toString('utf8'); }
    return { html, loc };
  }
  return { html: null, loc };
}
function readSaved(file) {
  let buf = fs.readFileSync(file);
  if (file.endsWith('.gz')) buf = zlib.gunzipSync(buf);
  if (/\.mhtml$/i.test(file)) return mhtmlParts(buf);
  return { html: buf.toString('utf8'), loc: null };
}
// The page's own address: canonical, else og:url, resolved against the host.
function addressIn(html, hint) {
  const pick = re => { const m = html.match(re); return m ? m[1] : null; };
  const c = pick(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i) || pick(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const o = pick(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)/i) || pick(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
  const u = c || o;
  if (!u) return null;
  try { return new URL(u, hint || undefined).href; } catch { return null; }
}

// ── The inputs ───────────────────────────────────────────────────────────────────────
// Addresses for saved pages that carry none (cincinnati: scraper/fixtures/cincinnati_pages.js;
// mad: scraper/fixtures/page_keep_pages.js; andam: its row in the stitched file).
const CAM = 'https://www.cincinnatiartmuseum.org/art/exhibitions';
const ADDRESS_FOR = {
  'cincinnati_pages/show_current_rexroth.html': CAM + '/nancy-rexroth-secrets-of-my-power/',
  'cincinnati_pages/show_upcoming_harper.html': CAM + '/upcoming-exhibitions/the-art-of-charley-harper-creatures-wild-and-tame/',
  'cincinnati_pages/show_archive_tintoretto.html': CAM + '/exhibition-archive/2025/tintorettos-genesis/',
  'cincinnati_pages/show_special_you_and_me.html': CAM + '/special-features/you-and-me-and-the-space-between-our-expedition-starts-now/',
  'cincinnati_pages/show_archive_discovering_ansel_adams.html': CAM + '/exhibition-archive/2024/discovering-ansel-adams/',
  'cincinnati_pages/show_archive_modern_and_contemporary_craft.html': CAM + '/exhibition-archive/2024/modern-and-contemporary-craft/',
  'mad_pages/exhibition_luxury_china.html': 'https://madparis.fr/luxury-china',
  'mad_pages/exhibition_fashion_design_jewellery.html': 'https://madparis.fr/fashion-design-jewellery',
  'mad_pages/sweep_2026-09-27/andam.html.gz': 'https://madparis.fr/Mode-nouvelles-generations-35-ans-de-L-ANDAM-2483',
};
// Show pages in docs/*_pages (the READMEs say which files are listings: those are left out).
const DOC_SHOW_PAGES = [
  'artic_pages/show_*.mhtml', 'ashmolean_pages/exhibition_*.html', 'ashmolean_pages/display_*.html',
  'ashmolean_pages/raw/*_raw.html', 'ashmolean_pages/sweep_2026-09-27/*.html.gz', 'brera_pages/*.html',
  'brit_pages/exhibition_*.html', 'cincinnati_pages/show_*.html', 'khm_pages/head_*.html', 'khm_pages/prime_*.html',
  'mad_pages/exhibition_*.html', 'mad_pages/sweep_2026-09-27/*.html.gz', 'moma_pages/exhibition_*',
  'morgan_pages/exhibition_*.mhtml', 'ng_pages/renoir_*.html', 'ng_pages/van_eyck_*.html',
  'orsay_pages/exhibition_*.html', 'rijks_pages/*.html', 'summary_pages/*.html', 'tate_pages/light_and_magic.html',
];
function globOne(pattern) {
  const dir = path.join(DOCS, path.dirname(pattern));
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp('^' + path.basename(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return fs.readdirSync(dir).filter(f => re.test(f) && fs.statSync(path.join(dir, f)).isFile()).sort().map(f => path.join(dir, f));
}

function collectInputs(app, JSDOM) {
  const inputs = [];
  const add = (source, venueHint, file, res) => inputs.push({ source, venueHint, file, res });
  // 1. pages the scraper kept
  const keptRoot = path.join(OUT_DIR, 'pages_kept');
  for (const v of fs.existsSync(keptRoot) ? fs.readdirSync(keptRoot).sort() : []) {
    for (const f of fs.readdirSync(path.join(keptRoot, v)).filter(x => x.endsWith('.json')).sort()) {
      const meta = JSON.parse(fs.readFileSync(path.join(keptRoot, v, f), 'utf8'));
      const gz = path.join(keptRoot, v, f.replace(/\.json$/, '.html.gz'));
      if (!meta.url || !fs.existsSync(gz)) continue;
      add('pages_kept', v, path.relative(ROOT, gz), { lazy: () => ({ url: meta.url, html: readSaved(gz).html }), changes: meta.changes || {}, outcome: meta.outcome });
    }
  }
  // 2. her saved show pages
  for (const pat of DOC_SHOW_PAGES) {
    for (const file of globOne(pat)) {
      const rel = path.relative(DOCS, file);
      add('docs', null, path.relative(ROOT, file), { lazy: () => {
        const { html, loc } = readSaved(file);
        const url = ADDRESS_FOR[rel] || loc || addressIn(html, null);
        if (!url) return { noAddress: true };
        return { url, html };
      } });
    }
  }
  // 3. real Parallel outputs of a known venue
  for (const file of globOne('link_pages/jacquemart_*.json')) {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    add('link_pages', 'jacquemart', path.relative(ROOT, file), { lazy: () => ({ url: d.url, res: d }) });
  }
  return inputs;
}

// ── The truth: the scraper's rows ────────────────────────────────────────────────────
function newestFirst(prefix) {
  return fs.readdirSync(OUT_DIR).filter(d => d.startsWith(prefix) && fs.statSync(path.join(OUT_DIR, d)).isDirectory()).sort().reverse();
}
function truthIndex(app) {
  const idx = new Map(); // key → [{row, source}], newest source first
  const norm = u => app.normalizeUrlKey(u).replace(/(?<!:)\/{2,}/g, '/');
  const load = (file, label) => {
    if (!fs.existsSync(file)) return false;
    const rows = app.csvParse(fs.readFileSync(file, 'utf8'));
    const head = rows[0] || [];
    for (const r of rows.slice(1)) {
      const o = {}; head.forEach((h, i) => { o[h] = r[i]; });
      if (!o.url || !o.title) continue;
      const k = norm(o.url);
      if (!k) continue;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push({ row: o, source: label });
    }
    return true;
  };
  for (const d of newestFirst('stitch_')) {
    if (!load(path.join(OUT_DIR, d, 'sweep_compressed.csv'), d + '/sweep_compressed.csv')) load(path.join(OUT_DIR, d, 'sweep.csv'), d + '/sweep.csv');
  }
  for (const d of newestFirst('run_')) {
    const dir = path.join(OUT_DIR, d);
    if (!load(path.join(dir, 'sweep.csv'), d + '/sweep.csv')) {
      for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.csv')).sort()) load(path.join(dir, f), d + '/' + f);
    }
  }
  return { find: u => idx.get(norm(u)) || null, size: idx.size };
}

// ── Comparison ───────────────────────────────────────────────────────────────────────
const squash = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
function titleVerdict(link, sweep) {
  if (link === sweep) return 'exact';
  if (squash(link) === squash(sweep)) return 'capitals';
  return 'wrong';
}
// Could a model have got it right? The sweep title is one of the lines between the heading and
// the dates, or the base joined with one of them.
function modelCould(app, page, sweepTitle) {
  const same = t => squash(t) === squash(sweepTitle);
  const hit = (page.between || []).find(l => same(l));
  if (hit) return 'line';
  const join = (page.between || []).find(l => same(app.linkTitle(page.base, l, page.between)));
  return join ? 'base+line' : '';
}
// How the wrong title differs, for grouping.
const letters = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function shape(app, link, sweep) {
  const S = letters(sweep), L = letters(link);
  if (/ - (du|from) .*\d{4}$/.test(link)) return 'tab title carries " - du … au …" dates';
  if (/[A-Z]/.test(link) && link === link.toUpperCase()) return 'ALL CAPITALS' + (L === S ? ' (same words)' : ', words missing or different');
  if (/^Exhibition /.test(link) && !/^Exhibition /.test(sweep)) return '"Exhibition " prefix' + (letters(link.replace(/^Exhibition /, '')) === S ? ' (rest differs by punctuation only)' : ' and more differs');
  if (/ exhibition$/i.test(link) && !/ exhibition$/i.test(sweep)) return 'tab title ends "exhibition"';
  if (L === S) return 'punctuation only (colon between title and subtitle missing, or a quote mark)';
  if (L.includes(S)) return 'link longer (carries extra words)';
  if (S.includes(L)) return 'link shorter (part of the name missing)';
  return 'different words';
}

function main() {
  const app = liftApp();
  const { JSDOM } = require('jsdom');
  const truth = truthIndex(app);
  const inputs = collectInputs(app, JSDOM);
  const seen = new Set();
  const recs = [];
  let dupes = 0;
  const noAddress = [];
  const MODES = ['flat', 'split', 'joined'];
  // One page → the measurements for one conversion.
  function measure(res, hit, changes, mode) {
    const rec = { tabTitle: res.title, chars: (res.full_content || '').length };
    if (DUMP && mode === 'flat' && new RegExp(DUMP).test(res.url)) {
      const ls = res.full_content.split('\n');
      const h = Math.max(0, ls.findIndex(l => /^\s*#\s+\S/.test(l)));
      console.error('--- ' + res.url + '\nTITLE: ' + res.title + '\n' + ls.slice(Math.max(0, h - 4), h + 24).join('\n') + '\n---');
    }
    const page = app.readShowPage(res, res.url);
    rec.refused = page.ok ? '' : page.why;
    rec.firstH1 = ((res.full_content || '').split('\n').find(l => /^\s*#\s+\S/.test(l)) || '').slice(0, 120);
    if (page.ok) {
      rec.base = page.base; rec.between = page.between; rec.under = page.under;
      rec.linkTitle = app.linkTitle(page.base, '', page.between);
      rec.linkStart = page.start; rec.linkEnd = page.end;
    }
    if (hit) {
      rec.truthSource = hit[0].source; rec.sweepTitle = hit[0].row.title;
      rec.sweepStart = hit[0].row.start_date || ''; rec.sweepEnd = hit[0].row.end_date || '';
      const other = hit.filter(h => h.row.title !== hit[0].row.title || (h.row.start_date || '') !== rec.sweepStart || (h.row.end_date || '') !== rec.sweepEnd);
      rec.truthVaries = other.map(h => h.source + ': ' + h.row.title + ' ' + (h.row.start_date || '') + '→' + (h.row.end_date || ''));
    } else if (changes.title || changes.start_date || changes.end_date) {
      rec.truthSource = 'pages_kept changes (partial)'; rec.sweepTitle = changes.title || '';
      rec.sweepStart = changes.start_date || ''; rec.sweepEnd = changes.end_date || ''; rec.partial = true;
    }
    if (rec.truthSource && page.ok) {
      rec.titleVerdict = rec.sweepTitle ? titleVerdict(rec.linkTitle, rec.sweepTitle) : 'unknown';
      rec.datesRight = rec.linkStart === rec.sweepStart && rec.linkEnd === rec.sweepEnd;
      if (rec.titleVerdict === 'wrong') { rec.could = modelCould(app, page, rec.sweepTitle); rec.shape = shape(app, rec.linkTitle, rec.sweepTitle); }
    }
    return rec;
  }
  for (const inp of inputs) {
    let src;
    try { src = inp.res.lazy(); } catch (e) { recs.push({ venue: inp.venueHint || '?', file: inp.file, error: String(e.message).slice(0, 120) }); continue; }
    if (src.noAddress) { noAddress.push(inp.file); continue; }
    const key = app.normalizeUrlKey(src.url);
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    const venue = app.knownVenueFor(src.url) || inp.venueHint || '(outside the 28) ' + app.hostOf(src.url);
    const hit = truth.find(src.url);
    const per = {};
    for (const m of MODES) {
      if (src.res && m !== 'flat') continue; // a real Parallel output has one shape
      per[m] = measure(src.res || toParallel(src.html, src.url, JSDOM, m), hit, inp.res.changes || {}, m);
    }
    const rec = Object.assign({ venue, url: src.url, file: inp.file, source: inp.source }, per.flat);
    rec.alt = {};
    for (const m of MODES.slice(1)) {
      const a = per[m] || per.flat;
      rec.alt[m] = { refused: a.refused, titleVerdict: a.titleVerdict || '', datesRight: a.datesRight, linkTitle: a.linkTitle, could: a.could || '' };
    }
    recs.push(rec);
  }

  // ── Report ──
  const L = [];
  const p = s => L.push(s);
  const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const venues = [...new Set(recs.map(r => r.venue))].sort();
  p('# Add by link vs the scraper — offline');
  p('');
  p('Code-only title = `linkTitle(base, "", between)`; the model\'s subtitle is not reproduced. Pages converted by `toParallel` (a guess at Parallel\'s text).');
  p('Pages measured: ' + recs.filter(r => !r.error).length + ' · duplicates by address skipped: ' + dupes + ' · saved pages with no address: ' + noAddress.length + ' · truth addresses indexed: ' + truth.size);
  p('');
  p('| venue | pages | refused | no truth | measurable | title exact | capitals only | title wrong | dates right |');
  p('|---|---|---|---|---|---|---|---|---|');
  const tot = { pages: 0, refused: 0, nt: 0, m: 0, ex: 0, cap: 0, wr: 0, dr: 0 };
  for (const v of venues) {
    const rs = recs.filter(r => r.venue === v && !r.error);
    const refused = rs.filter(r => r.refused).length;
    const nt = rs.filter(r => !r.refused && !r.truthSource).length;
    const ms = rs.filter(r => !r.refused && r.truthSource && r.sweepTitle);
    const ex = ms.filter(r => r.titleVerdict === 'exact').length, cap = ms.filter(r => r.titleVerdict === 'capitals').length, wr = ms.filter(r => r.titleVerdict === 'wrong').length;
    const dr = ms.filter(r => r.datesRight).length;
    p(`| ${v} | ${rs.length} | ${refused} | ${nt} | ${ms.length} | ${ex} | ${cap} | ${wr} | ${dr} |`);
    tot.pages += rs.length; tot.refused += refused; tot.nt += nt; tot.m += ms.length; tot.ex += ex; tot.cap += cap; tot.wr += wr; tot.dr += dr;
  }
  p(`| **all** | ${tot.pages} | ${tot.refused} | ${tot.nt} | ${tot.m} | ${tot.ex} | ${tot.cap} | ${tot.wr} | ${tot.dr} |`);
  p('');
  p('"measurable" = read, and a scraper row with a title found. Title and dates are counted over that.');

  // How much the unknown heading shape (see toParallel) moves the result: pages that have a scraper row.
  p('');
  p('### Sensitivity to the heading shape (pages with a scraper row; refused / title exact-or-capitals / title wrong (of those a model could fix) / dates right)');
  p('');
  p('| venue | pages | flat (default) | split | joined |');
  p('|---|---|---|---|---|');
  const cell = (rs, get) => {
    const ref = rs.filter(r => get(r).refused).length;
    const ok = rs.filter(r => !get(r).refused && ['exact', 'capitals'].includes(get(r).titleVerdict)).length;
    const wrs = rs.filter(r => !get(r).refused && get(r).titleVerdict === 'wrong');
    const dr = rs.filter(r => !get(r).refused && get(r).datesRight).length;
    return `${ref} / ${ok} / ${wrs.length} (${wrs.filter(r => get(r).could).length}) / ${dr}`;
  };
  const withRow = recs.filter(r => !r.error && r.truthSource && r.sweepTitle);
  for (const v of [...venues.filter(v => withRow.some(r => r.venue === v)), null]) {
    const rs = v ? withRow.filter(r => r.venue === v) : withRow;
    p(`| ${v || '**all**'} | ${rs.length} | ${cell(rs, r => r)} | ${cell(rs, r => r.alt.split)} | ${cell(rs, r => r.alt.joined)} |`);
  }

  const wrongT = recs.filter(r => r.titleVerdict === 'wrong');
  const wrongD = recs.filter(r => r.titleVerdict && r.titleVerdict !== 'unknown' && !r.datesRight && r.titleVerdict !== 'wrong');
  const mismatch = recs.filter(r => r.titleVerdict === 'wrong' || (r.titleVerdict && r.titleVerdict !== 'unknown' && !r.datesRight));
  p('');
  p('## Mismatches (title wrong, or dates differ)');
  p('');
  p('"model could" = the scraper\'s title is one of the lines between heading and dates (`line`), or the base joined to one (`base+line`).');
  p('');
  p('| venue | address | link title | sweep title | link dates | sweep dates | model could | truth |');
  p('|---|---|---|---|---|---|---|---|');
  for (const r of mismatch) {
    p(`| ${r.venue} | ${esc(r.url)} | ${esc(r.linkTitle)}${r.titleVerdict === 'capitals' ? ' (capitals only)' : ''} | ${esc(r.sweepTitle)} | ${r.linkStart || '—'} → ${r.linkEnd || '—'} | ${r.sweepStart || '—'} → ${r.sweepEnd || '—'} | ${r.could || ''} | ${esc(r.truthSource)} |`);
  }
  p('');
  p('Title wrong: ' + wrongT.length + ' · dates wrong with title right or capitals-only: ' + wrongD.length);
  p('');
  p('### Wrong titles by shape');
  p('');
  p('| shape | pages | venues | a model could fix |');
  p('|---|---|---|---|');
  const by = {};
  for (const r of wrongT) (by[r.shape] = by[r.shape] || []).push(r);
  for (const [k, rs] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
    const vs = {}; for (const r of rs) vs[r.venue] = (vs[r.venue] || 0) + 1;
    p(`| ${k} | ${rs.length} | ${Object.entries(vs).map(([v, n]) => v + ' ' + n).join(', ')} | ${rs.filter(r => r.could).length} |`);
  }
  p('');
  p('Wrong titles a model could have fixed: ' + wrongT.filter(r => r.could).length + ' of ' + wrongT.length);

  p('');
  p('## Refused');
  p('');
  const ref = recs.filter(r => r.refused);
  if (!ref.length) p('none');
  for (const r of ref) p(`- ${r.venue} · ${r.url} · ${r.refused} (${r.chars} chars; first heading: ${r.firstH1 || 'none'})`);

  p('');
  p('## No scraper row for the address');
  p('');
  const nt = recs.filter(r => !r.refused && !r.error && !r.truthSource);
  if (!nt.length) p('none');
  for (const r of nt) p(`- ${r.venue} · ${r.url} · link title "${r.linkTitle}" · ${r.linkStart || '—'} → ${r.linkEnd || '—'}`);
  const partial = recs.filter(r => r.partial);
  if (partial.length) p('\nTruth from a page correction only (no CSV row): ' + partial.length);
  const varies = recs.filter(r => r.truthVaries && r.truthVaries.length);
  p('');
  p('## Addresses whose scraper row differs between runs');
  p('');
  if (!varies.length) p('none');
  for (const r of varies) p(`- ${r.venue} · ${r.url} · used ${r.truthSource}: "${r.sweepTitle}" ${r.sweepStart}→${r.sweepEnd}; others: ${r.truthVaries.join(' ; ')}`);

  p('');
  p('## Venues of the 28 with no measurable page');
  p('');
  const measured = new Set(recs.filter(r => !r.refused && r.truthSource && r.sweepTitle).map(r => r.venue));
  const read = new Set(recs.filter(r => !r.refused).map(r => r.venue));
  const none = app.VENUE_SITES.map(v => v.id).filter(id => !measured.has(id));
  for (const id of none) p(`- ${id}${read.has(id) ? ' (pages read, no scraper row for them)' : recs.some(r => r.venue === id) ? ' (pages refused)' : ' (no saved show page)'}`);
  p('- acq: proven bad from her real import (titles "… - Exhibitions"), not measurable offline' + (none.includes('acq') ? '' : ' (also has measured pages above)'));
  p('');
  p('## Outside the 28 (no scraper row exists, so title and dates are only listed)');
  p('');
  for (const r of recs.filter(r => r.venue.startsWith('(outside'))) p(`- ${r.url} · ${r.refused || ('"' + r.linkTitle + '" ' + r.linkStart + ' → ' + r.linkEnd)}`);
  if (noAddress.length) { p(''); p('## Saved pages with no address found'); p(''); for (const f of noAddress) p('- ' + f); }
  const errs = recs.filter(r => r.error);
  if (errs.length) { p(''); p('## Could not be converted'); p(''); for (const r of errs) p('- ' + r.file + ' · ' + r.error); }

  const md = L.join('\n') + '\n';
  console.log(md);
  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(MD_OUT, md);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(recs, null, 1));
}

try { main(); } catch (e) { console.error(e.stack || e); process.exit(1); }
