# Listing pages she saved, 24 Sep 2026

Saved to settle where each venue's LISTING sits, so links from menus and promo
cards are not read as listings. Tested by `scraper/fixtures/listing_pages.js`.

| File | What it settled |
|---|---|
| `frick_current.mhtml` | Current/upcoming cards in `.paragraph-cards-layout__cards`; below them a "Past" section of the three latest closed shows |
| `frick_past.mhtml` | Clean: every link in the listing, two or three per card. Newest first |
| `wallace_current.mhtml` | Listing in `.c-body-promos`. Header menu carries three past shows; "Discover more" promo at the foot |
| `wallace_past.mhtml` | Listing in `.section-listing`; same header menu |
| `brera_current.mhtml`, `brera_archive.mhtml` | Both clean, in `#mostre-archive-list`, two links per card. The archive genuinely lists shows still running |
