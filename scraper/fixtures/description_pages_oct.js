/**
 * DESCRIPTIONS THE 5 OCT SWEEP GOT WRONG, ON THE PAGES SHE SAVED THAT DAY.
 *
 * Each venue's REAL recipe options go to the REAL getCuratorialText, exactly as
 * the detail pass passes them; no network.
 *
 *   National Gallery — a catalogue promo panel classed "description" won the
 *     shared ladder (docs/ng_pages/).
 *   Brera — a bold "Comitato scientifico: …" label opened a paragraph
 *     (docs/brera_pages/).
 *   Tate Modern — the dining offer and an event card reached the text
 *     (docs/tate_pages/).
 *
 *   node scraper/fixtures/description_pages_oct.js
 */
'use strict';
const fs = require('fs');
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

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  const page = await browser.newPage();
  await page.route('**/*', r => r.abort());
  const read = async (file, venue) => {
    const v = S.VENUES[venue];
    await page.setContent(fs.readFileSync(path.join(DOCS, file), 'utf8'));
    const t = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara, v.keepBold, v.dropSentence, v.descriptionSkip, v.descriptionUntil);
    return typeof t === 'string' ? t : String((t && t.text) || '');
  };
  try {
    for (const [file, lead] of [
      ['ng_pages/renoir_and_love.html', /^Fall in love with Renoir/],
      ['ng_pages/van_eyck_the_portraits.html', /Portraiture as we know it begins with van Eyck/]]) {
      const t = await read(file, 'ng');
      check(`DO-001: ${file} — the show's own text is read`, lead.test(t) && t.length > 600, t);
      check(`DO-002: ${file} — no catalogue promo`, !/catalogue/i.test(t), t);
      check(`DO-003: ${file} — no organisers' credit`, !/Exhibition organised by/.test(t), t);
    }
    {
      const t = await read('brera_pages/giovanni_agostino_da_lodi_an_itinerant_painter_between_leonardo_and_giorgione.html', 'brera');
      check('DO-004: Brera — the "Comitato scientifico" label is gone', !/Comitato scientifico|Ballarin/.test(t), t);
      check('DO-005: Brera — the real text after the label is kept', /^Il percorso espositivo riunisce 46 opere/.test(t), t);
      check('DO-006: Brera — a bold lead-in name (no line break after it) stays', /Giovanni Agostino da Lodi\. Nato a Lodi/.test(t), t);
    }
    {
      const t = await read('tate_pages/light_and_magic.html', 'tate-modern');
      check('DO-007: Tate Modern — the show\'s own text is read', /^Light and Magic is the first major exhibition/.test(t) && /medium\.$/.test(t), t);
      check('DO-008: Tate Modern — no dining offer, time slots or event card', !/set menu|time slot|lunch|Relaxed Hours|quieter time/i.test(t), t);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? failures + ' failed' : 'the 5 Oct descriptions read right on her saved pages');
  process.exit(failures ? 1 : 0);
})();
