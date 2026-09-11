#!/usr/bin/env node
/**
 * Reachability probe — can we open a venue's listing pages AT ALL?
 *
 * This answers one question and deliberately no others: does the page open, and
 * when it does, is there anything on it? It does not extract titles, dates or
 * summaries, and it needs no venue recipe — which is the point. Writing 15
 * recipes before knowing which venues answer the door spends the expensive
 * effort on venues that may never be reachable.
 *
 * It is NOT a separate transport. It launches the same Chromium, installs the
 * same network bridge and calls the same safeGoto() as a real sweep, because a
 * curl that succeeds where the scraper fails tells us nothing — the Met's whole
 * four-day misdiagnosis came from measuring the wrong thing. What this reports
 * is what a sweep would meet.
 *
 * One attempt per page, the code and date recorded, and never a retry against a
 * venue that has refused us (CLAUDE.md Section 4).
 *
 *   node scraper/reach_probe.js              all 21
 *   node scraper/reach_probe.js louvre moma  named venues
 *
 * Writes scraper/output/probe_<stamp>.md, and prints the same table.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  installNetworkBridge, resolveChromium, safeGoto, runStamp,
} = require('./sweep_prototype.js');

// Addresses are HERS, from docs/venue_urls.md — never constructed from a
// pattern. Where the brief and CLAUDE.md Section 6c disagree, BOTH are listed
// and both are probed, so the run settles the conflict instead of guessing.
const TARGETS = {
  met:            ['https://www.metmuseum.org/exhibitions', 'https://www.metmuseum.org/exhibitions/past'],
  ng:             ['https://www.nationalgallery.org.uk/exhibitions', 'https://www.nationalgallery.org.uk/exhibitions/past'],
  rijks:          ['https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view', 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/past'],
  acq:            ['https://www.acquavellagalleries.com/exhibitions'],
  louvre:         ['https://www.louvre.fr/en/explore/exhibitions',
                   'https://www.louvre.fr/en/exhibitions-and-events/exhibitions',
                   'https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions'],
  uffizi:         ['https://www.uffizi.it/en/event-category/exhibitions'],
  borghese:       ['https://galleriaborghese.cultura.gov.it/en/mostre/presenti/', 'https://galleriaborghese.cultura.gov.it/en/mostre/passate/'],
  brera:          ['https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress',
                   'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=archive'],
  capo:           ['https://capodimonte.cultura.gov.it/mostre/'],
  dellav:         ['https://www.gallerieaccademia.it/en/node?page=1'],
  khm:            ['https://www.khm.at/en/exhibitions', 'https://www.khm.at/en/exhibitions/upcoming'],
  moma:           ['https://www.moma.org/calendar/exhibitions', 'https://www.moma.org/calendar/exhibitions/history/'],
  frick:          ['https://www.frick.org/exhibitions'],
  morgan:         ['https://www.themorgan.org/exhibitions/current', 'https://www.themorgan.org/exhibitions/past'],
  menil:          ['https://www.menil.org/exhibitions/current', 'https://www.menil.org/exhibitions'],
  artic:          ['https://www.artic.edu/exhibitions', 'https://www.artic.edu/exhibitions/past'],
  brit:           ['https://www.britishmuseum.org/exhibitions-events', 'https://www.britishmuseum.org/exhibitions-events/past-exhibitions'],
  wallace:        ['https://www.wallacecollection.org/whats-on/', 'https://www.wallacecollection.org/explore/past-exhibitions/'],
  va:             ['https://www.vam.ac.uk/whatson/?type=exhibition'],
  'tate-modern':  ['https://www.tate.org.uk/whats-on'],
  'tate-britain': ['https://www.tate.org.uk/whats-on'],
};

// A page can open and still be empty — that is the shell-plus-database failure
// this whole scraper exists to beat, and it looks identical to success until you
// count something. Anchors whose address contains an exhibition-ish word are a
// crude but honest proxy: a real listing has many, a JavaScript shell has none.
const LINKISH = /exhibit|mostre|whats-on|calendar|event|tentoonstelling|node/i;

async function probePage(page, code, url) {
  const t0 = Date.now();
  const r = await safeGoto(page, url, code, 'probe');
  const ms = Date.now() - t0;
  if (!r.ok) return { url, ok: false, reason: r.reason, ms };

  let chars = 0, links = 0, title = '';
  try {
    const m = await page.evaluate((re) => {
      const rx = new RegExp(re, 'i');
      const as = Array.from(document.querySelectorAll('a[href]'));
      return {
        chars: (document.body && document.body.innerText || '').length,
        links: as.filter(a => rx.test(a.getAttribute('href') || '')).length,
        title: document.title || '',
      };
    }, LINKISH.source);
    ({ chars, links, title } = m);
  } catch { /* page died; reported as zero */ }
  return { url, ok: true, reason: '', ms, chars, links, title };
}

