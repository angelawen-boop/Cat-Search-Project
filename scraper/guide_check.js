#!/usr/bin/env node
/*
 * GUIDE CHECK — the mechanical half of the guide review.
 *
 * Every check here has one right answer, so it is code (CLAUDE.md §1, "Put it
 * in code"):
 *   1. Every docs/ path named anywhere exists.
 *   2. Every § pointer — to the guide or to a side doc — lands on a real heading.
 *   3. Every top-level side doc and every doc folder with a README is in the §3 index.
 *   4. The guide's top-level sections are all present, in order.
 *   5. Side-doc → side-doc links are listed (a "see also" is fine; read the list).
 *
 * It WARNS and never fails `npm test`; `--strict` exits 1 on checks 1–4, for the
 * guide-review session to use as its finish line.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));

// Lives on the `parked` branch only; the guide says so.
const PARKED_ONLY = new Set(['docs/handover_search_stage1.md']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'output', 'dist', 'transcripts', 'pages_kept', 'robots']);

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(rel);
  }
  return out;
}

const guideFiles = ['CLAUDE.md', ...walk('docs', ['.md']), ...walk('.claude', ['.md', '.sh'])];
const codeFiles = [...walk('scraper', ['.js']), ...walk('build', ['.js']), 'Cat_Watch.jsx'].filter(exists);
const allFiles = [...guideFiles, ...codeFiles];

// Numbered headings of a markdown file: "## 5.", "### 5.1", "#### 2.2.1" -> set of "5", "5.1", "2.2.1".
function headingNumbers(file) {
  const nums = new Set();
  if (!exists(file)) return nums;
  for (const line of read(file).split('\n')) {
    const m = /^#{1,6}\s+(\d+(?:\.\d+)*)[.\s]/.exec(line);
    if (m) nums.add(m[1]);
  }
  return nums;
}
const guideNums = headingNumbers('CLAUDE.md');
const problems = { paths: [], pointers: [], index: [], structure: [] };

// 1 + 2. Paths and § pointers.
const PATH_RE = /docs\/[A-Za-z0-9_.\-/]*[A-Za-z0-9_](?:\.(?:md|json|docx|jsonl)|\/)/g;
const DOC_PTR_RE = /(docs\/[A-Za-z0-9_.-]+\.md)`?"?,?\s+§(\d+(?:\.\d+)*)/g;
const GUIDE_PTR_RE = /(?:CLAUDE\.md`?|guide|the guide)\s+§(\d+(?:\.\d+)*)/g;
for (const f of allFiles) {
  const lines = read(f).split('\n');
  lines.forEach((line, i) => {
    const where = `${f}:${i + 1}`;
    for (const m of line.matchAll(PATH_RE)) {
      const p = m[0];
      if (p.includes('*') || PARKED_ONLY.has(p)) continue;
      if (!exists(p) && !exists(p.replace(/\/$/, ''))) problems.paths.push(`${where}  ${p}`);
    }
    for (const m of line.matchAll(DOC_PTR_RE)) {
      if (!headingNumbers(m[1]).has(m[2])) problems.pointers.push(`${where}  ${m[1]} §${m[2]} — no such heading`);
    }
    for (const m of line.matchAll(GUIDE_PTR_RE)) {
      const after = line.slice(m.index + m[0].length, m.index + m[0].length + 8);
      if (/^\s+there/.test(after)) continue;               // the parked branch's own guide
      if (!guideNums.has(m[1])) problems.pointers.push(`${where}  CLAUDE.md §${m[1]} — no such heading`);
    }
  });
}
// Bare § pointers inside the guide itself ("(§2.2.1)") point at the guide.
read('CLAUDE.md').split('\n').forEach((line, i) => {
  for (const m of line.matchAll(/(?<![\w/`.])§(\d+(?:\.\d+)*)/g)) {
    const before = line.slice(Math.max(0, m.index - 40), m.index);
    if (/docs\/[\w.-]+\.md`?"?,?\s*$/.test(before) || /CLAUDE\.md\s*$/.test(before)) continue;
    const after = line.slice(m.index + m[0].length, m.index + m[0].length + 8);
    if (/^\s+there/.test(after)) continue;
    if (!guideNums.has(m[1])) problems.pointers.push(`CLAUDE.md:${i + 1}  §${m[1]} — no such heading`);
  }
});

// 3. The index (guide §3) names every top-level side doc and every doc folder with a README.
const g = read('CLAUDE.md');
const idxStart = g.indexOf('## 3. Where the rest lives');
const idxEnd = g.indexOf('\n## 4.', idxStart);
const indexText = idxStart >= 0 ? g.slice(idxStart, idxEnd) : '';
for (const e of fs.readdirSync(path.join(ROOT, 'docs'), { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.md') && !indexText.includes(e.name)) problems.index.push(`docs/${e.name} is not in the §3 index`);
  if (e.isDirectory() && exists(`docs/${e.name}/README.md`) && !/_pages$/.test(e.name) && !indexText.includes(e.name)) {
    problems.index.push(`docs/${e.name}/ (has a README) is not in the §3 index`);
  }
}

// 4. Top-level sections, in order.
const WANT = ['1. How to work', '2. Where things stand and open work', '3. Where the rest lives', '4. Guardrails', '5. The app', '6. Future considerations'];
let last = -1;
for (const w of WANT) {
  const at = g.indexOf('\n## ' + w);
  if (at < 0) problems.structure.push(`missing section "## ${w}"`);
  else if (at < last) problems.structure.push(`section "## ${w}" is out of order`);
  else last = at;
}

// 5. Side doc → side doc links (information only).
const sideLinks = [];
for (const f of guideFiles.filter((x) => /^docs\/[^/]+\.md$/.test(x))) {
  const targets = new Set((read(f).match(/docs\/[A-Za-z0-9_-]+\.md/g) || []).filter((t) => t !== f));
  if (targets.size) sideLinks.push(`${path.basename(f)} -> ${[...targets].map((t) => path.basename(t)).join(', ')}`);
}

function section(title, list, strict = true) {
  console.log(`${list.length ? (strict ? 'WARN' : 'info') : 'ok  '}  ${title}${list.length ? ` (${list.length})` : ''}`);
  for (const l of list) console.log(`        ${l}`);
}
section('Paths named in the guide, docs, skills and code all exist', problems.paths);
section('§ pointers land on real headings', problems.pointers);
section('Every side doc is in the §3 index', problems.index);
section('Guide sections present and in order', problems.structure);
section('Side docs that name another side doc ("see also" — read the list)', sideLinks, false);

const bad = problems.paths.length + problems.pointers.length + problems.index.length + problems.structure.length;
console.log(bad ? `\nGuide check: ${bad} problem(s). Not a test failure; the guide review fixes them.` : '\nGuide check: clean.');
if (process.argv.includes('--strict') && bad) process.exit(1);
