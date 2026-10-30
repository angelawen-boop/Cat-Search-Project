# Import CSV — the pro forma file

The **only** file the app ingests. Columns exactly, in this order:

```
venue_code, title, start_date, end_date, summary, url, notes, swept_at
```

- CSV, not Excel. Excel silently reformats dates.
- Dates `YYYY-MM-DD`. The app blanks what it cannot read and notes it.
- `venue_code` must be one the recipes know. Unknown codes land in "Couldn't be
  filed".
- **Sweep lookback is 1 July 2024, permanently.**

### What the lookback means

Keep an exhibition if it was **open at any point on or after 1 July 2024**.

- March 2024 → September 2024 is **kept**; January 2024 → June 2024 is **dropped**.
- **The test is on the end date, never the start date.**
- An unreadable end date is **kept and flagged** — an unknown date is not evidence
  of being too old.
- **One exception: a year with no day.** "Summer 2022", "March / 2026": take the
  **latest possible day of that year** as an upper bound and drop if even that is
  before the floor. Lookback test only — **nothing is written into the date
  columns.**

### The scraper must never de-duplicate

**It records everything it finds and makes no judgement about duplicates, ever.**
Whether two rows are the same exhibition is decided in the app, where she sees
each proposal. Title-based de-duplication once turned **32 National Gallery
exhibitions into 3.**

**The one permitted exception: never read the same address twice.** Same URL =
same exhibition, no interpretation. Nothing cleverer qualifies.

- Compare the **finished address**, not the raw href (`normalizeUrl()`).
- The guard spans a **whole venue**, not one page.
- **Only scheme and host are lowercased.** Paths are case-sensitive; folding them
  merged two exhibitions differing only in capitalisation.

A link resolving to **another host** is refused and counted in its own `offsite`
column. Every listing page a row is seen on is recorded once and written as
"Found on … Also listed on …" (`listing_note.js`) — her only trace of where a
row came from. A venue's `within` scopes this to the listing, so a menu or promo
card on every page cannot make it lie.

### The notes column is written for her, not for a log

Whatever lands in `notes` is shown **verbatim on the approval card**.

- **Short.** State the fact and stop. **No advice, no instructions.**
- **Say WHY, not WHAT.** The app already reports empty fields.

Good: `No closing date found anywhere on the venue's pages.`
Bad: `NO_END_DATE: kept, lookback unverified`

**A note that quotes the page quotes its MATCH, never its INPUT.** Capodimonte
rows once carried whole pages in `notes` (one at 17,734 characters) because
`findDateRange` returned its input as `raw`. Every branch now quotes its own
match, capped (`frag()`); Q-100 to Q-102. A length cap alone would not have
caught it — a capped whole page is still the wrong thing.

### swept_at — the eighth column

**Per ROW** — a stitch mixes two machines and routinely two runs of one venue.
**Stamped when the venue FINISHES**, in `writeVenueCsv` — a run can spread
across hours. **UTC** (run folder names are Sydney, for sorting by a human).

It drives the app's freshness drawer: **last TRIED** is the latest stamp for the
venue, **last BROUGHT ROWS** the latest among its real rows. The gap says re-run
this one alone. `stitch` and `compress` carry it untouched.

