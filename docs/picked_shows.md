# Picked shows — "Add by link" in the app

**Her design, 3–4 Oct 2026; signed off at 39.5.** Code: "ADD BY LINK" in
`Cat_Watch.jsx`; test `scraper/fixtures/add_by_link.js` (AL-). Replaces the
scraper-side plan of 28 Sep (in git), which survives only as the fallback below.

## The problem

Some venues matter only now and then (~5 shows a year). A full venue costs a
recipe, an archive and a monthly sweep — then ~30 rows arrive and 27 are
dismissed. She would rather pick the shows and add one the moment she meets it.

## The design

- **Import opens ONE small pop-up — nothing added to the page** (her design,
  4 Oct, 39.2): **CSV · Links**, a small **Cancel** under them (the footer's
  Quarantine style). CSV = the file picker, the sweep route. Links = the box
  and **Read** below, same pop-up; progress bar and "Reading 3 of 10…" there.
  Links separated any way; a repeat read once. The review opens when reading
  ends; the pop-up waits under it if a link failed.
- **Then the shop screen** (her design, 4 Oct): with a card going in from a
  venue outside her 27 whose shop is unconfirmed, the review's last button is
  **Next** → one card per new venue met in the Read (whatever her card
  decisions): **Confirm · Look again · No shop**, always in that order, the
  review cards' button style. **The ledger moves only when every one is
  answered.** Back returns to the review. Confirmed once, never asked again.
- **The ordinary review.** Each link becomes a pro forma row fed to the
  existing intake: Add / Fill / Change / Reject / quarantine all as now.
- **A link it cannot read is a line, never a card** — the full link and why
  (empty page, refused, no dates). Unread links **stay in the paste box**,
  stored when the import finishes (her rule, 4 Oct), until read or cleared.
- **No lookback cutoff** for anything added by link (her ruling).
- **Chip: one "Occasional"** for every venue added this way (her ruling); each
  venue keeps its own name and shop behind it. A link to a venue already
  swept files under that venue. **Card names are hers** (`short` in the
  store, written by a session); the page title's name until she gives one.
- **Store:** `venues/occasional` (venues, shops, her confirmations) and
  `links/pending` (the box). Copy both when the cloud page merges (CLAUDE.md
  §7.1). A ledger row whose venue a page's store has not met shows under its
  web address, shop "not found".

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her ruling): the page's
   title, site name stripped; subtitles and split headings kept. **Title stays
   in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own
   date reader — moved to its own file and shared, never copied.
4. **Description by the model** (`modelTier: default`, her ruling), same
   prompt as compression, shared not copied. **Any non-English page comes out
   in English; a non-English title gets its translation at the start**
   (`In English: "…".`) — every language, not only Italian (her ruling).
5. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## A venue the app has not seen

Name from the page title. Its shop: the **exhibition-catalogues section**,
else the museum's publications, else books — **never the front page, one book,
a post, or a section mixing books with other goods** (her rulings, 4 Oct). A
mixed section ("Books & Stationery") is opened and a books-only section inside
it taken. **Nothing found is stored until the import finishes.** Code: "FINDING A NEW VENUE'S SHOP SECTION".

1. **One search call, two queries: hers, "<venue> shop exhibition
   catalogues", and "<venue> shop books publications"** — Detroit's "DIA
   Publications" came back 1st with both, never with hers alone (keyed, 4 Oct).
   Parallel does not always rank the section first (Cleveland's was 4th), so
   code ranks every result: the museum's own shop site only; plural section
   words; "not Catalogues" and sale shelves refused or last.
2. **A Shopify shop's section list** (`collections.json`, read by Parallel
   4 Oct) — Thyssen's search held only single books. Ranked on titles.
3. **The shop's menu.**

A pick is **opened and must read as books with prices** (unless its excerpt
already does). Nothing → "Shop found, but not its books section: <shop>" /
"No museum shop found." / "Search failed." — and **a miss is a finder bug,
fixed in code: she never pastes a shop link** (her ruling, 4 Oct). **Look again**
skips only the pages she turned down, never the site. **No shop** → lookups go to the web, as at
Capodimonte. Venues found by the old finder and never confirmed are looked
for again on their next link. Evidence: `docs/link_pages/shop_search/`.

**Shelf AND whole-shop search, as the 28 (her rule, 6 Oct)** — DIA files a show's book in the
show's own section. A search is kept only if it finds a book the finder saw
(`proveShopSearch`; AL-008k, AL-014); older venues work it out at first lookup.

## Tested 3 Oct

10 pages, 6 venues: all full text; dates rule right 10/10. No JSON-LD comes
through Parallel. Pages are the fixtures (`docs/link_pages/`).

## Fallback — a link the app cannot read

The scraper reads that one page (a small recipe on pages she saves; robots.txt
first), output the ordinary CSV.
