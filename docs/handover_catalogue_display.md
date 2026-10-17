# Handover: catalogue blocks on today's search (Stage 2 display), and its test page

Read this whole note, CLAUDE.md §1 (house rules) and `docs/catalogue_versions.md` before
touching anything. Nothing here is published to her app (still 46.4).

## What she asked for (her decisions — never re-ask)

- **Keep today's search exactly as it is.** Only how the books on a card are ordered, drawn
  and picked changes. The Stage 1/1b search rebuild stays on `parked`.
- **Her order** (`versionOrder` in `Cat_Watch.jsx`): English in the venue's own imprint; then
  English from anyone else (another museum, another showing, an outside house — no order
  between those); then other languages. Within each: hardcover, then paperback, then binding
  unknown. **The first book starts picked**; the old starting-pick rules are gone.
- **Order, two refinements (her decisions, not yet built):**
  - **Non-English venues** (`english:false`): any English book comes before any other language —
    KHM's English edition before its German; another showing's English catalogue (the Met's)
    before the venue's own German one. (Today's order already does this; keep it.)
  - **English-language venues:** a book that is **in the venue's museum shop always comes first**,
    ahead of the rest of her order. The rest keep her order.
- **Single-book cards: no change at all** (no binding, pages or source added). *Beauty of
  Life* included.
- **Blocks:** her agreed layout (`docs/catalogue_versions.md`, "Her layout"), one block per book.
- **Shop line: one per card, above the blocks, for the PICKED book, venue's shop only** (her
  "B"). It must be TRUE for whichever book she picks: every book is looked for on the shop list
  the lookup already read. Never search another museum's shop.
- **Publisher button** follows the pick; only where that book's publisher page was found.
- **Old cards keep their saved ●** until she runs Search again (her decision).
- **Pamphlet** (*Pearls to Pyramids*, a 21-page pamphlet kept as the book) — noted for the
  later search work only; do nothing now.

**Yale's two imprints — settled (her decision):** "Yale Center for British Art" and "Yale
University Press" rank the same for Yale cards; neither leads because of its imprint. Between them
the other rules decide (in the museum shop first, then hardcover before paperback, and so on).
Not built: today `venuePrinting` counts only the Yale Center as Yale's own.

## What is built and pushed on `main` (tests: `npm run test:app`, 15 of 15 pass)

- `344ebd1` — the order, first book picked, the blocks (`versionBlocks`), per-book shop check in
  lookup phase 4b, Re-check museum shop for the picked book (`recheckShopRow` →
  `recheckShopCore`, `pickedVersion`, `withPickedCard`), an unreadable shop unread for every
  book (`takeVersion`). Tests VO-, VB-, SV-; AD-007 updated.
- `fb8eecd`, `9a79960`, `0b1bed3` — the shop line, book and buttons moved out of `App` into
  `CatalogueBox` (drawn by the app and the test page; the app's output unchanged — AD-007/008
  prove it); `PALETTES` and `linkButton` moved to top level.
- `cbae0a7` / `a22c7fe` — NOT this work: the "Search debugging - Yale 2" session's tie fix
  (web path: READ_RULES, TIE_RULES, tieIn, tieStep; its own test page `build/tie_check.js`),
  merged on top. Whichever session publishes to her app first must say so to the other.

## The test page — Catalogue Blocks Check

https://claude.ai/artifact/TCGZyPJgUJmNS9bueC2Rds — built by
`node build/blocks_check.js --ledger <her ledger json> --venues <her venues/occasional json>`,
then publish `build/dist/blocks_check.html` to that url (capabilities carried forward; runtime
0.2.52 like her app). It replaces the Catalogue Display Check page (dysfunctional, her verdict;
its build files removed). Each case is a BLANK card (only the show's facts from her ledger):
Run is a fresh Find catalogue; the drawer is the app's own CatalogueBox / CatalogueNone (the
no-catalogue drawer now shared, app output unchanged); taps use pickRow; Re-check museum shop
is recheckShopRow. Each result is kept in the page's store (`checks/<case id>`) the moment it
arrives. PASS/FAIL lines (bcGrade) appear only for a case she has run.

### Next job

**Her run of each case on the page.** Read its results with ArtifactData `list` of `checks`,
and each run's record from its lookup log (`lookups`).

**Not this job — she said do not touch:** Constable's Search again on the test page found no
catalogue ("Not filed: “Constable” is not tied to this venue’s show"; its record:
lookup log `L1792233638434rq19` in the test page's store). That is the tie fix's behaviour
(the other session's), not the display work.

## What went wrong in this session — do not repeat

- **First test page was the whole app** with a Load step. She wants a PLAIN page like the
  Yale Shop Check (`build/shop_check.js`): the cases written in, the app's own code, nothing
  else.
- **The page lost a search result** when she switched windows (the app reloads pages): keep
  every result in the page's own store from the start.
- **PASS/FAIL lines showed before she had run anything.** Grade only what she has run.
- **Invented wording** on the page (item 1 above). The page shows the app's output only.
- **Long replies.** She wants short answers; surface only what needs her. Do not lay out
  every next step for approval; do not add rules to the guide.
