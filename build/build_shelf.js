#!/usr/bin/env node
/*
 * build_shelf.js — turn Theme_Shelf.jsx into the page she opens (docs/theme_shelf.md).
 *
 * The same steps as build_app.js, for the shelf's own page: run sync_shelf.js --check
 * (the shared ISBN, bookseller and saved-page code must match Cat Watch's), transpile,
 * wrap in the shell below, prove it parses, write build/dist/theme_shelf.html.
 *
 * The shell is written here, not copied from Cat Watch: its title, palette and fonts
 * are the shelf's own. Tokens are defined on :root so the page paints its ground
 * before React runs, in both themes.
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

// Layout: a bookshelf grid of covers, like a reading app's library, under a row of theme chips.
const HEAD = `<title>Theme Shelf</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Source+Sans+3:wght@400;600&display=swap">
<style>
  /* Watteau's silvery greens for the ground, a faded silk rose for the accent. */
  :root {
    --ground: #EDF0EB; --paper: #F8FAF6; --ink: #1E2521; --muted: #5C6962;
    --line: #CDD5CE; --accent: #8A4559; --on-accent: #FFFFFF; --warn: #F1E3C9;
    --shadow: rgba(30,37,33,.16); --scrim: rgba(30,37,33,.45);
    --display: "Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif;
    --body: "Source Sans 3", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #141916; --paper: #1D2420; --ink: #E5EBE6; --muted: #9AA8A0;
      --line: #2F3A34; --accent: #D99AAE; --on-accent: #1A1013; --warn: #3A3222;
      --shadow: rgba(0,0,0,.45); --scrim: rgba(0,0,0,.6); color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --ground: #141916; --paper: #1D2420; --ink: #E5EBE6; --muted: #9AA8A0;
    --line: #2F3A34; --accent: #D99AAE; --on-accent: #1A1013; --warn: #3A3222;
    --shadow: rgba(0,0,0,.45); --scrim: rgba(0,0,0,.6); color-scheme: dark;
  }
  html, body { min-height: 100%; }
  body { margin: 0; background: var(--ground); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.45; }
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

