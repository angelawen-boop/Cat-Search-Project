#!/usr/bin/env node
// A Guide-review push is refused until scraper/guide_review_gate.js passes (her decision: the review's
// finish line is code, not a promise). It applies when a review is in progress (the ledger says so) or the
// latest commit is titled "Guide review: …"; any other push passes untouched.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const ti = input.tool_input || {};
const tool = String(input.tool_name || '');
const cmd = String(ti.command || '');
const ROOT = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

const pushes = tool === 'Bash'
  ? /(^|[;&|(\s])git\s+(?:-\S+\s+)*push\b/.test(cmd)
  : /push_files|create_or_update_file|delete_file/.test(tool);
if (!pushes) process.exit(0);

let active = false;
try {
  const led = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'guide_review_ledger.json'), 'utf8'));
  active = led.status === 'in_progress';
} catch { /* no ledger */ }
try {
  const subject = execFileSync('git', ['log', '-1', '--format=%s'], { cwd: ROOT, encoding: 'utf8' });
  if (/^Guide review:/.test(subject)) active = true;
} catch { /* not a repo */ }
if (!active) process.exit(0);

const r = spawnSync('node', [path.join(ROOT, 'scraper', 'guide_review_gate.js'), 'check'], { cwd: ROOT, encoding: 'utf8' });
if (r.status === 0) process.exit(0);
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
  permissionDecisionReason: 'Push refused — the guide review is not finished. Do what is listed, then push; never report it instead.\n' +
    String(r.stdout || r.stderr).slice(0, 3000) + ' [guide-review-gate]' } }));
process.exit(0);
