#!/usr/bin/env node
/*
 * GUIDE REVIEW GATE — her decision: the review's finish line is code, not a promise.
 *
 * The review has ten steps (.claude/skills/guide-review/SKILL.md) after one thing that must come first:
 * reading every file. Every step is a gate: a step a script owns is run by this script; a judgement step
 * leaves proof of work in the ledger, which the script checks. A step cannot be passed before the one before it,
 * and a Guide-review push is refused (.claude/hooks/guide-review-gate.js) until all stand.
 *
 * LINE BUDGETS ARE A SECRET FROM THE REVIEWER (her decision). No step, message or instruction names a budget, a
 * limit or a tolerance, so the only way through is the substantive work. When the ten steps pass, `done` measures
 * every document against its budget, by code: a document more than 5% over is sent back ONCE with the words "go
 * through these again" — still no number. The second pass must change the file, or name the one passage it
 * checked and why it needs no further improvement. Whatever remains is printed to her in the report. Within 5% is printed, nothing more.
 *
 *   node scraper/guide_review_gate.js start     begin (clean tree): writes .claude/guide_review_ledger.json
 *   node scraper/guide_review_gate.js step      check the current step; pass it, or list what is missing
 *   node scraper/guide_review_gate.js check     everything, in order — what the push hook runs
 *   node scraper/guide_review_gate.js done      check, measure, mark the ledger done, write .claude/guide_review_report.md
 *
 *   (read)  every file's named lines copied out exactly — before step 1, not shown in the report
 *   1 Mechanical check        script  guide_check.js --strict
 *   2 Facts against the repo  script  app version, branch table against origin, run folders named in open work, and every name
 *                                             a doc puts in backticks that exists in no code (fixed, or said where it lives)
 *   3 Open work – trunk §2.2  proof   a verdict and evidence per §2.2 section
 *   4 Lessons – trunk §4.1    script + proof  no §4.1 lesson lost (script); a note and a count
 *   5 Lean trunk              script + proof  every CLAUDE.md section is a kind a trunk holds, or moved to its side doc
 *   6 Lean side docs          script + proof  each side doc says what it is for; a section that mostly repeats another doc is moved or justified
 *   7 Redundancies            script + proof  duplicates (script); diagnosis, finding, action and overturned rules per file
 *   8 Contradictions          proof   contradictions per file
 *   9 Untraceable lines       proof   each with the search made, or what was searched
 *  10 Nothing lost            script  every decision, wording and name her old text marked is still somewhere
 *
 * A step's "info" is what the report shows under Problems: empty when there is nothing to say (shown as a tick).
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
const DIAGNOSES = ['clean', 'diary', 'history', 'duplicate', 'misplaced', 'dense', 'mixed'];
const ACTIONS = ['none', 'compressed', 'moved', 'fixed'];
const MARKS = /\b(her (decision|judge?ment|call|wording|design|count|choice|view|instruction|rule)|rejected|OPEN)\b/i;
const STEP_NAMES = ['', 'Mechanical check – paths, pointers, index, section order', 'Facts against the repo – app version, branch table, run folders, names the docs mention',
  'Open work – trunk, §2.2', 'Lessons – trunk, §4.1', 'Lean trunk', 'Lean side docs', 'Redundancies – duplicates, diaries, overturned rules',
  'Contradictions', 'Untraceable lines', 'Nothing lost – decisions, wording and lessons kept'];
const LAST = 10;
const TRUNK_KINDS = ['rule', 'lesson', 'open', 'pointer', 'schematic', 'moved'];

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

// A script's own look at a file, whatever its size or what the session thinks of it: the shapes a diary, a
// stream of consciousness or a pile of test ids takes. Each flag must be cleaned up or justified with a quote.
const SMELLS = {
  versionLog: 'a version-by-version log ("Before that 53.9: …")',
  narration: 'events narrated in order (First… Then… After that…)',
  runOn: 'a run-on paragraph (one line over 900 characters, or two over 500)',
  idSoup: 'a pile of test ids (more than one in four lines)',
};
function smells(text) {
  const L = text.split('\n');
  const at = (re) => L.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean);
  const out = {};
  const vlog = at(/Before that\s+\d/);
  if (vlog.length >= 3) out.versionLog = vlog;
  const narr = at(/(?:^|[.;:]\s+)(?:First|Then|After that|Later|Next|Previously|Afterwards|Before that)\b/);
  if (narr.length >= 5) out.narration = narr;
  const long = L.map((l, i) => (l.length > 500 ? i + 1 : 0)).filter(Boolean);
  if (L.some((l) => l.length > 900) || long.length >= 2) out.runOn = long;
  const ids = (text.match(/\b[A-Z]{1,4}-\d{3}[a-z0-9]*\b/g) || []).length;
  if (ids >= 30 && ids / L.length > 0.25) out.idSoup = at(/\b[A-Z]{1,4}-\d{3}[a-z0-9]*\b/);
  return out;
}

// ---- lean trunk: the trunk holds only what every session needs; everything else is in a side doc ----
function trunkSections(text) {
  const L = text.split('\n');
  const heads = [];
  let fence = false;
  L.forEach((l, i) => {
    if (/^```/.test(l)) fence = !fence;
    const m = !fence && /^(#{2,4})\s+(.*)/.exec(l);
    if (m) heads.push({ at: i, key: norm(m[2]) });
  });
  const out = {};
  heads.forEach((h, k) => {
    const body = L.slice(h.at + 1, k + 1 < heads.length ? heads[k + 1].at : L.length).join('\n');
    if (norm(body).length > 20) out[h.key] = body;
  });
  return out;
}
// What a section names that would show it was copied from a side doc: `code`, "quoted words", ids — never paths.
let headingsCache = null;
const isHeading = (x) => {
  if (!headingsCache) headingsCache = guideFiles().flatMap((f) => (nowText(f) || '').split('\n').filter((l) => /^#{1,6}\s/.test(l)).map((l) => norm(l.replace(/^#+\s*/, '')).toLowerCase()));
  const k = norm(x).toLowerCase().replace(/\*/g, '');
  return headingsCache.some((h) => h.replace(/\*/g, '').includes(k));
};
function tokensOf(text) {
  const t = new Set();
  // a venue key, a branch or a heading named in a pointer is not a sign the text was copied
  const generic = (x) => (/^[a-z0-9_-]{1,9}$/.test(x) && !/[A-Z]/.test(x)) || isHeading(x);
  for (const m of text.matchAll(/`([^`\n]{4,60})`/g)) if (!/[\/]|\.(md|js|json|jsx)\b/.test(m[1]) && !generic(m[1])) t.add(norm(m[1]));
  for (const m of text.matchAll(/"([^"\n]{8,70})"/g)) if (!isHeading(m[1])) t.add(norm(m[1]));
  for (const m of text.matchAll(/\b[A-Z]{1,4}-\d{3}[a-z0-9]*\b/g)) t.add(m[0]);
  for (const m of text.matchAll(/\bL\d{10,}\w*\b/g)) t.add(m[0]);
  return [...t];
}
function overlapsSideDoc(text, exclude) {
  const toks = tokensOf(text);
  if (toks.length < 6) return null;
  let best = null;
  for (const f of guideFiles()) {
    if (f === 'CLAUDE.md' || f === exclude) continue;
    const doc = norm(nowText(f) || '');
    const hit = toks.filter((x) => doc.includes(x)).length / toks.length;
    if (hit >= 0.4 && (!best || hit > best.hit)) best = { f, hit };
  }
  return best;
}
const SCHEMATIC_NO = [[/\b[A-Z]{1,4}-\d{3}[a-z0-9]*\b/, 'test ids'], [/\b\d{2}\.\d{1,2}\b/, 'version numbers'], [/\bL\d{10,}/, 'lookup-log ids'], [/(her decision[^.]*){3}/i, 'a chain of her decisions']];

function sLean(led) {
  const bad = [];
  const cur = trunkSections(nowText('CLAUDE.md') || '');
  const base = trunkSections(baseText(led.baseCommit, 'CLAUDE.md') || '');
  const moved = [];
  for (const [key, body] of Object.entries(cur)) {
    const row = (led.trunk || {})[key];
    const fail = (m) => bad.push(`CLAUDE.md "${key}": ${m}`);
    if (!row) { fail('no row in the ledger trunk table — which kind is it (rule | lesson | open | pointer | schematic), or is it moved?'); continue; }
    if (!TRUNK_KINDS.includes(row.kind)) { fail(`kind must be one of ${TRUNK_KINDS.join(' | ')}.`); continue; }
    if (norm(row.reason).length < 15) fail('reason: say in a few words what it is and why every session needs it (15+ characters).');
    if (row.kind === 'schematic') for (const [re, label] of SCHEMATIC_NO) if (re.test(body)) fail(`labelled schematic but it holds ${label} — that is detail or evidence for a side doc. Move it, or cut it to the schematic.`);
    const ov = row.kind === 'moved' ? null : overlapsSideDoc(body);
    // an open item that names the side doc holding its case, and little else, is the open item plus its pointer
    if (ov && row.kind === 'open' && norm(body).includes(ov.f) && tokensOf(body).length < 12) { /* fine */ } else if (ov) {
      const ok = row.keepOk || {};
      if (!(norm(ok.quote).length >= 40 && norm(body).includes(norm(ok.quote)) && norm(ok.why).length >= 30)) fail(`most of what it names (${Math.round(ov.hit * 100)}%) is already in ${ov.f} — move it there (compressed) and leave a pointer, or justify keeping it in keepOk = {quote: 40+ characters copied from it, why: 30+ characters on why every session needs it}.`);
    }
    if (row.kind === 'moved') {
      const to = row.to;
      if (!guideFiles().includes(to) || to === 'CLAUDE.md') { fail('moved: "to" must be a side doc, e.g. "docs/add_by_link.md".'); continue; }
      const before = base[key] || '';
      const bt = tokensOf(before);
      const doc = norm(nowText(to) || '');
      if (!norm(body).includes(to)) fail(`moved to ${to} but the trunk section does not point there — leave a one-line pointer naming ${to}.`);
      if (bt.length >= 3) {
        const there = bt.filter((x) => doc.includes(x)).length / bt.length;
        const left = bt.filter((x) => norm(body).includes(x)).length / bt.length;
        if (there < 0.5) fail(`moved to ${to}, but only ${Math.round(there * 100)}% of what it named is there — move the substance (compressed), not just a pointer.`);
        if (left > 0.4) fail(`marked moved but ${Math.round(left * 100)}% of what it named is still in the trunk section — cut it down to the pointer.`);
      } else if (before && body.length > before.length * 0.6) fail('marked moved but the section has not shrunk — cut it down to the pointer.');
      const ppm = plainProblem(row.plain);
      if (ppm) fail(`plain — one plain sentence on what moved out of the trunk and where it lives now: ${ppm}.`);
      moved.push(key);
    }
  }
  return { bad, info: moved.length ? `${moved.length} section${moved.length > 1 ? 's' : ''} moved — see What changed` : '' };
}

// Step 6: every side doc is held to the same test — is each section where it belongs, and is the doc not a dumping ground
function sLeanSide(led) {
  const bad = [];
  for (const f of guideFiles()) {
    if (f === 'CLAUDE.md') continue;
    const row = (led.files || {})[f] || {};
    if (norm(row.leanNote).length < 40) bad.push(`${f}: leanNote — what this doc is for, and whether anything in it belongs in another doc or is a dump (40+ characters).`);
    for (const [key, body] of Object.entries(trunkSections(nowText(f) || ''))) {
      const ov = overlapsSideDoc(body, f);
      if (!ov) continue;
      const ok = (row.placeOk || {})[key] || {};
      if (norm(ok.quote).length >= 40 && norm(body).includes(norm(ok.quote)) && norm(ok.why).length >= 30) continue;
      bad.push(`${f} "${key}": most of what it names (${Math.round(ov.hit * 100)}%) is already in ${ov.f} — keep one copy there and point to it, or justify it in files["${f}"].placeOk["${key}"] = {quote: 40+ characters copied from the section, why: 30+ characters on why it must also live here}.`);
    }
  }
  return { bad, info: '' };
}

// Part of step 2: a name the doc puts in backticks that exists in no code is stale, or lives on another branch — fix it or say so.
function sCode(led) {
  const bad = [];
  let code = '';
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    if (['node_modules', 'output', '.git', 'transcripts', 'pages_kept'].includes(e.name)) continue;
    const rel = path.join(d, e.name);
    if (e.isDirectory()) walk(rel); else if (/\.(js|jsx|sh|json)$/.test(e.name)) code += fs.readFileSync(path.join(ROOT, rel), 'utf8') + '\n';
  } };
  for (const d of ['scraper', 'build', '.claude']) if (fs.existsSync(path.join(ROOT, d))) walk(d);
  code += nowText('Cat_Watch.jsx') || '';
  let dead = 0;
  for (const f of guideFiles()) {
    if (/_pages\//.test(f)) continue; // those READMEs name saved page files, not code
    const ok = ((led.files[f] || {}).deadOk) || {};
    const seen = new Set();
    for (const m of (nowText(f) || '').matchAll(/`([A-Za-z_][A-Za-z0-9_.]{4,40})`/g)) {
      const w = m[1];
      if (seen.has(w) || /\.(md|js|json|jsx|csv|mjs|mhtml|html)$/.test(w) || /^(run|stitch|probe|sweep)_\d/.test(w) || !/[a-z][A-Z]|_/.test(w)) continue;
      seen.add(w);
      if (code.includes(w) || code.includes(w.split('.')[0])) continue;
      dead++;
      if (norm(ok[w]).length < 15) bad.push(`${f}: \`${w}\` is in no code — it is stale (fix or remove it), or it lives on another branch or in a tool outside the repo (say so in files["${f}"].deadOk["${w}"], 15+ characters).`);
    }
  }
  return { bad, info: '' };
}

