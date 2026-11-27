# Home run `run_2026-11-27_204658` — the report

**Done, with three faults.** Cincinnati alone, its first sweep in the visible Chrome. Filed beside Menil's report of the
same day (`2026-11-27_home_1_report.md`); a second read of Menil's rows is at the end.

## Changes

| Group | What |
|---|---|
| 1. New shows | • Cincinnati 31 → 36<br>• Faith Ringgold: Seeing Children; The Sense of Beauty (Ponce) — announced since last run<br>• To See and Be Seen; Gifts from Japan; Tamary Kudita — older small displays, found only now (Fault 3) |
| 5. Changed links | • Yayoi Kusama moved into the archive; Charley Harper and Terence Hammonds moved from upcoming to current — a Change card for the link on each |
| 8. Description problems | • Tamary Kudita ends in a sponsor line (Fault 1)<br>• Longing ends in a curator credit (Fault 2) |
| 9. Others | • Cloudflare let every page through: none refused, no bot check<br>• Shows closed before 27 May not read (routine sweep); still counted, so the count holds |

## Faults

1. **A sponsor line at the end of one description.**
   - **What:** Tamary Kudita: African Victorian and Birds of Paradise ends "This special feature is made possible by the
     Private Collection of Lesley Goldwasser and Jonathan Plutzik, with thanks to VISU Contemporary art gallery."
   - **Cause, proven from the row and the recipe:** Cincinnati's list of sentences to drop has no "made possible by".
   - **Fix:** a Cincinnati recipe rule dropping that sentence; tested on this run's kept pages; the row corrected from
     them, no re-sweep.
2. **A curator credit at the end of one description.**
   - **What:** Longing: Painting from the Pahari Kingdoms ends "Curated by Ainsley M. Cameron, PhD, Curator of South
     Asian Art, Islamic Art & Antiquities at the Cincinnati Art Museum."
   - **Cause, proven from the recipe:** Cincinnati has no curator-credit rule (other venues drop these). The same text
     was in the 15 Oct run, so it is probably on that card in your ledger already.
   - **Fix:** a Cincinnati recipe rule dropping a closing "Curated by …" sentence; same test and correction as Fault 1.
3. **Small displays are caught only after they close.**
   - **What:** To See and Be Seen, Gifts from Japan, Tamary Kudita.
   - **Cause, proven from the 15 Oct log and your saved pages of 4 Oct:** none of the three was on the museum's
     current page while open; they appear only once the museum files them in its archive.
   - **Whether the museum lists them anywhere while open — guess.** The one page that settles it: its special-features
     page (`/art/exhibitions/special-features/`), read in your visible Chrome.
   - **Fix:** if that page lists them, add it to Cincinnati's recipe as a listing; if not, nothing to do.

## Menil — found on a second read of its run

- **Curator credits in five descriptions:** Terry Winters, Fragility, D'MBA, Sedona Surreal, The Gift of Drawing:
  Cy Twombly each end "… is curated by <name>, <post>". Unchanged since 15 Oct. Menil's recipe has no curator-credit
  rule. Fix: a Menil recipe rule, tested on the kept pages, rows corrected from them.

## Carried from last run

- Cincinnati, refused by Cloudflare on the container: answered in the visible Chrome, clean.
- Menil's funder list (MacAgy): still awaiting your yes.

Say which faults to fix.

Next: stitch and compress, once the faults are fixed.
