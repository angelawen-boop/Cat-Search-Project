# KHM — saved pages

Her saves of 5 Oct 2026, for two rows that lost their opening dates.

- `head_and_shoulders_coins_in_fashion.html` — the page says "since 11. November
  2025". The date reader knew "from"/"opens", not "since", nor a day written with
  a full stop. Fixed in `scraper/dates.js` (with a year only); DS-001.
- `prime_time_travelling_with_a_roman_portable_sundial.html` — the page now says
  only "until 14 March 2027"; the opening date is no longer published. The row
  is right.
- `upcoming.html` — the upcoming listing; both shows are linked from it.
- `bernini_painter_and_sculptor.html`, `toni_r_toivonen_last_impressions.html` — read
  live 19 Nov 2026. The address box (`infobox-section`, with its Google Maps link) and
  the "Further exhibitions" strip's blurb (`theme_exhibitionlist`, German on one page)
  reached the row. Test: `sweep_nov_pages.js`.
- `current_2026-11.html` — the current page as a browser draws it after scrolling, 19 Nov 2026 (a plain fetch has no
  cards). Its headline section is named for the season: "the-great-fall-exhibition", was "-summer-", so the recipe
  read nothing from October. Test: `khm_season_pages.js`.
