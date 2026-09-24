# The file she imports — how it was built

**`scraper/output/stitch_20260913_0442/sweep_compressed_clean.csv`.**

This exists because the guide's own lesson said it must: *a one-off script that
changes a file she USES is not a one-off.* What those scripts did was left in
comments inside them, three sessions passed, the guide went on describing the
file as a straight stitch, and she had to type the whole history out again
herself.

**The file is NOT `sweep_compressed.csv`** — that is the unrebuilt 652-row
original and would put hundreds of duplicate cards on her pile.

---

## The chain, run end to end 19 Sep

> sweep both machines → stitch the run folders → compress → rebuild → import

### 1. Sweeps, 13 Sep

| Run | Machine | What it covered |
|---|---|---|
| `run_2026-09-13_020041` | container | all 21 — which the routing rule now prevents |
| `run_2026-09-13_142632` | container | 19 |
| `run_2026-09-13_142846` | her laptop | met 106, artic 65 |

Borghese answered the 2am run and was dead from every machine by the afternoon:
unreachable, not a refusal. Capodimonte did the same, including from her laptop,
where it timed out.

### 2. Stitch

`stitch_20260913_0442`, 652 rows folding to **405 distinct exhibitions**. Every
venue but met and artic appears twice because two container runs went in — not
needed for coverage, but it gave the app's folding 209 live pairs to work on
rather than authored ones, and all 209 fold with no conflict at all.

### 3. Rebuilt by hand to one sweep per venue

Two container runs covering the same venues meant two copies of nearly
everything, and at import that is hundreds of duplicate cards. So
`rebuild_one_run_per_venue.js` SELECTS rows already in the compressed file —
nothing re-swept, nothing re-compressed — one run per venue:

| Rows taken from | Venues |
|---|---|
| `_142632` (container, afternoon) | acq brera brit dellav frick khm louvre menil moma morgan ng rijks tate-britain tate-modern uffizi va wallace |
| `_020041` (container, 2am) | **borghese, capo** — the afternoon run reached neither |
| `_142846` (her laptop) | met, artic |

**So the venues in her file were NOT all swept at the same moment**, and two of
them carry rows from twelve hours before their last attempt.

### 4. The dates had to be repaired separately — her catch, 20 Sep

The rebuild takes each venue's ROWS from one run, and for Borghese and
Capodimonte that had to be the EARLIER run. Dropping the later run dropped the
only evidence it happened, so the app's freshness drawer aged both venues back to
2am and lost the tried-but-empty gap at the exact two venues that had earned it.

**A repair that is right about the rows can still be wrong about the dates: they
answer different questions of the same file.**

`fix_late_refusals.js` restores the later attempt's own marker rows, stamped from
that run's log. It checks all 21 rather than the two we knew about, and throws
rather than guess. Marker rows are not proposals, so her card count did not move.

`add_swept_at.js` added the eighth column to the 13 Sep file with no re-sweep.
Times recovered from **the venue's last line in the run log**, which is
timestamped and venue-tagged, never from the folder name. It throws rather than
guessing when a venue has no log line.

### 5. Compress, 19 Sep, repaired 20 Sep

390 rows went to a model in five jobs, 262 were answered free, ~580k tokens.
Summary length min 3, median 7, max 10 against her own median of 6.

Two repairs since: `--seed-wins` restored 13 Acquavella summaries to her wording,
and the rebuild-by-key fix restored 13 rows the compressor had overwritten. The
19 Sep first pass is kept whole in `19sep_first_pass/`.

---

## The shakedown import, 20 Sep

Against her 110-row seed the file produces **320 cards** — 299 add, 14 fill,
7 change — with 86 rows matching silently, **no card asking her to choose**, and a
coverage panel.

The row identity closes on the rebuilt file:

```
419 = 13 markers + 0 folds + 86 matching + 320
```

(415 and 9 before `fix_late_refusals.js` added Borghese's and Capodimonte's later
refusals.) **The folds are 0 BECAUSE of the rebuild** — the 210 folds and 36
markers quoted for this step before came from importing the unrebuilt 652-row
stitch, which is a different file. Both triage bands are empty here.

**It was 319 until the rebuild-by-key bug was fixed.** That bug had copied one
Rijksmuseum row over another, accidentally making two rows identical so the app
folded them. They are two ADDRESSES for one show —
`/exhibitions/ed-van-der-elsken` (dated, from the current page) and
`/exhibitions/past/ed-van-der-elsken` (no dates, its page 404s) — and two cards is
the correct answer: the app folds only on an identical address, because a wrong
fold loses an exhibition silently while an unfolded duplicate costs one visible
card. The `/past/` one is a quarantine candidate, being a dead link.

---

## What the two faults had in common

**Both were joins, not halves.** Stitch wrote a loose CSV where compress reads
directories — so it compressed the newest sweep instead, 652 rows in and 172 out,
no error. And the seed sat behind the previous run in memory, so 13 of her own
summaries came back as proposed rewrites.

Each side was unit-tested and correct; neither join had ever been run.

---

## Parked

**A QA pass before the stitch — her ruling 19 Sep**, along with everything else
from 16 Sep. It may be a good idea; it came out of a session whose reasoning she
does not trust, so it is not being built on that basis. **`scraper/qc.js`'s
exceptions report is NOT that pass** and does not re-open it.

---

## The 23 Sep repair — her first sitting

`repair_23sep.js`, beside the file. Report by default; `--apply` writes. Running it
twice changes nothing. Every repair is also fixed at the source, so a fresh sweep
will not need it.

