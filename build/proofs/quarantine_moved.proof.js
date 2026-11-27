#!/usr/bin/env node
/*
 * quarantine_moved.proof.js — quarantine following a show its venue moved, and only that show
 * (scraper/fixtures/quarantine_moved.js), proven by planted faults in a copy of the app's parts, joined into the
 * copy's page; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove quarantine_moved
 */
'use strict';
const { proof } = require('./kit.js');

const P = proof('quarantine follows a moved show');
const TEST = 'scraper/fixtures/quarantine_moved.js';
const CSV = 'app/import/csv.jsx';
const Q = 'app/logs/quarantine.jsx';
// The harness reads the joined page, so each planted fault is joined into the copy first.
const check = () => {
  const j = P.run([P.file('build/app_join.js')]);
  if (j.status !== 0) return { status: 2, out: 'join failed\n' + j.out };
  return P.run([P.file(TEST)]);
};
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const own = id => new RegExp(`^FAIL  ${id}:`);

P.control('QP-00', 'the rule as written', [], check, /quarantine_moved: all passed/);
P.fault('QP-01', 'a moved show not looked for', [[CSV, once(`    if(movedFromQuarantine(opts&&opts.quarantined,vc,title,sd,ed)){`, `    if(false){`)]], check, own('QM-01'));
P.fault('QP-02', 'its new address not handed back', [[CSV, once(`      moved[ignoreKeyFor(vc,url,title)]=`, `      ({})[0]=`)]], check, own('QM-02'));
P.fault('QP-03', 'the dates not compared', [[CSV, once(`&&dateRangesOverlap({startDate:sd,endDate:ed},q))`, `)`)]], check, own('QM-03'));
P.fault('QP-04', 'an undated entry matched on its name', [[CSV, once(`q.venueId===vc&&q.startDate&&q.endDate&&normalizeTitle(q.title)===normalizeTitle(title)&&dateRangesOverlap({startDate:sd,endDate:ed},q)`, `q.venueId===vc&&normalizeTitle(q.title)===normalizeTitle(title)&&(!q.startDate||dateRangesOverlap({startDate:sd,endDate:ed},q))`)]], check, own('QM-04'));
P.fault('QP-05', 'the venue not compared', [[CSV, once(`q.venueId===vc&&q.startDate`, `q.startDate`)]], check, own('QM-05'));
P.fault('QP-06', 'the dates lost to a copy without them', [[Q, once(`const keep=(w,o)=>({...w,...quarantineDates(w.startDate?w:o||{})});`, `const keep=(w,o)=>({...w});`)]], check, own('QM-06'));
P.fault('QP-07', 'the list she sees drops the dates', [[Q, once(`.map(([key,v])=>({key,venueId:v.venueId,title:v.title,...quarantineDates(v),at:v.at}))`, `.map(([key,v])=>({key,venueId:v.venueId,title:v.title,at:v.at}))`)]], check, own('QM-07'));
P.done();
