#!/usr/bin/env node
/*
 * routing.proof.js — which machine sweeps which venue (scraper/routing.test.js) proven by planted faults: each rule
 * undone in a copy of the scraper, each caught by its own test; and a venue moved either way, with no test touched,
 * let through. Run through the watched runner: node scraper/run_tests.js --prove routing
 */
'use strict';
const { proof } = require('./kit.js');

const P = proof('which machine sweeps which venue');
const TEST = 'scraper/routing.test.js';
const check = () => P.run(['--test', '--test-reporter=tap', P.file(TEST)]);
const SP = 'scraper/sweep_prototype.js';
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.replace(from, to); };
const every = (from, to) => was => { if (!was.includes(from)) throw new Error(`"${from}" is not in the file`); return was.split(from).join(to); };
const own = id => new RegExp(`^\\s*not ok \\d+ - ${id} `);
const MENIL = `  menil: {\n    // Headed, her machine only (her decision): Cloudflare refuses the container.\n    headed: true,\n    route: 'local',\n`;
const MACHINE = `return r === 'local' ? 'home' : r === 'none' ? 'none' : 'container';`;

P.control('RP-00', 'the recipes as written', [], check, /^# fail 0$/m);
P.fault('RP-01', 'a headed venue left to the container', [[SP, once(MENIL, MENIL.replace(`    route: 'local',\n`, ''))]], check, own('RT-001'));
P.fault('RP-02', 'a route misspelt', [[SP, once(`  ng: {\n`, `  ng: {\n    route: 'lokal',\n`)]], check, own('RT-002'));
P.fault('RP-03', 'a not-swept venue swept by the container', [[SP, once(MACHINE, `return r === 'local' ? 'home' : 'container';`)]], check, own('RT-003'));
P.fault('RP-04', "her laptop's venues swept by the container", [[SP, once(MACHINE, `return r === 'none' ? 'none' : 'container';`)]], check, own('RT-003'));
P.fault('RP-05', 'the run carries the headed flag but never reads it', [[SP, every('VENUES[c].headed', 'VENUES[c].headedUnread')]], check, own('RT-004'));
P.fault('RP-06', "moma's past archive swept", [[SP, once(`      { path: '/calendar/exhibitions', ctx: 'current/upcoming' },\n`,
  `      { path: '/calendar/exhibitions', ctx: 'current/upcoming' },\n      { path: '/calendar/exhibitions/history', ctx: 'past' },\n`)]], check, own('RT-005'));
P.fault('RP-07', "moma's archive link read as a show", [[SP, once(`    isNav: href => /\\/calendar\\/exhibitions\\/?$/.test(href)\n                || /\\/calendar\\/exhibitions\\/history\\/?$/.test(href),`,
  `    isNav: href => /\\/calendar\\/exhibitions\\/?$/.test(href),`)]], check, own('RT-005'));
P.control('RP-C1', 'a venue moved to her laptop, headed, with no test touched', [[SP, once(`  ng: {\n`, `  ng: {\n    headed: true,\n    route: 'local',\n`)]], check, /^# fail 0$/m);
P.control('RP-C2', 'a venue moved back to the container, with no test touched', [[SP, once(MENIL, `  menil: {\n`)]], check, /^# fail 0$/m);
P.done();
