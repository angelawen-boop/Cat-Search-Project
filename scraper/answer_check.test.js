// The checks on every description Claude writes, shared by the compressor and Add by link
// (scraper/answer_check.js). Cases from live answers and their pages.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const A = require('./answer_check.js');
const CLI = require('./compress_cli.js');

test('AC-001: a claim the page does not hold is refused (Pontormo: "first", no "first" in the text)', () => {
  const page = 'Celebrated alike by scholars, collectors, and the wider public, Pontormo is now the subject of a landmark exhibition dedicated exclusively to his life and artistic achievement.';
  assert.deepStrictEqual(A.unsupportedClaims('First major monographic exhibition on Pontormo.', page), ['"first" is not in the text']);
  assert.deepStrictEqual(A.unsupportedClaims('Pontormo\'s paintings and drawings.', page), []);
});

test('AC-002: a number the page does not hold is refused (Brera: "25 confiscated paintings", the page says 52)', () => {
  const page = 'provenienti da una vasta operazione di confisca di 52 opere';
  assert.deepStrictEqual(A.unsupportedClaims('25 confiscated paintings by postwar Italian masters.', page), ['the number 25 is not in the text']);
});

test('AC-003: the same claim in other words or another language passes', () => {
  assert.deepStrictEqual(A.unsupportedClaims('First UK exhibition of Waldmüller\'s landscapes.', 'this first-ever exhibition dedicated to Waldmüller\'s landscapes'), []);
  assert.deepStrictEqual(A.unsupportedClaims('Two thousand years of Korean creativity.', 'Discover 2,000 years of Korean creativity'), []);
  assert.deepStrictEqual(A.unsupportedClaims('Eleven Rothko masterpieces.', 'An immersive display of 11 masterpieces by Mark Rothko'), []);
  assert.deepStrictEqual(A.unsupportedClaims('Art and fashion of the 1990s.', 'The 90s: Art and Fashion'), []);
  assert.deepStrictEqual(A.unsupportedClaims('17th-century Haarlem portraits.', 'in the seventeenth century in Haarlem'), []);
  assert.deepStrictEqual(A.unsupportedClaims('Twenty-first-century art.', '21st century'), []);
  assert.deepStrictEqual(A.unsupportedClaims('First great Brueghel show in Italy.', 'la prima grande esposizione in Italia'), []);
  assert.deepStrictEqual(A.unsupportedClaims('Largest Brueghel survey.', 'la più grande mostra'), []);
});

test('AC-004: a word close to a claim is not the claim ("grande" is not "largest")', () => {
  assert.deepStrictEqual(A.unsupportedClaims('Largest Brueghel survey.', 'la grande mostra'), ['"largest" is not in the text']);
});

test('AC-005: shape — no full stop, an HTML fragment or a code fence is refused; over ten words is refused', () => {
  assert.deepStrictEqual(A.stringFaults('Bonnard and the experience of seeing.'), []);
  assert.ok(A.stringFaults('Bonnard and the experience of seeing').includes('does not end in a full stop'));
  assert.ok(A.stringFaults('Art &amp; Writing.').includes('carries an HTML fragment'));
  assert.strictEqual(A.validateAnswer('One two three four five six seven eight nine ten eleven.').ok, false);
});

test('AC-006: the compressor refuses a run whose answer makes a claim its page does not hold, and writes nothing', () => {
  const dir = '_answer_check_test_' + process.pid;
  const run = path.join(__dirname, 'output', dir);
  fs.mkdirSync(run, { recursive: true });
  try {
    fs.writeFileSync(path.join(run, 'compress_pending.json'), JSON.stringify({ rows: [
      { index: 0, title: 'Pontormo', venue_code: 'occ', action: 'review', raw: 'Pontormo is now the subject of a landmark exhibition.' },
    ] }));
    fs.writeFileSync(path.join(run, 'compress_answers.json'), JSON.stringify({ 0: 'First major Pontormo exhibition.' }));
    const said = [], log = console.log;
    console.log = (...a) => said.push(a.join(' '));
    let passed;
    try { passed = CLI.check(dir); } finally { console.log = log; }
    assert.strictEqual(passed, false);
    assert.ok(said.some(l => /row 0: "first" is not in the text/.test(l)), said.join('\n'));
    fs.writeFileSync(path.join(run, 'compress_answers.json'), JSON.stringify({ 0: 'Pontormo, a landmark exhibition.' }));
    console.log = () => {};
    try { passed = CLI.check(dir); } finally { console.log = log; }
    assert.strictEqual(passed, true);
  } finally { fs.rmSync(run, { recursive: true, force: true }); }
});
