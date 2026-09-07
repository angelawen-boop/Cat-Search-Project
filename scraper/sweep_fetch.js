/**
 * Cat Watch — Sweep Fetch Diagnostic
 * Six venues: met, ng, rijks, acq, borghese, morgan
 *
 * Diagnostic copy of sweep_prototype.js using Node fetch instead of Playwright.
 * Purpose: find out which venues are reachable without a headless browser.
 *
 * Outputs:
 *   scraper/output/sweep_fetch_raw.csv
 *   scraper/output/sweep_fetch_log.txt
 *
 * Run: node scraper/sweep_fetch.js
 * Requires: npm install node-fetch@2 https-proxy-agent node-html-parser
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { parse: parseHtml } = require('node-html-parser');
const fs = require('fs');
const path = require('path');

// ── Proxy setup ───────────────────────────────────────────────────────────────
const proxyUrl = process.env.HTTPS_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Output setup ──────────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const CSV_PATH = path.join(OUT_DIR, 'sweep_fetch_raw.csv');
const LOG_PATH = path.join(OUT_DIR, 'sweep_fetch_log.txt');

const LOOKBACK = new Date('2024-07-01');

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
const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function parseMonthDay(str, fallbackYear) {
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
  const s = raw.trim().replace(/–|—/g, '–').replace(/\s+/g, ' ');

  const full = s.match(/^([A-Za-z]+ \d{1,2},\s*\d{4})\s*[–-]\s*([A-Za-z]+ \d{1,2},\s*\d{4})$/);
  if (full) {
    return { start: parseMonthDay(full[1], null) || '', end: parseMonthDay(full[2], null) || '', raw: s };
  }
  const shared = s.match(/^([A-Za-z]+ \d{1,2})\s*[–-]\s*([A-Za-z]+ \d{1,2},\s*(\d{4}))$/);
  if (shared) {
    const yr = parseInt(shared[3], 10);
    return { start: parseMonthDay(shared[1], yr) || '', end: parseMonthDay(shared[2], null) || '', raw: s };
  }
  const single = s.match(/^([A-Za-z]+ \d{1,2},\s*\d{4})$/);
  if (single) {
    return { start: '', end: parseMonthDay(single[1], null) || '', raw: s };
  }
  return { start: '', end: '', raw: s };
}

function afterLookback(endDateStr) {
  if (!endDateStr) return true;
  const d = new Date(endDateStr + 'T00:00:00');
  if (isNaN(d)) return true;
  return d >= LOOKBACK;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function safeFetch(url) {
  try {
    const response = await fetch(url, {
      agent,
      timeout: 30000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    if ([403, 418, 429].includes(response.status)) {
      log(`  BLOCKED (HTTP ${response.status}): ${url}`);
      return { ok: false, reason: `BLOCKED_HTTP_${response.status}` };
    }
    const html = await response.text();
    return { ok: true, html, status: response.status };
  } catch (e) {
    const reason = (e.type === 'request-timeout' || e.message.toLowerCase().includes('timeout'))
      ? 'TIMEOUT' : 'LOAD_ERROR';
    log(`  ${reason}: ${url} — ${e.message.slice(0, 120)}`);
    return { ok: false, reason };
  }
}

// Find anchor links in HTML where href contains a given substring
function parseLinks(html, hrefContains, baseUrl) {
  const root = parseHtml(html);
  const results = [];
  const seen = new Set();
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (!href.includes(hrefContains) || seen.has(href)) continue;
    seen.add(href);
    const fullUrl = href.startsWith('http') ? href : baseUrl + href;
    const text = a.text.replace(/[\n\r].*/s, '').trim();
    results.push({ href: fullUrl, text });
  }
  return results;
}

