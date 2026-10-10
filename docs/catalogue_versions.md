# Catalogue versions — the design and its agreed cases

Status: **published in 43; her three live searches (Vasari, Hubert Robert, Hammershøi)
came back wrong. The card's layout has been redesigned and agreed (below); the code
has not been touched since. Next: what the lookup must find and record correctly —
"Diagnosis" and "Open" below.** Every change is checked LIVE against her cases before
it reaches her (CLAUDE.md §1).

## The design

**Find, choose, tell — three separate steps.**

1. **Find.** The lookup keeps every version of the catalogue it finds. Each version
   records: title, language, binding, page count, publisher, which show it belongs
   to, its ISBN, and the page that proved it. Nothing is chosen or dropped part-way.
   Booklets and albums are left off.
2. **Choose.** Code applies her starting-pick rules (below). She can change the pick
   at any time.
3. **Tell.** One version: the card exactly as it has always been. Several: one block
   per version (below).

## The card with several versions — her layout

Agreed on a mockup: https://claude.ai/artifact/Hy7wFw63YA5fJTCDry2dki. It replaces
43's one run-on line per version, which had no hierarchy and glued unrelated facts
together. **Single-version cards do not change at all.**

**Each version is a copy of the single-book block, in the single-book styling** (no
italics, nothing restyled), one under another, a thin rule between them, a ●/○
selection marker in its own column, the whole block tappable. **The blocks are fixed
text** — they never reorder or change when she picks.

Each block, top to bottom:
1. **Its own shop line**, in the usual wording ("In the museum shop" / "Not in the
   museum shop — shop link opens the general store.", with the publisher note where
   the single-book card has one). It is about THAT block's museum shop: Stockholm's
   block speaks of the Nationalmuseum's shop.
2. **Title** — as the single-book card.
3. **Publisher** — co-publishers as "Venue's house / Other house", the venue's own
   house first, each name capitalised, otherwise exactly as found (never renamed or
   shortened). A later edition's year follows a dot: "Rizzoli Electa · 2023".
4. **Facts line** — language, binding, page count, each its own item, dots between:
   "English · Paperback · 240 pp", "English · 288 pp". **Page count and binding are
   unrelated facts**; neither changes how the other is shown.
5. **ISBN** — as the single-book card. A co-edition's second number:
   `ISBN 978-2757210642; 978-2350315355 (Louvre's own number for the same book)`.
6. **Why it is listed, and its source** — "The original edition. Source: louvre.fr".
   Every block carries its own source.

**Below all blocks, once:** Museum shop, Publisher and the four bookstore buttons, then
Search again and Re-check museum shop. **The buttons follow the pick — only their links
change, never their names:**
- **Museum shop** — the picked version's own product page when it is in its shop
  (French picked → the French page; English → the English); else the venue's shop
  search, as today. Another museum's book links that museum's shop page where it was
  found (Stockholm's → nationalmuseum.bokorder.se).
- **Bookstores** — the picked version's ISBN and title (as 43 already does).
- **Publisher** — only when that version's page on the publisher's own site is
  already in hand from pages the lookup read anyway. Otherwise no button, and no
  failure line for a step that never ran for it.
- **Re-check museum shop** re-checks the picked version only.
- **Nothing picked** (Hubert Robert): only the Museum shop button, as now.

**Publisher pages — her decision:** the publisher's NAME is always on every block (it
is how versions are told apart). No extra searches to find a publisher's page per
version: the publisher step runs for the starting pick only, as on single-book cards.
Its job of reading the publisher's page for an English edition (Watteau, Canaletto)
stays. Per-version links wait for her roadmap list of publishers and their sites
(CLAUDE.md §7.6).

Notes, in her wording: "The original edition.", "This venue's English edition.",
"The English edition, published later.", "This show's catalogue.", "A different book,
from the show's <city> exhibition." ("notably" dropped, her decision).

## Starting pick — her rules, in order

1. Only **this show's catalogue** (any language, any printing) may start picked. A
   different book from another showing is listed, never picked.
2. **English first** — any English version of this show's catalogue, whoever printed
   it and however much later.
3. Then **this venue's own printing**.
4. Then **hardcover**, when only the binding differs.
5. **Nothing picked** when this show has no English version but another showing's
   different book is English — or when the rules do not settle it.

