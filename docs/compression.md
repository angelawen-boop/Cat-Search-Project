# The compression step — design and evidence

Moved out of `CLAUDE.md` on 12 Sep 2026. **Read this only when changing
compression.** The component is built, tested and signed off; the trunk guide
carries the one-paragraph summary and the commands.

---

### Settled 10 Sep 2026 — how compression works

**The design principle, and it is hers:** *the model is the only part of this
pipeline that thinks. Do not make it do dumb work for code to be clever on top
of.*

That sentence reversed the design. The first proposal had the compressor run
**blind** — no memory of anything — which forced it to rewrite all ~350 rows
every sweep so that code could then discard the ~340 that had not meaningfully
changed. Her objection: *"it feels upside down, to make the model dead lift 500
times so code can take the 3 bench presses that matter."* She is right, and the
cause was mine: insisting on statelessness is what created the waste.

**Give the compressor one piece of memory and it turns the right way up.**

It reads **the previous run's compressed CSV** — already committed in
`scraper/output/`. Not her ledger: none of the ledger objections apply, the
file is always present, and it is scraper output matched against scraper
output rather than against a ledger months old.

Then, per row:

| Raw text vs last run | What happens | Model calls |
|---|---|---|
| Identical | Reuse last run's wording | **none** — code, cannot be wrong |
| Changed | Model gets the OLD wording *and* the new raw text, and answers one question: **is the old summary now false?** No → return it unchanged. Yes → rewrite | one |
| Never seen | Write fresh | one |

Measured on the three committed sweeps of 10 Sep: **79 of 80 rows matched
across runs**, and **genuine venue rewording was zero**. So the reuse rate is
near total and the model makes a handful of real decisions per sweep instead of
350 mechanical ones.

**"Is the old summary now false?" is the right test, and it is hers.** A blurb
can differ in infinite trivial ways; the only one that matters is whether what
the ledger says has stopped being true. *"Monet's sculptures"* becoming
*"Monet's paintings"* is a rewrite. Promotional copy becoming past tense is
not. That is judgement about the outside world, so it belongs to a model
(Section 1) — and **review-and-edit beats write-from-scratch**, which is why
the old wording is handed over rather than withheld.

**Model non-determinism cannot cause drift**, and this is by construction, not
by hope. Where the blurb is unchanged the model is never asked, so it cannot
answer differently tomorrow. An earlier proposal leaned on temperature zero and
a content-focused prompt to achieve this; **that was overstated** — temperature
zero only stabilises *identical* input, and nothing forces a reworded blurb to
produce the same words. Reuse-by-code is the guarantee; prompt choices are not.

**Matching rows between runs:** venue + URL, falling back to venue + title.
URLs do change — current-to-past path moves, and venues renaming for no reason
— which is why the fallback exists. The failure is soft in both directions: a
miss means writing fresh, which is merely today's behaviour; a false match
means the model is handed the wrong old summary, but it is also handed the new
raw text and asked whether it is still true, so it rewrites.

**A reuse caused by a failed page must say so in `notes`.** If a detail page
did not load, the summary column is empty and reuse would silently paper over a
scraper failure — the exact class of invisible breakage the 10 Sep shutdown bug
belonged to. Reuse is honest; hiding why is not.

**Which rows get compressed: all of them.** The compressor cannot tell "closed
and already in her ledger" from "closed and new to her" — only the app knows
that, and only after the CSV exists. Her delta includes past exhibitions the
August seed missed, and those arrive as Add cards that must carry a
description. With reuse doing the work this costs almost nothing anyway.

**What the app does with them — her table, 10 Sep:**

| Ledger state | Sweep says | App |
|---|---|---|
| Not in ledger at all | anything | **Add**, always carries the summary |
| Closed, has a summary | different summary | **no card** — what the show WAS has not changed |
| Closed, no summary | has one | **fill** |
| Open or upcoming, no summary | has one | **fill** |
| Open or upcoming, has a summary | different | **edit card** |
| Any | summary blank | nothing — `consider()` already returns early on an empty value |

