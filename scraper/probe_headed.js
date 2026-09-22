// scraper/probe_headed.js — can a browser with a PAST get into the three
// blocked venues? Read-only: writes no CSV and changes nothing in the scraper.
//
// WHY THIS EXISTS, and why it is not the 16 Sep probe again.
//
// Every earlier attempt on moma / brit / morgan used a browser with NO PAST:
// Playwright built a blank profile, used it once and threw it away. A browser
// that has never been anywhere is itself a signal, and it is the one variable
// nobody has moved. Her own Chrome — same machine, same address — is served
// moma and brit with no check at all, and passes morgan's check without her
// touching anything. So the gap is not "visible versus hidden": on 16 Sep a
// VISIBLE, real Chrome was refused by morgan while she clicked the box
// repeatedly and it never cleared. A box that never clears was never grading
// the click.
//
// Two things were still untested, and this probe tests exactly those two:
//
//   RUN A — the scraper opens Chrome on a profile that SHE has already used.
//           Cookies, history and any clearance from her own browsing are there.
//           Chrome still announces that it is being driven (navigator.webdriver),
//           because Playwright opened it. That flag is recorded, not hidden.
//
//   RUN B — SHE opens Chrome; the scraper reads the pages it loads. Same
//           profile, but nothing announces automation, because nothing is
//           automating the launch. Her browser, her click, our reading.
//
// Nothing here forges a signal. A profile with a history genuinely has one, and
// a browser she opened genuinely was opened by her.
//
// THE LIMIT, STATED UP FRONT: this probe can prove a venue STILL REFUSES. It can
// never prove a venue works — that takes a real sweep, with its volume and its
// detail pages. 16 Sep read "one listing page opened" as "the venue is open",
// rebuilt the scraper on it, and invented causes when the sweep failed. So this
// writes down what happened and stops. It draws no conclusion about sweeping.
//
// VOLUME IS CAPPED ON PURPOSE. What damaged these venues before was repeated
// full sweeps, not a handful of visits. MAX_VISITS below is a hard stop.
//
// Usage — three commands, in this order:
//
//   node scraper/probe_headed.js open     Chrome opens on the probe's profile.
//                                         Browse the three museums for a minute,
//                                         then CLOSE it. Seeds the profile.
//   node scraper/probe_headed.js A        Run A. Chrome must be closed first.
//   node scraper/probe_headed.js open     Open it again — and LEAVE it open.
//   node scraper/probe_headed.js B        Run B, into that open browser.
//
//   --pace=<seconds>                      The gap left between pages, varied.
//                                         Default 30. Its ABSENCE is what cost
//                                         the 22 Sep run: five addresses fired
//                                         back to back, the first clean and
//                                         every one after it challenged.
//
//   node scraper/probe_headed.js page <url> <url>
//                                         Visit exactly those addresses and
//                                         follow NOTHING. Used once access is
//                                         established and the question is what
//                                         a named page contains — she names it,
//                                         because the two unfinished recipes
//                                         are hers to write from the live site.
//
// Results are written to scraper/output/, not just printed. The 16 Sep morgan
// result printed to a terminal and vanished, so all that survives of it is a
// sentence in a doc — which is why we are re-testing something we supposedly
// already know.

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Chrome keeps cookies, history and logins in a folder. This is the probe's
// own, deliberately NOT her everyday one: she never has to quit her real
// browser, and her personal browsing stays out of this entirely.
const PROFILE_DIR = path.join(__dirname, 'chrome_profile');

// Chrome 136 and later refuse remote debugging on the DEFAULT profile. Using a
// separate --user-data-dir is the supported way, which we are doing anyway.
const DEBUG_PORT = 9222;

