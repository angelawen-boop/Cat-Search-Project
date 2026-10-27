// No test run left unwatched (her decision; scraper/test_watch.js, .claude/hooks/test-guard.js):
// which commands count as runs, the words of the expected time, and what the hook lets through.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const W = require('./test_watch.js');

const HOOK = path.join(__dirname, '..', '.claude', 'hooks', 'test-guard.js');
const runs = c => W.runsIn(c).map(r => r.kind + ':' + (r.script || '') + ':' + r.args.join(' ')).join(' | ');

test('TW-101: a test run is found however the line is written, and only where a command starts', () => {
  assert.strictEqual(runs('npm test > /tmp/x.txt 2>&1; echo exit $?'), 'tests::');
  assert.strictEqual(runs('npm run test:saving 2>&1 | tail -3'), 'tests::saving');
  assert.strictEqual(runs('cd a && FOO=1 timeout 600 npm test'), 'tests::');
  assert.strictEqual(runs('npm run test:links -- --only add_by_link'), 'tests::links --only add_by_link');
  assert.strictEqual(runs('node scraper/shop_check.js kmska yale >/tmp/s.txt'), 'live:scraper/shop_check.js:kmska yale');
  assert.strictEqual(runs("grep -n 'npm test' docs/testing.md"), '');
  assert.strictEqual(runs("node -e \"'npm test'; 'node scraper/shop_check.js'\""), '');
  assert.strictEqual(runs("cat > f <<'EOF'\nnpm test\nnode scraper/shop_check.js\nEOF\nls"), '');
});

test('TW-102: the expected time in her words', () => {
  assert.strictEqual(W.phrase(5), 'a few seconds');
  assert.strictEqual(W.phrase(45), 'under a minute');
  assert.strictEqual(W.phrase(90), 'about 2 minutes');
  assert.strictEqual(W.phrase(14 * 60), 'up to 15 min');
  assert.strictEqual(W.line(90), 'Expected test run: about 2 minutes.');
});

test('TW-103: a suite stalls well past its usual time, never tighter than a minute over it', () => {
  assert.strictEqual(W.stallLimit(10), 70);
  assert.strictEqual(W.stallLimit(100), 300);
  assert.strictEqual(W.stallLimit(null), 300);
});

// The hook, run as the harness runs it, on a transcript of what the session wrote before the command.
function hook(command, said, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-'));
  const tr = path.join(dir, 't.jsonl');
  const lines = [{ type: 'user', message: { content: 'please test' } }];
  if (said) lines.push({ type: 'assistant', message: { content: [{ type: 'text', text: said }] } });
  lines.push({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'T1', name: 'Bash', input: { command } }] } });
  fs.writeFileSync(tr, lines.map(l => JSON.stringify(l)).join('\n'));
  const r = spawnSync('node', [HOOK], { input: JSON.stringify({ tool_use_id: 'T1', transcript_path: tr, tool_input: { command, ...extra } }), encoding: 'utf8', env: { ...process.env, CATWATCH_LOCK: path.join(dir, 'lock') } });
  fs.rmSync(dir, { recursive: true, force: true });
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason : 'allowed';
}
const LONG = 'node scraper/shop_check.js'; // every venue: well over a minute

test('TW-104: a test file run directly is sent to the runner', () => {
  assert.match(hook('node scraper/fixtures/cloud_app.js 2>&1 | tail'), /run_tests\.js --only cloud_app/);
  assert.match(hook('node --test scraper/date.test.js'), /run_tests\.js --only date\.test/);
});

test('TW-105: a long run waits for the line to her, word for word; then it goes', () => {
  const want = W.line(W.estimateCommand(LONG));
  assert.match(hook(LONG, null, { run_in_background: true }), /tell her/);
  assert.match(hook(LONG, 'Starting the shop check now.', { run_in_background: true }), /tell her/);
  assert.strictEqual(hook(LONG, want, { run_in_background: true }), 'allowed');
});

test('TW-106: a long run in the foreground, or with &, is refused', () => {
  const want = W.line(W.estimateCommand(LONG));
  assert.match(hook(LONG, want), /run_in_background/);
  assert.match(hook(LONG + ' &', want), /run_in_background/);
});

test('TW-107: commands that are not test runs pass untouched', () => {
  assert.strictEqual(hook('ls -la'), 'allowed');
  assert.strictEqual(hook("grep -n 'npm test' docs/testing.md"), 'allowed');
});
