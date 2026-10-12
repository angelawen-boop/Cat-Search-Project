# Handover: catalogue search, Stage 1 (finding the right books)

Read this whole note before touching catalogue search, the live check page, or her three cases.
It replaces any plan in `docs/live_check_report.md` where the two disagree.

## The goal, in three stages, strictly in order

She has three exhibitions where the app's catalogue search does not find the right books:

1. **Vasari**: Louvre, 2022 (`louvre-giorgiovasarithebookofdrawingsthefateofalegendaryc`)
2. **Hubert Robert**: Louvre, 2016 (`louvre-hubertrobert17331808avisionarypainter`)
3. **Hammershøi**: Jacquemart-André, 2019 (`jacquemart-hammershithemasterofdanishpainting`)

The work is done in three stages. **Do not start a stage until the one before it has a working
test page and that page passes on all three cases.** This is her decision.

- **Stage 1: Search.** For each case, the LIVE app's search finds this show's catalogue,
  looks for its English edition by her rules (below), and keeps every book it comes
  across that is not junk or an excluded type. **That is all Stage 1 is.** It is a
  question about which books were found and kept. It has nothing to do with cards.
- **Stage 2: Cards.** Once the right books are found, the card shows the right information
  about them: one block per version, language, the different ISBNs, the different publishers,
  and so on (her block layout, `docs/catalogue_versions.md`, "Her layout").
- **Stage 3: Selection.** With the right blocks on the card, picking a block works and the
  buttons follow the pick: Museum shop, Publisher and the bookstores.

**Only Stage 1 is open.** The Stage 1 test page is built and published (version 4 of the live
check page, commit 7980379; `docs/live_check_report.md`).

## Her first Stage 1 run — three rounds, code 5f3f0a6 (read from the page's store)

Run records `R17917823099072hxi`, `R1791782625135xfpr`, `R17917829470726084` (store `checks`,
`stage: 1`, one loop); every case and lookup record saved, no problems.

