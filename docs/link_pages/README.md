# Show pages for "Add by link" — read 3 Oct 2026

Ten show pages at six venues, read once each through her keyed "Parallel
Search Key" connector (`web_fetch`, full content) — the test that decided the
app could read show pages without a browser (docs/picked_shows.md).

- `dia_*.json` are the connector's answers byte for byte.
- The other eight were written down from the same answers by hand, **trimmed
  of footers, sponsor lists and image galleries**. Every line carrying a date
  was kept — they are the trap: Zürich's leg on Hammershøi, other displays on
  the Courtauld page, the "More exhibitions" strips.

Used by `scraper/fixtures/add_by_link.js` (AL-001 to AL-010). Never fetched
again by a test.
