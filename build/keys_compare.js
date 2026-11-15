#!/usr/bin/env node
/*
 * keys_compare.js — the proof for "one rule" on show IDs, accent folding and web-address tidying
 * (docs/restructure.md, item 4D). Her stored data already carries the results of the rules as they
 * were, so a single rule is safe only if it gives the same answer for everything she holds.
 *
 *   node build/keys_compare.js --old <tree> --new <tree> --ledger <ledger.json> --quarantine <rows.json>
 *
 *   --old, --new    two checkouts of the repo (the code before the change, and after).
 *   --ledger        her ledger as saved ({rows, ignored, …}); --quarantine her store's quarantine record.
 *                   Both are read, never written, and never committed.
 *
 * It lists every difference and exits 1 if there is one:
 *   1. every ledger row: its matching keys (by address, by title), the title and artist as matched,
 *      the title as searched, and the ID an import would give it — old rule beside new;
 *   2. every quarantine entry: the key it is stored under must be what the new rule gives it;
 *   3. the starter set: every show's ID, old beside new;
 *   4. every row of every sweep file on disk: the app's matching key and the scraper's and the
 *      compression's keys, old beside new;
 *   5. her re-import: each stitched sweep file, and her whole ledger written out as a sweep file,
 *      read against her ledger by the old code and the new — the same cards, and no show she
 *      already holds offered as new.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const OLD = path.resolve(opt('--old')), NEW = path.resolve(opt('--new'));
const ledger = JSON.parse(fs.readFileSync(opt('--ledger'), 'utf8'));
const quarDoc = JSON.parse(fs.readFileSync(opt('--quarantine'), 'utf8'));
const quarantine = quarDoc.rows && typeof quarDoc.rows === 'object' ? quarDoc.rows : quarDoc;
const rows = ledger.rows || [];

// The page's own functions, lifted from a tree's Cat_Watch.jsx (as the lookup tests lift them).
const WANT = ['normalizeTitle', 'normalizeUrlKey', 'ignoreKeyFor', 'makeLedgerRow', 'buildSeed', 'foldText', 'artistKey', 'readSweepFile', 'proFormaCsv'];
function page(tree) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-keys-'));
  const src = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + fs.readFileSync(path.join(tree, 'Cat_Watch.jsx'), 'utf8').replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){');
  fs.writeFileSync(path.join(tmp, 'app.tsx'), src);
  try { execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe', cwd: NEW }); } catch { /* the emit is what matters */ }
  const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');
  const w = { document: {}, localStorage: { getItem() { return null; }, setItem() {} } };
  const pick = WANT.map(n => `${n}: typeof ${n}!=="undefined"?${n}:null`).join(', ');
  return new Function('React', 'window', 'document', 'localStorage', code + `\n;return { ${pick} };`)(
    { memo: f => f, createContext: () => ({}), forwardRef: f => f, Fragment: {} }, w, w.document, w.localStorage);
}
const scraper = tree => ({ S: require(path.join(tree, 'scraper', 'sweep_prototype.js')), C: require(path.join(tree, 'scraper', 'compress.js')) });

const A = page(OLD), B = page(NEW), SA = scraper(OLD), SB = scraper(NEW);
const diffs = [];
const cmp = (group, what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ group, what, old: a, new: b }); };
const call = (f, ...x) => { if (!f) return '(no such function)'; try { return f(...x); } catch (e) { return 'THROWS ' + e.message; } };
const idOf = (P, r) => { const o = call(P.makeLedgerRow, { museumId: r.museumId, title: r.title, startDate: r.startDate, endDate: r.endDate, summary: '', exUrl: r.exUrl }, 'now'); return o && o.id ? o.id : o; };

// 1. Every ledger row.
for (const r of rows) {
  const tag = r.id + ' — ' + r.title;
  cmp('ledger: key by address', tag, call(A.ignoreKeyFor, r.museumId, r.exUrl, r.title), call(B.ignoreKeyFor, r.museumId, r.exUrl, r.title));
  cmp('ledger: key by title', tag, call(A.ignoreKeyFor, r.museumId, '', r.title), call(B.ignoreKeyFor, r.museumId, '', r.title));
  cmp('ledger: title as matched', tag, call(A.normalizeTitle, r.title), call(B.normalizeTitle, r.title));
  cmp('ledger: title as searched', tag, call(A.foldText, r.title), call(B.foldText, r.title));
  cmp('ledger: the ID an import would give', tag, idOf(A, r), idOf(B, r));
  if (r.periodArtist) cmp('ledger: artist as grouped', tag, call(A.artistKey, r.periodArtist), call(B.artistKey, r.periodArtist));
}

// 2. Every quarantine entry: stored key against the new rule (and the old, to tell an old mismatch from a new one).
let quarOldMismatch = 0;
for (const [key, v] of Object.entries(quarantine)) {
  const cut = key.indexOf('|'), venue = key.slice(0, cut), rest = key.slice(cut + 1);
  const re = P => rest.startsWith('t:') ? call(P.ignoreKeyFor, venue, '', v.title) : call(P.ignoreKeyFor, venue, rest, v.title);
  const was = re(A), now = re(B);
  if (was !== key) quarOldMismatch++;
  if (now !== key && was === key) diffs.push({ group: 'quarantine: stored key no longer what the rule gives', what: key + ' — ' + v.title, old: was, new: now });
  else if (now !== was) diffs.push({ group: 'quarantine: rule changed for an entry already off its key', what: key, old: was, new: now });
}