Everything above maps onto distinctions the app already computes: `fill` vs
`change` at `analyzeProForma`, and open-vs-closed from the end date. The only
new behaviour is dropping summary *changes* on closed shows.

### Which model, and how it is reached — settled 10 Sep 2026

**Sonnet writes fresh summaries. Haiku judges whether an existing one went
stale.** Measured on 27 National Gallery rows with the NG examples removed, both
models given the identical prompt and the identical 14 Rijksmuseum examples, so
the model was the only variable.

Haiku learned the FORM in 14 examples and never lost it — length, noun phrase,
full stop, no colons, no fabrication. What it could not do is find the *point*:
for an exhibition called *Renoir and Love* it wrote "Renoir capturing emotion
and connection", walking past the word in the title. Her verdict: *"reads like a
cereal box ingredients list."* Sonnet found the point AND fabricated less,
naming real specifics the page carried — Scrub the racehorse, Die Brücke and Der
Blaue Reiter — and reproducing her Wright of Derby wording exactly. Haiku scored
**14 of 14** on the judgement cases, which is constrained work and suits it.

**So the specificity-versus-safety trade-off does not exist.** Sonnet, asked for
the specificity that made Haiku stumble, found real specifics instead of
reaching past what the page supported.

**Correction, same day:** Haiku was also reported as inventing an artist,
"Brâncuși". It did not — the Acquavella page names him, and the check searched
for the ASCII spelling and missed the diacritics. **Any traceability check must
normalise diacritics first**, or it manufactures fabrications out of ordinary
European names. Haiku's real round-2 errors were two counting mistakes, and the
split rests on comprehension rather than on the withdrawn claim.

**Reached by subagent, not by the session itself.** A session writing the
summaries uses whatever model it happens to be, which silently discards the
measurement above. Spawning a subagent is what pins the model. One subagent per
JOB, never per row — each spawn pays its own start-up cost.

**The prompts live in `scraper/compress_prompt.md`**, with the evidence for the
split and what three rounds of tuning taught. A prompt that exists only in a
chat is lost when the chat closes, and quality changes then become
undiagnosable.

**Still a session, not the API.** Sub-30 rows a sweep deleted the cost argument,
and a session runs a stronger model for free. The API's one remaining advantage
is that it could run unattended — and it is the only version where "exactly two
model calls" is a fact rather than a request. Revisit if scheduled sweeps ever
become the goal; the prompt file is what makes that a transport change and
nothing more.

### Built 10 Sep 2026 — `scraper/compress.js`

```
node scraper/compress.js                  plan the newest run
node scraper/compress.js run_2026-...     plan a named run
node scraper/compress.js <run> --apply    write sweep_compressed.csv
node scraper/compress.js --examples       print the few-shot pairs
node scraper/compress.js --recompress     ignore memory, ask for everything
```

Planning writes `compress_pending.json` — only the rows that need words. A
session writes `compress_answers.json` beside it. `--apply` writes
`sweep_compressed.csv`, **which is the file she imports**. If nothing is
pending, planning writes the file outright and there is no second step.

`compress_cli.js` holds the command line so `compress.js` stays importable by
the fixtures. `compress.test.js` covers the decision logic, matching, CSV
quoting and validation — 30 fixtures, no network, no model.

**The target length came from her data, not from us.** The guide said "12
words" for a long time. Measured across all 110 seed summaries: **minimum 3,
median 6, maximum 10, and every single one ends with a full stop.** So the cap
is ten words and the shape is a noun phrase. Anything longer is refused rather
than truncated.

**The prompt is examples, not rules.** `--examples` builds 29 pairs of (raw
curatorial text → the summary she approved) by matching the app's seed set to
exhibitions the scraper has since collected text for. That teaches brevity,
noun phrases, naming the artist and the hook, and no promotional language far
better than any list of instructions. Nothing in it is written by hand, and it
rebuilds itself as the seed set changes. The Met's 51 seed entries are
unusable — it is blocked, so there is no raw text to pair them with.

