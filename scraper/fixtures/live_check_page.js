/*
 * live_check_page.js — the live check page (build/live_check_page.jsx), built by
 * build/live_check.js's own prepare(), run in jsdom with no network.
 *
 * Stage 1 (docs/handover_search_stage1.md): the page grades by her pass test,
 * build/stage1_grade.js, against docs/stage1_answers.json, in rounds.
 * S1P-001..S1P-006: the pass test on made-up lookups — each condition, the trace's steps, a
 * dropped book Claude named, an excluded book kept, the watch list.
 * S1P-011: a book kept with no ISBN — fails only where its number was printed in what the
 * search saw (her fix 5, Metamorphoses).
 * S1P-007: her nine real lookups (docs/live_check_runs/lookups/), regraded: the baseline.
 * S1P-008..S1P-010: the page — rounds loop over every case, one run record per round naming
 * the loop, each case box showing its Stage 1 lines and the books kept.
 * LC-042: each case record names the lookup record the app wrote for it.
 * LC-011..LC-031: the page's writes, on a store played by a script that refuses calls with
 * a given code. By code: invalid_argument is tried once; unavailable and unlisted codes
 * wait 1–3 s and retry; resource_exhausted waits 20–40 s, retries, then spaces every page
 * write by 1 s. Every failure is recorded whole (case box, Problems section, run record);
 * the app's own refused writes are recorded, never retried; a refused part does not stop
 * the case's other writes; "saved" is said only when the store read back holds every case
 * and lookup record. Also: the source line prints the host, the header line names branch
 * and commit, never "version".
 *
 *   node scraper/fixtures/live_check_page.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const React = require('react');
const { act } = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { prepare } = require('../../build/live_check.js');

const ROOT = path.join(__dirname, '..', '..');
const RUN = path.join(ROOT, 'docs', 'live_check_runs', 'R1791639137375lahf');
const RUN2 = path.join(ROOT, 'docs', 'live_check_runs', 'R1791678301243iwuh');

let failures = 0;
function fail(m) { console.log('FAIL  ' + m); failures++; }
function pass(m) { console.log('PASS  ' + m); }
function eq(got, want, m) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass(m);
  else fail(m + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
}
function ok(cond, m, got) { if (cond) pass(m); else fail(m + (got !== undefined ? ' — got: ' + got : '')); }

const BUILD = { branch: 'main', commit: '12bfa1e', builtAt: '2026-10-10 00:00 UTC' };
let built;
try { built = prepare(BUILD); } catch (e) { console.log('FAIL  the live check page did not build — ' + e.message); process.exit(1); }

// A run that never finishes empties the event loop and Node exits 0: count that as a failure.
let reachedEnd = false;
process.on('exit', () => { if (!reachedEnd) { console.log('FAIL  the suite stopped before its end — a page run never finished'); process.exitCode = 1; } });

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
const win = dom.window;
for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
  'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'MouseEvent']) {
  try { global[k] = win[k]; } catch { /* read-only on this Node */ }
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// The page's own functions. `stub` replaces the lookup (the one thing that would reach the network).
const NAMES = 'LiveCheck, LC_CASES, LC_ANSWERS, s1Grade, tapeCall, pruneLookupLog';
const lift = (b = built, rounds = 1) => new Function('React', 'ReactDOM', 'window', 'document', 'localStorage', '__stub', '__sleep',
  b.js + '\n;lookupCatalogue = __stub;\nlcSleep = __sleep;\nlcDefaultRounds = ' + rounds + ';\nreturn { ' + NAMES + ' };')(React, { createRoot }, win, win.document, win.localStorage, (...a) => stubLookup(...a), ms => curSleep(ms));
let stubLookup = async () => ({ ok: false, row: null, detail: 'no stub' });
const api = lift();

