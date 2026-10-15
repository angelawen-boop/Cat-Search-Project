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
const FLOOR = '2024-07-01';                         // docs/import_csv.md, the lookback
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
  { kind: 'restaurant or visiting line', re: /\b(set menu|two courses|our restaurant|book a table|members go free|opening hours)\b/i },
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
    keptNoEnd: [], sameName: [], junk: [], emptiedPages: [], ruleStopped: [], worseText: [], addressLeft: [],
    // Every marker row, whatever the last run brought (Frick 15 Oct: a refused page that had none).
    markers: markers.map(m => ({ title: m.title, url: m.url, note: s(m.notes).replace(MARKER_SENTINEL, '').trim() })) };

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
      // Text that got much SHORTER, or turned into junk: National Gallery, 5 Oct —
      // 850 characters of description became one catalogue sales line.
      else if (s(p.summary) && s(n.summary) !== s(p.summary)) {
        const shrank = s(n.summary).length < s(p.summary).length / 2;
        const turned = junkIn(n.summary).filter(k => !junkIn(p.summary).includes(k));
        if (shrank || turned.length) out.worseText.push({ title: n.title, url: n.url,
          from: s(p.summary).length, to: s(n.summary).length, turned });
      }
      continue;
    }
    const ex = excl.find(e => sameName(e.title, p.title));
    const mv = newOnes.find(r => !pairedNew.has(r) && sameName(r.title, p.title));
    // The show is still in at an address it already had: one of its two addresses left (Brera 15 Oct).
    const twin = now.find(r => byUrlPrev.has(s(r.url)) && squash(r.title) === squash(p.title));
    let cause, proven = true;
    if (ex) cause = `excluded this run — "${ex.reason}" (log)`;
    else if (mv) { pairedNew.add(mv); out.moved.push({ title: mv.title, from: p.url, to: mv.url, prevTitle: p.title,
      card: linkCardFor(p, mv) }); continue; }
    else if (twin) { out.addressLeft.push({ title: p.title, url: p.url, stays: twin.url }); continue; }
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

/**
 * Which card a moved show should bring: the app pairs a row with the same name and
 * overlapping dates (sameExhibition in Cat_Watch.jsx) and offers its new link as a
 * Change. Judged against the last run's row — her ledger is not read here.
 */
