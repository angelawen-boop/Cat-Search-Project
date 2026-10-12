# Handover: catalogue search, Stage 1 (finding the right books)

Read this whole note before touching catalogue search, the live check page, or her cases.
It replaces any plan in `docs/live_check_report.md` where the two disagree.

## START HERE — the next session's job

**Her three fixes from her second run are built and on the test page** (commit 27f264d,
tests S1-014 to S1-017, S1P-011c). Changed, not yet proven live:
1. Same book seen twice: the copy kept by title takes the later copy's ISBN and blank
   facts (`fillVersion`, in `keptVersions` and `add` in `lookupCatalogue`; the pick's index
   never moves). Hammershøi R2, Metamorphoses R3.
2. No ISBN from the read: the one valid 978/979 number in the address of the result it
   cites (`isbnInAddress`). Canaletto R1.
3. Grader: a result printing two valid numbers is no evidence for either. Canaletto R3.

**Next:** she taps Run (3 rounds) on https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy.
Read the records from the page's store and grade them (below). "Fixed" only when every
case passes, every round.

**Still open, her call (nothing failed on it yet):** two places where Claude never sees what
the search found — (a) when code ranks the publisher's pages itself
(`rankPublisherPages`), the site search's results reach no read; (b) the pages opened in
phase 2c (last try for the ISBN) are read for numbers by code only. Covering both costs
one more Claude read per lookup. Recommendation: wait for a failure that shows it.

## Where it stands

**Her second Stage 1 run, code cf96c50 (her five agreed fixes): 25 of 27 lookups pass.**
Run records `R17917887620071hpx`, `R1791789125415oirj`, `R1791789421363ubw1` (one loop).

| Case | R1 | R2 | R3 |
|---|---|---|---|
| 1 Vasari, 2 Hubert Robert (Louvre), 3 Hubert Robert (NGA), 5 Watteau, 7 Botticelli, 9 Millet | ✓ | ✓ | ✓ |
| 4 Hammershøi | ✓ | ✗ fix 1 | ✓ |
| 6 Canaletto – Guardi | ✗ fix 2 | ✓ | ✗ fix 3 |
| 8 Metamorphoses | ✓ | ✓ | ✗ fix 1 |

Her first run (code 5f3f0a6) failed cases 3, 7 and 8 every round; her five agreed fixes
(commit cf96c50, tests S1-008 to S1-013, S1P-011) turned them into passes:
1. Every read lists every book in its text that could be this show's catalogue or a version
   of it, the same title with no mention of the show included (`OTHER_BOOKS_RULE`) — the
   publisher-candidates read and `readShopPage` included, both kept (`keepSeen`).
2. Claude reports the publisher as the whole printed line (`PUBLISHER_LINE`, inside
   `OTHER_BOOKS_RULE`), so "X in association with Y" is searched under Y
   (`publisherToFind`, also in the facts search's query).
3. Every result of every search reaches Claude, sharing a character budget
   (`resultsForPrompt`, `pageForPrompt`; a result too long to cut into lines shows its
   opening — `pickPassages`).
4. A magazine's special issue is ruled out in code from the text (`issueBeside` in
   `aMagazine`): the magazine named on the page about that number, or beside it.
5. The grader sees a book kept without its ISBN (`title` in `docs/stage1_answers.json`):
   it fails only where that number was printed in something the search saw.

## The goal, in three stages, strictly in order (her decision)

**Do not start a stage until the one before has a working test page that passes on all
cases.**
- **Stage 1: Search.** The LIVE app's search finds this show's catalogue, looks for its
  English edition by her rules, and keeps every book it comes across that is not junk or an
  excluded type. Which books were found and kept — nothing to do with cards.
- **Stage 2: Cards.** The card shows the right information about those books: one block per
  version (`docs/catalogue_versions.md`, "Her layout"). Known: Botticelli shows Reaktion's
  book twice (title only); Metamorphoses R3 filed the Italian edition as "another showing".
- **Stage 3: Selection.** Picking a block works and the buttons follow the pick.

**Never mix Stage 1 with what the card says.** A card line is the app reporting what the
search found; a book never found is a Stage 1 failure — fix the search, not the line. Card
grading on the check page is parked until Stage 2.

## Her rules for Stage 1

Each card is about its own exhibition: the venue's show, never another showing of it.

**Finding and the English edition.**
- No catalogue for this show → the search stops. A book for another showing that the
  results mention is kept, as that showing's.
- This show's English edition found first → done; no search for the foreign one.
- This show's catalogue found in another language → always look for this show's English
  edition. None → say so. A bilingual book made for this show counts as its English edition.
- **Another showing's book is never searched for, and its details never completed by
  further searches** — whatever the results already say is written down.

