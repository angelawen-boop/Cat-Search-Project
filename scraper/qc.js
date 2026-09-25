/**
 * QC — the exceptions report, and the gate in front of her import file.
 * §7 step 8, built 20 Sep 2026. It had never existed.
 *
 * WHY IT IS CODE AND NOT A SESSION'S JUDGEMENT. Her ruling, 20 Sep: a row with
 * no title or no venue code is a DATA FAULT, and a data fault belongs to the
 * session, never to her approval pile. The app used to show them as a band of
 * their own whose only possible outcome was "fix the sweep and feed it again" —
 * which is a message to the session printed on her screen.
 *
 * A session re-deriving "does this row look wrong" gives a different answer
 * depending on which session turned up, and that question has exactly one
 * correct answer. So it is code, and `--apply` refuses to write the file she
 * imports while a fatal row is in it. A session cannot hand her a nameless row
 * by forgetting to look.
 *
 * TWO CLASSES, AND THE DIFFERENCE IS WHETHER THE ANSWER IS KNOWN:
 *
 *   FATAL — the row cannot be an exhibition. No title (there is no such thing
 *   as an exhibition with no name, so the recipe or the page failed), no venue
 *   code (the row came from somewhere, so the CSV is malformed), wrong number
 *   of columns. These BLOCK the import file.
 *
 *   EXCEPTIONS — the row is fine but the RUN looks unlike the last one: a venue
 *   whose count dropped, a venue that went to markers only, summaries lost where
 *   there were some. These WARN and never block, like detectUnwiredPagination().
 *   A false alarm here teaches her — and the session — to scroll past the real
 *   one, so each check compares against the last run that actually had that
 *   venue rather than against the run before it.
 */
const fs = require('fs');
const path = require('path');
const C = require('./compress.js');
const { pagesFromNote, archiveYear } = require('./listing_note.js');

const OUTPUT_DIR = path.join(__dirname, 'output');
const RAW_CSV = 'sweep.csv';
const MARKER_SENTINEL = 'Marker row, not an exhibition.';

// The venue codes the app will accept. Kept here rather than imported from the
// scraper so this can run against a stitched file the scraper never produced.
const KNOWN_VENUES = new Set(['met','ng','rijks','acq','louvre','uffizi','borghese','brera',
  'capo','dellav','khm','moma','frick','morgan','menil','artic','va','brit','wallace',
  'tate-modern','tate-britain','lgd','jacquemart']);

const isMarker = r => String(r.notes || '').trim().endsWith(MARKER_SENTINEL);

/** Every fatal row in one file, with the line number a session can go and read. */
function fatalRows(rows) {
  const out = [];
  rows.forEach((r, i) => {
    const line = i + 2;                       // +1 for the header, +1 for 1-based
    const vc = String(r.venue_code || '').trim();
    const title = String(r.title || '').trim();
    if (!vc) out.push({ line, kind: 'no venue code', why:
      'The row came from somewhere, so the file is malformed rather than the venue being unknown.',
      url: r.url, title });
    else if (!KNOWN_VENUES.has(vc)) out.push({ line, kind: 'unknown venue code', why:
      `"${vc}" is not one of the 21 codes. The app would file it under "couldn't be filed".`,
      url: r.url, title });
    if (!title) out.push({ line, kind: 'no title', why:
      'There is no such thing as an exhibition with no name — either the venue recipe stopped '
      + 'reading titles or this page failed. Re-run the venue, or fix its recipe.',
      url: r.url, venue: vc });
  });
  return out;
}

/** Per-venue shape of one file: how many rows, how many real, how many with text. */
function venueShape(rows) {
  const by = new Map();
  for (const r of rows) {
    const vc = String(r.venue_code || '').trim() || '(blank)';
    const s = by.get(vc) || { rows: 0, real: 0, summaries: 0 };
    s.rows++;
    if (!isMarker(r)) { s.real++; if (String(r.summary || '').trim()) s.summaries++; }
    by.set(vc, s);
  }
  return by;
}

/**
 * Every run on disk, live and archived, oldest first. ARCHIVED RUNS COUNT: the
 * sweep moves old folders into archive/ at start-up, so a history that ignored
 * them would think a venue had never been swept before.
 *
 * ORDERED BY THE FOLDER'S OWN TIMESTAMP, never by where it sits in a listing.
 * The name IS the time the run started, so comparing names is comparing dates.
 * The first version used the position in the live listing, and a run read out
 * of archive/ was not in that listing at all — so every later run counted as
 * "before" it, and a 12 Sep folder was reported as having lost rows against a
 * 13 Sep one. A comparison that can run backwards in time is worse than none.
 */
function allRuns() {
  const out = [];
  const scan = (base, prefix) => {
    if (!fs.existsSync(base)) return;
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('run_')) continue;
      if (fs.existsSync(path.join(base, d, RAW_CSV))) out.push({ name: d, rel: prefix + d });
    }
  };
  scan(OUTPUT_DIR, '');
  scan(path.join(OUTPUT_DIR, 'archive'), 'archive/');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The last run STARTED BEFORE this one that actually held this venue. Not
 * simply the previous run: most runs are one-venue diagnostics, so comparing
 * against the run before would report every venue as having vanished.
 */
