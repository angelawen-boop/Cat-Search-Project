#!/usr/bin/env node
// Every test run goes through the watched runner, one at a time, and she is told how long it will take
// before it starts (her decision: hard-wired, because sessions left runs unwatched and she was the one
// who noticed). The harness runs this before every Bash command; a refusal goes back to the session.
//
//   - a test file run directly (node --test, scraper/fixtures/…) → refused: the runner's --only, which
//     carries the stopwatch and the lock (scraper/test_watch.js);
//   - a run while another holds the lock → refused, naming it;
//   - a run started with & or nohup → refused: the harness cannot see it end, so nobody is woken;
//   - a run expected to take a minute or more → refused until the session has written to her, since the
//     last such run, the exact line "Expected test run: …" — read from the session's own transcript;
//   - a run longer than the Bash call's own time limit → refused unless it runs in the background, where
//     the session is woken when it ends.
'use strict';
const fs = require('fs');
const path = require('path');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const ti = input.tool_input || {};
const cmd = String(ti.command || '');
const ROOT = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
let W;
try { W = require(path.join(ROOT, 'scraper', 'test_watch.js')); } catch { process.exit(0); }

const deny = reason => {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason + ' [test-guard]' } }));
  process.exit(0);
};

// A suite run on its own, outside the runner. (The runner's own children never pass through here.)
const direct = W.commandsIn(cmd).find(w => /(^|\/)node$/.test(w[0]) &&
  w.some(x => x === '--test' || /(^|\/)scraper\/fixtures\/[\w.-]+\.js$/.test(x) || /\.test\.js$/.test(x)));
if (direct) {
  const file = direct.find(x => /\.js$/.test(x));
  const name = file ? path.basename(file, '.js') : 'the suite';
  deny(`Run tests through the watched runner, never directly: node scraper/run_tests.js --only ${name}` +
    ' (it carries the stopwatch, the expected time and the one-run lock).');
}

const runs = W.runsIn(cmd);
if (!runs.length) process.exit(0);

const held = W.heldBy();
if (held) deny('Not started — ' + W.describeHolder(held));

if (/(?<![&>|])&(?![&>])|\bnohup\b|\bsetsid\b|\bdisown\b/.test(cmd)) {
  deny('Never start a test run with &, nohup, setsid or disown: nothing would wake you when it ends. Use the Bash tool\'s run_in_background instead.');
}

let expected;
try { expected = W.estimateCommand(cmd); } catch { process.exit(0); }
if (expected == null) process.exit(0);
const want = W.line(expected);

const limitS = (ti.timeout || 120000) / 1000;
if (!ti.run_in_background && Math.max(expected * 2, expected + 60) > limitS) {
  deny(`This run (${W.phrase(expected)}) could outlast the Bash call's ${Math.round(limitS)}s limit. Run it with run_in_background: true; you are woken when it ends.`);
}
if (expected >= W.TELL_FROM_S) {
  // What the session has written to her since the last test run it started (or since her last message).
  let told = false;
  try {
    const lines = fs.readFileSync(input.transcript_path, 'utf8').trim().split('\n');
    const texts = [], refused = new Set();
    for (let i = lines.length - 1; i >= 0; i--) {
      let e; try { e = JSON.parse(lines[i]); } catch { continue; }
      const content = (e.message && e.message.content) || [];
      const results = Array.isArray(content) ? content.filter(c => c.type === 'tool_result') : [];
      // A run this hook refused never started, so the line written before it still stands.
      for (const r of results) if (JSON.stringify(r.content || '').includes('[test-guard]')) refused.add(r.tool_use_id);
      if (e.type === 'user' && !results.length) break;
      if (e.type !== 'assistant' || !Array.isArray(content)) continue;
      const earlierRun = content.some(c => c.type === 'tool_use' && c.id !== input.tool_use_id && !refused.has(c.id) && c.name === 'Bash' &&
        W.runsIn(String((c.input || {}).command || '')).length);
      if (earlierRun) break;
      for (const c of content) if (c.type === 'text') texts.push(c.text);
    }
    told = texts.some(t => t.includes(want));
  } catch { told = true; } // no transcript to read: nothing to check against
  if (!told) deny(`Before this run, tell her in one line, word for word: "${want}" — then start it again. Nothing more about it until it ends.`);
}

process.exit(0);
