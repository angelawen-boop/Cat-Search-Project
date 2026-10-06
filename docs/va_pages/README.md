# V&A — saved pages

- `whatson_2026-10-05.html` — the what's-on listing (`/whatson?type=exhibition`),
  saved by her 5 Oct 2026 (the HTML part of her .mhtml). Settled why the 5 Oct
  sweep let ten Displays through: the venue moved the whole card — badge,
  title, date, site, price — inside the link, so the "Display" badge no longer
  reached the date-side label test. The recipe now reads it from the link's
  text (`excludeLinkLabelled`). Her count on this page: 6 South Kensington
  exhibitions (2 current, 4 upcoming); 10 Displays and 4 other-site shows out.
  Test: `scraper/fixtures/va_pages.js`.
