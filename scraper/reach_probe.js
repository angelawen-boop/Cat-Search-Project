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
// Every listing page of every venue, LABELLED by which state it serves.
//
// An earlier version listed one or two addresses for several venues and the
// probe then reported the VENUE as reachable. That is not a claim the test
// supports: brit serves its current listing and refuses its archive, and
// nothing in a one-page ping would ever show it. A venue's three states are
// three separate questions and each is asked here.
//
// Where the brief and CLAUDE.md Section 6c disagree on an address, BOTH are
// listed, so a run settles the conflict instead of a session picking one.
const TARGETS = {
  met: [
    ['current+upcoming', 'https://www.metmuseum.org/exhibitions'],
    ['past',             'https://www.metmuseum.org/exhibitions/past'],
    ['past year',        'https://www.metmuseum.org/exhibitions/past?year=2025'],
  ],
  ng: [
    ['current+upcoming', 'https://www.nationalgallery.org.uk/exhibitions'],
    ['past',             'https://www.nationalgallery.org.uk/exhibitions/past'],
  ],
  rijks: [
    ['current+upcoming', 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view'],
    ['past',             'https://www.rijksmuseum.nl/en/whats-on/exhibitions/past'],
  ],
  acq: [
    ['all three states',  'https://www.acquavellagalleries.com/exhibitions'],
  ],
  louvre: [
    ['current (brief)',      'https://www.louvre.fr/en/explore/exhibitions'],
    ['current (correction)', 'https://www.louvre.fr/en/exhibitions-and-events/exhibitions'],
    ['past',                 'https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions'],
  ],
  uffizi: [
    ['all states',  'https://www.uffizi.it/en/event-category/exhibitions'],
    ['upcoming',    'https://www.uffizi.it/en/event-category/exhibitions/upcoming-exhibitions'],
  ],
  borghese: [
    ['current',  'https://galleriaborghese.cultura.gov.it/en/mostre/presenti/'],
    ['upcoming', 'https://galleriaborghese.cultura.gov.it/en/mostre/future/'],
    ['past',     'https://galleriaborghese.cultura.gov.it/en/mostre/passate/'],
  ],
  brera: [
    ['current',  'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=in-progress'],
    ['upcoming', 'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=scheduled'],
    ['past',     'https://pinacotecabrera.org/en/exhibitions-and-events/exhibitions/?current_page=1&date=archive'],
  ],
  capo: [
    ['all states', 'https://capodimonte.cultura.gov.it/mostre/'],
  ],
  // MIGRATED. The brief's gallerieaccademia.it/en/node?page=1 now 404s; she
  // found the new home on 11 Sep. Both are probed: the old one proves the move,
  // the new one is the live question. Several Italian venues have moved during
  // this project (Borghese too), so treat an Italian 404 as "find the new site"
  // before "the venue is unreachable".
  dellav: [
    ['old address', 'https://www.gallerieaccademia.it/en/node?page=1'],
    ['current',     'https://www.galleriaaccademiafirenze.it/en/exhibitions-events/'],
    ['home',        'https://www.galleriaaccademiafirenze.it/en/'],
  ],
  khm: [
    ['current',  'https://www.khm.at/en/exhibitions'],
    ['upcoming', 'https://www.khm.at/en/exhibitions/upcoming'],
  ],
  moma: [
    ['current+upcoming', 'https://www.moma.org/calendar/exhibitions'],
    ['upcoming',         'https://www.moma.org/calendar/exhibitions/upcoming'],
    ['past',             'https://www.moma.org/calendar/exhibitions/history/'],
  ],
  frick: [
    ['all states', 'https://www.frick.org/exhibitions'],
  ],
  morgan: [
    ['current',  'https://www.themorgan.org/exhibitions/current'],
    ['upcoming', 'https://www.themorgan.org/exhibitions/upcoming'],
    ['past',     'https://www.themorgan.org/exhibitions/past'],
  ],
  menil: [
    ['current (correction)', 'https://www.menil.org/exhibitions'],
    ['current (brief)',      'https://www.menil.org/exhibitions/current'],
    ['upcoming',             'https://www.menil.org/exhibitions/upcoming'],
    ['past',                 'https://www.menil.org/exhibitions/past'],
  ],
  artic: [
    ['current',  'https://www.artic.edu/exhibitions'],
    ['upcoming', 'https://www.artic.edu/exhibitions/upcoming'],
    ['past',     'https://www.artic.edu/exhibitions/past'],
  ],
  brit: [
    ['current+upcoming', 'https://www.britishmuseum.org/exhibitions-events'],
    ['past',             'https://www.britishmuseum.org/exhibitions-events/past-exhibitions'],
    ['see everything',   'https://www.britishmuseum.org/exhibitions-events/see-everything'],
  ],
  wallace: [
    ['current+upcoming', 'https://www.wallacecollection.org/whats-on/'],
    ['past',             'https://www.wallacecollection.org/explore/past-exhibitions/'],
  ],
  // The brief records no past archive for these three. An empty past is the
  // correct answer there, not a failure.
  va: [
    ['current+upcoming', 'https://www.vam.ac.uk/whatson/?type=exhibition'],
  ],
  'tate-modern': [
    ['shared whats-on', 'https://www.tate.org.uk/whats-on'],
  ],
  'tate-britain': [
    ['shared whats-on', 'https://www.tate.org.uk/whats-on'],
  ],
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
    // Count links that go BELOW this listing page, which is what an exhibition
    // link is and what navigation is not. The earlier version counted any
    // address containing an exhibition-ish WORD, which counted the site's own
    // menu on every page and reported venues as rich when they were not --
    // brit scored 19 and actually has one.
    const m = await page.evaluate(() => {
      const base = location.pathname.replace(/\/+$/, '');
      const deeper = new Set();
      for (const a of document.querySelectorAll('a[href]')) {
        let u; try { u = new URL(a.href, location.href); } catch { continue; }
        if (u.host !== location.host) continue;
        const path = u.pathname.replace(/\/+$/, '');
        if (path && path !== base && path.startsWith(base + '/')) deeper.add(path);
      }
      return {
        chars: (document.body && document.body.innerText || '').length,
        links: deeper.size,
        title: document.title || '',
      };
    });
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
    for (const [label, url] of TARGETS[code]) {
      let r;
      try { r = await probePage(page, code, url); }
      catch (e) { r = { url, ok: false, reason: 'ABORTED: ' + e.message, ms: 0 }; }
      r.label = label;
      results.push(r);
      const tag = r.ok ? `OK   ${String(r.links).padStart(4)} below` : `FAIL ${r.reason}`;
      console.log(`  ${code.padEnd(13)} ${label.padEnd(20)} ${tag}  (${(r.ms / 1000).toFixed(1)}s)`);
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
    '', '## Every page', '', '| Venue | Page | Result | Links below | URL |', '|---|---|---|---|---|',
    ...out.flatMap(o => o.results.map(r =>
      `| \`${o.code}\` | ${r.label} | ${r.ok ? 'opened' : r.reason} | ${r.ok ? r.links : ''} | ${r.url} |`)),
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
