/**
 * Run the app's intake logic outside the app.
 *
 * WHY THIS EXISTS, AND WHY ITS ABSENCE WAS THE BUG. `intake_cases.js` has been
 * committed since 13 Sep and cited in the guide as fourteen fixtures covering
 * the folding rules "including the two that must NOT merge". It required this
 * file. This file did not exist. So the cases had never once run: a page of
 * assertions with nothing to execute them, which reads in a commit and in a
 * guide exactly like a passing suite.
 *
 * THE APP IS ONE JSX FILE WITH NO BUILD STEP, on purpose — she runs it as an
 * artifact inside Claude. So there is nothing to import. This lifts the
 * relevant source out of the file by text and evaluates it, which is ugly and
 * is still right: the alternative is a second copy of the logic in a test,
 * and a second copy drifts silently. Read from the real file, every run, so a
 * fixture cannot pass against code the app does not have.
 *
 * Slices are taken between ANCHORS, never line numbers, so ordinary edits above
 * or below do not silently change what is being tested. A missing anchor throws
 * rather than testing less than it claims to.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch.jsx');

function slice(src, startAnchor, endAnchor) {
  const a = src.indexOf(startAnchor);
  if (a === -1) throw new Error(`harness: start anchor not found — ${startAnchor}`);
  const b = src.indexOf(endAnchor, a);
  if (b === -1) throw new Error(`harness: end anchor not found — ${endAnchor}`);
  return src.slice(a, b);
}

const src = fs.readFileSync(JSX, 'utf8');

// Module-level helpers: MUSEUMS, MU, KNOWN_VENUES, isValidYMD, normalizeUrlKey,
// urlLooksValid, csvParse. Everything below TIERS is display or unrelated.
// The end anchor is the comment that opens the tier colours, not the TIERS
// constant itself: TIERS stopped being a literal on 20 Sep when dark mode
// made it theme-dependent, and the old anchor vanished with it. Anchor on
// prose that describes a section, not on a line of code that can be rewritten.
const prelude = slice(src, 'const MUSEUMS = [', '// URGENCY COLOURS, ONE SET PER THEME');

// The intake itself, as one contiguous run of the component's body.
const intake = slice(src,
  '  // WHAT A QUARANTINE REMEMBERS.',
  '  function handleRefreshFile(e){');

// withChoices sits further down, past the render helpers.
// The end anchor is the COMMENT that opens applyRefresh, not its signature:
// the signature grew a parameter on 22 Sep (partial apply) and an anchor on
// the line of code itself would have died with it. Anchor on prose.
const choices = slice(src,
  '  const withChoices=(cand,dec)=>{',
  '  // PARTIAL IS A PARAMETER, NOT A SECOND COPY OF THIS FUNCTION.');

// `rows` is the ledger, which analyzeProForma closes over in the app. Here it
// is a plain binding the fixtures set directly.
const program = `
${prelude}
let rows = [];
${intake}
${choices}
return {
  analyzeProForma,
  withChoices,
  foldDuplicateRows,
  ignoreKeyFor,
  sameExhibition,
  isMarkerRow,
  setRows: next => { rows = next; },
  getRows: () => rows,
  countDecisions,
  mergeSweepLog,
  mergeQuarantine,
  activeQuarantine,
  quarantineFromList,
  isUndecidedCard,
  offerPartialApply,
  displayTitle,
  MUSEUMS, MU, KNOWN_VENUES,
};
`;

let api;
try {
  // eslint-disable-next-line no-new-func
  api = new Function(program)();
} catch (e) {
  throw new Error(
    'harness: the extracted slices did not evaluate. An anchor probably now ' +
    'spans different code than it used to.\n  ' + e.message);
}

module.exports = api;