| Repair | Rows | How |
|---|---|---|
| End dates a year or two late | 2 — Gricci, Lotto's Lucina Brembati | The extension rule read a repeat of the closing date with no year ("prorogato fino al 11 novembre") as a new extension. Recomputed by the scraper's CORRECTED `applyExtension` from the quoted sentence and the raw page text; only the same-day-later-year family is touched |
| Extension notes missing | 3 — Samorì, Metamorphoses, Armani | The detail-page path never wrote the note. Samorì's date was right; the card contradicted itself and she rejected it |
| Same sentence twice in a note | 56 | Two links to one exhibition on a listing page each stamped "Also listed…" |
| English titles | 20 | From `english_titles_23sep.json`, kept beside the file |

**The English titles were bought badly.** A separate title step sent all 402 titles
in the file to Sonnet when only the four Italian venues' ~50 could be Italian;
~85k tokens of her allowance. The step was withdrawn the same day — the compressor
now writes the English title in the same answer as the summary, for those venues
only — and the 20 useful answers were kept.

**What a re-import shows**, simulated against a ledger holding everything she
accepted: 3 adds (the rows she rejected, now correct), 18 description changes (the
English titles), 49 title changes. The 49 are seed rows whose shortened August
titles differ from the venue's full ones — renames became cards in version 33.
Notes are never compared, so the note repairs raise no card.

### Capitals, the same day — `repair_capitals_23sep.js`

81 titles arrived in capitals because the venues shout them with CSS. Her ruling:
no on-screen masking in the app; fix the data. The script reads each affected
venue's LISTING pages exactly as a sweep does (`scrapeVenue(…, { listingOnly })`,
with the scraper's new `restoreCase`), saves url → title to
`capitals_fetched_23sep.json`, and replaces a title only where the venue's own
title at the SAME address is the same letters in a different case.

**78 fixed; 3 left** — Louvre Couture, WORN and REVOLUSI!, which the venues
themselves write in capitals. Borghese (down all day): 2 from the venue's own text
in the 13 Sep sweep, 5 written in title case by hand, her instruction. Three
Rijksmuseum rows no longer at their address: written in title case by hand, names
spelled as the venue spells them at their new addresses. Both recorded in
`capitals_fetched_23sep.json`.

Re-imported over what she accepted it gave her 113 cards. **The title cards were
never read before the file was sent**, and ~52 of them were her August seed
titles against the 13 Sep sweep's listing titles — several SHORTER than hers
(*Radical Harmony: Neo-Impressionists* → *Radical Harmony*), Acquavella's run
together with a city, the Louvre's in its own inconsistent capitals. The file
still carries all of it; the open list is CLAUDE.md §7.1a.

## 24 Sep — rebuilt on the 21 Sep file, 23 Sep withdrawn

**Her instruction, 24 Sep: the 23 Sep repairs and file are withdrawn.** Every
repair below starts from her 21 Sep import file (`stitch_20260913_0442/
sweep_compressed_clean.csv` at commit `f1bfb41`), and every changed value came from
code reading the museums' own pages — nothing typed by hand.

**Her import file is now `stitch_20260924_0417/sweep_compressed.csv`.** Two steps:

1. **Titles** — `stitch_20260913_0442/titles_24sep.js` →
   `sweep_titles_24sep.csv`. Capitals: the scraper's reading of four listing
   pages she saved (`docs/title_case_pages/`) and four read live, 30 s apart; a
   title replaced only where the same address reads the same letters in
   different case. Three Rijksmuseum rows from their own pages (one was a status
   label, "PARTIALLY CLOSED"; one address now 404, letters taken from her saved
   page). All 15 Acquavella titles as the fixed scraper reads her saved page.
   Only titles changed. Left: Borghese's 7 (site down) and three the museums
   type in capitals (*LOUVRE COUTURE*, *WORN*, *REVOLUSI!*).
2. **English titles** — `stitch_20260924_0417/`: a compression run whose input
   (`build_input.js`) is that file's 419 rows given back the museum's text from
   the 13 Sep sweep. 361 descriptions reused word for word; 20 English titles
   added in her format; the two Louvre descriptions restored (below). Checked:
   against step 1's file only the description differs, on 22 rows.

**The two Louvre descriptions** (*A New Look at Cimabue*, *Figures of the Fool*).
The Louvre was swept twice on 13 Sep; the first sweep was refused (HTTP 429) on
those two pages, the second read them, and compression described them. The
21 Sep rebuild (`rebuild_one_run_per_venue.js`) chose between the two copies by
venue + address + title — identical in both — and kept the first, empty one.
Restored from the 13 Sep compression after checking it was written from the
identical text. These were the only two rows the rebuild lost.

### Extension dates, 24 Sep — `stitch_20260924_0417/repair_extensions_24sep.js`

A year-less "prorogato fino al 11 novembre" was applied twice by the scraper,
a year added each time: Gricci closed 2027-11-11, Lotto's Lucina Brembati
2027-01-13. Repaired from the 13 Sep page text on disk, no network: a date
changes only where the old parser (from git) reproduces the file's dates and
the fixed parser, on the same text, gives another closing date. Exactly those
two. Three rows whose extended date was already right — Samorì, Brera's
Armani, Borghese's Metamorphoses — gained the note saying where it came from.
Five cells changed in 419 rows; nothing else.

### A borrowed description, 24 Sep — `stitch_20260924_0417/repair_borrowed_memory_24sep.js`

The Rijksmuseum's older *Ed van der Elsken* (`/past/ed-van-der-elsken`, page
always 404) carried *Up Close*'s description: with "past" dropped the two
addresses were one key, the 13 Sep compression stored the borrowed words under
the older show's own address, and 24 Sep carried them on. Repaired by replaying
this folder's compression decisions with the memory code before and after the
fix, over the same memory files: two rows differ, one changes — the older
show's description emptied and its "carried over" note removed (*Up Close*
keeps identical words). Two cells in 419 rows.
