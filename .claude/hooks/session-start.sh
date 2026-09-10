#!/bin/bash
# Cat Watch — session start.
#
# Two jobs:
#   1. Put the session on `main`. Claude Code web hands every session its own
#      branch, and that instruction outranks CLAUDE.md, so the branching policy
#      has to be enforced here rather than written down. See CLAUDE.md,
#      "Branching policy — read this first".
#   2. Install dependencies, so `npm test` works without a manual step.
#
# Safe by design: it refuses to move if the working tree is dirty or if the
# session branch carries commits of its own. It never discards work.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

note=""

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  note="Left the session on its own branch: the working tree has uncommitted changes."
else
  current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

  if [ "$current" = "main" ]; then
    note="Already on main."
  elif [ -n "$(git log --oneline main..HEAD 2>/dev/null)" ]; then
    note="Left the session on '$current': it carries commits that are not on main. Merge them into main when they are ready."
  else
    git fetch origin main --quiet 2>/dev/null || true
    if git checkout main --quiet 2>/dev/null; then
      git merge --ff-only origin/main --quiet 2>/dev/null || true
      note="Switched from '$current' to main, per the repo's branching policy. Work here and push here."
    else
      note="Could not switch to main; still on '$current'. Check why before committing."
    fi
  fi
fi

npm install --no-audit --no-fund >/dev/null 2>&1 || note="$note  (npm install failed — run it by hand before npm test.)"

# Hand the note to the session as context.
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Branch policy for this repo: main is the trunk; work and push there, not on the auto-assigned session branch. %s"}}\n' "$note"
