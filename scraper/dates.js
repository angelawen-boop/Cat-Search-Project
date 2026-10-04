/**
 * dates.js — THE date reader, shared by the scraper and the app.
 *
 * ONE COPY. It lived inside sweep_prototype.js until 4 Oct 2026, when the app
 * began reading show pages itself ("Add by link", docs/picked_shows.md). Two
 * date parsers have drifted apart twice before and each time lost dates
 * silently, so the app does not get a copy: `node build/sync_shared.js` writes
 * this file's body into Cat_Watch.jsx between the SHARED markers, and
 * `npm test` fails if the two ever differ. Edit HERE, then run the sync.
 *
 * Pure: no require, no network, no files. Everything above the
 * module.exports line is what the app receives, so nothing above it may use
 * Node.
 */
'use strict';

// ── Date helpers ──────────────────────────────────────────────────────────────
// Parse date strings like "March 2–July 26, 2026" or "April 16–July 19, 2026" or "July 2, 2022–June 28, 2026"
// Returns { start: 'YYYY-MM-DD'|'', end: 'YYYY-MM-DD'|'', raw: original }
const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,

  // ITALIAN. Five of the wired venues are Italian — capo, brera, borghese,
  // dellav and uffizi — and their listings print dates in their own language:
  // Capodimonte's read "(11 maggio-12 giugno 2025)". Without these the parser
  // saw no month name at all, the plausible-year guard refused every bare
  // number, and all 50 Capodimonte rows came out undated. Undated rows cannot
  // be excluded by the lookback, so its entire history back to 2013 survived
  // and she correctly spotted that 50 was too many for the museum.
  //
  // Deliberately in the SHARED map rather than a per-venue rule, like every
  // other format: a month name learned at one venue is worth having at all of
  // them. Note gennaio/giugno and marzo/maggio differ only late in the word,
  // which is why abbreviations below stay long enough to stay unambiguous.
  gennaio:1, febbraio:2, marzo:3, aprile:4, maggio:5, giugno:6,
  luglio:7, agosto:8, settembre:9, ottobre:10, novembre:11, dicembre:12,
  genn:1, febbr:2, magg:5, giu:6, lug:7, ago:8, sett:9, ott:10, dic:12,

  // THE THREE-LETTER ITALIAN FORMS, added 12 Sep 2026 from the Gallerie
  // dell'Accademia. Its ENGLISH exhibition page prints the run in abbreviated
  // Italian — "10 set 2026 - 22 nov 2026" — so a row she could see dated on the
  // site arrived with both columns blank and a note blaming the venue for
  // publishing only "10 September". `nov` already matched as English, `set` did
  // not: the map held `sett` but the site writes three letters.
  //
  // `gen` and `mag` are added with it rather than waiting to be caught by
  // another venue's review. The rest of the three-letter forms — feb, mar, apr,
  // giu, lug, ago, ott, dic — are already here or already English.
  set:9, gen:1, mag:5,

  // A VENUE'S OWN MISSPELLING, 25 Sep 2026. Jacquemart-André's past listing
  // prints "From September 6, 2024 to Feburary 9, 2025"; without this the run
  // lost its closing date and was stored as one day. Added to the shared map
  // like every other spelling a venue has taught us.
  feburary:2 };

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
/**
 * A weekday name sitting in front of a date, which every range pattern trips on.
 *
 * LONGEST ALTERNATIVE FIRST, the same trap as the Italian "al" / "all'": with
 * `sat` ahead of `saturday` the match stops after three letters, leaves "urday"
 * behind, and the strip silently does nothing. The first version of this had
 * exactly that bug and removed "Sunday" while leaving "Saturday" untouched.
 *
 * ANCHORED ON WHAT FOLLOWS, so it only fires where a date really comes next —
 * a day number or a month name. Without that, a bare "Sun " would be stripped
 * out of ordinary prose ("the Sun King, Louis XIV") whenever a page's text was
 * scanned for dates.
 */
const WEEKDAY_PREFIX_SRC =
  '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
  '|thurs|thur|tues|weds|mon|tue|wed|thu|fri|sat|sun)\\.?,?\\s+';

