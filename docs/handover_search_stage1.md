# Handover: catalogue search — Stage 1 done, Stage 1b in progress

Read this whole note before touching catalogue search, the live check page or her cases.
It replaces any plan in `docs/live_check_report.md` where the two disagree.

## START HERE — the next session's job

**Her 8fed6ff run is graded and reported (below, "Her run on 8fed6ff").** Wait for her
go on the recommendations; nothing is built before it. For any later run, the steps:

1. Find the run: ArtifactData `list` collection `checks` (url
   https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy, `query.limit` 1000, `out_dir` in the
   scratchpad). The run records with `"commit": "8fed6ff"` are hers; one record per round,
   all sharing one `loop`. Each lists its `lookups[]` (case → lookup id) and
   `passedCases` / `failedCases`.
2. Per round: `list` collection `checks/<run id>/cases` → each case's `stage1.lines` (the
   grade the page computed live), `keptBooks`, `row`, `trouble`, `ok`.
3. For any failure, the lookup record: `list` collection `lookups` (headers) and
   `lookups/<id>/pieces`, both into one `out_dir`; then `node build/lookup_log.js <dir> <id>`
   prints every call, every Claude prompt and answer. Trace each failure to the read that
   made it: was the fact in that read's prompt, and what did Claude answer?
4. **A round where every lookup says "Claude is rate-limited … sampling too often" is not a
   result** — the page asked Claude too often; it says nothing about the code. She reruns.

**How to report (her standard):** combined results across rounds, not only pass/fail —
read every line the grade printed, compare the kept books and conclusions round by round,
say what varies. For each failure, its own cause from the record (step, what Claude was
shown, what it answered), labelled proven or guess. Never lump failures under one cause.

**"Fixed" means the live page passes every case, every round** (CLAUDE.md §1).

## Her run on 8fed6ff — 20 of 27, graded and reported; nothing built yet

Loop `P1791810419826reaq` (R1 `R17918104211370ooa`, R2 `R1791810764358j538`, R3
`R17918110805611oh2`). Passed every round: cases 2, 4, 5, 6, 8, 9 (Canaletto's second number and
Metamorphoses fixed). Failures, each from its record:

| Failure | Cause (proven from the record unless marked) | Who |
|---|---|---|
| Vasari R1 | the read had "Exhibition: Paris, Musée du Louvre and Stockholm, Nationalmuseum" and still said `thisVenue:false` → lookup stopped after 4 calls, French edition never searched | Claude / thisVenue rule |
| NGA R1 | the press release excerpt said "the catalog includes five scholarly essays…"; read said `found:false` → stopped after 4 calls | Claude, against "a press release stating the book counts" |
| NGA R2 | text: "Published in association with Lund Humphries"; read said "National Gallery of Art" → own-imprint → Lund Humphries never searched, ISBN never seen. `PUBLISHER_LINE` asks for "the whole line the text prints"; no line here prints both names | prompt wording |
| NGA R3 | `isbnInResults` took 978-2757210659 (the album) from a result titled "…L'album de l'exposition", because "Hubert Robert" is in it; album not left off (why `calledAlbum` missed it: guess) | code |
| Botticelli R1 | facts read was shown "9781789149289 9781789144383" (unglued — fix works) and listed no Reaktion book | Claude |
| Botticelli R2, R3 | read listed Reaktion's book once with 978-1789144383 only, never 9289; another read gave it no ISBN as "Botticelli: Artist and Designer (Renaissance Lives)", which `titleAsPrinted` cut to "Botticelli" → kept apart from the numbered copy, twice. R2: that copy's address held ISBN-10 1789149282 (= 9289); `isbnInAddress` reads 13 digits only | Claude + code |