Only two rules stay written down, because examples cannot demonstrate them:
never state anything not in the raw text, and refuse text that is not a
description at all.

**Two flaws surfaced by running it, both fixed:**

1. **There was no way to say "this is not a description".** Acquavella's James
   Rosenquist row is a bare link and nothing else. The script offered a valid
   string or a hard failure, so the only way past it was to invent a summary —
   the exact thing keeping raw text in the record exists to prevent. An answer
   of `null` is now a recorded decision: the summary stays empty and the row
   says why. A *missing* answer still stops everything, because that is an
   oversight rather than a decision, and the two must not look alike.
2. **A skip was forgotten immediately.** On the very next sweep that row came
   back as "never seen before" and was asked again — forever, every run. The
   skip is now remembered by its note, and re-asked only if the venue writes
   something real. This is the same forever-return trap as a rejected Add card.

**Verified end to end, 10 Sep.** First compression of a 15-row Acquavella
sweep: 15 asked, 14 written, 1 skipped. Second sweep of the same venue:
**14 reused, 1 remembered skip, zero model calls.**

**The plumbing for a CHANGED blurb is proven too.** One sentence was appended
by hand to Acquavella's Tom Sachs text and the run re-scored: 13 reused, 1
remembered skip, **exactly one row asked** — and that question carried the old
wording, `"Tom Sachs remaking Picasso in bronze."`, beside the new text, which
is what makes review-not-rewrite possible.

**Be precise about what has NOT been tested — corrected 11 Sep 2026.** This
paragraph previously said nothing showed a smaller model could answer *is the old
summary now false?*. **That was already false when written**: Haiku scored 14 of
14 on exactly that question, recorded in the section above and in
`compress_prompt.md`. A stale line here sent a later session off to re-do finished
work, which is the specific damage this guide exists to prevent.

**Closed 11 Sep 2026 — the writing half is now proven in production.** She ran a
fresh `acq` sweep (`run_2026-09-11_150556`). The first pass found no changed
blurbs and reused every summary with **zero model calls**, which is the design
working. She then re-ran with `--recompress` deliberately, to force every row to
count as new and make a **Sonnet subagent write all 15 summaries from the 29
example pairs** — the exact path that had never executed. **Her verdict: very
good.** So the examples teach what they were built to teach, and a subagent —
not a session writing by hand — produced the file she would import.

**What that run did NOT test, and it is the other half:** nothing was ever
judged. The first pass found no reworded blurbs, so Haiku was never asked *is
the old summary now false?*, and `--recompress` skips the comparison entirely by
design. That half rests on the 14-case eval, whose answers are still not
committed (see below). Running `compress_eval.js` closes it, and needs no
scraping at all.

### Travelling exhibitions — solved in code, not in the prompt

Acquavella runs one show in New York and Palm Beach. Both rows are kept, but
they must not carry different summaries or they read as unrelated exhibitions.

**The first attempt told the MODEL to spot the pair and match its own wording,
and it failed instructively.** It matched the words and carried Palm Beach's
artist count (21) onto the New York row, which lists 17 — both rows confidently
wrong. Two instructions had collided: "make them identical" and "keep concrete
numbers".

**Now the pair is found in code before anything is asked**
(`groupTravellingRuns()`), using the same title-minus-city rule the scraper
already uses for its "also shown at" note. One question goes out carrying both
cities' text; the single answer is written to both rows. Disagreement is
impossible rather than discouraged, and it costs one call instead of two.

The city list is **mirrored** in `compress.js` rather than imported — requiring
the scraper would drag Playwright into a pure-text step — and fixture **L-008**
asserts the two copies still agree. Without it they could drift and the only
symptom would be a travelling pair quietly getting two summaries again.

Verified: 15 fresh Acquavella rows collapse to 14 questions, and one answer
lands on both Portraiture rows.

