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

// Navigation timing. See safeGoto() for why 'networkidle' is not used.
const NAV_TIMEOUT = 20000;      // ceiling for the HTML itself to arrive
const CONTENT_TIMEOUT = 8000;   // extra grace for client-rendered body text
const MIN_BODY_CHARS = 200;     // below this a page is a shell, not content
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
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12 };

/**
 * One month pattern, shared by every date parser.
 *
 * It previously existed as two separate copies that listed only the FULL month
 * names, so Rijksmuseum's past listing — "12 SEP 2025 TO 25 JAN 2026" — parsed
 * to nothing at all. Long names come first in the alternation so "September"
 * is not matched as "Sep" followed by stray letters, and a trailing full stop
 * is allowed for venues that write "Sept.".
 */
const MONTH_PATTERN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?';

// Month name to number, tolerating the trailing full stop the pattern allows.
function monthNum(name) {
  return MONTHS[String(name || '').toLowerCase().replace(/\.$/, '')];
}

function parseMonthDay(str, fallbackYear) {
  // e.g. "March 2" or "July 26, 2026"
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const mo = monthNum(m[1]);
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

/**
 * Scan a blob of text for a date range appearing anywhere inside it.
 *
 * parseDateRange() is anchored (^...$) and only matches a string that is
 * nothing but a date. Listing pages rarely oblige — Acquavella renders
 * "NICOLE WITTENBERG ALL THE WAY NEW YORK OCTOBER 16 - DECEMBER 5, 2025",
 * where the date is buried after the title and the city. This searches
 * instead of matching, so those dates are recovered.
 */
// Range separators. findDateRange (listing pages) and findDateRangeInProse
// (page text) must agree on these — they had drifted, so the listing parser
// read "From June 10 to September 14, 2025" as a closing date only, silently
// losing the opening date.
// "t/m" is Dutch — "tot en met", up to and including. The Rijksmuseum writes
// its older runs that way: "11 Oct. 2019 t/m 19 Jan. 2020".
const RANGE_SEP = '\\s*(?:-|t/m|to|till|until|through)\\s*';

function findDateRange(raw) {
  if (!raw) return { start: '', end: '', raw: '' };
  const s = String(raw).replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // Day-first European form, as used by Borghese and the National Gallery:
  // "1 November 2025 to 11 January 2026", "19 June till 13 September 2026".
  let dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})\\s*(\\d{4})?${RANGE_SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm) {
    const endYr = parseInt(dm[6], 10);
    const startYr = dm[3] ? parseInt(dm[3], 10) : endYr;
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) return {
      start: `${startYr}-${String(sMo).padStart(2,'0')}-${String(dm[1]).padStart(2,'0')}`,
      end:   `${endYr}-${String(eMo).padStart(2,'0')}-${String(dm[4]).padStart(2,'0')}`,
      raw: s,
    };
  }

  // "Month D, YYYY - Month D, YYYY" — year on both sides
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return { start: parseMonthDay(titleCase(m[1]), null) || '', end: parseMonthDay(titleCase(m[2]), null) || '', raw: s };

  // "Month D - Month D, YYYY" — year only on the end side
  m = s.match(new RegExp(`(${M}\\s+\\d{1,2})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*(\\d{4}))`, 'i'));
  if (m) {
    const yr = parseInt(m[3], 10);
    return { start: parseMonthDay(titleCase(m[1]), yr) || '', end: parseMonthDay(titleCase(m[2]), null) || '', raw: s };
  }

  // Single "Month D, YYYY" — treat as the end date (open until)
  m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return { start: '', end: parseMonthDay(titleCase(m[1]), null) || '', raw: s };

  // A single day-first date carrying a preposition, as Rijksmuseum's cards do:
  //   "WORN till 21 March 2027"          -> a closing date
  //   "WILLEM DE KOONING from 9 October 2026" -> an opening date
  // Placed after the range patterns so "from 25 October 2022 to 29 January
  // 2023" is still read as a range rather than just its opening date.
  m = s.match(new RegExp(`\\b(till|until|through|to)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: '', end: `${m[4]}-${String(mo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`, raw: s };
  }

  m = s.match(new RegExp(`\\b(from|opens?|opening)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: `${m[4]}-${String(mo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`, end: '', raw: s };
  }

  // "Month YYYY" or "Month / YYYY" with no day — a start month, end unknown.
  // Borghese's archive prints "March / 2026" and nothing else.
  m = s.match(new RegExp(`(${M})\\s*\\/?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[2])) {
    const mo = monthNum(m[1]);
    if (mo) return { start: `${m[2]}-${String(mo).padStart(2,'0')}-01`, end: '', raw: s };
  }

  return { start: '', end: '', raw: s };
}

/**
 * Find an exhibition's run inside ordinary prose.
 *
 * Some venues never print dates in a field of their own. Borghese writes them
 * into the opening sentence: "From June 10 to September 14, 2025, Galleria
 * Borghese presents...", "On March 17, and running until May 10, 2026...".
 *
 * This is pattern-matching, not comprehension — but a date has a shape, and
 * that is enough. The danger is grabbing the WRONG date: these pages are full
 * of art-historical years ("Caravaggio (1571-1610)", "stayed in Italy in
 * 1629"). Two guards prevent that:
 *
 *   1. A month NAME must sit next to the number. Bare years never match.
 *   2. The year must be a plausible exhibition year, not a birth or a
 *      painting date.
 *
 * hintYear supplies the year when the sentence omits it entirely — Borghese's
 * Velazquez page says only "From March 26 to June 23", and the listing page
 * for that show says "March / 2024".
 *
 * Returns the matched sentence too, so a wrong grab is visible in the notes
 * rather than silently becoming an exhibition's dates.
 */
// Wide enough to cover any exhibition a venue still lists in its archive
// (Borghese's goes back to 2013, Acquavella's to 1999), narrow enough that an
// artist's lifespan or a painting's date can never be mistaken for a run:
// "Caravaggio (1571-1610)", "confiscated on 4 May 1607", "in 1629".
const PLAUSIBLE_YEAR_MIN = 1990;
const PLAUSIBLE_YEAR_MAX = 2035;

function plausibleYear(y) {
  const n = parseInt(y, 10);
  return n >= PLAUSIBLE_YEAR_MIN && n <= PLAUSIBLE_YEAR_MAX;
}

/**
 * Refuse a range that runs backwards.
 *
 * Without this, "From 8 October 2014 to 11 January 2015" produced a start of
 * 2015-10-08 — after its own end — because the start year had been rejected
 * and quietly replaced with the end year. Better to report the end date alone
 * than an impossible range: the lookback only tests the end date anyway.
 */
function sane(start, end, raw) {
  if (start && end && start > end) return { start: '', end, raw };
  return { start, end, raw };
}

function findDateRangeInProse(text, hintYear) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  const M = MONTH_PATTERN;
  const SEP = '(?:\\s*(?:-|t/m|to|until|through|till)\\s*(?:running\\s+)?)';

  // Day-first, the form Borghese actually uses in its prose:
  //   "From 20 January to 22 February 2026, the Galleria Borghese..."
  //   "from 25 October 2022 to 29 January 2023, curated by..."
  //   "will open to the public on 1 November 2017 and will last until 20 February 2018"
  // The year may sit on the end side only, or on both.
  let dm = s.match(new RegExp(
    `(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const startYr = dm[3] && plausibleYear(dm[3]) ? parseInt(dm[3], 10) : endYr;
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) return sane(
      `${startYr}-${String(sMo).padStart(2,'0')}-${String(dm[1]).padStart(2,'0')}`,
      `${endYr}-${String(eMo).padStart(2,'0')}-${String(dm[4]).padStart(2,'0')}`,
      dm[0].slice(0, 120));
  }

  // "From June 10 to September 14, 2025"  /  "March 17 ... until May 10, 2026"
  let m = s.match(new RegExp(
    `(${M})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?[^.]{0,40}?${SEP}(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[6])) {
    const endYr = parseInt(m[6], 10);
    const startYr = m[3] && plausibleYear(m[3]) ? parseInt(m[3], 10) : endYr;
    const sMo = monthNum(m[1]), eMo = monthNum(m[4]);
    if (sMo && eMo) return sane(
      `${startYr}-${String(sMo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`,
      `${endYr}-${String(eMo).padStart(2,'0')}-${String(m[5]).padStart(2,'0')}`,
      m[0].slice(0, 120));
  }

  // Day-first with NO year anywhere: "5 June to 25 October".
  // Rijksmuseum writes its current shows this way. Only usable when the
  // listing page already told us which year this exhibition belongs to.
  if (hintYear && plausibleYear(hintYear)) {
    dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (dm) {
      const sMo = monthNum(dm[2]), eMo = monthNum(dm[4]);
      if (sMo && eMo) {
        // A run that crosses new year ends in the following year.
        const endYr = eMo < sMo ? Number(hintYear) + 1 : Number(hintYear);
        return sane(
          `${hintYear}-${String(sMo).padStart(2,'0')}-${String(dm[1]).padStart(2,'0')}`,
          `${endYr}-${String(eMo).padStart(2,'0')}-${String(dm[3]).padStart(2,'0')}`,
          dm[0].slice(0, 120) + ' (year taken from the listing page)');
      }
    }

    // A lone closing date with no year: "Till 29 November".
    let one = s.match(new RegExp(`\\b(till|until|through)\\s+(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return { start: '',
        end: `${hintYear}-${String(mo).padStart(2,'0')}-${String(one[2]).padStart(2,'0')}`,
        raw: one[0].slice(0, 120) + ' (year taken from the listing page)' };
    }

    // A lone opening date with no year: "From 5 June".
    one = s.match(new RegExp(`\\b(from|opens?|opening)\\s+(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return {
        start: `${hintYear}-${String(mo).padStart(2,'0')}-${String(one[2]).padStart(2,'0')}`,
        end: '', raw: one[0].slice(0, 120) + ' (year taken from the listing page)' };
    }
  }

  // Same shape but no year anywhere: "From March 26 to June 23".
  // Only usable when the listing page told us which year this show belongs to.
  if (hintYear && plausibleYear(hintYear)) {
    m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})[^.]{0,40}?${SEP}(${M})\\s+(\\d{1,2})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (m) {
      const sMo = monthNum(m[1]), eMo = monthNum(m[3]);
      if (sMo && eMo) {
        // A run that crosses new year ends in the following year.
        const endYr = eMo < sMo ? Number(hintYear) + 1 : Number(hintYear);
        return {
          start: `${hintYear}-${String(sMo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`,
          end:   `${endYr}-${String(eMo).padStart(2,'0')}-${String(m[4]).padStart(2,'0')}`,
          raw: m[0].slice(0, 120) + ' (year taken from listing page)',
        };
      }
    }
  }

  // Last resort: hand it to the listing-page parser. The two have repeatedly
  // drifted apart — one learned a format the other did not, and a venue whose
  // dates lived on the detail page silently lost them. Falling through means
  // any pattern either parser knows is available to both.
  const viaListing = findDateRange(s);
  if (viaListing.start || viaListing.end) return viaListing;

  return { start: '', end: '', raw: '' };
}

function titleCase(str) {
  return str.replace(/([A-Za-z]+)/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function afterLookback(endDateStr) {
  // If no end date, include (we don't know when it ended)
  if (!endDateStr) return true;
  const d = new Date(endDateStr + 'T00:00:00');
  if (isNaN(d)) return true;
  return d >= LOOKBACK;
}

/**
 * Drop exhibitions that had already closed before the lookback floor.
 *
 * The rule: keep an exhibition if it was open at any point on or after
 * 1 July 2024. An exhibition that opened in March 2024 and closed in
 * September 2024 is KEPT — it was still running inside the window. Only a
 * confirmed end date earlier than the floor excludes it, so the test is on
 * end_date, never start_date.
 *
 * Rows whose end date could not be parsed are kept and flagged, because an
 * unknown date is not evidence of being too old. Every venue passes through
 * here, both before individual pages are fetched and again at the end.
 */
function applyLookback(rows, venueCode, stage) {
  const kept = [];
  let dropped = 0, undated = 0, noStart = 0;
  for (const row of rows) {
    if (row.title && row.title.startsWith('[')) { kept.push(row); continue; }  // diagnostic placeholder
    if (!row.end_date) {
      undated++;
      // Only on the final pass. On the listing pass the detail pages have not
      // been read yet, and stamping it early left rows carrying both "No
      // closing date found anywhere" and "Dates read from a sentence" — which
      // contradict each other on the approval card.
      if (stage === 'final') {
        row.notes = addNote(row.notes, 'No closing date found anywhere on the venue\'s pages.');
      }
    } else if (!row.start_date && stage === 'final') {
      // A closing date but no opening one. Common: venues print only
      // "until 20 December" while a show is running, and fill the opening date
      // in later, once it moves to their past listing.
      noStart++;
      row.notes = addNote(row.notes, 'No opening date published while this exhibition is running.');
    }
    if (afterLookback(row.end_date)) kept.push(row);
    else dropped++;
  }
  if (dropped || undated || noStart) {
    log(`  lookback (${stage}): kept ${kept.length}, dropped ${dropped} closed before ${LOOKBACK.toISOString().slice(0,10)}, ${undated} with no closing date, ${noStart} with no opening date`);
  }
  return kept;
}

// ── Page helpers ──────────────────────────────────────────────────────────────

/**
 * Fulfilling or aborting a route throws if the frame that asked for it has
 * already gone away — which happens constantly now that we stop waiting for
 * the network to fall silent and navigate on while subresources are still in
 * flight. An unhandled rejection here poisons the page for the NEXT
 * navigation, which surfaced as a cascade of
 * "interrupted by another navigation" errors across every venue.
 */
async function safeRouteCall(fn) {
  try { await fn(); } catch { /* frame gone — nothing to answer */ }
}

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
      return safeRouteCall(() => route.abort());
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
      await safeRouteCall(() => route.fulfill({ status: response.status, headers: out, body }));
    } catch (e) {
      stats.failed++;
      await safeRouteCall(() => route.abort());
    }
  });

  return stats;
}

/**
 * Read an exhibition's run dates from a listing page.
 *
 * Listings put the dates either inside the link itself (Acquavella) or in the
 * card wrapping it (the National Gallery: "7 November 2025 - 10 May 2026").
 * We look at the link, then its immediate parent, and stop there — going
 * further up starts picking up the NEXT card's dates and mislabels rows.
 *
 * Getting dates here rather than on the detail page is what lets the lookback
 * filter cut the list BEFORE we spend a page load on each entry.
 */
async function datesNearLink(link) {
  let linkText = '';
  try { linkText = await getText(link); } catch {}
  let d = findDateRange(linkText);
  if (d.start || d.end) return d;

  // Walk up a strictly limited distance. The dates often live in the same
  // card container as the title (Rijksmuseum: "WORN till 21 March 2027"), but
  // going further picks up the NEXT card's dates and mislabels the row.
  let node = link;
  for (let i = 0; i < 2; i++) {
    try {
      const parent = await node.$('xpath=..');
      if (!parent) break;
      node = parent;
      const text = squash(await getText(node));
      if (!text || text.length > CARD_MAX_CHARS) continue;
      d = findDateRange(text);
      if (d.start || d.end) return d;
    } catch { break; }
  }
  return { start: '', end: '', raw: linkText };
}

async function safeGoto(page, url, venue, context, attempt = 0) {
  try {
    // Deliberately NOT 'networkidle'. That waits for the page to make no
    // requests for 500ms, and these sites never fall silent — analytics,
    // chat widgets and lazy media keep chattering indefinitely, so the wait
    // expired at 30s on pages whose text had been readable for seconds.
    // Instead: wait for the HTML, then for the body to actually contain
    // content, and ignore whatever background noise continues after that.
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    const status = resp ? resp.status() : null;
    if (status && (status === 403 || status === 418 || status === 429)) {
      log(`  BLOCKED (HTTP ${status}): ${url}`);
      return { ok: false, reason: `BLOCKED_HTTP_${status}` };
    }

    // Client-rendered pages arrive with an empty body and fill in a moment
    // later. Give them that moment, but never treat it as fatal: a genuinely
    // short page is still worth reading.
    await page.waitForFunction(
      (min) => document.body && document.body.innerText.trim().length > min,
      MIN_BODY_CHARS,
      { timeout: CONTENT_TIMEOUT }
    ).catch(() => {});

    return { ok: true, status };
  } catch (e) {
    // A navigation left over from the previous page can land on top of this
    // one. It is transient: settle, then try this URL once more.
    if (attempt === 0 && /interrupted by another navigation|ERR_ABORTED/.test(e.message)) {
      await page.waitForTimeout(1500);
      return safeGoto(page, url, venue, context, 1);
    }
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
/**
 * Read the museum's own description of the exhibition.
 *
 * Two things have to be got right, and the first one bit us badly.
 *
 * 1. Cookie banners. Borghese runs the Complianz plugin, whose blocks are
 *    named "cmplz-description" — so a search for a class containing
 *    "description" found the consent notice ("The technical storage or access
 *    is strictly necessary for the legitimate purpose...") and stored that as
 *    the curatorial text on most of its exhibitions. Anything sitting inside a
 *    consent/cookie/privacy container is now skipped outright, and the known
 *    boilerplate sentences are rejected by content as a second net, because
 *    the next site will name its banner something else.
 *
 * 2. Order. Specific exhibition containers are tried first, then the page's
 *    main content, and only then anything resembling a description. The
 *    generic patterns are last precisely because they are the ones that match
 *    furniture.
 *
 * Runs entirely inside the page in one call rather than fetching elements one
 * at a time — faster, and it can inspect ancestors while it goes.
 */
const NOISE_CONTAINER = 'cmplz|cookie|consent|gdpr|privacy|onetrust|cky-|truste|usercentrics|didomi|banner|newsletter|subscribe|footer|nav';

const BOILERPLATE = [
  'technical storage or access',
  'legitimate purpose of storing preferences',
  'subscriber or user',
  'consent to the use of cookies',
  'we use cookies',
  'this website uses cookies',
  'accept all cookies',
  'privacy policy',
  'sign up to our newsletter',
];

const CURATORIAL_SELECTORS = [
  '.exhibition-detail__description',
  '.exhibition__description',
  '.exhibition-intro',
  '.intro-text',
  'main article p',
  'article p',
  'main p',
  '.content p',
  '[class*="description"] p',
  '[class*="intro"] p',
  '[class*="about"] p',
  'p',
];

async function getCuratorialText(page) {
  try {
    return await page.evaluate(({ noiseRe, boilerplate, selectors }) => {
      const NOISE = new RegExp(noiseRe, 'i');

      // Walk up to, but never including, BODY and HTML.
      //
      // WordPress plus the Complianz plugin put a "cmplz-..." class on the
      // <body> element itself. Including body in this walk meant every
      // paragraph on every Borghese page counted as being inside a cookie
      // banner, and the summary column came back empty for all 41 rows.
      // A consent banner is a container within the page, never the page.
      const insideNoise = (el) => {
        for (let n = el; n && n.tagName !== 'BODY' && n.tagName !== 'HTML'; n = n.parentElement) {
          const cls = typeof n.className === 'string' ? n.className : '';
          if (NOISE.test(cls + ' ' + (n.id || ''))) return true;
        }
        return false;
      };

      const isBoilerplate = (t) => {
        const low = t.toLowerCase();
        return boilerplate.some(b => low.includes(b));
      };

      const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();

      for (const sel of selectors) {
        let els;
        try { els = Array.from(document.querySelectorAll(sel)); } catch { continue; }
        const out = [];
        for (const el of els) {
          if (out.length >= 4) break;
          if (insideNoise(el)) continue;
          const t = clean(el.innerText);
          if (t.length > 60 && !isBoilerplate(t)) out.push(t);
        }
        if (out.length) return out.join(' ').slice(0, 2000);
      }
      return '';
    }, { noiseRe: NOISE_CONTAINER, boilerplate: BOILERPLATE, selectors: CURATORIAL_SELECTORS });
  } catch {
    return '';
  }
}

// ── Venue scrapers ────────────────────────────────────────────────────────────

// THE MET ─────────────────────────────────────────────────────────────────────
// ── Structured data ──────────────────────────────────────────────────────────
/**
 * Prefer what the venue publishes as data over what we can guess from its HTML.
 *
 * Some sites embed a schema.org Event block for Google's benefit — title,
 * opening date, closing date and description as actual fields. Where that
 * exists it removes exactly the part that keeps breaking: every bug in this
 * scraper so far has been title-or-date extraction. Badges read as titles,
 * dates locked inside poster images, dates buried in prose.
 *
 * This is deliberately UNIVERSAL rather than switched on per venue:
 *   - a venue that adds structured data later is picked up with no code change
 *   - a venue that removes it falls back to reading the page, silently
 *   - it costs one failed lookup in HTML that is already loaded
 *
 * Measured 8 Sep 2026: of the venues wired so far only the National Gallery
 * publishes it, and only on exhibition detail pages, not listings. So this is
 * a bonus source, never a replacement — the listing still has to be walked to
 * discover which exhibitions exist.
 *
 * Treat it as helpful, not authoritative. It is published for search engines
 * and is sometimes left unmaintained, so rows that use it say so in the notes.
 */
async function readStructuredData(page) {
  try {
    return await page.evaluate(() => {
      const out = [];
      const blocks = Array.from(document.querySelectorAll('script'))
        .filter(el => /ld\+json/i.test(el.type || ''));
      const walk = (o) => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (!o || typeof o !== 'object') return;
        if (o.name && (o.startDate || o.endDate)) {
          out.push({
            name: String(o.name),
            start: o.startDate ? String(o.startDate) : '',
            end: o.endDate ? String(o.endDate) : '',
            description: o.description ? String(o.description) : '',
          });
        }
        Object.values(o).forEach(walk);
      };
      for (const b of blocks) {
        try { walk(JSON.parse(b.textContent)); } catch {}
      }
      return out;
    });
  } catch {
    return [];
  }
}

// schema.org dates are ISO ("2026-05-02T00:00:00"); keep just the day part,
// and only if it is a plausible exhibition year.
function isoDay(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m && plausibleYear(m[1]) ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

// ── Title extraction ──────────────────────────────────────────────────────────
/**
 * Where each venue keeps the exhibition's name.
 *
 * Established by reading the actual pages, not guessed. Two shapes exist:
 *
 *  - A heading element sits inside the link (National Gallery, Rijksmuseum).
 *    Read it directly. The old code took the first LINE of the link's text,
 *    which on the National Gallery is a badge — "Past exhibition", "Free" —
 *    so 32 exhibitions ended up sharing 3 "titles".
 *
 *  - No heading, but a predictable wrapper around the name (Acquavella,
 *    Borghese). Take the link's whole text and strip the wrapper.
 *
 * Never read a heading from the link's PARENT: on Borghese's archive the
 * parent returns the first card's heading for every card, so every row would
 * be named after the same exhibition.
 */
const TITLE_RULES = {
  ng:       { heading: true },
  // Rijksmuseum uses two different card layouts on different pages.
  // Its PAST page puts a heading inside the link ("METAMORPHOSES", "FAKE!").
  // Its now-on-view page wraps only the IMAGE in the link, with the title and
  // date sitting two levels up: "LAST CHANCE ED VAN DER ELSKEN. UP CLOSE till
  // 13 September 2026". So heading first, card as the fallback.
  rijks:    { heading: true,
              card: { depth: 2,
                      stripLeading:  /^(LAST CHANCE|OPENING SOON|SOON|NEW)\b\s*/i,
                      stripTrailing: /\s+(till|until|from)\s+.*$/i } },
  met:      { heading: true },
  morgan:   { heading: true },
  // "March / 2026 WANGECHI MUTU - BLACK SOIL POEMS DISCOVER THE EXHIBITION"
  // The heading here holds only the first sentence, so use the full text.
  borghese: { heading: false,
              stripLeading:  /^(Current exhibition|Past exhibition|Upcoming exhibition)?\s*([A-Za-z]+\s*\/\s*\d{4})?\s*/i,
              stripTrailing: /\s*DISCOVER THE EXHIBITION\s*$/i },
  // "NICOLE WITTENBERG ALL THE WAY NEW YORK OCTOBER 16 - DECEMBER 5, 2025"
  // Everything from the gallery location onwards is location plus dates.
  acq:      { heading: false,
              stripTrailing: /\s*\b(NEW YORK|PALM BEACH)\b.*$/i },
};

// Listing furniture that is never part of an exhibition's name.
const TITLE_NOISE = /\b(Past exhibition|Free entry|Free|EXHIBITION|DISPLAY|Book (now|tickets?)|Members? only)\b|£|€/gi;

const squash = t => String(t || '').replace(/\s+/g, ' ').trim();

async function extractTitle(link, venueCode) {
  const rule = TITLE_RULES[venueCode] || { heading: true };

  if (rule.heading) {
    try {
      const h = await link.$('h1,h2,h3,h4,h5');
      if (h) {
        const t = squash(await getText(h));
        if (t.length >= 3) return t;
      }
    } catch {}
  }

  let t = squash(await getText(link));
  if (rule.stripLeading)  t = t.replace(rule.stripLeading, '');
  if (rule.stripTrailing) t = t.replace(rule.stripTrailing, '');
  if (!rule.heading) return squash(t);

  // Strip the venue's own badges from the link text before judging whether it
  // is a usable title. Rijksmuseum puts "LAST CHANCE" INSIDE the image link,
  // so without this the badge is long enough to pass as a title and the real
  // name — which lives in the card above — is never reached.
  if (rule.card && rule.card.stripLeading) t = squash(t.replace(rule.card.stripLeading, ''));

  if (t.length >= 3) return squash(t.replace(TITLE_NOISE, ' '));

  // Nothing readable inside the link. Some venues wrap only the IMAGE in the
  // link and leave the title as a sibling, so the name lives in the card
  // container above it.
  //
  // This is the exact opposite of the Borghese lesson, and the guards are why
  // it is safe: on Borghese's archive, reading upwards returned the FIRST
  // card's heading for every card. So walk a strictly limited distance, and
  // reject anything too long to be one card — a container that has bled into
  // its neighbours is far longer than a single title plus a date.
  if (rule.card) {
    const t2 = await readCardText(link, rule.card);
    if (t2) return t2;
  }
  return '';
}

const CARD_MAX_CHARS = 220;

async function readCardText(link, card) {
  let node = link;
  for (let i = 0; i < (card.depth || 2); i++) {
    let parent;
    try { parent = await node.$('xpath=..'); } catch { return ''; }
    if (!parent) return '';
    node = parent;

    const raw = squash(await getText(node).catch(() => ''));
    if (!raw || raw.length > CARD_MAX_CHARS) continue;

    let t = raw;
    if (card.stripLeading)  t = t.replace(card.stripLeading, '');
    if (card.stripTrailing) t = t.replace(card.stripTrailing, '');
    t = squash(t.replace(TITLE_NOISE, ' '));
    if (t.length >= 3) return t;
  }
  return '';
}

/**
 * Last-resort hint at what an untitled row is, taken from its own address:
 * ".../exhibitions/ed-van-der-elsken" -> "Ed Van Der Elsken".
 *
 * Goes in the notes, never in the title column — it is the site's URL slug,
 * not the exhibition's name, and guessing a name into the title field would
 * let a made-up title reach the ledger.
 */
function slugToWords(url) {
  try {
    const seg = new URL(url).pathname.replace(/\/+$/, '').split('/').pop() || '';
    return seg.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()).trim();
  } catch { return ''; }
}

// ── URL identity ──────────────────────────────────────────────────────────────
/**
 * The ONLY de-duplication this scraper performs: never read the same page
 * twice. Two rows with the same address are the same exhibition, always,
 * with no interpretation involved — so collapsing them cannot be wrong.
 *
 * Anything cleverer (same title, similar dates) is a judgement and belongs in
 * the app, where she sees it. See the standing rule in CLAUDE.md Section 3.
 *
 * Comparing raw href attributes is not enough: the same Acquavella page is
 * linked both as "exhibitions/matisse2" and "/exhibitions/matisse2", and
 * trailing slashes vary. Compare the finished address instead.
 */
function normalizeUrl(u) {
  try {
    const x = new URL(String(u).trim());
    x.hash = '';
    const path = x.pathname.replace(/\/+$/, '');
    return (x.origin + (path || '/') + x.search).toLowerCase();
  } catch {
    return String(u || '').trim().replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Notes are written for her, not for a log file.
 *
 * Whatever lands in this column is shown verbatim on the approval card in the
 * app, and she reads these one card at a time — so keep them SHORT. State the
 * fact and stop. No advice ("worth a glance"), no instructions ("needs filling
 * in by hand"): she can see the empty field and decide for herself.
 *
 * The app already reports empty fields on its own ("No end date."). The
 * scraper's job here is only to say WHY.
 */
function sourceNote(ctx) {
  return `Found on the venue's "${ctx}" listing page.`;
}

function addNote(existing, note) {
  if (!existing) return note;
  // Notes are whole sentences now, so join them as sentences. Only fall back
  // to a semicolon for older fragments that do not end in punctuation.
  return /[.!?]$/.test(existing.trim())
    ? existing.trim() + ' ' + note
    : existing.trim() + '; ' + note;
}

// ── Counters ──────────────────────────────────────────────────────────────────
// Every link is accounted for by one of these buckets. Nothing disappears
// without a number attached to it.
const COUNTS = [];

/**
 * Read one listing page and turn its links into rows.
 *
 * Shared by every venue so the counting, the URL guard and the title rules
 * behave identically everywhere, rather than each scraper doing its own thing.
 */
async function collectFromListing(page, opts) {
  const { venueCode, ctx, selector, base, isNav, rows, seenUrls, urlToRow } = opts;
  const c = { venue: venueCode, page: ctx, seen: 0, nav: 0, dupUrl: 0, noTitle: 0, kept: 0 };

  const links = await page.$$(selector);
  c.seen = links.length;

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (!href) { c.nav++; continue; }

    const fullUrl = href.startsWith('http')
      ? href
      : base + (href.startsWith('/') ? href : '/' + href);

    if (isNav(href, fullUrl)) { c.nav++; continue; }

    const key = normalizeUrl(fullUrl);
    if (seenUrls.has(key)) {
      c.dupUrl++;
      const prev = urlToRow.get(key);
      // Not a loss — record where else it appeared, so the count explains itself.
      if (prev) prev.notes = addNote(prev.notes, `Also listed on the venue's "${ctx}" page.`);
      continue;
    }

    // A link with no readable title is still an exhibition we found. Record it
    // with a blank title and say so: the app shows it as "Couldn't be filed"
    // with the note attached, which is visible and fixable. Dropping it here
    // would lose an exhibition she never learns existed.
    let title = await extractTitle(link, venueCode);
    let titleNote = '';
    if (!title || title.length < 3) {
      c.noTitle++;
      const guess = slugToWords(fullUrl);
      titleNote = `No exhibition name could be read from this link${guess ? `. Web address suggests: "${guess}"` : ''}.`;
      title = '';
    }

    const dates = await datesNearLink(link);
    const row = {
      venue_code: venueCode, title,
      start_date: dates.start, end_date: dates.end,
      summary: '', url: fullUrl,
      notes: titleNote ? `${sourceNote(ctx)} ${titleNote}` : sourceNote(ctx),
    };
    seenUrls.add(key);
    urlToRow.set(key, row);
    rows.push(row);
    c.kept++;
  }

  COUNTS.push(c);
  log(`  ${ctx}: ${c.seen} links seen -> ${c.nav} navigation, ${c.dupUrl} already-seen URL -> ${c.kept} collected (${c.noTitle} of them with no readable title)`);
  return c;
}

async function scrapeMet(page) {
  logSection('MET — The Metropolitan Museum of Art');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'met';
  const base = 'https://www.metmuseum.org';

  const listingOpts = ctx => ({
    venueCode, ctx, base, rows, seenUrls, urlToRow,
    selector: 'a[href*="/exhibitions/"]',
    isNav: href => /^\/exhibitions\/?$/.test(href) || /^\/exhibitions\/past\/?$/.test(href),
  });

  log(`  Fetching current/upcoming: ${base}/exhibitions`);
  const r1 = await safeGoto(page, base + '/exhibitions', venueCode, 'current/upcoming');
  if (!r1.ok) {
    log(`  FAILED current/upcoming — ${r1.reason}`);
  } else {
    try { await collectFromListing(page, listingOpts('current/upcoming')); }
    catch (e) { log(`  ERROR extracting Met listing: ${e.message.slice(0,120)}`); }
  }

  log(`  Fetching past: ${base}/exhibitions/past`);
  const r2 = await safeGoto(page, base + '/exhibitions/past', venueCode, 'past');
  if (!r2.ok) {
    log(`  FAILED past listing — ${r2.reason}`);
  } else {
    // The Met's past page filters by year through a dropdown. Walk it back to
    // the lookback floor year; the URL guard means a show appearing under two
    // years is recorded once, with a note saying where else it was listed.
    for (const year of [CURRENT_YEAR, CURRENT_YEAR - 1, 2024]) {
      try {
        log(`  Selecting year ${year}...`);
        await page.selectOption('select', String(year));
        await page.waitForFunction(
          (min) => document.body && document.body.innerText.trim().length > min,
          MIN_BODY_CHARS, { timeout: CONTENT_TIMEOUT }
        ).catch(() => {});
        await collectFromListing(page, listingOpts(`past-${year}`));
        if (year === 2024) break;
      } catch (e) {
        log(`  ERROR selecting year ${year}: ${e.message.slice(0, 120)}`);
      }
    }
  }

  const inWindow = applyLookback(rows, venueCode, 'listing');
  await fetchIndividualPages(page, inWindow, venueCode);
  return inWindow;
}

async function scrapeNG(page) {
  logSection('NG — National Gallery, London');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'ng';
  const base = 'https://www.nationalgallery.org.uk';

  const urls = [
    { url: base + '/exhibitions',      ctx: 'current/upcoming' },
    { url: base + '/exhibitions/past', ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }
    try {
      await collectFromListing(page, {
        venueCode, ctx, base, rows, seenUrls, urlToRow,
        selector: 'a[href*="/exhibitions/"]',
        isNav: href => /\/exhibitions\/?$/.test(href) || /\/exhibitions\/past\/?$/.test(href),
      });
    } catch (e) {
      log(`  ERROR extracting NG listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  const inWindow = applyLookback(rows, venueCode, 'listing');
  await fetchIndividualPages(page, inWindow, venueCode);
  return inWindow;
}

async function scrapeRijks(page) {
  logSection('RIJKS — Rijksmuseum, Amsterdam');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'rijks';
  const base = 'https://www.rijksmuseum.nl';

  const urls = [
    { url: base + '/en/whats-on/exhibitions/now-on-view', ctx: 'current/upcoming' },
    { url: base + '/en/whats-on/exhibitions/past',        ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) { log(`  FAILED ${ctx} — ${r.reason}`); continue; }
    try {
      await collectFromListing(page, {
        venueCode, ctx, base, rows, seenUrls, urlToRow,
        // A handful of Rijksmuseum entries are linked to the DUTCH site even
        // from the English listing — "tentoonstellingen" rather than
        // "exhibitions". Stop Motion is one, and looking only for the English
        // path missed it entirely. Its own listing card still carries the
        // dates, so it is worth collecting; the page it opens is in Dutch.
        selector: 'a[href*="exhibitions/"], a[href*="tentoonstellingen/"]',
        isNav: href => /exhibitions\/?$/.test(href)
                    || /now-on-view\/?$/.test(href)
                    || /past\/?$/.test(href)
                    // the "Nederlands (Dutch)" language switcher
                    || /tentoonstellingen\/(afgelopen|nu-te-zien)?\/?$/.test(href),
      });
    } catch (e) {
      log(`  ERROR extracting Rijks listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  const inWindow = applyLookback(rows, venueCode, 'listing');
  await fetchIndividualPages(page, inWindow, venueCode);
  return inWindow;
}

async function scrapeAcq(page) {
  logSection('ACQ — Acquavella Galleries, New York');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'acq';
  const base = 'https://www.acquavellagalleries.com';
  const url = base + '/exhibitions';

  log(`  Fetching: ${url}`);
  const r = await safeGoto(page, url, venueCode, 'all');
  if (!r.ok) { log(`  FAILED — ${r.reason}`); return rows; }

  try {
    await collectFromListing(page, {
      venueCode, ctx: 'all (current/upcoming/past)', base, rows, seenUrls, urlToRow,
      selector: 'a[href*="/exhibitions/"]',
      // The archive's own year-range filters ("VIEW ALL", "2023-2021", "1999")
      // live under /exhibitions/past/. They are navigation, not exhibitions;
      // following them dragged in the whole back catalogue to 1999.
      isNav: href => /\/exhibitions\/?$/.test(href) || /\/exhibitions\/past\//.test(href),
    });
  } catch (e) {
    log(`  ERROR extracting Acq listing: ${e.message.slice(0,120)}`);
  }

  const inWindow = applyLookback(rows, venueCode, 'listing');
  await fetchIndividualPages(page, inWindow, venueCode);
  return inWindow;
}

async function scrapeBorghese(page) {
  logSection('BORGHESE — Galleria Borghese, Rome');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'borghese';
  const base = 'https://galleriaborghese.cultura.gov.it';

  // Its exhibitions do NOT live under /mostre/ — those three pages are the
  // listings themselves, and the only /mostre/ links on them are the site's
  // own navigation (ITA, Exhibitions, Current, Past, Upcoming). Individual
  // exhibitions live under /en/exhibition/. Looking for /mostre/ was why this
  // venue returned exactly one row per page: it was collecting the menu bar.
  const urls = [
    { url: base + '/en/mostre/presenti/', ctx: 'current' },
    { url: base + '/en/mostre/future/',   ctx: 'upcoming' },
    { url: base + '/en/mostre/passate/',  ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) {
      log(`  FAILED ${ctx} — ${r.reason}`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `The venue's "${ctx}" listing page did not load (${r.reason}). Marker row, not an exhibition.`,
      });
      continue;
    }

    const bodyText = await page.innerText('body').catch(() => '');
    if (bodyText.length < 200) {
      log(`  EMPTY_PAGE ${ctx}: page loaded but body has <200 chars`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `The venue's "${ctx}" listing page loaded but was empty. Marker row, not an exhibition.`,
      });
      continue;
    }

    try {
      await collectFromListing(page, {
        venueCode, ctx, base, rows, seenUrls, urlToRow,
        selector: 'a[href*="/exhibition/"]',
        isNav: href => /\/exhibition\/?$/.test(href),
      });
    } catch (e) {
      log(`  ERROR extracting Borghese listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  // Borghese listings carry only a start month ("March / 2026") and no end
  // date at all, so the lookback cannot be decided here — the detail pages
  // have to supply the end date first.
  await fetchIndividualPages(page, rows, venueCode);
  return rows;
}

async function scrapeMorgan(page) {
  logSection('MORGAN — Morgan Library & Museum, New York');
  const rows = [], seenUrls = new Set(), urlToRow = new Map();
  const venueCode = 'morgan';
  const base = 'https://www.themorgan.org';

  const urls = [
    { url: base + '/exhibitions/current',  ctx: 'current' },
    { url: base + '/exhibitions/upcoming', ctx: 'upcoming' },
    { url: base + '/exhibitions/past',     ctx: 'past' },
  ];

  for (const { url, ctx } of urls) {
    log(`  Fetching ${ctx}: ${url}`);
    const r = await safeGoto(page, url, venueCode, ctx);
    if (!r.ok) {
      log(`  FAILED ${ctx} — ${r.reason}`);
      rows.push({
        venue_code: venueCode, title: `[${ctx} page]`, start_date: '', end_date: '',
        summary: '', url, notes: `The venue's "${ctx}" listing page did not load (${r.reason}). Marker row, not an exhibition.`,
      });
      continue;
    }
    try {
      await collectFromListing(page, {
        venueCode, ctx, base, rows, seenUrls, urlToRow,
        selector: 'a[href*="/exhibitions/"]',
        isNav: href => /\/exhibitions\/(current|upcoming|past)\/?$/.test(href) || /\/exhibitions\/?$/.test(href),
      });
    } catch (e) {
      log(`  ERROR extracting Morgan listing (${ctx}): ${e.message.slice(0,120)}`);
    }
  }

  const inWindow = applyLookback(rows, venueCode, 'listing');
  await fetchIndividualPages(page, inWindow, venueCode);
  return inWindow;
}

async function fetchIndividualPages(page, rows, venueCode) {
  let fetched = 0, failed = 0, noText = 0;
  // Skip anything already known to have closed before the lookback floor —
  // no point spending a page load on an exhibition we will discard.
  const skip = new Set(rows.filter(r => r.end_date && !afterLookback(r.end_date)));
  if (skip.size) log(`  skipping ${skip.size} individual page(s): closed before lookback`);
  for (const row of rows) {
    if (skip.has(row)) continue;
    if (!row.url || row.url.startsWith('[')) continue;
    try {
      const r = await safeGoto(page, row.url, venueCode, 'individual');
      if (!r.ok) {
        row.notes = addNote(row.notes, `This exhibition's own page did not load (${r.reason}).`);
        failed++;
        continue;
      }
      const text = await getCuratorialText(page);
      if (text) {
        row.summary = text;
        fetched++;
      } else {
        row.notes = addNote(row.notes, 'No description could be found on this exhibition\'s own page.');
        noText++;
      }

      // Venues that print no date field at all (Borghese) write the run into
      // the opening sentence. Scan the page's text for it, using the year the
      // listing page gave us when the sentence omits one.
      // Structured data first, where the venue publishes any.
      if (!row.start_date || !row.end_date) {
        const events = await readStructuredData(page);
        if (events.length) {
          const ev = events[0];
          const sd = isoDay(ev.start), ed = isoDay(ev.end);
          const filled = [];
          if (!row.start_date && sd) { row.start_date = sd; filled.push('opening'); }
          if (!row.end_date && ed)   { row.end_date   = ed; filled.push('closing'); }
          if (filled.length) {
            row.notes = addNote(row.notes,
              `${filled.join(' and ')} date taken from the site's structured data, not its visible page.`);
          }
          if (!row.summary && ev.description && ev.description.length > 60) {
            row.summary = ev.description.slice(0, 2000);
          }
        }
      }

      if (!row.start_date || !row.end_date) {
        const bodyText = await page.innerText('body').catch(() => '');
        // Borrow the year from whichever date we already hold. Venues often
        // print a bare "5 June to 25 October" on the exhibition's own page
        // while the listing card carried the year.
        const hintYear = (row.start_date || row.end_date || '').slice(0, 4);
        const p = findDateRangeInProse(bodyText, hintYear);

        // Fill only what is missing. If the page disagrees with the listing,
        // the listing wins — nothing already collected is silently rewritten.
        const filled = [];
        if (!row.start_date && p.start) { row.start_date = p.start; filled.push('opening'); }
        if (!row.end_date   && p.end)   { row.end_date   = p.end;   filled.push('closing'); }
        if (filled.length) {
          row.notes = addNote(row.notes,
            `${filled.join(' and ')} date read from a sentence, not a date field: "${p.raw}".`);
        }
      }

      // Also try to grab dates from the individual page if we don't have them
      if (!row.start_date && !row.end_date) {
        try {
          const dateEl = await page.$('[class*="date"], [class*="Date"], time');
          if (dateEl) {
            const raw = await getText(dateEl);
            const dates = findDateRange(raw);
            if (dates.start) row.start_date = dates.start;
            if (dates.end) row.end_date = dates.end;
            if (raw && !dates.start && !dates.end) {
              row.notes = addNote(row.notes, `Date-like text could not be read: "${raw.slice(0,60)}".`);
            }
          }
        } catch {}
      }
    } catch (e) {
      row.notes = addNote(row.notes, `Something went wrong while reading this exhibition's own page: ${e.message.slice(0,80)}`);
      failed++;
    }
  }
  log(`  Individual pages: ${fetched} got text, ${noText} no curatorial text, ${failed} failed`);
}

// ── Deduplication ─────────────────────────────────────────────────────────────
/**
 * De-duplication is NOT this script's job, and must never be added back.
 *
 * The scraper records everything it finds. Deciding whether two rows are the
 * same exhibition happens in the app, at the Import Refresh stage, where she
 * sees each proposal and approves it. A scraper that silently drops rows it
 * judges to be duplicates is making that decision for her, unseen — and when
 * its judgement is wrong (as it was here: titles were extracted badly, so 32
 * real National Gallery exhibitions collapsed to 3 and 29 were destroyed)
 * the loss is invisible in the output.
 *
 * Duplicates in the CSV are cheap. Deleted exhibitions are not.
 *
 * This is kept as an identity function so the call site still reads clearly,
 * and so anyone reaching for "we should dedupe here" finds this note first.
 */
function passThrough(rows) {
  return rows;
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
      // Final lookback pass — applies to every venue without exception, after
      // individual pages have had a chance to fill in missing dates.
      const rows = applyLookback(await fn(page), code, 'final');
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
  const written = passThrough(allRows);
  const csvLines = ['venue_code,title,start_date,end_date,summary,url,notes'];
  for (const r of written) csvLines.push(csvRow(r));
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
  // ── Coverage report ─────────────────────────────────────────────────────────
  // Every link the scraper saw is accounted for by one of these columns.
  // If a venue's total looks wrong, this says which stage lost the rows.
  logSection('COVERAGE — every link accounted for');
  log('  venue      page                          seen   nav   dup  noTitle  collected');
  log('  ' + '-'.repeat(76));
  const pad = (v, n) => String(v).padEnd(n);
  const num = (v, n) => String(v).padStart(n);
  for (const c of COUNTS) {
    log('  ' + pad(c.venue, 10) + ' ' + pad(String(c.page).slice(0, 28), 28) +
        num(c.seen, 6) + num(c.nav, 6) + num(c.dupUrl, 6) + num(c.noTitle, 9) + num(c.kept, 11));
  }
  if (!COUNTS.length) log('  (no listing pages were read)');
  log('');
  log('  seen      = links matching the venue\'s selector on that page');
  log('  nav       = site navigation and filter links, not exhibitions');
  log('  dup       = an address already collected; noted on the existing row, never dropped silently');
  log('  noTitle   = no usable exhibition name could be read from the link');
  log('  collected = rows handed on to the lookback filter and detail-page fetch');

  log('');
  log(`Network bridge: ${netStats.fulfilled} requests served, ${netStats.skipped} skipped (image/media/font), ${netStats.failed} failed`);
  log('');
  log(`CSV written to:  ${CSV_PATH}`);
  log(`Log written to:  ${LOG_PATH}`);
  log(`Total rows written (no de-duplication — see passThrough): ${written.length}`);

  writeLog();
})();
