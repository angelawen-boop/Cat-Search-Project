#!/usr/bin/env node
/*
 * GUIDE REVIEW GATE — her decision: the review's finish line is code, not a promise.
 *
 * The review has nine steps (.claude/skills/guide-review/SKILL.md). Sessions skipped some and reported the
 * rest, so every step is now a gate: a step that belongs to a script is run by this script; a step that is
 * judgement must leave proof of work in the ledger, which the script checks. A step cannot be passed before
 * the one before it, and a Guide-review push is refused (.claude/hooks/guide-review-gate.js) until all nine
 * stand.
 *
 *   node scraper/guide_review_gate.js start     begin (clean tree): writes .claude/guide_review_ledger.json
 *   node scraper/guide_review_gate.js step      check the current step; pass it, or list what is missing
 *   node scraper/guide_review_gate.js check     all nine, in order — what the push hook runs
 *   node scraper/guide_review_gate.js done      check, mark the ledger done, write .claude/guide_review_report.md
 *
 * Steps (numbers are the skill's):
 *   1 mechanical check   script  guide_check.js --strict
 *   2 read everything    proof   each file's named lines copied out exactly
 *   3 facts vs repo      script  version, branch table vs origin, run folders named in open work
 *   4 open work          proof   a verdict and evidence per §2.2 section
 *   5 three tests        script + proof   duplicated passages (script); diagnosis and overturned rules per file
 *   6 contradictions     script + proof   one live version everywhere (script); contradictions per file
 *   7 lessons            script + proof   no §4.1 lesson lost (script); a note
 *   8 budgets            script + proof   size, tolerance, diagnosis, action, blocker per file
 *   9 untraceable lines  proof   each listed with the search made, or none with what was searched
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { BUDGETS, DEFAULT_BUDGET } = require('./doc_budget.js');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, '.claude', 'guide_review_ledger.json');
const REPORT = path.join(ROOT, '.claude', 'guide_review_report.md');
const TOLERANCE = 1.05;
const MODEST = 1.25; // dense text this close to its budget keeps being cut; no budget is asked for
const DIAGNOSES = ['clean', 'diary', 'history', 'duplicate', 'misplaced', 'dense', 'mixed'];
const ACTIONS = ['none', 'compressed', 'moved', 'fixed'];
const MARKS = /\b(her (decision|judge?ment|call|wording|design|count|choice|view|instruction|rule)|rejected|OPEN)\b/i;
const STEP_NAMES = ['', 'Mechanical check', 'Read everything', 'Facts against the repo', 'Open work', 'Duplicates, diaries, overturned rules',
  'Contradictions', 'Lessons', 'Budgets', 'Lines that cannot be traced'];

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const lineCount = (t) => t.split('\n').length;
const budgetOf = (f) => BUDGETS[f] ?? DEFAULT_BUDGET;
const limitOf = (f) => Math.ceil(budgetOf(f) * TOLERANCE);
const roundUp50 = (n) => Math.ceil(n / 50) * 50;

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
const baseText = (base, file) => { try { return git('show', `${base}:${file}`); } catch { return null; } };
const nowText = (file) => { try { return fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { return null; } };
const corpusText = () => norm(guideFiles().map((f) => nowText(f) || '').join('\n'));

const sentences = (t) => norm(String(t).replace(/\n\s*\n/g, ' ¶ ')).split(/(?<=[.;?!])\s+|\s¶\s/);
const words = (x) => [...new Set((x.toLowerCase().match(/[a-zà-ÿ0-9][a-zà-ÿ0-9'’-]{5,}/g) || []))];

// Lines to copy out: a quarter, half, three-quarters of the way and the last, each a real line of 20+ characters.
function probeLines(text) {
  const solid = [];
  text.split('\n').forEach((l, i) => { if (norm(l).length >= 20) solid.push(i + 1); });
  if (solid.length < 4) return solid.slice(0, 2).map((line) => ({ line, text: '' }));
  const pick = [0.25, 0.5, 0.75].map((p) => solid[Math.floor(solid.length * p)]);
  pick.push(solid[solid.length - 1]);
  return [...new Set(pick)].map((line) => ({ line, text: '' }));
}

// What an old line marked as hers names: `code`, "quoted words", lookup-log ids.
function anchorsOf(text) {
  const found = new Set();
  const ok = (t) => t === t.trim() && !/\*\*|\(her |\bher (ask|wording)\b/.test(t);
  for (const line of text.split('\n')) {
    if (!MARKS.test(line)) continue;
    for (const m of line.matchAll(/`([^`\n]{4,60})`/g)) if (ok(m[1])) found.add(norm(m[1]));
    for (const m of line.matchAll(/"([^"\n]{8,70})"/g)) if (ok(m[1])) found.add(norm(m[1]));
    for (const m of line.matchAll(/\bL\d{10,}\w*\b/g)) found.add(m[0]);
  }
  return [...found];
}

// A sentence the old text marked as hers: its distinctive words must still sit together in some sentence now.
function lostDecisions(oldText, corpus) {
  const have = sentences(corpus).map((x) => new Set(words(x)));
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

// A passage long enough to be a fact, written in two files.
function duplicates() {
  const seen = new Map();
  for (const f of guideFiles()) {
    const inTable = (l) => /^\s*\|/.test(l);
    const body = (nowText(f) || '').split('\n').filter((l) => !inTable(l) && !/^\s*```/.test(l)).join('\n');
    for (const s of sentences(body)) {
      if (s.length < 110) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) seen.set(k, new Set());
      seen.get(k).add(f);
    }
  }
  return [...seen].filter(([, fs_]) => fs_.size > 1).map(([k, fs_]) => ({ key: k.slice(0, 40), text: k.slice(0, 120), files: [...fs_] }));
}

const readLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return null; } };
const writeLedger = (l) => fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n');

function openWorkSections() {
  const out = [];
  const lines = (nowText('CLAUDE.md') || '').split('\n');
  lines.forEach((l, i) => {
    const m = /^####\s+(2\.2\.\d+)\s+(.*)/.exec(l);
    if (m) out.push({ id: m[1], title: m[2], at: i });
  });
  out.forEach((s, k) => {
    const end = k + 1 < out.length ? out[k + 1].at : lines.findIndex((l, i) => i > s.at && /^(---|## )/.test(l));
    s.text = lines.slice(s.at, end > 0 ? end : lines.length).join('\n');
  });
  return out;
}

function start() {
  if (git('status', '--porcelain').trim()) { console.log('Not started: commit or stash first — the review begins from a clean tree.'); process.exit(1); }
  const base = git('rev-parse', process.argv[3] || 'HEAD').trim();
  const files = {};
  for (const f of guideFiles()) {
    const t = baseText(base, f) ?? '';
    files[f] = { linesBefore: t ? lineCount(t) : 0, probes: probeLines(t), diagnosis: '', finding: '', action: '', remaining: '', overturned: '', contradictions: '' };
  }
  const openWork = {};
  for (const s of openWorkSections()) openWork[s.id] = { verdict: '', evidence: '' };
  writeLedger({ status: 'in_progress', baseCommit: base, startedAt: new Date().toISOString(), currentStep: 1, stamps: {}, files, openWork,
    lessons: { note: '' }, untraceable: [], untraceableChecked: '', dupOk: {}, fyi: [] });
  console.log(`Review started at ${base.slice(0, 7)}: ${Object.keys(files).length} files, ${Object.keys(openWork).length} open-work sections. Fill .claude/guide_review_ledger.json as each step asks, then: node scraper/guide_review_gate.js step`);
}

// ---- the nine steps: each returns { bad: [...], info: 'one line for the report' } ----

function step1() {
  const r = spawnSync('node', [path.join(__dirname, 'guide_check.js'), '--strict'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) return { bad: [], info: 'guide check clean: paths, § pointers, index, section order' };
  return { bad: ['guide_check.js --strict fails — fix what it prints:', ...String(r.stdout).split('\n').filter((l) => /^\s+\S|FAIL|MISSING|✗/i.test(l)).slice(0, 25)], info: '' };
}

function step2(led) {
  const bad = [];
  for (const f of guideFiles()) {
    const row = led.files[f];
    if (!row) { bad.push(`${f}: no ledger row — read it and add one.`); continue; }
    const old = baseText(led.baseCommit, f);
    if (!old) continue;
    const oldLines = old.split('\n');
    for (const p of row.probes || []) {
      if (!p.text || norm(p.text) !== norm(oldLines[p.line - 1] || '')) { bad.push(`${f}: line ${p.line} not copied out exactly as it was at the start — not read to the end.`); break; }
    }
  }
  return { bad, info: `${guideFiles().length} files read to the end (named lines copied out exactly)` };
}

function step3() {
  const bad = [];
  const jsx = nowText('Cat_Watch.jsx') || '';
  const ver = (/APP_VERSION\s*=\s*"([^"]+)"/.exec(jsx) || [])[1];
  if (!ver) bad.push('APP_VERSION not found in Cat_Watch.jsx.');
  const claudeMd = nowText('CLAUDE.md') || '';
  const publishing = nowText('docs/publishing.md') || '';
  const live1 = (/\*\*Live:\s*([\d.]+)\s+in her app/.exec(claudeMd) || [])[1];
  const live2 = (/\*\*Live:\s*([\d.]+)\s+in her app/.exec(publishing) || [])[1];
  if (ver && live1 !== ver) bad.push(`CLAUDE.md §5.1 says live ${live1 || '(none)'}; the app is ${ver}.`);
  if (ver && live2 !== ver) bad.push(`docs/publishing.md "What is live now" says ${live2 || '(none)'}; the app is ${ver}.`);
  let remote = [];
  try { remote = git('ls-remote', '--heads', 'origin').split('\n').filter(Boolean).map((l) => l.split('\trefs/heads/')[1]); } catch { /* below */ }
  const branches = nowText('docs/branches.md') || '';
  if (!remote.length) bad.push('Could not read origin\'s branches (git ls-remote).');
  else {
    for (const b of remote) {
      if (b === 'main' || /^ccr-/.test(b)) continue;
      if (!branches.includes(b)) bad.push(`docs/branches.md does not list the branch ${b}.`);
    }
    for (const m of branches.matchAll(/`((?:claude\/[\w.-]+|parked))`/g)) {
      if (!remote.includes(m[1])) bad.push(`docs/branches.md lists ${m[1]}, which is not on origin.`);
    }
  }
  const dirs = new Set();
  const walk = (d, depth) => { if (depth > 3 || !fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) { dirs.add(e.name); walk(path.join(d, e.name), depth + 1); } };
  walk(path.join(ROOT, 'scraper', 'output'), 0);
  const openText = openWorkSections().map((s) => s.text).join('\n');
  for (const m of new Set(openText.match(/\b(?:run_\d{4}-\d{2}-\d{2}_\d{6}|stitch_\d{8}_\d{4})\b/g) || [])) if (!dirs.has(m)) bad.push(`Open work names ${m}, which is not under scraper/output/.`);
  return { bad, info: `app ${ver} matches the guide and publishing doc; branch table matches origin (${remote.length} branches); run folders named in open work exist` };
}