### What a script can and cannot make a session do

**A script cannot bind a session.** It prints text; the session decides. So the
handoff naming SONNET and HAIKU is a request, not a limit — a session could
spawn one subagent per row, or write the summaries itself.

**The OUTPUT is enforced anyway.** `--apply` refuses an answer that is missing,
over the word cap, or malformed, and refuses the whole batch rather than writing
half a file. A session that ignores the handoff entirely still cannot produce a
bad CSV; it can only produce weak wording, which is visible on the approval card.

**Only a hook can enforce PROCESS**, because the harness runs it rather than the
model. `.claude/hooks/confirm-subagent.sh` asks before any subagent spawns and
names the task, model and agent type, so a horde announces itself as a horde. It
matches both `Task` and `Agent` — the tool carries either name depending on
harness version, and matching one alone would silently do nothing.

**It also rewrites the subagent's description before the dialog is drawn**, and
that is not cosmetic: the approval prompt shows the description field and
nothing else — not the model, not the reason the hook returns. "Compress acq run
with Prompt A" reached her phone as the whole question, and the prompt name
means nothing at the moment of deciding. The description now leads with the
MODEL, which is the thing actually being decided, and internal prompt names are
replaced by what they do. A spawn with no model set reads "SESSION DEFAULT",
which is itself the warning that the model choice was lost.

### Testing the judgement — `scraper/compress_eval.js`

```
node scraper/compress_eval.js            write the questions
node scraper/compress_eval.js --score    score the answers
```

**Why the cases are authored rather than collected.** Waiting for venues to
rewrite their pages does not work: three sweeps across one day produced exactly
zero genuine rewordings, and the changes that looked like rewordings turned out
to be the shutdown bug. Real material would take months and would still miss
the cases that matter.

`compress_eval.json` holds 14 hand-written before-and-after pairs, each with the
summary we already have and the verdict expected. They cover the changes
actually seen on these venues: promotional copy rewritten into past tense,
opening hours appended, a related-events list appended, a blurb cut to a
fraction of its length, a language switch — all of which must **keep** the
summary — against a changed medium, a changed count, a named artist dropped
from a group show, a second artist added to a solo show, and an address reused
for a different exhibition entirely, which must **rewrite**. Two more must be
**refused**: a curator biography, and consent boilerplate (the Borghese
cookie-banner failure, in summary form).

**The verdict is read straight off the answer** — identical to the previous
summary means keep, a different string means rewrite, `null` means refuse. That
is the same interface the compressor uses, so nothing here is a mock. Wording
quality is not scored; it is printed for her to read.

**Two cases are marked `arguable` and cannot fail a run:** a travelling show
changing city when the summary names no city, and a show postponed
indefinitely. Neither has a single right answer, and the second decides whether
the summary column ever carries status. A disagreement there is a conversation,
not a defect.

**The harness itself was checked against three answer sets**, because an eval
that cannot fail is worthless: answering "keep" to everything — the likeliest
lazy failure — scores **7 of 14 and exits non-zero**; correct verdicts score 14
of 14; correct verdicts with over-long rewrites are caught as invalid. Wrong,
invalid and unanswered all fail the run; disputed does not.

**This is aimed at whichever model does the work in production**, expected to be
Haiku through the API. It is deliberately not a test of a session writing
summaries by hand, which proves nothing about what runs unattended.

**Small gap, noted 11 Sep: the answers are not committed.** The 14-of-14 score was
produced in-session and the answer file was never written to the repo, so the
result survives only as prose here. A later session cannot re-score it without
re-answering all 14 cases. Not a defect — the eval itself is committed and
re-runnable.

**She has declined to re-run it, 11 Sep, and that is settled — do not raise it
again.** The eval was run and scored 14 of 14; only the saving of the answers was
missed, and re-answering 14 cases to produce a file is not worth her session time
against work that is actually outstanding. If the eval is run again for some other
reason, commit the answer file beside `compress_eval.json` that time. Do not run
it solely to fill this gap, and do not list it as a blocker on anything.

