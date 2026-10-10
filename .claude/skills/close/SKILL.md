---
name: close
description: Ends a working session the same way every time — updates the guide for this session's work, clears the working space, and gives her the fixed closing summary. ONLY when she types /close — never started by a session on its own.
disable-model-invocation: true
---

# Close — update the guide, clear up, report

Runs only because she typed `/close`. Same steps, same summary, every time.

## Never, as part of closing
- Archive the session.
- Delete a branch.
- Republish the app.
- Cancel a routine, reminder or `send_later` this session did not create.

## Steps

1. **Finish what is in hand.** Commit any finished work. Half-done work is
   not finished here: name it under "Open for next session".
2. **Update the guide for this session's work** — `CLAUDE.md` and the
   `docs/` file for the area touched. Its own rules ("Editing this guide"):
   record conclusions, not the story; cut a closed item down to its result;
   leave an open item enough backstory to be picked up cold; no dates on
   decisions. Commit it on its own.
3. **Clear the working space.**
   - Delete everything in this session's scratchpad.
   - Stop any background job this session started.
   - Cancel a check-in or reminder only if this session created it and its
     work is finished.
4. **Push** (`git push origin <branch>`, retrying on a network error), then
   run `node .claude/skills/close/close_check.js <scratchpad dir>`.
   Exit 1 = something is uncommitted or unpushed: fix it and run it again.
   **Over line budget does not hold up closing** — it is left for the Guide
   review routine; say so in one line under "Needs you" only if a file went
   over this session.
5. **The summary** — exactly these four headings, plain English, short:

```
**Done this session**
- …

**Pushed:** <commit> on <branch> — or "nothing to push"

**Open for next session**
- … — or "nothing"

**Needs you**
- … — or "nothing"
```

Nothing after the summary — no offers, no questions.
