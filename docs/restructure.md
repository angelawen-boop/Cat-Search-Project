# The restructure — splitting the app into feature parts

**OPEN. A session sent here by "Continue the restructure." reads this whole file first, then does what
"Start here" says.** Her role: she tests the page and says what behaves differently or looks broken.
Everything else is the coordinating session's: the plan, the sub-agents' briefs, the checks, this file.

## Why (her decision)

The app was one file of about 9,400 lines. A session fixing a fault searched for the words in the
complaint, fixed that one line and never saw the rest of the feature, so the same fault came back in a
slight variation (the Getty "The page came back empty." case: the "too short to read" cut-off sat about
3,200 lines from the link reader that used it). So the app is moved into feature parts, each small enough
for a session to read whole.

**The point is to reorganize, simplify and streamline, not merely to split (her decision).** Moving
unchanged code is the first step only; no item counts as done until its promise is met in the code, not
just in the file layout. A hostile review found layers 0–5a recorded as "done" while those promises were
not kept; the work items below are the answer. **Lesson: a work item is checked against its own list of
faults, one by one, never by gates and tests alone.**

**Not part of this work (her decision):** any fault in what the app does (e.g. the Getty case) — faults
are tackled after it. The search redesign is not part of it either. **Manual import (her name):** Links,
Pages and Paste together — never "link venues" or "add by link" for the group in anything new.

**The line between machinery and UI (her decision; the guiding principle from now on).** Machinery
decides what is true and what to say: rules, searches, imports, which case has happened and the
sentence for it (a sentence's wording sits with its feature). The UI takes what the machinery hands
it and puts it on screen: which pieces show, in what order, the layout, the buttons. The UI asks and
shows; the machinery never knows a screen exists. Never mix the two again.

## The work items (her decision) — in this order

**Done** (each gated, side by side identical, re-run by the coordinator; the full record is in git):
- **Layers 0–5a** — every piece moved into its part, the page identical character for character
  (branches `claude/restructure-L0` … `-L5a`). The old layer 5b (split the main screen by screen) is
  replaced by item 5.
- **1A** — the parts hold no copy of the scraper's rules: the SHARED part is a directive line, and the
  join (`build/shared_from_scraper.js`) writes the rules in from `dates.js`, `compress_prompt.md`,
  `compress.js`, `boilerplate.js`, `bot_check.js`, `answer_check.js` and the venue register each time;
  `app_join.js --check` fails when they changed. **The one exception, said plainly:** the summary
  examples are pairs taken from the sweeps on disk, stored in the part, re-taken by `sync_shared.js --examples`.
- **1B** — `connections/store.jsx` is the only door to the store (read, write, delete, list), holding the
  no-store, read-only and unread rules. Accepted difference, closer to her one-copy rule: the read-only
  check runs at each write, so a save under way when another copy takes over stops before the switch.
  The two check pages under `build/` still reach the store themselves; they are not the app.
- **2a–2c and the guard** — the venue list's occasional-venue chips moved to the link-venue part; the
  ISBN check takes plain text; the web and Claude connections announce each call and the lookup log
  listens. `build/structure_check.js` (run by the test runner and the gates) fails when a part names a
  part above it (foundations, connections, saving and logs, features, screens), when any part but the
  store's door reaches the store, or when a part outside the screens holds a React hook or JSX. Eight
  references between feature parts are listed, not failed (lookup → shop finder, lookup and shop finder
  → link-venue entries, periods → venue order).
- **3a–3d** — the machinery left the main screen as functions that take inputs and hand back results and
  sentences: 3a the CSV import engine (the CSV and review parts); 3b the Read job for manual import
  (`import/read_job.jsx`); 3c Save now, the automatic save, the safety copies, the one-tab claim and the
  Cloud Saves drawer (`saving/cloud_jobs.jsx`); 3d Reset and Load (the saving parts). **Noted, not fixed
  (not part of this work):** the import's quarantine write runs inside a React state updater; the Save
  panel's "File name:" preview is worked out on the screen without the save's trim and 80-character cut.
- **4A — venue facts** (merged; her test passed — see the handover record).

**Still to do — 4: one copy of every fact (her decision).** An audit found facts kept in more than one
place (code, store, scraper, her ledger), some with a "which copy wins" rule papering over the clash. Each
is brought to one home and the other copy deleted, no precedence rule left behind. One round each, in this
order, each its own branch, side-by-side check and test run; her test after 4A and after 4E (her screens or
data change). Every one passes before 5 starts. The evidence, with numbers and examples:
`docs/restructure/duplicates.md` — re-check each finding against the code and her store first.
- **4B — saving.** The store's error sentences and safety-copy labels written two or three times; the
  store record names typed into test and check scripts.
- **4C — the web-address clean-up** retyped 17 times becomes one shared piece.
- **4D — the sweep import.** The marker sentence (nine copies); the column list (six copies, one tool
  writing seven columns); the three sweep-file readers; the "Topic:" note; the three ways of standardising
  web addresses; the sweep-log merge written twice; the unused last-import date in her ledger (stays — her
  ledger is never changed); show IDs made by two rules and the three accent rules, checked against her real
  quarantine; the scraper's month spelling lists; the test with hand-typed show IDs.
- **4E — catalogue lookup.** The seller rule written three times; its repeated instructions to Claude; the
  four ISBN patterns; the publisher-splitting pattern retyped; the "English edition, published later"
  sentence; the publisher held twice in her ledger (both copies stay, the seven mangled publishers
  included); the two price rules, checked on the four shops' live pages (Basel, Beyeler, Louisiana,
  Moderna Museet), old rule beside new.
