# Saved listing pages — titles in the museum's own letters

Saved by her from her own browser, 24 Sep 2026, as "Webpage, Complete" (MHTML).
Image parts removed to keep the repo small; the HTML and stylesheets are untouched,
because the styling is what puts titles into capitals on screen.

| File | Page |
|---|---|
| `rijks_past.mhtml` | https://www.rijksmuseum.nl/en/whats-on/exhibitions/past |
| `louvre_past_2025.mhtml` | https://www.louvre.fr/en/exhibitions-and-events/past-exhibitions?date=2025 |
| `acq_exhibitions.mhtml` | https://www.acquavellagalleries.com/exhibitions |
| `tate_modern_from_now.mhtml` | https://www.tate.org.uk/whats-on?date_range=from_now&gallery_group=tate-modern&event_type=exhibition |

Used by `scraper/fixtures/title_case_pages.js`, which runs the real scraper over them
with no network.

What they settled: every title on these pages is TYPED in ordinary letters and
DISPLAYED in capitals, except these, which the museum itself typed in capitals and
which therefore stay that way — *RIJKSMUSEUM & SLAVERY*, *CLARA AND CRAWLY
CREATURES*, *REVOLUSI!*, *LOUVRE COUTURE*, Acquavella's *VIVID*, *PICASSO* and its
New York *MASTERWORKS: FROM BONNARD TO BARCELÓ*.
