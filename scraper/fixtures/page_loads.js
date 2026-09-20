/**
 * DOES THE APP'S CODE LOAD AT ALL?
 *
 * WHY THIS EXISTS. Dark mode named every colour in the file, and one blanket
 * replacement reached a table that sits OUTSIDE the component — `C.okEdge` in
 * the light tier colours, where the palette does not exist yet. Perfectly valid
 * syntax. Instant ReferenceError on load. A BLACK SCREEN, which she found, not
 * a test.
 *
 * The JSX check passed, and it was right to: `tsc --noEmit` answers "does this
 * parse", and the fault was at load time. The whole unit suite passed too, and
 * it was right to: it tests pure functions lifted out of the file, never the
 * file as a program. Nothing in this repo asked the one question a blank page
 * is the answer to.
 *
 * So this evaluates the transpiled page with React stubbed and reports whether
 * the module body survives. It does not render anything and it is not trying
 * to: every failure of this kind so far has been a reference that does not
 * exist yet when the line runs.
 *
 * WHAT IT DOES NOT DO, AND THIS MATTERS: IT NEVER RENDERS THE COMPONENT. It
 * evaluates the module body and checks App exists. On 20 Sep it passed while
 * the published page was a BLACK SCREEN — the palette had been rewritten to
 * define itself (drawer: C.drawer), which throws on the first render and not
 * on load. She found that one too, after I told her it was fixed.
 *
 * So this is a floor, not a guarantee, and a green line from it means only
 * that the file evaluates. `page_renders.js` beside it is the real check —
 * her call, 20 Sep, to let the repo carry react, react-dom and jsdom for it.
 * This one is kept because it is the cheaper question and it still isolates
 * a load-time fault from a render-time one.
 *
 *   node scraper/fixtures/page_loads.js            builds and checks
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', '..', 'Cat_Watch_v10.2_haiku.jsx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-load-'));

// The same preparation the real build does, so this checks what SHIPS rather
// than a second, friendlier version of it.
const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
  + fs.readFileSync(JSX, 'utf8')
      .replace(/^import React.*$/m, '')
      .replace(/^export default function App\(\)\{/m, 'function App(){');
const tsx = path.join(tmp, 'app.tsx');
fs.writeFileSync(tsx, prepared);

try {
  execFileSync('npx', ['tsc', tsx, '--jsx', 'react', '--target', 'esnext',
    '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* tsc reports type errors it cannot fix; the emit is what matters */ }

const out = path.join(tmp, 'app.js');
if (!fs.existsSync(out)) {
  console.log('FAIL  the page did not transpile');
  process.exit(1);
}

const React = {
  createElement: () => ({}), useState: () => [null, () => {}], useEffect: () => {},
  useMemo: f => f(), useCallback: f => f, useRef: () => ({ current: null }),
};

try {
  const kind = new Function('React', 'window', 'document', 'localStorage',
    fs.readFileSync(out, 'utf8') + '\n;return typeof App;')(
    React,
    { matchMedia: () => ({ matches: false }) },
    { documentElement: { style: {}, setAttribute() {} }, body: { style: {} } },
    { getItem: () => null, setItem() {} });
  if (kind !== 'function') {
    console.log('FAIL  the page loaded but defines no App');
    process.exit(1);
  }
  console.log('PASS  the page loads and defines App');
} catch (e) {
  console.log('FAIL  the page throws on load: ' + e.message);
  process.exit(1);
}
