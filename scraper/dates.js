/**
 * dates.js — THE date reader, shared by the scraper and the app (one copy: two parsers
 * drifted apart twice and lost dates). `node build/sync_shared.js` writes everything
 * above module.exports into Cat_Watch.jsx, and `npm test` fails if they differ. Edit
 * HERE, then run the sync. Pure: nothing above module.exports may use Node.
 * Formats and their reasons: docs/scraper.md §3.
 */
'use strict';

// ── Date helpers ──────────────────────────────────────────────────────────────
// Every month spelling a venue has used, in one shared map (docs/scraper.md §3).
const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,

  // Italian, for the five Italian venues ("11 maggio-12 giugno 2025"). gennaio/giugno
  // and marzo/maggio differ late, so abbreviations stay long enough to be unambiguous.
  gennaio:1, febbraio:2, marzo:3, aprile:4, maggio:5, giugno:6,
  luglio:7, agosto:8, settembre:9, ottobre:10, novembre:11, dicembre:12,
  genn:1, febbr:2, magg:5, giu:6, lug:7, ago:8, sett:9, ott:10, dic:12,

  // Three-letter Italian forms ("10 set 2026 - 22 nov 2026", the Accademia).
  set:9, gen:1, mag:5,

  // A venue's own misspelling (Jacquemart-André, "Feburary").
  feburary:2 };

/**
 * A weekday in front of a date. Longest alternative first ("sat" before "saturday"
 * leaves "urday"), and anchored on a following day or month, so "the Sun King" is safe.
 */
const WEEKDAY_PREFIX_SRC =
  '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
  '|thurs|thur|tues|weds|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';

// Ordinal days ("May 23rd", Orsay's cards): both parsers drop the suffix first.
const ORDINAL_SUFFIX = /\b(\d{1,2})(?:st|nd|rd|th)\b/gi;

// One month pattern for every parser; long names first, a trailing full stop allowed
// ("Sept."). The (?![A-Za-z]) is load-bearing: without it "7 November 2025" can match
// as "7 Nov" + "ember 2025", silently defeating any lookahead after it.
const MONTH_PATTERN =
  '(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December' +
  '|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec' +
  // Longest first within each language: sett before set, genn before gen, magg before mag.
  '|genn|febbr|magg|giu|lug|ago|sett|ott|dic|set|gen|mag)\\.?(?![A-Za-z])';

// Month name to number, tolerating the trailing full stop the pattern allows.
function monthNum(name) {
  return MONTHS[String(name || '').toLowerCase().replace(/\.$/, '')];
}

/**
 * YYYY-MM-DD only when the day exists: JavaScript rolls 2026-02-31 into March, a
 * plausible wrong date. Otherwise '' and the notes say why.
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
 * The opening year when the venue printed the year only on the closing side: a range
 * running backwards within one year crosses new year ("December 5 - January 20, 2026"
 * opened in 2025).
 */
function startYearFor(startMo, startDay, endMo, endDay, endYear) {
  const backwards = startMo > endMo || (startMo === endMo && startDay > endDay);
  return backwards ? endYear - 1 : endYear;
}

