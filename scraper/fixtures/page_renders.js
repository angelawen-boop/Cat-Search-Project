/**
 * DOES THE APP ACTUALLY DRAW ITSELF?
 *
 * WHY THIS EXISTS. `page_loads.js` asks whether the file evaluates, and says
 * in its own header that it can never catch a black screen: on 20 Sep it
 * passed twice while the published page was blank, because the palette had
 * been rewritten to define itself (`drawer: C.drawer`) — valid syntax, throws
 * on the FIRST RENDER and not on load. She found both, after being told the
 * first was fixed.
 *
 * So this one builds the page the way the build does, hands it a real browser
 * environment (jsdom), renders the component, runs its effects, and reads the
 * result back out of the document. A throw anywhere in that is a black screen,
 * and it is caught here rather than by her.
 *
 * It renders TWICE, because the page has two homes and one of them was the
 * whole point of the 20 Sep work:
 *   1. as a plain page, with no Claude runtime present at all;
 *   2. as her published artifact, with the runtime answering.
 * A fault in a capability path — Export, the connector, the sweep-log store —
 * is invisible in pass one.
 *
 * WHAT IT STILL CANNOT DO. It does not click anything, so a button that throws
 * when pressed is not covered. It renders the OPENING screen. That is the
 * screen a black page is, which is what this is for.
 *
 *   node scraper/fixtures/page_renders.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch_v10.2_haiku.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-render-'));

// The same preparation the real build does, so this renders what SHIPS rather
// than a second, friendlier version of it. Kept identical to page_loads.js on
// purpose: two checks disagreeing about what the build is would be worse than
// one check.
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);

try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'],
    { stdio: 'pipe' });
} catch { /* tsc reports type errors it cannot fix; the emit is what matters */ }

const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) {
  console.log('FAIL  the page did not transpile');
  process.exit(1);
}
const code = fs.readFileSync(built, 'utf8');

const { JSDOM } = require('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react');

let failures = 0;
function fail(msg) { console.log('FAIL  ' + msg); failures++; }
function pass(msg) { console.log('PASS  ' + msg); }

// A capability stub answers the way the runtime does — a rejected promise is a
// refusal, an absent runtime is a plain page. Neither may reach the screen as a
// throw, and the difference between them is exactly what pass two is for.
function claudeRuntime(seen) {
  const store = new Map();
  const doc = key => ({
    get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
    set: async v => { store.set(key, v); },
  });
  return {
    use: async name => {
      seen.push(name);
      if (name === 'db') return { doc };
      if (name === 'downloads') return { save: async () => ({ ok: true }) };
      return null;
    },
    complete: async () => '',
  };
}

async function renderOnce(label, withRuntime) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://claude.ai/' });
  const win = dom.window;
  const seen = [];
  if (withRuntime) win.claude = claudeRuntime(seen);

  // React reads these off the global scope, not off a window it is handed.
  const globals = ['window', 'document', 'navigator', 'localStorage',
    'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver',
    'Node', 'Element', 'HTMLElement', 'Event', 'CustomEvent', 'getComputedStyle'];
  const saved = {};
  for (const k of globals) {
    saved[k] = global[k];
    try { global[k] = win[k]; } catch {}
  }
  global.IS_REACT_ACT_ENVIRONMENT = true;

  // An error React catches and re-throws is still a black screen, so anything
  // written to the console during a render counts as a failure here.
  const shouted = [];
  const realError = console.error;
  console.error = (...a) => shouted.push(String(a[0]));

  let root;
  try {
    const App = new Function('React', 'window', 'document', 'localStorage',
      code + '\n;return App;')(React, win, win.document, win.localStorage);
    if (typeof App !== 'function') { fail(label + ': the page defines no App'); return; }

    root = createRoot(win.document.getElementById('root'));
    await act(async () => { root.render(React.createElement(App)); });
    // Effects that fetch settle a tick later; the sweep-log read is one.
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const text = win.document.getElementById('root').textContent || '';
    if (text.trim().length < 40) {
      fail(label + ': it rendered, but the page is blank (' + text.trim().length + ' characters)');
    } else if (!/Import/i.test(text)) {
      fail(label + ': the opening screen has no Import control — got: '
           + text.trim().slice(0, 120));
    } else {
      pass(label + ': renders, ' + text.trim().length + ' characters on the opening screen');
    }

    if (withRuntime && !seen.includes('db')) {
      fail(label + ': the page never asked the runtime for its sweep-log store, '
           + 'so this pass tested nothing the plain-page pass did not');
    } else if (withRuntime) {
      pass(label + ': asked the runtime for ' + [...new Set(seen)].join(', '));
    }

    // AN EMPTY SWEEP LOG MUST SAY SO ON SCREEN — her finding, 21 Sep, caught
    // by emptying the page's store and reloading her export.
    //
    // Two faults, one silence. The headline read a date kept in her LEDGER and
    // stamped when she last pressed Apply, so a wiped store still showed a
    // confident time that no sweep had happened at; and the "By venue" control
    // only appeared when there was something to list, so the wipe removed the
    // control itself and nothing on the page said anything was missing.
    //
    // Both are asserted here rather than in a unit case because both are about
    // what the OPENING SCREEN says with nothing loaded, which is the one thing
    // a lifted-out function cannot answer. This render carries no sweep log.
    if (!/Last swept:\s*never/i.test(text)) {
      fail(label + ': with an empty sweep log the page does not say "Last swept: never" '
           + '\u2014 it is asserting a date nothing swept at. Got: '
           + (text.match(/Last swept:[^A-Z]{0,30}/i) || ['(the line is absent)'])[0]);
    } else {
      pass(label + ': empty sweep log reads "never" rather than a made-up date');
    }
    if (!/By venue/i.test(text)) {
      fail(label + ': the "By venue" control is missing with an empty sweep log, '
           + 'so nothing on screen can report that the store holds nothing');
    } else {
      pass(label + ': the "By venue" control is there to be opened when empty');
    }

    // The ground has to be painted, or a dark-mode machine keeps a cream page.
    if (!win.document.documentElement.getAttribute('data-theme')) {
      fail(label + ': no theme was set on the page, so the shell keeps its own colours');
    } else {
      pass(label + ': theme applied — ' + win.document.documentElement.getAttribute('data-theme'));
    }
  } catch (e) {
    fail(label + ': it throws while rendering — ' + (e && e.message));
  } finally {
    try { if (root) await act(async () => root.unmount()); } catch {}
    console.error = realError;
    for (const k of globals) {
      // Some of these are getter-only on the Node global; putting them back is
      // best effort, and failing to is not the app's fault.
      try { if (saved[k] === undefined) delete global[k]; else global[k] = saved[k]; } catch {}
    }
    delete global.IS_REACT_ACT_ENVIRONMENT;
    win.close();
  }

  const real = shouted.filter(m => !/not wrapped in act|ReactDOMTestUtils/.test(m));
  if (real.length) fail(label + ': React complained — ' + real[0].slice(0, 160));
}

(async () => {
  await renderOnce('plain page', false);
  await renderOnce('published artifact', true);
  console.log(failures ? failures + ' failed' : 'the app renders in both homes');
  process.exit(failures ? 1 : 0);
})();
