#!/usr/bin/env node
/**
 * Cat Watch — the command-line half of summary compression.
 *
 * Kept separate from compress.js so the pure logic can be imported by the
 * fixtures without a CLI running underneath them.
 *
 * Two steps, deliberately. Planning decides what needs words and asks;
 * applying takes the answers and writes the file. In between, a model supplies
 * strings and nothing else — it never opens the CSV, so it cannot lose a row.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const C = require('./compress.js');

const OUTPUT_DIR = path.join(__dirname, 'output');
const RAW_CSV = 'sweep.csv';
const COMPRESSED_CSV = 'sweep_compressed.csv';
const PENDING_JSON = 'compress_pending.json';
const ANSWERS_JSON = 'compress_answers.json';

const say = (...a) => console.log(...a);

function newestRun() {
  const dirs = fs.existsSync(OUTPUT_DIR)
    ? fs.readdirSync(OUTPUT_DIR).filter(d => d.startsWith('run_')).sort()
    : [];
  for (let i = dirs.length - 1; i >= 0; i--) {
    if (fs.existsSync(path.join(OUTPUT_DIR, dirs[i], RAW_CSV))) return dirs[i];
  }
  return null;
}

/**
 * The few-shot examples.
 *
 * Pairs of (raw curatorial text → the summary she approved), built by matching
 * the app's 110-entry seed set against exhibitions the scraper has since
 * collected raw text for. These teach the voice far better than any list of
 * rules could: brevity, noun phrases, naming the artist and the hook, no
 * promotional language. Nothing here is written by hand.
 *
 * The Met's 51 seed entries are unusable — it is blocked, so there is no raw
 * text to pair them with.
 */
function buildExamples() {
  const jsxPath = path.join(__dirname, '..', 'Cat_Watch_v10.2_haiku.jsx');
  const src = fs.readFileSync(jsxPath, 'utf8');
  const start = src.indexOf('const S=[');
  if (start === -1) throw new Error('seed array S not found in the JSX');

  // Brace-match rather than regex: the array is one long line full of quoted
  // commas and brackets, and a regex would stop in the middle of a summary.
  let i = src.indexOf('[', start), depth = 0, end = -1, quote = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (quote) { if (c === '\\') { j++; continue; } if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = j; break; } }
  }
  // eslint-disable-next-line no-eval
  const seed = eval(src.slice(i, end + 1));

  // Newest raw text per venue, across every run.
  const dirs = fs.readdirSync(OUTPUT_DIR).filter(d => d.startsWith('run_')).sort();
  const rawByKey = new Map();
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(OUTPUT_DIR, d))) {
      if (!f.endsWith('.csv') || f === RAW_CSV || f === COMPRESSED_CSV) continue;
      for (const r of C.readProForma(path.join(OUTPUT_DIR, d, f))) {
        if (!r.title || r.title.startsWith('[') || !r.summary) continue;
        rawByKey.set(C.titleKey(r), r.summary);
      }
    }
  }

  const pairs = [];
  for (const [venue, title, , , summary] of seed) {
    if (!summary) continue;
    const raw = rawByKey.get(C.titleKey({ venue_code: venue, title }));
    if (raw) pairs.push({ venue, title, raw, summary });
  }
  return pairs;
}

// ── Plan ─────────────────────────────────────────────────────────────────────

