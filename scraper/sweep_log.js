#!/usr/bin/env node
//
// ── REBUILDING THE APP'S FRESHNESS DRAWER — her ruling, 21 Sep 2026 ─────────
//
// The app keeps a sweep log in its own store: per venue, when it was last
// TRIED and when it last BROUGHT ROWS. It is a cache — every fact in it comes
// from the swept_at column of a sweep file — so losing it costs a rebuild and
// never her work. §4 of CLAUDE.md has the reasoning for why it lives there.
//
// WHY THIS FILE EXISTS. The rebuild was described as "she re-imports a sweep
// file", and she refused that answer: with several sweep files on hand she
// would have to know which one carries the latest picture, and sweep files
// come from a session in the first place. It has exactly one correct answer
// derivable from the files on disk, which makes it code's job and not a habit
// anybody has to remember. Her rule, 10 Sep.
//
// WHAT IT READS. Every pro forma CSV under output/ (archive included) that
// carries a swept_at column. Files older than 20 Sep do not have the column
// and are skipped — they cannot contribute and cannot corrupt.
//
// THE RULE IS THE APP'S OWN, DELIBERATELY. mergeSweepLog() in the JSX takes
// the LATER of what it holds and what it reads, per venue and per fact
// independently. So scanning every file in any order lands on one answer, and
// an old file can never push a newer date back. Restating the rule here rather
// than importing it is the drift risk this repo keeps being bitten by, so
// fixtures S-001 to S-006 assert the two agree.
//
// TRIED vs BROUGHT ROWS. Tried is the latest swept_at on ANY row of that
// venue, marker rows included — a refusal is still an attempt, which is the
// whole point of sweeping the blocked three. Brought rows is the latest
// swept_at on its REAL rows only. Borghese and Capodimonte are the venues
// where the two differ, and that gap is the line that says re-run this one.
//
// It prints JSON and writes nothing. Putting it into the page's store is an
// ArtifactData call a session makes, so this stays read-only and safe to run.

const fs = require('fs');
const path = require('path');
const C = require('./compress.js');
const { isMarker, KNOWN_VENUES } = require('./qc.js');

const OUTPUT_DIR = path.join(__dirname, 'output');

// Only the later of two stamps ever wins, and a missing stamp never displaces
// a real one. Mirrors mergeSweepLog() in the JSX.
const later = (a, b) => (!a || (b && b > a)) ? b : a;

function csvFilesUnder(dir) {
  const out = [];
  const walk = d => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.csv')) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

// A file with no swept_at column predates the column and is skipped outright.
// Reading it would contribute nothing and there is no way for it to do harm,
// but saying how many were skipped keeps the scan honest about its coverage.
function hasSweptAt(file) {
  try {
    const first = fs.readFileSync(file, 'utf8').slice(0, 4096).split(/\r?\n/)[0] || '';
    return first.toLowerCase().includes('swept_at');
  } catch { return false; }
}

/**
 * Fold pro forma rows into a sweep-log map, returning a NEW map.
 *
 * Separate from scan() so the rule can be tested against rows rather than
 * against files on disk — and so fixture S-004 can hold it against the app's
 * own mergeSweepLog and fail if the two ever drift.
 *
 * A row with no venue code, no stamp, or a venue code the app would not
 * accept contributes nothing. It cannot be mended here and qc.js already
 * blocks it from reaching her; silently skipping it is right in a rebuilder
 * whose whole job is dates.
 */
function fold(rows, into) {
  const venues = { ...(into || {}) };
  let contributed = 0;
  for (const r of rows) {
    const v = String(r.venue_code || '').trim();
    const at = String(r.swept_at || '').trim();
    if (!v || !at || !KNOWN_VENUES.has(v)) continue;
    const was = venues[v] || { attempted: null, returned: null };
    venues[v] = {
      attempted: later(was.attempted, at),
      // A MARKER ROW IS AN ATTEMPT BUT NOT A ROW. That is the entire reason
      // the drawer carries two dates instead of one: Borghese was tried at
      // 2:27pm and last brought rows at 2:04am, and that gap is the line
      // that says re-run this venue on its own.
      returned:  later(was.returned, isMarker(r) ? null : at),
    };
    contributed++;
  }
  return { venues, contributed };
}

function scan(files) {
  let venues = {};
  const used = [];
  let skipped = 0;
  for (const file of files) {
    if (!hasSweptAt(file)) { skipped++; continue; }
    let rows;
    try { rows = C.readProForma(file); } catch { skipped++; continue; }
    const r = fold(rows, venues);
    venues = r.venues;
    if (r.contributed) used.push({ file: path.relative(OUTPUT_DIR, file), rows: r.contributed });
    else skipped++;
  }
  return { venues, used, skipped };
}

function main(argv) {
  const targets = argv.filter(a => !a.startsWith('--'));
  const files = targets.length
    ? targets.flatMap(t => fs.statSync(t).isDirectory() ? csvFilesUnder(t) : [t])
    : csvFilesUnder(OUTPUT_DIR);

  const { venues, used, skipped } = scan(files);
  const doc = { venues, updatedAt: new Date().toISOString() };

  if (argv.includes('--json')) { process.stdout.write(JSON.stringify(doc, null, 2) + '\n'); return; }

  console.log(`Read ${used.length} file(s) carrying swept_at; skipped ${skipped} without it.`);
  for (const u of used) console.log(`  ${u.file}  (${u.rows} rows)`);
  console.log('');
  const codes = Object.keys(venues).sort();
  console.log(`${codes.length} venue(s):`);
  for (const v of codes) {
    const e = venues[v];
    const gap = e.returned && e.attempted && e.returned < e.attempted ? '   <- tried later than it last brought rows' : '';
    console.log(`  ${v.padEnd(14)} tried ${e.attempted}   rows ${e.returned || '(never)'}${gap}`);
  }
  console.log('\nRe-run with --json to get the document to write into the page store.');
}

module.exports = { scan, fold, later, csvFilesUnder, hasSweptAt };
if (require.main === module) main(process.argv.slice(2));
