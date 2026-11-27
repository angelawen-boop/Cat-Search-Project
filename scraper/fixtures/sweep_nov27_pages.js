/**
 * THE 27 NOV HOME RUN'S FAULTS (MENIL, CINCINNATI), ON PAGES THAT RUN KEPT AND HER SAVED SPECIAL FEATURES PAGE.
 *
 * Each venue's REAL recipe goes to the REAL listing reader or getCuratorialText; no network.
 *
 *   Menil — the text stops at the page's "Support" heading (funders, news-release teasers); no curator credit
 *     (docs/menil_pages/).
 *   Cincinnati — no "Curated by …" paragraph, no "…is made possible by…" sponsor line (docs/cincinnati_pages/).
 *   Cincinnati — special features are never rows (her decision): the names on its Special Features page are
 *     kept, and a kept name is dropped from any listing; a show the museum lists as an exhibition stays.
 *
 *   node scraper/fixtures/sweep_nov27_pages.js     (proof: build/proofs/sweep_nov27_pages.proof.js)
 */
'use strict';
require('../test_proofs.js').requireProven(__filename);   // not used until proven at this version (scraper/test_proofs.js)
const fs = require('fs');
const os = require('os');
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

const CAM = 'https://www.cincinnatiartmuseum.org/art/exhibitions';
const SAVED = {
  [CAM + '/special-features/']: 'cincinnati_pages/special_features.html',
  [CAM + '/']: 'cincinnati_pages/current.html',
  [CAM + '/upcoming-exhibitions/']: 'cincinnati_pages/upcoming.html',
  [CAM + '/exhibition-archive/']: 'cincinnati_pages/archive_index.html',
  // Its 2024 page holds Modern and Contemporary Craft's last run, at an archive address.
  [CAM + '/exhibition-archive/2024/']: 'cincinnati_pages/archive_2024.html',
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => r.abort().catch(() => {}));
    const page = await context.newPage();
    const goto = page.goto.bind(page);

    // A saved page is served at the address the recipe asks for; any other address is refused.
    const listing = async (venue, pages) => {
      for (const [url, file] of Object.entries(pages)) {
        const body = fs.readFileSync(path.join(DOCS, file), 'utf8');
        await page.route(url, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }).catch(() => {}));
      }
      page.goto = (url, o) => pages[url] ? goto(url, { ...o, waitUntil: 'load' }) : goto('about:blank');
      const log = console.log; console.log = () => {};
      try { return (await S.scrapeVenue(page, venue, { listingOnly: true })).filter(r => !r.title.startsWith('[')); }
      finally { console.log = log; page.goto = goto; await page.unrouteAll().catch(() => {}); }
    };
    const read = async (file, venue) => {
      const v = S.VENUES[venue];
      await page.setContent(fs.readFileSync(path.join(DOCS, file), 'utf8'));
      const t = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, v.dropSentence, v.descriptionSkip, v.descriptionUntil);
      return typeof t === 'string' ? t : String((t && t.text) || '');
    };

    // Text: [id, page, venue, what, junk that must be gone, the show's own text that must stay].
    const text = [
      ['N27-01', 'menil_pages/macagy.html', 'menil', 'Menil — no funder list (MacAgy)', /Houston Arts Alliance|Underwriting|generously|Weiner/, /care to listen\.”$/],
      ['N27-02', 'menil_pages/terry_winters.html', 'menil', 'Menil — no curator credit or news-release teaser (Terry Winters)', /curated by|Two gifts to the museum|generously/i, /with a sense of life\.$/],
      ['N27-03', 'menil_pages/kallat.html', 'menil', 'Menil — no curator credit where more paragraphs follow (Kallat)', /curated by|generously/i, /Project A119/],
      ['N27-04', 'cincinnati_pages/show_archive_longing.html', 'cincinnati', 'Cincinnati — no "Curated by" paragraph (Longing)', /Curated by|Ainsley/, /connect with art\.$/],
      ['N27-05', 'cincinnati_pages/show_archive_kudita.html', 'cincinnati', 'Cincinnati — no sponsor line (Tamary Kudita)', /made possible|Plutzik|VISU/, /giving everyday Zimbabweans their due\.$/],
    ];
    for (const [id, file, venue, what, bad, good] of text) {
      const t = await read(file, venue);
      check(`${id}: ${what}`, !bad.test(t) && good.test(t) && t.length > 200, t.slice(-300));
    }

    // Special features: a scratch list, empty at the start.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-n27-'));
    S.useNotShowsDirForFixtures(dir);
    {
      const rows = await listing('cincinnati', SAVED);
      const kept = S.readNotShows('cincinnati').names.map(n => n.title);
      check('N27-06: Cincinnati — the names on its Special Features page are kept',
        kept.length === 4 && kept.includes('Daumier: Political and Social Caricature, 1830–1872') && kept.includes('Modern and Contemporary Craft'), kept.join(' | '));
      const titles = rows.map(r => r.title);
      check('N27-07: Cincinnati — a special feature filed in the archive is dropped, by name, at a new address',
        !titles.includes('Modern and Contemporary Craft') && titles.includes('Discovering Ansel Adams'), titles.join(' | '));
      check('N27-08: Cincinnati — its exhibitions stay (current, upcoming, archive)',
        ['Nancy Rexroth: Secrets of My Power', 'Yayoi Kusama: All the Eternal Love I Have for the Pumpkins', 'Think Big: Large-Scale Works from the Contemporary Collection', 'Elizabeth Hawes: Radical American Fashion']
          .every(t => titles.includes(t)), titles.join(' | '));
      check('N27-09: Cincinnati — the Special Features page itself gives no row', !rows.some(r => /\/special-features\//.test(r.url)), rows.map(r => r.url).join(' '));
    }
    {
      // A name kept by an earlier sweep still drops the show when the page is not read.
      S.rememberNotShows('cincinnati', ['Fine Lines: Contemporary Japanese Ceramics']);
      const { [CAM + '/special-features/']: _, ...withoutIt } = SAVED;
      const rows = await listing('cincinnati', withoutIt);
      const titles = rows.map(r => r.title);
      check('N27-10: Cincinnati — a name kept earlier is dropped with its page unread',
        !titles.includes('Fine Lines: Contemporary Japanese Ceramics') && !titles.includes('Modern and Contemporary Craft') && titles.includes('Longing: Painting from the Pahari Kingdoms of the Northwest Himalayas'), titles.join(' | '));
    }
    fs.rmSync(dir, { recursive: true, force: true });
  } finally {
    await browser.close();
  }
  console.log(failures ? `\nsweep_nov27_pages: ${failures} failed` : '\nsweep_nov27_pages: all passed');
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.log('FAIL  sweep_nov27_pages crashed — ' + e.message); process.exitCode = 1; });
