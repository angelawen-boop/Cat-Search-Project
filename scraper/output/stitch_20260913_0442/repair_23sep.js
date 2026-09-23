/**
 * Four repairs to her import file, from her first sitting with it — 23 Sep.
 *
 *   1. END DATES A YEAR OR TWO LATE. The extension rule read a repeat of the
 *      closing date ("prorogato fino al 11 novembre", no year) as a new
 *      extension and rolled it into a later year. Gricci closed 2027-11-11,
 *      Lotto's Lucina Brembati 2027-01-13. She rejected both.
 *   2. EXTENSION NOTES MISSING where the dates came from the exhibition's own
 *      page. Samori's row closed correctly on 9 June 2026, but its note quoted
 *      only the first range, so the card contradicted itself and she rejected
 *      a correct row.
 *   3. THE SAME SENTENCE TWICE in a note — every Brera card.
 *   4. ENGLISH TITLES at the start of the description, from the title store.
 *
 * All four are fixed at the source (sweep_prototype.js, compress.js); this
 * brings the 13 Sep file into line without a re-sweep, as repair_notes_quote.js
 * did before it. Reasoning: docs/import-file.md.
 *
 * IT INVENTS NOTHING. Dates are recomputed by the scraper's own CORRECTED
 * functions from text already in this folder — the quoted sentence in the note
 * and the venue's raw page text in sweep.csv. English titles come only from
 * the store, which only a checked model answer can fill.
 *
 *   node scraper/output/stitch_20260913_0442/repair_23sep.js           report only
 *   node scraper/output/stitch_20260913_0442/repair_23sep.js --apply   write it
 *
 * Running it twice changes nothing the second time.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../../sweep_prototype.js');
const C = require('../../compress.js');

const FILE = path.join(__dirname, 'sweep_compressed_clean.csv');
const RAW = path.join(__dirname, 'sweep.csv');
const TITLE_PENDING = path.join(__dirname, 'title_pending.json');
const TITLE_ANSWERS = path.join(__dirname, 'title_answers.json');
const APPLY = process.argv.includes('--apply');

const EXTENDED = 'The venue extended this exhibition;';
const QUOTE = /read from a sentence, not a date field: "([^"]*)"/;

// ── The title store ─────────────────────────────────────────────────────────
// The same checks compress.js --check applies: every title asked is answered,
// nothing unasked, each answer a string or null of the right shape.
function fillTitleStore() {
  if (!fs.existsSync(TITLE_PENDING)) return C.loadTitleStore();
  if (!fs.existsSync(TITLE_ANSWERS)) {
    // Refused when writing; a report may still show the other three repairs.
    if (APPLY) throw new Error('title_answers.json missing — the titles have not been answered yet.');
    console.log('(No title answers yet — English titles not shown in this report.)\n');
    return C.loadTitleStore();
  }
  const asked = JSON.parse(fs.readFileSync(TITLE_PENDING, 'utf8')).titles.map(t => t.key);
  const ans = JSON.parse(fs.readFileSync(TITLE_ANSWERS, 'utf8'));
  const problems = [];
  for (const k of asked) if (!Object.prototype.hasOwnProperty.call(ans, k)) problems.push(`no answer: ${k}`);
  for (const k of Object.keys(ans)) if (!asked.includes(k)) problems.push(`never asked: ${k}`);
  for (const [k, v] of Object.entries(ans)) {
    const r = C.validateTitleAnswer(v);
    if (!r.ok) problems.push(`${k}: ${r.reason}`);
  }
  if (problems.length) throw new Error('Title answers refused:\n  ' + problems.join('\n  '));
  const store = C.loadTitleStore();
  for (const [k, v] of Object.entries(ans)) store[k] = C.validateTitleAnswer(v).text;
  if (APPLY) C.saveTitleStore(store);
  return store;
}

// ── Notes: the same sentence never twice ─────────────────────────────────────
function dedupeSentences(notes) {
  // Split after every full stop — a note sentence may begin in lowercase
  // ("opening date read from a sentence…"). Only an EXACT repeat is dropped,
  // so a quote split in the middle loses nothing.
  const parts = String(notes || '').split(/(?<=[.!?]["”]?) +/);
  const seen = new Set();
  const kept = parts.filter(p => (seen.has(p) ? false : (seen.add(p), true)));
  return kept.length === parts.length ? notes : kept.join(' ');
}

// ── Main ────────────────────────────────────────────────────────────────────
const rows = C.readProForma(FILE);
const rawByUrl = new Map();
for (const r of C.readProForma(RAW)) {
  const k = `${r.venue_code}|${r.url}`;
  if (r.url && r.summary && !rawByUrl.has(k)) rawByUrl.set(k, r.summary);
}
const store = fillTitleStore();

const log = [];
const unexplained = [];
const out = rows.map(row => {
  if (String(row.title || '').startsWith('[')) return row;
  const r = { ...row };

  // 1 and 2 — dates and extension notes, from the corrected rule.
  const q = (r.notes || '').match(QUOTE);
  const raw = rawByUrl.get(`${r.venue_code}|${r.url}`) || '';
  if (q && raw && r.end_date) {
    const base = S.findDateRange(q[1]);
    const expected = base.end ? S.applyExtension({ start: base.start, end: base.end }, raw) : null;
    if (expected && expected.end && expected.end !== r.end_date) {
      // ONLY THE ROLLOVER FAMILY IS REPAIRED: same day and month, a later
      // year. Anything else that disagrees is printed and left alone — a
      // listing date the quote never saw is not this bug.
      if (expected.end.slice(4) === r.end_date.slice(4) && r.end_date > expected.end) {
        log.push(`DATE   ${r.venue_code} | ${r.title.slice(0, 60)} | ${r.end_date} → ${expected.end}`);
        r.end_date = expected.end;
      } else {
        unexplained.push(`${r.venue_code} | ${r.title.slice(0, 60)} | file ${r.end_date}, rule ${expected.end}`);
      }
    }
    if (expected && expected.extendedFrom && expected.end === r.end_date && !r.notes.includes(EXTENDED)) {
      r.notes = S.addNote(r.notes, `The venue extended this exhibition; it first announced ${expected.extendedFrom} as the closing date.`);
      log.push(`EXTEND ${r.venue_code} | ${r.title.slice(0, 60)} | first announced ${expected.extendedFrom}`);
    }
  }

  // 3 — the same sentence twice.
  const n = dedupeSentences(r.notes);
  if (n !== r.notes) { log.push(`NOTE   ${r.venue_code} | ${r.title.slice(0, 60)}`); r.notes = n; }

  // 4 — English titles, from the store only.
  const [composed] = C.composeEnglishTitles([r], store);
  if (composed.summary !== r.summary) log.push(`TITLE  ${r.venue_code} | ${r.title.slice(0, 60)} → ${store[C.titleStoreKey(r)]}`);
  return composed;
});

if (out.length !== rows.length) throw new Error('row count changed — refusing');
for (const l of log) console.log(l);
if (unexplained.length) {
  console.log(`\n${unexplained.length} rows where the quoted sentence and the file disagree for another reason — LEFT ALONE:`);
  for (const u of unexplained) console.log('  ' + u);
}
const count = k => log.filter(l => l.startsWith(k)).length;
console.log(`\n${rows.length} rows. Dates ${count('DATE')}, extension notes ${count('EXTEND')}, ` +
  `doubled notes ${count('NOTE')}, English titles ${count('TITLE')}.`);
if (APPLY) { C.writeCsv(FILE, out); console.log(`Wrote ${path.basename(FILE)}.`); }
else console.log('Report only. --apply writes it.');
