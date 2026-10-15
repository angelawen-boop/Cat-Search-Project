# Tate — saved pages

- `light_and_magic.html` (Tate Modern) — her save of 5 Oct 2026. The dining
  offer (grey editorial panel, pull-down FAQ) and a "Relaxed Hours" event card
  reached the description. Both Tates now treat those blocks as noise
  (`TATE_NOISE`). Test: `description_pages_oct.js`.
- `tate_britain_past_p1.html`, `tate_britain_past_p2.html` — her saves of 15 Oct
  2026, the past-and-current listing (1 Jul 2024 to 15 Oct 2026) and its `&page=2`.
  20 cards a page; page 1 carries "Load 1 more" (`data-ajax-type="load-more"`,
  fetching `page=2`), page 2 holds Whistler alone and no button. `page=3` is dead
  (her check), so the walk stops on the missing button (`TATE_PAGES`, `whileMore`).
  Test: `listing_pages.js`, LP-tate-britain.
- `steph_huang.html` — her save of 15 Oct 2026. The description is two paragraphs;
  the artist's CV sits in a "Biography" pull-down, which `TATE_NOISE` drops with
  the other pull-downs — why the 15 Oct run's text is shorter than 5 Oct's.
