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
| `claude/paste-import` | The Paste trial at 50.x — rebuilt on `main` by hand (54), not merged; kept as history |
| `parked` | **The unpublished search work after 43** (catalogue versions as blocks, Stage 1/1b, the live check page's code), from `main` and `claude/ledger-cloud`; also the old abandoned Vasari fix. Never published, never merged back without her say (her decision) |
| `claude/jsx-stitched-intake`, `claude/blissful-volta-jxj5c0` | Merged into `main`; kept as history |
| `claude/quiet-user-agent` | Parked, her decision — do not merge or re-open |
| `claude/personal-tracking-ledgers-z49s2h` | Dead — do not merge |
| `claude/blissful-knuth-snbqci`, `claude/design-questions-87gj6w`, `claude/headless-chromium-claude-code-wl94l0` | Dead — early 7–10 Sep work from before `main` was the trunk (no shared history with it); superseded, do not merge. Kept on GitHub, her decision — never raise deleting them |
| `ccr-60c7f62c-s3etqx` | A session's own branch, last commit 13 Oct ("Version 43.1: Mia's link titles and chip"); not a working branch — what is wanted from it is on `main` or `parked` |
| `claude/artist-filtering-show-titles-v9kb5u` | Search for selected words and the Art Watch name — merged into `main` at 57; kept as history. Its test page: https://claude.ai/artifact/NykJqYtkYaixcM2qr47Hbp |
| `claude/met-connection-experiments` | Abandoned — do not merge |
| `claude/playwright-scraper-prototype-z68iko` | Abandoned — merging it would undo the current scraper |
| `claude/restructure-L0`, `claude/restructure-L1`, `claude/restructure-L2`, `claude/restructure-L3`, `claude/restructure-L4a`, `claude/restructure-L4b`, `claude/restructure-L4c`, `claude/restructure-L4d`, `claude/restructure-L4e`, `claude/restructure-L4f`, `claude/restructure-L5a`, `claude/restructure-1A`, `claude/restructure-1B`, `claude/restructure-2`, `claude/restructure-3a`, `claude/restructure-3b`, `claude/restructure-3c`, `claude/restructure-3d`, `claude/restructure-4a`, `claude/restructure-4a-fixes`, `claude/restructure-4a-filing`, `claude/restructure-4a-pallant`, `claude/restructure-check`, `claude/restructure-4-app`, `claude/restructure-4-scraper`, `claude/restructure-4-keys`, `claude/restructure-5-a1`, `claude/restructure-5-a2`, `claude/restructure-5-a3-check`, `claude/restructure-5-a3a`, `claude/restructure-5-a3b`, `claude/restructure-5-b1`, `claude/restructure-5-b2`, `claude/restructure-5-c1` … `-c7` | One per restructure layer, work item or 4A fix (docs/restructure.md): opened from `main`, merged back once its gates pass; kept as history |
| `claude/restructure-4a-case3` | The waiting-room test with a test venue name, kept off `main` |
| `claude/v59-1` | 59.1 (the Theme chip's count, the venue scrubber) — merged into `main`; kept as history |
| `claude/restructure-fixes` | The fixes after item 4 — merged into `main` at 59.2; kept as history |

**Holding a push for another session — her decision.** When she says a
session must wait for another:
- **The waiting session** commits locally, pushes nothing and does not ask about
  it. It waits for a message from the named session (cross-session
  `send_message`), then pulls `main`, merges, runs the test group for the work it holds
  (`docs/testing.md`; none for guide or docs alone) and pushes to `main`.
- **The finishing session**, once its work is on `main`, messages the waiting
  session by the title she gave (`list_sessions` finds it) that it may push.
- Unpushed work is lost if an idle container is reclaimed. Only if that is a
  real worry: push to `parked` — that branch, never a new one; delete it once
  the work is on `main`.
