#!/usr/bin/env node
/*
 * mfab_pages.proof.js — the Budapest recipe's saved-page test (scraper/fixtures/mfab_pages.js) proven by planted
 * faults: each recipe line undone, each caught by its own check; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove mfab_pages
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { proof } = require('./kit.js');

const P = proof('the Budapest recipe on its saved pages');
// The saved pages live in docs/, which the copy leaves out: linked, read only.
fs.symlinkSync(path.join(__dirname, '..', '..', 'docs'), path.join(P.root, 'docs'));
const check = () => P.run([P.file('scraper/fixtures/mfab_pages.js')]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };

P.control('MP-00', 'the recipe as written', [], check, /mfab_pages: all passed/);
P.fault('MP-01', 'the permanent rooms read too', [[SP, once(`within: ['.components-v2-section--exhibition-large', '.components-v2-section--previous-exhibitions'] },`, `},`)]], check, /^FAIL  MB-002:/m);
P.fault('MP-02', "the current card's dates left on its name", [[SP, once(`stripTrailing: /\\s+\\d{1,2}\\s+[A-Za-z]+\\.?\\s+\\d{4}\\s*[\\u2013\\u2014-].*$/,`, ``)]], check, /^FAIL  MB-003:/m);
P.fault('MP-04', '"prolonged until" not read', [[SP, once(`t.replace(/\\s+prolonged until\\s+/i, ' ')`, `t`)]], check, /^FAIL  MB-005:/m);
P.fault('MP-05', 'the Hungarian month not read', [[SP, once(`.replace(/\\bSzeptember\\b/g, 'September')`, ``)]], check, /^FAIL  MB-006:/m);
P.fault('MP-06', 'the caption box read as noise', [[SP, once(`noiseExempt: 'custom-caption-container',`, ``)]], check, /^FAIL  MB-007:/m);
P.fault('MP-07', 'credits and notices kept', [[SP, once(`creditPara: /^(?:\\/\\/\\s*)?(?:The exhibition (?:can be visited`, `creditPara_off: /^(?:\\/\\/\\s*)?(?:The exhibition (?:can be visited`)]], check, /^FAIL  MB-009:/m);
P.done();
