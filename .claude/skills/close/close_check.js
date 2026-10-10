#!/usr/bin/env node
/*
 * close_check.js — the checks with one right answer at the end of a session
 * (.claude/skills/close/SKILL.md). Changes nothing; prints what it finds.
 *
 *   node .claude/skills/close/close_check.js [<scratchpad dir>]
 *
 * Reports: uncommitted files, commits not on GitHub (every local branch),
 * docs over their line budget, and files left in the scratchpad.
 * Exit 1 only when work is uncommitted or unpushed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let blocking = false;

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
console.log(`Branch: ${branch}`);

const dirty = git(['status', '--porcelain']);
if (dirty) {
  blocking = true;
  console.log(`NOT COMMITTED:\n${dirty.split('\n').map((l) => '  ' + l).join('\n')}`);
} else console.log('Committed: everything.');

for (const b of git(['for-each-ref', '--format=%(refname:short)', 'refs/heads']).split('\n').filter(Boolean)) {
  try { git(['fetch', '-q', 'origin', b]); } catch (e) { /* no such branch on GitHub */ }
  let ahead;
  try { ahead = git(['rev-list', '--count', `origin/${b}..${b}`]); }
  catch (e) { ahead = git(['rev-list', '--count', b, '--not', '--remotes=origin']); }
  if (ahead !== '0') {
    blocking = true;
    console.log(`NOT PUSHED: ${ahead} commit(s) on ${b}`);
  }
}
if (!blocking) console.log('Pushed: everything.');

const { report } = require(path.join(ROOT, 'scraper', 'doc_budget.js'));
const over = report().filter((r) => r.over);
console.log(over.length
  ? `Over line budget (left for the Guide review): ${over.map((r) => `${r.file} ${r.lines}/${r.budget}`).join(', ')}`
  : 'Line budgets: all within.');

const scratch = process.argv[2];
if (scratch) {
  const left = fs.existsSync(scratch) ? fs.readdirSync(scratch) : [];
  console.log(left.length ? `Scratchpad still holds: ${left.join(', ')}` : 'Scratchpad: empty.');
}

process.exit(blocking ? 1 : 0);
