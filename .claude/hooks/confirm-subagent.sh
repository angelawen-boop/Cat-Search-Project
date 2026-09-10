#!/bin/bash
# Ask before ANY subagent is spawned.
#
# WHY THIS EXISTS: the compressor's handoff tells a session to spawn one Sonnet
# subagent and one Haiku subagent, batching every row into each. That is an
# instruction printed by a script, and a script cannot bind a session — it could
# spawn one per venue, one per row, or retry and double up. Nothing in the repo
# can prevent that, because the repo only prints text.
#
# A hook can, because the HARNESS runs it rather than the model. This is the
# only enforcement point that exists.
#
# It does not block; it asks, and shows what is being spawned so the answer is
# informed rather than reflexive. Declining costs nothing — the pending file is
# still there and the work can be done differently.

set -euo pipefail

payload="$(cat)"

# Both names exist depending on harness version; the matcher covers both, and
# this only reads fields, so it is safe either way.
desc="$(printf '%s' "$payload" | jq -r '.tool_input.description // "(no description)"' 2>/dev/null || echo '(unreadable)')"
model="$(printf '%s' "$payload" | jq -r '.tool_input.model // "(inherits this session'"'"'s model)"' 2>/dev/null || echo '(unreadable)')"
agent="$(printf '%s' "$payload" | jq -r '.tool_input.subagent_type // "general-purpose"' 2>/dev/null || echo '?')"

jq -nc \
  --arg d "$desc" --arg m "$model" --arg a "$agent" \
  '{hookSpecificOutput:{
      hookEventName:"PreToolUse",
      permissionDecision:"ask",
      permissionDecisionReason:("Subagent spawn — task: \($d) | model: \($m) | type: \($a). Approve one per JOB, not one per row.")
   }}'