function plan(dir, { recompress = false } = {}) {
  const runPath = path.join(OUTPUT_DIR, dir);
  const rawPath = path.join(runPath, RAW_CSV);
  if (!fs.existsSync(rawPath)) {
    say(`No ${RAW_CSV} in ${dir}. Run the sweep first.`);
    process.exit(1);
  }

  const rows = C.readProForma(rawPath);
  const prevDir = recompress ? null : C.previousCompletedRun(dir);
  const memory = recompress ? new Map() : loadMemory(prevDir);

  // HER 110 SEED SUMMARIES JOIN THE MEMORY, and where both know an exhibition
  // HERS IS THE WORDING while the run supplies the raw text. See
  // mergeSeedMemory() for why the first version had this backwards.
  let seedAdded = 0, seedKept = 0;
  if (!recompress) {
    try {
      const merged = C.mergeSeedMemory(
        memory, C.seedMemory(path.join(__dirname, '..', 'Cat_Watch_v10.2_haiku.jsx')));
      seedAdded = merged.added;
      seedKept = merged.overrode;
    } catch (e) {
      say(`Could not read the seed set (${e.message.slice(0, 60)}) — carrying on without it.`);
    }
  }

  say(`Run:      ${dir}  (${rows.length} rows)`);
  say(`Memory:   ${prevDir ? prevDir : recompress ? '(ignored — --recompress)' : '(none — first compression)'}`);
  if (seedAdded) say(`          + ${seedAdded} of her own seed summaries, so her wording is kept unless the venue has changed what it says`);
  if (seedKept) say(`          + ${seedKept} more where a previous run had overwritten her wording — hers restored`);

  const done = [];
  const pending = [];
  const tally = { reuse: 0, carried: 0, empty: 0, skipped: 0, review: 0, fresh: 0 };

  rows.forEach((row, i) => {
    // Marker rows report a listing page the scraper could not read. There is
    // no exhibition and no prose — compressing one would be inventing.
    if (String(row.title || '').startsWith('[')) {
      done.push({ ...row, summary: '' });
      tally.empty++;
      return;
    }
    const prev = recompress ? null : C.findPrevious(memory, row);
    const d = C.decide(row, prev);
    tally[d.action] = (tally[d.action] || 0) + 1;

    if (d.summary !== null && d.summary !== undefined) {
      done.push({ ...row, summary: d.summary, notes: C.addNote(row.notes, d.note) });
    } else {
      pending.push({
        index: i,
        venue_code: row.venue_code,
        title: row.title,
        url: row.url,
        action: d.action,
        previousSummary: d.previousSummary || null,
        raw: row.summary,
      });
    }
  });

  say('');
  say(`  reuse    ${String(tally.reuse).padStart(4)}   unchanged text, previous wording kept — no model call`);
  say(`  carried  ${String(tally.carried).padStart(4)}   no text this time, previous wording kept, row says so`);
  say(`  empty    ${String(tally.empty).padStart(4)}   nothing to compress and nothing remembered`);
  say(`  skipped  ${String(tally.skipped || 0).padStart(4)}   already judged not a description, text unchanged — not re-asked`);
  say(`  review   ${String(tally.review).padStart(4)}   text changed — model asked whether the old summary is still true`);
  say(`  fresh    ${String(tally.fresh).padStart(4)}   never seen before — model writes new`);
  say('');

  if (!pending.length) {
    C.writeCsv(path.join(runPath, COMPRESSED_CSV), done);
    say(`Nothing needed a model. Wrote ${COMPRESSED_CSV} (${done.length} rows).`);
    return;
  }

  // One exhibition running in two cities is asked about ONCE. The pair is
  // detected here, in code, rather than left to the model to notice — see
  // groupTravellingRuns() for why that failed. The surviving question carries
  // BOTH cities' text, because the two pages differ (Acquavella's New York
  // Portraiture lists 17 artists, Palm Beach 21), so a summary true of both
  // has to describe the exhibition rather than its checklist.
  const byIndex = new Map(pending.map(p => [p.index, p]));

  // IDENTICAL TEXT IS ONE QUESTION. Stitching two machines' output means a
  // venue swept on both appears twice with the same raw text, and decide()'s
  // memory is the previous RUN, so it cannot see the copy beside it. Collapsed
  // here, before travelling runs, because it is the stricter test: exact text
  // rather than a matching title. See groupIdenticalRaw().
  let sameText = 0;
  for (const group of C.groupIdenticalRaw(pending).values()) {
    const [keep, ...rest] = group.filter(r => byIndex.has(r.index));
    if (!keep || !rest.length) continue;
    keep.appliesAlsoTo = [...(keep.appliesAlsoTo || []), ...rest.map(r => r.index)];
    for (const r of rest) { byIndex.delete(r.index); sameText++; }
  }

  let paired = 0;
  for (const group of C.groupTravellingRuns(pending).values()) {
    // ONLY ROWS STILL BEING ASKED. A row already folded into an identical-text
    // group above is answered, and re-listing it here would hand its index to
    // two owners — the second overwriting the first, so one of them silently
    // never receives an answer.
    const [keep, ...rest] = group.filter(r => byIndex.has(r.index));
    if (!keep || !rest.length) continue;
    keep.appliesAlsoTo = [...(keep.appliesAlsoTo || []), ...rest.map(r => r.index)];
    keep.alsoAt = [...(keep.alsoAt || []), ...rest.map(r => ({ title: r.title, raw: r.raw }))];
    for (const r of rest) { byIndex.delete(r.index); paired++; }
  }
  const asked = pending.filter(p => byIndex.has(p.index));

  const needsFresh = asked.some(p => p.action === 'fresh');
  const needsReview = asked.some(p => p.action === 'review');

  fs.writeFileSync(
    path.join(runPath, PENDING_JSON),
    JSON.stringify({ run: dir, previous: prevDir, maxWords: C.MAX_WORDS, rows: asked }, null, 2),
    'utf8');
  fs.writeFileSync(
    path.join(runPath, '.compress_done.json'),
    JSON.stringify(done, null, 2), 'utf8');


  if (sameText) {
    say(`  same text ${String(sameText).padStart(3)}   identical curatorial text elsewhere in this file — asked once`);
    say('');
  }
  if (paired) {
    say(`  travelling  ${String(paired).padStart(2)}   same exhibition in another city — asked once, answer used for both`);
    say('');
  }
  // ── WRITE THE JOB FILES ────────────────────────────────────────────────────
  //
  // Measured 19 Sep, first real compression: ONE subagent cannot take 296 rows.
  // It has to hold every row's raw text AND write every answer, and the input
  // alone was ~98,000 tokens. So the work is split here, in code, because how
  // many chunks N rows need is arithmetic — her rule: one correct answer
  // derivable from the inputs belongs in a script, not in a session's head.
  //
  // THE FILE SHAPE IS NOT COSMETIC, IT IS MOST OF THE COST. The first chunk was
  // handed pretty-printed JSON carrying four fields the model never reads, plus
  // a separate examples file: 173KB, 178k tokens. The same 75 rows flattened to
  // one compact line each, examples folded in, came to 112KB and 100k tokens —
  // 44% less for identical work. Chunks 3 and 4 then cost 98k and 97k, so it is
  // predictable rather than lucky.
  //
  // Each job file is self-contained: examples first, then one JSON object per
  // line. A subagent reads exactly one file and answers.
  const CHUNK_ROWS = 75;          // ~100k tokens per job, measured three times
  const examples = buildExamples()
    .map(p => `RAW: ${p.raw}\n  →  ${p.summary}\n`).join('\n');
  const jobs = [];
  const writeJob = (name, rows) => {
    const lines = [
      '=== EXAMPLES: raw curatorial text, and the summary that was accepted ===',
      '', examples, '',
      '=== ROWS: one JSON object per line ===', '',
    ];
    for (const r of rows) {
      const row = { i: r.index, title: r.title, raw: String(r.raw || '').split(/\s+/).join(' ') };
      // previousSummary only matters to Prompt B, and it is dead weight in A.
      if (r.action === 'review') row.previousSummary = r.previousSummary;
      if (r.alsoAt) row.alsoAt = r.alsoAt;
      lines.push(JSON.stringify(row));
    }
    const file = path.join(runPath, name);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    jobs.push({ name, rows: rows.length, kb: Math.round(fs.statSync(file).size / 1024) });
  };

  const reviewRows = asked.filter(p => p.action === 'review');
  const freshRows  = asked.filter(p => p.action !== 'review');
  if (reviewRows.length) writeJob('job_haiku.txt', reviewRows);
  for (let i = 0; i < freshRows.length; i += CHUNK_ROWS) {
    writeJob(`job_sonnet_${i / CHUNK_ROWS + 1}.txt`, freshRows.slice(i, i + CHUNK_ROWS));
  }

  say(`${asked.length} rows need a summary, split into ${jobs.length} job${jobs.length === 1 ? '' : 's'}:`);
  for (const j of jobs) say(`  ${j.name.padEnd(20)} ${String(j.rows).padStart(3)} rows   ${j.kb} KB`);
  say('');
  // Point explicitly at the prompt. Without this a session sees a file of rows
  // and no instruction, and either invents its own house style or never does
  // the step at all — the prompts, the model split and the reasoning behind
  // both are the product of this stage, and they live in one place.
  say('HOW TO ANSWER THEM — do not improvise, and do not write them yourself:');
  say(`  1. Read  ${path.relative(process.cwd(), path.join(__dirname, 'compress_prompt.md'))}`);
  say('  2. Save the examples to a file:  node scraper/compress.js --examples');
  // The model matters and it is NOT whichever one this session happens to be.
  // Measured 10 Sep: Haiku learned the form and could not find the point;
  // Sonnet found the point and fabricated less. Spawning a subagent is what
  // pins the model — naming it in prose does not.
  say('  2. SPAWN ONE READ-ONLY SUBAGENT PER JOB FILE, prompt verbatim, pointing');
  say('     it at that one file. A subagent is what pins the model; a session');
  say('     writing these itself uses whatever model it happens to be.');
  if (needsReview) say('       job_haiku.txt      Prompt B — is the old summary now false?  → HAIKU');
  if (needsFresh)  say('       job_sonnet_N.txt   Prompt A — write a fresh summary          → SONNET');
  say('');
  say('     READ-ONLY MATTERS. Told not to write files, a subagent wrote one');
  say('     anyway — 35k tokens to copy its own input. Told to read once, two');
  say('     of four ignored it. Told not to use a code fence, one used it, and');
  say('     twice an HTML entity came through despite an explicit rule. The');
  say('     prompt is advisory. Remove the tool, or check the answer in code.');
  say('');
  say('     Run ONE Sonnet chunk first and look at it before spending the rest.');
  say('     The first run wrote a median of 9 words where her own sit at 6 —');
  say('     it heard the ten-word ceiling as a target. One prompt change fixed');
  say('     it; finding that out cost one chunk instead of four.');
  // The approval dialog shows ONLY the subagent's description field — not the
  // model, not the prompt. "Compress acq run with Prompt A" is unanswerable at
  // the moment someone is being asked to approve it.
  say('     Describe the subagent in plain words — say what it will WRITE, not');
  say('     which prompt it uses. The approval dialog shows only that line.');
  say('');
  say('');
  say(`  3. Merge every job's answers into ${ANSWERS_JSON} beside the pending file —`);
  say('     {"<index>": "the summary.", ...}, a string to write it, the previous');
  say('     summary verbatim to keep it, null to refuse. Then check before applying:');
  say(`         node scraper/compress.js ${dir} --check`);
  say('     It reports any index missing, unexpected, over the word cap, or still');
  say('     carrying an HTML fragment. --apply refuses to run until it passes.');
  say('');
  say(`  4. node scraper/compress.js ${dir} --apply`);
}

