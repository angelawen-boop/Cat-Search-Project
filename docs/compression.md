# The compression step — design and evidence

**Read this only when changing compression.** Built, tested and signed off; the
running rules are in `docs/scraper.md` §9 and the prompts in
`scraper/compress_prompt.md`. Compressed 30 Sep; full history in git.

---

## The design — her principle

*"The model is the only part of this pipeline that thinks. Do not make it do
dumb work for code to be clever on top of."* The first design ran the model
blind on every row every sweep so code could throw most answers away; she
called it upside down. **Give the compressor one piece of memory** — every
earlier compressed CSV (run_ and stitch_ folders, newest first;
`completedCompressions()`) — and it turns the right way up:

| Raw text vs memory | What happens | Model calls |
|---|---|---|
| Identical | reuse the wording | none — code, cannot be wrong |
| Changed | the model gets the OLD wording and the new text: **is the old summary now false?** No → keep; yes → rewrite | one |
| Never seen | write fresh | one |

- Measured 10 Sep: 79 of 80 rows matched across runs; genuine rewording zero.
- **"Is it now false?" is her test** — promotional copy turning past tense is
  not a change; "sculptures" becoming "paintings" is. Review-and-edit beats
  writing from scratch.
- **Drift is impossible by construction**: unchanged text never reaches the
  model. (Temperature zero would not guarantee it.)
- **Matching:** venue + URL, then venue + title (then dates — `docs/scraper.md`
  §10). Both failures are soft.
- **A reuse caused by a failed page says so in `notes`.**
- **Every row is compressed** — only the app knows which rows are new to her.
- **A `null` answer is a recorded decision** ("not a description" — e.g. a bare
  link); the summary stays empty and the skip is remembered, re-asked only if the
  venue writes something real. A MISSING answer stops everything.
- **Travelling pairs are found in code** (`groupTravellingRuns()`), asked once,
  answer written to both rows. Told to match wording itself, the model copied one
  city's artist count onto the other. The city list is mirrored in
  `compress.js`; fixture L-008 asserts the copies agree.

**What the app does with a summary** (her table):

| Ledger | Sweep | App |
|---|---|---|
| not in ledger | anything | Add, with the summary |
| closed, has a summary | different | no card |
| closed or open, no summary | has one | fill |
| open or upcoming, has a summary | different | Change card |
| any | blank | nothing |

---

## Which model — measured, 10 Sep

**Sonnet writes fresh; Haiku judges staleness.** On 27 National Gallery rows,
same prompt and examples: Haiku kept the form but missed the point ("reads like
a cereal box ingredients list" — her verdict); Sonnet found the point and
fabricated less. Haiku scored 14 of 14 on the staleness judgement.

- **Traceability checks must normalise diacritics** — a check once "found"
  Haiku inventing Brâncuși, who was on the page.
- **Reached by subagent**, one per job (or chunk), never per row — a session
  writing summaries itself uses whatever model it is.
- Session, not API: the cost argument vanished at ~30 rows a sweep. The prompt
  file makes a move to the API a transport change if scheduled sweeps ever
  matter.

## Length and shape — from her data

Her 110 seed summaries: minimum 3 words, **median 6**, maximum 10, all ending
in a full stop, noun phrases. Cap ten, aim six; longer is refused, never cut.
**The prompt is examples, not rules**: `--examples` builds ~29 pairs of raw text
→ her approved summary, automatically, from the seed. Two written rules only:
never state anything not in the raw text; refuse text that is not a
description.

## Proven

- Reuse, skip memory and the changed-text path (one row asked, carrying the old
  wording): verified end to end on Acquavella, 10 Sep.
- Writing: a Sonnet subagent wrote 15 summaries from the examples; her verdict,
  "very good" (11 Sep).
- Judgement: `compress_eval.js` — 14 authored before/after pairs (keep: past
  tense, hours added, events appended, blurb cut, language switch; rewrite:
  changed medium, changed count, artist dropped or added, recycled address;
  refuse: curator biography, consent text; two marked `arguable`). The harness
  fails "keep everything" (7/14). Haiku scored 14/14; the answers were not
  committed. **She declined to re-run it just to save them — settled.** If it is
  ever run again, commit the answers.

## "Probably not for you" — topic labels on new shows

Compression labels a NEW show in a topic she always quarantines (Prompt D, `TOPICS` in `scraper/compress.js`).
Asian art wins over any other label; the Met's rotations are never labelled (her decisions). Code writes
"Topic: …" into the notes. On import those cards go in "Probably not for you · N", after Odd cases, pre-set to
Never add; Add keeps one. `scraper/topic_eval.js` re-scores the labeller on her decisions. Tests TP-, TP-A,
AD-009–010. Her next monthly import is the check (CLAUDE.md §2.2.7).

## Enforcement

- **A script cannot bind a session** — the handoff is a request. **The output is
  enforced:** `--check` and `--apply` refuse a missing, over-length or malformed
  answer and write nothing.
- **Every answer is checked by one shared copy, `scraper/answer_check.js`** (her decision), which Add by
  link runs too (written into the app by `sync_shared`): the shape above, and every claim word ("first",
  "only", "largest"…, matched in each venue language) and every number in the description on its page.
  A refused answer is **asked for again with its reason, never edited by hand**; nothing is written until
  all pass. Cases: Pontormo's "first" (a link); in the imported 15 Oct run, Brera's "25 confiscated
  paintings" (the page says 52), the Rijksmuseum's "120 works" and "100 highlights" (no number on either
  page) — imported as swept (her decision: a fix never changes a run already swept). AC- tests.
- **Process is enforced by a hook:** `.claude/hooks/confirm-subagent.sh` asks
  before any subagent spawns, matching both `Task` and `Agent`, and rewrites the
  approval text to lead with the MODEL and its effort ("SESSION DEFAULT" when
  none was set).

## Rejected — do not re-propose

- Giving the compressor her ledger (and it would be wrong: a blank summary
  should still be filled).
- The app's `sameExhibition` as the cache key (right question for the ledger,
  wrong one here).
- A fingerprint of the raw text as the key (recompresses every trivial edit).
- A word-overlap threshold in code deciding whether a change matters.