function previousShapeFor(dir, venue) {
  const self = path.basename(dir);
  const before = allRuns().filter(r => r.name < self);
  for (let i = before.length - 1; i >= 0; i--) {
    const shape = venueShape(C.readProForma(path.join(OUTPUT_DIR, before[i].rel, RAW_CSV))).get(venue);
    if (shape && shape.rows) return { dir: before[i].name, shape };
  }
  return null;
}

/** Everything that is fine but does not look like last time. Warns, never blocks. */
function exceptions(dir, rows) {
  const out = [];
  const now = venueShape(rows);
  for (const [venue, s] of now) {
    if (venue === '(blank)') continue;
    if (s.real && s.summaries < s.real) {
      out.push({ venue, what: `${s.real - s.summaries} of ${s.real} rows have no description.` });
    }
    const prev = previousShapeFor(dir, venue);
    if (!prev) continue;
    const p = prev.shape;
    if (p.real > 0 && s.real === 0) {
      out.push({ venue, what: `returned NO exhibitions — ${p.real} in ${prev.dir}. Marker rows only now.` });
    } else if (s.real < p.real) {
      out.push({ venue, what: `${s.real} exhibitions, down from ${p.real} in ${prev.dir}.` });
    }
    if (p.summaries > 0 && s.summaries < p.summaries && s.real >= p.real) {
      out.push({ venue, what: `${s.summaries} descriptions, down from ${p.summaries} in ${prev.dir}, on the same or more rows.` });
    }
  }
  return out;
}

/**
 * A row "listed" on a year's archive page from before the year it opened.
 * Impossible, so a link from OUTSIDE the listing was read — a menu or promo
 * card on every page: Mary Cassatt, opening 2026, was listed on the Art
 * Institute's 2023 archive. The page's year is compared by its NEWEST year
 * (a season "2024-2025" counts as 2025), so this cannot fire on a real row.
 * Warns, never blocks — the fix is the venue's `within`, not the row.
 */
function impossibleListings(rows) {
  const out = [];
  rows.forEach((r, i) => {
    if (isMarker(r)) return;
    const opened = Number(String(r.start_date || '').slice(0, 4));
    if (!opened) return;
    const early = pagesFromNote(r.notes).filter(ctx => {
      const y = archiveYear(ctx);
      return y !== null && y < opened;
    });
    if (early.length) out.push({ line: i + 2, venue: String(r.venue_code || '').trim(),
      title: r.title, opened, pages: early });
  });
  return out;
}

/** Read a run or stitch directory and report on it. */
function inspect(dir) {
  const file = path.join(OUTPUT_DIR, dir, RAW_CSV);
  if (!fs.existsSync(file)) return { error: `No ${RAW_CSV} in ${dir}.` };
  const rows = C.readProForma(file);
  return { dir, rows: rows.length, fatal: fatalRows(rows), exceptions: exceptions(dir, rows),
           listings: impossibleListings(rows) };
}

/** Printed by --apply when it refuses, and by the CLI. */
function report(res) {
  const say = s => console.log(s);
  if (res.error) { say(res.error); return; }
  say(`${res.dir} — ${res.rows} rows`);
  if (res.fatal.length) {
    say(`\nFAULTY ROWS — ${res.fatal.length}. These must not reach her import file.`);
    for (const f of res.fatal) {
      say(`  line ${f.line}  ${f.kind}${f.venue ? '  [' + f.venue + ']' : ''}${f.title ? '  "' + f.title + '"' : ''}`);
      say(`           ${f.url || '(no url)'}`);
      say(`           ${f.why}`);
    }
  } else say('\nNo faulty rows: every row has a title and a known venue code.');
  if (res.exceptions.length) {
    say(`\nEXCEPTIONS — ${res.exceptions.length}. Look at each; none of them blocks anything.`);
    for (const e of res.exceptions) say(`  ${e.venue.padEnd(14)} ${e.what}`);
  } else say('\nNo exceptions: every venue looks like the last run that had it.');
  const L = res.listings || [];
  if (L.length) {
    say(`\nLISTED BEFORE IT OPENED — ${L.length}. A menu or promo link was read as the listing; the venue needs \`within\`.`);
    for (const x of L) say(`  line ${x.line}  ${x.venue.padEnd(14)} "${x.title}" opened ${x.opened}, listed on: ${x.pages.join(', ')}`);
  } else say('\nNo row is listed on an archive page from before it opened.');
}

module.exports = { inspect, report, fatalRows, exceptions, impossibleListings, venueShape, isMarker, KNOWN_VENUES };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.log('usage: node scraper/qc.js <run or stitch directory>'); process.exit(1); }
  const res = inspect(dir);
  report(res);
  process.exit(res.error || (res.fatal && res.fatal.length) ? 1 : 0);
}
