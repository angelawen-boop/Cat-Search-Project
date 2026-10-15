/**
 * THE ROUTINE WINDOW — a home sweep reads only recent shows (her decision;
 * docs/sweep_operation.md, "Routine and full sweeps").
 *
 * A routine sweep of a home venue still reads every listing page back to the
 * lookback floor, but opens and writes only shows that are on, upcoming, undated
 * or closed within the ROUTINE_MONTHS before the sweep date. Older shows are not
 * swept: not opened, not in the CSV. `--full` sweeps everything back to the floor.
 *
 * Each routine venue's window is written into the run (window.json), so QC,
 * sweep_diff and venue_status know an old show missing from it was not swept.
 * They count a venue as KNOWN rows: the newest run's rows plus the older shows the
 * runs before it brought, which a routine run left outside its window (knownRows).
 */
const fs = require('fs');
const path = require('path');

const ROUTINE_MONTHS = 6;
const WINDOW_FILE = 'window.json';
const MARKER_SENTINEL = 'Marker row, not an exhibition.';
const s = v => String(v == null ? '' : v).trim();
const isMarker = r => s(r.notes).endsWith(MARKER_SENTINEL);

/** "2026-10-15" → "2026-04-15": the same day ROUTINE_MONTHS earlier, clamped to the month's end. */
function windowFrom(dateStr, months = ROUTINE_MONTHS) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const ny = Math.floor(total / 12), nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ny, nm, Math.min(d, last))).toISOString().slice(0, 10);
}

/** Closed before the window opens. An unknown closing date is never outside. */
const outsideWindow = (row, from) => !!(from && s(row.end_date) && s(row.end_date) < from);

/** { venue: 'YYYY-MM-DD' } for a run or stitch folder; {} when it holds full sweeps only. */
function readWindow(dirAbs) {
  try { return JSON.parse(fs.readFileSync(path.join(dirAbs, WINDOW_FILE), 'utf8')) || {}; }
  catch { return {}; }
}

/** Record (or, with from = null, clear) one venue's window in a run folder. */
function recordWindow(dirAbs, venue, from) {
  const w = readWindow(dirAbs);
  if (from) w[venue] = from; else delete w[venue];
  const file = path.join(dirAbs, WINDOW_FILE);
  if (Object.keys(w).length) fs.writeFileSync(file, JSON.stringify(w, null, 2) + '\n');
  else if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * One venue's known rows after a run: its real rows, plus — when the run was
 * routine — the earlier known rows closed before its window and not in it by
 * address. A full run (from = null) replaces them outright.
 */
function knownAfter(prevKnown, nowRows, from) {
  const now = nowRows.filter(r => !isMarker(r));
  if (!from) return now;
  const urls = new Set(now.map(r => s(r.url)));
  return [...now, ...(prevKnown || []).filter(r => outsideWindow(r, from) && !urls.has(s(r.url)))];
}

/**
 * A venue's known rows as of the last of `runs` (oldest first; each { abs }),
 * `readRows(abs)` giving that run's rows. Runs where it brought no real rows are
 * passed over, as everywhere else.
 */
function knownRows(venue, runs, readRows) {
  let known = null;
  for (const run of runs) {
    const rows = readRows(run.abs).filter(r => s(r.venue_code) === venue);
    if (!rows.some(r => !isMarker(r))) continue;
    known = knownAfter(known, rows, readWindow(run.abs)[venue] || null);
  }
  return known;
}

module.exports = { ROUTINE_MONTHS, WINDOW_FILE, windowFrom, outsideWindow, readWindow, recordWindow, knownAfter, knownRows };
