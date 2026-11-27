#!/usr/bin/env node
/*
 * fact_check.proof.js — the one-place check (build/fact_check.js) proven by planted faults: a venue fact
 * written outside the register, in every way the check looks for it and in every kind of file it reads,
 * a copy of the recipes' sweep plan (who is headed, on her laptop, the container's), and a sentence, rule or list
 * written twice in the app's parts — each caught by its own rule; and the
 * changes it must let through, let through.
 * Run through the watched runner: node scraper/run_tests.js --prove fact_check
 */
'use strict';
const path = require('path');
const { proof, addPiece } = require('./kit.js');
const { sweepPlan } = require('../fact_check.js');

const P = proof('the one-place check');
const check = () => P.run([path.join(__dirname, '..', 'fact_check.js'), '--root', P.root]);
const writes = (file, id, key) => new RegExp('^FAIL  ' + file.replace(/[./]/g, '\\$&') + ':\\d+ writes ' + id + "'s " + key + ' — a venue\'s facts live in venues/register\\.js');
const keyed = file => new RegExp('^FAIL  ' + file.replace(/[./]/g, '\\$&') + ':\\d+ keys facts by venue');
const twice = kind => new RegExp('^FAIL  a ' + kind + ' written 2 times \\(app/');
const SENTENCE = 'The planted sentence that is long enough to count.';   // 50 characters
const RULE = '/planted[- ]rule,? long enough (to|for) count/';        // 41 characters

P.control('FC-00', 'the project as it is', [], check, /^PASS  facts/m);

// 1. A venue fact beside its id, each fact the check knows, in an app part.
const FACT_KEYS = ['name', 'short', 'card', 'chip', 'city', 'country', 'shopHome', 'shopCatalogues', 'shopSearch', 'lookupName'];
FACT_KEYS.forEach((k, i) => P.fault('FC-' + String(i + 1).padStart(2, '0'), `an app part writes a venue's ${k} beside its id`,
  [['app/lookup/shop.jsx', addPiece('plantedVenue', `const plantedVenue = { id: "met", ${k}: "planted" };`)]], check, writes('app/lookup/shop.jsx', 'met', k)));
// … in the other kinds of file it reads.
P.fault('FC-11', "a scraper file writes a venue's city beside its id",
  [['scraper/planted_facts.js', 'module.exports = { id: "ng", city: "London" };\n']], check, writes('scraper/planted_facts.js', 'ng', 'city'));
P.fault('FC-12', "a build file writes a venue's shop beside its id",
  [['build/planted_facts.js', 'module.exports = { id: "frick", shopHome: "https://shop.example.org/" };\n']], check, writes('build/planted_facts.js', 'frick', 'shopHome'));
P.fault('FC-13', "a test file not on the allowed list writes a venue's name",
  [['scraper/fixtures/planted_fixture.js', 'const x = { id: "morgan", name: "The Morgan" };\n']], check, writes('scraper/fixtures/planted_fixture.js', 'morgan', 'name'));
// 2. Keyed by venue: a record with a fact field, a list of names, a table of four venues' words.
P.fault('FC-14', 'an app part keeps a record per venue with a fact field',
  [['app/import/link_venues.jsx', addPiece('plantedByVenue', 'const plantedByVenue = { met: { city: "New York" } };')]], check, keyed('app/import/link_venues.jsx'));
P.fault('FC-15', 'an app part keeps a list of names per venue',
  [['app/import/link_venues.jsx', addPiece('plantedNames', 'const plantedNames = { ng: ["National Gallery", "NG"] };')]], check, keyed('app/import/link_venues.jsx'));
P.fault('FC-16', "an app part keeps a table of four venues' words",
  [['app/import/link_venues.jsx', addPiece('plantedTable', 'const plantedTable = { met: "en", ng: "en", frick: "en", morgan: "en" };')]], check, keyed('app/import/link_venues.jsx'));
// 3. A sweep recipe writing what belongs in the register, each field the check knows.
const RECIPE_KEYS = ['name', 'city', 'locations', 'locationOwner', 'shopHome', 'shopCatalogues', 'shopSearch'];
RECIPE_KEYS.forEach((k, i) => P.fault('FC-' + (17 + i), `the Met's sweep recipe writes its ${k}`,
  [['scraper/sweep_prototype.js', was => was.replace('const VENUES = {\n  met: {\n', `const VENUES = {\n  met: {\n    ${k}: "planted",\n`)]], check,
  new RegExp('^FAIL  scraper/sweep_prototype\\.js:\\d+ the met recipe writes its ' + k + ' — a venue')));
