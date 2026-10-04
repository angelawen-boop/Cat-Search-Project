#!/usr/bin/env node
/*
 * sync_shared.js — write the scraper's shared pieces into Cat_Watch.jsx.
 *
 * WHY THIS EXISTS — "Add by link", 4 Oct 2026 (docs/picked_shows.md). The app
 * now reads show pages itself, so it needs the scraper's DATE READER and the
 * compression prompt's SUMMARY RULES. Copying them by hand makes two copies,
 * and two date parsers have drifted apart twice before, each time losing dates
 * without a word. So the app's copy is WRITTEN by this script, between the
 * SHARED markers, and `npm test` runs `--check`, which fails the moment the
 * JSX no longer matches its sources.
 *
 *   scraper/dates.js           → DATES   (everything above module.exports)
 *   scraper/compress_prompt.md → SUMMARY_RULES (Prompt A, step 3, minus the
 *                                 two paragraphs about batch-only fields)
 *   scraper/compress.js        → EN_PREFIX and composeSummary(), which
 *                                 write the "In English: …" line
 *   compress.js --examples     → SUMMARY_EXAMPLES — only with --examples.
 *
 * THE EXAMPLES ARE A SNAPSHOT, ON PURPOSE. They are built from whatever runs
 * are on disk, so they change with every sweep; checking them would fail
 * `npm test` after every sweep for no fault. They teach style, which does not
 * drift. `--check` therefore carries the examples already in the JSX across
 * unchanged and compares only the dates and the rules.
 *
 * Usage:
 *   node build/sync_shared.js              rewrite dates + rules
 *   node build/sync_shared.js --examples   also re-take the examples
 *   node build/sync_shared.js --check      exit 1 if the JSX differs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Cat_Watch.jsx');
const DATES = path.join(ROOT, 'scraper', 'dates.js');
const PROMPT = path.join(ROOT, 'scraper', 'compress_prompt.md');

const OPEN = '// ===== SHARED WITH THE SCRAPER — written by `node build/sync_shared.js`; never edit between these markers. Edit scraper/dates.js or scraper/compress_prompt.md, then run it. =====';
const CLOSE = '// ===== END SHARED =====';

const args = process.argv.slice(2);
const check = args.includes('--check');
const retakeExamples = args.includes('--examples');

function die(m) { console.error('sync_shared: ' + m); process.exit(1); }

function datesBlock() {
  const src = fs.readFileSync(DATES, 'utf8');
  const start = src.indexOf("'use strict';");
  const end = src.indexOf('\nmodule.exports');
  if (start < 0 || end < 0) die('scraper/dates.js has lost its \'use strict\' line or its module.exports');
  const body = src.slice(start + "'use strict';".length, end).trim();
  // Wrapped so its names (ymd, frag, MONTHS…) cannot collide with the app's.
  return 'const DATES=(()=>{\n' + body + '\nreturn { findDateRange, findDateRangeInProse };\n})();';
}

function rulesBlock() {
  const md = fs.readFileSync(PROMPT, 'utf8');
  const a = md.indexOf('## Prompt A');
  const from = md.indexOf('> STEP 3. Write one summary per row.', a);
  const to = md.indexOf('> STEP 4.', from);
  if (a < 0 || from < 0 || to < 0) die('compress_prompt.md: Prompt A\'s STEP 3 / STEP 4 anchors are gone');
  const lines = md.slice(from, to).split('\n').slice(1)
    .map(l => l.replace(/^>\s?/, ''));
  const paras = lines.join('\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    // Batch-only: the app never sends "alsoAt", and asks for the English
    // title on every row in its own words.
    .filter(p => !/^A FEW ROWS CARRY/.test(p) && !/^ROWS MARKED/.test(p));
  if (paras.length < 4) die('compress_prompt.md: Prompt A\'s rules came out too short — check the anchors');
  return 'const SUMMARY_RULES=' + JSON.stringify(paras.join('\n\n')) + ';';
}

function composeBlock() {
  const src = fs.readFileSync(path.join(ROOT, 'scraper', 'compress.js'), 'utf8');
  const prefix = (src.match(/^const EN_PREFIX = .*;$/m) || [])[0];
  const at = src.indexOf('function composeSummary(');
  const end = src.indexOf('\n}\n', at);
  if (!prefix || at < 0 || end < 0) die('compress.js has lost EN_PREFIX or composeSummary()');
  return prefix + '\n' + src.slice(at, end + 2);
}

function examplesBlock() {
  const { buildExamples } = require(path.join(ROOT, 'scraper', 'compress_cli.js'));
  const pairs = buildExamples()
    .slice().sort((x, y) => (x.venue + x.title).localeCompare(y.venue + y.title));
  // Spread across venues, eight at most: style, not coverage.
  const byVenue = new Map();
  for (const p of pairs) { if (!byVenue.has(p.venue)) byVenue.set(p.venue, []); byVenue.get(p.venue).push(p); }
  const picked = [];
  for (let round = 0; picked.length < 8; round++) {
    let any = false;
    for (const list of byVenue.values()) { if (list[round] && picked.length < 8) { picked.push(list[round]); any = true; } }
    if (!any) break;
  }
  const cut = s => { const t = String(s).replace(/\s+/g, ' ').trim(); if (t.length <= 600) return t; const c = t.slice(0, 600); return c.slice(0, c.lastIndexOf(' ')) + '…'; };
  return 'const SUMMARY_EXAMPLES=' + JSON.stringify(picked.map(p => ({ title: p.title, raw: cut(p.raw), summary: p.summary }))) + ';';
}

const jsx = fs.readFileSync(JSX, 'utf8');
const i = jsx.indexOf(OPEN), j = jsx.indexOf(CLOSE);
if (i < 0 || j < 0 || j < i) die('Cat_Watch.jsx has no SHARED markers');
const current = jsx.slice(i + OPEN.length, j);
const keptExamples = (current.match(/^const SUMMARY_EXAMPLES=.*;$/m) || [])[0];
const examples = retakeExamples || !keptExamples ? examplesBlock() : keptExamples;
const region = '\n' + [datesBlock(), rulesBlock(), composeBlock(), examples].join('\n') + '\n';

if (check) {
  if (region !== current) die('Cat_Watch.jsx is OUT OF STEP with scraper/dates.js or compress_prompt.md — run `node build/sync_shared.js`.');
  console.log('sync_shared: Cat_Watch.jsx matches scraper/dates.js, compress_prompt.md and compress.js.');
  process.exit(0);
}
fs.writeFileSync(JSX, jsx.slice(0, i + OPEN.length) + region + jsx.slice(j));
console.log('sync_shared: wrote the shared region into Cat_Watch.jsx' + (retakeExamples || !keptExamples ? ' (examples re-taken).' : '.'));
