# Morgan pages, saved from her browser — 22 Sep 2026

Saved with Ctrl+S from tabs she had open; no request made to produce them.
The recipe's guide and offline test (`scraper/fixtures/morgan_pages.js`), never
the data — the Morgan is swept live from her laptop.

| File | Page |
|---|---|
| `exhibition_tarot.mhtml` | `/exhibitions/tarot` — current |
| `exhibition_william_blake.mhtml` | `/exhibitions/william-blake` — upcoming |
| `exhibition_ballets_russes.mhtml` | `/exhibitions/ballets-russes` — past |
| `listing_current.mhtml`, `listing_upcoming.mhtml` | the two listings |
| `listing_past_2025-2026.mhtml` | past, year pair 2025-2026, page 1 of 3 |
| `exhibition_bellini_perugino.mhtml` | `/exhibitions/bellini-perugino` — past; saved 30 Sep |

Read an `.mhtml` with `email.message_from_bytes` and take the `text/html`
part — a plain grep sees quoted-printable.

## What they settled

**Show pages** (Drupal, no JSON-LD): title `h1.page-header span`; dates
`.field--name-field-display-date` ("June 26 through October 4, 2026"); all inside
`article.exhibitions.full`. Video embeds are ordinary — step over them.

**Trap: `field--name-body` appears twice.** The first is the site header's
Shop / Tickets / Search buttons, 29,000 characters above the show. The blurb
selector is scoped inside the article.

**Current listing:** two blocks — `view-display-id-page_1` is the shows;
`block_1` ("Presentations from our Collection") is not wanted, so the recipe is
scoped to `page_1` (her boundary, made structural). Card link on the image,
title a bare `<strong>`, dates an `<em>`. "Ongoing" cards are permanent
displays — `excludeOngoing`.

**Upcoming listing:** same card shape, block `page_2`.

**Past:** year-pair pages (`/exhibitions/past/<yyyy-yyyy>`), rows with title,
dates and a paragraph each.
- **Rows are selected structurally** (`.field--name-node-title h2 a`), because
  one link shape has no `/exhibitions/` in it
  (`/collections-spotlight-summer-2026`).
- **The pager counts from zero** (`?page=0`) — from its own links.
- **Three year pairs** (2025-26, 2024-25, 2023-24): a show closing just after the
  1 July 2024 floor is filed under 2023-24. The pairs are derived from the floor
  and today, never typed.
- **Past blurbs are read off the listing; pages are not opened** (her ruling) —
  eight listing loads instead of dozens of show pages. Collections Spotlight is
  excluded (§2 of the guide).
- **Unless the listing has no description — then the page IS opened** (her
  ruling, 30 Sep). The Bellini row's body is a picture and its caption only;
  captions are `p.small`, skipped (`listingRow.skip`), so the row comes back
  empty and its page is read. Show pages carry the same `p.small` captions
  inside the body, skipped there too (`descriptionSkip`). MP-004, MP-011/012.
