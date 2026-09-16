// scraper/probe_access.js — does removing one word from the browser's name card
// get us into moma, brit and morgan?
//
// THE QUESTION, AND NOTHING ELSE. Every browser sends a short name card with
// each request saying what it is. The scraper overrides nothing, so Chromium
// sends its own — and its own says "HeadlessChrome". An earlier test was
// recorded as "staying silent", but it was not: it stopped INVENTING a card and
// let the true one through, which still announces headless. Nobody has yet
// tested a card that simply does not mention it.
//
// EVERYTHING ELSE IS COPIED FROM THE SCRAPER so the comparison is honest:
// headless, the same launch flags, the same window size, no network bridge, the
// same listing page and the same link pattern per venue. The ONLY difference
// between the two runs below is that one word.
//
// The replacement card is DERIVED AT RUN TIME from the browser's own, not typed
// in. That is the condition the note at the top of sweep_prototype.js sets for
// ever touching this again: a typed card goes stale on the next Chromium update
// and starts contradicting the browser it claims to be.
//
// Read-only. Writes no CSV and changes nothing in the scraper.
//   node scraper/probe_access.js            Playwright's Chromium
//   node scraper/probe_access.js --chrome   installed Google Chrome instead
const { chromium } = require('playwright');

// One listing page per venue, with each venue's OWN link pattern copied from
// VENUES in sweep_prototype.js, so "exhibition links" counts the same thing.
const TARGETS = [
  { code: 'moma',   url: 'https://www.moma.org/calendar/exhibitions',
    selector: 'a[href*="/calendar/exhibitions/"]' },
  { code: 'brit',   url: 'https://www.britishmuseum.org/exhibitions-events',
    selector: 'a[href*="/exhibitions-events/"]' },
  // The British Museum's PAST page is the one that refuses; its current page
  // already lets us in. Both are listed so the answer covers the whole venue.
  { code: 'brit-past', url: 'https://www.britishmuseum.org/exhibitions-events/past-exhibitions',
    selector: 'a[href*="/exhibitions-events/"]' },
  { code: 'morgan', url: 'https://www.themorgan.org/exhibitions/current',
    selector: 'a[href*="/exhibitions/"]' },
];

const useChrome = process.argv.includes('--chrome');

function launchOptions() {
  // Exactly the scraper's flags. --chrome only swaps which browser runs.
  const opts = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  if (useChrome) opts.channel = 'chrome';
  return opts;
}

async function trueNameCard(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const card = await page.evaluate(() => navigator.userAgent);
  await context.close();
  return card;
}

async function visit(browser, t, nameCard) {
  // The scraper's window size, and no other context settings.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ...(nameCard ? { userAgent: nameCard } : {}),
  });
  const page = await context.newPage();
  try {
    const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const status = res ? res.status() : 0;
    const title = await page.title().catch(() => '');
    const links = await page.$$eval(t.selector, els => els.length).catch(() => 0);
    const allowed = status >= 200 && status < 400;
    return { allowed, status, title, links };
  } catch (e) {
    return { allowed: false, status: 0, title: e.message.split('\n')[0], links: 0 };
  } finally {
    await context.close().catch(() => {});
  }
}

function report(label, r) {
  const verdict = r.allowed ? 'ALLOWED IN' : `REFUSED (${r.status || 'no answer'})`;
  console.log(`   ${label.padEnd(22)} ${verdict.padEnd(20)} exhibition links: ${r.links}`);
  console.log(`   ${''.padEnd(22)} page it served: ${r.title}`);
}

(async () => {
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    console.log('WARNING: a proxy is set, so this is probably the container, where\n'
              + 'every venue is unreachable for unrelated reasons. Run this at home.\n');
  }

  const browser = await chromium.launch(launchOptions());
  const trueCard = await trueNameCard(browser);
  const quietCard = trueCard.replace(/Headless/gi, '');

  console.log(`Browser: ${useChrome ? 'installed Google Chrome' : "Playwright's Chromium"}, headless.`);
  console.log(`Its own name card:        ${trueCard}`);
  console.log(`Same card, word removed:  ${quietCard}`);
  if (trueCard === quietCard) {
    console.log('\nThese are identical — this browser never mentioned headless, so this\n'
              + 'test cannot tell you anything. Any refusal below has another cause.');
  }

  const results = {};
  for (const t of TARGETS) {
    console.log(`\n=== ${t.code}  ${t.url}`);
    const announcing = await visit(browser, t, null);       // exactly the scraper
    report('announcing headless', announcing);
    const quiet = await visit(browser, t, quietCard);       // the one change
    report('word removed', quiet);
    results[t.code] = { announcing, quiet };
  }
  await browser.close().catch(() => {});

  console.log('\n--- VERDICT ---');
  for (const [code, r] of Object.entries(results)) {
    const a = r.announcing.allowed ? 'in ' : 'out';
    const q = r.quiet.allowed ? 'in ' : 'out';
    const note = (!r.announcing.allowed && r.quiet.allowed)
      ? '   <-- the word was the only thing keeping us out'
      : (r.announcing.allowed && r.quiet.allowed) ? '   (never blocked here)' : '';
    console.log(`${code.padEnd(11)} announcing: ${a}   word removed: ${q}${note}`);
  }
  const fixed = Object.values(results).every(r => r.quiet.allowed);
  console.log(fixed
    ? '\nEvery page opens with the word removed.'
    : '\nSome pages still refuse. Those have a different cause.');
})();
