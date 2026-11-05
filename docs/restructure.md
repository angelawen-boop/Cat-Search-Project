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
- **2 — foundations and connections depend on nothing above them.** Three links run the wrong way, one
  item each, each rewired so the lower part no longer reaches up:
  - **2a** — the venue list uses the Links venue rules (`hasNoChip` → `ownChip`, `isOcc`, `LINK_VENUES`)
    to decide an occasional venue's chip.
  - **2b** — the ISBN check reads web-search results itself (`resultText`); it should take plain text.
  - **2c** — the web and Claude connections write to the lookup log (`tapeCall`); they should report
    each call and the log record it.
- **3 — the machinery out of the main screen, each to its feature.** The main screen holds working
  machinery, not only what she sees. Each moves to its feature's part, taking inputs and giving
  results, never touching the screen:
  - **3a** — the CSV import engine: matching sweep rows to her shows, merging a show swept twice,
    building and applying the cards, the "Import complete" counts.
  - **3b** — the job behind the Read button for Links, Pages and Paste.
  - **3c** — Save now and the cloud save.
  - **3d** — Reset.
- **4 — the UI (her word: the user interface).** What is left once 3a–3d are out — the screens,
  buttons, layout and design — split into its separate screens. The old layer 5b plan split by screen
  only and would have left the machinery inside a screen.

