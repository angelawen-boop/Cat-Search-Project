# Brera — saved pages

- `giovanni_agostino_da_lodi_an_itinerant_painter_…html` — her save of 5 Oct 2026.
  A bold "Comitato scientifico: …" label, then a line break, then the real text,
  all in one paragraph. The recipe skips that label (`descriptionSkip`). Test:
  `description_pages_oct.js`.
- `giorgio_armani_milano_per_amore.html` — read live 19 Nov 2026. The info block's
  labels hold their line break INSIDE the bold (`<strong>When<br></strong>`), so the
  stop label was never seen and hours reached the row. Test: `sweep_nov_pages.js`.