Also found: `PUBLISHER_LINE`'s example is case 3's own answer ("National Gallery of Art in
association with Lund Humphries") — a test answer inside the prompt.

## What is on the page now (commit 8fed6ff) — changed, not yet proven live

Her previous run, commit 65a10a9 (`R1791808388866icp3`, `R1791808766721qft7`,
`R17918091268442cny`): **24 of 27; no junk book and no wrong language in any round** (the
65a10a9 prompt rewrite worked for both). Each failure, its proven cause, and the fix in 8fed6ff:

| Failure | Cause (from the record) | Fix |
|---|---|---|
| Canaletto R1 — 978-9061538448 dropped | SUDOC prints "ISBN : 9789061538226 ISBN : 9789061538448" for the catalogue; the answer had ONE ISBN slot | `otherIsbns` on every answer; each further number kept as the same book (`keepSeen`, `keepMoreNumbers`) |
| Botticelli R2 — 978-1789149289 dropped | Parallel's copy of the Chicago press page glued Reaktion's numbers: "97817891492899781789144383" | `unglueIsbns` splits two valid ISBNs run together, in `oneText`, `resultText` and every result shown to Claude |
| Botticelli R1 — 978-1789144383 dropped | one read kept Reaktion's book by title (no number in its text); a later read had the number but never listed the book | `recordedNote`: the facts read and both publisher reads are told which recorded books still lack facts, and list them again with what their text prints |
| Hubert Robert (NGA) R3 — catalogue never found | the text said "Published in association with Lund Humphries"; Claude answered "National Gallery of Art", so the ISBN search never named Lund Humphries and code took it for the museum's own imprint | the whole-publisher-line rule (`PUBLISHER_LINE`) now sits beside every catalogue publisher field (READ_RULES, PAGE_RULES, the facts read), not only after the other-books rule — **why Claude cut it is a guess** |
| Metamorphoses R3 — passed wrongly | the Dutch book kept under a list heading ("Metamorphoses", with its ISBN) and again by its own title without one | grader: a book kept again by title beside its numbered copy, or under a title not its own, fails |

Tests: S1B-001 to S1B-008 (`scraper/fixtures/catalogue_route.js`), S1B-P01 to S1B-P06
(`scraper/fixtures/live_check_page.js`). `npm run test:app` passes.

**Earlier on 65a10a9 (proven live in her run):** every read follows her intent below;
"When unsure, include it" and "even when the text never mentions the exhibition" are gone;
each book's language is the book's own, never the listing site's; Claude says which show
each book belongs to (`showing`) — code no longer calls a book "this show's" when a city is
left blank; a second copy of a book fills every fact the first lacked (`fillVersion`); a
fact a read stated stands where no page states it (`_stated`, `versionFacts`).

## Her intent for the search (settled — never re-ask; the prompts must realise it)

- **Required, at most two books:** this show's catalogue — title, publisher, ISBN, link to
  the book on the publisher's site. If that catalogue is not in English: its English edition
  too, the same four facts. **Nothing else is required — page count never.**
- **Everything else only if Claude comes across it:** any other fact about those books
  (language, binding, pages, year), and any other book the text ties to THIS exhibition (a
  printing, binding or language of its catalogue; another showing's catalogue; a book with the
  catalogue's own title). **Never searched for; never thrown away once seen** — every title,
  ISBN, publisher, binding and language in any result Claude reads is recorded.
- **Claude's work is fixed in Claude's prompt**, never by code patches around a wrong
  answer. Code checks only facts with a fixed shape (an ISBN's digits and check digit).

## Her decisions (settled — never ask again)

1. **No fact is ever discarded from any result Claude reads.** Asking her whether to keep a
   seen fact is itself a mistake.
2. **A book clearly for a different show is junk, never "unsure":** a different artist, a
   different title, an earlier show, a page heading. Known junk: *Botticelli Reimagined*
   (V&A 2016), *Gauguin: Metamorphoses* (MoMA), 5 Continents' *Giorgio Vasari* (2011), NGA's
   1984 *Watteau: 1684-1721*, "Publicatie | Metamorphoses", Lisbon's *Splendour in Venice*,
   Hatje Cantz's *Vilhelm Hammershøi. Maler des stillen Klangs*, the RA's 2008 *Hammershøi*.
3. **Never decide which show a book belongs to by matching titles** — the catalogue and its
   editions carry titles in different languages. It is Claude's reading judgement.
4. **Nothing is proposed for building without a traced cause.**

## The stages, strictly in order (her definitions)

- **Stage 1 — finding every relevant book. DONE** (her call, on the 27f264d run).
- **Stage 1b — correct conclusions. IN PROGRESS.** Every kept book is right: this show /
  another showing / junk left out; its language; publisher; ISBN; binding; no book kept
  twice or under another's title. A wrong language, a wrong show, a junk book, a dropped
  ISBN — all Stage 1b (information), never "card problems".
- **Stage 2 — printing.** With correct information in hand, the card prints every fact it
  has, in the right block and the right sentence (title + ISBN + hardcover → all three
  printed; title + "French" → both printed). Layout: `docs/catalogue_versions.md`, "Her
  layout". Starts only when 1b passes every round.
- **Stage 3 — selection.** Picking a block works and the buttons follow the pick.

## The test page and its grade

- **It runs the live app's own lookup** (`lookupCatalogue`) with her Parallel Search Key
  connector and the in-page Claude — never hand searches or saved pages. Nine cases
  (`build/live_check_cases.json`). Rounds run back to back; 3 rounds of 9 can hit Claude's
  rate limit — if so she reruns after a quiet spell.
- **The grade is code** (`build/stage1_grade.js`, answers `docs/stage1_answers.json`):
  - Stage 1: this show's catalogue kept; its English edition kept when one exists; every
    "kept if seen" book kept whenever the search saw it; excluded types left off; any ISBN
    Claude named that was printed in its prompt and not kept fails. Each book's trace names
    the first step it was lost at (never seen → seen, not shown to Claude → shown, not
    reported → reported, dropped by the app → kept).
  - Stage 1b: every kept book is one the answers name (else "another show's book or junk");
    its `lang` and `showing` match the answers where set; no book kept twice; no numbered
    book under a title not its own.
- **Regrade saved records:** `node build/stage1_check.js <dir> [<id> …]`.

## The books per case (`docs/stage1_answers.json` is the copy the grade reads)

| Case | This show (must be found) | Kept if the search sees it | Excluded |
|---|---|---|---|
| 1 Vasari (Louvre) | French 978-2359063721; English 978-2359063738 (Lienart) | Stockholm's English 978-9171009166 (another showing); 978-2350317441 (French, the Louvre's own number, printed beside 978-2359063721 on BnF and Paris Musées records — likely the same book, a guess) | — |
| 2 Hubert Robert (Louvre) | French 978-2757210642 (Somogy; Louvre's 978-2350315355); no English edition | Washington's English 978-1848221918 (another showing) | album 978-2757210659 |
| 3 Hubert Robert (NGA) | English 978-1848221918 (NGA in association with Lund Humphries) | Paris's French 978-2757210642 (another showing) | the album |
| 4 Hammershøi (Jacquemart-André) | French 978-9462302495 (Fonds Mercator); English 978-0847899289 (Rizzoli Electa) | French 978-9462301290 (Fonds Mercator, 175 pp) | — |
| 5 Watteau (Louvre) | French 978-2359064476 | — | — |
| 6 Canaletto – Guardi | French 978-9061538226 (Fonds Mercator) | French 978-9061538448 (same catalogue, second number, SUDOC) | Connaissance des Arts 978-2758004158 |
| 7 Botticelli | French 978-9462302815 (Fonds Mercator) | Reaktion's same-titled English 978-1789144383 and 978-1789149289 (no show graded) | Connaissance des Arts 978-2758010685 |
| 8 Metamorphoses (Rijksmuseum) | English 978-9493416543 (Hannibal) | Dutch 978-9493416550 (*Metamorfosen – Ovidius en de kunsten*); Italian 978-9493416857 (no show graded) | — |
| 9 Millet (National Gallery) | English 978-1857097382 | — | — |

**Not yet hers to settle, raise only if a run turns on it:** which show Reaktion's
*Botticelli* and Hannibal's Italian *Metamorphoses* belong to (the answers grade no show for
them; runs have labelled the Italian one Rome's).

## Known, not Stage 1b failures (do not chase unless a run fails on them)

- **Hammershøi's English publisher:** Rizzoli appeared in the search results in one round of
  three; in the others it was in nothing the search returned (a search result, not a
  reading error).
- **Hubert Robert (Louvre):** the publisher step cannot find Somogy's website ("nosite") —
  her roadmap's publisher list (CLAUDE.md §7.6) is the remedy.
- **Two places Claude never sees what the search found** (her call, nothing has failed on
  it): code ranks the publisher's pages itself (`rankPublisherPages`), and the pages opened
  in phase 2c are read for numbers by code only.

## The tools

- **The check page:** https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy, built by
  `node build/live_check.js` from `build/live_check_page.jsx`. Publish: build, then publish
  `build/dist/live_check.html` to that url (capabilities carried forward); a session's first
  publish needs the live page read in full first. Never touches her app or her cloud page.
- **The prompts:** `OTHER_BOOKS_RULE`, `OTHER_ITEM`, `PUBLISHER_LINE`, `READ_RULES`,
  `READ_SHAPE`, `PAGE_RULES`, `PAGE_SHAPE`, `factsPrompt` and the two reads in
  `findPublisherPage`, all in `Cat_Watch.jsx`.
- **The lookup log:** "THE LOOKUP LOG" in `Cat_Watch.jsx`; `docs/app.md` §1. The check page
  keeps every lookup (no pruning). Earlier runs' records: `docs/live_check_runs/`.

## How she wants this worked (learned the hard way this session)

- Her job is to state the intent; realising it in the prompts is ours. If the intent is
  unclear, ask her then; never ask her to decide something her stated intent already settles.
- Answer her question first, plainly. Build nothing until she says go.
- Diagnose from the records only: which read, what text it was shown, what it answered.
  Say who produced each error — Claude's answer, the prompt, or code — and never call an
  information error a "card problem".
- Never put an item under "what I'll build" that has not been traced to a cause.
- Never propose title matching to decide a book's show.