// ── A row the lookup could have returned: this show's books from the answers ──
const ANSWERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'stage1_answers.json'), 'utf8')).cases;
function rowOf(n) {
  const a = ANSWERS[n], books = [...a.thisShow, ...(a.english && !a.thisShow.some(b => b.isbn === a.english.isbn) ? [a.english] : [])];
  const editions = books.map(b => ({ title: b.what, lang: null, binding: null, pages: null, publisher: null, isbn13: b.isbn,
    alsoIsbn13: (b.also || [])[0] || null, alsoOf: null, showing: 'this', proofUrl: null, city: null, year: null,
    shop: { state: 'web', url: null, museum: null }, card: {} }));
  return { hasCatalogue: 'yes', looked: true, editions, editionPick: 0, shopState: 'web', shopUrl: null,
    catalogueTitle: books[0].what, isbn13: books[0].isbn, publisher: null, englishCheck: null };
}

// ── The page, run with a store played by a script ───────────────────────────
// rules: [{ path: RegExp, op?, times, code, message }] make matching calls reject with
// {code, message}. hideInList: case numbers the store's list leaves out. `log` holds every
// call and every wait in order.
function makeStore({ rules = [], hideInList = [] } = {}) {
  const docs = new Map();
  const attempts = {}, doneWrites = [], log = [];
  const hits = rules.map(() => 0);
  const guard = (op, p) => {
    log.push({ op, path: p });
    attempts[p] = (attempts[p] || 0) + 1;
    rules.forEach((r, i) => {
      if (r.path.test(p) && (!r.op || r.op === op) && hits[i] < r.times) {
        hits[i]++;
        if (r.code === 'TypeError') throw new TypeError(r.message);
        throw { code: r.code, message: r.message };
      }
    });
  };
  const doc = p => ({
    id: p.split('/').pop(), path: p,
    set: async d => { guard('set', p); docs.set(p, { ...d }); },
    update: async d => { guard('update', p); if ('done' in d) doneWrites.push(d.done); docs.set(p, { ...(docs.get(p) || {}), ...d }); },
    delete: async () => { guard('delete', p); docs.delete(p); },
    get: async () => { guard('get', p); return { exists: docs.has(p), data: () => docs.get(p) }; },
    collection: n => col(p + '/' + n)
  });
  const col = p => {
    const q = { path: p, doc: id => doc(p + '/' + id),
      get: async () => {
        guard('list', p);
        const ids = [...docs.keys()].filter(k => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(k => k.slice(p.length + 1));
        return { docs: ids.filter(id => !(/\/cases$/.test(p) && hideInList.includes(Number(id)))).map(id => ({ id, data: () => docs.get(p + '/' + id) })) };
      } };
    q.orderBy = () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) });
    return q;
  };
  const db = { doc, collection: col };
  return { db, docs, doneWrites, log, attempts };
}
const text = () => win.document.getElementById('root').textContent || '';
const statusLines = () => [...win.document.querySelectorAll('.status')].map(e => e.textContent);
let curSleep = async () => {};
const LCASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'live_check_cases.json'), 'utf8')).cases;
const caseOf = row => LCASES.find(c => c.row.id === row.id).case;

