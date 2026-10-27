/**
 * test_watch.js — no test run is left unwatched (her decision: hard-wired, not a rule in the guide).
 *
 *   - ONE RUN AT A TIME: a run takes a lock; a second run (a test run or a live check) refuses to start
 *     while it is held, and says what holds it.
 *   - HOW LONG, UP FRONT: every run's expected time, from how long its parts took before, in the words
 *     she sees ("Expected test run: about 2 minutes."). The hook (.claude/hooks/test-guard.js) refuses a
 *     run of a minute or more until the session has written that line to her.
 *   - A STALL IS STOPPED: run_tests.js stops a suite that runs well past its usual time; a live check
 *     stops when Parallel has answered nothing for STALL_LIVE_S. Neither waits for anyone to notice.
 *
 * The usual times: test_times.json (committed, the starting point) and the machine's own recent runs
 * (LOCAL, not committed — each run would change it). `node scraper/run_tests.js --save-times` copies the
 * machine's times into the committed file.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// CATWATCH_LOCK: a test of the hook uses its own lock, so the run holding the real one does not refuse it.
const LOCK = process.env.CATWATCH_LOCK || path.join(os.tmpdir(), 'catwatch-test-run.lock');
const BASE_TIMES = path.join(__dirname, 'test_times.json');
const LOCAL_TIMES = path.join(os.tmpdir(), 'catwatch-test-times.json');
// A run expected to take at least this long needs the line to her first; a shorter one costs her nothing.
const TELL_FROM_S = 60;
// A suite with no time on record yet.
const UNKNOWN_S = 30;
// A live check: no answer from Parallel for this long is a stall (the free tier refusing), never waited on.
const STALL_LIVE_S = 360;
// A live check's venue with no time on record yet (a clean full shop check is about half an hour).
const LIVE_VENUE_S = 100;

// ---------- the lock ----------
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function heldBy() {
  let l;
  try { l = JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch { return null; }
  if (!l || !alive(l.pid)) { try { fs.unlinkSync(LOCK); } catch {} return null; }
  return l;
}
function describeHolder(l) {
  const mins = Math.round((Date.now() - l.started) / 60000);
  return `"${l.what}" is already running (started ${mins < 1 ? 'under a minute' : mins + ' min'} ago; expected ${phrase(l.expected)}). ` +
    'One run at a time — wait for it to end, or stop it if it has stalled.';
}
// Take the lock or exit 3. Released on exit, whatever the exit.
function takeLock(what, expected) {
  const l = heldBy();
  if (l && l.pid !== process.pid) { console.log('REFUSED — ' + describeHolder(l)); process.exit(3); }
  fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, what, started: Date.now(), expected }));
  const free = () => { try { const c = JSON.parse(fs.readFileSync(LOCK, 'utf8')); if (c.pid === process.pid) fs.unlinkSync(LOCK); } catch {} };
  process.on('exit', free);
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { free(); process.exit(130); });
}

// ---------- usual times ----------
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
// The usual time of one part (a suite's command, or "shop_check:<key>"), or null if never timed.
function usual(key) {
  const local = readJson(LOCAL_TIMES)[key];
  if (local && local.length) return median(local);
  const base = readJson(BASE_TIMES)[key];
  return typeof base === 'number' ? base : null;
}
// Keep the last five times a part took (passing runs only; a stalled run is not its usual time).
function record(times) {
  const all = readJson(LOCAL_TIMES);
  for (const [k, s] of Object.entries(times)) all[k] = [...(all[k] || []), Math.round(s * 10) / 10].slice(-5);
  try { fs.writeFileSync(LOCAL_TIMES, JSON.stringify(all, null, 1)); } catch {}
}
function saveTimes() {
  const local = readJson(LOCAL_TIMES), base = readJson(BASE_TIMES);
  for (const [k, a] of Object.entries(local)) if (a.length) base[k] = median(a);
  const sorted = Object.fromEntries(Object.keys(base).sort().map(k => [k, base[k]]));
  fs.writeFileSync(BASE_TIMES, JSON.stringify(sorted, null, 1) + '\n');
  return Object.keys(local).length;
}
// When a suite counts as stalled: well past its usual time, never tighter than a minute over it.
const stallLimit = u => (u == null ? 300 : Math.max(3 * u, u + 60));

// ---------- the words she sees ----------
// Her examples: "a few seconds", "two minutes", "up to 15 min".
function phrase(s) {
  if (s < 20) return 'a few seconds';
  if (s < 60) return 'under a minute';
  if (s < 600) return `about ${Math.ceil(s / 60)} minutes`;
  return `up to ${Math.ceil(s / 300) * 5} min`;
}
const line = s => `Expected test run: ${phrase(s)}.`;

// ---------- a live check's watchdog ----------
// Call answered() on every real answer from Parallel. No answer for STALL_LIVE_S → the run stops, says so, exits 4.
function liveWatchdog(what) {
  let last = Date.now();
  const t = setInterval(() => {
    if (Date.now() - last < STALL_LIVE_S * 1000) return;
    console.log(`\nSTALLED — ${what}: no answer from Parallel for ${Math.round(STALL_LIVE_S / 60)} minutes ` +
      '(the free tier is probably refusing). Stopped, not waited on.');
    process.exit(4);
  }, 5000);
  t.unref();
  return { answered: () => { last = Date.now(); } };
}
// A request that cannot hang: Parallel not answering at all counts as no answer, not a wait.
const FETCH_TIMEOUT_MS = 90000;
const timedFetch = (url, opts) => fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

// ---------- what a command will run ----------
// The live checks: the venues it will run (its list's keys, or the ones named), each at its usual time.
const LIVE = {
  'scraper/shop_check.js': 'docs/shop_check.json',
  'scraper/gallery_shop_check.js': 'docs/gallery_shop_check.json',
};
function liveEstimate(script, args) {
  const name = path.basename(script, '.js');
  const keys = args.filter(a => !a.startsWith('-'));
  const list = keys.length ? keys : (readJson(path.join(ROOT, LIVE[script])).venues || []).map(v => v.key);
  return list.reduce((s, k) => s + (usual(name + ':' + k) ?? LIVE_VENUE_S), 0);
}
// Every run a shell command starts, in order: { kind: 'tests'|'live', script, args }.
// Each simple command in a shell line, as words, with leading VAR=value, time and timeout N dropped
// (only a command's first word starts a run — "grep 'npm test'" does not).
function commandsIn(command) {
  // A heredoc's body and a quoted string are text, not commands ("node -e '…npm test…'", a file written by cat).
  const text = command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, ' ')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, 'QUOTED');
  return text.split(/&&|\|\||;|\n|\||\(|\)/).map(part => {
    const raw = part.trim().split(/\s+/).filter(Boolean), w = [];
    // Redirections are not arguments: "> out.txt", "2>&1", ">>log".
    for (let i = 0; i < raw.length; i++) {
      if (/^\d*(>>?|<)&?\d*$/.test(raw[i])) { if (!/&\d+$/.test(raw[i])) i++; continue; }
      if (/^\d*(>>?|<)/.test(raw[i])) continue;
      w.push(raw[i]);
    }
    for (;;) {
      if (/^\w+=/.test(w[0] || '')) w.shift();
      else if (w[0] === 'time' || w[0] === 'exec') w.shift();
      else if (w[0] === 'timeout') { w.shift(); while (/^-/.test(w[0] || '')) w.shift(); w.shift(); }
      else break;
    }
    return w;
  }).filter(w => w.length);
}
function runsIn(command) {
  const out = [];
  for (const w of commandsIn(command)) {
    if (!/(^|\/)(npm|node)$/.test(w[0])) continue;
    const npm = /(^|\/)npm$/.test(w[0]) ? 0 : -1;
    if (npm >= 0 && (w[npm + 1] === 'test' || w[npm + 1] === 't')) { out.push({ kind: 'tests', args: w.slice(npm + 2).filter(a => a !== '--') }); continue; }
    if (npm >= 0 && w[npm + 1] === 'run' && /^test(:|$)/.test(w[npm + 2] || '')) {
      const g = (w[npm + 2].split(':')[1]) || null;
      out.push({ kind: 'tests', args: [...(g ? [g] : []), ...w.slice(npm + 3).filter(a => a !== '--')] });
      continue;
    }
    const i = w.findIndex(x => /(^|\/)scraper\/run_tests\.js$/.test(x));
    if (i >= 0) { out.push({ kind: 'tests', args: w.slice(i + 1) }); continue; }
    const j = w.findIndex(x => Object.keys(LIVE).some(s => x === s || x.endsWith('/' + s)));
    if (j >= 0) out.push({ kind: 'live', script: Object.keys(LIVE).find(s => w[j] === s || w[j].endsWith('/' + s)), args: w.slice(j + 1) });
  }
  return out;
}
function estimateCommand(command) {
  const runs = runsIn(command);
  if (!runs.length) return null;
  const tests = require('./run_tests.js');
  let s = 0;
  for (const r of runs) s += r.kind === 'tests' ? tests.estimate(r.args) : liveEstimate(r.script, r.args);
  return s;
}

module.exports = {
  ROOT, TELL_FROM_S, UNKNOWN_S, LIVE, heldBy, describeHolder, takeLock, usual, record, saveTimes, stallLimit,
  phrase, line, liveWatchdog, timedFetch, liveEstimate, commandsIn, runsIn, estimateCommand,
};
