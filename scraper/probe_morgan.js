// scraper/probe_morgan.js — the Morgan, and only the Morgan.
//
// Already settled: Playwright's Chromium, headless, refuses to get in whether
// or not the browser's name card mentions being headless. So the card is not
// the Morgan's objection, and that combination is not retried here.
//
// Three combinations remain. ALL of them strip the word from the card, since
// that costs nothing and is already proven to help elsewhere:
//
//   1. Chromium, on screen
//   2. Chrome,   hidden
//   3. Chrome,   on screen
//
// An earlier on-screen attempt sent a MADE-UP card claiming to be a Mac, which
// contradicted the browser underneath. That is not the same test — here the
// card is the browser's own with one word taken out, so nothing contradicts.
//
// On the two on-screen runs the window is left up for 40 seconds. If a "confirm
// you are human" box appears, click it. Whether clicking works is part of the
// answer: a wall that needs you personally on every sweep is not a route.
//
// Read-only. Writes no CSV and changes nothing in the scraper.
//   node scraper/probe_morgan.js
const { chromium } = require('playwright');

const URL = 'https://www.themorgan.org/exhibitions/current';
const SELECTOR = 'a[href*="/exhibitions/"]';   // the Morgan's own, from VENUES

const COMBINATIONS = [
  { label: 'Chromium, on screen', channel: null,     headless: false },
  { label: 'Chrome, hidden',      channel: 'chrome',  headless: true  },
  { label: 'Chrome, on screen',   channel: 'chrome',  headless: false },
];

async function look(page) {
  const links = await page.$$eval(SELECTOR, els => els.length).catch(() => 0);
  const title = await page.title().catch(() => '');
  return { links, title };
}

async function attempt(combo) {
  const opts = {
    headless: combo.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],   // the scraper's flags
  };
  if (combo.channel) opts.channel = combo.channel;

  let browser;
  try {
    browser = await chromium.launch(opts);
  } catch (e) {
    const msg = e.message.split('\n')[0];
    const missing = /is not found|Executable doesn't exist/i.test(msg);
    console.log(`   ${missing
      ? 'SKIPPED — that browser is not installed on this machine.'
      : 'COULD NOT START — ' + msg}`);
    return { ran: false, allowed: false, links: 0, clicked: false };
  }

  try {
    // Take the browser's own card and remove the one word.
    const probe = await browser.newContext();
    const probePage = await probe.newPage();
    const trueCard = await probePage.evaluate(() => navigator.userAgent);
    await probe.close();
    const quietCard = trueCard.replace(/Headless/gi, '');

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: quietCard,
    });
    const page = await context.newPage();

    const res = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const status = res ? res.status() : 0;
    let seen = await look(page);
    let allowed = status >= 200 && status < 400 && seen.links > 0;
    let clicked = false;

    if (!combo.headless && !allowed) {
      console.log('   Window is up. If it asks you to confirm you are human, click it.');
      console.log('   Waiting 40 seconds...');
      await page.waitForTimeout(40000);
      const after = await look(page);
      clicked = after.links > seen.links;
      seen = after;
      allowed = after.links > 0;
    }

    console.log(`   ${allowed ? 'LET IN' : 'REFUSED'} (answer code ${status || 'none'})`
              + `  exhibition links: ${seen.links}`
              + (clicked ? '  — only after you clicked' : ''));
    console.log(`   page it served: ${seen.title}`);
    return { ran: true, allowed, links: seen.links, clicked };
  } catch (e) {
    console.log(`   FAILED — ${e.message.split('\n')[0]}`);
    return { ran: true, allowed: false, links: 0, clicked: false };
  } finally {
    await browser.close().catch(() => {});
  }
}

(async () => {
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    console.log('WARNING: a proxy is set, so this is probably the container.\n'
              + 'Run this at home.\n');
  }
  console.log(`The Morgan: ${URL}`);
  console.log('Every attempt below removes the word from the browser\'s own card.\n');

  const results = [];
  for (const combo of COMBINATIONS) {
    console.log(`=== ${combo.label}`);
    results.push({ label: combo.label, ...(await attempt(combo)) });
    console.log('');
  }

  console.log('--- VERDICT ---');
  console.log('Chromium, hidden       REFUSED   (already known, not retried)');
  for (const r of results) {
    const verdict = !r.ran ? 'not tested (browser missing)'
                  : r.allowed ? (r.clicked ? 'LET IN, but only after a click' : 'LET IN')
                  : 'REFUSED';
    console.log(`${r.label.padEnd(22)} ${verdict}`);
  }

  const unattended = results.find(r => r.allowed && !r.clicked);
  const attended   = results.find(r => r.allowed && r.clicked);
  console.log(unattended
    ? `\nThe Morgan is reachable, unattended, with: ${unattended.label}.`
    : attended
      ? `\nThe Morgan opens only when you click it yourself (${attended.label}).`
      : '\nThe Morgan refuses every combination tried. Its wall is something else.');
})();