// Extract curatorial text from HTML — tries common selectors, falls back to <p> tags
function extractCuratorialText(html) {
  const root = parseHtml(html);
  const selectors = [
    '.exhibition-detail__description', '.exhibition__description',
    '.exhibition-intro', '.intro-text', 'article p', '.content p', 'main p',
  ];
  for (const sel of selectors) {
    const texts = root.querySelectorAll(sel)
      .slice(0, 4)
      .map(el => el.text.trim())
      .filter(t => t.length > 60);
    if (texts.length) return texts.join(' ').slice(0, 2000);
  }
  const texts = [];
  for (const p of root.querySelectorAll('p').slice(0, 20)) {
    const t = p.text.trim();
    if (t.length > 80 && texts.length < 3) texts.push(t);
  }
  return texts.join(' ').slice(0, 2000);
}

// Returns true if the page has no real content (JS shell)
function isJsShell(html) {
  const root = parseHtml(html);
  const bodyText = (root.querySelector('body')?.text || '').trim();
  const headingCount = root.querySelectorAll('h1,h2,h3').length;
  return bodyText.length < 300 || headingCount === 0;
}

// ── Individual page fetcher ───────────────────────────────────────────────────
async function fetchIndividualPages(rows, venueCode) {
  let fetched = 0, failed = 0, noText = 0;
  for (const row of rows) {
    if (!row.url || row.url.startsWith('[')) continue;
    const r = await safeFetch(row.url);
    if (!r.ok) {
      row.notes = (row.notes ? row.notes + '; ' : '') + `individual page: ${r.reason}`;
      failed++;
      continue;
    }
    const text = extractCuratorialText(r.html);
    if (text) {
      row.summary = text;
      fetched++;
    } else {
      row.notes = (row.notes ? row.notes + '; ' : '') + 'NO_CURATORIAL_TEXT on individual page';
      noText++;
    }
    if (!row.start_date && !row.end_date) {
      const root = parseHtml(r.html);
      const dateEl = root.querySelector('[class*="date"],[class*="Date"],time');
      if (dateEl) {
        const raw = dateEl.text.trim();
        const dates = parseDateRange(raw);
        if (dates.start) row.start_date = dates.start;
        if (dates.end) row.end_date = dates.end;
        if (raw && !dates.start && !dates.end) {
          row.notes = (row.notes ? row.notes + '; ' : '') + `date text unparsed: "${raw.slice(0,60)}"`;
        }
      }
    }
  }
  log(`  Individual pages: ${fetched} got text, ${noText} no curatorial text, ${failed} failed`);
}

// ── Venue scrapers ────────────────────────────────────────────────────────────

async function scrapeMet() {
  logSection('MET — The Metropolitan Museum of Art');
  const rows = [];
  const venueCode = 'met';
  const base = 'https://www.metmuseum.org';

  log('  Fetching current/upcoming: https://www.metmuseum.org/exhibitions');
  const r1 = await safeFetch('https://www.metmuseum.org/exhibitions');
  if (!r1.ok) {
    log(`  FAILED current/upcoming — ${r1.reason}`);
  } else {
    const links = parseLinks(r1.html, '/exhibitions/', base)
      .filter(l => !/\/exhibitions\/?$/.test(l.href) && !/\/exhibitions\/past\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: 'source: current/upcoming' });
    }
    log(`  current/upcoming: ${links.length} links found`);
  }

  log('  Fetching past: https://www.metmuseum.org/exhibitions/past');
  log('  NOTE: MET_PAST_NO_YEAR_FILTER — year dropdown requires JavaScript, fetching default view only');
  const r2 = await safeFetch('https://www.metmuseum.org/exhibitions/past');
  if (!r2.ok) {
    log(`  FAILED past — ${r2.reason}`);
  } else {
    const links = parseLinks(r2.html, '/exhibitions/', base)
      .filter(l => !/\/exhibitions\/?$/.test(l.href) && !/\/exhibitions\/past\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: 'source: past (default year only — year filter needs JS)' });
    }
    log(`  past (default year): ${links.length} links found`);
  }

  await fetchIndividualPages(rows, venueCode);
  return rows;
}

