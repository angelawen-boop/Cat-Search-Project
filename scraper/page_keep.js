/**
 * PAGES KEPT — her machine only. Her go-ahead, 27 Sep 2026.
 *
 * WHY. MoMA, 27 Sep: a paced, headed sweep read 18 pages cleanly, Cloudflare
 * challenged the 19th, and because a venue cut short is never written (a half
 * venue must never reach her import), all 17 exhibition pages already read
 * were thrown away. The next attempt would have asked for all of them again —
 * spending the very allowance that ran out.
 *
 * WHAT. Every exhibition page read cleanly on her machine is kept the moment
 * it is read, whether or not the venue finishes:
 *
 *   output/pages_kept/<venue>/<key>.json     what reading the page did to the row
 *   output/pages_kept/<venue>/<key>.html.gz  the page itself, as the browser drew it
 *
 * The next attempt at that venue takes the row from the .json and does NOT ask
 * the site for that page. Only pages still missing are requested.
 *
 * THE RESULT IS REUSED, NOT THE PAGE. Replaying the saved HTML would read it
 * without its stylesheets, so text the site hides would reappear in the
 * description, and replaying it with its scripts would send requests to the
 * site. So the .json holds exactly the fields the live read changed on the row,
 * and reuse is copying them back: the same row the live read produced. The
 * .html.gz is for writing and checking a recipe offline — "saved pages first".
 *
 * SAVING SENDS NOTHING. Both files are written from what the browser already
 * holds. No request is made to keep a page.
 *
 * WHEN A KEPT PAGE IS NOT USED:
 *   - the venue has since FINISHED — a complete, written sweep. Its next sweep
 *     reads everything fresh, so a monthly sweep is never a stale copy.
 *   - it is older than MAX_AGE_DAYS — long enough to finish a venue over
 *     several days' allowance, short enough that a page is not years old.
 *   - --reread — after a recipe change, so the change is actually applied.
 *
 * A page that failed, or broke part-way through being read, is never kept.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const MAX_AGE_DAYS = 14;
const FINISHED_FILE = 'finished.json';

const keyOf = url => crypto.createHash('sha1').update(String(url)).digest('hex').slice(0, 16);

// The row's own fields, copied, so a later change can be compared against it.
// Fields holding a live object are skipped by JSON — none of the row's are.
const snapshot = row => JSON.parse(JSON.stringify(row));

/** The fields reading the page changed or added, as { field: newValue }. */
function rowChanges(before, after) {
  const out = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = after[k];
  }
  return out;
}

function makePageKeep(rootDir, { now = () => Date.now(), reread = false } = {}) {
  const dirFor = venue => path.join(rootDir, venue);

  function finishedAt(venue) {
    try { return Date.parse(JSON.parse(fs.readFileSync(path.join(dirFor(venue), FINISHED_FILE), 'utf8')).at) || 0; }
    catch { return 0; }
  }

  /** The kept record for this page, or null with the reason it is not usable. */
  function lookup(venue, url) {
    if (reread) return null;
    let rec;
    try { rec = JSON.parse(fs.readFileSync(path.join(dirFor(venue), keyOf(url) + '.json'), 'utf8')); }
    catch { return null; }
    if (!rec || rec.url !== url) return null;
    const at = Date.parse(rec.savedAt) || 0;
    if (at <= finishedAt(venue)) return null;
    if (now() - at > MAX_AGE_DAYS * 86400000) return null;
    return rec;
  }

  /** Keep one page. Never throws: failing to keep a page must not fail a sweep. */
  function save(venue, url, { changes, titleReport, outcome, html }) {
    try {
      fs.mkdirSync(dirFor(venue), { recursive: true });
      const key = keyOf(url);
      if (html) fs.writeFileSync(path.join(dirFor(venue), key + '.html.gz'), zlib.gzipSync(html));
      fs.writeFileSync(path.join(dirFor(venue), key + '.json'), JSON.stringify({
        url, savedAt: new Date(now()).toISOString(), outcome, changes, titleReport: titleReport || [],
      }, null, 2) + '\n');
      return true;
    } catch { return false; }
  }

  /** The venue was swept completely and written; nothing kept before now is reused. */
  function markFinished(venue) {
    try {
      fs.mkdirSync(dirFor(venue), { recursive: true });
      fs.writeFileSync(path.join(dirFor(venue), FINISHED_FILE),
        JSON.stringify({ at: new Date(now()).toISOString() }) + '\n');
    } catch { /* the worst case is one extra reuse inside MAX_AGE_DAYS */ }
  }

  return { lookup, save, markFinished, finishedAt };
}

module.exports = { makePageKeep, rowChanges, snapshot, keyOf, MAX_AGE_DAYS };