More rules are added only once she has used the cards and knows her preference.

## The agreed cases — the facts each card should carry

● = starts picked. Found live by a session, 10 Oct 2026. **Each fact here is still to
be checked against what the app's OWN live searches return** (Hammershøi's Rizzoli and
2023 never appeared in them — "Diagnosis").

1. **Vasari — Louvre, 2022.** ○ French · Louvre Éditions / Lienart · 978-2359063721;
   978-2350317441 (Louvre's own number) — the original edition
   ([louvre.fr](https://www.louvre.fr/editions/catalogue/giorgio-vasari-le-livre-des-dessins)).
   ● English · paperback · Louvre Éditions / Lienart · 978-2359063738 — this venue's
   English edition ([lienarteditions.com](https://www.lienarteditions.com/product-page/giorgio-vasari-the-book-of-drawings)).
   ○ English · hardcover · Nationalmuseum · 978-9171009166 — from the show's Stockholm
   exhibition ([nationalmuseum.bokorder.se](https://nationalmuseum.bokorder.se/en-us/shop/book/4580?slug=giorgio-vasari-the-book-of-drawings)).
2. **Hubert Robert — Louvre card, 2016.** ○ French · hardcover · 544 pp · Louvre
   Éditions / Somogy · 978-2757210642; 978-2350315355 (Louvre's own number) — this
   show's catalogue ([Louvre éditions 2016 PDF](https://mini-site.louvre.fr/trimestriel/2016/Catalogue_Editions_2016/files/assets/common/downloads/publication.pdf)).
   ○ English · hardcover · 288 pp · National Gallery of Art / Lund Humphries ·
   978-1848221918 — a different book, from the show's Washington exhibition
   ([NGA press release](https://www.nga.gov/sites/default/files/migrate_images/content/dam/ngaweb/research/gallery-archives/pressreleases/2012-2010/2016/14a11_108163_20160615.pdf)).
   Nothing picked. The 48-page album is left off.
3. **Hubert Robert — NGA card, 2016.** The same two books: ● the English (this show's
   catalogue); ○ the French (a different book, from the show's Paris exhibition).
4. **Hammershøi — Jacquemart-André, 2019.** ○ French · Culturespaces / Fonds Mercator
   · 978-9462302495 — the original edition
   ([leslibraires.ca](https://www.leslibraires.ca/en/livres/hammershoi-jean-loup-champion-9789462302495.html)).
   ● English · Rizzoli Electa · 2023 · 978-0847899289 — the English edition,
   published later ([rizzoliusa.com](https://www.rizzoliusa.com/book/9780847899289)).
5. **Watteau — Louvre, 2024–25.** One version, French · paperback · Louvre Éditions /
   Lienart · 978-2359064476. "No English edition found." The card as now.
6. **Canaletto – Guardi — Jacquemart-André, 2012.** One version, French · hardcover ·
   Fonds Mercator · 978-9061538226. "No English edition found." Left off:
   *Connaissance des Arts*' special issue (978-2758004158), a magazine.
7. **Botticelli, artiste et designer — Jacquemart-André, 2021–22.** One version,
   Culturespaces / Fonds Mercator, 978-9462302815. "No English edition found." Left
   off: Reaktion's *Botticelli: Artist and Designer*, the curator's own book.
8. **Metamorphoses — Rijksmuseum, 2026.** ● English · paperback · Hannibal ·
   978-9493416543; ○ Dutch · Hannibal · 978-9493416550; ○ Italian · Hannibal ·
   978-9493416857 (all from [Hannibal's spring 2026 PDF](https://hannibalbooks.be/uploads/images/covers/2026_ENG_VOORJAAR_DRUK_compressed.pdf)).
9. **Millet: Life on the Land — National Gallery, 2025.** One English book (National
   Gallery, 978-1857097382). The card does not change. Most of her cards are this.

Cases as data: `docs/lookup_proof_cards.json`; `node build/lookup_proof_check.js`
compares saved live lookups with them.

## Settled with her

- **Not catalogues, left off** like booklets: a same-titled book by the curator
  (Botticelli, Reaktion) and a magazine's special issue (Canaletto – Guardi).
- **Two ISBNs for ONE printed book** (a co-edition, one number per publisher: Vasari
  French 978-2359063721 Lienart / 978-2350317441 Louvre; Hubert Robert 978-2757210642
  Somogy / 978-2350315355 Louvre) share one block, the publishing house's number
  first. Buy buttons use the first; the second is there to copy — she searches by
  ISBN, so a hidden one is useless. **Different printings are different books, each
  its own block** — "they either are the same book or they're not."
- **"Not found" is not "does not exist":** "No English edition found."
- **Hammershøi's "same authors: …"** is not on the card: the lookup does not work it
  out (she acknowledged).

## Diagnosis — her three live searches on 43

Her lookup records, in the test page's store (CLAUDE.md §7.4, "Diagnose a lookup from
its record"): Vasari `L1791620627801aujh`, Hubert Robert `L179162375840408tn`,
Hammershøi `L1791624396132o13e`. Each was replayed through the code by script (the
recorded results and Claude's answers fed back in): the replay reproduces her cards
exactly, so every cause below is proven on her own data.

**Vasari**
- **Stockholm's hardcover was folded into Lienart's line as "the Louvre's own number".**
  It had been found as its own version (English, hardcover, 240 pp). Then one WorldCat
  record listing both printings ("LienArt ; Nationalmuseum … ISBN 9782359063738,
  9789171009166") did two things: it supplied the pair `foldCoEditions` joins, and its
  publisher field, read as Stockholm's publisher, contained "LienArt" — so the
  different-publisher check (`sameHouse`) passed. Country is never looked at.
- **"paperback" missing on Lienart's English.** Two pages say paperback/softcover; an
  AbeBooks page's filter menu ("Softcover (0) Hardcover (0)") was read as a claim of
  hardcover, and `bindingOfIsbn` records nothing when both words appear.
- **Source amazon.com, not lienarteditions.com.** `proofOf` takes the first result in
  the search's order that prints the number; Lienart's own page is opened later in the
  lookup, after the source was chosen.
- **French line missing 978-2350317441.** No page the lookup found prints that number.

**Hubert Robert**
- **"Somogy éditions d'art : Louvre éditions"** — a library record's imprint, where
  " : " separates co-publishers. `venueFirst` splits on "/", ";", "&", "and", "with"
  only, so the name was neither split, reordered nor capitalised.
- **"Hubert Robert · 288 pp" against "hardcover, 544 pp".** `versionText` built binding
  and page count as one item; with no binding the count fell to its own item. Lund
  Humphries' only page found (a blog) prints no binding.

**Hammershøi**
- **No "Rizzoli Electa, 2023", no "published later".** No page the lookup found prints
  Rizzoli or 2023: only Stanford's library record, whose text omits both. The wording
  existed in the code; the year that triggers it never arrived. Rizzoli's own page does
  carry both (publisher, date, hardcover, 176 pp) but the app's searches did not reach
  it, and her decision is no new searches to chase it.
- **"No publisher was named for this book, so none was looked for." named no book.**

**The cause under the "parts of the card don't go together" problem:** two writers. The
lines above the versions (shop, publisher note) came from the card's single-book fields
(`composeRow`); the version lines from `editions` (`versionLines`). Neither knows the
other. And facts are read from any page printing a number, even a page about two books.

**Third-patch check (her rule, `.claude/skills/orch/`):** in the days before, `editionsOf`
was changed 6 times, `composeRow` 5, `printingsOf` 4, `foldCoEditions` 3, `versionNote`
twice for Vasari's notes alone. So no further patching: the feature is reviewed whole.
She settled the layout first (above); the findings come next.

## Open

1. **What the lookup must find and record, per version** — reviewed whole, not patched:
   facts read only from pages about that one number; one owner per fact, which every
   line on the card reads; the shop and publisher facts per version (layout above).
   Each finding agreed with her before code.
2. **Every agreed case re-checked against the app's own live search results**, flagging
   any agreed fact the searches cannot support (Hammershøi's publisher and year) for her.
3. **Then the build** (`/orch`), whole-path tests on her real records, a live run of
   all nine cases, and publish only when she says and her page is closed. Cards
   searched on 43 need a Search again (their versions carry no per-version shop facts).
