/**
 * WHAT THE SITE ASKS, AND WHAT A TIMEOUT WAS WAITING FOR — 27 Sep 2026.
 * No network: robots.txt files are the copies read on 27 Sep (scraper/robots/),
 * fetching is a stand-in, and every page is served by a route in this file.
 *
 *   node scraper/fixtures/robots_pages.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../robots.js');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + got : '')); }
};
const kept = host => R.interpret(R.readKept(host));

(async () => {
  // --- reading the files kept on 27 Sep --------------------------------------
  check('RB-001: the Ashmolean asks for 10s', kept('www.ashmolean.org').crawlDelay === 10, kept('www.ashmolean.org').crawlDelay);
  check('RB-002: the Wallace asks for 30s', kept('www.wallacecollection.org').crawlDelay === 30, kept('www.wallacecollection.org').crawlDelay);
  check('RB-003: the National Gallery states no wait', kept('www.nationalgallery.org.uk').crawlDelay === null);

  const bm = kept('www.britishmuseum.org').rules;
  const bmAsk = p => R.isAllowed(bm, 'https://www.britishmuseum.org' + p);
  check('RB-004: BM — its past exhibitions WITHOUT the slash are ruled out, as written',
    !bmAsk('/exhibitions-events/past-exhibitions').allowed, JSON.stringify(bmAsk('/exhibitions-events/past-exhibitions')));
  check('RB-005: BM — WITH the slash they are allowed (longest rule wins)', bmAsk('/exhibitions-events/past-exhibitions/').allowed);
  check('RB-006: BM — an exhibition page is allowed', bmAsk('/exhibitions/bayeux-tapestry').allowed);
  check('RB-007: BM — the filtered current listing is allowed as written',
    bmAsk('/exhibitions-events?whats_on_event_type=Exhibition&whats_on_event_type=Experience').allowed);

  // --- the rules themselves --------------------------------------------------
  const p = R.parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /a\nAllow: /a/b\nCrawl-delay: 4\n\nUser-agent: *\nDisallow: /c$');
  check('RB-008: a group naming another robot does not apply to us', R.isAllowed(p.rules, 'https://x.y/z').allowed);
  check('RB-009: the longer rule wins', R.isAllowed(p.rules, 'https://x.y/a/b/c').allowed && !R.isAllowed(p.rules, 'https://x.y/a/q').allowed);
  check('RB-010: two * groups are both applied, and $ anchors the end',
    !R.isAllowed(p.rules, 'https://x.y/c').allowed && R.isAllowed(p.rules, 'https://x.y/cd').allowed && p.crawlDelay === 4);
  check('RB-011: an unreadable file asks nothing, and says it was unreadable',
    R.interpret({ readable: false, why: 'HTTP 403' }).crawlDelay === null && /unreadable/.test(R.interpret({ readable: false, why: 'HTTP 403' }).says));
  check('RB-012: a 404 is a site with no file — known, nothing asked',
    R.interpret({ readable: true, status: 404 }).known && R.interpret({ readable: true, status: 404 }).rules.length === 0);

  // --- once a week at most, into its own folder --------------------------------
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robots-'));
  let asked = 0;
  const fake = async () => { asked++; return { status: 200, headers: { get: () => 'nginx' }, text: async () => 'User-agent: *\nCrawl-delay: 7\n' }; };
  const a = await R.robotsFor('https://ex.org', { fetchImpl: fake, dir });
  const b = await R.robotsFor('https://ex.org', { fetchImpl: fake, dir });
  const c = await R.robotsFor('https://ex.org', { fetchImpl: fake, dir, now: Date.now() + 8 * 86400e3 });
  check('RB-013: read once, then the kept copy for a week, then read again', asked === 2 && a.fetched && !b.fetched && c.fetched, `asked ${asked}`);
  check('RB-014: what was read is what is used', b.crawlDelay === 7);
  const page200 = async () => ({ status: 200, headers: { get: () => 'cloudflare' }, text: async () => '<!DOCTYPE html><html><title>Just a moment...</title>' });
  const d = await R.robotsFor('https://chk.org', { fetchImpl: page200, dir });
  check('RB-015: a bot check served with 200 is not a robots.txt', !d.known && /unreadable/.test(d.says), d.says);
  fs.rmSync(dir, { recursive: true, force: true });

  // --- in the page loader ------------------------------------------------------
  const browser = await chromium.launch({ executablePath: S.resolveChromium(), args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext();
    const hits = [];
    let hangScript = false, hangPage = false;
    await ctx.route('**/*', route => {
      const u = route.request().url();
      hits.push({ u, at: Date.now() });
      if (u.endsWith('/slow.js')) { if (hangScript) return; return route.fulfill({ contentType: 'text/javascript', body: '' }); }
      if (hangPage && u.includes('/hang')) return;   // never answers
      const script = u.includes('/withscript') ? '<script src="/slow.js"></script>' : '';
      return route.fulfill({ contentType: 'text/html', body: `<html><head>${script}</head><body>${'An exhibition. '.repeat(20)}</body></html>` });
    });
    const page = await ctx.newPage();
    const log = console.log; const lines = []; console.log = (...x) => lines.push(x.join(' '));

    S.useRobotsForFixtures({ test: { crawlDelay: 1.5, rules: [{ allow: false, path: '/private/' }] } });
    let r1, r2, r3;
    try {
      r1 = await S.safeGoto(page, 'https://ex.org/one', 'test', 'individual');
      r2 = await S.safeGoto(page, 'https://ex.org/two', 'test', 'individual');
      r3 = await S.safeGoto(page, 'https://ex.org/private/x', 'test', 'individual');
    } finally { console.log = log; }
    const one = hits.find(h => h.u.endsWith('/one')), two = hits.find(h => h.u.endsWith('/two'));
    check('RB-016: pages are at least the stated wait apart', r1.ok && r2.ok && two.at - one.at >= 1450, two && one && (two.at - one.at) + 'ms');
    check('RB-017: an off-limits address is never asked for', r3.reason === 'ROBOTS_OFF_LIMITS' && !hits.some(h => h.u.includes('/private/')), JSON.stringify(r3));
    check('RB-018: …and says why, in words for her card', /robots\.txt/.test(S.failureProse('ROBOTS_OFF_LIMITS')));
    check('RB-019: the log names the rule', lines.some(l => /NOT ASKED — robots\.txt rules it out \(Disallow: \/private\/\)/.test(l)), lines.join(' | '));

    // The British Museum: its past page allowed by her ruling, nothing else.
    S.useRobotsForFixtures({ brit: { crawlDelay: null, rules: bm } });
    let b1, b2, b3;
    console.log = () => {};
    try {
      b1 = await S.safeGoto(page, 'https://www.britishmuseum.org/exhibitions-events/past-exhibitions', 'brit', 'past');
      b2 = await S.safeGoto(page, 'https://www.britishmuseum.org/exhibitions-events/past-exhibitions?page=2', 'brit', 'past');
      b3 = await S.safeGoto(page, 'https://www.britishmuseum.org/exhibitions-events/family-events', 'brit', 'past');
    } finally { console.log = log; }
    check('RB-021: BM — its past exhibitions page is asked for (her ruling, 27 Sep)', b1.ok && b2.ok, JSON.stringify([b1, b2]));
    check('RB-022: BM — any other /exhibitions-events/ address is still refused',
      b3.reason === 'ROBOTS_OFF_LIMITS' && !hits.some(h => h.u.includes('family-events')), JSON.stringify(b3));

    S.useRobotsForFixtures(null);
    const t0 = Date.now();
    console.log = () => {};
    try { await S.safeGoto(page, 'https://ex.org/three', 'test', 'individual'); await S.safeGoto(page, 'https://ex.org/four', 'test', 'individual'); }
    finally { console.log = log; }
    check('RB-020: a fixture or probe never reads robots.txt, so never waits', Date.now() - t0 < 1400, (Date.now() - t0) + 'ms');

    // --- what a timeout was waiting for -----------------------------------------
    const t = S.trackRequests(page);
    hangScript = true;
    t.navStart = Date.now(); t.docAt = null;
    await page.goto('https://ex.org/withscript', { waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => {});
    const s1 = S.stallReport(t);
    check('ST-001: the page answered and a program file hung — both said, the file named',
      /page itself answered in/.test(s1) && /script ex\.org\/slow\.js/.test(s1), s1);
    hangScript = false; hangPage = true;
    t.navStart = Date.now(); t.docAt = null;
    await page.goto('https://ex.org/hang', { waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => {});
    const s2 = S.stallReport(t);
    check('ST-002: the page itself never answered — said so', /never answered/.test(s2), s2);
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log(failures ? `${failures} FAILED` : 'robots.txt is read, obeyed and reported; timeouts say what they waited for');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
