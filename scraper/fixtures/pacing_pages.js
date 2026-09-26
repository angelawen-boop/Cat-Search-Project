/**
 * PACING THROUGH THE REAL PAGE LOADER — 26 Sep 2026.
 *
 * pacing.test.js asks each rule directly. This asks the JOIN: the real
 * scrapeVenue and safeGoto, over the d'Orsay pages she saved, answered with
 * Cloudflare's own headers, with a pacer switched on — no network. Three runs:
 *
 *   clean       every listing page served: the gatekeeper is read off the
 *               reply, pages are spaced, the venue may be written.
 *   part-way    a bot check on the third page: nothing more is requested,
 *               and the venue is withheld from disk (--continue redoes it).
 *   first page  a bot check served WITH A 200 on the first page: caught by its
 *               title, nothing more requested, written as a plain refusal.
 *
 *   node scraper/fixtures/pacing_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'orsay_pages');
const SITE = 'https://www.musee-orsay.fr';
const LISTINGS = [
  SITE + '/en/program/whats-on/exhibitions',
  SITE + '/en/ressources/expositions-passees',
  SITE + '/en/ressources/expositions-passees?page=1',
  SITE + '/en/ressources/expositions-passees?page=2',
  SITE + '/en/ressources/expositions-passees?page=3',
];
const FILES = ['current_upcoming.html', 'past.html', 'past_page2.html', 'past_page3.html', 'past_page4.html'];
const CF = { 'cf-ray': '8c0ffee-CDG', server: 'cloudflare' };
const CHALLENGE = '<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing www.musee-orsay.fr. This takes a few seconds and needs JavaScript.</body></html>';
const GAP = 150;

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

// objectAt: index into LISTINGS, and how that page objects.
async function run(browser, objectAt, { listingOnly = true } = {}) {
  const context = await browser.newContext();
  const hits = [], pagesAsked = [];
  await context.route(() => true, r => {
    const url = r.request().url();
    if (r.request().resourceType() === 'document') pagesAsked.push(url);
    const i = LISTINGS.indexOf(url);
    if (i < 0) return r.abort();
    hits.push({ url, t: Date.now() });
    if (objectAt && objectAt.index === i) {
      return r.fulfill({ status: objectAt.status, headers: CF, contentType: 'text/html', body: CHALLENGE });
    }
    return r.fulfill({ status: 200, headers: CF, contentType: 'text/html', body: fs.readFileSync(path.join(PAGES, FILES[i])) });
  });
  const pacer = S.makePacer({ gapMs: GAP, known: {}, sleepChunkMs: 10 });
  S.usePacerForFixtures(pacer);
  const page = await context.newPage();
  const logged = [];
  const log = console.log; console.log = (...a) => logged.push(a.join(' '));
  let rows;
  try { rows = await S.scrapeVenue(page, 'orsay', { listingOnly }); }
  finally { console.log = log; S.usePacerForFixtures(null); await context.close(); }
  return { hits, pagesAsked, rows, pacer, logged };
}

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    // ── clean ──
    let r = await run(browser, null);
    const real = r.rows.filter(x => !x.title.startsWith('['));
    check('PC-001: every listing page is requested when nothing objects', r.hits.length === LISTINGS.length, r.hits.map(h => h.url).join(' | '));
    check('PC-002: the gatekeeper is read off the reply — Cloudflare', r.pacer.snapshot().gatekeepers.orsay === 'Cloudflare', JSON.stringify(r.pacer.snapshot().gatekeepers));
    const gaps = r.hits.slice(1).map((h, i) => h.t - r.hits[i].t);
    check('PC-003: pages are spaced by the gap, never back to back', gaps.every(g => g >= GAP * 0.75 - 15), gaps.join(', '));
    check('PC-004: the rows are the same as unpaced — her 45 past are still there', real.length >= 45, real.length);
    check('PC-005: a clean venue may be written', S.pacedWithheld(r.pacer.venue('orsay')) === null);

    // ── part-way ──
    // On to the exhibition pages too, so there is a long list left to skip.
    r = await run(browser, { index: 2, status: 403 }, { listingOnly: false });
    check('PC-006: after a bot check on page 3, nothing more is requested — no listing, no exhibition page',
      r.hits.length === 3 && r.pagesAsked.length === 3, r.pagesAsked.join(' | '));
    const st = r.pacer.snapshot().lanes.Cloudflare.stopped;
    check('PC-007: where it stopped is recorded — orsay, its 3rd request, after 2 clean',
      st && st.venue === 'orsay' && st.venuePage === 3 && st.venueCleanBefore === 2 && st.reason === 'BLOCKED_HTTP_403', JSON.stringify(st));
    check('PC-008: a venue refused part-way is withheld from disk', /after 2 clean/.test(S.pacedWithheld(r.pacer.venue('orsay')) || ''), S.pacedWithheld(r.pacer.venue('orsay')));
    const due = r.logged.find(l => /reading \d+ individual page/.test(l));
    check('PC-009: the skipped exhibition pages are said once in the log, not once per page',
      !!due && r.logged.filter(l => /not requesting anything more/.test(l)).length === 1,
      (due || 'no exhibition pages were due') + ' / ' + r.logged.filter(l => /not requesting/.test(l)).length);

    // ── first page, a check served with 200 ──
    r = await run(browser, { index: 0, status: 200 });
    check('PC-010: a bot check served with 200 is caught by its title, and nothing more is requested', r.hits.length === 1, r.hits.length);
    const markers = r.rows.filter(x => x.title.startsWith('['));
    check('PC-011: its marker row says it was a bot check',
      markers.some(m => /bot check instead of the page/.test(m.notes)), markers.map(m => m.notes).join(' | '));
    check('PC-012: the challenge page was never read as exhibitions', r.rows.every(x => x.title.startsWith('[')), r.rows.map(x => x.title).join(' | '));
    check('PC-013: refused on its own first page — written, as the plain refusal record', S.pacedWithheld(r.pacer.venue('orsay')) === null);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll pacing page checks passed.');
  process.exitCode = failures ? 1 : 0;
})();
