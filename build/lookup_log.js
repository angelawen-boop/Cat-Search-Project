// lookup_log.js — reads the app's lookup log (Cat_Watch.jsx, "THE LOOKUP LOG") once
// a session has saved it from the page's store with ArtifactData:
//   list  collection "lookups"                 out_dir <dir>   → the records
//   list  collection "lookups/<id>/pieces"     out_dir <dir>   → one record's pieces
//
//   node build/lookup_log.js <dir>                 the records, newest first
//   node build/lookup_log.js <dir> <id>            one lookup, every call written out
//   node build/lookup_log.js <dir> <id> --json     the same record as JSON
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// A saved document may hold its fields bare or under `data`.
function fieldsOf(file) {
  const o = JSON.parse(fs.readFileSync(file, 'utf8'));
  return o && typeof o.data === 'object' && o.data ? o.data : o;
}

function decodeRecord(meta, pieceTexts) {
  const text = pieceTexts.join('');
  const json = meta.enc === 'gzip-base64' ? zlib.gunzipSync(Buffer.from(text, 'base64')).toString('utf8') : text;
  return JSON.parse(json);
}

function readRecord(dir, id) {
  const meta = fieldsOf(path.join(dir, 'lookups', id + '.json'));
  const pdir = path.join(dir, 'lookups', id, 'pieces');
  const texts = [];
  for (let i = 0; i < meta.pieces; i++) {
    const f = path.join(pdir, i + '.json');
    if (!fs.existsSync(f)) throw new Error('Piece ' + i + ' of ' + meta.pieces + ' is not saved at ' + f);
    texts.push(String(fieldsOf(f).text || ''));
  }
  return { meta, record: decodeRecord(meta, texts) };
}

function listRecords(dir) {
  const d = path.join(dir, 'lookups');
  return fs.readdirSync(d).filter(f => f.endsWith('.json'))
    .map(f => ({ id: f.slice(0, -5), ...fieldsOf(path.join(d, f)) }))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

const block = (label, v) => label + ':\n' + (typeof v === 'string' ? v : JSON.stringify(v, null, 2)) + '\n';

function resultText(r, i) {
  const body = r.full_content != null ? String(r.full_content)
    : Array.isArray(r.excerpts) ? r.excerpts.join('\n…\n') : '';
  return '  [' + (i + 1) + '] ' + (r.title || '(untitled)') + '\n      ' + (r.url || '') + '\n'
    + body.split('\n').map(l => '      ' + l).join('\n') + '\n';
}

function describe(rec) {
  const out = [];
  out.push(rec.action + ' — “' + rec.card.title + '” at ' + rec.card.venue + ' (' + rec.card.museumId + ')');
  out.push('Started ' + rec.at + ', app ' + rec.version + ', ' + (rec.ms / 1000).toFixed(1) + 's, '
    + rec.calls.length + ' calls. Finished: ' + (rec.ok ? 'yes' : 'no') + '.');
  if (rec.said) out.push('Card said: ' + rec.said);
  if (rec.trouble) out.push('Trouble: ' + rec.trouble);
  out.push('', block('Card before', rec.before), block('Card after', rec.after), block('Panel', rec.panel || '(none)'));
  for (const c of rec.calls) {
    out.push('━━ ' + c.n + '. ' + c.kind.toUpperCase() + ' at +' + (c.at / 1000).toFixed(1) + 's, took '
      + (c.ms / 1000).toFixed(1) + 's ━━');
    const inp = c.input || {}, o = c.output || {};
    if (inp.objective) out.push('Objective: ' + inp.objective);
    if (inp.queries) out.push('Queries: ' + JSON.stringify(inp.queries));
    if (inp.urls) out.push('Pages: ' + inp.urls.join('\n       ') + (inp.full ? '  (whole page)' : ''));
    if (inp.prompt != null) out.push(block('Sent to Claude', inp.prompt));
    out.push('Result: ' + (o.ok ? 'ok' : 'FAILED') + ' — ' + (o.detail || ''));
    if (c.kind === 'claude') {
      out.push(block('Claude answered', o.data === undefined ? null : o.data));
      if (o.partial) out.push(block('Partial answer', o.partial));
    }
    if (Array.isArray(o.errors) && o.errors.length) out.push(block('Refused', o.errors));
    if (Array.isArray(o.results)) o.results.forEach((r, i) => out.push(resultText(r, i)));
    out.push('');
  }
  return out.join('\n');
}

if (require.main === module) {
  const [dir, id, flag] = process.argv.slice(2);
  if (!dir) { console.error('Usage: node build/lookup_log.js <saved dir> [<id> [--json]]'); process.exit(2); }
  if (!id) {
    for (const r of listRecords(dir))
      console.log(r.id + '  ' + r.at + '  ' + r.action + '  “' + r.title + '” (' + r.museumId + ')  '
        + r.calls + ' calls' + (r.complete ? '' : '  INCOMPLETE'));
  } else {
    const { record } = readRecord(dir, id);
    console.log(flag === '--json' ? JSON.stringify(record, null, 2) : describe(record));
  }
}

module.exports = { decodeRecord, readRecord, listRecords, describe };
