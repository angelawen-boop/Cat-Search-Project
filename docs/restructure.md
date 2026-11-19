# The restructure — the app in feature parts

**The cutting is finished and on `main`; her test rounds passed. Her app still runs 59, published before the
main-screen work.** "Continue the restructure." → read this file, then do the next undone step of "What is left — the
plan to 60". Each run's design and record are in git (`git log -p -- docs/restructure.md`).

## Why (her decision)

The app was one file of about 9,400 lines. A session fixing a fault searched for the words in the
complaint, fixed that one line and never saw the rest of the feature, so the same fault came back in a
slight variation. The app is now feature parts, each small enough for a session to read whole.

**The point was to reorganize, simplify and streamline, not merely to split.** A work item was checked
against its own list of faults, one by one, never by gates and tests alone (layers once recorded "done" had
not kept their promises).

**The line between machinery and UI (her decision; the guiding principle from now on).** Machinery
decides what is true and what to say: rules, searches, imports, which case has happened and the sentence
for it (a sentence's wording sits with its feature). The UI takes what the machinery hands it and puts it
on screen. The UI asks and shows; the machinery never knows a screen exists. Never mix the two again.

**Not part of this work (her decision):** any fault in what the app does; the search redesign. **Manual
import (her name):** Links, Pages and Paste together.

## What was done

Every piece moved into a part under `app/`, by feature (`Cat_Watch.jsx` is the joined output; the parts hold no copy of
the scraper's rules — the join writes them in, except the summary examples, re-taken by `sync_shared.js --examples`). One
door to the store (`connections/store.jsx`); the web and Claude connections announce each call and the lookup log
listens. The machinery taken out of the screen (imports, Read, Save and the cloud jobs, Reset and Load, card marks,
filters and sorts, lookups, labelling, shop answers). One copy of every fact (the venue register; `scraper/pro_forma.js`
for the sweep file; `scraper/keys.js` for the web-address key, the letter fold and the show-ID rule; the audit:
`docs/restructure/duplicates.md`). The main screen went from about 1,770 lines to about 200: 37 small pieces, seven hook
groups, and the order of the pieces.

## How the app is laid out now

**Levels — a part may not name a part above it:** foundations → connections → saving and logs → the
features (ledger, periods, import, shop_finder, lookup) → screens. Only the store's door reaches the
store; only `app/screens/` holds React hooks or JSX. References between two feature parts are listed, not
failed.

**`app/screens/`:**
- **`app.jsx`, the screen:** calls the hooks in a fixed order and hands each piece what it needs by name.
  It keeps what several share: the one "a job is running" flag and its progress line (labelling, lookups
  and the Read share it: one job at a time), the error line, the diagnostic, the confirm box, the theme
  and the `ui` object, search-selected-words, the drawers' shared "open" flags with Reset-a-card, and the
  list's three lines.
- **The hooks, in call order (also the order of the opening's reads from the store):** `useSweepLog` (the
  sweep log) → `useFilters` → `useLedgerDocument` (the quarantine, then the cloud copy) → `useLinkVenues`
  (the venues) → `useCardActions` → `useImportSession` (the pending links, pages, pastes) →
  `useBuyNextDrag`, `useListDrawing`.
- **Who tells whom, always by a named action the screen hands in:** the document tells the filters "a
  ledger was loaded"; the import session tells the document "commit", "add to the quarantine" and "an
  import was applied", the sweep log "record this sweep", the filters "these cards changed" and the link
  venues "an import was applied"; a lookup asks the link venues to work out a shop search. No two hooks
  need each other. The filters do not hand back the list: the screen works it out from the document's
  rows and the filters.
- **The pieces:** `header.jsx`, `chips.jsx`, `card_list.jsx`, `ledger_card.jsx`, `drawers.jsx`,
  `floating.jsx`, `period_scrubber.jsx`, `import_popup.jsx`, `review_panel.jsx`, `shop_screen.jsx`. The
  diagnostic box, the sweep-log drawer and the review (which stays mounted between imports) own their
  "open" memory.

**The rules of a cut — they hold for any later change to the screen:**
- A piece is a component at the top level of its file. It is handed the values it shows, the look as one
  `ui` object, and **named actions**. No piece or hook is handed a raw setter of memory it does not own; if
  one needs three or more of another's setters, the two belong together.
- No piece takes more than about fifteen things. Related values travel as one object only where they are
  one thing (the card list's `cardState`: which card is busy and what it last said).
- No shared global memory (no React context, no store object every piece reaches into).
- Import, review and the shop screen are one session with one memory.
- A hook's effects run where the hook is called: moving a call can change the order of the store's reads.
- **Signs of a wrong cut — stop and bring it to her:** a piece taking more than about fifteen things; two
  hooks that each need the other; a rule that has to know a screen exists; the opening reads changing order.

## How the parts work

- **`app/` holds the parts; they are what gets edited.** A part is a list of pieces, each opened by
  `//@piece <name>` (one top-level statement with the comments above it); `//@ ` lines before the first
  piece are the part's note.
- **`Cat_Watch.jsx` is written only by `node build/app_join.js`**, in the order `app/pieces.json` records.
  `app_join.js --check` exits 1 if it was edited by hand; the build and the test runner run it first.
- **A new piece** goes in the part where it is used and is recorded in `docs/restructure/placement.json`.
- Branches holding their own `Cat_Watch.jsx` (`parked`, `claude/theme-shelf`) are not merged across the
  restructure; their work is rebuilt on the parts when she wants it.

## The words list (her decision)

Every sentence, button, label and line the app shows her is written once, in `app/foundations/words.jsx`
(`W`); every place that shows one names its entry. A sentence with a gap (a title, a count, a venue) is a
pattern, its gaps written `{name}` and filled by `say(W.x,{…})`; a gap holding a link or bold words is
drawn by `<Say text={W.x} gaps={{…}}/>` (`screens/theme.jsx`). The list sits near the top of the page, so
every piece and every test that lifts part of the page can name it.
- **Not on it (agreed):** the wording sent to Claude or the web (prompts, search words, a fault said back
  to Claude) — changing it changes what the app does; the lookup log's names for its records; how a shop
  was found (kept in the store); the starter set's exhibitions; and the tables of facts that have their
  own one home (venue, country, period and theme names). Each such text sits under a comment starting
  "Not words:" that says which. The diagnostic box's lines ARE on it: she can open the box.
- **`build/words_check.js`** fails: words written anywhere but the list (JSX text, a shown attribute, a
  string holding two words or one capitalised word) unless under a "Not words:" comment or in a place never
  shown (a CSS value, a key, a comparison, what a text is searched for); an entry no part shows, or two
  entries with the same words; a pattern filled with other gaps than its own, or shown unfilled; and a test
  that writes out a whole entry's words. It runs before every test run and in the build.
- **Tests** read the app's sentences from the list (`scraper/fixtures/words.js`: `WORDS`, `say`, `wordsRe`;
  `wordsSource` for a test that lifts part of the page). **Agreed limits:** the check cannot judge whether a
  new sentence should have reused an old one — it forces it onto the list, where it shows; one lowercase
  word with no space beside it ("none", "never") is not recognised as words, so it is on the list only
  where a session put it; a test that looks for a few words of a sentence (`/No catalogue found/`) still
  writes those words.

## The venue register (her decisions)

- **The code is the one home for every venue's facts** (swept and manual import alike):
  `venues/register.js`, one entry per venue, in her venue order. `build/fact_check.js` fails a venue fact
  written anywhere else, and a sentence, list or rule written twice. Field by field:
  `docs/add_by_link.md`, "The design".
- **The store is a waiting room, never a second copy.** What the app learns at a manual import goes to
  `venues/occasional`, works at once, and is filed into the register at the next publish, whatever it is
  for (`build_app.js` does it: `docs/publishing.md`). The app clears a waiting entry the register now
  holds exactly; one that differs stays for the next publish. Where copies clashed, her name won.
- **Conflicting or ambiguous facts go to her on one page**, never in chat: the permanent venue review
  page, https://claude.ai/artifact/RmSC86pu1rkBxsZDtfdA1J (store `names/<id>`, `picks/<key>`), rebuilt
  from the register at each publish, her entries filed in then.
- **Her ledger is never changed (her decision) — banned outright.** No item alters, corrects or migrates
  her ledger rows or saved file. Where a duplicate sits inside her ledger, it stays.
- Thyssen's and Acquavella's shop sections are written into the register: hard-coded answers, her decision.

## The checks

Each is proven by planted faults and is not used until proven at its current version (`docs/testing.md`,
"Proven checks").
- **`build/structure_check.js`** — the levels, the store's door, hooks and JSX only in the screens.
- **`build/fact_check.js`** — venue facts in one home; nothing written twice.
- **`build/words_check.js`** — every sentence she sees on the words list (above).
- **`build/app_join.js --check`** — the hand-edit guard: `Cat_Watch.jsx` is exactly what the parts, the scraper's
  rules and the register join to.
- **`build/side_by_side.js --base <ref> --changes-allowed`** — two versions of the page in a stand-in
  browser with the same clock, store, web and Claude: every table and list the page defines, every screen,
  every store record, every web and Claude call, and the store's sequence of reads and writes must be
  identical; only a function's text may differ. It walks every screen and action she has, once each (the
  walk is the list of steps in the script, each naming the steps it needs). The page's own timers run on a
  stand-in clock, so nothing waits for the screen to settle: about a minute. **Use it for any change meant
  to leave behaviour alone.**
- **`build/same_text_check.js`, `build/sweep_same_check.js`, `build/keys_compare.js`** — the proofs of the
  duplicate rounds (texts, sweep files, her ledger's keys).
- **`build/screen_xref.js`** — who reads and writes each thing the screen remembers.

## Her tests (her decision)

The checks cannot reach her real store, her Claude or a real Find catalogue, so she tests on the
restructure test page (never her app): https://claude.ai/artifact/Ju1pKP84Gi3VNL1b2SULc5, built by `node
build/build_app.js --test-page` (title "Art Watch Restructure Test", footer "TEST PAGE — not your app").
Every round has passed, round 3 (the main screen) included. Her app is published only when she says.

**Before every round — a test is true only if the page is set up as her app is:** copy her app's
`venues/occasional`, `quarantine/rows` and `sweeps/venues` into the test page's store (her store is only
read); decode her current ledger from her store's `ledger/live` into the scratchpad (never committed);
`node build/test_page_check.js <store dir> <ledger.json>` must pass; then send her the link, that ledger
and the latest sweep file.

**How a round's checklist is made (her instruction):** specific, never "try a few things". Every item is
tied to something changed: exactly what to do (which card, venue, button, what to type), what she should
see, and what it proves. Real cards and venues from her ledger. The session runs every item first and
lists only what it has seen come out right, saying plainly which items it could not run live (anything
needing her connector or her Claude); grouped in order; plain words, no code names.

## How a session works on this — her standard (keep)

A session solves, without asking her, anything the real world gives one answer to, any inconsistency with how the app
already does the same job, and a test key the world has moved on from; a side effect of a fix is a flaw in the fix, so
the fix without it is found; "nothing is failing" is no reason to leave two rules. She is asked only for taste or her own
data (a sentence on screen, what a venue keeps, a name she chose), anything touching her ledger or store, publishing, a
real fork, or a fix that could not be found — in a few plain lines.

**The fixes after item 4 (59.2, done):** one letter fold (`foldLetters`; `docs/app.md`, "Why each rule exists"; proved on
her ledger and quarantine by `build/keys_compare.js`: every stored key and starter ID unchanged), one price rule
(`docs/add_by_link.md`, "The shop finder"; proved live by `build/price_compare.js`), the Uffizi searched under its Italian
name, the Prado's and the V&A's link rules (`docs/add_by_link.md`, "Venue link rules"). The live shop checks miss at four
venues, the same under the code before (CLAUDE.md §2.2.6).

## What is left — the plan to 60 (her decisions)

In this order; nothing runs beside another.

1. **Done — the fixes merged as 59.2**, her test round on the test page passed; the Uffizi's shop taken out of its
   entry after it (on `main` only).
2. **Done — the words list** ("The words list" above); the side-by-side check came out identical.
3. **Done — housekeeping:** the new-ID suffix written once; a memory written and never read removed; the quarantine
   stored outside its state updater; the Save panel's "File name:" preview and Save sharing one rule; `placement.json`
   brought up to date; the docs over their size budget (the guide review).
   **Done — the checks proven** (a session's plan, in place of the tools' own proofs she stopped): the migration's
   tools removed; the three checks, the hand-edit guard and the rewritten side-by-side check each proven by planted
   faults; the lock in code (`docs/testing.md`, "Proven checks"); all of them run on the current code.
4. **Done — her test page for 59.2, published** (her store's three records copied in, her ledger decoded,
   `test_page_check.js` passing; the ledger and the latest sweep file sent to her). She asked for the page only, no
   checklist. Her round on it **passed** (the Uffizi item's expected line was wrong: a card with no catalogue
   says "No catalogue found"; "Venue has no shop." shows only beside a found book).
5. **Done — 60 published to her real app** (no venue was waiting to be filed; the Christie's press record was
   not filed, its site being Christie's own entry).
6. **NEXT — once her app has opened on 60:** the one-time clear of the leftover Christie's
   press record in `venues/occasional` (her yes given; backup `docs/store_backup_2026-11-06/`).

**Left alone on purpose (her decision — different jobs, not duplicates):** compression's looser address
key; the sweep-diff's fold; the publisher step's own address strip.

## Who does what, when more of this is done (her decisions)

One coordinating session; sub-agents one at a time, never a fork; the model by the judgement the job
needs — Sonnet at medium for contained work the side-by-side check proves, Opus at medium where order or
behaviour is subtle; never higher, never low effort, never Haiku. The coordinator writes the design first,
opens one branch per run (`docs/branches.md`), re-runs the checks and the watched test run itself (a
sub-agent cannot start one), reads the diff, merges, pushes, updates this file. A surprise is parked for
her and the work moves on. She gets a short line at each quarter of a stage.

**Lessons (keep):**
- Name both the model and the effort on every sub-agent. Check the branch is checked out before one starts.
- A sub-agent can stop on the account's usage limit: its work is saved; when the limit resets, message it
  to continue, never start a second. One that reports while its own check still runs will report again.
- Gate a merge on the test run's own exit code, never on a grep of its output.
- Run the side-by-side check alone: run beside a test run it once reported a screen's fingerprint
  different while every screen, read in full, was the same.
- A check that leaves something out "to be steady" can drop what it was meant to prove (the store log once
  lost a save that rode on a timer): prefer making the page steady in the stand-in browser.
- Never `git add -A` in a worktree that holds a `node_modules` link. `git checkout main` fails while
  another worktree holds `main`: use a detached worktree for an old-code copy.
- A test that finds a control by its exact words breaks when the words gain a count or a mark: find it by
  its name with or without the addition.
