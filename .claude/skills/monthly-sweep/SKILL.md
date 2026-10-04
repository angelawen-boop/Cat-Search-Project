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
4. **QC — all of it, read, not only counted:**
   - `node scraper/qc.js <run>` — exit 1 means faulty rows. Name each one.
   - Its exceptions: counts dropped, venues gone to markers only, summaries lost.
   - `node scraper/venue_status.js` — rows per venue now against the last run
     that brought rows.
   - The log's TITLES section (titles the page check changed or could not
     complete).
   - **Read every title and summary in `sweep.csv`** for junk: cookie
     notices, credit lines, prices, opening hours, breadcrumbs, menu text,
     whole pages, broken characters, halved or run-together titles, notes that
     quote a page instead of a match. The rulings in `CLAUDE.md` §2 decide
     what belongs; a row her ruling excludes appearing is a fault.
5. **Every fault: diagnose offline** — the log, reply labels, stall report,
   kept pages (`scraper/output/pages_kept/`), saved pages under `docs/`. Say
   what is proven, what is a guess, and what would settle it. No network
   request to answer a question.
6. `git add scraper/output scraper/robots`, commit ("Monthly container sweep <run>"),
   `git pull --rebase origin main`, push to `main`. Retry the push on network
   failure only (2s, 4s, 8s, 16s).

## The report — to her, plain English, short bullets

- The run folder, and done / done with faults.
- Per venue: rows this run, rows last time; anything that changed sharply.
- **Faults** — each one: what, which rows, the likely cause (labelled proven or
  guess), the proposed fix, and whether it needs a code change or a re-sweep.
  "Waiting for you" on every one.
- Venues refused or blocked (marker rows) — said as a fact, not a fault.
- Last line: "Next: your home sweep, then stitch and compress."

Talk TO her ("you"), never about her.
