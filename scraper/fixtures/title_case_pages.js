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
    // Checked by the start only: how name, subtitle and city are joined is a
    // separate open question, and this file must not pin today's answer.
    starts: [
      ['/exhibitions/joan-miro-jean-paul-riopelle', 'Joan Miró | Jean Paul Riopelle'],
      ['/exhibitions/vivid', 'VIVID'],                                         // typed in capitals
      ['/exhibitions/picasso', 'PICASSO Seven Decades of Drawing'],            // first word typed in capitals
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
    await context.route(u => u.protocol !== 'file:' && u.protocol !== 'about:', r => r.abort());
    const page = await context.newPage();
    const goto = page.goto.bind(page);

    for (const c of CASES) {
      page.goto = (url, o) => url === c.url
        ? goto('file://' + path.join(PAGES, c.file), { ...o, waitUntil: 'load' })
        : goto('about:blank');

      // The recipe's log lines are not this file's output.
      const log = console.log; console.log = () => {};
      let rows;
      try { rows = await S.scrapeVenue(page, c.venue, { listingOnly: true }); }
      finally { console.log = log; }
      rows = rows.filter(r => !r.title.startsWith('['));

      // scrapeVenue ends on whichever page it visited last, so reload the saved
      // page to read its typed text.
      await goto('file://' + path.join(PAGES, c.file), { waitUntil: 'load' });
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