// 4. Written twice in the app's parts: a sentence, a rule, a list.
P.fault('FC-24', 'a sentence written in two parts',
  [['app/ledger/marks.jsx', addPiece('plantedA', `// Not words: planted.\nconst plantedA = "${SENTENCE}";`)],
   ['app/periods/periods.jsx', addPiece('plantedB', `// Not words: planted.\nconst plantedB = "${SENTENCE}";`)]], check, twice('sentence'));
P.fault('FC-25', 'a rule written in two parts',
  [['app/ledger/marks.jsx', addPiece('plantedA', `const plantedA = ${RULE};`)], ['app/periods/periods.jsx', addPiece('plantedB', `const plantedB = ${RULE};`)]], check, twice('rule'));
P.fault('FC-26', 'a list of four written in two parts',
  [['app/ledger/marks.jsx', addPiece('plantedA', 'const plantedA = ["qa", "qb", "qc", "qd"];')], ['app/periods/periods.jsx', addPiece('plantedB', 'const plantedB = ["qa", "qb", "qc", "qd"];')]], check, twice('list'));
P.fault('FC-27', 'a sentence written twice in one part',
  [['app/ledger/marks.jsx', addPiece('plantedA', `// Not words: planted.\nconst plantedA = ["${SENTENCE}", "${SENTENCE}"];`)]], check, /^FAIL  a sentence written 2 times \(app\/ledger\/marks\.jsx:\d+, app\/ledger\/marks\.jsx:\d+\)/);

// 5. A copy of the recipes' sweep plan, read from the copy's own recipes (no list of venues typed here either).
const PLAN = Object.fromEntries(sweepPlan(P.root));
const listOf = (what, order = l => l) => JSON.stringify(order(PLAN[what].split(',')));
const copies = (file, what) => new RegExp('^FAIL  ' + file.replace(/[./]/g, '\\$&') + ':\\d+ copies which venues are ' + what + ' — read it from the recipes');
P.fault('FC-28', 'a test types out the headed venues',
  [['scraper/planted_plan.test.js', `const x = ${listOf('headed')};\n`]], check, copies('scraper/planted_plan.test.js', 'headed'));
P.fault('FC-29', "a fixture types out her laptop's venues, in another order",
  [['scraper/fixtures/planted_plan.js', `const x = ${listOf('swept on her laptop', l => l.reverse())};\n`]], check, copies('scraper/fixtures/planted_plan.js', 'swept on her laptop'));
P.fault('FC-30', "a build file types out the container's venues",
  [['build/planted_plan.js', `module.exports = ${listOf('swept by the container')};\n`]], check, copies('build/planted_plan.js', 'swept by the container'));

P.control('FC-C1', "a test file on the allowed list may hold a venue's record",
  [['scraper/fixtures/add_by_link.js', was => was + '\nconst plantedRecord = { id: "met", name: "The Met" };\n']], check);
P.control('FC-C2', "a table of three venues' words is not a fact table",
  [['app/import/link_venues.jsx', addPiece('plantedThree', 'const plantedThree = { met: "en", ng: "en", frick: "en" };')]], check);
P.control('FC-C3', 'a sentence under 40 characters, a rule under 30 and a list of three may repeat',
  [['app/ledger/marks.jsx', addPiece('plantedA', '// Not words: planted.\nconst plantedA = ["A planted line of thirty-nine letters.", "zq", /planted rule under thirty/, ["qa", "qb", "qc"]];')],
   ['app/periods/periods.jsx', addPiece('plantedB', '// Not words: planted.\nconst plantedB = ["A planted line of thirty-nine letters.", "zq", /planted rule under thirty/, ["qa", "qb", "qc"]];')]], check);
P.control('FC-C4', 'a copy on the known list is set aside',
  [['app/ledger/marks.jsx', addPiece('plantedA', `// Not words: planted.\nconst plantedA = "${SENTENCE}";`)],
   ['app/periods/periods.jsx', addPiece('plantedB', `// Not words: planted.\nconst plantedB = "${SENTENCE}";`)],
   ['build/fact_check_known.json', JSON.stringify([{ text: SENTENCE, item: 'planted' }])]], check);
P.control('FC-C5', "a venue's facts in the register itself",
  [['venues/register.js', was => was.replace('{ id: "met", kind: "swept",', '{ id: "met", kind: "swept", lookupName: "planted",')]], check);
P.control('FC-C6', 'a list of some of the headed venues is not a copy of the plan',
  [['scraper/planted_plan.test.js', `const x = ${listOf('headed', l => l.slice(0, 2))};\n`]], check);
P.done();
