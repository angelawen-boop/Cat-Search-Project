/**
 * THE MUSÉE D'ORSAY RECIPE, ON THE PAGES SHE SAVED — 25 Sep 2026.
 *
 * d'Orsay refuses this container (Cloudflare 403 on the first page), so the
 * recipe was written from pages she saved in her own browser and cannot be
 * tested live here. This runs the REAL scrapeVenue, listings only, over those
 * pages (docs/orsay_pages/, text only — images stripped) with every other
 * request refused, then the real description reader over her exhibition page.
 *
 * Her rulings it holds to: displays always kept, "Focus on our collections"
 * included; every off-site show kept; Parcours, Immersive experience and
 * Invitation dropped; an unknown tag kept.
 *
 *   node scraper/fixtures/orsay_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'orsay_pages');
const SITE = 'https://www.musee-orsay.fr';
const SERVED = {
  [SITE + '/en/program/whats-on/exhibitions']: 'current_upcoming.html',
  [SITE + '/en/ressources/expositions-passees']: 'past.html',
  [SITE + '/en/ressources/expositions-passees?page=1']: 'past_page2.html',
  [SITE + '/en/ressources/expositions-passees?page=2']: 'past_page3.html',
  [SITE + '/en/ressources/expositions-passees?page=3']: 'past_page4.html',
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
      return f ? r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(PAGES, f)) }) : r.abort();
    });
    const page = await context.newPage();
    const logged = [];
    const log = console.log; console.log = (...a) => logged.push(a.join(' '));
    let rows;
    try { rows = await S.scrapeVenue(page, 'orsay', { listingOnly: true }); }
    finally { console.log = log; }
    const real = rows.filter(r => !r.title.startsWith('['));
    const byPath = p => real.find(r => r.url === SITE + p);
    const W = '/en/program/whats-on/exhibitions/';

    check('OR-001: a display in "Focus on our collections" is kept', !!byPath(W + 'marie-bracquemond'));
    check('OR-002: an off-site show is kept', !!byPath(W + 'cezanne-and-us') && !!byPath(W + 'what-wonderful-world-masterpieces-musee-dorsay'));
    check('OR-003: an exceptional presentation is kept', !!byPath(W + 'clair-obscur-expedition-33'));
    check('OR-004: a parcours is dropped', !real.some(r => /I Spend My Life Painting|Story of Work/.test(r.title)));
    check('OR-005: an immersive experience is dropped', !real.some(r => /A Statue for Liberty/.test(r.title)));
    check('OR-006: an invitation is dropped', !real.some(r => /Larissa Fassler/.test(r.title)));
    const b = byPath(W + 'auguste-bartholdi-liberty-enlightening-world');
    check('OR-007: name and subtitle are joined as "Name: Subtitle"', b && b.title === 'Auguste Bartholdi: Liberty Enlightening the World', b && b.title);
    const d = byPath(W + 'maurice-denis-illustrating-christian-mysticism');
    check('OR-008: ordinal dates on a long card are read ("September 29th, 2026")',
      d && d.start_date === '2026-09-29' && d.end_date === '2027-01-10', d && d.start_date + '→' + d.end_date);
    check('OR-009: every show on her pages has a closing date', real.every(r => r.end_date),
      real.filter(r => !r.end_date).map(r => r.title).join(' | '));
    check('OR-010: the past archive is read on to its second page (?page=1)', !!byPath(W + 'sargent-dazzling-paris'));
    const r = byPath(W + 'henri-riviere-man-behind-camera');
    check('OR-013: an older card split by a blank line, not a <br>, still reads "Name: Subtitle"',
      r && r.title === 'Henri Rivière: The man behind the camera', r && r.title);
    // HER COUNT, 25 Sep: 45 past exhibitions back to 1 July 2024 on the site.
    const onPage = (x, ctx) => (x._pages || []).some(p => p.startsWith(ctx));
    const past = real.filter(x => onPage(x, 'past') && !onPage(x, 'current') && x.end_date >= '2024-07-01');
    check('OR-014: 45 past exhibitions back to 1 July 2024 — her count', past.length === 45, past.length);
    check('OR-015: the last page\u2019s immersive and invitation cards are dropped',
      !real.some(x => /Tonight with the Impressionists|AGORIA|Van Gogh\u2019s Palette/.test(x.title)));

    // The description, on the page she saved because its English version
    // misbehaves.
    const p2 = await browser.newPage();
    await p2.route('**/*', r => r.abort());
    await p2.setContent(fs.readFileSync(path.join(PAGES, 'exhibition_1900_olympics.html'), 'utf8'));
    const v = S.VENUES.orsay;
    const t = await S.getCuratorialText(p2, v.description, v.noise, v.noiseExempt);
    check('OR-011: the lead paragraph is read', /Before becoming a museum in 1986/.test(t), t);
    check('OR-012: and the body under it, to its last sentence', /first invited to take part in the Olympic Games/.test(t), t);
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the d’Orsay recipe reads her saved pages as she ruled');
  process.exit(failures ? 1 : 0);
})();