// ORDINAL DAYS — "From May 23rd to September 20th, 2026", "Until December
// 06th, 2026" — every date on the Musée d'Orsay's cards, 25 Sep 2026. The
// suffix defeats every pattern, so both parsers drop it first: a day number of
// one or two digits followed by st/nd/rd/th and nothing else.
const ORDINAL_SUFFIX = /\b(\d{1,2})(?:st|nd|rd|th)\b/gi;

const MONTH_PATTERN =
  '(?:January|February|Feburary|March|April|May|June|July|August|September|October|November|December' +
  '|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre' +
  '|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec' +
  // LONGEST FIRST WITHIN EACH LANGUAGE: `sett` must precede `set`, `genn`
  // precede `gen` and `magg` precede `mag`, or the match stops three letters in
  // and leaves a stray "t" behind — the same trap as the Italian "al" before
  // "all'" and as `sat` before `saturday`.
  '|genn|febbr|magg|giu|lug|ago|sett|ott|dic|set|gen|mag)\\.?(?![A-Za-z])';

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
//
// ITALIAN, added 12 Sep 2026. Capodimonte publishes its runs only on the
// exhibition's own page and only as a sentence: "Dal 16 ottobre 2025 al 6
// gennaio 2026". Without "al" as a separator no pattern matched, all 50 rows
// came out undated, and undated rows cannot be excluded by the lookback — so
// the museum's entire history survived and she spotted the count was far too
// high for the institution.
//
// "al" ELIDES before a vowel — "Dal 16 aprile all'8 settembre 2026" — in both
// the typographic apostrophe and the plain one, so both are accepted. "alle"
// and "allo" appear in the same position. This is spelling, not judgement.
// LONGEST ALTERNATIVE FIRST: regex alternation takes the first that matches, so
// a bare "al" listed before "all'" would match the first two letters of
// "all'8 settembre" and leave "l'8", which is not a day.
// A COMMA MAY SIT IN FRONT OF THE SEPARATOR, and leaving it out cost Brera two
// rows. It writes "From May 16, 2025, to May 17, 2027" — the comma after the
// opening year, before "to". Without this the range failed, the scan fell
// through to a single date, and Pinacoteca viaggiante was stored as ENDING on
// its opening day. The same break hid Giorgio Armani's opening date, whose page
// reads "From September 24, 2025, to January 11, 2026".
const RANGE_SEP = "\\s*,?\\s*(?:-|t/m|to|till|until|through|all['\u2019]|all[oe]|al)\\s*";

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
const WEEKDAY_PREFIX = new RegExp(WEEKDAY_PREFIX_SRC + '(?=\\d|' + MONTH_PATTERN + ')', 'gi');
const stripWeekdays = t => String(t || '').replace(WEEKDAY_PREFIX, '');

/**
 * A run that was EXTENDED after it was announced.
 *
 * The Uffizi's card for 1925-1955 Fashion in the Spotlight reads
 *   "From 18/06/2025 to 28/09/2025, extended to02/11/2025"
 * — note the missing space, which is theirs. Read as an ordinary range it closes
 * on 28 September and the extension is lost, so an exhibition she could still
 * have bought a catalogue for reads as five weeks more closed than it was. She
 * caught it on the listing page.
 *
 * NOT A UFFIZI RULE. Capodimonte writes the same thing in Italian — "prorogata
 * al 9 giugno 2026", "prorogata all'8 settembre 2026" — and its Samori row has
 * exactly this defect today. A venue that extends a show is a general fact
 * about museums, so it belongs in the shared parser like every other format.
 *
 * THE EXTENSION ONLY EVER MOVES THE CLOSING DATE LATER. If the phrase yields a
 * date that is not after the one already read, it is ignored rather than
 * trusted — that way a stray match cannot shorten a run or rewrite an opening.
 */
