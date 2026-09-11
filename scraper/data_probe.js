#!/usr/bin/env node
/**
 * Can we actually GET THE DATA? — not "does the page open".
 *
 * Her instruction, 11 Sep 2026, after two probes that measured link counts and
 * were each wrong in a different way. This project does not need an internet
 * directory; it needs a title, an opening date, a closing date and curatorial
 * text for every exhibition. So this probe answers only that question.
 *
 * For every venue, for EVERY listing page it has — current, upcoming and past
 * separately, never one page standing in for the rest:
 *   1. open the listing
 *   2. find links matching that venue's real exhibition path, taken from what
 *      the sites themselves reported rather than guessed
 *   3. OPEN two of those exhibition pages
 *   4. report, per page, whether a title, a date range and curatorial text were
 *      actually extracted — and print the values, so a claim can be checked
 *      rather than believed
 *
 * A venue passes only when real values come back. Nothing here counts links.
 */
const { chromium } = require('playwright');
const {
  installNetworkBridge, resolveChromium, safeGoto,
  findDateRangeInProse, runStamp,
} = require('./sweep_prototype.js');
const fs = require('fs'), path = require('path');

// Path shapes reported by the venues' own listing pages (inspect_listing.js),
// not guessed. Several are counter-intuitive and were the whole reason for
// asking the sites instead of assuming: capo lists at /mostre/ but files
// exhibitions at /mostra/, menil uses /exhibition/ singular, brera files them
// under /news/.
const V = {
  ng:      { m:/\/exhibitions\/[^/]+$/, pages:[['current+upcoming','https://www.nationalgallery.org.uk/exhibitions'],['past','https://www.nationalgallery.org.uk/exhibitions/past']] },
  rijks:   { m:/\/(exhibitions|tentoonstellingen)\/[^/]+$/, pages:[['current','https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view'],['past','https://www.rijksmuseum.nl/en/whats-on/exhibitions/past']] },
  acq:     { m:/\/exhibitions\/[^/]+$/, pages:[['all','https://www.acquavellagalleries.com/exhibitions']] },
  borghese:{ m:/\/exhibition\/[^/]+$/, pages:[['current','https://galleriaborghese.cultura.gov.it/en/mostre/presenti/'],['upcoming','https://galleriaborghese.cultura.gov.it/en/mostre/future/'],['past','https://galleriaborghese.cultura.gov.it/en/mostre/passate/']] },
  louvre:  { m:/\/exhibitions-and-events\/exhibitions\/[^/]+$/, pages:[['current+upcoming','https://www.louvre.fr/en/exhibitions-and-events/exhibitions'],['current alt','https://www.louvre.fr/en/explore/exhibitions'],['past','https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions']] },
  uffizi:  { m:/\/en\/events\/[^/]+$/, pages:[['all','https://www.uffizi.it/en/event-category/exhibitions']] },
  brera:   { m:/\/news\/mostra\/[^/]+$/, pages:[['current','https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress'],['upcoming','https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=scheduled'],['past','https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=archive']] },
  capo:    { m:/\/mostra\/[^/]+$/, pages:[['all','https://capodimonte.cultura.gov.it/mostre/']] },
  khm:     { m:/\/en\/exhibitions\/[^/]+$/, pages:[['current','https://www.khm.at/en/exhibitions'],['upcoming','https://www.khm.at/en/exhibitions/upcoming']] },
  frick:   { m:/\/exhibitions\/[^/]+$/, pages:[['all','https://www.frick.org/exhibitions']] },
  menil:   { m:/\/exhibition\/[^/]+$/, pages:[['current','https://www.menil.org/exhibitions'],['upcoming','https://www.menil.org/exhibitions/upcoming'],['past','https://www.menil.org/exhibitions/past']] },
  wallace: { m:/\/(whats-on|explore\/past-exhibitions)\/[^/]+$/, pages:[['current','https://www.wallacecollection.org/whats-on/'],['past','https://www.wallacecollection.org/explore/past-exhibitions/']] },
  va:      { m:/\/exhibitions\/[^/]+$/, pages:[['all','https://www.vam.ac.uk/whatson/?type=exhibition']] },
  'tate-modern':  { m:/\/whats-on\/tate-modern\/[^/]+$/, pages:[['all','https://www.tate.org.uk/whats-on']] },
  'tate-britain': { m:/\/whats-on\/tate-britain\/[^/]+$/, pages:[['all','https://www.tate.org.uk/whats-on']] },
};
const PER_PAGE = 2;   // exhibition pages opened per listing