function loadMemory(dir) {
  if (!dir) return new Map();
  const raw = C.readProForma(path.join(OUTPUT_DIR, dir, RAW_CSV));
  const done = C.readProForma(path.join(OUTPUT_DIR, dir, COMPRESSED_CSV));
  const doneIndex = C.indexPrevious(done);
  const memory = raw.map(r => {
    const d = C.findPrevious(doneIndex, r);
    return {
      ...r,
      raw: r.summary,
      summary: d ? d.summary : '',
      // A deliberate "not a description" answer, recognised by the note the
      // apply step wrote. This is what stops the row being re-asked forever.
      skipped: !!(d && !String(d.summary || '').trim() && String(d.notes || '').includes(C.SKIP_NOTE)),
    };
  });
  return C.indexPrevious(memory);
}

// ── Apply ────────────────────────────────────────────────────────────────────

/**
 * Check the answers BEFORE they can reach the CSV.
 *
 * Every rule here was broken by a subagent on 19 Sep despite the prompt saying
 * otherwise: an index missing, a code fence wrapped round the JSON, and twice
 * an HTML entity carried straight through ("Art &amp; Writing"). The prompt is
 * advisory; this is not. --apply refuses to run until this passes.
 *
 * It checks SHAPE, never quality — whether a summary is good is hers to judge,
 * and no script can stand in for that.
 */