function step4(led) {
  const bad = [];
  const secs = openWorkSections();
  let open = 0, cut = 0;
  for (const s of secs) {
    const r = led.openWork[s.id] || {};
    if (!['open', 'updated', 'finished-cut'].includes(r.verdict)) { bad.push(`§${s.id}: verdict must be open | updated | finished-cut (look at the commits since the last review).`); continue; }
    const hash = (norm(r.evidence).match(/\b[0-9a-f]{7,40}\b/g) || []).find((h) => { try { git('cat-file', '-e', h + '^{commit}'); return true; } catch { return false; } });
    const filep = (norm(r.evidence).match(/[\w./-]+\.(?:js|md|json|jsx)\b/g) || []).find((p) => fs.existsSync(path.join(ROOT, p)));
    if (norm(r.evidence).length < 20 || !(hash || filep)) bad.push(`§${s.id}: evidence must name a real commit or file that shows the section is still open (or finished).`);
    if (r.verdict === 'finished-cut' && s.text.split('\n').length > 4) bad.push(`§${s.id}: marked finished-cut but the section is still ${s.text.split('\n').length} lines — cut it to its one-line result or remove it.`);
    if (r.verdict === 'finished-cut') cut++; else open++;
    if (!/OPEN|confirm|queued|pending|PAUSED|next|propos|unbuilt|review|watch|investigat|Expect/i.test(s.text) && r.verdict !== 'finished-cut') bad.push(`§${s.id}: nothing in it is open, pending or to confirm — a standing fact or finished work. Cut it, or move it to §2.1/§6.`);
  }
  for (const id of Object.keys(led.openWork)) if (!secs.find((s) => s.id === id)) delete led.openWork[id];
  return { bad, info: `${secs.length} open-work sections checked against the commits: ${open} still open, ${cut} cut` };
}