**Keeping.** Every book the search comes across is kept — title, publisher, language,
binding, page count, ISBN, as the pages state them — except **junk** (nothing to do with the
exhibition) and **her excluded types** (a book its pages call an album or a booklet; a
magazine's special issue). **Err on the side of keeping.** Definite yes: the same title (in
any language) naming the exhibition; a stated translation; the same authors; naming the
exhibition or venue. Same title and year: good enough. Same title, no mention of the show:
suspicious, kept. **Page count decides nothing.**

**A pass**, per lookup, needs all three: this show's catalogue found; its English edition
found if one exists; nothing the search saw dropped except junk and excluded types. A
lookup whose results never mention another showing is not wrong for lacking its book.
**Results vary between runs** (the web and Claude answer differently): a case that passes
once and fails the next time is not passing. If results still flip-flop once nothing is
thrown away, she decides whether the search always reads whole pages.

## The test page and the trace

- **It runs the live app's own search** (`lookupCatalogue`, unchanged) with her Parallel
  Search Key connector and the in-page Claude — never a session's hand searches, saved pages
  or made-up pages (CLAUDE.md §1). Nine cases (`build/live_check_cases.json`): her three
  (1, 2, 4) plus six regression cases. Rounds loop over every case, then again.
- **The grade is code** (`build/stage1_grade.js`, answers `docs/stage1_answers.json`). For
  each book it gives the first step where it was lost: never seen → seen, not shown to
  Claude → shown, not reported → reported by Claude, dropped by the app → kept. Matched by
  ISBN; a book kept with no ISBN by its answer's `title`. "Never seen" fails only for this
  show's catalogue or English edition. It also fails any other ISBN Claude named that was
  printed in its prompt and not kept.
- **Fix by cause, not by case**, and prove each fix by re-running the page. The versions
  code has been patched many times (`editionsOf`, `composeRow`, `printingsOf`; the
  third-patch rule, CLAUDE.md §7.4): no patch for one case without her review.

**Reading a run (no copying for her):**
1. ArtifactData `list` collection `checks` with `out_dir` → each round's record names its
   lookup ids (`lookups[]`).
2. ArtifactData `list` collection `lookups` and `lookups/<id>/pieces` with `out_dir`.
3. `node build/stage1_check.js <dir> [<id> …]` grades; `node build/lookup_log.js <dir> <id>
   [--json]` prints one lookup whole (every call, Claude's prompts and answers, the card
   before and after, the panel log).

## The books per case (her rules)

| Case | Must be found | Kept if the search sees it | Excluded |
|---|---|---|---|
| 1 Vasari (Louvre) | French 978-2359063721 (Louvre Éditions / Lienart) unless the English is found first; English 978-2359063738 (Lienart) | Stockholm's English hardcover 978-9171009166 (Nationalmuseum) | — |
| 2 Hubert Robert (Louvre) | French 978-2757210642 (Somogy) = the Louvre's 978-2350315355; no English edition for this show | Washington's 978-1848221918 (NGA / Lund Humphries) | the album 978-2757210659 |
| 3 Hubert Robert (NGA) | 978-1848221918 (NGA in association with Lund Humphries) | Paris's 978-2757210642 | the album |
| 4 Hammershøi (Jacquemart-André) | French 978-9462302495 (Fonds Mercator); English 978-0847899289 (Rizzoli Electa) | 978-9462301290 (Fonds Mercator, French, 175 pp) | — |
| 6 Canaletto – Guardi | 978-9061538226 (Fonds Mercator) | — | Connaissance des Arts 978-2758004158 |
| 7 Botticelli | 978-9462302815 (Fonds Mercator) | Reaktion's same-titled 978-1789144383 | Connaissance des Arts hors-série 978-2758010685 |
| 8 Metamorphoses (Rijksmuseum) | English 978-9493416543 (Hannibal) | Dutch 978-9493416550, Italian 978-9493416857 (printed in Hannibal's catalogue PDF) | — |
| 5 Watteau, 9 Millet | 978-2359064476; 978-1857097382 | — | — |

**Watch:** 978-2350317441 — once written into her Vasari case by a session's hand search; no
page the app reached prints it. If any run's records show it, tell her, with the page.

## The tools

- **The check page:** https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy, built by
  `node build/live_check.js` from `build/live_check_page.jsx`; tests
  `scraper/fixtures/live_check_page.js` (S1P-), the lookup's Stage 1 tests in
  `scraper/fixtures/catalogue_route.js` (S1-). Publishing it never touches her ledger.
- **The lookup log:** "THE LOOKUP LOG" in `Cat_Watch.jsx`; `docs/app.md` §1.
- Earlier runs' records: `docs/live_check_runs/`; the store keeps every lookup (no pruning).

## How she wants this worked

- Plain English; answer her question first; build nothing until she says go.
- Keep Stage 1 and the cards apart in every sentence of a diagnosis.
- No guessing: a cause is named only from a record, with the step and the evidence.
- "Fixed" means the live Stage 1 page passes, every round.
- Never republish her app or her cloud test page for this work.
