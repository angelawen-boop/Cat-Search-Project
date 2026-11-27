# Home run `run_2026-11-27_202005` — the report

**Done, with one fault.** Menil alone, its first sweep in the visible Chrome, on trial. Pushed to main.

## Changes

| Group | What |
|---|---|
| 2. Your decisions now reflected | • Menil: Foyer Installations, "… from the Collection" and Recent Acquisitions left out<br>• Menil: its permanent galleries (no dates) left out |
| 8. Description problems | • How to Make an Exhibition: The Story of Jermayne MacAgy ends in a list of funders (Fault 1) |
| 9. Others | • Cloudflare let every page through: none refused, no bot check<br>• Shows closed before 27 May not read (routine sweep); still counted, so the count holds |

## Faults

1. **A funder list at the end of one description.**
   - **What:** How to Make an Exhibition: The Story of Jermayne MacAgy ends "Johnson; Dillon Kyle and Sam Lasseter; …
     and the City of Houston through Houston Arts Alliance."
   - **Cause, proven from the kept page:** the show's "Support" paragraph was cut into sentences at a middle initial
     ("John W. Johnson"). The first half was dropped as funder text; the second half holds no funder wording, so it
     stayed. The same text was in the last Menil run (15 Oct).
   - **Fix:** a Menil recipe rule: the description stops at the page's "Support" heading, which every Menil show
     page has. Tested on this run's kept pages; this run's rows corrected from them, no re-sweep.

## Carried from last run

- Menil, refused by Cloudflare on the container: answered in the visible Chrome, clean.
- Cincinnati, refused the same way: not swept yet.

Say which faults to fix.

Next: Cincinnati's trial, then stitch and compress, once the faults are fixed.