function perFileFields(led, key, label) {
  const bad = [];
  for (const f of guideFiles()) {
    const v = norm((led.files[f] || {})[key]);
    if (v !== 'none' && v.length < 30) bad.push(`${f}: ${key} — write "none", or the ${label} found (30+ characters) and fix it.`);
  }
  return bad;
}

function step5(led) {
  const bad = perFileFields(led, 'overturned', 'rule the code or a later decision overturned');
  for (const f of guideFiles()) {
    const r = led.files[f] || {};
    if (norm(r.overturned) !== 'none' && norm(r.overturned).length >= 30 && r.action === 'none' && !r.askHer) bad.push(`${f}: found an overturned rule but did nothing — fix the prose (the code wins), or put the conflict in "askHer".`);
  }
  for (const d of duplicates()) if (norm((led.dupOk || {})[d.key]).length < 15) bad.push(`The same passage is in ${d.files.join(' and ')} — keep one, point from the other (or give a reason in dupOk["${d.key}"]): "${d.text}…"`);
  return { bad, info: `${guideFiles().length} files tested for diaries, copies of facts kept elsewhere and overturned rules; ${duplicates().length} passages written in two files remain` };
}

function step6(led) {
  const bad = perFileFields(led, 'contradictions', 'contradiction');
  for (const f of guideFiles()) {
    const r = led.files[f] || {};
    if (norm(r.contradictions) !== 'none' && norm(r.contradictions).length >= 30 && r.action === 'none' && !r.askHer) bad.push(`${f}: found a contradiction but did nothing — fix it, or put it in "askHer".`);
  }
  return { bad, info: 'one live version everywhere (step 3); every file checked for the same fact stated two ways' };
}

