#!/usr/bin/env node
// Before a sub-agent starts: start it without asking only within her standing permission — one at a
// time, the model named and no higher than Opus, effort low or medium (her decision). Anything else asks.
//
// The approval dialog shows only the `description`, so it is rewritten to lead with the model and the
// effort (what is being decided), and the compressor's internal prompt names are spelled out.
// "One at a time" is a marker file set here and removed by subagent-done.js when the sub-agent stops;
// a marker older than three hours is treated as left over from a crash, and asks.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

let p = {};
try { p = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}
const input = p.tool_input || {};
const model = String(input.model || '').toLowerCase();
const effort = String(input.effort || '').toLowerCase();
const marker = path.join(os.tmpdir(), 'cw-subagent-' + String(p.session_id || 'none').replace(/[^\w-]/g, ''));

const desc = String(input.description || 'no description given');
const job = /[Pp]rompt A/.test(desc) ? ' — writing new summaries' : /[Pp]rompt B/.test(desc) ? ' — checking old summaries are still true' : '';
const plain = desc.replace(/\s*(with|using)?\s*[Pp]rompt [AB]/g, '').trim() + job;
const label = (model ? model.toUpperCase() : 'SESSION DEFAULT') + ' subagent, ' + (effort ? effort.toUpperCase() + ' effort' : 'default effort');

let running = false;
try { running = Date.now() - fs.statSync(marker).mtimeMs < 3 * 3600 * 1000; } catch {}

const within = ['opus', 'sonnet', 'haiku'].includes(model) && ['low', 'medium'].includes(effort)
  && input.subagent_type !== 'fork' && !running;
if (within) fs.writeFileSync(marker, String(Date.now()));

const why = within ? 'Within her standing permission: one sub-agent, ' + label + '.'
  : running ? 'Another sub-agent from this session is still running — her permission covers one at a time.'
  : 'Outside her standing permission (named model no higher than Opus, effort low or medium, not a fork): ' + label + '.';
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: within ? 'allow' : 'ask',
    permissionDecisionReason: why,
    updatedInput: Object.assign({}, input, { description: label + ' — ' + plain }),
  },
}));
