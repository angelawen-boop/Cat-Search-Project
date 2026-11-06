#!/usr/bin/env node
// Prints each swept venue's shop shelf and search address from the venue register (venues/register.js).
// The register is the one copy; docs/app.md §1 points here.
const { VENUES } = require('../venues/register.js');

const rows = VENUES.filter(v => v.kind === 'swept').map(v => [v.id, v.shop.catalogues || '—', v.shop.search || '—']);
const w = Math.max(...rows.map((r) => r[0].length), 5);
console.log('Venue'.padEnd(w), ' Catalogue shelf  |  Search box');
for (const [id, shelf, search] of rows) console.log(id.padEnd(w), ' ', shelf, ' | ', search);
