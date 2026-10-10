# Catalogue versions — the redesign and its agreed cases

Status: **design agreed with her; awaiting her approval to build.** The catalogue lookup is paused
until this is agreed (CLAUDE.md §7.4). Every later change to the lookup is
checked live against the cases below.

## The design

**Find, choose, tell — three separate steps.**

1. **Find.** The lookup keeps every version of the catalogue it finds. Each
   version records: title, language, binding, publisher, which showing it
   belongs to, its ISBN, and the page that proved it. Nothing is chosen or
   dropped part-way. Booklets and albums are left off.
2. **Choose.** Code applies her starting-pick rules (below). She can change the
   pick at any time.
3. **Tell.** One version: the card looks as it does now. Several: one line per
   version, each saying why it exists, with a link to the page that proved it.
   The buy buttons are built for the picked version; changing the pick rebuilds
   the same buttons. The pick is the card's book in the ledger; the list is kept
   beside it. Search again starts fresh.

## How each version line reads — her rules

- **Sources:** a single-version card has none. On a card with several versions,
  every line has one — or one shared "(source for all three: …)" when they come
  from the same page.
- **Another showing's book:** "from the show's <city> exhibition".
- **Page counts:** always shown where they help tell editions apart.
- **Binding:** hardcover or paperback only — never "with flaps" or "with jacket".
- **Publisher names lead with the venue** or the venue's own publisher
  ("Louvre Éditions / Lienart"). Display only: the lookup still searches the
  outside publisher, where there is one — more likely to give an accurate result.
- **A co-edition's second ISBN** follows the first: "also 978-… (the Louvre's
  own number for the same book)".

## Starting pick — her rules, in order

1. Only **this showing's catalogue** (any language, any printing) may start
   picked. A different book from another showing is listed, never picked.
2. **English first** — any English version of this showing's catalogue,
   whoever printed it and however much later.
3. Then **this venue's own printing**.
4. Then **hardcover**, when only the binding differs.
5. **Nothing picked** when this showing has no English version but another
   showing's different book is English — or when the rules do not settle it.

More rules are added only once she has used the cards and knows her preference.
These replace "hardcover leads" and "one book per card".

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
