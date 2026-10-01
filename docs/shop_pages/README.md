# Shop pages she saved

For the catalogue lookup and Re-check, not the scraper.

- `morgan_tarot_sold_out.mhtml` — 30 Sep 2026. Sold out: "SOLD OUT!" note, a
  Sold Out badge by the price, the only button a greyed-out "Sold out". Also a
  note to people who had ALREADY pre-ordered. Re-check read it as still for
  sale ("pre-orders are being accepted, with an Add to cart option") — there is
  no "Add to cart" anywhere in the page. Fixed in the read's rules (R-011b).
  Shopify's machine-readable answers, tried through her connector the same day:
  `.js` refused by the connector (200 from the shop), `.json` passes but has no
  availability field, `.oembed` answered 429. So the read stays a model read.
- `orsay_cassatt_product.mhtml` — 1 Oct 2026, saved with "Read more" and the
  Characteristics tray open. The ISBN is "EAN 9782754117425" in the tray (in
  the page, only folded); the publisher, "Co-publishing Hazan / Musée d'Orsay",
  ends the long description (`ProductDetails-body`, `display:none` until "Read
  more"). Parallel, same day: excerpt mode kept the "Characteristics" heading
  and nothing under it; `full_content` carried the EAN but only the short
  teaser, cut at "…under the sign..." — no Hazan. "Sold by GrandPalaisRmn" is
  the shop's operator; the lookup filed it as the publisher.
