/**
 * pro_forma.js — the pro forma CSV as the sweep writes it and the app reads it: its columns, the
 * marker sentence, the "Topic:" note, the cell quoting, the table reader and the sweep-log merge.
 * One copy, shared by the scraper's tools and the app (docs/import_csv.md).
 * `node build/app_join.js` writes everything above module.exports into Cat_Watch.jsx as PRO_FORMA,
 * and `node build/app_join.js --check` fails until it has. Edit HERE, then run the join. Pure:
 * nothing above module.exports may use Node.
 */
'use strict';

// The columns, in this order (docs/import_csv.md).
const COLUMNS = ['venue_code', 'title', 'start_date', 'end_date', 'summary', 'url', 'notes', 'swept_at'];
const CSV_HEADER = COLUMNS.join(',');

// The sentence that ends a marker row's notes: a listing page the sweep could not read, not a show.
const MARKER_SENTINEL = 'Marker row, not an exhibition.';
const isMarkerNote = note => String(note || '').trim().endsWith(MARKER_SENTINEL);

// Potential quarantines: compression writes the topic label as one sentence into the notes ("Topic: Asian art."),
// the app reads the label back out of it.
const TOPIC_PREFIX = 'Topic: ';
const topicSentence = label => `${TOPIC_PREFIX}${label}.`;
const TOPIC_NOTE = new RegExp('(?:^|\\s)' + TOPIC_PREFIX + '([^.]+)\\.');
function topicOf(note) {
  const m = TOPIC_NOTE.exec(String(note || ''));
  return m ? m[1] : null;
}

// A cell written as given, quoted when it holds a comma, quote or line break.
const quoteCell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

// A cell as the sweep and compression write it: trimmed first, then quoted as above but for a lone \r.
function sweepCell(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  return (s.includes(',') || s.includes('\n') || s.includes('"'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

// A whole pro forma file from row objects, each cell written by `cell`.
const csvText = (rows, cell) => [CSV_HEADER, ...rows.map(r => COLUMNS.map(c => cell(r[c])).join(','))].join('\n') + '\n';

// The table in a CSV text, quoted cells holding commas and line breaks. A \r outside quotes is dropped;
// blank lines come back as rows.
function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// The later of two swept_at stamps; a missing stamp never displaces a real one.
const later = (a, b) => (!a || (b && b > a)) ? b : a;

// The sweep log merged with what a file showed (`seen`: {attempted, returned}, venue → stamp). A venue's
// dates move only for a later time, so an old file cannot drag them back; tried and brought-rows move
// independently. A venue seen with no sweep time adds nothing: the file says nothing about when it was tried.
function mergeSweepLog(prev, seen) {
  const out = { ...(prev || {}) };
  for (const v of Object.keys((seen && seen.attempted) || {})) {
    if (!seen.attempted[v]) continue;
    const was = out[v] || {};
    out[v] = {
      attempted: later(was.attempted, seen.attempted[v]),
      returned:  later(was.returned,  (seen.returned || {})[v] || null),
    };
  }
  return out;
}

module.exports = { COLUMNS, CSV_HEADER, MARKER_SENTINEL, isMarkerNote, TOPIC_PREFIX, topicSentence, TOPIC_NOTE, topicOf,
  quoteCell, sweepCell, csvText, parseCsv, later, mergeSweepLog };