function parseMonthDay(str, fallbackYear) {
  // e.g. "March 2", "July 26, 2026", "Sept. 21, 2024" — the full stop allowed, as
  // MONTH_PATTERN allows it.
  const m = str.trim().match(/^([A-Za-z]+\.?)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const mo = monthNum(m[1]);
  if (!mo) return null;
  const yr = m[3] ? parseInt(m[3], 10) : fallbackYear;
  if (!yr) return null;
  return ymd(yr, mo, m[2]) || null;
}

// Range separators, shared by both parsers (they once drifted): "-", "to", "till",
// "until", "through", Dutch "t/m", Italian "al" and its elisions "all'"/"alle"/"allo".
// Longest alternative first, or "al" eats "all'8". A comma may sit before the
// separator ("From May 16, 2025, to May 17, 2027" — Brera).
const RANGE_SEP = "\\s*,?\\s*(?:-|t/m|to|till|until|through|all['\u2019]|all[oe]|al)\\s*";

const WEEKDAY_PREFIX = new RegExp(WEEKDAY_PREFIX_SRC + '(?=\\d|' + MONTH_PATTERN + ')', 'gi');
const stripWeekdays = t => String(t || '').replace(WEEKDAY_PREFIX, '');

/**
 * A run extended after it was announced ("extended to02/11/2025", Uffizi; "prorogata
 * al 9 giugno 2026", Capodimonte) — a general museum fact, so in the shared parser.
 */
const EXTENDED_TO = new RegExp(
  // The trigger is the word, verb or noun; a few words may sit between it and the
  // separator, never a full stop.
  '(?:extend(?:ed|ing)?|extension|prorogat[ao])[^.]{0,30}?' +
  // Longest alternative first, or "al" matches the start of "all'8".
  '(?:through|until|to|all[\'\u2019]|alla|al)\\s*' +
  '(' +
    '\\d{1,2}\\s*[/.]\\s*\\d{1,2}\\s*[/.]\\s*\\d{4}' +      // 02/11/2025
    '|\\d{1,2}\\s+' + MONTH_PATTERN + '(?:\\s+\\d{4})?' +          // 9 giugno 2026
    '|' + MONTH_PATTERN + '\\s+\\d{1,2}(?:,?\\s*\\d{4})?' +        // October 11
  ')', 'i');

/** Apply an extension: it only ever moves the closing date LATER, so a stray match cannot shorten a run. */
function applyExtension(range, text) {
  if (!range || !range.end || !text) return range;
  const t = String(text);
  const m = EXTENDED_TO.exec(t);
  if (!m) return range;

  const dm = readDayMonth(m[1]);
  if (!dm) return range;
  let { day, mon, year } = dm;
  const quote = frag(m);

  // No year on the extension: take it from the closing date written just before the
  // trigger, crossing into the next year only if earlier ("until 20 December, extended
  // to 18 January"). Never roll the range's own closing date forward — it may already
  // be the extension (Capodimonte's header put Gricci and Lotto a year late).
  if (!year) {
    const before = precedingDate(t.slice(0, m.index), range.end);
    if (before) {
      year = Number(before.slice(0, 4));
      if (ymd(year, mon, day) <= before) year += 1;
    } else {
      // Nothing to anchor on: the closing date's own year, taken only if that
      // is later. Otherwise the year is unknown and the note says so.
      year = Number(range.end.slice(0, 4));
      const same = ymd(year, mon, day);
      if (same && same < range.end) return { ...range, extensionUnclear: quote };
    }
  }
  const iso = ymd(year, mon, day);
  // Only ever LATER. The same date is the header repeating itself; an earlier
  // one is an older extension the header has overtaken.
  if (!iso || iso <= range.end) return range;
  return { ...range, end: iso, extendedFrom: range.end, extendedRaw: quote };
}

/** "11 novembre", "October 11", "02/11/2025" → { day, mon, year (0 if none) }. */
function readDayMonth(s) {
  const M = MONTH_PATTERN;
  const numeric = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})$/);
  if (numeric) return { day: +numeric[1], mon: +numeric[2], year: +numeric[3] };  // day-first everywhere seen
  const dayFirst = s.match(new RegExp(`^(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?$`, 'i'));
  if (dayFirst) return ok(+dayFirst[1], monthNum(dayFirst[2]), +(dayFirst[3] || 0));
  const monthFirst = s.match(new RegExp(`^(${M})\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?$`, 'i'));
  if (monthFirst) return ok(+monthFirst[2], monthNum(monthFirst[1]), +(monthFirst[3] || 0));
  return null;
  function ok(day, mon, year) { return day && mon ? { day, mon, year } : null; }
}

/**
 * The date an extension replaces: the LAST day-and-month in the same passage
 * before the trigger — back to the previous full stop, at most 80 characters.
 * Its own year if printed; otherwise the closing date's year, or the year
 * before when that would put it after the closing date. '' if there is none.
 */
function precedingDate(before, closing) {
  const M = MONTH_PATTERN;
  const tail = before.slice(-80).split(/\.\s/).pop();
  const re = new RegExp(`(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?|(${M})\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?`, 'gi');
  let last = null, x;
  while ((x = re.exec(tail))) last = x;
  if (!last) return '';
  const day = +(last[1] || last[5]), mon = monthNum(last[2] || last[4]);
  let year = +(last[3] || last[6] || 0);
  if (!day || !mon) return '';
  if (!year) {
    year = Number(closing.slice(0, 4));
    if (ymd(year, mon, day) > closing) year -= 1;
  }
  return ymd(year, mon, day) || '';
}

