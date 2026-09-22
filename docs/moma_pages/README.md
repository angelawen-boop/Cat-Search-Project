# MoMA pages, saved from her browser — 22 Sep 2026

Two `.mhtml` files, saved with Ctrl+S from tabs she already had open. **No
request was made to MoMA to produce them**, which is the point: the probe
answers access and nothing else, and page layout comes from her.

| File | What it is |
|---|---|
| `listing.mhtml` | `/calendar/exhibitions` — current and upcoming together |
| `exhibition_5918.mhtml` | *The Surrealist Book*, chosen because it carries both traps at once: member-preview dates and a funding block |

**Read them with `email.message_from_bytes` and take the `text/html` part** —
an `.mhtml` is a MIME container, so a plain `grep` sees quoted-printable and
finds nothing.

## What they settled

- **`<div id="description">`** holds the curatorial blurb and nothing else. It
  stops before "Organized by…", the funders, the Events block and the related
  articles — all of which carry their own dates.
- **A tag beside the title says what MoMA calls the thing**: `Exhibition` on
  *It's Alive*, `Installation` on *Creativity Lab*. Same address shape, so
  nothing but the page can tell them apart.
- **"In the galleries" needs no rule.** Those rooms live at `/calendar/floors/N`
  and `/calendar/galleries/N`, which the recipe's selector never matches. It had
  been assumed they were mixed in with the exhibitions; they are not.
- **`<meta name="description">` carries `Exhibition. Oct 4, 2026–Jan 23, 2027.`**
  before the blurb — the type and a clean range in one field, with no member
  previews and no "Last chance" in front of it.
- **No JSON-LD anywhere**, so the engine's structured-data-first path finds
  nothing here and every field comes from the markup.
- The listing gives **24 cards**, matching what the 22 Sep access probe counted.

## The date lines, exactly as the listing prints them

The reason a MoMA date rule cannot be written from a screenshot:

```
Peggy Weil: Core Memory      Last chance / Through Oct 4
The Surrealist Book          Member Previews, Oct 1–3 / Oct 4, 2026–Jan 23, 2027
Mondrian Boogie Woogie       Member Previews, Mar 18–20 / Mar 21–Jul 31, 2027
It's Alive!                  Aug 1, 2026–Summer 2027
Yoko Ono: IMAGINE PEACE      Sep 3, 2026—Spring 2027      (em dash, not en)
Hyundai Card First Look      Apr 24, 2026–Fall 2026
The Sumptuous Discovery      Mar 8, 2025–ongoing
Modern Mural                 Ongoing
Art Lab: Imagination         Ongoing from Oct 19
Architects of Liberation     Through Jan 2, 2027
Pierre Huyghe: UUmwelt       Through Nov 29               (no year at all)
```

Eleven shapes on one page, five of which no other venue produces.

**These files are a snapshot of one day.** They are evidence of what the markup
was, not a promise about what it is. Re-save rather than trust them if a sweep
disagrees with them.
