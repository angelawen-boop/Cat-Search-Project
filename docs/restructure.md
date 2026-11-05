# The restructure — splitting the app into feature parts

**OPEN. A session sent here by "Continue the restructure." reads this whole file first, then does what
"Start here" says.** Her role: she tests the page and says what behaves differently or looks broken.
Everything else is the coordinating session's: the plan, the sub-agents' briefs, the checks, this file.

## Why (her decision)

The app was one file of about 9,400 lines. A session fixing a fault searched for the words in the
complaint, fixed that one line and never saw the rest of the feature, so the same fault came back in a
slight variation in later sessions (the Getty "The page came back empty." case: the "too short to read"
cut-off sat about 3,200 lines away from the link reader that used it). The app is being moved into
feature parts, each small enough for a session to read whole.

**The point is to reorganize, simplify and streamline, not merely to split (her decision).** Moving
unchanged code into separate files is the first step only; no layer counts as done until its promise
below is met in the code, not just in the file layout.

## Work items now (her decision) — in this order

Layers 0–5a moved code into parts with the page unchanged. A hostile review found that the move was
recorded as "done" while the promises the layers were sold on were not kept. These are the work:

- **1A — the date and summary rules: one real copy shared with the scraper.** Today
  `build/sync_shared.js` still copies them into `app/foundations/shared_with_scraper.jsx`. Promised in
  layer 1, quietly dropped.
- **1B — one way to use the page's store.** Today about eight parts (the logs, Links/Pages/Paste, link
  venues, the cloud saving inside the main screen) each fetch the store and read and write it
  themselves; `connections/store.jsx` only hands it out. Promised in layer 2, quietly dropped.
- **2 — foundations and connections depend on nothing above them.** Three links run the wrong way:
  the venue list uses the Links venue rules (`hasNoChip` → `ownChip`, `isOcc`, `LINK_VENUES`); the ISBN
  check reads web-search results (`resultText`); the web and Claude connections write to the lookup
  log (`tapeCall`). Each to be rewired so the lower part no longer reaches up.
- **3 — the feature rules out of the main screen, then the screen split.** The main screen holds
  feature work, not only what she sees: the CSV import engine (matching rows to shows, folding a show
  swept twice, building and applying the cards, the "Import complete" counts), the Links/Pages/Paste
  read flow, Save now and the cloud save, Reset. First each goes to its feature's part, taking inputs
  and giving results; then what is left — the list, cards, buttons, filters, sorting, the pop-ups —
  is split into screens. The old layer 5b plan split by screen only and would have left these rules
  inside a screen.
- **4 — the Getty "The page came back empty." case**, the fault that started the restructure.

Items 1A–4 change code, so the gates run with `--changes-allowed` and her checklist applies.

## How it works

- **`app/` holds the parts; they are what gets edited.** Each part is a list of pieces, each opened by a
  line `//@piece <name>`. A piece is one top-level statement (a function, a constant, the component)
  with the comments above it. Lines starting `//@ ` before the first piece are the part's own note.
- **`Cat_Watch.jsx` is written only by `node build/app_join.js`**, from the parts, in the order
  `app/pieces.json` records. The build, every test and every script still read `Cat_Watch.jsx`, so none
  of them changed. `node build/app_join.js --check` exits 1 if it was edited by hand.
- **The moving script, `node build/app_split.js`,** moves pieces between parts word for word. It joins in
  memory first and writes nothing unless the page comes out identical, character for character.
- **`docs/restructure/placement.json` is the list of where every piece goes** — the coordinator's call,
  by layer. A piece added since the list was made is placed by the session that finds it (add it to the
  list, in the part where it is used).
- **Order is kept.** Pieces come out of the join in their old order whatever part they sit in, so a
  constant that needs another defined first still gets it. A lower layer's piece may still call a higher
  one (hasNoChip → LINK_VENUES); that is the code as it is, not a placement fault.

## The layers, bottom up (her decision: never start from whatever fault is in front of you)

| Layer | What moves | Branch | State |
|---|---|---|---|
| 0 | Set-up: every piece into `app/unsorted.jsx`; build, tests and `sync_shared.js` wired to the parts; the docs that say "edit Cat_Watch.jsx" corrected | `claude/restructure-L0` | **moved only** — page identical, 23 of 23 suites |
| 1 | Foundations: version, venues, the shared date/summary block, text tools, ISBN, date display | `claude/restructure-L1` | **moved only** — page identical, 23 of 23 suites |
| 2 | Connections: the web service, Claude, the store | `claude/restructure-L2` | **moved only** — page identical, 23 of 23 suites |
| 3 | Saving and logs: file, seed, cloud ledger, lookup log, sweep log, quarantine | `claude/restructure-L3` | **moved only** — page identical, 23 of 23 suites |
| 4a | Ledger rules: closing window, tiers, Buy next | `claude/restructure-L4a` | **moved only** — page identical, 23 of 23 suites |
| 4b | Periods and themes | `claude/restructure-L4b` | **moved only** — page identical, 23 of 23 suites |
| 4c | CSV import and the review cards | `claude/restructure-L4c` | **moved only** — page identical, 23 of 23 suites |
| 4d | Links, Pages and Paste | `claude/restructure-L4d` | **moved only** — page identical, 23 of 23 suites |
| 4e | The shop finder | `claude/restructure-L4e` | **moved only** — page identical, 23 of 23 suites |
| 4f | The catalogue lookup | `claude/restructure-L4f` | **moved only** — page identical, 23 of 23 suites |
| 5a | Screens: theme, period scrubber, ledger card and the main screen moved whole into `app/screens/` | `claude/restructure-L5a` | **moved only** — page identical, 23 of 23 suites |
| 5b | The 2,300-line main screen split into its separate screens, one at a time — changes code, so her checklist applies | `claude/restructure-L5b` | not started |

