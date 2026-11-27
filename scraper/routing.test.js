/**
 * routing.test.js — which machine sweeps which venue, read from the recipes alone.
 *
 * The two machines never sweep the same venue (her decision; docs/sweep_operation.md, "Who sweeps what").
 *
 * A venue's machine is written ONCE, on its recipe (`route: 'local'` her laptop, `route: 'none'` not swept, nothing the
 * container; `headed: true` the visible Chrome). These tests never type out who sweeps where: they check the rules
 * every recipe must keep, so moving a venue is a change to its recipe and nothing else.
 * Proven: build/proofs/routing.proof.js.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { VENUES, machineOf, namedVenues } = require('./sweep_prototype.js');
const CODES = Object.keys(VENUES);
const SWEEP_FILE = fs.readFileSync(path.join(__dirname, 'sweep_prototype.js'), 'utf8');

test('RT-001 every headed venue is swept on her machine — none is left for the container to be refused at', () => {
  const headed = CODES.filter(c => VENUES[c].headed);
  assert.ok(headed.length > 0, 'no headed venue found: the recipes were not read');
  for (const c of headed) assert.strictEqual(machineOf(c), 'home', c + ' is headed but not routed to her machine');
});

test('RT-002 a route is spelt one of the ways the run knows — a misspelt one cannot send a venue to the container quietly', () => {
  for (const c of CODES) {
    const r = VENUES[c].route;
    assert.ok(r === undefined || r === 'local' || r === 'none', c + ' has route ' + JSON.stringify(r));
  }
});

test('RT-003 each venue goes to the machine its recipe names, and to exactly one', () => {
  const want = r => (r === 'local' ? 'home' : r === 'none' ? 'none' : 'container');
  for (const c of CODES) assert.strictEqual(machineOf(c), want(VENUES[c].route), c + ' goes to the wrong machine');
});

test('RT-004 the run reads the headed flag', () => {
  // The flag must not be able to lie: a recipe option nothing acts on looks exactly like one that works.
  // Where a headed venue goes on each machine: pacing.test.js H-001.
  assert.match(SWEEP_FILE, /VENUES\[c\]\.headed\b/, 'the run must READ the headed flag, not merely carry it');
});

test('RT-005 moma: its past archive is not swept, but still treated as navigation (her decision)', () => {
  const archive = 'https://www.moma.org/calendar/exhibitions/history';
  assert.ok(VENUES.moma.pages.every(p => !/\/calendar\/exhibitions\/history/.test(p.path)), 'moma must not sweep its past archive');
  // The listing still LINKS to the archive, so it must not be read as a show.
  assert.ok(VENUES.moma.isNav(archive), 'the archive link must still be treated as navigation');
  assert.ok(!VENUES.moma.isNav('https://www.moma.org/calendar/exhibitions/5000'), 'a show is not navigation');
});

test('RT-006 a venue is named on the command line by its code or by its short command name', () => {
  const own = { aa: {}, longname: { command: 'ln' }, cc: {} };
  assert.deepStrictEqual(namedVenues(['ln'], own), ['longname']);
  assert.deepStrictEqual(namedVenues(['longname'], own), ['longname']);
  assert.deepStrictEqual(namedVenues(['cc', 'ln'], own), ['longname', 'cc']);
  assert.deepStrictEqual(namedVenues(['nothing'], own), []);
  // Every short name leads to one venue only, and is no other venue's code.
  const names = CODES.map(c => VENUES[c].command).filter(Boolean);
  assert.strictEqual(new Set(names).size, names.length, 'two venues share a short command name');
  for (const n of names) assert.ok(!CODES.includes(n), n + ' is already a venue code');
});
