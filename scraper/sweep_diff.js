/**
 * SWEEP DIFF — what changed at each venue since the last run that had it, with
 * the cause worked out in code wherever the cause has one answer.
 *
 * WHY IT EXISTS. The first unattended sweep (5 Oct 2026) reported three venues'
 * dropped rows as "probably turnover" without looking; all three were her own
 * exclusion rulings, written in the run's own log. It called two rows at
 * different addresses a duplicate, a no-closing-date row "outside the lookback",
 * and never said why three summaries were empty though each row's note said so.
 * Every one of those has exactly one right answer, so it is code (her rule,
 * 10 Sep: code before a session). What is left for the session is the
 * UNEXPLAINED pile and reading text for junk this file's patterns miss.
 *
 * Compares by ADDRESS, never by title — same rule as the scraper's own guard.
 * Titles are used only to pair a row that MOVED (same name, new address) and to
 * match the log's exclusion lines, which carry a title and no address.
 *
 * Reports only. Never edits a run, never drops a row, never decides a duplicate.
 */
const fs = require('fs');
const path = require('path');
const C = require('./compress.js');
const { pagesFromNote } = require('./listing_note.js');

const OUTPUT_DIR = path.join(__dirname, 'output');
const RAW_CSV = 'sweep.csv';
const FLOOR = '2024-07-01';                         // CLAUDE.md §3, the lookback
const MARKER_SENTINEL = 'Marker row, not an exhibition.';

const isMarker = r => String(r.notes || '').trim().endsWith(MARKER_SENTINEL);
const s = v => String(v == null ? '' : v).trim();
/** Letters and digits only, lowercased: "Commission: X" vs "Tate Britain Commission: X". */
const squash = t => s(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

/** One title "is" another when one holds the other whole — the log trims venue prefixes. */
function sameName(a, b) {
  const x = squash(a), y = squash(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return short.length >= 8 && long.includes(short);
}

/** Every run on disk, live and archived, oldest first (same rule as qc.js). */
function allRuns() {
  const out = [];
  const scan = (base, prefix) => {
    if (!fs.existsSync(base)) return;
    for (const d of fs.readdirSync(base)) {
      if (d.startsWith('run_') && fs.existsSync(path.join(base, d, RAW_CSV))) out.push({ name: d, abs: path.join(base, d) });
    }
  };
  scan(OUTPUT_DIR, '');
  scan(path.join(OUTPUT_DIR, 'archive'), 'archive/');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The last run started before this one in which the venue brought REAL rows. */
function previousRowsFor(selfName, venue, runs = allRuns()) {
  const before = runs.filter(r => r.name < selfName);
  for (let i = before.length - 1; i >= 0; i--) {
    const rows = C.readProForma(path.join(before[i].abs, RAW_CSV)).filter(r => s(r.venue_code) === venue);
    if (rows.some(r => !isMarker(r))) return { run: before[i].name, abs: before[i].abs, rows };
  }
  return null;
}

/**
 * The log's own account of each venue: rows it excluded (and why) and how many
 * links each listing page showed. Every log of the run is read — `--continue`
 * writes a second one.
 */
function readLogs(dirAbs) {
  const excluded = new Map();           // venue -> [{ title, reason }]
  const linksSeen = new Map();          // venue -> Map(ctx -> count, or the failure)
  if (!fs.existsSync(dirAbs)) return { excluded, linksSeen };
  const put = (v, ctx, val) => { if (!linksSeen.has(v)) linksSeen.set(v, new Map()); linksSeen.get(v).set(ctx, val); };
  for (const f of fs.readdirSync(dirAbs).filter(f => /^log_.*\.txt$/.test(f)).sort()) {
    for (const line of fs.readFileSync(path.join(dirAbs, f), 'utf8').split('\n')) {
      let m = line.match(/\] \[([a-z0-9-]+)\]\s+(.+?), excluded: (.+)$/);
      if (m) {
        if (!excluded.has(m[1])) excluded.set(m[1], []);
        excluded.get(m[1]).push({ reason: m[2].trim(), title: m[3].trim() });
        continue;
      }
      m = line.match(/\] \[([a-z0-9-]+)\]\s+(.+?): (\d+) links seen/);
      if (m) { put(m[1], m[2].trim(), Number(m[3])); continue; }
      m = line.match(/\] \[([a-z0-9-]+)\]\s+FAILED (.+?) — (\S+)/);
      if (m) put(m[1], m[2].trim(), `none — the page FAILED (${m[3]})`);
    }
  }
  return { excluded, linksSeen };
}

