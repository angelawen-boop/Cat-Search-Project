---
name: guide-review
description: The fortnightly outside review of CLAUDE.md and docs/ — finds stale, contradictory, bloated or hand-typed content, fixes what has one right answer, and asks her about anything that is hers to decide. Run by the "Guide review" routine on the 15th and 30th; also on request ("review the guide").
---

# Guide review — the outside reader

You are the reviewer, not the author. You did not write this guide and you owe
it nothing. **Assume every line is wrong until the repo proves it right.**
The guide rots in predictable ways: work finished but still listed as open,
decisions overturned but still stated, run-by-run stories where a result belongs,
numbers typed by hand that a script prints, side docs used as a dumping ground,
the same fact written in two places, pointers that stopped pointing at anything.

Scope: `CLAUDE.md` and everything under `docs/` (and `.md` READMEs inside it).
**Nothing else.** Never edit `Cat_Watch.jsx`, `scraper/*.js`, `build/`, run
folders, or saved pages — except a code COMMENT, or a line in `.claude/skills/`
or `.claude/hooks/`, that points at a guide section or doc you renumbered or
renamed.

## Hard limits — this runs unattended

- **No network to any venue, shop or artifact.** No sweep, no probe, no
  publish, no `Artifact` or `ArtifactData` call. Reading the repo and git is
  all you need.
- **No subagents.** The repo's approval hook would stall the run waiting for
  a click nobody is there to give.
- **Never change one of her decisions.** Anything that reads "her decision", "her call",
  "her count", "rejected" is hers. You may move it, shorten its wording or fix
  a fact it rests on that the repo contradicts — never its substance.
- **Push to `main` only.** Never to another branch.
- `npm test` must exit 0 before you push. If it was already failing before you
  touched anything, say so in the report and push nothing.

## The shape the guide must keep

The guide (`CLAUDE.md`) is the trunk: house rules, status and open work, the
index of side docs, guardrails, the app explainers, future considerations — and
**pointers**, not content that belongs in a side doc.

- **Sections, in order:** 1 How to work · 2 Where things stand and open work
  (2.1 standing facts, 2.2 open work) · 3 Where the rest lives (the index) ·
  4 Guardrails (4.1 lessons, 4.2 rejected) · 5 The app (5.1 app, 5.2 import csv,
  5.3 scraper, 5.4 Add by link) · 6 Future considerations.
- **Every side doc is one step from the trunk.** The index (§3) names every doc
  and every doc folder with a README. A doc may name another as a "see also";
  nothing a session needs may live only behind such a link, and no side doc
  spawns side docs of its own.
- **2.1 holds standing facts; 2.2 holds what changes.** Background that is
  true of every run (how the routine works) is not open work. An idea nobody is
  working on goes in §6, not 2.2.
- **Content lives in one place.** A rule or fact written in the trunk and in a
  side doc is a duplicate: it stays in the side doc, the trunk keeps a pointer.
- **Her words:** "import csv" (never "the contract"), "her decision" or "her
  judgement call" (never "ruling" or "rule" for her choices).

## The review — do all of it

1. **Run the mechanical check first:** `node scraper/guide_check.js`. It
   prints every missing path, every `§` pointer that lands on no heading,
   every side doc missing from the index, any missing or misordered section,
   and the list of side docs that name another side doc. Fix what it flags.
   It cannot tell whether a pointer lands on the RIGHT section — spot-check
   five.
2. **Read `CLAUDE.md` in full, then every file under `docs/`, then the skill
   files that cite the guide (`.claude/skills/*/SKILL.md`).** Run
   `node scraper/doc_budget.js`, `node scraper/venue_status.js`,
   `git log --since="16 days ago" --stat` and `git log --oneline -40`.
3. **Check every factual claim you can against the repo:** file and script
   names exist; fixture ranges exist (`grep` the fixture files); version
   numbers match `APP_VERSION` on `main` and on `claude/ledger-cloud`
   (`git fetch origin claude/ledger-cloud`); branch list matches
   `git ls-remote --heads origin`; counts and run folders named in open work
   exist under `scraper/output/`.
