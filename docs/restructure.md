# The restructure — the app in feature parts

**The cutting is finished and on `main`; her test round 3 passed. Her app still runs the version published
before the main-screen work.** A session sent here by "Continue the restructure." reads this file, then
does the next undone step of "What is left — the plan to 60". The step-by-step designs and the record of each run are in git
(`git log -p -- docs/restructure.md`).

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

- **The parts.** Every piece moved into a part under `app/`, by feature; `Cat_Watch.jsx` is the joined
  output. The parts hold no copy of the scraper's rules: the join writes them in from the scraper's files
  each time (the one exception: the summary examples, re-taken by `sync_shared.js --examples`).
- **One door to the store** (`connections/store.jsx`); the web and Claude connections announce each call
  and the lookup log listens.
- **The machinery out of the screen:** the CSV import engine, the Read job for manual import, Save and
  the cloud copy's jobs, Reset and Load; then card marks, the list's filters and sorts, the lookup and
  labelling jobs, a venue's shop answers.
- **One copy of every fact:** the venue register (`venues/register.js`, below), the app's repeated
  sentences and patterns, the sweep file's columns and readers (`scraper/pro_forma.js`), one web-address
  key, one accent strip and one show-ID rule (`scraper/keys.js`, `showId`). The audit:
  `docs/restructure/duplicates.md`.
- **The main screen** went from about 1,770 lines to about 200: its layout is 37 small pieces, its memory
  seven hook groups, and what is left is the order of the pieces.

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
  `node build/app_split.js` moves pieces between parts word for word.
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
  that writes out a whole entry's words. It runs before every test run, in the build and in the gates.
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
  her ledger rows or saved file. Where a duplicate sits inside her ledger, it stays. The quarantine stays
  in both the store and her saved file.
- Thyssen's and Acquavella's shop sections are written into the register: hard-coded answers, her decision.

## The checks

- **`build/structure_check.js`** — the levels, the store's door, hooks and JSX only in the screens.
- **`build/fact_check.js`** — venue facts in one home; nothing written twice.
- **`build/words_check.js`** — every sentence she sees on the words list (above).
- **`build/side_by_side.js --base <ref> --changes-allowed`** — two versions of the page in a stand-in
  browser with the same clock, store, web and Claude: every table and list the page defines, every screen,
  every store record, every web and Claude call, and the store's sequence of reads and writes must be
  identical; only a function's text may differ. It walks: opening and loading her test ledger; the Import
  pop-up's tabs; every chip and sort and their combinations; card marks and the undo; Save now and the
  Cloud Saves drawer; a sweep file's review (mixed decisions, partial apply, apply); Reset; the Read for
  Pages and Paste; Label, Relabel and "Do not regroup"; Find catalogue, Search again, Re-check, a lookup
  that dies and one with trouble; the digital link; the catalogue pick; a new venue through the shop
  screen (every answer, Apply, and Cancel import); the dark theme and each drawer. About six minutes. Long
  repeating timers never fire in it. **Use it for any change meant to leave behaviour alone.**
- **`build/restructure_gates.js --base main --layer <id> --changes-allowed`** — the join exact, nothing
  lost or doubled, every piece in its part, then the three checks above. Then `npm run test:app`.
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

## The fixes after item 4 — done (59.2)

Merged from `claude/restructure-fixes`. Period labelling keeps sending a venue's English name (`periodShow`);
the side-by-side check finds a picked Theme chip with its count. **Her standard for such work (keep):** a session solves, without
asking her, anything the real world gives one answer to, any inconsistency with how the app already does
the same job, and a test key the world has moved on from; a side effect of a fix is a flaw in the fix, so
the fix without it is found; "nothing is failing" is no reason to leave two rules. She is asked only for
taste or her own data (a sentence on screen, what a venue keeps, a name she chose), anything touching her
ledger or store, publishing, a real fork, or a fix that could not be found — in a few plain lines.
- **One letter fold.** `foldLetters` (`scraper/keys.js`, in the app as `KEYS`): lowercase, accents dropped,
  ø æ œ ß ł đ ð þ ı folded. The search box, title matching, the artist key, compression's title key and the
  place fold all use it. `build/keys_compare.js` on her ledger and quarantine: every stored key and starter
  ID unchanged, the same cards on re-import, none she holds offered as new; the simplified copies spelled
  differently are printed as a note, and a copy that newly joins or splits two shows fails. A show she
  holds, met again spelled with plain letters at another address, is now matched, not offered as new.