async function scrapeNG() {
  logSection('NG — National Gallery, London');
  const rows = [];
  const venueCode = 'ng';
  const base = 'https://www.nationalgallery.org.uk';

  for (const { url, ctx } of [
    { url: 'https://www.nationalgallery.org.uk/exhibitions', ctx: 'current/upcoming' },
    { url: 'https://www.nationalgallery.org.uk/exhibitions/past', ctx: 'past' },
  ]) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeFetch(url);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    const links = parseLinks(r.html, '/exhibitions/', base)
      .filter(l => !/\/exhibitions\/?$/.test(l.href) && !/\/exhibitions\/past\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: `source: ${ctx}` });
    }
    log(`  ${ctx}: ${links.length} links found`);
  }

  await fetchIndividualPages(rows, venueCode);
  return rows;
}

async function scrapeRijks() {
  logSection('RIJKS — Rijksmuseum, Amsterdam');
  const rows = [];
  const venueCode = 'rijks';
  const base = 'https://www.rijksmuseum.nl';

  for (const { url, ctx } of [
    { url: 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view', ctx: 'current/upcoming' },
    { url: 'https://www.rijksmuseum.nl/en/whats-on/exhibitions/past', ctx: 'past' },
  ]) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeFetch(url);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    const links = parseLinks(r.html, '/whats-on/exhibitions/', base)
      .filter(l => !/exhibitions\/?$/.test(l.href) && !/now-on-view\/?$/.test(l.href) && !/past\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: `source: ${ctx}` });
    }
    log(`  ${ctx}: ${links.length} links found`);
  }

  await fetchIndividualPages(rows, venueCode);
  return rows;
}

async function scrapeAcq() {
  logSection('ACQ — Acquavella Galleries, New York');
  const rows = [];
  const venueCode = 'acq';
  const base = 'https://www.acquavellagalleries.com';

  log('  Fetching: https://www.acquavellagalleries.com/exhibitions');
  const r = await safeFetch('https://www.acquavellagalleries.com/exhibitions');
  if (!r.ok) { log(`  FAILED — ${r.reason}`); return rows; }

  const links = parseLinks(r.html, '/exhibitions/', base)
    .filter(l => !/\/exhibitions\/?$/.test(l.href) && l.text.length >= 3);
  for (const { href, text } of links) {
    rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: '' });
  }
  log(`  found ${links.length} links`);

  await fetchIndividualPages(rows, venueCode);
  return rows;
}

async function scrapeBorghese() {
  logSection('BORGHESE — Galleria Borghese, Rome');
  const rows = [];
  const venueCode = 'borghese';
  const base = 'https://galleriaborghese.cultura.gov.it';

  for (const { url, ctx } of [
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/presenti/', ctx: 'current' },
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/future/',   ctx: 'upcoming' },
    { url: 'https://galleriaborghese.cultura.gov.it/en/mostre/passate/',  ctx: 'past' },
  ]) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeFetch(url);
    if (!r.ok) {
      log(`  FAILED ${ctx} — ${r.reason}`);
      rows.push({ venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '', summary: '', url, notes: `BLOCKED: ${r.reason}` });
      continue;
    }

    const root = parseHtml(r.html);
    const bodyText = (root.querySelector('body')?.text || '').trim();
    if (bodyText.length < 200) {
      log(`  EMPTY_PAGE ${ctx}: page loaded but <200 chars of body text`);
      rows.push({ venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '', summary: '', url, notes: 'EMPTY_PAGE: returned no usable content' });
      continue;
    }

    const links = parseLinks(r.html, '/mostre/', base)
      .filter(l => !/\/(presenti|future|passate)\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: `source: ${ctx}` });
    }
    log(`  ${ctx}: ${links.length} links found`);
  }

  const real = rows.filter(r => !r.title.startsWith('['));
  if (real.length) await fetchIndividualPages(real, venueCode);
  return rows;
}

