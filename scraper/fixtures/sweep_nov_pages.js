/**
 * THE 19 NOV CONTAINER RUN'S FAULTS, ON PAGES READ LIVE IN THE SESSION THAT FOLLOWED.
 *
 * Each venue's REAL recipe goes to the REAL listing reader or getCuratorialText; no network.
 *
 *   Louvre — its shows moved to /what-s-on/exhibitions/ (docs/listing_pages/louvre_current_2026-11.html).
 *   Wallace — the current grid moved to `.section-listing` (docs/listing_pages/wallace_current_2026-11.html).
 *   Tate Modern — sessions under a show (relaxed hours, members' hours, private views) are not shows.
 *   Brera — the info block's label holds its line break inside the bold (docs/brera_pages/).
 *   Junk — KHM's address box, the National Gallery's ticket and organiser lines, the Uffizi's ticket
 *     prices, Lévy Gorvy Dayan's weekly hours, Tate's funders, the Rijksmuseum's "Thanks to" block.
 *
 *   node scraper/fixtures/sweep_nov_pages.js     (proof: build/proofs/sweep_nov_pages.proof.js)
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits();
const { chromium } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

// The run's own addresses (run_2026-11-19_195713/tate-modern.csv).
const TM = 'https://www.tate.org.uk/whats-on/tate-modern/';
const SESSIONS = ['ana-mendieta/members-hours-ana-mendieta', 'ana-mendieta/relaxed-hours-ana-mendieta',
  'frida-kahlo-the-making-of-an-icon/frida-the-making-of-an-icon', 'frida-kahlo-the-making-of-an-icon/members-private-view-frida',
  'julio-le-parc/members-hours-julio-le-parc', 'light-and-magic/relaxed-hours-light-and-magic', 'monet/members-hours', 'monet/members-private-view'];
const SHOWS = ['ana-mendieta', 'frida-kahlo-the-making-of-an-icon', 'julio-le-parc', 'light-and-magic', 'monet', 'ink', 'tarek-atoui'];

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => r.abort().catch(() => {}));
    const page = await context.newPage();
    const goto = page.goto.bind(page);

    // A saved page is served at the address the recipe asks for, so its links resolve as live.
    const listing = async (venue, pages) => {
      for (const [url, file] of Object.entries(pages)) {
        const body = fs.readFileSync(path.join(DOCS, file), 'utf8');
        await page.route(url, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }).catch(() => {}));
      }
      page.goto = (url, o) => pages[url] ? goto(url, { ...o, waitUntil: 'load' }) : goto('about:blank');
      const log = console.log; console.log = () => {};
      try { return (await S.scrapeVenue(page, venue, { listingOnly: true })).filter(r => !r.title.startsWith('[')); }
      finally { console.log = log; page.goto = goto; }
    };
    const read = async (file, venue) => {
      const v = S.VENUES[venue];
      await page.setContent(fs.readFileSync(path.join(DOCS, file), 'utf8'));
      const t = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, v.dropSentence, v.descriptionSkip, v.descriptionUntil);
      return typeof t === 'string' ? t : String((t && t.text) || '');
    };

    {
      const rows = await listing('louvre', { 'https://www.louvre.fr/en/exhibitions-and-events/exhibitions': 'listing_pages/louvre_current_2026-11.html' });
      const at = rows.map(r => r.url).filter(u => /\/en\/what-s-on\/exhibitions\/[^/]+$/.test(u));
      check('NV-01: Louvre — the current shows are read at their new address', at.length === 7 && at.some(u => u.endsWith('/zurbaran')), rows.map(r => r.url).join(' '));
    }
    {
      const rows = await listing('wallace', { 'https://www.wallacecollection.org/whats-on/exhibitions-displays/': 'listing_pages/wallace_current_2026-11.html' });
      const urls = rows.map(r => r.url);
      const want = ['/winston-churchill-the-painter/', '/metamorphoses-porcelain-sculpture-by-rachel-kneebone/', '/cosimo-i-de-medici-art-and-dynasty/'];
      check('NV-02: Wallace — the three current shows are read from the new grid', want.every(w => urls.some(u => u.endsWith(w))), urls.join(' '));
      check('NV-03: Wallace — the header menu\'s past shows are not read from the current page', !urls.some(u => /\/explore\/past-exhibitions\/[^/]/.test(u)), urls.join(' '));
    }
    {
      const nav = S.VENUES['tate-modern'].isNav;
      const kept = SESSIONS.filter(s => !nav(TM + s));
      check('NV-04: Tate Modern — a session under a show is not a show', kept.length === 0, kept.join(' '));
      const lost = SHOWS.filter(s => nav(TM + s));
      check('NV-05: Tate Modern — every show itself is still read', lost.length === 0, lost.join(' '));
    }
    {
      const t = await read('brera_pages/giorgio_armani_milano_per_amore.html', 'brera');
      check('NV-06: Brera — the info block ends the description ("When", "Hours")', !/\bWhen\b|Hours|8:30|Tickets/.test(t), t.slice(-300));
      check('NV-07: Brera — the show\'s own text is kept to its last sentence', /artistic freedom\.$/.test(t) && t.length > 300, t.slice(-300));
    }
    const junk = [
      ['NV-08', 'khm_pages/bernini_painter_and_sculptor.html', 'khm', 'KHM — no address box or map link', /Google Maps|Lobkowitzplatz|arrow_outward/, /little-noticed perspective\.$/],
      ['NV-09', 'khm_pages/bernini_painter_and_sculptor.html', 'khm', 'KHM — no "Further exhibitions" blurb', /Our exhibitions take you back/, /little-noticed perspective\.$/],
      ['NV-10', 'khm_pages/toni_r_toivonen_last_impressions.html', 'khm', 'KHM — no address or blurb on a second page', /Google Maps|Maria-Theresien-Platz|Unsere Ausstellungen|traditionsreiche/, /death in art history\.$/],
      ['NV-11', 'ng_pages/zurbaran.html', 'ng', 'National Gallery — no ticket or organiser line', /Tickets are required|organised by/i, /Sainsbury Wing between 2 May and 23 August 2026\.$/],
      ['NV-12', 'uffizi_pages/magnifico_1492.html', 'uffizi', 'Uffizi — no ticket prices', /euros?\b|tickets? online/i, /Drawing on meticulous scholarly/],
      ['NV-13', 'lgd_pages/yves_klein_and_the_tangible_world.html', 'lgd', 'Lévy Gorvy Dayan — no weekly hours', /2 pm to 6 pm|schedule is subject/, /at 6:30 pm\.$/],
      ['NV-14', 'tate_pages/ink.html', 'tate-modern', 'Tate Modern — no funders\' paragraph or partner panel', /Supported by|supported by|Supporters Circle/, /the avant-garde\.$/],
      ['NV-16', 'tate_pages/hylozoic_desires.html', 'tate-britain', 'Tate Britain — no funders\' paragraph', /Bukhman|additional support/, /Somerset House/],
      ['NV-17', 'tate_pages/hylozoic_desires.html', 'tate-britain', 'Tate Britain — no commission credit', /Halomancy 2025 was commissioned/, /Somerset House/],
      ['NV-18', 'rijks_pages/drawing.html', 'rijks', 'Rijksmuseum — no "Thanks to" funders', /made possible|Tavolozza/, /The Morgan Library & Museum in New York\.$/],
    ];
    for (const [id, file, venue, what, bad, good] of junk) {
      const t = await read(file, venue);
      check(`${id}: ${what}`, !bad.test(t) && good.test(t) && t.length > 500, t.slice(-300));
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `\nsweep_nov_pages: ${failures} failed` : '\nsweep_nov_pages: all passed');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.log('FAIL  sweep_nov_pages crashed — ' + e.message); process.exitCode = 1; });