**Rejected along the way, with reasons, so they are not re-proposed:**
- **Give the compressor her ledger** so it can skip rows she already has. Puts a
  ledger decision inside the scraper chain, needs the ledger file present on
  whatever machine runs it, and is *wrong*: an entry already in the ledger with
  a blank summary should still be filled.
- **Reuse the app's `sameExhibition` as the cache key.** It asks the right
  question for the ledger — *is this the same exhibition?* — and the wrong one
  here, which is *will the same wording still be correct?* A past-tense
  rewrite is the same exhibition and a stale summary.
- **Fingerprint the raw text as the cache key.** Correct about identity, exactly
  backwards on cost: it recompresses on every trivial rewording, which is the
  noise the whole design exists to prevent.
- **A word-overlap similarity threshold in code** deciding whether a change is
  meaningful. This is the "upside down" case in its purest form — code making
  the judgement call the model should make.

### Superseded — the earlier framing of this decision

- **Where summary compression happens.** The scraper
  writes raw text either way, so nothing built so far has to change whichever
  wins. Three things are already settled about it:
  - **A script owns the CSV; the model only ever supplies a string** (Section 1).
    It never edits the file, so it cannot drop or reorder a row.
  - **A separate pass over the finished CSV** is the only candidate that can be
    re-run without re-scraping. Since the wording will take two or three
    attempts to get right, that difference probably decides it.
  - Keeping the raw text is what makes fabrication structurally impossible — the
    compressor can only compress what is in the record.

  Still open: whether the words come from a session or a script calling the
  API. Same safety either way; different cost and setup.

  **It must also detect text it should not be compressing** — a summary that is
  actually ticketing copy or a curator biography (DEF-03). It flags and stops
  rather than compressing nonsense. But that is a second net, not the first one:
  bad text must not be let through on the assumption this stage will catch it.
- **Haiku vs Sonnet for the in-app catalogue lookup.** Haiku passed the easy cases cheaply and correctly but hasn't been tested on hard ones — touring shows, foreign-language catalogues, ambiguous or retitled shows — where a lighter model may return the wrong book or a wrong ISBN. Decide with one side-by-side session on known-tricky catalogues; failures are visible on click. Not weeks of live use.
- **Running the scraper on her own machine — which is also the answer for Met
  and Morgan.** Parked, not scheduled. These were tracked as two items until
  10 Sep; they are **one**. The blocks are aimed at this datacentre's IP, so a
  Claude Code session on her laptop clears them and gives local runs at the same
  time. Nothing else has to change.

  This supersedes "do a manual Chat Claude sweep for those two". Chat Claude
  cannot read this guide and has no project context, so it is the last resort,
  not the plan (Section 1). Whatever gathers those rows writes them into the pro
  forma **through a script**, never by hand.

  What is actually true about it:
  - ~~**The blocks would very likely lift** from a home connection.~~ **Tested
    11 Sep and FALSE for the Met** — same 429 from her Chromebook on her home
    internet. It is a Vercel bot checkpoint, not an address block (see 6a).
    **Morgan WAS retested from her machine** and returned the same 403 — so the
    local route does not rescue it either. See the scoreboard in Section 6a:
    Morgan is a Chat Claude venue.
  - **Neither recipe has ever been exercised.** All we have established is that
    the door is shut. Which links are exhibitions, where the title sits, where
    the dates sit — all copied from venues that do work, none tested. Expect a
    first run that needs diagnosing, like Borghese's first run returning the
    navigation menu. Met's year dropdown is written and never once clicked.
  - **The laptop route itself is proven** (11 Sep). She set up Linux on a
    Chromebook, installed Node, cloned the repo, installed Chromium through
    Playwright and ran a two-venue sweep that produced correct output and pushed
    back. So "run it locally" is a real option now rather than a theory — it just
    is not the answer for the Met.
  - **Both container-specific blockers are now cleared** (8 Sep). The hardcoded
    Chromium path is gone — `resolveChromium()` tries Playwright's own answer
    first, then whatever is actually installed, newest first. Both halves are
    needed: this container has `chromium-1194` while Playwright's default points
    at `chromium-1243`, so either value alone is wrong somewhere. The network
    bridge was already fine — with no proxy set, `proxyAgent` is undefined and
    Node connects directly.
  - **Setup on a local machine, three commands:** `npm install`, then
    `npx playwright install chromium`, then `node scraper/sweep_prototype.js`.
    The middle one is needed on a laptop but **not** in this container, where
    Chromium is pre-installed and that download is blocked.
  - Verified by inspection, not by running: the script imports only playwright,
    node-fetch, https-proxy-agent and Node's own `fs`/`path`, writes beside
    itself via `__dirname`, and reads nothing else from the repo. It is one file
    plus `package.json`. Nobody has actually run it off this container yet.

