#!/usr/bin/env node
//
// ── WHAT EACH VENUE CURRENTLY YIELDS — printed, never typed ────────────────
//
// For three weeks the project guide carried a hand-typed table of every venue
// and its row count. It went stale silently: it said "artic never run" while
// four artic runs sat committed, and a session spent its life acting on that.
// The guide has said since 12 Sep that this table should be printed by a
// script. This is that script.
//
// Her rule, 10 Sep: a task with exactly one correct answer derivable from the
// inputs is code's job, never a line of prose a session re-derives. How many
// exhibitions a venue returned is exactly that — the answer is on disk.
//
// WHAT IT CANNOT TELL YOU, and this is why the guide still carries prose next
// to it: every "her ruling" is judgement about the outside world and is not
// derivable from any file. Whether the V&A's Displays count as exhibitions,
// whether the Menil's permanent galleries are in — those stay written down.
// This script answers "how many, from when, and is it still answering".
//
// TWO DATES, NOT ONE, for the reason the app's freshness drawer has two: a
// venue that was TRIED and refused is a different thing from one nobody asked.
// Rows come from the latest run that actually brought rows; the attempt date
// comes from the latest run that held the venue at all. When those differ the
// venue has stopped answering, and that gap is the line worth reading.
//
// Everything here is read from the run folders. Nothing is fetched, nothing is
// written. Safe to run at any time.

const fs = require('fs');
const path = require('path');
const C = require('./compress.js');
const { venueShape, isMarker } = require('./qc.js');
// The venue list comes from the recipes themselves. A second hand-typed list of
// venue codes has already cost this project once — two finished recipes could
// not be selected and nothing said why — so there is no copy here to drift.
const { VENUES } = require('./sweep_prototype.js');

const OUTPUT_DIR = path.join(__dirname, 'output');
const RAW_CSV = 'sweep.csv';

/**
 * Every run on disk, live and archived, oldest first.
 *
 * ORDERED BY THE FOLDER'S OWN NAME, which IS its start time, never by position
 * in a directory listing. qc.js learned this the hard way: a run read out of
 * archive/ was not in the live listing at all, so every later run counted as
 * "before" it and a 12 Sep folder was reported as having lost rows against a
 * 13 Sep one. A comparison that can run backwards in time is worse than none.
 *
 * Stitch folders are skipped deliberately. Their rows are copies of rows in the
 * runs, so counting both would report a venue twice and attribute it to a
 * folder that never fetched anything.
 */
