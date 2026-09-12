/**
 * Walk a venue's listing pages and report what each one actually holds.
 *
 * WHY IT EXISTS. detectUnwiredPagination() reports that a listing links
 * another page; it never fetches one, deliberately. Something still has to
 * answer the next question — is there anything ON that page — and that is one
 * correct answer per page, derivable from the site, so it is code's job rather
 * than a session opening tabs and counting by eye.
 *
 * IT IS READ-ONLY. It writes no CSV, touches no run directory and changes
 * nothing. Safe to run against a venue mid-sweep.
 *
 *   node scraper/probe_pagination.js frick /exhibitions/past
 *   node scraper/probe_pagination.js frick /exhibitions/past --pages=6
 *   node scraper/probe_pagination.js artic '/exhibitions/history?year=2023'
 *
 * Reads the venue's OWN selector and navigation rule from its recipe, so what
 * it counts is what the sweep would collect, not a second opinion that can
 * drift from the engine.
 */
const { chromium } = require('./sweep_prototype.js').__playwright || require('playwright');
const m = require('./sweep_prototype.js');

const [code, path0, ...rest] = process.argv.slice(2);
const MAX = Number((rest.find(a => a.startsWith('--pages=')) || '--pages=5').split('=')[1]);

if (!code || !m.VENUES[code]) {
  console.error(`usage: node scraper/probe_pagination.js <venue> <path> [--pages=N]`);
  console.error(`venues: ${Object.keys(m.VENUES).join(' ')}`);
  process.exit(1);
}

(async () => {
  const v = m.VENUES[code];
  const browser = await chromium.launch({ executablePath: m.resolveChromium(), args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await m.installNetworkBridge(page);

  const seen = new Set();
  for (let n = 0; n <= MAX; n++) {
    // Page 0 is the bare address. SITES DISAGREE about whether the page after
    // it is ?page=1 or ?page=2, so both are simply tried and the answer read
    // off what comes back, rather than assumed.
    const path = n === 0 ? path0 : `${path0}${path0.includes('?') ? '&' : '?'}page=${n}`;
    const url = v.base + path;
    const r = await m.safeGoto(page, url, code, 'probe');
    if (!r.ok) { console.log(`page ${n}: ${url}\n   COULD NOT BE READ — ${r.reason}\n`); continue; }
    await page.waitForTimeout(2000);

    const found = await page.evaluate((sel) => {
      const out = [];
      for (const a of document.querySelectorAll(sel)) {
        const href = a.getAttribute('href');
        if (!href) continue;
        const t = (a.innerText || '').trim().split('\n')[0].slice(0, 60);
        out.push([href, t]);
      }
      return out;
    }, v.selector);

    const fresh = [], repeat = [];
    for (const [href, t] of found) {
      let abs; try { abs = new URL(href, url).href; } catch { continue; }
      if (v.isNav && v.isNav(href)) continue;
      (seen.has(abs) ? repeat : fresh).push([abs, t]);
      seen.add(abs);
    }
    console.log(`page ${n}: ${url}`);
    console.log(`   ${fresh.length} NEW exhibition link(s), ${repeat.length} already seen on an earlier page`);
    for (const [abs, t] of fresh) console.log(`     ${t || '(no link text)'}  ->  ${abs.replace(v.base, '')}`);
    console.log('');
    // WHERE THE LIST ENDS — but page 1 is the exception, and missing it made
    // this probe report artic's 2023 archive as one page long when it has two.
    //
    // Sites disagree about whether the bare address is page 0 or page 1. Where
    // it is page 1, asking for ?page=1 returns THE SAME PAGE AGAIN — which
    // looks exactly like an exhausted list, because nothing is new. It is not:
    // it is the site telling us its index base, and the real second page is
    // ?page=2. The Frick is the other way round and its ?page=1 is genuinely
    // the second page.
    //
    // So a duplicate at n=1 reports the index base and carries on; a duplicate
    // anywhere after that is the end.
    if (n === 1 && fresh.length === 0 && repeat.length) {
      console.log(`   (identical to the bare address, so this site numbers from 1 — its real second page is ?page=2)\n`);
      continue;
    }
    if (n > 0 && fresh.length === 0) { console.log(`STOP: page ${n} added nothing new — the list ends at page ${n - 1}.`); break; }
  }
  console.log(`TOTAL across all pages read: ${seen.size} distinct exhibition addresses.`);
  await browser.close();
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
