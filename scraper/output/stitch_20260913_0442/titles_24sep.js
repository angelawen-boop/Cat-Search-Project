/**
 * Titles in capitals → the museum's own letters. 24 Sep.
 *
 * BASE: her import file AS IT WAS ON 21 SEP (commit f1bfb41), before any of
 * the 23 Sep changes — her instruction, 24 Sep. Read straight from git, so
 * the version used is named here and cannot drift.
 *
 * SOURCE: titles_read_24sep.json — what the scraper read on 24 Sep from the
 * listing pages she saved (docs/title_case_pages/) and from four listing
 * pages read live, 30 s apart. Scraper code, not hand-typed.
 *
 * RULE: a title is replaced only where the reading at the SAME ADDRESS is the
 * same letters in different case — or where the title is a status label the
 * venue's own recipe refuses (notATitle) and that address's own page was read
 * for its heading. Nothing else in the row is touched. Every other capitals
 * title is left as it is and listed.
 *
 *   node titles_24sep.js            report only
 *   node titles_24sep.js --apply    write sweep_titles_24sep.csv
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('../../compress.js');
const S = require('../../sweep_prototype.js');

const BASE_COMMIT = 'f1bfb41';
const BASE_PATH = 'scraper/output/stitch_20260913_0442/sweep_compressed_clean.csv';
const OUT = path.join(__dirname, 'sweep_titles_24sep.csv');
const read = JSON.parse(fs.readFileSync(path.join(__dirname, 'titles_read_24sep.json'), 'utf8')).titles;

const root = path.join(__dirname, '..', '..', '..');
const tmp = path.join(require('os').tmpdir(), 'base_21sep.csv');
fs.writeFileSync(tmp, execFileSync('git', ['show', `${BASE_COMMIT}:${BASE_PATH}`], { cwd: root }));
const rows = C.readProForma(tmp);

const capitals = t => /\p{Lu}{3}/u.test(t) && t === t.toUpperCase();
const changed = [], left = [];
for (const r of rows) {
  if (!capitals(r.title) || r.title.startsWith('[')) continue;
  const got = read[S.normalizeUrl(r.url)];
  // A STATUS LABEL IN THE TITLE — the only other replacement. Decided by the
  // venue's own recipe rule (notATitle), never by this script, and only where
  // the exhibition's own page at the same address was read for its heading.
  const rule = (S.VENUES[r.venue_code] || {}).title || {};
  if (got && rule.notATitle && rule.notATitle.test(r.title) && /^own page/.test(got.from)) {
    changed.push(`${r.venue_code.padEnd(12)} ${r.title}  →  ${got.title}   (status label, not a title; ${got.from})`);
    r.title = got.title;
    continue;
  }
  if (got && got.title !== r.title && got.title.toLowerCase() === r.title.toLowerCase()) {
    changed.push(`${r.venue_code.padEnd(12)} ${r.title}  →  ${got.title}   (${got.from})`);
    r.title = got.title;
  } else {
    left.push(`${r.venue_code.padEnd(12)} ${r.title}  —  ${
      !got ? 'address not on any page read' :
      got.title === r.title ? 'the museum types it in capitals' :
      `page reads "${got.title}", different words`}`);
  }
}

console.log(`Base: ${BASE_PATH} at ${BASE_COMMIT} — ${rows.length} rows\n`);
console.log(`CHANGED (${changed.length})`); changed.forEach(l => console.log('  ' + l));
console.log(`\nLEFT AS IS (${left.length})`); left.forEach(l => console.log('  ' + l));

if (process.argv.includes('--apply')) {
  C.writeCsv(OUT, rows);
  console.log(`\nWrote ${path.basename(OUT)} — ${rows.length} rows`);
}