- **Sweeper brief v3** — the Chat-Claude-era instruction document still needs its URL corrections and a two-attempt URL-unlock rule. Its scope shrinks as the scraper covers more venues, but it does **not** disappear: the venues the scraper cannot reach are precisely the ones where a human-driven Chat Claude route still has a chance, because it comes from a different network and behaves like a person browsing. Expect the brief to end up as the fallback procedure for blocked and novel-problem venues rather than the main sweep.

### PARKED until the 21-venue run — how the three collection routes join up

**Her decision, 11 Sep 2026, and the reasoning is the point.**

Six venues now need **three different routes** (see the scoreboard, Section 6a):
Claude-run scrape, her local scrape, and Chat Claude reading a site by hand.
Each produces its own file, and joining them into one importable CSV is a real
design job.

**She has parked it deliberately, and this is not procrastination:**

> It doesn't make sense to split the task three ways and produce numerous
> documents. If I was solving world hunger I could finesse a beautiful sequence
> for it all. But practically — once I have gone through all 21 venues and know
> how many Claude scrape can do, how many need my local machine, and how many
> the scraper can't do at all, then I can make a more reasonable overall design.

**So: do not design this pipeline before step 2 of the work order has run.** The
shape of the answer depends entirely on the split, and right now the split is
known for six venues out of twenty-one. Designing it now means designing for
proportions we are about to discover are wrong.

**What was worked out before parking, so it is not re-derived:**

The flow would be: Chat Claude reads the site and writes the values into a
document → a script in `scraper/` turns that into pro-forma rows → those join a
normal run directory → compression runs as usual → she imports the compressed
file.

**A script does the CSV writing, not Chat Claude — but be accurate about why.**
Chat Claude is demonstrably *capable* of writing a correct pro forma; that is
the entire origin of the Sweeper Brief, and those CSVs imported fine. The
argument for a script is narrower: Morgan's rows would then be built by **the
same code** as every other venue, so they cannot drift as the pro forma changes,
and the rules only have to be right in one place rather than re-followed
correctly every time. **An earlier draft of this section overstated it as a
correctness risk on Chat Claude's part. That was wrong and she corrected it.**

Two sub-decisions left open:
- **What the intermediate document looks like** — JSON (strictly checkable) or a
  labelled text block (`Title:`, `Opens:`, `Closes:`, `URL:`, `Description:`),
  which she can eyeball before the script touches it. The labelled form is the
  better instinct: it puts a human check at the cheapest point to catch an error.
- **Whether hand-collected rows land in the same run directory** as that day's
  scrape, so everything compresses and imports as one file, or stay separate.

### Parked, not accepted

- **Shop links can be stale or dead.** The link comes from the search index, not a live page check, so the lookup can return a delisted or 404ing URL while still labelling it "in shop". The obvious fix — point the shop link at an ISBN search — **doesn't work**, because museum shops search by title, not ISBN. Open problem, not a solved one.