function step7(led) {
  const bad = [];
  if (norm((led.lessons || {}).note).length < 40) bad.push('lessons.note: say what you merged or found in §4.1 (40+ characters), or why none needed it.');
  const old = baseText(led.baseCommit, 'CLAUDE.md') || '';
  const lessonsOf = (t) => [...t.matchAll(/^- \*\*([^*]{8,80}?)\*\*/gm)].map((m) => norm(m[1]));
  const sec41 = (t) => { const a = t.indexOf('### 4.1'); const b = t.indexOf('### 4.2'); return a >= 0 && b > a ? t.slice(a, b) : ''; };
  const now = norm(sec41(nowText('CLAUDE.md') || ''));
  for (const l of lessonsOf(sec41(old))) {
    const key = l.replace(/[.:]+$/, '').toLowerCase();
    if (!now.toLowerCase().includes(key.slice(0, Math.min(28, key.length))) && norm(((led.files['CLAUDE.md'] || {}).dropped || {})[l]).length < 15) bad.push(`§4.1 lesson "${l}" is gone — never drop a lesson: put it back (merged into a sibling is fine), or list it in files["CLAUDE.md"].dropped.`);
  }
  return { bad, info: 'no §4.1 lesson lost from the base; ' + norm((led.lessons || {}).note).slice(0, 80) };
}

