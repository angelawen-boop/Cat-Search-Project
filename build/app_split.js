#!/usr/bin/env node
/*
 * app_split.js — the moving script (docs/restructure.md).
 *
 * Moves the app's pieces between part files in app/, word for word. Nobody retypes code.
 * The page cannot change: the new parts are joined in memory and compared with Cat_Watch.jsx
 * character for character before anything is written; any difference and nothing is written.
 *
 *   node build/app_split.js --bootstrap      make app/ from Cat_Watch.jsx: every piece in app/unsorted.jsx
 *   node build/app_split.js --layer <id>     move every piece docs/restructure/placement.json gives to that
 *                                            layer's files into them, in page order
 *   --root <dir>                             work on a copy of the project (the gates' own proof)
 *
 * A piece the placement list does not name is left where it is and listed: the layer's
 * session places it (adds it to placement.json) and runs the move again.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { split, writePart, readPart } = require('./app_pieces.js');
const { readParts, partFiles } = require('./app_join.js');

const args = process.argv.slice(2);
const ri = args.indexOf('--root');
const ROOT = ri >= 0 ? path.resolve(args[ri + 1]) : path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const APP = path.join(ROOT, 'app');
const MANIFEST = path.join(APP, 'pieces.json');
const PLACEMENT = path.join(ROOT, 'docs', 'restructure', 'placement.json');
const UNSORTED = 'unsorted.jsx';

function die(m) { console.error('MOVE REFUSED — ' + m); process.exit(1); }

if (args.includes('--bootstrap')) {
  if (fs.existsSync(APP)) die('app/ already exists.');
  const src = fs.readFileSync(JSX, 'utf8');
  const { pieces, tail } = split(src);
  fs.mkdirSync(APP, { recursive: true });
  fs.writeFileSync(path.join(APP, UNSORTED), writePart(
    ['Pieces not yet moved to their part. docs/restructure.md; placement: docs/restructure/placement.json.'], pieces));
  fs.writeFileSync(MANIFEST, JSON.stringify({ tail, order: pieces.map(p => p.id) }, null, 1) + '\n');
  console.log('bootstrap: app/' + UNSORTED + ' holds all ' + pieces.length + ' pieces; app/pieces.json records their order.');
  process.exit(0);
}

const li = args.indexOf('--layer');
if (li < 0) die('say --bootstrap or --layer <id>.');
const layerId = args[li + 1];
const placement = JSON.parse(fs.readFileSync(PLACEMENT, 'utf8'));
const layer = placement.layers.find(l => l.id === layerId);
if (!layer) die('no layer "' + layerId + '" in placement.json.');
const targets = new Set(Object.keys(layer.files));
if (!fs.existsSync(MANIFEST)) die('app/ has not been set up (run --bootstrap in layer 0).');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const { byId } = readParts(APP);

// Each file's pieces after the move, in page order.
const files = {};
for (const f of partFiles(APP)) files[f] = [];
for (const f of targets) files[f] = files[f] || [];
const moved = [], unplaced = [];
for (const id of manifest.order) {
  const here = byId.get(id);
  if (!here) die('piece "' + id + '" is in pieces.json but in no part.');
  const want = placement.pieces[id];
  if (!want) unplaced.push(id);
  const to = want && targets.has(want) ? want : here.file;
  if (to !== here.file) moved.push(id + ' → app/' + to);
  files[to].push({ id, text: here.text });
}

// Join in memory: the page must come out exactly as it is now.
const text = new Map();
for (const ps of Object.values(files)) for (const p of ps) text.set(p.id, p.text);
const joined = manifest.order.map(id => text.get(id)).join('') + manifest.tail;
if (joined !== fs.readFileSync(JSX, 'utf8')) die('the parts would no longer join to Cat_Watch.jsx exactly. Nothing written.'
  + ' (Run `node build/app_join.js --check` first: Cat_Watch.jsx may have been edited by hand.)');

// Notes for each part: kept from the file, or the placement list's line for a new file.
const notesOf = f => {
  const p = path.join(APP, f);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').split('\n').filter((l, i, a) => l.startsWith('//@ ') && !a.slice(0, i).some(x => x.startsWith('//@piece'))).map(l => l.slice(4));
  return [layer.files[f] || ''].filter(Boolean);
};
for (const [f, ps] of Object.entries(files)) {
  const p = path.join(APP, f);
  if (!ps.length) { if (fs.existsSync(p)) fs.unlinkSync(p); continue; }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, writePart(notesOf(f), ps));
  if (readPart(fs.readFileSync(p, 'utf8'), f).map(x => x.text).join('\u0000') !== ps.map(x => x.text).join('\u0000')) die('app/' + f + ' did not read back as written.');
}
console.log('layer ' + layerId + ': ' + moved.length + ' pieces moved; the page is unchanged, character for character.');
if (unplaced.length) console.log('NOT IN THE PLACEMENT LIST (left where they are): ' + unplaced.join(', '));
