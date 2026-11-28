# Publishing the app

- **The number lives in `APP_VERSION` (in the part under `app/` that holds it); the footer prints it with the date.**
  Bump it in the same breath as the change.
- **Her numbering:** whole number for a substantial change, decimal for a small one
  (adding link venues is a decimal: Berlin and Munich were 47.2). **One number per PUBLISH**, never per build.
  Bump it only when a publish is under way — never turn by turn while one
  issue is still being worked on (her ask).
- The file is `Cat_Watch.jsx` — no version number in the name, ever. It is edited in its parts under `app/`
  (`grep -rn` under `app/` finds a piece), then `node build/app_join.js` writes it; never edit it by hand.

**Building is code's job — `node build/build_app.js`**: transpiles, wraps it in
the committed shell (`build/shell_head.html`, `build/shell_tail.html`), proves it
parses, writes `build/dist/index.html`. `--shell-from <saved live page>` says
whether the committed shell still matches.

**To publish, run `node build/build_app.js` and follow what it prints** — nothing
else. **Built on `main` for publishing, it first files the venues waiting in the store into the code**
(docs/restructure.md, "The venue register"): it stops until the session has read the store's `venues/occasional` and the
venue review page's `names` into files (it prints the two reads), then files both into
`venues/register.js`, joins, runs the fact check, and rebuilds the venue review page
(`build/dist/venue_review.html`, published to her review page). When anything was filed it prints the
one-line FYI for her. `--local`: a build to check only, never published, files nothing. Built on `main` it prints the steps for her app; built on `claude/ledger-cloud` it sets the
retired test page's title instead. No read first. A session's first publish is refused as not
viewed — sometimes with a saved copy to read in full first (prove by script that it is an earlier build of this same
page) — then once more as resent unchanged; the next goes through. Later ones go straight through.

## What is live now

**Live: 61.1 in her app** — tapping the Closing Window count shows exactly the shows it counts (every other filter
cleared, underlined while on); the "6+ mos" chip loses "closing window" (`docs/app.md`, "The counts line").

**61** — assumed dates: a month or season with no day gets an assumed day the app runs on, the card
showing the venue's words and the day (`docs/app.md`, "Assumed dates").

**60.4** — every import (CSV, Links, Pages, Paste) labels its new shows' periods before the review
opens: one bar in the import pop-up from the first page read to the last label, her wording ("Labelling periods… 40 of
90 (batch 2)", and on a refusal "— Claude didn't answer batch 2 (upstream_error). Asking again in 13 seconds."), Cancel
drops the import, Label's line heads the review when not every show was labelled (`docs/periods.md`).

**60.3** — the import screen's "Probably not for you" pile is headed "Potential quarantines"; the
feature is named for that purpose in the code and docs, the topic label being its step (`docs/compression.md`).

**60.2** — Budapest's shop shelf and search (`docs/app.md`, "Shop addresses").

**60.1** — Budapest (`mfab`) as a swept venue, chip after KHM; a quarantined show its venue moves stays out (`docs/app.md` §4).

**60** (59.2's work, published as 60) — the main screen rebuilt as pieces and hooks (no change she sees), a picked Theme
chip's count, the venue scrubber for the Occ groups, "Still in the museum shop." after a Re-check (`docs/app.md`); one
letter fold, one price rule, the Uffizi searched under its Italian name, the Prado's and V&A's link rules
(`docs/restructure.md`, "The fixes after item 4"); after her test round, the Uffizi's shop taken out of its entry (it
sells no books). 

**59** — the venue register: every venue's facts in one home in the code, her names wherever a venue is
named, Find catalogue searching each venue by its full name, the `art-watch-` file names for saved ledgers and safety
copies; the venues waiting in her store filed into the code at the publish (`docs/restructure.md`).

**58** — Links, Pages and Paste send the whole import to Claude in one request; never the title reworded; a written-in
shop never asked on the shop screen (`docs/add_by_link.md`, `docs/compression.md`).

Every earlier version's decisions live in its area's doc (`docs/app.md`, `docs/add_by_link.md`, `docs/periods.md`,
`docs/catalogue_versions.md`, `docs/scraper.md`); the version-by-version text is in git (`git log -p --
docs/publishing.md`). The search work after 43 is on `parked`, her decision.