async function scrapeMorgan() {
  logSection('MORGAN — Morgan Library & Museum, New York');
  const rows = [];
  const venueCode = 'morgan';
  const base = 'https://www.themorgan.org';

  for (const { url, ctx } of [
    { url: 'https://www.themorgan.org/exhibitions/current',  ctx: 'current' },
    { url: 'https://www.themorgan.org/exhibitions/upcoming', ctx: 'upcoming' },
    { url: 'https://www.themorgan.org/exhibitions/past',     ctx: 'past' },
  ]) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeFetch(url);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }

    if (isJsShell(r.html)) {
      log(`  JS_SHELL ${ctx}: page loaded but no real content — shell-plus-database failure`);
      rows.push({ venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '', summary: '', url, notes: 'JS_SHELL: page rendered no exhibition content' });
      continue;
    }

    const links = parseLinks(r.html, '/exhibitions/', base)
      .filter(l => !/\/exhibitions\/(current|upcoming|past)\/?$/.test(l.href) && l.text.length >= 3);
    for (const { href, text } of links) {
      rows.push({ venue_code: venueCode, title: text, start_date: '', end_date: '', summary: '', url: href, notes: `source: ${ctx}` });
    }
    log(`  ${ctx}: ${links.length} links — Morgan was NOT a JS shell under Node fetch`);
  }

  const real = rows.filter(r => !r.title.startsWith('['));
  if (real.length) await fetchIndividualPages(real, venueCode);
  return rows;
}

// ── Dedup ─────────────────────────────────────────────────────────────────────
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
  log('Cat Watch Sweep Fetch Diagnostic — starting');
  log(`Proxy: ${proxyUrl || '(none)'}`);
  log(`Lookback floor: ${LOOKBACK.toISOString().slice(0,10)}`);
  log('Venues: met, ng, rijks, acq, borghese, morgan');

  const allRows = [];
  const summary = {};

  for (const { code, fn } of [
    { code: 'met',      fn: scrapeMet },
    { code: 'ng',       fn: scrapeNG },
    { code: 'rijks',    fn: scrapeRijks },
    { code: 'acq',      fn: scrapeAcq },
    { code: 'borghese', fn: scrapeBorghese },
    { code: 'morgan',   fn: scrapeMorgan },
  ]) {
    try {
      const rows = await fn();
      const real = rows.filter(r => !r.title.startsWith('['));
      const placeholders = rows.filter(r => r.title.startsWith('['));
      allRows.push(...rows);
      summary[code] = { real: real.length, withSummary: real.filter(r => r.summary).length, placeholders: placeholders.length };
      log(`  → ${code}: ${real.length} exhibitions, ${real.filter(r=>r.summary).length} with curatorial text`);
    } catch (e) {
      log(`  FATAL ERROR in ${code}: ${e.message}`);
      summary[code] = { error: e.message };
    }
  }

  const deduped = dedup(allRows);
  const csvLines = ['venue_code,title,start_date,end_date,summary,url,notes'];
  for (const r of deduped) csvLines.push(csvRow(r));
  fs.writeFileSync(CSV_PATH, csvLines.join('\n') + '\n', 'utf8');

  logSection('SWEEP FETCH DIAGNOSTIC COMPLETE — SUMMARY');
  for (const [code, s] of Object.entries(summary)) {
    if (s.error) {
      log(`  ${code.toUpperCase()}: FATAL ERROR — ${s.error}`);
    } else {
      const extra = s.placeholders > 0 ? ` | ${s.placeholders} page(s) blocked/empty/shell` : '';
      log(`  ${code.toUpperCase()}: ${s.real} exhibitions | ${s.withSummary} with text${extra}`);
    }
  }
  log('');
  log(`CSV written to:  ${CSV_PATH}`);
  log(`Log written to:  ${LOG_PATH}`);
  log(`Total rows (inc. placeholders): ${deduped.length}`);

  writeLog();
})();
