#!/usr/bin/env node
/*
 * quarantine_moved.proof.js — quarantine holding a show its venue moved (scraper/fixtures/quarantine_moved.js),
 * proven by planted faults in a copy of the app's parts, joined into the copy's page; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove quarantine_moved
 */
'use strict';
const { proof } = require('./kit.js');

const P = proof('quarantine holds a moved show');
const TEST = 'scraper/fixtures/quarantine_moved.js';
const CSV = 'app/import/csv.jsx';
// The harness reads the joined page, so each planted fault is joined into the copy first.
const check = () => {
  const j = P.run([P.file('build/app_join.js')]);
  if (j.status !== 0) return { status: 2, out: 'join failed\n' + j.out };
  return P.run([P.file(TEST)]);
};
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const own = id => new RegExp(`^FAIL  ${id}:`);

P.control('QP-00', 'the rule as written', [], check, /quarantine_moved: all passed/);
P.fault('QP-01', 'the import checks the address only', [[CSV, once(`||ignoredKeys.has(ignoreKeyFor(vc,"",title))`, ``)]], check, own('QM-01'));
P.fault('QP-02', 'the quarantine hands over its addresses only', [[CSV, once(`x.title&&x.venueId?[x.key,ignoreKeyFor(x.venueId,"",x.title)]:[x.key]`, `[x.key]`)]], check, own('QM-01'));
P.fault('QP-04', 'every row at the venue held back', [[CSV, once(`||ignoredKeys.has(ignoreKeyFor(vc,"",title))`, `||[...ignoredKeys].some(k=>k.startsWith(vc+"|"))`)]], check, own('QM-03'));
P.fault('QP-05', 'the title matched at any venue', [[CSV, once(`||ignoredKeys.has(ignoreKeyFor(vc,"",title))`, `||[...ignoredKeys].some(k=>k.endsWith("|t:"+normalizeTitle(title)))`)]], check, own('QM-04'));
P.done();
