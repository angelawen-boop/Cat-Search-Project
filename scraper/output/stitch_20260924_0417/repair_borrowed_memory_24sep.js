/**
 * A description borrowed from ANOTHER exhibition's address — repaired in her
 * import file by replaying compression's memory decisions. No model, no network.
 *
 * THE BUG (fixed in compress.js, 24 Sep): memory was looked up with "past"
 * dropped from the address, so on 13 Sep the Rijksmuseum's older Ed van der
 * Elsken show (/past/ed-van-der-elsken, page always 404) took Up Close's
 * description and stored it under its own address, and 24 Sep carried it on.
 *
 * ONE CORRECT ANSWER. This folder's compression is replayed with the memory
 * code as it was (from git) and as it is now, over the same memory files, and
 * every row whose DECISION differs is listed. A row is rewritten only where the
 * new decision needs no model; anything else is reported and left alone.
 *
 *   node repair_borrowed_memory_24sep.js           dry run
 *   node repair_borrowed_memory_24sep.js --write   rewrites sweep_compressed.csv
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const C = require('../../compress.js');

const OLD_AT = '3b70920';   // compress.js as this folder's compression ran it
const oldFile = path.join(__dirname, '..', '..', '.compress_before_24sep.js');
fs.writeFileSync(oldFile, execSync(`git show ${OLD_AT}:scraper/compress.js`, { cwd: __dirname }));
let OLD;
try { OLD = require(oldFile); } finally { fs.unlinkSync(oldFile); }

const DIR = path.basename(__dirname);
const FILE = path.join(__dirname, 'sweep_compressed.csv');
const raw = C.readProForma(path.join(__dirname, 'sweep.csv'));
const out = C.readProForma(FILE);
if (raw.length !== out.length) throw new Error(`sweep.csv has ${raw.length} rows, the file ${out.length}`);

// The memory this folder's compression used, each version building its own.
const seed = C.seedMemory(path.join(__dirname, '..', '..', '..', 'Cat_Watch.jsx'));
const memOf = M => { const m = M.loadMemory(M.completedCompressions(DIR)); M.mergeSeedMemory(m, seed); return m; };
const memOld = memOf(OLD), memNew = memOf(C);
const claimed = new Set(raw.map(C.exactKey).filter(Boolean));

// As compress_cli decides, then and now.
const before = r => OLD.decide(r, OLD.findPrevious(memOld, r));
const after = r => {
  const found = C.findPrevious(memNew, r, claimed);
  const prev = found && !C.normalizeRaw(r.summary) && !C.mayCarry(memNew, found) ? null : found;
  return C.decide(r, prev);
};

const changes = [], needsModel = [];
raw.forEach((r, i) => {
  if (String(r.title || '').startsWith('[')) return;
  const o = before(r), n = after(r);
  if (o.action === n.action && o.summary === n.summary) return;
  const f = out[i];
  if (f.url !== r.url) throw new Error(`row ${i + 2}: files out of step`);
  (n.summary === null ? needsModel : changes).push({ f, o, n });
});

for (const { f, o, n } of changes) {
  console.log(`${f.venue_code}  ${f.title}  (${f.url})`);
  console.log(`    was ${o.action}: "${o.summary}"  →  now ${n.action}: "${n.summary}"`);
}
for (const { f, o, n } of needsModel) console.log(`NEEDS A MODEL, left alone: ${f.venue_code} ${f.title} (${o.action} → ${n.action})`);
console.log(`\n${changes.length} row(s) to change, ${needsModel.length} left for a model.`);

if (process.argv.includes('--write')) {
  for (const { f, o, n } of changes) {
    f.summary = n.summary;
    // The old decision's note described the borrowed words; it goes with them.
    if (o.note) f.notes = String(f.notes || '').replace(o.note, '').replace(/\s+/g, ' ').trim();
    if (n.note) f.notes = C.addNote(f.notes, n.note);
  }
  C.writeCsv(FILE, out);
  console.log(`Written: ${FILE}`);
}
