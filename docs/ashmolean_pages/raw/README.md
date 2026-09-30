# The Ashmolean's show pages, bare — 27 Sep 2026

What the museum's server sends for a show page, before any of its ~100 program
files, stylesheets and data requests run. Four saved by her from Chrome's
view-source (Ctrl+U, then Ctrl+S), one fetched once by the session.

`full_read_rows.csv` holds the same five shows as the 27 Sep 16:36 sweep wrote
them after a FULL browser read (every file fetched).

`scraper/fixtures/ashmolean_pages.js` (AS-021 to AS-025) runs the real recipe
over each bare page with every other request refused and demands the same
title, dates, description and notes as the full read. It passed on all five:
one of each kind of show page — current exhibition, past major show, a display
filed under `/exhibition/`, an "Ashmolean Now", and the one show under
`/display/`.
