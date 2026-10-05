---
name: monthly-sweep
description: The container's half of the monthly sweep — sweeps the container's venues, finishes any cut short, runs QC, pushes the run and reports. Run by the "Monthly container sweep" routine on the 5th, ~2am Sydney; also on request ("run the container sweep").
---

# Monthly container sweep — unattended

Her design, 2 Oct 2026. **This job goes first; she follows** with the home
sweep, then a session with her stitches, compresses (subagents need her
approval), runs the final QC and hands her the CSV. This job does none of that.

## Hard limits — nobody is watching

- **Sweep only the container's venues** — `node scraper/sweep_prototype.js`
  with no venue names; `machineVenues()` picks them. Never `--home`, never name
  a venue, never `--reread`.
- **Never sweep a venue again once it has written its file.** Her rule, 27 Sep:
  a fault is fixed from kept pages or diagnosed from the log, never by sweeping
  again. Any re-sweep waits for her.
- **Never change code** — `scraper/*.js`, recipes, `Cat_Watch.jsx`, tests,
  `build/`, `CLAUDE.md`, `docs/`. A broken recipe or any other fault needing a
  code change: diagnose offline, write the proposed fix in the report, wait
  for her. That includes a fix applied with `reread_kept.js --write`, which
  needs a recipe change first.
- **No subagents, no compression, no stitch, no `Artifact`/`ArtifactData`
  calls, no publish.**
- **Commit only `scraper/output/` and `scraper/robots/`** (the sweep refreshes
  each site's saved robots.txt there; her ruling, 5 Oct).

## Steps

1. `git pull origin main`. Confirm you are on `main` with a clean tree. Then
   `npm ci` — a routine session can start without the repo's own setup having
   run, and the sweep dies on a missing package (5 Oct: `node-fetch`).
2. Start the sweep **in the background** and wait on its log until it prints
   that it has finished. Never cut it short.
3. **Venues with no file in the run** (cut short, over budget, browser died):
   `node scraper/sweep_prototype.js --continue` — it asks only for venues with
   no file, so a finished venue is never swept again. **Once.** A venue still
   missing after that is a fault for the report.
4. **QC — `node scraper/qc.js <run>`.** Exit 1 means faulty rows: name each.
   Its second half, **CHANGES SINCE EACH VENUE'S LAST RUN**, is the
   comparison done for you, by address, with the cause read from the run's
   own log and notes. **Its causes are facts — repeat them, never re-guess
   them.** A row it marks `excluded … (log)` was dropped by her ruling; a
   `MOVED` row is the same show at a new address; `KEPT BY RULE` is the
   lookback rule working; `SAME NAME` is the no-de-duplication rule working;
   `LOST TEXT … (note)` says why. None of these is junk or a fault.
   **`RULE STOPPED` is always a fault**: a row her ruling excluded last run is
   back. Check the venue's other NEW rows for the same kind (a newly opened
   display has no earlier exclusion to match).
5. **Your job is what the code could not settle:**
   - **Every `UNEXPLAINED` row** and every `EMPTY PAGE` needing a look. For
     each: open the log section for that venue (`grep '\[<venue>\]'` the
     log), the row in the earlier run, and the kept pages
     (`scraper/output/pages_kept/<venue>/`) or saved pages under `docs/`.
     Find the cause. No network request — if only the live site can settle
     it, say exactly which one page would.
   - **Every `JUNK?` row**: confirm or clear it by reading the whole summary.
     `CLAUDE.md` §2: no row carries a credit line, star rating, ticket price,
     funder list, opening hours, breadcrumb or cookie notice — ANYWHERE in the
     summary. One of these present is a fault, never "fine".
   - **Every `WORSE TEXT` row** is a fault (the last run had more or cleaner
     text): compare the two descriptions and say what was lost.
   - **Read every title and summary in `sweep.csv`** for junk the patterns
     miss: cookie notices, prices, opening hours, breadcrumbs, menu text,
     whole pages, broken characters, halved or run-together titles, a show
     whose own dates put it before the lookback, notes quoting a page instead
     of a match. `CLAUDE.md` §2 rulings decide what belongs; a row her ruling
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
6. `git add scraper/output scraper/robots`, commit ("Monthly container sweep <run>"),
   `git pull --rebase origin main`, push to `main`. Retry the push on network
   failure only (2s, 4s, 8s, 16s).

## The report — to her, plain English, short bullets

She works IN this session after reading it, so it must be ready to act on.

- The run folder, and done / done with faults.
- **Changes** — one line per venue that changed in ANY way QC lists (rows,
  titles, dates, moves, lost text — not only the count): before → now, and
  the cause in a few words. Venues QC says "nothing changed": one line
  naming them.
- **Faults** — numbered, each in this shape:
  - **What:** the rows, by title.
  - **Cause:** what you found — **proven** (say from what: log line, note,
    kept page) or **guess** (and the one page that would settle it).
  - **Fix:** the change you propose, and whether it is code, a recipe, or a
    re-sweep (a re-sweep is always hers to call).
- **Expected, not faults** — your rulings taking effect, rows kept by rule,
  refusals (marker rows), in one short list. Say which of them will reach her
  as cards: a MOVED show arrives as a NEW card, a title change as a Change
  card.
- Last lines: "Say which faults to fix." then "Next: your home sweep, then
  stitch and compress."

Talk TO her ("you"), never about her.
