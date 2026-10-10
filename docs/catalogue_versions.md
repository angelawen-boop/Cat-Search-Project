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

## The agreed cases — found live, 10 Oct 2026

● = starts picked. "Proved by" is the page each line would link.

### 1. Vasari — Louvre, 2022 (travelled to Nationalmuseum, Stockholm)
- ○ French · Louvre Éditions / Lienart · 978-2359063721 — the original
  edition. Proved by louvre.fr/editions.
- ● English · paperback with flaps · Lienart / Louvre Éditions ·
  978-2359063738 — this venue's English edition. Proved by lienarteditions.com.
- ○ English · hardcover · Nationalmuseum · 978-9171009166 — printed for the
  show's Stockholm venue. Proved by nationalmuseum.bokorder.se.

### 2. Hubert Robert — Louvre card, 2016
- ○ French · hardcover, 544 pp · Somogy / Louvre Éditions · 978-2757210642 —
  this showing's catalogue. Proved by the Louvre éditions 2016 catalogue (PDF).
- ○ English · hardcover, 288 pp · National Gallery of Art / Lund Humphries ·
  978-1848221918 — a different book, from the show's Washington venue.
  Proved by the NGA press release.
- Nothing picked (rule 5). The 48-page album (978-2757210659) is left off.

### 3. Hubert Robert — NGA card, 2016
- ● English · hardcover · National Gallery of Art / Lund Humphries ·
  978-1848221918 — this showing's catalogue.
- ○ French · hardcover · Somogy / Louvre Éditions · 978-2757210642 — a
  different book, from the show's Paris venue.

### 4. Hammershøi — Jacquemart-André, 2019
- ○ French · Fonds Mercator / Culturespaces · 978-9462302495 — the show's
  catalogue.
- ● English · Rizzoli Electa, 2023 · 978-0847899289 — the English edition of
  the show's catalogue, published later. Proved by rizzoliusa.com (same authors:
  Champion, Claustrat, Curie, Saabye).

### 5. Watteau — Louvre, 2024–25 (*Pierrot, dit le Gilles*)
- ● French · paperback with flaps · Lienart / Louvre Éditions ·
  978-2359064476. Proved by boutique.louvre.fr.
- Card says: "No English edition found." One version: the card as now.

### 6. Canaletto – Guardi — Jacquemart-André, 2012
- ● French · hardcover with jacket · Fonds Mercator · 978-9061538226. Proved
  by an AbeBooks record.
- Card says: "No English edition found."
- Left off: *Connaissance des Arts*' special issue (978-2758004158), a
  magazine, not the catalogue (settled below).

### 7. Botticelli, artiste et designer — Jacquemart-André, 2021–22
- ● French · Fonds Mercator / Culturespaces · 978-9462302815. Proved by the
  Paris Musées library record.
- Card says: "No English edition found."
- Left off: Reaktion's *Botticelli: Artist and Designer* (Debenedetti) — the
  curator's own book, not a catalogue (settled below).

### 8. Metamorphoses — Rijksmuseum, 2026 (travels to Galleria Borghese)
- ● English · softcover with flaps · Hannibal · 978-9493416543
- ○ Dutch · Hannibal · 978-9493416550
- ○ Italian · Hannibal · 978-9493416857
- All three proved by Hannibal's spring 2026 catalogue (PDF).

### 9. Millet: Life on the Land — National Gallery, 2025
- ● English · paperback with flaps · National Gallery Global · 978-1857097382.
  One version: the card as now. Publisher is the National Gallery — Yale only
  distributes it.

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
