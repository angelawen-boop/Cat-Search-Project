//@ The date reader and summary rules, written by build/sync_shared.js from the scraper. Never edit by hand.
//@piece SHARED


// ===== SHARED WITH THE SCRAPER — written by `node build/sync_shared.js`; never edit between these markers. Edit scraper/dates.js or scraper/compress_prompt.md, then run it. =====
const DATES=(()=>{
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

  // French ("Du 2 mars au 19 mai 2024", Chantilly), with and without accents.
  janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6, juillet:7, août:8, aout:8,
  septembre:9, octobre:10, décembre:12, decembre:12, janv:1, févr:2, fevr:2, avr:4, juil:7, déc:12,

  // German ("30. Juni 2024 – 5. Januar 2025", Emil Schumacher Museum), Austrian "Jänner" too.
  januar:1, jänner:1, februar:2, märz:3, maerz:3, juni:6, juli:7, oktober:10, dezember:12, okt:10, dez:12,

  // A venue's own misspelling (Jacquemart-André, "Feburary").
  feburary:2 };

/**
 * A weekday in front of a date. Longest alternative first ("sat" before "saturday"
 * leaves "urday"), and anchored on a following day or month, so "the Sun King" is safe.
 */
const WEEKDAY_PREFIX_SRC =
  '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
  '|thurs|thur|tues|weds|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';

// Ordinal days ("May 23rd", Orsay's cards; French "1er"): both parsers drop the suffix first. A suffix
// set apart by a space ("September 29 th 2012", the Correr's archive) only in small letters, so "5 St"
// (a saint, a street) stays.
const ORDINAL_SUFFIX = /\b(\d{1,2})(?:[sS][tT]|[nN][dD]|[rR][dD]|[tT][hH]|[eE][rR]| (?:st|nd|rd|th))\b/g;

// One month pattern for every parser; long names first, a trailing full stop allowed
// ("Sept."). The (?![A-Za-z]) is load-bearing: without it "7 November 2025" can match
// as "7 Nov" + "ember 2025", silently defeating any lookahead after it.
const MONTH_PATTERN =
  '(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December' +
  '|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre'
  + '|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|décembre|decembre' +
  '|januar|jänner|februar|märz|maerz|juni|juli|oktober|dezember' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec' +
  // Longest first within each language: sett before set, genn before gen, magg before mag.
  '|genn|febbr|magg|giu|lug|ago|sett|ott|dic|set|gen|mag|janv|févr|fevr|avr|juil|déc|okt|dez)\\.?(?![A-Za-z])';

// A German day is written with a full stop ("30. Juni"): the stop leaves before a month name.
const GERMAN_DAY_DOT = new RegExp('(?<![\\d.])(\\d{1,2})\\.\\s*(?=(?:januar|jänner|februar|märz|maerz|april|mai|juni|juli|august'
  + '|september|oktober|november|dezember|okt|dez)\\.?(?![A-Za-zäöü]))', 'gi');

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
// "until", "through", Dutch "t/m", Italian "al" and its elisions "all'"/"alle"/"allo", French "au".
// Longest alternative first, or "al" eats "all'8". A comma may sit before the
// separator ("From May 16, 2025, to May 17, 2027" — Brera).
const RANGE_SEP = "\\s*,?\\s*(?:-|t/m|to|till|until|through|all['\u2019]|all[oe]|al|au)\\s*";

// ── Day first or month first ── A date written only in numbers ("4/2/2019") is read in an order the
// numbers settle (a number over 12 cannot be a month) or, when they cannot, in the order recorded here
// for its venue. Each venue's order comes from its own pages; a venue not listed whose numbers cannot
// settle it gets ORDER_UNKNOWN_NOTE, and a session records its order (her design; docs/scraper.md §3).
const DATE_ORDER = {
  // Swept venues.
  uffizi: 'day',                                // "From 18/06/2025 to 28/09/2025"
  // Link venues.
  'occ-museodelprado-es': 'month',              // "6/9/2026 - 9/27/2026"
  'occ-smb-museum': 'day',                      // "14.05.2027 to 12.09.2027"
  'occ-alte-nationalgalerie': 'day',            // "19.03.2027 to 01.08.2027"
  'occ-neue-nationalgalerie': 'day',            // "20.03.2026 to 09.08.2026"
  'occ-alte-pinakothek': 'day',                 // "27.10.2023-04.02.2024"
  'occ-pinakothek-der-moderne': 'day',          // "10/07/2026 - 04/10/2026", "09.10.2026-21.02.2027"
  'occ-sammlung-schack': 'day',                 // "14.10.2027-13.02.2028"
  'occ-gemaeldegalerie-skd-museum': 'day',      // "14/04/2022—31/07/2022"
  'occ-kunstmuseumbasel-ch': 'day',             // "25.05.–24.11.2024"
  'occ-kunsthaus-ch': 'day',                    // "Until 25.10.2026"
  'occ-louisiana-dk': 'day',                    // "11.10.24 - 27.4.25"
  'occ-mskgent-be': 'day',                      // "01.02 – 30.04.20"
  'occ-approfondimentimostre-com': 'day',       // "22.05.2008 | 14.08.2008"
  'occ-modernamuseet-se': 'day',                // "16.2–26.5 2013", "8.10 2011–15.1 2012"
};
// Venues that write day.month with the year after a space, on the closing side or both
// ("16.2–26.5 2013", "8.10 2011–15.1 2012" — Moderna Museet). A venue rule (her decision: a
// venue's fault gets that venue's rule), so it reads nowhere else. DS-012.
const SPACED_YEAR_VENUES = new Set(['occ-modernamuseet-se']);
const ORDER_UNKNOWN_NOTE = "Dates not yet read \u2014 confirm whether the venue's date format is day first or month first.";

/**
 * 'day' or 'month' for numeric [first, second] pairs: settled by a number over 12, else the venue's
 * recorded order; 'bad' when the numbers contradict each other, '' when nothing settles it.
 */
function numberOrder(pairs, venue) {
  const dayFirst = pairs.some(([a]) => a > 12), monthFirst = pairs.some(([, b]) => b > 12);
  if (dayFirst && monthFirst) return 'bad';
  if (dayFirst) return 'day';
  if (monthFirst) return 'month';
  return DATE_ORDER[venue] || '';
}
const byOrder = (order, a, b) => order === 'day' ? { day: a, mon: b } : { day: b, mon: a };

const WEEKDAY_PREFIX = new RegExp(WEEKDAY_PREFIX_SRC + '(?=\\d|' + MONTH_PATTERN + ')', 'gi');
const stripWeekdays = t => String(t || '').replace(WEEKDAY_PREFIX, '');
// A clock time, with any time zone: "10:00 am ET", "5pm", "10:30–11 a.m." (Yale prints
// one beside each date, which broke the range). am/pm is required, so a year never matches.
const CLOCK_TIME = /,?\s*\b\d{1,2}(?::\d{2})?\s*(?:-\s*\d{1,2}(?::\d{2})?\s*)?[ap]\.?m\b\.?(?:\s+(?:[ECMP][SD]?T|GMT|BST|CES?T)\b)?/gi;

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
function applyExtension(range, text, venue) {
  if (!range || !range.end || !text) return range;
  const t = String(text);
  const m = EXTENDED_TO.exec(t);
  if (!m) return range;

  const dm = readDayMonth(m[1], venue);
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

/** "11 novembre", "October 11", "02/11/2025" → { day, mon, year (0 if none) }; numbers in the venue's order. */
function readDayMonth(s, venue) {
  const M = MONTH_PATTERN;
  const numeric = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[/.]\s*(\d{4})$/);
  if (numeric) {
    const order = numberOrder([[+numeric[1], +numeric[2]]], venue);
    return order === 'day' || order === 'month' ? { ...byOrder(order, +numeric[1], +numeric[2]), year: +numeric[3] } : null;
  }
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

/**
 * A run cut short ("the COVID-19 crisis forced us to close the exhibition earlier", MSK Ghent): a
 * paragraph that says the show closed early AND gives the run again with the same opening day moves
 * the closing date to that paragraph's. Only ever EARLIER and after the opening, so a museum's
 * early-closing hours, which never restate the run, cannot match.
 */
const CLOSED_EARLY = /\b(?:clos(?:e|ed|ing)|end(?:ed)?|shut)\b[^.]{0,25}\b(?:exhibition|show)\b[^.]{0,25}\b(?:early|earlier|prematurely|ahead of schedule)\b|\b(?:exhibition|show)\b[^.]{0,40}\b(?:closed|ended|shut)\b[^.]{0,25}\b(?:early|earlier|prematurely|ahead of schedule)\b/i;

function closedEarly(range, text, venue) {
  if (!range || !range.start || !range.end || !text) return range;
  for (const para of String(text).split(/\n+/)) {
    const m = CLOSED_EARLY.exec(para);
    if (!m) continue;
    const p = findDateRangeInProseCore(para, range.end.slice(0, 4), venue);
    if (p.start === range.start && p.end && p.end > range.start && p.end < range.end) {
      return { ...range, end: p.end, closedEarlyFrom: range.end, closedEarlyRaw: frag(m) };
    }
  }
  return range;
}

/** The one note for a run cut short, on every path. */
function closedEarlyNote(range) {
  return range && range.closedEarlyFrom
    ? `Closed early on ${dayText(range.end)}, not ${dayText(range.closedEarlyFrom)} as published: "${range.closedEarlyRaw}".`
    : '';
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
// opts.venue: the venue's code, for the order of an all-number date (DATE_ORDER).
// opts.anyYear: no year floor, for date words already cut out of the text (Paste: Claude
// copies them, so a lifespan or a caption cannot be among them).
function findDateRange(raw, opts = {}) {
  if (!opts.anyYear) return applyExtension(findDateRangeCore(raw, opts), raw, opts.venue);
  yearFloor = 1;
  try { return applyExtension(findDateRangeCore(raw, opts), raw, opts.venue); }
  finally { yearFloor = PLAUSIBLE_YEAR_MIN; }
}

function findDateRangeCore(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash (the National Gallery mixes U+2012 and U+2013).
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    .replace(CLOCK_TIME, '')
    // Weekdays carry no date and break every range pattern (Wallace), so they go first.
    .replace(WEEKDAY_PREFIX, '')
    .replace(ORDINAL_SUFFIX, '$1')
    .replace(GERMAN_DAY_DOT, '$1 ')
    .replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // All-numeric ranges, in the order the numbers settle or the venue's recorded order (numberOrder).
  // Unsettled, the result says so (orderUnknown) unless a later pattern reads the text. Slashes on a
  // listing card or a show page's date line only (opts.slashes): on a sweep's page they read a sidebar.
  let unknown = null;
  const numRange = (m, sDay, sMo, eDay, eMo, sYr, eYr) => {
    const order = numberOrder([[sDay, sMo], [eDay, eMo]], opts.venue);
    if (order === 'bad') return null;
    if (!order) { if (!unknown) unknown = { start: '', end: '', orderUnknown: true, shownText: frag(m), raw: frag(m) }; return null; }
    const a = byOrder(order, sDay, sMo), b = byOrder(order, eDay, eMo);
    const startYr = sYr || startYearFor(a.mon, a.day, b.mon, b.day, eYr);
    const r = sane(ymd(startYr, a.mon, a.day), ymd(eYr, b.mon, b.day), frag(m));
    return r.start || r.end ? r : null;
  };
  // Day.month, the year after a space (SPACED_YEAR_VENUES).
  const spaced = SPACED_YEAR_VENUES.has(opts.venue) && s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})(?:\\s+(\\d{4}))?${RANGE_SEP}(\\d{1,2})\\.(\\d{1,2})\\s+(\\d{4})\\b`));
  if (spaced && plausibleYear(+spaced[6]) && (!spaced[3] || plausibleYear(+spaced[3]))) {
    const [a1, b1, a2, b2] = [1,2,4,5].map(i => Number(spaced[i]));
    const r = numRange(spaced, a1, b1, a2, b2, spaced[3] ? +spaced[3] : 0, +spaced[6]);
    if (r) return r;
  }
  // Two-digit years on both sides ("11.10.24 - 27.4.25", Louisiana).
  const dotted2 = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2})${RANGE_SEP}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2})(?![\\d.:])`));
  if (dotted2) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(dotted2[i]));
    const r = numRange(dotted2, a1, b1, a2, b2, 2000 + y1, 2000 + y2);
    if (r) return r;
  }
  // The year on the closing side only ("25.05.–24.11.2024", Kunstmuseum Basel; "01.02 – 30.04.20", MSK Ghent).
  const dottedOpen = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.?${RANGE_SEP}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}\\b|\\d{2}(?![\\d:]|\\.\\d))`));
  const openYr = dottedOpen && (dottedOpen[5].length === 2 ? 2000 + +dottedOpen[5] : +dottedOpen[5]);
  if (dottedOpen && plausibleYear(openYr)) {
    const [a1, b1, a2, b2] = [1,2,3,4].map(i => Number(dottedOpen[i]));
    const r = numRange(dottedOpen, a1, b1, a2, b2, 0, openYr);
    if (r) return r;
  }
  // Full years on both sides, a dash or a bar between ("22.05.2008 | 14.08.2008", the Borghese's archive site).
  const num = s.match(new RegExp(
    `\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})(?:${RANGE_SEP}|\\s*\\|\\s*)(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})\\b`))
    || ((looseSingles || opts.slashes) && s.match(new RegExp(
    `\\b(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})${RANGE_SEP}(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})\\b`)));
  if (num) {
    const [a1, b1, y1, a2, b2, y2] = [1,2,3,4,5,6].map(i => Number(num[i]));
    if (plausibleYear(y1) && plausibleYear(y2)) {
      const r = numRange(num, a1, b1, a2, b2, y1, y2);
      if (r) return r;
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

  // "Month D, YYYY - Month D, YYYY" — year on both sides; the comma may be left out ("September 29 2012 to
  // January 6 2013", the Correr's archive).
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2}(?:,\\s*|\\s+)\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2}(?:,\\s*|\\s+)\\d{4})\\b`, 'i'));
  const withComma = d => titleCase(d).replace(/(\d)\s+(\d{4})$/, '$1, $2');
  if (m) return sane(parseMonthDay(withComma(m[1]), null) || '', parseMonthDay(withComma(m[2]), null) || '', frag(m));

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
  // "Closes 15 November 2026" and Italian "fino al 24 aprile 2026" close too, and so does
  // "Now–" (Cincinnati, Anila Quayyum Agha: the show is already open, its start unprinted).
  m = s.match(new RegExp(`\\b(?:(?:till|until|through|to|closes?|closing|fino\\s+al)\\s+|fino\\s+all['\u2019]\\s*|now\\s*-\\s*)(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[3])) {
    const mo = monthNum(m[2]);
    if (mo) return { start: '', end: ymd(m[3], mo, m[1]), raw: frag(m) };
  }

  // The same with a dotted date: "Until 25.10.2026" (Kunsthaus Zürich), "bis 25.10.2026".
  m = s.match(/\b(?:till|until|through|closes?|closing|bis|fino\s+al)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i);
  if (m && plausibleYear(m[3])) {
    const order = numberOrder([[+m[1], +m[2]]], opts.venue);
    if (order === 'day' || order === 'month') {
      const x = byOrder(order, +m[1], +m[2]);
      return { start: '', end: ymd(m[3], x.mon, x.day), raw: frag(m) };
    }
    if (!order && !unknown) unknown = { start: '', end: '', orderUnknown: true, shownText: frag(m), raw: frag(m) };
  }

  // The same, month first: "Through January 10, 2027", "Closes November 15, 2026".
  m = s.match(new RegExp(`\\b(?:(?:till|until|through|thru|closes?|closing)\\s+|now\\s*-\\s*)(${M})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i'));
  if (m && plausibleYear(m[3])) {
    const mo = monthNum(m[1]);
    if (mo) return { start: '', end: ymd(m[3], mo, m[2]), raw: frag(m) };
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

  return unknown || { start: '', end: '', raw: '' };
}

// Plausible exhibition years: wide enough for any archive a venue still lists, narrow
// enough that a lifespan ("Caravaggio (1571-1610)") never reads as a run.
const PLAUSIBLE_YEAR_MIN = 1990;
const PLAUSIBLE_YEAR_MAX = 2035;
let yearFloor = PLAUSIBLE_YEAR_MIN;   // lowered only while findDateRange runs with anyYear

function plausibleYear(y) {
  const n = parseInt(y, 10);
  return n >= yearFloor && n <= PLAUSIBLE_YEAR_MAX;
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
function findDateRangeInProse(text, hintYear, venue) {
  // The extension rule runs here too: the parsers must not diverge (Giorgio Armani's
  // extended run lost its opening date when only one knew about extensions).
  return applyExtension(findDateRangeInProseCore(text, hintYear, venue), text, venue);
}

function findDateRangeInProseCore(text, hintYear, venue) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(ORDINAL_SUFFIX, '$1').replace(GERMAN_DAY_DOT, '$1 ').replace(/\s+/g, ' ');
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
  const viaListing = findDateRangeCore(s, { looseSingles: false, venue });
  if (viaListing.start || viaListing.end) return viaListing;

  return { start: '', end: '', raw: '' };
}

function titleCase(str) {
  return str.replace(/([A-Za-z]+)/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// ── Titles typed in capitals ──────────────────────────────────────────────────
/**
 * A title a venue TYPES in capitals, in ordinary capitals (the Ashmolean, Borghese,
 * Munich's Pinakotheken by link; docs/scraper.md). Shared with the app, one copy.
 *
 * Only a title with no lower-case word is touched: a word of two or more letters, no
 * digit ("1960s" and "x" are not evidence). Each word: first letter capital, rest small;
 * small joining words and name particles ("da", "van") stay small unless they open the
 * title or follow a colon or dash. Roman numerals stay capitals ("Bandō Tamasaburō V").
 * "20TH-CENTURY" → "20th-Century"; "O'KEEFFE" → "O'Keeffe". A styled name ("Ashmolean
 * NOW") comes out ordinary.
 */
const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'as', 'into', 'over', 'upon', 'via', 'vs', 'x', 'von',
  'van', 'da', 'de', 'di', 'del', 'della', 'du', 'e']);
const ROMAN = /^(?=[IVXLC]+$)C{0,3}(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
function titleFromCaps(title) {
  const t = String(title || '');
  const words = t.match(/[\p{L}\p{N}]+/gu) || [];
  const judged = words.filter(w => w.length >= 2 && !/\d/.test(w));
  if (!judged.length || judged.some(w => w !== w.toUpperCase())) return t;
  let startOfPhrase = true;
  // Word positions, so a token can tell whether it ends its phrase.
  const tokens = t.match(/[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu) || [];
  let at = -1;
  const lastOfPhrase = () => {
    for (let k = at + 1; k < tokens.length; k++) {
      if (/[\p{L}\p{N}]/u.test(tokens[k])) return false;
      if (/[:–—(]|\s-\s/.test(tokens[k])) return true;
    }
    return true;
  };
  return t.replace(/[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu, tok => {
    at++;
    if (!/[\p{L}\p{N}]/u.test(tok)) {
      if (/[:–—]|\s-\s/.test(tok)) startOfPhrase = true;
      return tok;
    }
    const first = startOfPhrase; startOfPhrase = false;
    // A numeral stays capitals: "Bandō Tamasaburō V", "Henry VIII and…".
    // Mid-phrase a single letter is a word, and so are the numeral-shaped
    // names "LI" and "LIV" ("LI JIN" is Li Jin); at a phrase's end they count.
    if (ROMAN.test(tok) && tok !== 'I' && (lastOfPhrase() || (tok.length >= 2 && !/^(LI|LIV)$/.test(tok)))) return tok;
    const low = tok.toLowerCase();
    if (!first && SMALL_WORDS.has(low)) return low;
    // Pieces joined by an apostrophe: O'KEEFFE → O'Keeffe, RUSKIN'S → Ruskin's.
    return low.split(/(['’])/).map((part, i, all) => {
      if (i === 0) return part.replace(/^(\d*)(\p{L})/u, (m, d, c) => d ? d + c : c.toUpperCase());
      if (/['’]/.test(part)) return part;
      return all[0].length === 1 && part.length > 1 ? part[0].toUpperCase() + part.slice(1) : part;
    }).join('');
  }).replace(/(^|[-–])(\p{Ll})/gu, (m, d, c) => d === '' ? m : d + c.toUpperCase())
    .replace(/^(\p{Ll})/u, c => c.toUpperCase());
}

// Capitals judged per part: a title can type its name in capitals and its subtitle in
// ordinary letters ("KABUKI KIMONO: Costumes of Bandō Tamasaburō V"), or the reverse
// ("Rachel Ruysch: NATURE INTO ART").
function capsTitleParts(title) {
  return String(title).split(/(\s*[:–—]\s*)/).map((seg, i) => i % 2 ? seg : titleFromCaps(seg)).join('');
}

// The swept venues that type their titles in capitals (her decisions; docs/venues.md): code writes
// ordinary capitals, and at the Borghese the full stop between name and subtitle becomes an em dash
// ("Louise Bourgeois — Unconscious Memories"). One copy: the sweep's recipes take it (`capsTitleRule`)
// and Add by link files the same title for the same venue.
const SWEPT_CAPS_TITLES = { borghese: { stopToDash: true }, ashmolean: {} };
function capsTitleRule(code) {
  const r = SWEPT_CAPS_TITLES[code];
  return r ? { capsTitles: true, ...(r.stopToDash ? { stopToDash: true } : {}) } : {};
}
// A swept venue's title as the sweep writes it: the em dash first where the venue takes one, then
// ordinary capitals for a title typed wholly in them. Other venues' titles are returned as they are.
function sweptVenueTitle(code, title) {
  const r = SWEPT_CAPS_TITLES[code];
  if (!r || !title) return title;
  return titleFromCaps(r.stopToDash ? String(title).replace(/\.\s+(?=\S)/g, ' — ') : title);
}

// The note on a row with no dates anywhere: the sweep writes it and Add by link copies it word for
// word (her decision).
const NO_DATES_NOTE = "No closing date found anywhere on the venue's pages.";
// The note on a row whose page prints a date it cannot be read as one (months only, a season, no year):
// what the page shows, quoted, and why — the dates left blank, a day never invented. One copy, the sweep's
// and Add by link's.
function shownOnlyNote(shown, why) {
  return `The venue's page shows only "${shown}" for this exhibition's dates — ${why || 'no year is published anywhere'}.`;
}
return { findDateRange, findDateRangeInProse, capsTitleParts, NO_DATES_NOTE, ORDER_UNKNOWN_NOTE, shownOnlyNote, unusableDateText, sweptVenueTitle, closedEarly, closedEarlyNote };
})();
const SUMMARY_OPENING="You are writing very short exhibition summaries for a personal art-catalogue tracker.";const SUMMARY_STUDY="The examples define the style. Study them closely.";
const SUMMARY_RULES="- Maximum 10 words. The examples average about six.\n- End with a full stop. Avoid colons — the accepted summaries almost never use one.\n- Name the artist or artists the exhibition is built around.\n- Say what the exhibition shows, from the text — never the title reworded. The\n  title is shown beside the summary, so a summary that repeats it tells her nothing.\n\nNAME THEM THE WAY A GALLERY-GOER WOULD. Surname alone, unless the surname alone\nwould be ambiguous. Write \"Zurbarán\", not \"Francisco de Zurbarán\". \"Shonibare\",\nnot \"Yinka Shonibare\". \"Velasco\", not \"Mexican artist José María Velasco\". Drop\n\"painter\", \"artist\" and similar labels in front of a name — the reader already\nknows. Full names, honorifics and formal titles read stiff and waste words that\ncould carry meaning instead.\n\nALWAYS WRITE IN ENGLISH, whatever language the raw text is in. Several venues\npublish only in Italian and one only in French; she reads the summaries in\nEnglish. Translating a phrase does not break the traceability rule below — a\ntranslated phrase is still traceable to the text it came from. Keep the\nexhibition's own title in its original language if that is how it is written;\ntranslate the description around it.\n\nTHE RULE THAT MATTERS MOST: every word of your summary must be traceable to a\nphrase in that row's own raw text. If you cannot point to where something came\nfrom, leave it out. In particular:\n\n- Never add an artist, place, medium or date that you happen to know about but the\n  text does not mention.\n- Use a number only if the text states that number. Do not count a list of names\n  and report the total — the page may state a different figure, and the page is\n  right, not your count.\n\nBeing vague is a much smaller failure than being confidently wrong. If the text\nwill only support something general, write something general.\n\nIf the raw text is not a description of an exhibition — a bare link, a curator's\nbiography, ticketing or opening-hours copy, cookie or consent boilerplate, a \"page\nnot found\" message, or empty — answer null for that row. Do not invent one.";
const EN_PREFIX = 'In English: ';
function composeSummary(english, teaser) {
  const t = String(english || '').trim();
  const d = String(teaser || '').trim();
  if (!t) return d;
  return `${EN_PREFIX}"${/[.!?]$/.test(t) ? t : t + '.'}" ${d}`;
}
const VENUE_SITES=[{"id":"met","host":"metmuseum.org"},{"id":"ng","host":"nationalgallery.org.uk"},{"id":"rijks","host":"rijksmuseum.nl"},{"id":"acq","host":"acquavellagalleries.com"},{"id":"lgd","host":"levygorvydayan.com"},{"id":"borghese","host":"galleriaborghese.cultura.gov.it"},{"id":"frick","host":"frick.org"},{"id":"morgan","host":"themorgan.org"},{"id":"menil","host":"menil.org"},{"id":"va","host":"vam.ac.uk"},{"id":"louvre","host":"louvre.fr"},{"id":"capo","host":"capodimonte.cultura.gov.it"},{"id":"uffizi","host":"uffizi.it"},{"id":"brera","host":"pinacotecabrera.org"},{"id":"orsay","host":"musee-orsay.fr"},{"id":"mam","host":"mam.paris.fr"},{"id":"mad","host":"madparis.fr"},{"id":"ashmolean","host":"ashmolean.org"},{"id":"jacquemart","host":"musee-jacquemart-andre.com"},{"id":"khm","host":"khm.at"},{"id":"artic","host":"artic.edu"},{"id":"moma","host":"moma.org"},{"id":"brit","host":"britishmuseum.org"},{"id":"dellav","host":"gallerieaccademia.it"},{"id":"tate-modern","host":"tate.org.uk","path":"/whats-on/tate-modern/"},{"id":"tate-britain","host":"tate.org.uk","path":"/whats-on/tate-britain/"},{"id":"wallace","host":"wallacecollection.org"},{"id":"cincinnati","host":"cincinnatiartmuseum.org"}];
const BOILERPLATE=["technical storage or access","legitimate purpose of storing preferences","subscriber or user","consent to the use of cookies","we use cookies","this website uses cookies","accept all cookies","privacy policy","sign up to our newsletter","★★","©","admission charge","members go free","free for members","tickets bookable","members enjoy free entry","become a member","tickets for this","no need to book","include entry to the","installation view","courtesy the artist","courtesy of the artist","generously provided by","generously supported by","major funding","leadership support","additional support","support is provided by","supported in part by","entitled to a discount","ticket office","ticket purchase","proof of membership","subscribe to","to stay updated","opening hours","admission is free","book your visit","buy tickets","for visit info","download of this image is authorised","higher image resolution","image licensing policies"];
const CHALLENGE_TITLE=/^\s*(just a moment|attention required|performing security verification|access denied|pardon our interruption|one more step|making sure you['’]re not a bot)/i;const BOT_CHECK_SAID="the venue’s site answered with a bot check instead of the page";
const ANSWER_CHECK=(()=>{
// Measured from all 110 seed summaries: min 3, median 6, max 10, and every one
// ends with a full stop. The data wins over any number written elsewhere.
const MAX_WORDS = 10;

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Check one supplied string before it is allowed anywhere near the CSV or a card.
 * An explicit null means "this text is not a curatorial description and I am not
 * going to invent one" — a recorded decision, not a missing answer.
 */
function validateAnswer(text) {
  if (text === null) return { ok: true, skip: true, text: '' };
  const s = String(text == null ? '' : text).trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (/\n/.test(s)) return { ok: false, reason: 'contains a line break' };
  // The model is never asked for format: an English title arrives as its own
  // string, and code writes the "In English:" line.
  if (/^In English\b/i.test(s)) return { ok: false, reason: 'the description carries an "In English" line — the English title is a separate answer' };
  const n = wordCount(s);
  if (n > MAX_WORDS) return { ok: false, reason: `${n} words, cap is ${MAX_WORDS}` };
  return { ok: true, text: /[.!?]$/.test(s) ? s : s + '.' };
}

/** An English title as the model returned it: a plain string, or "" when the
 *  title is already English. Checked, never trusted. */
function validateEnglish(e) {
  if (e === '' ) return { ok: true, text: '' };
  if (typeof e !== 'string') return { ok: false, reason: 'the English title is not a string' };
  const t = e.trim();
  if (!t) return { ok: true, text: '' };
  if (/\n/.test(t)) return { ok: false, reason: 'the English title contains a line break' };
  if (t.length > 200) return { ok: false, reason: `the English title is ${t.length} characters` };
  if (/"/.test(t)) return { ok: false, reason: 'the English title contains a straight double quote, which the line uses' };
  if (/^In English\b/i.test(t)) return { ok: false, reason: 'the English title carries formatting' };
  return { ok: true, text: t };
}

/** What a written string must not carry: no full stop, an HTML fragment, a code fence. */
function stringFaults(s) {
  const t = String(s || '');
  const out = [];
  if (!/[.!?]["”’)]*\s*$/.test(t.trim())) out.push('does not end in a full stop');
  if (/&[a-z]+;|&#\d+;|<[a-z/]/i.test(t)) out.push('carries an HTML fragment');
  if (/^\s*```/.test(t)) out.push('carries a code fence');
  return out;
}

// Each claim the description may make, and its words in the languages the venues write in (English,
// Italian, French, German, Dutch, Spanish, Danish, Swedish). The description's word must be one of
// the English forms; the page must hold any form (a form of two words, "più grande", as a phrase).
const CLAIMS = [
  { en: ['first', 'firstever'], page: ['first', 'primo', 'prima', 'primi', 'prime', 'premier', 'première', 'premiers', 'premières', 'erste', 'ersten', 'erster', 'erstes', 'erstmals', 'eerste', 'primer', 'primera', 'primeros', 'primeras', 'første', 'första', 'först'] },
  { en: ['only'], page: ['only', 'solo', 'sola', 'soltanto', 'unico', 'unica', 'unici', 'uniche', 'seul', 'seule', 'seuls', 'seules', 'uniquement', 'einzige', 'einzigen', 'einziger', 'nur', 'enige', 'alleen', 'único', 'única', 'eneste', 'enda', 'endast'] },
  { en: ['largest', 'biggest'], page: ['largest', 'biggest', 'più grande', 'piu grande', 'plus grand', 'plus grande', 'größte', 'grösste', 'größten', 'grössten', 'grootste', 'más grande', 'el mayor', 'la mayor', 'største', 'största'] },
  { en: ['earliest', 'oldest'], page: ['earliest', 'oldest', 'antico', 'antica', 'ancien', 'ancienne', 'älteste', 'ältesten', 'oudste', 'vroegste', 'antiguo', 'antigua', 'ældste', 'äldsta'] },
  { en: ['greatest'], page: ['greatest', 'grandest', 'più grande', 'piu grande', 'più grandi', 'plus grand', 'plus grands', 'plus grande', 'größte', 'grösste', 'größten', 'grootste', 'el mayor', 'la mayor', 'største', 'största'] },
  { en: ['last', 'final'], page: ['last', 'final', 'ultimo', 'ultima', 'ultimi', 'dernier', 'dernière', 'derniers', 'letzte', 'letzten', 'laatste', 'último', 'última', 'sidste', 'sista'] },
  { en: ['unique'], page: ['unique', 'unico', 'unica', 'einzigartig', 'einzigartige', 'uniek', 'único', 'única', 'enestående', 'unik'] },
  { en: ['never', 'neverbefore'], page: ['never', 'mai', 'jamais', 'nie', 'niemals', 'nooit', 'nunca', 'aldrig'] },
  { en: ['unprecedented'], page: ['unprecedented', 'precedenti', 'inedito', 'inedita', 'inédit', 'inédite', 'précédent', 'beispiellos', 'beispiellose', 'ongekend', 'ongekende', 'precedentes', 'hidtil'] },
];

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Words, accents folded, each hyphened word both closed up and in its parts ("first-ever" →
// "firstever", "first", "ever").
const wordsOf = s => [...(fold(s).replace(/[-‐–]/g, '').match(/[a-zøæåß]+/g) || []), ...(fold(s).match(/[a-zøæåß]+/g) || [])];

const SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { hundred: 100, thousand: 1000, million: 1000000 };
// A page's ordinals count as the number they name ("seventeenth century" for a description's "17th").
const ORDINAL = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11,
  twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19,
  twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100 };
// The numbers a text states: figures ("2,000", "1920s", "17th") and English number words ("two
// thousand", "twenty-first"); with `ordinals`, an ordinal word on its own too ("seventeenth").
function numbersIn(s, ordinals) {
  const out = new Set();
  for (const m of String(s || '').match(/\d[\d,.]*\d|\d/g) || []) {
    const n = m.replace(/[,.](?=\d{3}\b)/g, '');
    if (/^\d+$/.test(n)) out.add(Number(n));
  }
  const w = fold(s).replace(/-/g, ' ').match(/[a-z]+/g) || [];
  for (let i = 0; i < w.length; i++) {
    if (ordinals && w[i] in ORDINAL) { out.add(ORDINAL[w[i]]); continue; }
    if (ordinals && w[i] === 'first') { out.add(1); continue; }
    if (!(w[i] in SMALL) || w[i] === 'one') continue;
    let total = 0, cur = 0, j = i;
    for (; j < w.length; j++) {
      if (w[j] in SMALL) cur += SMALL[w[j]];
      else if (w[j] in SCALE) { cur = (cur || 1) * SCALE[w[j]]; if (SCALE[w[j]] >= 1000) { total += cur; cur = 0; } }
      else if (w[j] === 'and' && j + 1 < w.length && (w[j + 1] in SMALL)) continue;
      else if (w[j] in ORDINAL) { cur += ORDINAL[w[j]]; j++; break; }
      else if (w[j] === 'first') { cur += 1; j++; break; }
      else break;
    }
    out.add(total + cur);
    i = j - 1;
  }
  return out;
}

/**
 * The claims and numbers in a description that its page does not hold, each said in words Claude can
 * act on. `source` is all the page text Claude was given (title included). [] when every one is there.
 */
function unsupportedClaims(text, source) {
  // "Twenty-first" is a number, not the claim "first".
  const claimText = fold(text).replace(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+first\b/g, ' ');
  const said = new Set(wordsOf(claimText)), page = new Set(wordsOf(source)), flat = ' ' + (fold(source).match(/[a-zøæåß]+/g) || []).join(' ') + ' ';
  const holds = w => / /.test(w) ? flat.includes(' ' + fold(w) + ' ') : page.has(fold(w));
  const out = [];
  for (const c of CLAIMS) {
    const used = c.en.find(w => said.has(w));
    if (used && !c.page.some(holds)) out.push(`"${used === 'firstever' ? 'first-ever' : used === 'neverbefore' ? 'never-before' : used}" is not in the text`);
  }
  const have = numbersIn(source, true);
  for (const n of numbersIn(text, false)) {
    // A decade written in full ("1990s") when the page writes it short ("the 90s") is the same claim.
    if (!have.has(n) && !(n >= 1000 && have.has(n % 100))) out.push(`the number ${n} is not in the text`);
  }
  return out;
}

// Words a description may share with its title and still say something.
const TITLE_SMALL_WORDS = new Set(['the', 'and', 'for', 'from', 'with', 'art', 'its', 'his', 'her', 'their']);
const titleWords = s => fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);
/**
 * True when every word of the description that carries meaning is already in the exhibition's
 * title — the title said again, which tells her nothing (her Met paste, her Palazzo Strozzi links).
 * A word and its plural count as one ("Impressionist", "Impressionists"). Every way in runs it:
 * the sweep's compressor, Links, Pages and Paste.
 */
function rewordsTitle(text, title) {
  const t = new Set(titleWords(title));
  if (!t.size) return false;
  const said = titleWords(text).filter(w => w.length > 2 && !TITLE_SMALL_WORDS.has(w));
  const inTitle = w => t.has(w) || t.has(w.replace(/s$/, '')) || t.has(w + 's');
  return said.length > 0 && said.every(inTitle);
}
const REWORDS_TITLE = 'the summary only rewords the title: say what the exhibition shows, from the rest of the text';
return { MAX_WORDS, validateAnswer, validateEnglish, stringFaults, unsupportedClaims, rewordsTitle, REWORDS_TITLE };
})();
const SUMMARY_EXAMPLES="RAW: From clapping hands and tapping feet to beatboxing and whistling, the human body is a musical instrument. Musical instruments, in turn, often draw their form and decoration from our bodies. Around the world and across time, instruments emerge as powerful vehicles that represent our voices, actions, and identity not only in music but throughout the visual arts, literature, religion, pop culture, and mythology. Musical Bodies is the first major exhibition to explore the relationship between musical instruments and the body by bringing together some 130 instruments, paintings, sculptures, drawings, and more to illuminate how we express who we are, what we value, and what we believe. With works from The Met collection and institutions and collectors around the world, the exhibition explores 4,000 years of art and music history, from ancient Egyptian rattles and musical masterpieces by Titian and Degas to instrument-inspired apparel and one of Prince’s most notable guitars. Musical Bodies will resonate with visitors of all ages, whether you are a musician, a devoted listener, or simply curious about human expression. The exhibition is made possible by Barbara Tober, the Diane W. and James E. Burke Fund, the William Randolph Hearst Foundation, and the Gail and Parker Gilbert Fund. The catalogue is made possible by the Mary C. and James W. Fosburgh Publications Fund.\n  →  Instruments as sculptural and bodily objects from the Met's collection.\n\nRAW: The Costume Institute’s spring 2026 exhibition explores depictions of the dressed body across The Met’s vast collection, pairing garments with artworks to reveal the inherent relationship between clothing and the body. Focusing primarily on Western art from prehistory to the present, Costume Art presents connections between garments from The Costume Institute and objects from the Museum’s other collecting areas. Pairings between fashions and artworks will present a spectrum of connections and experiences: from the formal to the conceptual, the aesthetic to the political, the individual to the universal, the illustrative to the symbolic, and the playful to the profound. These pairings are organized into a series of thematic body types that reflect their pervasiveness and endurance through time and cultures. Costume Art is the inaugural exhibition in the new, nearly 12,000-square-foot galleries adjacent to the Great Hall. This space will display The Costume Institute’s annual spring show and, at times, shows from the Museum’s other curatorial departments, including those that explore the intersection of fashion and art. To access a large-print version of the exhibition text, click here\n  →  Costume Institute spring show. Inaugurates new fashion galleries.\n\nRAW: In co-organization with the Fondation Giacometti, this presentation brings together for the first time at The Met the work of Alberto Giacometti (1901–1966) in one of New York's most iconic spaces. The installation of 14 works in bronze and plaster, emblematic pieces from the collection of the Fondation Giacometti in Paris together with three from The Met collection, places the work of one of the great sculptors of the 20th century in dialogue with the ancient civilization that strongly influenced his art and his practice. Throughout his career, Giacometti showed a particular fascination for the art of ancient Egypt. The Egyptian statues he saw in Italy as a young artist made a lasting impression on his visual repertoire, and after he moved to Paris, he regularly visited the Egyptian galleries of the Louvre. His formal dialogue with Egypt can be seen in sketches of walking figures in profile, which were later realized in such works as Walking Woman (I) (1932). At The Met, this elegant figure will be installed in the entrance hall of the Temple of Dendur. The Temple of Dendur was completed in 10 BCE as a commission by Caesar Augustus shortly after he became emperor of Rome. Gifted from Egypt to the United States in 1965, it has been one of the most beloved works of art at The Met since it opened to the public in 1978. In ancient Egypt, the terrace before the temple functioned as an open meeting place between the deity and larger crowds. At The Met, Giacometti's figures will stand alone or in groups on the temple platform—a presentation that echoes the artist's own compositions of figures as well as the life around the temple. The exhibition is made possible by the Kate W. Cassidy Foundation.\n  →  Giacometti's elongated figures alongside the Egyptian temple.\n\nRAW: The word Orient is derived from the Latin Oriens, which means the direction of the rising sun—the east. Orientalism: Between Fact and Fantasy explores notions of “the East” in the 19th century, when globalism, shaped by colonialism and imperialism, fueled unprecedented encounters, connections, and exchanges in Europe and the Middle East. “Hard power” mingled with “soft power,” as accelerated travel, rapid technological change, and shifting geopolitics hastened artistic exchange between distant regions and different cultures. Beginning with Napoleon’s conquest of Egypt in 1798 and culminating in the paintings of Ottoman renaissance man Osman Hamdi Bey, this exhibition tells the story of how Islamic works of art made their way to European dealers, collectors, international expositions, and museums, introducing a new visual language to artists, architects, and designers. Deep admiration for the sophisticated techniques and visual language of Islamic art led Owen Jones and other influential figures to transform architecture and design in Europe and America. Artists such as Jean Auguste Dominique Ingres, Eugène Delacroix, and Jean-Léon Gérôme visited lands and people across the Mediterranean or imagined them from afar. They sometimes depicted what they saw and at other times conjured distant places through memory and imagination, often using Islamic objects to stage their paintings. Orientalism: Between Fact and Fantasy is the first exhibition at The Met to explore Orientalism as its central focus, presenting not only easel paintings but also drawings, photographs, illustrated books, architecture, arms and armor, textiles, garments, glassware, ceramics, and metalwork. Highlighting The Met collection, it features approximately 180 objects from 12 Met departments along with rarely seen loans from the U.S. and abroad. Displayed across four galleries that straddle the departments of European Paintings and Islamic Art, the presentation invites visitors to approach the exhibit\n  →  Nineteenth-century European depictions of the Middle East and North Africa.\n\nRAW: Renaissance sculpture in Florence was forever changed around 1440 when Luca della Robbia created a secret formula for making glazed terracotta reliefs and statuary. Luca and his heirs, Andrea and Giovanni, daringly perfected these techniques. Over the next century, the family workshop transformed local clay and colored glazes into peerless sculptures that gleamed with light. Praised during the Renaissance as “almost eternal,” today Della Robbia sculptures are often as vibrantly luminous as when they emerged from the kiln five hundred years ago. The Met has the largest, most significant collection of Della Robbia glazed terracottas in America. Most have remained in storage for decades. For the first time, Rediscovering Della Robbia at The Met features in a single gallery 12 of the Museum’s masterworks by three generations of the Della Robbia family. Rescued from storage, revived through conservation, and reattributed through fresh research, these sculptures are shown with two important loans from a private collector. Another two works are exciting sculptures by Giovanni della Robbia from the Dick Wolf Collection that complement existing works in the Museum’s collection—one is a promised gift and the other, the Mystic Mandorla lunette, recently was gifted to the Museum. Together, the exhibited sculptures span monumental reliefs composed of many interlocking pieces to small statuettes, signaling the scope of the Della Robbias’ art. Collaboration within the Della Robbia workshop fostered innovation. Rediscovering Della Robbia at The Met itself results from a collaborative exchange among curators, conservators, and digital specialists. Highlights include the exhibition’s centerpiece featuring 33 newly conserved interlocking pieces of a 10-foot-tall altarpiece that has been off view for 70 years. These are shown alongside a large, animated virtual reconstruction that uses 3D-scanning technology to suggest how the entire altar originally was assembled. Rediscovering Della\n  →  Glazed terracotta from the Della Robbia workshop.\n\nRAW: This special installation marks the 250th anniversary of the Declaration of Independence, the founding document of the United States of America. Featured works from across The Met offer a wide view of the roots, course, and aftermath of the Revolutionary War (1775–1783)—from early conflicts between colonists and Indigenous peoples to George Washington’s voluntary retirement, in 1797, from his two-term presidency. Rarely seen prints reveal the transatlantic circulation of news about the struggle for independence during a fractious political period. This window into the era’s print culture highlights the global dimensions of the rebellion, the contested ideas about liberty that shaped it, and its consequential outcomes. Also on view are American and European works of art that depict a range of significant individuals. These include the Wampanoag chief Metacomet, whose battles with early colonists laid the groundwork for revolution; the African American poet Phillis Wheatley, who raised her voice against an expansive tyranny in her call for emancipation; patriots and presidents such as Paul Revere and George Washington; the Mohawk leader Thayendanegea, who allied with the British in an effort to retain Indigenous sovereignty; and iconic contributors to the Declaration of Independence John Adams, Benjamin Franklin, and Thomas Jefferson. Together, these artworks acknowledge multiple complex and intertwined histories that continue to resonate in the United States and beyond, some two and half centuries later. This special installation is made possible by Kimba Wood and Frank Richardson.\n  →  Prints and visual material around revolutionary upheaval.\n\nRAW: This special installation, which features some of The Met’s most iconic European paintings, examines how human and nonhuman histories are fundamentally intertwined—and how this fact has been understood over time. Discover how artists such as Pieter Bruegel the Elder and Nicolas Poussin explored humanity’s complex relationship with nature. The paintings on view reveal that people cannot exist outside of natural ecosystems but are profoundly interdependent with the rest of the natural world. Dating from around 1525 to 1775, these paintings trace a shift in European representations of nature from expressions of embeddedness toward assertions of dominance, showing how our conceptions of nature are themselves not “natural” but instead are culturally constructed. The artists’ depictions shape viewers’ experiences of the environments they portray. Overlapping themes include ancient myths that personify natural forces; the relationship between art and science through direct observation of nature; and idealizations of agricultural labor that upheld class, gender, and colonial power structures. As physical objects, paintings alter natural resources like flax, wood, and rare minerals; in turn, these materials continue to have lives of their own. This special installation is made possible by the Sherman Fairchild Foundation.\n  →  Painting through landscape, environment and material relations.\n\nRAW: Most objects are displayed to show their “best” angle meant to impress, sometimes hiding intriguing details. Flip Sides: Seeing Korean Art Anew invites close looking and offers multiple views of the inside, reverse, or hard-to-see aspects of objects. Bringing together approximately 50 objects from The Met collection, with more than half displayed for the first time, this exhibition, with a rotation, shows treasured Korean traditions. By presenting them in ways that give us a fuller picture into each object’s unique form, Flip Sides provides insight into the construction and function of works in metal, wood, ceramic, textiles, and lacquer. A Buddhist sculpture that held offerings inside, a porcelain jar of striking openwork that conceals an inner chamber, a bronze mirror with a delicately incised image, and a king’s lacquer letter box with linings featuring impressive calligraphy are among the featured objects in Flip Sides. During the exhibition, a selection of artworks will come off view and be replaced by new works: Rotation 1: March 16–October 18, 2026 Rotation 2: October 31, 2026–May 31, 2027 The exhibition is made possible by The Kun-Hee Lee Fund for Korean Art.\n  →  Korean objects revealing their reverse or hard-to-see aspects.\n\nRAW: From the earliest hand-built figurines rooted in spiritual beliefs to the vibrant works that define today’s contemporary ceramic art scene, Japanese pottery reflects exceptional creativity and a refined sense of beauty. Its distinctiveness arises from the ingenuity and mastery of the potters, as well as the wide range of wares that have long supported daily life. This exhibition explores Japan’s extensive and rich history of ceramic art through approximately 350 extraordinary works presented in themes that offer fresh perspectives on the diverse forms and functions, from everyday tableware to vessels created for tea masters and elite households to modern sculptural compositions. Japan’s earliest pottery dates back more than 12,000 years, when makers shaped and fired clay vessels for cooking and storage—objects that bear the traces of these early potters’ hands. Expertise transmitted from China and Korea in medieval times facilitated the development of new Japanese techniques and wares. Over time, the reverence for prized ceramics led to finding beauty even through damage. Japanese artisans developed kintsugi, the art of repairing broken ceramics with gold lacquer, restoring the damaged object’s function while making it even more precious and valuable. Japanese cuisine and dining aesthetics inspired vessels designed to harmonize with the color and texture of food. Many porcelains from the Edo period (1615–1868) are embellished with motifs drawn from the natural world or symbols of happiness, longevity, and good fortune. Featuring refined ceramics and other artworks from the Museum’s Harry G. C. Packard Collection, this exhibition celebrates the 50th anniversary of this landmark acquisition that established the foundation of The Met’s Japanese art holdings. By placing ceramics in dialogue with related art forms—including lacquers, textiles, paintings, and woodblock prints—the display inspires curiosity about the multiverse of Japanese ceramics and its broader cultural\n  →  Japanese ceramic traditions across technique, glaze and form.\n\nRAW: Artists and artisans have been intrigued and inspired by the topic of death and visions of life thereafter for millennia. Afterlives: Contemporary Art in the Byzantine Crypt brings together modern-day works that reckon with death and visualize the afterlife and Byzantine Egyptian funerary art and artifacts in part of the Mary and Michael Jaharis Galleries known as the Byzantine Crypt (Gallery 302). The intimate and enchanting gallery with exposed brick walls and arched portals was unveiled in the year 2000 after a renovation that reclaimed the space beneath the Museum’s Grand Staircase. In this transhistorical presentation, the Byzantine Crypt’s religious and secular jewelry, textiles, ivory objects, vessels, and architectural sculpture from Early Christian and Coptic monastic sites are complemented and enriched by contemporary sculptures, works on paper, and installations from the 1960s to present day that similarly serve as memorials, reliquaries, and tokens to ward off evil. As part of the exhibition, Adrian Piper’s editioned work Everything #4 invites viewers to contemplate its otherworldly statement and their reflection in a variety of contexts. It will be installed in the heart of the Byzantine Crypt and five other spaces across The Met Fifth Avenue and The Met Cloisters, listed below. The exhibition is made possible by The Jaharis Family Foundation.\n  →  Contemporary work in the Byzantine galleries.\n\nRAW: The traditional East Asian lunar calendar marks time through a twelve-year cycle, each year represented by the animals of the Chinese zodiac: rat, ox, tiger, rabbit, dragon, snake, horse, ram, monkey, rooster, dog, and pig. First associated with the Chinese calendar in the third century BCE and firmly established by the first century CE, these symbolic creatures are believed to embody certain traits that are manifested in the personalities of people born in that animal’s year. February 17, 2026, marks the beginning of the Year of the Horse, a creature symbolizing power, strength, and vitality. Celebrating the Year of the Horse brings together works from The Met collection to explore the horse’s enduring nature and vital place in Chinese civilization. Domesticated in prehistoric times, this animal has shaped nearly every facet of life—from agriculture and transportation to trade, warfare, sport, and entertainment. In ancient China, horse-drawn chariots transported military commanders and the social elite, while in the Tang dynasty (618–907), tall and robust horses came to embody the strength of the state and cosmopolitan spirit of the empire. In Chinese popular culture, horses are among the most celebrated animals, and in the spiritual realm they serve as noble mounts for divine guardians believed to bring joy, protection, and prosperity to the household. This presentation, featuring a range of expressive works in ceramics, glass, jade, and metal, and woodblock prints, illuminates these roles while celebrating the horse’s power, vitality, and spirit.\n  →  Asian works for the lunar new year.\n\nRAW: In 1668, King Louis XIV of France commissioned the Paris-based Savonnerie manufactory to create the largest carpet ever woven. Composed of 92 individual pieces, the carpet was intended to cover the full span of the Grande Galerie of the Louvre, measuring 440 meters, six times the length of the Hall of Mirrors at Versailles. Not only was it a bold and unprecedented undertaking, but a unique chapter in the history of art. The first ever exhibition about the Savonnerie in the United States, A King’s Carpet sheds new light on The Met’s three carpets made as part of this ambitious scheme. Held in the iconic Wrightsman Galleries, it will explore the tumultuous history of these Baroque masterpieces from their conception and the harsh realities of their production to their dispersal after the French Revolution. A project of unheard-of scale, the weaving of the 92 carpets necessitated the establishment of massive workshops and an expendable workforce of orphans and adolescents with sharp eyesight and nimble fingers. Woven over 20 years, the carpets were never rolled out in the space for which they were intended, Louis XIV having turned his attention away from the Louvre to Versailles. During the Revolution, many were stripped of their royal emblems or sold, some eventually finding new homes with prominent American collectors such as J. P. Morgan and Alva Vanderbilt. This exhibition will present four complete carpets along with a selection of fragments, attesting to the scheme’s segmentation and dispersal. In addition, visitors will be able to observe textile conservators at work in an in-gallery temporary conservation studio as they repair and strengthen one of these monumental textiles.\n  →  Savonnerie carpets and French court display.\n\nRAW: Sublime symbols of changing weather, clouds have long been a source of fascination for artists and scientists alike. In the early 1800s, landscape painters used clouds as visual proof of their ability to capture the fleeting effects of nature in sketches made outdoors, or en plein air, while meteorologists began to study and, for the first time, classify clouds. Beginning in the 1830s, photography promised to capture the sky with unprecedented immediacy and detail, yet early technical limitations fell short of that promise. Photographers responded by painting in skies or manually combining negatives, until chemical and optical advances at the start of the 20th century made possible cloudscape photographs that rivaled paintings. Chasing Clouds follows the remarkable story of how the sky was represented during this period, tracing the depiction of clouds in works that balanced changing artistic conventions with scientific discoveries and new technologies. Opening with oil sketches from the start of the 19th century, and including paintings, drawings, and photographs from the following decades, it comes full circle in the 1920s with American photographer Alfred Stieglitz’s Equivalents, a series of cloud studies that reconciles poetic feeling and naturalistic depiction. The exhibition is made possible by The Robert Mapplethorpe Foundation, Inc.\n  →  Cloud studies across painting, drawing and photography.\n\nRAW: Multidisciplinary artist David Hartt (Canadian, born 1967) transforms John Vanderlyn's immersive historical painting, Panoramic View of the Palace and Gardens of Versailles (1818–19), into a dynamic contemporary installation, offering viewers the opportunity to explore questions of place and perspective. Vanderlyn’s highly detailed rendering of Versailles—among the largest surviving panoramas in the United States—is activated by Hartt’s architectural intervention, bringing past and present into conversation. For this site-specific commission—consisting of two Direct View LED screens and echoing imagery from the panorama itself—Hartt draws on direct documentation of Versailles, the cinematic language of French New Wave Cinema, and photographs of the palace grounds by Eugene Atget to reshape the experience of The Met’s circular gallery space housing the work. Filmed at locations from Versailles to the Boulevard Périphérique and throughout the center of Paris, Peripheries explores the constant reinvention of the French capital. Hartt’s installation reconfigures movement and angles of vision, augmented through an original score by composer and musician Jeff Parker. Visitors are visually lured away from established centers within the city toward the margins—or the “peripheries”—where alternative perspectives and histories are often relegated. By engaging directly with Vanderlyn's panorama, Hartt has created a space to reconsider not only the historical painting itself but also examine ideas of representation and cultural memory within a living environment. The exhibition is made possible by Jan and Warren Adelson in honor of Eugénie Prendergast, and The Modern Circle.\n  →  Architecture, migration and the edges of cities.\n\nRAW: The Parade is an epic cycle of 63 charcoal, pencil, and ink drawings conceived by Si Lewen (1918–2016) in the aftermath of World War II. The work unfolds a visual narrative on war, memory, and the human condition that is informed by the artist's extraordinary life. Born in Poland to Jewish parents and raised in Germany, Lewen fled Nazi persecution with his family in 1933 before immigrating to the United States. While serving in the U.S. Army as one of the Ritchie Boys, a specialized unit of German-speaking soldiers, Lewen arrived at the Buchenwald concentration camp shortly after its liberation in 1945. The Parade is rooted in the artist’s experience of these events as well as his coming of age during the tumultuous years when, as he reflected later, the parades after World War I gave way to the death marches of World War II. Experienced together as a sequence, the drawings carry viewers from military pageantry to conflict, devastation, and mourning through the cumulative force of their imagery. The power of The Parade lies not only in its historical origins but in its ability to speak across generations with urgency, asking viewers to confront the persistent cycles of violence that continue to shape our world. The exhibition's title, There Are No Words, is inspired by Lewen's own description of the format of The Parade as a wordless novel in which he explained: \"there are no words . . . just the picture itself is the narrative.\" At the same time, the title reflects his conviction that the horrors of war ultimately defy language and description.\n  →  Wordless picture sequence on war.\n\nRAW: Lee Krasner (1908–1984) and Jackson Pollock (1912–1956) met as emerging artists in New York in the winter of 1941. They married in 1945 and moved to Springs, Long Island, where they remained entwined personally, artistically, and professionally until Pollock’s untimely death. While Pollock’s reputation historically eclipsed Krasner’s, today, both artists’ practices are rightly recognized as central to the innovations of art from the mid-20th century onwards. This exhibition continues and amplifies this reevaluation, on their own terms and in dynamic relation to each other. Drawing its subtitle, Past Continuous, from a 1976 painting by Krasner, the exhibition traces parallel lives and practices—forged first by lived experience, then shadowed by memory. Krasner, born in Brooklyn to Jewish immigrant parents from what is now Ukraine, and Pollock, raised in Los Angeles and the American West, brought specific geographies and inheritances into a shared artistic context. Their early paths traced distinct strands of American modernism that would ultimately converge in the rupture known as Abstract Expressionism, a movement that valued the translation of inner feelings into dramatic visual action. In the wake of World War II, artists asked why art mattered and what it could be. For Pollock, his breakthrough was the “drip” technique, a radical mode of painting that flourished in a condensed but prolific period. Krasner’s varied practice was typified by ceaseless explorations of abstraction, often cued by her abiding interest in the possibilities of nature and color. Krasner and Pollock: Past Continuous is the first major New York presentation devoted to either artist in more than 20 years. Featuring over 120 works, it is the first exhibition to look at the full arc of their careers together. The exhibition is made possible by Kenneth C. Griffin and Griffin Catalyst, Marina Kellen French, and the Barrie A. and Deedee Wigmore Foundation.\n  →  Lee Krasner and Jackson Pollock, exchange and divergence.\n\nRAW: Can fashion photography be dangerous? Lillian Bassman was told as much when, in 1950, she started making photographs so abstract that you could barely see the clothes. Depicting midcentury style for the pages of magazines, she distilled gowns and girdles to their essential silhouettes; in her photographs, chance gestures and elegant lines convey the sensations of garments, as their details dissolve into atmospheric blur. What Bassman did not show she evoked in her expressive prints—products of darkroom distortion, achieved with tissues, brushes, and bleach. In an earlier era, such an approach might have precluded commercial success. Bassman’s timing, though, could not have been better; in 1941, at age 24, she took a design job at Harper’s Bazaar, where a group of artists and editors were then reimagining how the magazine should look. With them, she helped introduce an avant-garde sensibility to the American newsstand, advancing new possibilities for photography in print. In works from a remarkable gift to The Met, Lillian Bassman: Bazaar and Beyond highlights the influence and audacity of her magazine career. The exhibition flips between the New School in Manhattan and the “New Look” in Paris, charting Bassman’s course from design apprentice to art director and accomplished photographer. Its rare vintage prints, collages, and maquettes lay out an unlikely history of modernism, refashioned for the pages of the popular press. The exhibition is made possible by The Robert Mapplethorpe Foundation, Inc.\n  →  Fashion photographer for Harper's Bazaar.\n\nRAW: Dive into the artistic process of one of history’s most beloved and influential artists. A true titan of the Italian Renaissance, Raffaello di Giovanni Santi (1483–1520)—better known as Raphael—matched ambition with lyricism to create works with both intellectual heft and emotional depth, a necessary skill in the complex political landscape of Renaissance courts. In his short life of only 37 years, he achieved such profound success as a painter, designer, and architect that he was regarded as the pinnacle of artistic perfection for centuries after his death. Raphael: Sublime Poetry is the first comprehensive exhibition on Raphael in the United States, bringing together more than 170 of the artist’s greatest masterpieces and rarely seen treasures to illuminate the brilliance of Raphael’s extraordinary creativity. The son of a painter and poet, Raphael engaged with the foremost writers and thinkers of his age in Rome, displaying a poetic sensibility that captivated his peers and generations that followed. Follow the full breadth of his life and career, from his origins in Urbino to his rise in Florence, where he began to emerge as a peer of Leonardo da Vinci and Michelangelo, to his final, prolific decade at the papal court in Rome. To underscore the range of his genius, this presentation brings together important drawings, paintings, and tapestries from public and private collections across Europe and the United States, many of which have never been shown together. With particular attention to Raphael’s portrayal of women—from his use of nude female models for the first time in Western art to his tender depictions of the Madonna and Child—and recent scientific discoveries made using state-of-the-art technology, this exhibition offers a rare opportunity to experience the genius of an artist who helped shape the course of art history. Wolfe, Gilbert and Ildiko Butler, Debra and Leon Black, Mark Gorenberg and Cathrin Stickney, the Robert Lehman Foundation, Dinah Seiver\n  →  First comprehensive US presentation of Raphael.\n\nRAW: Born in Chippewa City, a remote Native American village on the shore of Lake Superior in northern Minnesota, George Morrison (Wah-wah-ta-ga-nah-gah-boo and Gwe-ki-ge-nah-gah-boo, Grand Portage Chippewa, 1919–2000) overcame innumerable challenges—poverty, a life-threatening childhood illness, social isolation, racial and cultural barriers—to become a leader of the Abstract Expressionist movement, which he collaboratively defined both publicly and behind the scenes. Morrison’s influence as an abstract expressionist painter began in 1943 when he traveled from rural Minnesota to New York City to study at the Art Students League on a scholarship. Immersing himself in the city’s vibrant cultural scenes, he studied painting and drawing, contributed to numerous exhibitions and publications, and openly challenged the mainstream art establishment of his generation. In New York, Morrison formed meaningful connections with artists including Willem de Kooning, Franz Kline, Lois Dodd, and Louise Nevelson, among others. His deep appreciation for urban life—specifically, industrial landscapes, jazz, and literature—permanently shaped his artistic practice and imagery. This exhibition explores how Morrison’s aesthetic inspiration and future trajectory drew from his love of New York, which he called a “Magical City.” Featuring 25 of his most important paintings and drawings from this early period, the exhibition culminates in his Horizon series. It also features rare archival materials that place Morrison at the heart of the Abstract Expressionist movement in 1940s and 1950s New York.\n  →  Ojibwe painter's abstract New York work.\n\nRAW: The hand-held fan was an unexpected muse for some of the most innovative artists in 19th-century Europe. Fans became hugely popular across many levels of society during this period, serving as functional and fashionable objects of adornment and communication. Well-known French Impressionists such as Edgar Degas and Camille Pissarro not only featured this feminine accessory in their work but also adopted it as an experimental format for their art. Fanmania investigates why avant-garde artists incorporated fans into their work and sheds light on themes of gender, courtship, consumerism, and appropriation. Artists were attracted to the semicircular form for myriad reasons, including fascination with fans from Asia and Spain, commercial ambition, and their interest in formal and technical innovation. Displaying more than 75 artworks from across The Met collection, this multimedia exhibition features painted and printed fans from Europe and Asia as well as artworks that depict women wielding fans to explore the phenomenon of “fanmania.”\n  →  Folding fans as fashion and display.\n\nRAW: Emily Sargent’s watercolors—recently rediscovered—capture the world with a clarity and expressiveness that were all her own. This exhibition brings her luminous work into focus, situating it within the creative, complex world of the Sargent family. This unique presentation features watercolors by Emily Sargent (1857–1936), her older brother, renowned portraitist John Singer Sargent (1856–1925), and their mother, Mary Newbold Sargent (1826–1906). As the artistic family traveled seasonally through Europe, Mary encouraged her children’s creative aspirations. The siblings had a close relationship and often sketched and painted side by side. As John Singer Sargent’s bold portraits increasingly garnered critical attention, his younger sister Emily supported his career while building a body of work of her own that remained largely unseen. Drawn entirely from The Met collection, Emily Sargent: Portrait of a Family takes a close look at their art and explores how paths diverged for daughter and son, revealing the challenges women artists faced in the late 19th century. Intended as a complement to The Met’s Sargent and Paris, this exhibition celebrates the recent gift—from the artists’ heirs—of 26 Emily Sargent watercolors, which will be making their debut. This generous gift continues a long legacy of family giving that formed the foundation of the Museum’s extensive Sargent holdings. Emily Sargent: Portrait of a Family is made possible by the William P. Rayner Fund.\n  →  Watercolours by Sargent's sister.\n\nRAW: Before the Brooklyn Bridge became an iconic symbol of New York City, it was a bold idea sketched on paper. With 11,000 drawings stored in the city’s Municipal Archives, its construction is one of the most thoroughly documented engineering projects of the 19th century. Met experts examined a selection of these extraordinary studies through The Met’s Scientific Research Partnerships program—a grant-funded initiative that provides free scientific support to art institutions nationwide. The Brooklyn Bridge Up Close presents seven of these impressive drawings for the first time in forty years, spotlighting the multiyear collaboration between The Met and the Municipal Archives as well as the Museum’s ongoing commitment to sharing resources with New York City institutions. Designed by German engineer John A. Roebling (1806–1869), a pioneer in steel-wire rope technology used for suspension bridges, the Brooklyn Bridge was completed in 1883 by his son, Washington A. Roebling (1837–1926), with help from skilled assistants. After Washington became ill, his wife, Emily Warren Roebling (1843–1903), took over supervision of the project and played a crucial role in its success. The Brooklyn Bridge Up Close offers fresh insights into the physical properties of these monumental drawings, informing future conservation treatments. It also highlights science’s vital role in uncovering new narratives and providing unprecedented access to artists’ creative processes. This special installation is made possible by the Mellon Foundation.\n  →  Bridge construction in drawings and prints.\n\nRAW: American artist Man Ray (1890–1976) was a visionary known for his radical experiments that pushed the limits of photography, painting, sculpture, and film. In the winter of 1921, he pioneered the rayograph, a new twist on a technique used to make photographs without a camera. By placing objects on or near a sheet of light-sensitive paper, which he exposed to light and developed, Man Ray turned recognizable subjects into wonderfully mysterious compositions. Introduced in the period between Dada and Surrealism, the rayographs’ transformative, magical qualities led the poet Tristan Tzara to describe them as capturing the moments “when objects dream.” The exhibition will be the first to situate this signature accomplishment in relation to Man Ray’s larger body of work of the 1910s and 1920s. Drawing from the collections of The Met and more than 50 U.S. and international lenders, the exhibition will feature approximately 60 rayographs and 100 paintings, objects, prints, drawings, films, and photographs—including some of the artist’s most iconic works—to highlight the central role of the rayograph in Man Ray’s boundary-breaking practice. “Before my eyes an image began to form, not quite a simple silhouette of the objects as in a straight photograph, but distorted and refracted … In the morning I examined the results, pinning a couple of the Rayographs—as I decided to call them—on the wall. They looked startlingly new and mysterious.” — Man Ray The exhibition is made possible by the Barrie A. and Deedee Wigmore Foundation. Goldsmith Foundation, The Daniel and Estrellita Brodsky Foundation, The International Council of The Metropolitan Museum of Art, Andrea Krantz and Harvey Sawikin, and Schiaparelli.\n  →  Photographs, rayographs across Dada and Surrealism.\n\nRAW: The traditional East Asian lunar calendar consists of a repeating twelve-year cycle, with each year corresponding to one of the twelve animals in the Chinese zodiac. The association of these creatures with the Chinese calendar began in the third century BCE and became firmly established by the first century CE. The twelve animals are, in sequence: rat, ox, tiger, rabbit, dragon, snake, horse, ram, monkey, rooster, dog, and pig. Each is believed to embody certain traits that are manifested in the personalities of people born in that year. January 29, 2025, marks the beginning of the Year of the Snake, a creature characterized as alert, calm, and smart. Celebrating the Year of the Snake presents a remarkable selection of works drawn from the Museum’s collection illustrating the significant role that the snake plays in Chinese culture, including a 3,000-year-old bronze ritual vessel with a spout formed by joined snakes’ heads, a 13th-century pottery figure of a mischievously smiling snake, and an 18th-century exquisitely painted porcelain cup portraying a scene from the “Legend of the White Snake,” a popular folktale of love and romance between humans and fantastic creatures.\n  →  Asian works featuring the snake.\n\nRAW: Casa Susanna brings together photographs and publications created by and for a community of cross-dressers who met regularly in New York City and the Catskill Mountains throughout the 1960s. Two modest resorts run by Susanna Valenti and her wife, Marie Tornell, provided safe spaces for guests to freely cross-dress en femme during an era of strictly defined gender roles. They used the camera to create and affirm their femme identities, exchanging photographs at gatherings or sharing them by mail. These snapshots—some candid, others playfully performative—were rediscovered at a Manhattan flea market in 2004 and have come to be known as the Casa Susanna photographs. The exhibition also features issues of Transvestia, an underground magazine that published the photographs along with fiction, poetry, makeup and clothing advice, and autobiographical essays by members of the community. During this period, most cross-dressers lived in isolation and shame. The exhibition presents new research into the double lives cross-dressers led as married men with established careers. The photographs also bring to light the type of woman they aimed to embody—such as the “girl next door,” the respectable housewife, the matron—a middle-class ideal of femininity that was both liberating and limiting. Casa Susanna offers insight into a significant pre-Stonewall cross-dressing scene, inviting visitors to understand this world and its connection to the lives of transgender people today. The exhibition is organized by the Art Gallery of Ontario and Les Rencontres d’Arles in collaboration with The Metropolitan Museum of Art. The exhibition is made possible by The Robert Mapplethorpe Foundation, Inc.\n  →  1950s–60s Catskills retreat photographs.\n\nRAW: In ancient Egypt, images of gods weren’t just images—they brought the gods to life. Egyptians believed that it was through their depictions in tombs, temples, and shrines that the deities could enter sacred spaces and become active participants in rituals, offering a vital connection between the human and divine worlds. Over Egypt’s long history, its belief system grew to include more than 1,500 gods with many overlapping forms and traits. Subtle visual cues like what a figure wore, how they posed, or the symbols they carried helped identify them and their roles. Divine Egypt brings together almost 250 works of art and objects, many of them on loan from institutions such as the Museum of Fine Arts, Boston, the Musée du Louvre, Paris, and the Ny Carlsberg Glyptotek, Copenhagen, to examine the imagery associated with the most important deities in ancient Egypt’s massive body of gods. Depictions of the stately falcon-headed Horus, the lion-headed Sakhmet, and the serene, shrouded Osiris reveal the striking ways the kings and people of ancient Egypt recognized and interacted with their gods. While the king had a daily direct relationship with the gods in the inner sanctuaries of great temples, people without such access found ways to connect with their gods through rituals, offerings, and objects of private devotion. This immersive look at how deities were depicted reveals the many roles they played in people’s lives, providing them with meaning in front of life’s uncertainties and the permanence of death. The exhibition is made possible by The John A. Moran Charitable Trust. Cullman, Alaina and Stirling Larkin, and Norby Anderson. The catalogue is made possible by the Kelekian Fund. Cotti.\n  →  Major Egyptian exhibition on twenty deities.\n\nRAW: Ganesha, the son of Shiva and Parvati, is a Brahmanical (Hindu) diety known to clear a path to the gods and remove obstacles in everyday life. He is loved by his devotees (bhakti) for his many traits, including his insatiable appetite for sweet cakes and his role as a dispenser of magic, surprise, and laughter. However, Ganesha is also the lord of ganas (nature deities) and can take on a fearsome aspect in this guise. The seventh- to twenty-first-century works in this exhibition trace his depiction across the Indian subcontinent, the Himalayas, and Southeast Asia. Featuring 24 works across sculptures, paintings, musical instruments, ritual implements, and photography, the exhibition emphasizes the vitality and exuberance of Ganesha as the bringer of new beginnings. The exhibition is made possible by the Florence and Herbert Irving Fund for Asian Art Exhibitions. During the exhibition, a selection of artworks will come off view and be replaced by new works: Rotation 1: November 19, 2022–June 11, 2023 Rotation 2: June 17, 2023–June 11, 2024 Rotation 3: June 13, 2024–January 4, 2026\n  →  Depictions of Ganesha across Asian art.\n\nRAW: Enter the spellbinding world of visionary Spanish painter Francisco de Zurbarán. Spend time with his paintings, celebrated for their vivid naturalism and deep emotional power. Move between soaring altarpieces and exquisite still lifes in the first major UK exhibition of this great artist from Baroque Seville. A peer of Murillo and Velázquez, Zurbarán stands out for his drama, mystery and vision. From the rind of a lemon to the timeless gaze of a saint, he finds an intensity in the ordinary. Strong light and deep shadow bring real faces, soft fabrics, fresh fruit and flowers to life. His paintings unite stillness, focus and faith. The exhibition brings together works from major galleries across Europe and the US that span Zurbarán’s career from his first religious commissions to paintings made for private devotion. Stand in front of monumental works that can still move and inspire us today. ‘Zurbarán’ is at the National Gallery, Sainsbury Wing between 2 May and 23 August 2026. Tickets are required. The exhibition is organised by the National Gallery, London, Musée du Louvre, Paris and the Art Institute of Chicago.\n  →  First UK exhibition of Zurbarán.\n\nRAW: See the reunion of two of Impressionism's most celebrated paintings In the summer of 1869, Monet and Renoir – then young, ambitious artists and close friends – set up their easels side by side at La Grenouillère, a fashionable riverside resort just outside Paris. Working 'en plein air’ (out-of-doors), the artists painted the same lively scene of fashionable Parisians at leisure – though their artworks reveal remarkably different approaches. For the first time in nearly twenty years, the National Gallery is reuniting two of these celebrated paintings created at La Grenouillère, side by side once more. Look closely at each brushstroke and compare the artists' individual Impressionist style and witness a close friendship that helped shape one of the most influential movements in Western art. The free display will remain on view until mid-September, before Renoir's painting is incorporated into the 'Renoir and Love' (3 October 2026 – 31 January 2027) exhibition at the National Gallery. The reunion of the two paintings has been made possible thanks to the generous loan of Renoir's ‘La Grenouillère’ from Nationalmuseum, Stockholm.\n  →  Two Impressionist paintings at the same motif.\n\nRAW: Discover the breathtaking landscapes of one of Austria’s greatest painters, Ferdinand Georg Waldmüller (1793–1865). Stroll through forests, scale rugged peaks and marvel at majestic skies across Austria and Sicily. Take in the great trees of Vienna’s Prater Park, the magnificent lakes and mountains of the Salzkammergut region and the tranquil hills and ruins of Sicily. Pause, reflect and wonder at pictures alive with intense colour and light. See why Waldmüller’s work can be compared to the Pre-Raphaelites. Admire the precise brushstrokes which shape each leaf, twig and flower. Explore how he found beauty in nature’s imperfections, through his images of aged trunks and bare branches. Find serenity in the heart of London at this first-ever exhibition dedicated to Waldmüller's landscapes.\n  →  First UK exhibition of Waldmüller.\n\nRAW: Celebrate children's creativity in this exhibition of artworks by UK primary schools As part of our annual Take One Picture programme, children from across the UK have made artworks inspired by ‘A Regatta on the Grand Canal’ by Canaletto. The painting shows a colourful boat race taking place in Venice. Crowds of people cheer on the gondolas as they race towards the finish line. Children have made a wide range of imaginative projects, all coming from their own questions and ideas about the painting. Who is going to win the race? What’s under the water? Why do the boats look like dragons? This year’s exhibition features artworks from 35 primary schools and is on display in the Roden Centre for Creative Learning.\n  →  Children's artworks inspired by Canaletto.\n\nRAW: Fall in love with Renoir and his Impressionist paintings at the National Gallery. Discover Renoir’s gift for showing love, friendship, and everyday emotion in this Impressionist exhibition. See couples waltzing in the summer air and lovers stealing a glance, families sharing a quiet moment and friends raising a glass, all through the eyes of an artist unmatched in capturing the complexities of how people connect. Experience Renoir at his peak in the 1860s to 1880s, experimenting with style and theme to become an innovator of Impressionism. Walk with him through Montmartre in his iconic painting 'Bal au Moulin de la Galette' (1876) from the Musée d’Orsay, Paris, on display in the UK for the first time. Explore the sun-dappled gardens and swirling dance halls of Paris through 40 paintings, brought together from collections across the world. Linked through friendship and love, enjoy the tenderness and joy of some of Renoir’s most modern, uplifting and admired paintings.\n  →  Renoir gathered around the theme of love.\n\nRAW: For the first time in history, see all of Jan van Eyck’s portraits together. Only once, only at the National Gallery. Portraiture as we know it begins with van Eyck. His vision and skill launched painting into a new era of unrivalled realism. Watchful eyes, a hint of stubble, wrinkles, flushed cheeks. Van Eyck captured his subjects in all their intimate details. Though these people sat for their portraits 600 years ago, they feel alive today. ‘Van Eyck: The Portraits’ brings together from across Europe all nine of the artist’s known painted portraits, making up half of his surviving works worldwide. Breathing life into van Eyck’s world, the exhibition introduces the men and women he spent his life around. They are not kings, queens and aristocrats; they are successful craftsmen, merchants and the artist’s relatives. This is a story of people. This is the moment when access to art widened. The exhibition marks the first and only time these works can be brought together. And this incredible display can only happen here, at the Gallery. Join us in autumn 2026 for this once-in-a-lifetime exhibition.\n  →  All of Van Eyck's portraits together.\n\nRAW: Across Germany’s major cities, a new generation of artists emerged between 1900 and 1918 to change the rules of painting. They were the German Expressionists. Made up of two pioneering groups – Die Brücke (The Bridge) and Der Blaue Reiter (The Blue Rider) – these young artists painted raw emotions on canvas with a new intensity. Die Brücke was formed by a group of self-taught artists. Rebelling against conservative society, they lived and worked together in the bohemian corners of Dresden and other cities, before moving to Berlin, Germany’s rapidly modernising capital. For them, colour became a way to defy tradition and express themselves in new ways. Der Blaue Reiter came together in Munich around the painters Wassily Kandinsky and Gabriele Münter. The group divided their time between the bustling Munich streets and the lush landscapes around rural Murnau, 40 miles south of the city. There, the lakes and mountains fed their creative vision, full of bright colours and striking shapes.\n  →  Fifty German Expressionist works.\n\nRAW: See the works of the master of horse painting, George Stubbs Step into the world of George Stubbs, the visionary British painter. Marvel at his monumental portrait of a rearing racehorse, ‘Scrub’. In the 1750s, Stubbs spent 18 months in a remote barn in Horkstow, Lincolnshire. Hidden away, he devoted his time to studying and drawing the anatomy of horses. What resulted was the most thorough study on the subject for over a hundred years. Incredibly, Stubbs’s pictures of horses are still some of the most accurate ever painted, all while capturing their unique characters. In this exhibition, you’ll meet one of these horses, Scrub. Painted by Stubbs around 1762, we see Scrub rearing in a landscape backdrop — notably without a rider. In a nearby room is another monumental horse painting by Stubbs, this time of Scrub’s now famous contemporary, ‘Whistlejacket’. Painted around the same time, these are two of the first life-size portraits to depict horses without a human presence in British history. The paintings changed the spirit of equine art forever. ‘Stubbs: Portrait of a Horse’ will focus on the creation of ‘Scrub’, which will be joined by other paintings and drawings by the artist. Join us in spring 2026 to get a closer look at Stubbs’s groundbreaking work.\n  →  George Stubbs, master of horse painting.\n\nRAW: In an interplay of light and darkness, Joseph Wright of Derby conjures sublime pictures of discovery and learning. 'Wright of Derby: From the Shadows' is the first major exhibition dedicated to the British artist’s ‘candlelight’ paintings. We celebrate and look again at his most admired works. Illuminated faces gather around a variety of objects – from classical sculptures and scientific instruments to bones, bladders and animals. Through his unflinching scenes of people watching, Wright of Derby proposes moral questions about acts of looking. The strong light and deep shadows create drama, reminding us of great painters from earlier centuries like Caravaggio. Challenging the traditionally held view of Wright of Derby as a figurehead of the Enlightenment, this exhibition contributes to the ongoing re-evaluation of the artist, portraying him not merely as a ‘painter of light’. More than virtuoso scenes of dramatic light and shade, Wright of Derby used the night-time to explore deeper and more sombre themes, including death, melancholy, morality, scepticism and the sublime. With over twenty works, including other paintings, mezzotints, works on paper and objects the exhibition explores both Wright of Derby’s artistic practice and the historic context of scientific and artistic development in which they were made. Watch, along with the people he paints, as his scenes of spectacle and wonder unfold.\n  →  Joseph Wright of Derby's candlelight paintings.\n\nRAW: The sower, the woodcutter, a shepherd girl. These are the subjects that made French artist Jean-Francois Millet famous. Marking the 150th anniversary of his death, this is an opportunity to see some of Millet’s best-loved paintings and drawings. Born into a farming family in Normandy, Millet moved to the village of Barbizon in 1849 where he put the people who spent their life working on the land, often the poorest of the poor in 19th-century France, at the heart of his work. He knew these people and his realistic, unsentimental approach to painting them was completely new. See his iconic 'L’Angelus' (1859) from the Musée d’Orsay, Paris, a painting typical of the dignified way he captured the working people of his age. A husband and wife stand with their heads bowed. Lit by an almost ethereal, filtered light, they’ve stopped working in the fields to say the Angelus prayer. Admired and copied by Vincent van Gogh, he inspired Impressionists and Post-Impressionist artists including Edgas Degas and Camille Pissarro. His combination of subject and effects of light and tone saw his popularity soar at the end of the 19th and beginning of the 20th century. Experience the beauty and quiet power of Millet’s work – an artist who created some of the most realist yet timeless paintings of the 19th century.\n  →  The subjects that made Millet famous.\n\nRAW: See the painting 'The Courtyard of a House in Delft' by Pieter de Hooch through the eyes of a child. Take One Picture is the National Gallery's programme for primary schools. Each year, children make and exhibit artworks in response to one painting in our collection. This year’s painting, by 17th-century Dutch artist de Hooch, has inspired a wide range of projects, from wicker sculptures and cardboard houses to clay tiles and baked apple pies! Presented across three sites in and around the National Gallery, this year's exhibition can be enjoyed as artwork displays and as a digital augmented reality trail.\n  →  Children's artworks inspired by de Hooch.\n\nRAW: See the first UK exhibition of Mexico’s much-loved artist, José María Velasco. Velasco, working in Mexico in the 19th century, was a man of many interests. He was fascinated by advances in geology, the archaeology of his home country, the study of local flora, and the increasing presence of industrialisation. He painted the sweeping landscapes of the Valley of Mexico, the home of modern-day Mexico City, with exquisite detail. His impressive panoramic views of the valley reveal allusions to Mexico's historic past and its rapidly modernising present. Velasco was keenly aware of his country’s industrialisation, capturing expanding train lines and factories alongside botanically accurate studies of plants. His scientific eye inspired his art, and his love of geology is clear to see in his detailed depictions of rocks and volcanoes.\n  →  Mexico's landscape painter.\n\nRAW: Be blown away by Van Gogh’s most spectacular paintings in our once-in-a-century exhibition. Walk with a pair of lovers beneath a starry night. Look up at swirling clouds and cypress trees swaying in the wind. Stay a little while in Van Gogh’s favourite park, the ‘Poet’s Garden’, or under a shady tree in Saint-Rémy. We’re bringing together your most loved of Van Gogh’s paintings from across the globe, some of which are rarely seen in public. They will be paired together with his extraordinary drawings. Over just two years in the south of France, Van Gogh revolutionised his style in a symphony of poetic colour and texture. He was inspired by poets, writers and artists. We look at this time in Arles and Saint-Rémy as a decisive period in his career. His desire to tell stories produced a landscape of poetic imagination and romantic love on an ambitious scale. See up-close his ‘Starry Night over the Rhône’ (1888, Musée d’Orsay) and ‘The Yellow House’ (1888, Van Gogh Museum), as well as our own ‘Sunflowers’ (1888) and ‘Van Gogh's Chair’ (1889), among many others. Join us in celebrating our 200th birthday with Van Gogh’s ‘Poets and Lovers’.\n  →  Once-in-a-century Van Gogh exhibition.\n\nRAW: Immerse yourself in 200 years of extraordinary National Gallery stories. From a resident family of 14 and an intrepid travelling agent to ground-breaking scientists and a wartime pianist, NG Stories tells the history of the National Gallery through the people who made us what we are today. There’s a slate mine in Wales where paintings were safely stored during the Second World War. A guard dog who became a member of staff. And a Keeper’s family, with 14 children, who lived in the building and kept diaries. You’ll discover some of the untold personal stories of the Gallery and the special memories we have been privileged to help create for our visitors. From childhood adventures to life-changing first art encounters, our visitors have always been at the heart of what we do. Through magical soundscapes and immersive digital interactions, you'll experience the work of the many people here at the Gallery who help to care for the paintings and see how this work has changed over the years. This experience, both online and in the Gallery, uses digital technology to tell you the unexpected human stories which have shaped the past and present of our 200-year history.\n  →  Two hundred years of Gallery history.\n\nRAW: David Hockney, in his own words, has always been a looker. Throughout his career, Hockney has found inspiration in the work of other artists. He never tires of looking at paintings. For him, there’s magic in it every time, whether that’s enjoying a picture in a gallery or a much-loved poster at home. This very personal show brings together two Hockney paintings, one showing his mother and father and the other depicting his friend, curator Henry Geldzahler. They are displayed with the thread that ties them together, Piero della Francesca’s ‘The Baptism of Christ’. ‘My Parents’ and ‘Looking at Pictures on a Screen’ both include images of paintings from the National Gallery, a place Hockney knows and has loved throughout his long career. The artists whose portraits and landscapes line the walls are to him, his contemporaries. Their paintings inspire him today as much as any other influence on his work. The exhibition, part of our Bicentenary celebrations, is a chance to slow down, to take in what’s in front of us and enjoy life-enhancing art in the Gallery. Just like Hockney’s parents and friend Geldzahler, let’s take a longer look.\n  →  Hockney against Piero della Francesca.\n\nRAW: A cyclist cheekily sticking out her tongue, tough youths on Amsterdam's Nieuwendijk, young women in miniskirts. From The Netherlands to Cuba and Japan, Ed van der Elsken chased the same unfiltered energy. Different streets, a different time - and yet you recognise it. From his first steps as a photojournalist to the design of his final photo book With handwritten notes, contact prints, experiments from the darkroom Who was the man behind the camera? A journey through his work and life\n  →  Unfiltered street energy across decades.\n\nRAW: 150 drawings by the illustrator who gave post-war Netherlands a visual language all of its own Jip and Janneke, Pim and Pom, Pluk van de Petteflet. This summer the Rijksmuseum brings together some 150 original drawings by illustrator Fiep Westendorp. From early sketches to the illustrations that have stayed with generations of children.\n  →  150 original drawings by the illustrator.\n\nRAW: This summer, the Rijksmuseum Gardens are home to the work of Carel Visser, the most influential Dutch sculptor of the twentieth century.\n  →  Most influential Dutch sculptor of the twentieth century.\n\nRAW: In this intimate fashion presentation, 24 worn, altered and reused garments take centre stage. Signs of wear, repair and craftsmanship tell their story: from 17th-century embroidered mules to a dress worn for generations by the Six family.\n  →  Dress and textiles: garments from 1640 to 1930.\n\nRAW: One hundred years ago, Willem de Kooning left the Netherlands for a new life in New York, where he became one of the most influential artists of the 20th century. This autumn, he returns, with a major retrospective of his drawings, complemented by a selection of celebrated paintings and sculptures. Alongside the exhibition, two of his most iconic paintings will be displayed in the Gallery of Honour. This exhibition is made possible through the generous support of The Willem de Kooning Foundation, The Friends Lottery, Ammodo Art, Art Mentor Foundation Lucerne, Blockbusterfonds, Rijksmuseum International Circle, Rijksmuseum Friends and the Ministry of Education, Culture and Science.\n  →  120 works tracing De Kooning's process.\n\nRAW: Kadir van Lohuizen photographs the energy transition on and around the North Sea From offshore wind farms in the open sea to heavily secured data centers, the energy transition is taking place on a scale that is almost impossible to comprehend, largely beyond our view. Photographer and filmmaker Kadir van Lohuizen shows how the North Sea and the surrounding countries are changing at a breakneck speed due to the rising demand for energy. The exhibition is made possible in part by Floor Fonds/Rijksmuseum Fonds and Rijksmuseum NEXT.\n  →  Annual commission to a Dutch photographer.\n\nRAW: Passion, desire, lust, jealousy, cunning and deceit. The Rijksmuseum takes you on a journey into one of the greatest and most important sources of inspiration for artists: The Metamorphoses by the poet Ovid.\n  →  Ovid: Bernini, Titian to Rodin, Magritte, Bourgeois.\n\nRAW: At a time when AI is becoming increasingly sophisticated, you may ask yourself: when is a photograph real or fake? Yet images have been manipulated, often with surprising ease, since the very beginnings of photography. In FAKE! you will explore 50 historical images from our collection that reveal creative and deceptive visual illusions.\n  →  Early photocollages and photomontages.\n\nRAW: The Rijksmuseum presents two versions of Steve McQueen’s 34-hour video artwork, Occupied City.\n  →  Amsterdam under occupation, Steve McQueen.\n\nRAW: What was life really like in the 17th century? That’s the museum’s most-asked question. Now, the time has come to find out. At Home in the 17th Century offers an up-close experience of daily life 400 years ago. Immerse yourself in a full day of the 17th century as you walk among the nine diorama-style displays that make up this exhibition — packed with personal stories and unique objects.\n  →  Domestic life with Rembrandt, Hals, Vermeer.\n\nRAW: Discover how colonial and contemporary perspectives converge in photographs from the Indian subcontinent. Past meets present in the Crossings exhibition.\n  →  Photography from the Indian subcontinent.\n\nRAW: Internationally acclaimed artist Fiona Tan is given carte blanche at the Rijksmuseum. Step into the world of Monomania.\n  →  The artist's view on the collection.\n\nRAW: From Shiva and the Buddha to wine casks and weapons. Everything about bronze triggers your senses. For centuries, this material has played a central role in the traditions of Asia. Now you too can experience the beauty of bronze art at last.\n  →  Four thousand years of Asian bronze.\n\nRAW: Across the Netherlands, major music festivals draw vast, exuberant crowds. In this series, Eddo Hartmann photographs the individual festivalgoer, both one with the throng and lost against the backdrop of the Dutch events industry.\n  →  Dutch festivals photographed.\n\nRAW: “I made sculpture because what interested me in painting was the clarification of my ideas. I changed medium and worked in clay as a respite from painting when I had done absolutely all that I could for the moment. Which is to say that it was always for the purpose of organization. It was done to give order to my feelings, to seek a method that completely suited me. When I found it in sculpture, it helped me in painting.” Acquavella Galleries is pleased to present Matisse: The Pursuit of Harmony, an exhibition featuring fifty paintings, works on paper, and sculpture by Henri Matisse on loan from museums, foundations, and private collections. On view from April 9 through May 22, 2026, the exhibition traces Matisse’s investigation of form in two and three dimensions, from paintings and sculptures made at the start of the 20th century through the next five decades of his career. Although Acquavella has dealt in exceptional works by Matisse for over sixty years, this marks the gallery’s first exhibition devoted to the French artist since 1973. Henri Matisse (1869–1954) is widely regarded as the unparalleled modernist master of color, having revolutionized art with his luminous palette and lyrical color harmonies, but his experimentation with form was equally central to his artistic pursuits. In each chapter of his career, Matisse worked to refine and essentialize his approach to form and the figure. In his own words: “A work of art must be harmonious in its entirety: any superfluous detail would replace some other essential detail in the mind of the spectator.” Simplified, rhythmic forms, often inspired by the graceful, flowing lines of the arabesque, were integral to Matisse’s lifelong pursuit of harmony and balance in his art. The presentation begins with two early sculptures, The Serf (1900–04) and Madeleine I (1901), and his closely related painting Male Model (1900) and drawing Study for Madeleine (c. 1901). Of the more than eighty sculptures Matisse created, more\n  →  New York. Matisse's investigation of form.\n\nRAW: The exhibition brings together an expansive dialogue of artists, from Impressionist and modern masters to leading contemporary figures including Jules de Balincourt, Fernando Botero, Will Cotton, Giorgio de Chirico, Edgar Degas, Raoul Dufy, Derek Fordjour, Lucian Freud, Marino Marini, Tomokazu Matsuyama, Joel Mesler, Sarah Miska, Pablo Picasso, Roy Lichtenstein, Robert Longo, Tom Otterness, Susan Rothenberg, Laurie Simmons, Hank Willis Thomas, and Summer Wheat. Acquavella Galleries is pleased to present Soft Reins, a group exhibition exploring the enduring significance of the horse as a powerful symbol and artistic muse, highlighting how the animal has inspired art, mythology, and storytelling throughout art history. Guest curated by the artist Tomokazu Matsuyama, Soft Reins will be on view at Acquavella’s Palm Beach gallery from February 6 through March 22, 2026. An opening reception and panel discussion will also be held at the gallery on the evening of February 6th. The title Soft Reins refers to a dynamic between a horse and its rider: when drawing gently on the reins, the horse responds naturally and without resistance. This intuitive ability and connection between horse and rider mirrors the dynamic between the artist and muse, presenting the horse as an enigmatic source of inspiration across cultures and histories. By presenting a diverse array of artists and media, Soft Reins underscores the horse's lasting impact on the artistic imagination. It highlights its capacity to convey profound messages across distinct cultures and eras, making it a dynamic subject for ever-changing times. The exhibition brings together an expansive dialogue of artists, from Impressionist and modern masters to leading contemporary figures including Jules de Balincourt, Fernando Botero, Will Cotton, Giorgio de Chirico, Edgar Degas, Raoul Dufy, Derek Fordjour, Lucian Freud, Marino Marini, Tomokazu Matsuyama, Joel Mesler, Sarah Miska, Pablo Picasso, Roy Lichtenstein, Robert Longo, Tom\n  →  Palm Beach. Horse and equestrian.\n\nRAW: “I think good paintings are moving images, because they’re not static. Great paintings move.” To read Sarah Messerschmidt's catalogue essay, please click here. Acquavella Galleries is pleased to present All the Way, Nicole Wittenberg’s second solo exhibition with the gallery and her first at Acquavella’s New York location. The exhibition will be on view from October 16 through December 5, 2025. A reception for the artist will be held the evening of Wednesday, October 29, from 5:00 to 7:00 pm. Wittenberg’s return to Acquavella this fall follows the artist’s three solo museum exhibitions over this summer: Maison La Roche, Fondation Le Corbusier, Paris; the Ogunquit Museum of American Art, Ogunquit, Maine; and the Center for Maine Contemporary Art, Rockland, Maine. Several works from Wittenberg’s museum exhibitions in Rockland and Ogunquit will appear in All the Way. All the Way explores painting’s ability to capture the sensation of a singular moment extended over time. Nicole Wittenberg's painting practice takes scenes, elements, and encounters with the natural world as its subject matter. Her landscapes and twisting florals explore the medium’s ability to capture temporal moments as impressions that retain the energy of the experience.\n  →  New York. First solo.\n\nRAW: \"Everything is connected, and everything is one. Painting, for me, is a way of knowing who I am. Tracing that history back, it became clear to me that I, too, am made of stardust; and that realization felt profoundly natural. The primeval landscapes I have encountered in my life, too, if traced back far enough, were once stardust.\" Acquavella Galleries is pleased to present Stardust, a solo exhibition of fifteen paintings by the Japanese artist Yuka Kashihara in its Palm Beach gallery, on view from October 15 through December 8, 2025. This suite of acrylic and oil paintings on canvas marks a continuation of the artist’s interest in imagining the otherworldly, while looking even farther to the cosmos. Her work is often sparked by instigating moments and views observed while traveling or walking, which she then blends with conjured vistas. In her new paintings, Kashihara explores our connection with the ancient and cosmic, combining the two ideas by exploring the origin of all organic matter, beginning deep in space. Kashihara cites Marcus Chown’s book, The Magic Furnace, as an inspiration for her new work. He states: “Every atom in our bodies has an extraordinary history. Our blood, our food, our books, our clothes–everything contains atoms forged in blistering furnaces deep inside stars, which were blown into space by those stars’ cataclysmic explosions and deaths…The birth of every atom was marked by cosmic events on an enormous scale, against a backdrop of unimaginable heat and cold, brightness and darkness, space and time.” The artist’s newest body of work draws on this idea of celestial kinship.\n  →  Palm Beach. Recent paintings.\n\nRAW: \"Painting is an urge that swallows you whole. You don't know exactly where you're going. You lose yourself completely and you end up doing something you had forgotten, or something you wanted to do without knowing how you got there. A miracle that repeats itself differently each time. It's a primitive thing, a vital thing. I felt it right away when I was painting beside my mother at twelve years old.\" Acquavella Galleries is pleased to present Miquel Barceló, the renowned Spanish artist’s fourth solo exhibition with the gallery. The exhibition presents over two dozen new paintings and a selection of recent ceramic works, featuring the artist’s signature use of layered materiality, vivid color, and richly textured surfaces. The exhibition is on view April 24 to May 30, 2025 at Acquavella’s New York location. Over the past four and a half decades, the Spanish artist Miquel Barceló (b. 1957) has explored a diverse range of media, including painting, works on paper, ceramic, bronze sculpture, large-scale installation, and performance. In addition to his deep-rooted connection to Spain and his native Mallorca, Barceló draws inspiration from his global travels, continuously experimenting with new materials and techniques influenced by ancient and contemporary cultural traditions. Throughout his practice, the artist’s fascination with the natural world has been central, resulting in textured canvases filled with earthly materiality, tactile surfaces, and compositions inspired by the effects of light and ever-changing colors of the sea. In his latest series of paintings, Barceló deepens his engagement with organic subject matter, drawing inspiration from the sea surrounding Mallorca, where he lives and works in addition to Paris. In densely layered surfaces, Barceló’s new “still life” paintings feature scenes filled with tropical fish, crabs, shells, crustaceans, and marine vegetation that emerge from layers of muted chromatic grays in brilliant hues of red and blue. Traces\n  →  New York. Recent work.\n\nRAW: \"Picasso: the word is synonymous with art. For years, I’ve studied so many systems. McDonald’s, architecture of Le Corbusier and the Bauhaus, military-industrial systems. For me, it was a way of trying to understand Picasso the way I would understand a battleship or a skyscraper. To understand how something is made. So, working with Picassos and understanding them is a way of taking them apart.\" New York, NY (October 7, 2024) – Acquavella Galleries is pleased to present our fifth solo exhibition with Tom Sachs. Titled Bronze, the exhibition features new and recent bronze sculptures by the artist and will be on view at our New York gallery from November 7—December 13, 2024. In this exhibition, Sachs continues his formal investigation and exploration of the modernist canon. Guided by the iconoclastic spirit and wit of Marcel Duchamp’s iconic “readymades,” Sachs employs his signature bricolage technique to reimagine sculptures by Pablo Picasso and Constantin Brâncuși. Drawing on an interplay between technical production and quotidian materials, these sculptures question traditional conceptions of what constitutes a work of art. Previous bodies of work have also engaged the annals of modernism, including Sachs’s take on Piet Mondrian’s abstractions in the 1990s, recreated out of duct tape and plywood; foamcore interpretations of Le Corbusier's housing complexes in the aughts; and, more recently, the reimagining of Picasso’s paintings, particularly from the so-called “war years” period between 1937 and 1945. Bronze features twelve sculptures, each constructed from a bricolage of found, everyday objects, which have been cast in bronze and painted with enamel. Drawing from Picasso’s sculpted oeuvre, Sachs’s new works are in dialogue with sculptures the Spanish artist created from the 1930s through the early 1950s, many of which were also assemblage sculptures constructed out of found materials.\n  →  New York. Bricolage in bronze.\n\nRAW: “It is a personal challenge to bring drawing to the extreme and see how far my eyes and fingers can go.” New York, NY­­–July 24th, 2024– Acquavella Galleries is pleased to present Drawing on Canvas, an exhibition of new and recent works by the artist Jacob El Hanani. In his fifth solo exhibition with the gallery, El Hanani displays a masterful dedication to the craft that he has honed over the past 50 years. Constructing abstract pen and ink drawings that involve the artist applying thousands of marks by hand, El Hanani continues his trademark practice in Drawing on Canvas while incorporating his recent shift from working on paper to working on gessoed canvas on a much larger scale. The subtle, amorphous surfaces of these canvases upon closer inspection reveal dense webs of lines and patterns, built from repeated, rudimentary marks—often simple lines or circles. As the elemental forms grow into increasingly complex patterns, the entire canvas transforms into something much more than a summation of its parts. Day by day, El Hanani slowly creates these drawings over the course of months, his ceaseless labor equally as impressive as the resulting artworks. El Hanani’s work is informed by the meditative rigor found in the Jewish practices and traditions in which he was raised. Most clearly, the artist is in dialogue with micrography, an ancient art of calligrams that once decorated Hebrew Bibles and religious manuscripts. Like these historic drawings, each small mark on El Hanani’s canvases is a gesture in storytelling and world-building.\n  →  New York. Microscopically fine line drawing.\n";
// ===== END SHARED =====
