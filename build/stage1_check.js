#!/usr/bin/env node
/*
 * stage1_check.js — her Stage 1 pass test (build/stage1_grade.js) on saved lookup records.
 *
 * Save the live check page's store first (ArtifactData `list` with `out_dir`): collection
 * `lookups`, and `lookups/<id>/pieces` for each record. Then:
 *
 *   node build/stage1_check.js <saved dir>            every record, graded, by case
 *   node build/stage1_check.js <saved dir> <id> ...   only these records
 *
 * A record is matched to its case by its card's title and venue (build/live_check_cases.json).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { readRecord, listRecords } = require('./lookup_log.js');
const { s1Grade } = require('./stage1_grade.js');

const ROOT = path.join(__dirname, '..');
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'live_check_cases.json'), 'utf8')).cases;
const ANSWERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'stage1_answers.json'), 'utf8')).cases;

function caseOf(card) {
  const c = CASES.find(x => x.row.title === card.title && x.row.museumId === card.museumId);
  return c ? c.case : null;
}
function gradeRecord(dir, id) {
  const { record } = readRecord(dir, id);
  const n = caseOf(record.card || {});
  if (!n || !ANSWERS[n]) return null;
  return { id, case: n, at: record.at, ...s1Grade(ANSWERS[n], record.calls, record.after, record.ok !== false) };
}
module.exports = { gradeRecord };

if (require.main === module) {
  const [dir, ...ids] = process.argv.slice(2);
  if (!dir) { console.error('Usage: node build/stage1_check.js <saved dir> [<id> ...]'); process.exit(2); }
  const which = ids.length ? ids : listRecords(dir).filter(r => r.complete).map(r => r.id);
  const out = which.map(id => gradeRecord(dir, id)).filter(Boolean).sort((a, b) => a.case - b.case || String(a.at).localeCompare(String(b.at)));
  for (const g of out) {
    console.log('Case ' + g.case + ' (' + ANSWERS[g.case].title + ') ' + g.at + ' ' + g.id + ': ' + (g.pass ? 'PASS' : 'FAIL'));
    for (const l of g.lines) console.log('   ' + (l.watch ? '!' : l.ok ? '✓' : '✗') + ' ' + l.text);
  }
  console.log(out.filter(g => g.pass).length + ' of ' + out.length + ' lookups pass Stage 1.');
}
