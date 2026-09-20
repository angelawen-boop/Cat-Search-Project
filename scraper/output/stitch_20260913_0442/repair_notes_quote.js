/**
 * Shorten the over-long date quotes in an already-built import file.
 *
 * WHY THIS EXISTS AND NOT A RE-SWEEP. The fault is fixed at the source
 * (frag(), sweep_prototype.js), but this file was swept on 13 Sep and she is
 * importing it now; re-sweeping and re-compressing to pick up a note change
 * would cost a day and risk losing rows to venues that have since gone dark.
 *
 * IT INVENTS NOTHING. The over-long quote IS the page text the dates were read
 * from, so the correct short quote can be recovered by running the FIXED parser
 * over it — the same code that will write the note on the next sweep. Where the
 * parser finds nothing to quote, the quote is dropped and the reason kept: the
 * fact ("read from a sentence, not a date field") is still true and is the part
 * that is for her.
 *
 *   node scraper/output/<dir>/repair_notes_quote.js            report only
 *   node scraper/output/<dir>/repair_notes_quote.js --apply    write it
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { findDateRangeInProse } = require('../../sweep_prototype.js');

const FILE = path.join(__dirname, 'sweep_compressed_clean.csv');
const MAX = 120;

function parse(text) {
  const out = []; let i = 0, f = '', row = [], q = false;
  text = String(text).replace(/\r\n?/g, '\n');
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
      f += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(f); f = ''; i++; continue; }
    if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; i++; continue; }
    f += c; i++;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out.filter(r => r.some(c => String(c).trim() !== ''));
}
const esc = v => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

const QUOTE = /(date read from a sentence, not a date field): "([\s\S]*?)"\./;

const rows = parse(fs.readFileSync(FILE, 'utf8'));
const head = rows[0], ni = head.indexOf('notes'), ti = head.indexOf('title'), vi = head.indexOf('venue_code');
let touched = 0, requoted = 0, dropped = 0, before = 0, after = 0;

for (const r of rows.slice(1)) {
  const n = r[ni] || '';
  before += n.length;
  const m = n.match(QUOTE);
  if (!m || m[2].length <= MAX) { after += n.length; continue; }
  const frag = (findDateRangeInProse(m[2]).raw || '').trim();
  const repl = frag ? `${m[1]}: "${frag}".` : `${m[1]}.`;
  frag ? requoted++ : dropped++;
  r[ni] = n.replace(QUOTE, repl);
  after += r[ni].length;
  touched++;
  if (touched <= 3) console.log(`  ${r[vi]} — ${r[ti].slice(0, 44)}\n    ${m[2].length} chars -> ${frag ? '"' + frag + '"' : '(quote dropped)'}`);
}

console.log(`\n${touched} rows shortened (${requoted} re-quoted, ${dropped} quote dropped).`);
console.log(`notes column: ${before} chars -> ${after} (${Math.round(100 - after / before * 100)}% smaller)`);

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');
  console.log('written: ' + FILE);
} else {
  console.log('nothing written — pass --apply');
}
