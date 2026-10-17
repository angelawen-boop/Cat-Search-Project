# Catalogue versions — the redesign and its agreed cases

Status: **the display half is built on the current search, unpublished; on the Catalogue Blocks Check
page (https://claude.ai/artifact/TCGZyPJgUJmNS9bueC2Rds, `node build/blocks_check.js`: her test
cards run from blank through the app's own Find catalogue and drawer, graded in code).** Her decision: the search itself stays as it is (the Stage 1/1b rebuild is on `parked`);
only how the versions are ordered, drawn and picked changes.

## The design

**Find, order, tell.**

1. **Find.** The lookup keeps every version of the catalogue it finds (as today's search finds
   them): title, language, binding, pages, publisher, which showing, ISBN, the page that proved it.
2. **Order** (`versionOrder`, VO-): English in the venue's own imprint; then English from anyone
   else (another museum, another showing, an outside house — no order between those); then other
   languages. Within each, hardcover, then paperback, then binding not known; otherwise as found.
   **The first starts picked** — her decision, replacing the starting-pick rules, so the ● is never
   halfway down the list. Cards searched before this keep their saved ● until a Search again.
3. **Tell.** One version: the card exactly as before (no binding, pages or source added — her
   decision). Several: one block per version, in her order (VB-).

## The card with several versions — her layout

Agreed on a mockup: https://claude.ai/artifact/Hy7wFw63YA5fJTCDry2dki. Each block is the
single-book block in its styling, a thin rule between, ●/○ in its own column, the whole block
tappable; blocks never move when she picks. Top to bottom: title; publisher as found (a later
English edition's year after a dot, "Rizzoli Electa · 2023"); language · binding (Hardcover or
Paperback only) · pages; ISBN, a co-edition's second number after it ("; 978-… (Louvre's own
number for the same book)"); why it is listed and its source ("The original edition. Source:
louvre.fr"; another showing's book: "A different book, from the show's <city> exhibition").

**One shop line for the card, above the blocks** (her decision): it says whether the PICKED book is
in this venue's shop — the venue's shop only, never another museum's. Every book on the card is
looked for on the shop list the lookup already read (phase 4b, SV-), so the line is true whichever
she picks; a shop that cannot be read is unread for every book. Below the blocks, once: Museum
shop, Publisher and the bookstore buttons, built for the picked book; the Publisher button only
where that book's publisher page was found (the publisher step runs for the first book only).
**Re-check museum shop** checks the picked book only and keeps that book's stored answer.

## The agreed cases — found live, 10 Oct 2026, her wording

● = starts picked. A card with one version looks as it does now, with no
source link.

