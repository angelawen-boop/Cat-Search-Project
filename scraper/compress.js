#!/usr/bin/env node
/**
 * Cat Watch — summary compression.
 *
 * The scraper writes up to 2000 characters of raw curatorial text into the
 * summary column. This turns that into the short teaser she actually reads —
 * about six words, hard cap ten, measured from her own 110-entry seed set
 * rather than guessed at.
 *
 * ── THE SHAPE, AND WHY ──────────────────────────────────────────────────────
 *
 * Her rule (CLAUDE.md, Section 1): a script owns the CSV, a model only ever
 * supplies a string. So this file never asks a model anything. It decides
 * which rows NEED words, writes those rows out as a question, and later reads
 * the answers back in. The model never sees a comma or a column, and cannot
 * drop, reorder or mangle a row.
 *
 * Her second rule, and the one that shaped everything: THE MODEL IS THE ONLY
 * PART OF THIS PIPELINE THAT THINKS — do not make it do dumb work so code can
 * be clever on top. An earlier design ran blind, rewriting all ~350 rows every
 * sweep so that code could discard the ~340 that had not meaningfully changed.
 * Upside down. Giving this step ONE piece of memory — the previous run — turns
 * it the right way up:
 *
 *   raw text identical to last run  → reuse last run's words. NO model call.
 *                                     Pure code, identical input, cannot be wrong.
 *   raw text changed                → ask the model ONE question, handing it the
 *                                     old words: is the old summary now false?
 *                                     No → keep it. Yes → rewrite.
 *   never seen before               → write fresh.
 *
 * Measured across the committed sweeps of 10 Sep: 79 of 80 rows matched
 * between runs and genuine venue rewording was zero. So reuse covers nearly
 * everything and the model makes a handful of real decisions per sweep.
 *
 * It also means model non-determinism CANNOT cause drift. Where the blurb is
 * unchanged the model is never asked, so it cannot answer differently
 * tomorrow. That is a guarantee from the code, not a hope about the prompt.
 *
 * ── HOW TO RUN IT ───────────────────────────────────────────────────────────
 *
 *   node scraper/compress.js                    plan the newest run
 *   node scraper/compress.js run_2026-09-10_...  plan a named run
 *   node scraper/compress.js --apply             write the compressed CSV
 *   node scraper/compress.js --examples          print the few-shot pairs
 *   node scraper/compress.js --recompress        ignore memory, ask for everything
 *
 * Planning writes `compress_pending.json` into the run directory — the rows
 * needing words, each with its raw text and any previous wording. A session
 * (or later, a script calling the API) fills in `compress_answers.json`.
 * `--apply` then writes `sweep_compressed.csv`, which is the file she imports.
 *
 * ── WHAT THE MODEL IS ACTUALLY TOLD ─────────────────────────────────────────
 *
 * Nothing, by this file. See `compress_prompt.md`, which holds both prompts and
 * the measured reason for the model split: SONNET writes fresh summaries,
 * HAIKU judges whether an existing one went stale. Tested 10 Sep on 27 National
 * Gallery rows with the National Gallery examples removed — Haiku learned the
 * form perfectly and could not find the point ("Renoir capturing emotion and
 * connection" for an exhibition called Renoir and Love); Sonnet found the point
 * AND fabricated less. Do not assume specificity must be traded for safety;
 * that appeared true only while the model was too small to find a real
 * specific.
 *
 * If planning finds nothing pending, it writes the compressed CSV immediately
 * and there is no second step.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

const RAW_CSV        = 'sweep.csv';
const COMPRESSED_CSV = 'sweep_compressed.csv';
const PENDING_JSON   = 'compress_pending.json';
const ANSWERS_JSON   = 'compress_answers.json';

// Measured from all 110 seed summaries: min 3, median 6, max 10, and every one
// ends with a full stop. The guide said "12 words" for a long time; her own
// approved data says otherwise, and the data wins.
const MAX_WORDS = 10;

/**
 * Written into `notes` when the model judged the page text not to be a
 * description of an exhibition. It is a shared constant rather than a literal
 * in two places because the NEXT run detects the skip by finding this sentence
 * — so if the two ever drifted apart, the skip would be silently forgotten and
 * the row re-asked on every sweep from then on.
 */
const SKIP_NOTE = 'The text on this page is not a description of the exhibition, so no summary was written.';

