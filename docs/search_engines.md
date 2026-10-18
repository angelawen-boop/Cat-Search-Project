# Search engines — future consideration

Not built, not proposed (her decision); kept so a later session starts from the findings. Nothing here
was checked live unless it says so: limits, prices and connector availability are to be confirmed first.

## What the search can and cannot do — her conclusion

The lookup searches through Parallel: each search call takes several queries and returns **10 results
between them**. A book the engine has not indexed, or ranks below 10, is invisible however good the
queries are. Ranking changes from minute to minute. Her judgement: it is roulette. Only when she
KNOWS a book exists can she re-run Search again until it appears; a book she does not know of, that
does not rank, is missed. Only a new source of web results changes that, never more search steps
(her decision: the search is thorough enough; adding routes is spaghetti).

**The case behind it — Correggio, Dresden.** The English edition (Sandstein, 978-3954989584,
sandstein-kultur.de/shop/correggio-2, dated 2 Dec 2026) never ranked in the first lookup: its title is
the exhibition's English name, so the museum's own pages filled the 10 slots, and the book page's title
names neither show nor museum. The museum's English page labels the GERMAN book (978-3954989348)
"Correggio. Movingly Human". Her re-run an hour later, with the same first three queries, got the
English page 2nd of 10 and filed it correctly — Parallel's results had changed (guess: the page newly
indexed, perhaps after a session's own Parallel search surfaced it). Lookup log records
L1792302616858k119 (missed) and L1792303360912nj6q (found).

## 1. More than 10 results

- **How:** 10 is Parallel's default (`max_results`, "defaults to 10 if not provided"). The app's tool has no
  such argument, but her KEYED connector ("Parallel Search Key") can pin search settings for every call:
  query parameters on the connector address (e.g. `advanced_settings.max_results`) or an
  `x-parallel-search-config` header. A settings change, not app code. The free connector ignores it.
- **Concerns:** the MCP caps a call's excerpts at ~25,000 characters, so more results = thinner text per
  page. Unknown: the maximum allowed, the cost per search, the exact syntax for her connector. A search
  mode (`fast`, `advanced`…) can be pinned the same way. Prove on the agreed cases before keeping it.

## 2. A different search engine / page opener (same process, different processor)

- **Candidates:** Exa, Tavily, Firecrawl (search plus page reading, ready-made connectors); Brave Search
  API (its own index, search only — needs a separate page opener); SerpApi-type services (Google's
  actual results, read off Google's pages for you — paid, and Google does not permit it).
- **How:** a connector on her Claude account, plus an adapter in the app — each service names its tools
  and shapes its replies differently. Parallel also opens every page today (shop, publisher, links),
  so a search-only engine needs an opener beside it.
- **Concerns:** every engine has the same roulette with a different index; switching changes which books
  are missed, not whether. Lesson §4.1: when a tool is swapped the route must not change, and a
  better source is not a complete one. Next step if she wants it: run the app's real queries for the
  agreed cases and cases 10–12 through two or three engines, side by side.

## 3. Google's Gemini in the search

- **Why:** a Google search shows Gemini's AI Overview — Google's index plus an answer, free to her
  (Correggio: it named Sandstein and both languages).
- **How:** not by reading google.com — the app cannot reach it, Google offers its results page to no
  program, and reading it by machine breaks Google's terms. The official route is the Gemini API with
  "Grounding with Google Search" (a free daily allowance, paid beyond — unchecked), reached through a
  connector that someone builds and hosts, with her Google API key.
- **Concerns:** no ready-made connector; a second model in the lookup; Gemini can be confidently wrong
  (Correggio's overview ran both titles together and the ISBNs were not visible), so every answer is
  still checked against a real page, as now.