### 1. Vasari — Louvre, 2022
- ○ French · Louvre Éditions / Lienart · 978-2359063721 · also 978-2350317441
  (the Louvre's own number for the same book) — the original edition.
  (source: [louvre.fr/editions](https://www.louvre.fr/editions/catalogue/giorgio-vasari-le-livre-des-dessins))
- ● English · paperback · Louvre Éditions / Lienart · 978-2359063738 — this
  venue's English edition.
  (source: [lienarteditions.com](https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings))
- ○ English · hardcover · Nationalmuseum · 978-9171009166 — from the show's
  Stockholm exhibition.
  (source: [nationalmuseum.bokorder.se](https://nationalmuseum.bokorder.se/en-us/shop/book/4580?slug=giorgio-vasari-the-book-of-drawings))

### 2. Hubert Robert — Louvre card, 2016
- ○ French · hardcover, 544 pp · Louvre Éditions / Somogy · 978-2757210642 ·
  also 978-2350315355 (the Louvre's own number for the same book) — this
  showing's catalogue.
  (source: [Louvre éditions 2016 catalogue (PDF)](https://mini-site.louvre.fr/trimestriel/2016/Catalogue_Editions_2016/files/assets/common/downloads/publication.pdf))
- ○ English · hardcover, 288 pp · National Gallery of Art / Lund Humphries ·
  978-1848221918 — a notably different book, from the show's Washington
  exhibition.
  (source: [NGA press release](https://www.nga.gov/sites/default/files/migrate_images/content/dam/ngaweb/research/gallery-archives/pressreleases/2012-2010/2016/14a11_108163_20160615.pdf))
- Nothing picked. The 48-page album is left off.

### 3. Hubert Robert — NGA card, 2016
- ● English · hardcover, 288 pp · National Gallery of Art / Lund Humphries ·
  978-1848221918 — this showing's catalogue.
  (source: [NGA press release](https://www.nga.gov/sites/default/files/migrate_images/content/dam/ngaweb/research/gallery-archives/pressreleases/2012-2010/2016/14a11_108163_20160615.pdf))
- ○ French · hardcover, 544 pp · Louvre Éditions / Somogy · 978-2757210642 ·
  also 978-2350315355 (the Louvre's own number for the same book) — a notably
  different book, from the show's Paris exhibition.
  (source: [Louvre éditions 2016 catalogue (PDF)](https://mini-site.louvre.fr/trimestriel/2016/Catalogue_Editions_2016/files/assets/common/downloads/publication.pdf))

### 4. Hammershøi — Jacquemart-André, 2019
- ○ French · Culturespaces / Fonds Mercator · 978-9462302495 — the original
  edition.
  (source: [leslibraires.ca](https://www.leslibraires.ca/en/livres/hammershoi-jean-loup-champion-9789462302495.html))
- ● English · Rizzoli Electa, 2023 · 978-0847899289 — the English edition,
  published later.
  (source: [rizzoliusa.com](https://www.rizzoliusa.com/book/9780847899289);
  same authors: Champion, Claustrat, Curie, Saabye)

### 5. Watteau — Louvre, 2024–25 (*Pierrot, dit le Gilles*)
- ● French · paperback · Louvre Éditions / Lienart · 978-2359064476.
- Card says: "No English edition found." One version: the card as now.

### 6. Canaletto – Guardi — Jacquemart-André, 2012
- ● French · hardcover · Fonds Mercator · 978-9061538226.
- Card says: "No English edition found." One version: the card as now.
- Left off: *Connaissance des Arts*' special issue (978-2758004158), a magazine,
  not the catalogue.

### 7. Botticelli, artiste et designer — Jacquemart-André, 2021–22
- As Canaletto – Guardi: one French edition, Culturespaces / Fonds Mercator,
  978-9462302815. Card says: "No English edition found." The card as now.
- Left off: Reaktion's *Botticelli: Artist and Designer*, the curator's own
  book, not a catalogue.

### 8. Metamorphoses — Rijksmuseum, 2026
- ● English · paperback · Hannibal · 978-9493416543
- ○ Dutch · Hannibal · 978-9493416550
- ○ Italian · Hannibal · 978-9493416857
- (source for all three: [Hannibal's spring 2026 catalogue (PDF)](https://hannibalbooks.be/uploads/images/covers/2026_ENG_VOORJAAR_DRUK_compressed.pdf))

### 9. Millet: Life on the Land — National Gallery, 2025
- The standard case: one English book (National Gallery, 978-1857097382).
  **The card does not change.** No language, no bullet. Most of her cards are
  this case.

## Settled with her

- **Not catalogues, left off** like booklets: a same-titled book by the curator
  (Botticelli — Reaktion's *Botticelli: Artist and Designer*), and a magazine's
  special issue on the show (Canaletto – Guardi, *Connaissance des Arts*).
- **A co-edition's two ISBNs** — one per publisher for one printed book (Vasari
  French: 978-2359063721 Lienart, 978-2350317441 Louvre; Hubert Robert:
  978-2757210642 Somogy, 978-2350315355 Louvre). Find folds them into one
  version. The card shows both on one line, the publishing house's number first:
  `ISBN 978-2359063721 · also 978-2350317441 (the Louvre's own number for the
  same book)`. Buy buttons use the first; the second is there to copy. Her
  reason: she uses an ISBN to search, so a hidden one is useless.
- **"Not found" is not "does not exist".** No English edition was found for
  Watteau, Canaletto – Guardi or Botticelli; the card says "No English edition
  found."

## Search: every catalogue of the exhibition — OPEN, not built

Her decision. Search logic, apart from the display work: build it with `parked` Stage 1/1b
(`docs/handover_search_stage1.md` there), never as a patch on today's search.

**Today (traced):** the first web read names ONE book (built when a card held one); the NG van
Hemessen fix files it only on a plain `thisVenue` yes — a no throws it away and ends the lookup —
and its rule ("A catalogue of a show at ANOTHER venue is false — even when that show travels
here") hits every search to force one case; other versions are listed only in the facts round
(added for Vasari), after a book passes. So *Sensation and Sensibility* kept the Huntington's book
(found off the Yale book), and *Victorian Radicals* lost both — 978-1885444479 (on Yale's own
publications page) and 978-3791357638 (Blocks Check run, lookup L1792239623555414n).

**Her logic:**
- Search for every catalogue of THIS EXHIBITION at any showing, whoever printed it; a tour's one
  catalogue is found from every venue's card.
- Delete the van Hemessen fix: another showing's book is kept, as that showing's (Antwerp's on NG's).
- Listing every book moves to the first round; every book gets the same check and facts. Only
  this exhibition's books: never another show's, a same-titled unrelated book or litter (`parked`).
- Being this venue's own decides only a book's label and place, never whether it is kept.
- Order (display work): non-English venue — English first, always; English-language venue — the
  card's own showing's book first, one in its shop first of all. Rest: `docs/handover_catalogue_display.md`.
