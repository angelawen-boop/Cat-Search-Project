/**
 * THE MUSEUM OF FINE ARTS, BUDAPEST RECIPE, ON ITS SAVED PAGES.
 *
 * Saved by the container (docs/mfab_pages/): the one listing, every show page inside the lookback, and a show
 * page from most years back to 2010 (the older layouts). Runs the REAL scrapeVenue over them, every other request
 * refused; the floor is set to 2010 here so the older pages are read too, and the lookback count is taken from
 * the rows' own closing dates.
 *
 * Her count (by the listing's sections; her decisions in docs/venues.md): 19 inside the lookback — the
 * current show and 18 past. Permanent rooms out; print-room shows kept.
 *
 *   node scraper/fixtures/mfab_pages.js     (proof: build/proofs/mfab_pages.proof.js)
 *   MB_LIST=1 node scraper/fixtures/mfab_pages.js   every row
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits();
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'mfab_pages');
const E = 'https://www.mfab.hu/exhibitions/';
const SERVED = { [E]: 'listing_2026-11-27.html' };
for (const f of fs.readdirSync(PAGES)) if (/^show_.+\.html$/.test(f)) SERVED[E + f.slice(5, -5) + '/'] = f;

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext();
    await context.route(() => true, r => {
      const f = SERVED[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    S.VENUES.mfab.lookbackFrom = '2010-01-01';
    const log = console.log; console.log = () => {};
    let rows;
    try { rows = S.applyLookback(await S.scrapeVenue(page, 'mfab'), 'mfab', 'final').filter(r => !r.title.startsWith('[')); }
    finally { console.log = log; }
    if (process.env.MB_LIST) for (const r of rows) console.log(`  ${r.start_date} → ${r.end_date}  ${r.title}  (${(r.summary || '').length})`);
    const slug = s => rows.find(r => r.url === E + s + '/');
    const inWindow = rows.filter(r => r.end_date && r.end_date >= '2024-07-01');

    check('MB-001: 19 shows inside the lookback — the current show and 18 past', inWindow.length === 19, inWindow.map(r => r.title).join(' | '));
    check('MB-002: the permanent rooms are not read as shows',
      !['ancient-egypt', 'classical-antiquity', 'european-sculpture-1350-1800', 'the-baroque-hall'].some(slug), rows.map(r => r.url).join(' '));
    const g = slug('bonjour-monsieur-gauguin');
    check('MB-003: the current card — its name without its dates', g && g.title === 'Bonjour Monsieur Gauguin', g && g.title);
    const a = slug('apocalypse-biblical-prophecies-from-durer-to-bela-kondor');
    check('MB-004: a past card — its name, not its "View" button', a && a.title === 'Apocalypse', a && a.title);
    const m = slug('munkacsy-story-of-a-worldwide-sensation');
    check('MB-005: "prolonged until" — both dates read', m && m.start_date === '2024-11-27' && m.end_date === '2025-04-21', m && `${m.start_date} → ${m.end_date}`);
    const h = slug('hunting-during-the-renaissance-era'), c = slug('the-call-of-the-east-japonisme-as-reflected-in-the-prints-of-the-austro-hungarian-monarchy');
    check('MB-006: a Hungarian month and "17 May, 2020" read (older cards)',
      h && h.start_date === '2021-09-25' && c && c.start_date === '2020-02-05' && c.end_date === '2020-05-17',
      `${h && h.start_date} | ${c && c.start_date} → ${c && c.end_date}`);
    const v = slug('vasarely-120');
    check('MB-007: prose after an unclosed caption box is kept (Vasarely 120)', v && /arranged in five sections/.test(v.summary || ''), v && v.summary);
    const saved = rows.filter(r => SERVED[r.url] && r.url !== E);
    check('MB-008: every saved show page gives a description', saved.length === 28 && saved.every(r => (r.summary || '').length > 400),
      saved.filter(r => (r.summary || '').length <= 400).map(r => r.title).join(' | ') + ` (${saved.length} saved rows)`);
    const JUNK = /\bcurated by\b|\bCurators?:|\bCurators? of the exhibition\b|\bsponsor|\bpartners?:|visited with a ticket|open (?:only )?(?:from|between) Thursday|Thursday through Sunday|Due to the great interest|audio guide|guided tours|catalogue is available to purchase|We would like to|In cooperation with|Collection of Christoph Blocher|Kroa-MC, 1969/i;
    const junk = saved.filter(r => JUNK.test(r.summary || ''));
    check('MB-009: no notice, curator, sponsor, thanks or picture caption in any description', !junk.length,
      junk.map(r => `${r.title}: …${(r.summary.match(new RegExp('.{0,60}(?:' + JUNK.source + ').{0,40}', 'i')) || [''])[0]}…`).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(failures ? `\nmfab_pages: ${failures} failed` : '\nmfab_pages: all passed');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.log('FAIL  mfab_pages crashed — ' + e.message); process.exitCode = 1; });
