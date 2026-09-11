#!/usr/bin/env node
/**
 * What links does this listing page actually have?
 *
 * A recipe's hardest field is `selector` — which links on a listing page are
 * exhibitions rather than navigation. Guessing it is how Borghese spent days
 * collecting its own menu bar, one row per page, while looking like it worked.
 *
 * So this asks the page. It groups every same-host link by the shape of its
 * address (first two path segments, the rest as "…"), counts each shape, and
 * shows one example with its link text. The exhibitions are nearly always one
 * shape with many members and a real title in the text; navigation is a handful
 * of shapes with one or two members and words like "Hours & admission".
 *
 * Same Chromium, same bridge, same safeGoto() as a real sweep.
 *
 *   node scraper/inspect_listing.js <url> [<url> …]
 *
 * A diagnostic, not part of any sweep. Nothing reads its output but a person.
 */

const { chromium } = require('playwright');
const { installNetworkBridge, resolveChromium, safeGoto } = require('./sweep_prototype.js');

const TOP = 12;          // shapes shown per page
const SEGMENTS = 2;      // path segments kept before collapsing to "…"

(async () => {
  const urls = process.argv.slice(2);
  if (!urls.length) {
    console.error('Usage: node scraper/inspect_listing.js <listing url> [more urls]');
    process.exit(2);
  }

  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await installNetworkBridge(context);
  const page = await context.newPage();

  for (const url of urls) {
    const r = await safeGoto(page, url, 'inspect', 'inspect');
    if (!r.ok) { console.log(`\n### ${url}\n    FAILED — ${r.reason}`); continue; }

    const shapes = await page.evaluate(({ SEGMENTS, TOP }) => {
      const acc = {};
      for (const a of document.querySelectorAll('a[href]')) {
        let u; try { u = new URL(a.href, location.href); } catch { continue; }
        // Off-site links are somebody else's site and never this venue's
        // exhibitions — the scraper refuses them too, and counts them.
        if (u.host !== location.host) continue;
        const seg = u.pathname.split('/').filter(Boolean);
        if (!seg.length) continue;
        const head = seg.slice(0, SEGMENTS).join('/');
        const key = '/' + head + (seg.length > SEGMENTS ? '/…' : '');
        acc[key] = acc[key] || { n: 0, sample: '', text: '' };
        acc[key].n++;
        if (!acc[key].sample) {
          acc[key].sample = u.pathname;
          acc[key].text = (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70);
        }
      }
      return Object.entries(acc).sort((a, b) => b[1].n - a[1].n).slice(0, TOP);
    }, { SEGMENTS, TOP });

    console.log(`\n### ${url}`);
    for (const [shape, v] of shapes) {
      console.log(`   ${String(v.n).padStart(3)}  ${shape.padEnd(40)} eg ${v.sample.slice(0, 50).padEnd(50)} | "${v.text}"`);
    }
  }

  await browser.close();
})();
