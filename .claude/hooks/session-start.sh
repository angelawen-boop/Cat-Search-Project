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
# current branch carries commits that are not on the trunk yet. It never
# discards work.
#
# THE TRUNK IS `origin/main`, NEVER THE LOCAL `main`.
#
# The container holds two bookmarks named main: the real one on GitHub, and a
# local copy that only moves when something moves it. Two separate failures
# came from treating the local copy as the answer:
#
#   * It goes stale the moment any session pushes, so "does this branch carry
#     unmerged work?" was asked against a frozen bookmark and answered yes for
#     30 already-pushed commits. Every following session stood down. Asking
#     `origin/main..HEAD` fixes that — it asks whether the work is on the trunk.
#
#   * Worse, on 11 Sep a container turned up holding a local `main` with a
#     DIFFERENT ROOT COMMIT — an unrelated history, not merely an old one.
#     `git merge --ff-only` cannot join those, so it failed; the `|| true`
#     swallowed the failure; and the hook told the session it had switched to
#     main while leaving it 52 commits behind on a ghost copy. The session read
#     a three-day-old CLAUDE.md and believed it.
#
# So the hook no longer merges. `git checkout -B main origin/main` POINTS the
# local branch at the real trunk whatever its ancestry. The guards above have
# already established there is nothing to lose, and the check at the bottom
# proves the result rather than assuming it. A hook that reports a move it did
# not make is worse than a hook that does nothing.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

note=""
moved="no"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  note="Left the session on its own branch: the working tree has uncommitted changes."
else
  current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

  # Refresh FIRST, so every comparison below is against the real trunk. If this
  # fails (no network), stand down rather than act on a stale bookmark.
  if ! git fetch origin main --quiet 2>/dev/null; then
    note="Left the session on '$current': could not reach GitHub, so the real main is unknown. Fetch by hand before trusting this checkout."
  elif ! git rev-parse --verify --quiet origin/main >/dev/null; then
    note="Left the session on '$current': origin/main could not be read. Check the remote before committing."
  elif [ -n "$(git log --oneline origin/main..HEAD 2>/dev/null)" ]; then
    # Unmerged work of its own. Note that with an unrelated history this is
    # every commit, which is itself a reason to stop and look.
    note="Left the session on '$current': it carries commits that are not on main. Merge them into main when they are ready."
  elif git checkout -B main origin/main --quiet 2>/dev/null; then
    moved="yes"
    if [ "$current" = "main" ]; then
      note="Already on main, refreshed to the current origin/main."
    else
      note="Switched from '$current' to main, per the repo's branching policy. Work here and push here."
    fi
  else
    note="Could not switch to main; still on '$current'. Check why before committing."
  fi
fi

# Prove it. The old hook reported a move it had not made; this one only claims
# to be on the trunk when HEAD actually matches origin/main.
if [ "$moved" = "yes" ]; then
  head_sha="$(git rev-parse HEAD 2>/dev/null || echo 'x')"
  trunk_sha="$(git rev-parse origin/main 2>/dev/null || echo 'y')"
  if [ "$head_sha" != "$trunk_sha" ]; then
    note="WARNING: tried to move to main but HEAD ($head_sha) still does not match origin/main ($trunk_sha). Do not trust this checkout — sort the branch out before reading files or committing."
  else
    note="$note  Verified: HEAD matches origin/main at ${head_sha:0:7}."
  fi
fi

npm install --no-audit --no-fund >/dev/null 2>&1 || note="$note  (npm install failed — run it by hand before npm test.)"

# Hand the note to the session as context.
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Branch policy for this repo: main is the trunk; work and push there, not on the auto-assigned session branch. %s"}}\n' "$note"
