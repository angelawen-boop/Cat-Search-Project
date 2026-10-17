# Handover — Yale CBA's shop (Add by link)

OPEN. Nothing is to be built until she agrees the approach. She declined the fix proposed below
("re-open a blank shop page once at another address") when it was offered; ask her before
building that or anything else.

## Where it stands (live: 46.3)

- **Yale CBA** (`occ-britishart-yale-edu`) is an Add-by-link venue with its own chip "Yale CBA",
  after Cincinnati (`OWN_CHIP`, `VENUE_ORDER`; AL-039). Dates read fine (clock times are dropped by
  the shared date reader, `CLOCK_TIME`, DS-003).
- **Its shop is found by a rule built on a false belief.** `discoverShop` → `shopElsewhere`
  follows Yale's own "Museum Bookshop" page (`britishart.yale.edu/museum-shop`; `SHOP_PATH` now
  accepts `/museum-shop`) to its "Shop online" link,
  `https://secure.touchnet.net/C20510_ustores/web/store_main.jsp?STOREID=7&SINGLESTORE=true`.
  That address read blank ("YCBA Home"), so the new rule took it as the books shop because the
  page's heading says "Bookshop" (`BOOKSHOP_WORD`; AL-041). No other saved venue's shop page is
  headed "Bookshop", so no other venue is affected.
- **The belief was wrong: the shop is readable.** Only that exact address reads blank (every time,
  free and keyed connector). The same address with `&page=2` read with content. Probable cause —
  **a guess, not proven**: the connector holds a stale blank copy of that exact address.
- **The shop has a books section:** "Publications",
  `https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true`.
  That exact address also reads blank ("YCBA Home - Publications"); with `&page=2` it lists ~40
  books, each a `product_detail.jsp?PRODUCTID=…&SINGLESTORE=true` link (Constable = 2409, Endless
  Forms = 42). No prices on the list; one "Out of Stock" mark.

## The case that showed it

Her Find catalogue on *John Constable: The Landscape Reimagined* (lookup log
`L17922200292083pen`, 46.3; read it with ArtifactData `list` + `out_dir`, then
`node build/lookup_log.js <dir> L17922200292083pen`). The shop step opened the front page and its
`&page=2…5` variants (`shelfPages`); the variants had content (a "Explore the Work of John
Constable!" slider with the ISBN), so the shop was not judged blocked, but no page linked the
book, so the card said **"Not in the museum shop"** — wrong: the book is in the Publications
section. The rest of the card was right: *Constable*, Yale University Press, ISBN
978-0300284669.

## What the right result is

The finder picks the **Publications** section by itself; a lookup then reads its book list and
files *Constable* as "In the museum shop" with its product link. Nothing typed into the app
(her house rule: never hide a hard-coded answer; discuss before building either way).

## Options to put to her (none agreed)

1. **A blank page is opened once more at a slightly different address** before it is judged blank
   (the proposal she declined to build now). General: would need testing on every shop page in hand,
   old finder beside new (§4.1 "A general rule ships only if no page gets worse"). Then the
   "Bookshop that reads blank" rule (AL-041) is no longer needed.
2. **Leave it**, and decide separately whether the AL-041 rule stays (it gives Yale the front page,
   which a lookup reads as "Not in the museum shop").

Whatever is chosen: say plainly that the AL-041 rule rests on the false "blank shop" belief, and
ask her whether to keep or remove it. Test live through Parallel (house rule), and add the Yale
shop pages to `docs/link_proof_pages.json` if the proof list gains a shop section.

## Code and docs touched

`Cat_Watch.jsx`: `SHOP_PATH`, `BOOKSHOP_WORD`, `shopElsewhere` (returns `bookshop`), the
bookshop branch in `discoverShop`. Tests: `scraper/fixtures/add_by_link.js` AL-039, AL-040,
AL-041 (its Yale store page is made from the blank live reply). Docs: `docs/add_by_link.md`,
"Venue link rules" (Yale) and the shop finder's list.
