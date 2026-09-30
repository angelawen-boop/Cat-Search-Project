# The files she imported — how each was built

A one-off script that changes a file she USES is not a one-off: what it did is
recorded here. Compressed 30 Sep; full history in git.

## The main import — `stitch_20260924_0417/sweep_compressed.csv`

Imported and decided by her (320 cards, done 29 Sep). Also compression's newest
memory. Every changed value came from code reading the museums' own pages —
nothing typed by hand.

**Lineage:**

1. **Sweeps, 13 Sep:** `run_2026-09-13_020041` (container, all 21),
   `run_2026-09-13_142632` (container, 19), `run_2026-09-13_142846` (her laptop:
   met 106, artic 65).
2. **Stitch:** `stitch_20260913_0442` — 652 rows, 405 distinct exhibitions.
3. **One sweep per venue** (`rebuild_one_run_per_venue.js`, selecting rows
   already compressed): the afternoon container run, except borghese and capo from
   the 2am run (the afternoon reached neither), and met/artic from her laptop.
   **In that folder the file is `sweep_compressed_clean.csv`** —
   `sweep_compressed.csv` there is the unrebuilt 652-row original.
4. **Dates repaired** — rows from an earlier run must not carry that run's dates
   as the last attempt: `fix_late_refusals.js` restored the later run's marker
   rows (stamped from its log; throws rather than guess); `add_swept_at.js` added
   the eighth column from each venue's last log line.
5. **Compressed** 19 Sep (390 rows asked, 262 free), repaired 20 Sep:
   `--seed-wins` restored 13 Acquavella summaries to her wording; a
   rebuild-by-key fix restored 13 overwritten rows. First pass kept in
   `19sep_first_pass/`.
6. **24 Sep repairs** on her 21 Sep file (commit `f1bfb41`):
   - **Titles** (`titles_24sep.js`): capitals from the scraper reading her saved
     listings (`docs/title_case_pages/`) and four read live; three Rijksmuseum
     titles from their pages; all 15 Acquavella titles. Left: Borghese's 7 (site
     down) and three typed in capitals by the museums.
   - **English titles** for the Italian venues: a compression run over the same
     419 rows; 361 descriptions reused word for word, 20 English titles added.
   - **Two Louvre descriptions** restored: the rebuild chose between two copies by
     a key both shared and kept the refused (429) one.
   - **Extension dates** (`repair_extensions_24sep.js`): a year-less "prorogato
     fino al 11 novembre" got a year added twice (Gricci, Lotto). Changed only
     where the old parser reproduces the file and the fixed one differs — two
     rows.
   - **A borrowed description** (`repair_borrowed_memory_24sep.js`): the
     Rijksmuseum's older *Ed van der Elsken* (`/past/…`, a 404) carried *Up
     Close*'s words, because dropping "past" made the addresses one key. Emptied.

**Against her 110-row seed it produced 320 cards** (299 add, 14 fill, 7 change),
86 matching, no choice cards: `419 = 13 markers + 0 folds + 86 matching + 320`.
The two *Ed van der Elsken* addresses are correctly two cards.

**Lessons:** both faults of 19–20 Sep were joins, never halves (stitch wrote a
file where compress reads folders; the seed sat behind older memory). A repair
right about the rows can be wrong about the dates.

## 25 Sep — the new-venues import

`stitch_20260925_0611/sweep_compressed.csv`: 75 rows (Levy Gorvy 28, MAM 19,
Tate Britain 23, Jacquemart-André 5). Against her 24 Sep ledger: 66 new, 2 Tate
title corrections, 7 matching. `tate-britain`, `lgd` and `mam` were swept again
first; stitch, compress, qc, cards read through the intake. App 35 was published
first so the new venue codes were known.
