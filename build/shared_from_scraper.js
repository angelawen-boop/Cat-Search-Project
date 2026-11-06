/*
 * shared_from_scraper.js — the scraper's own rules, as the text the page carries.
 *
 * Used by build/app_join.js. The app's parts under app/ hold NO copy of these rules: the part
 * app/foundations/shared_with_scraper.jsx holds one directive line (DIRECTIVE) and the
 * summary examples, and the join puts the rules in place each time it joins. So when a rule
 * changes in the scraper, `node build/app_join.js --check` fails until the page is joined again.
 *
 * WHY THIS EXISTS — "Add by link", 4 Oct 2026 (docs/add_by_link.md). The app reads show pages
 * itself, so it needs the scraper's DATE READER and the compression prompt's SUMMARY RULES.
 * Two date parsers have drifted apart twice before, each time losing dates without a word.
 *
 *   scraper/dates.js           → DATES   (everything above module.exports)
 *   scraper/compress_prompt.md → SUMMARY_OPENING, SUMMARY_STUDY (Prompt A's first sentence and its
 *                                 line on the examples, so both open alike) and SUMMARY_RULES
 *                                 (Prompt A, step 3, minus the two paragraphs about batch-only fields)
 *   scraper/compress.js        → EN_PREFIX and composeSummary(), which write the "In English: …" line
 *   scraper/boilerplate.js     → BOILERPLATE, the phrases a description drops (Add by link too)
 *   scraper/bot_check.js       → CHALLENGE_TITLE, BOT_CHECK_SAID
 *   scraper/answer_check.js    → ANSWER_CHECK, the checks on every description Claude writes
 *   sweep_prototype.js VENUES  → VENUE_SITES: each venue's site (and, where two venues share one,
 *                                 its showPath), so a link from one of her 28 files under it
 *
 * The venue register (venues/register.js) is written the same way, at its own directive line
 * (REGISTER_DIRECTIVE, in app/foundations/venues.jsx) as VENUE_REGISTER; dates.js reads each venue's
 * date order from it, so its `//@register` line becomes the page's own register here.
 *
 * THE ONE EXCEPTION: SUMMARY_EXAMPLES (compress_cli.js examplesText, the sweep's own pairs at full
 * length) is sweep data on disk, not a rule. It stays stored in the part and is re-taken at every
 * build by `node build/sync_shared.js` (build/build_app.js runs it).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.join(__dirname, '..');

// The directive line in the part, and the piece's markers. app_pieces.js finds the piece by SHARED_OPEN.
const DIRECTIVE = '//@from-scraper';
const REGISTER_DIRECTIVE = '//@venue-register';
const REGISTER_LINE = /^const REGISTER = require\('\.\.\/venues\/register\.js'\)\.VENUES; \/\/@register$/m;
const OPEN = '// ===== SHARED WITH THE SCRAPER — the join writes the rules below from the scraper\'s own files (scraper/dates.js, compress_prompt.md, compress.js, boilerplate.js, bot_check.js, answer_check.js, VENUES); never edit between these markers. Edit the scraper, then run `node build/app_join.js`. =====';
const CLOSE = '// ===== END SHARED =====';

function die(m) { throw new Error(m); }
const read = (root, f) => fs.readFileSync(path.join(root, 'scraper', f), 'utf8');

function datesBlock(root = DEFAULT_ROOT) {
  const src = read(root, 'dates.js');
  const start = src.indexOf("'use strict';");
  const end = src.indexOf('\nmodule.exports');
  if (start < 0 || end < 0) die('scraper/dates.js has lost its \'use strict\' line or its module.exports');
  let body = src.slice(start + "'use strict';".length, end).trim();
  if (!REGISTER_LINE.test(body)) die('scraper/dates.js has lost its `//@register` line (the venues\' date orders)');
  body = body.replace(REGISTER_LINE, 'const REGISTER = VENUE_REGISTER;');
  // Wrapped so its names (ymd, frag, MONTHS…) cannot collide with the app's.
  return 'const DATES=(()=>{\n' + body + '\nreturn { findDateRange, findDateRangeInProse, capsTitleParts, NO_DATES_NOTE, ORDER_UNKNOWN_NOTE, shownOnlyNote, unusableDateText, sweptVenueTitle, closedEarly, closedEarlyNote };\n})();';
}

function rulesBlock(root = DEFAULT_ROOT) {
  const md = read(root, 'compress_prompt.md');
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

function composeBlock(root = DEFAULT_ROOT) {
  const src = read(root, 'compress.js');
  const prefix = (src.match(/^const EN_PREFIX = .*;$/m) || [])[0];
  const at = src.indexOf('function composeSummary(');
  const end = src.indexOf('\n}\n', at);
  if (!prefix || at < 0 || end < 0) die('compress.js has lost EN_PREFIX or composeSummary()');
  return prefix + '\n' + src.slice(at, end + 2);
}

function sitesBlock(root = DEFAULT_ROOT) {
  const { VENUES } = require(path.join(root, 'scraper', 'sweep_prototype.js'));
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

function answerCheckBlock(root = DEFAULT_ROOT) {
  const src = read(root, 'answer_check.js');
  const start = src.indexOf("'use strict';");
  const end = src.indexOf('\nmodule.exports');
  if (start < 0 || end < 0) die('scraper/answer_check.js has lost its \'use strict\' line or its module.exports');
  // Wrapped so its names (fold, CLAIMS…) cannot collide with the app's.
  return 'const ANSWER_CHECK=(()=>{\n' + src.slice(start + "'use strict';".length, end).trim() + '\nreturn { MAX_WORDS, validateAnswer, validateEnglish, stringFaults, unsupportedClaims, rewordsTitle, REWORDS_TITLE };\n})();';
}

function boilerplateBlock(root = DEFAULT_ROOT) {
  return 'const BOILERPLATE=' + JSON.stringify(require(path.join(root, 'scraper', 'boilerplate.js')).BOILERPLATE) + ';';
}

function botCheckBlock(root = DEFAULT_ROOT) {
  const b = require(path.join(root, 'scraper', 'bot_check.js'));
  return 'const CHALLENGE_TITLE=' + b.CHALLENGE_TITLE.toString() + ';const BOT_CHECK_SAID=' + JSON.stringify(b.BOT_CHECK_SAID) + ';';
}

// The venue register: everything between its 'use strict' line and module.exports.
function registerBlock(root = DEFAULT_ROOT) {
  const src = fs.readFileSync(path.join(root, 'venues', 'register.js'), 'utf8');
  const start = src.indexOf("'use strict';");
  const end = src.indexOf('\nmodule.exports');
  if (start < 0 || end < 0) die('venues/register.js has lost its \'use strict\' line or its module.exports');
  // Wrapped so its names (PRM_TAIL…) cannot collide with the app's.
  return 'const VENUE_REGISTER=(()=>{\n' + src.slice(start + "'use strict';".length, end).trim() + '\nreturn VENUES;\n})();';
}

// The sweep's own examples text, the one stored exception. Used by sync_shared.js.
function examplesBlock(root = DEFAULT_ROOT) {
  const { examplesText } = require(path.join(root, 'scraper', 'compress_cli.js'));
  const text = examplesText();
  if (!text.trim()) die('no example pairs found: the seed and the runs on disk share no show');
  return 'const SUMMARY_EXAMPLES=' + JSON.stringify(text) + ';';
}

// Everything the directive stands for, in the order the page carries it (examples come after, stored).
function rulesText(root = DEFAULT_ROOT) {
  return [datesBlock(root), rulesBlock(root), composeBlock(root), sitesBlock(root), boilerplateBlock(root), botCheckBlock(root), answerCheckBlock(root)].join('\n') + '\n';
}

// A piece's text with its directive line replaced: the scraper's rules, or the venue register. A piece
// without one is returned as it is.
function expandShared(text, root = DEFAULT_ROOT) {
  for (const [directive, body] of [[DIRECTIVE, () => rulesText(root)], [REGISTER_DIRECTIVE, () => registerBlock(root) + '\n']]) {
    const line = directive + '\n';
    const at = text.indexOf('\n' + line);
    if (at < 0) continue;
    if (text.indexOf('\n' + line, at + 1) >= 0) die('a piece holds the directive ' + directive + ' twice');
    return text.slice(0, at + 1) + body() + text.slice(at + 1 + line.length);
  }
  return text;
}

module.exports = { DIRECTIVE, REGISTER_DIRECTIVE, OPEN, CLOSE, expandShared, rulesText, examplesBlock, registerBlock,
  datesBlock, rulesBlock, composeBlock, sitesBlock, boilerplateBlock, botCheckBlock, answerCheckBlock };