/** The reason a row's own page was not read, quoted from its note — or ''. */
function pageFailure(notes) {
  const m = s(notes).match(/own page could not be read: ([^.]+(?:\.\d[^.]*)?)\./);
  return m ? m[1] : '';
}

const readsPast = rows => rows.some(r => pagesFromNote(r.notes).some(p => /past|archive|\b20\d\d\b/i.test(p)));

/** Known kinds of junk in a summary. A pattern FLAGS; it never removes anything. */
// Caption and credit checks look at the OPENING only: a real description may
// name an artist's dates or thank a sponsor further down; junk STARTS that way.
const JUNK = [
  { kind: 'catalogue sales line', re: /\b(order(ing)?|buy|purchase|pre-?order)\b[^.]{0,60}\bcatalogue\b|\bcatalogue\b[^.]{0,40}\b(that )?accompan(ies|ying)\b/i, short: 400 },
  { kind: 'picture caption', re: /\((?:American|British|English|French|German|Italian|Dutch|Flemish|Spanish|Austrian|Japanese|Chinese|Mexican|Canadian|Swiss|Belgian|[A-Z][a-z]+-born)[^)]{0,20}, (?:born )?\d{4}(?:\s*[–-]\s*\d{4})?\)|\b(gelatin silver print|oil on canvas|Museum Purchase)\b/, head: 160 },
  { kind: 'credit or sponsor line', re: /\b(is|are) (generously )?supported by\b|\bsponsored by\b|\bComitato scientifico\b|\bscientific committee\b|\bwith the support of\b/i, head: 200 },
];
function junkIn(summary) {
  const t = s(summary);
  if (!t) return [];
  return JUNK.filter(j => j.re.test(j.head ? t.slice(0, j.head) : t) && (!j.short || t.length <= j.short)).map(j => j.kind);
}

