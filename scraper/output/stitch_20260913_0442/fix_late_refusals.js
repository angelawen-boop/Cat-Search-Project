/**
 * A VENUE'S "LAST TRIED" MUST BE ITS LAST ATTEMPT, NOT THE ATTEMPT ITS ROWS
 * CAME FROM. Her finding, 20 Sep, and the second time this file has needed a
 * repair that only she noticed was missing.
 *
 * THE HISTORY, because it is what makes this necessary and it was nowhere in
 * the guide. The 13 Sep import file was stitched from THREE sweeps — two
 * container runs covering the same venues, plus one off her laptop. That
 * produced two copies of nearly every venue and hundreds of duplicate cards at
 * import, so a session rebuilt the file by hand to hold ONE sweep per venue
 * (`rebuild_one_run_per_venue.js`). For most venues it took the later container
 * run. For BORGHESE and CAPODIMONTE it had to take the EARLIER one, because by
 * the afternoon both venues had stopped answering.
 *
 * That rebuild is right about the ROWS and wrong about the DATE. Dropping the
 * later sweep dropped the only evidence that it happened, so the drawer reports
 * Borghese as last tried at 2:04am when it was tried again at 2:27pm and
 * refused. THAT GAP IS THE WHOLE POINT OF THE DRAWER — tried recently, brought
 * nothing, re-run it alone — and it was missing at exactly the two venues that
 * had earned it.
 *
 * THE FIX RECOVERS, IT DOES NOT INVENT. The later attempt left real marker rows
 * in its own run folder, carrying the venue's own reason for failing. Those
 * rows are appended, stamped from THE VENUE'S LAST LINE IN THAT RUN'S LOG, the
 * same source `add_swept_at.js` uses and for the same reason: a run folder's
 * name is when the RUN began, and stamping by it flattens every venue to one
 * instant.
 *
 * IT IS CODE, NOT A HAND EDIT, because it has exactly one correct answer per
 * venue: the latest run that attempted it. It checks ALL venues, not the two we
 * know about, so a third case cannot hide.
 *
 * Marker rows are not proposals — the app files them in the coverage panel — so
 * this changes her card count by nothing.
 *
 *   node scraper/output/stitch_20260913_0442/fix_late_refusals.js           report
 *   node scraper/output/stitch_20260913_0442/fix_late_refusals.js --apply   write
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../../compress.js');

const OUT = path.join(__dirname, '..');
const FILE = path.join(__dirname, 'sweep_compressed_clean.csv');
const RUNS = ['run_2026-09-13_020041', 'run_2026-09-13_142632', 'run_2026-09-13_142846'];
const MARKER = 'Marker row, not an exhibition.';

// When each venue FINISHED in each run, read off that run's own log.
function attempts() {
  const at = {};
  for (const run of RUNS) {
    const dir = path.join(OUT, run);
    const text = fs.readdirSync(dir).filter(f => f.startsWith('log_'))
      .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    for (const line of text.split('\n')) {
      const m = line.match(/^\[([0-9T:.Z-]+)\]\s+\[([a-z-]+)\]/);
      if (!m) continue;
      (at[m[2]] = at[m[2]] || {})[run] = new Date(m[1]).toISOString();
    }
  }
  return at;
}

const rows = C.parseCsv(fs.readFileSync(FILE, 'utf8'));
const header = rows[0];
const body = rows.slice(1).filter(r => r.length > 1 && r[0]);
const iSwept = header.indexOf('swept_at');
if (iSwept < 0) throw new Error('this file has no swept_at column — run add_swept_at.js first');

// What the file currently claims for each venue.
const claimed = {};
for (const r of body) {
  const s = r[iSwept];
  if (s && (!claimed[r[0]] || s > claimed[r[0]])) claimed[r[0]] = s;
}

const at = attempts();
const extra = [];
for (const venue of Object.keys(claimed).sort()) {
  const tried = at[venue];
  if (!tried) throw new Error(`no log line for ${venue} in any source run — refusing to guess`);
  const [lastRun, lastAt] = Object.entries(tried).sort((a, b) => a[1] < b[1] ? -1 : 1).pop();
  if (lastAt <= claimed[venue]) continue;

  // The later attempt happened. Bring back what it actually left behind.
  const f = path.join(OUT, lastRun, venue + '.csv');
  const markers = C.parseCsv(fs.readFileSync(f, 'utf8')).slice(1)
    .filter(r => r.length > 1 && r[0] && String(r[6] || '').includes(MARKER));
  if (!markers.length) {
    throw new Error(`${venue}: a later attempt at ${lastAt} left no marker rows in ${lastRun} — `
      + 'this is not the shape of failure this repair was written for, so it stops rather than guess');
  }
  console.log(`${venue.padEnd(12)} file says ${claimed[venue]}  ->  tried again ${lastAt} `
    + `(${lastRun}), ${markers.length} marker row(s) restored`);
  for (const m of markers) extra.push([...m.slice(0, 7), lastAt]);
}

if (!extra.length) { console.log('every venue already carries its last attempt — nothing to do'); process.exit(0); }
console.log(`\n${extra.length} marker row(s) to add. They are NOT proposals: the app files them in the coverage panel.`);

if (process.argv.includes('--apply')) {
  const esc = v => (v == null || v === '') ? ''
    : (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
  const out = [header, ...body, ...extra].map(r => r.map(esc).join(',')).join('\n') + '\n';
  fs.writeFileSync(FILE, out);
  console.log('wrote', FILE, body.length + extra.length, 'rows');
} else {
  console.log('report only — pass --apply to write it');
}