async function candidates(page, re) {
  return page.evaluate((src) => {
    const rx = new RegExp(src);
    const out = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      let u; try { u = new URL(a.href, location.href); } catch { continue; }
      if (u.host !== location.host) continue;
      if (!rx.test(u.pathname.replace(/\/+$/,''))) continue;
      out.set(u.origin + u.pathname, (a.innerText||'').trim().replace(/\s+/g,' ').slice(0,70));
    }
    return [...out];
  }, re.source);
}

// What a row needs. Title from the page's own <h1>; dates from its prose using
// the scraper's real parser; curatorial text as the longest run of paragraphs.
async function readExhibition(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const ps = [...document.querySelectorAll('p')]
      .map(p => (p.innerText||'').trim()).filter(t => t.length > 80);
    return {
      title: h1 ? (h1.innerText||'').trim().replace(/\s+/g,' ').slice(0,80) : '',
      text: (document.body.innerText||'').replace(/\s+/g,' ').slice(0, 6000),
      summary: ps.join(' ').slice(0, 300),
      summaryLen: ps.join(' ').length,
    };
  });
}

(async () => {
  const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const codes = want.length ? want : Object.keys(V);
  const browser = await chromium.launch({ executablePath: resolveChromium(), headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
  await installNetworkBridge(ctx);
  const page = await ctx.newPage();
  const lines = [];
  const say = s => { console.log(s); lines.push(s); };

  for (const code of codes) {
    const v = V[code]; if (!v) { say(`\n## ${code} — UNKNOWN`); continue; }
    say(`\n## ${code}`);
    for (const [label, url] of v.pages) {
      const r = await safeGoto(page, url, code, label);
      if (!r.ok) { say(`  ${label.padEnd(16)} LISTING FAILED — ${r.reason}`); continue; }
      const cands = await candidates(page, v.m);
      say(`  ${label.padEnd(16)} listing opened, ${cands.length} exhibition-shaped links`);
      if (!cands.length) { say(`     -> NO EXHIBITION LINKS MATCHED ${v.m}`); continue; }
      for (const [u, linkText] of cands.slice(0, PER_PAGE)) {
        const d = await safeGoto(page, u, code, 'detail');
        if (!d.ok) { say(`     FAILED ${d.reason}  ${u}`); continue; }
        const info = await readExhibition(page);
        const dates = findDateRangeInProse(info.text) || {};
        const ok = [info.title ? 'TITLE' : 'no-title',
                    dates.start ? 'START' : 'no-start',
                    dates.end ? 'END' : 'no-end',
                    info.summaryLen > 150 ? 'TEXT' : 'no-text'].join(' ');
        say(`     ${ok}`);
        say(`       url    ${u}`);
        say(`       title  ${info.title || '(none)  link text was: ' + linkText}`);
        say(`       dates  ${dates.start||'?'} .. ${dates.end||'?'}`);
        say(`       text   ${info.summaryLen} chars: ${info.summary.slice(0,110)}`);
      }
    }
  }
  await browser.close();
  const f = path.join(__dirname,'output',`dataprobe_${runStamp()}.md`);
  fs.writeFileSync(f, '# Can we get the DATA — '+runStamp()+'\n\n```\n'+lines.join('\n')+'\n```\n');
  console.log(`\nWritten: ${f}`);
})();
