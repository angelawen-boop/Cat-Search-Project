#!/usr/bin/env node
/*
 * isbn_ranges.js — write the ISBN agency's range table into Cat_Watch.jsx.
 *
 * The app tells two ISBNs from the same publisher apart from a co-edition's two
 * numbers by their registrant (docs/catalogue_versions.md, rule 1b). The registrant
 * is read off the International ISBN Agency's range table, never typed by hand: this
 * script writes ISBN_RANGES between its markers in Cat_Watch.jsx.
 *
 * To refresh it: download https://www.isbn-international.org/export_rangemessage.xml,
 * then run
 *   node build/isbn_ranges.js <RangeMessage.xml>
 *   node build/isbn_ranges.js <RangeMessage.xml> --check    exit 1 if the JSX differs
 *
 * The table: for the 978/979 prefix and for each registration group, its rules as
 * "start/length" pairs, start with trailing zeros dropped (the seven digits that follow
 * the prefix or group); length 0 marks digits not in use.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const JSX = path.join(__dirname, '..', 'Cat_Watch.jsx');
const OPEN = '// ===== ISBN RANGES — written by `node build/isbn_ranges.js <RangeMessage.xml>` (see that file); never edit between these markers. =====';
const CLOSE = '// ===== END ISBN RANGES =====';

function die(m) { console.error('isbn_ranges: ' + m); process.exit(1); }

const [xmlPath, flag] = process.argv.slice(2);
if (!xmlPath) die('usage: node build/isbn_ranges.js <RangeMessage.xml> [--check]');
const xml = fs.readFileSync(xmlPath, 'utf8');

const blocks = [...xml.matchAll(/<(EAN\.UCC|Group)>\s*<Prefix>([^<]+)<\/Prefix>[\s\S]*?<Rules>([\s\S]*?)<\/Rules>/g)];
if (!blocks.length) die('no prefixes or groups found — is this the agency\'s RangeMessage.xml?');

const table = {};
for (const [, , prefix, rulesXml] of blocks) {
  if (!/^97[89](?:-\d+)?$/.test(prefix)) continue;
  const rules = [...rulesXml.matchAll(/<Range>(\d{7})-(\d{7})<\/Range>\s*<Length>(\d)<\/Length>/g)]
    .map(m => ({ from: m[1], to: m[2], len: +m[3] }))
    .sort((a, b) => a.from.localeCompare(b.from));
  const out = [];
  let next = '0000000';
  const put = (from, len) => out.push((from.replace(/0+$/, '') || '0') + '/' + len);
  for (const r of rules) {
    if (r.from > next) put(next, 0);
    put(r.from, r.len);
    next = String(+r.to + 1).padStart(7, '0');
  }
  if (next <= '9999999' && next.length === 7) put(next, 0);
  table[prefix] = out.join(',');
}
if (!table['978'] || !table['978-2']) die('the 978 prefix or group 978-2 is missing');

const date = (xml.match(/<MessageDate>([^<]+)<\/MessageDate>/) || [])[1] || 'unknown date';
const block = OPEN + '\n// The agency\'s table of ' + date + '.\nconst ISBN_RANGES=' + JSON.stringify(table) + ';\n' + CLOSE;

const src = fs.readFileSync(JSX, 'utf8');
const a = src.indexOf(OPEN), b = src.indexOf(CLOSE);
if (a < 0 || b < 0) die('the ISBN RANGES markers are missing from Cat_Watch.jsx');
const next = src.slice(0, a) + block + src.slice(b + CLOSE.length);
if (flag === '--check') {
  if (next !== src) die('Cat_Watch.jsx differs from this range table — run without --check');
  console.log('isbn_ranges: Cat_Watch.jsx matches the range table.');
} else {
  fs.writeFileSync(JSX, next);
  console.log('isbn_ranges: wrote ' + Object.keys(table).length + ' prefixes and groups (' + block.length + ' characters).');
}