// What she reads must be plain English: a sentence anyone could follow, with no code names, ids or file jargon.
function plainProblem(text) {
  const t = norm(text);
  if (t.length < 30 || t.length > 260) return 'write one plain sentence of 30–260 characters';
  if (/`/.test(t)) return 'no backticks or code names';
  if (/\b[A-Z]{1,4}-\d{3}/.test(t)) return 'no test ids';
  if (/[a-z][A-Z]/.test(t.replace(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, '')) || /\b\w+_\w+\b/.test(t)) return 'no code names (camelCase or snake_case words)';
  if (/pass2|ledger|\bgate\b|§/.test(t)) return 'no review-machinery words';
  return '';
}
const nick = (f) => (f === 'CLAUDE.md' ? 'the main guide' : path.basename(f, '.md').replace(/[_-]+/g, ' '));

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
    files[f] = { linesBefore: t ? lineCount(t) : 0, probes: probeLines(t), diagnosis: '', finding: '', action: '', overturned: '', contradictions: '' };
  }
  const trunk = {};
  for (const key of Object.keys(trunkSections(baseText(base, 'CLAUDE.md') || ''))) trunk[key] = { kind: '', reason: '' };
  const openWork = {};
  for (const s of openWorkSections()) openWork[s.id] = { verdict: '', evidence: '' };
  writeLedger({ status: 'in_progress', baseCommit: base, startedAt: new Date().toISOString(), currentStep: 1, stamps: {}, files, openWork, trunk,
    lessons: { note: '', merged: null }, untraceable: [], untraceableChecked: '', dupOk: {}, fyi: [] });
  console.log(`Review started at ${base.slice(0, 7)}: ${Object.keys(files).length} files, ${Object.keys(openWork).length} open-work sections. Fill .claude/guide_review_ledger.json as each step asks, then: node scraper/guide_review_gate.js step`);
}

// ---- the steps: each returns { bad: [...], info: 'one line for the report' } ----

function sMech() {
  const r = spawnSync('node', [path.join(__dirname, 'guide_check.js'), '--strict'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) return { bad: [], info: '' };
  return { bad: ['guide_check.js --strict fails — fix what it prints:', ...String(r.stdout).split('\n').filter((l) => /^\s+\S|FAIL|MISSING|✗/i.test(l)).slice(0, 25)], info: '' };
}

function sRead(led) {
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
  return { bad, info: '' };
}

function sFacts() {
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
  return { bad, info: '' };
}

function sOpen(led) {
  const bad = [];
  const secs = openWorkSections();
  for (const s of secs) {
    const r = led.openWork[s.id] || {};
    if (!['open', 'updated', 'finished-cut'].includes(r.verdict)) { bad.push(`§${s.id}: verdict must be open | updated | finished-cut (look at the commits since the last review).`); continue; }
    const hash = (norm(r.evidence).match(/\b[0-9a-f]{7,40}\b/g) || []).find((h) => { try { git('cat-file', '-e', h + '^{commit}'); return true; } catch { return false; } });
    const filep = (norm(r.evidence).match(/[\w./-]+\.(?:js|md|json|jsx)\b/g) || []).find((p) => fs.existsSync(path.join(ROOT, p)));
    if (norm(r.evidence).length < 20 || !(hash || filep)) bad.push(`§${s.id}: evidence must name a real commit or file that shows the section is still open (or finished).`);
    if (r.verdict === 'finished-cut' && s.text.split('\n').length > 4) bad.push(`§${s.id}: marked finished-cut but the section is still ${s.text.split('\n').length} lines — cut it to its one-line result or remove it.`);
    if (!/OPEN|confirm|queued|pending|PAUSED|next|propos|unbuilt|review|watch|investigat|Expect/i.test(s.text) && r.verdict !== 'finished-cut') bad.push(`§${s.id}: nothing in it is open, pending or to confirm — a standing fact or finished work. Cut it, or move it to §2.1/§6.`);
  }
  for (const id of Object.keys(led.openWork)) if (!secs.find((s) => s.id === id)) delete led.openWork[id];
  const cutIds = secs.filter((x) => (led.openWork[x.id] || {}).verdict === 'finished-cut').map((x) => x.id);
  for (const id of cutIds) { const pp = plainProblem((led.openWork[id] || {}).plain); if (pp) bad.push(`§${id}: plain — one plain sentence on what finished and was removed: ${pp}.`); }
  return { bad, info: cutIds.length ? `${cutIds.length} finished item${cutIds.length > 1 ? 's' : ''} removed — see What changed` : '' };
}

function perFileFields(led, key, label) {
  const bad = [];
  for (const f of guideFiles()) {
    const v = norm((led.files[f] || {})[key]);
    if (v !== 'none' && v.length < 30) bad.push(`${f}: ${key} — write "none", or the ${label} found (30+ characters) and fix it.`);
  }
  return bad;
}

function sRedundant(led) {
  const bad = perFileFields(led, 'overturned', 'rule the code or a later decision overturned');
  for (const f of guideFiles()) {
    const r = led.files[f] || {};
    if (norm(r.overturned) !== 'none' && norm(r.overturned).length >= 30 && r.action === 'none' && !r.askHer) bad.push(`${f}: found an overturned rule but did nothing — fix the prose (the code wins), or put the conflict in "askHer".`);
  }
  for (const f of guideFiles()) {
    const row = led.files[f];
    if (!row) { bad.push(`${f}: no ledger row.`); continue; }
    const old = baseText(led.baseCommit, f);
    const cur = nowText(f);
    const fail = (m) => bad.push(`${f}: ${m}`);
    if (!DIAGNOSES.includes(row.diagnosis)) fail(`diagnosis must be one of ${DIAGNOSES.join(' | ')}.`);
    if (!ACTIONS.includes(row.action)) fail(`action must be one of ${ACTIONS.join(' | ')}.`);
    if (norm(row.finding).length < 40) fail('finding: what is wrong with it, or why it is fine (40+ characters).');
    if (row.action === 'compressed' && lineCount(cur) >= (old ? lineCount(old) : 0)) fail(`action says compressed but it is ${lineCount(cur)} lines, was ${old ? lineCount(old) : 0}.`);
    if (row.diagnosis && row.diagnosis !== 'clean' && row.diagnosis !== 'dense' && row.action === 'none') fail(`diagnosed "${row.diagnosis}" and nothing done — a problem found is a problem fixed.`);
    if (old && row.action === 'none' && cur !== old) fail('action says none but the file changed.');
    if (row.action !== 'none') {
      const lines = Array.isArray(row.plain) ? row.plain : [];
      if (!lines.length) fail('plain: write what you changed in plain English, one sentence per change (what was wrong, what it says now) — files["' + f + '"].plain = ["…"].');
      for (const l of lines) { const pp = plainProblem(l); if (pp) fail(`plain line "${norm(l).slice(0, 50)}…" — ${pp}.`); }
    }
    const L = cur.split('\n');
    for (const [flag, lines] of Object.entries(smells(cur))) {
      const ok = (row.smellOk || {})[flag] || {};
      const passage = norm(lines.slice(0, 12).map((n) => L[n - 1]).join(' '));
      if (norm(ok.quote).length >= 40 && passage.includes(norm(ok.quote)) && norm(ok.why).length >= 30) continue;
      fail(`${SMELLS[flag]} at line${lines.length > 1 ? 's' : ''} ${lines.slice(0, 8).join(', ')}${lines.length > 8 ? '…' : ''}: cut it down to decisions, lessons and open items — or, only if it is truly already compressed, justify it in smellOk.${flag} = {quote: 40+ characters copied from those lines, why: 30+ characters}.`);
    }
  }
  for (const d of duplicates()) if (norm((led.dupOk || {})[d.key]).length < 15) bad.push(`The same passage is in ${d.files.join(' and ')} — keep one, point from the other (or give a reason in dupOk["${d.key}"]): "${d.text}…"`);
  const changed = (k) => guideFiles().filter((f) => norm((led.files[f] || {})[k]) !== 'none' && led.files[f].action !== 'none').length;
  const diaries = guideFiles().filter((f) => ['diary', 'history'].includes((led.files[f] || {}).diagnosis) && led.files[f].action !== 'none').length;
  const parts = [];
  if (diaries) parts.push(`${diaries} diar${diaries > 1 ? 'ies' : 'y'} fixed`);
  if (changed('overturned')) parts.push(`${changed('overturned')} out-of-date rule${changed('overturned') > 1 ? 's' : ''} fixed`);
  return { bad, info: parts.length ? parts.join('; ') + ' — see What changed' : '' };
}

function sContra(led) {
  const bad = perFileFields(led, 'contradictions', 'contradiction');
  for (const f of guideFiles()) {
    const r = led.files[f] || {};
    if (norm(r.contradictions) !== 'none' && norm(r.contradictions).length >= 30 && r.action === 'none' && !r.askHer) bad.push(`${f}: found a contradiction but did nothing — fix it, or put it in "askHer".`);
  }
  const hit = guideFiles().filter((f) => norm((led.files[f] || {}).contradictions) !== 'none').map((f) => path.basename(f));
  for (const f of guideFiles()) { const a = (led.files[f] || {}).askHer; if (norm(a)) { const pp = plainProblem(a); if (pp || !/\?\s*$/.test(norm(a))) bad.push(`${f}: askHer must be one plain question for her, ending in a question mark — ${pp || 'add the question mark'}.`); } }
  return { bad, info: hit.length ? `${hit.length} fixed — see What changed` : '' };
}

function sLessons(led) {
  const bad = [];
  if (!Number.isInteger((led.lessons || {}).merged)) bad.push('lessons.merged: how many lessons you merged into a sibling (a whole number, 0 if none).');
  if (norm((led.lessons || {}).note).length < 40) bad.push('lessons.note: say what you merged or found in §4.1 (40+ characters), or why none needed it.');
  const old = baseText(led.baseCommit, 'CLAUDE.md') || '';
  const lessonsOf = (t) => [...t.matchAll(/^- \*\*([^*]{8,80}?)\*\*/gm)].map((m) => norm(m[1]));
  const sec41 = (t) => { const a = t.indexOf('### 4.1'); const b = t.indexOf('### 4.2'); return a >= 0 && b > a ? t.slice(a, b) : ''; };
  const now = norm(sec41(nowText('CLAUDE.md') || ''));
  for (const l of lessonsOf(sec41(old))) {
    const key = l.replace(/[.:]+$/, '').toLowerCase();
    if (!now.toLowerCase().includes(key.slice(0, Math.min(28, key.length))) && norm(((led.files['CLAUDE.md'] || {}).dropped || {})[l]).length < 15) bad.push(`§4.1 lesson "${l}" is gone — never drop a lesson: put it back (merged into a sibling is fine), or list it in files["CLAUDE.md"].dropped.`);
  }
  if ((led.lessons || {}).merged > 0) { const pp = plainProblem(led.lessons.plain); if (pp) bad.push(`lessons.plain — one plain sentence on what was merged: ${pp}.`); }
  return { bad, info: (led.lessons || {}).merged > 0 ? `${led.lessons.merged} merged — see What changed` : '' };
}

// Step 9: whatever the earlier steps cut, nothing she decided is gone.
function sLost(led) {
  const bad = [];
  const corpus = corpusText();
  const droppedOn = [];
  for (const f of guideFiles()) {
    const row = led.files[f] || {};
    const old = baseText(led.baseCommit, f);
    const cur = nowText(f);
    if (!old || cur === old) continue;
    const dropped = row.dropped || {};
    if (Object.keys(dropped).length) droppedOn.push(path.basename(f));
    const fail = (m) => bad.push(`${f}: ${m}`);
    for (const a of anchorsOf(old)) if (!corpus.includes(a) && norm(dropped[a]).length < 15) fail(`the old text marked as hers names "${a}", now nowhere in the guide or docs — put it back, or list it in "dropped" with the reason.`);
    for (const sent of lostDecisions(old, corpus)) if (norm(dropped[sent.slice(0, 40)]).length < 15) fail(`this marked-as-hers sentence is no longer anywhere — put it back (shortened is fine), or list it in "dropped" under its first 40 characters with the reason: "${sent.slice(0, 110)}"`);
  }
  return { bad, info: '' };
}

function sUntraced(led) {
  const bad = [];
  if (norm(led.untraceableChecked).length < 40) bad.push('untraceableChecked: say what you searched (git log -S …) and found, even if nothing was untraceable (40+ characters).');
  const corpus = corpusText();
  for (const u of led.untraceable || []) {
    if (!corpus.includes(norm(u.phrase))) continue;
    if (norm(u.searched).length < 20) bad.push(`untraceable "${u.phrase}": give the git log -S search made and what it found (20+ characters).`);
  }
  const live = (led.untraceable || []).filter((u) => corpus.includes(norm(u.phrase)));
  for (const u of live) {
    if (!guideFiles().includes(u.file)) bad.push(`untraceable "${u.phrase}": give the guide file it is in ("file").`);
    const pp = plainProblem(u.question);
    if (pp || !/\?\s*$/.test(norm(u.question))) bad.push(`untraceable "${u.phrase}": question — only ask her what the repo and every branch cannot answer (read the other branches first), as one plain question ending in a question mark: ${pp || 'add the question mark'}.`);
  }
  return { bad, info: live.length ? `${live.length} question${live.length > 1 ? 's' : ''} for you — see Needs you` : '' };
}

// step 2 is the facts the docs state, checked against the repo: version, branches, run folders, and the names the docs mention
function sFactsAll(led) {
  const a = sFacts(), b = sCode(led);
  return { bad: [...a.bad, ...b.bad], info: '' };
}
const STEPS = [null, sMech, sFactsAll, sOpen, sLessons, sLean, sLeanSide, sRedundant, sContra, sUntraced, sLost];

function runStep(led, n) { return STEPS[n](led); }

function stepCommand() {
  const led = readLedger();
  if (!led) { console.log('No review started: run `node scraper/guide_review_gate.js start` first.'); process.exit(1); }
  if (!led.stamps[0]) {
    const rd = sRead(led);
    if (rd.bad.length) {
      console.log(`Before step 1 — read every file to the end. ${rd.bad.length} thing(s) left; do them, do not report them:`);
      rd.bad.slice(0, 40).forEach((b) => console.log('  - ' + b));
      process.exit(1);
    }
    led.stamps[0] = { at: new Date().toISOString(), info: '' };
    writeLedger(led);
    console.log('Reading proved. Next: step 1 — ' + STEP_NAMES[1] + '.');
    return;
  }
  const n = led.currentStep || 1;
  if (n > LAST) { console.log('All ten steps passed. Run: node scraper/guide_review_gate.js done'); return; }
  const r = runStep(led, n);
  if (r.bad.length) {
    console.log(`Step ${n} of ${LAST} — ${STEP_NAMES[n]} — not passed; ${n < LAST ? `steps ${n + 1}–${LAST} stay closed` : 'the review cannot close'}. ${r.bad.length} thing(s) left; do them, do not report them:`);
    r.bad.slice(0, 40).forEach((b) => console.log('  - ' + b));
    if (r.bad.length > 40) console.log(`  … and ${r.bad.length - 40} more`);
    writeLedger(led);
    process.exit(1);
  }
  led.stamps[n] = { at: new Date().toISOString(), info: r.info };
  led.currentStep = n + 1;
  writeLedger(led);
  console.log(`Step ${n} of ${LAST} — ${STEP_NAMES[n]} — passed.` + (n < LAST ? ` Next: step ${n + 1} — ${STEP_NAMES[n + 1]}.` : ' Run: node scraper/guide_review_gate.js done'));
}

// Every step in order, each re-run now: what the push hook asks.
function check() {
  const led = readLedger();
  if (!led) return { bad: ['No review started: run `node scraper/guide_review_gate.js start` first.'], infos: [] };
  const infos = [];
  if (!led.stamps || !led.stamps[0]) return { bad: ['Before step 1: read every file — run: node scraper/guide_review_gate.js step'], infos: [] };
  for (let n = 1; n <= LAST; n++) {
    if (!led.stamps || !led.stamps[n]) return { bad: [`Step ${n} of ${LAST} (${STEP_NAMES[n]}) not passed yet — run: node scraper/guide_review_gate.js step`], infos };
    if (n > 1 && led.stamps[n].at < led.stamps[n - 1].at) return { bad: [`Step ${n} was passed before step ${n - 1}.`], infos };
    const r = runStep(led, n);
    if (r.bad.length) return { bad: [`Step ${n} of ${LAST} (${STEP_NAMES[n]}) no longer holds:`, ...r.bad.slice(0, 30)], infos };
    infos.push(r.info);
  }
  return { bad: finalProblems(led), infos };
}

// ---- measured last, by code, after the ten steps; the reviewer is never told these numbers ----
const sha = (t) => require('crypto').createHash('sha256').update(String(t)).digest('hex');
function measure() {
  const over = [], near = [];
  for (const f of guideFiles()) {
    const lines = lineCount(nowText(f)), bud = budgetOf(f);
    if (lines > limitOf(f)) over.push({ f, lines, bud });
    else if (lines > bud) near.push({ f, lines, bud });
  }
  return { over, near };
}
// A document measured well over is sent back once ("go through these again"); the second pass must change the file or
// name the one passage it checked and why it needs no further improvement. Never a number in anything the reviewer reads.
function finalProblems(led) {
  const m = measure();
  if (!m.over.length) return [];
  if (led.pass !== 2) return ['Not finished: run `node scraper/guide_review_gate.js done`.'];
  const bad = [];
  for (const o of m.over) {
    const row = led.files[o.f] || {};
    const was = (led.sentBack || {})[o.f];
    const p2 = row.pass2 || {};
    if (was && sha(nowText(o.f)) !== was) {
      const ppn = plainProblem(p2.note);
      if (ppn) bad.push(`${o.f}: say what you changed in plain English — files["${o.f}"].pass2.note: ${ppn}.`);
      continue;
    }
    const c = p2.nothingMore || {};
    const line = (nowText(o.f) || '').split('\n')[(c.line || 0) - 1] || '';
    if (norm(c.quote).length < 60 || !norm(line).includes(norm(c.quote).slice(0, 60))) bad.push(`${o.f} did not change. If you found nothing more to improve in it, say why — files["${o.f}"].pass2.nothingMore = {quote: a passage from it, 60+ characters, line: its line number, why: one sentence on why it needs no further improvement}.`);
    else if (plainProblem(c.why) || /\d+\s*(lines?|characters?|words?)/i.test(c.why)) bad.push(`${o.f}: pass2.nothingMore.why — one plain sentence, in words, with no figures${plainProblem(c.why) ? ': ' + plainProblem(c.why) : ''}.`);
  }
  return bad;
}


// The report: a table of the checks (a tick where clean, a count where not), then what changed and what needs her, in plain English.
function report(led, infos) {
  const m = measure();
  const reasonOf = (f) => {
    const p2 = ((led.files[f] || {}).pass2) || {};
    return p2.nothingMore && norm(p2.nothingMore.why) ? norm(p2.nothingMore.why) : norm(p2.note) ? `after a second look: ${norm(p2.note)}` : '';
  };
  const near = m.near.map((o) => `${nick(o.f)} (${o.lines}/${o.bud})`);
  const budgetCell = m.over.length ? `${m.over.length} over their limit — see Needs you` : (near.length ? `${near.length} slightly over, within 5%: ${near.join(', ')}` : '✓');
  const rows = infos.map((i, k) => `| ${k + 1}. ${STEP_NAMES[k + 1]} | ${norm(String(i).split('<br>')[0]) || '✓'} |`);
  rows.push(`| ${LAST + 1}. Budgets | ${budgetCell} |`);
  const changes = [];
  for (const f of guideFiles()) for (const l of ((led.files[f] || {}).plain) || []) changes.push(`**${nick(f)}** — ${norm(l)}`);
  for (const [k, v] of Object.entries(led.trunk || {})) if (v.kind === 'moved' && norm(v.plain)) changes.push(`**the main guide** — ${norm(v.plain)}`);
  for (const v of Object.values(led.openWork || {})) if (v.verdict === 'finished-cut' && norm(v.plain)) changes.push(`**the main guide** — ${norm(v.plain)}`);
  if ((led.lessons || {}).merged > 0 && norm(led.lessons.plain)) changes.push(`**the main guide** — ${norm(led.lessons.plain)}`);
  const SHOW = 15;
  const changeLines = changes.slice(0, SHOW).map((c) => `- ${c}`);
  if (changes.length > SHOW) changeLines.push(`- …and ${changes.length - SHOW} smaller changes — ask and I will list them.`);
  const needs = [];
  for (const f of guideFiles()) { const a = norm((led.files[f] || {}).askHer); if (a) needs.push(`**${nick(f)}** — ${a}`); }
  for (const u of (led.untraceable || []).filter((x) => corpusText().includes(norm(x.phrase)))) needs.push(`**${nick(u.file)}** — ${norm(u.question)}`);
  for (const o of m.over) needs.push(`**${nick(o.f)}** is ${o.lines} lines and its limit is ${o.bud}. ${reasonOf(o.f) || 'No reason was given.'} Raise its limit to ${roundUp50(o.lines)}, or have it rewritten more deeply?`);
  const fyi = (led.fyi || []).map((x) => `- ${norm(x)}`);
  const out = [
    '## Guide review', '',
    `**All ${guideFiles().length} documents read and checked.**`, '',
    '| Step | Problems |', '|---|---|', ...rows, '',
    '### What changed', '', ...(changeLines.length ? changeLines : ['Nothing needed changing.']), '',
    '### Needs you', '', ...(needs.length ? needs.map((n, i) => `${i + 1}. ${n}`) : ['Nothing needs you.']), '',
    ...(fyi.length ? ['### FYI', '', ...fyi, ''] : []),
  ].join('\n');
  fs.writeFileSync(REPORT, out);
  return out;
}

function done() {
  const c = check();
  const led0 = readLedger();
  if (led0 && c.bad.length === 1 && /run `node scraper\/guide_review_gate.js done`/.test(c.bad[0])) {
    // all ten steps stand; measure by code and send back what is well over — once, with no number
    led0.pass = 2;
    led0.sentBack = Object.fromEntries(measure().over.map((o) => [o.f, sha(nowText(o.f))]));
    writeLedger(led0);
    return ['Not finished. Go through these documents again — every step, the whole of each — then run `done` again:', ...measure().over.map((o) => '  ' + o.f)];
  }
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
    console.log(mode === 'done' ? 'Guide review gate: all ten steps passed. Report written to .claude/guide_review_report.md — send it as the report.' : 'Guide review gate: passed.');
  } else { console.log('usage: guide_review_gate.js start | step | check | done'); process.exit(2); }
}

module.exports = { done, measure, finalProblems, sCode, trunkSections, tokensOf, overlapsSideDoc, sLean, smells, report, readLedger, check, anchorsOf, probeLines, guideFiles, limitOf, lostDecisions, duplicates, sFacts, openWorkSections };