const EXTENDED_TO = new RegExp(
  // The trigger is the WORD, verb or noun: "extended", "extension",
  // "prorogata". Borghese writes "with an extraordinary extension through
  // October 11", so a few words are allowed between the trigger and the
  // separator — but not a full stop, which would let it reach into the next
  // sentence and pick up an unrelated date.
  '(?:extend(?:ed|ing)?|extension|prorogat[ao])[^.]{0,30}?' +
  // Longest alternative first, or a bare "al" matches the first two letters of
  // "all\'8" — the elision trap from the Italian date formats.
  '(?:through|until|to|all[\'\u2019]|alla|al)\\s*' +
  '(' +
    '\\d{1,2}\\s*[/.]\\s*\\d{1,2}\\s*[/.]\\s*\\d{4}' +      // 02/11/2025
    '|\\d{1,2}\\s+' + MONTH_PATTERN + '(?:\\s+\\d{4})?' +          // 9 giugno 2026
    '|' + MONTH_PATTERN + '\\s+\\d{1,2}(?:,?\\s*\\d{4})?' +        // October 11
  ')', 'i');

/**
 * Apply an extension to a run that already has a closing date.
 *
 * THE EXTENSION ONLY EVER MOVES THE CLOSING DATE LATER. If the phrase yields a
 * date that is not after the one already read, it is ignored rather than
 * trusted — a stray match cannot shorten a run or rewrite an opening.
 */