function allRuns() {
  const out = [];
  const scan = (base, prefix) => {
    if (!fs.existsSync(base)) return;
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('run_')) continue;
      if (fs.existsSync(path.join(base, d, RAW_CSV))) out.push({ name: d, rel: prefix + d });
    }
  };
  scan(OUTPUT_DIR, '');
  scan(path.join(OUTPUT_DIR, 'archive'), 'archive/');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** run_2026-09-13_142632 -> 13 Sep 2026. The folder name is Sydney time. */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function runDate(name) {
  const m = /^run_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/.exec(name);
  if (!m) return name;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * The distinct reasons this venue's marker rows give, shortest first.
 *
 * Marker notes read "The venue's "past" listing page could not be read: <the
 * reason>. Marker row, not an exhibition." — the reason is the sentence the
 * scraper's own failureProse() wrote, so it is taken whole rather than matched
 * against a phrase list here, which would drift from it.
 */
function whyFrom(rows, code) {
  const reasons = new Set();
  for (const r of rows) {
    if (String(r.venue_code || '').trim() !== code || !isMarker(r)) continue;
    const m = /could not be read: (.+?)\. Marker row/.exec(String(r.notes || ''));
    if (m) reasons.add(m[1].trim());
  }
  return reasons.size ? [...reasons].sort((a, b) => a.length - b.length).join('; ') : null;
}

/**
 * Walk every run once and record, per venue, its last run of each kind.
 *
 * One pass over the files rather than one per venue: a re-read per venue would
 * be 21 reads of the same CSVs and would invite the two to disagree.
 */
function collect() {
  const state = new Map();
  for (const code of Object.keys(VENUES)) {
    state.set(code, { code, name: VENUES[code].name,
      machine: VENUES[code].route === 'local' ? 'her laptop' : 'container',
      rows: null, rowsFrom: null, summaries: 0, triedFrom: null, markersOnly: false,
      why: null });
  }
  for (const run of allRuns()) {
    let rows, shape;
    try {
      rows = C.readProForma(path.join(OUTPUT_DIR, run.rel, RAW_CSV));
      shape = venueShape(rows);
    } catch { continue; }
    for (const [code, s] of shape) {
      const v = state.get(code);
      if (!v) continue;                       // a code no recipe claims any more
      v.triedFrom = run.name;                 // runs are oldest first, so last wins
      v.markersOnly = s.real === 0;
      // WHY IT BROUGHT NOTHING IS NOT GUESSABLE AND MUST NOT BE GUESSED. A 429
      // is us having hammered the venue in that session; a 403 is the venue
      // refusing outright; a timeout is the venue being down. Calling all three
      // "blocked" is how a bad afternoon becomes a written fact about a site.
      // The scraper already wrote the reason on the marker row, so it is read,
      // never inferred from the fact that the count was zero.
      v.why = s.real === 0 ? whyFrom(rows, code) : null;
      if (s.real > 0) {
        v.rows = s.real;
        v.summaries = s.summaries;
        v.rowsFrom = run.name;
      }
    }
  }
  return [...state.values()];
}

function report(venues) {
  const pad = (s, n) => String(s).padEnd(n);
  const w = { name: Math.max(...venues.map(v => v.name.length)), code: 12 };
  console.log('');
  console.log(`${pad('Venue', w.name)}  ${pad('Code', w.code)}  Rows  Last brought rows  Last tried       Swept from`);
  console.log('-'.repeat(w.name + w.code + 56));
  let total = 0;
  for (const v of venues) {
    const rows = v.rows === null ? '   -' : String(v.rows).padStart(4);
    if (v.rows) total += v.rows;
    const gone = v.triedFrom && v.rowsFrom !== v.triedFrom;
    const tried = v.triedFrom ? runDate(v.triedFrom) : 'never swept';
    console.log(
      `${pad(v.name, w.name)}  ${pad(v.code, w.code)}  ${rows}  `
      + `${pad(v.rowsFrom ? runDate(v.rowsFrom) : '-', 17)}  ${pad(tried, 15)}  ${v.machine}`
      + (gone ? '   <- stopped answering' : ''));
  }
  console.log('-'.repeat(w.name + w.code + 56));
  console.log(`${venues.filter(v => v.rows).length} venues returning exhibitions, ${total} rows in total.`);

  // A venue with no route at all is a different problem from one that had rows
  // and stopped, so they are said separately rather than both reading as zero.
  const never = venues.filter(v => !v.rows && v.triedFrom);
  const stopped = venues.filter(v => v.rows && v.rowsFrom !== v.triedFrom);
  if (never.length) {
    console.log('\nNo exhibitions ever, and why the last attempt failed:');
    for (const v of never) console.log(`  ${pad(v.code, 14)}${v.why || 'no reason recorded'}`);
    console.log('  (swept anyway - a refusal costs half a second and proves the block is still real)');
  }
  if (stopped.length) {
    console.log('\nHad rows once, last attempt brought none:');
    for (const v of stopped) {
      console.log(`  ${pad(v.code, 14)}${v.rows} rows on ${runDate(v.rowsFrom)}, `
        + `nothing on ${runDate(v.triedFrom)} - ${v.why || 'no reason recorded'}`);
    }
  }
  const thin = venues.filter(v => v.rows && v.summaries < v.rows);
  if (thin.length) {
    console.log(`\nRows with no description: ${thin.map(v =>
      `${v.code} ${v.rows - v.summaries} of ${v.rows}`).join(', ')}`);
  }
  console.log('');
}

module.exports = { collect, allRuns, runDate };

if (require.main === module) {
  const venues = collect();
  if (process.argv.includes('--json')) console.log(JSON.stringify(venues, null, 2));
  else report(venues);
}
