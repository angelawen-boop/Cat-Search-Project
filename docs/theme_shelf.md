# Theme Shelf — art books by theme

**Prototype 1, published for her review:** https://claude.ai/artifact/V5jWKh9F8cFqNQek2owyzT
(private; republish to THAT url — `build/build_shelf.js` prints it). Source `Theme_Shelf.jsx`.

## What she asked for (her design)

- A wishlist of art books that follow no exhibition (fashion as shown in art: Watteau,
  rococo women). **Its own page**, never mixed into Cat Watch's ledger.
- Each book: cover, title, ISBN `xxx-xxxxxxxxxx`, publisher, the **four booksellers**
  (Amazon AU, AbeBooks AU, Alibris, Booko AU).
- **Out-of-print signal: the publication date** — "Published 2002 · 24 years".
- Add by **ISBN, link, or a saved page** (AbeBooks blocks bots but its saved page has
  good book info). Find by ISBN.
- **Themes as chips; a book under several themes.** No check against Cat Watch.
- **Drag covers to rearrange**, like a Kindle library: one order for every book (her
  choice, the simpler one). Mouse drags on moving; a finger after a short hold.
- Later, not built: Claude searching for more books on a theme. No bells and whistles.

## How it works

- **Store:** `books/<isbn13>` and `themes/<id>` in the page's own db; a cover is an
  asset whose id the book carries. Export / Load is a JSON file (covers stay in the page).
- **Shared with Cat Watch, copied by `build/sync_shelf.js`** (checked by `npm test`):
  ISBN cleaning and checks, `resellerLinks` (Cat Watch's `buyLinks` now calls it), the
  saved-page reader, `mcpTrouble`, `lastJsonObject`.
- **By ISBN:** Open Library's record (`api/books?bibkeys=ISBN:…&jscmd=data`, read through
  Parallel) is read by code — no Claude call. Only with no record: one web search; only
  results printing the ISBN reach Claude (`isbnInText`). Why: bare-number searches are hit
  and miss — the Watteau drawings (978-1905711710) brought only unrelated pages; Booko's
  page for it showed another book; Google Books refused through Parallel.
- **By link / saved page:** the page read whole; Claude reads ISBN, title, publisher,
  date; the ISBN must be printed on the page (`toIsbn13` with the text).
- **Code checks every read:** a publisher or year not printed in the text is left blank.
- Cost on her allowance: by ISBN, one page open (plus one search and one Claude read
  only when Open Library has no record); by link, one open and one Claude read; a saved
  page, one Claude read.

## Covers

The page cannot load a picture from another site (platform rule). Ways in, easiest first:
1. **A saved page brings its cover** when saved as "Webpage, Single File" (.mhtml): the
   page's own og:image, else a picture whose address carries the ISBN; never the biggest
   (`pickCover`). A plain .html file carries no pictures — the add screen says so.
2. **Ask Claude to fill covers:** a session runs `node build/shelf_covers.js` (Open
   Library's cover for that ISBN), looks at them, uploads and sets them. Open Library had
   covers for 3 of the 4 test books; not the Watteau drawings.
3. **Paste** a copied cover picture, **drop** a file, or **upload** — in a book's panel.
Pictures she adds are shrunk to 600 px wide.

## Unproven — her review settles

- The page's own Parallel and Claude calls have not run live yet (same tools and
  arguments Cat Watch uses on her keyed connector); her first adds prove them.
- Import from a saved AbeBooks page: built on the saved-page reader, never run on a real
  AbeBooks save.
- Drag on her phone; the cover paste box on a phone.
- The three starter books (Fashion in art) were written into the store by the session
  from live pages, not through the page's own lookup. Facts: Open Library (Styles), a
  library record (Ribeiro), a bookseller (Fashioning Fashion).

Tests: `npm run test:shelf` (TS-001–009).