// 3. The starter set.
const seedA = call(A.buildSeed), seedB = call(B.buildSeed);
if (!Array.isArray(seedA) || !Array.isArray(seedB)) diffs.push({ group: 'starter set', what: 'buildSeed', old: String(seedA).slice(0, 80), new: String(seedB).slice(0, 80) });
else { cmp('starter set: how many', 'count', seedA.length, seedB.length); seedA.forEach((s, i) => cmp('starter set: ID', s.title, s.id, seedB[i] && seedB[i].id)); }

// 4. Every row of every sweep file on disk.
const out = path.join(NEW, 'scraper', 'output');
const csvs = [];
(function walk(d, depth) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (depth < 3 && e.name !== 'pages_kept') walk(f, depth + 1); } else if (/\.csv$/.test(e.name)) csvs.push(f); } })(out, 0);
const seenRow = new Set(); let sweepRows = 0;
for (const f of csvs) {
  let list; try { list = SB.C.readProForma(f); } catch { continue; }
  for (const r of list) {
    const sig = r.venue_code + '|' + r.url + '|' + r.title; if (seenRow.has(sig)) continue; seenRow.add(sig); sweepRows++;
    const tag = r.venue_code + ' — ' + r.title + ' — ' + r.url;
    cmp('sweep: the app\'s key by address', tag, call(A.ignoreKeyFor, r.venue_code, r.url, r.title), call(B.ignoreKeyFor, r.venue_code, r.url, r.title));
    cmp('sweep: the app\'s key by title', tag, call(A.ignoreKeyFor, r.venue_code, '', r.title), call(B.ignoreKeyFor, r.venue_code, '', r.title));
    if (r.url) cmp('sweep: the scraper\'s address', tag, call(SA.S.normalizeUrl, r.url), call(SB.S.normalizeUrl, r.url));
    for (const k of ['urlKey', 'exactKey', 'titleKey']) if (SA.C[k] || SB.C[k]) cmp('sweep: compression\'s ' + k, tag, call(SA.C[k], r), call(SB.C[k], r));
  }
}

// 5. Her re-import, old code beside new.
const ignored = Object.entries(quarantine).filter(([, v]) => v && v.state !== 'released').map(([key, v]) => ({ key, venueId: v.venueId, title: v.title, at: v.at }));
const card = p => [p.type, (p.cand && p.cand.museumId) || '', (p.cand && p.cand.title) || '', p.matchId || '', (p.fields || p.changes || []).map(x => x.field || x.key || '').join(',')].join(' | ');
const read = (P, text) => { const r = call(P.readSweepFile, text, rows, ignored); return typeof r === 'string' ? { error: r } : r; };
const cards = r => r.error ? ['ERROR ' + r.error] : (r.props || []).map(card);
const reimport = (name, text, noneNew) => {
  const a = read(A, text), b = read(B, text), ca = cards(a), cb = cards(b);
  cmp('re-import: the cards offered', name, ca, cb);
  const added = (b.props || []).filter(p => p.type === 'add');
  if (noneNew && added.length) diffs.push({ group: 're-import: a show she already holds offered as new', what: name, old: (a.props || []).filter(p => p.type === 'add').length, new: added.map(p => p.cand.title).slice(0, 20) });
  return { cards: cb.length, added: added.length };
};
const stitched = fs.readdirSync(out).filter(d => /^stitch_/.test(d)).flatMap(d => fs.readdirSync(path.join(out, d)).filter(f => /\.csv$/.test(f)).map(f => path.join(out, d, f)));
const reports = stitched.map(f => [path.relative(out, f), reimport(path.relative(out, f), fs.readFileSync(f, 'utf8'), false)]);
// Her ledger written out as a sweep file (venue, title, dates, summary, address), read back against itself.
const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const own = ['venue_code,title,start_date,end_date,summary,url,notes,swept_at'].concat(rows.map(r => [r.museumId, r.title, r.startDate || '', r.endDate || '', r.summary || '', r.exUrl || '', '', ''].map(q).join(','))).join('\n');
reports.push(['her ledger, re-imported', reimport('her ledger, re-imported', own, true)]);

// The report.
console.log(`Compared: ${rows.length} ledger rows, ${Object.keys(quarantine).length} quarantine entries (${quarOldMismatch} already off their key under the old rule), `
  + `${Array.isArray(seedA) ? seedA.length : 0} starter shows, ${sweepRows} distinct sweep rows in ${csvs.length} files.`);
for (const [n, r] of reports) console.log(`  re-import ${n}: ${r.cards} cards, ${r.added} offered as new`);
if (!diffs.length) { console.log('PASS  one rule gives every show she holds the same keys, and her re-import offers the same cards.'); process.exit(0); }
const by = {}; for (const d of diffs) (by[d.group] = by[d.group] || []).push(d);
for (const [g, list] of Object.entries(by)) {
  console.log(`\nDIFF  ${g}: ${list.length}`);
  for (const d of list.slice(0, 12)) console.log(`      ${String(d.what).slice(0, 110)}\n        old ${JSON.stringify(d.old).slice(0, 200)}\n        new ${JSON.stringify(d.new).slice(0, 200)}`);
  if (list.length > 12) console.log(`      … and ${list.length - 12} more`);
}
console.log(`\nFAIL  ${diffs.length} difference(s).`);
process.exit(1);
