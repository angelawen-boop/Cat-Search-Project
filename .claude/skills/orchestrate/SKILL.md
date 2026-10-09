---
name: orchestrate
description: Build or fix something in Cat Watch's app or scraper the careful way — diagnose, write a brief, hand the build to a builder subagent she approves, check its work, report in plain English with only the real decisions. ONLY when she types /orchestrate or, in a session she started, clearly asks for something to be built, fixed or diagnosed. Never for a question or "talk to me about X", and never from a routine (guide review, monthly sweep, sweep QC).
---

# Orchestrate — diagnose, brief, build, check, report

You are the orchestrator. You find the cause, write the brief, hand the building
to a builder, check what comes back as a sceptic, and tell her what she needs to
know. Keep your context light: read what the problem needs, never page all of
`Cat_Watch.jsx`.

## 0. Is this a build?
- A question, or "talk to me about X", is a discussion: answer it and stop.
  Nothing is built until she says.
- Routines never use this skill. They work as their own skills say.

## 1. Take the problem
- Restate it in one plain sentence. Ask at most one question, and only if the
  answer changes where you would look.
- A screenshot is evidence. Read it; never ask about anything in it she didn't raise.

## 2. Diagnose before anything changes
- Follow ONE real case from start to finish: her card, her sweep row.
- **How you look depends on what the work touches** (CLAUDE.md §1):
  - **Scraper:** saved pages and kept pages, no network. Never a sweep to
    diagnose; a sweep is hers to call.
  - **Anything that uses Parallel** (catalogue lookup, Add by link, the shop
    finder): pages fetched live through Parallel now — never saved pages, never
    pages made up for a test. The free "Parallel Search" first; her "Parallel
    Search Key" only after asking her and saying why.
- Name the cause in one sentence, with the function. Say what is proven, what
  is a guess, and what one request would settle it.
- Check CLAUDE.md §8 and her decisions. Never re-propose a rejected idea, and
  never propose dropping a feature as a fix.

### The third-patch check
Before changing a function (or a venue recipe), run:

    node .claude/skills/orchestrate/patch_count.js <file> <name> [<name> ...]

It prints how many commits changed each one in the last 60 days, with their
titles. Read only those titles. **If two or more were fixes for the same kind
of problem, this would be the third patch: do not build it.** Tell her what has
been patched and how often, recommend a proper review of the whole feature, and
wait for her answer.

## 3. Write the brief
In your scratch area, never committed. It holds:
- the cause, with evidence
- the change: the design, the functions touched, and what is out of scope and
  must not change
- every sentence she will see that changes, old → new
- tests:
  - the **whole-path test**: the case that showed the problem, run start to
    finish, failing before the fix and passing after. For Parallel work it is
    built from the text the live fetch actually returned (saved under
    `docs/lookup_results/`), never from made-up pages
  - single-function tests, named after her case when they protect her decision
  - each new test shown to fail when its fix is undone
- the proofs (§5) and what the builder must report back

**Stop and ask her first** when the brief:
- changes anything she sees on screen
- changes or reverses one of her decisions
- would be a third patch (above)
- deletes anything
- publishes

Ask in plain English: what you found, what you propose, your recommendation,
numbered so she can answer "1: yes". Otherwise go straight on.

## 4. Who builds it
**Small enough to do yourself:** one file, a few lines, nothing she sees
changes, none of her decisions touched. Say "doing this one myself", then make
the change and run every check in §5.

**Everything else — one builder subagent:**
- **Recommend a model and effort first**, one line why, and wait for her yes.
  A guide: Sonnet, medium for a contained change with a clear brief; Sonnet,
  high when it spans several functions or the tests are fiddly; Opus only when
  the design itself is still hard. Pass both as `model` and `effort`; the
  approval box shows them.
- `general-purpose`, `isolation: "worktree"`, the whole brief in its prompt.
- Its description says in plain words what it builds. One approval per job:
  send fixes back with `SendMessage`, which asks nothing.
- The builder may use the free "Parallel Search" for live fetches; needing her
  key, it stops and says why.
- The builder commits on its own worktree branch. It never pushes, merges,
  publishes, sweeps, uses her key or changes `APP_VERSION`.

## 5. Check the work as a sceptic
Never take the builder's report on trust.
- Read its diff against the brief, item by item. Anything missing, extra or out
  of scope goes back to the builder, at most twice; after that, tell her what
  is unresolved.
- Run the tests yourself: `npm run test:app`, `npm run test:scraper`, or
  `npm test` when both halves changed. Check the exit code, and grep the output
  for each new test's name.
- Run the whole-path test yourself, and the undo check on at least one fix:
  undo the fix, the test must fail, put it back.
- Parallel work: the real case passes on a fresh live fetch.
- Comments follow CLAUDE.md's comment rules; no dates on her decisions. Before
  rewording a comment, grep `scraper/fixtures/` for it (test anchors). Never
  edit between the SHARED markers — `node build/sync_shared.js`. A behaviour
  change and a tidy-up are separate commits; a tidy's diff touches comment
  lines only.

## 6. Land it
- Merge the builder's branch into `main`, test again, push `main`. Delete the
  builder's branch; never push it.
- **App changes reach her cloud test copy the same day:** check out
  `claude/ledger-cloud`, merge `main`, run `npm run test:app` there (it adds the
  cloud suites), push. Proof: `git diff --stat main claude/ledger-cloud` reads
  the same after the merge as before it — the fix is on both, nothing else
  moved. A conflict where both sides changed the same logic → ask her. Cloud-only code never goes to `main`; that merge is her call (§7.1).
- She has said this session waits for another → commit, push nothing, and
  follow CLAUDE.md §1 "Holding a push for another session".

## 7. Report to her
House rules: plain English, short, spoken to her.
- **What changed**, and **what you'll see** after the next publish, a line each.
- **Decisions**: only the real ones, numbered, each with your recommendation.
- **What to try** after the next publish: one or two cards, and what each
  should show.

Then, after the report and never before, update `docs/` and CLAUDE.md as
conclusions.

Publishing is a separate step: only when she says, only after she has closed
the page, following `node build/build_app.js` (CLAUDE.md §1, §4). `APP_VERSION`
moves then.

One job per session where possible. A job that ends with something still open
goes into CLAUDE.md §7, so a fresh session can pick it up.

## The two rules that stop the spaghetti
1. **Third patch → review the feature.** Code already fixed twice for the same
   kind of problem is not patched a third time; she decides what comes next.
2. **Every fix gets a whole-path test.** A fix isn't done until the case that
   showed the problem passes from start to finish, not only the piece that changed.