**The line between machinery and UI (her decision; the guiding principle from now on).** Machinery
decides what is true and what to say: rules, searches, imports, which case has happened and the
sentence for it (a sentence's wording sits with its feature). The UI takes what the machinery hands
it and puts it on screen: which pieces of information show, in what order, the layout, the buttons.
The UI asks and shows; the machinery never knows a screen exists. Never mix the two again.

The search redesign is not part of this work; when built it is mostly machinery with a thin UI.

**Not part of this work (her decision):** any fault in what the app does (e.g. the Getty "The page came
back empty." case). The restructure reorganizes and cleans up the code without changing what it does;
faults are tackled after it.

Items 1A–4 change code text (not what the app does), so the gates run with `--changes-allowed` and her checklist applies.

## The design of each item (the coordinator's, written before any code)

**Every item keeps what the app does exactly as it is** — same screens, same store contents, same
sentences, same results. Only where code sits and how it is wired changes. The side-by-side check
proves it (below).

- **1A.** The parts hold no copy of the scraper's rules. The SHARED piece becomes one line that tells
  the join to take the rules from the scraper's own files (`dates.js`, `compress_prompt.md`,
  `compress.js`, `boilerplate.js`, `bot_check.js`, `answer_check.js`, the scraper's VENUES) each time
  it joins; the builders move out of `sync_shared.js` into one module the join uses.
  `Cat_Watch.jsx` is the built page, so it still holds the text, as any built file does. **The one
  exception, said plainly:** the summary examples are not rules but pairs taken from the sweeps on disk,
  re-taken at every build; they stay stored in the part, refreshed by `sync_shared.js --examples`.
  `app_join.js --check` fails when the scraper's rules changed and the page was not joined again.
- **1B.** `connections/store.jsx` is the only door to the store: read one record, write one, delete one,
  list a collection. It owns the rules every caller repeats today: no store reached, the read-only copy
  (writes refused; the one-tab claim alone may write), and the unread rule (a failed read marks that
  part unread and its writes refuse). No other part asks for the store, holds it, or reads or writes a
  record itself. Each feature keeps its own sentences.
- **2a.** Everything the venue list does with occasional and link venues (the chip a venue files under,
  and what that needs) moves to the link-venue part; the venue list knows only its venues.
- **2b.** The ISBN check takes plain text; the lookup turns search results into text before asking it.
- **2c.** The web and Claude connections announce each call; the lookup log listens and records it.
  The connections never name the log.
- **The guard, from 2 on:** `build/structure_check.js`, run by the test runner and the gates, fails
  when a part names anything from a part above it (foundations, then connections, then saving and logs,
  then the features, then the screens), or when any part but the store's door reaches the store; from
  item 3 on, also when a part outside the screens uses anything of the screen's (state, drawing).
- **3a–3d.** Each piece of machinery leaves the main screen for its feature as functions that take
  what they need and hand back a result (and, for a long job, report progress as they go). They decide
  what happens and what is said; the screen calls them and shows what comes back. 3a → the CSV part
  (matching, folding, building the cards, applying them, the counts, recording the sweep); 3b → the
  Links/Pages/Paste parts (the Read job, its progress reports, the pending lists); 3c → the cloud part
  (Save now, the automatic save, the safety copies, the one-tab claim and heartbeat); 3d → the saving
  part (Reset and what it loads and writes).
- **4.** Written here once 3a–3d are done, from what is left: which screens become their own
  components, what each holds, what passes between them.

## The side-by-side check for items that change code

Run by the gates with `--changes-allowed`: a function's text may differ, nothing else may. Every table
and list the page defines, every screen and every record written to the store must be identical, old
and new, through: opening; loading her test ledger; the Import pop-up and each of its four tabs; the
venue and theme chips; the Period sort; a card opened; Save now (store and download); the cloud copies
drawer; reading her 15 Oct sweep file, accepting every card and applying (screen, store, the "Import
complete" line); Reset. The Read job for Links, Pages and Paste runs on the same inputs in both: a
page fetched live once per run through Parallel and her saved pages, Claude's reply the same fixed reply
to both — this proves old and new do the same with the same reply, not that the reading is good.
Each check was shown to fail on a deliberate one-word change. A mixed review (cards added, rejected,
never added and left undecided; field edits accepted and rejected; the partial apply) runs before the
all-accept one. Her test ledger has no periods, so every ninth row is given one for the Period sort.

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
sentence a feature shows her, in one place.

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

**The gates are proven:** `node build/restructure_gates_proof.js` (about fifteen minutes; `build/side_by_side_proof.js`, about eleven, proves each screen check) moves
every layer on a copy with the gates passing and the page identical, then makes eight breaks one at a
time (a piece deleted, doubled, changed by one character, moved to the wrong part, reordered, stray
text, an unplaced new piece, `Cat_Watch.jsx` edited by hand) — each must fail, and the moving script
must refuse a hand-edited page. Run it again after any change to the tools.

Claude's recorded replies were named as an input when this was planned; they are not needed for
layers 0–4f, because the gates prove every piece of the lookup is unchanged letter for letter.

## Her tests — three rounds (her decision)

The side-by-side check runs a stand-in browser with a fake store and a stand-in Claude; it cannot reach
her real store, her real Claude or a real Find catalogue. So she tests on a test page (never her app)
three times, each before the next stage starts:
1. **After 1A–2c** — they rewired every save to the store (1B) and how every web and Claude call is
   logged (2c). Her checklist, with one Find catalogue and one Save now then the cloud copies drawer.
2. **After 3a–3d** — the import engine, the Read job, Save and Reset moved.
3. **After 4** — the screen split.
The restructure test page: https://claude.ai/artifact/Ju1pKP84Gi3VNL1b2SULc5, built from `main` by
`node build/build_app.js --test-page` (title "Art Watch Restructure Test", footer "TEST PAGE — not your
app"), with her app's four capabilities. **Before every round** (her decision — a test page is a true test
only if it is set up as her app is): copy from her app's store into the test page's store her link venues
(`venues/occasional`), quarantine (`quarantine/rows`) and sweep log (`sweeps/venues`) — her store is only
read; then load her current ledger (decoded from her store's `ledger/live`, kept in the scratchpad, never
committed) in the stand-in browser with those records, and check the cards, venue names and chips before
she gets the link; then send her the link and the latest sweep file. A round's faults are fixed before the next stage starts. Her app is published only when she says.

## Her checklist (every test round)

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
> You are moving layer `<id>` of the Art Watch restructure, on branch `<branch>` (already checked out).
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
- `scraper/run_tests.js` runs the same check before any suite, and fails the run on it; it then runs
  `build/structure_check.js` (the structure guard) the same way, and the gates print it as a line.
- Since 1A, the part holding the `SHARED` piece holds a directive line and the summary examples only; the join
  (`build/shared_from_scraper.js`) writes the scraper's rules in, `app_join.js --check` fails when they changed,
  and `build/sync_shared.js` only re-takes the examples, then joins.
- Docs: `docs/publishing.md` (the version number lives in the part holding `APP_VERSION`), CLAUDE.md §1
  and §5.3/§5.4 wherever a session is told to edit `Cat_Watch.jsx` or between the SHARED markers.
- Branches holding their own copy of `Cat_Watch.jsx` (`parked`, `claude/theme-shelf`) are not merged
  across the restructure; their work is rebuilt on the parts when she wants it.

## Start here — the next session's job

Layers 0–5a are merged as a move only: every piece is in its feature part and `app/unsorted.jsx` is
gone, the page still the same file, character for character. Nothing has been reorganized yet.

**Next: the work items ("Work items now"), in order: 1A, 1B, 2a–2c, 3a–3d, 4.** Each changes code, so before
the first of them:
1. **First, widen the side-by-side check** as "The side-by-side check for items that change code"
   says, and prove each new check fails on a deliberate one-word change.
2. **Each item's design is in "The design of each item"**; item 4's is written there once 3a–3d are
   done. The coordinator decides; she is not asked.
3. **One item (for 4, one screen) per step**, each by a sub-agent on its own branch: gates with
   `--changes-allowed` (side by side must still be identical), then the test run. The coordinator
   re-runs both after every step.
4. **At each test round ("Her tests — three rounds"):** build from `main`, publish to the
   restructure test page (never her app), give her the checklist, wait for "same" or what differs.
   Publish to her app only when she says.

## Handover record — updated after every step

**Where we are:** layers 0–5a moved; the side-by-side check widened (merged); 1A, 1B, 2a–2c and the guard done. Her test round 1 is on the test page; waiting for her answer, then 3a.

**Work items done:** the wider check (Opus; proved on every screen, a mixed review added by the
coordinator). 1A (Sonnet): the parts hold no copy of the scraper's rules, the join writes them; only
the summary examples are stored; gates re-run by the coordinator, side by side identical; 22 of 22
suites (the old copy check folded into the join check).
1B (Opus): `connections/store.jsx` is the only door (read, write, delete, list; the unread, read-only
and claim rules inside it); no other part reaches the store; gates re-run, side by side identical; 22 of
22. One difference, accepted as closer to her one-copy rule: the read-only check now runs at each write,
so a save under way when another copy takes over stops before the switch instead of finishing (its
new parts are left unused in the store). The two check pages under `build/` still reach the store
themselves; they are not part of the app.
2a–2c and the guard (Sonnet): the venue list's occasional-venue ordering and chips moved to the link-venue
part; the ISBN check takes plain text; the connections announce calls and the log listens;
`build/structure_check.js` fails on any part naming a higher one or reaching the store (proved on the old
code and two deliberate breaks), run by the test runner and the gates. Gates re-run, side by side
identical; 22 of 22. Eight references between feature parts are listed, not failed (lookup → shop
finder, lookup and shop finder → link-venue entries, periods → venue order).

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
Opus at medium effort (her decision); the coordinator picks the model for each task by the judgement
it needs — Sonnet for contained, easily checked work, Opus where behaviour is subtle — never the highest
by default, and names it in the end report (her decision); her test only where the page changes
(page identical → nothing for her to see); placement is the coordinator's call, not hers.

**Open problems:** a sub-agent cannot start the watched test run — the test hook reads the
coordinator's transcript for the "Expected test run" line — so the coordinator runs gate 2 itself. The
hook often refuses the first try even after the line is written; write the line again and retry.

**Her reports:** none yet.

## When a session ends

When its memory is getting thin, or a layer is waiting on her: bring "Start here" and the handover
record up to date, commit, push, and tell her to start a new session and type **"Continue the
restructure."**
