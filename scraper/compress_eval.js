#!/usr/bin/env node
/**
 * Cat Watch — testing the one judgement the compressor delegates.
 *
 * WHAT THIS IS NOT: `compress.test.js` covers the code — when a model is asked
 * at all, how rows are matched, what may be written. Those are settled by
 * fixtures and pass in a second.
 *
 * WHAT THIS IS: the other half, which no fixture can reach. Given the summary
 * we already have and the venue's new blurb, **is that summary now false?**
 * That is judgement about the outside world, so only a model can answer it,
 * and only a run against a model can tell us whether the answer is any good.
 *
 * WHY THE CASES ARE AUTHORED RATHER THAN COLLECTED: waiting for venues to
 * rewrite their pages does not work. Three sweeps across one day produced
 * exactly zero genuine rewordings — the changes that looked like rewordings
 * were a scraper bug. Real material would take months to accumulate and would
 * still miss the cases that matter most.
 *
 * WHO IT IS FOR: whichever model actually does this work in production —
 * currently expected to be Haiku through the API. It is deliberately NOT a
 * test of the session writing summaries by hand, which proves nothing about
 * what runs unattended.
 *
 *   node scraper/compress_eval.js            write the questions
 *   node scraper/compress_eval.js --score    score the answers
 *
 * The question and answer files use exactly the same shape as the compressor's
 * own, so this tests the real interface rather than a mock of it.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const C = require('./compress.js');

const CASES_FILE    = path.join(__dirname, 'compress_eval.json');
const QUESTION_FILE = path.join(__dirname, 'output', 'eval_pending.json');
const ANSWER_FILE   = path.join(__dirname, 'output', 'eval_answers.json');

const say = (...a) => console.log(...a);

function load() {
  return JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
}

function ask() {
  const { cases } = load();
  const rows = cases.map((c, i) => ({
    index: i,
    id: c.id,
    action: 'review',
    previousSummary: c.previousSummary,
    raw: c.newRaw,
  }));
  fs.mkdirSync(path.dirname(QUESTION_FILE), { recursive: true });
  fs.writeFileSync(QUESTION_FILE,
    JSON.stringify({ maxWords: C.MAX_WORDS, rows }, null, 2), 'utf8');
  say(`${rows.length} cases written to:`);
  say(`  ${QUESTION_FILE}`);
  say('');
  say(`Answer them in ${path.basename(ANSWER_FILE)} — same shape as the compressor:`);
  say('  a string to rewrite, the previous summary verbatim to keep it, null to refuse.');
  say('');
  say('Then: node scraper/compress_eval.js --score');
}

/**
 * The verdict is readable straight off the answer, with no extra machinery:
 * identical to what we had = keep, different = rewrite, null = refuse. That is
 * the same interface the compressor uses, so nothing here is a mock.
 */
function verdictOf(answer, previousSummary) {
  if (answer === null) return 'skip';
  const s = String(answer == null ? '' : answer).trim().replace(/\s+/g, ' ');
  const p = String(previousSummary || '').trim().replace(/\s+/g, ' ');
  return s.toLowerCase() === p.toLowerCase() ? 'keep' : 'rewrite';
}

function score() {
  if (!fs.existsSync(ANSWER_FILE)) {
    say(`No ${path.basename(ANSWER_FILE)}. Run without --score first, then answer it.`);
    process.exit(1);
  }
  const { cases } = load();
  const answers = JSON.parse(fs.readFileSync(ANSWER_FILE, 'utf8'));

  let pass = 0, fail = 0, disputed = 0, missing = 0, invalid = 0;
  const problems = [];

  cases.forEach((c, i) => {
    const key = String(i);
    if (!Object.prototype.hasOwnProperty.call(answers, key)) {
      missing++; problems.push(`${c.id}  NO ANSWER`);
      return;
    }
    const answer = answers[key];
    const got = verdictOf(answer, c.previousSummary);

    // A rewrite still has to be a legal summary. A model that answers with a
    // paragraph has failed even if the verdict was right.
    if (got === 'rewrite') {
      const v = C.validateAnswer(answer);
      if (!v.ok) { invalid++; problems.push(`${c.id}  INVALID (${v.reason}): ${answer}`); return; }
    }

    if (got === c.expect) { pass++; return; }
    if (c.arguable) {
      disputed++;
      problems.push(`${c.id}  DISPUTED — expected ${c.expect}, got ${got}. ${c.note}`);
      return;
    }
    fail++;
    problems.push(`${c.id}  WRONG — expected ${c.expect}, got ${got}\n        ${c.note}\n        answer: ${JSON.stringify(answer)}`);
  });

  say(`pass ${pass}   fail ${fail}   disputed ${disputed}   invalid ${invalid}   unanswered ${missing}`);
  if (problems.length) { say(''); problems.forEach(p => say('  ' + p)); }

  say('');
  say('── The wording, for her to read (not scored) ───────────────────────────');
  cases.forEach((c, i) => {
    const a = answers[String(i)];
    if (a === undefined) return;
    const got = verdictOf(a, c.previousSummary);
    if (got === 'keep') return;                       // unchanged, nothing to read
    say(`  ${c.id}  was: ${c.previousSummary}`);
    say(`         now: ${a === null ? '(refused)' : a}`);
  });

  // Disputed cases are a decision for her, not a defect, so they do not fail
  // the run. Anything else does.
  process.exit(fail + invalid + missing ? 1 : 0);
}

if (require.main === module) {
  if (process.argv.includes('--score')) score();
  else ask();
}

module.exports = { verdictOf };
