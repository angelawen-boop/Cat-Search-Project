#!/usr/bin/env node
/*
 * restructure_gates.js — the gates a restructure layer must pass (docs/restructure.md).
 *
 *   node build/restructure_gates.js --base <git ref> [--layer <id>] [--changes-allowed] [--live]
 *
 *   --base      the commit the layer started from (main before the layer's branch).
 *   --layer     also check that every piece placed in this layer, and every layer before it, sits
 *               in its part.
 *   --changes-allowed   for a layer that rewrites code (screens, wording lists): changed pieces
 *               are listed instead of failing; the side-by-side check compares every value but a
 *               function's text, and every screen and store record must still be identical.
 *   --live      the side-by-side check also runs the Links read on pages fetched live (needs the network).
 *
 * Gate 1 — nothing lost or doubled: Cat_Watch.jsx is exactly what app/ joins to; every piece at the
 *          base is there once, in the same order, letter for letter; nothing new appeared.
 * Gate 3 — side by side: the base and the new version give the same values and screens
 *          (build/side_by_side.js).
 * Gate 2 — every test passing and the page drawing — is the watched runner's job: `npm run test:app`.
 *          This script does not run tests (the runner is the only way in; .claude/hooks/test-guard.js).
 *
 * Exit 0 only when every gate here passes. Prints PAGE IDENTICAL when the page is the same file as at
 * the base, character for character: then there is nothing to publish and nothing for her to test.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { split } = require('./app_pieces.js');
const { join } = require('./app_join.js');

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const ri = args.indexOf('--root');
const ROOT = ri >= 0 ? path.resolve(args[ri + 1]) : path.join(__dirname, '..');
const base = opt('--base');
const layerId = opt('--layer');
const changesAllowed = args.includes('--changes-allowed');
const live = args.includes('--live');
if (!base && !opt('--base-file')) { console.log('usage: node build/restructure_gates.js --base <git ref> [--layer <id>] [--changes-allowed] [--live]'); process.exit(2); }

let failed = 0;
const pass = m => console.log('PASS  ' + m);
const fail = m => { failed++; console.log('FAIL  ' + m); };

const baseText = opt('--base-file') ? fs.readFileSync(opt('--base-file'), 'utf8')
  : execFileSync('git', ['show', base + ':Cat_Watch.jsx'], { cwd: ROOT, maxBuffer: 64 << 20, encoding: 'utf8' });
const nowText = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');

// ── Gate 1 ──────────────────────────────────────────────────────────────────
let joined;
try { joined = join(ROOT); } catch (e) { fail('the parts in app/ do not join: ' + e.message); }
if (joined) {
  if (joined.text === nowText) pass('Cat_Watch.jsx is exactly what the parts in app/ join to');
  else fail('Cat_Watch.jsx is not what the parts in app/ join to — it was edited by hand, or app/ was not joined');
  if (joined.order.join('\n') === joined.manifest.order.join('\n')) pass('app/pieces.json records the order the parts join in');
  else fail('app/pieces.json is out of date — run `node build/app_join.js`');
}

const b = split(baseText).pieces, n = split(nowText).pieces;
const bm = new Map(b.map(p => [p.id, p.text])), nm = new Map(n.map(p => [p.id, p.text]));
const lost = b.filter(p => !nm.has(p.id)).map(p => p.id);
const added = n.filter(p => !bm.has(p.id)).map(p => p.id);
const changed = b.filter(p => nm.has(p.id) && nm.get(p.id) !== p.text).map(p => p.id);
const sameOrder = b.filter(p => nm.has(p.id)).map(p => p.id).join('\n') === n.filter(p => bm.has(p.id)).map(p => p.id).join('\n');
const list = a => a.slice(0, 20).join(', ') + (a.length > 20 ? ` … (${a.length})` : '');
if (!changesAllowed) {
  lost.length ? fail('pieces lost since the base: ' + list(lost)) : pass(`no piece lost (${b.length} at the base)`);
  added.length ? fail('pieces that were not at the base: ' + list(added)) : pass('no piece added');
  changed.length ? fail('pieces whose text changed: ' + list(changed)) : pass('every piece letter for letter as at the base');
} else {
  console.log(`NOTE  changes allowed: ${lost.length} lost, ${added.length} added, ${changed.length} changed`
    + (lost.length + added.length + changed.length ? ' — ' + list([...lost.map(x => '-' + x), ...added.map(x => '+' + x), ...changed.map(x => '~' + x)]) : ''));
}
sameOrder ? pass('the pieces come out in the same order as at the base') : fail('the pieces come out in a different order from the base');

// Each layer so far: its pieces sit in their parts, and its parts hold nothing else.
if (layerId && joined) {
  const placement = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'restructure', 'placement.json'), 'utf8'));
  const upTo = placement.layers.slice(0, placement.layers.findIndex(l => l.id === layerId) + 1);
  if (!upTo.length) fail('no layer "' + layerId + '" in placement.json');
  const files = new Set(upTo.flatMap(l => Object.keys(l.files)));
  const { byId } = require('./app_join.js').readParts(path.join(ROOT, 'app'));
  const wrong = [];
  for (const [id, where] of byId) {
    const want = placement.pieces[id];
    if (want && files.has(want) && where.file !== want) wrong.push(id + ' is in app/' + where.file + ', placed in app/' + want);
    if (files.has(where.file) && want !== where.file) wrong.push(id + ' is in app/' + where.file + ', placed ' + (want ? 'in app/' + want : 'nowhere'));
  }
  const unplaced = [...byId.keys()].filter(id => !placement.pieces[id]);
  wrong.length ? fail('pieces in the wrong part: ' + list(wrong)) : pass(`every piece of layer ${layerId} and the layers before it is in its part`);
  if (unplaced.length) fail('pieces the placement list does not name: ' + list(unplaced));
}

// ── The structure guard: no part names a higher one; only the store's door reaches the store; hooks and JSX in screens/ only ──
{
  const sc = spawnSync(process.execPath, [path.join(__dirname, 'structure_check.js'), '--root', ROOT], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const lines = ((sc.stdout || '') + (sc.stderr || '')).split('\n').filter(l => /^(FAIL|NOTE|PASS|STRUCTURE| {6})/.test(l));
  sc.status === 0 ? pass('structure guard: no part names a higher one; only connections/store.jsx reaches the store; no part outside screens/ uses a hook or JSX') : fail('structure guard:\n' + lines.join('\n'));
  const notes = lines.filter(l => /^(NOTE| {6})/.test(l));
  if (notes.length) console.log(notes.join('\n'));
}

// ── One copy of every fact: venue facts in the register only; no sentence, list or rule written twice ──
{
  const fc = spawnSync(process.execPath, [path.join(__dirname, 'fact_check.js'), '--root', ROOT], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const lines = ((fc.stdout || '') + (fc.stderr || '')).split('\n').filter(l => /^(FAIL|PASS|FACT)/.test(l));
  fc.status === 0 ? pass('fact check: every venue fact is in venues/register.js; no sentence, list or rule written twice (the copies listed for 4B–4F aside)') : fail('fact check:\n' + lines.join('\n'));
}

// ── Identity, then Gate 3 ───────────────────────────────────────────────────
const identical = nowText === baseText;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-gates-'));
fs.writeFileSync(path.join(tmp, 'base.jsx'), baseText);
const r = spawnSync(process.execPath, [path.join(__dirname, 'side_by_side.js'), path.join(tmp, 'base.jsx'), path.join(ROOT, 'Cat_Watch.jsx')]
  .concat(changesAllowed ? ['--changes-allowed'] : [], live ? ['--live'] : []),
  { encoding: 'utf8', cwd: path.join(__dirname, '..'), timeout: 1200000, maxBuffer: 64 << 20 });
const out = (r.stdout || '') + (r.stderr || '');
r.status === 0 ? pass('side by side with the base: identical ' + (changesAllowed ? 'values (functions\' text aside)' : 'values') + ', screens and store records')
  : fail('side by side with the base:\n' + out.split('\n').filter(l => !/^same /.test(l)).join('\n'));

console.log('');
if (identical) console.log('PAGE IDENTICAL — Cat_Watch.jsx is the same file as at the base, character for character.');
console.log('Gate 2 is the watched test run: npm run test:app');
console.log(failed ? `GATES FAILED: ${failed}.` : 'GATES 1 AND 3 PASSED.');
process.exit(failed ? 1 : 0);
