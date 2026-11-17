/**
 * THE THEME CHIP'S COUNT AND THE VENUE SCRUBBER ON THE REAL PAGE (her design, 59.1; docs/app.md).
 * Renders the page in jsdom on her 24 Sep ledger, with themes written onto a few rows and a few
 * rows moved to manual-import venues, and reads the chips, the cards and the scrubber.
 * Cases TC-001 to TC-004 (the count), VS-001 to VS-006 (the scrubber).
 *
 *   node scraper/run_tests.js --only theme_count_venue_scrub
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-tcvs-'));
fs.writeFileSync(path.join(tmp, 'app.tsx'), 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8').replace(/^import React.*$/m, '').replace(/^export default function App\(\)\{/m, 'function App(){'));
try { execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' }); } catch { /* type errors are expected; the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => { if (cond) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); } };

const hers = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json'), 'utf8'));
const keep = hers.rows.filter(r => r.interested);
// Three shows with Sculpture, two of them also Nature; one more with Nature alone.
const themes = { [keep[0].id]: ['sculpture'], [keep[1].id]: ['sculpture', 'nature'], [keep[2].id]: ['sculpture', 'nature'], [keep[3].id]: ['nature'] };
// Five shows moved to manual-import venues: two in the US group (two at one venue, one at another), two in Europe.
const moved = { [keep[4].id]: 'occ-clevelandart-org', [keep[5].id]: 'occ-clevelandart-org', [keep[6].id]: 'occ-courtauld-ac-uk', [keep[7].id]: 'occ-courtauld-ac-uk', [keep[8].id]: 'occ-mauritshuis-nl' };
const rows = hers.rows.map(r => ({ ...r, ...(themes[r.id] ? { themes: themes[r.id] } : {}), ...(moved[r.id] ? { museumId: moved[r.id] } : {}) }));
const FILE = JSON.stringify({ ...hers, rows });

const settle = (ms = 60) => new Promise(r => setTimeout(r, ms));

(async () => {
  const { JSDOM } = require('jsdom');
  const { fakeStore } = require('./fake_store.js');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const scrolls = []; win.scrollTo = o => { scrolls.push(o); };
  const store = fakeStore();
  win.claude = { use: async name => (name === 'db' ? store : null) };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle', 'FileReader', 'File', 'HTMLInputElement', 'MouseEvent']) { try { global[k] = win[k]; } catch {} }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const shouted = []; const realError = console.error; console.error = (...a) => shouted.push(String(a[0]));
  try {
    const env = new Function('React', 'window', 'document', 'localStorage', code + '\n;return {App, MU};')(React, win, doc, win.localStorage);
    const root = createRoot(doc.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(env.App)); });
    global.IS_REACT_ACT_ENVIRONMENT = false;
    await settle(200);
    const input = doc.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([FILE], 'ledger.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    for (let i = 0; i < 100 && !doc.querySelector('article'); i++) await settle(50);
    await settle(200);

    const cards = () => [...doc.querySelectorAll('article')];
    const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    const rowOf = label => { const s = [...doc.querySelectorAll('span')].find(x => x.textContent === label); return s ? [...s.parentNode.querySelectorAll('button')] : []; };
    const theme = t => rowOf('Theme').find(b => b.textContent === t || b.textContent.startsWith(t + ' · '));
    const venue = t => rowOf('Venue').find(b => b.textContent === t);
    const sortBtn = t => rowOf('Sort').find(b => b.textContent.replace(/[↑↓ ]+$/, '') === t);
    const marks = () => [...doc.querySelectorAll('[data-period]')];
    const zone = () => doc.querySelector('[data-scrubber="zone"]');

    // TC — a picked Theme chip shows its own count after a dot; unpicked, the count goes (her design).
    ok(rowOf('Theme').every(b => !b.textContent.includes('·')), 'TC-001: no Theme chip shows a count until it is picked');
    click(theme('Sculpture')); await settle(150);
    ok(theme('Sculpture').textContent === 'Sculpture · 3' && cards().length === 3, 'TC-002: picked, the chip reads "Sculpture · 3" and three cards show', theme('Sculpture').textContent + ', ' + cards().length + ' cards');
    click(theme('Nature')); await settle(150);
    ok(theme('Sculpture').textContent === 'Sculpture · 3' && theme('Nature').textContent === 'Nature · 3' && cards().length === 4,
      'TC-003: with two picked, each shows its own count (3 and 3) while the list holds the four shows with either', theme('Sculpture').textContent + ' | ' + theme('Nature').textContent + ', ' + cards().length + ' cards');
    click(theme('Sculpture')); await settle(150);
    ok(theme('Sculpture').textContent === 'Sculpture' && theme('Nature').textContent === 'Nature · 3', 'TC-004: unpicked, the count goes; the other keeps its own', theme('Sculpture').textContent + ' | ' + theme('Nature').textContent);
    click(theme('Nature')); await settle(150);

    // VS — the venue scrubber: an Occ group picked AND the list sorted by venue (her design).
    click(venue('Occ - US')); await settle(150);
    ok(cards().length === 2 && !zone() && !marks().length, 'VS-001: an Occ group sorted by date has no scrubber', cards().length + ' cards');
    click(sortBtn('Venue')); await settle(150);
    ok(!!zone() && marks().length === 1 && marks()[0].getAttribute('data-period') === 'venue:occ-clevelandart-org',
      'VS-002: sorted by venue, the scrubber is there and each venue\'s first card carries its mark', marks().map(m => m.getAttribute('data-period')).join());
    click(venue('Occ - Europe')); await settle(150);
    const order = marks().map(m => m.getAttribute('data-period'));
    ok(cards().length === 5 && order.join() === 'venue:occ-clevelandart-org,venue:occ-courtauld-ac-uk,venue:occ-mauritshuis-nl',
      'VS-003: with both groups, one mark per venue, in the order Sort by venue gives', order.join());
    zone().dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, button: 0, clientY: 300 })); await settle(450);
    const names = [...doc.querySelectorAll('[data-scrub-row]')].map(r => r.textContent);
    ok(names.join('|') === ['occ-clevelandart-org', 'occ-courtauld-ac-uk', 'occ-mauritshuis-nl'].map(id => env.MU[id].card).join('|'),
      'VS-004: held, the scrubber lists those venues by the name their cards show', names.join('|'));
    const before = scrolls.length;
    win.dispatchEvent(new win.MouseEvent('mouseup', { bubbles: true })); await settle(150);
    ok(scrolls.length === before + 1 && !doc.querySelector('[data-scrub-row]'), 'VS-005: lifting jumps to the picked venue and the scrubber closes', (scrolls.length - before) + ' jump(s)');
    click(venue('Occ - US')); click(venue('Occ - Europe')); await settle(150);
    ok(!zone() && !marks().length, 'VS-006: sorted by venue with no Occ group picked, there is no scrubber');
    ok(!shouted.some(s => /Error|Warning/.test(s)), 'TC-005: nothing written to the console as an error', shouted.slice(0, 2).join(' | '));
    root.unmount();
  } catch (e) { fail++; console.log('FAIL  the suite threw: ' + (e && e.stack || e)); }
  console.error = realError;
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