// opts.built: another build of the page; opts.rowFor(n, row): the row a case's lookup returns.
async function runPage(store, opts = {}) {
  const sleeps = [];
  curSleep = async ms => { sleeps.push(ms); if (store) store.log.push({ sleep: ms }); };
  win.claude = { use: async name => name === 'db' ? (store ? store.db : null) : name === 'sample' ? async () => ({ modelTierApplied: 'default', modelApplied: null }) : null };
  // The lookup is the one thing stubbed: each case answers as her card says, with two Claude reads on the tape.
  const inst = lift(opts.built, opts.rounds || 1);
  const order = [];
  stubLookup = async row => {
    const n = caseOf(row);
    order.push(n);
    if (opts.tapeFor) opts.tapeFor(n, inst.tapeCall);
    else for (let k = 0; k < 2; k++) inst.tapeCall('claude', { prompt: 'case ' + n + ' read ' + k }, { ok: true, detail: '', data: {} }, Date.now());
    const got = { ...row, ...rowOf(n) };
    return { ok: true, row: opts.rowFor ? opts.rowFor(n, got) : got, detail: '' };
  };
  win.document.getElementById('root').innerHTML = '';
  const root = createRoot(win.document.getElementById('root'));
  const { LiveCheck } = inst;
  await act(async () => { root.render(React.createElement(LiveCheck)); });
  const before = text();
  const bodyBefore = [win.document.body.getAttribute('style'), win.document.documentElement.getAttribute('style'), win.document.documentElement.getAttribute('data-theme')];
  await act(async () => { win.document.querySelector('button.run').click(); });
  for (let i = 0; i < 12000 && !statusLines().some(s => /^Round \d+: Finished/.test(s)); i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 4)); });
  }
  const boxes = {};
  for (const e of win.document.querySelectorAll('.case:not(.problems)')) boxes[parseInt(e.querySelector('h2').textContent, 10)] = e.textContent;
  const probBox = win.document.querySelector('.case.problems');
  const headerLine = [...win.document.querySelectorAll('.soft')].map(e => e.textContent).find(t => t.startsWith('Code under test')) || '';
  const finals = statusLines().find(s => /^Round \d+: Finished/.test(s)) || null;
  const out = { before, boxes, headerLine, sleeps, order, finals, problemsText: probBox ? probBox.textContent : '', finalLine: finals ? finals.replace(/^Round 1: /, '') : null, text: text() };
  const headKeys = store ? [...store.docs.keys()].filter(k => /^checks\/[^/]+$/.test(k)) : [];
  const headKey = headKeys[0];
  out.heads = headKeys.map(k => store.docs.get(k));
  out.header = headKey ? store.docs.get(headKey) : null;
  out.bodyBefore = bodyBefore;
  out.bodyAfter = [win.document.body.getAttribute('style'), win.document.documentElement.getAttribute('style'), win.document.documentElement.getAttribute('data-theme')];
  out.hostsLeft = win.document.querySelectorAll('body > div[aria-hidden]').length;
  out.records = store ? Object.fromEntries(LCASES.map(c => [c.case, store.docs.get(headKey + '/cases/' + c.case)])) : null;
  await act(async () => root.unmount());
  return out;
}
const inRange = (v, a, b) => v >= a && v <= b;
const CLEAN = 'Finished. Every case and every lookup record is saved.';

