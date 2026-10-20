# Period — exhibitions in art-period order

Her trial, built on `claude/period-sort` and published to its own test page; never her app until she
says. Not open work beyond her review of the trial.

## Her design

- **A sort called Period**, after Recently edited. It shows only shows with a period at the trial
  venues, not dismissed, oldest art first, with a divider naming each period. A second tap reverses,
  as Date does.
- **Trial venues (her choice):** the Met, National Gallery UK, Orsay, Accademia (Venice), V&A, Tate
  Modern, Cincinnati — `PERIOD_VENUES`. Other venues' shows are not labelled or shown by Period.
- **Order:** the period list's order, then the year of the art (never the exhibition's dates), then her
  venue order for a tie (two Monet shows).
- **A response or pairing show** (Hockney and Piero, Duccio | Caro): the older art's period and year,
  placed after the rest of that period (`periodResponse`).
- **Four groups after Contemporary, in her order:** Surveys (a show spanning three or more periods),
  Miscellaneous Historic (stragglers before 1900; her cut-off, the name is a placeholder), Miscellaneous
  Modern (from 1900), Non-Western Art (not ancient; in year order). Ancient art from anywhere stays in
  Antiquity. The movement names stay (her decision). Code, not Claude, splits the stragglers at 1900.
- **One artist, one group:** a show about one artist (`periodArtist`) takes the group most of that
  artist's shows were given; a tie goes to the earlier group. Worked out by the app, never written in
  (her decision: no hard-coded artist).
- **A show spanning a long stretch** takes the midpoint of the stretch (her pick, to be judged on real
  shows).
- **Her centre-of-gravity rule** sets the list's order: Italy first through the Renaissance, then the
  North (Northern Renaissance, then Flemish, then Dutch), then France from Louis XIV to the 1940s, then
  America after the war. A region's periods sit after the dominant region's of the same time (Georgian
  and Victorian Britain, 19th-century America, American Modernism). The names and dates are the model's
  knowledge, not hers — she judges the result by eye.
- **Claude labels, code decides.** Claude picks one key from `PERIODS`, one whole year (negative for
  BC), response or not, and the artist; `periodAnswers` drops anything else. Ledger fields: `period`,
  `periodYear`, `periodResponse`, `periodArtist`.
- **Every run is checked:** a failed batch is asked once more; her line after Label says all labelled,
  or how many were not and why; each run is one record in the lookup log (`node build/lookup_log.js`).
- **When labels are written:** Label (footer, beside Reset search) fills every show at the trial venues
  with no period, dismissed included, 40 a question; a labelled show is never relabelled, and `editedAt`
  is untouched. On an import (sweep CSV, links, pages) each new show at a trial venue is labelled on its
  card ("Period: High Renaissance · c. 1510") while she reviews; a card applied before its label arrives
  is filled by Label. Nothing new in the CSV.
- **No hand corrections (her decision):** she never changes a label on a card. A wrong label is reported
  here and fixed in the labeller (`periodPrompt`, `PERIODS`), so it learns.
- **Nothing on the main cards** — the dividers only.

## Open — her review of v1.1

v1 labelled well (her estimate 90–95% right) but three whole batches of 40 failed silently (120 shows,
the Met's *Siena* among them). v1.1 fixes the faults she found (Oberlin, Uklański → Surveys; Hindu
prints → Non-Western; Arbus, Lexington Camera Club → Miscellaneous Modern; one Sargent show apart from
the others; Hockney, Shonibare, Duccio | Caro → the older period). Orientalism in Realism and *Making
It Modern* in Symbolism and Art Nouveau (ceramics 1880s–1910s) are right — her decision to leave them.
Next: she re-Loads her file (no labels) and presses Label once; then a fake sweep CSV and her own links
and pages test the import labelling.


Test page: https://claude.ai/artifact/JeoJyWxJbU9RApY9q4sVni ("Cat Watch Period Test"; its own
store, separate from her app). She Loads her file there, taps Label, then Period, and says what
looks out of place. Tests: `period_sort.js` (PS-), `period_render.js` (PR-), listed in the branch's
`scraper/fixtures/branch_tests.txt`.
