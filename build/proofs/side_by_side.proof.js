#!/usr/bin/env node
/*
 * side_by_side.proof.js — the side-by-side check (build/side_by_side.js) proven by planted faults: one fault
 * planted in every screen, store record, call list, download and store sequence the check captures, each
 * caught by that capture. A fault shows only while its own step runs (the page reads window.__sbsAt), and
 * its run walks only that step and the steps it needs. Then the comparison's own rules: a function's text
 * may change with --changes-allowed, a table's value may not, and the check run whole says "identical" for
 * the same page twice and catches a fault end to end.
 *
 * The real page is run twice whole and twice per step: every pair must be identical, so a fault caught is
 * the fault, never a run that differs by chance. A fault is caught only if no earlier step's capture differs.
 * The Links read's two pages are fetched live once, through the free Parallel server.
 * Run through the watched runner: node scraper/run_tests.js --prove side_by_side
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SBS = path.join(__dirname, '..', 'side_by_side.js');
const { PLANTED } = require(SBS);
const REAL = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sbs-proof-'));
const JOBS = Math.max(1, Math.min(4, os.cpus().length - 1));
let bad = 0;
const ok = (c, m, detail) => { if (c) console.log('PASS  ' + m); else { bad++; console.log('FAIL  ' + m + (detail ? '\n' + detail.split('\n').slice(0, 14).map(l => '      ' + l).join('\n') : '')); } };
const node = args => new Promise(resolve => {
  const c = spawn(process.execPath, args, { cwd: ROOT }); let out = '';
  c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
  c.on('close', status => resolve({ status, out }));
});
async function pool(jobs) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } }));
  return out;
}
let n = 0;
const snap = async (text, only, live) => {
  const k = n++, jsx = path.join(tmp, k + '.jsx'), out = path.join(tmp, k + '.json');
  fs.writeFileSync(jsx, text);
  const r = await node([SBS, '--snapshot', jsx, out, live || '-', only || '-']);
  return r.status === 0 && fs.existsSync(out) ? out : (console.log('could not run ' + (only || 'the whole walk') + ': ' + r.out.slice(-600)), null);
};
const cmp = (a, b, allowed) => node([SBS, '--compare', a, b].concat(allowed ? ['--changes-allowed'] : []));
// The captures a comparison names as differing ("DIFF  screen: <name>, at character …", "FAIL  screen: <name> — the …").
const differing = out => out.split('\n').map(l => /^(?:DIFF|FAIL)  screen: (.+?)(?:, at character \d+:| — the .*)$/.exec(l)).filter(Boolean).map(m => m[1]);
const shown = out => out.split('\n').filter(l => !/^same /.test(l)).join('\n');

// ── the faults: plain script after the page, live only while their marker's step runs ─────────────────
const BODY = {
  // Every element drawn while the step runs carries one more attribute.
  screen: `const ce = React.createElement;
    React.createElement = function (t, p, ...c) { if (on() && typeof t === 'string') p = Object.assign({}, p, { 'data-planted': '1' }); return ce.call(this, t, p, ...c); };`,
  // Every record written while the step runs carries one more field, and the page writes one stray record as
  // the step first draws (a step that writes nothing of its own).
  store: `const use = window.claude.use; const ce = React.createElement; let stray = false;
    React.createElement = function (...a) { if (on() && !stray) { stray = true; Promise.resolve(window.claude.use('db')).then(db => db && db.doc('planted/record').set({ planted: 1 })).catch(() => {}); } return ce.apply(this, a); };
    const plant = v => (on() && v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, v, { planted: 1 }) : v);
    const doc = d => ({ get: () => d.get(), set: v => d.set(plant(v)), update: v => d.update(plant(v)), delete: () => d.delete(), collection: x => coll(d.collection(x)) });
    const coll = c => { const o = { doc: id => doc(c.doc(id)), orderBy: (f, w) => { c = c.orderBy(f, w); return o; }, limit: k => { c = c.limit(k); return o; }, get: () => c.get() }; return o; };
    window.claude.use = async name => { const x = await use(name); return name === 'db' && x ? { doc: p => doc(x.doc(p)), collection: p => coll(x.collection(p)) } : x; };`,
  // The first read or list while the step runs reads one more record first.
  sequence: `const use = window.claude.use; let done = false;
    window.claude.use = async name => { const x = await use(name); if (name !== 'db' || !x) return x;
      const extra = () => { if (on() && !done) { done = true; return Promise.resolve(x.doc('planted/record').get()).then(() => 0, () => 0); } return Promise.resolve(); };
      const doc = d => ({ get: () => extra().then(() => d.get()), set: v => d.set(v), update: v => d.update(v), delete: () => d.delete(), collection: c => coll(d.collection(c)) });
      const coll = c => { const o = { doc: id => doc(c.doc(id)), orderBy: (f, w) => { c = c.orderBy(f, w); return o; }, limit: k => { c = c.limit(k); return o; }, get: () => extra().then(() => c.get()) }; return o; };
      return { doc: p => doc(x.doc(p)), collection: p => coll(x.collection(p)) }; };`,
  // Every call to the web or to Claude while the step runs asks for one thing more, and the page asks Claude one
  // stray question as the step first draws (a step that calls nothing of its own).
  calls: `const use = window.claude.use; const ce = React.createElement; let stray = false;
    React.createElement = function (...a) { if (on() && !stray) { stray = true; Promise.resolve(window.claude.use('sample')).then(x => x && x.json('planted', {})).catch(() => {}); } return ce.apply(this, a); };
    window.claude.use = async name => { const x = await use(name); if (!x) return x;
      if (name === 'mcp') return { callTool: (s, t, a) => x.callTool(s, t, on() ? Object.assign({}, a, { planted: 1 }) : a) };
      if (name === 'sample') return { json: (full, o) => x.json(on() ? full + '\\n(planted)' : full, o) };
      return x; };`,
  // The file handed over while the step runs carries one more field.
  download: `const use = window.claude.use;
    window.claude.use = async name => { const x = await use(name); return name === 'downloads' && x ? { save: f => x.save(on() && f && typeof f === 'object' ? Object.assign({}, f, { planted: 1 }) : f) } : x; };`,
  // The page shouts on the console as it opens.
  console: `if (on()) console.error('planted');`,
};
const plant = (kind, at) => REAL + PLANTED + `;(function () {
  const AT = ${at};
  const on = () => typeof window.__sbsAt === 'string' && AT.test(window.__sbsAt);
  ${BODY[kind]}
})();\n`;
const exact = s => new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
// Where a capture's fault is planted, when not under its own step's marker: [kind, marker, step to run].
const SPECIAL = {
  'marks-store': ['store', /^mark-/, 'marks-store'],               // the marks' saves fall in the marks' own steps
  'store-sequence': ['sequence', /^opening$/, 'store-sequence'],     // the reads as the page opens
  'store-sequence-all': ['sequence', /^cloudDrawer$/, 'cloudDrawer'], // a read after the first sequence's end
  'consoleErrors': ['console', /^opening$/, 'opening'],
};

function finish(total) {
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(bad ? `PROOF FAILED (the side-by-side check): ${bad} not as required.`
    : `PROOF PASSED (the side-by-side check): a fault planted in each of its ${total} captures, each caught by its own; every run of the real page steady; the comparison's rules hold.`);
  process.exit(bad ? 1 : 0);
}

(async () => {
  // The live pages for the Links read.
  const live = path.join(tmp, 'live.json');
  const f = await node([SBS, '--fetch-live', live]);
  const haveLive = f.status === 0;
  ok(haveLive, 'SB-LIVE: the Links read\'s two pages fetched live through the free Parallel server', f.out.trim());
  const L = haveLive ? live : null;

  // The whole walk, twice: identical, and every capture's step and marker.
  const [w1, w2] = await pool([() => snap(REAL, null, L), () => snap(REAL, null, L)]);
  if (!w1 || !w2) { ok(false, 'SB-00: the real page runs the whole walk'); return finish(0); }
  const s00 = await cmp(w1, w2, false);
  ok(s00.status === 0, 'SB-00: the real page, its whole walk twice, is identical', shown(s00.out));
  const whole = JSON.parse(fs.readFileSync(w1, 'utf8'));
  const missed = Object.keys(whole.missed);
  ok(!missed.length, 'SB-01: the whole walk reaches every capture', 'missed: ' + missed.join(', '));
  ok(!haveLive || 'readLinks' in whole.screens, 'SB-02: with the live pages, the walk reads Links');
  const byName = new Map(whole.steps.map(s => [s.name, s]));
  const pathOf = name => { const out = new Set(['opening']); const add = x => { if (out.has(x)) return; for (const m of byName.get(x).needs) add(m); out.add(x); }; add(name); return out; };

  // Each step alone, twice: identical. The first run is that step's base.
  const captures = Object.keys(whole.screens);
  const faults = captures.map(c => {
    const m = whole.meta[c];
    const [kind, at, st] = SPECIAL[c] || [m.kind, exact(m.at), m.step];
    return { c, kind, at, st };
  });
  const runSteps = [...new Set(faults.map(x => x.st))];
  const bases = {};
  const pairs = await pool(runSteps.map(st => async () => [st, await snap(REAL, st, L), await snap(REAL, st, L)]));
  const same = await pool(pairs.map(([st, a, b]) => async () => [st, a, a && b ? await cmp(a, b, false) : null]));
  for (const [st, a, r] of same) {
    ok(!!r && r.status === 0, `SB-STEP ${st}: the real page, this step alone twice, is identical`, r ? shown(r.out) : 'could not be run');
    if (r && r.status === 0) bases[st] = a;
  }

  // One fault per capture, caught by that capture, with no earlier step differing.
  const results = await pool(faults.map(x => async () => {
    if (!bases[x.st]) return [x, null, 'its step has no steady base run'];
    const s = await snap(plant(x.kind, x.at), x.st, L);
    return [x, s && await cmp(bases[x.st], s, true), s ? '' : 'the planted page could not be run'];
  }));
  for (const [x, r, why] of results) {
    const label = `SB ${x.c} (${x.kind}, planted under ${String(x.at)}, walking ${x.st})`;
    if (!r) { ok(false, label + ' — ' + why); continue; }
    const diff = differing(r.out), walked = pathOf(x.st);
    const earlier = diff.filter(d => { const m = whole.meta[d]; return m && m.step !== x.st && m.step !== 'end' && walked.has(m.step); });
    ok(r.status === 1 && diff.includes(x.c) && !earlier.length, label + ' — caught' + (earlier.length ? '; but an earlier step differs too: ' + earlier.join(', ') : ''), shown(r.out));
  }

  // The comparison's own rules: [what, the change, passes with --changes-allowed, the line that names it when it fails].
  const swap = (from, to) => t => { if (t.split(from).length !== 2) throw new Error(`"${from}" is not in the page once`); return t.replace(from, to); };
  const rename = (fn, from, to) => t => { const i = t.indexOf('function ' + fn + '('), j = t.indexOf('\n}\n', i);
    if (i < 0 || j < 0) throw new Error('no function ' + fn); return t.slice(0, i) + t.slice(i, j).replace(new RegExp('(?<![.\\w])' + from + '\\b', 'g'), to) + t.slice(j); };
  const RULES = [
    ['SB-CA1: a local variable renamed inside a function (mcpTrouble: e → err)', rename('mcpTrouble', 'e', 'err'), true],
    ['SB-CA2: a new function added', t => t + '\nfunction strayHelper(){ return 1; }\n', true],
    ['SB-CA3: a table\'s value changed (THEMES: jewellery\'s rule → "jewelry")', swap('chip:"fashion",rule:"jewellery"}', 'chip:"fashion",rule:"jewelry"}'), false, /^DIFF  value THEMES:/m],
    ['SB-CA4: a new table added', t => t + '\nconst strayTable=[1];\n', false, /^DIFF  value strayTable: only in the new version, and it is not a function/m],
  ];
  const base0 = bases.opening;
  const rr = await pool(RULES.map(([, change]) => async () => { const s = await snap(change(REAL), 'opening'); return s && base0 && [await cmp(base0, s, true), await cmp(base0, s, false)]; }));
  RULES.forEach(([name, , passes, line], k) => {
    const r = rr[k]; if (!r) { ok(false, name + ' — could not be run'); return; }
    const [withFlag, without] = r;
    if (passes) {
      ok(withFlag.status === 0, name + ' — passes with --changes-allowed', shown(withFlag.out));
      ok(without.status === 1 && /^DIFF  value /m.test(without.out), name + ' — fails without it, on the value', shown(without.out));
    } else ok(withFlag.status === 1 && line.test(withFlag.out), name + ' — fails with --changes-allowed, named', shown(withFlag.out));
  });

  // The check run whole, as a session runs it: the same page twice is identical; a fault in one late screen is caught there.
  const a = path.join(tmp, 'whole_a.jsx'), b = path.join(tmp, 'whole_b.jsx'), c = path.join(tmp, 'whole_c.jsx');
  fs.writeFileSync(a, REAL); fs.writeFileSync(b, REAL); fs.writeFileSync(c, plant('screen', /^applied$/));
  const [same2, caught] = await pool([() => node([SBS, a, b, '--changes-allowed']), () => node([SBS, a, c, '--changes-allowed'])]);
  ok(same2.status === 0 && /SIDE BY SIDE: identical\./.test(same2.out), 'SB-RUN1: the check, run whole on the same page twice, says identical', shown(same2.out));
  ok(caught.status === 1 && differing(caught.out).includes('applied'), 'SB-RUN2: the check, run whole, catches a fault planted in the applied screen', shown(caught.out));
  finish(captures.length);
})();
