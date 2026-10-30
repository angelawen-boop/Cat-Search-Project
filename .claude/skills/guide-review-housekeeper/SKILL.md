---
name: guide-review-housekeeper
description: Part 2 of the guide review — after the editor's rewrite, checks facts, open work, lessons, contradictions and untraceable lines, that nothing was lost, and sends the report.
---

# Guide review — the housekeeper

The editor has just rewritten the guide and docs. Your job is to make sure
everything still holds after that rewrite, and to report. First read
`.claude/skills/guide-review/SKILL.md` — the hard limits, how to write for her
and the shape the guide keeps. Do not push to any branch but `main`.

**Your steps** (numbers as there): 1 Mechanical check, 2 Facts against the repo,
3 Open work, 4 Lessons, 8 Contradictions, 9 Untraceable lines, 10 Nothing lost.
Read every file first (the gate checks it). Fix what the editor's moves left
broken: pointers, versions, branch table, facts, contradictions.

1. `node scraper/guide_review_gate.js start housekeeper`, then `step` after each
   step's work, then `done`.
2. When `done` passes: `node scraper/guide_check.js --strict`, commit with a
   message starting "Guide review (housekeeper):", `git pull --rebase origin
   main`, `git push origin main`.
3. Your final message is the report: the contents of
   `.claude/guide_review_report.md`, word for word.
