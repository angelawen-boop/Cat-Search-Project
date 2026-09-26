/**
 * THE CLOUD LEDGER, DRIVEN THROUGH THE APP ITSELF — clicks, not functions.
 *
 * cloud_ledger.js asks the storage code directly. This asks the other half:
 * does the SCREEN do what she was told it does? It renders the real page in
 * jsdom (built the way page_renders.js builds it), hands it a runtime whose
 * store is the stand-in from fake_store.js, and then imports her real ledger,
 * stars a show, Saves (file + cloud copy), rolls back, re-imports, and breaks the store
 * — reading what lands in the store and what the page says after each.
 *
 * What it cannot see: the real store and the real viewer. That is the trial.
 *
 *   node scraper/fixtures/cloud_app.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { fakeStore } = require('./fake_store.js');

const ROOT = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-cloud-'));
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react', '--target', 'esnext',
    '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* type errors are expected; the emit is what matters */ }
const code = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');

const { JSDOM } = require('jsdom');
// React and react-dom are loaded AFTER the browser globals are in place:
// react-dom decides at load whether typing events exist, and loaded first it
// decides they do not, so a typed label never reaches the page.
let React, createRoot, act;

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const HERS_FILE = path.join(ROOT, 'docs', 'ledger_2026-09-24', 'cat-watch-ledger-2026-09-24-1616.json');
const HERS_TEXT = fs.readFileSync(HERS_FILE, 'utf8');
const hers = JSON.parse(HERS_TEXT);

// The storage code, lifted the same way cloud_ledger.js lifts it, to READ
// what the page wrote.
const src = fs.readFileSync(path.join(ROOT, 'Cat_Watch.jsx'), 'utf8');
const sec = src.slice(src.indexOf('// ── THE CLOUD LEDGER — branch claude/ledger-cloud'), src.indexOf('// ── END OF THE CLOUD LEDGER'));
const C = new Function(sec + '\nreturn {cloudReadLive,cloudListSnapshots,cloudReadSnapshot,ledgerFingerprintText};')();