// The verdict is about what a SWEEP would find, not about HTTP politeness.
// "Opens but empty" is its own answer and must not read as success: it is the
// case that needs a different fix from a refusal.
function verdict(results) {
  if (results.every(r => !r.ok)) {
    const codes = [...new Set(results.map(r => r.reason))].join(', ');
    return { mark: 'REFUSED / DEAD', detail: codes };
  }
  const opened = results.filter(r => r.ok);
  const withLinks = opened.filter(r => r.links >= 3);
  if (!withLinks.length) {
    return { mark: 'OPENS, NOTHING ON IT', detail: `max ${Math.max(...opened.map(r => r.links))} links, ${Math.max(...opened.map(r => r.chars))} chars` };
  }
  const partial = opened.length < results.length;
  return {
    mark: partial ? 'PARTIAL' : 'REACHABLE',
    detail: `${Math.max(...withLinks.map(r => r.links))} candidate links`,
  };
}

(async () => {
  const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const codes = want.length ? want : Object.keys(TARGETS);
  const bad = codes.filter(c => !TARGETS[c]);
  if (bad.length) { console.error('Unknown venue(s):', bad.join(', ')); process.exit(2); }

  const chromePath = resolveChromium();
  console.log(`Chromium: ${chromePath || '(Playwright default)'}`);
  console.log(`Probing ${codes.length} venue(s) — one attempt per page, no retries on a refusal.\n`);

  const browser = await chromium.launch({
    executablePath: chromePath, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await installNetworkBridge(context);
  const page = await context.newPage();

  const out = [];
  for (const code of codes) {
    const results = [];
    for (const url of TARGETS[code]) {
      let r;
      try { r = await probePage(page, code, url); }
      catch (e) { r = { url, ok: false, reason: 'ABORTED: ' + e.message, ms: 0 }; }
      results.push(r);
      const tag = r.ok ? `OK   ${String(r.links).padStart(4)} links, ${String(r.chars).padStart(6)} chars` : `FAIL ${r.reason}`;
      console.log(`  ${code.padEnd(13)} ${tag}  (${(r.ms / 1000).toFixed(1)}s)  ${r.url}`);
    }
    const v = verdict(results);
    out.push({ code, ...v, results });
    console.log(`  ${code.padEnd(13)} => ${v.mark} — ${v.detail}\n`);
  }

  await browser.close();

  const stamp = runStamp();
  const lines = [
    `# Reachability probe — ${stamp}`, '',
    'Same Chromium, same network bridge, same safeGoto() as a real sweep.',
    'One attempt per page. "Candidate links" counts anchors whose address looks',
    'exhibition-ish — a crude proxy for "is there a listing here at all".', '',
    '| Venue | Verdict | Detail |', '|---|---|---|',
    ...out.map(o => `| \`${o.code}\` | **${o.mark}** | ${o.detail} |`),
    '', '## Every page', '', '| Venue | Result | Links | Chars | URL |', '|---|---|---|---|---|',
    ...out.flatMap(o => o.results.map(r =>
      `| \`${o.code}\` | ${r.ok ? 'opened' : r.reason} | ${r.ok ? r.links : ''} | ${r.ok ? r.chars : ''} | ${r.url} |`)),
    '',
  ];
  const file = path.join(__dirname, 'output', `probe_${stamp}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`Written: ${file}`);

  const by = m => out.filter(o => o.mark === m).map(o => o.code);
  console.log(`\nREACHABLE:            ${by('REACHABLE').join(', ') || '—'}`);
  console.log(`PARTIAL:              ${by('PARTIAL').join(', ') || '—'}`);
  console.log(`OPENS, NOTHING ON IT: ${by('OPENS, NOTHING ON IT').join(', ') || '—'}`);
  console.log(`REFUSED / DEAD:       ${by('REFUSED / DEAD').join(', ') || '—'}`);
})();
