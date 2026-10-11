/*
 * live_check_page.js — the live check page (build/live_check_page.jsx), built by
 * build/live_check.js's own prepare(), run in jsdom with no network.
 *
 * LC-001..LC-009: grading on her nine cards (docs/lookup_proof_cards.json) — a row equal
 * to the card passes every check; single faults fail the one check they break (Botticelli
 * and Hammershøi publishers, an extra version, a left-off book, the wrong pick, a version
 * not listed).
 * LC-010: the first live run's eight saved records (docs/live_check_runs/), regraded.
 * LC-034..LC-040: a publisher is its set of houses (the wrong museum, a missing or an extra house fail).
 * LC-041: the second live run's nine saved records, regraded: no verdict changes.
 * LC-042: each case record names the lookup record the app wrote for it.
 * LC-043..LC-048: the REAL App is mounted for each case, the row loaded through Load, its Catalogue
 * section read as rendered: what the app does with the store while mounted, every stated fact graded
 * on its block, a one-book card, lines no fact accounts for ("not checked"), one count per fact.
 * LC-046: a one-book card has no facts line: language, binding and pages are "not applicable" (not counted).
 * LC-049..LC-050: the same with Cat_Watch.jsx altered in the test only (a line added, the facts line
 * removed): what is checked follows the card.
 * LC-051: a one-book card altered to print a facts line is graded on it, with no change to the page.
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
  'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'MouseEvent']) {
  try { global[k] = win[k]; } catch { /* read-only on this Node */ }
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// The page's own functions. `stub` replaces the lookup (the one thing that would reach the network).
const NAMES = 'LiveCheck, lcGrade, lcGradeCard, lcCount, lcSamePublisher, LC_CARDS, LC_CASES, versionBlocks, tapeCall, pruneLookupLog';
const lift = (b = built) => new Function('React', 'ReactDOM', 'window', 'document', 'localStorage', '__stub', '__sleep',
  b.js + '\n;lookupCatalogue = __stub;\nlcSleep = __sleep;\nreturn { ' + NAMES + ' };')(React, { createRoot }, win, win.document, win.localStorage, (...a) => stubLookup(...a), ms => curSleep(ms));
let stubLookup = async () => ({ ok: false, row: null, detail: 'no stub' });
const api = lift();

// ── Her card as a row the lookup could have returned ─────────────────────────
// A real lookup also stores what a card does not state: the city of another showing, a later
// edition's year, the one book's own fields, and how far an English edition was looked for.
const STUB_FACTS = { 1: { '9789171009166': { city: 'Stockholm' } }, 2: { '9781848221918': { city: 'Washington' } },
  3: { '9782757210642': { city: 'Paris' } }, 4: { '9780847899289': { year: 2023 } } };
