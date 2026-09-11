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
//
// A RUN IS A DIRECTORY, NOT A FILE. This is what removes a whole family of
// problems rather than managing them:
//
//   scraper/output/run_2026-09-10_183045/
//       ng.csv  rijks.csv  acq.csv     one file per venue
//       sweep.csv                      all of them, rebuilt after every run
//       log_<stamp>.txt                one per invocation
//
//   - A venue file is written ONLY once that venue finishes, so a file existing
//     means that venue completed. A run that dies mid-venue leaves no half
//     venue behind, and there is no ambiguity to resolve later.
//   - Re-running a venue OVERWRITES ITS OWN FILE, so the same exhibition can
//     never appear twice in one sweep. Duplicates within a single file are the
//     one case the app does not absorb — each becomes a second "Add" card — so
//     making them impossible matters more than detecting them.
//   - "Which venues still need doing" is just "which have no file here yet",
//     which is why --continue needs no stored state and no judgement.
//   - sweep.csv is rebuilt from whatever venue files exist, every time. It is
//     the cumulative record of one run date, and rebuilding is idempotent.
//
// The previous scheme wrote one flat file per run, which meant a partial run
// could silently replace a full one, and stapling runs back together was left
// to a person following prose rules. Both are now structurally impossible.
const OUT_DIR = path.join(__dirname, 'output');

// Every venue this script knows how to scrape, in log order.
const VENUE_ORDER = ['met', 'ng', 'rijks', 'acq', 'borghese', 'morgan'];

const ARGS = process.argv.slice(2).map(a => a.toLowerCase()).filter(Boolean);
const CONTINUE = ARGS.includes('--continue');
const WANTED = ARGS.filter(a => !a.startsWith('--'));

// How many venues run at once. ACROSS venues only — never several pages within
// one venue, which is the hammering case IR-15 rejects at any scale. Each venue
// still visits its own pages strictly one at a time, so no museum sees more
// than one request from us at a time no matter what this is set to.
//
// Default 4: a 21-venue serial run projects to ~20 minutes, and step 4 of the
// work order is a repeated re-run loop where that hurts. Raising it does not
// increase load on any single venue; it increases the number of DIFFERENT
// venues in flight, and the ceiling is this container's memory, since each
// worker holds its own browser context.
const JOBS_ARG = ARGS.find(a => a.startsWith('--jobs='));
const CONCURRENCY = Math.max(1, Math.min(8, parseInt(JOBS_ARG?.split('=')[1] ?? '4', 10) || 4));

// DEF-04, the hang bound. A BLOCKED venue costs about a second — the site
// refuses and we move on. A HANGING one costs NAV_TIMEOUT plus a retry on every
// page it has, so a venue with 40 pages could hold a run for 25 minutes on its
// own while returning nothing.
//
// A venue that exceeds this is abandoned, NOT written, and picked up by the
// next --continue. That is the same outcome as any other incomplete venue, and
// it relies on the same guarantee: a file on disk means that venue finished.
// Overridable with --budget-mins=N so the abandon path can actually be
// exercised. A guard nobody has ever seen fire is a guard nobody knows works:
// this one was proved with --budget-mins=0.05 against a live venue before it
// was trusted at ten minutes.
const BUDGET_ARG = ARGS.find(a => a.startsWith('--budget-mins='));
const VENUE_BUDGET_MS = Math.max(
  1000,
  Math.round((parseFloat(BUDGET_ARG?.split('=')[1] ?? '10') || 10) * 60 * 1000),
);

