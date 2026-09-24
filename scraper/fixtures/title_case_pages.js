/**
 * ARE TITLES RECORDED IN THE MUSEUM'S OWN LETTERS, ON REAL PAGES?
 *
 * WHY THIS EXISTS. Several venues type a title normally ("Primeval Waters")
 * and only DISPLAY it in capitals through styling. The scraper reads what is
 * displayed, so the 13 Sep sweep recorded ~150 titles in capitals. restoreCase
 * (sweep_prototype.js) puts the museum's letters back — but its only fixtures
 * were hand-made snippets, and a capitals fault is invisible until it reaches
 * her approval pile.
 *
 * So this runs the REAL scrapeVenue, listing pages only, over pages she saved
 * from her own browser on 24 Sep (docs/title_case_pages/). No network: every
 * request that is not one of the saved files is refused, and every listing
 * page the recipe asks for that was not saved is answered with a blank page.
 *
 * Two kinds of check:
 *   - THE RULE, asked directly: every title read must appear on the page in
 *     exactly those letters. A title found only in different letters is the
 *     fault this file exists for.
 *   - NAMED ROWS, including titles the museum itself typed in capitals, which
 *     must STAY in capitals.
 *
 * The Tate page was saved at the exhibitions-only address. If the recipe asks
 * for a different address, the page is never served and the Tate check fails.
 *
 *   node scraper/fixtures/title_case_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'title_case_pages');

const CASES = [
  {
    venue: 'rijks',
    url: 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/past',
    file: 'rijks_past.mhtml',
    named: [
      ['/exhibitions/fiona-tan-monomania', 'Fiona Tan: Monomania'],
      ['/exhibitions/past/slavery', 'Slavery'],
      ['/exhibitions/past/rijksmuseum-and-slavery', 'RIJKSMUSEUM & SLAVERY'],  // typed in capitals
      ['/exhibitions/past/revolusi', 'REVOLUSI!'],                             // typed in capitals
    ],
  },
  {
    venue: 'louvre',
    url: 'https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions?date=2025',
    file: 'louvre_past_2025.mhtml',
    named: [
      ['/exhibitions/the-met-at-the-louvre', 'The Met at the Louvre'],
      ['/exhibitions/a-new-look-at-watteau', 'A new look at Watteau'],
      ['/exhibitions/louvre-couture', 'LOUVRE COUTURE'],                       // typed in capitals
    ],
  },
  {
    venue: 'acq',
    url: 'https://www.acquavellagalleries.com/exhibitions',
    file: 'acq_exhibitions.mhtml',
    // Name, subtitle and gallery read as separate pieces; a colon between
    // name and subtitle; the gallery only on a show run in both galleries
    // back to back — her ruling, 24 Sep (cardPartsTitle, placeTravellingRuns).
    named: [
      ['/exhibitions/joan-miro-jean-paul-riopelle', 'Joan Miró | Jean Paul Riopelle'],
      ['/exhibitions/matisse2', 'Matisse: The Pursuit of Harmony'],
      ['/exhibitions/vivid', 'VIVID'],                                         // typed in capitals
      ['/exhibitions/picasso', 'PICASSO: Seven Decades of Drawing'],           // first word typed in capitals
      // One show, two galleries, back to back: each run names its gallery.
      ['/exhibitions/portraiture-from-cassatt-to-warhol', 'Portraiture: From Cassatt to Warhol (New York)'],
      ['/exhibitions/portraiture', 'Portraiture: From Cassatt to Warhol (Palm Beach)'],
      // Same name three years apart is two shows: no gallery on either.
      ['/exhibitions/miquel-barcelo4', 'Miquel Barceló'],
      ['/exhibitions/miquel-barcelo3', 'Miquel Barceló'],
      // A name with its own colon takes the subtitle after a dash.
      ['/exhibitions/unnatural-nature-post-pop-landscapes', 'Unnatural Nature: Post-Pop Landscapes – Curated by Todd Bradway'],
    ],
  },
  {
    // Plain HTML, not a browser save: fetched 24 Sep with no browser, because
    // the card's second title line is in the page as served. Served at its
    // real address (not file://) so relative links resolve as on the site.
    venue: 'ng',
    url: 'https://www.nationalgallery.org.uk/exhibitions/past',
    file: 'ng_past.html',
    html: true,
    named: [
      // Heading + the card's own second title line (withPostTitle).
      ['/exhibitions/past/radical-harmony-neo-impressionists', "Radical Harmony: Helene Kröller-Müller's Neo-Impressionists"],
      // A heading that already ends in a colon is not given a second one.
      ['/exhibitions/past/rachel-maclean-the-lion-and-the-unicorn', 'Rachel Maclean: The Lion and The Unicorn'],
      // No second line on the card: the heading alone.
      ['/exhibitions/past/zurbaran', 'Zurbarán'],
    ],
  },
  {
    venue: 'tate-modern',
    url: 'https://www.tate.org.uk/whats-on?date_range=from_now&gallery_group=tate-modern&event_type=exhibition',
    file: 'tate_modern_from_now.mhtml',
    named: [
      ['/tate-modern/frida-kahlo-the-making-of-an-icon', 'Frida: The Making of an Icon'],
    ],
  },
];

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const squash = s => String(s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium(), headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    // Plain-HTML cases are answered at their real address; every other
    // request is refused, so nothing leaves this machine.
    const served = new Map(CASES.filter(c => c.html)
      .map(c => [c.url, fs.readFileSync(path.join(PAGES, c.file))]));
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => {
      const body = served.get(r.request().url());
      return body ? r.fulfill({ status: 200, contentType: 'text/html', body }) : r.abort();
    });
    const page = await context.newPage();
    const goto = page.goto.bind(page);
    const open = (c, o) => c.html
      ? goto(c.url, { ...o, waitUntil: 'load' })
      : goto('file://' + path.join(PAGES, c.file), { ...o, waitUntil: 'load' });

    for (const c of CASES) {
      page.goto = (url, o) => url === c.url ? open(c, o) : goto('about:blank');

      // The recipe's log lines are not this file's output.
      const log = console.log; console.log = () => {};
      let rows;
      try { rows = await S.scrapeVenue(page, c.venue, { listingOnly: true }); }
      finally { console.log = log; }
      rows = rows.filter(r => !r.title.startsWith('['));

      // scrapeVenue ends on whichever page it visited last, so reload the saved
      // page to read its typed text.
      await open(c, {});
      const typed = squash(await page.evaluate(() => document.body.textContent));
      const typedLower = typed.toLowerCase();

      ok(rows.length > 0, `TC-${c.venue}-read: the saved ${c.venue} page is served at the recipe's own address and yields rows`,
        `${rows.length} rows`);

      const wrong = rows.filter(r => !typed.includes(r.title) && typedLower.includes(r.title.toLowerCase()));
      ok(wrong.length === 0, `TC-${c.venue}-letters: every ${c.venue} title is on the page in exactly those letters (${rows.length} rows)`,
        wrong.map(r => r.title).slice(0, 5).join(' | '));

      const find = end => rows.find(r => r.url.endsWith(end));
      for (const [end, want] of c.named || []) {
        const r = find(end);
        ok(r && r.title === want, `TC-${c.venue}-named: ${end} reads "${want}"`, r ? `got "${r.title}"` : 'row missing');
      }
      for (const [end, want] of c.starts || []) {
        const r = find(end);
        ok(r && r.title.startsWith(want), `TC-${c.venue}-starts: ${end} starts "${want}"`, r ? `got "${r.title}"` : 'row missing');
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\ntitle_case_pages: ${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('FAIL  title_case_pages crashed — ' + e.message); process.exitCode = 1; });
