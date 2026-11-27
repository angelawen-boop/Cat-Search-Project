# Museum of Fine Arts, Budapest — pages saved by the container, 27 Nov 2026

Read headless from the container, every page answered (Cloudflare in front, no challenge). Saved as rendered HTML.

| File | What it settled |
|---|---|
| `listing_2026-11-27.html` | One page holds the current show and every past year back to 2010 (older years hidden behind a toggle, already in the page). No upcoming section. Year headings misfile some shows: read each card's own dates |
| `show_*.html` | Every temporary show inside the lookback, one permanent-collection page, and one show from most years 2010–2023 (the older layouts). Each: title, a "floor - dates" line, full curatorial text. Junk to strip: ticket buttons, opening-days notes, picture captions, curator and sponsor lines, "Recommended exhibitions" |

Three show-page layouts over the years, all read by one recipe (`mfab`); the test is `scraper/fixtures/mfab_pages.js`.