/**
 * Venues that run the same exhibition at more than one address.
 *
 * MIRRORS `VENUES[code].locations` in sweep_prototype.js, and a fixture asserts
 * the two agree — compress.js must not require the scraper, which would drag
 * Playwright into a step that is pure text.
 *
 * Acquavella shows Portraiture: From Cassatt to Warhol in New York AND Palm
 * Beach. Both rows are kept, always (Section 3: the scraper never
 * de-duplicates), but they must not end up carrying DIFFERENT summaries or
 * they read as two unrelated exhibitions on the approval cards.
 */
const TRAVELLING_LOCATIONS = { acq: ['New York', 'Palm Beach'] };

/**
 * The identity of an exhibition ignoring which city it is in.
 *
 * Same rule the scraper uses for its "also shown at" note, so the two agree on
 * what counts as one exhibition. Returns null when the title names no known
 * location — most venues, most rows.
 */
function travellingKey(row) {
  const locs = TRAVELLING_LOCATIONS[row.venue_code] || [];
  const title = String(row.title || '');
  const loc = locs.find(l => new RegExp(`\\b${l}\\b`, 'i').test(title));
  if (!loc) return null;
  const bare = title
    .replace(new RegExp(`\\b${loc}\\b`, 'ig'), ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toUpperCase();
  return bare ? `${row.venue_code}|${bare}` : null;
}

/**
 * Group rows that are the same exhibition in different cities.
 *
 * Only groups of two or more are returned, keyed by that shared identity.
 *
 * WHY THIS IS DONE IN CODE, before anything is asked: an earlier attempt told
 * the MODEL to spot the pair and match its own wording. It matched the words
 * and carried Palm Beach's artist count (21) onto the New York row (17), so
 * both rows became confidently wrong. Asking once and writing the answer to
 * both makes disagreement impossible rather than discouraged, and costs one
 * call instead of two.
 */
function groupTravellingRuns(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = travellingKey(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const [k, v] of groups) if (v.length < 2) groups.delete(k);
  return groups;
}

/**
 * Group rows whose curatorial text is IDENTICAL, so the model is asked once.
 *
 * Stitching the two machines' output into one file means a venue swept on both
 * appears twice, and every one of its rows carries the same raw text. decide()
 * already refuses to pay twice for identical text — "reuse, no model call" — but
 * its memory is the PREVIOUS run only, so two copies inside ONE file are two
 * separate questions. On a double sweep that is most of the file.
 *
 * Asking twice is not merely wasteful, it is worse: each row is one isolated
 * question, so the model re-derives the answer with no knowledge it has just
 * written one, and can word the same text differently. Two summaries for one
 * exhibition then arrive as a conflict she has to resolve by hand.
 *
 * IT CANNOT BE WRONG, for the same reason the previous-run reuse cannot: the
 * input is character-identical after normalisation. It is not a judgement about
 * two exhibitions being the same — they may well be different exhibitions, and
 * it does not matter, because the question being answered is only "what do these
 * words say". A venue that reprints one blurb across a series answers once.
 *
 * Empty text is never grouped: those rows never reach the model anyway.
 */
function groupIdenticalRaw(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = normalizeRaw(row.raw !== undefined ? row.raw : row.summary);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const [k, v] of groups) if (v.length < 2) groups.delete(k);
  return groups;
}

// ── CSV ──────────────────────────────────────────────────────────────────────
// The scraper only ever WRITES csv, so it has no parser. This one has to
// handle quoted cells containing commas and newlines, because curatorial text
// is full of both.

function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const CSV_HEADER = 'venue_code,title,start_date,end_date,summary,url,notes';
const COLUMNS = CSV_HEADER.split(',');

