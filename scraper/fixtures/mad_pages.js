/**
 * THE MAD PARIS RECIPE, ON THE PAGES SHE SAVED — 25 Sep 2026.
 *
 * The Musée des Arts Décoratifs refuses this container (a plain 403), so the
 * recipe was written from pages she saved in her own browser, English
 * selected (docs/mad_pages/, text only). This runs the REAL scrapeVenue,
 * listings only, over them with every other request refused, then the real
 * description reader over two of her exhibition pages.
 *
 * Her count: 2 current, 2 upcoming, 16 past back to 1 July 2024. Nothing
 * excluded.
 *
 *   node scraper/fixtures/mad_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'mad_pages');
const SITE = 'https://madparis.fr';
const SERVED = {
  [SITE + '/?page=expo-actu-en']: 'current.html',
  [SITE + '/?page=expo-avenir-en']: 'upcoming.html',
  [SITE + '/?page=expo-archives-en']: 'past.html',
};

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
      const f = SERVED[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    const log = console.log; console.log = process.env.MD_LOG ? log : () => {};
    let rows;
    try { rows = await S.scrapeVenue(page, 'mad', { listingOnly: true }); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const on = ctx => real.filter(r => (r._pages || []).some(p => p.startsWith(ctx)));

    check('MD-001: 2 current — her count', on('current').length === 2, on('current').map(r => r.title).join(' | '));
    check('MD-002: 2 upcoming — her count', on('upcoming').length === 2, on('upcoming').map(r => r.title).join(' | '));
    const past = on('past').filter(r => r.end_date >= '2024-07-01');
    check('MD-003: 16 past back to 1 July 2024 — her count', past.length === 16, past.length + ': ' + past.map(r => r.title).join(' | '));
    check('MD-004: no menu link is read as a show', real.length > 0 && !real.some(r => /^(Current exhibitions|Upcoming exhibitions|Past exhibitions|Touring Exhibitions|Your visit|Tickets|E-Shop|Musée des Arts Décoratifs|Musée Nissim de Camondo)$/.test(r.title.trim())),
      real.map(r => r.title).join(' | '));
    check('MD-005: every show has both dates', real.length > 0 && real.every(r => r.start_date && r.end_date),
      real.filter(r => !r.start_date || !r.end_date).map(r => r.title).join(' | '));
    const t = real.find(r => /La-Mode-en-Majeste/.test(r.url));
    check('MD-006: title and dates read off the card', t && t.title === 'La Mode en Majesté. Royal Thai Dress from Tradition to Modernity'
      && t.start_date === '2026-05-13' && t.end_date === '2026-11-01', t && (t.title + ' ' + t.start_date + '→' + t.end_date));
    const c = real.find(r => /Christofle-a-brilliant-story/.test(r.url));
    check('MD-007: a two-year run reads both years', c && c.start_date === '2024-11-14' && c.end_date === '2025-04-20', c && c.start_date + '→' + c.end_date);

    // The description, on her four exhibition pages.
    const p2 = await browser.newPage();
    await p2.route('**/*', r => r.abort());
    const v = S.VENUES.mad;
    for (const [f, lead, body] of [
      ['exhibition_christofle.html', /presents a major exhibition on the Maison\s+Christofle/, /over\s+six hundred pieces/],
      ['exhibition_thai_dress.html', /clothing evolution at the Thai court/, /more than a hundred exceptional garments/],
      // Gallery presentations: no lead box, so the reader falls back to the
      // page — and the ticket-and-address sidebar (.col_annexe) came with it.
      ['exhibition_luxury_china.html', /60th anniversary of cultural relations/, /The tour begins in the Jewelry Gallery/],
      ['exhibition_fashion_design_jewellery.html', /levels 5 to 9 of the Pavillon de Marsan/, /Christian Astuguevieille, and many others/]]) {
      await p2.setContent(fs.readFileSync(path.join(PAGES, f), 'utf8'));
      const d = await S.getCuratorialText(p2, v.description, v.noise, v.noiseExempt);
      const txt = typeof d === 'string' ? d : String((d && d.text) || '');
      check('MD-008: ' + f + ' — the lead and the intro are read', lead.test(txt) && body.test(txt), txt);
      check('MD-009: ' + f + ' — no ticket box, caption, credit or visit teaser', !/Tickets|Individual tickets|©|Download|Curator|Phone|Guided tours|rue de Rivoli/.test(txt), txt);
    }
    if (process.env.MD_LIST) for (const r of real) console.log(r.start_date + ' → ' + r.end_date + '  ' + r.title);
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the MAD recipe reads her saved pages');
  process.exit(failures ? 1 : 0);
})();