Layers 0–5a only move pieces: the page stays the same file, character for character. Layer 5b rewrites
the main screen into separate components, so it changes code text; it is done one screen at a time.

**After the move (not part of this project until she says):** the "words" list per feature — every
sentence a feature shows her, in one place. (The Getty empty-page fix is now work item 4.)

## The gates — per layer, in this order

1. **Nothing lost or doubled** — `node build/restructure_gates.js --base main --layer <id>`: the parts join
   to `Cat_Watch.jsx` exactly; every piece at the base is there once, in order, letter for letter; every
   piece of this layer and the layers before sits in its placed part.
2. **Every test passes and the page draws** — `npm run test:app` through the watched runner (write her
   the "Expected test run" line first; docs/testing.md).
3. **Side by side** — run by the same gates script (`build/side_by_side.js`): the base and the new
   version, same clock, same inputs (her test ledger in `docs/ledger_2026-09-24/`, her 15 Oct sweep
   file), give the same top-level values (every table, every function's text) and the same screens
   (opening, after loading the ledger, the review after reading the sweep file).
4. **Her test** — only when the page is NOT identical (layer 5b). The gates script prints PAGE IDENTICAL
   when it is: then there is nothing to publish and nothing for her to see. When it is not: publish to a
   test page (never her app), give her the checklist below, and wait for "same" or what differs.

A layer that fails a gate is not merged. **The coordinator re-runs gates 1–3 itself** and reads the
sub-agent's change; a sub-agent's "passed" is never taken as the result.

**The gates are proven:** `node build/restructure_gates_proof.js` (about four minutes, no network) moves
every layer on a copy with the gates passing and the page identical, then makes eight breaks one at a
time (a piece deleted, doubled, changed by one character, moved to the wrong part, reordered, stray
text, an unplaced new piece, `Cat_Watch.jsx` edited by hand) — each must fail, and the moving script
must refuse a hand-edited page. Run it again after any change to the tools.

Claude's recorded replies were named as an input when this was planned; they are not needed for
layers 0–4f, because the gates prove every piece of the lookup is unchanged letter for letter.

## Her checklist (layer 5b and anything else that changes the page)

On the test page: load her ledger export; scroll the list and open a few cards; star and unstar one;
use the venue and theme chips and the Period sort; Import → CSV with a sweep file, look through the
review, Cancel; Import → Links with one link, Read, Cancel; Find catalogue on one card; Save now; open
the cloud copies drawer. She says "same", or what looks or behaves differently.

## Per layer — who does what

**The coordinating session:**
1. Creates the layer's branch from `main` (record it in `docs/branches.md`).
2. Starts ONE sub-agent with the brief below, filled in for the layer.
3. When it reports: re-runs `node build/restructure_gates.js --base main --layer <id>` and the test
   run itself; reads the diff (`git diff main --stat`, then the non-`app/` files in full).
4. If anything fails: sends the sub-agent back with the failure, or fixes it; gates again.
5. Page identical → merges into `main`, pushes, updates this file. Not identical → test page, her
   checklist, then merge and, when she says, publish (docs/publishing.md).
6. While a layer's branch is open, no other change is made to the app on `main`. A fault she reports
   then is written under "Open problems" below and fixed after the merge.

**The sub-agent's brief (copy, fill in the layer):**
> You are moving layer `<id>` of the Cat Watch restructure, on branch `<branch>` (already checked out).
> Read `docs/restructure.md` in full first. Run `node build/app_split.js --layer <id>`. If it lists
> pieces not in the placement list, add each to `docs/restructure/placement.json` in the part where it
> is used, and run the move again. Never edit `Cat_Watch.jsx` or retype code. Then run
> `node build/restructure_gates.js --base main --layer <id>` and, through the watched runner,
> `npm run test:app` (write the "Expected test run" line first; if the hook refuses it, say so and leave
it to the coordinator). Commit on the branch with a clear
> message. Report: the gates' last lines, the test run's result line, every file you changed outside
> `app/`, and anything you could not do. Do not merge, push to `main` or publish.
> (Layer 0 also: wire `build/build_app.js`, `scraper/run_tests.js` and `build/sync_shared.js` to the
> parts — see "Layer 0's wiring" — and correct every doc line that tells a session to edit
> `Cat_Watch.jsx`.)

## Layer 0's wiring

- `build/app_split.js --bootstrap` makes `app/`.
- `build/build_app.js` runs `node build/app_join.js --check` first and stops on a failure.
- `scraper/run_tests.js` runs the same check before any suite, and fails the run on it.
- `build/sync_shared.js` writes the shared block into the part that holds the `SHARED` piece (found by
  its opening marker under `app/`), then runs `node build/app_join.js`; `--check` compares that part.
- Docs: `docs/publishing.md` (the version number lives in the part holding `APP_VERSION`), CLAUDE.md §1
  and §5.3/§5.4 wherever a session is told to edit `Cat_Watch.jsx` or between the SHARED markers.
- Branches holding their own copy of `Cat_Watch.jsx` (`parked`, `claude/theme-shelf`) are not merged
  across the restructure; their work is rebuilt on the parts when she wants it.

## Start here — the next session's job

Layers 0–5a are merged as a move only: every piece is in its feature part and `app/unsorted.jsx` is
gone, the page still the same file, character for character. Nothing has been reorganized yet.

**Next: the work items ("Work items now"), 1A first, then 1B, 2, 3, 4.** Each changes code, so before
the first of them:
1. **First, widen the side-by-side check** (`build/side_by_side.js`) to every screen the work items
   touch, by clicking through them in the stand-in browser: the Import pop-up and each of its four tabs,
   a card opened, the venue and theme chips, the Period sort, the cloud copies drawer, Save. Prove each
   new screen check fails on a deliberate one-word change, as the existing ones were proved.
2. **Then write each item's design into this file before its code:** for item 3, which rules leave the
   main screen for which part, then which screens become their own components, what state each owns,
   what passes between them. The coordinator decides; she is not asked.
3. **One item (for item 3, one feature or screen) per step**, each by a sub-agent on its own branch: gates with
   `--changes-allowed` (side by side must still be identical), then the test run. The coordinator
   re-runs both after every step.
4. **When the branch is complete:** build, publish to a test page (never her app), give her the
   checklist below, wait for "same" or what differs. Merge only then; publish to her app when she says.

## Handover record — updated after every step

**Where we are:** layers 0–5a moved and merged, page identical; nothing reorganized yet. Next: the work items, 1A first (see "Work items now").

**Done and proven:** the moving script, the join, the gates and side-by-side check; the proof passes
(every layer moves with the page identical; all eight breaks caught; the moving script refuses a
hand-edited page). Side by side, the app against itself: 602 of 602 values and every screen identical.
Layer 0: gates 1 and 3 passed (re-run by the coordinator), PAGE IDENTICAL; `npm run test:app` 23 of 23;
`build_app.js` and `run_tests.js` each refuse a hand-edited `Cat_Watch.jsx` (both proven); `sync_shared.js`
write and `--check` leave the parts unchanged.
Layer 1: 63 pieces moved into six foundation parts; gates re-run by the coordinator, PAGE IDENTICAL;
`npm run test:app` 23 of 23; `sync_shared.js --check` passes against the new part.
Layer 2: 24 pieces into three connection parts; gates re-run by the coordinator, PAGE IDENTICAL; 23 of 23.
Sub-agents now start without asking within her permission (`.claude/hooks/confirm-subagent.js`).
Layer 3: 53 pieces into six saving and log parts; gates re-run by the coordinator, PAGE IDENTICAL; 23 of 23.
Layer 4a: 9 pieces into the ledger rules part; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 4b: 29 pieces into the periods part; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 4c: 14 pieces into the CSV and review parts; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 4d: 126 pieces into four Links/Pages/Paste parts; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 4e: 93 pieces into the museum and gallery shop-finder parts; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 4f: 158 pieces into six catalogue-lookup parts; gates re-run, PAGE IDENTICAL; 23 of 23.
Layer 5a: 11 screen pieces into four screen parts; `app/unsorted.jsx` gone; gates re-run, PAGE
IDENTICAL; 23 of 23. Layer 5 was split into 5a (the move) and 5b (the rewrite) so the move could be
proven identical on its own.

**Decisions:** bottom-up order (her decision); a sub-agent does each layer's moving and testing, the
coordinator sets up, re-checks and records (her decision); one sub-agent at a time, no higher than
Opus at medium effort (her decision); her test only where the page changes
(page identical → nothing for her to see); placement is the coordinator's call, not hers.

**Open problems:** a sub-agent cannot start the watched test run — the test hook reads the
coordinator's transcript for the "Expected test run" line — so the coordinator runs gate 2 itself. The
hook often refuses the first try even after the line is written; write the line again and retry.

**Her reports:** none yet.

## When a session ends

When its memory is getting thin, or a layer is waiting on her: bring "Start here" and the handover
record up to date, commit, push, and tell her to start a new session and type **"Continue the
restructure."**