- **4F — manual import and the shop finder.** Their repeated instructions to Claude; the "couldn't find
  the show's title" sentence written twice; the shop-page reading written twice. Also two venues whose
  register shop section differs from the shop check's right answer — Thyssen (the register holds the
  collection guides once confirmed; her answer is the exhibitions section) and Acquavella (every product;
  the check's answer is its "Publications" list, the same books today): settle each in the register.
- **Stays (her decision):** the quarantine kept in both the store and her saved file.
- **Her ledger is never changed (her decision) — banned outright, not "with her yes".** No item may
  alter, correct, migrate, add or remove anything in her ledger rows or saved file, and no session asks
  her to. Where a duplicate sits inside her ledger, it stays.

**Then 5 — the UI (her word: the user interface):** what is left once 4 is done, split into its separate
screens; its design written here first (which screens become components, what each holds, what passes
between them). Items 1A–5 change code text, not what the app does: gates run with `--changes-allowed`.
**After it (not part of it until she says):** the "words" list — every sentence a feature shows her, in one place.

## 5 — the main screen: the cutting plan

**What is there now.** The main screen is one block (`app/screens/app.jsx`, the piece `App`). It holds about a
hundred things the page remembers, sixty functions, fourteen effects and a 700-line layout. Three kinds of
thing are mixed in it: **rules** (what a mark does to a card, how the list is filtered and ordered, what to
say after a lookup or a labelling, how a shop answer changes a venue's record), **memory** (what the page
remembers while she works) and **layout**. The cut follows a cross-reference of every remembered thing
against every section and function that reads or writes it (rebuild it before each stage; the numbers move).

**The order, and why.** Rules out first, then layout, then memory. Each stage shrinks what the next has to
reason about. The first two are proved by the side-by-side check with nothing subtle in them; only the
third touches the order things happen in, so it comes last, on the smallest block.

**The rules of the cut (what "not cutting it wrong" means here).**
- **A boundary is where the cross-reference shows one.** A thing read and written inside one section moves
  into it. A thing two sections share stays with the screen or in the one hook both use. Never the reverse.
- **No shared global memory** (no React context, no store object every piece reaches into). The screen stays
  the one place that says what is called in what order and who is handed what; everything is passed by name.
  A hidden shared memory is the same tangle made invisible.
- **A piece never gets another piece's raw setter.** It gets a named action ("clear the filters", "a ledger
  was loaded"). If a piece needs three or more of another's setters, the two belong together — merge, do not
  wire.
- **Import, review and the shop screen are one session**, with one memory; they are three layouts over it.
- **The signs of a wrong cut — stop and park it for her, do not push through:** a layout piece taking more
  than about fifteen things; two hooks that each need the other; a rule that has to know a screen exists;
  the opening reads changing order.
- **Wording stays with its feature**: a sentence shown after a job is made by the job, in its feature part.

### Stage A — the rules leave the screen (plain functions in feature parts, no React)

- **A1 — card marks** → `app/ledger/marks.jsx`. Dismiss, restore, watch, acquiring, Buy next on and off and
  its ranking, the catalogue pick, the digital link, "keep this period": each `(rows, id, …) → rows`. The
  screen keeps `commit(mark(rows,id))`, the undo timer and nothing else. *Sonnet, medium: lift and call;
  the side-by-side check marks cards and compares the store.*
- **A2 — the list** → `app/ledger/list_view.jsx`. The body of `view` (filters, search, the three sorts, the
  pinned just-imported cards, Buy next order), `counts`, `byArtist`, the scrubber's groups: `(rows, filters,
  …) → list`. The filters become ONE plain object with one "all clear" value (today the clear is typed out
  twice, at Clear and after an import). *Sonnet, medium: the body moves whole, the list must come out the
  same in every sort and chip the check walks.*
- **A3 — what a job found and what to say** *(Opus, medium: judgement about where a job ends and the
  screen begins)*:
  - Find catalogue, Search again, Re-check shop → the lookup part: one function that takes the lookup's
    answer and hands back the row to land, the line for the card, the banner sentence, the diagnostic.
  - Label, Relabel, Label import cards → the periods part, as jobs shaped like the Read job (inputs in;
    rows or labels, sentence, diagnostic out; progress reported through a callback).
  - A link venue's shop search worked out at its first lookup (`fillShopSearch`, which fetches a page from
    inside the screen) → the shop finder part: venue record in, venue record out.
  - The shop screen's answers (confirm, English, no shop, her own link, look again) → the link-venue part:
    `(venues, id, …) → venues`.
- **After A**, every function left in the screen does one thing: call a job, put what it hands back into
  memory.

### Stage B — the layout becomes pieces (memory stays where it is)

Each section of the 700-line layout becomes its own component in `app/screens/`, taking what it shows and
the named actions it calls; the look-and-feel values (colours, the button and chip styles) travel as one
`ui` object, as the card already takes them. *Sonnet, medium, two runs: every screen must draw identically.*
- **Run B1:** `header.jsx` (the toolbar, the Save panel, the status lines, the banners and the diagnostic
  box, the sweep-log line and drawer, the search row) · `chips.jsx` · `card_list.jsx` (the empty state, the
  period dividers, the cards) · `drawers.jsx` (the tools row, Cloud Saves, the quarantine list, Reset cards)
  · `floating.jsx` (search-selected-words button, top and bottom, the undo bar, the confirm box, the footer).
- **Run B2:** `import_popup.jsx` · `review_panel.jsx` (with the proposal card as a component of its own) ·
  `shop_screen.jsx`.
- **Memory that moves in this stage:** only what the cross-reference shows is read and written inside one
  section and nowhere else (today: whether the diagnostic box is open and its "copied" mark, whether the
  sweep-log drawer is open, which review bands and venues are open). Everything else waits for stage C.

### Stage C — the memory, grouped by what it is the memory of (hooks in `app/screens/`)

One hook per run, in this order — the cleanest first, the one that touches all the others last.
*Opus, medium, every run: this is where the order of effects and of the opening reads can change.*
- **C1 `use_filters`** — the filter and sort object from A2, clear, pick-a-sort, pin-the-touched; hands
  back the list. Read by the chips and the card list; told "an import was applied" and "a ledger was loaded".
- **C2 `use_list_drawing`** (how much of the list is drawn, the jumps to a period and to the bottom) and
  **`use_buy_next_drag`** (the drag gesture). Both self-contained.
- **C3 `use_sweep_log`** — the freshness record and its "why it could not be read" line; small.
- **C4 `use_ledger_document`** — the ledger itself: rows, the last-import stamp, the quarantine, changed-
  since-saved; Save now, the automatic save, read-only, the heartbeat, the safety copies, Load, Reset, the
  cloud copy's opening. Hands out `commit`, `load`, `latest()`, `readOnlyStop()`, and tells the screen
  "a ledger was loaded".
- **C5 `use_card_actions`** — the marks (A1) and the jobs on one card (A3): which card is busy, its progress
  line, what the last job said, the undo.
- **C6 `use_link_venues`** — the manual-import venues held and saved, the shop answers; used by the import
  session AND by the lookup, which is why it is not inside C7.
- **C7 `use_import_session`** — the pop-up's inputs, the Read, the proposals and decisions, the shop
  screen's turn, Apply and Cancel. It is handed, by name: commit, add-to-quarantine, record-the-sweep,
  and "applied — these cards changed"; it never clears a filter itself.
- **What stays in the screen:** the theme and the `ui` object, the confirm box, the one "a job is running"
  flag and its progress line (labelling, lookups and the Read share it by design: one job at a time), the
  error and diagnostic lines, search-selected-words, and the layout order. Target: the screen under about
  250 lines, no file in `app/screens/` over about 400.
- **The opening.** Today one effect starts every read at once, in this order: the sweep log, the
  quarantine, the cloud copy (another copy editing? → the venue waiting-room tidy → the read), the link
  venues, the pending links, pages and pastes. Each hook takes its own reads; the hooks are called in that
  same order, and the proof below compares the order of the store's reads, old and new.

### The proof, per run

The gates as for every item (`--changes-allowed`), plus: `build/structure_check.js`; for stage A, the
side-by-side check's marks, sorts and chips must give the same lists and store records; for stage B, every
screen it draws identical; for stage C, also the stand-in store's sequence of reads and writes from opening
to the first save identical, old and new (add it to the side-by-side check before C1 if it is not there).
The coordinator re-runs every gate and reads the diff; after each run it rebuilds the cross-reference and
checks the signs of a wrong cut above. Her test round 3 follows C7.

## 4A — the venue register (merged)

**Her decisions (made; the code-or-store question is closed):**
- **The code is the one home for every venue's facts** (swept and manual import alike): `venues/register.js`,
  data only, one entry per venue, every field in the same layout; the order is her venue order. Nothing
  about a venue is written anywhere else; `build/fact_check.js` fails if it is, and fails a sentence, list
  or rule written twice. No session decides where a venue fact goes. Field by field: `docs/add_by_link.md`,
  "The design".
- **The store is a waiting room, never a second copy.** What the app learns at a manual import (a new
  venue, its shop, her confirmation or rename) goes to `venues/occasional` and works at once, shown over
  the register's entry (her latest word), until the next publish, whatever it is for, files it in.
- **Every "which copy wins" rule deleted** — where copies clashed, her name won (her rejected names had shown on the review
  screens and quarantine list).
- **The app tidies the waiting room itself** — no session writes, no yes from her: when a published version
  opens, a waiting entry the register now holds exactly is cleared; one that differs stays for the next publish.
- **The FYI:** a publish that files venues tells her in one line that her latest venue store info is now in
  the code too. Nothing else is asked or said.
- **The first move, once (her yes):** a full backup of her store (`docs/store_backup_2026-11-06/`), then
  every leftover venue record cleared in one go after her first real publish.
- **Conflicting or ambiguous facts go to her on one page** to pick — never written out in chat: the
  permanent venue review page, https://claude.ai/artifact/RmSC86pu1rkBxsZDtfdA1J (every venue's names,
  city, a box for hers — store `names/<id>` — and "To choose", store `picks/<key>`), which she reopens any
  time. Its list is rebuilt from the register at each publish and her entries filed in then.

**What she sees change:** her chosen name wherever a venue is named (chips keep their labels); her picks; a
manual venue's city passed on; Find catalogue searching every venue by its full name. Nothing in her ledger.

**The filing at publish is wired into the build** (`build_app.js` on `main`; `docs/publishing.md`): it stops
without the store's waiting room and the review page's names, files both into the register
(`build/file_venues.js`), joins, runs the fact check and rebuilds the review page (VR-030–VR-032).

## The checks — every item

**The side-by-side check** (`build/side_by_side.js`, run by the gates with `--changes-allowed`): a
function's text may differ, nothing else may. Every table and list the page defines, every screen and
every record written to the store must be identical, old and new, through: opening; loading her test
ledger; the Import pop-up and each of its four tabs; the venue and theme chips; the Period sort; a card
opened; Save now (store and download); the cloud copies drawer; reading her 15 Oct sweep file, a mixed
review (added, rejected, never added, undecided; field edits accepted and rejected; the partial apply)
then accepting every card and applying; Reset. The Read job runs on the same inputs in both — a page
fetched live once per run through Parallel and her saved pages, the same fixed Claude reply to both — so
it proves old and new do the same, not that the reading is good. Each check was shown to fail on a
one-word change. Her test ledger has no periods, so every ninth row is given one.

**The gates, in order:**
1. **Nothing lost or doubled** — `node build/restructure_gates.js --base main --layer <id>`: the parts
   join to `Cat_Watch.jsx` exactly; every piece at the base is there once, in order; every piece sits in
   its placed part.
2. **Every test passes and the page draws** — `npm run test:app` through the watched runner (write her
   the "Expected test run" line first; `docs/testing.md`).
3. **Side by side** — run by the same gates script, on her test ledger (`docs/ledger_2026-09-24/`) and
   her 15 Oct sweep file.
4. **Her test** — only when the page is not identical: a test page, her checklist, "same" or what differs.

A failed gate is never merged. **The coordinator re-runs gates 1–3 itself** and reads the change; a
sub-agent's "passed" is never the result. The gates are proven by `node build/restructure_gates_proof.js`
(about fifteen minutes) and `build/side_by_side_proof.js` (about eleven): every layer moved on a copy
with the page identical, and eight deliberate breaks each caught. Run them again after any change to the tools.

## Her tests (her decision)

The side-by-side check runs a stand-in browser, store and Claude; it cannot reach her real store, her
Claude or a real Find catalogue. So she tests on the restructure test page (never her app),
https://claude.ai/artifact/Ju1pKP84Gi3VNL1b2SULc5, built by `node build/build_app.js --test-page` (title
"Art Watch Restructure Test", footer "TEST PAGE — not your app", her app's four capabilities). Rounds:
1 after 1A–2c and 2 after 3a–3d (both passed), after 4A (passed) and 4E, and 3 after 5. A round's faults
are fixed before the next stage. Her app is published only when she says.

**Before every round (her decision — a test is true only if the page is set up as her app is):** copy her
app's `venues/occasional`, `quarantine/rows` and `sweeps/venues` into the test page's store (her store is
only read); load her current ledger (decoded from her store's `ledger/live`, kept in the scratchpad, never
committed) in the stand-in browser with those records, and check the cards, venue names and chips; then
send her the link and the latest sweep file.

**Her checklist:** load her ledger export; scroll and open a few cards; star and unstar one; the venue and
theme chips and the Period sort; Import → CSV with a sweep file, look through the review, Cancel; Import →
Links with one link, Read, Cancel; Pages with one saved page, Read, Cancel; Paste with one link and its
text, Read, Cancel; Find catalogue on one card; Save now; open the cloud copies drawer. She says "same", or
what differs. Her judgement on round 2: a round only proves the cut-up-and-rejoined code behaves the same.

## How the parts work

- **`app/` holds the parts; they are what gets edited.** Each part is a list of pieces, each opened by
  `//@piece <name>`; a piece is one top-level statement with the comments above it. `//@ ` lines before
  the first piece are the part's note.
