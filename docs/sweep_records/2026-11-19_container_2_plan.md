# Container run `run_2026-11-19_195713` — the plan

Agreed with her after going through every fault, checked live in the session.

## Put aside until next run

- **MAM:** site down — its server answers every page with "come back in an hour".
- **Accademia:** patchy connection — the first try drops, a second loads (she saw the same in her browser).
- **Louvre past shows:** its past-exhibitions pages answer with a server error, for us and for a plain fetch.

## Tentative conclusions

- **Menil:** Cloudflare bot protection, newly switched on — its robots.txt took on Cloudflare's managed settings
  between 6 and 19 Nov; refused at the first page, so pacing would not help. It may have to join the home sweep,
  headed or headless unknown.
- **Cincinnati:** blocked at the first page, cause unknown, probably bot protection; its robots.txt is unchanged. Same
  note as Menil.
- **V&A Punk to Pop:** the one-week closing date is the V&A's own placeholder — its hidden data says 21 Mar 2027, the
  visible page gives no close. Turn down the Change card at import.

## Fixes to make

1. **Louvre:** read the shows at their new address (`/en/what-s-on/exhibitions/`).
2. **Tate Modern:** sessions under a show (Relaxed Hours, Members Hours, Members Private View) are not shows.
3. **Wallace:** read the new grid of current shows.
4. **Brera:** stop at the when / hours / tickets block, however the label is written.
5. **Junk:** KHM's address and map line; Tate funder lines; the National Gallery's ticket line; the Uffizi's ticket
   price; Lévy Gorvy Dayan's opening hours.
6. **Rijksmuseum funder lines:** the credit sentence with the show's name in the middle (*Drawing!*, *Metamorphoses*,
   *Slavery*) — found on the final review, missed in the report.

## Process changes

- **QC instructions:** the unattended run still fetches nothing. When she is in the session, the session checks
  live — one page per question: robots.txt, a moved page, a site that is down.
- **This filing cabinet:** three short records per run in `docs/sweep_records/`; the guide points here.
- **Guide:** a note that Menil and Cincinnati might have to join the home sweep, headed or headless unknown.
- **Her home sweep** is not a monthly fixture: it comes when she decides (none this month, the second month running).
