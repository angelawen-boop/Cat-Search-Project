# Handover — Yale CBA's shop (Add by link)

OPEN until her Yale lookup confirms it.

## What is built (AL-042; not yet published)

Every Touchnet page reads blank unless its address names a page: checked live, the bare address and the
same address reordered both blank; `&page=1` gives the full page (front page menu, Publications list,
a book's own page with price and ISBN). The finder now:

- reads the shop's menu on the exact page Yale's "Museum Bookshop" page links to
  (`store_main.jsp?STOREID=7&SINGLESTORE=true`), never `secure.touchnet.net/`; that page is the shop link;
- opens a blank shop page once more with `page=1` added (`fetchShopPage`);
- reads a long menu label by its first six words (`menuLinks`; "Publications The number of products…");
- proves a list of titles without prices by opening its first product: one book with a price
  (`looksLikeOneBook`; her decision).

Result: the books section is **Publications**,
`https://secure.touchnet.net/C20510_ustores/web/store_cat.jsp?STOREID=7&CATID=16&SINGLESTORE=true`.
The "Bookshop that reads blank" rule (AL-041) is removed. The 48 saved pages: no menu ranks differently.

## Left to do

1. Publish (her yes first).
2. Her store still holds the old pick, confirmed (`venues/occasional`, `occ-britishart-yale-edu`: the
   front page). A confirmed venue is never looked for again, so the new finder reaches Yale only once that
   entry is unconfirmed — a store write, her yes first.
3. Her next Yale link: the shop screen should offer Publications; her Find catalogue on *John Constable:
   The Landscape Reimagined* should say "In the museum shop" (lookup reads the shelf's `page=2…5`, which
   read live). A guess until her lookup shows it.
