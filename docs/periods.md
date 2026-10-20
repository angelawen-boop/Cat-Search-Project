# Period — exhibitions in art-period order

Her trial, built on `claude/period-sort` and published to its own test page; never her app until she
says. Not open work beyond her review of the trial.

## Her design

- **A sort called Period**, after Recently edited. It shows only shows with a period at the trial
  venues, not dismissed, oldest art first, with a divider naming each period. A second tap reverses,
  as Date does.
- **Trial venues (her choice):** the Met, National Gallery UK, Orsay, Accademia (Venice), V&A, Tate
  Modern, Cincinnati — `PERIOD_VENUES`. Other venues' shows are not labelled or shown by Period.
- **Order:** the period list's order, then the year, then her venue order for a tie (two Monet shows).
- **A show spanning a long stretch** takes the midpoint of the stretch (her pick, to be judged on real
  shows).
- **Her centre-of-gravity rule** sets the list's order: Italy first through the Renaissance, then the
  North (Northern Renaissance, then Flemish, then Dutch), then France from Louis XIV to the 1940s, then
  America after the war. A region's periods sit after the dominant region's of the same time (Georgian
  and Victorian Britain, 19th-century America, American Modernism). The names and dates are the model's
  knowledge, not hers — she judges the result by eye.
- **Claude labels, code decides.** Claude picks one key from `PERIODS` and one whole year (negative for
  BC); `periodAnswers` drops anything else. Two ledger fields: `period`, `periodYear`.
- **When labels are written:** Label (footer, beside Reset search) fills every show at the trial venues
  with no period, dismissed included, 40 a question; a labelled show is never relabelled, and `editedAt`
  is untouched. On an import (sweep CSV, links, pages) each new show at a trial venue is labelled on its
  card ("Period: High Renaissance · c. 1510") while she reviews; a card applied before its label arrives
  is filled by Label. Nothing new in the CSV.
- **No hand corrections (her decision):** she never changes a label on a card. A wrong label is reported
  here and fixed in the labeller (`periodPrompt`, `PERIODS`), so it learns.
- **Nothing on the main cards** — the dividers only.

## Open — her review of the trial

Test page: https://claude.ai/artifact/JeoJyWxJbU9RApY9q4sVni ("Cat Watch Period Test"; its own
store, separate from her app). She Loads her file there, taps Label, then Period, and says what
looks out of place. Tests: `period_sort.js` (PS-), `period_render.js` (PR-), listed in the branch's
`scraper/fixtures/branch_tests.txt`.
