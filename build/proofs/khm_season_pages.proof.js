#!/usr/bin/env node
/*
 * khm_season_pages.proof.js — KHM's season-named section (scraper/fixtures/khm_season_pages.js) proven by planted
 * faults: the old one-season scope, and no scope at all, each caught by its own check; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove khm_season_pages
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { proof } = require('./kit.js');

const P = proof("KHM's season-named section");
// The saved page lives in docs/, which the copy leaves out: linked, read only.
fs.symlinkSync(path.join(__dirname, '..', '..', 'docs'), path.join(P.root, 'docs'));
const check = () => P.run([P.file('scraper/fixtures/khm_season_pages.js')]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };

P.control('KP-00', 'the fix as written', [], check, /khm_season_pages: all passed/);
P.fault('KP-01', "only the summer section's name read", [[SP, once(`'[id^="the-great-"][id$="-exhibition"]'`, `'#the-great-summer-exhibition'`)]], check, /^FAIL  KS-01:/);
P.fault('KP-02', 'the whole page read, permanent collections and all', [[SP, once(`within: ['#special-exhibitions', '[id^="the-great-"][id$="-exhibition"]'] },`, `},`)]], check, /^FAIL  KS-02:/);
P.done();
