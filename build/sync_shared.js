#!/usr/bin/env node
/*
 * sync_shared.js — re-take the summary examples, then join the page.
 *
 * The scraper's rules are no longer copied into the app: the join writes them from the scraper's
 * own files (build/shared_from_scraper.js, build/app_join.js). The one thing still stored in the
 * part app/foundations/shared_with_scraper.jsx is SUMMARY_EXAMPLES — the sweep's own example
 * pairs (compress_cli.js examplesText), which are sweep data on disk, not rules. They change with
 * every sweep, so build/build_app.js runs this before every build and a published page always
 * carries the current set.
 *
 *   node build/sync_shared.js     re-take the examples into the part, then `node build/app_join.js`
 *
 * To see whether the page is up to date with the scraper's rules: `node build/app_join.js --check`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { partFiles } = require('./app_join.js');
const { OPEN, CLOSE, DIRECTIVE, examplesBlock } = require('./shared_from_scraper.js');

const APP = path.join(__dirname, '..', 'app');
function die(m) { console.error('sync_shared: ' + m); process.exit(1); }

if (process.argv.slice(2).some(a => a !== '--examples')) die('the only job left is re-taking the examples; to check the page against the scraper run `node build/app_join.js --check`.');

const holders = partFiles(APP).filter(f => fs.readFileSync(path.join(APP, f), 'utf8').includes(DIRECTIVE + '\n'));
if (holders.length !== 1) die((holders.length ? 'more than one part holds' : 'no part under app/ holds') + ' the directive ' + DIRECTIVE + (holders.length ? ': ' + holders.join(', ') : ''));
const PART = path.join(APP, holders[0]);
const jsx = fs.readFileSync(PART, 'utf8');
const lines = jsx.split('\n');
const d = lines.indexOf(DIRECTIVE), c = lines.indexOf(CLOSE);
if (lines.indexOf(OPEN) < 0 || d < 0 || c < d) die('app/' + holders[0] + ' has lost its markers or its directive line.');
// Between the directive and the closing marker sits the examples line, nothing else.
lines.splice(d + 1, c - d - 1, examplesBlock());
fs.writeFileSync(PART, lines.join('\n'));
console.log('sync_shared: examples re-taken into app/' + holders[0] + '.');
execFileSync('node', [path.join(__dirname, 'app_join.js')], { stdio: 'inherit' });
