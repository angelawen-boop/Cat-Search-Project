/**
 * WHICH LISTING PAGES AN EXHIBITION WAS SEEN ON — the one owner of those
 * sentences, for the scraper that writes them and qc.js that reads them back.
 *
 * WHY THIS IS A LIST AND NOT A SENTENCE ADDED PER LINK. A venue links one
 * exhibition several times in a card — picture, name, button — so a per-link
 * sentence named the same page two or three times: 56 rows of the 13 Sep sweep.
 * The old repair skipped a sentence already present in the note, i.e. read the
 * fact back out of prose. Now the pages are recorded as data, each at most
 * once, and the sentences are written from that list when the venue finishes.
 *
 * Her use of these notes: the only trace of where the scraper got a row.
 */
'use strict';

const found = ctx => `Found on the venue's "${ctx}" listing page.`;
const also  = ctx => `Also listed on the venue's "${ctx}" page.`;

/** Record one sighting. The first page stays first; a page is never recorded twice. */
function seenOn(row, ctx) {
  if (!row._pages) row._pages = [];
  if (!row._pages.includes(ctx)) row._pages.push(ctx);
}

/** The sentences for a row's pages, first sighting first. '' for a row with none (a marker). */
function listingNote(pages) {
  if (!pages || !pages.length) return '';
  return [found(pages[0]), ...pages.slice(1).map(also)].join(' ');
}

/** Read the page labels back out of a finished CSV note, for qc.js. */
function pagesFromNote(notes) {
  const s = String(notes || '');
  const out = [];
  const re = /(?:Found on the venue's "([^"]*)" listing page\.|Also listed on the venue's "([^"]*)" page\.)/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}

/**
 * The newest year a year-archive page can cover, from the label
 * expandYearArchive() gives it: "past 2024" → 2024, "past p2 2025" → 2025,
 * a Morgan season "past 2024-2025" → 2025. null for a page that is not a year.
 */
function archiveYear(ctx) {
  const m = String(ctx).match(/(\d{4})(?:-(\d{4}))?$/);
  if (!m) return null;
  return Number(m[2] || m[1]);
}

module.exports = { seenOn, listingNote, pagesFromNote, archiveYear };
