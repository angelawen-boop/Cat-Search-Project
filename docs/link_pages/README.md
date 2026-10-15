# Show pages for "Add by link" — read 3 Oct 2026

Ten show pages at six venues, read once each through her keyed "Parallel
Search Key" connector (`web_fetch`, full content) — the test that decided the
app could read show pages without a browser (docs/add_by_link.md).

- `dia_*.json` are the connector's answers byte for byte.
- The other eight were written down from the same answers by hand, **trimmed
  of footers, sponsor lists and image galleries**. Every line carrying a date
  was kept — they are the trap: Zürich's leg on Hammershøi, other displays on
  the Courtauld page, the "More exhibitions" strips.

Used by `scraper/fixtures/add_by_link.js` (AL-001 to AL-010). Never fetched
again by a test.

`jacquemart_*.json` (7 Oct) are not connector answers: they are HER saved
pages (*From Watteau to Fragonard*, *Fra Angelico*), turned to the connector's
shape by code, broken accents mended by hand. The traps: the dates sit at the
FOOT, under the description and the curators (AL-017); the page title dresses
the show's name — "Exhibition Fra Angelico in Paris" for the heading "Fra
Angelico" (AL-019).

`shop_search/mia_catalogues_products.json` (13 Oct): Mia's Catalogues shelf's own
product list (`products.json`), the connector's live answer cut to its first eight
products by code. The shelf page itself comes back as a menu only (AL-033).
