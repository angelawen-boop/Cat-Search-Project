# Branches

## Branching

**`main` is the trunk and the source of truth for app, scraper and this guide.**
Work there. `.claude/hooks/session-start.sh` switches a web session's
auto-assigned branch to `main` before work begins; it refuses if the tree is
dirty or the branch carries unmerged commits, and it fetches first.

Branches separate in-progress work from known-good work, never components.

| Branch | What it is |
|---|---|
| `claude/ledger-cloud` | The cloud ledger trial — merged into `main`; kept as history |
| `claude/theme-shelf` | **The Theme Shelf prototype** (`Theme_Shelf.jsx`, its build and tests), kept off `main` until she decides (docs/themes.md) |
| `claude/period-sort` | The Period sort trial — merged into `main` at 51; kept as history |
| `claude/paste-import` | Import → Paste, on its own test page; stops at 50.x, not yet merged into `main` (open, CLAUDE.md §2.2.18). Its merge is held until the Add-by-link work is settled |
| `parked` | **The unpublished search work after 43** (catalogue versions as blocks, Stage 1/1b, the live check page's code), from `main` and `claude/ledger-cloud`; also the old abandoned Vasari fix. Never published, never merged back without her say (her decision) |
| `claude/jsx-stitched-intake`, `claude/blissful-volta-jxj5c0` | Merged into `main`; kept as history |
| `claude/quiet-user-agent` | Parked, her decision — do not merge or re-open |
| `claude/personal-tracking-ledgers-z49s2h` | Dead — do not merge |
| `claude/blissful-knuth-snbqci`, `claude/design-questions-87gj6w`, `claude/headless-chromium-claude-code-wl94l0` | Dead — early 7–10 Sep work from before `main` was the trunk (no shared history with it); superseded, do not merge. Kept on GitHub, her decision — never raise deleting them |
| `ccr-60c7f62c-s3etqx` | A session's own branch, last commit 13 Oct ("Version 43.1: Mia's link titles and chip"); not a working branch — what is wanted from it is on `main` or `parked` |
| `claude/met-connection-experiments` | Abandoned — do not merge |
| `claude/playwright-scraper-prototype-z68iko` | Abandoned — merging it would undo the current scraper |

**Holding a push for another session — her decision.** When she says a
session must wait for another:
- **The waiting session** commits locally, pushes nothing and does not ask about
  it. It waits for a message from the named session (cross-session
  `send_message`), then pulls `main`, merges, runs `npm test` and pushes to `main`.
- **The finishing session**, once its work is on `main`, messages the waiting
  session by the title she gave (`list_sessions` finds it) that it may push.
- Unpushed work is lost if an idle container is reclaimed. Only if that is a
  real worry: push to `parked` — that branch, never a new one; delete it once
  the work is on `main`.