- **`Cat_Watch.jsx` is written only by `node build/app_join.js`**, in the order `app/pieces.json`
  records; build, tests and scripts still read it. `app_join.js --check` exits 1 if it was edited by hand;
  `build_app.js` and `scraper/run_tests.js` run that check first and stop on it.
- **`node build/app_split.js`** moves pieces between parts word for word, writing nothing unless the page
  comes out identical. **`docs/restructure/placement.json`** says where every piece goes — the
  coordinator's call; a new piece is placed by the session that finds it, in the part where it is used.
- **Order is kept**: pieces join in their old order whatever part they sit in. Branches holding their own `Cat_Watch.jsx` (`parked`, `claude/theme-shelf`) are not merged across the
  restructure; their work is rebuilt on the parts when she wants it.

## Who does what (her decisions)

Bottom-up order. A sub-agent does each layer's or item's moving and testing; the coordinator sets up, re-checks and
records. One sub-agent at a time, no higher than Opus at medium effort; the coordinator picks the model by
the judgement the task needs — Sonnet for contained, easily checked work, Opus where behaviour is subtle —
never the highest by default, and names it in the end report. Placement is the coordinator's call, not hers.

**The coordinator:** (1) creates the item's branch from `main` and records it in `docs/branches.md`;
(2) starts ONE sub-agent with the brief below; (3) re-runs the gates and the test run itself and reads the
diff (`git diff main --stat`, then the non-`app/` files in full); (4) on a failure sends it back or fixes
it, then gates again; (5) merges into `main`, pushes, updates this file — or, when the page changed, the
test page and her checklist first; (6) while an item's branch is open, no other app change goes on `main`;
a fault she reports then goes under "Open problems" and is fixed after the merge.