(async () => {
  // LC-011..LC-016: the store refuses case 7's record with invalid_argument — one attempt, no wait.
  {
    const store = makeStore({ rules: [{ path: /^checks\/[^/]+\/cases\/7$/, op: 'set', times: Infinity, code: 'invalid_argument', message: 'document too deep' }] });
    const r = await runPage(store);
    const p7 = r.header.problems.filter(p => p.case === 7);
    eq([store.log.filter(l => /\/cases\/7$/.test(l.path || '')).length, r.sleeps], [1, []], 'LC-011: invalid_argument — exactly one attempt on case 7\'s record, no wait, no retry');
    eq([p7.length, p7[0] && [p7[0].what, p7[0].op, p7[0].code, p7[0].message, p7[0].attempt, p7[0].retried, p7[0].outcome], p7[0] && /cases\/7$/.test(p7[0].path)],
      [1, ['the case record', 'set', 'invalid_argument', 'document too deep', 1, false, 'not saved'], true], 'LC-012: the problem is recorded whole — what, path, op, code, message, attempt, retried, outcome — in the run record');
    ok(/Did not save: the case record/.test(r.boxes[7]) && /invalid_argument: document too deep/.test(r.boxes[7]) && !/Did not save/.test(r.boxes[6]), 'LC-013: case 7\'s box shows what did not save, with code and message; case 6\'s shows nothing', r.boxes[7].slice(0, 200));
    ok(/Round 1, case 7: the case record — invalid_argument: document too deep/.test(r.problemsText) && !/None\./.test(r.problemsText), 'LC-013: the Problems section lists it');
    ok(r.finalLine === 'Finished, but case 7\'s record is missing from the store.', 'LC-014: the last line names what is missing, never "saved"', r.finalLine);
    eq([r.header.done, r.header.savedCases, r.header.unsavedCases.map(u => u.case), /invalid_argument/.test(r.header.unsavedCases[0].error)],
      [8, [1, 2, 3, 4, 5, 6, 8, 9], [7], true], 'LC-015: the run header counts saved cases only, and lists case 7 with its code');
    eq(store.doneWrites, [1, 2, 3, 4, 5, 6, 6, 7, 8, 8], 'LC-015: `done` counts saved cases only at every update');
    ok([...store.docs.keys()].some(k => /cases\/7\/reads\/1$/.test(k)) && [...store.docs.keys()].some(k => /cases\/7\/reads\/2\/answer\/0$/.test(k)),
      'LC-016: a refused case record does not stop that case\'s other writes');
  }
  // LC-017..LC-019: unavailable once on a read's header — one wait of 1–3 s, then saved.
  {
    const store = makeStore({ rules: [{ path: /cases\/7\/reads\/1$/, op: 'set', times: 1, code: 'unavailable', message: 'try again' }] });
    const r = await runPage(store);
    ok(r.sleeps.length === 1 && inRange(r.sleeps[0], 1000, 3000), 'LC-017: unavailable — one wait in 1–3 s before the retry', JSON.stringify(r.sleeps));
    const p = r.header.problems;
    eq([p.length, p[0] && [p[0].what, p[0].code, p[0].attempt, p[0].retried, p[0].outcome], store.attempts[p[0] && p[0].path]],
      [1, ['the header of Claude’s read 1', 'unavailable', 1, true, 'saved on retry'], 2], 'LC-018: recorded as retried and "saved on retry"; that one write was tried twice');
    ok([...store.docs.keys()].some(k => /cases\/7\/reads\/1$/.test(k)) && r.finalLine === CLEAN && /saved on retry/.test(r.boxes[7]) && !/Did not save/.test(r.boxes[7]),
      'LC-032: the header landed, case 7\'s box shows the retry, and the last line is the clean one', r.finalLine);
  }
  // LC-020: a code outside the contract is treated as unavailable.
  {
    const store = makeStore({ rules: [{ path: /cases\/2$/, op: 'set', times: 1, code: 'queue_overflow', message: 'queued out' }] });
    const r = await runPage(store);
    ok(r.sleeps.length === 1 && inRange(r.sleeps[0], 1000, 3000) && r.header.problems[0].outcome === 'saved on retry', 'LC-020: a code the contract does not list waits 1–3 s and retries once', JSON.stringify(r.sleeps));
  }
  // LC-021..LC-022: resource_exhausted once — 20–40 s, retried, then every later page write 1 s apart.
  {
    const store = makeStore({ rules: [{ path: /cases\/3\/reads\/1$/, op: 'set', times: 1, code: 'resource_exhausted', message: 'too many calls' }] });
    const r = await runPage(store);
    ok(inRange(r.sleeps[0], 20000, 40000) && r.header.problems[0].code === 'resource_exhausted' && r.header.problems[0].outcome === 'saved on retry', 'LC-021: resource_exhausted — a wait of 20–40 s, one retry, saved', JSON.stringify(r.sleeps.slice(0, 3)));
    const i = store.log.findIndex(l => l.sleep >= 20000);
    const later = store.log.map((l, j) => ({ l, j })).filter(x => x.j > i + 1 && x.l.path && x.l.path.startsWith('checks/'));
    ok(later.length > 20 && later.every(x => store.log[x.j - 1].sleep === 1000), 'LC-022: every page write after it is preceded by a 1 s wait (' + later.length + ' writes)',
      JSON.stringify(later.filter(x => store.log[x.j - 1].sleep !== 1000).slice(0, 2)));
    ok(store.log.slice(0, i).every(l => l.sleep === undefined), 'LC-022: no wait before it');
  }
  // LC-023: the app's own write refused — recorded with path and code, never retried by the page.
  {
    const store = makeStore({ rules: [{ path: /^lookups\/[^/]+$/, op: 'set', times: 1, code: 'quota_exceeded', message: 'database full' }] });
    const r = await runPage(store);
    const app = r.header.problems.filter(p => p.what === 'the app\'s write');
    eq([app.length, app[0] && [app[0].op, app[0].code, app[0].message, app[0].retried, app[0].case], app[0] && /^lookups\//.test(app[0].path) && store.log.filter(l => l.op === 'set' && l.path === app[0].path).length],
      [1, ['set', 'quota_exceeded', 'database full', false, 1], 1], 'LC-023: the app\'s refused write is recorded with path and code, and tried once (no retry of the app\'s write)');
    ok(/the lookup record — quota_exceeded: the lookup record did not save \(database full\)/.test(r.boxes[1]) && r.sleeps.length === 0, 'LC-023: case 1 shows "the lookup record did not save"', r.boxes[1].slice(0, 300));
    ok(r.finalLine === 'Finished, but case 1\'s lookup record is missing from the store.', 'LC-023: the last line names the lookup record', r.finalLine);
  }
  // LC-024: the app answers false with no store error (its gzip throws) — said plainly.
  {
    const real = global.CompressionStream;
    global.CompressionStream = function () { throw new Error('gzip broke'); };
    let r;
    try { r = await runPage(makeStore()); } finally { global.CompressionStream = real; }
    ok(/the lookup record — none: no store error was raised; the app returned false/.test(r.boxes[1]) && /lookup record/.test(r.finalLine) && !/is saved/.test(r.finalLine),
      'LC-024: a false return with no store error says "no store error was raised; the app returned false"', r.boxes[1].slice(0, 300) + ' | ' + r.finalLine);
  }
  // LC-025: every write resolves but the list leaves out case 3.
  {
    const store = makeStore({ hideInList: [3] });
    const r = await runPage(store);
    ok(r.finalLine === 'Finished, but case 3\'s record is missing from the store.' && !/is saved/.test(r.finalLine) && /None\./.test(r.problemsText), 'LC-025: the read-back finds case 3 missing — the last line names it though no write failed', r.finalLine);
  }
  // LC-026: the read-back itself fails.
  {
    const store = makeStore({ rules: [{ path: /\/cases$/, op: 'list', times: Infinity, code: 'unavailable', message: 'list down' }] });
    const r = await runPage(store);
    ok(/couldn’t read the store back/.test(r.finalLine) && /unavailable: list down/.test(r.finalLine) && !/is saved/.test(r.finalLine), 'LC-026: a failed read-back is said, with its code', r.finalLine);
  }
  // LC-027: the run record's updates refused — not "saved".
  {
    const store = makeStore({ rules: [{ path: /^checks\/[^/]+$/, op: 'update', times: Infinity, code: 'invalid_argument', message: 'no' }] });
    const r = await runPage(store);
    ok(!/is saved\./.test(r.finalLine) && /did not save/.test(r.finalLine), 'LC-027: a run record that cannot be updated is reported, not swallowed', r.finalLine);
  }
  // LC-028: no store at all.
  {
    const r = await runPage(null);
    ok(r.finalLine && /nothing was saved/.test(r.finalLine), 'LC-028: no store — the last line says nothing was saved', r.finalLine);
  }
  // LC-029..LC-031: a clean run.
  {
    const store = makeStore();
    const r = await runPage(store);
    eq([r.finalLine, /None\./.test(r.problemsText), r.header.problems, r.header.done, r.header.finished, r.sleeps], [CLEAN, true, [], 9, true, []], 'LC-029: a clean run — the read-back finds everything, "None.", an empty problems array, no waits');
    ok(!/\[object Object\]/.test(r.text), 'LC-030: nothing on the page reads [object Object]');
    ok(r.before.includes('Code under test: main · commit 12bfa1e · built 2026-10-10 00:00 UTC') && !/version/i.test(r.headerLine),
      'LC-031: the page header names branch and commit, never "version"', r.before.slice(0, 160));
    eq([r.header.branch, r.header.commit, 'version' in r.header, typeof r.header.appVersionInCode], ['main', '12bfa1e', false, 'string'],
      'LC-031: the saved run header carries branch, commit and appVersionInCode, no "version"');
  }

  // LC-042: each case record names the lookup record the app wrote for that case (Hole B).
  {
    const store = makeStore();
    const r = await runPage(store);
    const runKey = [...store.docs.keys()].find(k => /^checks\/[^/]+$/.test(k));
    const written = [...store.docs.entries()].filter(([k]) => /^lookups\/[^/]+$/.test(k)).map(([k, d]) => ({ id: k.split('/')[1], title: d.title }));
    const want = LCASES.map(c => ({ case: c.case, lookupId: (written.find(w => w.title === c.row.title) || {}).id }));
    const recs = LCASES.map(c => store.docs.get(runKey + '/cases/' + c.case));
    eq([written.length, want.every(w => w.lookupId)], [9, true], 'LC-042: the app wrote one lookup record per case');
    eq(recs.map(x => [x.lookupId, x.lookupPath]), want.map(w => [w.lookupId, 'lookups/' + w.lookupId]), 'LC-042: every case record carries the id and path of the lookup document actually written for that case');
    eq(r.header.lookups.map(l => [l.case, l.lookupId, l.lookupPath]), want.map(w => [w.case, w.lookupId, 'lookups/' + w.lookupId]), 'LC-042: the run record lists the lookup ids by case');
    ok(want.every(w => r.boxes[w.case].includes('Lookup record: ' + w.lookupId)), 'LC-042: each case box shows its lookup record id', r.boxes[1].slice(0, 200));
  }

  // LC-033: the check page never prunes the lookup log (the app keeps 50 records).
  {
    const touched = [];
    const spy = new Proxy({}, { get: (t, k) => { touched.push(String(k)); return () => spy; } });
    await api.pruneLookupLog(spy);
    eq(touched, [], 'LC-033: the check page keeps every lookup record — the app\'s pruning of the lookup log never runs');
  }

  // ── S1P-001..S1P-006: her pass test, on made-up lookups ─────────────────────
  {
    const A = ANSWERS[1];
    const res = (url, text) => ({ url, title: 't', excerpts: [text] });
    const search = (...results) => ({ kind: 'search', input: {}, output: { ok: true, results } });
    const read = (prompt, data) => ({ kind: 'claude', input: { prompt }, output: { ok: true, data } });
    const ed = (isbn, showing = 'this') => ({ isbn13: isbn, showing });
    const rowWith = (...eds) => ({ isbn13: eds[0] ? eds[0].isbn13 : null, editions: eds });
    const lines = g => g.lines.map(l => (l.ok ? '✓ ' : '✗ ') + l.text);
    // The English edition found first; Stockholm never in the results: a pass.
    let g = api.s1Grade(A, [search(res('u1', 'ISBN 978-2-35906-373-8'))], rowWith(ed('9782359063738')), true);
    eq([g.pass, lines(g)[2]], [true, '✓ 978-9171009166 (Stockholm showing\'s English hardcover, Nationalmuseum) not in these results — nothing to keep.'],
      'S1P-001: Vasari, the English edition found first and nothing about Stockholm in the results — passes');
    // Stockholm in a result, shown to Claude, not reported: a fail at that step.
    const calls = [search(res('https://bok.test', 'Nationalmuseum. Isbn 9789171009166')), read('… 9789171009166 …', { isbn13: '9782359063738' })];
    g = api.s1Grade(A, calls, rowWith(ed('9782359063738')), true);
    eq([g.pass, g.books.find(b => b.isbn === '9789171009166').step], [false, 'shown to Claude, not reported'], 'S1P-002: Stockholm seen and shown to Claude but not reported — fails, at that step');
    g = api.s1Grade(A, [search(res('https://bok.test', 'Isbn 9789171009166')), read('x', {})], rowWith(ed('9782359063738')), true);
    eq(g.books.find(b => b.isbn === '9789171009166').step, 'seen, not shown to Claude', 'S1P-003: seen in a result Claude was never given — that step');
    // The French book only: the English edition missing fails.
    g = api.s1Grade(A, [], rowWith(ed('9782359063721')), true);
    eq([g.pass, lines(g)[1]], [false, '✗ English edition 978-2359063738 missing — never seen.'], 'S1P-004: the French book alone — this show\'s English edition exists, so it fails');
    // An excluded book kept fails; another book Claude named and the app dropped fails.
    g = api.s1Grade(ANSWERS[2], [], rowWith(ed('9782757210642'), ed('9782757210659')), true);
    eq([g.pass, lines(g).pop()], [false, '✗ 978-2757210659 (the album of the exhibition) is an excluded type but was kept.'], 'S1P-005: Hubert Robert — the album kept fails');
    g = api.s1Grade(ANSWERS[9], [read('Another book ISBN 9781588398130', { otherBooks: [{ isbn13: '9781588398130' }] })], rowWith(ed('9781857097382')), true);
    eq([g.pass, g.dropped], [false, ['9781588398130']], 'S1P-006: a book Claude named, printed in what it was given, and not kept — fails as dropped');
    g = api.s1Grade({ ...A, keptIfSeen: A.keptIfSeen.filter(b => b.isbn !== '9782350317441'), watch: [{ isbn: '9782350317441', what: 'a watched number' }] }, [search(res('https://x.test', 'ISBN 9782350317441'))], rowWith(ed('9782359063738')), true);
    ok(g.pass && g.lines.some(l => l.watch && /2350317441/.test(l.text)), 'S1P-006a: the watched number 978-2350317441 is reported when it appears, without failing', JSON.stringify(g.lines));
    // A book kept with no ISBN (her fix 5): matched by its answer's title; it fails only
    // where its number was printed in something the search saw (Metamorphoses, the Dutch).
    const M = ANSWERS[8], EN8 = ed('9789493416543'), it = ed('9789493416857');
    const nl = { title: 'Metamorfosen – Ovidius en de kunsten', isbn13: null, showing: 'this' };
    const pdf = search(res('https://hannibal.test/list.pdf', 'Dutch edition ISBN 978 94 9341 655 0. Italian edition ISBN 978 94 9341 685 7.'));
    g = api.s1Grade(M, [pdf], rowWith(EN8, it, nl), true);
    eq([g.pass, g.books.find(b => b.isbn === '9789493416550').step], [false, 'kept without its ISBN, though the search saw it printed'],
      'S1P-011: Metamorphoses — the Dutch book kept by title, its ISBN printed in what the search saw: fails (information thrown away)');
    g = api.s1Grade(M, [search(res('https://hannibal.test/list.pdf', 'Italian edition ISBN 978 94 9341 685 7.'))], rowWith(EN8, it, nl), true);
    eq([g.pass, lines(g)[2]], [true, '✓ 978-9493416550 (Dutch, Hannibal) kept by title, “Metamorfosen – Ovidius en de kunsten”; no text printed its ISBN.'],
      'S1P-011a:  and kept by title where no text printed its number: passes');
    g = api.s1Grade(ANSWERS[9], [search(res('https://shop.test/x', 'Test Lone Volume, Testhouse. ISBN 9781588398130.'))], rowWith(ed('9781857097382'), { title: 'Test Lone Volume', isbn13: null }), true);
    eq([g.pass, lines(g).find(l => /without an ISBN/.test(l))], [false, '✗ “Test Lone Volume” kept without an ISBN, though https://shop.test/x prints 978-1588398130 with its title — probably its own (check).'],
      'S1P-011b:  any other book kept without an ISBN, a lone number printed with its whole title: fails, naming where');
    // Canaletto R3: a bookseller's page prints the kept book's number and a "You may also
    // like" link's; with the kept one left out, the link's number looked like a lone one.
    g = api.s1Grade(ANSWERS[9], [search(res('https://shop.test/y', 'Test Lone Volume, Testhouse. ISBN 9781857097382. You may also like: ISBN 9781588398130.'))],
      rowWith(ed('9781857097382'), { title: 'Test Lone Volume', isbn13: null }), true);
    eq(lines(g).find(l => /without an ISBN/.test(l)), '✓ “Test Lone Volume” kept without an ISBN; no text the search saw printed one for it.',
      'S1P-011c:  a page printing two valid numbers is no evidence for either, even when one is kept (Canaletto R3)');
    // Stage 1b (her decision): every kept book is one the answers name, with the right language and show.
    const C6 = ANSWERS[6], ed6 = (isbn, title, lang, showing) => ({ isbn13: isbn, title, lang, showing });
    g = api.s1Grade(C6, [], rowWith(ed6('9789061538226', 'Canaletto - Guardi, les deux maîtres de Venise', 'French', 'this'),
      ed6('9789899119208', 'Splendour in Venice: From Canaletto to Guardi', 'English', 'other')), true);
    ok(!g.pass && g.lines.some(l => /9789899119208|978-9899119208/.test(l.text) && /not in the answers/.test(l.text)),
      'S1B-P01: Canaletto — another show’s book kept (Lisbon’s Splendour in Venice) fails, named', JSON.stringify(g.lines));
    g = api.s1Grade(C6, [], rowWith(ed6('9789061538226', 'Canaletto - Guardi, les deux maîtres de Venise', 'English', 'this')), true);
    ok(!g.pass && g.lines.some(l => /recorded as English; it is French/.test(l.text)), 'S1B-P02: a French book recorded as English fails');
    g = api.s1Grade(ANSWERS[1], [], rowWith(ed6('9782359063721', 'Le Livre des dessins', 'French', 'this'), ed6('9782359063738', 'The Book of Drawings', 'English', 'this'),
      ed6('9789171009166', 'The Book of Drawings', 'English', 'this')), true);
    ok(!g.pass && g.lines.some(l => /recorded as this show’s; it is another showing’s/.test(l.text)), 'S1B-P03: Stockholm’s book recorded as this show’s fails');
    g = api.s1Grade(C6, [], rowWith(ed6('9789061538226', 'Canaletto - Guardi, les deux maîtres de Venise', 'French', 'this'),
      ed6(null, 'Canaletto - Guardi, les deux maîtres de Venise', 'English', 'this')), true);
    ok(!g.pass && g.lines.some(l => /kept twice/.test(l.text)), 'S1B-P04: the same book kept a second time without its ISBN fails');
    g = api.s1Grade(C6, [], rowWith(ed6('9789061538226', 'Canaletto - Guardi, les deux maîtres de Venise', 'French', 'this')), true);
    ok(g.pass, 'S1B-P05: the right book, language and show passes', JSON.stringify(g.lines));
  }

  // ── S1P-007: her nine real lookups, regraded — the baseline (old code, three runs) ──
  {
    const { gradeRecord } = require('../../build/stage1_check.js');
    const dir = path.join(ROOT, 'docs', 'live_check_runs', 'lookups');
    const ids = ['L179163914853866pa', 'L1791678302989865o', 'L1791764766384jrgf', 'L17916392049779uln', 'L1791678335150h79d', 'L1791764793752n449',
      'L1791639269084mdwl', 'L1791678397103dbql', 'L1791764846956ug8h'];
    const got = ids.map(id => { const g = gradeRecord(dir, id); return [g.case, g.pass]; });
    eq(got, [[1, false], [1, false], [1, false], [2, true], [2, true], [2, true], [4, false], [4, false], [4, true]],
      'S1P-007: the baseline — Vasari fails all three runs (Stockholm dropped), Hubert Robert passes all three, Hammershøi passes one of three');
    const v3 = gradeRecord(dir, 'L1791764766384jrgf');
    eq(v3.books.find(b => b.isbn === '9789171009166').step, 'reported by Claude, dropped by the app', 'S1P-007a: Vasari run 3 — Stockholm reported by Claude and dropped by the app, as the records showed');
  }

  // ── S1P-008..S1P-010: the page, two rounds ────────────────────────────────────
  {
    const store = makeStore();
    const r = await runPage(store, { rounds: 2 });
    eq(r.order, [...LCASES.map(c => c.case), ...LCASES.map(c => c.case)], 'S1P-008: two rounds — every case once, then every case again (a loop, never one case twice in a row)');
    eq([r.heads.length, new Set(r.heads.map(h => h.loop)).size, r.heads.map(h => h.round).sort(), r.heads.every(h => h.finished && h.done === 9 && h.stage === 1)],
      [2, 1, [1, 2], true], 'S1P-009: one run record per round, both naming the same loop, each finished with all nine cases saved');
    ok(r.finals && /^Round 1: Finished\. Every case and every lookup record is saved\. Round 2: Finished\. Every case and every lookup record is saved\.$/.test(r.finals), 'S1P-009a: the last line says each round saved', r.finals);
    const box = [...win.document.querySelectorAll('.case')].length;
    ok(/Stage 1b: pass\./.test(r.text) && /This show's catalogue found: 978-2359063721/.test(r.text) && /Every book the lookup kept/.test(r.text) && /Round 2/.test(r.text),
      'S1P-010: each case box shows its Stage 1 verdict, its lines and the books kept; the grid shows both rounds', r.text.slice(0, 500));
  }

  reachedEnd = true;
  console.log(failures ? failures + ' failed' : 'the live check page holds');
  process.exit(failures ? 1 : 0);
})();
