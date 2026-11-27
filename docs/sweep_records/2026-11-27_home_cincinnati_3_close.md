# Home runs `run_2026-11-27_202005` (Menil) and `run_2026-11-27_204658` (Cincinnati) — the close

## Fixed and tested

- **Menil:** the text stops at the page's "Support" heading; the curator-credit paragraph goes. Tested on three of
  this run's pages, saved to `docs/menil_pages/` (N27-01–03). The run's rows corrected from its kept pages: eight
  descriptions lose funders, curator credits or news-release teasers.
- **Cincinnati:** a "Curated by …" paragraph and a "…is made possible by…" sentence go (N27-04–05). Longing corrected.
- **Cincinnati special features (her decision):** the Special Features page is read before the listings and its names
  kept in `scraper/output/not_shows/cincinnati.json`; a kept name is dropped from the listing, and again on the name a
  show's own page gives. Seeded with the four on her saved page and thirteen already closed, written in by hand with
  their evidence. N27-06–10. The run corrected: To See and Be Seen, Gifts from Japan, Tamary Kudita, Fine Lines and
  the Weston Collection taken out (the last two already in her quarantine). QC lists those two as UNEXPLAINED: the
  correction writes no log line; the cause is this decision.
- **Quarantine holds a show its venue moves (app):** an import also drops a row whose venue + title match a quarantined
  entry (`quarantineKeys`; `quarantine_moved.js`). Not published.

## Changed in the instructions

- `docs/venues.md`: both venues' decisions. `docs/app.md` §4: the venue + title match and its trade-off.

## Still open

- The next Menil and Cincinnati sweeps confirm the fixes (CLAUDE.md §2.2.2).
- Publishing the quarantine fix: her go-ahead. Until then Kusama, at its new address, comes back on her next import.
- Think Big was named to her as a special feature without evidence; it is not on the list and stays a row.
