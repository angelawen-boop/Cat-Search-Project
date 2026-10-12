// publisher_match.js — the one rule for "is this the publisher her card names?".
// build/lookup_proof_check.js requires it; build/live_check.js writes its text into the
// live check page, so there is one copy. Plain functions with no imports.
//
// A publisher is its SET of houses. Each side is split where the app recognises a
// separator ("/", ";", "&", " : ", " and ", " with "), each house folded (accents,
// capitals, punctuation, a leading "the", trailing generic words only), and the sets must
// match both ways: no missing house, no extra one. Two houses are the same only when their
// folded names are equal or `aka` (house → other names, docs/lookup_proof_cards.json)
// lists one as another name for the other. Nothing else.

function pmFold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').toLowerCase();
}
const PM_SPLIT = /\s*[\/;&]\s*|\s+:\s+|\s+(?:and|with)\s+/i;
const PM_TAILS = ['editions d art', 'editions', 'edition', 'books', 'publishing', 'publishers', 'publications', 'ltd', 'limited', 'inc'];
function pmFoldHouse(s) {
  let t = pmFold(s).replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
  for (;;) {
    const hit = PM_TAILS.find(x => t.length > x.length && t.endsWith(' ' + x));
    if (!hit) return t;
    t = t.slice(0, t.length - hit.length - 1).trim();
  }
}
const pmHouses = s => String(s == null ? '' : s).split(PM_SPLIT).map(pmFoldHouse).filter(Boolean);
function pmSamePublisher(got, want, aka) {
  const pairs = Object.entries(aka || {}).filter(([k]) => !k.startsWith('_'))
    .flatMap(([k, others]) => others.map(o => [pmFoldHouse(k), pmFoldHouse(o)]));
  const same = (a, b) => a === b || pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const g = pmHouses(got), w = pmHouses(want);
  if (!g.length || !w.length) return false;
  return g.every(a => w.some(b => same(a, b))) && w.every(b => g.some(a => same(a, b)));
}
if (typeof module !== 'undefined' && module.exports) module.exports = { pmFold, pmFoldHouse, pmHouses, pmSamePublisher };
