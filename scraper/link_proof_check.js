/**
 * LINK PROOF CHECK — Add by link's reader against live pages (docs/picked_shows.md,
 * "Re-checking the proof pages").
 *
 * Her decision: proof is always against the live internet, so no page text is kept
 * here. docs/link_proof_pages.json lists the proof pages with the title and dates the
 * reader gave when signed off. A session fetches those addresses live through Parallel,
 * saves each reply as {url,title,full_content} in a folder, and this runs the app's real
 * reader (readShowPage, lifted from Cat_Watch.jsx) on each and prints it beside the list.
 * It fetches nothing itself.
 *
 *   node scraper/link_proof_check.js <folder of replies> [--all]
 *
 * Exit 1 on any difference, a reply not on the list, or a page the reader refuses that
 * the list does not expect to fail. --all also fails on a listed page with no reply.
 * The title compared is the reader's own (before any subtitle Claude picks from the
 * lines between title and dates). Not part of npm test: it needs live replies.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const JSX = path.join(__dirname, '..', 'Cat_Watch.jsx');
const LIST = path.join(__dirname, '..', 'docs', 'link_proof_pages.json');

function loadReader() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-proof-'));
  const prepared = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n'
    + fs.readFileSync(JSX, 'utf8')
        .replace(/^import React.*$/m, '')
        .replace(/^export default function App\(\)\{/m, 'function App(){');
  fs.writeFileSync(path.join(tmp, 'app.tsx'), prepared);
  try {
    execFileSync('npx', ['tsc', path.join(tmp, 'app.tsx'), '--jsx', 'react',
      '--target', 'esnext', '--outDir', tmp, '--skipLibCheck', '--allowJs'], { stdio: 'pipe' });
  } catch { /* the emit is what matters */ }
  const built = path.join(tmp, 'app.js');
  if (!fs.existsSync(built)) throw new Error('Cat_Watch.jsx did not transpile');
  const hook = () => {};
  const React = { createElement() {}, Fragment: null, useState: () => [], useEffect: hook, useMemo: f => f(), useCallback: f => f, useRef: () => ({}) };
  return new Function('React', 'window', 'document', 'localStorage',
    fs.readFileSync(built, 'utf8') + '\n;return {readShowPage,knownVenueFor,occVenueId,hostOf};')(React, {}, {}, {});
}

function main() {
  const args = process.argv.slice(2);
  const dir = args.find(a => !a.startsWith('--'));
  const all = args.includes('--all');
  if (!dir || !fs.existsSync(dir)) { console.log('usage: node scraper/link_proof_check.js <folder of replies> [--all]'); process.exit(2); }

  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const byUrl = new Map(list.map(e => [e.url, e]));
  const reader = loadReader();
  const seen = new Set();
  let diffs = 0, checked = 0;

  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    let res;
    try { res = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { console.log('DIFF  ' + f + ': not JSON'); diffs++; continue; }
    if (!res || !res.url || !(res.full_content || res.content)) { console.log('DIFF  ' + f + ': no url or no page text'); diffs++; continue; }
    const want = byUrl.get(res.url);
    const venue = reader.knownVenueFor(res.url) || reader.occVenueId(reader.hostOf(res.url));
    const got = reader.readShowPage(res, res.url, reader.knownVenueFor(res.url));
    const row = got.ok ? { title: got.base, start: got.start, end: got.end } : { title: '', start: '', end: '', why: got.why };
    checked++;
    if (!want) { console.log('DIFF  ' + f + ': ' + res.url + ' is not on the list\n        got   ' + JSON.stringify({ venue, ...row })); diffs++; continue; }
    seen.add(res.url);
    const bad = ['venue', 'title', 'start', 'end'].filter(k => (k === 'venue' ? venue : row[k]) !== want[k]);
    if (!got.ok && want.title) bad.push('why');
    if (!bad.length) { console.log('ok    ' + f + '  ' + want.venue + '  ' + (row.start || '-') + ' -> ' + (row.end || '-') + '  ' + row.title); continue; }
    diffs++;
    console.log('DIFF  ' + f + '  (' + bad.join(', ') + ')  ' + res.url);
    console.log('        list  ' + JSON.stringify({ venue: want.venue, title: want.title, start: want.start, end: want.end }));
    console.log('        live  ' + JSON.stringify({ venue, title: row.title, start: row.start, end: row.end, ...(row.why ? { why: row.why } : {}) }));
  }

  const missing = list.filter(e => !seen.has(e.url));
  if (missing.length) {
    console.log('\n' + missing.length + ' listed page' + (missing.length === 1 ? '' : 's') + ' with no reply in this folder' + (all ? ' (counted as differences)' : ' (not checked)') + ':');
    for (const e of missing) console.log('  ' + e.url);
    if (all) diffs += missing.length;
  }
  console.log('\n' + checked + ' replies read; ' + (diffs ? diffs + ' difference' + (diffs === 1 ? '' : 's') : 'all match the list') + '.');
  process.exit(diffs ? 1 : 0);
}
main();