function applyExtension(range, text) {
  if (!range || !range.end || !text) return range;
  const t = String(text);
  const m = EXTENDED_TO.exec(t);
  if (!m) return range;

  const dm = readDayMonth(m[1]);
  if (!dm) return range;
  let { day, mon, year } = dm;
  const quote = frag(m);

  // NO YEAR ON THE EXTENSION — the usual case in prose. It is derived from THE
  // DATE IT EXTENDS: the closing date written just before the trigger, in the
  // same passage. Capodimonte: "fino al 28 ottobre (prorogato fino al 11
  // novembre)" extends 28 October, so it is 11 November of that year; "until
  // 20 December, extended to 18 January" crosses into the next — the ONLY way
  // a year is ever added. Never derived from the range's closing date and
  // rolled forward: that date may already BE the extension (Capodimonte's
  // header prints it), and rolling it on put Gricci and Lotto a year late.
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

// BEFORE CHANGING ANYTHING IN THIS PARSER, READ docs/scraper.md SECTION 3.
// It holds every format found in the wild, the three guards that stop art
// history being read as exhibition dates, and the reason `looseSingles` exists
// — a rule that is safe on a listing card and a lottery on a whole page. Each
// of those cost real rows, and several of them cost them twice.
function findDateRange(raw, opts = {}) {
  return applyExtension(findDateRangeCore(raw, opts), raw);
}

function findDateRangeCore(raw, opts = {}) {
  const looseSingles = opts.looseSingles !== false;
  if (!raw) return { start: '', end: '', raw: '' };
  // Normalise every dash a museum's typesetter might reach for. The National
  // Gallery uses U+2012 FIGURE DASH on some cards and U+2013 EN DASH on
  // others; with only the en dash normalised, "15 October 2026 - 7 February
  // 2027" fell through the range patterns and came out as 1 October 2026.
  const s = String(raw).replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    // WEEKDAY NAMES CARRY NO DATE AND BREAK EVERY RANGE PATTERN.
    //
    // The Wallace Collection prints "Saturday 23 May - Sunday 29 November
    // 2026". Strip the two weekdays and that is an ordinary day-first range
    // this parser reads correctly; leave them in and every pattern misses,
    // the scan falls through to the bare month-and-year rule, and the row
    // arrives with NO DATES and a note saying the venue published none — which
    // was a lie about the venue, since it had published the run in full.
    //
    // Safe to remove universally: a weekday is derivable from the date, so it
    // can never be the only source of anything. Abbreviations included, with
    // the optional full stop and comma that follow them in the wild.
    .replace(WEEKDAY_PREFIX, '')
    .replace(ORDINAL_SUFFIX, '$1')
    .replace(/\s+/g, ' ').trim();
  const M = MONTH_PATTERN;

  // ALL-NUMERIC RANGE — and the order is PROVED from the numbers, never assumed.
  //
  // The Uffizi publishes "From 21/03/2024 to 28/04/2024" and nothing else, so
  // 9 of its 16 rows had no closing date. The objection to reading these is
  // that 03/04 could be 3 April or March 4th — but that objection does not
  // apply to a string that answers the question itself: 21 cannot be a month,
  // so THAT range is day-first, and the other end inherits the same order
  // because one venue does not switch conventions mid-sentence.
  //
  // So: if either end has a first component above 12, the range is day-first.
  // If either has a SECOND component above 12, it is month-first. If neither
  // end proves anything, the range is genuinely ambiguous and is REFUSED
  // rather than guessed — a wrong date here would be plausible, silent, and
  // able to decide whether a show passes the lookback. Her standing rule: use
  // the logic where it applies, leave the column blank where it does not.
  //
  // LISTING CARDS ONLY — and this was learned by breaking it. On a card the
  // numbers are about the one exhibition; on a whole PAGE they are a lottery,
  // exactly as the bare month-and-year rule is. Run unguarded, this branch gave
  // two Uffizi exhibitions the run of "Vasari Corridor. Friday evening opening"
  // — a related item in the page's sidebar — because it was simply the first
  // numeric range in the text. That is the Waldmüller failure again, and the
  // contradiction guard could not catch it because the listing had supplied no
  // date to contradict. So it obeys looseSingles like every other loose rule,
  // and a page that publishes its dates only in a sidebar now yields a blank
  // column and a note, which is the honest answer.
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
      // A PUBLISHED OPENING YEAR THAT FAILS THE PLAUSIBILITY CHECK REFUSES THE
      // WHOLE RANGE — it is never quietly swapped for the closing year.
      //
      // Capodimonte's page for its Mimmo Jodice memorial room says
      //   "Mimmo Jodice ( Napoli 29 marzo 1934 - 27 ottobre 2025)"
      // — the photographer's birth and death. 1934 is outside 1990-2035 and was
      // therefore DISCARDED, after which the opening year was worked out from
      // the closing one, and an artist's lifespan was stored as the
      // exhibition's run: 29 Mar 2025 to 27 Oct 2025. The row looked perfectly
      // healthy; only reading it against the site could show it.
      //
      // The old line treated "no year published" and "a year published that
      // cannot be an exhibition year" as the same thing. They are opposites:
      // the first is a gap to fill, the second is proof this sentence is not
      // about an exhibition's run at all.
      if (dm[3] && !plausibleYear(dm[3])) return { start: '', end: '', raw: '' };
      const startYr = dm[3] ? parseInt(dm[3], 10)
                            : startYearFor(sMo, sDay, eMo, eDay, endYr);
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(dm));
    }
  }

  // "Month D, YYYY - Month D, YYYY" — year on both sides
  let m = s.match(new RegExp(`(${M}\\s+\\d{1,2},\\s*\\d{4})${RANGE_SEP}(${M}\\s+\\d{1,2},\\s*\\d{4})`, 'i'));
  if (m) return sane(parseMonthDay(titleCase(m[1]), null) || '', parseMonthDay(titleCase(m[2]), null) || '', frag(m));

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
      return sane(ymd(startYr, sMo, sDay), ymd(endYr, eMo, eDay), frag(m));
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
    if (mo) return sane(ymd(m[4], mo, m[2]), ymd(m[4], mo, m[3]), frag(m));
  }

  // ── A RANGE WHOSE CLOSING SIDE IS NOT A DATE ──────────────────────────────
  //
  // MoMA prints "Aug 1, 2026-Summer 2027", "Sep 3, 2026-Spring 2027" and
  // "Mar 8, 2025-ongoing". Every one of those has a real, published OPENING
  // date and a closing side the museum has deliberately left vague.
  //
  // These must be caught HERE, above the single-date rule below, and that
  // placement is the whole point. Left to fall through, the single-date rule
  // found "Aug 1, 2026", had no reason to think it was half of a range, and
  // wrote it into the CLOSING column — so an exhibition opening in August 2026
  // was recorded as having closed in August 2026. Not a gap: a wrong answer
  // shaped exactly like a right one, in the column her whole out-of-print
  // window is calculated from.
  //
  // What is written is what the venue actually published: the opening date,
  // and NO closing date. The season's year is kept as `latestYear`, which is
  // a genuine upper bound for the lookback without inventing a day.
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

  // ── A MONTH AND DAY WITH NO YEAR, CARRYING A PREPOSITION ──────────────────
  //
  // MoMA's current shows print "Through Oct 4" and "Through Nov 29"; its
  // rolling ones print "Ongoing from Oct 19". Month-first, and no year at all
  // — the existing preposition rules are day-first and all require one, so
  // every current MoMA exhibition came back with NO CLOSING DATE. That is the
  // one column this project cannot do without.
  //
  // THE YEAR IS DERIVED, NOT GUESSED, and only in a case where the derivation
  // has one answer. A listing of what is on now cannot be telling us about a
  // show that closed last year, so the closing date is the next occurrence of
  // that month and day: this year if it has not passed, otherwise next. That
  // is the same reasoning startYearFor() already uses to put an opening year
  // on "December 5 - January 20, 2026", and it is logic rather than a guess.
  //
  // `today` is a parameter with a real default so a fixture can pin it. A
  // parser that silently consulted the clock would pass in September and fail
  // in November, which is a test that cannot be trusted either way.
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

  // A single day-first date carrying a preposition, as Rijksmuseum's cards do:
  //   "WORN till 21 March 2027"          -> a closing date
  //   "WILLEM DE KOONING from 9 October 2026" -> an opening date
  // Placed after the range patterns so "from 25 October 2022 to 29 January
  // 2023" is still read as a range rather than just its opening date.
  m = s.match(new RegExp(`\\b(till|until|through|to)\\s+(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: '', end: ymd(m[4], mo, m[2]), raw: frag(m) };
  }

  m = s.match(new RegExp(`\\b(from|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})`, 'i'));
  if (m && plausibleYear(m[4])) {
    const mo = monthNum(m[3]);
    if (mo) return { start: ymd(m[4], mo, m[2]), end: '', raw: frag(m) };
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
        raw: frag(m),
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
      raw: frag(m),
    };
  }

  return { start: '', end: '', raw: '' };
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
// THE QUOTE IN HER NOTE IS THE FRAGMENT THE DATES CAME FROM, never the whole
// input. findDateRange was written for a LISTING CARD, where the input is a
// line or two, so returning the input as `raw` was indistinguishable from
// returning the match. Then findDateRangeInProse started falling through to it
// with a WHOLE PAGE as the input — and `raw` is quoted verbatim into the notes
// column, which is shown verbatim on her approval card. Capodimonte's rows
// averaged 6,709 characters of notes and one carried 17,734: the entire page,
// navigation and ticket prices included, under the words "read from a
// sentence". The Wallace's Churchill row did the same.
//
// The fault was not the fall-through, which is right and is there to stop the
// two parsers drifting. It was that one parser's idea of "raw" only held while
// its input stayed small. So every branch now quotes ITS OWN MATCH, capped,
// exactly as the prose parser already did — the size of the input stops
// mattering. A branch that returns no dates returns no quote either; nothing
// downstream writes a note without a date to explain.
function frag(m) { return m && m[0] ? String(m[0]).replace(/\s+/g, ' ').trim().slice(0, 120) : ''; }

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
  // THE TWO PARSERS MUST NOT DIVERGE — they have drifted twice before and each
  // time silently lost dates. The extension rule is applied here as well, and
  // Giorgio Armani is why it matters beyond tidiness.
  //
  // His page reads "From September 24, 2025, to January 11, 2026 Extended until
  // May 3, 2026". The listing had already given the extended closing date, so a
  // prose range ending 11 January CONTRADICTED it — and the guard that discards
  // a contradictory range threw away the opening date with it. The row lost a
  // date the page states plainly, because one parser knew about extensions and
  // the other did not.
  return applyExtension(findDateRangeInProseCore(text, hintYear), text);
}

function findDateRangeInProseCore(text, hintYear) {
  if (!text) return { start: '', end: '', raw: '' };
  const s = String(text).replace(/[–—]/g, '-').replace(ORDINAL_SUFFIX, '$1').replace(/\s+/g, ' ');
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
    one = s.match(new RegExp(`\\b(from|opens?|opening|dal|dall['\u2019]?)\\s*(\\d{1,2})\\s+(${M})(?!\\s*,?\\s*\\d{4})`, 'i'));
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
  // The CORE, not findDateRange: the wrapper below applies the extension, and
  // applying it here too ran it twice — Gricci and Lotto each a year late.
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