/** Everything the diff says about one venue. */
function diffVenue(venue, nowRows, prev, log, runDate = '') {
  const now = nowRows.filter(r => !isMarker(r));
  const markers = nowRows.filter(isMarker);
  const out = { venue, now: now.length, prevRun: prev && prev.run, prev: null,
    gone: [], added: [], moved: [], renamed: [], redated: [], lostSummary: [], noSummary: [],
    keptNoEnd: [], sameName: [], junk: [], emptiedPages: [], ruleStopped: [] };

  for (const r of now) {
    if (!s(r.summary)) out.noSummary.push({ title: r.title, url: r.url, why: pageFailure(r.notes) });
    if (s(r.start_date) && s(r.start_date) < FLOOR && !s(r.end_date)) out.keptNoEnd.push({ title: r.title, start: r.start_date, url: r.url });
    const kinds = junkIn(r.summary);
    if (kinds.length) out.junk.push({ title: r.title, url: r.url, kinds, text: s(r.summary).slice(0, 160) });
  }
  for (let i = 0; i < now.length; i++) for (let j = i + 1; j < now.length; j++) {
    if (squash(now[i].title) && squash(now[i].title) === squash(now[j].title) && s(now[i].url) !== s(now[j].url)) {
      out.sameName.push({ title: now[i].title, urls: [now[i].url, now[j].url] });
    }
  }
  if (!prev) return out;

  const before = prev.rows.filter(r => !isMarker(r));
  out.prev = before.length;
  const byUrlNow = new Map(now.map(r => [s(r.url), r]));
  const byUrlPrev = new Map(before.map(r => [s(r.url), r]));
  const newOnes = now.filter(r => !byUrlPrev.has(s(r.url)));
  const pairedNew = new Set();
  const excl = log.excluded.get(venue) || [];
  const venueReadsPast = readsPast(now) || readsPast(before);
  runDate = runDate || s((now[0] || markers[0] || {}).swept_at).slice(0, 10);

  for (const p of before) {
    const n = byUrlNow.get(s(p.url));
    if (n) {
      if (s(n.title) !== s(p.title)) out.renamed.push({ from: p.title, to: n.title, url: n.url,
        onlyCase: s(n.title).toLowerCase() === s(p.title).toLowerCase() });
      if (s(n.start_date) !== s(p.start_date) || s(n.end_date) !== s(p.end_date)) out.redated.push({ title: n.title, url: n.url,
        from: `${s(p.start_date) || '?'} → ${s(p.end_date) || '?'}`, to: `${s(n.start_date) || '?'} → ${s(n.end_date) || '?'}` });
      if (s(p.summary) && !s(n.summary)) out.lostSummary.push({ title: n.title, url: n.url, why: pageFailure(n.notes) });
      continue;
    }
    const ex = excl.find(e => sameName(e.title, p.title));
    const mv = newOnes.find(r => !pairedNew.has(r) && sameName(r.title, p.title));
    let cause, proven = true;
    if (ex) cause = `excluded this run — "${ex.reason}" (log)`;
    else if (mv) { pairedNew.add(mv); out.moved.push({ title: mv.title, from: p.url, to: mv.url, prevTitle: p.title }); continue; }
    else if (s(p.end_date) && runDate && s(p.end_date) < runDate && !venueReadsPast) cause = `closed ${p.end_date}; this venue's recipe reads no past listing, so a closed show leaves`;
    else { cause = 'UNEXPLAINED'; proven = false; }
    out.gone.push({ title: p.title, url: p.url, start: p.start_date, end: p.end_date, cause, proven });
  }
  // A new row that the LAST run's log excluded by name: the rule has stopped
  // firing (V&A, 5 Oct: the venue stopped labelling displays "permanent" and
  // ten came through against her ruling). A fault, never a new show.
  const prevExcl = (prev.log && prev.log.excluded.get(venue)) || [];
  for (const r of newOnes) if (!pairedNew.has(r)) {
    const was = prevExcl.find(e => sameName(e.title, r.title));
    if (was) { out.ruleStopped.push({ title: r.title, url: r.url, reason: was.reason }); continue; }
    const opened = s(r.start_date);
    const note = opened && prev.run && opened >= runDateOf(prev.run) ? 'opened or announced since the last run'
      : 'not in the last run though it is not new — check why it was missed then or found now';
    out.added.push({ title: r.title, url: r.url, start: r.start_date, end: r.end_date, note });
  }

  // A listing page that brought rows last time and only a marker now.
  const prevCtx = new Set(before.flatMap(r => pagesFromNote(r.notes)));
  for (const m of markers) {
    const ctx = (s(m.title).match(/^\[(.+?) page\]$/) || [])[1];
    if (ctx && prevCtx.has(ctx)) {
      const seen = (log.linksSeen.get(venue) || new Map()).get(ctx);
      out.emptiedPages.push({ ctx, url: m.url, note: s(m.notes).replace(MARKER_SENTINEL, '').trim(),
        linksSeen: seen == null ? 'not in the log' : seen });
    }
  }
  return out;
}

/** "run_2026-10-05_015417" → "2026-10-05". */
function runDateOf(name) { const m = String(name).match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ''; }

/** The whole run. */
function diffRun(dirName) {
  const runs = allRuns();
  const self = runs.find(r => r.name === dirName);
  const abs = self ? self.abs : path.join(OUTPUT_DIR, dirName);
  const file = path.join(abs, RAW_CSV);
  if (!fs.existsSync(file)) return { error: `No ${RAW_CSV} in ${dirName}.` };
  const rows = C.readProForma(file);
  const log = readLogs(abs);
  const venues = [...new Set(rows.map(r => s(r.venue_code)).filter(Boolean))];
  return { run: dirName, venues: venues.map(v =>
    diffVenue(v, rows.filter(r => s(r.venue_code) === v), withLog(previousRowsFor(path.basename(abs), v, runs)), log, runDateOf(dirName))) };
}
function withLog(prev) {
  if (prev && prev.abs) prev.log = readLogs(prev.abs);
  return prev;
}

