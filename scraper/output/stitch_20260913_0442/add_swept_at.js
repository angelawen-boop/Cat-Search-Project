/**
 * Add the swept_at column to an already-built import file.
 *
 * WHY IT EXISTS. swept_at is new (20 Sep), and this file was swept on 13 Sep.
 * Re-sweeping to pick up a column would cost a day and risk losing rows to
 * venues that have gone dark since — artic has refused her machine since
 * 16 Sep. So the fact is recovered rather than re-collected.
 *
 * WHERE THE TIMES COME FROM, and this is the part that matters: THE VENUE'S
 * LAST LINE IN THE RUN LOG. Not the run folder's name. The folder is stamped
 * when the RUN began, and these runs took ten minutes across nineteen venues —
 * using it would put every venue at the same instant, which is exactly the
 * flattening this column exists to undo. The log is timestamped per line and
 * tagged with the venue, so the last line a venue wrote is when it finished.
 *
 *   node scraper/output/<dir>/add_swept_at.js           report only
 *   node scraper/output/<dir>/add_swept_at.js --apply   write it
 */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..');
const FILE = path.join(__dirname, 'sweep_compressed_clean.csv');

// Which run each venue's rows were taken from — the same table as
// rebuild_one_run_per_venue.js, which built this file.
const SOURCE = {
  'run_2026-09-13_142632': ['acq', 'brera', 'brit', 'dellav', 'frick', 'khm', 'louvre',
    'menil', 'moma', 'morgan', 'ng', 'rijks', 'tate-britain', 'tate-modern', 'uffizi',
    'va', 'wallace'],
  'run_2026-09-13_020041': ['borghese', 'capo'],   // the later run got only markers at both
  'run_2026-09-13_142846': ['met', 'artic'],       // her machine owns these two
};

function sweepTimes() {
  const at = {};
  for (const [run, venues] of Object.entries(SOURCE)) {
    const dir = path.join(OUT, run);
    const text = fs.readdirSync(dir).filter(f => f.startsWith('log_'))
      .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const last = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^\[([0-9T:.Z-]+)\]\s+\[([a-z-]+)\]/);
      if (m) last[m[2]] = m[1];
    }
    for (const v of venues) {
      if (!last[v]) throw new Error(`no log line for ${v} in ${run} — refusing to guess`);
      at[v] = new Date(last[v]).toISOString();
    }
  }
  return at;
}

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

const at = sweepTimes();
const rows = parse(fs.readFileSync(FILE, 'utf8'));
const head = rows[0];
if (head.includes('swept_at')) { console.log('already has swept_at — nothing to do.'); process.exit(0); }
head.push('swept_at');

const missing = new Set();
const seen = {};
for (const r of rows.slice(1)) {
  const v = r[0];
  while (r.length < head.length - 1) r.push('');
  if (at[v]) { r.push(at[v]); seen[v] = (seen[v] || 0) + 1; }
  else { r.push(''); missing.add(v); }
}

console.log('venue        rows  swept_at');
for (const v of Object.keys(seen).sort()) console.log(v.padEnd(13) + String(seen[v]).padStart(4) + '  ' + at[v]);
if (missing.size) console.log('\nNO SWEEP TIME, left blank: ' + [...missing].join(', '));
console.log(`\n${rows.length - 1} rows, ${Object.keys(seen).length} venues dated.`);

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, rows.map(r => r.map(esc).join(',')).join('\n') + '\n');
  console.log('written: ' + FILE);
} else {
  console.log('nothing written — pass --apply');
}
