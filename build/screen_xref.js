#!/usr/bin/env node
/*
 * screen_xref.js — the cross-reference behind the main screen's cutting plan (docs/restructure.md, item 5).
 * For everything the screen's block remembers or defines (state, refs, functions, memos, values), it
 * prints which functions and which sections of the layout read it and which write it. A boundary for a
 * cut is where this shows one: a thing used inside one section only moves into it; a thing two share
 * stays with the screen or the one hook both use.
 *
 *   node build/screen_xref.js [file]        default: app/screens/app.jsx
 *
 * It reads text, not syntax: the block's own statements sit at two spaces of indent, a layout section
 * is a child of the returned root at up to eight spaces. Rebuild it before each stage; the numbers move.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'app', 'screens', 'app.jsx');
const L = fs.readFileSync(file, 'utf8').split('\n');
const ret = L.findIndex(l => /^  return ?\($/.test(l));
if (ret < 0) { console.error('no "  return(" at two spaces: is this still one block?'); process.exit(1); }

// What the block declares, with the lines of each function.
const decl = [];
const top = [];
for (let i = 0; i < ret; i++) if (/^  \S/.test(L[i]) && !/^  \/\//.test(L[i])) top.push(i);
top.forEach((i, n) => {
  const l = L[i], end = (n + 1 < top.length ? top[n + 1] : ret) - 1;
  for (const m of l.matchAll(/const ?\[(\w*), *(set\w+)\] *= *useState/g)) decl.push({ n: m[1] || m[2], set: m[2], kind: 'state', a: i });
  let m;
  if ((m = /^  const (\w+) *= *useRef/.exec(l))) decl.push({ n: m[1], kind: 'ref', a: i });
  else if ((m = /^  (?:async )?function (\w+)/.exec(l))) decl.push({ n: m[1], kind: 'fn', a: i, b: end });
  else if ((m = /^  const (\w+) *= *use(Memo|Callback)/.exec(l))) decl.push({ n: m[1], kind: m[2] === 'Memo' ? 'memo' : 'fn', a: i, b: end });
  else if ((m = /^  const (\w+) *= *(?:async )?\(?[\w,{}\s=]*\)? *=>/.exec(l))) decl.push({ n: m[1], kind: 'fn', a: i, b: end });
  else if (/^  useEffect\(/.test(l)) decl.push({ n: 'effect@' + (i + 1), kind: 'effect', a: i, b: end });
  else if ((m = /^  const (\w+) *=/.exec(l)) && !/useState/.test(l)) decl.push({ n: m[1], kind: 'value', a: i, b: end });
});
// A body runs on through the closing lines that follow it.
const starts = new Set(decl.map(d => d.a));
for (const d of decl) if (d.b != null) { let j = top.indexOf(d.a) + 1; while (j < top.length && !starts.has(top[j])) j++; d.b = (j < top.length ? top[j] : ret) - 1; }

// The layout's sections.
const sec = [];
for (let i = ret + 1; i < L.length; i++) {
  const ind = L[i].match(/^ */)[0].length, t = L[i].trim();
  if (ind >= 6 && ind <= 8 && /^[<{]/.test(t) && !/^<\/|^\{\/\*/.test(t)) sec.push({ a: i, label: (i + 1) + ' ' + t.slice(0, 44) });
}
sec.forEach((s, n) => { s.b = (n + 1 < sec.length ? sec[n + 1].a : L.length) - 1; });

const text = (a, b) => L.slice(a, b + 1).join('\n');
const uses = (t, n) => new RegExp('(?<![\\w.$])' + n.replace('@', '\\@') + '(?![\\w$])').test(t);
const users = decl.filter(d => d.b != null);
console.log(`${file}: ${decl.filter(d => d.kind === 'state').length} remembered values, ${decl.filter(d => d.kind === 'ref').length} refs, `
  + `${decl.filter(d => d.kind === 'fn').length} functions, ${decl.filter(d => d.kind === 'effect').length} effects, layout of ${L.length - ret} lines in ${sec.length} sections.\n`);
for (const d of decl) {
  if (d.kind === 'effect') continue;
  const mark = (t) => { const r = uses(t, d.n), w = d.set && uses(t, d.set); return r || w ? (w ? (r ? '(rw)' : '(w)') : '') : null; };
  const f = users.filter(u => u.n !== d.n).map(u => [u.n, mark(text(u.a, u.b))]).filter(x => x[1] != null).map(x => x[0] + x[1]);
  const s = sec.map(u => [u.label, mark(text(u.a, u.b))]).filter(x => x[1] != null).map(x => '[' + x[0] + ']' + x[1]);
  console.log(`${d.n} (${d.kind}, line ${d.a + 1})\n   functions: ${f.join(' ') || '-'}\n   layout: ${s.join(' ') || '-'}`);
}
