/**
 * THE ASHMOLEAN RECIPE, ON PAGES READ ONCE AND SAVED — 27 Sep 2026. No network.
 *
 * The real scrapeVenue over docs/ashmolean_pages/, every other request refused.
 * Her count: current 0 major + 4 free, upcoming 2 major + 1 free, past back to
 * 1 July 2024 — 4 major + 13 free. Nothing excluded; displays kept.
 * Then the full path over the three exhibition pages saved: dates completed
 * from the show's own page, and the description clean.
 *
 *   node scraper/fixtures/ashmolean_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const D = path.join(__dirname, '..', '..', 'docs', 'ashmolean_pages');
const B = 'https://www.ashmolean.org';
const SERVED = {
  [B + '/exhibitions']: 'current_upcoming.html',
  [B + '/past-exhibitions']: 'past.html',
  [B + '/past-exhibitions?page-996041=1']: 'past_page2.html',
  [B + '/exhibition/aphrodite-the-making-of-a-goddess']: 'exhibition_aphrodite.html',
  [B + '/exhibition/colonial-views-of-india-impey-photographs']: 'exhibition_colonial_views.html',
  [B + '/display/roman-oxfordshire-coins-display']: 'display_restoring_rome.html',
};
const MAJOR_PAST = ['in-bloom-how-plants-changed-our-world', 'this-is-what-you-get-stanley-donwood-radiohead-thom-yorke', 'anselm-kiefer-early-works', 'money-talks-art-power-and-society'];

let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 400) : '')); }
};

async function run(browser, listingOnly) {
  const ctx = await browser.newContext();
  await ctx.route(() => true, r => {
    const f = SERVED[r.request().url()];
    return f ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(D, f)) }) : r.abort();
  });
  const page = await ctx.newPage();
  const log = console.log; console.log = () => {};
  let rows;
  try { rows = S.applyLookback(await S.scrapeVenue(page, 'ashmolean', { listingOnly }), 'ashmolean', 'final'); }
  finally { console.log = log; await ctx.close(); }
  return rows.filter(r => !r.title.startsWith('['));
}

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  try {
    const real = await run(browser, true);
    const on = ctx => real.filter(r => (r._pages || [])[0] === ctx);
    const cur = on('current/upcoming');
    check('AS-001: 7 current and upcoming — her 4 free + 2 major + 1 free', cur.length === 7, cur.map(r => r.title).join(' | '));
    check('AS-002: the display is kept, from its own /display/ address', cur.some(r => r.url === B + '/display/roman-oxfordshire-coins-display'));
    const past = real.filter(r => !cur.includes(r));
    const majors = past.filter(r => MAJOR_PAST.some(m => r.url.endsWith('/' + m)));
    check('AS-003: 4 past majors back to 1 July 2024 — her count', majors.length === 4, majors.map(r => r.title).join(' | '));
    check('AS-004: 13 past free exhibitions and displays — her count', past.length - majors.length === 13, past.filter(r => !majors.includes(r)).map(r => r.title).join(' | '));
    check('AS-005: the menu\'s Aphrodite promo is not read as a past show', !past.some(r => /aphrodite/.test(r.url)));
    check('AS-006: every row has a title', real.every(r => r.title && r.title.length > 3), real.filter(r => !r.title).map(r => r.url).join(' '));
    check('AS-007: every past free row has its closing date off the card', past.every(r => r.end_date), past.filter(r => !r.end_date).map(r => r.title).join(' | '));
    check('AS-008: a past major\'s full run off the card', (real.find(r => /anselm-kiefer/.test(r.url)) || {}).start_date === '2025-02-14');
    check('AS-009: nothing older than the floor', real.every(r => !r.end_date || r.end_date >= '2024-07-01'), real.filter(r => r.end_date && r.end_date < '2024-07-01').map(r => r.title).join(' | '));

    // Titles typed in capitals — code writes ordinary capitals, her ruling 27 Sep.
    for (const [from, to] of [
      ['COLONIAL VIEWS OF INDIA', 'Colonial Views of India'],
      ['SISTERS, BROTHERS, OTHERS: NATIONALITY AND 20TH-CENTURY CHINESE ART', 'Sisters, Brothers, Others: Nationality and 20th-Century Chinese Art'],
      ['CHEUNG YEE AND HIS 1960s HONG KONG CONTEMPORARIES', 'Cheung Yee and His 1960s Hong Kong Contemporaries'],
      ['ASHMOLEAN NOW: FLORA YUKHNOVICH x DANIEL CREWS-CHUBB', 'Ashmolean Now: Flora Yukhnovich x Daniel Crews-Chubb'],
      ['KABUKI KIMONO: DISPLAY COSTUMES OF BANDŌ TAMASABURŌ V', 'Kabuki Kimono: Display Costumes of Bandō Tamasaburō V'],
      ['SIMPLE PLEASURES: LI JIN WITH ROGER LAW', 'Simple Pleasures: Li Jin with Roger Law'],
      ['HENRY VIII AND HIS WIVES', 'Henry VIII and His Wives'],
      ['ASHMOLEAN NOW: BETTINA VON ZWEHL', 'Ashmolean Now: Bettina von Zwehl'],
      ["O'KEEFFE AND RUSKIN'S WORLD", "O'Keeffe and Ruskin's World"],
      ['A LIFE IN ART – THE EARLY YEARS', 'A Life in Art – The Early Years'],
      // Not all capitals: left exactly as the venue wrote it.
      ['Turner\'s High Street', 'Turner\'s High Street'],
      ['IN BLOOM: How Plants Changed Our World', 'IN BLOOM: How Plants Changed Our World'],
    ]) check('AS-016: "' + from + '" → "' + to + '"', S.titleFromCaps(from) === to, S.titleFromCaps(from));
    check('AS-017: every Ashmolean row leaves the listing in ordinary capitals', real.every(r => /\p{Ll}/u.test(r.title)), real.filter(r => !/\p{Ll}/u.test(r.title)).map(r => r.title).join(' | '));

    const full = await run(browser, false);
    const get = end => full.find(r => r.url.endsWith(end)) || {};
    const a = get('/aphrodite-the-making-of-a-goddess'), c = get('/colonial-views-of-india-impey-photographs'), d = get('/roman-oxfordshire-coins-display');
    check('AS-010: an upcoming major\'s run from its own page — 8 Oct 2026 to 11 Apr 2027', a.start_date === '2026-10-08' && a.end_date === '2027-04-11', a.start_date + '→' + a.end_date);
    check('AS-011: a free show\'s opening date from its own page', c.start_date === '2026-04-11' && c.end_date === '2026-12-13', c.start_date + '→' + c.end_date);
    check('AS-012: a display\'s too', d.start_date === '2025-12-06' && d.end_date === '2026-11-29', d.start_date + '→' + d.end_date);
    check('AS-013: no note claims only a month was published once the page gave the day', !/shows only/.test(a.notes || ''), a.notes);
    check('AS-018: the full name from the page header — name and subtitle', c.title === 'Colonial Views of India: Photographs by Eugene Clutterbuck Impey', c.title);
    check('AS-019: a header with no subtitle leaves the listing\'s longer name', d.title === 'Restoring Rome: Roman Oxfordshire Coins Display', d.title);
    check('AS-020: a subtitle line that is the dates is not a subtitle', a.title === 'Aphrodite: The Making of a Goddess', a.title);
    check('AS-014: Aphrodite\'s bold lead is kept', /^Step into the world of Aphrodite/.test(a.summary || ''), (a.summary || '').slice(0, 120));
    for (const r of [a, c, d]) {
      check('AS-015: ' + (r.title || '?') + ' — no ticket, membership, caption or credit text',
        r.summary && !/[Mm]embership|[Tt]icket|©|Header image|£|Gallery \d/.test(r.summary), r.summary);
    }
  } finally { await browser.close(); }
  console.log(failures ? failures + ' failed' : 'the Ashmolean recipe reads its saved pages');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  ashmolean_pages crashed — ' + e.message); process.exit(1); });
