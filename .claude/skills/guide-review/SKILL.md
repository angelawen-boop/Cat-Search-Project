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

**The gate — the reading and the nine steps below are enforced by code, in order.**
`node scraper/guide_review_gate.js start` first (clean tree): it writes
`.claude/guide_review_ledger.json` — a row per file, a row per §2.2 section —
and names lines to copy out of each file. Then `node scraper/guide_review_gate.js
step` after each step's work: a step a script owns (1 the mechanical check, 2
facts against the repo, 8 nothing lost, and the duplicate and lost-lesson
tests) is run by the gate itself; a judgement step (the reading, 3 open work,
4 lessons, 5 diaries and overturned rules, 6 contradictions, 7
untraceable lines, 9 budgets) needs its proof of work in the ledger, which the gate
checks. **A step cannot pass before the one before it, and a push is refused
by a hook until all stand.** What the gate lists is work, not findings.
`done` writes `.claude/guide_review_report.md`.

Per file the ledger asks for: the lines copied out exactly, `diagnosis`
(clean | diary | history | duplicate | misplaced | dense | mixed), `finding`
(what is wrong, or why it is fine), `action`, `remaining` ("nothing" unless a
blocker), `overturned`, `contradictions`. A file is not fine because its line
count is under budget: diagnose it and clean it whatever its size. A file may
stay over only if it is already-compressed text more than 25% over, with a
quoted blocker, its reason and the lines it would need — the gate then offers
her a budget rounded to the next 50, never a bare "+1".

**First, before step 1 — read.** **Read `CLAUDE.md` in full, then every file under `docs/`, then the skill
   files that cite the guide (`.claude/skills/*/SKILL.md`).** Run
   `node scraper/doc_budget.js`, `node scraper/venue_status.js`,
   `git log --since="16 days ago" --stat` and `git log --oneline -40`.

1. **Run the mechanical check:** `node scraper/guide_check.js`. It
   prints every missing path, every `§` pointer that lands on no heading,
   every side doc missing from the index, any missing or misordered section,
   and the list of side docs that name another side doc. Fix what it flags.
   It cannot tell whether a pointer lands on the RIGHT section — spot-check
   five.
2. **Check every factual claim you can against the repo:** file and script
   names exist; fixture ranges exist (`grep` the fixture files); version
   numbers match `APP_VERSION` on `main` and on `claude/ledger-cloud`
   (`git fetch origin claude/ledger-cloud`); branch list matches
   `git ls-remote --heads origin`; counts and run folders named in open work
   exist under `scraper/output/`.
3. **Open work (§2.2):** for each item, look at the commits since the last
   review. Finished → cut to its one-line result or remove it. Still open →
   keep its backstory, enough for a cold session to pick it up. Check the shape
   rules above: nothing standing in 2.2, no ideas nobody is working on.
4. **"Do not re-break" (§4.1):** merge new entries into the lesson they
   illustrate; one lesson, one line where possible. Never drop a lesson.
5. **The three tests, for every doc:**
   - **Diaries** — events narrated in order ("first we tried…, then…"). Cut to
     the result, the decision and the lesson. If the evidence is worth keeping,
     compress it FIRST, then move it to the right doc; a side doc is never a
     place to park text uncompressed.
     **A version-by-version log** (e.g. "Before that 53.9: … Before that 53.8: …")
     is a diary: keep the last few versions, and for older ones keep only what a
     later session still needs — her decisions, judgement calls, lessons, open
     items, each with just enough background to carry on cold. Compress, never
     dump: not a verbatim move, not a lazy trim. The full text stays in git.
   - **Copies of facts kept elsewhere** — the same fact in two places, or a
     hand-typed copy of what a script or the code prints (venue tables,
     addresses, counts, fixture lists). Keep one copy; point to the script.
   - **Overturned rules** — a rule the code or a later decision no longer
     follows. The code wins over prose. Two prose decisions that disagree →
     ASK, don't pick.
6. **Contradictions:** the same fact stated two ways (in the guide, between the
   guide and a doc, between a doc and the code).
7. **Anything you cannot trace** — a line whose origin, meaning or current
   truth you cannot establish from the repo and its history
   (`git log -S"<phrase>" -- CLAUDE.md docs/` is the tool) — gets
   investigated as far as the repo allows, then goes in the report as a
   question with what you found.
8. **Nothing lost.** After the cutting, check each changed file against the
   original (`git diff`): every decision, judgement call, wording, name and
   number her old text marked is still somewhere in the guide or docs — in the
   new text or its new home. Put back anything missing; shortened is fine,
   gone is not. The gate does this check itself and lists what is gone.
9. **Budgets — measured last, after all the work above.** Every file within
   `scraper/doc_budget.js` (a NEW doc's budget is its size rounded up to the
   next 50), with about 5% over tolerated. **Reading comes first and is
   not optional.** Every file you are asked to clean up is read in full, line
   by line, before you decide anything about it. A line count is never a
   basis for a decision. Then, for each file, largest overage first:
   1. **Diagnose** against how a guide is meant to be written (the shape above
      and `docs/doc_rules.md`): why is it over — a diary or stream of
      consciousness, a version log, history, test lists, duplicated text,
      content that belongs in another doc, or genuinely dense, considered
      text?
   2. **Compress.** Rambling and narrated history are easy and obvious: cut
      them to judgements, decisions, lessons and open items, with enough
      background that a cold session can continue. Do it. Dense text that is
      already compressed is different: be surgical, and never shrink it
      wholesale — cut only what is duplicated, stale or misplaced.
   3. **Check against the original.** Read `git diff`; list what the old text
      held (each decision, judgement call, lesson, open item, pointer, name,
      number) and confirm each is still there or in its new home. Put back
      anything missing. Commit that file on its own once it passes.
   4. **Conclude.** Within tolerance → done. Still over → the only valid
      reason is a specific decision or lesson that cannot be lost; name it.
   **Never accepted as a reason:** the file is large, the work is big, the run
   is unattended, it needs a supervised session, or it is risky. Time and size
   are no limit — the run may take an hour or more. Doing the reading and
   writing in the background is the job; none of it goes to her.
   Raising a budget is hers.

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

**Fix it yourself** — the default. Compressing a diary, history or log,
bringing a file within budget and cutting duplicates are fixes, not
questions. When in doubt whether to fix or report, fix. Do it when the repo
gives exactly one right answer: a stale
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

1. `node scraper/guide_review_gate.js done` — exit 0 — then `npm test` exit 0 and
   `node scraper/guide_check.js --strict` exit 0. Commit the ledger with the review.
   The commit message starts "Guide review:" and holds the per-file findings.
2. Commit on `main` with a message listing what changed, then
   `git pull --rebase origin main` and `git push origin main`.
3. **The report is the gate's own file** — `.claude/guide_review_report.md`,
   written by `done`. Send it as your message, word for word, adding
   nothing: the steps table (a tick where clean; each file still over listed
   as its own row), every document in one row (budget, size now and before, a
   tick or what was done or is still over), then the open items for her and any
   FYI. Plain English,
   spoken TO her. It is short because the work was done, not because it was
   skipped. No "watch" items; no debrief of how the work went (the per-file
   review is in the ledger and the commit message). If you add a sentence of
   your own, it is one line at the end.
