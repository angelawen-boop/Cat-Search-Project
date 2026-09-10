#!/bin/bash
# Ask before ANY subagent is spawned, and make the question answerable.
#
# WHY: the compressor's handoff asks for one Sonnet subagent and one Haiku
# subagent, batching every row into each. That is text printed by a script, and
# a script cannot bind a session. Only a hook can, because the harness runs it.
#
# WHY IT REWRITES THE DESCRIPTION: the approval dialog shows the `description`
# field and nothing else — not the model, not the reason string this hook
# returns. A session that writes "Compress acq run with Prompt A" produces a
# prompt nobody can act on, because "Prompt A" means nothing at the moment you
# are being asked. So the description is rewritten to lead with the MODEL, which
# is the thing actually being decided, and internal prompt names are expanded
# into what they do.
#
# Every other field of tool_input is passed through untouched.

set -euo pipefail

payload="$(cat)"

jq -c '
  .tool_input as $in
  | ($in.model // "SESSION DEFAULT" | ascii_upcase) as $model
  | ($in.description // "no description given") as $desc
  # Expand the internal prompt names — they are meaningless in a dialog.
  # Strip the internal prompt name out of the sentence, then say plainly what
  # that prompt does. Substituting it inline reads as gibberish
  # ("Compress acq run with write new summaries").
  | (if ($desc | test("[Pp]rompt A")) then " — writing new summaries"
     elif ($desc | test("[Pp]rompt B")) then " — checking old summaries are still true"
     else "" end) as $job
  | (($desc | gsub("\\s*(with|using)?\\s*[Pp]rompt [AB]"; "") | gsub("^\\s+|\\s+$"; "")) + $job) as $plain
  | {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: ("Spawning a \($model) subagent. Approve one per JOB, never one per row."),
        updatedInput: ($in + { description: "\($model) subagent — \($plain)" })
      }
    }
' <<< "$payload"