- **One price rule.** `pricesIn` / `hasPrice` (`app/shop_finder/museum_shop.jsx`) for the finder, the lookup
  and the galleries: an amount with its currency, cents or none; never a zero total, a price filter, a
  "from … and above" bound or a delivery threshold; a range standing alone is one book's price span. A
  shelf may still be known by its price filter. `build/price_compare.js`: every venue's shelf fetched live,
  each difference read; the live shop checks give every venue the same answer as the code before.
- **The Uffizi is searched in Italian under its Italian name** (`full`; its English name is `inEnglish`),
  and a venue is recognised as a publisher, and named, under either. Its shop sells no books, so its entry
  holds no shop and a lookup goes straight to the web (her decision, after her test round).
- **The proof pages.** A changed page read correctly updates the key; read badly, the reader gets that
  venue's rule (the Prado's cut-off marker and curator credit, the V&A's picture captions never dated).
  `scraper/link_proof_check.js` treats a page listed as refused as listed while refused for the same reason.
- **Small faults:** a file with no sweep time adds nothing to the sweep log; `show_tags.readCsv` says how
  many rows it dropped; `build/blocks_check.js` names its cases by venue and title.
- **The live shop checks miss at four venues, the same under the code before the fixes** (the same live
  replies read by both): Berlin takes one book's page for the section, the Albertina's section is not
  found, the Belvedere stays German (CLAUDE.md §2.2.11), White Cube takes its prints section. Not
  investigated.

## What is left — the plan to 60 (her decisions)

In this order; nothing runs beside another.

1. **Done — the fixes merged as 59.2**, on the test page ("The fixes after item 4" above); her test round
   on it passed. The Uffizi's shop was taken out of its entry after it (on `main`, not on the test page).
2. **Done — the words list** ("The words list" above). No wording changed: the side-by-side check came
   out identical.
3. **Housekeeping** — the same session after the words list, or a new one she starts (Sonnet at medium is
   enough): re-run the tools' own proofs (`node build/restructure_gates_proof.js`, `node
   build/side_by_side_proof.js`, about half an hour); the "-2, -3" suffix that keeps a new ID unique,
   written twice inside the import's apply, made one; a memory of "the venues the last Read met" that is
   written and never read; the import's quarantine write that runs inside a state updater; the Save
   panel's "File name:" preview worked out without the save's trim and 80-character cut;
   `placement.json`'s oldest note on `screens/app.jsx`; the docs over their size budget (the guide review).
4. **Publish 60 to her real app — when she says.** The publish files any waiting venues and tells her in
   one line if it did.
5. **After 60 is published and her app has opened on it:** the one-time clear of the leftover Christie's
   press record in `venues/occasional` (her yes given; backup `docs/store_backup_2026-11-06/`).

**Left alone on purpose (her decision — different jobs, not duplicates):** compression's looser address
key; the sweep-diff's fold; the publisher step's own address strip.

## Who does what, when more of this is done (her decisions)

One coordinating session; sub-agents one at a time, never a fork; the model by the judgement the job
needs — Sonnet at medium for contained work the side-by-side check proves, Opus at medium where order or
behaviour is subtle; never higher, never low effort, never Haiku. The coordinator writes the design first,
opens one branch per run (`docs/branches.md`), re-runs the gates and the watched test run itself (a
sub-agent cannot start one), reads the diff, merges, pushes, updates this file. A surprise is parked for
her and the work moves on. She gets a short line at each quarter of a stage.

**Lessons (keep):**
- Name both the model and the effort on every sub-agent. Check the branch is checked out before one starts.
- A sub-agent can stop on the account's usage limit: its work is saved; when the limit resets, message it
  to continue, never start a second. One that reports while its own check still runs will report again.
- Gate a merge on the test run's own exit code, never on a grep of its output.
- A check that leaves something out "to be steady" can drop what it was meant to prove (the store log once
  lost a save that rode on a timer): prefer making the page steady in the stand-in browser.
- Never `git add -A` in a worktree that holds a `node_modules` link. `git checkout main` fails while
  another worktree holds `main`: use a detached worktree for an old-code copy.
- A test that finds a control by its exact words breaks when the words gain a count or a mark: find it by
  its name with or without the addition.
- Publishing: the first try is refused as not viewed and saves the live page; prove by script that the
  live page is an earlier build of this same page, then send again (refused once as unchanged), then again.
