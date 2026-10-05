# Cincinnati Art Museum — saved pages, 4 Oct 2026

Saved by the container itself (her yes, for this venue only): one fetch each,
10s apart, through the sweep's own browser and network bridge. Behind
Cloudflare, but a blank headless browser was let in on all 12. robots.txt
asks no wait and rules out none of these addresses.

| File | Page | What it settled |
|---|---|---|
| `current.html` | `/art/exhibitions/` | 2 cards — her count |
| `upcoming.html` | `/art/exhibitions/upcoming-exhibitions/` | 2 cards — her count |
| `archive_index.html` | `/art/exhibitions/exhibition-archive/` | Holds THIS year's closed shows (4 — her "2026"); its `/2026/` page is empty |
| `archive_2025.html`, `archive_2024.html` | `/exhibition-archive/<year>/` | 14; 12 of which 9 inside the lookback, one (Venice) on another host |
| `archive_2023.html` | `/exhibition-archive/2023/` | Years are filed by OPENING date (Shapeshifting, Jan 2024–Jan 2025, on 2024), so 2023 is read too; nothing on it closed after 1 Jul 2024 |
| `show_*.html` | one show page per address shape: current, upcoming, archive year, special features | The description block — title h2, dates h3, prose up to the next heading |

Fixture: `scraper/fixtures/cincinnati_pages.js`.

- `show_archive_discovering_ansel_adams.html`, `show_archive_modern_and_contemporary_craft.html`
  — her saves of 5 Oct 2026; both rows came back as picture captions. Craft sets
  its prose in `<div>`s; Ansel Adams's prose sits under an "Extended Hours"
  notice's heading. The recipe now reads p or div, stops at the visiting
  sections (`descriptionUntil`), drops the hours lines (`creditPara`) and
  organiser/catalogue-sales sentences (`dropSentence`). CI-022–024.
