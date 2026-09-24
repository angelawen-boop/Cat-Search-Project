/**
 * Closing dates put a year late by the extension bug — repaired in her import
 * file from the page text the 13 Sep sweep already holds. No network.
 *
 * THE BUG (fixed in sweep_prototype.js, 24 Sep): a year-less "prorogato fino
 * al 11 novembre" was applied twice, and each application rolled the year on.
 * Gricci closed 2027-11-11, Lotto's Lucina Brembati 2027-01-13; she rejected
 * both.
 *
 * ONE CORRECT ANSWER, AND ONLY THIS BUG CAN CHANGE A ROW. For every row, each
 * stored text for its address is read by the scraper as it was before the fix
 * (from git) and as it is now. A closing date changes only where the OLD reading
 * reproduces the file's opening and closing dates exactly and the NEW reading
 * of the same text keeps the opening date and gives a different closing date.
 * Where the new reading finds an extension, its note is added so the card says
 * where the date came from (Samori: the date was right, the note was not).
 *
 *   node repair_extensions_24sep.js           dry run: lists every change
 *   node repair_extensions_24sep.js --write   rewrites sweep_compressed.csv
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const C = require('../../compress.js');
const NOW = require('../../sweep_prototype.js');

// The parser as the 13 Sep sweep had it: the last version before 23 Sep.
const OLD_AT = '678809e^';
// Written beside the real one so its own requires resolve; removed once loaded.
const oldFile = path.join(__dirname, '..', '..', '.sweep_prototype_before_23sep.js');
fs.writeFileSync(oldFile, execSync(`git show ${OLD_AT}:scraper/sweep_prototype.js`, { cwd: __dirname }));
let OLD;
try { OLD = require(oldFile); } finally { fs.unlinkSync(oldFile); }

const FILE = path.join(__dirname, 'sweep_compressed.csv');
const rows = C.readProForma(FILE);

// Every stored text for an address: the museum's text from this folder's
// sweep.csv, and — where the 13 Sep file's note quoted a whole page (the bug
// fixed 20 Sep) — that page.
const texts = new Map();
const add = (url, t) => { if (!t || t.length < 40) return; if (!texts.has(url)) texts.set(url, new Set()); texts.get(url).add(t); };
for (const r of C.readProForma(path.join(__dirname, 'sweep.csv'))) add(r.url, r.summary);
for (const r of C.readProForma(path.join(__dirname, '..', 'stitch_20260913_0442', 'sweep_compressed.csv'))) {
  const m = String(r.notes || '').match(/not a date field: "([\s\S]{300,})"\.\s*$/);
  if (m) add(r.url, m[1]);
}

const readers = P => [t => P.findDateRange(t), t => P.findDateRangeInProse(t, '')];
const changes = [];
for (const r of rows) {
  for (const t of texts.get(r.url) || []) {
    let hit = null;
    for (let i = 0; i < 2 && !hit; i++) {
      const o = readers(OLD)[i](t), n = readers(NOW)[i](t);
      if (o.start === r.start_date && o.end === r.end_date && o.end
          && n.start === r.start_date && n.end && n.end !== o.end) hit = n;
    }
    if (hit) { changes.push({ r, from: r.end_date, to: hit.end, note: NOW.extensionNote(hit) }); break; }
  }
}
// The note alone, where the date was right but the card never said why.
for (const r of rows) {
  if (changes.some(c => c.r === r) || /Closing date extended/.test(r.notes)) continue;
  for (const t of texts.get(r.url) || []) {
    const n = NOW.findDateRangeInProse(t, '');
    if (n.extendedFrom && n.start === r.start_date && n.end === r.end_date) {
      changes.push({ r, from: r.end_date, to: r.end_date, note: NOW.extensionNote(n) }); break;
    }
  }
}

for (const c of changes) {
  console.log(`${c.r.venue_code}  ${c.r.title.slice(0, 60)}`);
  console.log(`    closing ${c.from} → ${c.to}${c.note ? `\n    note + ${c.note}` : ''}`);
}
console.log(`\n${changes.length} row(s).`);

if (process.argv.includes('--write')) {
  for (const c of changes) {
    c.r.end_date = c.to;
    if (c.note) c.r.notes = NOW.addNote(String(c.r.notes || '').trim(), c.note);
  }
  C.writeCsv(FILE, rows);
  console.log(`Written: ${FILE}`);
}