**Its own lessons (keep):** name both the model and the effort (low or medium) on every sub-agent, or her
permission does not cover it and it waits for her; check the branch is checked out before a sub-agent
starts (a session restart puts the checkout back on `main`); when a list is re-sorted or restated, match
every item across before sending it to her.

**The sub-agent's brief (copy, fill in the item):**
> You are doing item `<id>` of the Art Watch restructure, on branch `<branch>` (already checked out).
> Read `docs/restructure.md` in full first. [The item's design, written here first.] Never edit
> `Cat_Watch.jsx` or retype code. Then run `node build/restructure_gates.js --base main --layer <id>
> --changes-allowed` and, through the watched runner, `npm run test:app` (write the "Expected test run"
> line first; if the hook refuses it, say so and leave it to the coordinator). Commit on the branch with a
> clear message. Report: the gates' last lines, the test run's result line, every file you changed outside
> `app/`, and anything you could not do. Do not merge, push to `main` or publish.

## This run — her decisions (made while she is away; a session picking up cold follows them)

- **One coordinating session, sub-agents one at a time.** Model by the judgement the job needs, never the
  highest by default: Sonnet at medium for contained work the side-by-side check proves; Opus at medium for
  the scraper side, the keys her stored data depends on, and the main screen's tangled pieces; nothing at
  low effort, nothing on Haiku, never Fable. Small jobs (a few lines) the coordinator does itself.
- **The mechanical duplicates go in two rounds, not five:** app side (4B, 4C and the same-text items of 4E
  and 4F), then scraper side (4D's same-text items). An item that changes behaviour keeps its own round.
- **Nothing is parked for being risky (her decision).** Three items she ruled "do":
  - **The price rules (4E):** the lookup's whole-shop search recognises the shop finder's currencies; checked
    live on the four shops, old rule beside new, before merging. An expansion, not a lookup redesign.
  - **Thyssen and Acquavella (4F):** the register takes the shop check's right answers (Thyssen its
    exhibitions section, Acquavella its Publications list). A link she adds by hand is filed into the
    register the same way, so this is the same kind of fact.
  - **Show IDs, accent rules, web-address tidying (4D):** done, proved by (1) an exact comparison — every
    show in her ledger, her quarantine and every sweep file on disk, its matching key under the old rules
    and the new, every difference listed; (2) her whole ledger and her sweep files re-imported, old code
    beside new: no new cards, the same changes. Read-only on a copy of her ledger. The coordinator builds
    the comparison first, against the old code; a sub-agent makes the change. Not merged while the list is
    not empty. A label already in her ledger stays; the one rule is for shows from now on.
- **Surprises are parked, never chased:** anything odd, or code whose purpose cannot be told, goes on the
  "Parked for her" list below and the work carries on.
- **Publishing:** 59 = the venue work, published unattended once its three checks pass (her yes given).
  60 = the whole restructure, when she says. Her keyed Parallel: yes given.
- **Her updates:** a short line at each quarter of a step and at each step's end, a time estimate where there is one.
- **Handing over to a new session:** only once the main screen's cutting plan is written here in full, and
  only if the chat is heavy; then for the main-screen work alone. The plan says, per piece: what it holds,
  what it owns of the page's memory, what passes in and out, why the cut is there, and its model.
- **The steps of this run:** 1 close 4A and publish 59 · 2 app-side duplicates · 3 scraper-side duplicates ·
  4 the price rule and the two venues · 5 show IDs, accents, addresses · 6 the cutting plan · then the main
  screen, her test round, 60.

**Parked for her:**
- One Italian venue's full name is the English one (her choice on the review page), so its Italian-language
  catalogue search now reads English name + Italian words. Every other non-English venue searches under its
  own-language name.
- Four live proof pages read differently from the signed-off list, identically under the old code and the
  new (two Prado passages end elsewhere, one Getty page now gives dates, Louisiana's page is the known
  Parallel fault): the sites or Parallel's replies changed, not the reader. The list was not updated.

### Round "scraper side" — design (4D's same-text items)

Branch `claude/restructure-4-scraper`. Facts the sweep's tools and the app each hold their own copy of,
brought to one home in the scraper's files and written into the app by the join (as the date and summary
rules already are: `build/shared_from_scraper.js`). Nothing a sweep writes and nothing the app reads may
change.
- **The marker sentence** ("Marker row, not an exhibition."): one constant; `sweep_prototype.js`, `qc.js`,
  `routine_window.js`, `sweep_diff.js` and the app's `isMarkerRow` name it.
