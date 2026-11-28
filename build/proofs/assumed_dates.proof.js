#!/usr/bin/env node
/*
 * assumed_dates.proof.js — a month or season with no day read as an assumed day, its words kept
 * (scraper/fixtures/assumed_dates.js), proven by planted faults in a copy of the reader and the app's parts,
 * joined into the copy's page; the clean copy passes.
 * Run through the watched runner: node scraper/run_tests.js --prove assumed_dates
 */
'use strict';
const { proof } = require('./kit.js');

const P = proof('assumed dates');
const TEST = 'scraper/fixtures/assumed_dates.js';
const D = 'scraper/dates.js';
const CSV = 'app/import/csv.jsx';
const REV = 'app/import/review.jsx';
const SHOW = 'app/foundations/dates_display.jsx';
// The harness reads the joined page, so each planted fault is joined into the copy first.
const check = () => {
  const j = P.run([P.file('build/app_join.js')]);
  if (j.status !== 0) return { status: 2, out: 'join failed\n' + j.out };
  return P.run([P.file(TEST)]);
};
const once = (from, to) => was => { if (was.split(from).length !== 2) throw new Error(`"${from}" is not in the file exactly once`); return was.split(from).join(to); };
const own = id => new RegExp(`^FAIL  ${id}:`, 'm');

P.control('PA-00', 'the rules as written', [], check, /assumed_dates: all passed/);
P.fault('PA-01', 'the month quote loses its side word', [[D, once('m = s.match(new RegExp(`(?:\\\\b${SIDE_WORD}\\\\s+)?(${M})', 'm = s.match(new RegExp(`(${M})')]], check, own('AD-02'));
P.fault('PA-02', 'the season quote loses its side word', [[D, once('m = s.match(new RegExp(`(?:\\\\b${SIDE_WORD}\\\\s+)?\\\\b(?:${SEASON})', 'm = s.match(new RegExp(`\\\\b(?:${SEASON})')]], check, own('AD-01'));
P.fault('PA-03', 'the intake never assumes', [[CSV, once('if(a&&a.end){ed=a.end;', 'if(false){ed=a.end;')]], check, own('AD-03'));
P.fault('PA-04', 'the words not capitalised', [[D, once('const capWord = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();', 'const capWord = w => w;')]], check, own('AD-03'));
P.fault('PA-05', 'a month closes on its first day', [[D, once("if (mo) date = side === 'end' ? lastDay(y, mo) : ymd(y, mo, 1);", "if (mo) date = ymd(y, mo, 1);")]], check, own('AD-04'));
P.fault('PA-06', 'an opening word read as closing', [[D, once(": new RegExp(`^(?:${START_WORD})$`).test(word) ? 'start'", ": new RegExp(`^(?:${START_WORD})$`).test(word) ? 'end'")]], check, own('AD-05'));
P.fault('PA-07', 'the dash after a real opening ignored', [[D, once(": m[2] && start ? 'end' : '';", ": '';")]], check, own('AD-06'));
P.fault('PA-08', 'a season with no side word read as closing', [[D, once(": m[2] && start ? 'end' : '';", ": 'end';")]], check, own('AD-07'));
P.fault('PA-09', 'a hyphen inside a word read as a range', [[D, once('|(?<!\\\\p{L})(-)\\\\s*)?', '|(-)\\\\s*)?')]], check, own('AD-07b'));
P.fault('PA-10', 'winter not fixed by the opening date', [[D, once('else if (start) date = [lastDay(y, last), lastDay(y + 1, last)].find(d => d && d >= start) || \'\';', 'else date = lastDay(y, last);')]], check, own('AD-08'));
P.fault('PA-11', 'winter with no opening date guessed', [[D, once('else if (start) date = [lastDay(y, last), lastDay(y + 1, last)].find(d => d && d >= start) || \'\';', 'else date = [lastDay(y, last), lastDay(y + 1, last)].find(d => d && d >= start) || lastDay(y, last);')]], check, own('AD-09'));
P.fault('PA-12', 'the hemisphere ignored', [[CSV, once('southern:southernVenue(vc)', 'southern:false')]], check, own('AD-10'));
P.fault('PA-13', 'a real date on the assumed day not offered', [[CSV, once('if(o&&o===n&&!(oShown&&!nShown))return;', 'if(o&&o===n)return;')]], check, own('AD-12'));
P.fault('PA-14', 'the same assumption offered again', [[CSV, once('if(o&&o===n&&!(oShown&&!nShown))return;', 'if(o&&o===n&&!oShown)return;')]], check, own('AD-13'));
P.fault('PA-15', 'an assumed date over a real one', [[CSV, once('if(nShown&&o&&!oShown)return;', '')]], check, own('AD-15'));
P.fault('PA-16', 'a new show loses its words', [[REV, once('...shownFields(c.startShown,c.endShown),', '')]], check, own('AD-17'));
P.fault('PA-17', 'a real date applied keeps the old words', [[REV, once('if(u.shown)patch[k]=u.shown; else delete patch[k];', 'if(u.shown)patch[k]=u.shown;')]], check, own('AD-18'));
P.fault('PA-18', 'two runs: the assumed date offered against the real one', [[CSV, once('if(!a||(aAssumed&&!bAssumed)){', 'if(!a){')]], check, own('AD-19'));
P.fault('PA-19', 'the card shows the closing day without its words', [[SHOW, once('b=r.endShown&&r.endDate?assumedText(r.endShown,r.endDate):fmtDate(r.endDate)', 'b=fmtDate(r.endDate)')]], check, own('AD-20'));
P.fault('PA-20', 'the card shows the opening day without its words', [[SHOW, once('const a=r.startShown&&r.startDate?assumedText(r.startShown,r.startDate):fmtDate(r.startDate)', 'const a=fmtDate(r.startDate)')]], check, own('AD-21'));
P.done();
