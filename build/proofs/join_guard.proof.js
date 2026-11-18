#!/usr/bin/env node
/*
 * join_guard.proof.js — the hand-edit guard (build/app_join.js --check) proven by planted faults: the page
 * edited by hand, and a part, a scraper rule, the venue register or the recorded order changed without
 * joining again — each caught; parts that cannot join, refused. The remedy (joining again) passes.
 * Run through the watched runner: node scraper/run_tests.js --prove join_guard
 */
'use strict';
const path = require('path');
const { proof, addPiece } = require('./kit.js');

const P = proof('the hand-edit guard');
const JOIN = path.join(__dirname, '..', 'app_join.js');
const check = () => P.run([JOIN, '--check', '--root', P.root]);
const STALE = /^JOIN CHECK FAILED — Cat_Watch\.jsx is not what the parts/;
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const page = P.read('Cat_Watch.jsx');

P.control('JG-00', 'the page as the parts join to it', [], check, /^join: Cat_Watch\.jsx is what the parts/m);
P.fault('JG-01', 'Cat_Watch.jsx edited by hand', [['Cat_Watch.jsx', was => was.replace('const W={', 'const W={ ')]], check, STALE);
P.fault('JG-02', 'a line deleted from Cat_Watch.jsx', [['Cat_Watch.jsx', was => was.split('\n').filter((l, i) => i !== 40).join('\n')]], check, STALE);
P.fault('JG-03', 'a part changed and not joined', [['app/foundations/isbn.jsx', addPiece('plantedNew', 'const plantedNew = 1;')]], check, STALE);
P.fault('JG-04', "a scraper rule the page carries changed and not joined", [['scraper/dates.js', was => was.replace('\nmodule.exports', '\nconst plantedRule = 1;\nmodule.exports')]], check, STALE);
P.fault('JG-05', 'the venue register changed and not joined', [['venues/register.js', once('{ id: "met", kind: "swept",', '{ id: "met", kind: "swept", planted: 1,')]], check, STALE);
P.fault('JG-06', 'the recorded order of the pieces changed', [['app/pieces.json', was => {
  const m = JSON.parse(was); const a = m.order.indexOf('fmtIsbn'), b = m.order.indexOf('cleanIsbn');
  [m.order[a], m.order[b]] = [m.order[b], m.order[a]]; return JSON.stringify(m, null, 1) + '\n'; }]], check, STALE);
P.fault('JG-07', 'a part with text outside any piece', [['app/foundations/isbn.jsx', was => 'const stray = 1;\n' + was]], check, /^JOIN FAILED — app\/foundations\/isbn\.jsx: line 1 sits outside any piece/);
P.fault('JG-08', 'a piece in two parts', [['app/foundations/text.jsx', was => was + '//@piece fmtIsbn\n\nconst fmtIsbn = 1;\n']], check, /^JOIN FAILED — piece "fmtIsbn" is in both/);
P.control('JG-C1', 'a part changed, then joined again', [['app/foundations/isbn.jsx', addPiece('plantedNew', 'const plantedNew = 1;')], ['Cat_Watch.jsx', page], ['app/pieces.json', P.read('app/pieces.json')]],
  () => { const j = P.run([JOIN, '--root', P.root]); return j.status ? j : check(); });
P.done();
