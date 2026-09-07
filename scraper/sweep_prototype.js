/**
 * Cat Watch — Sweep Prototype
 * Six venues: met, ng, rijks, acq, borghese, morgan
 *
 * Outputs:
 *   scraper/output/sweep_raw.csv      — pro forma CSV with raw curatorial text in summary
 *   scraper/output/sweep_log.txt      — diagnostic log (what worked, what failed, why)
 *
 * Run: node scraper/sweep_prototype.js
 * Requires: npm install  (playwright, node-fetch@2, https-proxy-agent)
 *
 * NETWORK NOTE — why this script routes traffic through Node:
 *   In this container all egress goes through the agent proxy at $HTTPS_PROXY.
 *   Chromium cannot use that proxy directly: the CONNECT tunnel opens, Chromium
 *   sends its ~1.8 KB padded ClientHello, and the egress relay drops the tunnel,
 *   surfacing as net::ERR_CONNECTION_RESET on every https navigation. Setting
 *   `proxy: { server: HTTPS_PROXY }` on chromium.launch() does NOT fix it, and
 *   neither does ignoring certificate errors — it is not a trust failure.
 *   curl and openssl to the same hosts succeed (their ClientHellos are small).
 *
 *   So: Chromium performs no network I/O at all. installNetworkBridge() below
 *   intercepts every request and fulfils it from Node's node-fetch +
 *   HttpsProxyAgent, which traverses the proxy cleanly. Chromium still parses,
 *   renders and executes JavaScript exactly as before, so the venue scrapers
 *   below are unchanged and still receive a normal Playwright `page`.
 */

const { chromium } = require('playwright');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

// ── Proxy setup ───────────────────────────────────────────────────────────────
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy;
const proxyAgent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Resource types Chromium may request that contribute nothing to text scraping.
const SKIP_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

// ── Output setup ──────────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const CSV_PATH = path.join(OUT_DIR, 'sweep_raw.csv');
const LOG_PATH = path.join(OUT_DIR, 'sweep_log.txt');

const LOOKBACK = new Date('2024-07-01');
const CURRENT_YEAR = new Date().getFullYear();

