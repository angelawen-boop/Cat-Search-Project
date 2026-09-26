/**
 * THE MAM PARIS RECIPE, ON ITS ARCHIVE PAGES — 25 Sep 2026.
 *
 * Her check of the list: 16 past exhibitions back to 1 July 2024, over two
 * archive pages, and two kinds of row that are not exhibitions here — a
 * collection display subtitled "Permanent collection" (Cultural Olympiad) and
 * "New acquisitions by the Photography Committee". This runs the REAL
 * scrapeVenue, listings only, over the three archive pages saved once from the
 * live site (docs/mam_pages/, text only), every other request refused.
 *
 *   node scraper/fixtures/mam_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'mam_pages');
const SITE = 'https://www.mam.paris.fr';
const A = SITE + '/en/archives?type_expo=Local&language=en';
const SERVED = {
  [A]: 'archive_p1.html',
  [A + '&page=0%2C0%2C0%2C0%2C0%2C1']: 'archive_p2.html',
  [A + '&page=0%2C0%2C0%2C0%2C0%2C2']: 'archive_p3.html',
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
    await context.route(() => true, r => {
      const f = SERVED[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    const logged = [];
    const log = console.log; console.log = (...a) => logged.push(a.join(' '));
    let rows;
    try { rows = await S.scrapeVenue(page, 'mam', { listingOnly: true }); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));

    check('MM-001: "Cultural Olympiad: Permanent collection" is excluded', !real.some(r => /Cultural Olympiad/.test(r.title)));
    check('MM-002: "New acquisitions by the Photography Committee" is excluded', !real.some(r => /New acquisitions/i.test(r.title)));
    check('MM-003: both exclusions are named in the log, not silent',
      logged.some(l => /excluded: Cultural Olympiad/.test(l)) && logged.some(l => /excluded: New acquisitions/.test(l)));
    const past = real.filter(r => r.end_date >= '2024-07-01');
    // Her 16, less the Cultural Olympiad and — her later ruling, 25 Sep — both
    // runs of Oliver Beer's films.
    check('MM-004: 13 past exhibitions back to 1 July 2024 — her 16, less the Cultural Olympiad and the two Oliver Beer runs', past.length === 13,
      past.length + ': ' + past.map(r => r.title).join(' | '));
    const re = S.VENUES.mam.excludeTitle;
    check('MM-005: a show whose name merely mentions a collection is kept',
      !re.test('Anni and Josef Albers Donation: From the Josef and Anni Albers Foundation')
      && !re.test('Parallel Worlds, New exhibition in the contemporary collections'));
    const n = real.find(r => /otobong-nkanga-0/.test(r.url));
    check('MM-006: name and subtitle are joined as "Name: Subtitle"',
      n && n.title === 'Otobong Nkanga: "I dreamt of you in colours"', n && n.title);
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the MAM recipe reads its archive as she ruled');
  process.exit(failures ? 1 : 0);
})();
