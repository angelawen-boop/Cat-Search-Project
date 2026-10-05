/**
 * THE V&A RECIPE, ON HER SAVED LISTING — 5 Oct 2026.
 *
 * The 5 Oct sweep let ten Displays through against her ruling: the venue had
 * moved its whole card (badge, title, date, site, price) inside the link, so
 * the badge stopped reaching the date-side label test. She saved the what's-on
 * page the same day (docs/va_pages/). This runs the REAL scrapeVenue over it;
 * every other request, show pages included, is refused.
 *
 * Her ruling: South Kensington exhibitions only — no Displays, no other site.
 * On this page that is 6: 2 current, 4 upcoming.
 *
 *   node scraper/fixtures/va_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits();
const { chromium } = require('playwright');

const LISTING = 'https://www.vam.ac.uk/whatson?type=exhibition';
const FILE = path.join(__dirname, '..', '..', 'docs', 'va_pages', 'whatson_2026-10-05.html');

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext();
    const asked = [];
    await context.route(() => true, r => {
      const u = r.request().url();
      asked.push(u);
      return u === LISTING ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(FILE) }) : r.abort();
    });
    const page = await context.newPage();
    const logged = [];
    const log = console.log; console.log = (...a) => { logged.push(a.join(' ')); if (process.env.VA_LOG) log(...a); };
    let rows;
    try { rows = S.applyLookback(await S.scrapeVenue(page, 'va'), 'va', 'final'); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const slugs = real.map(r => r.url.replace(/^.*\/exhibitions\//, '')).sort();

    const WANT = ['chintz', 'constantinople-to-istanbul-one-city-two-empires', 'punk-to-pop',
      'rising-voices-contemporary-art-from-asia-australia-and-the-pacific', 'schiaparelli', 'sculpture-in-clay'];
    check('VA-001: the listing was read', asked.includes(LISTING));
    check('VA-002: exactly her 6 South Kensington exhibitions', slugs.join() === WANT.join(), slugs.join(' '));

    const excluded = logged.filter(l => /labels this "Display", not an exhibition/.test(l));
    check('VA-003: all 10 South Kensington Displays excluded on the card\'s own "Display" badge, each named',
      excluded.length === 10, excluded.length + '\n' + excluded.join('\n'));
    check('VA-004: "Adobe Creative Residents On Display" goes on its BADGE — the word inside a title alone is not the label',
      excluded.some(l => /Adobe Creative Residents On Display/.test(l)));
    const otherSite = logged.filter(l => /another site of this venue/.test(l));
    check('VA-005: Young V&A, V&A East Museum and the East Storehouse are excluded as other sites (4 shows)',
      otherSite.length === 4, otherSite.join('\n'));
    check('VA-006: every kept row has a title', real.every(r => r.title && r.title.length > 2));
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the V&A recipe reads its saved listing');
  process.exit(failures ? 1 : 0);
})();
