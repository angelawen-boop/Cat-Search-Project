/**
 * THE PERIOD SORT ON THE REAL PAGE (her trial; docs/periods.md). Renders the page in jsdom
 * on her 24 Sep ledger with periods written onto a few rows, taps Period, and reads the
 * cards and dividers. Cases PR-001 to PR-034.
 *
 *   node scraper/fixtures/period_render.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-period-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){')
      // The waits between tries shrink to milliseconds here; PS-015 holds her real ones.
      .replace('const LABEL_WAITS={retry:[15000,60000],lastGo:60000};', 'const LABEL_WAITS={retry:[5,5],lastGo:5};');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
    '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

const { JSDOM } = require('jsdom');
let React, createRoot, act;

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const hers = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json'), 'utf8'));
const pick = (venue, interested, n) => hers.rows.filter(r => r.museumId === venue && !!r.interested === interested).slice(0, n);
const [ng1, ng2] = pick('ng', true, 2);
const [met1, met2, met3] = pick('met', true, 3);
const [metGone] = pick('met', false, 1);
// The trial venues as the page lists them; the Art Institute stays outside them.
const trial = JSON.parse('[' + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8').match(/const PERIOD_VENUES=new Set\(\[([^\]]*)\]/)[1] + ']');
const outside = hers.rows.find(r => r.interested && r.museumId === 'artic');
const label = { [ng1.id]: ['highren', 1510], [met1.id]: ['highren', 1510], [ng2.id]: ['antiquity', -300],
  [met2.id]: ['impressionism', 1875], [metGone.id]: ['highren', 1500], [outside.id]: ['highren', 1505] };
const rows = hers.rows.map(r => label[r.id] ? { ...r, period: label[r.id][0], periodYear: label[r.id][1], themes: [] } : r);
const FILE = JSON.stringify({ ...hers, rows });

const settle = async (ms = 50) => { await new Promise(r => setTimeout(r, ms)); };
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const scrolls = []; win.scrollTo = o => { scrolls.push(o); };
  // Claude stands in: every show it is asked about is Baroque, 1650.
  // failNext: how many questions fail before answering (the retry and her line).
  const asked = []; let failNext = 0, relabelNext = false;
  win.claude = { use: async name => name !== 'sample' ? null : { json: async prompt => {
    const shows = prompt.split('Exhibitions:\n')[1].split('\n').filter(Boolean).map(l => JSON.parse(l));
    asked.push(shows.length);
    if (failNext > 0) { failNext--; throw { code: 'rate_limited', message: 'slow down' }; }
    // A question about one show is a Relabel: it comes back High Renaissance.
    if (shows.length === 1 && relabelNext) { relabelNext = false; return { labels: [{ i: shows[0].i, period: 'highren', year: 1505, themes: ['sculpture'] }] }; }
    return { labels: shows.map(x => ({ i: x.i, period: 'baroque', year: 1650, themes: [] })) };
  } } };
  const globals = ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame',
    'cancelAnimationFrame', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'Event',
    'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'HTMLInputElement', 'KeyboardEvent', 'MouseEvent'];
  for (const k of globals) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require('react'); ({ createRoot } = require('react-dom/client')); ({ act } = require('react'));
  const shouted = [];
  const realError = console.error;
  console.error = (...a) => shouted.push(String(a[0]));

  const App = new Function('React', 'window', 'document', 'localStorage', code + '\n;return App;')(React, win, doc, win.localStorage);
  const root = createRoot(doc.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await settle();
  global.IS_REACT_ACT_ENVIRONMENT = false;

  const cards = () => [...doc.querySelectorAll('article')];
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const has = (el, r) => el.textContent.includes(r.title);
  const chipBtnSort = t => [...doc.querySelectorAll('button')].find(b => b.textContent.replace(/[\u2191\u2193 ]+$/, '') === t);
  try {
    const input = doc.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([FILE], 'ledger.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    await until(() => cards().length > 0);
    const period = [...doc.querySelectorAll('button')].find(b => /^Period/.test(b.textContent));
    ok(!!period, 'PR-001: the sort row has Period');
    const sortRow = [...period.parentNode.querySelectorAll('button')].map(b => b.textContent.replace(/[\u2191\u2193 ]+$/, ''));
    ok(sortRow.slice(0, 3).join() === 'Date,Venue,Period', 'PR-017: Period is the third sort chip (her decision)', sortRow.join());
    const themeRow = [...doc.querySelectorAll('span')].find(x => x.textContent === 'Theme');
    ok(themeRow && [...themeRow.parentNode.querySelectorAll('button')].map(b => b.textContent).join('|')
      === 'Fashion & Jewellery|Architecture|Sculpture|Animals|Nature|Photography|Decorative Arts \u2013 Hard|Decorative Arts \u2013 Soft|Books|Ex-themes',
      'PR-018: a Theme row of her chips, in her order', themeRow && themeRow.parentNode.textContent);
    click(period); await settle(150);
    const c = cards();
    ok(c.length === 4, 'PR-002: only labelled, not-dismissed shows at the trial venues (4)', String(c.length));
    ok(c.length === 4 && has(c[0], ng2) && has(c[1], met1) && has(c[2], ng1) && has(c[3], met2),
      'PR-003: Antiquity, then High Renaissance (a tie in her venue order: Met before NG), then Impressionism',
      c.map(x => x.textContent.slice(0, 40)).join(' | '));
    const text = doc.body.textContent;
    ok(['Antiquity', 'High Renaissance', 'Impressionism'].every(n => text.includes(n)), 'PR-004: a divider names each period');
    click([...doc.querySelectorAll('button')].find(b => /^Period/.test(b.textContent))); await settle(150);
    const r = cards();
    ok(r.length === 4 && has(r[0], met2) && has(r[3], ng2), 'PR-005: a second tap on Period reverses the order',
      r.map(x => x.textContent.slice(0, 40)).join(' | '));
    // The scrubber (her design): hidden until a hold on the right edge; a ruler of the view's periods.
    const zone = doc.querySelector('[data-scrubber="zone"]');
    const ruler = () => doc.querySelector('[data-scrubber="ruler"]');
    const touch = (type, y) => { const e = new win.Event(type, { bubbles: true, cancelable: true }); e.touches = y == null ? [] : [{ clientY: y }]; zone.dispatchEvent(e); return e; };
    ok(!!zone && !ruler(), 'PR-023: in the Period view the scrubber is hidden until she holds the right edge');
    touch('touchstart', 300); await settle(60); touch('touchmove', 330); await settle(400);
    ok(!ruler(), 'PR-024: a swipe that moves before the hold is an ordinary scroll, no ruler');
    touch('touchend');
    touch('touchstart', 300); await settle(400);
    const rows_ = ruler() ? [...ruler().querySelectorAll('[data-scrub-row]')] : [];
    ok(rows_.map(x => x.textContent).join() === 'Impressionism,High Renaissance,Antiquity', 'PR-025: a hold shows the view\'s periods, in the view\'s order, as written', rows_.map(x => x.textContent).join());
    const top = win.innerHeight / 2 - 3 * 15.5 / 2;
    const sel = () => [...ruler().querySelectorAll('[data-scrub-row] span')].filter(x => x.style.fontWeight === '700').map(x => x.textContent);
    const mv = touch('touchmove', top + 15.5 * 1.5); await settle(30);
    ok(sel().join() === 'High Renaissance' && mv.defaultPrevented, 'PR-026: sliding picks the row under her finger, bold and bigger, and the page does not scroll', sel().join());
    const spans = [...ruler().querySelectorAll('[data-scrub-row] span:first-child')];
    const rowsNow = [...ruler().querySelectorAll('[data-scrub-row]')];
    ok(rowsNow.length === 3 && rowsNow.every(x => x.style.height === (x.querySelector('span').style.fontWeight === '700' ? '28px' : '15.5px'))
      && spans.every(x => x.style.fontSize === (x.style.fontWeight === '700' ? '18px' : '10px')),
      'PR-027: every period shown at once; rows 15.5px apart, names 10px; the picked one bulges in place, 18px on a 28px row (her design)', rowsNow.map(x => x.style.height).join() + ' ' + spans.map(x => x.style.fontSize).join());
    const sizer = doc.querySelector('[data-scrubber="sizer"]');
    ok(!!sizer && sizer.querySelectorAll('span').length === 3 && [...sizer.querySelectorAll('span')].every(x => x.style.fontSize === '18px'),
      'PR-031: the panel is sized by every name at its bulged size, so it never changes width as she slides');
    const panel = doc.querySelector('[data-scrubber="panel"]'), picked = spans.find(x => x.style.fontWeight === '700');
    ok(!!panel && /^(#|rgb)/.test(panel.style.background) && !!picked && picked.style.background !== 'none' && picked.style.background !== '',
      'PR-030: the ruler sits on a pale panel and the picked period has a colour behind it (her ask)', panel && panel.style.background);
    scrolls.length = 0; touch('touchend'); await settle(60);
    ok(!ruler() && scrolls.length === 1 && scrolls[0].behavior === 'auto', 'PR-028: lifting jumps to that period and the ruler goes', JSON.stringify(scrolls));
    ok(doc.querySelectorAll('[data-period]').length === 3 && !!doc.querySelector('[data-period="highren"]'), 'PR-029: each divider carries its period, to jump to');
    const unlabelled = rows.filter(x => trial.includes(x.museumId) && !x.period).length;
    const shownAfter = rows.filter(x => trial.includes(x.museumId) && x.interested).length;
    failNext = 1e6;   // Claude refuses every question: nothing labelled, and her line says so
    click([...doc.querySelectorAll('button')].find(b => b.textContent === 'Label'));
    await until(() => /Label: 0 of/.test(doc.body.textContent));
    ok(doc.body.textContent.includes(`Label: 0 of ${unlabelled} exhibitions labelled; ${unlabelled} not \u2014 Claude is rate-limited.`),
      'PR-013: a run that fails says how many were not labelled, and why', (doc.body.textContent.match(/Label:[^.]*\./) || [''])[0]);
    ok(asked.length === 4 * Math.ceil(unlabelled / 40), 'PR-013: each failed batch was asked three times, then once more at the end, no more', String(asked.length));
    asked.length = 0;
    failNext = 1;   // the first question fails once, then the retry answers
    click([...doc.querySelectorAll('button')].find(b => b.textContent === 'Label'));
    await until(() => cards().length === shownAfter && /Label: all/.test(doc.body.textContent));
    ok(asked.slice(1).reduce((a, b) => a + b, 0) === unlabelled && asked.every(n => n <= 40) && asked[0] === asked[1],
      `PR-007: Label asks about every unlabelled show at the trial venues, dismissed included (${unlabelled}), 40 at a time; a failed batch is asked again`, asked.join(','));
    ok(doc.body.textContent.includes(`Label: all ${unlabelled} exhibitions labelled.`), 'PR-012: after a full run her line says every show was labelled');
    ok(cards().length === shownAfter, `PR-008: after Label, Period shows every not-dismissed show at the trial venues (${shownAfter})`, String(cards().length));
    // Recently labelled (her ask): this run's shows first, then the shows labelled before the sort existed.
    click(chipBtnSort('Recently labelled')); await settle(150);
    const before_ = (el, other) => !!(el.compareDocumentPosition(other) & win.Node.DOCUMENT_POSITION_FOLLOWING);
    const band = t => [...doc.querySelectorAll('span')].find(x => x.textContent === t);
    const thisBand = band('This labelling'), s1Band = band('Stage 1');
    const inThis = cards().filter(a => thisBand && s1Band && before_(thisBand, a) && before_(a, s1Band));
    ok(!!thisBand && !!s1Band && inThis.length === shownAfter - 4 && !inThis.some(a => [ng1, ng2, met1, met2].some(x => has(a, x))),
      'PR-032: Recently labelled puts this Label run\'s shows under "This labelling", the earlier ones under "Stage 1"', inThis.length + ' of ' + (shownAfter - 4));
    click(chipBtnSort('Period')); await settle(150); click(chipBtnSort('Period')); await settle(150);   // back to Period, reversed as before
    const fin = cards();
    ok(has(fin[fin.length - 1], ng2) && has(fin[0], met2), 'PR-009: a show already labelled keeps its label', fin[0].textContent.slice(0, 40));
    // Relabel, at the foot of a card's drawer, replaces that one show's label.
    const first = cards()[0], firstTitle = first.querySelector('h3').textContent;
    click([...first.querySelectorAll('button')].find(b => /Catalogue|Hide/.test(b.textContent)));
    await until(() => [...cards()[0].querySelectorAll('button')].some(b => b.textContent === 'Relabel'));
    const rb = [...cards()[0].querySelectorAll('button')].find(b => b.textContent === 'Relabel');
    ok(!!rb, 'PR-014: the drawer of a trial-venue card has Relabel');
    relabelNext = true; const nAsked = asked.length;
    click(rb);
    await until(() => /Relabelled: High Renaissance/.test(doc.body.textContent));
    ok(asked.length === nAsked + 1 && asked[nAsked] === 1, 'PR-015: Relabel asks Claude about that one show only', asked.slice(nAsked).join(','));
    ok(doc.body.textContent.includes('Relabelled: High Renaissance \u00b7 c. 1505 \u00b7 Sculpture.'), 'PR-015: the drawer says the new label, its themes included');
    const hr = [...doc.querySelectorAll('span')].some(x => x.textContent === 'High Renaissance');
    ok(hr && [...doc.querySelectorAll('article h3')].some(h => h.textContent === firstTitle), 'PR-016: the show moves under its new divider', firstTitle);
    // The Theme row filters; Ex-themes is every labelled show with no theme.
    const chipBtn = t => [...doc.querySelectorAll('button')].find(b => b.textContent === t);
    const allShown = cards().length;
    click(chipBtn('Sculpture')); await settle(150);
    ok(cards().length === 1 && cards()[0].querySelector('h3').textContent === firstTitle, 'PR-019: Sculpture shows only the show labelled Sculpture', String(cards().length));
    click(chipBtn('Sculpture')); click(chipBtn('Ex-themes')); await settle(150);
    ok(cards().length === allShown - 1 && !cards().some(c => c.querySelector('h3').textContent === firstTitle), 'PR-020: Ex-themes shows every show but the themed one', String(cards().length));
    click(chipBtn('Sculpture')); await settle(150);
    ok(cards().length === allShown, 'PR-021: two theme chips show either, as the Venue row does', String(cards().length));
    click(chipBtn('Sculpture')); click(chipBtn('Ex-themes')); await settle(150);
    // Every theme chip plus Ex-themes, all picked: exactly the Period view, nothing lost or doubled.
    const themeNames = [...[...doc.querySelectorAll('span')].find(x => x.textContent === 'Theme').parentNode.querySelectorAll('button')].map(b => b.textContent);
    themeNames.forEach(t => click(chipBtn(t))); await settle(150);
    ok(cards().length === allShown, 'PR-022: the theme chips and Ex-themes together hold every show in the Period view, once', cards().length + ' of ' + allShown);
    themeNames.forEach(t => click(chipBtn(t))); await settle(150);
    click(chipBtnSort('Recently labelled')); await settle(150);
    const lone = cards().filter(a => before_(band('This labelling'), a) && before_(a, band('Earlier labellings')));
    ok(lone.length === 1 && lone[0].querySelector('h3').textContent === firstTitle,
      'PR-033: a Relabel puts that one show under "This labelling", the run before it under "Earlier labellings"', lone.length + '');
    click(chipBtnSort('Period')); await settle(150);
    // The Recently labelled filter, on the Showing line after Dismissed: the newest Label run, in period order.
    const showing = [...doc.querySelectorAll('span')].find(x => x.textContent === 'Showing');
    const showRow = showing ? [...showing.parentNode.querySelectorAll('button')].map(b => b.textContent) : [];
    ok(showRow.indexOf('Recently labelled') === showRow.indexOf('Dismissed') + 1, 'PR-034: the Recently labelled filter sits after Dismissed on the Showing line', showRow.join());
    click([...showing.parentNode.querySelectorAll('button')].find(b => b.textContent === 'Recently labelled')); await settle(150);
    const run = cards();
    ok(run.length === shownAfter - 4 && !run.some(a => [ng1, ng2, met1, met2].some(x => has(a, x)))
      && !!doc.querySelector('[data-period="baroque"]'),
      'PR-034: with Period, it shows only the last Label run under its period dividers; a stage 1 show relabelled stays out', run.length + ' of ' + (shownAfter - 4));
    click([...showing.parentNode.querySelectorAll('button')].find(b => b.textContent === 'Recently labelled')); await settle(150);

    const csv = 'venue_code,title,start_date,end_date,summary,url,notes,swept_at\n'
      + 'met,A Show Nobody Has Seen,2026-11-01,2027-02-01,Paintings of the 1600s.,https://www.metmuseum.org/exhibitions/nobody-has-seen,,2026-10-15\n'
      + 'artic,Another New Show,2026-11-01,2027-02-01,Prints.,https://www.artic.edu/exhibitions/another-new-show,,2026-10-15\n';
    const before = asked.length;
    const csvIn = doc.querySelector('input[type=file][accept=".csv,text/csv"]');
    Object.defineProperty(csvIn, 'files', { value: [new win.File([csv], 'sweep.csv', { type: 'text/csv' })], configurable: true });
    csvIn.dispatchEvent(new win.Event('change', { bubbles: true }));
    await until(() => /Baroque · c\. 1650/.test(doc.body.textContent));
    ok(asked.length === before + 1 && asked[before] === 1, 'PR-010: an import asks once, about the new show at a trial venue only', asked.slice(before).join(','));
    const card = [...doc.querySelectorAll('[id^="prop-"]')];
    ok(card.length === 2 && /Period:\s*Italian Baroque · c\. 1650/.test(card.find(x => x.textContent.includes('Nobody Has Seen')).textContent)
      && !/Period:/.test(card.find(x => x.textContent.includes('Another New Show')).textContent),
      'PR-011: the new Met show\'s card shows its period; the Art Institute\'s shows none', card.map(x => x.textContent.slice(0, 200)).join(' | '));
    ok(!shouted.some(s => /Error|Warning/.test(s)), 'PR-006: nothing written to the console as an error', shouted.slice(0, 2).join(' | '));
  } catch (e) {
    fail++; console.log('FAIL  the suite threw: ' + (e && e.stack || e));
  }
  console.error = realError;
  root.unmount();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
