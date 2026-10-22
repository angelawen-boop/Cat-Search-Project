/**
 * ANSWER CHECK — every description Claude writes is checked here before it is used: by the
 * compressor (compress_cli.js --check, which --apply runs first) and by Add by link (written into
 * Cat_Watch.jsx by build/sync_shared.js). One copy, so the two cannot drift. A description that
 * fails is asked for again; nothing is written until it passes (her decision; docs/compression.md,
 * "Enforcement").
 *
 * Shape: present, one line, MAX_WORDS at most, a full stop, no "In English" line, no HTML or code
 * fence. Claims: a claim word ("first", "only", "largest"…) or a number in the description must be
 * on the page — the rule the prompt states and Claude breaks (Pontormo: "First major monographic
 * exhibition", no "first" in the text). The page can be in any language the venues use, so each
 * claim is matched against its words in each.
 */
'use strict';

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

module.exports = { MAX_WORDS, wordCount, validateAnswer, validateEnglish, stringFaults, unsupportedClaims, CLAIMS };