/** The one note for an extension, on every path: where the new date came from. */
function extensionNote(range) {
  if (range.extendedFrom) {
    return `Closing date extended from ${dayText(range.extendedFrom)} to ${dayText(range.end)}: "${range.extendedRaw}".`;
  }
  if (range.extensionUnclear) {
    return `An extension is mentioned but its year is not stated, so the closing date was left as published: "${range.extensionUnclear}".`;
  }
  return '';
}

function dayText(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
}

// Read docs/scraper.md §3 before changing this parser: every format found in the wild,
// the guards against art-history dates, and why `looseSingles` exists.
// opts.looseSingles: true for a listing card (a short string about one show); false for
// page text, where loose patterns are a lottery (a 1994 photo caption once became a 2024
// show's opening date).
function findDateRange(raw, opts = {}) {
  return applyExtension(findDateRangeCore(raw, opts), raw);
}

function findDateRangeCore(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash (the National Gallery mixes U+2012 and U+2013).
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    // Weekdays carry no date and break every range pattern (Wallace), so they go first.
    .replace(WEEKDAY_PREFIX, '')
    .replace(ORDINAL_SUFFIX, '$1')
    .replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // All-numeric range, its order PROVED from the numbers: a component over 12 decides
  // day-first or month-first for both ends; neither proves it → refused (Uffizi).
  // Listing cards only (looseSingles) — on a page it read a sidebar's dates.
  const num = looseSingles && s.match(new RegExp(
    `\\b(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})${RANGE_SEP}(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})\\b`));
  if (num) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(num[i]));
    const dayFirst   = a1 > 12 || a2 > 12;
    const monthFirst = b1 > 12 || b2 > 12;
    if (dayFirst !== monthFirst && plausibleYear(y1) && plausibleYear(y2)) {
      const start = dayFirst ? ymd(y1, b1, a1) : ymd(y1, a1, b1);
      const end   = dayFirst ? ymd(y2, b2, a2) : ymd(y2, a2, b2);
      const r = sane(start, end, frag(num));
      if (r.start || r.end) return r;
    }
  }

  // Day-first European form, as used by Borghese and the National Gallery:
  // "1 November 2025 to 11 January 2026", "19 June till 13 September 2026".
  let dm = s.match(new RegExp(`(\\d{1,2})\\s+(${M})\\s*(\\d{4})?${RANGE_SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      // A published opening year that fails the plausibility check refuses the WHOLE
      // range, never swapped for the closing year (an artist's lifespan, Mimmo Jodice).
      if (dm[3] && !plausibleYear(dm[3])) return { start: '', end: '', raw: '' };
      const startYr = dm[3] ? parseInt(dm[3], 10)
                            : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(dm));
    }
  }

  // "Month D, YYYY - Month D, YYYY" — year on both sides
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return sane(parseMonthDay(titleCase(m[1]), null) || '', parseMonthDay(titleCase(m[2]), null) || '', frag(m));

  // "Month D - Month D, YYYY": the opening year is worked out (startYearFor).
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(${M})\\s+(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[5])) {
    const endYr = parseInt(m[5], 10);
    const sMo = monthNum(m[1]), eMo = monthNum(m[3]);
    if (sMo && eMo) {
      const sDay = parseInt(m[2], 10), eDay = parseInt(m[4], 10);
      const startYr = startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(m));
    }
  }

  // "Month D - D, YYYY": one month, day only on the closing side (Acquavella).
  m = s.match(new RegExp(`(${M})\\s+(\\d{1,2})${RANGE_SEP}(\\d{1,2}),\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[1]);
    if (mo) return sane(ymd(m[4], mo, m[2]), ymd(m[4], mo, m[3]), frag(m));
  }

  // ── A range whose closing side is not a date ("Aug 1, 2026-Summer 2027", "-ongoing";
  // MoMA). Caught HERE, above the single-date rule, which wrote the opening date into
  // the closing column. Only the opening date is written; the season's year is kept as
  // `latestYear`, a lookback bound. MO-001 to MO-010.
  m = s.match(new RegExp(
    `(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}` +
    `(?:(spring|summer|autumn|fall|winter)\\s+(\\d{4})|(ongoing|present|tbc|tba))`, 'i'));
  if (m) {
    const start = parseMonthDay(titleCase(m[1]), null) || '';
    if (start) {
      const seasonYear = m[3] && plausibleYear(m[3]) ? +m[3] : null;
      return {
        start, end: '',
        ...(seasonYear ? { latestYear: seasonYear } : {}),
        shownText: m[0].trim(),
        shownWhy: m[2]
          ? 'the venue gives a season, not a closing date'
          : 'the venue has not announced a closing date',
        raw: frag(m),
      };
    }
  }

  // ── A month and day, no year, with a preposition ("Through Oct 4", "Ongoing from Oct
  // 19"; MoMA). The year is derived: the next occurrence of that day — a current listing
  // cannot mean last year. `today` is a parameter so fixtures can pin it.
  if (looseSingles) {
    const today = opts.today instanceof Date ? opts.today : new Date();
    const nextOccurrence = (mo, day) => {
      const y = today.getUTCFullYear();
      const thisYear = Date.UTC(y, mo - 1, day);
      const cutoff = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      return thisYear >= cutoff ? y : y + 1;
    };

    m = s.match(new RegExp(`\\b(?:till|until|through|thru)\\s+(${M})\\s+(\\d{1,2})\\b(?!,?\\s*\\d{4})`, 'i'));
    if (m) {
      const mo = monthNum(m[1]), day = parseInt(m[2], 10);
      if (mo) return { start: '', end: ymd(nextOccurrence(mo, day), mo, day), raw: frag(m) };
    }

    m = s.match(new RegExp(`\\b(?:ongoing from|from|opens?|opening)\\s+(${M})\\s+(\\d{1,2})\\b(?!,?\\s*\\d{4})`, 'i'));
    if (m) {
      const mo = monthNum(m[1]), day = parseInt(m[2], 10);
      if (mo) return { start: ymd(nextOccurrence(mo, day), mo, day), end: '', raw: frag(m) };
    }
  }

  // Single "Month D, YYYY" — treat as the end date (open until).
  // Bare, with no preposition to anchor it, so it is a listing-card rule only.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
    if (m) return { start: '', end: parseMonthDay(titleCase(m[1]), null) || '', raw: frag(m) };
  }

  // A single day-first date with a preposition (Rijksmuseum): "till 21 March 2027"
  // closes, "from 9 October 2026" opens. After the range patterns, so a range still wins.
  m = s.match(new RegExp(`\\b(till|until|through|to)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: '', end: ymd(m[4], mo, m[2]), raw: frag(m) };
  }

  // "since", and a day written "11." the German way (KHM). Only WITH a year: the
  // yearless forms below take the NEXT such date, right for "from", wrong for "since".
  m = s.match(new RegExp(`\\b(from|since|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\.?\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: ymd(m[4], mo, m[2]), end: '', raw: frag(m) };
  }

  // "Month YYYY" / "Month / YYYY" (Borghese): a start month, end unknown. The loosest
  // rule in the file — listing cards only.
  if (looseSingles) {
    m = s.match(new RegExp(`(${M})\\s*\\/?\\s*(\\d{4})`, 'i'));
    if (m && plausibleYear(m[2])) {
      const mo = monthNum(m[1]);
      // No day is written (never the 1st — that invents a date); the year is kept as a
      // lookback bound.
      if (mo) return {
        start: '', end: '', latestYear: +m[2],
        shownText: m[0].trim(),
        shownWhy: 'no day is published, only the month and year',
        raw: frag(m),
      };
    }
  }

  // A season and a year ("Summer 2022"): never a date, but a published bound (latestYear).
  if (looseSingles) {
    m = s.match(/\b(?:spring|summer|autumn|fall|winter)\s+(\d{4})\b/i);
    if (m && plausibleYear(m[1])) return {
      start: '', end: '', latestYear: +m[1],
      shownText: m[0].trim(),
      shownWhy: 'only a season and a year are published',
      raw: frag(m),
    };
  }

  return { start: '', end: '', raw: '' };
}

