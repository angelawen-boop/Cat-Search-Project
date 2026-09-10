# The compressor's prompts

**These are the product.** The script in `compress.js` decides *which* rows need a
model and never asks one anything; everything a model is ever told lives here. Keep
them in the repo rather than in a session's head — a prompt that exists only in a
chat is lost the moment the session closes, and there is then no way to tell whether
a change in summary quality came from the venue, the model or the wording of the ask.

Both prompts take the same two inputs: the example pairs (`compress.js --examples`)
and a rows file. Both return **only** a JSON object mapping row index to a string or
`null`. Neither may write a file — her standing rule is that a model touches strings,
never files, so a confused model can produce bad wording but cannot mangle a CSV.

---

## Which model does which job

| Job | Model | Why |
|---|---|---|
| **Write a fresh summary** | **Sonnet** | Open-ended. Requires working out what the exhibition is *about*, which is where model size shows. |
| **Judge whether a summary went stale** | **Haiku** | Constrained: two texts, one question, a checkable answer. Scored **14 of 14** on the authored cases. |

Measured 10 Sep 2026 on 27 National Gallery rows, with National Gallery examples
removed so nothing was given away. Both models were given the identical prompt and
the identical 14 Rijksmuseum examples, so the model was the only variable.

**Haiku learned the FORM and never lost it** — length, noun phrase, full stop, no
colons, and across three rounds it fabricated nothing once the traceability rule was
in. What it could not do is find the *point*. Given an exhibition called
*Renoir and Love* it wrote "Renoir capturing emotion and connection", walking past
the word sitting in the title; given *Monet and Renoir: Painting Side by Side* it
wrote "Monet and Renoir at La Grenouillère", which is true and tells a reader
nothing. Her verdict: *"reads like a cereal box ingredients list."*

**Sonnet found the point and was SAFER at the same time.** Zero fabrications, zero
over-length, zero colons — cleaner on every mechanical measure than Haiku while
being far more specific: "Stubbs's portrait of racehorse Scrub", "Die Brücke and
Der Blaue Reiter", "Shonibare reimagines Gainsborough's famous painting". On
*Wright of Derby* it produced her wording word for word.

**So the specificity-versus-safety trade-off does not exist.** It looked real in
round 2, when asking Haiku for concrete detail made it invent an artist (Brancusi,
in a Tom Sachs show that never mentions him) and report two wrong counts. That was
a capability limit wearing the costume of a trade-off: Haiku invented a specific
because it could not find a real one. Sonnet, asked for the same specificity, simply
found real ones.

---

## What three rounds of tuning taught, before the prompts themselves

**Pressure for specificity makes a small model invent specifics.** Round 1 was
vague; round 2 added four numbered rules demanding concrete facts and numbers, and
produced three confident falsehoods. Vagueness is the safe failure — a thin summary
costs nothing, a fabricated one is believed.

**Rules compete for a budget.** Adding the surname instruction visibly displaced
other things: rows that had opened "First UK exhibition of…" moved onto describing
content instead. Every clause added pushes something else out, so the prompt gets
shorter under pressure, not longer.

**Examples teach form; they cannot teach comprehension.** Haiku had the style right
after 14 examples and never improved on substance. More examples would not have
helped — and could not be had anyway, since the Met's 51 seed summaries can never be
paired with raw text while the venue blocks us.

**Do not add a rule for a minority pattern.** Her summaries lead with significance
("First UK exhibition of Zurbarán") in only **6 of 110**. A rule telling the model to
hunt for significance would make it manufacture that phrasing everywhere.

---

## Prompt A — write a fresh summary

