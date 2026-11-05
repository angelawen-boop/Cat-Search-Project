#!/usr/bin/env node
/*
 * sync_shared.js — write the scraper's shared pieces into the app.
 *
 * The region goes into the part under app/ that holds the OPEN marker, then
 * `node build/app_join.js` writes Cat_Watch.jsx from the parts (docs/restructure.md).
 *
 * WHY THIS EXISTS — "Add by link", 4 Oct 2026 (docs/add_by_link.md). The app
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
 *   scraper/boilerplate.js     → BOILERPLATE, the phrases a description drops (Add by link too).
 *   scraper/answer_check.js    → ANSWER_CHECK, the checks on every description Claude writes
 *                                 (shape, and claims the page must hold).
 *   compress_prompt.md         → SUMMARY_OPENING and SUMMARY_STUDY (Prompt A's first sentence,
 *                                 and its line on the examples), so both open alike.
 *   compress_cli.js            → SUMMARY_EXAMPLES — the sweep's own examples text, every pair at
 *                                 full length (examplesText). Re-taken with --examples, which
 *                                 build/build_app.js runs before every build.
 *   sweep_prototype.js VENUES  → VENUE_SITES: each venue's site (and, where
 *                                 two venues share one, its showPath), so a
 *                                 link from one of her 28 files under it —
 *                                 7 Oct, her Jacquemart-André links were
 *                                 filed as a new venue.
 *
 * THE EXAMPLES ARE RE-TAKEN AT EVERY BUILD. They are built from whatever runs are on
 * disk, so they change with every sweep; `--check` carries the copy in the JSX across
 * (comparing it would fail `npm test` after every sweep for no fault), and
 * build/build_app.js runs `--examples` first, so a published page always carries the
 * sweep's current set.
 *
 * Usage:
 *   node build/sync_shared.js              rewrite dates + rules
 *   node build/sync_shared.js --examples   also re-take the examples
 *   node build/sync_shared.js --check      exit 1 if the part's region differs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { partFiles } = require('./app_join.js');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
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
  return 'const DATES=(()=>{\n' + body + '\nreturn { findDateRange, findDateRangeInProse, capsTitleParts, NO_DATES_NOTE, ORDER_UNKNOWN_NOTE, shownOnlyNote, unusableDateText, sweptVenueTitle, closedEarly, closedEarlyNote };\n})();';
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
  // Prompt A's opening sentence and its line on the examples, the same words to both.
  const opening = ((md.slice(a).match(/^> (You are writing [^.]*\.)/m) || [])[1] || '').replace(/\s*\n>\s*/g, ' ');
  const study = (md.slice(a).match(/^> (The examples define the style\.[^\n]*)/m) || [])[1];
  if (!opening || !study) die('compress_prompt.md: Prompt A\'s opening sentence or its examples line is gone');
  return 'const SUMMARY_OPENING=' + JSON.stringify(opening) + ';const SUMMARY_STUDY=' + JSON.stringify(study.trim()) + ';\n'
    + 'const SUMMARY_RULES=' + JSON.stringify(paras.join('\n\n')) + ';';
}

function composeBlock() {
  const src = fs.readFileSync(path.join(ROOT, 'scraper', 'compress.js'), 'utf8');
  const prefix = (src.match(/^const EN_PREFIX = .*;$/m) || [])[0];
  const at = src.indexOf('function composeSummary(');
  const end = src.indexOf('\n}\n', at);
  if (!prefix || at < 0 || end < 0) die('compress.js has lost EN_PREFIX or composeSummary()');
  return prefix + '\n' + src.slice(at, end + 2);
}

function sitesBlock() {
  const { VENUES } = require(path.join(ROOT, 'scraper', 'sweep_prototype.js'));
  const sites = Object.entries(VENUES).map(([id, v]) => {
    let host;
    try { host = new URL(v.base).hostname.toLowerCase().replace(/^www\./, ''); } catch { die(`VENUES.${id} has no readable base`); }
    return v.showPath ? { id, host, path: v.showPath } : { id, host };
  });
  // Two venues on one site are told apart only by a path: without one each,
  // a link would file under whichever came first.
  for (const s of sites) {
    if (sites.some(o => o !== s && o.host === s.host) && !s.path) die(`VENUES.${s.id} shares ${s.host} with another venue and has no showPath`);
  }
  return 'const VENUE_SITES=' + JSON.stringify(sites) + ';';
}

