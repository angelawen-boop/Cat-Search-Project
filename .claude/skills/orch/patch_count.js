#!/usr/bin/env node
/*
 * patch_count.js — the third-patch check (her decision; .claude/skills/orch/SKILL.md).
 *
 * For each named function (or venue recipe, e.g. `ng`) in a file, prints how many
 * commits changed it in the last 60 days, with each commit's date and title.
 * Git follows the code back through moves, so a rename or a shift in line numbers
 * still counts. A shallow clone is deepened to 60 days first, quietly.
 *
 *   node .claude/skills/orch/patch_count.js <file> <name> [<name> ...]
 */
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

const DAYS = 60;
const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const [file, ...names] = process.argv.slice(2);
if (!file || !names.length) {
  console.error('usage: node .claude/skills/orch/patch_count.js <file> <name> [<name> ...]');
  process.exit(2);
}

// A cloud session starts with a few days of history; the count needs sixty.
if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
  try { git(['fetch', '-q', `--shallow-since=${DAYS + 1}.days.ago`, 'origin']); }
  catch (e) { console.error(`Could not fetch ${DAYS} days of history — counts below may be short.`); }
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The definition's first line, and the closing brace at the same indent.
function span(name) {
  const n = esc(name);
  const starts = [
    new RegExp(`^(\\s*)(?:async\\s+)?function\\*?\\s+${n}\\s*\\(`),
    new RegExp(`^(\\s*)(?:const|let|var)\\s+${n}\\s*=`),
    new RegExp(`^(\\s*)['"]?${n}['"]?\\s*:\\s*\\{`),
  ];
  for (const re of starts) {
    const at = lines.findIndex((l) => re.test(l));
    if (at < 0) continue;
    const indent = lines[at].match(re)[1];
    const close = new RegExp(`^${esc(indent)}[}\\]][)};,]*\\s*$`);
    const end = lines.findIndex((l, i) => i > at && close.test(l));
    return end < 0 ? null : [at + 1, end + 1];
  }
  return null;
}

let missing = 0;
for (const name of names) {
  const s = span(name);
  if (!s) { console.log(`${name}: not found in ${file}`); missing++; continue; }
  const out = git(['log', '--no-merges', `--since=${DAYS}.days.ago`, '-s', '--date=short',
    '--format=%ad %s', '-L', `${s[0]},${s[1]}:${file}`]);
  const commits = out.split('\n').filter(Boolean);
  console.log(`${name} (${file}:${s[0]}-${s[1]}): ${commits.length} change${commits.length === 1 ? '' : 's'} in ${DAYS} days`);
  for (const c of commits) console.log(`  ${c}`);
}
process.exit(missing ? 1 : 0);
