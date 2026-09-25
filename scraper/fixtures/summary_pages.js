/**
 * IS THE DESCRIPTION THE MUSEUM'S OWN TEXT, ON REAL PAGES?
 *
 * WHY THIS EXISTS. 25 Sep 2026, reading the new venues' descriptions before
 * calling them clean: Lévy Gorvy Dayan's pages end with a press list whose
 * links ("Frieze Dish, The Lalanne Bounce, A $17.5M Hockney…") the shared
 * ladder took as description, and one page's last paragraph is a photo credit
 * ("Installation views of … Courtesy the artist and Hauser & Wirth."). Tate
 * Britain opened four summaries with a members' banner or a joint-ticket note.
 *
 * This runs the REAL getCuratorialText over two pages saved on 25 Sep
 * (docs/summary_pages/, scripts stripped), with no network, plus a small page
 * built from Tate's exact wording, since no Tate page was saved.
 *
 *   node scraper/fixtures/summary_pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../sweep_prototype.js');
const { chromium } = require('playwright');

const PAGES = path.join(__dirname, '..', '..', 'docs', 'summary_pages');
let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (got !== undefined ? ' — got: ' + String(got).slice(0, 300) : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.resolveChromium() });
  const page = await browser.newPage();
  await page.route('**/*', r => r.abort());
  const read = async (html, venue) => {
    await page.setContent(html);
    const v = venue ? S.VENUES[venue] : {};
    const t = await S.getCuratorialText(page, v.description || null, v.noise || null);
    return typeof t === 'string' ? t : String((t && t.text) || '');
  };

  {
    const t = await read(fs.readFileSync(path.join(PAGES, 'lgd_enchanted_alchemies.html'), 'utf8'), 'lgd');
    check('SP-001: Levy — the gallery’s own text is read', /exhibition exploring themes of magic, mysticism, and the occult/.test(t), t);
    check('SP-002: Levy — the press list is not', !/Frieze Dish|Lalanne Bounce|\$17\.5M/.test(t), t);
  }
  {
    const t = await read(fs.readFileSync(path.join(PAGES, 'lgd_mark_bradford.html'), 'utf8'), 'lgd');
    check('SP-003: Levy — the body text survives', /Merchant Poster series/.test(t), t);
    check('SP-004: Levy — the photo credit in the body is dropped', !/Installation views|Courtesy the artist|Hauser/.test(t), t);
  }
  {
    const t = await read('<main><p>Members enjoy free entry – no need to book, just turn up with your card</p>'
      + '<p>A major exhibition of the trailblazing photographer Lee Miller, spanning her whole career across '
      + 'surrealism, fashion and war reporting in the twentieth century.</p>'
      + '<p>Tickets for Edward Burra include entry to the Ithell Colquhoun exhibition</p></main>', null);
    check('SP-005: Tate wording — the description stays', /trailblazing photographer Lee Miller/.test(t), t);
    check('SP-006: Tate wording — the members’ banner goes', !/Members enjoy|no need to book/.test(t), t);
    check('SP-007: Tate wording — the joint-ticket note goes', !/include entry to the/.test(t), t);
  }

  await browser.close();
  console.log(failures ? failures + ' failed' : 'descriptions are the museums’ own text');
  process.exit(failures ? 1 : 0);
})();
