# Container run `run_2026-11-19_195713` — the close

## Fixed — in code for the next sweep (this run's rows stay as swept)

Each one is tested on the page read live in the session, saved under `docs/`: `sweep_nov_pages.js` (NV-01 to NV-18),
proven by planted faults.

- **Louvre:** shows read at their new address as well as the old one.
- **Tate Modern:** a session under a show (relaxed hours, members' hours, private view) is not a show. This is the
  rule you already chose for Tate Britain, by address, so any new kind of session is caught too.
- **Wallace:** the current shows read from the new grid; the header menu stays out.
- **Brera:** the info block ends the text when the label's line break sits inside the bold, as on its live pages.
- **Junk:**
  - KHM's address box and its "Further exhibitions" blurb
  - the National Gallery's ticket and organiser lines
  - the Uffizi's ticket prices
  - Lévy Gorvy Dayan's weekly hours
  - Tate's funders and commission credits
  - the Rijksmuseum's "Thanks to" funders

## Instructions changed

- **QC:** unattended runs fetch nothing; with you in the session it checks live, one page per question.
- **QC:** it reads last run's plan and close first, and reports on each carried item.
- **Filing cabinet:** `docs/sweep_records/`, three files per run; the guide points here.
- **The routine:** saves its report overnight with the sweep output, then files it and the other two itself once
  you are in the session.
- **Home sweep:** never nudged; it comes when you decide.
- **Guide:** Menil and Cincinnati might have to join the home sweep, headed or headless unknown.

## Still open

- **Next run checks:**
  - MAM, the Accademia and the Louvre's past pages are back
  - Menil and Cincinnati: still refused?
  - every fix above holds live
- **A test fails since this run was pushed:** one Add-by-link check compares the page's summary examples with the
  sweep's newest text, which this run changed. A rebuild of the page clears it; left for the next app change.
- **KHM's current listing** has read nothing since October. The running shows this run did find came from the
  upcoming page; whether any current show is missed is unknown. Not investigated.
