#!/usr/bin/env node
/*
 * app_join.js — write Cat_Watch.jsx from the part files in app/ (docs/restructure.md).
 *
 * The parts are where the app is edited; Cat_Watch.jsx is what the build, the tests and every
 * script read, and is written only by this. Pieces come out in the order app/pieces.json
 * records, so moving a piece between parts never changes the page.
 *
 *   node build/app_join.js            write Cat_Watch.jsx (and bring pieces.json up to date)
 *   node build/app_join.js --check    exit 1 if Cat_Watch.jsx is not what the parts join to
 *   --root <dir>                      work on a copy of the project instead (the gates' own tests)
 *
 * A piece added to a part goes out right after the piece above it in that part; a piece
 * deleted from every part leaves the order. A piece found in two parts, or a part with text
 * outside any piece, stops the join.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { readPart } = require('./app_pieces.js');

function paths(root) {
  return {
    JSX: path.join(root, 'Cat_Watch.jsx'),
    APP: path.join(root, 'app'),
    MANIFEST: path.join(root, 'app', 'pieces.json'),
  };
}

function partFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...partFiles(p, base));
    else if (e.name.endsWith('.jsx')) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out.sort();
}

// Every piece in every part: Map id → { file, text }, and each file's pieces in order.
function readParts(APP) {
  const byId = new Map(), byFile = {};
  for (const f of partFiles(APP)) {
    const ps = readPart(fs.readFileSync(path.join(APP, f), 'utf8'), 'app/' + f);
    byFile[f] = ps.map(p => p.id);
    for (const p of ps) {
      if (byId.has(p.id)) throw new Error('piece "' + p.id + '" is in both app/' + byId.get(p.id).file + ' and app/' + f);
      byId.set(p.id, { file: f, text: p.text });
    }
  }
  return { byId, byFile };
}

// The output order: the recorded one, less pieces gone, plus new pieces after their neighbour above.
function orderFor(manifest, byId, byFile) {
  const order = manifest.order.filter(id => byId.has(id));
  const placed = new Set(order);
  for (const [f, ids] of Object.entries(byFile)) {
    ids.forEach((id, k) => {
      if (placed.has(id)) return;
      const above = k > 0 ? ids[k - 1] : null;
      const at = above ? order.indexOf(above) + 1 : (ids.slice(1).map(x => order.indexOf(x)).find(x => x >= 0) ?? order.length);
      order.splice(at, 0, id); placed.add(id);
    });
  }
  return order;
}

function join(root) {
  const P = paths(root);
  const manifest = JSON.parse(fs.readFileSync(P.MANIFEST, 'utf8'));
  const { byId, byFile } = readParts(P.APP);
  const order = orderFor(manifest, byId, byFile);
  const text = order.map(id => byId.get(id).text).join('') + manifest.tail;
  return { text, order, manifest, P };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? path.resolve(args[ri + 1]) : path.join(__dirname, '..');
  let r;
  try { r = join(root); } catch (e) { console.error('JOIN FAILED — ' + e.message); process.exit(1); }
  if (args.includes('--check')) {
    const now = fs.readFileSync(r.P.JSX, 'utf8');
    if (now === r.text) { console.log('join: Cat_Watch.jsx is what the parts in app/ join to.'); process.exit(0); }
    console.error('JOIN CHECK FAILED — Cat_Watch.jsx is not what the parts in app/ join to. Edit the parts in app/, never'
      + ' Cat_Watch.jsx, then run `node build/app_join.js`.');
    process.exit(1);
  }
  fs.writeFileSync(r.P.JSX, r.text);
  if (r.order.join('\n') !== r.manifest.order.join('\n')) {
    r.manifest.order = r.order;
    fs.writeFileSync(r.P.MANIFEST, JSON.stringify(r.manifest, null, 1) + '\n');
  }
  console.log('join: Cat_Watch.jsx written from ' + r.order.length + ' pieces.');
}

module.exports = { join, readParts, partFiles };
