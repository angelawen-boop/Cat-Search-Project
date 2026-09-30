/**
 * THE MORGAN RECIPE, ON THE PAGES SHE SAVED — 22 Sep 2026 (docs/morgan_pages/).
 *
 * Runs the REAL scrapeVenue over them, listings only, no network: every other
 * request refused. Written 28 Sep with the fix that carries a page's own
 * reading settings through pagination — the Morgan's past year-pairs are the
 * first paginated pages to have any.
 *
 * Pages 2 and 3 of a year-pair are her saved page 1 with every show's address
 * renamed, so their rows are new to the walk: the walk and the settings it
 * carries are what is asked here, not the museum's page 2. Past that, the
 * site repeats nothing new and the walk must stop.
 *
 *   node scraper/fixtures/morgan_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits(); // saved pages: nothing can arrive late — see PAUSES THAT ONLY A LIVE PAGE CAN USE
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'morgan_pages');
const B = 'https://www.themorgan.org';

// The text/html part of a saved .mhtml, as from_saved_pages.js reads it.
function readMhtml(file) {
  const raw = fs.readFileSync(path.join(PAGES, file), 'latin1');
  const start = raw.search(/^Content-Type: text\/html/im);
  const head = raw.slice(start, raw.indexOf('\r\n\r\n', start));
  let body = raw.slice(raw.indexOf('\r\n\r\n', start) + 4);
  const end = body.search(/\r\n------MultipartBoundary/);
  if (end > 0) body = body.slice(0, end);
  if (/quoted-printable/i.test(head)) {
    body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return Buffer.from(body, 'latin1').toString('utf8');
}

const past1 = readMhtml('listing_past_2025-2026.mhtml');
// Every show address on the page renamed with a suffix: a new page's rows.
const renamed = suffix => past1.replace(/href="(https:\/\/www\.themorgan\.org\/(?:exhibitions\/)?[a-z0-9-]+)"/g,
  (m, u) => /\/exhibitions\/past\b/.test(u) ? m : `href="${u}${suffix}"`);
const PAST = B + '/exhibitions/past/2025-2026';
const SERVED = {
  [B + '/exhibitions/current']: readMhtml('listing_current.mhtml'),
  [B + '/exhibitions/upcoming']: readMhtml('listing_upcoming.mhtml'),
  [PAST]: past1,
  [PAST + '?page=1']: renamed('-p2'),
  [PAST + '?page=2']: renamed('-p3'),
  [PAST + '?page=3']: renamed('-p3'),   // nothing new: the walk must end here
};

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext();
    const asked = [];
    await context.route(() => true, r => {
      const u = r.request().url();
      asked.push(u);
      const body = SERVED[u];
      return body ? r.fulfill({ status: 200, contentType: 'text/html', body }) : r.abort();
    });
    const page = await context.newPage();
    const log = console.log; console.log = () => {};
    let rows;
    try { rows = await S.scrapeVenue(page, 'morgan', { listingOnly: true }); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const past = suffix => real.filter(r => r.url.startsWith(B) && r.url.endsWith(suffix) && (r._pages || []).some(p => p.startsWith('past')));

    check('MP-001: the past year-pairs are paged through — page 3 of 2025-2026 is read',
      asked.includes(PAST + '?page=2') && past('-p3').length > 0, asked.filter(u => u.startsWith(PAST)).join(' '));
    check('MP-002: and the walk stops when a page brings nothing new',
      asked.includes(PAST + '?page=3') && !asked.includes(PAST + '?page=4'), asked.filter(u => u.startsWith(PAST)).join(' '));
    const p1 = real.filter(r => r.url.startsWith(B + '/exhibitions/') && !/-p[23]$/.test(r.url) && (r._pages || []).some(p => p.startsWith('past')));
    check('MP-003: pages 2 and 3 are read with the past page\'s own selector — as many shows as page 1',
      p1.length > 0 && past('-p2').length === p1.length && past('-p3').length === p1.length,
      `page 1: ${p1.length}, page 2: ${past('-p2').length}, page 3: ${past('-p3').length}`);
    const later = [...past('-p2'), ...past('-p3')];
    check('MP-004: every show on pages 2 and 3 carries its listing description',
      later.length > 0 && later.every(r => (r.summary || '').length > 80),
      later.filter(r => (r.summary || '').length <= 80).map(r => r.title).join(' | '));
    check('MP-005: Collections Spotlight is excluded on every page, at either address shape',
      !real.some(r => /Collections?\s+Spotlight/i.test(r.title)), real.filter(r => /Spotlight/i.test(r.title)).map(r => r.url).join(' '));
    check('MP-006: every past show has a closing date',
      [...p1, ...later].every(r => r.end_date), [...p1, ...later].filter(r => !r.end_date).map(r => r.title).join(' | '));
    const on = ctx => real.filter(r => (r._pages || []).some(p => p === ctx));
    const cur = on('current'), up = on('upcoming');
    check('MP-007: current — the card\'s own name and dates; "Ongoing" (J. Pierpont Morgan\'s Library) and "Presentations from our Collection" left out',
      cur.length === 3 && cur.every(r => r.title && r.end_date) && !cur.some(r => /J-Pierpont|collections-spotlight/i.test(r.url))
      && cur.some(r => r.title === 'Tarot! Renaissance Symbols, Modern Visions' && r.start_date === '2026-06-26' && r.end_date === '2026-10-04'),
      cur.map(r => `${r.title} ${r.start_date}→${r.end_date}`).join(' | '));
    check('MP-008: upcoming — all five, each named and dated from its card',
      up.length === 5 && up.every(r => r.title && r.start_date && r.end_date),
      up.map(r => `${r.title} ${r.start_date}→${r.end_date}`).join(' | '));

    // MP-009 — THE WHOLE SWEEP, NOT THE LISTINGS ONLY. 30 Sep, her first live
    // Morgan run: 39 kept after the lookback, 8 written. The past rows take
    // their description off the listing and were cut from the list of pages to
    // open — which was also the list written to the CSV. MP-001 to MP-008 stop
    // before that step (listingOnly), so none could see it. Show pages here
    // are one plain paragraph each: the question is which rows come back.
    const full = await browser.newContext();
    await full.route(() => true, r => {
      const u = r.request().url();
      if (SERVED[u]) return r.fulfill({ status: 200, contentType: 'text/html', body: SERVED[u] });
      if (u.startsWith(B + '/exhibitions/') && r.request().resourceType() === 'document') {
        return r.fulfill({ status: 200, contentType: 'text/html',
          body: '<html><body><article class="exhibitions"><h1>Show</h1><div class="field--name-body"><p>'
            + 'A plain paragraph standing in for the show page, long enough to count as curatorial text for this check. '.repeat(3)
            + '</p></div></article></body></html>' });
      }
      return r.abort();
    });
    const fullPage = await full.newPage();
    console.log = () => {};
    let written;
    try { written = await S.scrapeVenue(fullPage, 'morgan'); }
    finally { console.log = log; }
    const kept = S.applyLookback(rows.filter(r => !r.title.startsWith('[')), 'morgan', 'fixture');
    const keptPast = kept.filter(r => r._fromListing).map(r => r.url);
    const writtenUrls = new Set(written.map(r => r.url));
    check('MP-009: the full sweep writes every past show whose description came off the listing',
      keptPast.length > 0 && keptPast.every(u => writtenUrls.has(u)),
      `${keptPast.filter(u => !writtenUrls.has(u)).length} of ${keptPast.length} missing from the output`);
    check('MP-010: and their descriptions are the listing\'s, not left empty',
      written.some(r => keptPast.includes(r.url))
      && written.filter(r => keptPast.includes(r.url)).every(r => (r.summary || '').length > 80),
      written.filter(r => keptPast.includes(r.url) && (r.summary || '').length <= 80).map(r => r.title).join(' | '));
    await full.close();
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the Morgan recipe reads her saved pages and pages through its past');
  process.exit(failures ? 1 : 0);
})();
