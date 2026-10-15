# Doc rules — editing this guide, and code comments

## Editing this guide — and the side docs

Loaded in full at the start of every session, so every line costs something every
time. It once grew to 2,905 lines, mostly run-by-run stories. The rules:

- **Record the conclusion, not the journey.** Results, decisions and the lesson —
  never the order things happened in. When a finding is overturned, replace the
  passage; git is the archive.
- **Only OPEN work carries its backstory** — enough for the next session to pick
  it up cold. When the item closes, cut it to its result.
- **No dates on decisions.** Write "her decision" or "her judgement call",
  never a date. A date stays only where an open item's story needs the
  sequence (what happened, then what was decided a week later), names a run,
  or is a deadline.
- **Moving text to `docs/` is not a way to keep it.** Compress it first, in
  place, then move it. A side doc holds evidence a future session will need,
  never a transcript.
- **Every file has a line budget** — `node scraper/doc_budget.js` (her decision;
  runs at the end of `npm test`). Over budget warns and never fails a
  test: the clean-up is a separate session, away from active work — never the
  session that tripped it, mid-task. Raising a budget is her call.
- **The guide check** — `node scraper/guide_check.js` (runs at the end of `npm test`, warns, never
  fails): every `docs/` path named anywhere exists, every `§` pointer lands on a real heading,
  every side doc is in the §3 index, the guide's sections are present and in order. Run it after
  moving, renaming or renumbering anything.
- **The clean-up is the "Guide review" routine** — a fresh session on the 15th
  and 30th (28th in February — a second routine), 7:50am Sydney, push to her; it follows
  `.claude/skills/guide-review/SKILL.md` (fix what has one answer, ask her
  about her decisions and anything untraceable). She can also ask for it any time.
- **Anything derivable from the repo is printed by a script, not typed here**
  (`scraper/venue_status.js` replaced the venue table).
- **Put the trigger next to the code, not in an index here.** A comment above the
  date parser saying "read `docs/scraper.md` first" fires because the session is
  already looking at that line.
- **Never duplicate a code comment into this guide.** One copy drifts, silently.
- **Never use `@path` imports here** — Claude Code loads those eagerly.

## Code comments and decision history

Long dated comments ("her ruling, 22 Sep…", "WHAT BROKE…", "DO NOT PUT IT
BACK…") make the code read as a case history, not steps to follow. These rules
hold on every branch, `claude/ledger-cloud` included.

**A comment may say only:**
- What the block does, and any rule the code does not show. Present tense, a few lines.
- A pointer to the decision behind a rule — the case and where the reasoning lives:
  `// Sold out outranks "Add to cart" (Morgan Tarot; docs/app.md).`
- A one-line warning where undoing it would bring back a known bug:
  `// Lowercase scheme and host only: folding the path merged two exhibitions (docs/scraper.md).`
- A short section label a test uses as an anchor (below).

**Never:** how a problem was found, what was tried, or why an earlier version
was wrong; her quotes or paragraphs of her reasoning; headings such as WHAT
BROKE, WHY or HER RULING; anything over about five lines; code that is gone
("this used to…") — git keeps it.

**Where the history goes:** app decisions in `docs/app.md`, scraper decisions
in `docs/scraper.md`, in the section for that code. Each as its conclusion: the
rule, one sentence on why, the case, the functions it touches. One
entry per decision — update an existing one, never add a second. Within budget
and compressed first (above); the narrative stays in git.

**Protect her decisions with tests, not prose.** When she decides how something
behaves, add or update a fixture that fails if it is undone, named after the
case ("Morgan Tarot: sold out beats Add to cart"). A comment can be overlooked;
a failing test cannot.

**Test anchors.** The harness finds its place in the JSX by comment text
(`// URGENCY COLOURS, ONE SET PER THEME`, `// WHAT A QUARANTINE REMEMBERS.`; §4
"Tests"). Before removing or rewording a comment, grep `scraper/fixtures/` for
it. Keep an anchor as a short label, or move the test to a new anchor in the
same change — never leave a test pointing at nothing.

**When editing code:** update the comment already there rather than adding one
beside it; delete any comment the code no longer matches; a long history
comment on a function you change moves to the docs, compressed, in the same
change. Leave comments elsewhere alone unless the task is a tidy-up. Behaviour
changes and tidy-ups go in separate commits, so a tidy-up can never hide a
change in behaviour.

**Exceptions:** the numbering rule beside `APP_VERSION` stays, as short as
possible. The SHARED block's comments come from the scraper (`dates.js`,
`compress_prompt.md`, `compress.js`, `sweep_prototype.js`'s `VENUES`): apply
these rules there, run `node build/sync_shared.js`, then the full `npm test`.
Never edit the block directly (§5.4).
