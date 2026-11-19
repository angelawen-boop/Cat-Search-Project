/**
 * KHM'S CURRENT PAGE NAMES ITS HEADLINE SECTION FOR THE SEASON ("the-great-summer-exhibition", then
 * "the-great-fall-exhibition"), so a recipe scoped to one season's name read nothing from October.
 *
 * The page as a browser draws it after scrolling, 19 Nov 2026 (docs/khm_pages/current_2026-11.html), served at the
 * address the recipe asks for, read by the REAL listing reader; no network.
 *
 *   node scraper/fixtures/khm_season_pages.js     (proof: build/proofs/khm_season_pages.proof.js)
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits();
const { chromium } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const URL = 'https://www.khm.at/en/exhibitions';
let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => r.abort().catch(() => {}));
    const page = await context.newPage();
    const body = fs.readFileSync(path.join(DOCS, 'khm_pages/current_2026-11.html'), 'utf8');
    await page.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }).catch(() => {}));
    const goto = page.goto.bind(page);
    page.goto = (url, o) => url === URL ? goto(url, { ...o, waitUntil: 'load' }) : goto('about:blank');
    const log = console.log; console.log = () => {};
    let rows;
    try { rows = (await S.scrapeVenue(page, 'khm', { listingOnly: true })).filter(r => !r.title.startsWith('[')); }
    finally { console.log = log; }
    const urls = rows.filter(r => r._pages.includes('current')).map(r => r.url);
    check('KS-01: KHM — the season-named headline section is read', urls.some(u => u.endsWith('/en/exhibitions/crime-scene-ephesus')), urls.join(' '));
    check('KS-02: KHM — the permanent collections on the same page are not read as shows', urls.length === 1, urls.join(' '));
  } finally {
    await browser.close();
  }
  console.log(failures ? `\nkhm_season_pages: ${failures} failed` : '\nkhm_season_pages: all passed');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.log('FAIL  khm_season_pages crashed — ' + e.message); process.exitCode = 1; });
