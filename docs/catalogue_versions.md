# Catalogue versions — the redesign and its agreed cases

Status: **the display half is done, live at 47.1 (her call: done unless she finds bugs).** It runs on the current search; the
search's own rebuild is the open item at the end. Test page for the display: the Catalogue Blocks Check
(https://claude.ai/artifact/TCGZyPJgUJmNS9bueC2Rds, `node build/blocks_check.js --ledger <her ledger json> --venues <her
venues/occasional json>`): her named Yale cases and KHM's Canaletto & Bellotto, run from a blank card through the app's own Find
catalogue and drawer, graded in code.

## The design — find, order, tell

1. **Find.** The lookup keeps every version it finds: title, language, binding, pages, publisher, which showing, ISBN, the page that
   proved it.
2. **Order** (`versionOrder`, VO-): at an English-language venue, a book in its museum shop first of all (`shopFirst`, set once by
   the lookup, so a Re-check never moves a block); then English in the venue's own imprint; then English from anyone else (no order
   between those); then other languages. At a non-English venue English always leads. Within each: hardcover, paperback, binding
   not known; otherwise as found. On Yale cards Yale University Press ranks as the Yale Center does (`rankAsOwn` on Yale's
   `LINK_VENUES` entry, display only). **The first starts picked** — her decision, replacing the starting-pick rules; cards
   searched before keep their saved ● until a Search again.
3. **Tell.** One version: the card exactly as before (no binding, pages or source added — her decision). Several: one block per
   version, in her order (VB-).

## The card with several versions — her layout

Agreed on a mockup (https://claude.ai/artifact/Hy7wFw63YA5fJTCDry2dki). Each block is the single-book block in its styling, a thin
rule between, ●/○ in its own column, the whole block tappable; blocks never move when she picks. Top to bottom: title; publisher as
found (a later English edition's year after a dot, "Rizzoli Electa · 2023"); ISBN third, as on a single-book card (her decision), a
co-edition's second number after it ("; 978-… (Louvre's own number for the same book)"); language · binding (Hardcover or
Paperback only) · pages; why it is listed and its source ("The original edition. Source: louvre.fr"; another showing's book: "A
different book, from the show's <city> exhibition").

**One shop line for the card, above the blocks** (her decision): whether the PICKED book is in this venue's shop — the venue's shop
only. Every book is looked for on the shop list the lookup already read (phase 4b, SV-), so the line is true whichever she picks; a
shop that cannot be read is unread for every book. Below the blocks, once: Museum shop, Publisher and the bookstore buttons, built
for the picked book; the Publisher button only where that book's publisher page was found (the publisher step runs for the first
book only). **Re-check museum shop** checks the picked book only and keeps that book's stored answer.

## Settled with her

- **Not catalogues, left off** like booklets: a same-titled book by the curator (Botticelli — Reaktion's *Botticelli: Artist and
  Designer*), a magazine's special issue (Canaletto – Guardi, *Connaissance des Arts*).
- **A co-edition's two ISBNs** (one per publisher for one printed book: Vasari French 978-2359063721 Lienart / 978-2350317441
  Louvre; Hubert Robert 978-2757210642 Somogy / 978-2350315355 Louvre). Find folds them into one version; the card shows both on
  one line, the publishing house's number first: `ISBN 978-2359063721 · also 978-2350317441 (the Louvre's own number for the same
  book)`. Buy buttons use the first. Her reason: she uses an ISBN to search, so a hidden one is useless.
- **"Not found" is not "does not exist"**: the card says "No English edition found."

## The agreed cases — found live, her wording

The nine cases are in `docs/lookup_proof_cards.json` (checked by `node build/lookup_proof_check.js`); every later lookup change is
checked against them. ● = starts picked; a card with one version looks as it does now, with no source link.
1. **Vasari, Louvre 2022:** ○ French original (Louvre Éditions / Lienart, also the Louvre's own number); ● English paperback, this
   venue's edition; ○ English hardcover, Nationalmuseum, from the Stockholm showing.
2. **Hubert Robert, Louvre card 2016:** ○ French hardcover 544 pp (Somogy), this showing's; ○ English hardcover 288 pp (NGA / Lund
   Humphries), a notably different book from the Washington showing; nothing picked; the 48-page album left off.
3. **Hubert Robert, NGA card:** ● English 288 pp, this showing's; ○ the French 544 pp, a different book from the Paris showing.
4. **Hammershøi, Jacquemart-André 2019:** ○ French original (Culturespaces / Fonds Mercator); ● English, Rizzoli Electa 2023,
   published later.
5. **Watteau, Louvre 2024–25:** ● French paperback only; "No English edition found."
6. **Canaletto – Guardi, Jacquemart-André 2012:** ● French hardcover only; same line; the magazine left off.
7. **Botticelli, Jacquemart-André 2021–22:** one French edition; same line; Reaktion's book left off.
8. **Metamorphoses, Rijksmuseum 2026:** ● English paperback, ○ Dutch, ○ Italian, all Hannibal.
9. **Millet, National Gallery 2025:** one English book; **the card does not change** — most of her cards are this case.

## Cases to fix — added later; picks not yet agreed (her decision: any search debugging must fix 10–12; 13 is her report)

- **10. Venezia 500 — Munich Alte Pinakothek 2023–24.** English Hirmer 978-3777441764 and a German edition, both in the museum
  shop on ONE CEDON page with a language choice ("Sprache auswählen"). Today (lookup log L1792302063097axpb): the card holds the
  English ISBN labelled **German**, says "English edition: none proved" and never finds the German one. Cause: the shop page prints
  no ISBN; Claude's facts round took the language off the German shop page, and nothing checks it against the ISBN's own records
  (Amazon, the Rijksmuseum library record say English). **Must fix:** a book's language comes from its ISBN's records, never the
  language of the page it was found on; a shop page with a language choice holds both editions, each looked for.
- **11. Jacobus Vrel — Munich Alte Pinakothek 2025.** English 978-3777435879 and German 978-3777435862, one CEDON page. Today
  (L1792302083097mica): both versions found, but (1) English says "not in the museum shop" — phase 4b (`bookOnShelfAfterWeb`) did
  not match it to the German-tied shop page (which match failed is a guess, settled by replaying the record); (2) publisher "s,
  Munich": `PUBLISHER_LABEL` has no word end after "publisher", so "Hirmer Publishers, Munich" gives "s, Munich", and two results
  outvote Claude's correct name in `publisherOnIsbnResults`. **Must fix:** a language-choice shop page counts as in the shop for
  every edition it offers; `PUBLISHER_LABEL` must not match inside "Publishers"/"Verlagshaus".
- **12. Paradise on Earth — Dresden 2016–17, and Correggio.** German Sandstein 978-3954982523 (no English; the museum's link is
  dead). Today (L1792302725988o8sx): publisher "Gunter Oettel, ISBN: 103944560728, 60 €" — `publisherGroups` counts any result
  whose text holds the ISBN, and the museum's "Publikationen" pages list many books, so `PUBLISHER_LABEL` matches "Verlag" in
  another book's line; two pages = two votes beat Claude's "Sandstein Verlag". Correggio (L1792303360912nj6q): publisher "Suchdialog
  öffnen" — "Agentur und Verlag" menu text, `\s*` runs over the line break. **The fault, all three cards: junk written as the
  publisher.** **Must fix:** a label counts only on the line that holds the ISBN (never on a page listing many books, never a menu),
  never across a line break or inside a longer word, and the name stops at the first comma / "ISBN" / price.
- **13. Beato Angelico — San Marco 2025–26 (her report, app 47.4).** Italian Marsilio Arte 979-1254632499 and English *Fra Angelico*
  979-1254632505 (right, settled with her); the Restorations book 979-1254633113 is not the catalogue. First lookup found no
  catalogue (L1792314705436brmy): the Marsilio result handed to Claude was cut before the line naming "Palazzo Strozzi and the
  Museum of San Marco", so `thisVenue` came back false; Search again filed the Restorations book as a third version
  (L1792314758291e049); the third kept the two right books (L1792315089744hdab). Every search used the press-release headline as
  the title.

- **MoMA *Brancusi* still reads "not in the museum shop" (49.3) — her decision pending** (lookup log
  L17924993786826e6v). **(1)** B-007's fix does not hold live: the shelf's whole page carries the "Become a
  Member" pop-up's prices (Explore $200, Access $110, Annual Pass $75), so `readWhole` takes it for books;
  B-007's fixture used the short excerpt. Proposed: prices inside a membership offer do not count as books
  (general); refit B-007 on the real page. **(2)** The web search finds the book's own page
  (`store.moma.org/products/brancusi-the-artist-and-his-studio-hardcover`, "In Stock", $60), but the for-sale
  read rejects it for "Email When Available" and no Add to cart (likely drawn by script — a guess). Her choice:
  **A** — "In Stock" counts as for sale unless sold out is also said (general; checked against her agreed cases
  and the Morgan Tarot first); **B** — the same for store.moma.org only (a hard-coded venue rule); or leave it
  for the redesign. (1) finishes her "small fix only" decision on MoMA; (2) goes past it.

## Search: every catalogue of the exhibition — OPEN, not built

Her decision. Search logic, kept apart from the display work: it is built with the Stage 1/1b search on `parked`
(`docs/handover_search_stage1.md` there), never as a patch on today's search on `main`.

**Fault to fix: a link venue is searched under its short card name.** For a venue Add by link met (no `lookupName` of her own) the
lookup searches "Detroit", "Antwerp KMSKA" (`occVenue` sets `lookupName` from the store's `short`), not the long name the shop search
uses (`venueSearchName`). Her decision: search names long, card names short.

**What the search is for:** every catalogue of this exhibition, at any showing, whoever printed it — this venue's, another's, a
tour's shared one, and their other printings, bindings and languages. Which venue a book belongs to never decides whether it is
kept, only its label and place. Never kept: another exhibition's catalogue, a book that merely shares the title, litter (tote bags,
tickets, magazines, albums, booklets).

**What is wrong today:** (1) the first web read names ONE book; (2) the van Hemessen fix asks Claude `thisVenue` and throws a
"no" away, ending the lookup, though shows sharing a tour's catalogue are the normal case; (3) other versions are listed only in the
second round, which runs only after a book has passed. So survival depends on which book the read meets first — *Victorian
Radicals* (Yale) lost both books (L1792239623555414n); *Sensation and Sensibility* kept the Huntington's book only via the second round.

**Where `parked` stands:** it already lists `otherBooks` (with `showing` "this" or "other") and keeps a rejected first book as another
showing's. Still to change: the `thisVenue` instruction is still in the read; a rejected first book still ends the lookup as "No
catalogue found"; only the first book is asked `thisVenue` and gets the full facts round; a tour's shared catalogue would be kept as
"another showing's" on the venue it was made for.

**Her logic for the rebuild:** delete the van Hemessen fix (the `thisVenue` gate and its instruction); another showing's book is kept
and labelled ("A different book, from the show's Antwerp exhibition"). Listing every book moves to the first round; every book gets
the same check and facts. The one check that decides keeping: is this a catalogue of this exhibition at any showing? A tour's one
catalogue is this venue's book on every venue's card it was made for. **Order on the card** (display work): a non-English venue —
English first; an English-language venue — the card's own showing first, a book in the venue's shop first of all; the rest as "The
design".