// Plausible exhibition years: wide enough for any archive a venue still lists, narrow
// enough that a lifespan ("Caravaggio (1571-1610)") never reads as a run.
const PLAUSIBLE_YEAR_MIN = 1990;
const PLAUSIBLE_YEAR_MAX = 2035;

function plausibleYear(y) {
  const n = parseInt(y, 10);
  return n >= PLAUSIBLE_YEAR_MIN && n <= PLAUSIBLE_YEAR_MAX;
}

// The note quotes each branch's own MATCH, capped (frag), never its input — a whole
// page once landed in one note. Q-100 to Q-102.
function frag(m) { return m && m[0] ? String(m[0]).replace(/\s+/g, ' ').trim().slice(0, 120) : ''; }

// A range that runs backwards keeps only its end date (the lookback tests the end).
function sane(start, end, raw) {
  if (start && end && start > end) return { start: '', end, raw };
  return { start, end, raw };
}

/**
 * A day and month printed with NO year (Rijksmuseum's past pages): unusable, but the
 * note says it was there rather than "no date found". Requiring the year to be ABSENT
 * keeps photo captions ("April 1994") out.
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

/**
 * Find an exhibition's run inside prose ("From June 10 to September 14, 2025, Galleria
 * Borghese presents…"). Guards: a month NAME beside the number, and a plausible year.
 * hintYear supplies a missing year from the listing. Returns the matched sentence, so a
 * wrong grab shows in the notes.
 */