- **The column list:** one list; `proFormaCsv` in the app and the writers in `sweep_prototype.js`,
  `compress.js`, `stitch.js`, `reread_kept.js` name it. `sweep_fetch.js` and `probe_morgan.js` are
  superseded and kept as the record (`docs/sweep_operation.md`): not touched.
- **The sweep-file readers:** `compress.parseCsv` and `show_tags.readCsv` become one where they read the
  same way; the app's `csvParse` joins them only if all three give the same rows for every sweep file on
  disk — otherwise it stays and the difference is listed for the coordinator.
- **The "Topic:" note:** written by `compress.js`, read by the app's `topicOf`: one pattern, shared.
- **The sweep-log merge:** the app's and `scraper/sweep_log.js`'s become one function, shared.
- **The month spellings:** `MONTHS`, `MONTH_PATTERN` and `GERMAN_DAY_DOT` built from one list in `dates.js`.
- **`build/blocks_check.js`'s hand-typed show IDs:** read from the data it tests, or made by the app's rule.
- **Not in this round:** show IDs, accent rules, web-address tidying (their own round, with its proof);
  the unused last-import date in her ledger (stays).
- **The proof:** the gates; the scraper's test group and the app's; every sweep CSV on disk read by old
  reader and new gives the same rows; the scraper re-reading its kept pages, old code beside new, changes
  no field (`scraper/reread_kept.js`, the eight venues with kept pages); every date string in the date
  tests reads the same; and a run file written by the old writer and the new from the same rows is the
  same file, byte for byte.

