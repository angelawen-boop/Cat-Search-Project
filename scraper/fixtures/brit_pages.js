/**
 * THE BRITISH MUSEUM RECIPE, ON THE PAGES SHE SAVED — 26 Sep 2026.
 *
 * The venue refuses headless everywhere, so the recipe was written from pages
 * she saved (docs/brit_pages/, text only). This runs the REAL scrapeVenue over
 * them, no network: every other request refused.
 *
 *   node scraper/fixtures/brit_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'brit_pages');
const B = 'https://www.britishmuseum.org';
const served = u =>
  u.startsWith(B + '/exhibitions-events?whats_on_event_type=Exhibition&whats_on_when=') ? 'current_upcoming.html'
  : u === B + '/exhibitions-events/past-exhibitions' ? 'past.html'
  : u === B + '/exhibitions/samurai' ? 'exhibition_samurai_past.html'
  : u === B + '/exhibitions/bayeux-tapestry' ? 'exhibition_bayeux_current.html' : null;

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
      const f = served(r.request().url());
      return f ? r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    const logged = [];
    const log = console.log; console.log = (...a) => logged.push(a.join(' '));
    let rows;
    try { rows = S.applyLookback(await S.scrapeVenue(page, 'brit'), 'brit', 'final'); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const at = p => real.find(r => r.url === B + '/exhibitions/' + p);

    const url = S.listingPages(S.VENUES.brit)[0].path;
    const today = new Date().toISOString().slice(0, 10);
    check('BM-001: the current listing asks from today to the end of next year',
      url.endsWith(`whats_on_when=${today}TO${new Date().getUTCFullYear() + 1}-12-31`), url);
    const cur = ['john-constable-views-nature', 'declaring-independence-usa-250', 'korea', 'bayeux-tapestry'];
    check('BM-002: the four current and upcoming shows', cur.every(at), cur.filter(p => !at(p)).join(', '));
    check('BM-003: titles carry no screen-reader text', real.every(r => !/\s\.\s|Book now|Final weeks|Now open/.test(r.title)),
      real.filter(r => /\s\.\s/.test(r.title)).map(r => r.title).join(' | '));
    check('BM-004: a display card named from its own heading, not "Find out more"',
      at('war-rugs-afghanistans-knotted-history') && at('war-rugs-afghanistans-knotted-history').title === "War rugs: Afghanistan's knotted history");
    const pastLine = logged.find(l => /past: \d+ links seen/.test(l)) || '';
    check('BM-005: shows under a year heading too early for the lookback are never opened',
      /53 under a year heading too early/.test(pastLine), pastLine);
    const s = at('samurai'), b = at('bayeux-tapestry');
    check('BM-006: dates from the exhibition page\'s own date field',
      s && s.start_date === '2026-02-03' && s.end_date === '2026-05-04' && b && b.start_date === '2026-09-10' && b.end_date === '2027-07-11',
      s && `${s.start_date}→${s.end_date}`);
    check('BM-011: those dates come from the field, not a sentence scan',
      s && b && ![s.notes, b.notes].some(n => /from a sentence|structured data/.test(n || '')), s && s.notes);
    check('BM-007: the description is the museum\'s text — no tickets, room, newsletter or shop',
      s && b && /reality behind a millennium of myth/.test(s.summary) && /returned to England/.test(b.summary)
      && ![s.summary, b.summary].some(t => /Sign up|Tickets|Room 30|British Museum Shop|opening hours/i.test(t)),
      (s && s.summary.slice(0, 120)) + ' / ' + (b && b.summary.slice(0, 120)));
    check('BM-008: a display that closed before 1 July 2024 is dropped',
      !at('scot-st-ives-works-wilhelmina-barns-graham') && !at('rediscovering-gems'));
    check('BM-009: a display open across the floor is kept',
      !!at('contemporary-collecting-david-hockney-cornelia-parker') && !!at('new-life-rembrandt-and-children'));
    check('BM-010: an exhibition\'s guide pages are navigation, not shows',
      !real.some(r => /large-print-guide|plain-english-guide/.test(r.url)));
    if (process.env.BM_LIST) for (const r of real) console.log(r.start_date + ' → ' + r.end_date + '  ' + r.title);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll British Museum page checks passed.');
  process.exitCode = failures ? 1 : 0;
})();
