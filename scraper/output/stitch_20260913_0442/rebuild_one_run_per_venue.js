// One-off: rebuild the importable CSV so each venue appears from ONE sweep.
// Nothing is re-swept and nothing is re-compressed; rows are SELECTED from the
// existing sweep_compressed.csv, matched back to the sweep that produced them.
const fs = require('fs'), path = require('path');
const C = require('/home/user/Cat-Search-Project/scraper/compress.js');
const OUT = '/home/user/Cat-Search-Project/scraper/output';

const SOURCE = {
  _142632: ['acq','brera','brit','dellav','frick','khm','louvre','menil','moma',
            'morgan','ng','rijks','tate-britain','tate-modern','uffizi','va','wallace'],
  _020041: ['borghese','capo'],          // later container run failed at both
  _142846: ['met','artic'],              // her machine owns these two
};
const RUNDIR = {
  _142632: 'run_2026-09-13_142632',
  _020041: 'run_2026-09-13_020041',
  _142846: 'run_2026-09-13_142846',
};

const read = f => C.parseCsv(fs.readFileSync(f, 'utf8'));
const idOf = r => [r[0], (r[5]||'').trim(), (r[1]||'').trim()].join('\u0001');

// 1. Which rows are we keeping, per venue, from which run?
const wanted = new Map();                 // identity -> venue
for (const [run, venues] of Object.entries(SOURCE)) {
  for (const v of venues) {
    const f = path.join(OUT, RUNDIR[run], v + '.csv');
    const rows = read(f).slice(1).filter(r => r.length > 1 && r[0]);
    for (const r of rows) wanted.set(idOf(r), v);
    console.log(`${v.padEnd(14)} <- ${RUNDIR[run]}  ${rows.length} rows`);
  }
}
console.log('\nwanted rows:', wanted.size);

// 2. Pull those rows out of the compressed file, first copy only.
const src = read(path.join(OUT, 'stitch_20260913_0442', 'sweep_compressed.csv'));
const header = src[0];
const body = src.slice(1).filter(r => r.length > 1 && r[0]);
const taken = new Set(), kept = [], unmatched = [];
for (const r of body) {
  const id = idOf(r);
  if (!wanted.has(id)) continue;
  if (taken.has(id)) continue;
  taken.add(id); kept.push(r);
}
for (const id of wanted.keys()) if (!taken.has(id)) unmatched.push(id);

console.log('compressed file rows:', body.length);
console.log('kept:', kept.length);
console.log('wanted but NOT found in compressed file:', unmatched.length);
for (const u of unmatched.slice(0, 20)) console.log('   MISSING', u.split('\u0001').join(' | ').slice(0, 120));

// 3. Write it, in the same venue order the sweeps use.
const order = [...SOURCE._142632, ...SOURCE._020041, ...SOURCE._142846];
kept.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
const esc = v => (v == null || v === '') ? '' :
  (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const out = [header, ...kept].map(r => r.map(esc).join(',')).join('\n') + '\n';
fs.writeFileSync(process.argv[2], out);
console.log('\nwrote', process.argv[2], kept.length, 'rows');

// 4. Per-venue tally, and how many duplicates remain.
const byVenue = {};
for (const r of kept) byVenue[r[0]] = (byVenue[r[0]] || 0) + 1;
console.log('\nper venue:', JSON.stringify(byVenue, null, 0));
const seenUrl = new Map(); let dupes = 0;
for (const r of kept) { const k = r[0] + '|' + (r[5]||'').toLowerCase(); if (!r[5]) continue;
  if (seenUrl.has(k)) dupes++; else seenUrl.set(k, 1); }
console.log('rows sharing a venue+url with an earlier row:', dupes);