### Round "app side" — done

Merged. Every repeated sentence, prompt line and pattern in the app's parts is written once
(`build/fact_check.js` lists none and fails on a new one); `build/same_text_check.js` proves each text and
pattern comes out as before; the store's record names are read by the check scripts and two fixtures from
the app's own constants (`build/store_names.js`). The side-by-side check now notes, not fails, a newly
named text or pattern when changes are allowed. **Left, the copies differ:** the labelled-ISBN pattern, the
ISBN pair pattern, the 978-only converter and the anchored check — four different rules, not one written
four times. Store paths typed in the other fixtures are test data and stay.

### Round "app side" — design (as written before the round) (4B, 4C, the same-text items of 4E and 4F)

Branch `claude/restructure-4-app`. Every item is the same text or pattern written more than once in the
app's parts, brought to one piece that the other places name. Nothing the app does or says may change: the
side-by-side check must come out identical with no `--changes-allowed` differences in what is shown or stored,
and every sentence sent to Claude or shown to her must be the same character for character — proved by a
small script that builds each changed prompt and sentence from the old page and the new on the same inputs
and compares them (`build/same_text_check.js`, kept).
- **Where the one copy lives:** in the part of the feature that owns the sentence, at the lowest level
  that uses it (a part may not name a part above it; `build/structure_check.js`). A sentence the screen also
  uses is named by the screen, never retyped there.
