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

`saved/` (18 Oct): HER saved pages from Palazzo Reale Milano's pages on the city council's site, which
refuses Parallel (Titian, Soutine, Antonello da Messina) — Chrome `.mht` files from her phone, cut by code to the page itself (the photos and
fonts dropped). The proof for Pages (`scraper/fixtures/add_by_page.js`, AP-).

`shop_search/staedel_shelf_live.json` (19 Oct): the Städel's "Städel Publikationen" section, the keyed
connector's live answer, saved by script. It stops after the menu ("A- A+"); the books and prices in the
page's own HTML are missing (FS-, "Parallel fault").

`shop_search/moma_popup_live.json` (19 Oct): MoMA's catalogue shelf as the connector returned it in her
Brancusi Re-check (lookup log, saved by script) — the "Become a Member" pop-up only, too long to count as an
empty page (B-007).

`brancusi_neue_ng_live.json` (26 Oct) is the free Parallel server's answer byte for byte for the Neue
Nationalgalerie's *Brancusi* page: a one-word "## Brancusi" heading inside the tab title "Brancusi at the
Neue Nationalgalerie", and the house line "Neue Nationalgalerie" under the dates (AL-075).

`ghent_van_eyck_live.json` and `reina_wols_live.json` (27 Oct) are the free Parallel server's answers byte for byte:
MSK Ghent's "01.02 – 30.04.20" with its Covid early closing in the text, and Reina Sofía's "Held on 14 feb 2014" over
"to 26 may 2014" (AL-077).

`saved/tate_library_reynolds.json`, `saved/tate_library_preraphaelite.json`: HER two saved Tate library records (Reynolds, Pre-Raphaelite
vision), kept as the app's reading of the saved file (`savedPageReply`), cut to the page's text — the proof that Claude is handed the
record's Summary (`from`/`fromLast`, AP-013).
