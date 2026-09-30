---
name: guide-review
description: The fortnightly outside review of CLAUDE.md and docs/ — finds stale, contradictory, bloated or hand-typed content, fixes what has one right answer, and asks her about anything that is hers to rule on. Run by the "Guide review" routine on the 15th and 30th; also on request ("review the guide").
---

# Guide review — the outside reader

You are the reviewer, not the author. You did not write this guide and you owe
it nothing. **Assume every line is wrong until the repo proves it right.**
The guide rots in predictable ways: work finished but still listed as open,
rulings overturned but still stated, run-by-run stories where a result belongs,
numbers typed by hand that a script prints, side docs used as a dumping ground.

Scope: `CLAUDE.md` and everything under `docs/` (and `.md` READMEs inside it).
**Nothing else.** Never edit `Cat_Watch.jsx`, `scraper/*.js`, `build/`, run
folders, or saved pages — except a code COMMENT that points at a guide section
you renumbered.

## Hard limits — this runs unattended

- **No network to any venue, shop or artifact.** No sweep, no probe, no
  publish, no `Artifact` or `ArtifactData` call. Reading the repo and git is
  all you need.
- **No subagents.** The repo's approval hook would stall the run waiting for
  a click nobody is there to give.
- **Never change a ruling.** Anything that reads "her ruling", "her call",
  "her count", "rejected" is hers. You may move it, shorten its wording or fix
  a fact it rests on that the repo contradicts — never its substance.
- `npm test` must exit 0 before you push. If it was already failing before you
  touched anything, say so in the report and push nothing.

## The review — do all of it

1. **Read `CLAUDE.md` in full, then every file under `docs/`.** Run
   `node scraper/doc_budget.js`, `node scraper/venue_status.js`,
   `git log --since="16 days ago" --stat` and `git log --oneline -40`.
2. **Check every factual claim you can against the repo:** file and script
   names exist; fixture ranges exist (`grep` the fixture files); version
   numbers match `APP_VERSION` on `main` and on `claude/ledger-cloud`
   (`git fetch origin claude/ledger-cloud`); branch list matches
   `git ls-remote --heads origin`; counts and run folders named in open work
   exist under `scraper/output/`; section cross-references (guide ↔ docs ↔
   code comments) point at sections that exist.
3. **Open work (§7):** for each item, look at the commits since the last review.
   Finished → cut to its one-line result or remove it. Still open → keep its
   backstory, enough for a cold session to pick it up.
4. **Contradictions:** the same fact stated two ways (in the guide, between the
   guide and a doc, between a doc and the code). The code wins over prose. Two
   prose rulings that disagree → ASK, don't pick.
5. **Stories:** anything narrated as a sequence of events ("first we tried…,
   then on 27 Sep…"). Cut to the result, the ruling and the lesson. If the
   evidence is worth keeping, compress it FIRST, then move it to the right doc.
   A side doc is never a place to park text uncompressed.
6. **Hand-typed things a script prints:** tables of venues, counts, fixtures,
   commands that drift. Point to the script instead, or report it if no
   script exists yet.
7. **"Do not re-break" (§6):** merge new entries into the lesson they
   illustrate; one lesson, one line where possible. Never drop a lesson.
8. **Budgets:** every file within `scraper/doc_budget.js`. Getting there is the
   finish line, not a reason to cut substance — if a file cannot fit without
   losing a ruling or a lesson, stop and report it; raising a budget is hers.
9. **Anything you cannot trace** — a line whose origin, meaning or current
   truth you cannot establish from the repo and its history
   (`git log -S"<phrase>" -- CLAUDE.md docs/` is the tool) — gets
   investigated as far as the repo allows, then goes in the report as a
   question with what you found. The Frick's "page two" line on 30 Sep was
   one of these: it took a trace through `docs/scraper.md` and the recipe to
   find it was a real, open gap.

## Fix, or ask?

**Fix it yourself** when the repo gives exactly one right answer: a stale
count or version, a finished item still listed, a broken cross-reference, a
story compressed to its result, a duplicated passage, an entry merged into
its lesson, a file brought within budget.

**Ask her** when it needs judgement or a ruling: two rulings that disagree; a
ruling the code no longer follows (report it — don't change either); an
item you can't tell is finished; a line you can't trace; anything that would
remove a rule rather than restate it.

## Finish

1. `npm test` — exit 0, and the budget report all `ok`.
2. Commit on `main` with a message listing what changed, then
   `git pull --rebase origin main` and `git push origin main`.
3. **The report — this is what she reads.** Follow the guide's house rules:
   plain English, short bullets, spoken TO her (never "she"/"her"), no
   visible thinking. Three parts:
   - **Fixed** — what changed, one line each, with line counts before → after.
   - **Questions for you** — each with what you found and your suggestion,
     numbered so she can answer "1: yes, 2: no".
   - **Watch** — anything growing fast or near its budget.

   If nothing needed doing, say so in one line — that is a good result.