- **4B:** the store-unreachable sentence and its "so nothing is being saved" form; the roll-back safety
  label (made in one place, the saving part); the store record names in `build/test_page_check.js`,
  `build/lookup_log.js` and the fixtures read from the app's own constants through one helper.
- **4C:** the `www.` strip written inline becomes one piece in the text foundations; `bareHost` uses it.
  Each place is replaced only where the result is the same for every input.
- **4E (same text only):** the "Sold by" rule; "Reply with ONLY this JSON object…"; "The ISBN-13, the
  publisher, and any link…"; "The books in this section of the shop, with their prices."; "The products in
  this section…"; "the English edition, published later" (compared as text in a second place — one named
  value); the publisher-splitting pattern; the ISBN dash removal. **The four ISBN patterns are merged only
  where two are the same rule; any that differ are listed for the coordinator, not changed.**
- **4F (same text only):** the title and raw-text lines of the two Claude prompts; "Couldn't find the
  show's title on the page."; the Shopify section-count reading; "The site's menu and footer links…"; the
  two found by the fact check (the unreadable-date note, "ISBN not confirmed — verify before buying").
- **Not in this round:** the price rules, Thyssen and Acquavella (their own round), anything that changes
  what the app does.
- **Done when:** `build/fact_check_known.json` holds none of these, so the fact check fails if one returns.

