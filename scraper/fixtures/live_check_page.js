/*
 * live_check_page.js — the live check page (build/live_check_page.jsx), built by
 * build/live_check.js's own prepare(), run in jsdom with no network.
 *
 * LC-001..LC-009: grading on her nine cards (docs/lookup_proof_cards.json) — a row equal
 * to the card passes every check; single faults fail the one check they break (Botticelli
 * and Hammershøi publishers, an extra version, a left-off book, the wrong pick, a version
 * not listed).
 * LC-010: the first live run's eight saved records (docs/live_check_runs/), regraded.
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
const CARDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'lookup_proof_cards.json'), 'utf8')).cards;

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
  'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle']) {
  try { global[k] = win[k]; } catch { /* read-only on this Node */ }
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// The page's own functions. `stub` replaces the lookup (the one thing that would reach the network).
const NAMES = 'LiveCheck, lcGrade, lcDrawn, LC_CARDS, LC_CASES, versionBlocks, tapeCall, pruneLookupLog';
const lift = () => new Function('React', 'window', 'document', 'localStorage', '__stub', '__sleep',
  built.js + '\n;lookupCatalogue = __stub;\nlcSleep = __sleep;\nreturn { ' + NAMES + ' };')(React, win, win.document, win.localStorage, (...a) => stubLookup(...a), ms => curSleep(ms));
let stubLookup = async () => ({ ok: false, row: null, detail: 'no stub' });
const api = lift();

// ── Her card as a row the lookup could have returned ─────────────────────────
function rowOf(card) {
  const editions = card.versions.map(v => ({
    title: v.title, lang: v.lang, binding: v.binding, pages: v.pages, publisher: v.publisher,
    isbn13: v.isbn13, alsoIsbn13: v.alsoIsbn13, alsoOf: null, showing: v.showing,
    proofUrl: 'https://www.louvre.fr/en/proof-' + v.isbn13, city: null, year: null,
    shop: { state: 'web', url: null, museum: null }, card: {}, note: null }));
  const i = card.pick ? card.versions.findIndex(v => v.isbn13 === card.pick) : -1;
  return { hasCatalogue: 'yes', editions, editionPick: i < 0 ? null : i, shopState: 'web', shopUrl: null };
}
const cardOf = n => CARDS.find(c => c.case === n);
const failing = g => g.filter(x => x.verdict === 'fail').map(x => x.field);
const grade = (n, row) => api.lcGrade(cardOf(n), row);

// ── LC-019: the answer file holds her decisions ──────────────────────────────
{
  const vasari = cardOf(1).versions.find(v => v.isbn13 === '9782359063721');
  eq(vasari.alsoIsbn13, null, 'LC-019: Vasari — the French block carries no second number (978-2350317441 dropped, her decision)');
  eq([cardOf(5).title, cardOf(5).match], ['A new look at Watteau', ['watteau']], 'LC-019: case 5 is her "A new look at Watteau"');
  eq(cardOf(4).versions.find(v => v.lang === 'English').publisher, 'Rizzoli Electa', 'LC-019: Hammershøi — the English publisher is Rizzoli Electa');
}

// ── LC-001: her nine cards, matched exactly ──────────────────────────────────
for (const c of CARDS) {
  const g = grade(c.case, rowOf(c));
  ok(g.length > 0 && g.every(x => x.verdict === 'pass'), 'LC-001: case ' + c.case + ' (' + c.title + ') — a row equal to her card passes every check', JSON.stringify(failing(g)));
}

// ── LC-002..LC-009: single faults ────────────────────────────────────────────
{
  const bot = rowOf(cardOf(7));
  bot.editions[0].publisher = 'Fonds Mercator';
  eq(failing(grade(7, bot)), ['French 978-9462302815 — publisher'], 'LC-002: Botticelli — "Fonds Mercator" alone fails the publisher check');
  bot.editions[0].publisher = 'Culturespaces / Fonds Mercator';
  eq(failing(grade(7, bot)), [], 'LC-003: Botticelli — "Culturespaces / Fonds Mercator" passes');

  const ham = rowOf(cardOf(4));
  ham.editions[1].publisher = null;
  eq(failing(grade(4, ham)), ['English 978-0847899289 — publisher'], 'LC-004: Hammershøi — no English publisher fails (graded, not set aside)');
  ham.editions[1].publisher = 'Rizzoli Electa';
  eq(failing(grade(4, ham)), [], 'LC-005: Hammershøi — "Rizzoli Electa" passes');

  const can = rowOf(cardOf(6));
  can.editions.push({ ...can.editions[0], isbn13: '9780000000002', lang: 'English' });
  eq(failing(grade(6, can)), ['No other versions listed'], 'LC-006: Canaletto – Guardi — an extra version fails "No other versions listed"');

  const hr = rowOf(cardOf(2));
  hr.editions.push({ ...hr.editions[0], isbn13: '9782757210659', alsoIsbn13: null });
  eq(failing(grade(2, hr)), ['No other versions listed', 'Left off: 978-2757210659'], 'LC-007: Hubert Robert — the left-off 48-page album listed fails "Left off"');

  const ham2 = rowOf(cardOf(4));
  ham2.editionPick = 0;
  eq(failing(grade(4, ham2)), ['Starting pick'], 'LC-008: Hammershøi — the French original picked fails "Starting pick"');

  const met = rowOf(cardOf(8));
  met.editions.pop(); met.editionPick = 0;
  eq(failing(grade(8, met)), ['Italian 978-9493416857 — listed as a version'], 'LC-009: Metamorphoses — the Italian version not listed fails that check');
}

