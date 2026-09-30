/**
 * THE MoMA DESCRIPTION, ON THE PAGES SHE SAVED — 27 Sep 2026. No network.
 *
 * Each exhibition's credit ("Organized by…", "… is organized by…", "We are
 * grateful…") is the LAST paragraph inside #description, so reading the
 * container whole carried it into every row. Read by paragraph, with the
 * recipe's `creditPara`, the curatorial text stays and the credit goes.
 *
 *   node scraper/fixtures/moma_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits(); // saved pages: nothing can arrive late — see PAUSES THAT ONLY A LIVE PAGE CAN USE
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'moma_pages');
const CASES = [
  ['exhibition_5932_nilima_sheikh.mhtml', /^“The artist’s role is to bear witness/, /most consequential artists working in South Asia today\.$/],
  ['exhibition_5918_surrealist_book_27sep.mhtml', /^A book bound with shards of shattered glass/, /thrown into a higher realm\.”$/],
  ['exhibition_5910_brancusi.mhtml', /^“Why, it is my studio,”/, /radical simplicity of his forms\.$/],
  ['exhibition_5916_mondrian.mhtml', /^On October 3, 1940, the Dutch artist Piet Mondrian/, /program of live musical performances\.$/],
];

function htmlFromMhtml(file) {
  const raw = fs.readFileSync(file, 'latin1');
  const start = raw.search(/^Content-Type: text\/html/im);
  let body = raw.slice(raw.indexOf('\r\n\r\n', start) + 4);
  const end = body.search(/\r\n------MultipartBoundary/);
  if (end > 0) body = body.slice(0, end);
  body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return Buffer.from(body, 'latin1').toString('utf8');
}

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const page = await browser.newPage();
    await page.route('**/*', r => r.abort());
    const v = S.VENUES.moma;
    for (const [f, lead, last] of CASES) {
      await page.setContent(htmlFromMhtml(path.join(PAGES, f)));
      const t = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, v.dropSentence);
      check(`MO-001: ${f} — opens on the curatorial text`, lead.test(t), t.slice(0, 120));
      check(`MO-002: ${f} — ends on it, whole`, last.test(t), t.slice(-160));
      check(`MO-003: ${f} — no credit, funder or licence text`, !/organized by|grateful|support|reproduce|©/i.test(t), t);
    }

    // ── THE LISTING, 30 Sep — what is opened, and the names ─────────────────
    // Her saved listing (listing_2026-09-30.html) has three sections under
    // their own headings. Only the exhibitions are opened; the installations
    // are dropped on the listing, never asked for. Show pages are one plain
    // paragraph each: the question is which pages are asked for and which
    // rows come back.
    const B = 'https://www.moma.org';
    const INSTALL = ['5861', '5908', '5907', '5940', '5933', '5797', '5943', '5870', '5935', '5942'];
    const EXHIB = ['5890', '5928', '5912', '5906', '5794', '5678', '5932', '5926', '5920',
                   '5918', '5936', '5910', '5869', '5916'];
    const sweep = async (listingHtml, listingOnly) => {
      const ctx = await browser.newContext();
      const asked = [];
      await ctx.route(() => true, r => {
        const u = r.request().url();
        if (r.request().resourceType() !== 'document') return r.abort();
        asked.push(u);
        if (u === B + '/calendar/exhibitions') return r.fulfill({ status: 200, contentType: 'text/html', body: listingHtml });
        if (u.startsWith(B + '/calendar/exhibitions/')) return r.fulfill({ status: 200, contentType: 'text/html',
          body: '<html><head><title>Show | MoMA</title></head><body><h1><p>Show</p></h1><div id="description"><p>'
            + 'A plain paragraph standing in for the show page, long enough to count as curatorial text. '.repeat(3)
            + '</p></div></body></html>' });
        return r.abort();
      });
      const pg = await ctx.newPage();
      const log = console.log; console.log = () => {};
      let rows;
      try { rows = await S.scrapeVenue(pg, 'moma', listingOnly ? { listingOnly: true } : {}); }
      finally { console.log = log; await ctx.close(); }
      return { rows: rows.filter(r => !String(r.title).startsWith('[')), asked };
    };
    const idOf = u => (String(u).match(/\/calendar\/exhibitions\/(\d+)/) || [])[1];

    const l30 = fs.readFileSync(path.join(PAGES, 'listing_2026-09-30.html'), 'utf8');
    const a = await sweep(l30, true);
    const got = a.rows.map(r => idOf(r.url)).sort();
    check('MM-001: 30 Sep listing — exactly the 9 current and 5 upcoming exhibitions, her count 14',
      JSON.stringify(got) === JSON.stringify([...EXHIB].sort()), got.join(' '));

    const l22 = htmlFromMhtml(path.join(PAGES, 'listing.mhtml'));
    const b = await sweep(l22, true);
    check('MM-002: 22 Sep listing — the same three headings: 14 exhibitions, no installation',
      b.rows.length === 14 && !b.rows.some(r => INSTALL.includes(idOf(r.url))), b.rows.map(r => r.title).join(' | '));

    const c = await sweep(l30, false);
    const askedIds = c.asked.map(idOf).filter(Boolean);
    check('MM-003: the full sweep never asks for an installation page — 14 pages opened, not 24',
      askedIds.length === 14 && !askedIds.some(id => INSTALL.includes(id)), askedIds.join(' '));
    check('MM-003b: and writes those 14',
      c.rows.length === 14, c.rows.length);

    const title = id => (a.rows.find(r => idOf(r.url) === id) || {}).title;
    const want = { '5890': 'Peggy Weil: Core Memory', '5928': 'Sarah Michelson: nowhere', '5912': 'Pierre Huyghe: UUmwelt',
      '5906': 'Architects of Liberation: Modernism in Western Africa',
      '5920': 'It’s Alive! A Century of Animation from the Collection', '5916': 'Mondrian Boogie Woogie' };
    const bad = Object.entries(want).filter(([id, t]) => title(id) !== t);
    check('MM-004: titles as MoMA joins them — the colon kept on the featured cards, none added after "!"',
      bad.length === 0, bad.map(([id, t]) => `${id}: "${title(id)}" (want "${t}")`).join(' | '));

    // ── THE VISITOR NOTICE, on the Architects page as the sweep read it ──────
    const arch = fs.readFileSync(path.join(PAGES, 'exhibition_5906_architects_30sep.html'), 'utf8');
    await page.setContent(arch);
    const t1 = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, v.dropSentence);
    check('MM-005: Architects of Liberation — the gallery-closure notice is dropped, the text before it kept',
      !/Please note/i.test(t1) && /^During the unprecedented period of liberation/.test(t1), t1.slice(-200));
    const t0 = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, null);
    check('MM-006: the same page without the rule still carries it (the test can fail)', /Please note/i.test(t0), t0.slice(-120));
  } finally { await browser.close(); }
  console.log(failures ? failures + ' failed' : 'the MoMA description reads her saved pages');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  moma_pages crashed — ' + e.message); process.exit(1); });