| Case | R1 | R2 | R3 | Cause (diagnosed with her from the lookup records) |
|---|---|---|---|---|
| 1 Vasari | Pass | Pass | Pass | — French, English and Stockholm all kept, every round |
| 2 Hubert Robert (Louvre) | Pass | Pass | Pass | — Washington book never in the results any round (allowed: not searched for) |
| 4 Hammershøi | Pass | Pass | Pass | — French, Rizzoli English and 1290 kept, every round |
| 3 Hubert Robert (NGA) | Fail | Fail | Fail | Book found, ISBN 978-1848221918 not. The ISBN search is built from the publisher; Claude answered "National Gallery of Art", never Lund Humphries. R2: the press release ("Published in association with Lund Humphries") was in Claude's text and Claude did not name Lund — her "in association with" decision is only in code, never told to Claude. R3: the search returned the press release 9th; the app shows the first read only 8 results. R1: the search never returned the press release — not a fault (nothing seen, nothing to record) |
| 7 Botticelli | Fail | Fail | Fail | R1, R2: Reaktion's ISBN 978-1789144383 shown, not listed — the books request asks only for "catalogues of this exhibition", narrower than her keep rule. 978-2758010685 is Connaissance des Arts' hors-série (the venue's shop filed it as "hors-serie-botticelli…"; lireka: paperback, 9 Sep 2021), her excluded type: left off R1, R2; kept R3 because the magazine check reads only Claude's publisher answer, and Claude left it blank though the text printed "Connaissance des arts" beside the ISBN. R3 passed only because the test's answer list lacked it (added, commit 384cde6) |
| 8 Metamorphoses | Fail | Fail | Fail | English found first (correct). Dutch 6550 and Italian 6857 were printed only in Hannibal's catalogue PDF, read by the step that picks the publisher's pages, which is never asked about books. Dutch kept by title without its ISBN; Italian lost |
| 5, 6, 9 | Pass | Pass | Pass | — |

**Her five agreed fixes — built and on the Stage 1 page; changed, not yet proven live** (tests S1-008 to
S1-013, S1P-011):
1. **Every step that reads results asks Claude to write down every book in them**, in her keep
   rule's terms: any book that could be this show's catalogue or a version of it, same title
   with no mention of the show included; left out only junk, albums, booklets and magazine
   special issues; when unsure, keep. Today `OTHER_BOOKS_RULE` asks only for "catalogues of this
   exhibition", and the publisher-candidates read and the shop-page read (`readShopPage`) ask
   nothing about books.
2. **Her "in association with" decision goes into Claude's instructions**: the publisher is
   reported as the whole printed line ("… in association with Lund Humphries"), so the code's
   existing rule (`publisherToFind`) can take Y.
3. **Show Claude every result of every search, in every step** — never the first N. Not a
   patch for the step where it was caught: across the whole lookup.
4. **Magazine issues judged from the text, in code**: the magazine's name or "hors-série"
   printed beside the ISBN leaves it out, whatever Claude answers. And Claude is told to give
   the publisher whenever the text names who put the book out, even in the author's place.
5. **The test page's own faults**: rebuild it with the corrected answer list; and it must see a
   book kept without its ISBN — failing it only where the ISBN was printed in something the
   search saw (information thrown away), passing it where no text printed one.

How each is built: (1) `OTHER_BOOKS_RULE` reworded to her keep rule and added to the
publisher-candidates read and `readShopPage`, both kept (`keepSeen`); (2) `PUBLISHER_LINE`,
inside `OTHER_BOOKS_RULE`, so every read carries it; the ISBN search uses `publisherToFind`;
(3) `resultsForPrompt` and `pageForPrompt` show every result, sharing a character budget;
(4) `issueBeside` in `aMagazine` — checked on all eleven saved lookups of the last run, it
flags only 978-2758010685; (5) `stage1_grade.js` matches a book kept with no ISBN by its
answer's `title`. **Not covered, for her:** when code ranks the publisher's pages itself, the
site search's results reach no read at all — the trace would show "seen, not shown to Claude".

**Stage 2, for a later session:** Botticelli R1, R2 show Reaktion's book twice on the card
(two copies, title only, no ISBN). Investigate or repair with the card work.

**Still open:** the snippets-versus-whole-pages question (below); her three cases did not
flip-flop this run.

## The lesson: never mix Stage 1 with what the card says

Every diagnosis so far mixed the two, and it has to stop.

- **Stage 1 is judged on which books the search returned.** It is never judged on card lines.
  A line on a card is the app reporting what the search found. If the line is "wrong" because
  a book was never found, that is a Stage 1 failure. Fix the search, not the line.
- **Example:** Hubert Robert's card says "No English edition found in bookshops." That is the
  card correctly reporting that the search missed the English book (NGA / Lund Humphries,
  978-1848221918). It is a Stage 1 failure. A session called it a card problem; that was wrong.
- **Why they got mixed:** an earlier session tried to fix search by pushing more and more output
  onto the cards. The cards became unreadable: lines contradicted each other and facts ran on
  in long sentences. She had the cards redesigned (one block per book) so that what the search
  found can at least be SEEN. That redesign did not fix the search. The books are still not
  being found.
- **What the current check page does wrong for this:** it grades card lines against fixed
  answers (version 3 grades "On the card"). That cannot say whether the search found the right
  books. Its card grading is parked. Do not use it, extend it, or report from it until Stage 2.

## Her rules for Stage 1 — the intent

Each card is about its own exhibition: the venue's show, never another showing of it.

**Finding and the English edition.**
- No catalogue for this show → the search stops; no searching for other showings. A book
  for another showing that the results happen to mention is kept, as that showing's.
- This show's English edition found first → done. No search for the foreign-language
  version.
- This show's catalogue found in another language → always look for this show's English
  edition. None → say so. Found → its details are found too. A bilingual book made for
  this show counts as its English edition (no English search).
- **Another showing's book is never searched for, and its details are never completed by
  further searches** — whatever the results already say (even a title alone) is written
  down.

**Keeping.** Every book the search comes across is kept — title, publisher, language,
binding, page count, ISBN, as the pages state them — except:
- **junk**: a book with nothing to do with the exhibition;
- **her excluded types**: a book its pages call an album or a booklet; a magazine's
  special issue.

Keeping is a judgement, so **err on the side of keeping**; a wrong book shown beats a right
one thrown away. Definite yes: the same title (in meaning, any language) and it names the
exhibition; it says it is a translation; the same authors; it names the exhibition or the
venue. Same title and year: good enough. Same title, no mention of the exhibition:
suspicious, kept. **Page count decides nothing** (no one can say how short a short version
is); it is written down so she can see it.

**A pass**, per run, needs all three: this show's catalogue found; its English edition
found if one exists; nothing the search saw dropped except junk and excluded types. A run
whose results never mention another showing is not wrong for lacking its book.

## What threw books away (from the nine records and the code)

**Changed on `main` (commit 5f3f0a6), not yet proven live:** all four below and the English
stop rule; tests S1-001 to S1-007. Proof is the Stage 1 test page, run in a loop.
1. Claude's first read has room for one book; any other book in those results is never
   recorded.
2. The facts read is asked only for other printings and translations of the same book,
   never another showing's book, and is told "if the text is about a different book,
   answer null".
3. Code drops more: `editionsOf`'s proof (Vasari run 3: Stockholm's 978-9171009166 was in
   Claude's text all three runs, reported once, dropped here — its page names the same
   authors, which her rule keeps); different page counts (`differentBook`, 15%); a book
   the read says is not this venue's (`thisVenue`) dropped rather than kept as another
   showing's. The magazine drop stays.
