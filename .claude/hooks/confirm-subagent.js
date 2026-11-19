#!/usr/bin/env node
// Before a sub-agent starts: always ask (her standing permission is withdrawn).
'use strict';
const fs = require('fs');

let p = {};
try { p = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}
const input = p.tool_input || {};
const model = String(input.model || '').toLowerCase();
const effort = String(input.effort || '').toLowerCase();

const desc = String(input.description || 'no description given');
const job = /[Pp]rompt A/.test(desc) ? ' — writing new summaries' : /[Pp]rompt B/.test(desc) ? ' — checking old summaries are still true' : '';
const plain = desc.replace(/\s*(with|using)?\s*[Pp]rompt [AB]/g, '').trim() + job;
const label = (model ? model.toUpperCase() : 'SESSION DEFAULT') + ' subagent, ' + (effort ? effort.toUpperCase() + ' effort' : 'default effort');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: 'Every sub-agent asks her (' + label + ').',
    updatedInput: Object.assign({}, input, { description: label + ' — ' + plain }),
  },
}));
