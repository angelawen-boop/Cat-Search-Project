/**
 * LINK PROOF CHECK — Add by link's reader against live pages (docs/add_by_link.md,
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
 * lines between title and dates), recased as the card shows it at a venue whose titles
 * are typed in capitals (capsTitles), or the full name below the heading (nameInLines). A page listed with "noDescription" must also give
 * no description. Not part of npm test: it needs live replies.
 *
 * Each page's `rules` — the reader's rules that changed its result (readShowPage's
 * `rules`) — are kept on the list. A page earns its place only with a rule no other page
 * at its venue shows (her decision: one page per venue layout, one per unusual thing).
 * A listed page whose rules changed is reported, not counted as a difference.
 *
 *   --cover        per venue, the fewest pages that between them show every rule seen
 *                  there (kept), and the rest (cut); the list is not changed
 *   --write-rules  write the replies' rules onto the list
 *   --write-passages  write each reply's passage (first and last 60 characters) onto the list
 *   --add          put a reply not on the list onto it, as the reader reads it now, only
 *                  when it shows a rule new at its venue; else say it adds nothing
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
  const React = { createElement() {}, Fragment: null, memo: f => f, useState: () => [], useEffect: hook, useMemo: f => f(), useCallback: f => f, useRef: () => ({}) };
  return new Function('React', 'window', 'document', 'localStorage',
    fs.readFileSync(built, 'utf8') + '\n;return {readShowPage,linkReadVenue,linkVenue,linkOptions,nameInLines,cardTitle};')(React, {}, {}, {});
}

// The passage handed to Claude, as signed off: its first and last 60 characters, so a junk line
// creeping in at the top or the end shows (docs/add_by_link.md, "The passage").
function passageOf(raw) {
  const t = String(raw || '').replace(/\s+/g, ' ').trim();
  return t.length <= 120 ? t : t.slice(0, 60) + ' … ' + t.slice(-60);
}

// One reply read as the card shows it, with the rules it used.
function readReply(reader, res) {
  const rules = [];
  const got = reader.readShowPage(res, res.url, reader.linkReadVenue(res.url), rules);
  const filed = got.ok ? reader.linkVenue(res.url, got) : {};
  const venue = got.ok ? filed.id : null;   // the app's own filing (houses included)
  if (filed.line) rules.push('house-line');
  const inLines = got.ok ? reader.nameInLines(got, venue) : '';
  if (inLines) rules.push('nameInLines');
  const base = got.ok ? (inLines || got.base) : '';
  const title = got.ok ? reader.cardTitle(base, venue) : '';
  if (title !== base) rules.push('caps-recased');
  const row = got.ok ? { title, start: got.start, end: got.end, raw: got.raw } : { title: '', start: '', end: '', why: got.why };
  return { got, venue, row, rules: rules.slice().sort() };
}

// Per venue, the pages kept: each time, the page showing the most rules not yet shown
// (on a tie, the one listed first), until every rule seen at the venue is shown.
function cover(entries) {
  const byVenue = new Map();
  for (const e of entries) byVenue.set(e.venue, (byVenue.get(e.venue) || []).concat(e));
  const keep = new Set();
  for (const es of byVenue.values()) {
    const left = new Set(es.flatMap(e => e.rules));
    keep.add(es[0]);
    for (const t of es[0].rules) left.delete(t);
    while (left.size) {
      let best = null, gain = 0;
      for (const e of es) { const g = e.rules.filter(t => left.has(t)).length; if (g > gain) { best = e; gain = g; } }
      keep.add(best);
      for (const t of best.rules) left.delete(t);
    }
  }
  return keep;
}

function main() {
  const args = process.argv.slice(2);
  const dir = args.find(a => !a.startsWith('--'));
  const all = args.includes('--all');
  const covering = args.includes('--cover'), writeRules = args.includes('--write-rules'), adding = args.includes('--add');
  const writePassages = args.includes('--write-passages');
  if (!dir || !fs.existsSync(dir)) { console.log('usage: node scraper/link_proof_check.js <folder of replies> [--all]'); process.exit(2); }

  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const byUrl = new Map(list.map(e => [e.url, e]));
  const reader = loadReader();
  const seen = new Set();
  let diffs = 0, checked = 0, rulesMoved = 0;
  const added = [];

  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    let res;
    try { res = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { console.log('DIFF  ' + f + ': not JSON'); diffs++; continue; }
    if (!res || !res.url || !(res.full_content || res.content)) { console.log('DIFF  ' + f + ': no url or no page text'); diffs++; continue; }
    const want = byUrl.get(res.url);
    const { got, venue, row, rules } = readReply(reader, res);
    checked++;
    if (!want && adding) {
      const v = venue || reader.linkVenue(res.url, {}).id || '(not read)';
      const shown = new Set(list.concat(added).filter(e => e.venue === v).flatMap(e => e.rules || []));
      const fresh = rules.filter(t => !shown.has(t));
      if (!fresh.length) { console.log('same  ' + f + '  ' + res.url + '\n        every rule it uses is shown by a listed page at ' + v); continue; }
      console.log('        new at ' + v + ': ' + fresh.join(' '));
      const e = { url: res.url, venue: v, title: row.title, start: row.start, end: row.end, passage: passageOf(row.raw), rules };
      added.push(e);
      console.log('ADDED ' + f + '  ' + JSON.stringify(e));
      continue;
    }
    if (!want) { console.log('DIFF  ' + f + ': ' + res.url + ' is not on the list\n        got   ' + JSON.stringify({ venue, title: row.title, start: row.start, end: row.end })); diffs++; continue; }
    seen.add(res.url);
    if (want.rules && want.rules.join(' ') !== rules.join(' ')) {
      rulesMoved++;
      console.log('rules ' + f + '  listed: ' + (want.rules.join(' ') || '-') + '\n        now:    ' + (rules.join(' ') || '-'));
    }
    if (writeRules) want.rules = rules;
    if (writePassages && got.ok) want.passage = passageOf(row.raw);
    want._rules = rules;
    const bad = ['venue', 'title', 'start', 'end'].filter(k => (k === 'venue' ? venue : row[k]) !== want[k]);
    if (!got.ok && want.title) bad.push('why');
    if (want.noDescription && row.raw) bad.push('description');
    if (want.passage !== undefined && got.ok && passageOf(row.raw) !== want.passage) bad.push('passage');
    if (!bad.length) { console.log('ok    ' + f + '  ' + want.venue + '  ' + (row.start || '-') + ' -> ' + (row.end || '-') + '  ' + row.title); continue; }
    diffs++;
    console.log('DIFF  ' + f + '  (' + bad.join(', ') + ')  ' + res.url);
    console.log('        list  ' + JSON.stringify({ venue: want.venue, title: want.title, start: want.start, end: want.end, ...(bad.includes('passage') ? { passage: want.passage } : {}) }));
    console.log('        live  ' + JSON.stringify({ venue, title: row.title, start: row.start, end: row.end, ...(row.why ? { why: row.why } : {}), ...(want.noDescription && row.raw ? { description: row.raw.slice(0, 120) } : {}), ...(bad.includes('passage') ? { passage: passageOf(row.raw) } : {}) }));
  }

  if (covering) {
    const read = list.filter(e => e._rules).map(e => ({ ...e, rules: e._rules }));
    const keep = cover(read);
    console.log('\nCOVER  ' + keep.size + ' kept, ' + (read.length - keep.size) + ' cut, of ' + read.length + ' read:');
    for (const e of read) console.log((keep.has(e) ? '  keep ' : '  cut  ') + e.venue.padEnd(32) + e.url + (e.note ? '   [' + e.note + ']' : ''));
  }
  for (const e of list) delete e._rules;
  if (writeRules || writePassages || added.length) {
    // One page per line, as the list is kept.
    fs.writeFileSync(LIST, '[\n' + list.concat(added).map(e => '  ' + JSON.stringify(e)).join(',\n') + '\n]\n');
    console.log('\nList written' + (added.length ? ': ' + added.length + ' page' + (added.length === 1 ? '' : 's') + ' added' : '') + '.');
  }
  if (rulesMoved) console.log('\n' + rulesMoved + ' listed page' + (rulesMoved === 1 ? '' : 's') + ' now use different rules (not a difference; --write-rules records them).');
  const missing = list.filter(e => !seen.has(e.url));
  if (missing.length && !adding) {
    console.log('\n' + missing.length + ' listed page' + (missing.length === 1 ? '' : 's') + ' with no reply in this folder' + (all ? ' (counted as differences)' : ' (not checked)') + ':');
    for (const e of missing) console.log('  ' + e.url);
    if (all) diffs += missing.length;
  }
  console.log('\n' + checked + ' replies read; ' + (diffs ? diffs + ' difference' + (diffs === 1 ? '' : 's') : 'all match the list') + '.');
  process.exit(diffs ? 1 : 0);
}
main();
