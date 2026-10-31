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

**Built, not yet in her app: 54** — Import → Paste; the own-site rule for Links, Pages and Paste; the Change card says "Link". On the Paste test page only (`docs/add_by_link.md`, "Pasted pages").

**Live: 53.11 in her app**: the Correr's archive — title after its section menu, capitals recased, spaced ordinals and comma-less month-first ranges read (DS-010, AL-089).

Before that 53.10: a link with no dates whose page holds a script's unfilled placeholder says "Dates cannot be seen — JS-rendering." (AL-088); Łazienki's title from its page title, Getty's collection pages from their heading (AL-086–087).

Before that 53.9: dates in numbers read day first or month first per venue (`DATE_ORDER`), else the order-unknown note; the Prado chip (DS-004, DS-006, DS-009, AL-085).

Older versions (53.8 and back to 50: UI adjustments, gallery shops, the Add-by-link redesign, the shop finder, the STORE NOT READ banner, the Period merge, Pages, Berlin/Munich/Dresden/Städel by link, Buy next dragging, the cloud ledger at 46): their decisions are in CLAUDE.md §2.2 and §5.4 and the side docs; the version-by-version text is in git (`git log -p -- docs/publishing.md`). The search work after 43 is on `parked`, her decision.

Reset to Seed always asks (it is unwired from her page, drawn only for tests); the counts line is Watched · Wanted · Owned · Closing Window (Yes-wanted catalogues closed 3–12 months ago, `inClosingWindow`), Tracked and Dismissed inside "Details"; "Reset cards" clears one card's lookup. Older numbers are in git.
