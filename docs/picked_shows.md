# Picked shows — "Add by link" in the app

**Her design, agreed 3–4 Oct 2026. Not built** — nothing is built until she
says go. Replaces the scraper-side plan of 28 Sep (in git), which survives
only as the fallback below.

## The problem

Some venues matter to her only now and then: ~5 shows a year. A full venue
costs a recipe, an archive, her rulings and a monthly sweep — then ~30 rows
arrive and she dismisses 27. She would rather pick the shows herself, and add
one the moment she comes across it.

## The design

- **Behind Import — no new section or button.** Import offers **CSV file**
  (the file picker, as now) or **Paste links**: one box, links separated any
  way (commas, spaces, lines, mixed with text); code takes everything starting
  `http`, a repeat read once. One button, **Read**; progress "Reading 3 of 10…".
- **The ordinary review.** Each link becomes a pro forma row fed to the
  existing intake: Add / Fill / Change / Reject / quarantine all as now.
- **A link it cannot read is a line, never a card** — the full link and why
  (empty page, refused, no dates). Unread links **stay in the paste box**,
  kept in the store, until read or cleared by her.
- **No lookback cutoff** for anything added by link (her ruling).
- **Chip: one "Occasional"** for every venue added this way (her ruling); each
  venue keeps its own name and shop behind it.
- **Cost:** one keyed Parallel read and one model call per link; a venue's
  first link 2–3 more, once.

## Per link — code first, model only for prose

1. One page read (`fetchPage`, `full`).
2. **Title = what the catalogue would be called** (her ruling): the page's
   title, site name stripped; subtitles and split headings kept — "Peggy
   Guggenheim in London: The Making of a Collector", "Hammershøi. The Eye that
   Listens". **Title stays in the museum's language.**
3. **Dates:** the first range after the show's heading, by the scraper's own
   date reader — moved to its own file and shared, never copied.
4. **Description by the model** (`modelTier: default`, her ruling), same
   prompt as compression, shared not copied. **Any non-English page comes out
   in English; a non-English title gets its translation at the start**
   (`In English: "…".`) — every language, not only Italian (her ruling).
5. Note: `Added by link.`

## A venue the app has not seen

Name from the page title; shop from the show page's own link, else one
search. It must find the **exhibition-catalogues shelf**, else the books
shelf — never the whole shop (mugs, prints). **One card shows venue and shop;
she confirms**; kept in the store, so the next show there skips this. "No
shop" kept the same way.

## Tested 3 Oct

10 show pages, 6 venues (Thyssen, Mauritshuis, RA, Courtauld, DIA,
Cleveland), one keyed read each: all full text, none empty. The dates rule
right 10/10 — every page also carried other dates (another venue's leg, other
displays, events, "More exhibitions"). No JSON-LD comes through Parallel.
Shop link on the show page at 4 of 6. These pages become the offline fixtures.

## Fallback — a link the app cannot read

The scraper reads that one page (a small recipe on pages she saves; robots.txt
first; one access check), output the ordinary CSV.