4. Pages opened in later steps (publisher, shop) are never read for other books.

Also against her rules: with this show's English edition already found (Vasari runs 1–2),
the English-edition search still runs.

**Still open after those fixes — do not forget (her decision):** a book can be never seen
at all. The app reads only search snippets, never whole result pages; Parallel returned
different results and snippets for identical requests (Hubert Robert run 3: Enfilade's
snippet gave the French sentence, not the English one; Hammershøi runs 2 and 3: identical
edition searches, only run 3 got Stanford's and Rizzoli's pages). Claude's reads also
answer differently on the same text (Vasari's facts read: none, one, then all three
books). If results still flip-flop once nothing is thrown away, she decides whether the
search always reads whole pages.

## The rules for the Stage 1 test page

- **It runs the live app's own search:** `lookupCatalogue` from `Cat_Watch.jsx`, unchanged,
  with her Parallel Search Key connector and the in-page Claude. It never uses a session's hand
  searches, saved pages, or made-up test pages (CLAUDE.md §1).
- **It runs her three cases**, plus any other case directly affected by what the search
  FINDS (never by what a card shows, nor buttons or links). The other six on today's page
  (Watteau, Canaletto – Guardi, Botticelli, Metamorphoses, Millet, Hubert Robert at NGA)
  were never search failures she reported; include one only on that test.
- **Back to back means a loop over the cases** — all of them, then all again — never one
  case three times, then the next.
- **Its readout per case has no card in it:**
  - This show's catalogue and its English edition: found, or missing.
  - Every book the search saw: kept, or dropped — and for a dropped one, the step that
    dropped it (the trace, below).
  - A verdict: **pass** only on her three conditions (above).
- **It keeps every lookup's full record.** The app's lookup log already records every call:
  each search sent, everything Parallel handed back, each page opened, exactly what Claude was
  sent and what it answered, and what the app kept. Sessions read it themselves from the page's
  store, so she never copies anything. Nothing is guessed.
- **Results vary between runs** because the web and Claude answer differently each time. A
  case that passes once and fails the next time is not passing.

## The trace: where each book was dropped

The trace is code (there is one right answer), not a session reading logs by eye. For every
book the lookup record shows the search saw — and for this show's catalogue and English
edition even when unseen — it reports the first step where the book was lost:

1. **Never seen:** in nothing Parallel returned (no search result, no page).
2. **Seen, not shown to Claude:** in a result or page, but left out of what Claude was sent
   (`pickPassages`, snippets cut short).
3. **Shown to Claude, not reported:** Claude was given it and left it out of its answer.
4. **Reported by Claude, dropped by the app:** one of the app's own rules threw it away.
5. **Kept:** it reached the lookup's final result.

Match a book by its ISBN; also by its title and publisher, since a page may print no number.
A dropped book is a fail unless it is junk or an excluded type. "Never seen" fails only for
this show's catalogue or its English edition — another showing's book is not searched for.

Then **fix by cause, not by case**, and prove each fix by re-running the Stage 1 page. The
versions code has been patched many times (`editionsOf`, `composeRow`, `printingsOf`; the
third-patch rule, CLAUDE.md §7.4). Do not patch it again for one case without her review.

