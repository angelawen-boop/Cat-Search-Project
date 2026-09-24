/**
 * WHERE WAS EACH ROW SEEN — asked of the REAL scrapeVenue, over pages she
 * saved from her own browser. No network: every other request is refused and
 * every listing page not saved is answered with a blank page.
 *
 * WHY. The 13 Sep sweep's notes named pages a show was never on — a promo
 * card in the site's menu, read as a listing on every page — and named one
 * page two or three times. Unit fixtures can ask the note-writing rules; only
 * real pages can show which LINKS a recipe reads.
 *
 * Checks, per venue:
 *   - no row records a page twice
 *   - no row is listed on an archive year before the year it opened (qc.js)
 *   - the named promo victims are listed only where the page really lists them
 *
 *   node scraper/fixtures/listing_pages.js
 */
'use strict';
const path = require('path');
const S = require('../sweep_prototype.js');
const QC = require('../qc.js');
const { chromium } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');

const CASES = [
  {
    venue: 'artic',
    // Three of its pages; Mary Cassatt sits in the menu's promo card on all
    // three and in the listing only on the current page.
    pages: {
      'https://www.artic.edu/exhibitions':                   'artic_pages/exhibitions_current.mhtml',
      'https://www.artic.edu/exhibitions/upcoming':          'artic_pages/exhibitions_upcoming.mhtml',
      'https://www.artic.edu/exhibitions/history?year=2024': 'artic_pages/exhibition_history_2024.mhtml',
    },
    only: [['/mary-cassatt-after-impressionism', ['current']]],
  },
  {
    venue: 'louvre',
    // Primeval Waters is on the 2025 archive only as the menu's promo card.
    pages: {
      'https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions?date=2025': 'title_case_pages/louvre_past_2025.mhtml',
    },
    absent: ['/primeval-waters'],
  },
  {
    venue: 'tate-modern',
    // Frida is linked three times on this page — search promo, featured
    // strip, results grid. On ONE page that cannot misfire, so this proves
    // only that reading the grid alone loses nothing: all 13 shows. The
    // misfires came from the "recently opened" page, no longer fetched.
    pages: {
      'https://www.tate.org.uk/whats-on?date_range=from_now&gallery_group=tate-modern&event_type=exhibition':
        'title_case_pages/tate_modern_from_now.mhtml',
    },
    count: 13,
  },
  {
    venue: 'frick',
    // The current page closes with its own "Past" section: the three latest
    // closed shows. Their home is the past page.
    pages: {
      'https://www.frick.org/exhibitions':      'listing_pages/frick_current.mhtml',
      'https://www.frick.org/exhibitions/past': 'listing_pages/frick_past.mhtml',
    },
    only: [['/exhibitions/gainsborough', ['past']], ['/exhibitions/siena', ['current/upcoming']]],
  },
  {
    venue: 'wallace',
    // The header menu names three past shows on every page; the current page
    // ends with a "Discover more" promo.
    pages: {
      'https://www.wallacecollection.org/whats-on/exhibitions-displays/': 'listing_pages/wallace_current.mhtml',
      'https://www.wallacecollection.org/explore/past-exhibitions/':      'listing_pages/wallace_past.mhtml',
    },
    only: [['/grayson-perry-delusions-of-grandeur/', ['past']], ['/ranjit-singh-sikh-warrior-king/', ['past']],
           ['/winston-churchill-the-painter/', ['current/upcoming']]],
  },
  {
    venue: 'brera',
    // NOT a misfire: its archive genuinely lists the shows still running, in
    // the same grid as the rest. Each card links twice — picture and title.
    pages: {
      'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress': 'listing_pages/brera_current.mhtml',
      'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=archive':     'listing_pages/brera_archive.mhtml',
    },
    only: [['/beauty-and-the-ideal/', ['current', 'past']]],
  },
];

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium(), headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => r.abort());
    const page = await context.newPage();
    const goto = page.goto.bind(page);

    for (const c of CASES) {
      page.goto = (url, o) => c.pages[url]
        ? goto('file://' + path.join(DOCS, c.pages[url]), { ...o, waitUntil: 'load' })
        : goto('about:blank');

      const log = console.log; console.log = () => {};
      let rows;
      try { rows = await S.scrapeVenue(page, c.venue, { listingOnly: true }); }
      finally { console.log = log; }
      rows = rows.filter(r => !r.title.startsWith('['));
      const pagesOf = r => r._pages.slice();
      const find = end => rows.find(r => r.url.endsWith(end));

      ok(rows.length > 0, `LP-${c.venue}-read: the saved pages yield rows`, `${rows.length} rows`);
      if (c.count) ok(rows.length === c.count, `LP-${c.venue}-count: the listing area alone still yields all ${c.count} shows`, `${rows.length} rows`);

      const twice = rows.filter(r => new Set(r._pages).size !== r._pages.length);
      ok(twice.length === 0, `LP-${c.venue}-once: no row records a page twice (${rows.length} rows)`,
        twice.map(r => `${r.title}: ${r._pages.join(', ')}`).slice(0, 3).join(' | '));

      for (const [end, want] of c.only || []) {
        const r = find(end);
        ok(r && JSON.stringify(pagesOf(r)) === JSON.stringify(want),
          `LP-${c.venue}-only: ${end} is listed on ${want.join(', ')} and nowhere else`,
          r ? `got ${pagesOf(r).join(', ')}` : 'row missing');
      }
      for (const end of c.absent || []) {
        ok(!find(end), `LP-${c.venue}-absent: ${end} is not read from a page it is only promoted on`);
      }

      // The finished notes, through the same writer the CSV uses, then qc.
      S.finishNotes(rows);
      const early = QC.impossibleListings(rows);
      ok(early.length === 0, `LP-${c.venue}-qc: no row listed on an archive year before it opened`,
        early.map(x => `${x.title}: ${x.pages.join(', ')}`).join(' | '));
    }
  } finally {
    await browser.close();
  }
  console.log(`\nlisting_pages: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('FAIL  listing_pages crashed — ' + e.message); process.exitCode = 1; });
