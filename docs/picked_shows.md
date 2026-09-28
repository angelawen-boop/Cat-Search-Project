# Picked shows — venues watched a few shows at a time

**Her idea, agreed in rough shape 28 Sep 2026. Not built.** Nothing is built
until she says go. Open questions are at the bottom, and they are hers.

## The problem

Some venues matter to her only now and then: an occasional blockbuster, at
most ~5 shows a year reaching her ledger. A full venue costs a listing
recipe, pagination, a past archive, her exclusion rulings and a count check,
plus a monthly sweep's page loads. Then ~30 rows arrive and she dismisses 27.
The cost is out of all proportion to what she keeps.

## The design as agreed

**She picks the shows; the scraper reads only those pages.**

- **She browses** the venue's current, upcoming and past shows herself and
  picks the ones she wants.
- **She hands over the addresses** in a file, one link per show. That is
  pasting addresses, not typing exhibition data, so her "no manual data
  entry" constraint holds.
- **The scraper reads only those pages**, one each. No listing, no archive,
  no pagination, no count to check against hers.
- **The output is the ordinary pro forma CSV** (CLAUDE.md §3), so stitch,
  compress, qc, the import and the catalogue lookup all work unchanged.
- **A site that blocks us:** she saves the pages instead of giving links, and
  the same reader reads those (as `from_saved_pages.js` does for MoMA).

## Setting up a venue — once

1. **She saves one show page of every kind** the venue has. Past shows often
   sit on a differently built page from current ones, so that could be 1
   page or 3–4. Same rule as the intake (CLAUDE.md §5, step 2): the
   addresses are copied from a record, never typed from memory.
2. **A small recipe, written offline** on those pages: where the title, the
   dates and the description sit on ONE kind of page. Tested on her saved
   pages, no network, as every recipe is.
3. **What the site asks** — `node scraper/robots.js` for its wait and
   off-limits paths, before any live page is read.
4. **One live check that the container can get in** — robots.txt guarantees
   nothing until a page is actually asked for. One request, for ONE of the
   show pages the recipe was written on (the recipe itself is already proven
   offline, so this asks about ACCESS only). It passes only if the real page
   comes back — not a refusal, and not a bot-check page served as if it
   were fine. Never more than that one page. If it fails, she saves the
   pages instead of giving links.
5. **The app** gets the venue's code, chip and shop address, and a publish
   (CLAUDE.md §4's rules apply).

## A page the samples did not cover

A picked show whose page is built differently must come out **flagged, not
wrong**: a note on the row saying which field could not be read. She saves
that page and the recipe is extended to it. It must never produce a
plausible-looking wrong row.

## Venues in this stream

| Venue | State |
|---|---|
| `moma` | **Already works this way** — since 27 Sep she saves the pages of the shows she wants and `from_saved_pages.js` reads them (`run_2026-09-27_123228`, 4 rows). Belongs to this stream, not the sweep. **Today only:** `from_saved_pages.js` runs MoMA's full sweep recipe, so the listing page has to be one of her saved files. **Once this is built, MoMA is her saved show pages only** (her ruling 28 Sep) — no listing, no links, since MoMA refuses the container |
| Detroit Institute of Arts (DIA) | **The test case** — the first venue set up this way, her choice 28 Sep. No venue code chosen, no robots.txt read, no pages saved yet |
| Guggenheim, Whitney | Named by her as likely candidates, 28 Sep. Nothing decided |

More will come; she has not listed them yet.

## Open — hers to decide when building

- **Chips:** one per venue, or one grouped chip (e.g. "Occasional") holding
  them all. A grouped chip keeps the row short but changes how venues are
  filed.
- **Re-reading the list:** read each link once and never again, or re-read
  the whole list on each monthly sweep (one page per show) so a changed date
  or description reaches her as a Change card.
- **Where the link file lives** and what it looks like.
