#!/usr/bin/env node
/*
 * build_shelf.js — turn Theme_Shelf.jsx into the page she opens (docs/themes.md).
 *
 * The same steps as build_app.js, for the shelf's own page: run sync_shelf.js --check
 * (the shared ISBN, bookseller and saved-page code must match Cat Watch's), transpile,
 * wrap in the shell below, prove it parses, write build/dist/theme_shelf.html.
 *
 * The shell is written here: Cat Watch's ground and ink, defined on :root so the page
 * paints before React runs, in both themes. Fonts load from the component, as Cat Watch's do.
 *
 * Usage: node build/build_shelf.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JSX = path.join(ROOT, 'Theme_Shelf.jsx');
const OUT = path.join(__dirname, 'dist', 'theme_shelf.html');
const PAGE = 'https://claude.ai/artifact/V5jWKh9F8cFqNQek2owyzT';

function die(m) { console.error('BUILD FAILED — ' + m); process.exit(1); }

try { execFileSync('node', [path.join(__dirname, 'sync_shelf.js'), '--check'], { stdio: 'pipe' }); }
catch (e) { die(String(e.stderr || e.stdout || e.message).trim()); }

// Prepared exactly as the shelf's render check prepares it (scraper/fixtures/theme_shelf.js).
function prepare(src) {
  return 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + src.replace(/^import React.*$/m, '')
         .replace(/^export default function App\(\)\{/m, 'function App(){');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-build-'));
fs.writeFileSync(path.join(tmp, 'app.tsx'), prepare(fs.readFileSync(JSX, 'utf8')));
try {
  execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
    '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
} catch { /* tsc reports type errors it cannot fix; the EMIT is what matters */ }
const built = path.join(tmp, 'app.js');
if (!fs.existsSync(built)) die('the page did not transpile at all');
const js = fs.readFileSync(built, 'utf8').replace(/\n*$/, '\n')
  + 'ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));\n';
try { new Function(js); } catch (e) { die('the built page does not parse — ' + e.message); }
if (!/function App\(/.test(js)) die('the built page has no App component in it');

const HEAD = `<title>Theme Shelf</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  /* Cat Watch's ground (her decision: the shelf is part of the same app). The component
     sets data-theme on <html> when it mounts; until then the machine's preference decides. */
  :root { --ground: #E8E4DE; --ink: #1E1B18; color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --ground: #1A1815; --ink: #EDE8E0; color-scheme: dark; }
  }
  :root[data-theme="dark"]  { --ground: #1A1815; --ink: #EDE8E0; color-scheme: dark; }
  :root[data-theme="light"] { --ground: #E8E4DE; --ink: #1E1B18; color-scheme: light; }
  html, body { min-height: 100%; }
  body { margin: 0; background: var(--ground); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HEAD + js + '</script>\n');
console.log('built ' + path.relative(ROOT, OUT) + ' — ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB, parses, App present.');
console.log('Publish: Artifact file_path "build/dist/theme_shelf.html"' + (PAGE.endsWith('/') ? ' (first publish: no url).' : ' url "' + PAGE + '".'));

