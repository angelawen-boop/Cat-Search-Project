# Publishing the app

- **The number lives in `APP_VERSION`; the footer prints it with the date.**
  Bump it in the same breath as the change.
- **Her numbering:** whole number for a substantial change (adding venues is
  one), decimal for a small one. **One number per PUBLISH**, never per build.
  Bump it only when a publish is under way — never turn by turn while one
  issue is still being worked on (her ask).
- The file is `Cat_Watch.jsx` — no version number in the name, ever.

**Building is code's job — `node build/build_app.js`**: transpiles, wraps it in
the committed shell (`build/shell_head.html`, `build/shell_tail.html`), proves it
parses, writes `build/dist/index.html`. `--shell-from <saved live page>` says
whether the committed shell still matches.

**To publish, run `node build/build_app.js` and follow what it prints** — nothing
else. Built on `main` it says how to get to `claude/ledger-cloud`; built there it
sets the test page's title and prints the publish steps.
No read first. A session's first publish is refused twice (not viewed, then
resent unchanged), by design; the third goes through. Later ones go straight through.

## What is live now

**Live: 44.4 · cloud 5 on the test page** — NGV (National Gallery of Victoria) as a link venue, last under Occasional, its two-digit years read (`shortYear`, AL-038); a Wayback Machine link files under the museum it copied (`siteUrlOf`, AL-037); pasted links lose tracking tags (`withoutTracking`, AL-036); Date shows ↓/↑; Date sort's second tap reverses the list, no Acquiring sort, Boston MFA (chip "Boston" under Occasional, dates read above the title, `OCC_LINK_READ`); before that 44: her venue names, chips and order (`VENUE_ORDER` sorts every venue list; the lookup still searches with the old names, `lookupName`, her decision), shorter Re-check lines with no "Nothing changed" anywhere (her wording, `recheckLinkedPage`, `recheckShop`), and Cancel during a Read (AL-035). The search work after 43 is on `parked`, her decision; her main app shows 39.2, its code on `main` current. **Only the cloud test page is published** (her decision): `main`'s code
keeps up with it, merged, so her main app never falls behind — it is not
republished each time. Reset to Seed always asks; the counts line is Watched · Wanted · Owned ·
Closing Window (Yes-wanted catalogues closed 3–12 months ago,
`inClosingWindow`), Tracked and Dismissed inside "Details"; footer "Reset to
Seed" and "Reset cards" (clears one card's lookup). Older numbers are in git.
