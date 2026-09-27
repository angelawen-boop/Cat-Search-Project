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
      const t = await S.getCuratorialText(page, v.description, v.noise, v.noiseExempt, v.creditPara);
      check(`MO-001: ${f} — opens on the curatorial text`, lead.test(t), t.slice(0, 120));
      check(`MO-002: ${f} — ends on it, whole`, last.test(t), t.slice(-160));
      check(`MO-003: ${f} — no credit, funder or licence text`, !/organized by|grateful|support|reproduce|©/i.test(t), t);
    }
  } finally { await browser.close(); }
  console.log(failures ? failures + ' failed' : 'the MoMA description reads her saved pages');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL  moma_pages crashed — ' + e.message); process.exit(1); });