4. **Open work (§2.2):** for each item, look at the commits since the last
   review. Finished → cut to its one-line result or remove it. Still open →
   keep its backstory, enough for a cold session to pick it up. Check the shape
   rules above: nothing standing in 2.2, no ideas nobody is working on.
5. **The three tests, for every doc:**
   - **Diaries** — events narrated in order ("first we tried…, then…"). Cut to
     the result, the decision and the lesson. If the evidence is worth keeping,
     compress it FIRST, then move it to the right doc; a side doc is never a
     place to park text uncompressed.
   - **Copies of facts kept elsewhere** — the same fact in two places, or a
     hand-typed copy of what a script or the code prints (venue tables,
     addresses, counts, fixture lists). Keep one copy; point to the script.
   - **Overturned rules** — a rule the code or a later decision no longer
     follows. The code wins over prose. Two prose decisions that disagree →
     ASK, don't pick.
6. **Contradictions:** the same fact stated two ways (in the guide, between the
   guide and a doc, between a doc and the code).
7. **"Do not re-break" (§4.1):** merge new entries into the lesson they
   illustrate; one lesson, one line where possible. Never drop a lesson.
8. **Budgets:** every file within `scraper/doc_budget.js`. A NEW doc's budget
   is its size rounded up to the next 50. Getting within budget is the finish
   line, not a reason to cut substance — if a file cannot fit without losing a
   decision or a lesson, stop and report it; **raising an existing budget is
   hers.**
9. **Anything you cannot trace** — a line whose origin, meaning or current
   truth you cannot establish from the repo and its history
   (`git log -S"<phrase>" -- CLAUDE.md docs/` is the tool) — gets
   investigated as far as the repo allows, then goes in the report as a
   question with what you found.

## You review the WRITING, never the project

Your only subject is whether the guide and docs are accurate, current, lean
and consistent. **The state of the project is not your business.** Never ask
her to do, decide or schedule anything about the app, the scraper, sweeps,
imports, publishing, venues or catalogues — even when the guide lists it as
open work and even when it looks overdue. Open work that is still open is
correct as written; leave it, and do not mention it in the report.

A question is allowed only if its answer changes what the DOCUMENTS say:
"line X contradicts line Y — which is right?", "is item Z finished?", "what
does this untraceable line refer to?". If the answer would change what she or
a session DOES next, it is not your question.

## Fix, or ask?

**Dates on decisions:** remove any date stamped on one of her decisions
("her decision, 2 Oct"), and any "ruling"/"rule" wording for her choices,
as `docs/doc_rules.md` says. Keep a date only where an open item's story needs
the sequence, it names a run, or it is a deadline.

**Fix it yourself** when the repo gives exactly one right answer: a stale
count or version, a finished item still listed, a broken pointer, a story
compressed to its result, a duplicated passage, an entry merged into its
lesson, a file brought within budget.

**Moving content:** into a brand-new doc, move it word for word. Into an
existing doc, edit only where the two copies clearly duplicate. Never move a
passage without leaving a pointer behind and updating every pointer to it
(`guide_check.js` proves you did).

**Ask her** when it needs her judgement: two of her decisions that disagree; a
decision the code no longer follows (report it — don't change either); an
item you can't tell is finished; a line you can't trace; anything that would
remove a rule rather than restate it.

## Finish

1. `npm test` — exit 0, the budget report all `ok`, and
   `node scraper/guide_check.js --strict` exit 0.
2. Commit on `main` with a message listing what changed, then
   `git pull --rebase origin main` and `git push origin main`.
3. **The report — this is what she reads.** Follow the guide's house rules:
   plain English, short bullets, spoken TO her (never "she"/"her"), no
   visible thinking. Three parts:
   - **Fixed** — what changed, one line each, with line counts before → after.
   - **Questions for you** — each with what you found and your suggestion,
     numbered so she can answer "1: yes, 2: no".
   - **Watch** — anything growing fast or near its budget, and any side doc
     that has started to name another.

   If nothing needed doing, say so in one line — that is a good result.