function findDateRangeInProse(text, hintYear) {
  // The extension rule runs here too: the parsers must not diverge (Giorgio Armani's
  // extended run lost its opening date when only one knew about extensions).
  return applyExtension(findDateRangeInProseCore(text, hintYear), text);
}

function findDateRangeInProseCore(text, hintYear) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(ORDINAL_SUFFIX, '$1').replace(/\s+/g, ' ');
  const M = MONTH_PATTERN;
  const SEP = '(?:\\s*(?:-|t/m|to|until|through|till)\\s*(?:running\\s+)?)';

  // Day-first, as Borghese writes its prose ("From 20 January to 22 February 2026");
  // the year on the end side only, or on both.
  let dm = s.match(new RegExp(
    `(\\d{1,2})\\s+(${M})(?:\\s+(\\d{4}))?[^.]{0,40}?${SEP}(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (dm && plausibleYear(dm[6])) {
    const endYr = parseInt(dm[6], 10);
    const sMo = monthNum(dm[2]), eMo = monthNum(dm[5]);
    if (sMo && eMo) {
      const sDay = parseInt(dm[1], 10), eDay = parseInt(dm[4], 10);
      // See the note in findDateRange: a published-but-implausible opening year
      // refuses the range rather than being replaced by the closing year.
      if (dm[3] && !plausibleYear(dm[3])) return { start: '', end: '', raw: '' };
      const startYr = dm[3] ? parseInt(dm[3], 10)
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
      // Same rule for the month-first form: "Mimmo Jodice (March 29, 1934 -
      // October 27, 2025)" must refuse, not borrow the closing year.
      if (m[3] && !plausibleYear(m[3])) return { start: '', end: '', raw: '' };
      const startYr = m[3] ? parseInt(m[3], 10)
                           : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), m[0].slice(0, 120));
    }
  }

  // Day-first, no year anywhere ("5 June to 25 October", Rijksmuseum): only with the
  // listing's year.
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
    one = s.match(new RegExp(`\\b(from|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\.?\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
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

  // Last resort: the listing parser's CORE (ranges and preposition dates only), so any
  // pattern either parser knows serves both. The core, not the wrapper — applying the
  // extension twice put Gricci and Lotto a year late.
  const viaListing = findDateRangeCore(s, { looseSingles: false });
  if (viaListing.start || viaListing.end) return viaListing;

  return { start: '', end: '', raw: '' };
}

function titleCase(str) {
  return str.replace(/([A-Za-z]+)/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

module.exports = {
  MONTHS,
  WEEKDAY_PREFIX_SRC,
  ORDINAL_SUFFIX,
  MONTH_PATTERN,
  monthNum,
  ymd,
  startYearFor,
  parseMonthDay,
  RANGE_SEP,
  WEEKDAY_PREFIX,
  stripWeekdays,
  EXTENDED_TO,
  applyExtension,
  readDayMonth,
  precedingDate,
  extensionNote,
  dayText,
  findDateRange,
  findDateRangeCore,
  PLAUSIBLE_YEAR_MIN,
  PLAUSIBLE_YEAR_MAX,
  plausibleYear,
  frag,
  sane,
  unusableDateText,
  findDateRangeInProse,
  findDateRangeInProseCore,
  titleCase,
};
