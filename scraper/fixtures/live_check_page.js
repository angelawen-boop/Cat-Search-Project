/*
 * live_check_page.js — the live check page (build/live_check_page.jsx), built by
 * build/live_check.js's own prepare(), run in jsdom with no network.
 *
 * LC-001..LC-009: grading on her nine cards (docs/lookup_proof_cards.json) — a row equal
 * to the card passes every check; single faults fail the one check they break (Botticelli
 * and Hammershøi publishers, an extra version, a left-off book, the wrong pick, a version
 * not listed).
 * LC-010: the first live run's eight saved records (docs/live_check_runs/), regraded.
 * LC-011..LC-016: a case whose save fails twice is reported on the page and in the run
 * header, and never ends "Every case is saved"; one failure then success is saved; a
 * failed header write is reported.
 * LC-017/LC-018: the source line prints the host, and the header line names branch and
 * commit, never "version".
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

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
const win = dom.window;
for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
  'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle']) {
  try { global[k] = win[k]; } catch { /* read-only on this Node */ }
}
global.IS_REACT_ACT_ENVIRONMENT = true;

// The page's own functions. `stub` replaces the lookup (the one thing that would reach the network).
const NAMES = 'LiveCheck, lcGrade, lcDrawn, lcFinalLine, LC_CARDS, LC_CASES, versionBlocks';
const lift = () => new Function('React', 'window', 'document', 'localStorage', '__stub',
  built.js + '\n;lookupCatalogue = __stub;\nreturn { ' + NAMES + ' };')(React, win, win.document, win.localStorage, (...a) => stubLookup(...a));
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
function makeStore(failOn) {
  const docs = new Map();
  const attempts = {}, doneWrites = [];
  const guard = p => {
    const m = failOn && failOn(p);
    if (!m) return;
    attempts[m.key] = (attempts[m.key] || 0) + 1;
    if (attempts[m.key] <= m.times) throw new Error('store refused ' + p);
  };
  const doc = p => ({
    set: async d => { guard(p); docs.set(p, { ...d }); },
    update: async d => { guard(p); if ('done' in d) doneWrites.push(d.done); docs.set(p, { ...(docs.get(p) || {}), ...d }); },
    delete: async () => { docs.delete(p); },
    get: async () => ({ exists: docs.has(p), data: () => docs.get(p) }),
    collection: n => ({ doc: id => doc(p + '/' + n + '/' + id) })
  });
  const db = { doc, collection: () => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }) };
  return { db, docs, doneWrites };
}
const text = () => win.document.getElementById('root').textContent || '';
const statusLines = () => [...win.document.querySelectorAll('.status')].map(e => e.textContent);

async function runPage(store) {
  win.claude = { use: async name => name === 'db' ? store.db : name === 'sample' ? async () => ({ modelTierApplied: 'default', modelApplied: null }) : null };
  stubLookup = async row => {
    const n = CARDS.find(c => c.case === built_caseOf(row)).case;
    return { ok: true, row: { ...row, ...rowOf(cardOf(n)) }, detail: '' };
  };
  win.document.getElementById('root').innerHTML = '';
  const root = createRoot(win.document.getElementById('root'));
  const { LiveCheck } = lift();
  await act(async () => { root.render(React.createElement(LiveCheck)); });
  const before = text();
  await act(async () => { win.document.querySelector('button.run').click(); });
  for (let i = 0; i < 400 && !statusLines().some(s => s.startsWith('Finished')); i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 25)); });
  }
  const boxes = {};
  for (const e of win.document.querySelectorAll('.case')) boxes[parseInt(e.querySelector('h2').textContent, 10)] = e.textContent;
  const headerLine = [...win.document.querySelectorAll('.soft')].map(e => e.textContent).find(t => t.startsWith('Code under test')) || '';
  const out = { before, boxes, headerLine, finalLine: statusLines().find(s => s.startsWith('Finished')) || null, text: text() };
  const headKey = [...store.docs.keys()].find(k => /^checks\/[^/]+$/.test(k));
  out.header = headKey ? store.docs.get(headKey) : null;
  await act(async () => root.unmount());
  return out;
}
const LCASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'live_check_cases.json'), 'utf8')).cases;
function built_caseOf(row) { return LCASES.find(c => c.row.id === row.id).case; }