function step8(led) {
  const bad = [];
  const corpus = corpusText();
  let compressed = 0;
  for (const f of guideFiles()) {
    const row = led.files[f];
    if (!row) { bad.push(`${f}: no ledger row.`); continue; }
    const old = baseText(led.baseCommit, f);
    const cur = nowText(f);
    const before = old ? lineCount(old) : 0;
    const after = lineCount(cur);
    const fail = (m) => bad.push(`${f}: ${m}`);
    if (!DIAGNOSES.includes(row.diagnosis)) fail(`diagnosis must be one of ${DIAGNOSES.join(' | ')}.`);
    if (!ACTIONS.includes(row.action)) fail(`action must be one of ${ACTIONS.join(' | ')}.`);
    if (norm(row.finding).length < 40) fail('finding: what is wrong with it, or why it is fine (40+ characters).');
    if (row.action === 'compressed' && after >= before) fail(`action says compressed but it is ${after} lines, was ${before}.`);
    if (row.action !== 'none') compressed++;
    if (row.diagnosis && row.diagnosis !== 'clean' && row.action === 'none' && !(row.diagnosis === 'dense' && after <= limitOf(f))) fail(`diagnosed "${row.diagnosis}" and nothing done — a problem found is a problem fixed.`);
    if (row.action === 'none' && cur !== old && old) fail('action says none but the file changed.');
    if (after > limitOf(f)) {
      if (row.diagnosis !== 'dense') fail(`${after} lines against ${budgetOf(f)} (tolerance ${limitOf(f)}), diagnosed "${row.diagnosis}" — only already-compressed ("dense") text may stay over. Compress it.`);
      else if (before && after >= before) fail(`still over (${after}/${budgetOf(f)}) and not cut at all — cut what is duplicated, stale or misplaced first.`);
      else if (after <= Math.ceil(budgetOf(f) * MODEST)) fail(`${after} lines against ${budgetOf(f)} is within reach — keep cutting (duplicates, stale and misplaced text); no budget is asked for a small overage.`);
      else {
        const b = row.blocker || {};
        const where = cur.split('\n')[(b.line || 0) - 1] || '';
        if (norm(b.quote).length < 60 || !norm(where).includes(norm(b.quote).slice(0, 60))) fail('name the blocker — a 60+ character quote of the passage that cannot go, with its current line number.');
        if (norm(row.blockerWhy).length < 40) fail('blockerWhy: why that passage cannot be cut or shortened (40+ characters).');
        if (!(row.needs > limitOf(f))) fail(`needs: the line count the file would need — a number above ${limitOf(f)}.`);
      }
    } else if (norm(row.remaining) !== 'nothing' && !row.askHer) fail('remaining: write "nothing" — within its budget there is nothing left to leave.');
    if (old && cur !== old) {
      const dropped = row.dropped || {};
      for (const a of anchorsOf(old)) if (!corpus.includes(a) && norm(dropped[a]).length < 15) fail(`the old text marked as hers names "${a}", now nowhere in the guide or docs — put it back, or list it in "dropped" with the reason.`);
      for (const sent of lostDecisions(old, corpus)) if (norm(dropped[sent.slice(0, 40)]).length < 15) fail(`this marked-as-hers sentence is no longer anywhere — put it back (shortened is fine), or list it in "dropped" under its first 40 characters with the reason: "${sent.slice(0, 110)}"`);
    }
  }
  return { bad, info: `${guideFiles().length} files against budget; ${compressed} changed` };
}

function step9(led) {
  const bad = [];
  if (norm(led.untraceableChecked).length < 40) bad.push('untraceableChecked: say what you searched (git log -S …) and found, even if nothing was untraceable (40+ characters).');
  const corpus = corpusText();
  for (const u of led.untraceable || []) {
    if (!corpus.includes(norm(u.phrase))) continue;
    if (norm(u.searched).length < 20) bad.push(`untraceable "${u.phrase}": give the git log -S search made and what it found (20+ characters).`);
  }
  return { bad, info: `${(led.untraceable || []).length} untraceable line(s) raised; ${norm(led.untraceableChecked).slice(0, 80)}` };
}

const STEPS = [null, step1, step2, step3, step4, step5, step6, step7, step8, step9];

function runStep(led, n) { return STEPS[n](led); }

function stepCommand() {
  const led = readLedger();
  if (!led) { console.log('No review started: run `node scraper/guide_review_gate.js start` first.'); process.exit(1); }
  const n = led.currentStep || 1;
  if (n > 9) { console.log('All nine steps passed. Run: node scraper/guide_review_gate.js done'); return; }
  const r = runStep(led, n);
  if (r.bad.length) {
    console.log(`Step ${n} of 9 — ${STEP_NAMES[n]} — not passed; ${n < 9 ? `steps ${n + 1}–9 stay closed` : "the review cannot close"}. ${r.bad.length} thing(s) left; do them, do not report them:`);
    r.bad.slice(0, 40).forEach((b) => console.log('  - ' + b));
    if (r.bad.length > 40) console.log(`  … and ${r.bad.length - 40} more`);
    writeLedger(led);
    process.exit(1);
  }
  led.stamps[n] = { at: new Date().toISOString(), info: r.info };
  led.currentStep = n + 1;
  writeLedger(led);
  console.log(`Step ${n} of 9 — ${STEP_NAMES[n]} — passed (${r.info}).` + (n < 9 ? ` Next: step ${n + 1} — ${STEP_NAMES[n + 1]}.` : ' Run: node scraper/guide_review_gate.js done'));
}

