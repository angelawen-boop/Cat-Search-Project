#!/usr/bin/env node
/*
 * restructure_gates_proof.js — proof that the restructure's moving script and gates work
 * (docs/restructure.md). A gate that has never failed proves nothing, so this breaks a copy on
 * purpose and checks the gates catch each break.
 *
 * On a copy of the app in a temporary folder (the project itself is never touched):
 *   1. sets up app/ and moves every layer in turn, with the gates after each — all must pass and
 *      the page must stay identical;
 *   2. from the fully moved copy, makes one break at a time and runs the gates — each must fail.
 *
 *   node build/restructure_gates_proof.js          about fifteen minutes (the side-by-side check runs at every gate)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const node = (args, root) => spawnSync(process.execPath, args.concat(root ? ['--root', root] : []), { encoding: 'utf8', cwd: ROOT, timeout: 900000 });
let bad = 0;
const ok = (c, m, detail) => { if (c) console.log('PASS  ' + m); else { bad++; console.log('FAIL  ' + m + (detail ? '\n' + detail : '')); } };

function copyRoot() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-proof-'));
  fs.copyFileSync(path.join(ROOT, 'Cat_Watch.jsx'), path.join(r, 'Cat_Watch.jsx'));
  fs.mkdirSync(path.join(r, 'docs', 'restructure'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'docs', 'restructure', 'placement.json'), path.join(r, 'docs', 'restructure', 'placement.json'));
  return r;
}
const cpdir = (a, b) => fs.cpSync(a, b, { recursive: true });
const base = r => path.join(r, 'base.jsx');
const gates = (r, layer) => node([path.join(__dirname, 'restructure_gates.js'), '--base-file', base(r)].concat(layer ? ['--layer', layer] : []), r);

// ── 1. every layer, in order ────────────────────────────────────────────────
const root = copyRoot();
fs.copyFileSync(path.join(root, 'Cat_Watch.jsx'), base(root));
let s = node([path.join(__dirname, 'app_split.js'), '--bootstrap'], root);
ok(s.status === 0, 'P-01: set-up puts every piece into app/unsorted.jsx', s.stdout + s.stderr);
const layers = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'restructure', 'placement.json'), 'utf8')).layers.map(l => l.id);
for (const id of layers) {
  if (id !== '0') {
    s = node([path.join(__dirname, 'app_split.js'), '--layer', id], root);
    ok(s.status === 0, `P-02 layer ${id}: the moving script moves its pieces`, s.stdout + s.stderr);
  }
  const g = gates(root, id);
  ok(g.status === 0 && /PAGE IDENTICAL/.test(g.stdout), `P-03 layer ${id}: every gate passes and the page is identical`, g.stdout + g.stderr);
}
ok(!fs.existsSync(path.join(root, 'app', 'unsorted.jsx')), 'P-04: after the last layer no piece is left unsorted');

// ── 2. one break at a time, each on its own copy of the moved app ───────────
const breaks = [
  ['B-01: a piece deleted from its part', r => {
    const f = path.join(r, 'app', 'foundations', 'isbn.jsx');
    const t = fs.readFileSync(f, 'utf8'); const i = t.indexOf('//@piece fmtIsbn'); const j = t.indexOf('//@piece', i + 5);
    fs.writeFileSync(f, t.slice(0, i) + t.slice(j)); node([path.join(__dirname, 'app_join.js')], r); }],
  ['B-02: a piece copied into a second part', r => {
    const t = fs.readFileSync(path.join(r, 'app', 'foundations', 'isbn.jsx'), 'utf8');
    const i = t.indexOf('//@piece fmtIsbn'); const j = t.indexOf('//@piece', i + 5);
    fs.appendFileSync(path.join(r, 'app', 'foundations', 'text.jsx'), t.slice(i, j)); }],
  ['B-03: one character changed inside a piece', r => {
    const f = path.join(r, 'app', 'connections', 'web.jsx');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('const SHELL_CHARS=400;', 'const SHELL_CHARS=401;'));
    node([path.join(__dirname, 'app_join.js')], r); }],
  ['B-04: Cat_Watch.jsx edited by hand instead of the parts', r => {
    const f = path.join(r, 'Cat_Watch.jsx');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('not in your ledger yet', 'not in the ledger yet')); }],
  ['B-05: a piece moved by hand to the wrong part', r => {
    const from = path.join(r, 'app', 'foundations', 'isbn.jsx'), to = path.join(r, 'app', 'foundations', 'text.jsx');
    const t = fs.readFileSync(from, 'utf8'); const i = t.indexOf('//@piece fmtIsbn'); const j = t.indexOf('//@piece', i + 5);
    fs.writeFileSync(from, t.slice(0, i) + t.slice(j)); fs.appendFileSync(to, t.slice(i, j));
    node([path.join(__dirname, 'app_join.js')], r); }],
  ['B-06: two pieces swapped in the page order', r => {
    const f = path.join(r, 'app', 'pieces.json'); const m = JSON.parse(fs.readFileSync(f, 'utf8'));
    const a = m.order.indexOf('fmtIsbn'), b = m.order.indexOf('cleanIsbn'); [m.order[a], m.order[b]] = [m.order[b], m.order[a]];
    fs.writeFileSync(f, JSON.stringify(m, null, 1)); node([path.join(__dirname, 'app_join.js')], r); }],
  ['B-07: text left outside any piece in a part', r => {
    const f = path.join(r, 'app', 'foundations', 'isbn.jsx'); const t = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, 'const stray = 1;\n' + t); }],
  ['B-08: a new piece added to a part that the placement list does not name', r => {
    fs.appendFileSync(path.join(r, 'app', 'foundations', 'isbn.jsx'), '//@piece strayHelper\n\nconst strayHelper = 1;\n');
    node([path.join(__dirname, 'app_join.js')], r); }],
];
for (const [name, doBreak] of breaks) {
  const r = copyRoot(); fs.rmSync(path.join(r, 'Cat_Watch.jsx'));
  cpdir(root, r);
  doBreak(r);
  const g = gates(r, layers[layers.length - 1]);
  ok(g.status === 1 && /FAIL/.test(g.stdout), name + ' — the gates fail: ' + ((g.stdout.match(/^FAIL .*/m) || [''])[0].slice(6, 150)), g.stdout + g.stderr);
}

// The moving script refuses to work on a hand-edited page.
{
  const r = copyRoot(); fs.rmSync(path.join(r, 'Cat_Watch.jsx')); cpdir(root, r);
  const f = path.join(r, 'Cat_Watch.jsx');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('not in your ledger yet', 'not in the ledger yet'));
  const m = node([path.join(__dirname, 'app_split.js'), '--layer', '1'], r);
  ok(m.status === 1 && /MOVE REFUSED/.test(m.stderr), 'B-09: the moving script refuses when Cat_Watch.jsx was edited by hand', m.stdout + m.stderr);
}

console.log(bad ? `PROOF FAILED: ${bad}.` : 'PROOF PASSED: every layer moves with the page identical, and every break is caught.');
process.exit(bad ? 1 : 0);
