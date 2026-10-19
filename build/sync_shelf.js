#!/usr/bin/env node
/*
 * sync_shelf.js — copy Cat Watch's book mechanics into Theme_Shelf.jsx.
 *
 * WHY THIS EXISTS — Theme Shelf (docs/themes.md). The shelf is its
 * own page, but an ISBN, the four booksellers, a saved page and the connector's
 * failure messages must behave exactly as they do in Cat Watch. A hand copy drifts,
 * so the shelf's copy is WRITTEN by this script, between the SHARED markers, and
 * `npm test` runs `--check`, which fails the moment the two no longer match.
 *
 * Each name below is a top-level declaration in Cat_Watch.jsx, taken whole: its
 * first line, then every line until one that starts at the margin (a closing "}"
 * is kept and ends it).
 *
 * Usage:
 *   node build/sync_shelf.js          rewrite the shelf's shared region
 *   node build/sync_shelf.js --check  exit 1 if it differs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Cat_Watch.jsx');
const SHELF = path.join(ROOT, 'Theme_Shelf.jsx');

const OPEN = '// ===== SHARED WITH CAT WATCH — written by `node build/sync_shelf.js`; never edit between these markers. Edit Cat_Watch.jsx, then run it. =====';
const CLOSE = '// ===== END SHARED =====';

const NAMES = ['cleanIsbn', 'fmtIsbn', 'isbn10to13', 'isbn13Checks', 'toIsbn13', 'isbn13to10',
  'isbnInText', 'resultText', 'resellerLinks', 'savedPageHtml', 'savedPageReply',
  'mcpTrouble', 'lastJsonObject'];

function die(m) { console.error('sync_shelf: ' + m); process.exit(1); }

function take(lines, name) {
  const re = new RegExp('^(?:const ' + name + '=|function ' + name + '\\()');
  const at = lines.findIndex(l => re.test(l));
  if (at < 0) die('Cat_Watch.jsx has no top-level ' + name);
  const out = [lines[at]];
  for (let k = at + 1; k < lines.length; k++) {
    const l = lines[k];
    if (/^\S/.test(l)) { if (/^\}/.test(l)) out.push(l); break; }
    out.push(l);
  }
  while (out.length > 1 && !out[out.length - 1].trim()) out.pop();
  return out.join('\n');
}

const appLines = fs.readFileSync(APP, 'utf8').split('\n');
const region = '\n' + NAMES.map(n => take(appLines, n)).join('\n') + '\n';

const shelf = fs.readFileSync(SHELF, 'utf8');
const i = shelf.indexOf(OPEN), j = shelf.indexOf(CLOSE);
if (i < 0 || j < 0 || j < i) die('Theme_Shelf.jsx has no SHARED markers');
const current = shelf.slice(i + OPEN.length, j);

if (process.argv.includes('--check')) {
  if (current !== region) die('Theme_Shelf.jsx is OUT OF STEP with Cat_Watch.jsx — run `node build/sync_shelf.js`.');
  console.log('sync_shelf: Theme_Shelf.jsx matches Cat_Watch.jsx (' + NAMES.length + ' pieces).');
  process.exit(0);
}
fs.writeFileSync(SHELF, shelf.slice(0, i + OPEN.length) + region + shelf.slice(j));
console.log('sync_shelf: wrote ' + NAMES.length + ' pieces into Theme_Shelf.jsx.');
