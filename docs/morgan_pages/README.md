# Morgan pages, saved from her browser — 22 Sep 2026

Saved with Ctrl+S from tabs she had open. No request was made to the Morgan to
produce any of them.

| File | Page | Type |
|---|---|---|
| `exhibition_tarot.mhtml` | `/exhibitions/tarot` | current |
| `exhibition_william_blake.mhtml` | `/exhibitions/william-blake` | upcoming |
| `exhibition_ballets_russes.mhtml` | `/exhibitions/ballets-russes` | past, closed Sep 2024 |
| `listing_current.mhtml` | `/exhibitions/current` | listing |
| `listing_upcoming.mhtml` | `/exhibitions/upcoming` | listing |
| `listing_past_2025-2026.mhtml` | `/exhibitions/past/2025-2026` | listing, page 1 of 3 |

**All three share one shape**, which is what makes this venue cheap to wire:
title in `h1.page-header span`, dates in `.field--name-field-display-date`
(`June 26 through October 4, 2026`), the lot inside `article.exhibitions`.

**Video embeds are ordinary here, not exceptional.** Tarot carries three
iframes and a dedicated video field, Ballets Russes one, William Blake none.
The blurb extractor has to step over them rather than treat one as a surprise.

**Read it with `email.message_from_bytes` and take the `text/html` part** — an
`.mhtml` is a MIME container, so a plain `grep` sees quoted-printable.

## What it gives us

The Morgan runs Drupal and names its fields, so the page is the tidiest of the
three blocked venues:

| Wanted | Where |
|---|---|
| Title | `h1.page-header span` — *Tarot! Renaissance Symbols, Modern Visions* |
| Dates | `.field--name-field-display-date` — `June 26 through October 4, 2026` |
| The exhibition | `article.exhibitions.full` wraps the lot |

No JSON-LD, so the engine's structured-data path finds nothing and every field
comes from the markup.

## The trap, and it would have cost a day

**`field--name-body` appears TWICE.** The first one is 29,000 characters above
the exhibition — it is the site header's Shop / Tickets / Search buttons. A
recipe naming `.field--name-body` gets three buttons as the curatorial text for
every Morgan row, on every page, and the summary would look populated rather
than empty.

**So the blurb selector must be scoped inside the article**, not matched on the
class alone. Same shape as the Wallace's `section--footer-spacer` and the V&A's
cookie panel: a class that means "a field" in general, believed as though it
meant this field in particular.

## The listings — read from the saved pages, 22 Sep

All three are now files. Morgan runs Drupal, and the listings are **three
different views**, not one layout repeated.

### Current — `/exhibitions/current`

Two blocks. Only the first is wanted.

| Block | Holds |
|---|---|
| `view-display-id-page_1` | tarot, hujar-contact, ashbery-collection, J-Pierpont-Morgans-Library |
| `view-display-id-block_1` | "Presentations from our Collection" — **not wanted** |

So her "exclude everything below that heading" is a **structural** boundary, not
a textual one: scope to `page_1` and the second block is never read. A card's
link is on its image (`.views-field-field-teaser-image a`), its title is a bare
`<strong>` that is not a link, and its dates are an `<em>`.

`J. Pierpont Morgan's Library` prints `Ongoing` where the others print a range —
that is `excludeOngoing`, which the engine already has.

### Upcoming — `/exhibitions/upcoming`

Same card shape, one block, **and the block is `page_2`, not `page_1`.** Five
exhibitions, all fully dated. Nothing after the cards, as she said.

### Past — `/exhibitions/past/<year-pair>`

A different view entirely (`view-id-taxonomy_term`), rows down the page, each
carrying title, dates AND a paragraph of its own.

**THREE LINK SHAPES, AND ONE OF THEM HAS NO `/exhibitions/` IN IT.** Nine of the
ten rows on page one are `/exhibitions/<slug>`; the tenth is
`/collections-spotlight-summer-2026`, at the site root. A selector matching
`a[href*="/exhibitions/"]` — which is what the recipe has today — finds nine and
silently loses the tenth. **So the past rows are selected structurally**, by
`.field--name-node-title h2 a`, never by what the address looks like.

Morgan is inconsistent about this on purpose or by accident: the CURRENT
listing's Collections Spotlight IS under `/exhibitions/`.

**The pager numbers from ZERO** — `?page=0`, `?page=1`, `?page=2` — so page one
of three is `page=0`. Taken from its own links, never assumed.

**Three year-pairs are needed**, her correction: `2025-2026`, `2024-2025` and
`2023-2024`. A show closing just after the 1 July 2024 floor is filed under
2023-2024, so stopping at two pairs loses it. **The pairs are derived from the
floor and today, never typed** — the same trap `expandYearArchive()` already
avoids at the Met, except that this venue's pages are pairs rather than single
years.

### The open question: does a past exhibition need opening at all?

Each past row carries a full paragraph of curatorial prose, ending in a complete
sentence. It is a Drupal `text-with-summary` field, so it is a trimmed summary
rather than the whole page — Tarot's own article runs 13,575 characters against
a listing paragraph of roughly 300.

That matters because of volume, not tidiness. Roughly 70 past exhibitions sit
across the three year-pairs. Opening each one at a polite pace is over half an
hour of requests at a venue that has already refused us once for going too
fast; reading them off the listings is eight page loads in total.

## Access, as of 22 Sep

Not yet saved as files; these are her words plus screenshots.

- **Current** (`/exhibitions/current`): cards under a "Current Exhibitions"
  heading. **Drop any card reading "Ongoing"** — those are permanent displays.
  **Drop everything below the heading "Presentations from our Collection".** No
  pagination and no load-more.
- **Upcoming** (`/exhibitions/upcoming`): same layout, and nothing after the
  cards.
- **Past** (`/exhibitions/past`): year-pair pages — `/past/2025-2026`,
  `/past/2024-2025` — listed DOWN the page, each with title, dates AND a short
  blurb. Paginated with a numbered Drupal pager, three pages for 2025–2026.

**Two things must be derived rather than typed.** The year pairs are correct on
the day they are written and wrong the next year, exactly as a hardcoded year
list would be at the Met — `expandYearArchive()` exists for this. And "only page
one of 2024–2025 is needed" is true in September 2026 because that is where the
1 July 2024 floor falls; the walk stops on the floor, not on a page number.

**Worth confirming from the markup before it is relied on:** she notes the
listing blurb may be good enough that no exhibition page needs opening at all.
If so Morgan costs one request per listing page instead of one per exhibition —
which is what decides whether this venue survives the pacing limit. Whether
that blurb is complete or a teaser ending in "Read more" cannot be told from a
screenshot.

## Access, as of 22 Sep

**A real Morgan exhibition page has never been read.** Run A reached
`/exhibitions/current` and `/exhibitions/online` — a listing and a section of
the site. `/exhibitions/william-blake` was the first genuine exhibition page
tried, and by then the burst of unpaced requests had already lost us access.
That is still open.