function csvCell(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  return (s.includes(',') || s.includes('\n') || s.includes('"'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function writeCsv(file, rows) {
  const lines = [CSV_HEADER, ...rows.map(r => COLUMNS.map(c => csvCell(r[c])).join(','))];
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

/** Read a pro forma CSV into plain objects, tolerating column reordering. */
function readProForma(file) {
  const table = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!table.length) return [];
  const header = table[0].map(h => h.trim().toLowerCase());
  const out = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    if (!r || r.every(c => c.trim() === '')) continue;
    const obj = {};
    for (const col of COLUMNS) {
      const j = header.indexOf(col);
      obj[col] = j >= 0 ? String(r[j] ?? '').trim() : '';
    }
    out.push(obj);
  }
  return out;
}

// ── Identity between runs ────────────────────────────────────────────────────

/**
 * Match a row in this run to the same exhibition in the previous run.
 *
 * URL first, title second, and BOTH are needed. URLs change more than anyone
 * expects — a show moving from the current listing to the past one gets a new
 * path, and venues rename slugs for no reason — so URL alone loses rows that
 * have not changed at all. Title alone is worse: a venue reusing a title
 * across years ("Take One Picture 2025" / "2026") would collide, which is
 * exactly why the title key keeps the venue code on the front.
 *
 * Both failure directions are soft, which is what makes this safe:
 *   a MISS   → the row is treated as new and written fresh. That is merely
 *              today's behaviour, and costs one model call.
 *   a FALSE  → the model is handed the wrong previous wording, but it is also
 *     MATCH    handed this row's raw text and asked whether that wording is
 *              still true. It is not, so it rewrites. Bounded.
 */
function urlKey(row) {
  const u = String(row.url || '').trim();
  if (!u) return null;
  try {
    const p = new URL(u);
    // Scheme and host only — paths are case-sensitive by spec, and folding
    // them once collapsed two different exhibitions into one (IR-07).
    const host = p.host.toLowerCase();
    const pathname = p.pathname.replace(/\/+$/, '');
    return `${row.venue_code}|url|${p.protocol.toLowerCase()}//${host}${pathname}${p.search}`;
  } catch {
    return `${row.venue_code}|url|${u}`;
  }
}

function titleKey(row) {
  const t = String(row.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return t ? `${row.venue_code}|title|${t}` : null;
}

/** Index previous rows under both keys so either can find them. */
function indexPrevious(rows) {
  const index = new Map();
  for (const r of rows) {
    for (const k of [urlKey(r), titleKey(r)]) {
      if (k && !index.has(k)) index.set(k, r);
    }
  }
  return index;
}

function findPrevious(index, row) {
  const byUrl = urlKey(row);
  if (byUrl && index.has(byUrl)) return index.get(byUrl);
  const byTitle = titleKey(row);
  if (byTitle && index.has(byTitle)) return index.get(byTitle);
  return null;
}

// ── The decision ─────────────────────────────────────────────────────────────

/**
 * Whitespace-only differences are not differences. A venue re-rendering its
 * page can change indentation without changing a word, and recompressing on
 * that would be exactly the pointless churn this design exists to prevent.
 */
const normalizeRaw = s => String(s || '').replace(/\s+/g, ' ').trim();

/**
 * What should happen to one row. Pure — no files, no model, no clock — so the
 * fixtures can cover every branch.
 *
 * `prev` carries what the previous run knew: `raw` (its curatorial text) and
 * `summary` (the words it ended up with).
 */
function decide(row, prev) {
  const raw = normalizeRaw(row.summary);
  const prevRaw = prev ? normalizeRaw(prev.raw) : '';
  const prevWords = prev ? String(prev.summary || '').trim() : '';

  // Last time the model looked at this exact text and said it was not a
  // description of an exhibition. That answer is still right, so do not ask
  // again. Without this the decision is thrown away every sweep and the same
  // unusable row is re-asked forever — Acquavella's James Rosenquist row,
  // whose entire page text is a link, proved it on the very next run.
  //
  // Only while the text is UNCHANGED. If the venue has since written something
  // real, that is a new question and worth asking.
  if (prev && prev.skipped && raw && raw === prevRaw) {
    return { action: 'skipped', summary: '', note: SKIP_NOTE };
  }

  // Nothing to work with and nothing remembered. The scraper already explains
  // why in `notes` — a dead link, a page that would not load, a venue that
  // publishes no description — so this stage adds nothing.
  if (!raw && !prevWords) return { action: 'empty', summary: '' };

  // The page did not give us text THIS time, but we have words from when it
  // did. Keep them rather than blanking a description she already has — and
  // SAY SO. Silent reuse here would paper over a scraper failure, which is the
  // exact class of invisible breakage that cost 10 of 16 Acquavella summaries
  // on 10 Sep without anything reporting it.
  if (!raw) {
    return {
      action: 'carried',
      summary: prevWords,
      note: 'Description carried over from the previous sweep; the exhibition’s own page gave no text this time.',
    };
  }

  // The venue has not touched a word. Reuse, no model call. This is the case
  // that covers nearly every row, and it cannot be wrong: identical input.
  if (prevWords && raw === prevRaw) return { action: 'reuse', summary: prevWords };

  // Something changed, or we have never seen this exhibition. Either way the
  // model is asked exactly one question — and where there IS previous wording
  // it goes along, because reviewing and editing produces far less pointless
  // variation than writing from scratch.
  return {
    action: prevWords ? 'review' : 'fresh',
    summary: null,
    previousSummary: prevWords || null,
  };
}

// ── Answers ──────────────────────────────────────────────────────────────────

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Check one supplied string before it is allowed anywhere near the CSV.
 *
 * The model can only get the WORDING wrong, and wording is visible on the
 * approval card — but length and shape are mechanical, so they are checked
 * here rather than trusted. A refusal is reported, never silently dropped.
 */
function validateAnswer(text) {
  // An explicit null means "this text is not a curatorial description and I am
  // not going to invent one" — ticketing copy, a bare link, a curator
  // biography, boilerplate. This is DEF-03's second net, and it is deliberately
  // NOT the same as a missing answer: a key that is absent means the row was
  // overlooked and stops everything, while null is a decision that is recorded.
  // Without it the only way past unusable text is to fabricate a summary, which
  // is the one thing keeping the raw text in the record exists to prevent.
  if (text === null) return { ok: true, skip: true, text: '' };

  const s = String(text == null ? '' : text).trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (/\n/.test(s)) return { ok: false, reason: 'contains a line break' };
  const n = wordCount(s);
  if (n > MAX_WORDS) return { ok: false, reason: `${n} words, cap is ${MAX_WORDS}` };
  // Her seed set is unanimous on this: all 110 end with a full stop.
  return { ok: true, text: /[.!?]$/.test(s) ? s : s + '.' };
}

function addNote(existing, note) {
  const cur = String(existing || '').trim();
  if (!note) return cur;
  if (cur.includes(note)) return cur;
  return cur ? `${cur} ${note}` : note;
}

// ── Run directories ──────────────────────────────────────────────────────────

const runDirs = () =>
  fs.existsSync(OUTPUT_DIR)
    ? fs.readdirSync(OUTPUT_DIR).filter(d => d.startsWith('run_')).sort()
    : [];

/**
 * The most recent run BEFORE `dir` that actually finished compressing.
 *
 * It must have both files: the raw sweep to compare text against, and the
 * compressed one to take wording from. A run that was scraped but never
 * compressed has nothing to remember, so it is skipped rather than treated as
 * an empty memory — which would silently recompress everything.
 */
function previousCompletedRun(dir) {
  const all = runDirs();
  const here = all.indexOf(dir);
  const before = here === -1 ? all : all.slice(0, here);
  for (let i = before.length - 1; i >= 0; i--) {
    const d = before[i];
    if (fs.existsSync(path.join(OUTPUT_DIR, d, RAW_CSV)) &&
        fs.existsSync(path.join(OUTPUT_DIR, d, COMPRESSED_CSV))) return d;
  }
  return null;
}

/** Previous rows keyed for lookup, carrying raw text AND final wording. */
function loadMemory(dir) {
  if (!dir) return new Map();
  const raw = readProForma(path.join(OUTPUT_DIR, dir, RAW_CSV));
  const done = readProForma(path.join(OUTPUT_DIR, dir, COMPRESSED_CSV));
  const doneIndex = indexPrevious(done);
  const memory = [];
  for (const r of raw) {
    const d = findPrevious(doneIndex, r);
    memory.push({ ...r, raw: r.summary, summary: d ? d.summary : '' });
  }
  return indexPrevious(memory);
}

module.exports = {
  parseCsv, readProForma, writeCsv, urlKey, titleKey, indexPrevious,
  findPrevious, decide, validateAnswer, normalizeRaw, wordCount, addNote,
  previousCompletedRun, MAX_WORDS, SKIP_NOTE,
  TRAVELLING_LOCATIONS, travellingKey, groupTravellingRuns, groupIdenticalRaw,
};

// The CLI lives in compress_cli.js so this file stays importable by the tests
// without running anything.
if (require.main === module) require('./compress_cli.js').main(process.argv.slice(2));