(async () => {
  // LC-011..LC-013: case 7's writes throw every time.
  {
    const store = makeStore(p => /\/cases\/7(\/|$)/.test(p) ? { key: 'c7', times: 99 } : null);
    const r = await runPage(store);
    const box = r.boxes[7] || '';
    ok(/This case did not save: store refused/.test(box) && !/This case did not save/.test(r.boxes[6] || ''), 'LC-011: case 7\'s box says it did not save, with the error; case 6\'s does not', box.slice(0, 200));
    ok(r.finalLine && !/Every case is saved/.test(r.finalLine) && /case 7 did not save/.test(r.finalLine), 'LC-012: the last line does not say every case is saved — it names case 7', r.finalLine);
    eq([r.header && r.header.done, r.header && r.header.savedCases, r.header && r.header.unsavedCases.map(u => u.case), r.header && /store refused/.test(r.header.unsavedCases[0].error)],
      [8, [1, 2, 3, 4, 5, 6, 8, 9], [7], true], 'LC-013: the run header counts saved cases only, and lists case 7 with its error');
    eq(store.doneWrites, [1, 2, 3, 4, 5, 6, 6, 7, 8, 8], 'LC-013: `done` counts saved cases only at every update (case 7 leaves it at 6; the last is 8)');
    const written = n => [...store.docs.keys()].some(k => k.endsWith('/cases/' + n));
    eq([written(7), [1, 2, 3, 4, 5, 6, 8, 9].every(written)], [false, true], 'LC-013: case 7\'s record was not written; the other eight were');
  }
  // LC-014: one failure, then success — saved.
  {
    const store = makeStore(p => /\/cases\/7$/.test(p) ? { key: 'c7', times: 1 } : null);
    const r = await runPage(store);
    eq([r.finalLine, r.header && r.header.done, r.header && r.header.unsavedCases], ['Finished. Every case is saved.', 9, []], 'LC-014: a write failing once and then succeeding is saved — "Every case is saved", done 9');
    ok(!/did not save/.test(r.text), 'LC-014: no case box says it did not save');
  }
  // LC-015: the header's final update fails.
  {
    const store = makeStore(null);
    let finalWrites = 0;
    const real = store.db.doc;
    store.db.doc = p => {
      const d = real(p);
      if (/^checks\/[^/]+$/.test(p)) { const u = d.update; d.update = async x => { if (x.finished) { finalWrites++; throw new Error('header refused'); } return u(x); }; }
      return d;
    };
    const r = await runPage(store);
    ok(finalWrites === 2 && r.finalLine && !/Every case is saved/.test(r.finalLine) && /header did not save/.test(r.finalLine), 'LC-015: a failed header write (tried twice) is reported, not swallowed', r.finalLine);
  }
  // LC-016: no store at all.
  {
    const store = makeStore(null);
    win.claude = null;
    const r = await runPage({ ...store, db: null });
    ok(r.finalLine && /nothing was saved/.test(r.finalLine), 'LC-016: no store — the last line says nothing was saved', r.finalLine);
  }
  // LC-017: the source line.
  {
    const store = makeStore(null);
    const r = await runPage(store);
    ok(!/\[object Object\]/.test(r.text) && /Source: louvre\.fr/.test(r.text), 'LC-017: the drawn source reads "Source: louvre.fr", never [object Object]');
    // LC-018: the header line.
    ok(r.before.includes('Code under test: main · commit 12bfa1e · built 2026-10-10 00:00 UTC') && !/version/i.test(r.headerLine),
      'LC-018: the page header names branch and commit, never "version"', r.before.slice(0, 160));
    eq([r.header.branch, r.header.commit, 'version' in r.header, typeof r.header.appVersionInCode], ['main', '12bfa1e', false, 'string'],
      'LC-018: the saved run header carries branch, commit and appVersionInCode, no "version"');
  }

  console.log(failures ? failures + ' failed' : 'the live check page holds');
  process.exit(failures ? 1 : 0);
})();
