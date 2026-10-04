/**
 * THE CINCINNATI ART MUSEUM RECIPE, ON ITS SAVED PAGES — 4 Oct 2026.
 *
 * Saved by the container itself, her yes for this venue: the six listings and
 * one show page of each address shape (docs/cincinnati_pages/). This runs the
 * REAL scrapeVenue over them, show pages included, every other request
 * refused — a show page not saved comes back with no description, which is
 * the venue-reader's failure path, not this recipe's.
 *
 * Her count: current 2, upcoming 2, past 2026 4, 2025 14, 2024 9. Nothing
 * excluded.
 *
 *   node scraper/fixtures/cincinnati_pages.js
 *   CI_LIST=1 node scraper/fixtures/cincinnati_pages.js   every row
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
S.useFixtureWaits(); // saved pages: nothing can arrive late — see PAUSES THAT ONLY A LIVE PAGE CAN USE
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'cincinnati_pages');
const B = 'https://www.cincinnatiartmuseum.org';
const E = B + '/art/exhibitions';
const SERVED = {
  [E + '/']: 'current.html',
  [E + '/upcoming-exhibitions/']: 'upcoming.html',
  [E + '/exhibition-archive/']: 'archive_index.html',
  [E + '/exhibition-archive/2025/']: 'archive_2025.html',
  [E + '/exhibition-archive/2024/']: 'archive_2024.html',
  [E + '/exhibition-archive/2023/']: 'archive_2023.html',
  [E + '/nancy-rexroth-secrets-of-my-power/']: 'show_current_rexroth.html',
  [E + '/upcoming-exhibitions/the-art-of-charley-harper-creatures-wild-and-tame/']: 'show_upcoming_harper.html',
  [E + '/exhibition-archive/2025/tintorettos-genesis/']: 'show_archive_tintoretto.html',
  [E + '/special-features/you-and-me-and-the-space-between-our-expedition-starts-now/']: 'show_special_you_and_me.html',
};

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
      const f = SERVED[u];
      return f ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    const logged = [];
    const log = console.log; console.log = (...a) => { logged.push(a.join(' ')); if (process.env.CI_LOG) log(...a); };
    let rows;
    try { rows = S.applyLookback(await S.scrapeVenue(page, 'cincinnati'), 'cincinnati', 'final'); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const on = ctx => real.filter(r => (r._pages || []).some(p => p === ctx));
    const names = rs => rs.map(r => r.title).join(' | ');

    // The year pages are DERIVED (expandYearArchive), so ask which were read.
    const years = S.listingPages(S.VENUES.cincinnati).map(p => p.path);
    const y = new Date().getUTCFullYear();
    check('CI-001: the archive years are derived — last year back to 2023, each with its trailing slash',
      y === 2026 ? years.slice(3).join() === ['2025', '2024', '2023'].map(n => `/art/exhibitions/exhibition-archive/${n}/`).join() : years.length >= 6,
      years.join(' '));

    check('CI-002: 2 current — her count', on('current').length === 2, names(on('current')));
    check('CI-003: 2 upcoming — her count', on('upcoming').length === 2, names(on('upcoming')));
    check('CI-004: past 2026 — 4, her count (the archive\'s own page)', on('past').length === 4, names(on('past')));
    check('CI-005: past 2025 — 14, her count', on('past 2025').length === 14, names(on('past 2025')));
    check('CI-006: past 2024 — 9 inside the lookback, her count', on('past 2024').length === 9, names(on('past 2024')));
    check('CI-007: past 2023 — nothing closed on or after 1 July 2024', on('past 2023').length === 0, names(on('past 2023')));
    check('CI-008: 31 rows in all', real.length === 31, real.length);

    // The Venice showing of Collective Behavior links to its own website —
    // another host, refused by the engine and counted, never a row.
    check('CI-009: the off-site Venice card is not a row', !real.some(r => /collectivebehaviorvenice/.test(r.url)));
    check('CI-010: no menu, year link or visitor-map link is read as a show',
      !real.some(r => /\/exhibition-archive\/\d{4}\/$|\/visit\/|\/special-features\/$|\/upcoming-exhibitions\/$/.test(r.url)),
      real.filter(r => /\/visit\/|\/\d{4}\/$/.test(r.url)).map(r => r.url).join(' '));
    check('CI-011: every row has a title', real.every(r => r.title && r.title.length > 2),
      real.filter(r => !r.title).map(r => r.url).join(' '));

    const at = slug => real.find(r => r.url.endsWith('/' + slug + '/'));
    const dt = r => r && `${r.title} ${r.start_date}→${r.end_date}`;
    const k = at('yayoi-kusama-all-the-eternal-love-i-have-for-the-pumpkins');
    check('CI-012: a current card — title and both dates', k && k.title === 'Yayoi Kusama: All the Eternal Love I Have for the Pumpkins'
      && k.start_date === '2026-07-17' && k.end_date === '2026-10-18', dt(k));
    const r = at('nancy-rexroth-secrets-of-my-power');
    check('CI-013: a run across the new year reads both years', r && r.start_date === '2026-10-02' && r.end_date === '2027-01-03', dt(r));
    const l = at('longing-painting-from-the-pahari-kingdoms-of-the-northwest-himalayas');
    check('CI-014: weekdays before the dates ("Friday, February 6–Sunday, June 7, 2026")',
      l && l.start_date === '2026-02-06' && l.end_date === '2026-06-07', dt(l));
    const s = at('shapeshifting-unconventional-approaches-in-contemporary-japanese-design');
    check('CI-015: filed under the year it OPENED, closing the next', s && s.start_date === '2024-01-13' && s.end_date === '2025-01-12', dt(s));
    const c = at('the-culture-hip-hop-and-contemporary-art-in-the-21st-century');
    check('CI-016: a run closing inside the lookback is kept with its dates', c && c.end_date === '2024-09-29', dt(c));
    const undated = real.filter(x => !x.start_date || !x.end_date);
    check('CI-017: every row but the Weston Collection ("Now Open") has both dates',
      undated.length === 1 && /weston-collection/.test(undated[0].url), undated.map(dt).join(' | '));

    // Descriptions, on the four saved show pages — one per address shape.
    for (const [slug, lead, notIn] of [
      ['nancy-rexroth-secrets-of-my-power', /first career retrospective/, /Elevators|Welcome Cart|Free admission|Press Release|feedback/],
      ['the-art-of-charley-harper-creatures-wild-and-tame', /minimal realism/, /funded in part|Ticketed|Purchase Tickets|\$17/],
      ['tintorettos-genesis', /Scuola della Trinità/, /Vance Waddell|Free Admission|Press Release|generously supported/],
      ['you-and-me-and-the-space-between-our-expedition-starts-now', /panoramic landscape painting/, /Free, drop-in|Rosenthal Education Center \(REC\)/]]) {
      const row = at(slug);
      const txt = row ? String(row.summary || '') : '';
      check(`CI-018: ${slug} — the curatorial text is read`, lead.test(txt), txt.slice(0, 200));
      check(`CI-019: ${slug} — no tickets, access notes, funders or gallery line`, txt && !notIn.test(txt), txt);
    }

    check('CI-020: all six listings were read', Object.keys(SERVED).slice(0, 6).every(u => asked.includes(u)),
      Object.keys(SERVED).slice(0, 6).filter(u => !asked.includes(u)).join(' '));
    const isNav = S.VENUES.cincinnati.isNav;
    check('CI-021: isNav names the listings and nothing else',
      [E + '/', E + '/upcoming-exhibitions/', E + '/exhibition-archive/', E + '/exhibition-archive/2025/', E + '/exhibition-archive/2021-exhibitions/', E + '/special-features/'].every(isNav)
      && ![E + '/nancy-rexroth-secrets-of-my-power/', E + '/exhibition-archive/2025/tintorettos-genesis/', E + '/special-features/you-and-me-and-the-space-between-our-expedition-starts-now/'].some(isNav));

    if (process.env.CI_LIST) for (const x of real) console.log(`${(x._pages || []).join(',').padEnd(10)} ${x.start_date} → ${x.end_date}  ${x.title}`);
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the Cincinnati recipe reads its saved pages');
  process.exit(failures ? 1 : 0);
})();
