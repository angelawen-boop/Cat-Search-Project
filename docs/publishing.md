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
viewed — sometimes with a saved copy to read in full first — then once more as resent unchanged;
the next goes through. Later ones go straight through.

## What is live now

**On `main`, unpublished: 59.2** — the main screen rebuilt as pieces and hooks (no change she sees), a picked Theme
chip's count, the venue scrubber for the Occ groups, "Still in the museum shop." after a Re-check (`docs/app.md`);
59.2: one letter fold, one price rule, the Uffizi searched under its Italian name, the Prado's and V&A's link rules
(`docs/restructure.md`, "The fixes after item 4").
On the restructure test page; her app only when she says.

**Live: 59 in her app**: the venue register: every venue's facts in one home in the code, her names wherever a venue
is named, Find catalogue searching each venue by its full name, the `art-watch-` file names for saved ledgers and
safety copies; the venues waiting in her store filed into the code at the publish (`docs/restructure.md`).

The versions before it, newest first — each one's decisions now live in its area's doc:
- **58** Links, Pages and Paste send the whole import to Claude in one request, with the sweep's own
opening, full current examples and rules (re-taken at every build); only pages refused or missing are asked again; a large
  import is split. Never the title reworded, one shared rule and check for every way in. A shop written into a venue's
  entry is never asked on the shop screen (Basel). Their tests and design: `docs/add_by_link.md`, `docs/compression.md`.
- **57.3** Louisiana's Past Exhibitions page refused with the Parallel fault line, its comma heading run on; Louisiana's
  and Moderna Museet's card names (`docs/add_by_link.md`, "Venue link rules").
- **57.2** the Links, Pages and Paste read asks the `complex` tier (her decision; `docs/app.md` §1, "Which model");
  Moderna Museet's spaced-year dates.
- **57.1, 57** Search selected words and the Art Watch name (`docs/app.md`, "What is built and signed off").
- **56.7 back to 53.9** periods (`docs/periods.md`); MoMA's In Stock rule, "detail," captions and space before a
  comma, link-venue names, Christie's press site, the Correr, Łazienki, Getty, the script-placeholder dates note, day
  or month first (`docs/add_by_link.md`, `docs/catalogue_versions.md`, `docs/scraper.md` §3); Paste and its
  description (`docs/add_by_link.md`, "Pasted pages"); Digital catalogue, Buy next and the Acquiring row
  (`docs/app.md`); the shop screen's Add (`docs/add_by_link.md`).
- **53.8 back to 46** (UI adjustments, gallery shops, the Add-by-link redesign, the shop finder, the STORE NOT READ
  banner, the Period merge, Pages, Berlin/Munich/Dresden/Städel by link, Buy next dragging, the cloud ledger at 46):
  their decisions are in CLAUDE.md §2.2 and §5.4 and the side docs.

The version-by-version text is in git (`git log -p -- docs/publishing.md`). The search work after 43 is on `parked`,
her decision.