// One listing page per venue, taken from that venue's own recipe in
// sweep_prototype.js rather than typed here — a second hand-written copy of an
// address is the kind of duplicate that drifts silently.
//
// Which page: the one that is actually REFUSED.
//   moma    current/upcoming. Her scope excludes moma's past entirely.
//   brit    the past archive. Its current page returns 200 only because
//           Cloudflare serves it from cache, so it never reaches the origin and
//           proves nothing about whether we are let in.
//   morgan  current.
const TARGETS = [
  { code: 'moma',   base: 'https://www.moma.org',           listing: '/calendar/exhibitions',
    selector: 'a[href*="/calendar/exhibitions/"]',
    isNav: href => /\/calendar\/exhibitions\/?$/.test(href)
                || /\/calendar\/exhibitions\/history\/?$/.test(href) },

  { code: 'brit',   base: 'https://www.britishmuseum.org',  listing: '/exhibitions-events/past-exhibitions',
    selector: 'a[href*="/exhibitions-events/"]',
    isNav: href => /\/exhibitions-events\/?$/.test(href)
                || /\/exhibitions-events\/past-exhibitions\/?$/.test(href) },

  { code: 'morgan', base: 'https://www.themorgan.org',      listing: '/exhibitions/current',
    selector: 'a[href*="/exhibitions/"]',
    isNav: href => /\/exhibitions\/(current|upcoming|past)\/?$/.test(href)
                || /\/exhibitions\/?$/.test(href) },
];

// Three venues, one listing and one detail page each. Twelve across both runs.
const MAX_VISITS = 6;

// How long a challenge is given to clear. POLLED, never a fixed pause: a fixed
// pause answers two questions at once — has it finished, and is it ever going
// to — and cannot tell them apart. This asks every two seconds and stops the
// moment the answer changes, so "cleared in 4s" and "still there at 20s" are
// different recorded facts rather than the same wait.
//
// TWENTY SECONDS, DOWN FROM SIXTY. Her own browser's check clears in a few
// seconds; one that is still there at twenty is not going to pass. Waiting a
// full minute on each of four refusals meant four minutes of a browser openly
// failing a bot test over and over, which deepens the very judgement we are
// trying not to attract. Her rule, 22 Sep: tick it once, and if that does not
// work, stop.
const CHALLENGE_WAIT_MS = 20000;
const POLL_MS = 2000;

// THE GAP BETWEEN PAGES — the thing whose absence cost us the 22 Sep run.
//
// The probe fired five addresses back to back, four of them at one museum, in
// a couple of seconds. The first came back clean and every one after it was
// challenged. Nothing that browses like a person loads four pages that fast,
// and the judgement followed us to the other venue, because both sit behind
// the same protection.
//
// VARIED, NOT A METRONOME. A request every exactly-thirty-seconds is its own
// signature; real reading is uneven. So the gap is the base plus up to half of
// it again, drawn fresh each time.
//
// Overridable with --pace=<seconds>, because the right gap is not known yet and
// finding it is the point of the next run.
const PACE_ARG = process.argv.find(a => /^--pace=/.test(a));
const PACE_MS = PACE_ARG ? Math.max(0, Number(PACE_ARG.split('=')[1]) * 1000) : 30000;

function paceGap() {
  return Math.round(PACE_MS + Math.random() * PACE_MS * 0.5);
}

async function pace(page, index) {
  if (index === 0 || PACE_MS === 0) return;        // nothing to pace against yet
  const ms = paceGap();
  console.log(`   (waiting ${Math.round(ms / 1000)}s before the next page)`);
  await page.waitForTimeout(ms);
}

// STOP AT THE FIRST REFUSAL THAT DOES NOT CLEAR.
//
// On 22 Sep the run kept going after the first blocked page and asked four more
// times, each one failing in front of the same watcher. Carrying on cannot
// learn anything the first refusal has not already said, and it makes the next
// attempt worse. One refusal ends the run.
function isRefusal(rec) {
  return rec && (rec.outcome === 'challenge-not-cleared' || rec.outcome === 'refused-outright');
}

