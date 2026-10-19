#!/usr/bin/env node
/*
 * shelf_covers.js — fetch Open Library covers for Theme Shelf books that have none
 * (docs/themes.md). Run by a session when she asks for covers: the page
 * cannot load a picture from another site, but a session can fetch one and store it.
 *
 *   1. ArtifactData list, collection "books", out_dir <dir>     (the shelf's books)
 *   2. node build/shelf_covers.js <dir> <covers dir>
 *   3. Artifact publish asset:true with the files it lists, then one ArtifactData batch
 *      setting each book's `cover` to its asset id (pinned to the version it prints).
 *
 * Only Open Library's cover for that exact ISBN is taken (`default=false`, so a book with
 * none is skipped rather than given a blank). Look at the pictures before uploading.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node build/shelf_covers.js <books dir> <covers dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : f.endsWith('.json') && files.push(p); } })(dir);

let got = 0, none = 0;
for (const f of files) {
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
  const b = doc.data || doc, version = doc.version;
  if (!/^97[89]\d{10}$/.test(String(b.isbn13 || '')) || b.cover) continue;
  const to = path.join(out, b.isbn13 + '.jpg');
  try {
    execFileSync('curl', ['-sfL', '--max-time', '40', '-o', to,
      'https://covers.openlibrary.org/b/isbn/' + b.isbn13 + '-L.jpg?default=false']);
    if (fs.statSync(to).size < 2000) throw new Error('too small');
    console.log('cover  ' + to + '  (book ' + b.isbn13 + ', version ' + version + ')  ' + b.title);
    got++;
  } catch {
    try { fs.unlinkSync(to); } catch {}
    console.log('none   ' + b.isbn13 + '  ' + b.title);
    none++;
  }
}
console.log('\n' + got + ' covers fetched, ' + none + ' books without one on Open Library.');
