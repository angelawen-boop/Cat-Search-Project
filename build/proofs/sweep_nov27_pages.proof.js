#!/usr/bin/env node
/*
 * sweep_nov27_pages.proof.js — the 27 Nov home run's fixes (scraper/fixtures/sweep_nov27_pages.js) proven by
 * planted faults: each recipe rule or step undone in a copy of the scraper, each caught by its own check; the
 * clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove sweep_nov27_pages
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { proof } = require('./kit.js');

const P = proof("the 27 Nov home run's fixes");
// The saved pages live in docs/, which the copy leaves out: linked, read only.
fs.symlinkSync(path.join(__dirname, '..', '..', 'docs'), path.join(P.root, 'docs'));
const TEST = 'scraper/fixtures/sweep_nov27_pages.js';
const check = () => P.run([P.file(TEST)]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const own = id => new RegExp(`^FAIL  ${id}:`);

P.control('NQ-00', 'the fixes as written', [], check, /sweep_nov27_pages: all passed/);
P.fault('NQ-01', "Menil's text not stopped at its Support heading", [[SP, once(`    descriptionUntil: /^Support\\b/,\n`, ``)]], check, own('N27-01'));
P.fault('NQ-02', "Menil's curator credit kept", [[SP, once(`    creditPara: /^[^.]{0,160}\\b(?:is|was) (?:co-)?curated by\\b/,\n`, ``)]], check, own('N27-02'));
P.fault('NQ-03', "Cincinnati's \"Curated by\" paragraph kept", [[SP, once(`|Curated by\\b)/,`, `)/,`)]], check, own('N27-04'));
P.fault('NQ-04', "Cincinnati's sponsor line kept", [[SP, once(`|[^.!?]*\\bis made possible by\\b`, ``)]], check, own('N27-05'));
P.fault('NQ-05', "Cincinnati's Special Features page read as a listing of shows", [[SP, once(`    notShows: { path: '/art/exhibitions/special-features/', ctx: 'special features', label: 'special feature' },\n`, ``)]], check, own('N27-06'));
P.fault('NQ-06', 'a kept name not dropped from the listing', [[SP, once(`  if (notShows) {\n    const kept = rows.filter(`, `  if (false) {\n    const kept = rows.filter(`)]], check, own('N27-07'));
P.fault('NQ-07', 'every show dropped, not only the kept names', [[SP, once(` || !notShows.names.has(notShowKey(r.title))) return true;`, `) return true;`)]], check, own('N27-08'));
P.fault('NQ-08', 'the names kept by earlier sweeps forgotten', [[SP, once(`  const kept = readNotShows(code), have = `, `  const kept = { names: [] }, have = `)]], check, own('N27-10'));
P.done();