function examplesBlock() {
  const { examplesText } = require(path.join(ROOT, 'scraper', 'compress_cli.js'));
  const text = examplesText();
  if (!text.trim()) die('no example pairs found: the seed and the runs on disk share no show');
  return 'const SUMMARY_EXAMPLES=' + JSON.stringify(text) + ';';
}

// The one part under app/ that holds the OPEN marker carries the region.
const holders = partFiles(APP).filter(f => fs.readFileSync(path.join(APP, f), 'utf8').includes(OPEN));
if (holders.length !== 1) die((holders.length ? 'more than one part holds' : 'no part under app/ holds') + ' the SHARED marker' + (holders.length ? ': ' + holders.join(', ') : ''));
const PART = path.join(APP, holders[0]);
const PART_NAME = 'app/' + holders[0];
const jsx = fs.readFileSync(PART, 'utf8');
const i = jsx.indexOf(OPEN), j = jsx.indexOf(CLOSE);
if (i < 0 || j < 0 || j < i) die(PART_NAME + ' has no SHARED markers');
const current = jsx.slice(i + OPEN.length, j);
// A kept copy is the examples TEXT; the old eight-pair list is re-taken.
const keptExamples = (current.match(/^const SUMMARY_EXAMPLES=".*;$/m) || [])[0];
const examples = retakeExamples || !keptExamples ? examplesBlock() : keptExamples;
function answerCheckBlock() {
  const src = fs.readFileSync(path.join(ROOT, 'scraper', 'answer_check.js'), 'utf8');
  const start = src.indexOf("'use strict';");
  const end = src.indexOf('\nmodule.exports');
  if (start < 0 || end < 0) die('scraper/answer_check.js has lost its \'use strict\' line or its module.exports');
  // Wrapped so its names (fold, CLAIMS…) cannot collide with the app's.
  return 'const ANSWER_CHECK=(()=>{\n' + src.slice(start + "'use strict';".length, end).trim() + '\nreturn { MAX_WORDS, validateAnswer, validateEnglish, stringFaults, unsupportedClaims, rewordsTitle, REWORDS_TITLE };\n})();';
}
function boilerplateBlock() {
  return 'const BOILERPLATE=' + JSON.stringify(require(path.join(ROOT, 'scraper', 'boilerplate.js')).BOILERPLATE) + ';';
}
function botCheckBlock() {
  const b = require(path.join(ROOT, 'scraper', 'bot_check.js'));
  return 'const CHALLENGE_TITLE=' + b.CHALLENGE_TITLE.toString() + ';const BOT_CHECK_SAID=' + JSON.stringify(b.BOT_CHECK_SAID) + ';';
}
const region = '\n' + [datesBlock(), rulesBlock(), composeBlock(), sitesBlock(), boilerplateBlock(), botCheckBlock(), answerCheckBlock(), examples].join('\n') + '\n';

if (check) {
  if (region !== current) die(PART_NAME + ' is OUT OF STEP with scraper/dates.js, compress_prompt.md, compress.js, answer_check.js or the scraper\'s VENUES — run `node build/sync_shared.js`.');
  console.log('sync_shared: ' + PART_NAME + ' matches scraper/dates.js, compress_prompt.md, compress.js and VENUES.');
  process.exit(0);
}
fs.writeFileSync(PART, jsx.slice(0, i + OPEN.length) + region + jsx.slice(j));
console.log('sync_shared: wrote the shared region into ' + PART_NAME + (retakeExamples || !keptExamples ? ' (examples re-taken).' : '.'));
// Cat_Watch.jsx follows the parts.
execFileSync('node', [path.join(__dirname, 'app_join.js')], { stdio: 'inherit' });