const settle = async (ms = 50) => { await new Promise(r => setTimeout(r, ms)); };
// WAIT FOR THE OUTCOME, NEVER A FIXED PAUSE (guide §6: a fixed pause answers
// "has it arrived" and "is there more" at once). Polls until true or 8 s.
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await settle(40); } return false; };

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window, doc = win.document;
  const store = fakeStore({ failOnSet: () => breakStore });
  let breakStore = false;
  const saved = [];
  let declineNext = false;   // the viewer says no to the next file
  win.claude = {
    use: async name => {
      if (name === 'db') return store;
      if (name === 'downloads') return { save: async f => {
        if (declineNext) { declineNext = false; throw { code: 'declined', message: 'The viewer declined.' }; }
        saved.push(f); } };
      return null;
    },
  };
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
  // From here on the page runs as it does in a browser: clicks and timers,
  // no test wrapper holding React's work back until a step ends.
  global.IS_REACT_ACT_ENVIRONMENT = false;

  const text = () => doc.getElementById('root').textContent;
  const button = label => [...doc.querySelectorAll('button')].find(b => b.textContent.trim() === label || b.title === label);
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const live = async () => { const l = await C.cloudReadLive(store); return l.rec ? { rec: l.rec, data: JSON.parse(l.text) } : null; };
  const liveSaved = () => (store.docs.has('ledger/live') ? JSON.parse(store.docs.get('ledger/live')).savedAt : null);
  const same = (a, b) => C.ledgerFingerprintText(a) === C.ledgerFingerprintText(b);
  const snapCount = () => [...store.docs.keys()].filter(k => k.startsWith('snapshots/')).length;
  // A save has landed when the live record's time moves.
  const afterSave = async doIt => { const before = liveSaved(); await doIt(); return until(() => liveSaved() && liveSaved() !== before); };
  const importText = async t => {
    const input = doc.querySelector('input[type=file][accept=".json"]');
    Object.defineProperty(input, 'files', { value: [new win.File([t], 'ledger.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const typeInto = async (input, value) => {
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    await until(() => input.value === value);
  };
  const firstUnwatched = () => [...doc.querySelectorAll('button')].find(b => b.title === 'Watch');

  try {
    // 1. Opening: nothing in the store, nothing written, and the line says so.
    await until(() => /No cloud copy yet/.test(text()));
    ok(/No cloud copy yet/.test(text()), 'CA-001: an empty store says "No cloud copy yet" on the opening screen');
    ok(!store.docs.has('ledger/live'), 'CA-001b: opening the page writes nothing — an empty portal never overwrites the cloud copy');

    // 2. Import her ledger: it becomes the cloud copy, exactly.
    ok(await afterSave(() => importText(HERS_TEXT)), 'CA-002: importing her ledger is followed by a save, with nothing pressed');
    let l = await live();
    ok(l && same(l.data, hers), `CA-002b: the cloud copy is her ledger exactly — ${hers.rows.length} rows, ${hers.ignored.length} quarantined`);
    ok(/No cloud copy existed yet/.test(text()), 'CA-002c: the first import says it is now the first cloud copy');
    await until(() => /Last cloud save: .* 352 exhibitions/.test(text()));
    ok(/Last cloud save: .* 352 exhibitions/.test(text()), 'CA-002d: the line says when it saved and how many', (text().match(/\u2601[^\u2601]{0,90}/) || [''])[0]);

    // 3. One click — star a show — reaches the store with no button pressed.
    ok(await afterSave(() => click(firstUnwatched())), 'CA-003: starring one show saves by itself');
    l = await live();
    const differ = d => d.rows.filter(r => r.watching !== hers.rows.find(h => h.id === r.id).watching).length;
    ok(differ(l.data) === 1, 'CA-003b: exactly one row differs from her file in the cloud copy', String(differ(l.data)));
    const afterStar = l.data;

    // 4. Save, described, with the cloud box as it starts: the offline file
    //    and its cloud twin, one press.
    ok(button('Cloud Saves') && !button('Snapshots') && !button('Take snapshot'), 'CA-004: the drawer is called Cloud Saves and makes nothing itself');
    click(button('Cloud Saves'));
    await until(() => /No cloud saves yet/.test(text()));
    ok(/No cloud saves yet/.test(text()), 'CA-004a: the drawer says "No cloud saves yet" when there are none');
    ok(button('Save') && !button('Export / Save'), 'CA-004b: the button is called Save');
    click(button('Save'));
    await until(() => doc.querySelector('input[placeholder^="Description"]'));
    const tick = doc.querySelector('input[type=checkbox]');
    ok(tick && tick.checked && /Also save a copy to cloud/.test(tick.parentElement.textContent), 'CA-004c: "Also save a copy to cloud" starts ticked');
    await typeInto(doc.querySelector('input[placeholder^="Description"]'), 'after starring');
    click(button('Save now'));
    await until(() => saved.length === 1 && snapCount() === 1 && /Local file saved/.test(text()));
    let snaps = await C.cloudListSnapshots(store);
    const file1 = saved[0];
    ok(file1 && /^cat-watch-ledger-\d{4}-\d\d-\d\d-\d{4}-after-starring\.json$/.test(file1.filename), 'CA-004d: the offline file is named with her description', file1 && file1.filename);
    ok(snaps.length === 1 && snaps[0].label === 'after starring' && snaps[0].kind === 'manual' && snaps[0].filename === file1.filename,
      'CA-004e: the cloud copy carries her description and the SAME file name', JSON.stringify(snaps.map(x => [x.label, x.kind, x.filename])));
    const snapText = await C.cloudReadSnapshot(store, snaps[0]);
    ok(snapText === file1.data, 'CA-004f: the cloud copy is the offline file, byte for byte');
    const snapData = JSON.parse(snapText);
    ok(same(snapData, afterStar), 'CA-004g: and it holds exactly the ledger on screen');
    ok(/Local file saved\. Extra copy also sent to cloud\./.test(text()), 'CA-004h: the note says both happened, in her words');
    ok(/after starring/.test(text()) && /cat-watch-ledger-.*-after-starring\.json/.test(text()), 'CA-004i: the open drawer lists it at once, with its file name');

    // 5. Another change, then roll back to the snapshot.
    ok(await afterSave(() => click(firstUnwatched())), 'CA-005: a second star saves');
    const beforeRollback = (await live()).data;
    ok(!same(beforeRollback, snapData), 'CA-005b: the cloud copy now differs from the snapshot');
    click(button('Roll back to this'));
    await until(() => /Roll back to this cloud save\?/.test(text()));
    ok(/Roll back to this cloud save\?/.test(text()), 'CA-005c: rolling back asks first');
    ok(await afterSave(() => click(button('Continue'))), 'CA-005d: confirming the rollback is followed by a save');
    l = await live();
    ok(same(l.data, snapData), 'CA-005e: the cloud copy is now the snapshot');
    await until(() => snapCount() === 2);
    snaps = await C.cloudListSnapshots(store);
    const safety = snaps.find(x => x.kind === 'safety');
    ok(snaps.length === 2 && safety && same(JSON.parse(await C.cloudReadSnapshot(store, safety)), beforeRollback),
      'CA-005f: what she had before was kept as a snapshot first, so the rollback can be undone');
    ok(!/UNSAVED CHANGES/.test(text()), 'CA-005g: the old "not saved to a file" warning stays unwired while the cloud saves');

    // 6. Import her original file now: it differs, so the cloud copy is kept first.
    ok(await afterSave(() => importText(HERS_TEXT)), 'CA-006: importing a file that differs from the cloud copy is followed by a save');
    await until(() => snapCount() === 3);
    snaps = await C.cloudListSnapshots(store);
    ok(snaps.length === 3 && snaps[0].label === 'Cloud copy before Load' && snaps[0].kind === 'safety', 'CA-006b: the cloud copy was kept as a snapshot first');
    ok(/The file you just loaded differs from the last cloud save \(\d\d:\d\d \d\d\/\d\d\/\d{4}\): 1 difference\. A snapshot of the last cloud state was taken before loading your file\./.test(text()),
      'CA-006c: and the page says so in her words, with the count', (text().match(/The file you just loaded[^.]*\.[^.]*\./) || [''])[0]);
    ok(same((await live()).data, hers), 'CA-006d: then the imported file becomes the cloud copy');
    await until(() => (text().match(/Download/g) || []).length === 3);
    ok((text().match(/Roll back to this/g) || []).length === 3, 'CA-006e: the open drawer lists all three snapshots without being reopened');

    // 7. Import the same file again: the trial's check says they match, nothing kept.
    await importText(HERS_TEXT);
    await until(() => /matches this file exactly/.test(text()));
    ok(/matches this file exactly/.test(text()) && snapCount() === 3, 'CA-007: importing the file the cloud copy already holds says "matches exactly" and keeps nothing extra');

    // 8. Download: an automatic copy comes as an ordinary ledger file; the one
    //    Save made comes back as its offline twin, same name, same bytes.
    const downloads = () => [...doc.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Download');
    click(downloads()[0]);
    await until(() => saved.length === 2);
    let got = saved[saved.length - 1];
    ok(got && /^cat-watch-snapshot-.*\.json$/.test(got.filename) && Array.isArray(JSON.parse(got.data).rows),
      'CA-008: Download hands over an automatic copy as a ledger file Load can read', got && got.filename);
    click(downloads()[downloads().length - 1]);
    await until(() => saved.length === 3);
    got = saved[saved.length - 1];
    ok(got && got.filename === file1.filename && got.data === file1.data, 'CA-008b: the copy Save made downloads under the same name, byte for byte', got && got.filename);

    // 8c. The viewer cancels the file: the cloud copy is still kept, and the note says which half.
    click(firstUnwatched()); await until(() => !/Local file saved/.test(text()));
    if (!doc.querySelector('input[placeholder^="Description"]')) click(button('Save'));
    await until(() => doc.querySelector('input[placeholder^="Description"]'));
    declineNext = true;
    click(button('Save now'));
    ok(await until(() => /Cloud copy kept\. Local file not saved - cancelled\./.test(text())), 'CA-008c: a cancelled file keeps the cloud copy, and says "Local file not saved - cancelled"');
    ok(snapCount() === 4 && saved.length === 3, 'CA-008d: one more cloud copy, no file', snapCount() + ' / ' + saved.length);

    // 8e. Unticked: the file only.
    const tick2 = doc.querySelector('input[type=checkbox]');
    click(tick2);
    await until(() => !tick2.checked);
    click(button('Save now'));
    ok(await until(() => /Local file saved\.  \(/.test(text()) && saved.length === 4), 'CA-008e: unticked, Save gives the file alone and says only "Local file saved."');
    ok(snapCount() === 4, 'CA-008f: and keeps no cloud copy');

    // 8g. Load asks nothing while the cloud is saving — the safety copy covers it.
    click(firstUnwatched()); await settle(200);
    click(button('Load'));
    await settle(100);
    ok(!/Continue\?/.test(text()), 'CA-008g: Load does not ask first while the cloud copy is saving');

    // 9. The store stops answering: the page says so, loudly.
    breakStore = true;
    click(firstUnwatched());
    ok(await until(() => /CLOUD COPY NOT SAVING/.test(text())), 'CA-009: when saving fails, the warning banner appears');
    ok(/Last saved to the cloud: /.test(text()), 'CA-009a: and it says when the cloud copy last saved', (text().match(/CLOUD COPY NOT SAVING[^\u2601]{0,200}/) || [''])[0]);
    click(button('Load'));
    ok(await until(() => /The cloud copy is NOT saving/.test(text())), 'CA-009d: while it is not saving, Load asks first');
    click(button('Cancel'));
    breakStore = false;
    ok(await afterSave(() => click(firstUnwatched())), 'CA-009b: the next change after the store recovers saves');
    await until(() => !/CLOUD COPY NOT SAVING/.test(text()));
    ok(!/CLOUD COPY NOT SAVING/.test(text()), 'CA-009c: and the banner goes');

    // 10. Only one ledger's pieces are ever in the store.
    const pieces = [...store.docs.keys()].filter(k => k.startsWith('ledgerParts/'));
    ok(pieces.length === 1, 'CA-010: after all of that, the store holds one live ledger\u2019s pieces, not a pile', String(pieces.length));

    const real = shouted.filter(x => !/not wrapped in act|testing environment is not configured/.test(x));
    ok(real.length === 0, 'CA-011: nothing written to the console as an error throughout', real.slice(0, 2).join(' | '));
  } catch (e) {
    fail++; console.log('FAIL  cloud_app crashed — ' + (e && (e.stack || e.message)));
  } finally {
    try { await act(async () => root.unmount()); } catch {}
    console.error = realError;
    win.close();
  }
  console.log(`\ncloud_app: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
