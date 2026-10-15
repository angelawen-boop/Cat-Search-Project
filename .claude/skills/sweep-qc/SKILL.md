---
name: sweep-qc
description: QC and diagnosis of ONE sweep run, container or home, and the report she works from — the same process for both, before anything is stitched. Used by the monthly-sweep routine for the container's run; use it directly when she says she has pushed her home sweep ("I've pushed the home sweep", "QC the home run"), or asks for any run to be checked.
---

# Sweep QC — one run, container or home

**Her decision: every run is QC'd the same way, and its faults
fixed, before it is stitched.** The container's run gets this from the
monthly-sweep routine; her home run gets it in a session she starts after
pushing it. Stitch and compress come only after both have passed.

**Which run:** the one she names; otherwise `git pull origin main` and take
the newest `scraper/output/run_*` that holds this pile's venues (a home run
holds only met, artic, mad, brit, orsay, morgan, moma).

**No network request** to answer a question here — the log, the notes, kept
pages and her saved pages under `docs/` only. If only the live site can
settle something, name the one page that would; she saves it.

## Steps

1. **QC — `node scraper/qc.js <run>`.** Exit 1 means faulty rows: name each.
   Its second half, **CHANGES SINCE EACH VENUE'S LAST RUN**, is the
   comparison done for you, by address, with the cause read from the run's
   own log and notes. **Its causes are facts — repeat them, never re-guess
   them.** A row it marks `excluded … (log)` was dropped by her decision; a
   `MOVED` row is the same show at a new address; `ADDRESS LEFT` is a show
   the last run had at two addresses, still in at one; `KEPT BY RULE` is the
   lookback rule working; `SAME NAME` is the no-de-duplication rule working;
   `LOST TEXT … (note)` says why. None of these is junk or a fault.
   **`RULE STOPPED` is always a fault**: a row her decision excluded last run is
   back. Check the venue's other NEW rows for the same kind (a newly opened
   display has no earlier exclusion to match).
2. **Your job is what the code could not settle:**
   - **Every `UNEXPLAINED` row** and every `EMPTY PAGE` needing a look. For
     each: open the log section for that venue (`grep '\[<venue>\]'` the
     log), the row in the earlier run, and the kept pages
     (`scraper/output/pages_kept/<venue>/`) or saved pages under `docs/`.
     Find the cause. No network request — if only the live site can settle
     it, say exactly which one page would.
   - **Every `JUNK?` row**: confirm or clear it by reading the whole summary.
     `CLAUDE.md` §2.1: no row carries a credit line, star rating, ticket price,
     funder list, opening hours, breadcrumb or cookie notice — ANYWHERE in the
     summary. One of these present is a fault, never "fine".
   - **Every `WORSE TEXT` row** is a fault (the last run had more or cleaner
     text): compare the two descriptions and say what was lost.
   - **Read every title and summary in `sweep.csv`** for junk the patterns
     miss: cookie notices, prices, opening hours, breadcrumbs, menu text,
     whole pages, broken characters, halved or run-together titles, a show
     whose own dates put it before the lookback, notes quoting a page instead
     of a match. `docs/venues.md` decisions decide what belongs; a row her decision
     excludes appearing is a fault.
   - The log's TITLES section (titles the page check changed or could not
     complete).

   **Before you call anything a fault, check it against the rule.** Two rows
   are a duplicate only at the SAME address. A row is outside the lookback
   only if its CLOSING date is before 1 July 2024 — no closing date means
   kept. Before you write "probably", "looks like" or "a guess", run the
   check that would settle it; a guess is allowed only when the one thing
   that settles it is the live site, and then you name that page.
   **The report is not finished while any UNEXPLAINED row has no cause.**
3. **Fixes** — in a session she is in, a fix is proposed, she says yes, and
   it is made and tested on her saved pages (`docs/<venue>_pages/`); a fault
   in a run's rows is corrected from its kept pages (`reread_kept.js`), never
   by sweeping again. In the unattended routine, nothing is changed — the
   fix waits in the report.

## The report — to her, plain English, short bullets

She works IN this session after reading it, so it must be ready to act on.

- The run folder, and done / done with faults.
- **Changes** — grouped by kind (her decision), in QC's own numbered order,
  each heading followed by short bullets: venue, before → now where the count
  moved, what changed in a few words, and "(Fault N)" where it is one.
  Skip a group with nothing in it; never name unchanged venues.
  1. **Your fixes / decisions now reflected** — rows her decisions excluded,
     and each fix this run was asked to confirm that held.
  2. **Missing shows**
  3. **Changed titles**
  4. **Changed links** — say which card QC expects (a Change card for the
     link, or a New card). Both come from the last run, not her ledger.
  5. **New dates** — a blank date now filled.
  6. **Changed dates**
  7. **Description problems** — worse, lost or missing text, and junk.
  8. **New shows**
  9. **Others** — anything that fits none of the above (rows kept by rule,
     refusals and their marker rows, a show losing one of two addresses).
- **Faults** — numbered, each in this shape:
  - **What:** the rows, by title.
  - **Cause:** what you found — **proven** (say from what: log line, note,
    kept page) or **guess** (and the one page that would settle it).
  - **Fix:** the change you propose, and whether it is code, a recipe, or a
    re-sweep (a re-sweep is always hers to call).
- Last lines: "Say which faults to fix." then the next step: after the
  container run, "Next: your home sweep, then stitch and compress."; after a
  home run, "Next: stitch and compress, once the faults are fixed."

**Only this run's venues.** A container run never mentions a home venue
(met, artic, mad, brit, orsay, morgan, moma — `route: 'local'`), and a home
run never mentions a container venue, even where a script prints it
(`venue_status.js` lists every venue): the two piles must not be confused
(her decision).

Talk TO her ("you"), never about her.