// ── LC-010: the first live run, regraded ─────────────────────────────────────
{
  // Stored verdicts were set against the cards of the day: only these differ now.
  const CHANGED = { 'English 978-0847899289 — publisher': ['disputed', 'fail'] };   // Hammershøi: Rizzoli Electa graded
  let regraded = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 8, 9]) {
    const rec = JSON.parse(fs.readFileSync(path.join(RUN, n + '.json'), 'utf8'));
    const now = grade(n, rec.row);
    const was = Object.fromEntries(rec.grades.map(g => [g.field, g.verdict]));
    const diffs = now.filter(g => was[g.field] !== g.verdict).map(g => g.field + ': ' + was[g.field] + ' → ' + g.verdict);
    const sameFields = JSON.stringify(now.map(g => g.field)) === JSON.stringify(rec.grades.map(g => g.field));
    regraded += now.length;
    const allowed = diffs.every(d => Object.entries(CHANGED).some(([f, [a, b]]) => d === f + ': ' + a + ' → ' + b));
    ok(sameFields && allowed, 'LC-010: case ' + n + ' regraded — verdicts as stored' + (diffs.length ? ' except ' + diffs.join('; ') : ''), JSON.stringify({ sameFields, diffs }));
    const bad = failing(now).length;
    ok(n === 6 || n === 9 ? bad === 0 : bad > 0, 'LC-010: case ' + n + (n === 6 || n === 9 ? ' still passes every check' : ' still fails'), String(bad));
    if (n === 4) eq(now.find(g => g.field === 'English 978-0847899289 — publisher').verdict, 'fail', 'LC-010: Hammershøi — the English publisher is graded "fail", no longer "disputed"');
  }
  ok(regraded > 50, 'LC-010: the regrade read the saved rows (' + regraded + ' checks)');
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

async function runPage(store) {
  const sleeps = [];
  curSleep = async ms => { sleeps.push(ms); if (store) store.log.push({ sleep: ms }); };
  win.claude = { use: async name => name === 'db' ? (store ? store.db : null) : name === 'sample' ? async () => ({ modelTierApplied: 'default', modelApplied: null }) : null };
  // The lookup is the one thing stubbed: each case answers as her card says, with two Claude reads on the tape.
  const inst = lift();
  stubLookup = async row => {
    const n = caseOf(row);
    for (let k = 0; k < 2; k++) inst.tapeCall('claude', { prompt: 'case ' + n + ' read ' + k }, { ok: true, detail: '', data: {} }, Date.now());
    return { ok: true, row: { ...row, ...rowOf(cardOf(n)) }, detail: '' };
  };
  win.document.getElementById('root').innerHTML = '';
  const root = createRoot(win.document.getElementById('root'));
  const { LiveCheck } = inst;
  await act(async () => { root.render(React.createElement(LiveCheck)); });
  const before = text();
  await act(async () => { win.document.querySelector('button.run').click(); });
  for (let i = 0; i < 600 && !statusLines().some(s => s.startsWith('Finished')); i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 25)); });
  }
  const boxes = {};
  for (const e of win.document.querySelectorAll('.case:not(.problems)')) boxes[parseInt(e.querySelector('h2').textContent, 10)] = e.textContent;
  const probBox = win.document.querySelector('.case.problems');
  const headerLine = [...win.document.querySelectorAll('.soft')].map(e => e.textContent).find(t => t.startsWith('Code under test')) || '';
  const out = { before, boxes, headerLine, sleeps, problemsText: probBox ? probBox.textContent : '', finalLine: statusLines().find(s => s.startsWith('Finished')) || null, text: text() };
  const headKey = store && [...store.docs.keys()].find(k => /^checks\/[^/]+$/.test(k));
  out.header = headKey ? store.docs.get(headKey) : null;
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
    ok(/Case 7: the case record — invalid_argument: document too deep/.test(r.problemsText) && !/None\./.test(r.problemsText), 'LC-013: the Problems section lists it');
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
    ok(!/\[object Object\]/.test(r.text) && /Source: louvre\.fr/.test(r.text), 'LC-030: the drawn source reads "Source: louvre.fr", never [object Object]');
    ok(r.before.includes('Code under test: main · commit 12bfa1e · built 2026-10-10 00:00 UTC') && !/version/i.test(r.headerLine),
      'LC-031: the page header names branch and commit, never "version"', r.before.slice(0, 160));
    eq([r.header.branch, r.header.commit, 'version' in r.header, typeof r.header.appVersionInCode], ['main', '12bfa1e', false, 'string'],
      'LC-031: the saved run header carries branch, commit and appVersionInCode, no "version"');
  }

  // LC-033: the check page never prunes the lookup log (the app keeps 50 records).
  {
    const touched = [];
    const spy = new Proxy({}, { get: (t, k) => { touched.push(String(k)); return () => spy; } });
    await api.pruneLookupLog(spy);
    eq(touched, [], 'LC-033: the check page keeps every lookup record — the app\'s pruning of the lookup log never runs');
  }

  reachedEnd = true;
  console.log(failures ? failures + ' failed' : 'the live check page holds');
  process.exit(failures ? 1 : 0);
})();
