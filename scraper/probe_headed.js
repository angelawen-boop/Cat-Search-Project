// scraper/probe_headed.js — headless vs headed, the three refused venues.
//
// The question: moma, brit and morgan refuse the container AND her machine
// headless. moma and brit answer with a Cloudflare MANAGED CHALLENGE, which is
// the class of wall a real headed browser sometimes walks through. If all three
// pass headed from her machine, data gathering drops from three ways to two and
// stays entirely deterministic — no LLM in the gathering layer.
//
// Headless runs FIRST every time, as the control. Without it a pass proves
// nothing: it could be the IP, or the day, rather than the headed browser.
//
// Read-only. Writes no CSV and changes nothing in the scraper.
//   node scraper/probe_headed.js            plain Chromium
//   node scraper/probe_headed.js --chrome   installed Google Chrome, headed
const { chromium } = require('playwright');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// One listing page per venue, and each venue's OWN selector from VENUES in
// sweep_prototype.js — so "links found" means the same thing here as there.
const TARGETS = [
  { code: 'moma',   url: 'https://www.moma.org/calendar/exhibitions',
    selector: 'a[href*="/calendar/exhibitions/"]' },
  { code: 'brit',   url: 'https://www.britishmuseum.org/exhibitions-events',
    selector: 'a[href*="/exhibitions-events/"]' },
  { code: 'morgan', url: 'https://www.themorgan.org/exhibitions/current',
    selector: 'a[href*="/exhibitions/"]' },
];

const useChrome = process.argv.includes('--chrome');

async function look(page, t) {
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '')
    .catch(() => '');
  const links = await page.$$eval(t.selector, els => els.length).catch(() => 0);
  const challenged = /just a moment|checking your browser|verify you are human|enable javascript and cookies/i.test(text);
  const title = await page.title().catch(() => '');
  return { links, challenged, title };
}

async function run(t, headless) {
  const tag = headless ? 'headless' : 'HEADED  ';
  const launch = { headless };
  if (useChrome && !headless) launch.channel = 'chrome';

  let browser;
  try {
    browser = await chromium.launch(launch);
  } catch (e) {
    console.log(`   ${tag}  COULD NOT LAUNCH: ${e.message.split('\n')[0]}`);
    return false;
  }

  try {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1400, height: 900 },
    });
    const page = await context.newPage();

    const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const status = res ? res.status() : 'no response';
    let seen = await look(page, t);
    let line;

    // Headed only: leave the window on screen long enough for her to clear a
    // challenge by hand. Whether a click was needed IS part of the answer — a
    // wall that wants a human on every sweep is not a route.
    if (!headless && (seen.challenged || seen.links === 0)) {
      console.log('      ...challenge or empty page. Watch the window and click it '
                + 'if it asks. Waiting 30s.');
      await page.waitForTimeout(30000);
      const after = await look(page, t);
      line = `status ${status} | links ${seen.links} -> ${after.links}`
           + ` | challenge ${seen.challenged} -> ${after.challenged}`
           + ` | needed a human: ${after.links > seen.links ? 'YES' : 'no change'}`;
      seen = after;
    } else {
      line = `status ${status} | links ${seen.links} | challenge ${seen.challenged}`;
    }

    console.log(`   ${tag}  ${line}`);
    console.log(`             page title: ${seen.title}`);
    return seen.links > 0 && !seen.challenged;
  } catch (e) {
    console.log(`   ${tag}  FAILED: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await browser.close().catch(() => {});
  }
}

(async () => {
  // The bridge makes Node do the fetching, so Chromium's fingerprint is not its
  // own. Headed cannot prove anything from behind it.
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    console.log('WARNING: a proxy is set, so this is probably the container. '
              + 'Headed proves nothing behind the network bridge.\n');
  }
  if (useChrome) console.log('Using installed Google Chrome for the headed runs.\n');

  const verdict = {};
  for (const t of TARGETS) {
    console.log(`\n=== ${t.code}  ${t.url}`);
    const headless = await run(t, true);
    const headed   = await run(t, false);
    verdict[t.code] = { headless, headed };
  }

  console.log('\n--- VERDICT ---');
  for (const [code, v] of Object.entries(verdict)) {
    console.log(`${code.padEnd(8)} headless ${v.headless ? 'OK ' : 'no '}`
              + ` headed ${v.headed ? 'OK ' : 'no '}`
              + (v.headed && !v.headless ? '   <-- headed is the difference' : ''));
  }
  const all = Object.values(verdict).every(v => v.headed);
  console.log(all
    ? '\nAll three pass headed. Two-way gathering is on the table.'
    : '\nNot all three pass headed. Gathering would still fragment.');
})();
