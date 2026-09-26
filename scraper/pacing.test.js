// Fixtures for PACING in sweep_prototype.js — her machine's gatekeeper lanes.
//
// Every rule is asked directly, and the pacer is driven with a gap of
// milliseconds instead of seconds: the same code, a shorter clock. What is
// worth proving is what the design promises her — one venue at a time behind
// a gatekeeper, a gap between its pages, different gatekeepers side by side,
// and the first objection stopping every site behind that gatekeeper.

const test = require('node:test');
const assert = require('node:assert');
const {
  gatekeeperFrom, objectionFrom, laneCooldown, knownGatekeepers, makePacer, pacedWithheld,
} = require('./sweep_prototype.js');

const CF = { 'cf-ray': '8a1b-CDG', server: 'cloudflare' };
const PLAIN = { server: 'Apache' };
const HOUR = 60 * 60 * 1000;

test('P-001 the gatekeeper is read off the reply, never assumed', () => {
  assert.strictEqual(gatekeeperFrom(CF, 'https://www.musee-orsay.fr/en'), 'Cloudflare');
  assert.strictEqual(gatekeeperFrom({ server: 'cloudflare' }, 'https://x.org'), 'Cloudflare');
  assert.strictEqual(gatekeeperFrom({ 'x-vercel-id': 'syd1::abc' }, 'https://www.metmuseum.org'), 'Vercel');
  // Nothing in front identified itself: a lane of its own, named by host.
  assert.strictEqual(gatekeeperFrom(PLAIN, 'https://MadParis.fr/?page=x'), 'site:madparis.fr');
  assert.strictEqual(gatekeeperFrom(undefined, 'https://madparis.fr/'), 'site:madparis.fr');
});

test('P-002 an objection is a refusal or a bot check — including a check served with 200', () => {
  assert.strictEqual(objectionFrom(403, CF, 'Just a moment...'), 'BLOCKED_HTTP_403');
  assert.strictEqual(objectionFrom(429, PLAIN, ''), 'BLOCKED_HTTP_429');
  assert.strictEqual(objectionFrom(200, { ...CF, 'cf-mitigated': 'challenge' }, ''), 'BLOCKED_CHALLENGE');
  assert.strictEqual(objectionFrom(200, CF, 'Just a moment...'), 'BLOCKED_CHALLENGE');
  assert.strictEqual(objectionFrom(200, CF, 'Attention Required! | Cloudflare'), 'BLOCKED_CHALLENGE');
  // A real page, and a real page that merely MENTIONS a moment, are not.
  assert.strictEqual(objectionFrom(200, CF, 'Exhibitions | Musée d’Orsay'), null);
  assert.strictEqual(objectionFrom(200, CF, 'Stop! Just a moment of Degas'), null);
  // A dead link is the venue's own fault, not an objection to us.
  assert.strictEqual(objectionFrom(404, CF, 'Not found'), null);
});

test('P-003 a refused lane waits a day; a clean one an hour', () => {
  const now = Date.parse('2026-09-26T12:00:00Z');
  const refused = { lanes: { Cloudflare: {
    lastAt: '2026-09-26T10:00:00Z',
    stopped: { venue: 'orsay', reason: 'BLOCKED_HTTP_403', at: '2026-09-26T10:00:00Z' } } } };
  const r = laneCooldown([refused], 'Cloudflare', now);
  assert.strictEqual(r.wait, true);
  assert.strictEqual(r.until, Date.parse('2026-09-27T10:00:00Z'));
  assert.match(r.why, /orsay/);
  assert.strictEqual(laneCooldown([refused], 'Cloudflare', now + 23 * HOUR).wait, false);

  const clean = { lanes: { Cloudflare: { lastAt: '2026-09-26T11:30:00Z', stopped: null } } };
  assert.strictEqual(laneCooldown([clean], 'Cloudflare', now).wait, true);
  assert.strictEqual(laneCooldown([clean], 'Cloudflare', now + 31 * 60 * 1000).wait, false);
  // Another gatekeeper's record says nothing about this one.
  assert.strictEqual(laneCooldown([refused, clean], 'site:madparis.fr', now).wait, false);
  assert.strictEqual(laneCooldown([], 'Cloudflare', now).wait, false);
});

test('P-004 the newest record of a venue\'s gatekeeper wins', () => {
  const k = knownGatekeepers([
    { savedAt: '2026-09-26T10:00:00Z', gatekeepers: { orsay: 'Cloudflare', mad: 'site:madparis.fr' } },
    { savedAt: '2026-09-20T10:00:00Z', gatekeepers: { orsay: 'Akamai', met: 'Vercel' } },
  ]);
  assert.deepStrictEqual(k, { orsay: 'Cloudflare', mad: 'site:madparis.fr', met: 'Vercel' });
});

const GAP = 60;
const pacer = (known, extra = {}) => makePacer({ gapMs: GAP, known, random: () => 0.5, sleepChunkMs: 5, ...extra });