// Her clock, not the server's. Fixed to her zone rather than the machine's, so
// a run from this container and a run from her laptop stamp the same way and
// sort together — otherwise a 6pm Sydney run files itself as 08:00, on what can
// be the wrong date either side of midnight.
const RUN_TZ = 'Australia/Sydney';
function runStamp(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: RUN_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}${p.second}`;
}

function newestRunDir() {
  try {
    const dirs = fs.readdirSync(OUT_DIR)
      .filter(n => /^run_/.test(n) && fs.statSync(path.join(OUT_DIR, n)).isDirectory())
      .sort();
    return dirs.length ? path.join(OUT_DIR, dirs[dirs.length - 1]) : null;
  } catch { return null; }
}

// --continue resumes the newest run directory; anything else starts a new one.
const RUN_DIR = (CONTINUE && newestRunDir()) || path.join(OUT_DIR, `run_${runStamp()}`);
const CSV_PATH = path.join(RUN_DIR, 'sweep.csv');
const LOG_PATH = path.join(RUN_DIR, `log_${runStamp()}.txt`);

const venueCsvPath = code => path.join(RUN_DIR, `${code}.csv`);
const venueIsDone = code => fs.existsSync(venueCsvPath(code));

// Venues this invocation will actually scrape. Naming venues always wins; a
// bare --continue means "finish this run", which is exactly the venues with no
// file yet. No stored state, no staleness, nothing to get wrong.
function venuesForThisRun() {
  const asked = WANTED.length ? VENUE_ORDER.filter(c => WANTED.includes(c)) : VENUE_ORDER;
  return (CONTINUE && !WANTED.length) ? asked.filter(c => !venueIsDone(c)) : asked;
}

const LOOKBACK = new Date('2024-07-01');

// Navigation timing. See safeGoto() for why 'networkidle' is not used.
const NAV_TIMEOUT = 20000;      // ceiling for the HTML itself to arrive
const CONTENT_TIMEOUT = 8000;   // extra grace for client-rendered body text
const MIN_BODY_CHARS = 200;     // below this a page is a shell, not content
const CURRENT_YEAR = new Date().getFullYear();

// ── Logging ───────────────────────────────────────────────────────────────────
const logLines = [];
// Which venue the current async call chain belongs to. With venues running
// concurrently the log is interleaved, so a line that says only "3 collected"
// belongs to nobody. AsyncLocalStorage carries the venue code down through every
// await without threading it through ~40 call sites by hand, so log() can stamp
// it on automatically and each line stays attributable.
//
// She reads the session's summary rather than the log, so interleaving itself is
// fine (DEF-01) — the requirement is that the log stays machine-parseable, and a
// per-line venue tag is what delivers that.
const { AsyncLocalStorage } = require('node:async_hooks');
const VENUE_CONTEXT = new AsyncLocalStorage();

function log(msg) {
  const code = VENUE_CONTEXT.getStore();
  const tag = code ? `[${code}] ` : '';
  const line = `[${new Date().toISOString()}] ${tag}${msg}`;
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

const CSV_HEADER = 'venue_code,title,start_date,end_date,summary,url,notes';

// Called only after a venue has finished. Its existence is the record that the
// venue completed, so it must never be written part-way through one.
function writeVenueCsv(code, rows) {
  const lines = [CSV_HEADER, ...rows.map(csvRow)];
  fs.writeFileSync(venueCsvPath(code), lines.join('\n') + '\n', 'utf8');
}

/**
 * Rebuild the run's cumulative CSV from whatever venue files exist.
 *
 * Runs at the end of EVERY invocation, including a --continue, so sweep.csv is
 * always the complete record of this run date and nobody has to staple files
 * together afterwards. Rebuilding from scratch rather than appending is what
 * makes it idempotent: run it twice and the answer is the same.
 */
function rebuildSweepCsv() {
  const lines = [CSV_HEADER];
  const included = [];
  for (const code of VENUE_ORDER) {
    if (!venueIsDone(code)) continue;
    const body = fs.readFileSync(venueCsvPath(code), 'utf8')
      .split('\n')
      .slice(1)                    // drop that file's header
      .filter(l => l.trim() !== '');
    lines.push(...body);
    included.push(`${code}:${body.length}`);
  }
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8');
  return { rows: lines.length - 1, included };
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
// The trailing (?![A-Za-z]) is load-bearing, not tidiness. Without it the
// alternation backtracks into the abbreviation: "7 November 2025" can match as
// "7 Nov" with "ember 2025" left over, which silently defeats any lookahead
// that follows — a no-year test then passes on a date that plainly has one.
const MONTH_PATTERN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?(?![A-Za-z])';

// Month name to number, tolerating the trailing full stop the pattern allows.
function monthNum(name) {
  return MONTHS[String(name || '').toLowerCase().replace(/\.$/, '')];
}

/**
 * Build YYYY-MM-DD only when the calendar agrees the day exists.
 *
 * Returning '' rather than an impossible string is the whole point. JavaScript
 * rolls 2026-02-31 silently forward to 3 March, so an impossible date does not
 * announce itself — it becomes a plausible WRONG date further downstream, and
 * can then decide whether an exhibition passes the lookback. Her rule: where
 * the code has applicable logic it uses it, and where it does not the column
 * stays blank and the notes say why.
 */
function ymd(y, m, d) {
  const yy = parseInt(y, 10), mm = parseInt(m, 10), dd = parseInt(d, 10);
  if (!plausibleYear(yy)) return '';
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return '';
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return '';
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Which year does the opening date belong to, when the venue printed the year
 * only once, on the closing side?
 *
 * "December 5 - January 20, 2026" opened in December 2025. A range that runs
 * backwards inside a single year is a run that crosses new year, and there is
 * exactly ONE reading of it — so this is logic, not a guess, and the row keeps
 * its dates instead of being blanked.
 *
 * Before this, the start simply inherited the end's year, producing
 * 2026-12-05 → 2026-01-20: an exhibition ending seven weeks before it opened.
 * Museums run winter shows constantly, so this was not an edge case.
 */
function startYearFor(startMo, startDay, endMo, endDay, endYear) {
  const backwards = startMo > endMo || (startMo === endMo && startDay > endDay);
  return backwards ? endYear - 1 : endYear;
}

function parseMonthDay(str, fallbackYear) {
  // e.g. "March 2", "July 26, 2026", "Sept. 21, 2024".
  // The trailing full stop is allowed because MONTH_PATTERN allows it: without
  // it here, "Sept. 21, 2024 - Oct. 12, 2024" matched the range pattern and
  // then produced no dates at all, silently.
  const m = str.trim().match(/^([A-Za-z]+\.?)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const mo = monthNum(m[1]);
  if (!mo) return null;
  const yr = m[3] ? parseInt(m[3], 10) : fallbackYear;
  if (!yr) return null;
  return ymd(yr, mo, m[2]) || null;
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

/**
 * @param raw    the text to search
 * @param opts   { looseSingles }. A LISTING CARD is a short string about one
 *   exhibition, so a bare "March / 2026" in it is almost certainly that show's
 *   date. A whole PAGE is not: it carries navigation, photo captions, a footer
 *   and the museum's opening hours, and the loosest patterns then become a
 *   lottery. Pass looseSingles:false when scanning page text.
 *
 *   This is not hypothetical. The Rijksmuseum's "Express yourself" page prints
 *   its real run as "16 Feb - 9 June" with no year anywhere, so no pattern
 *   could use it — and the scan fell through to the bare month-and-year rule,
 *   which matched a PHOTO CAPTION: "Gerard Wessel, RoXY, Amsterdam, April
 *   1994". A 2024 exhibition was given a 1994 opening date, which would have
 *   ranked it as thirty years closed.
 */
function findDateRange(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash a museum's typesetter might reach for. The National
  // Gallery uses U+2012 FIGURE DASH on some cards and U+2013 EN DASH on
  // others; with only the en dash normalised, "15 October 2026 - 7 February
  // 2027" fell through the range patterns and came out as 1 October 2026.
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-').replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // Day-first European form, as used by Borghese and the National Gallery:
  // "1 November 2025 to 11 January 2026", "19 June till 13 September 2026".
  let dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})\\s*(\\d{4})?${RANGE_SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      const startYr = dm[3] && plausibleYear(dm[3])
        ? parseInt(dm[3], 10)
        : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), s);
    }
  }

  // "Month D, YYYY - Month D, YYYY" — year on both sides
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return sane(parseMonthDay(titleCase(m[1]), null) || '', parseMonthDay(titleCase(m[2]), null) || '', s);

  // "Month D - Month D, YYYY" — year only on the end side.
  // The opening year is worked out, not assumed: "December 5 - January 20,
  // 2026" opened in December 2025. See startYearFor().
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(${M})\\s+(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[5])) {
    const endYr = parseInt(m[5], 10);
    const sMo = monthNum(m[1]), eMo = monthNum(m[3]);
    if (sMo && eMo) {
      const sDay = parseInt(m[2], 10), eDay = parseInt(m[4], 10);
      const startYr = startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), s);
    }
  }

  // "Month D - D, YYYY" — one month, day only on the closing side.
  // Acquavella's archive prints "December 9 - 31, 2023" and
  // "August 12 - 20, 2020". Without this the row came out undated, was kept by
  // the lookback (an unknown date is never evidence of being too old) and
  // arrived as a stray on the approval pile.
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[1]);
    if (mo) return sane(ymd(m[4], mo, m[2]), ymd(m[4], mo, m[3]), s);
  }

  // Single "Month D, YYYY" — treat as the end date (open until).
  // Bare, with no preposition to anchor it, so it is a listing-card rule only.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
    if (m) return { start: '', end: parseMonthDay(titleCase(m[1]), null) || '', raw: s };
  }

  // A single day-first date carrying a preposition, as Rijksmuseum's cards do:
  //   "WORN till 21 March 2027"          -> a closing date
  //   "WILLEM DE KOONING from 9 October 2026" -> an opening date
  // Placed after the range patterns so "from 25 October 2022 to 29 January
  // 2023" is still read as a range rather than just its opening date.
  m = s.match(new RegExp(`\\b(till|until|through|to)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: '', end: ymd(m[4], mo, m[2]), raw: s };
  }

  m = s.match(new RegExp(`\\b(from|opens?|opening)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: ymd(m[4], mo, m[2]), end: '', raw: s };
  }

  // "Month YYYY" or "Month / YYYY" with no day — a start month, end unknown.
  // Borghese's archive prints "March / 2026" and nothing else.
  //
  // The loosest rule in the file: one month name beside one year, anywhere.
  // Safe on a listing card, which is a short string about a single show.
  // Never applied to page text — see the header comment.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M})\\s*\\/?\\s*(\\d{4})`, 'i'));
    if (m && plausibleYear(m[2])) {
      const mo = monthNum(m[1]);
      // NO DATE IS WRITTEN. This used to return the 1st of that month, which
      // invented a day the venue never published — Acquavella's "SEPTEMBER
      // 2026" became an opening date of 2026-09-01. Her rule: where the code
      // has no applicable logic the column stays blank and the note says why.
      // The year is still kept as a lookback bound, which is a real fact.
      if (mo) return {
        start: '', end: '', latestYear: +m[2],
        shownText: m[0].trim(),
        shownWhy: 'no day is published, only the month and year',
        raw: s,
      };
    }
  }

  // A season and a year, no day at all: Acquavella's archive prints
  // "Summer 2022". That is not a date and never becomes one — nothing is
  // written to the date columns. But it IS a published bound: a show the
  // gallery itself labels "Summer 2022" cannot still have been open in
  // July 2024. See latestYear, below.
  if (looseSingles) {
    m = s.match(/\b(?:spring|summer|autumn|fall|winter)\s+(\d{4})\b/i);
    if (m && plausibleYear(m[1])) return {
      start: '', end: '', latestYear: +m[1],
      shownText: m[0].trim(),
      shownWhy: 'only a season and a year are published',
      raw: s,
    };
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

/**
 * A date the venue printed that nobody can use: a day and month with NO YEAR.
 *
 * The Rijksmuseum's past pages do this systematically — "Until 24 October",
 * "18 November - 6 March" — and there is nowhere to borrow a year from: the
 * listing card does not carry one and the site publishes no structured data.
 * So the date columns stay blank, which is right. But the note then said "No
 * closing date found anywhere on the venue's pages", which is simply FALSE:
 * she would open the page expecting nothing and find a date sitting there.
 *
 * Requiring the year to be ABSENT is what makes quoting this safe. A photo
 * caption reads "Amsterdam, April 1994" — month AND year — so it can never be
 * picked up here. That is the exact trap that once put a 1994 opening date on a
 * 2024 exhibition.
 */
function unusableDateText(text) {
  if (!text) return '';
  const s = String(text).replace(/[‐-―−⁃]/g, '-').replace(/\s+/g, ' ');
  const M = MONTH_PATTERN;
  // The leading \.? matters: an abbreviated month can match without its full
  // stop ("Sept" out of "Sept."), and the year test would then be looking at
  // ". 2024" and conclude there was no year.
  const NO_YEAR = '(?!\\.?\\s*,?\\s*\\d{4})';
  // A range is more use to her than one end of it, so look for those first.
  const patterns = [
    new RegExp(`\\d{1,2}\\s+${M}${RANGE_SEP}\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
    new RegExp(`${M}\\s+\\d{1,2}${RANGE_SEP}${M}\\s+\\d{1,2}${NO_YEAR}`, 'i'),
    new RegExp(`\\b(?:until|till|through|from)\\s+\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
    new RegExp(`\\b(?:until|till|through|from)\\s+${M}\\s+\\d{1,2}${NO_YEAR}`, 'i'),
    new RegExp(`\\d{1,2}\\s+${M}${NO_YEAR}`, 'i'),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[0].trim();
  }
  return '';
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
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      const startYr = dm[3] && plausibleYear(dm[3])
        ? parseInt(dm[3], 10)
        : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), dm[0].slice(0, 120));
    }
  }

  // "From June 10 to September 14, 2025"  /  "March 17 ... until May 10, 2026"
  let m = s.match(new RegExp(
    `(${M})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?[^.]{0,40}?${SEP}(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[6])) {
    const endYr = parseInt(m[6], 10);
    const sMo = monthNum(m[1]), eMo = monthNum(m[4]);
    if (sMo && eMo) {
      const sDay = parseInt(m[2], 10), eDay = parseInt(m[5], 10);
      const startYr = m[3] && plausibleYear(m[3])
        ? parseInt(m[3], 10)
        : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), m[0].slice(0, 120));
    }
  }

  // Day-first with NO year anywhere: "5 June to 25 October".
  // Rijksmuseum writes its current shows this way. Only usable when the
  // listing page already told us which year this exhibition belongs to.
  if (hintYear && plausibleYear(hintYear)) {
    dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (dm) {
      const sMo = monthNum(dm[2]), eMo = monthNum(dm[4]);
      if (sMo && eMo) {
        // A run that crosses new year ends in the following year. Same test as
        // startYearFor, read from the other end: the year we hold is the start's.
        const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[3], 10);
        const endYr = startYearFor(sMo, sDay, eMo, eDay, Number(hintYear)) === Number(hintYear)
          ? Number(hintYear)
          : Number(hintYear) + 1;
        return sane(
          ymd(hintYear, sMo, sDay),
          ymd(endYr, eMo, eDay),
          dm[0].slice(0, 120) + ' (year taken from the listing page)');
      }
    }

    // A lone closing date with no year: "Till 29 November".
    let one = s.match(new RegExp(`\\b(till|until|through)\\s+(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return { start: '',
        end: ymd(hintYear, mo, one[2]),
        raw: one[0].slice(0, 120) + ' (year taken from the listing page)' };
    }

    // A lone opening date with no year: "From 5 June".
    one = s.match(new RegExp(`\\b(from|opens?|opening)\\s+(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
    if (one) {
      const mo = monthNum(one[3]);
      if (mo) return {
        start: ymd(hintYear, mo, one[2]),
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
        const sDay = parseInt(m[2], 10), eDay = parseInt(m[4], 10);
        const endYr = startYearFor(sMo, sDay, eMo, eDay, Number(hintYear)) === Number(hintYear)
          ? Number(hintYear)
          : Number(hintYear) + 1;
        return sane(
          ymd(hintYear, sMo, sDay),
          ymd(endYr, eMo, eDay),
          m[0].slice(0, 120) + ' (year taken from listing page)');
      }
    }
  }

  // Last resort: hand it to the listing-page parser. The two have repeatedly
  // drifted apart — one learned a format the other did not, and a venue whose
  // dates lived on the detail page silently lost them. Falling through means
  // any pattern either parser knows is available to both.
  // Ranges and preposition-anchored dates only. The bare single-date rules are
  // listing-card rules and would match a photo caption or a footer here.
  const viaListing = findDateRange(s, { looseSingles: false });
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
    // No closing date, but the venue published a year and that whole year is
    // already behind the floor — "Summer 2022" on Acquavella's archive. This
    // is NOT the "unknown date" case the keep-and-flag rule protects: the date
    // is known, just imprecise, and no reading of it reaches 1 July 2024.
    if (!row.end_date && row.latest_year && row.latest_year < LOOKBACK.getUTCFullYear()) {
      dropped++;
      continue;
    }

    if (!row.end_date) {
      undated++;
      // Only on the final pass. On the listing pass the detail pages have not
      // been read yet, and stamping it early left rows carrying both "No
      // closing date found anywhere" and "Dates read from a sentence" — which
      // contradict each other on the approval card.
      if (stage === 'final') {
        // Say which of the two it is. "Nothing published" and "published, but
        // with no year" are different facts, and she acts on them differently.
        // "Shows only X" is a claim about the whole page, so it may only be made
        // when NEITHER date was read. With an opening date already in the row,
        // the honest statement is the narrower one about the closing date.
        row.notes = addNote(row.notes, (row._shownDateText && !row.start_date)
          ? `The venue's page shows only "${row._shownDateText}" for this exhibition's dates — ${row._shownDateWhy || 'no year is published anywhere'}.`
          : 'No closing date found anywhere on the venue\'s pages.');
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
async function datesNearLink(link, selector) {
  let linkText = '';
  try { linkText = await getText(link); } catch {}
  let d = findDateRange(linkText);
  if (d.start || d.end || d.latestYear) return d;

  // Walk up a strictly limited distance. The dates often live in the same
  // card container as the title (Rijksmuseum: "WORN till 21 March 2027"), but
  // going further picks up the NEXT card's dates and mislabels the row.
  //
  // A step count is not a boundary. The Rijksmuseum's past listing put
  // "DOCUMENT NEDERLAND … 1 NOVEMBER TO 11 JANUARY" one step up — correct, but
  // with no year, so unusable — and two steps up sat a box holding that card
  // AND the next one, "ISAMU NOGUCHI … 28 MAY TO 26 OCT 2025". Those dates had
  // a year, so they won, and Farifteh was filed under Noguchi's run.
  //
  // Worse, the row then looked complete, so its own page was never opened —
  // and that page states the real dates plainly. One bad grab cost the correct
  // answer twice over.
  //
  // So stop the moment a box covers more than ONE exhibition: that is no longer
  // this card's box, whatever its size or how few steps away it is. Losing a
  // date here is safe — the row is simply incomplete, which is precisely what
  // sends the scraper to the exhibition's own page.
  let node = link;
  for (let i = 0; i < 2; i++) {
    try {
      const parent = await node.$('xpath=..');
      if (!parent) break;
      node = parent;
      if (selector && await coversMoreThanOneExhibition(node, selector)) break;
      const text = squash(await getText(node));
      if (!text || text.length > CARD_MAX_CHARS) continue;
      d = findDateRange(text);
      if (d.start || d.end || d.latestYear) return d;
    } catch { break; }
  }
  return { start: '', end: '', raw: linkText };
}

// Distinct exhibition addresses inside this box. One means we are still within
// a single card; more means the box has bled into its neighbours.
async function coversMoreThanOneExhibition(node, selector) {
  try {
    return await node.evaluate((el, sel) => {
      const hrefs = new Set();
      for (const a of el.querySelectorAll(sel)) {
        const h = a.getAttribute('href');
        if (h) hrefs.add(h.replace(/[?#].*$/, '').replace(/\/+$/, ''));
      }
      return hrefs.size > 1;
    }, selector);
  } catch {
    return false;   // cannot tell — fall back to the length guard
  }
}

/**
 * The run is ending mid-venue — interrupted by hand, or the browser died.
 * Distinct from every page-level failure precisely so the venue loop can tell
 * "this page did not load" from "there is no browser any more".
 */
class ScrapeAborted extends Error {
  constructor(url) {
    super(`run aborted while loading ${url}`);
    this.name = 'ScrapeAborted';
    this.aborted = true;
  }
}

/**
 * Re-throw anything that means the run is over.
 *
 * Every `catch` in a scraper is written for the page in front of it — a bad
 * selector, a missing element, one dead link — and swallowing those is right.
 * But a dying browser raises the SAME kind of error from any Playwright call,
 * not only from navigation, so those same catches quietly turn "there is no
 * browser" into "this one page had a problem" and the venue marches on to
 * completion. That is exactly how a hand-stopped run wrote Acquavella to disk
 * as finished with 10 of 16 summaries missing.
 *
 * So: every catch that continues past a failure calls this first.
 */
function rethrowIfAborted(e) {
  if (e && (e.aborted || classifyLoadError(e.message) === 'SHUTDOWN')) {
    throw e.aborted ? e : new ScrapeAborted('(browser closed)');
  }
}

async function safeGoto(page, url, venue, context, attempt = 0) {
  // Ctrl-C already seen: stop before opening anything else, rather than
  // letting the rest of the venue fail one page at a time.
  if (STOPPING) throw new ScrapeAborted(url);

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

    // Any other error status is not this exhibition's page, so nothing on it
    // may be read. A 404 still SERVES a page, and its body is perfectly
    // readable text — the Rijksmuseum's own past listing links to three dead
    // pages, and their "This page does not exist." was stored as three
    // exhibitions' curatorial summaries.
    if (status && status >= 400) {
      log(`  HTTP ${status}: ${url}`);
      return { ok: false, reason: `HTTP_${status}` };
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
    const reason = classifyLoadError(e.message);

    // The browser is gone: the run is over, this is not this page's failure,
    // and there is nothing to retry. Throwing rather than returning is the
    // whole point — a returned {ok:false} looks like a page that would not
    // load, so the venue carries on, "finishes", and gets written to disk
    // missing everything the shutdown ate. Throwing aborts the venue, so no
    // file is written and --continue picks it up intact next time.
    if (reason === 'SHUTDOWN') throw new ScrapeAborted(url);

    // Retry a TRANSIENT network failure once. A page that times out or never
    // answers costs more than an empty summary: on 9 Sep an NG page failed to
    // load, so its row had no dates, so the lookback could not drop it, and a
    // 2019 exhibition arrived on the approval pile as a rogue undated card.
    // The same run lost Hockney's summary the same way.
    //
    // Only genuine network faults are retried. A venue that ANSWERED — 403,
    // 429, 404 — is never asked twice: it has told us its answer, and asking
    // again is exactly the hammering the standing rule forbids (Section 4).
    if (attempt === 0 && TRANSIENT_FAILURES.has(reason)) {
      log(`  ${reason} on ${url} — retrying once`);
      await page.waitForTimeout(2000);
      return safeGoto(page, url, venue, context, 1);
    }

    log(`  ${reason}: ${url} — ${e.message.slice(0, 120)}`);
    return { ok: false, reason };
  }
}

// Network faults worth one second attempt. Deliberately excludes every HTTP
// status: a refusal is an answer, not a failure to get one.
const TRANSIENT_FAILURES = new Set([
  'TIMEOUT', 'CONNECTION_TIMEOUT', 'CONNECTION_RESET', 'CONNECTION_CLOSED',
  'EMPTY_RESPONSE', 'NO_RESPONSE', 'LOAD_ERROR',
]);

/**
 * Say WHICH kind of failure, not just that there was one.
 *
 * Everything that was not a timeout used to come back as "LOAD_ERROR", which
 * told her nothing: a venue that had blocked us, one that had moved, and one
 * that was simply down all produced the same word. Borghese's outage is the
 * case in point — its three pages reported LOAD_ERROR and the note could not
 * say whether the site was refusing us or broken.
 *
 * These strings are Chromium's own network error names, so a new one appearing
 * is worth adding rather than guessing at.
 */
function classifyLoadError(message) {
  const m = String(message || '');
  // The run itself is ending — the browser, context or page is gone. This is
  // NOT a page failure and must never be recorded as one. Proven 10 Sep: a
  // sweep stopped by hand mid-venue produced nine "LOAD_ERROR"s inside 19ms,
  // each dutifully retried against a browser that no longer existed, and
  // Acquavella was then written to disk as a COMPLETE venue with 10 of its 16
  // summaries missing. That silently breaks the one guarantee the run
  // directory exists to give — a venue file on disk means that venue finished
  // — so --continue would have skipped it and the loss would have been
  // permanent and invisible. A browser crash does the same with nobody
  // touching anything.
  if (/Target (page, context or browser has been )?closed|Browser has been closed|browser has disconnected|Protocol error.*(closed|disconnected)|Execution context was destroyed|Target crashed/i.test(m)) {
    return 'SHUTDOWN';
  }
  if (/ERR_NAME_NOT_RESOLVED/.test(m))    return 'DNS_UNKNOWN';
  if (/ERR_CONNECTION_REFUSED/.test(m))   return 'CONNECTION_REFUSED';
  if (/ERR_CONNECTION_RESET/.test(m))     return 'CONNECTION_RESET';
  if (/ERR_CONNECTION_CLOSED/.test(m))    return 'CONNECTION_CLOSED';
  if (/ERR_CONNECTION_TIMED_OUT/.test(m)) return 'CONNECTION_TIMEOUT';
  if (/ERR_(CERT|SSL)/.test(m))           return 'SSL_ERROR';
  if (/ERR_EMPTY_RESPONSE/.test(m))       return 'EMPTY_RESPONSE';
  if (/ERR_ADDRESS_UNREACHABLE|ERR_INTERNET_DISCONNECTED/.test(m)) return 'UNREACHABLE';
  if (/ERR_TOO_MANY_REDIRECTS/.test(m))   return 'REDIRECT_LOOP';
  if (/ERR_ABORTED/.test(m))              return 'ABORTED';
  if (/ERR_FAILED/.test(m))               return 'NO_RESPONSE';
  if (/timeout/i.test(m))                 return 'TIMEOUT';
  return 'LOAD_ERROR';
}

// The same failure, in words she can act on. These go verbatim onto the
// approval card, so they state the fact and stop — no advice, no instructions.
const FAILURE_PROSE = {
  TIMEOUT:            'the page did not finish loading in time',
  CONNECTION_TIMEOUT: 'the venue’s server did not answer in time',
  DNS_UNKNOWN:        'the venue’s web address could not be found',
  CONNECTION_REFUSED: 'the venue’s server refused the connection',
  CONNECTION_RESET:   'the venue’s server dropped the connection part-way',
  CONNECTION_CLOSED:  'the venue’s server closed the connection',
  SSL_ERROR:          'the venue’s security certificate could not be verified',
  EMPTY_RESPONSE:     'the venue’s server answered with nothing at all',
  UNREACHABLE:        'the venue’s server could not be reached',
  REDIRECT_LOOP:      'the venue’s site redirected in a loop',
  ABORTED:            'the request was cut short',
  NO_RESPONSE:        'the venue’s site did not respond',
  LOAD_ERROR:         'the page could not be loaded, cause unknown',
};

function failureProse(reason) {
  const blocked = /^BLOCKED_HTTP_(\d+)$/.exec(reason);
  if (blocked) return `the venue’s site refused us (HTTP ${blocked[1]})`;
  const http = /^HTTP_(\d+)$/.exec(reason);
  if (http) return `the venue’s server answered HTTP ${http[1]}`;
  return FAILURE_PROSE[reason] || 'the page could not be loaded, cause unknown';
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
/**
 * Choose the structured-data event that belongs to THIS exhibition, or none.
 *
 * A page can carry several event-like blocks: the exhibition, a related talk,
 * a members' preview, a site-wide listing, stale metadata. Taking the first one
 * because it happens to be first is how another event's dates end up on this
 * exhibition — and a wrong date that says "taken from the site's structured
 * data" reads more authoritative than a blank one, so it is worse than nothing.
 *
 * Only a confident name match is accepted. If nothing matches, or more than one
 * does, structured data is skipped entirely and the ordinary prose fallback
 * takes over: this is a bonus source, never a replacement, so declining to use
 * it costs nothing.
 *
 * Comparison is on a flattened form, because casing and punctuation differ
 * routinely between a page's heading and its JSON-LD (Section 5: some venues
 * capitalise in CSS). The values written to the row are never changed.
 */
function pickStructuredEvent(events, rowTitle) {
  if (!Array.isArray(events) || !events.length) return null;
  const flat = s => String(s || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  const want = flat(rowTitle);
  if (!want) return null;                       // nothing to match against
  const exact = events.filter(e => flat(e.name) === want);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;            // ambiguous — decline
  // One side sometimes carries a subtitle the other omits ("Renoir and Love"
  // vs "Renoir and Love | Exhibition"). Accept containment only when exactly
  // one event qualifies, and only for titles long enough to be distinctive.
  if (want.length >= 12) {
    const near = events.filter(e => {
      const n = flat(e.name);
      return n && (n.includes(want) || want.includes(n)) && Math.min(n.length, want.length) >= 12;
    });
    if (near.length === 1) return near[0];
  }
  return null;
}

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
  // Through the same calendar validator as every other date. Structured data is
  // published for search engines and is sometimes left unmaintained, so it gets
  // no more trust than text scraped off the page.
  return m ? ymd(m[1], m[2], m[3]) : '';
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
// Title rules live in each venue's recipe (see VENUES, below). This reads
// them from there so extractTitle has one place to ask.
function titleRule(venueCode) {
  return (VENUES[venueCode] && VENUES[venueCode].title) || { heading: true };
}

// Listing furniture that is never part of an exhibition's name.
const TITLE_NOISE = /\b(Past exhibition|Free entry|Free|EXHIBITION|DISPLAY|Book (now|tickets?)|Members? only)\b|£|€/gi;

// A venue links the same exhibition several times on one card — the image, the
// name, and a button. The button's words are not a name: no exhibition is
// called "Find out more". Matched whole, so a real title merely CONTAINING one
// of these words is untouched.
const CTA_ONLY = /^(find out more|read more|learn more|see more|discover( more)?|more info(rmation)?|view( exhibition)?|explore|book( now| tickets?)?)$/i;

const squash = t => String(t || '').replace(/\s+/g, ' ').trim();

/**
 * Fill a kept row's blanks from another link to the SAME address.
 *
 * A venue commonly links one exhibition three times on a card: the image, the
 * name, and a button. The URL guard keeps the first of them — and on the
 * National Gallery the first is the image, which carries no text at all.
 * "Renoir and Love" arrived with no title and no dates while the very next
 * link on the same page spelled both out.
 *
 * This is NOT de-duplication and cannot lose anything: the links were already
 * one row, collapsed by the address rule, which is the only collapsing this
 * scraper does. All this adds is a better reading of that one page. Empty
 * fields only — anything already read wins, so nothing is silently rewritten.
 */
async function fillBlanksFromRepeatLink(row, link, venueCode, ctx, selector) {
  if (!row.title) {
    const t = await extractTitle(link, venueCode);
    if (t && t.length >= 3) {
      row.title = t;
      // Withdraw the "no name could be read" note — it is no longer true.
      if (row._titleNote) {
        row.notes = squash(String(row.notes || '').replace(row._titleNote, ''));
        row._titleNote = '';
      }
    }
  }

  if (!row.start_date || !row.end_date) {
    const d = await datesNearLink(link, selector);
    if (!row.start_date && d.start) row.start_date = d.start;
    if (!row.end_date && d.end) row.end_date = d.end;
    if (!row.latest_year && d.latestYear) row.latest_year = d.latestYear;
  }

  // Only worth saying when it appeared on a DIFFERENT listing page. Three
  // links inside one card are a page-building habit, not information.
  if (ctx !== row._ctx) row.notes = addNote(row.notes, `Also listed on the venue's "${ctx}" page.`);
}

async function extractTitle(link, venueCode) {
  const rule = titleRule(venueCode);

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
  if (CTA_ONLY.test(squash(t))) t = '';
  if (!rule.heading) return squash(t);

  // Strip the venue's own badges from the link text before judging whether it
  // is a usable title. Rijksmuseum puts "LAST CHANCE" INSIDE the image link,
  // so without this the badge is long enough to pass as a title and the real
  // name — which lives in the card above — is never reached.
  if (rule.card && rule.card.stripLeading) t = squash(t.replace(rule.card.stripLeading, ''));

  if (t.length >= 3 && !CTA_ONLY.test(squash(t))) return squash(t.replace(TITLE_NOISE, ' '));

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
    const p = x.pathname.replace(/\/+$/, '');
    // Lowercase the SCHEME AND HOST ONLY. Host names are case-insensitive by
    // spec; paths and query values are not. Folding the whole address meant two
    // exhibitions whose slugs differed only in capitalisation were treated as
    // one, and the second vanished — counted as a "duplicate" in the coverage
    // table, so it looked accounted for rather than lost.
    return `${x.protocol.toLowerCase()}//${x.host.toLowerCase()}${p || '/'}${x.search}`;
  } catch {
    return String(u || '').trim().replace(/\/+$/, '');
  }
}

/**
 * Turn a link's href into a full address, the way a browser would.
 *
 * Joining the venue's base URL onto the href by hand only covers the simplest
 * relative link. Real sites also use "../", protocol-relative "//host/path",
 * and query-only hrefs; joining those by hand produces an address that either
 * fails outright or — worse — resolves to something real but wrong.
 *
 * Resolution is against the LISTING PAGE rather than the site root, because
 * that is what a relative link is actually relative to.
 *
 * A link resolving off the venue's own host is refused: a museum page can link
 * anywhere, and an external link that happened to match the venue's selector
 * would pull another institution's exhibition into this venue's rows. Those are
 * counted separately rather than lumped in with navigation, so a venue that
 * legitimately uses a second host shows up in the coverage table on the first
 * run instead of quietly returning fewer exhibitions.
 */
function resolveHref(href, pageUrl, base) {
  let url;
  try { url = new URL(href, pageUrl || base); } catch { return { url: null, reason: 'unparseable' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { url: null, reason: 'not-web' };
  let baseHost;
  try { baseHost = new URL(base).host.toLowerCase(); } catch { return { url: null, reason: 'bad-base' }; }
  const bare = h => h.replace(/^www\./, '');
  if (bare(url.host.toLowerCase()) !== bare(baseHost)) return { url: null, reason: 'offsite' };
  url.hash = '';
  return { url: url.href, reason: '' };
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
  const c = { venue: venueCode, page: ctx, seen: 0, nav: 0, offsite: 0, dupUrl: 0, noTitle: 0, kept: 0 };

  const links = await page.$$(selector);
  c.seen = links.length;

  // Relative links resolve against the page they were found on, not the site
  // root. See resolveHref().
  const pageUrl = (typeof page.url === 'function' ? page.url() : '') || base;

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (!href) { c.nav++; continue; }

    const resolved = resolveHref(href, pageUrl, base);
    if (!resolved.url) {
      if (resolved.reason === 'offsite') {
        c.offsite++;
        log(`    off-site link ignored (${href})`);
      } else {
        c.nav++;
      }
      continue;
    }
    const fullUrl = resolved.url;

    if (isNav(href, fullUrl)) { c.nav++; continue; }

    const key = normalizeUrl(fullUrl);
    if (seenUrls.has(key)) {
      c.dupUrl++;
      const prev = urlToRow.get(key);
      if (prev) await fillBlanksFromRepeatLink(prev, link, venueCode, ctx, selector);
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

    const dates = await datesNearLink(link, selector);
    const row = {
      venue_code: venueCode, title,
      // Internal, never a CSV column: which listing page this row came from,
      // and the note to withdraw if a later link supplies the missing name.
      _ctx: ctx, _titleNote: titleNote,
      start_date: dates.start, end_date: dates.end,
      // Not a CSV column. An upper bound on the closing date for venues that
      // publish only a year ("Summer 2022"). See applyLookback.
      latest_year: dates.latestYear || 0,
      // Not CSV columns. Date text the venue DID print but that cannot become a
      // date, so the note can quote it instead of claiming nothing was found.
      _shownDateText: dates.shownText || '',
      _shownDateWhy: dates.shownWhy || '',
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

// ── Venue recipes ────────────────────────────────────────────────────────────
/**
 * One recipe per venue, each readable top to bottom.
 *
 * The split is not "shared versus not" — it follows what the logic is ABOUT:
 *
 *   Universal (the engine, above): fetching and waiting, the counters, the
 *   URL-identity guard, the lookback rule, structured-data-first, parsing a
 *   date string once you have it, writing the CSV. A fix here helps all 21.
 *
 *   Per venue (here): which pages to visit, which links are exhibitions
 *   rather than navigation, where the title sits, where the dates sit, what
 *   boilerplate to strip. There is no clever general rule for these, and
 *   every attempt at one has cost us — a rule learned at Borghese ("never
 *   read the title from above the link") was already wrong at Rijksmuseum.
 *
 * So a venue writes down only what differs from the default. If you are
 * debugging one museum, everything peculiar to it is in one block here.
 */
const VENUES = {
  met: {
    name: 'The Metropolitan Museum of Art',
    base: 'https://www.metmuseum.org',
    pages: [
      { path: '/exhibitions',      ctx: 'current/upcoming' },
      { path: '/exhibitions/past', ctx: 'past', yearDropdown: true },
    ],
    selector: 'a[href*="/exhibitions/"]',
    isNav: href => /^\/exhibitions\/?$/.test(href) || /^\/exhibitions\/past\/?$/.test(href),
    title: { heading: true },
  },

  ng: {
    name: 'National Gallery, London',
    base: 'https://www.nationalgallery.org.uk',
    pages: [
      { path: '/exhibitions',      ctx: 'current/upcoming' },
      { path: '/exhibitions/past', ctx: 'past' },
    ],
    selector: 'a[href*="/exhibitions/"]',
    // "Across the UK" is a tab on the listing, not an exhibition — it opens a
    // different part of the same page.
    isNav: href => /\/exhibitions\/?$/.test(href)
                || /\/exhibitions\/past\/?$/.test(href)
                || /\/exhibitions\/across-the-uk\/?$/.test(href),
    // Publishes schema.org Event data on detail pages — the only venue wired
    // so far that does. Picked up automatically; nothing needed here.
    title: { heading: true },
  },

  rijks: {
    name: 'Rijksmuseum, Amsterdam',
    base: 'https://www.rijksmuseum.nl',
    pages: [
      { path: '/en/whats-on/exhibitions/now-on-view', ctx: 'current/upcoming' },
      { path: '/en/whats-on/exhibitions/past',        ctx: 'past' },
    ],
    // Some entries are linked to the DUTCH site even from the English
    // listing — "tentoonstellingen" rather than "exhibitions". Stop Motion is
    // one, and looking only for the English path missed it entirely.
    selector: 'a[href*="exhibitions/"], a[href*="tentoonstellingen/"]',
    isNav: href => /exhibitions\/?$/.test(href)
                || /now-on-view\/?$/.test(href)
                || /past\/?$/.test(href)
                || /tentoonstellingen\/(afgelopen|nu-te-zien)?\/?$/.test(href),
    // Two card layouts. The PAST page puts a heading inside the link
    // ("METAMORPHOSES"). The now-on-view page wraps only the IMAGE, leaving
    // the title two levels up: "LAST CHANCE ED VAN DER ELSKEN. UP CLOSE till
    // 13 September 2026". Heading first, card as the fallback.
    title: {
      heading: true,
      card: { depth: 2,
              stripLeading:  /^(LAST CHANCE|OPENING SOON|SOON|NEW)\b\s*/i,
              stripTrailing: /\s+(till|until|from)\s+.*$/i },
    },
  },

  acq: {
    name: 'Acquavella Galleries, New York',
    base: 'https://www.acquavellagalleries.com',
    pages: [
      { path: '/exhibitions', ctx: 'all (current/upcoming/past)' },
    ],
    selector: 'a[href*="/exhibitions/"]',
    // The archive's own year-range filters ("VIEW ALL", "2023-2021", "1999")
    // live under /exhibitions/past/. They are navigation, not exhibitions;
    // following them dragged in the whole back catalogue to 1999.
    isNav: href => /\/exhibitions\/?$/.test(href) || /\/exhibitions\/past\//.test(href),
    // No headings. The card reads
    // "NICOLE WITTENBERG ALL THE WAY NEW YORK OCTOBER 16 - DECEMBER 5, 2025":
    // name, then gallery location, then dates.
    //
    // The location STAYS IN THE TITLE. Acquavella runs the same show in both
    // its galleries, and without the city the two runs read as one exhibition
    // on the approval cards. So strip only the date tail — matched as a month
    // or season followed by a digit, so a title like "April in Paris" is left
    // alone.
    title: {
      heading: false,
      stripTrailing: new RegExp(`\\s*\\b(?:${MONTH_PATTERN}|SPRING|SUMMER|AUTUMN|FALL|WINTER)\\b\\.?\\s*\\d.*$`, 'i'),
    },
    // Its two galleries. Used to cross-reference a show that ran in both.
    locations: ['New York', 'Palm Beach'],
  },

  borghese: {
    name: 'Galleria Borghese, Rome',
    base: 'https://galleriaborghese.cultura.gov.it',
    pages: [
      { path: '/en/mostre/presenti/', ctx: 'current' },
      { path: '/en/mostre/future/',   ctx: 'upcoming' },
      { path: '/en/mostre/passate/',  ctx: 'past' },
    ],
    // Its exhibitions do NOT live under /mostre/ — those three pages are the
    // listings, and their only /mostre/ links are the site's own menu (ITA,
    // Exhibitions, Current, Past, Upcoming). Looking for /mostre/ was why this
    // venue returned exactly one row per page: it collected the menu bar.
    selector: 'a[href*="/exhibition/"]',
    isNav: href => /\/exhibition\/?$/.test(href),
    // The heading holds only the first sentence, so use the full link text.
    title: { heading: false,
             stripLeading:  /^(Current exhibition|Past exhibition|Upcoming exhibition)?\s*([A-Za-z]+\s*\/\s*\d{4})?\s*/i,
             stripTrailing: /\s*DISCOVER THE EXHIBITION\s*$/i },
    // Listings carry only a start month ("March / 2026") and no closing date,
    // so the lookback cannot be decided before the detail pages are read.
    lookbackAfterDetail: true,
  },

  morgan: {
    name: 'Morgan Library & Museum, New York',
    base: 'https://www.themorgan.org',
    pages: [
      { path: '/exhibitions/current',  ctx: 'current' },
      { path: '/exhibitions/upcoming', ctx: 'upcoming' },
      { path: '/exhibitions/past',     ctx: 'past' },
    ],
    selector: 'a[href*="/exhibitions/"]',
    isNav: href => /\/exhibitions\/(current|upcoming|past)\/?$/.test(href) || /\/exhibitions\/?$/.test(href),
    title: { heading: true },
  },
};

/**
 * The engine. Every venue goes through this; none has its own copy.
 */
async function scrapeVenue(page, code) {
  const v = VENUES[code];
  if (!v) { log(`  no recipe for venue "${code}"`); return []; }

  logSection(`${code.toUpperCase()} — ${v.name}`);
  const rows = [], seenUrls = new Set(), urlToRow = new Map();

  for (const pg of v.pages) {
    const url = v.base + pg.path;
    log(`  Fetching ${pg.ctx}: ${url}`);
    const r = await safeGoto(page, url, code, pg.ctx);

    // A listing page that could not be read ALWAYS leaves a marker row, for
    // every venue. This was a per-venue opt-in until 10 Sep, set only on
    // borghese and morgan — so the Met, blocked on every page, contributed
    // nothing at all to the CSV and its refusal was invisible unless someone
    // read the log. A venue that was checked and refused must say so where she
    // looks, which is the approval pile.
    if (!r.ok) {
      log(`  FAILED ${pg.ctx} — ${r.reason}`);
      rows.push({
        venue_code: code, title: `[${pg.ctx} page]`, start_date: '', end_date: '',
        summary: '', url,
        notes: `The venue's "${pg.ctx}" listing page could not be read: ${failureProse(r.reason)}. Marker row, not an exhibition.`,
      });
      continue;
    }

    const bodyText = await page.innerText('body').catch(() => '');
    if (bodyText.length < MIN_BODY_CHARS) {
      log(`  EMPTY_PAGE ${pg.ctx}: loaded but body has <${MIN_BODY_CHARS} chars`);
      rows.push({
        venue_code: code, title: `[${pg.ctx} page]`, start_date: '', end_date: '',
        summary: '', url,
        notes: `The venue's "${pg.ctx}" listing page loaded but was empty. Marker row, not an exhibition.`,
      });
      continue;
    }

    const opts = {
      venueCode: code, ctx: pg.ctx, base: v.base, rows, seenUrls, urlToRow,
      selector: v.selector, isNav: v.isNav,
    };

    try {
      await collectFromListing(page, opts);

      // The Met's past page filters by year through a dropdown rather than
      // separate URLs. Walk it back to the lookback floor; the URL guard means
      // a show listed under two years is recorded once, with a note.
      if (pg.yearDropdown) {
        for (const year of [CURRENT_YEAR, CURRENT_YEAR - 1, 2024]) {
          try {
            log(`  Selecting year ${year}...`);
            await page.selectOption('select', String(year));
            await page.waitForFunction(
              (min) => document.body && document.body.innerText.trim().length > min,
              MIN_BODY_CHARS, { timeout: CONTENT_TIMEOUT }
            ).catch(() => {});
            await collectFromListing(page, { ...opts, ctx: `${pg.ctx}-${year}` });
            if (year === 2024) break;
          } catch (e) {
            rethrowIfAborted(e);
            log(`  ERROR selecting year ${year}: ${e.message.slice(0, 120)}`);
          }
        }
      }
    } catch (e) {
      rethrowIfAborted(e);
      log(`  ERROR extracting ${code} listing (${pg.ctx}): ${e.message.slice(0, 120)}`);
    }
  }

  // Cut before opening detail pages where the listing gave us enough to judge.
  const toFetch = v.lookbackAfterDetail ? rows : applyLookback(rows, code, 'listing');
  await fetchIndividualPages(page, toFetch, code);
  return toFetch;
}

async function fetchIndividualPages(page, rows, venueCode) {
  let fetched = 0, failed = 0, noText = 0;
  // Skip anything already known to have closed before the lookback floor —
  // no point spending a page load on an exhibition we will discard.
  const skip = new Set(rows.filter(r => r.end_date && !afterLookback(r.end_date)));
  if (skip.size) log(`  skipping ${skip.size} individual page(s): closed before lookback`);

  // Progress, because this is the LONGEST phase and it used to print nothing at
  // all. Borghese reads 41 pages here: two to four minutes of total silence,
  // which reads as a dead run rather than a working one — she watched it happen
  // and asked whether it had stopped. The house rule "long runs need progress"
  // was written for backgrounded commands; it applies just as much inside one.
  //
  // Every tenth page and the first, so a long venue reports without a 200-line
  // log. The count is of pages we will actually open, not of all rows.
  const due = rows.filter(r =>
    !skip.has(r) && r.url && !r.url.startsWith('[') && !(r.title || '').startsWith('['));
  if (due.length) log(`  reading ${due.length} individual page(s)…`);
  let seen = 0;

  for (const row of rows) {
    if (skip.has(row)) continue;
    // Marker rows record a listing page that failed or was empty. Their url is
    // that listing page, so without this they get fetched all over again and
    // the failure is logged twice.
    if (!row.url || row.url.startsWith('[')) continue;
    if (row.title && row.title.startsWith('[')) continue;
    seen++;
    if (seen === 1 || seen % 10 === 0) log(`    page ${seen} of ${due.length}`);
    try {
      const r = await safeGoto(page, row.url, venueCode, 'individual');
      if (!r.ok) {
        // Say which kind of failure: a dead link is the venue's own broken
        // page, not a network problem, and she can see that from the note.
        row.notes = addNote(row.notes, /^HTTP_4/.test(r.reason)
          ? `The venue's own link to this exhibition is broken (${r.reason.replace('HTTP_', 'HTTP ')}).`
          : `This exhibition's own page could not be read: ${failureProse(r.reason)}.`);
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
        const ev = pickStructuredEvent(events, row.title);
        if (ev) {
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

        // A sentence that CONTRADICTS what the listing already told us is not
        // about this exhibition, so none of it may be used — not even the half
        // that happens to fill a gap.
        //
        // NG's exhibition pages carry a list of related events. Waldmüller's
        // page advertises a course running "7 September - 28 September 2026",
        // while the listing card says the exhibition runs "Until 20 September
        // 2026". Filling only empty fields took the course's OPENING date and
        // silently ignored its conflicting closing date — the very evidence
        // that the sentence belonged to something else.
        const clashes =
          (row.start_date && p.start && p.start !== row.start_date) ||
          (row.end_date   && p.end   && p.end   !== row.end_date);
        if (clashes) {
          log(`    prose dates ignored, they contradict the listing: "${(p.raw || '').slice(0, 70)}"`);
          p.start = ''; p.end = '';
        }

        // Fill only what is missing. If the page disagrees with the listing,
        // the listing wins — nothing already collected is silently rewritten.
        const filled = [];
        if (!row.start_date && p.start) { row.start_date = p.start; filled.push('opening'); }
        if (!row.end_date   && p.end)   { row.end_date   = p.end;   filled.push('closing'); }
        if (filled.length) {
          row.notes = addNote(row.notes,
            `${filled.join(' and ')} date read from a sentence, not a date field: "${p.raw}".`);
        }

        // Still no closing date. Record what the page DOES print, if anything,
        // so the note can quote it rather than claim the page is blank.
        // Only when the page gave us NOTHING. If a date was read, quoting some
        // other fragment as what the page "shows only" contradicts the very
        // columns beside it — the Rosenquist row carried an opening date of
        // 2012-01-26 while its note claimed the page showed only "30 JUNE".
        if (!row.start_date && !row.end_date && !row._shownDateText) {
          const shown = unusableDateText(bodyText);
          if (shown) {
            row._shownDateText = shown;
            row._shownDateWhy = 'no year is published anywhere';
          }
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
      rethrowIfAborted(e);
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
/**
 * Cross-reference a show that ran in more than one of a venue's own galleries.
 *
 * Acquavella lists "Portraiture: From Cassatt to Warhol" in New York and
 * "Portraiture From Cassatt to Warhol" in Palm Beach — one exhibition, two
 * runs, and normally one catalogue between them.
 *
 * Both rows are always kept. This ONLY adds a note, so the pair is
 * recognisable on the approval cards and she can accept both and dismiss one
 * in the ledger. It is not de-duplication and must never become it: a wrong
 * match here costs a misleading sentence in the notes, never a row.
 *
 * Matching ignores the location and all punctuation, so the colon that is the
 * only difference between the two spellings above does not defeat it.
 */
function noteTravellingRuns(rows, venueCode) {
  const locations = (VENUES[venueCode] && VENUES[venueCode].locations) || [];
  if (locations.length < 2) return;

  const groups = new Map();
  for (const row of rows) {
    if (!row.title) continue;
    const loc = locations.find(l => new RegExp(`\\b${l}\\b`, 'i').test(row.title));
    if (!loc) continue;
    const key = row.title
      .replace(new RegExp(`\\b${loc}\\b`, 'ig'), ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .toUpperCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, loc });
  }

  for (const entries of groups.values()) {
    const locs = [...new Set(entries.map(e => e.loc))];
    if (locs.length < 2) continue;
    for (const { row, loc } of entries) {
      const others = locs.filter(l => l !== loc);
      row.notes = addNote(row.notes, `The same exhibition is also shown at ${others.join(' and ')}.`);
    }
  }
}

function passThrough(rows) {
  return rows;
}

// Chromium sits in a different place in this container, in a fresh container
// and on a laptop, and a wrong path fails at launch with an unhelpful error.
// Playwright's own answer is tried first but is not trusted: it reports the
// version it shipped with, which is not necessarily the one installed here.
// Whatever is actually on disk wins, newest first.
function resolveChromium() {
  const candidates = [];
  try { candidates.push(chromium.executablePath()); } catch { /* not installed */ }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(root).filter(n => /^chromium-\d+$/.test(n)).sort().reverse();
    for (const d of dirs) {
      candidates.push(path.join(root, d, 'chrome-linux', 'chrome'));
      candidates.push(path.join(root, d, 'chrome-linux64', 'chrome'));
    }
  } catch { /* no such directory */ }
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return undefined;  // let Playwright raise its own error
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Set by Ctrl-C. Read by safeGoto so the venue in progress stops at its next
// navigation instead of grinding through its remaining pages as failures.
let STOPPING = false;

async function main() {
  const RUN_VENUES = venuesForThisRun();

  // An interrupted venue must leave NO file behind, so that a file on disk
  // still means "this venue finished". Without this, stopping a run by hand
  // wrote a complete-looking venue that was missing whatever the shutdown ate.
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      if (STOPPING) process.exit(130);   // second Ctrl-C: go now
      STOPPING = true;
      log(`\n${sig} received — finishing the current page, then stopping.`);
      log('The venue in progress will NOT be written; run --continue to redo it.');
    });
  }


  fs.mkdirSync(RUN_DIR, { recursive: true });

  log('Cat Watch Sweep Prototype — starting');
  log(`Lookback floor: ${LOOKBACK.toISOString().slice(0,10)}`);
  log(`Run directory: ${RUN_DIR}${CONTINUE ? ' (continuing)' : ''}`);
  log(`Venues this run: ${RUN_VENUES.join(', ') || '(none)'}`);
  const already = VENUE_ORDER.filter(venueIsDone);
  if (already.length) log(`Already complete in this run: ${already.join(', ')}`);

  if (WANTED.length && !RUN_VENUES.length) {
    log(`Nothing matched "${WANTED.join(' ')}". Known venues: ${VENUE_ORDER.join(', ')}`);
    writeLog();
    process.exit(1);
  }

  // A --continue with nothing left to do still rebuilds the cumulative file,
  // so the run always ends with a complete sweep.csv.
  if (!RUN_VENUES.length) {
    const built = rebuildSweepCsv();
    log(`Nothing left to scrape. sweep.csv rebuilt: ${built.rows} rows (${built.included.join(', ')})`);
    writeLog();
    return;
  }

  log(`Proxy: ${PROXY_URL || '(none — direct egress assumed)'}`);
  if (!PROXY_URL) {
    log('  WARNING: HTTPS_PROXY is unset. If this container requires the agent');
    log('  proxy for egress, every venue will fail to load.');
  }

  const chromePath = resolveChromium();
  log(`Chromium: ${chromePath || '(Playwright default)'}`);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const summary = {};
  const netTotals = { fulfilled: 0, skipped: 0, failed: 0 };

  // Each worker gets its OWN browser context, and therefore its own cookie jar,
  // its own network bridge and its own page. Sharing one page across concurrent
  // venues is impossible — a page is a single sheet of glass, and two venues
  // navigating it would each destroy the other's work.
  async function runOneVenue(code, page) {
    // Final lookback pass — applies to every venue without exception, after
    // individual pages have had a chance to fill in missing dates.
    const rows = applyLookback(await scrapeVenue(page, code), code, 'final');
    noteTravellingRuns(rows, code);
    const real = rows.filter(r => !r.title.startsWith('['));
    const placeholders = rows.filter(r => r.title.startsWith('['));

    // Written only now, once this venue is finished. If the process dies at
    // any point before this line, the venue simply has no file and is picked
    // up by the next --continue. There is never a half-scraped venue on disk.
    writeVenueCsv(code, rows);

    summary[code] = {
      total: rows.length,
      real: real.length,
      withSummary: real.filter(r => r.summary).length,
      placeholders: placeholders.length,
    };
    log(`  → ${real.length} exhibitions, ${real.filter(r=>r.summary).length} with curatorial text → ${code}.csv`);
  }

  // The queue. Workers pull from a shared index rather than being handed a
  // fixed slice, so one slow venue cannot leave a worker idle while another
  // still has five to do.
  const queue = [...RUN_VENUES];
  let next = 0;

  async function worker(n) {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
    });
    // Chromium does no network I/O of its own — see NETWORK NOTE at top of file.
    const stats = await installNetworkBridge(context);

    try {
      while (true) {
        // STOPPING is checked HERE as well as in safeGoto: a Ctrl-C should not
        // start a venue it has no intention of finishing, since an abandoned
        // venue writes nothing and the work is simply thrown away.
        if (STOPPING) break;
        const i = next++;
        if (i >= queue.length) break;
        const code = queue[i];

        const page = await context.newPage();
        let timer;
        try {
          await VENUE_CONTEXT.run(code, () =>
            Promise.race([
              runOneVenue(code, page),
              // DEF-04. Losing the race does not cancel the venue's work —
              // nothing in Playwright can — which is why the page is closed in
              // the finally below. That makes the abandoned venue's next call
              // throw, so it unwinds instead of running on invisibly.
              new Promise((_, reject) => {
                timer = setTimeout(() => reject(Object.assign(
                  new Error(`venue exceeded its ${(VENUE_BUDGET_MS/60000).toFixed(2)} minute budget`),
                  { budgetExceeded: true },
                )), VENUE_BUDGET_MS);
              }),
            ]));
        } catch (e) {
          if (e.budgetExceeded) {
            // Deliberately not fatal to the run: the other venues are fine and
            // this one behaves exactly like any other unfinished venue.
            log(`  ${code}: ABANDONED — ${e.message}. Nothing written; --continue will redo it.`);
            summary[code] = { hung: true };
          } else if (e.aborted) {
            // The browser is gone, so no worker can continue. Write no file for
            // this venue and let every other worker notice STOPPING and stop.
            log(`  ${code}: STOPPED mid-venue — nothing written, --continue will redo it.`);
            summary[code] = { aborted: true };
            STOPPING = true;
            break;
          } else {
            log(`  FATAL ERROR in ${code} scraper: ${e.message}`);
            summary[code] = { error: e.message };
          }
        } finally {
          clearTimeout(timer);
          // Always close the page, never reuse it. A venue that was abandoned
          // may still have work in flight against it, and a fresh page for the
          // next venue costs almost nothing.
          await page.close().catch(() => {});
        }
      }
    } finally {
      netTotals.fulfilled += stats.fulfilled;
      netTotals.skipped   += stats.skipped;
      netTotals.failed    += stats.failed;
      await context.close().catch(() => {});
    }
  }

  const workerCount = Math.min(CONCURRENCY, queue.length);
  log(`Running ${queue.length} venue(s) ${workerCount} at a time (one page at a time within each venue)`);
  await Promise.all(Array.from({ length: workerCount }, (_, n) => worker(n)));

  const netStats = netTotals;
  await browser.close().catch(() => {});

  const built = rebuildSweepCsv();

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
  log('  venue      page                          seen   nav offsite   dup  noTitle  collected');
  log('  ' + '-'.repeat(86));
  const pad = (v, n) => String(v).padEnd(n);
  const num = (v, n) => String(v).padStart(n);
  for (const c of COUNTS) {
    log('  ' + pad(c.venue, 10) + ' ' + pad(String(c.page).slice(0, 28), 28) +
        num(c.seen, 6) + num(c.nav, 6) + num(c.offsite || 0, 8) +
        num(c.dupUrl, 6) + num(c.noTitle, 9) + num(c.kept, 11));
  }
  if (!COUNTS.length) log('  (no listing pages were read)');
  log('');
  log('  seen      = links matching the venue\'s selector on that page');
  log('  nav       = site navigation and filter links, not exhibitions');
  log('  offsite   = resolved to another host and was not followed; each one is logged above');
  log('  dup       = an address already collected; noted on the existing row, never dropped silently');
  log('  noTitle   = no usable exhibition name could be read from the link');
  log('  collected = rows handed on to the lookback filter and detail-page fetch');

  log('');
  log(`Network bridge: ${netStats.fulfilled} requests served, ${netStats.skipped} skipped (image/media/font), ${netStats.failed} failed`);
  log('');
  const outstanding = VENUE_ORDER.filter(c => !venueIsDone(c));
  log(`Run directory:   ${RUN_DIR}`);
  log(`Cumulative CSV:  ${CSV_PATH}  (${built.rows} rows — ${built.included.join(', ')})`);
  log(`Log written to:  ${LOG_PATH}`);
  if (outstanding.length) {
    log(`Not yet in this run: ${outstanding.join(', ')}`);
    log(`  Finish it with:  node scraper/sweep_prototype.js --continue`);
  } else {
    log('Every known venue has a file in this run.');
  }
  log('No de-duplication is applied — see passThrough.');

  writeLog();
}

// Requiring this file (the fixture tests do) must not start a sweep.
if (require.main === module) {
  main().catch(e => {
    log(`FATAL: ${e && e.stack ? e.stack : e}`);
    try { writeLog(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

// Exported for scraper/date.test.js. Only pure functions — nothing here touches
// the network, the browser or the filesystem.
module.exports = {
  findDateRange, findDateRangeInProse, parseMonthDay, ymd, startYearFor,
  monthNum, plausibleYear, sane, normalizeUrl, resolveHref,
  pickStructuredEvent, isoDay, runStamp, unusableDateText,
  // Not pure — exported so a one-off diagnostic can reach a venue the same way
  // the sweep does, rather than reimplementing the bridge and drifting from it.
  installNetworkBridge, resolveChromium, safeGoto, classifyLoadError, datesNearLink,
  // Exported so compress.js's mirrored location list can be checked against the
  // real one by a fixture. compress.js must not require THIS file at runtime —
  // that would pull Playwright into a step that is pure text — so a test is the
  // only thing standing between the two copies and silent drift.
  VENUES,
};
