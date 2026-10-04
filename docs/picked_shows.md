# Picked shows — "Add by link" in the app

**Her design, agreed 3–4 Oct 2026. Built 4 Oct, version 39.** Code: "ADD BY
LINK" in `Cat_Watch.jsx`; test `scraper/fixtures/add_by_link.js` (AL-).
Replaces the scraper-side plan of 28 Sep (in git), which survives only as
the fallback below.

## The problem

Some venues matter to her only now and then: ~5 shows a year. A full venue
costs a recipe, an archive, her rulings and a monthly sweep — then ~30 rows
arrive and she dismisses 27. She would rather pick the shows herself, and add
one the moment she comes across it.

## The design

- **Import opens ONE small pop-up — nothing added to the page** (her design,
  4 Oct, 39.2): **CSV · Links**, a small **Cancel** under them (the footer's
  Quarantine style). CSV = the file picker, the sweep route. Links = the box
  and **Read** below, same pop-up; progress bar and "Reading 3 of 10…" there.
  Links separated any way; a repeat read once. The review opens when reading
  ends; the pop-up closes, or waits under the review if a link failed.
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
  kept in the store, until read or cleared by her.
- **No lookback cutoff** for anything added by link (her ruling).
- **Chip: one "Occasional"** for every venue added this way (her ruling); each
  venue keeps its own name and shop behind it. A link to a venue already
  swept files under that venue. **Card names are hers** (`short` in the
  store, written by a session; 4 Oct: Royal Academy UK, Detroit, Cleveland,
  Thyssen-Bornemisza); the page title's name until she gives one.
- **Store:** `venues/occasional` (venues, shops, her confirmations) and
  `links/pending` (the box). Copy both when the cloud page merges (CLAUDE.md
  §7.1). A ledger row whose venue a page's store has not met shows under its
  web address, shop "not found".
- **Cost:** one keyed Parallel read and one model call per link; a venue's
  first link 2–3 more, once.

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her ruling): the page's
   title, site name stripped; subtitles and split headings kept — "Peggy
   Guggenheim in London: The Making of a Collector", "Hammershøi. The Eye that
   Listens". **Title stays in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own
   date reader — moved to its own file and shared, never copied.
4. **Description by the model** (`modelTier: default`, her ruling), same
   prompt as compression, shared not copied. **Any non-English page comes out
   in English; a non-English title gets its translation at the start**
   (`In English: "…".`) — every language, not only Italian (her ruling).
5. No note — a link is not a sweep; `swept_at` blank, sweep log untouched.

## A venue the app has not seen

Name from the page title. Its shop: the **exhibition-catalogues section**,
else books / publications — **never the front page, one book or a post** (her
ruling, 4 Oct). Code: "FINDING A NEW VENUE'S SHOP SECTION".

1. **One search, her own query: "<venue> shop exhibition catalogues".**
   Parallel finds the section but does not always rank it first (Cleveland's
   was 4th, 4 Oct), so code ranks every result: on the museum's own shop
   site only (not Museum Bookstore's "Courtauld" shelf, not the library's
   catalogues page); plural section words; "not Catalogues" and sale shelves
   refused or last.
2. **A Shopify shop's section list** (`collections.json`, read by Parallel
   4 Oct) — Thyssen's search held only single books. Ranked on titles.
3. **The shop's menu.**

A pick is **opened and must read as books with prices**, unless its search
excerpt already does. Nothing → "Books section not found." / "No museum shop
found." / "Search failed." **Look again** skips only the pages she turned down,
never the site (the old "Wrong shop" banned the site — the RA and Courtauld
had the right shop, wrong page). **No shop** → lookups go to the web, as at
Capodimonte. Venues found by the old finder and never confirmed are looked
for again on their next link. Evidence: `docs/link_pages/shop_search/`.

## Tested 3 Oct

10 show pages, 6 venues (Thyssen, Mauritshuis, RA, Courtauld, DIA,
Cleveland), one keyed read each: all full text, none empty. The dates rule
right 10/10 — every page also carried other dates (another venue's leg, other
displays, events, "More exhibitions"). No JSON-LD comes through Parallel.
Shop link on the show page at 4 of 6. These pages become the offline fixtures.

## Fallback — a link the app cannot read

The scraper reads that one page (a small recipe on pages she saves; robots.txt
first; one access check), output the ordinary CSV.
