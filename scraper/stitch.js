/**
 * Concatenate venue CSVs into one importable file. NO LOGIC.
 *
 *   node scraper/stitch.js run_2026-09-13_020041 run_2026-09-13_020305
 *   node scraper/stitch.js <run> <run> --out=/tmp/stitched.csv
 *
 * HER DESIGN, 13 Sep. This step chooses nothing. It does not pick which copy
 * of a venue wins, does not drop marker rows, does not notice duplicates. Every
 * row from every named folder goes in, in the order given, under one header.
 *
 * WHY IT IS DUMB ON PURPOSE. The alternative was a merge tool with a precedence
 * rule — hers replaces the container's markers for met and artic. That works,
 * and it puts a rule in a place she cannot see it working: get the argument
 * order wrong months from now and rows vanish with nothing saying so. Every
 * judgement therefore moves into the app, where she approves each one. The
 * consequence worth stating: ORDER CANNOT CHANGE THE RESULT, because nothing
 * is chosen. Pass the folders backwards and you get the same file.
 *
 * TWO FOLDERS NAMING THE SAME VENUE IS THE POINT, NOT A PROBLEM. A venue swept
 * on both machines arrives twice, and the app folds the copies on URL — filling
 * gaps where they agree, asking her where they do not. Inside ONE run folder
 * that can never happen, because re-running a venue overwrites its own file.
 *
 * It validates the pro forma shape and REFUSES a bad file rather than absorbing
 * it. That guard exists for the three venues no machine can reach, whose rows
 * may have to come from Chat Claude, which has no project context and cannot be
 * trusted to produce the right columns or date format.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'output');
const COLS = ['venue_code', 'title', 'start_date', 'end_date', 'summary', 'url', 'notes'];

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const names = args.filter(a => !a.startsWith('--'));

if (!names.length) {
  console.error('usage: node scraper/stitch.js <run dir> [<run dir> ...] [--out=path]');
  console.error('       folder names are relative to scraper/output/, or absolute');
  process.exit(1);
}

// Reuse the compressor's parser rather than write a second one: curatorial text
// is full of commas and newlines, and two parsers would drift.
const { parseCsv } = require('./compress.js');

const rows = [];
const perVenue = new Map();          // venue -> [{dir, n}]
const problems = [];

for (const name of names) {
  const dir = path.isAbsolute(name) ? name : path.join(OUT_DIR, name);
  if (!fs.existsSync(dir)) { console.error(`NOT FOUND: ${dir}`); process.exit(1); }

  // VENUE FILES, NOT sweep.csv. sweep.csv is rebuilt from them and would double
  // every row of any folder that has one.
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.csv') && f !== 'sweep.csv' && f !== 'sweep_compressed.csv')
    .sort();

  for (const f of files) {
    const table = parseCsv(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!table.length) { problems.push(`${name}/${f}: empty file`); continue; }

    const header = table[0].map(h => String(h).trim().toLowerCase());
    if (COLS.some((c, i) => header[i] !== c)) {
      problems.push(`${name}/${f}: columns are ${header.join(',')} — expected ${COLS.join(',')}`);
      continue;
    }

    let kept = 0;
    for (let k = 1; k < table.length; k++) {
      const r = table[k];
      if (!r.length || r.every(c => !String(c || '').trim())) continue;   // blank line
      const row = COLS.map((_, i) => String(r[i] ?? ''));
      // Dates are checked but NEVER corrected: a wrong date quietly fixed is
      // worse than one refused, and the app says so on the card either way.
      for (const [i, label] of [[2, 'start_date'], [3, 'end_date']]) {
        const v = row[i].trim();
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          problems.push(`${name}/${f} row ${k + 1}: ${label} "${v}" is not YYYY-MM-DD`);
        }
      }
      if (!row[0].trim()) problems.push(`${name}/${f} row ${k + 1}: no venue_code`);
      rows.push(row);
      kept++;
    }
    const code = f.replace(/\.csv$/, '');
    if (!perVenue.has(code)) perVenue.set(code, []);
    perVenue.get(code).push({ dir: name, n: kept });
  }
}

if (problems.length) {
  console.error(`\nREFUSED — ${problems.length} problem${problems.length === 1 ? '' : 's'}. Nothing was written.\n`);
  for (const p of problems.slice(0, 40)) console.error('  ' + p);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  console.error('\nFix the file and run again. Nothing here is guessed at or repaired for you.');
  process.exit(1);
}

const q = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const out = outArg ? outArg.split('=').slice(1).join('=')
                   : path.join(OUT_DIR, `stitched_${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(out, [COLS.join(','), ...rows.map(r => r.map(q).join(','))].join('\n') + '\n', 'utf8');

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nStitched ${rows.length} rows from ${names.length} folder${names.length === 1 ? '' : 's'}.\n`);
console.log('  ' + pad('venue', 14) + 'rows   from');
console.log('  ' + '-'.repeat(60));
let dupVenues = 0;
for (const [code, srcs] of [...perVenue].sort()) {
  const total = srcs.reduce((a, b) => a + b.n, 0);
  console.log('  ' + pad(code, 14) + pad(total, 7) + srcs.map(s => `${s.dir} (${s.n})`).join('  +  '));
  if (srcs.length > 1) dupVenues++;
}
if (dupVenues) {
  console.log(`\n  ${dupVenues} venue${dupVenues === 1 ? '' : 's'} came from more than one folder, so ${dupVenues === 1 ? 'its' : 'their'} rows appear`);
  console.log('  more than once. That is intended — the app folds them and shows you each decision.');
}
console.log(`\nWrote ${out}`);
console.log('This is the RAW file. Compress it before importing:  node scraper/compress.js\n');