// ── Finding the real Chrome ───────────────────────────────────────────────────
// Both halves, deliberately: a hardcoded path is how the scraper lost a day
// once already. Ask the system first, fall back to the usual Debian locations.
function resolveChrome() {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/opt/google/chrome/chrome',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

// ── What a page actually served ──────────────────────────────────────────────
//
// SAY WHICH NEGATIVE IT IS. "Refused" covers three different things and they
// mean different next steps, so they are never collapsed into one word here:
//
//   refused-outright      a flat no, with no check offered. Nothing to pass.
//   challenge-not-cleared a check appeared and was still there when time ran out.
//   in-but-empty          we were let in and the page had nothing on it.
//   in                    let in, with real content.
//
// The difference between the first two is the whole reason this probe exists:
// our notes say morgan gives US a flat refusal while giving HER a check, and
// her screenshot shows the check. One of those is out of date.
const CHALLENGE_MARKERS = [
  'just a moment',
  'attention required',
  'performing security verification',
  'verifying you are human',
  'checking your browser',
  'security check',
];

async function readPage(page) {
  const title = await page.title().catch(() => '');
  const text = await page.evaluate(() => document.body ? document.body.innerText : '')
    .catch(() => '');
  return { title, text };
}

function looksLikeChallenge({ title, text }) {
  const hay = (title + ' ' + text.slice(0, 2000)).toLowerCase();
  return CHALLENGE_MARKERS.some(m => hay.includes(m));
}

/**
 * The links on this page that could be an exhibition.
 *
 * A HREF IS NOT AN ADDRESS UNTIL IT RESOLVES, and not every address is a page.
 * The first version of this took the raw href, checked it was not one of the
 * venue's own listing pages, and followed it. On the British Museum the first
 * match was a "share this by email" link — a mailto: whose BODY happened to
 * contain the venue's exhibition path, so the recipe's rule matched text that
 * was never a link to anything. Telling a browser to go to a mailto: does not
 * load a page: it hands the address to whatever handles mail, which opened a
 * half-written email in her own browser, on a machine where Gmail handles mail.
 *
 * The real scraper already refuses this — it rejects any scheme that is not
 * http or https, and any address resolving to another host. This probe skipped
 * both guards. They are here now, so the failure cannot come back.
 */
async function usableLinks(page, target) {
  const hrefs = await page.$$eval(target.selector, els => els.map(e => e.getAttribute('href') || ''))
    .catch(() => []);
  const out = [];
  for (const href of hrefs) {
    if (!href || target.isNav(href)) continue;
    let resolved;
    try { resolved = new URL(href, target.base); } catch { continue; }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
    if (resolved.host.replace(/^www\./, '') !== new URL(target.base).host.replace(/^www\./, '')) continue;
    out.push(resolved.toString());
  }
  return out;
}

/**
 * Visit one address and write down everything that decides the outcome.
 *
 * Records navigator.webdriver every time. That is the flag Chrome sets when a
 * program opened it, and it is the single difference we expect between run A
 * and run B — so it is measured rather than assumed. If it reads the same in
 * both runs, the difference between them is something else and the whole
 * A-versus-B reading is wrong.
 */
async function visit(page, url, target, budget) {
  const cap = budget.cap || MAX_VISITS;
  if (budget.used >= cap) {
    return { url, outcome: 'skipped-visit-cap', note: `hit the ${cap}-visit cap` };
  }
  budget.used++;

  const rec = { url, at: new Date().toISOString() };
  let res;
  try {
    res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    rec.outcome = 'error';
    rec.note = e.message.split('\n')[0];
    return rec;
  }

  rec.status = res ? res.status() : 0;
  const headers = res ? res.headers() : {};
  // Cloudflare says what it did in this header. Its ABSENCE is meaningful too —
  // that absence is exactly what made us call morgan a flat wall — so it is
  // recorded as "(none)" rather than left off the record.
  rec.cfMitigated = headers['cf-mitigated'] || '(none)';
  rec.cfCacheStatus = headers['cf-cache-status'] || '(none)';
  rec.server = headers['server'] || '(none)';
  rec.webdriverFlag = await page.evaluate(() => navigator.webdriver).catch(() => 'unreadable');

  let seen = await readPage(page);
  rec.challengeAppeared = looksLikeChallenge(seen);

  // Give a challenge time to clear, asking rather than waiting blind.
  rec.challengeWaitedMs = 0;
  if (rec.challengeAppeared) {
    console.log('   A security check appeared. Waiting for it to clear.');
    console.log('   If it shows you something to click, click it.');
    const started = Date.now();
    while (Date.now() - started < CHALLENGE_WAIT_MS) {
      await page.waitForTimeout(POLL_MS);
      seen = await readPage(page);
      if (!looksLikeChallenge(seen)) break;
    }
    rec.challengeWaitedMs = Date.now() - started;
    rec.challengeCleared = !looksLikeChallenge(seen);
  }

  const links = await usableLinks(page, target);
  rec.title = seen.title;
  rec.textLength = seen.text.length;
  rec.exhibitionLinks = links.length;
  rec.firstLinks = links.slice(0, 10);

  // EVERY same-host path this page offers, deduped. A count cannot tell you
  // what shape a venue's links are, and the first ten on a page built out of
  // banners and menus are all navigation — which is exactly how the British
  // Museum's recipe came to hunt for `/exhibitions-events/` when its actual
  // exhibitions live at `/exhibitions/`. Nobody could see that from a number.
  // Capped, because a listing page can carry hundreds and the point is the
  // SHAPE, not the inventory.
  rec.allPaths = [...new Set(links.map(u => { try { return new URL(u).pathname; } catch { return u; } }))]
    .slice(0, 300);
  // Kept so a thin page can be told apart from an empty one by reading it,
  // rather than by trusting a number. A count flattens the evidence.
  rec.textOpening = seen.text.replace(/\s+/g, ' ').trim().slice(0, 300);

  if (looksLikeChallenge(seen)) {
    rec.outcome = 'challenge-not-cleared';
  } else if (rec.status >= 400) {
    rec.outcome = 'refused-outright';
  } else if (links.length === 0 && seen.text.length < 400) {
    rec.outcome = 'in-but-empty';
  } else {
    rec.outcome = 'in';
  }

  console.log(`   ${rec.outcome.toUpperCase()}  code ${rec.status}`
            + `  cf-mitigated: ${rec.cfMitigated}`
            + `  links: ${rec.exhibitionLinks}`
            + `  text: ${rec.textLength} chars`);
  return rec;
}

/** One venue: its listing, then — only if we got in — one exhibition page off it. */
async function probeVenue(page, target, budget) {
  console.log(`=== ${target.code}`);
  const out = { code: target.code };

  out.listing = await visit(page, target.base + target.listing, target, budget);

  // THE DETAIL PAGE IS THE REAL QUESTION. moma's listing opened back in
  // September and it meant nothing — all 24 of its exhibition pages still
  // refused, so not one row had any text. A listing that opens is not a route.
  if (out.listing.outcome === 'in' && out.listing.firstLinks.length) {
    // Already resolved and filtered by usableLinks() — an ordinary web
    // address on the venue's own host, never a mailto: or an offsite link.
    const detailUrl = out.listing.firstLinks[0];
    console.log(`   → now one exhibition page: ${detailUrl}`);
    await pace(page, 1);
    out.detail = await visit(page, detailUrl, target, budget);
  } else {
    out.detail = { outcome: 'not-attempted', note: 'the listing did not let us in' };
    console.log('   → exhibition page not attempted (the listing did not let us in)');
  }
  console.log('');
  return out;
}

// ── The three commands ───────────────────────────────────────────────────────

function openChrome() {
  const bin = resolveChrome();
  if (!bin) {
    console.log('Could not find Chrome. Tell Claude what `which google-chrome` prints.');
    process.exit(1);
  }
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  console.log(`Opening ${bin}`);
  console.log(`on the probe's own profile: ${PROFILE_DIR}\n`);

  // Plain Chrome, started the way a person starts it. Playwright is not
  // involved, so none of its automation switches are set — that is the whole
  // point of this mode, for both seeding and run B.
  const child = spawn(bin, [
    `--user-data-dir=${PROFILE_DIR}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    'https://www.moma.org/calendar/exhibitions',
  ], { detached: true, stdio: 'ignore' });
  child.unref();

  console.log('A browser window should appear. It is a fresh Chrome with no');
  console.log('bookmarks or sign-ins, which is expected.\n');
  console.log('Visit all three for a minute each, as you normally would:');
  console.log('   https://www.moma.org/calendar/exhibitions');
  console.log('   https://www.britishmuseum.org/exhibitions-events/past-exhibitions');
  console.log('   https://www.themorgan.org/exhibitions/current');
  console.log('Click into a couple of exhibitions. Let any security check finish.\n');
  console.log('Then: CLOSE it before run A. LEAVE IT OPEN for run B.');
}

/**
 * Visit exactly the addresses given, and follow nothing.
 *
 * This exists because SHE is writing the two unfinished recipes, not a probe.
 * Both were written for pages nobody had ever been allowed to see, and guessing
 * at their shape a second time from markup is how they got wrong in the first
 * place. So the probe no longer hunts for a page to open — she names it.
 *
 * It answers one question per address: does a genuine exhibition page open,
 * and what comes back. Nothing is crawled, so the visit count is exactly the
 * number of addresses given.
 */
async function runPages(urls) {
  console.log('Visiting exactly the addresses given. Following nothing.\n');
  const bin = resolveChrome();
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      executablePath: bin || undefined,
      channel: bin ? undefined : 'chrome',
      headless: false,
      viewport: null,
    });
  } catch (e) {
    if (/ProcessSingleton|already running|SingletonLock/i.test(e.message)) {
      console.log('That profile is open in another window. Close that Chrome and try again.');
      process.exit(1);
    }
    throw e;
  }
  const page = await context.newPage();
  const budget = { used: 0, cap: urls.length };
  const results = [];
  let stopped = null;
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const base = new URL(u).origin;
    // Every link on the page is recorded, filtered only for "is a real web
    // address on this venue's own host". What counts as an exhibition link is
    // hers to decide from the live page, not this probe's to guess.
    const target = { base, selector: 'a[href]', isNav: () => false };
    await pace(page, i);
    console.log(`=== ${u}`);
    const rec = await visit(page, u, target, budget);
    results.push({ code: new URL(u).host, listing: rec, detail: { outcome: 'not-attempted', note: 'this mode follows nothing' } });
    console.log('');
    if (isRefusal(rec)) {
      stopped = { after: i + 1, of: urls.length, url: u, outcome: rec.outcome };
      console.log(`Refused at address ${i + 1} of ${urls.length}. Stopping the run here.`);
      console.log('Asking again cannot learn anything this refusal has not already said,');
      console.log('and it makes the next attempt worse.\n');
      break;
    }
  }
  await context.close().catch(() => {});
  return { run: 'PAGES', how: 'exact addresses she named; nothing followed',
           paceSeconds: PACE_MS / 1000, stopped, results, visits: budget.used };
}

async function runA() {
  console.log('RUN A — the scraper opens Chrome on the profile you seeded.\n');
  const bin = resolveChrome();
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      executablePath: bin || undefined,
      channel: bin ? undefined : 'chrome',
      headless: false,
      viewport: null,
    });
  } catch (e) {
    if (/ProcessSingleton|already running|SingletonLock/i.test(e.message)) {
      console.log('That profile is open in another window. Close that Chrome, then run A again.');
      process.exit(1);
    }
    throw e;
  }
  const page = await context.newPage();
  const budget = { used: 0 };
  const results = [];
  let stopped = null;
  for (let i = 0; i < TARGETS.length; i++) {
    await pace(page, i);
    const v = await probeVenue(page, TARGETS[i], budget);
    results.push(v);
    if (isRefusal(v.listing) || isRefusal(v.detail)) {
      stopped = { after: i + 1, of: TARGETS.length, code: TARGETS[i].code };
      console.log(`Refused at ${TARGETS[i].code}. Stopping the run here.\n`);
      break;
    }
  }
  await context.close().catch(() => {});
  return { run: 'A', how: 'scraper opened Chrome, profile seeded by her',
           paceSeconds: PACE_MS / 1000, stopped, results, visits: budget.used };
}

async function runB() {
  console.log('RUN B — reading the pages in the Chrome you opened yourself.\n');
  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  } catch (e) {
    console.log(`Could not reach a Chrome on port ${DEBUG_PORT}.`);
    console.log('Run `node scraper/probe_headed.js open` first and leave that window open.');
    process.exit(1);
  }
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  const budget = { used: 0 };
  const results = [];
  let stopped = null;
  for (let i = 0; i < TARGETS.length; i++) {
    await pace(page, i);
    const v = await probeVenue(page, TARGETS[i], budget);
    results.push(v);
    if (isRefusal(v.listing) || isRefusal(v.detail)) {
      stopped = { after: i + 1, of: TARGETS.length, code: TARGETS[i].code };
      console.log(`Refused at ${TARGETS[i].code}. Stopping the run here.\n`);
      break;
    }
  }
  // Her window stays open — we opened a tab in it and close only that.
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  return { run: 'B', how: 'she opened Chrome; the scraper read its pages',
           paceSeconds: PACE_MS / 1000, stopped, results, visits: budget.used };
}

// ── Writing it down ──────────────────────────────────────────────────────────

function report(payload) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const dir = path.join(__dirname, 'output');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `probe_headed_${payload.run}_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));

  console.log('--- WHAT HAPPENED ---');
  for (const v of payload.results) {
    const l = v.listing, d = v.detail;
    console.log(`${v.code.padEnd(8)} listing: ${String(l.outcome).padEnd(22)}`
              + `exhibition page: ${d.outcome}`);
    if (l.webdriverFlag !== undefined) {
      console.log(`         browser announced it was being driven: ${l.webdriverFlag}`);
    }
  }
  console.log(`\nPages visited: ${payload.visits}, with about ${payload.paceSeconds}s between them.`);
  if (payload.stopped) {
    console.log(`The run STOPPED EARLY at ${payload.stopped.url || payload.stopped.code}`
              + ` — ${payload.stopped.after} of ${payload.stopped.of} attempted.`);
    console.log('The rest were not asked for, deliberately.');
  }
  console.log(`Written to ${file}`);
  console.log('\nThis says whether a venue still refuses. It cannot say a venue');
  console.log('works — only a real sweep can.');
}

(async () => {
  const mode = (process.argv[2] || '').toLowerCase();
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    console.log('A proxy is set, so this is the container, not her laptop.');
    console.log('This probe is for her machine. Stopping.\n');
    process.exit(1);
  }
  if (mode === 'open') return openChrome();
  if (mode === 'a') return report(await runA());
  if (mode === 'b') return report(await runB());
  if (mode === 'page') {
    const urls = process.argv.slice(3).filter(u => /^https?:\/\//i.test(u));
    if (!urls.length) {
      console.log('Give it one or more ordinary web addresses:');
      console.log('  node scraper/probe_headed.js page https://... https://...');
      process.exit(1);
    }
    return report(await runPages(urls));
  }

  console.log('Usage, in this order:');
  console.log('  node scraper/probe_headed.js open    seed the profile, then close Chrome');
  console.log('  node scraper/probe_headed.js A');
  console.log('  node scraper/probe_headed.js open    and LEAVE it open');
  console.log('  node scraper/probe_headed.js B');
  console.log('');
  console.log('Or visit named pages and follow nothing:');
  console.log('  node scraper/probe_headed.js page https://... https://...');
  console.log('');
  console.log(`Every mode leaves about ${PACE_MS / 1000}s between pages and stops at the`);
  console.log('first check that will not clear. Change the gap with --pace=<seconds>.');
})();