test('P-005 behind one gatekeeper: one venue at a time, and a gap between pages', async () => {
  const p = pacer({ orsay: 'Cloudflare', artic: 'Cloudflare' });
  const times = [];
  const venue = async (code, pages) => {
    for (let i = 0; i < pages; i++) {
      assert.strictEqual(await p.before(code, `https://x/${code}/${i}`), null);
      times.push({ code, t: Date.now() });
      await p.after(code, `https://x/${code}/${i}`, 200, CF, 'A page');
    }
    p.release(code);
  };
  await Promise.all([venue('orsay', 3), venue('artic', 2)]);
  // Never interleaved: every orsay page before any artic page.
  assert.deepStrictEqual(times.map(x => x.code), ['orsay', 'orsay', 'orsay', 'artic', 'artic']);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i].t - times[i - 1].t >= GAP - 5, `gap ${i} was ${times[i].t - times[i - 1].t}ms`);
  }
  assert.ok(p.waited('artic') >= 2 * GAP - 10, 'artic\'s wait for the lane is counted as waiting, not work');
});

test('P-006 different gatekeepers run side by side', async () => {
  const p = pacer({ orsay: 'Cloudflare', mad: 'site:madparis.fr' });
  // Warm both lanes so the next request of each needs the full gap.
  await p.before('orsay', 'u'); await p.after('orsay', 'u', 200, CF, 'x');
  await p.before('mad', 'u'); await p.after('mad', 'u', 200, PLAIN, 'x');
  const t0 = Date.now();
  await Promise.all([p.before('orsay', 'u2'), p.before('mad', 'u2')]);
  const took = Date.now() - t0;
  assert.ok(took < 2 * GAP - 10, `both lanes waited one gap together, not two in turn (${took}ms)`);
});

test('P-007 the first objection stops every site behind that gatekeeper, and nothing else', async () => {
  const p = pacer({ orsay: 'Cloudflare', artic: 'Cloudflare', mad: 'site:madparis.fr' });
  await p.before('orsay', 'a'); await p.after('orsay', 'a', 200, CF, 'x');
  await p.before('orsay', 'b');
  assert.strictEqual(await p.after('orsay', 'b', 403, CF, 'Just a moment...'), 'BLOCKED_HTTP_403');
  // Orsay asks nothing more, not even once to "check".
  assert.strictEqual(await p.before('orsay', 'c'), 'LANE_STOPPED');
  p.release('orsay');
  // Artic, behind the same gatekeeper, is never asked at all.
  assert.strictEqual(await p.before('artic', 'a'), 'LANE_STOPPED');
  // MAD is behind nothing of the kind and carries on.
  assert.strictEqual(await p.before('mad', 'a'), null);

  const st = p.snapshot().lanes.Cloudflare.stopped;
  assert.strictEqual(st.venue, 'orsay');
  assert.strictEqual(st.venuePage, 2);
  assert.strictEqual(st.venueCleanBefore, 1);
  assert.strictEqual(st.reason, 'BLOCKED_HTTP_403');
});

test('P-008 an unknown gatekeeper is read off the first reply, with every lane paused for it', async () => {
  const p = pacer({ orsay: 'Cloudflare' });
  await p.before('orsay', 'a'); await p.after('orsay', 'a', 200, CF, 'x');
  // mad's gatekeeper is unknown: its first page is spaced from orsay's.
  const t0 = Date.now();
  assert.strictEqual(await p.before('mad', 'm1'), null);
  assert.ok(Date.now() - t0 >= GAP - 10);
  // While mad's first page is out, orsay's lane does not fire.
  let orsayFired = false;
  const orsayNext = p.before('orsay', 'b').then(() => { orsayFired = true; });
  await new Promise(r => setTimeout(r, 2 * GAP));
  assert.strictEqual(orsayFired, false, 'a lane fired beside a page whose gatekeeper was unknown');
  await p.after('mad', 'https://madparis.fr/?page=x', 200, PLAIN, 'x');
  await orsayNext;
  assert.strictEqual(orsayFired, true);
  assert.deepStrictEqual(p.snapshot().gatekeepers, { orsay: 'Cloudflare', mad: 'site:madparis.fr' });
});

test('P-009 once any gatekeeper has refused, a venue whose gatekeeper is unknown is not risked', async () => {
  const p = pacer({ orsay: 'Cloudflare' });
  await p.before('orsay', 'a'); await p.after('orsay', 'a', 403, CF, '');
  assert.strictEqual(await p.before('brit', 'a'), 'LANE_STOPPED');
});

test('P-010 what is written to disk: a finish or a plain refusal, never a venue cut short', () => {
  assert.strictEqual(pacedWithheld(null), null);                                        // container
  assert.strictEqual(pacedWithheld({ clean: 12, objection: null, sawStop: false }), null);  // finished
  // Refused on its own first page: the ordinary refusal record, as on the container.
  assert.strictEqual(pacedWithheld({ clean: 0, objection: 'BLOCKED_HTTP_403', sawStop: true }), null);
  // Refused part-way: withheld, so --continue redoes it.
  assert.match(pacedWithheld({ clean: 11, objection: 'BLOCKED_CHALLENGE', sawStop: true }), /after 11 clean/);
  // Never got to ask because another venue's refusal stopped the lane.
  assert.match(pacedWithheld({ clean: 0, objection: null, sawStop: true }), /already refused/);
  assert.match(pacedWithheld({ clean: 5, objection: null, sawStop: true }), /already refused/);
});