// Every step in order, each re-run now: what the push hook asks.
function check() {
  const led = readLedger();
  if (!led) return { bad: ['No review started: run `node scraper/guide_review_gate.js start` first.'], infos: [] };
  const infos = [];
  for (let n = 1; n <= 9; n++) {
    if (!led.stamps || !led.stamps[n]) return { bad: [`Step ${n} of 9 (${STEP_NAMES[n]}) not passed yet — run: node scraper/guide_review_gate.js step`], infos };
    if (n > 1 && led.stamps[n].at < led.stamps[n - 1].at) return { bad: [`Step ${n} was passed before step ${n - 1}.`], infos };
    const r = runStep(led, n);
    if (r.bad.length) return { bad: [`Step ${n} of 9 (${STEP_NAMES[n]}) no longer holds:`, ...r.bad.slice(0, 30)], infos };
    infos.push(r.info);
  }
  return { bad: [], infos };
}

function report(led, infos) {
  const rows = guideFiles().map((f) => {
    const r = led.files[f];
    const cur = lineCount(nowText(f)), was = r.linesBefore, bud = budgetOf(f);
    const room = bud - cur;
    let verdict = cur <= bud ? 'Within budget' : cur <= limitOf(f) ? 'Within 5% tolerance' : 'Over — needs your call';
    const cut = (s, n) => norm(s).replace(/\|/g, '/').slice(0, n);
    return `| \`${f}\` | ${bud} | ${cur}${was !== cur ? ` (was ${was})` : ''} | ${room >= 0 ? room + ' spare' : -room + ' over'} | ${verdict} | ${cut(r.finding, 170)} | ${r.action === 'none' ? '—' : r.action} | ${norm(r.remaining) === 'nothing' ? 'nothing' : cut(r.blockerWhy || r.remaining, 120)} |`;
  });
  const open = [];
  for (const f of guideFiles()) {
    const r = led.files[f];
    if (r.blocker && lineCount(nowText(f)) > limitOf(f)) open.push(`**${f}** is ${lineCount(nowText(f))} lines against a budget of ${budgetOf(f)}. ${norm(r.blockerWhy)} Suggestion: raise the budget to ${roundUp50(r.needs)}.`);
    if (r.askHer) open.push(`**${f}**: ${norm(r.askHer)}`);
  }
  for (const u of led.untraceable || []) open.push(`Could not trace: "${u.phrase}" — ${norm(u.searched)}`);
  const out = [
    '## Guide review', '',
    '### The nine steps', '', '| Step | Result |', '|---|---|',
    ...infos.map((i, k) => `| ${k + 1}. ${STEP_NAMES[k + 1]} | ${norm(i)} |`), '',
    '### Every document', '',
    '| Document | Budget | Now | Room | Verdict | Found | Done | Still needed |', '|---|---|---|---|---|---|---|---|', ...rows, '',
    '### Open items for you', '', ...(open.length ? open.map((o, i) => `${i + 1}. ${o}`) : ['None.']), '',
    ...((led.fyi || []).length ? ['### FYI', '', ...led.fyi.map((x) => `- ${norm(x)}`), ''] : []),
  ].join('\n');
  fs.writeFileSync(REPORT, out);
  return out;
}

function done() {
  const c = check();
  if (c.bad.length) return c.bad;
  const led = readLedger();
  led.status = 'done';
  led.finishedAt = new Date().toISOString();
  writeLedger(led);
  report(led, c.infos);
  return [];
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'start') start();
  else if (mode === 'step') stepCommand();
  else if (mode === 'check' || mode === 'done') {
    const bad = mode === 'done' ? done() : check().bad;
    if (bad.length) {
      console.log('Guide review not finished — do what is listed, do not report it:');
      bad.forEach((b) => console.log('  ' + (b.startsWith('Step') ? '' : '- ') + b));
      process.exit(1);
    }
    console.log(mode === 'done' ? 'Guide review gate: all nine steps passed. Report written to .claude/guide_review_report.md — send it as the report.' : 'Guide review gate: passed.');
  } else { console.log('usage: guide_review_gate.js start | step | check | done'); process.exit(2); }
}

module.exports = { report, readLedger, check, anchorsOf, probeLines, guideFiles, limitOf, lostDecisions, duplicates, step3, openWorkSections };
