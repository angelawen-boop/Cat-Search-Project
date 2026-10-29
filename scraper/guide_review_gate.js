#!/usr/bin/env node
/*
 * GUIDE REVIEW GATE — her decision: the review's finish line is code, not a promise.
 *
 * Sessions read the review's instructions, did a slice of the job, and reported the rest as "open items".
 * So the instructions are now backed by this gate, and a Guide-review push is refused until it passes
 * (.claude/hooks/guide-review-gate.js).
 *
 *   node scraper/guide_review_gate.js start     begin a review: writes .claude/guide_review_ledger.json with one
 *                                               row per guide file, and the lines the session must copy out
 *   node scraper/guide_review_gate.js check     what is still missing (exit 1) — the push is refused until exit 0
 *   node scraper/guide_review_gate.js done      check, then mark the ledger done (commit it with the review)
 *
 * What it computes itself (the session cannot argue with it): each file's size before (at the review's
 * base commit) and now, the budget and its 5% tolerance, the decisions' anchors the old text held.
 * What the session must write in the ledger, per file:
 *   probes[].text   the exact text of the lines named (proves the file was read to the end)
 *   diagnosis       clean | diary | history | duplicate | misplaced | dense | mixed
 *   finding         what is wrong with the file (or why it is fine), 40+ characters
 *   action          none | compressed | moved | fixed
 * Rules:
 *   - a file over its tolerance may be left only if its diagnosis is "dense" (already-compressed text),
 *     it was cut as far as it goes (smaller than at the base), and it names a blocker: a quote of 60+
 *     characters that is in the file now, at the line given, plus why it cannot go and `needs` lines.
 *     A diary, history, duplicate or misplaced file is never left over.
 *   - anything the old file marked as her decision, judgement, wording, design, a rejection or open work
 *     names things in `backticks`, "quotes" and lookup-log ids; each must still be somewhere in the guide
 *     or docs, or be listed in `dropped` with its reason (15+ characters).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { BUDGETS, DEFAULT_BUDGET } = require('./doc_budget.js');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, '.claude', 'guide_review_ledger.json');
const TOLERANCE = 1.05;
const DIAGNOSES = ['clean', 'diary', 'history', 'duplicate', 'misplaced', 'dense', 'mixed'];
const ACTIONS = ['none', 'compressed', 'moved', 'fixed'];
const MARKS = /\b(her (decision|judge?ment|call|wording|design|count|choice|view|instruction|rule)|rejected|OPEN)\b/i;

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });

function guideFiles() {
  const out = ['CLAUDE.md'];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.md')) out.push(rel);
    }
  };
  walk('docs');
  return out.sort();
}

const lineCount = (t) => t.split('\n').length;
const budgetOf = (f) => BUDGETS[f] ?? DEFAULT_BUDGET;
const limitOf = (f) => Math.ceil(budgetOf(f) * TOLERANCE);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function baseText(base, file) {
  try { return git('show', `${base}:${file}`); } catch { return null; }
}
const nowText = (file) => { try { return fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { return null; } };

// Lines to copy out: a quarter, half, three-quarters of the way and the last, each a real line of 20+ characters.
function probeLines(text) {
  const lines = text.split('\n');
  const solid = [];
  lines.forEach((l, i) => { if (norm(l).length >= 20) solid.push(i + 1); });
  if (solid.length < 4) return solid.slice(0, 2).map((line) => ({ line, text: '' }));
  const pick = [0.25, 0.5, 0.75].map((p) => solid[Math.floor(solid.length * p)]);
  pick.push(solid[solid.length - 1]);
  return [...new Set(pick)].map((line) => ({ line, text: '' }));
}

// What an old line marked as hers names: `code`, "quoted words", lookup-log ids.
function anchorsOf(text) {
  const found = new Set();
  for (const line of text.split('\n')) {
    if (!MARKS.test(line)) continue;
    const ok = (t) => t === t.trim() && !/\*\*|\(her |\bher (ask|wording)\b/.test(t);
    for (const m of line.matchAll(/`([^`\n]{4,60})`/g)) if (ok(m[1])) found.add(norm(m[1]));
    for (const m of line.matchAll(/"([^"\n]{8,70})"/g)) if (ok(m[1])) found.add(norm(m[1]));
    for (const m of line.matchAll(/\bL\d{10,}\w*\b/g)) found.add(m[0]);
  }
  return [...found];
}

// A sentence the old text marked as hers: its distinctive words must still sit together in some sentence now.
const sentences = (t) => norm(t.replace(/\n\s*\n/g, ' ¶ ')).split(/(?<=[.;?!])\s+|\s¶\s/);
const words = (x) => [...new Set((x.toLowerCase().match(/[a-zà-ÿ0-9][a-zà-ÿ0-9'’-]{5,}/g) || []))];
function lostDecisions(oldText, corpusText) {
  const have = sentences(corpusText).map((x) => new Set(words(x)));
  const lost = [];
  for (const sent of sentences(oldText)) {
    if (!MARKS.test(sent)) continue;
    const w = words(sent).filter((x) => !['decision', 'judgement', 'wording', 'design'].includes(x));
    if (w.length < 4) continue;
    const need = Math.max(3, Math.ceil(w.length * 0.5));
    if (!have.some((h) => w.filter((x) => h.has(x)).length >= need)) lost.push(sent);
  }
  return lost;
}

const readLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return null; } };
const writeLedger = (l) => fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n');

function start() {
  if (git('status', '--porcelain').trim()) { console.log('Not started: commit or stash first — the review begins from a clean tree.'); process.exit(1); }
  const base = git('rev-parse', process.argv[3] || 'HEAD').trim();
  const files = {};
  for (const f of guideFiles()) {
    const t = baseText(base, f) ?? '';
    files[f] = { linesBefore: t ? lineCount(t) : 0, probes: probeLines(t), diagnosis: '', finding: '', action: '' };
  }
  writeLedger({ status: 'in_progress', baseCommit: base, startedAt: new Date().toISOString(), files });
  console.log(`Review started at ${base.slice(0, 7)}: ${Object.keys(files).length} files. Fill .claude/guide_review_ledger.json for every one, then run: node scraper/guide_review_gate.js check`);
}

function check() {
  const led = readLedger();
  if (!led) return ['No review started: run `node scraper/guide_review_gate.js start` first.'];
  const bad = [];
  const corpus = norm(guideFiles().map((f) => nowText(f) || '').join('\n'));
  for (const f of guideFiles()) {
    const row = (led.files || {})[f];
    if (!row) { bad.push(`${f}: no ledger row — read it and add one.`); continue; }
    const old = baseText(led.baseCommit, f);
    const cur = nowText(f);
    const before = old ? lineCount(old) : 0;
    const after = lineCount(cur);
    const fail = (m) => bad.push(`${f}: ${m}`);

    if (old) {
      const oldLines = old.split('\n');
      for (const p of row.probes || []) {
        const want = norm(oldLines[p.line - 1] || '');
        if (!p.text || norm(p.text) !== want) { fail(`line ${p.line} not copied out as it was at the start — not read to the end.`); break; }
      }
      if (!(row.probes || []).length && norm(old).length > 400) fail('no probe lines.');
    }
    if (!DIAGNOSES.includes(row.diagnosis)) fail(`diagnosis must be one of ${DIAGNOSES.join(' | ')}.`);
    if (!ACTIONS.includes(row.action)) fail(`action must be one of ${ACTIONS.join(' | ')}.`);
    if (norm(row.finding || '').length < 40) fail('finding: say what is wrong with it, or why it is fine (40+ characters).');
    if (row.action === 'compressed' && after >= before) fail(`action says compressed but it is ${after} lines, was ${before}.`);

    if (after > limitOf(f)) {
      if (row.diagnosis !== 'dense') {
        fail(`${after} lines against ${budgetOf(f)} (tolerance ${limitOf(f)}), diagnosed "${row.diagnosis}" — only already-compressed ("dense") text may stay over. Compress it.`);
      } else if (before && after >= before) {
        fail(`still over (${after}/${budgetOf(f)}) and not cut at all — cut what is duplicated, stale or misplaced first.`);
      } else {
        const b = row.blocker || {};
        const where = (cur.split('\n')[(b.line || 0) - 1] || '');
        if (norm(b.quote || '').length < 60 || !norm(where).includes(norm(b.quote || '').slice(0, 60))) {
          fail(`over (${after}/${budgetOf(f)}): name the blocker — a 60+ character quote of the passage that cannot go, with its current line number.`);
        }
        if (norm(row.blockerWhy || '').length < 40) fail('blockerWhy: why that passage cannot be cut or shortened (40+ characters).');
        if (!(row.needs > after - 1)) fail('needs: the line count the file would need (number).');
      }
    }

    if (old && cur !== old) {
      const dropped = row.dropped || {};
      for (const a of anchorsOf(old)) {
        if (corpus.includes(a)) continue;
        if (norm(dropped[a] || '').length < 15) fail(`the old text marked as hers names "${a}", now nowhere in the guide or docs — put it back, or list it in "dropped" with the reason.`);
      }
      for (const sent of lostDecisions(old, corpus)) {
        const key = sent.slice(0, 40);
        if (norm(dropped[key] || '').length < 15) fail(`this marked-as-hers sentence is no longer anywhere — put it back (shortened is fine), or list it in "dropped" under its first 40 characters with the reason: "${sent.slice(0, 110)}"`);
      }
    }
  }
  return bad;
}

function done() {
  const bad = check();
  if (bad.length) return bad;
  const led = readLedger();
  led.status = 'done';
  led.finishedAt = new Date().toISOString();
  writeLedger(led);
  return [];
}

function openItems() {
  const led = readLedger();
  if (!led) return [];
  return Object.entries(led.files || {})
    .filter(([f, r]) => r.blocker && lineCount(nowText(f) || '') > limitOf(f))
    .map(([f, r]) => `${f}: ${r.blockerWhy} (would need ~${r.needs} lines)`);
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'start') start();
  else if (mode === 'check' || mode === 'done') {
    const bad = mode === 'done' ? done() : check();
    if (bad.length) {
      console.log(`Guide review not finished — ${bad.length} thing(s) left. Do them; do not report them:`);
      for (const b of bad.slice(0, 40)) console.log('  - ' + b);
      if (bad.length > 40) console.log(`  … and ${bad.length - 40} more`);
      process.exit(1);
    }
    console.log(mode === 'done' ? 'Guide review gate: passed, ledger marked done.' : 'Guide review gate: passed.');
    const open = openItems();
    if (open.length) { console.log('Open items for the report (blockers):'); open.forEach((o) => console.log('  - ' + o)); }
  } else { console.log('usage: guide_review_gate.js start | check | done'); process.exit(2); }
}

module.exports = { lostDecisions, check, anchorsOf, probeLines, guideFiles, limitOf };
