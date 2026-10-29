# Publishing the app

- **The number lives in `APP_VERSION`; the footer prints it with the date.**
  Bump it in the same breath as the change.
- **Her numbering:** whole number for a substantial change, decimal for a small one
  (adding link venues is a decimal: Berlin and Munich were 47.2). **One number per PUBLISH**, never per build.
  Bump it only when a publish is under way — never turn by turn while one
  issue is still being worked on (her ask).
- The file is `Cat_Watch.jsx` — no version number in the name, ever.

**Building is code's job — `node build/build_app.js`**: transpiles, wraps it in
the committed shell (`build/shell_head.html`, `build/shell_tail.html`), proves it
parses, writes `build/dist/index.html`. `--shell-from <saved live page>` says
whether the committed shell still matches.

**To publish, run `node build/build_app.js` and follow what it prints** — nothing
else. Built on `main` it prints the steps for her app; built on `claude/ledger-cloud` it sets the
retired test page's title instead. No read first. A session's first publish is refused as not
viewed — sometimes with a saved copy to read in full first — then once more as resent unchanged;
the next goes through. Later ones go straight through.

## What is live now

**Live: 53.11 in her app**: the Correr's archive — title after its section menu, capitals recased, spaced ordinals and comma-less month-first ranges read (DS-010, AL-089). Before that 53.10: a link with no dates whose page holds a script's unfilled placeholder says "Dates cannot be seen — JS-rendering." (AL-088); Łazienki's title from its page title, Getty's collection pages from their heading, HTML codes in a heading decoded (AL-086–087). Before that 53.9: dates in numbers read day first or month first per venue (`DATE_ORDER`), else the order-unknown note; the Prado chip after KHM, cards "Prado Madrid" (DS-004, DS-006, DS-009, AL-085). Before that 53.8: Cini's entry only places the chip; Claude decides its venues as before. Before that 53.7: a link to a quarantined show says so (AL-080); Chantilly's chip after Jacquemart (AL-081); French "du … au …" dates, shared with the sweep (DS-008); a link with no year gets the sweep's note (AL-082); Moretti's place leaves its titles and its capitals description is read (AL-083); Cini's three venues under one chip after Capo (AL-084). Before that 53.6–53.3: Claude's one-line reason with each period label, lookup log only (PS-025); every question to Claude asked afresh (PR-037); the source rule for Period (her decision; PS-024); the shared date rules and a museum shop's front page taken as its shop (AL-077–079, DS-007, CE-001). Before that, 53.2–50 (UI adjustments, gallery shops, the Add-by-link redesign, the shop finder rebuilt, the STORE NOT READ banner, the Period merge, Pages, Berlin/Munich/Dresden/Städel by link, Buy next dragging, the cloud ledger at 46): what each did and its decisions are in CLAUDE.md §2.2 and §5.4 and the side docs; the version-by-version text is in git (`git log -p -- docs/publishing.md`). The search work after 43 is on `parked`, her decision. Reset to Seed always asks; the counts line is Watched · Wanted · Owned ·
Closing Window (Yes-wanted catalogues closed 3–12 months ago,
`inClosingWindow`), Tracked and Dismissed inside "Details"; footer "Reset to
Seed" and "Reset cards" (clears one card's lookup). Older numbers are in git.