const STUB_ENGLISH_CHECK = { 5: 'publisher', 6: 'publisher', 7: 'publisher' };
function rowOf(card) {
  const editions = card.versions.map(v => ({
    title: v.title, lang: v.lang, binding: v.binding, pages: v.pages, publisher: v.publisher,
    isbn13: v.isbn13, alsoIsbn13: v.alsoIsbn13, alsoOf: null, showing: v.showing,
    proofUrl: 'https://www.louvre.fr/en/proof-' + v.isbn13, city: null, year: null,
    shop: { state: 'web', url: null, museum: null }, card: {}, note: null, ...((STUB_FACTS[card.case] || {})[v.isbn13] || {}) }));
  const i = card.pick ? card.versions.findIndex(v => v.isbn13 === card.pick) : -1;
  const book = card.versions[i < 0 ? 0 : i];
  return { hasCatalogue: 'yes', looked: true, editions, editionPick: i < 0 ? null : i, shopState: 'web', shopUrl: null,
    catalogueTitle: book.title, isbn13: book.isbn13, publisher: book.publisher, englishCheck: STUB_ENGLISH_CHECK[card.case] || null };
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

// ── LC-041: the second live run's nine records, regraded ─────────────────────
{
  // Graded by the page of the day with the old publisher rule; the set-equality rule changes none of them.
  let regraded = 0, same = 0;
  for (let n = 1; n <= 9; n++) {
    const rec = JSON.parse(fs.readFileSync(path.join(RUN2, n + '.json'), 'utf8'));
    const now = grade(n, rec.row);
    const was = Object.fromEntries(rec.grades.map(g => [g.field, g.verdict]));
    const diffs = now.filter(g => was[g.field] !== g.verdict).map(g => g.field + ': ' + was[g.field] + ' → ' + g.verdict);
    const sameFields = JSON.stringify(now.map(g => g.field)) === JSON.stringify(rec.grades.map(g => g.field));
    regraded += now.length; if (!diffs.length) same++;
    ok(sameFields && !diffs.length, 'LC-041: run 2, case ' + n + ' regraded with the set-equality publisher rule — every verdict as stored', JSON.stringify({ sameFields, diffs }));
  }
  ok(regraded > 60 && same === 9, 'LC-041: the regrade read nine saved records (' + regraded + ' checks)');
}

// ── LC-034..LC-040: a publisher is its set of houses (Hole A) ────────────────
{
  const same = (got, want) => api.lcSamePublisher(got, want);
  eq(same('The National Gallery / Lund Humphries', 'National Gallery of Art / Lund Humphries'), false, 'LC-034: "The National Gallery" is not "National Gallery of Art" — the wrong museum fails');
  eq(same('Musée du Louvre Editions / Lienart', 'Louvre Éditions / Lienart'), true, 'LC-035: "Musée du Louvre Editions" and "Louvre Éditions" are one house (listed in aka)');
  eq(same('Lienart', 'Louvre Éditions / Lienart'), false, 'LC-036: "Lienart" alone fails "Louvre Éditions / Lienart" — a house is missing');
  eq(same('Hannibal Books', 'Hannibal'), true, 'LC-037: a trailing "Books" is dropped');
  eq(same('Somogy éditions d\'art', 'Somogy'), true, 'LC-038: a trailing "éditions d\'art" is dropped');
  eq(same('National Gallery Global Ltd', 'National Gallery'), true, 'LC-039: "National Gallery Global Ltd" is "National Gallery" (Ltd dropped, Global listed in aka)');
  eq(same('Fonds Mercator / Lund Humphries', 'Fonds Mercator'), false, 'LC-040: an extra house fails — the sets must be the same');
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
  const inst = lift(opts.built);
  stubLookup = async row => {
    const n = caseOf(row);
    for (let k = 0; k < 2; k++) inst.tapeCall('claude', { prompt: 'case ' + n + ' read ' + k }, { ok: true, detail: '', data: {} }, Date.now());
    const got = { ...row, ...rowOf(cardOf(n)) };
    return { ok: true, row: opts.rowFor ? opts.rowFor(n, got) : got, detail: '' };
  };
  win.document.getElementById('root').innerHTML = '';
  const root = createRoot(win.document.getElementById('root'));
  const { LiveCheck } = inst;
  await act(async () => { root.render(React.createElement(LiveCheck)); });
  const before = text();
  const bodyBefore = [win.document.body.getAttribute('style'), win.document.documentElement.getAttribute('style'), win.document.documentElement.getAttribute('data-theme')];
  await act(async () => { win.document.querySelector('button.run').click(); });
  for (let i = 0; i < 12000 && !statusLines().some(s => s.startsWith('Finished')); i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 4)); });
  }
  const boxes = {};
  for (const e of win.document.querySelectorAll('.case:not(.problems)')) boxes[parseInt(e.querySelector('h2').textContent, 10)] = e.textContent;
  const probBox = win.document.querySelector('.case.problems');
  const headerLine = [...win.document.querySelectorAll('.soft')].map(e => e.textContent).find(t => t.startsWith('Code under test')) || '';
  const out = { before, boxes, headerLine, sleeps, problemsText: probBox ? probBox.textContent : '', finalLine: statusLines().find(s => s.startsWith('Finished')) || null, text: text() };
  const headKey = store && [...store.docs.keys()].find(k => /^checks\/[^/]+$/.test(k));
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

  // LC-043..LC-048: the card the app really draws (the REAL App, mounted in a hidden box,
  // the case's row loaded through its Load button, its Catalogue section read as rendered).
  const MULTI = [1, 2, 3, 4, 8], SINGLE = [5, 6, 7, 9];
  const gradesOf = rec => rec.cardGrades;
  const failsOf = rec => gradesOf(rec).filter(g => g.verdict === 'fail').map(g => g.field);
  {
    const store = makeStore();
    const r = await runPage(store);
    const R = r.records;
    eq(Object.fromEntries(LCASES.map(c => [c.case, [R[c.case].card.ok, R[c.case].card.kind]])),
      Object.fromEntries(LCASES.map(c => [c.case, [true, MULTI.includes(c.case) ? 'blocks' : 'single']])),
      'LC-043: the real App drew every card — versions as blocks (1, 2, 3, 4, 8), one book as one section (5, 6, 7, 9)');
    eq(LCASES.map(c => R[c.case].card.blocks.length), [3, 2, 2, 2, 1, 1, 1, 3, 1], 'LC-043: and the blocks read are the ones on the card (3, 2, 2, 2, 1, 1, 1, 3, 1)');

    // What the app does with the store while it is mounted and loading a ledger.
    const appReads = ['sweeps/venues', 'quarantine/rows', 'venues/occasional', 'links/pending'];
    eq(LCASES.map(c => R[c.case].card.appStore), LCASES.map(() => ({ reads: appReads, writes: [] })),
      'LC-044: while mounted and loading a ledger, the app READS its sweep log, quarantine, occasional venues and pending links, and WRITES nothing');
    const writesElsewhere = store.log.filter(l => l.op && !['get', 'list'].includes(l.op) && !/^(checks|lookups)\//.test(l.path));
    eq(writesElsewhere, [], 'LC-044: the store itself saw no write outside the page\'s own checks/ and lookups/ documents');
    eq(r.bodyAfter, r.bodyBefore, 'LC-044: the mounted app\'s paint on <html> and <body> is put back');
    eq(r.hostsLeft, 0, 'LC-044: its hidden box is removed after each case');

    // Versions: every stated fact on the card passes, in her words.
    for (const n of MULTI) {
      const rec = R[n];
      eq([failsOf(rec), rec.card.blocks.every(b => b.version)], [[], true], 'LC-045: case ' + n + ' — every stated fact is on its block and right; every block matched to a version by its ISBN');
    }
    eq(gradesOf(R[1]).filter(g => /note$/.test(g.field)).map(g => g.got), ['The original edition.', "This venue's English edition.", "From the show's Stockholm exhibition."],
      'LC-045: Vasari — her three notes, as the card prints them');
    eq(gradesOf(R[2]).filter(g => /second ISBN$/.test(g.field)).map(g => [g.verdict, g.got]), [['pass', '978-2350315355']], 'LC-045: Hubert Robert — the second number is on the French block');
    eq(gradesOf(R[3]).find(g => g.field === 'Starting pick (the ● marker)').got + ' / ' + gradesOf(R[2]).find(g => g.field === 'Starting pick (the ● marker)').got,
      '978-1848221918 / nothing picked', 'LC-045: the ● marker is graded: NGA picks the English, the Louvre card picks nothing');

    // One book ("the card as now"): it prints no facts line, so language, binding and pages are
    // not applicable; no failure, nothing counted. Its English line stays "not checked".
    const NA = 'not applicable — this card has no facts line';
    for (const n of SINGLE) {
      const na = gradesOf(R[n]).filter(g => g.verdict === 'na');
      const stated = cardOf(n).versions[0];
      eq([failsOf(R[n]), na.map(g => g.field.replace(/^.* — /, '')), na.every(g => g.why === NA && g.got === ''), R[n].counted.fails],
        [[], ['language'].concat(stated.binding ? ['binding'] : []).concat(stated.pages ? ['pages'] : []), true, 0],
        'LC-046: case ' + n + ' — an agreed one-book card shows no failure: its ISBN and publisher pass, its facts are "not applicable", and none is "not shown on the card"');
    }
    ok([5, 6, 7].every(n => R[n].verdict === 'Every graded check passed. 4 lines or parts on the card not checked.') && R[9].verdict === 'Every graded check passed. 3 lines or parts on the card not checked.',
      'LC-046: Watteau, Canaletto – Guardi, Botticelli and Millet — "Every graded check passed"; not checked: the pick marker, the shop line, the title and (not Millet) the English line', JSON.stringify([5, 6, 7, 9].map(n => R[n].verdict)));
    eq([5, 6, 7].map(n => gradesOf(R[n]).filter(g => g.verdict === 'unchecked' && /^The card — /.test(g.field)).map(g => g.field.replace('The card — ', ''))), [5, 6, 7].map(() => ['shop line', 'title', 'note or source']),
      'LC-046: their English line ("No English edition - checked publisher\'s site and bookshops.") is reported "not checked", with the shop line and the title');
    ok(gradesOf(R[5]).some(g => g.verdict === 'unchecked' && g.got === "No English edition - checked publisher's site and bookshops."), 'LC-046: and it carries the line\'s text');
    eq([R[5].counted.checks, gradesOf(R[5]).filter(g => g.verdict === 'na').length], [api.lcCount(R[5].grades).checks, 2],
      'LC-046: a not-applicable row is not counted — Watteau\'s two not-applicable rows (language, binding) add nothing: its 7 checks are the lookup data\'s alone');

    // Lines no stated fact accounts for.
    const unchecked = rec => gradesOf(rec).filter(g => g.verdict === 'unchecked');
    eq(unchecked(R[1]).map(g => g.field.replace(/^Block \d \(.*?\) — /, '')), ['shop line', 'title', 'note or source', 'shop line', 'title', 'note or source', 'shop line', 'title', 'note or source'],
      'LC-047: Vasari — each block\'s shop line, title and source are reported "not checked", nothing silently skipped');
    ok(unchecked(R[1]).every(g => g.why === 'not checked — no right answer recorded' && g.got) && unchecked(R[1]).some(g => g.got === 'Source: louvre.fr') && unchecked(R[1]).some(g => /^Giorgio Vasari, the Book of Drawings$/.test(g.got)),
      'LC-047: each says "not checked — no right answer recorded" and carries the line\'s text');
    eq(unchecked(R[4]).map(g => g.got).filter(t => t === '2023'), ['2023'], 'LC-047: Hammershøi — the year after the English publisher ("Rizzoli Electa · 2023") is its own part, reported not checked');
    eq(R[1].card.blocks[1].lines.map(l => [l.text, l.verdict]).slice(2, 4), [['Louvre Éditions / Lienart', 'pass'], ['English · Paperback', 'pass']],
      'LC-047: the stored card carries each line\'s verdict');
    ok(R[1].verdict === 'Every graded check passed. 9 lines or parts on the card not checked.' && /Each fact is counted once/.test(r.boxes[1]) && /On the card/.test(r.boxes[1]) && /not checked/.test(r.boxes[1]),
      'LC-047: the case box says how many are not checked, and shows "On the card" and "The card as the app shows it"', R[1].verdict);
  }
  // LC-048: a fact that fails both in the lookup's data and on the card counts once.
  {
    eq(api.lcCount([{ verdict: 'fail', key: 'a' }, { verdict: 'pass', key: 'b' }], [{ verdict: 'fail', key: 'a' }, { verdict: 'unchecked', key: null }, { verdict: 'pass', key: 'c' }]),
      { checks: 3, fails: 1, unchecked: 1 }, 'LC-048: the same fact failing in both tables is one failed check, unchecked parts are counted apart');
    const store = makeStore();
    const r = await runPage(store, { rowFor: (n, row) => n === 7 ? { ...row, editions: [{ ...row.editions[0], publisher: 'Fonds Mercator' }], publisher: 'Fonds Mercator' } : row });
    const rec = r.records[7];
    const pub = 'French 978-9462302815 — publisher';
    eq([rec.grades.find(g => g.field === pub).verdict, rec.cardGrades.find(g => g.field === pub).verdict, rec.counted],
      ['fail', 'fail', { checks: 8, fails: 1, unchecked: 4 }],
      'LC-048: Botticelli with only "Fonds Mercator" — the publisher fails in the data and on the card and is counted once (1 failure, not 2)');
  }
  // LC-049..LC-050: what is checked follows the card. The app's source is altered here, in the test only.
  {
    const FACTS = '{b.facts&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{b.facts}</div>}';
    const SINGLE_PUB = '{r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}';
    const anchored = (src, a, b) => { if (src.split(a).length !== 2) throw new Error('the anchor moved in Cat_Watch.jsx: ' + a); return src.replace(a, b); };
    const added = prepare(BUILD, { edit: src => anchored(anchored(src, FACTS, FACTS + '<div style={{fontSize:11,color:C.soft,marginBottom:2}}>A LINE THE APP ADDED</div>'),
      SINGLE_PUB, SINGLE_PUB + '<div style={{fontSize:11,color:C.soft,marginBottom:2}}>A LINE ON THE SINGLE CARD</div>') });
    const removed = prepare(BUILD, { edit: src => anchored(src, FACTS, '') });

    const a = (await runPage(makeStore(), { built: added })).records;
    const addedOn = rec => rec.cardGrades.filter(g => g.verdict === 'unchecked' && /^A LINE/.test(g.got));
    eq([addedOn(a[1]).map(g => g.field), a[1].verdict], [['Block 1 (French 978-2359063721) — publisher line', 'Block 2 (English 978-2359063738) — publisher line', 'Block 3 (English 978-9171009166) — publisher line'].map(f => f), 'Every graded check passed. 12 lines or parts on the card not checked.'],
      'LC-049: a line the app adds to every version block is reported "not checked — no right answer recorded", and every stated fact still passes');
    ok(addedOn(a[1]).every(g => g.why === 'not checked — no right answer recorded' && g.got === 'A LINE THE APP ADDED'), 'LC-049: with its own text');
    eq([addedOn(a[9]).map(g => g.got), failsOf(a[9])], [['A LINE ON THE SINGLE CARD'], []], 'LC-049: the same on a one-book card — the added line is reported and nothing else moves');

    const b = (await runPage(makeStore(), { built: removed })).records;
    eq(failsOf(b[2]), ['French 978-2757210642 — language', 'French 978-2757210642 — binding', 'French 978-2757210642 — pages',
      'English 978-1848221918 — language', 'English 978-1848221918 — binding', 'English 978-1848221918 — pages'],
      'LC-050: with the facts line gone from the app, language, binding and pages fail on every block — the rest still passes');
    ok(b[2].cardGrades.filter(g => g.verdict === 'fail').every(g => g.why === 'not shown on the card' && g.got === '') && b[2].grades.every(g => g.verdict === 'pass'),
      'LC-050: each fails "not shown on the card", while what the lookup returned is untouched (the data-level table still passes)');
    eq(b[2].counted, { checks: 19, fails: 6, unchecked: 6 }, 'LC-050: and the case counts 6 of 19 failed');

    // LC-051: a one-book card that gains a facts line is graded on it, with no change to the page's code.
    const FACTS_ON_ONE = '{r.editions&&r.editions[0]&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{[langName(r.editions[0].lang),r.editions[0].binding==="hardcover"?"Hardcover":r.editions[0].binding==="paperback"?"Paperback":null].filter(Boolean).join(" \\u00b7 ")}</div>}';
    const withFacts = prepare(BUILD, { edit: src => anchored(src, SINGLE_PUB, SINGLE_PUB + FACTS_ON_ONE) });
    const f = (await runPage(makeStore(), { built: withFacts, rowFor: (n, row) => n === 5 ? { ...row, editions: [{ ...row.editions[0], binding: 'hardcover' }] } : row })).records;
    const factRows = (rec, k) => rec.cardGrades.filter(g => /— (language|binding|pages)$/.test(g.field)).map(g => [g.field.replace(/^.* — /, ''), g.verdict, g.got]);
    eq([6, 7, 9].map(n => factRows(f[n])),
      [[['language', 'pass', 'French'], ['binding', 'pass', 'Hardcover']], [['language', 'pass', 'French']], [['language', 'pass', 'English']]],
      'LC-051: a one-book card that prints a facts line is graded on it — language and binding pass, none is "not applicable"');
    eq([factRows(f[5]), failsOf(f[5]), f[5].counted.fails], [[['language', 'pass', 'French'], ['binding', 'fail', 'Hardcover']], ['French 978-2359064476 — binding'], 1],
      'LC-051: and a wrong fact on it fails (Watteau printed as hardcover, agreed paperback) and is counted');
    ok(!f[6].cardGrades.some(g => g.verdict === 'unchecked' && g.got === 'French \u00b7 Hardcover'), 'LC-051: the facts line is graded, no longer reported "not checked"');
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

  reachedEnd = true;
  console.log(failures ? failures + ' failed' : 'the live check page holds');
  process.exit(failures ? 1 : 0);
})();
