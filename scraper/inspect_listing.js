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

const TOP = 14;          // shapes shown per page

/**
 * Group an address by SHAPE: everything but the last segment, which is the
 * exhibition's own name and differs every time.
 *
 * Getting this wrong wasted a round. The first version kept the first two
 * segments literally, so /exhibitions/monkman and /exhibitions/ruffles were two
 * different shapes with a count of one each — while navigation, which repeats in
 * the header and footer of every page, scored 7 and 11. The exhibitions were
 * sorted off the bottom of the list and the page looked empty, which was
 * reported as a JavaScript shell. It was not. The tool was.
 *
 * Collapsing the LAST segment is what makes exhibitions add up: many links, one
 * shape, real titles in the text.
 */
function shapeOf(pathname) {
  const seg = pathname.split('/').filter(Boolean);
  if (!seg.length) return null;
  if (seg.length === 1) return '/' + seg[0];
  return '/' + seg.slice(0, -1).join('/') + '/<slug>';
}

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

    const shapes = await page.evaluate(({ TOP, shapeSrc }) => {
      const shapeOf = eval('(' + shapeSrc + ')');
      const acc = {};
      for (const a of document.querySelectorAll('a[href]')) {
        let u; try { u = new URL(a.href, location.href); } catch { continue; }
        // Off-site links are somebody else's site and never this venue's
        // exhibitions — the scraper refuses them too, and counts them.
        if (u.host !== location.host) continue;
        const key = shapeOf(u.pathname);
        if (!key) continue;
        acc[key] = acc[key] || { n: 0, urls: new Set(), text: '', sample: '' };
        acc[key].n++;
        acc[key].urls.add(u.pathname);
        const t = (a.innerText || '').trim().replace(/\s+/g, ' ');
        // Prefer a sample with REAL text: "Skip to main content" is the first
        // link on half these sites and tells you nothing about the shape.
        if (t.length > acc[key].text.length) { acc[key].text = t.slice(0, 66); acc[key].sample = u.pathname; }
        if (!acc[key].sample) acc[key].sample = u.pathname;
      }
      return Object.entries(acc)
        .map(([k, v]) => [k, { n: v.n, distinct: v.urls.size, sample: v.sample, text: v.text }])
        // Sort by DISTINCT addresses, not raw link count. Navigation repeats
        // the same few addresses many times; a listing has many different ones.
        .sort((a, b) => b[1].distinct - a[1].distinct).slice(0, TOP);
    }, { TOP, shapeSrc: shapeOf.toString() });

    console.log(`\n### ${url}`);
    console.log(`   distinct  shape`);
    for (const [shape, v] of shapes) {
      console.log(`   ${String(v.distinct).padStart(8)}  ${shape.padEnd(42)} "${v.text}"`);
    }
  }

  await browser.close();
})();
