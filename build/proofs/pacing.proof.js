#!/usr/bin/env node
/*
 * pacing.proof.js — her machine's pacing and headed rules (scraper/pacing.test.js) proven by planted faults:
 * each rule undone in a copy of the scraper, each caught by its own test; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove pacing
 */
'use strict';
const { proof } = require('./kit.js');

const P = proof("her machine's pacing and headed rules");
const TEST = 'scraper/pacing.test.js';
const check = () => P.run(['--test', '--test-reporter=tap', P.file(TEST)]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const own = id => new RegExp(`^\\s*not ok \\d+ - ${id} `);

P.control('PP-00', 'the rules as written', [], check, /^# fail 0$/m);
P.fault('PP-01', 'Cloudflare not recognised by its server name', [[SP, once(`if (h['cf-ray'] || h['cf-mitigated'] || /cloudflare/.test(val('server'))) return 'Cloudflare';`, `if (h['cf-ray'] || h['cf-mitigated']) return 'Cloudflare';`)]], check, own('P-001'));
P.fault('PP-02', 'a bot check served with 200 not taken as an objection', [[SP, once(`  if (CHALLENGE_TITLE.test(String(title || ''))) return 'BLOCKED_CHALLENGE';\n`, ``)]], check, own('P-002'));
P.fault('PP-03', 'a refused lane waits only an hour', [[SP, once(`const until = Date.parse(lastStop.at) + COOLDOWN_AFTER_REFUSAL_MS;`, `const until = Date.parse(lastStop.at) + QUIET_AFTER_CLEAN_MS;`)]], check, own('P-003'));
P.fault('PP-04', 'the oldest record of a gatekeeper wins', [[SP, once(`if (!(code in when) || t >= when[code])`, `if (!(code in when) || t <= when[code])`)]], check, own('P-004'));
P.fault('PP-05', 'two venues behind one gatekeeper at once', [[SP, once(`    if (l.holder) {`, `    if (false) {`)]], check, own('P-005'));
P.fault('PP-06', 'the gap counted from when a page was asked for', [[SP, once(`if (v.lane) { const l = laneOf(v.lane); l.lastAt = Math.max(l.lastAt, lastAny); }`, ``)]], check, own('P-005b'));
P.fault('PP-07', 'every lane waits on every other', [[SP, once(`      await waitUntil(v, l.lastAt + gap);\n      if (!discovery) break;`, `      await waitUntil(v, Math.max(l.lastAt, lastAny) + gap);\n      if (!discovery && Date.now() >= Math.max(l.lastAt, lastAny) + gap - 1) break;`)]], check, own('P-006'));
P.fault('PP-08', 'an objection does not stop the lane', [[SP, once(`if (!l.stopped) {`, `if (false) {`)]], check, own('P-007'));
P.fault('PP-09', 'lanes not paused while an unknown gatekeeper is read', [[SP, once(`discovery = { promise: new Promise(r => { resolve = r; }) };`, `resolve = () => {};`)]], check, own('P-008'));
P.fault('PP-10', 'an unknown gatekeeper risked after a refusal', [[SP, once(`const anyStopped = () => [...lanes.values()].some(l => l.stopped);`, `const anyStopped = () => false;`)]], check, own('P-009'));
P.fault('PP-11', 'a venue that never got to ask is written', [[SP, once(`  if (pv.sawStop) return`, `  if (false) return`)]], check, own('P-010'));
P.fault('PP-12', 'headed venues sent to a visible Chrome on the container', [[SP, once(`const headed = paced ? codes.filter(c => venues[c] && venues[c].headed) : [];`, `const headed = codes.filter(c => venues[c] && venues[c].headed);`)]], check, own('H-001'));
P.fault('PP-13', 'a blank profile taken as seeded', [[SP, once(`return fs.existsSync(path.join(dir, 'Default'));`, `return fs.existsSync(dir);`)]], check, own('H-002'));
P.fault('PP-14', 'the sweep on a different profile from the one seeded', [[SP, once(`const HEADED_PROFILE_DIR = path.join(__dirname, 'chrome_profile');`, `const HEADED_PROFILE_DIR = path.join(__dirname, 'chrome_profile_b');`)]], check, own('H-003'));
P.fault('PP-15', 'the sweep attaches on a different port', [[SP, once(`const HEADED_DEBUG_PORT = 9222;`, `const HEADED_DEBUG_PORT = 9223;`)]], check, own('H-005'));
P.fault('PP-16', 'finishing closes her tabs', [[SP, once(`return { context, detach: () => browser.close().catch(() => {}) };`, `return { context, detach: async () => { for (const pg of context.pages()) await pg.close().catch(() => {}); return browser.close().catch(() => {}); } };`)]], check, own('H-006'));
P.fault('PP-17', 'no Chrome open, and no word on how to open one', [[SP, once(`'Run: node scraper/probe_headed.js open — warm it up, LEAVE IT OPEN, then run this again');`, `'Open Chrome, then run this again');`)]], check, own('H-007'));
P.done();