> You are writing very short exhibition summaries for a personal art-catalogue
> tracker. Your ONLY output is text. Do not write or edit any file.
>
> STEP 1. Read this file. It contains real examples of the required style — a
> venue's raw curatorial text, and the summary that was accepted for it:
> `<EXAMPLES_PATH>`
>
> The examples define the style. Study them closely.
>
> STEP 2. Read this file. It has a "rows" array; each row has an "index", a "title",
> and a "raw" field holding the venue's curatorial text:
> `<ROWS_PATH>`
>
> STEP 3. Write one summary per row.
>
> - Maximum 10 words. The examples average about six.
> - End with a full stop. Avoid colons — the accepted summaries almost never use one.
> - Name the artist or artists the exhibition is built around.
>
> NAME THEM THE WAY A GALLERY-GOER WOULD. Surname alone, unless the surname alone
> would be ambiguous. Write "Zurbarán", not "Francisco de Zurbarán". "Shonibare",
> not "Yinka Shonibare". "Velasco", not "Mexican artist José María Velasco". Drop
> "painter", "artist" and similar labels in front of a name — the reader already
> knows. Full names, honorifics and formal titles read stiff and waste words that
> could carry meaning instead.
>
> A FEW ROWS CARRY AN "alsoAt" FIELD. That row is the same exhibition running at
> another of the venue's addresses, and "alsoAt" holds the other city's title and
> its own text, which will differ — the two cities often show different artists.
> Write ONE summary that is true of both, and it will be recorded against both
> rows. So describe what the exhibition IS, not who is in it: a roster named in
> one city may be wrong in the other. Do not mention either city.
>
> THE RULE THAT MATTERS MOST: every word of your summary must be traceable to a
> phrase in that row's own raw text. If you cannot point to where something came
> from, leave it out. In particular:
>
> - Never add an artist, place, medium or date that you happen to know about but the
>   text does not mention.
> - Use a number only if the text states that number. Do not count a list of names
>   and report the total — the page may state a different figure, and the page is
>   right, not your count.
>
> Being vague is a much smaller failure than being confidently wrong. If the text
> will only support something general, write something general.
>
> If the raw text is not a description of an exhibition — a bare link, a curator's
> biography, ticketing or opening-hours copy, cookie or consent boilerplate, a "page
> not found" message, or empty — answer null for that row. Do not invent one.
>
> STEP 4. Output ONLY a JSON object, mapping each row's index (as a string) to your
> summary string, or to null. No commentary before or after, no markdown code fence.
> Every index in the file must appear exactly once.

---

## Prompt B — judge whether an existing summary went stale

> You maintain very short exhibition summaries for a personal art-catalogue tracker.
> Your ONLY output is text. Do not write or edit any file.
>
> STEP 1. Read this file, which contains real examples of the required style — a
> venue's raw curatorial text, and the summary that was accepted for it:
> `<EXAMPLES_PATH>`
>
> The examples define the style. Study them closely.
>
> STEP 2. Read this file. It has a "rows" array; each row has an "index", a
> "previousSummary" (the summary we already hold for that exhibition) and a "raw"
> field (the venue's CURRENT text for it, which has changed since that summary was
> written):
> `<ROWS_PATH>`
>
> STEP 3. For each row, answer ONE question: is the previousSummary now FALSE, given
> the current text?
>
> Venues reword their pages constantly for reasons that change nothing about the
> exhibition — rewriting promotional copy into past tense, appending opening hours or
> ticketing details, appending a list of related talks and courses, cutting the text
> shorter, translating it. None of that makes the summary false.
>
> What DOES make it false is a change to what the exhibition actually is: a different
> medium, a different number of works, a named artist who is no longer in it or newly
> added, or the page now describing an entirely different exhibition.
>
> So, per row:
> - If the previousSummary is still true, output it back EXACTLY as given, character
>   for character. Do not improve, retitle or re-word it.
> - If it is now false, write a replacement in the same style: maximum 10 words,
>   ending with a full stop, stating only what is in the current raw text.
> - If the current text is NOT a description of an exhibition at all — a curator's
>   biography, ticketing copy, cookie/consent boilerplate, a bare link — output null.
>   Do not summarise the wrong thing.
>
> STEP 4. Output ONLY a JSON object, mapping each row's index (as a string) to your
> answer string, or to null. No commentary before or after, no markdown code fence.
> Every index in the file must appear exactly once.

---

## Travelling exhibitions — solved in code, not in the prompt

Acquavella runs one show in New York and Palm Beach. Both rows are always kept, but
they must not carry different summaries or they read as unrelated exhibitions.

**The first attempt told the MODEL to spot the pair and match its own wording, and
it failed instructively.** It matched the words and carried Palm Beach's artist count
(21) onto the New York row (17 artists) — both rows confidently wrong. Two
instructions collided: "make them identical" and "keep concrete numbers".

**Now the pair is detected in code before anything is asked**
(`groupTravellingRuns()`), the question is asked **once** with both cities' text
attached as `alsoAt`, and the one answer is written to both rows. Disagreement is
impossible rather than discouraged, and it costs one call instead of two.

The prompt's only remaining job is to say what kind of summary survives that: one
describing the exhibition rather than its checklist, since the rosters genuinely
differ between cities.