function linkCardFor(p, n) {
  if (squash(p.title) !== squash(n.title)) return 'new';
  const full = r => s(r.start_date) && s(r.end_date);
  if (full(p) && full(n)) return s(p.start_date) <= s(n.end_date) && s(n.start_date) <= s(p.end_date) ? 'change' : 'new';
  return full(p) || full(n) ? 'change' : 'new';
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

/** "2025-11-11 → ?" → ['2025-11-11', '']. */
const datePair = t => String(t).split(' → ').map(x => (x === '?' ? '' : x));

/**
 * Every change, sorted into the report's nine groups (her order, docs/sweep_operation.md).
 * Each line starts with its venue and keeps its tag (GONE, TITLE…) for the QC step.
 */
function groupChanges(res) {
  const G = [
    [1, 'NEW SHOWS'], [2, 'YOUR FIXES / DECISIONS NOW REFLECTED'], [3, 'MISSING SHOWS'],
    [4, 'CHANGED TITLES'], [5, 'CHANGED LINKS'], [6, 'NEW DATES'], [7, 'CHANGED DATES'],
    [8, 'DESCRIPTION PROBLEMS'], [9, 'OTHERS'],
  ].map(([n, heading]) => ({ n, heading, lines: [] }));
  const put = (n, v, text) => G[n - 1].lines.push(`  ${v.venue.padEnd(13)} ${text}`);
  for (const v of res.venues) {
    for (const g of v.gone) put(/excluded this run/.test(g.cause) ? 2 : 3, v,
      `GONE      "${g.title}" (${g.start || '?'} → ${g.end || '?'}) — ${g.cause}\n                ${g.url}`);
    for (const e of v.emptiedPages) put(3, v, typeof e.linksSeen === 'string' && e.linksSeen.startsWith('none')
      ? `EMPTY PAGE "${e.ctx}" brought rows last run; this run ${e.linksSeen.replace('none — ', '')} (log) — a refusal, not an empty page`
      : `EMPTY PAGE "${e.ctx}" brought rows last run, a marker now; links seen this run: ${e.linksSeen}. Either the venue has nothing there now or the page changed — one look at the page settles it.`);
    for (const r of v.renamed) put(4, v, `TITLE     "${r.from}" → "${r.to}"${r.onlyCase ? ' (capitals only)' : ''} — a Change card in the app`);
    for (const m of v.moved) put(5, v, `MOVED     "${m.prevTitle}"${m.prevTitle !== m.title ? ` → "${m.title}"` : ''} — new address; ${m.card === 'change'
      ? 'expect a Change card for the link (same name, dates overlap)'
      : 'expect a NEW card (the name or dates no longer pair it)'}\n                ${m.from}\n             -> ${m.to}`);
    for (const d of v.redated) {
      const [a, b] = [datePair(d.from), datePair(d.to)];
      const onlyFilled = [0, 1].every(i => !a[i] || a[i] === b[i]) && [0, 1].some(i => !a[i] && b[i]);
      put(onlyFilled ? 6 : 7, v, `DATES     "${d.title}" ${d.from}  ⇒  ${d.to}`);
    }
    for (const w of v.worseText) put(8, v, `WORSE TEXT "${w.title}" — description ${w.from} → ${w.to} characters${w.turned.length ? '; now reads as ' + w.turned.join(', ') : ''}. A fault: last run had better text`);
    for (const l of v.lostSummary) put(8, v, `LOST TEXT "${l.title}" — ${l.why ? 'its page: ' + l.why + ' (note)' : 'UNEXPLAINED: the note gives no page failure'}`);
    for (const n of v.noSummary) if (!v.lostSummary.some(l => l.url === n.url)) put(8, v, `NO TEXT   "${n.title}" — ${n.why ? 'its page: ' + n.why + ' (note)' : 'never had a description'}`);
    for (const j of v.junk) put(8, v, `JUNK?     "${j.title}" — ${j.kinds.join(', ')}: "${j.text}${j.text.length >= 160 ? '…' : ''}"`);
    for (const a of v.added) put(1, v, `NEW       "${a.title}" (${a.start || '?'} → ${a.end || '?'}) — ${a.note}`);
    for (const x of v.ruleStopped) put(1, v, `RULE STOPPED "${x.title}" — EXCLUDED last run ("${x.reason}", log), let through now: the rule stopped firing. A fault.`);
    for (const m of v.markers) if (!v.emptiedPages.some(e => e.url === m.url)) put(9, v, `MARKER    ${m.title} — ${m.note}`);
    for (const x of v.addressLeft) put(9, v, `ADDRESS LEFT "${x.title}" — last run had it at two addresses; one left, the show is still in\n                gone: ${x.url}\n                stays: ${x.stays}`);
    for (const k of v.keptNoEnd) put(9, v, `KEPT BY RULE "${k.title}" opened ${k.start}, no closing date — kept and flagged under the lookback rule (docs/import_csv.md), not junk`);
    for (const d of v.sameName) put(9, v, `SAME NAME "${d.title}" at two addresses — kept by design (no de-duplication); the app shows both\n                ${d.urls.join('\n                ')}`);
  }
  return G;
}

function report(res, say = console.log) {
  if (res.error) { say(res.error); return; }
  const all = res.venues;
  const unexplained = all.flatMap(v => v.gone.filter(g => !g.proven).map(g => ({ v: v.venue, ...g })));
  const stopped = all.flatMap(v => v.ruleStopped.map(x => ({ v: v.venue, ...x })));
  say(`\nCHANGES SINCE EACH VENUE'S LAST RUN — ${res.run}`);
  say(`Matched by address. A cause marked (log) or (note) is read from the run itself; UNEXPLAINED needs a session.`);
  const changed = all.filter(v => v.prevRun && v.prev !== v.now).map(v => `${v.venue} ${v.prev} → ${v.now}`);
  const fresh = all.filter(v => !v.prevRun).map(v => `${v.venue} ${v.now} (first run with rows)`);
  say(`Row counts that moved: ${[...changed, ...fresh].join(', ') || 'none'}.\n`);
  for (const g of groupChanges(res)) {
    if (!g.lines.length) continue;
    say(`${g.n}. ${g.heading}`);
    for (const l of g.lines) say(l);
    say('');
  }
  if (stopped.length) say(`\nRULE STOPPED FIRING — ${stopped.length} row(s) a ruling excluded last run are back. A fault at each venue:\n`
    + [...new Set(stopped.map(x => x.v))].map(v => `  ${v.padEnd(14)} ${stopped.filter(x => x.v === v).length} row(s)`).join('\n'));
  say(unexplained.length
    ? `\nUNEXPLAINED — ${unexplained.length}. Each needs a cause before the report is finished:\n` + unexplained.map(u => `  ${u.v.padEnd(14)} "${u.title}"`).join('\n')
    : '\nUNEXPLAINED — none: every row that left has a cause from the run itself.');
}

module.exports = { diffRun, diffVenue, readLogs, junkIn, sameName, pageFailure, groupChanges, report };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.log('usage: node scraper/sweep_diff.js <run directory name> [--json]'); process.exit(1); }
  const res = diffRun(dir);
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else report(res);
  process.exit(res.error ? 1 : 0);
}