## Start here — the next session's job

**What is left, in order (her plan):**
1. **4A is published (59).** Left, for when she is back: she opens her app once (its old venue records
   clear themselves), then the one-time clear of the leftover `venues/occasional` records and Christie's
   orphan press record (her yes given; backup in `docs/store_backup_2026-11-06/`).
2. **4B to 4F**, in order. Per item: write its design here first (the one home, what is deleted, what she
   will see change), then one branch (`claude/restructure-4b` …), one sub-agent, the gates, merge. Her test
   after 4E. A change to her store needs her yes and a backup first. **Her ledger is never changed.**
3. **5**, then **her test round 3**.
4. **Publish to her app when she says.**

## Handover record — updated after every step

**Where we are:** steps 1 and 2 of "This run" are done (59 published; the app-side round merged), and
step 6's cutting plan is written (item 5 above; re-check it against the code once the item-4 rounds are in).
`build/keys_compare.js` (step 5's proof) is built and proven on branch `claude/restructure-4-keys`: it passes
on the code as it stands against her ledger and quarantine (read from her store into the scratchpad, never
committed) and fails on a changed title rule. Next: step 3, the scraper-side round.

**Open problems:** a sub-agent cannot start the watched test run — the test hook reads the coordinator's
transcript for the "Expected test run" line — so the coordinator runs gate 2 itself. The hook often refuses
the first try even after the line is written; write the line again and retry.

## When a session ends

When its memory is getting thin, or an item is waiting on her: bring "Start here" and the handover record
up to date, commit, push, and tell her to start a new session and type **"Continue the restructure."**