## The books per case, under her rules

From her agreed cases in `docs/catalogue_versions.md`; some facts came from a session's hand
searches, not from anything the app found.

| Case | Must be found | Kept if the search sees it |
|---|---|---|
| Vasari (Louvre) | French 978-2359063721 (Louvre Éditions / Lienart) — unless the English is found first; English 978-2359063738 (Lienart) | Stockholm's English hardcover 978-9171009166 (Nationalmuseum); the French book whenever seen |
| Hubert Robert (Louvre) | French 978-2757210642 (Somogy), the same printed book as the Louvre's 978-2350315355 — either number counts; no English edition for this show | Washington's English book 978-1848221918 (NGA / Lund Humphries); the 48-page 978-2757210659 unless its pages call it an album |
| Hammershøi (Jacquemart-André) | French 978-9462302495 (Fonds Mercator); English 978-0847899289 (Rizzoli Electa, 2023) | 978-9462301290 (Fonds Mercator, French, 175 pp, mullenbooks.com; runs 2–3) — kept, whatever it turns out to be |

**Watch:** 978-2350317441 — once written into her Vasari case by a session's hand search; no
page the app or a live search reached prints it (Louvre prefix 978-2-35031; checked live,
12 Oct). Ditched. If any future test run's records show it, tell her, with the page.

## What the three runs found so far

Search results only, read from the saved records. **`Cat_Watch.jsx` was identical in all three
runs**, so every difference between runs is the web and Claude answering differently.

| Run (page commit) | Vasari | Hubert Robert | Hammershøi |
|---|---|---|---|
| 1, `R1791639137375lahf` (12bfa1e) | 9738 only | 0642 and 1918 (both) | 2495 and 9289 (both) |
| 2, `R1791678301243iwuh` (e837c72) | 9738 only | 0642 and 1918 (both) | 1290 and 2495 (English missing; 1290 extra?) |
| 3, `R1791764764613hckw` (395a6c2) | 3721 and 9738 (Stockholm missing) | 0642 only (English missing) | 1290, 2495 and 9289 |

(Last four digits of each ISBN.) Unstable: Hubert Robert's English book and Hammershøi's English
book were each found in two runs out of three. Vasari's Stockholm book was never found, and
Vasari's French book only once.

**Their lookup records** (store collection `lookups`, on the check page):

| Case | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Vasari | `L179163914853866pa` | `L1791678302989865o` | `L1791764766384jrgf` |
| Hubert Robert | `L17916392049779uln` | `L1791678335150h79d` | `L1791764793752n449` |
| Hammershøi | `L1791639269084mdwl` | `L1791678397103dbql` | `L1791764846956ug8h` |

Read them with ArtifactData: `list` collection `lookups` (and `lookups/<id>/pieces`) with
`out_dir` on https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy, then
`node build/lookup_log.js <dir> <id>` prints one in full. The runs' case records are also saved in
`docs/live_check_runs/<run>/`.

## The existing tools

- **The check page:** https://claude.ai/artifact/KrnwLxC6YdZkd3QyFW4wmy (version 3), built by
  `node build/live_check.js` from `build/live_check_page.jsx`, cases in
  `build/live_check_cases.json`, answers in `docs/lookup_proof_cards.json`. It runs the live
  lookup, saves full records (every write's error recorded, read back from the store), names each
  case's lookup record, and keeps every lookup record (no pruning). Tests:
  `scraper/fixtures/live_check_page.js`. These parts are sound and can be reused for the Stage 1
  page. Its card grading is parked (above).
- **The lookup log:** "THE LOOKUP LOG" in `Cat_Watch.jsx`; reader `build/lookup_log.js`;
  `docs/app.md` §1, "The lookup log".
- **Publishing the page:** `node build/live_check.js`, then publish `build/dist/live_check.html`
  to the page's url. It is not her app; republishing it never touches her ledger. She taps Run.

## How she wants this worked

- Plain English; answer her question first; build nothing until she says go.
- Keep Stage 1 and the cards apart in every sentence of a diagnosis.
- No guessing: a cause is named only from a record, with the step and the evidence.
- "Fixed" means the live Stage 1 page passes, run more than once.
- Never republish her app or her test page for this work.
