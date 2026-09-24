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
const QC = require('./qc.js');

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
  const jsxPath = path.join(__dirname, '..', 'Cat_Watch.jsx');
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

/**
 * Record that this folder's compressed file was written under the English-title
 * rule. The marker lists FILE NAMES, one per line — see titleJudgedIn().
 */
function markTitleJudged(runPath) {
  const m = path.join(runPath, C.ENGLISH_TITLE_MARKER);
  const have = fs.existsSync(m) ? fs.readFileSync(m, 'utf8').split('\n').map(x => x.trim()).filter(Boolean) : [];
  if (!have.includes(COMPRESSED_CSV)) fs.writeFileSync(m, [...have, COMPRESSED_CSV].join('\n') + '\n', 'utf8');
}

// ── Plan ─────────────────────────────────────────────────────────────────────

function plan(dir, { recompress = false, seedWins = false } = {}) {
  const runPath = path.join(OUTPUT_DIR, dir);
  const rawPath = path.join(runPath, RAW_CSV);
  if (!fs.existsSync(rawPath)) {
    say(`No ${RAW_CSV} in ${dir}. Run the sweep first.`);
    process.exit(1);
  }
  // SAY IT BEFORE THE TOKENS ARE SPENT, not after. --apply refuses on a faulty
  // row, and finding that out only at the end means the whole compression was
  // paid for against a file that could never be handed over.
  {
    const q = QC.inspect(dir);
    if (!q.error && (q.fatal.length || q.exceptions.length)) { QC.report(q); say(''); }
    if (!q.error && q.fatal.length) {
      say('--apply WILL REFUSE while those rows are there. Re-run the venues named,');
      say('or fix their recipes, before spending anything on compression.\n');
    }
  }

  const rows = C.readProForma(rawPath);
  const sources = recompress ? [] : C.completedCompressions(dir);
  const memory = recompress ? new Map() : C.loadMemory(sources);
  const prevDir = sources.length ? sources[0].dir : null;

  // HER 110 SEED SUMMARIES JOIN THE MEMORY. Normally they only fill gaps —
  // exhibitions the previous run knows nothing about. --seed-wins is the
  // one-time repair that lets hers REPLACE a summary the compressor wrote;
  // mergeSeedMemory() says why that must never be the standing behaviour.
  let seedAdded = 0, seedKept = 0;
  if (!recompress) {
    try {
      const merged = C.mergeSeedMemory(
        memory, C.seedMemory(path.join(__dirname, '..', 'Cat_Watch.jsx')),
        { seedWins });
      seedAdded = merged.added;
      seedKept = merged.overrode;
    } catch (e) {
      say(`Could not read the seed set (${e.message.slice(0, 60)}) — carrying on without it.`);
    }
  }

  say(`Run:      ${dir}  (${rows.length} rows)`);
  say(`Memory:   ${sources.length ? `${sources.length} earlier compressions, newest ${prevDir}/${sources[0].file}` : recompress ? '(ignored — --recompress)' : '(none — first compression)'}`);
  if (seedAdded) say(`          + ${seedAdded} of her own seed summaries, so her wording is kept unless the venue has changed what it says`);
  if (seedKept) say(`          + ${seedKept} RESTORED to her wording (--seed-wins, a one-time repair)`);

  const done = [];
  const pending = [];
  const tally = { reuse: 0, carried: 0, empty: 0, skipped: 0, review: 0, retitle: 0, fresh: 0 };

  rows.forEach((row, i) => {
    // Marker rows report a listing page the scraper could not read. There is
    // no exhibition and no prose — compressing one would be inventing.
    if (String(row.title || '').startsWith('[')) {
      done.push({ ...row, summary: '', _row: i });
      tally.empty++;
      return;
    }
    const prev = recompress ? null : C.findPrevious(memory, row);
    const d = C.decide(row, prev);
    tally[d.action] = (tally[d.action] || 0) + 1;

    if (d.summary !== null && d.summary !== undefined) {
      done.push({ ...row, summary: d.summary, notes: C.addNote(row.notes, d.note), _row: i });
    } else {
      pending.push({
        index: i,
        venue_code: row.venue_code,
        title: row.title,
        url: row.url,
        action: d.action,
        previousSummary: d.previousSummary || null,
        raw: row.summary,
        englishTitle: C.asksEnglishTitle(row),
      });
    }
  });

  say('');
  say(`  reuse    ${String(tally.reuse).padStart(4)}   unchanged text, previous wording kept — no model call`);
  say(`  carried  ${String(tally.carried).padStart(4)}   no text this time, previous wording kept, row says so`);
  say(`  empty    ${String(tally.empty).padStart(4)}   nothing to compress and nothing remembered`);
  say(`  skipped  ${String(tally.skipped || 0).padStart(4)}   already judged not a description, text unchanged — not re-asked`);
  say(`  review   ${String(tally.review).padStart(4)}   text changed — model asked whether the old summary is still true`);
  if (tally.retitle) say(`  retitle  ${String(tally.retitle).padStart(4)}   Italian venue, summary written before English titles — asked once to add one`);
  say(`  fresh    ${String(tally.fresh).padStart(4)}   never seen before — model writes new`);
  say('');

  if (!pending.length) {
    C.writeCsv(path.join(runPath, COMPRESSED_CSV), done);
    markTitleJudged(runPath);
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
  const needsTitles = asked.some(p => p.action === 'retitle');

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
      // Only rows from a venue that may title in Italian are asked for an
      // English title. See ENGLISH_TITLE_VENUES in compress.js.
      if (r.englishTitle) row.englishTitle = true;
      if (r.alsoAt) row.alsoAt = r.alsoAt;
      lines.push(JSON.stringify(row));
    }
    const file = path.join(runPath, name);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    jobs.push({ name, rows: rows.length, kb: Math.round(fs.statSync(file).size / 1024) });
  };

  // A RETITLE ASKS FOR ONE THING: the English title. Its description is
  // unchanged and kept by code, so the job carries the title and nothing
  // else — no raw text, no examples, no summary to hand back. Prompt C.
  const titleRows  = asked.filter(p => p.action === 'retitle');
  const reviewRows = asked.filter(p => p.action === 'review');
  const freshRows  = asked.filter(p => p.action !== 'review' && p.action !== 'retitle');
  if (titleRows.length) {
    const file = path.join(runPath, 'job_titles.txt');
    fs.writeFileSync(file, titleRows.map(r => JSON.stringify({ i: r.index, title: r.title })).join('\n'), 'utf8');
    jobs.push({ name: 'job_titles.txt', rows: titleRows.length, kb: Math.max(1, Math.round(fs.statSync(file).size / 1024)) });
  }
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
  if (needsTitles) say('       job_titles.txt     Prompt C — English titles only            → SONNET');
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
  say('     summary verbatim to keep it, null to refuse. Rows marked englishTitle');
  say('     answer {"summary": "...", "english": "..." or ""}; job_titles rows');
  say('     answer {"english": "..." or ""}. Strings only: code writes the line.');
  say('     Then check before applying:');
  say(`         node scraper/compress.js ${dir} --check`);
  say('     It reports any index missing, unexpected, over the word cap, or still');
  say('     carrying an HTML fragment. --apply refuses to run until it passes.');
  say('');
  say(`  4. node scraper/compress.js ${dir} --apply`);
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

  const byIdx = new Map(pending.rows.map(r => [String(r.index), r]));
  for (const [k, v] of Object.entries(answers)) {
    const p = byIdx.get(k);
    if (!p) continue;
    // The same resolution --apply uses, so the two cannot disagree.
    const r = C.resolveAnswer(v, p);
    const shown = JSON.stringify(v);
    if (!r.ok) { problems.push(`row ${k}: ${r.reason} — ${shown}`); continue; }
    if (r.skip) continue;
    const strings = typeof v === 'string' ? [v] : [v.summary, v.english].filter(x => typeof x === 'string');
    if (typeof v === 'string' && !v.trim().endsWith('.')) problems.push(`row ${k}: does not end in a full stop — ${shown}`);
    if (typeof v === 'object' && typeof v.summary === 'string' && !v.summary.trim().endsWith('.')) problems.push(`row ${k}: does not end in a full stop — ${shown}`);
    if (strings.some(x => /&[a-z]+;|&#\d+;|<[a-z/]/i.test(x))) problems.push(`row ${k}: carries an HTML fragment — ${shown}`);
    if (strings.some(x => /^\s*```/.test(x))) problems.push(`row ${k}: carries a code fence — ${shown}`);
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
    const v = C.resolveAnswer(answers[String(p.index)], p);
    if (!v.ok) { bad.push({ index: p.index, title: p.title, reason: v.reason }); continue; }
    if (v.skip) {
      skipped++;
      for (const idx of [p.index, ...(p.appliesAlsoTo || [])]) {
        filled.push({ ...rows[idx], summary: '', notes: C.addNote(rows[idx].notes, C.SKIP_NOTE), _row: idx });
      }
      continue;
    }
    for (const idx of [p.index, ...(p.appliesAlsoTo || [])]) {
      filled.push({ ...rows[idx], summary: v.text, _row: idx });
    }
  }

  if (bad.length) {
    say(`${bad.length} answers were refused — NOTHING has been written:`);
    for (const b of bad) say(`  [${b.index}] ${b.title} — ${b.reason}`);
    say('');
    say('Fix those entries and run --apply again.');
    process.exit(1);
  }

  // REBUILT BY ROW POSITION. It used to be rebuilt by a URL-or-title KEY, and
  // that quietly destroyed rows: several rows can share one key, the map keeps
  // only the last, and every position holding a colliding key then received
  // that same row.
  //
  // It showed up on the marker rows, where it is most visible and least
  // harmful. MoMA's two unreadable listing pages and the Morgan's three all
  // report the venue's base address, so all five collapsed onto one and the
  // coverage panel told her every page was the "past" page — the British
  // Museum's two survived only because its pages happen to have separate
  // addresses.
  //
  // The same collision reaches real exhibitions wherever two rows share a key:
  // a venue that has RECYCLED an address (§5), or two rows with no address at
  // all and the same title. Position cannot collide, so it is the only safe
  // way to put a file back together.
  const out = C.rebuildInOrder(rows, [...done, ...filled]);

  C.writeCsv(path.join(runPath, COMPRESSED_CSV), out);
  markTitleJudged(runPath);
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
    // TWO GATES, AND THEY GUARD DIFFERENT THINGS. check() reads the MODEL's
    // answers — length, fences, HTML. qc reads the SWEEP's rows, and a row with
    // no title or no venue code is a data fault that must never reach the file
    // she imports. Her ruling 20 Sep: that belongs to the session, never to her
    // approval pile, so it is refused here rather than shown to her there.
    const q = QC.inspect(dir);
    if (q.error) { say(q.error); process.exit(1); }
    if (q.fatal.length) {
      QC.report(q);
      say(`\nNOT WRITING ${COMPRESSED_CSV}. Re-run the venues named above, or fix their`);
      say('recipes, then sweep and compress again. Do not hand her this file.');
      process.exit(1);
    }
    if (!check(dir)) process.exit(1);
    apply(dir);
  } else plan(dir, { recompress: flags.has('--recompress'), seedWins: flags.has('--seed-wins') });
}

module.exports = { main, buildExamples, newestRun, check };