function check(dir) {
  const runPath = path.join(OUTPUT_DIR, dir);
  const pending = JSON.parse(fs.readFileSync(path.join(runPath, PENDING_JSON), 'utf8'));
  const answersPath = path.join(runPath, ANSWERS_JSON);
  if (!fs.existsSync(answersPath)) { say(`No ${ANSWERS_JSON} in ${dir} yet.`); return false; }
  const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

  const want = new Set(pending.rows.map(r => String(r.index)));
  const got  = new Set(Object.keys(answers));
  const problems = [];

  for (const k of want) if (!got.has(k)) problems.push(`row ${k}: no answer`);
  for (const k of got) if (!want.has(k)) problems.push(`row ${k}: answered but was never asked`);

  for (const [k, v] of Object.entries(answers)) {
    if (v === null) continue;
    if (typeof v !== 'string') { problems.push(`row ${k}: not a string`); continue; }
    const words = v.trim().split(/\s+/).filter(Boolean).length;
    if (words > C.MAX_WORDS) problems.push(`row ${k}: ${words} words, cap is ${C.MAX_WORDS} — "${v}"`);
    if (!v.trim().endsWith('.')) problems.push(`row ${k}: does not end in a full stop — "${v}"`);
    if (/&[a-z]+;|&#\d+;|<[a-z/]/i.test(v)) problems.push(`row ${k}: carries an HTML fragment — "${v}"`);
    if (/^\s*```/.test(v)) problems.push(`row ${k}: carries a code fence — "${v}"`);
  }

  if (problems.length) {
    say(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} — nothing was written.\n`);
    for (const p of problems.slice(0, 40)) say('  ' + p);
    if (problems.length > 40) say(`  ... and ${problems.length - 40} more`);
    say('\nFix them in the answers file and check again.');
    return false;
  }
  say(`All ${got.size} answers pass: every index present, none over ${C.MAX_WORDS} words, no HTML, all ending in a full stop.`);
  return true;
}

function apply(dir) {
  const runPath = path.join(OUTPUT_DIR, dir);
  const pendingPath = path.join(runPath, PENDING_JSON);
  const answersPath = path.join(runPath, ANSWERS_JSON);
  const donePath = path.join(runPath, '.compress_done.json');

  for (const [p, what] of [[pendingPath, PENDING_JSON], [answersPath, ANSWERS_JSON], [donePath, 'the planning state']]) {
    if (!fs.existsSync(p)) { say(`Missing ${what} in ${dir}. Run the planning step first.`); process.exit(1); }
  }

  const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
  const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
  const done = JSON.parse(fs.readFileSync(donePath, 'utf8'));
  const rows = C.readProForma(path.join(runPath, RAW_CSV));

  const bad = [];
  const filled = [];
  let skipped = 0;
  for (const p of pending.rows) {
    // Absent and null mean different things. Absent is an oversight and stops
    // the run; null is a recorded decision that the text was not usable.
    if (!Object.prototype.hasOwnProperty.call(answers, String(p.index))) {
      bad.push({ index: p.index, title: p.title, reason: 'no answer given' });
      continue;
    }
    const v = C.validateAnswer(answers[String(p.index)]);
    if (!v.ok) { bad.push({ index: p.index, title: p.title, reason: v.reason }); continue; }
    if (v.skip) {
      skipped++;
      for (const idx of [p.index, ...(p.appliesAlsoTo || [])]) {
        filled.push({ ...rows[idx], summary: '', notes: C.addNote(rows[idx].notes, C.SKIP_NOTE) });
      }
      continue;
    }
    for (const idx of [p.index, ...(p.appliesAlsoTo || [])]) {
      filled.push({ ...rows[idx], summary: v.text });
    }
  }

  if (bad.length) {
    say(`${bad.length} answers were refused — NOTHING has been written:`);
    for (const b of bad) say(`  [${b.index}] ${b.title} — ${b.reason}`);
    say('');
    say('Fix those entries and run --apply again.');
    process.exit(1);
  }

  // Rebuild in the raw file's own order, so the compressed CSV is row-for-row
  // the same sweep. A reordered file would read as a different set of changes
  // at import.
  const byKey = new Map();
  for (const r of [...done, ...filled]) byKey.set(C.urlKey(r) || C.titleKey(r), r);
  const out = rows.map(r => byKey.get(C.urlKey(r) || C.titleKey(r)) || { ...r, summary: '' });

  C.writeCsv(path.join(runPath, COMPRESSED_CSV), out);
  fs.unlinkSync(donePath);
  say(`Wrote ${COMPRESSED_CSV} — ${out.length} rows, ${filled.length - skipped} newly written` +
      (skipped ? `, ${skipped} left blank because the page text was not a description.` : '.'));
  say('This is the file to feed into Import Refresh.');
}

// ── Entry ────────────────────────────────────────────────────────────────────

function main(argv) {
  const flags = new Set(argv.filter(a => a.startsWith('--')));
  const named = argv.filter(a => !a.startsWith('--'))[0];

  if (flags.has('--examples')) {
    const pairs = buildExamples();
    say(`${pairs.length} example pairs (raw curatorial text → her approved summary)\n`);
    for (const p of pairs) {
      say(`── [${p.venue}] ${p.title}`);
      say(`   RAW: ${p.raw.replace(/\s+/g, ' ').slice(0, 400)}`);
      say(`   →    ${p.summary}\n`);
    }
    return;
  }

  const dir = named || newestRun();
  if (!dir) { say('No run directory found. Run the sweep first.'); process.exit(1); }

  if (flags.has('--check')) { check(dir); return; }
  if (flags.has('--apply')) {
    // The gate, not a suggestion. See check().
    if (!check(dir)) process.exit(1);
    apply(dir);
  } else plan(dir, { recompress: flags.has('--recompress') });
}

module.exports = { main, buildExamples, newestRun, check };