function report(res, say = console.log) {
  if (res.error) { say(res.error); return; }
  const all = res.venues;
  const unexplained = all.flatMap(v => v.gone.filter(g => !g.proven).map(g => ({ v: v.venue, ...g })));
  const stopped = all.flatMap(v => v.ruleStopped.map(x => ({ v: v.venue, ...x })));
  say(`\nCHANGES SINCE EACH VENUE'S LAST RUN — ${res.run}`);
  say(`Matched by address. A cause marked (log) or (note) is read from the run itself; UNEXPLAINED needs a session.\n`);
  for (const v of all) {
    const head = v.prevRun ? `${v.prev} → ${v.now} rows (last: ${v.prevRun})` : `${v.now} rows (first run with rows)`;
    const lines = [];
    for (const g of v.gone) lines.push(`  GONE      "${g.title}" (${g.start || '?'} → ${g.end || '?'}) — ${g.cause}\n            ${g.url}`);
    for (const m of v.moved) lines.push(`  MOVED     "${m.prevTitle}"${m.prevTitle !== m.title ? ` → "${m.title}"` : ''} — new address; the app will see a NEW row\n            ${m.from}\n         -> ${m.to}`);
    for (const x of v.ruleStopped) lines.push(`  RULE STOPPED "${x.title}" — EXCLUDED last run ("${x.reason}", log), let through now: the rule stopped firing. A fault.`);
    for (const a of v.added) lines.push(`  NEW       "${a.title}" (${a.start || '?'} → ${a.end || '?'}) — ${a.note}`);
    for (const r of v.renamed) lines.push(`  TITLE     "${r.from}" → "${r.to}"${r.onlyCase ? ' (capitals only)' : ''} — a Change card in the app`);
    for (const d of v.redated) lines.push(`  DATES     "${d.title}" ${d.from}  ⇒  ${d.to}`);
    for (const l of v.lostSummary) lines.push(`  LOST TEXT "${l.title}" — ${l.why ? 'its page: ' + l.why + ' (note)' : 'UNEXPLAINED: the note gives no page failure'}`);
    for (const n of v.noSummary) if (!v.lostSummary.some(l => l.url === n.url)) lines.push(`  NO TEXT   "${n.title}" — ${n.why ? 'its page: ' + n.why + ' (note)' : 'never had a description'}`);
    for (const e of v.emptiedPages) lines.push(typeof e.linksSeen === 'string' && e.linksSeen.startsWith('none')
      ? `  EMPTY PAGE "${e.ctx}" brought rows last run; this run ${e.linksSeen.replace('none — ', '')} (log) — a refusal, not an empty page`
      : `  EMPTY PAGE "${e.ctx}" brought rows last run, a marker now; links seen this run: ${e.linksSeen}. Either the venue has nothing there now or the page changed — one look at the page settles it.`);
    for (const k of v.keptNoEnd) lines.push(`  KEPT BY RULE "${k.title}" opened ${k.start}, no closing date — kept and flagged under the lookback rule (§3), not junk`);
    for (const d of v.sameName) lines.push(`  SAME NAME "${d.title}" at two addresses — kept by design (no de-duplication); the app shows both\n            ${d.urls.join('\n            ')}`);
    for (const j of v.junk) lines.push(`  JUNK?     "${j.title}" — ${j.kinds.join(', ')}: "${j.text}${j.text.length >= 160 ? '…' : ''}"`);
    say(`${v.venue.padEnd(14)} ${head}${lines.length ? '' : ' — nothing changed'}`);
    for (const l of lines) say(l);
  }
  if (stopped.length) say(`\nRULE STOPPED FIRING — ${stopped.length} row(s) a ruling excluded last run are back. A fault at each venue:\n`
    + [...new Set(stopped.map(x => x.v))].map(v => `  ${v.padEnd(14)} ${stopped.filter(x => x.v === v).length} row(s)`).join('\n'));
  say(unexplained.length
    ? `\nUNEXPLAINED — ${unexplained.length}. Each needs a cause before the report is finished:\n` + unexplained.map(u => `  ${u.v.padEnd(14)} "${u.title}"`).join('\n')
    : '\nUNEXPLAINED — none: every row that left has a cause from the run itself.');
}

module.exports = { diffRun, diffVenue, readLogs, junkIn, sameName, pageFailure, report };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.log('usage: node scraper/sweep_diff.js <run directory name> [--json]'); process.exit(1); }
  const res = diffRun(dir);
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else report(res);
  process.exit(res.error ? 1 : 0);
}
