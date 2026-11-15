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

**Parked for her:** (nothing yet)

## Start here — the next session's job

**What is left, in order (her plan):**
1. **Finish 4A** — the checks still to run, as agreed with her: the scraper, old code beside new, on saved
   pages only (no network); manual import's page reading, live proof pages old reader beside new; the
   catalogue search wording for every non-English venue. Then, when she says, publish (`docs/publishing.md`):
   her store's old venue records should all clear on opening; then the one-time clear of the leftover
   `venues/occasional` records and Christie's orphan press record (her yes given; backup in
   `docs/store_backup_2026-11-06/`). The publish also brings the `art-watch-` file names for saved ledgers
   and safety copies.
2. **4B to 4F**, in order. Per item: write its design here first (the one home, what is deleted, what she
   will see change), then one branch (`claude/restructure-4b` …), one sub-agent, the gates, merge. Her test
   after 4E. A change to her store needs her yes and a backup first. **Her ledger is never changed.**
3. **5**, then **her test round 3**.
4. **Publish to her app when she says.**

## Handover record — updated after every step

**Where we are:** 4A merged into `main` and checked item by item against the code, her store and ledger
(after her catch that Detroit was never fixed); the misses fixed (`claude/restructure-4a-fixes`): full names
in Find catalogue; the search box reads title, description and the card's venue name (her decision); a
group's chip label written once; six full names corrected; Getty and Louisiana renamed. Gates re-run: side by side differs only where intended (her
names, the register's new values, one Milan page no longer asking Claude to name a venue it knows); 23 of
23 suites. **The waiting room, proved live on the test page (her test):** a new venue (Pallant House)
filed by the build, then cleared by the page on opening, a fresh Find catalogue taking its shop from the
code; a changed fact waiting in the store shows over the code and is not cleared; a changed fact filed by
the build reaches the page and is cleared on opening (the test name kept off `main`, on
`claude/restructure-4a-case3`). Next: the checks under "Start here", 1.

**Open problems:** a sub-agent cannot start the watched test run — the test hook reads the coordinator's
transcript for the "Expected test run" line — so the coordinator runs gate 2 itself. The hook often refuses
the first try even after the line is written; write the line again and retry.

## When a session ends

When its memory is getting thin, or an item is waiting on her: bring "Start here" and the handover record
up to date, commit, push, and tell her to start a new session and type **"Continue the restructure."**
