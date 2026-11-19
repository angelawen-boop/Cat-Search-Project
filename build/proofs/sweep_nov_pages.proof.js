#!/usr/bin/env node
/*
 * sweep_nov_pages.proof.js — the 19 Nov run's fixes (scraper/fixtures/sweep_nov_pages.js) proven by planted
 * faults: each recipe rule undone in a copy of the scraper, each caught by its own check; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove sweep_nov_pages
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { proof } = require('./kit.js');

const P = proof("the 19 Nov run's fixes");
// The saved pages live in docs/, which the copy leaves out: linked, read only.
fs.symlinkSync(path.join(__dirname, '..', '..', 'docs'), path.join(P.root, 'docs'));
const TEST = 'scraper/fixtures/sweep_nov_pages.js';
const check = () => P.run([P.file(TEST)]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const own = id => new RegExp(`^FAIL  ${id}:`);

P.control('NP-00', 'the fixes as written', [], check, /sweep_nov_pages: all passed/);
P.fault('NP-01', "the Louvre's new address not read", [[SP, once(`, a[href*="/what-s-on/exhibitions/"]'`, `'`)]], check, own('NV-01'));
P.fault('NP-02', "the Wallace's new grid not read", [[SP, once(`within: ['.c-body-promos', '.section-listing'] },`, `within: ['.c-body-promos'] },`)]], check, own('NV-02'));
P.fault('NP-03', "the Wallace's whole page read, header menu and all", [[SP, once(`within: ['.c-body-promos', '.section-listing'] },`, `},`)]], check, own('NV-03'));
P.fault('NP-04', 'Tate Modern sessions taken as shows', [[SP, once(`.test(href) || tateSession('tate-modern')(href),`, `.test(href),`)]], check, own('NV-04'));
P.fault('NP-05', 'Tate Modern shows taken as sessions', [[SP, once("const tateSession = gallery => href => new RegExp(`/whats-on/${gallery}/[^/?#]+/[^/?#]+`).test(href);", "const tateSession = gallery => href => new RegExp(`/whats-on/${gallery}/[^/?#]+`).test(href);")]], check, own('NV-05'));
P.fault('NP-06', "Brera's label with its break inside the bold not recognised", [[SP, once(`|| (last && last.nodeName === 'BR')`, ``)]], check, own('NV-06'));
P.fault('NP-07', "Brera's info block skipped past instead of ending the text", [[SP, once(`if (STOPLABEL && STOPLABEL.test(c)) break;`, `if (STOPLABEL && STOPLABEL.test(c)) continue;`)]], check, own('NV-07'));
P.fault('NP-08', "KHM's address box kept", [[SP, once(`noise: 'infobox|exhibitionlist',`, `noise: 'exhibitionlist',`)]], check, own('NV-08'));
P.fault('NP-09', "KHM's blurb kept", [[SP, once(`noise: 'infobox|exhibitionlist',`, `noise: 'infobox',`)]], check, own('NV-09'));
P.fault('NP-10', "the National Gallery's ticket line kept", [[SP, once(`|Tickets are required\\b/,`, `/,`)]], check, own('NV-11'));
P.fault('NP-11', "the Uffizi's ticket prices kept", [[SP, once(`dropSentence: /[^.!?]*\\b\\d+[- ]euros?\\b|[^.!?]*\\btickets? online\\b/,`, ``)]], check, own('NV-12'));
P.fault('NP-12', "Lévy Gorvy Dayan's weekly hours kept", [[SP, once(`    dropSentence: /[^.!?]*\\bevery (?:`, `    dropSentence: /NEVER(?:`)]], check, own('NV-13'));
P.fault('NP-13', "Tate's funders' paragraph kept", [[SP, was => was.replace(/creditPara: TATE_CREDIT,/g, '')]], check, own('NV-14'));
P.fault('NP-15', "Tate's commission credit kept", [[SP, once(`|\\bcommissioned by\\b[^.!?]*\\bsupported by\\b/;`, `/;`)]], check, own('NV-17'));
P.fault('NP-16', "the Rijksmuseum's \"Thanks to\" block kept", [[SP, once(`    noise: 'logo-block',\n`, ``)]], check, own('NV-18'));
P.done();
