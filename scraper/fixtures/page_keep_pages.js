/**
 * PAGES KEPT, AND MOMA'S FALSE "MORE PAGES" WARNING — 27 Sep 2026.
 *
 * Part one asks the JOIN, not the rules: the real fetchIndividualPages and
 * safeGoto, paced, over four MAD exhibition pages she saved, answered with
 * Cloudflare's headers — no network. The MoMA run of 27 Sep in miniature:
 *
 *   A  uninterrupted, nothing kept — the rows a clean read produces.
 *   B  kept, a bot check on the third page — pages 1 and 2 kept, 3 and 4 not.
 *   C  kept, a fresh run — ONLY pages 3 and 4 are asked for, and the rows are
 *      identical to A's.
 *   D  after the venue is marked finished — all four asked for again.
 *   E  --reread — all four asked for again.
 *
 * Part two: MoMA's listing, saved by her 22 Sep, served at its real address.
 * Its exhibitions are numbered (/calendar/exhibitions/5890), which the
 * next-page check read as page numbers. They must no longer be reported — and
 * a real next-page link on the same kind of page must still be.
 *
 *   node scraper/fixtures/page_keep_pages.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const S = require('../sweep_prototype.js');
const K = require('../page_keep.js');
const { chromium } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const SITE = 'https://madparis.fr';
const MAD = [
  ['/Christofle-a-brilliant-story', 'exhibition_christofle.html', 'Christofle', '2024-11-14', '2025-04-20'],
  ['/La-Mode-en-Majeste-Royal-Thai-Dress-from-Tradition-to-Modernity', 'exhibition_thai_dress.html', 'La Mode en Majesté', '2026-05-13', '2026-11-01'],
  ['/luxury-china', 'exhibition_luxury_china.html', 'Luxury China', '', ''],
  ['/fashion-design-jewellery', 'exhibition_fashion_design_jewellery.html', 'Fashion, Design, Jewellery', '', ''],
];
const CF = { 'cf-ray': '8c0ffee-CDG', server: 'cloudflare' };
const CHALLENGE = '<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing madparis.fr.</body></html>';

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

const freshRows = () => MAD.map(([p, , title, s, e]) => ({
  venue_code: 'mad', title, start_date: s, end_date: e, summary: '', url: SITE + p, notes: '',
}));
const FIELDS = ['title', 'start_date', 'end_date', 'summary', 'notes'];
const view = rows => JSON.stringify(rows.map(r => FIELDS.map(f => r[f])));

async function run(browser, { keep = null, challengeAt = -1 } = {}) {
  const context = await browser.newContext();
  const asked = [];
  await context.route(() => true, r => {
    const url = r.request().url().replace(/#.*$/, '');
    const i = MAD.findIndex(m => SITE + m[0] === url);
    if (i < 0) return r.abort();
    asked.push(i);
    if (i === challengeAt) return r.fulfill({ status: 200, headers: CF, contentType: 'text/html', body: CHALLENGE });
    return r.fulfill({ status: 200, headers: CF, contentType: 'text/html; charset=utf-8',
      body: fs.readFileSync(path.join(DOCS, 'mad_pages', MAD[i][1])) });
  });
  S.usePacerForFixtures(S.makePacer({ gapMs: 20, known: {}, sleepChunkMs: 5 }));
  S.usePageKeepForFixtures(keep);
  const page = await context.newPage();
  const rows = freshRows();
  const logged = [];
  const log = console.log; console.log = (...a) => logged.push(a.join(' '));
  try { await S.fetchIndividualPages(page, rows, 'mad'); }
  finally { console.log = log; S.usePacerForFixtures(null); S.usePageKeepForFixtures(null); await context.close(); }
  return { asked, rows, logged };
}

// A .mhtml is a MIME container; the page is its quoted-printable text/html part.
function htmlFromMhtml(file) {
  const raw = fs.readFileSync(file, 'latin1');
  const start = raw.search(/Content-Type: text\/html/i);
  const body = raw.slice(raw.indexOf('\r\n\r\n', start) + 4);
  const end = body.search(/\r\n------MultipartBoundary/);
  const qp = (end > 0 ? body.slice(0, end) : body).replace(/=\r?\n/g, '');
  return Buffer.from(qp.replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
}

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages_kept_'));
  try {
    // ── part one ──
    const A = await run(browser);
    check('KP-001: the four saved pages read cleanly (the baseline)', A.asked.length === 4 && A.rows.every(r => r.summary), A.asked.join(','));

    const B = await run(browser, { keep: K.makePageKeep(dir), challengeAt: 2 });
    const keptFiles = fs.readdirSync(path.join(dir, 'mad')).filter(f => f.endsWith('.json'));
    check('KP-002: a bot check on page 3 — pages 1 and 2 kept, nothing more asked', keptFiles.length === 2 && B.asked.join(',') === '0,1,2', `${keptFiles.length} kept; asked ${B.asked.join(',')}`);
    const gz = path.join(dir, 'mad', K.keyOf(SITE + MAD[0][0]) + '.html.gz');
    check('KP-003: the page itself is kept too, as the browser drew it', fs.existsSync(gz) && /six hundred pieces/.test(zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8')));
    check('KP-004: the log says how many were kept', B.logged.some(l => /2 page\(s\) kept on disk as read/.test(l)), B.logged.slice(-3).join(' / '));

    const C = await run(browser, { keep: K.makePageKeep(dir) });
    check('KP-005: the next run asks ONLY for the pages still missing', C.asked.join(',') === '2,3', C.asked.join(','));
    check('KP-006: and its rows are identical to an uninterrupted read', view(C.rows) === view(A.rows), view(C.rows).slice(0, 300));
    check('KP-007: the log says pages were reused, not asked for', C.logged.some(l => /2 page\(s\) taken from an earlier attempt/.test(l)), C.logged.slice(-3).join(' / '));
    check('KP-008: the counts still add up — 4 got text', C.logged.some(l => /Individual pages: 4 got text, 0 no curatorial text, 0 failed/.test(l)), C.logged.find(l => /Individual pages/.test(l)));

    const k = K.makePageKeep(dir);
    await new Promise(r => setTimeout(r, 5));
    k.markFinished('mad');
    const D = await run(browser, { keep: K.makePageKeep(dir) });
    check('KP-009: once the venue has finished, its next sweep reads everything fresh', D.asked.join(',') === '0,1,2,3', D.asked.join(','));

    const E = await run(browser, { keep: K.makePageKeep(dir, { reread: true }) });
    check('KP-010: --reread asks for every page', E.asked.join(',') === '0,1,2,3', E.asked.join(','));

    // The rules directly.
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pages_kept_'));
    let t = Date.parse('2026-10-01T00:00:00Z');
    const k2 = K.makePageKeep(dir2, { now: () => t });
    k2.save('x', 'https://a.test/1', { changes: { summary: 's' }, outcome: 'text', html: '<p>s</p>' });
    t += 13 * 86400000;
    check('KP-011: a page kept 13 days ago is still used', !!k2.lookup('x', 'https://a.test/1'));
    t += 2 * 86400000;
    check('KP-012: one older than ' + K.MAX_AGE_DAYS + ' days is not', k2.lookup('x', 'https://a.test/1') === null);
    check('KP-013: another address is never taken for this one', k2.lookup('x', 'https://a.test/2') === null);
    check('KP-014: rowChanges holds only what the read changed',
      JSON.stringify(K.rowChanges({ a: 1, b: 'x' }, { a: 1, b: 'y', c: true })) === '{"b":"y","c":true}');
    fs.rmSync(dir2, { recursive: true, force: true });

    // ── part two ──
    const LISTING = 'https://www.moma.org/calendar/exhibitions';
    const html = htmlFromMhtml(path.join(DOCS, 'moma_pages', 'listing.mhtml'));
    for (const [label, body, wantMoma] of [
      ['her saved listing', html, false],
      // The same page with a genuine page 2 link added: must still be reported.
      ['the same page with a real ?page=2 link', html.replace('</body>', '<a href="/calendar/exhibitions?page=2">2</a></body>'), true],
    ]) {
      const context = await browser.newContext();
      await context.route(() => true, r => r.request().url() === LISTING
        ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }) : r.abort());
      const page = await context.newPage();
      S.UNWIRED.length = 0;
      const log = console.log; console.log = () => {};
      try { await S.scrapeVenue(page, 'moma', { listingOnly: true }); }
      finally { console.log = log; }
      const raw = await S.detectUnwiredPagination(page, []);
      await context.close();
      const found = S.UNWIRED.filter(u => u.venue === 'moma');
      if (!wantMoma) {
        check('KP-015: the numbered exhibition links are there to be misread (the test is not empty)',
          (raw || []).some(o => /^page \d{4} /.test(o.hint)), (raw || []).map(o => o.hint).join(' | '));
        check('KP-016: ' + label + ' — no "more pages" warning for MoMA', found.length === 0, found.map(u => u.hints.join(' | ')).join(' / '));
      } else {
        check('KP-017: ' + label + ' — still reported', found.some(u => u.hints.some(h => /page=2/.test(h))), JSON.stringify(found));
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'pages kept, and MoMA\'s numbered links, behave');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  page_keep_pages crashed — ' + e.message); process.exit(1); });
