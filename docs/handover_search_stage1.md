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

- **Stage 1: Search.** For each case, the LIVE app's search finds every relevant book (each
  language, earlier and later editions, different publishers, another showing's book). No
  relevant book is missing, and no junk is picked up. **That is all Stage 1 is.** It is a
  question about which books were found. It has nothing to do with cards.
- **Stage 2: Cards.** Once the right books are found, the card shows the right information
  about them: one block per version, language, the different ISBNs, the different publishers,
  and so on (her block layout, `docs/catalogue_versions.md`, "Her layout").
- **Stage 3: Selection.** With the right blocks on the card, picking a block works and the
  buttons follow the pick: Museum shop, Publisher and the bookstores.

**Only Stage 1 is open.** No test page has ever been built for Stage 1 alone; that is the next
job.

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

## The rules for the Stage 1 test page

- **It runs the live app's own search:** `lookupCatalogue` from `Cat_Watch.jsx`, unchanged,
  with her Parallel Search Key connector and the in-page Claude. It never uses a session's hand
  searches, saved pages, or made-up test pages (CLAUDE.md §1).
- **It runs her three cases only.** The other six cases on today's page (Watteau, Canaletto –
  Guardi, Botticelli, Metamorphoses, Millet, Hubert Robert at NGA) were never search failures
  she reported; a session added them as card examples. They come back only after a Stage 1
  fix, as a check that searches that already worked still work.
- **Its readout per case has no card in it:**
  - Each relevant book: found, or missing.
  - Each book found that is not relevant: junk, and where it came from.
  - For each missing book, the step where it was lost (the trace, below).
  - A verdict: **Stage 1 passes** only when every relevant book is found and nothing else is.
- **It keeps every lookup's full record.** The app's lookup log already records every call:
  each search sent, everything Parallel handed back, each page opened, exactly what Claude was
  sent and what it answered, and what the app kept. Sessions read it themselves from the page's
  store, so she never copies anything. Nothing is guessed.
- **Results vary between runs** because the web and Claude answer differently each time. Run
  the three cases more than once, back to back. A case that passes once and fails the next time
  is not passing.

## The trace: where each missing book was lost

The trace is code (there is one right answer), not a session reading logs by eye. For each
relevant book, it follows the lookup record step by step and reports the first step where the
book was lost:

1. **Never seen:** the book appears in nothing Parallel returned (no search result, no page). The
   search asked the wrong questions, or the web does not show the book that way.
2. **Seen, not shown to Claude:** it was in a result or a page, but the part passed to Claude
   left it out (for example `pickPassages`, or excerpts cut short).
3. **Shown to Claude, not reported:** Claude was given it and left it out of its answer
   (the prompt).
4. **Reported by Claude, dropped by the app:** Claude named it, and one of the app's own rules
   threw it away (for example `sameCatalogue`, `thisVenue`, or how editions are joined).
5. **Kept:** it reached the lookup's final result.

Match a book by its ISBN; also by its title and publisher, since a page may print no number.
Run it the other way for junk: where each unwanted book first came in.

Then **fix by cause, not by case.** If several books are "never seen", the problem is how the app
searches; if several are "shown to Claude, not reported", it is what Claude is asked. Prove each
fix by re-running the Stage 1 page, several times. The versions code has been patched many times
(`editionsOf`, `composeRow`, `printingsOf`; the third-patch rule, CLAUDE.md §7.4). Do not patch
it again for one case without her review.

## The relevant books per case (Stage 1 answers)

From her agreed cases in `docs/catalogue_versions.md`. Some facts came from a session's hand
searches, not from anything the app found. **Confirm this list with her before the page grades
against it**, and settle each open point with evidence from the records.

| Case | Relevant books (ISBN, what it is) | Must NOT be found |
|---|---|---|
| Vasari | 978-2359063721, French original (Louvre Éditions / Lienart); 978-2359063738, English paperback (Lienart); 978-9171009166, English hardcover (Nationalmuseum, the Stockholm showing) | 978-2350317441, an old number dropped by her decision |
| Hubert Robert | 978-2757210642, French catalogue (Louvre Éditions / Somogy; the Louvre's own number for the same book is 978-2350315355); 978-1848221918, English, a different book from the Washington showing (NGA / Lund Humphries) | 978-2757210659, the 48-page album |
| Hammershøi | 978-9462302495, French original (Culturespaces / Fonds Mercator); 978-0847899289, English (Rizzoli Electa, 2023) | — |

**Open points for her, each with its evidence:**
- **Hammershøi 978-9462301290:** found in runs 2 and 3 (Fonds Mercator, French, 175 pp, source
  mullenbooks.com), not in run 1. Her agreed French book is 978-9462302495 (hardcover, 176 pp).
  Is it another relevant book (another printing or binding) or junk? Settle from its source page
  and a library record for that number, then ask her.
- **Hammershøi's English book:** Rizzoli and 2023 never appeared in what the app found in her
  43 lookup. Check whether the app's searches can reach a page stating them.
- **Hubert Robert's second number (978-2350315355):** the same printed book as 978-2757210642.
  Decide with her whether Stage 1 counts it as a separate book or as part of that one.

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
