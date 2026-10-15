#!/usr/bin/env node
// Prints each venue's shop shelf and search address from MUSEUMS in Cat_Watch.jsx.
// The code is the one copy; docs/app.md §1 points here.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'Cat_Watch.jsx'), 'utf8');
const start = src.indexOf('const MUSEUMS');
const end = src.indexOf('\n];', start);
const entries = src.slice(start, end).split(/\n(?=\s*\{\s*id:")/).slice(1);
const rows = entries.map((e) => {
  const get = (k) => (new RegExp('\\b' + k + ':"([^"]*)"').exec(e) || [])[1] || '—';
  return [get('id'), get('shopCatalogues'), get('shopSearch')];
});
const w = Math.max(...rows.map((r) => r[0].length), 5);
console.log('Venue'.padEnd(w), ' Catalogue shelf  |  Search box');
for (const [id, shelf, search] of rows) console.log(id.padEnd(w), ' ', shelf, ' | ', search);