// ── Logging ───────────────────────────────────────────────────────────────────
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logLines.push(line);
}
function logSection(title) {
  const sep = '─'.repeat(60);
  log('');
  log(sep);
  log(`  ${title}`);
  log(sep);
}
function writeLog() {
  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function csvCell(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  // Quote if contains comma, newline, or double-quote
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvRow(r) {
  return [r.venue_code, r.title, r.start_date, r.end_date, r.summary, r.url, r.notes]
    .map(csvCell).join(',');
}

// ── Date helpers ──────────────────────────────────────────────────────────────
// Parse date strings like "March 2–July 26, 2026" or "April 16–July 19, 2026" or "July 2, 2022–June 28, 2026"
// Returns { start: 'YYYY-MM-DD'|'', end: 'YYYY-MM-DD'|'', raw: original }
const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function parseMonthDay(str, fallbackYear) {
  // e.g. "March 2" or "July 26, 2026"
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()];
  if (!mo) return null;
  const day = parseInt(m[2], 10);
  const yr = m[3] ? parseInt(m[3], 10) : fallbackYear;
  if (!yr) return null;
  return `${yr}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function parseDateRange(raw) {
  if (!raw) return { start: '', end: '', raw: '' };
  const s = raw.trim()
    .replace(/–|—/g, '–')   // normalise dashes
    .replace(/\s+/g, ' ');

  // Pattern: "Month D, YYYY–Month D, YYYY"  (both sides have year)
  const full = s.match(/^([A-Za-z]+ \d{1,2},\s*\d{4})\s*[–-]\s*([A-Za-z]+ \d{1,2},\s*\d{4})$/);
  if (full) {
    return {
      start: parseMonthDay(full[1], null) || '',
      end:   parseMonthDay(full[2], null) || '',
      raw:   s
    };
  }

  // Pattern: "Month D–Month D, YYYY"  (year only on end side)
  const shared = s.match(/^([A-Za-z]+ \d{1,2})\s*[–-]\s*([A-Za-z]+ \d{1,2},\s*(\d{4}))$/);
  if (shared) {
    const yr = parseInt(shared[3], 10);
    return {
      start: parseMonthDay(shared[1], yr) || '',
      end:   parseMonthDay(shared[2], null) || '',
      raw:   s
    };
  }

  // Single date "Month D, YYYY" — treat as end date (open until)
  const single = s.match(/^([A-Za-z]+ \d{1,2},\s*\d{4})$/);
  if (single) {
    return { start: '', end: parseMonthDay(single[1], null) || '', raw: s };
  }

  return { start: '', end: '', raw: s };
}

function afterLookback(endDateStr) {
  // If no end date, include (we don't know when it ended)
  if (!endDateStr) return true;
  const d = new Date(endDateStr + 'T00:00:00');
  if (isNaN(d)) return true;
  return d >= LOOKBACK;
}

// ── Page helpers ──────────────────────────────────────────────────────────────

/**
 * Make Chromium stop touching the network.
 *
 * Every request the browser makes is intercepted and satisfied by Node, which
 * reaches the internet through the agent proxy. Chromium receives a normal
 * response and behaves normally — including running the page's JavaScript.
 */
async function installNetworkBridge(context) {
  const stats = { fulfilled: 0, skipped: 0, failed: 0 };

  await context.route('**/*', async (route) => {
    const request = route.request();

    if (SKIP_RESOURCE_TYPES.has(request.resourceType())) {
      stats.skipped++;
      return route.abort();
    }

    const method = request.method();
    const headers = { ...request.headers() };
    // Let node-fetch negotiate its own encoding and connection handling.
    delete headers['accept-encoding'];
    delete headers['connection'];

    try {
      const response = await fetch(request.url(), {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : request.postData(),
        agent: proxyAgent,
        redirect: 'follow',
        timeout: 30000,
        compress: true,
      });

      const body = await response.buffer();

      // node-fetch has already decompressed and re-framed the body, so the
      // upstream length/encoding headers no longer describe what we hand back.
      const raw = response.headers.raw();
      const out = {};
      for (const [name, values] of Object.entries(raw)) {
        const key = name.toLowerCase();
        if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') continue;
        out[name] = key === 'set-cookie' ? values.join('\n') : values.join(', ');
      }

      stats.fulfilled++;
      await route.fulfill({ status: response.status, headers: out, body });
    } catch (e) {
      stats.failed++;
      await route.abort();
    }
  });

  return stats;
}

async function safeGoto(page, url, venue, context) {
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = resp ? resp.status() : null;
    if (status && (status === 403 || status === 418 || status === 429)) {
      log(`  BLOCKED (HTTP ${status}): ${url}`);
      return { ok: false, reason: `BLOCKED_HTTP_${status}` };
    }
    return { ok: true, status };
  } catch (e) {
    const reason = e.message.includes('timeout') ? 'TIMEOUT' : 'LOAD_ERROR';
    log(`  ${reason}: ${url} — ${e.message.slice(0, 120)}`);
    return { ok: false, reason };
  }
}

// Extract visible text from an element, trimmed
async function getText(el) {
  try { return (await el.innerText()).trim(); } catch { return ''; }
}

// ── Curatorial text extraction ────────────────────────────────────────────────
// On individual exhibition pages, look for the main descriptive paragraph(s).
// We target the most common patterns across museum sites.
async function getCuratorialText(page) {
  // Try common selectors for the exhibition description/intro block
  const selectors = [
    '.exhibition-detail__description',
    '.exhibition__description',
    '.exhibition-intro',
    '.intro-text',
    '[class*="description"]',
    '[class*="intro"]',
    '[class*="about"]',
    'article p',
    '.content p',
    'main p',
  ];
  for (const sel of selectors) {
    try {
      const els = await page.$$(sel);
      const texts = [];
      for (const el of els.slice(0, 4)) {
        const t = await getText(el);
        if (t.length > 60) texts.push(t); // ignore short nav/label text
      }
      if (texts.length) return texts.join(' ').slice(0, 2000);
    } catch {}
  }
  // Fallback: grab first few substantial paragraphs from body
  try {
    const paras = await page.$$('p');
    const texts = [];
    for (const p of paras.slice(0, 20)) {
      const t = await getText(p);
      if (t.length > 80 && texts.length < 3) texts.push(t);
    }
    if (texts.length) return texts.join(' ').slice(0, 2000);
  } catch {}
  return '';
}

// ── Venue scrapers ────────────────────────────────────────────────────────────

// THE MET ─────────────────────────────────────────────────────────────────────
async function scrapeMet(page) {
  logSection('MET — The Metropolitan Museum of Art');
  const rows = [];
  const venueCode = 'met';

  // Current + upcoming
  log('  Fetching current/upcoming: https://www.metmuseum.org/exhibitions');
  const r1 = await safeGoto(page, 'https://www.metmuseum.org/exhibitions', venueCode, 'current');
  if (!r1.ok) {
    log(`  FAILED current/upcoming — ${r1.reason}`);
  } else {
    const found = await metExtractListing(page, venueCode, 'current/upcoming');
    rows.push(...found);
    log(`  current/upcoming: ${found.length} exhibitions found`);
  }

  // Past — iterate years 2026, 2025, 2024
  log('  Fetching past: https://www.metmuseum.org/exhibitions/past');
  const r2 = await safeGoto(page, 'https://www.metmuseum.org/exhibitions/past', venueCode, 'past');
  if (!r2.ok) {
    log(`  FAILED past listing — ${r2.reason}`);
  } else {
    for (const year of [CURRENT_YEAR, CURRENT_YEAR - 1, 2024]) {
      try {
        log(`  Selecting year ${year}...`);
        // The Met uses a <select> dropdown with year values
        await page.selectOption('select', String(year));
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        const found = await metExtractListing(page, venueCode, `past-${year}`);
        // Filter by lookback
        const inWindow = found.filter(r => afterLookback(r.end_date));
        rows.push(...inWindow);
        log(`  past ${year}: ${found.length} found, ${inWindow.length} within lookback`);
        if (year === 2024) break; // 2024 is the floor year — stop here
      } catch (e) {
        log(`  ERROR selecting year ${year}: ${e.message.slice(0, 120)}`);
      }
    }
  }

  // Fetch individual pages for summaries
  await fetchIndividualPages(page, rows, venueCode);
  return rows;
}

async function metExtractListing(page, venueCode, context) {
  const rows = [];
  try {
    // Met listing: each exhibition is an article or div with a link, title, and date
    const items = await page.$$('[class*="exhibition-listing"] a, .exhibition-card a, article a[href*="/exhibitions/"]');
    // Fallback: look for any link into /exhibitions/ path
    const links = await page.$$('a[href*="/exhibitions/"]');
    const seen = new Set();
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (!href || seen.has(href)) continue;
      // Skip the top-level /exhibitions and /exhibitions/past pages themselves
      if (/^\/exhibitions\/?$/.test(href) || /^\/exhibitions\/past\/?$/.test(href)) continue;
      seen.add(href);
      const fullUrl = href.startsWith('http') ? href : 'https://www.metmuseum.org' + href;
      // Try to get title from link text or nearby heading
      let title = (await getText(link)).replace(/\n.*/s, '').trim();
      if (!title || title.length < 3) continue;
      rows.push({
        venue_code: venueCode,
        title,
        start_date: '',
        end_date: '',
        summary: '',
        url: fullUrl,
        notes: `source: ${context}`,
        _needsDates: true,
      });
    }
  } catch (e) {
    log(`  ERROR extracting Met listing (${context}): ${e.message.slice(0, 120)}`);
  }
  return rows;
}

// NATIONAL GALLERY ─────────────────────────────────────────────────────────────
async function scrapeNG(page) {
  logSection('NG — National Gallery, London');
  const rows = [];
  const venueCode = 'ng';

  const urls = [
    { url: 'https://www.nationalgallery.org.uk/exhibitions', ctx: 'current/upcoming' },
    { url: 'https://www.nationalgallery.org.uk/exhibitions/past', ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    try {
      // NG listing: exhibition cards with links, titles, dates
      const links = await page.$$('a[href*="/exhibitions/"]');
      const seen = new Set();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href || seen.has(href)) continue;
        if (/\/exhibitions\/?$/.test(href) || /\/exhibitions\/past\/?$/.test(href)) continue;
        seen.add(href);
        const fullUrl = href.startsWith('http') ? href : 'https://www.nationalgallery.org.uk' + href;
        const title = (await getText(link)).replace(/\n.*/s, '').trim();
        if (!title || title.length < 3) continue;

        // Try to find date text near the link
        let dateText = '';
        try {
          const parent = await link.$('xpath=..');
          if (parent) dateText = await getText(parent);
        } catch {}
        const dates = parseDateRange(dateText);

        if (!afterLookback(dates.end)) continue;

        rows.push({
          venue_code: venueCode,
          title,
          start_date: dates.start,
          end_date: dates.end,
          summary: '',
          url: fullUrl,
          notes: dates.raw && !dates.start && !dates.end ? `date text: "${dates.raw.slice(0,80)}"` : '',
        });
      }
      log(`  ${ctx}: ${rows.filter(r=>r.venue_code===venueCode).length} total so far`);
    } catch (e) {
      log(`  ERROR extracting NG listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  await fetchIndividualPages(page, rows, venueCode);
  return rows;
}

// RIJKSMUSEUM ─────────────────────────────────────────────────────────────────
async function scrapeRijks(page) {
  logSection('RIJKS — Rijksmuseum, Amsterdam');
  const rows = [];
  const venueCode = 'rijks';

  const urls = [
    { url: 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view', ctx: 'current/upcoming' },
    { url: 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/past', ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    try {
      const links = await page.$$('a[href*="/whats-on/exhibitions/"]');
      const seen = new Set();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href || seen.has(href)) continue;
        if (/exhibitions\/?$/.test(href) || /now-on-view\/?$/.test(href) || /past\/?$/.test(href)) continue;
        seen.add(href);
        const fullUrl = href.startsWith('http') ? href : 'https://www.rijksmuseum.nl' + href;
        const title = (await getText(link)).replace(/\n.*/s, '').trim();
        if (!title || title.length < 3) continue;
        rows.push({
          venue_code: venueCode, title, start_date: '', end_date: '',
          summary: '', url: fullUrl, notes: `source: ${ctx}`,
        });
      }
      log(`  ${ctx}: extracted links`);
    } catch (e) {
      log(`  ERROR extracting Rijks listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  await fetchIndividualPages(page, rows, venueCode);
  return rows;
}

// ACQUAVELLA ──────────────────────────────────────────────────────────────────
async function scrapeAcq(page) {
  logSection('ACQ — Acquavella Galleries, New York');
  const rows = [];
  const venueCode = 'acq';

  log('  Fetching: https://www.acquavellagalleries.com/exhibitions');
  const r = await safeGoto(page, 'https://www.acquavellagalleries.com/exhibitions', venueCode, 'all');
  if (!r.ok) { log(`  FAILED — ${r.reason}`); return rows; }

  try {
    const links = await page.$$('a[href*="/exhibitions/"]');
    const seen = new Set();
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (!href || seen.has(href)) continue;
      if (/\/exhibitions\/?$/.test(href)) continue;
      seen.add(href);
      const fullUrl = href.startsWith('http') ? href : 'https://www.acquavellagalleries.com' + href;
      const title = (await getText(link)).replace(/\n.*/s, '').trim();
      if (!title || title.length < 3) continue;
      rows.push({
        venue_code: venueCode, title, start_date: '', end_date: '',
        summary: '', url: fullUrl, notes: '',
      });
    }
    log(`  found ${rows.length} exhibition links`);
  } catch (e) {
    log(`  ERROR extracting Acq listing: ${e.message.slice(0,120)}`);
  }

  await fetchIndividualPages(page, rows, venueCode);
  return rows;
}

// BORGHESE ────────────────────────────────────────────────────────────────────
async function scrapeBorghese(page) {
  logSection('BORGHESE — Galleria Borghese, Rome');
  const rows = [];
  const venueCode = 'borghese';

  // Three separate URLs (tabs are separate paths on this domain)
  const urls = [
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/presenti/', ctx: 'current' },
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/future/',   ctx: 'upcoming' },
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/passate/',  ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) {
      log(`  FAILED ${ctx} — ${r.reason} (expected if robots-blocked)`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `BLOCKED: ${r.reason} — page did not load`,
      });
      continue;
    }

    // Check for robots block or empty page
    const bodyText = await page.innerText('body').catch(() => '');
    if (bodyText.length < 200) {
      log(`  EMPTY_PAGE ${ctx}: page loaded but body has <200 chars — likely shell or block`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `EMPTY_PAGE: page loaded but returned no usable content`,
      });
      continue;
    }

    try {
      const links = await page.$$('a[href*="/mostre/"]');
      const seen = new Set();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href || seen.has(href)) continue;
        if (/\/(presenti|future|passate)\/?$/.test(href)) continue;
        seen.add(href);
        const fullUrl = href.startsWith('http') ? href : 'https://galleriaborghese.cultura.gov.it' + href;
        const title = (await getText(link)).replace(/\n.*/s, '').trim();
        if (!title || title.length < 3) continue;
        rows.push({
          venue_code: venueCode, title, start_date: '', end_date: '',
          summary: '', url: fullUrl, notes: `source: ${ctx}`,
        });
      }
      log(`  ${ctx}: ${rows.filter(r=>r.notes?.includes(ctx)).length} links found`);
    } catch (e) {
      log(`  ERROR extracting Borghese listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  // Only fetch individual pages if we actually got links (not just placeholder rows)
  const real = rows.filter(r => !r.title.startsWith('['));
  if (real.length) await fetchIndividualPages(page, real, venueCode);
  return rows;
}

// MORGAN ──────────────────────────────────────────────────────────────────────
async function scrapeMorgan(page) {
  logSection('MORGAN — Morgan Library & Museum, New York');
  const rows = [];
  const venueCode = 'morgan';

  const urls = [
    { url: 'https://www.themorgan.org/exhibitions/current',  ctx: 'current' },
    { url: 'https://www.themorgan.org/exhibitions/upcoming', ctx: 'upcoming' },
    { url: 'https://www.themorgan.org/exhibitions/past',     ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    // Morgan is a known JS shell — check if we got real content
    const bodyText = await page.innerText('body').catch(() => '');
    const titleCount = await page.$$('h2, h3').then(els => els.length).catch(() => 0);
    if (titleCount === 0 || bodyText.length < 300) {
      log(`  JS_SHELL ${ctx}: page loaded but no headings found — shell-plus-database failure`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `JS_SHELL: page rendered no exhibition content — JavaScript database injection failed`,
      });
      continue;
    }

    try {
      const links = await page.$$('a[href*="/exhibitions/"]');
      const seen = new Set();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href || seen.has(href)) continue;
        if (/\/exhibitions\/(current|upcoming|past)\/?$/.test(href)) continue;
        seen.add(href);
        const fullUrl = href.startsWith('http') ? href : 'https://www.themorgan.org' + href;
        const title = (await getText(link)).replace(/\n.*/s, '').trim();
        if (!title || title.length < 3) continue;
        rows.push({
          venue_code: venueCode, title, start_date: '', end_date: '',
          summary: '', url: fullUrl, notes: `source: ${ctx}`,
        });
      }
      log(`  ${ctx}: links found — Morgan shell did NOT fail (headless browser fixed it)`);
    } catch (e) {
      log(`  ERROR extracting Morgan listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  const real = rows.filter(r => !r.title.startsWith('['));
  if (real.length) await fetchIndividualPages(page, real, venueCode);
  return rows;
}

// ── Individual page fetcher ───────────────────────────────────────────────────
async function fetchIndividualPages(page, rows, venueCode) {
  let fetched = 0, failed = 0, noText = 0;
  for (const row of rows) {
    if (!row.url || row.url.startsWith('[')) continue;
    try {
      const r = await safeGoto(page, row.url, venueCode, 'individual');
      if (!r.ok) {
        row.notes = (row.notes ? row.notes + '; ' : '') + `individual page: ${r.reason}`;
        failed++;
        continue;
      }
      const text = await getCuratorialText(page);
      if (text) {
        row.summary = text;
        fetched++;
      } else {
        row.notes = (row.notes ? row.notes + '; ' : '') + 'NO_CURATORIAL_TEXT on individual page';
        noText++;
      }

      // Also try to grab dates from the individual page if we don't have them
      if (!row.start_date && !row.end_date) {
        try {
          const dateEl = await page.$('[class*="date"], [class*="Date"], time');
          if (dateEl) {
            const raw = await getText(dateEl);
            const dates = parseDateRange(raw);
            if (dates.start) row.start_date = dates.start;
            if (dates.end) row.end_date = dates.end;
            if (raw && !dates.start && !dates.end) {
              row.notes = (row.notes ? row.notes + '; ' : '') + `date text unparsed: "${raw.slice(0,60)}"`;
            }
          }
        } catch {}
      }
    } catch (e) {
      row.notes = (row.notes ? row.notes + '; ' : '') + `individual page error: ${e.message.slice(0,80)}`;
      failed++;
    }
  }
  log(`  Individual pages: ${fetched} got text, ${noText} no curatorial text, ${failed} failed`);
}

// ── Deduplication ─────────────────────────────────────────────────────────────
function dedup(rows) {
  const seen = new Set();
  return rows.filter(r => {
    const key = `${r.venue_code}|${r.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  log('Cat Watch Sweep Prototype — starting');
  log(`Lookback floor: ${LOOKBACK.toISOString().slice(0,10)}`);
  log(`Venues: met, ng, rijks, acq, borghese, morgan`);

  log(`Proxy: ${PROXY_URL || '(none — direct egress assumed)'}`);
  if (!PROXY_URL) {
    log('  WARNING: HTTPS_PROXY is unset. If this container requires the agent');
    log('  proxy for egress, every venue will fail to load.');
  }

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 800 },
  });

  // Chromium does no network I/O of its own — see NETWORK NOTE at top of file.
  const netStats = await installNetworkBridge(context);
  log('Network bridge installed: Chromium requests are served by Node via the proxy');

  const page = await context.newPage();

  const allRows = [];
  const summary = {};

  const allScrapers = [
    { code: 'met',      fn: scrapeMet },
    { code: 'ng',       fn: scrapeNG },
    { code: 'rijks',    fn: scrapeRijks },
    { code: 'acq',      fn: scrapeAcq },
    { code: 'borghese', fn: scrapeBorghese },
    { code: 'morgan',   fn: scrapeMorgan },
  ];

  // Optional venue filter: node scraper/sweep_prototype.js borghese morgan
  const wanted = process.argv.slice(2).map(a => a.toLowerCase());
  const scrapers = wanted.length
    ? allScrapers.filter(s => wanted.includes(s.code))
    : allScrapers;
  if (wanted.length) log(`Venue filter: ${scrapers.map(s => s.code).join(', ') || '(none matched)'}`);

  for (const { code, fn } of scrapers) {
    try {
      const rows = await fn(page);
      const real = rows.filter(r => !r.title.startsWith('['));
      const placeholders = rows.filter(r => r.title.startsWith('['));
      allRows.push(...rows);
      summary[code] = {
        total: rows.length,
        real: real.length,
        withSummary: real.filter(r => r.summary).length,
        placeholders: placeholders.length,
      };
      log(`  → ${code}: ${real.length} exhibitions, ${real.filter(r=>r.summary).length} with curatorial text`);
    } catch (e) {
      log(`  FATAL ERROR in ${code} scraper: ${e.message}`);
      summary[code] = { error: e.message };
    }
  }

  await browser.close();

  // Write CSV
  const deduped = dedup(allRows);
  const csvLines = ['venue_code,title,start_date,end_date,summary,url,notes'];
  for (const r of deduped) csvLines.push(csvRow(r));
  fs.writeFileSync(CSV_PATH, csvLines.join('\n') + '\n', 'utf8');

  // Final summary in log
  logSection('SWEEP COMPLETE — SUMMARY');
  for (const [code, s] of Object.entries(summary)) {
    if (s.error) {
      log(`  ${code.toUpperCase()}: FATAL ERROR — ${s.error}`);
    } else {
      const blocked = s.placeholders > 0 ? ` | ${s.placeholders} page(s) blocked/empty` : '';
      log(`  ${code.toUpperCase()}: ${s.real} exhibitions | ${s.withSummary} with text${blocked}`);
    }
  }
  log('');
  log(`Network bridge: ${netStats.fulfilled} requests served, ${netStats.skipped} skipped (image/media/font), ${netStats.failed} failed`);
  log('');
  log(`CSV written to:  ${CSV_PATH}`);
  log(`Log written to:  ${LOG_PATH}`);
  log(`Total rows (inc. placeholders): ${deduped.length}`);

  writeLog();
})();
