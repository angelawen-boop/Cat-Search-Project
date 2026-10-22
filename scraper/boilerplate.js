/**
 * BOILERPLATE — phrases that never describe an exhibition: ticket and admission wording,
 * funders, image credits, cookie and newsletter notices. A sentence holding one is dropped
 * from a description. One copy, for the scraper (sweep_prototype.js) and Add by link (written
 * into Cat_Watch.jsx by build/sync_shared.js). Lower case; matched inside the sentence.
 */
'use strict';
const BOILERPLATE = [
  'technical storage or access',
  'legitimate purpose of storing preferences',
  'subscriber or user',
  'consent to the use of cookies',
  'we use cookies',
  'this website uses cookies',
  'accept all cookies',
  'privacy policy',
  'sign up to our newsletter',

  // A PRESS PULL-QUOTE, found on the Wallace's Ranjit Singh page 12 Sep 2026
  // alongside the details line she flagged:
  //   "★★★★ 'a glorious show' - The Evening Standard ★★★★ - The Times"
  // Star ratings belong to reviews, never to a venue's own description of its
  // exhibition, so the character itself is the whole test. She did not name
  // this one; it sat in the same summaries as the junk she did name.
  '★★',

  // THE COPYRIGHT SIGN, from the Gallerie dell'Accademia, 12 Sep 2026. Its
  // TransLucent summary opened on an image credit:
  //   "Leiko Ikemura, Yellow Figure with Hummingbird, 2020, vetro colato / cast
  //    glass, 32 x 33 x 13 cm © Leiko Ikemura. Photo: Jörg von Bruchhausen"
  // The site is built with Divi, so there is no caption or credit class to key
  // on and the container rules cannot reach it. A © never appears in a venue's
  // description of its own exhibition, and since boilerplate is now stripped by
  // the SENTENCE this removes the credit without touching the prose beside it.
  //
  // This is the junk she singled out as the dangerous kind: an artist and a
  // work named in a credit read exactly like an artist and a work named in the
  // blurb, so compression cannot tell them apart.
  '©',

  // ADMISSION WORDING, from the Wallace Collection, 12 Sep 2026.
  //
  // Its details line is usually bold and caught by boldOnly(), but Winston
  // Churchill: The Painter prints the same thing in plain text:
  //   "Saturday 23 May - Sunday 29 November 2026 Exhibition Galleries
  //    Admission charge, members go free"
  // so the markup offers nothing to key on there. What it does carry is
  // wording that belongs to the ticket desk and never to a description of an
  // exhibition — the same footing as the Borghese ticket discount above.
  'admission charge',
  'members go free',
  'free for members',
  'tickets bookable',
  // Tate Britain, 25 Sep 2026: a members' banner opening two summaries —
  // "Members enjoy free entry – no need to book, just turn up with your card" —
  // and a joint-ticket note opening two more: "Tickets for Edward Burra include
  // entry to the Ithell Colquhoun exhibition".
  'members enjoy free entry',
  // The Ashmolean, 27 Sep sweep: Renaissance Worlds' description opened
  // "Tickets for this major exhibition will be available in spring 2027.
  // Become a Member to visit for free."
  'become a member',
  'tickets for this',
  'no need to book',
  'include entry to the',

  // A PHOTO CREDIT IN THE BODY TEXT, Lévy Gorvy Dayan, 25 Sep 2026: the last
  // paragraph of a description reads "(1-3) Installation views of Thievery by
  // Servants, Lévy Gorvy Dayan, New York, 2026. Courtesy the artist and Hauser
  // & Wirth." — no caption class to key on, so the wording is the test, like ©.
  'installation view',
  'courtesy the artist',
  // MAM Paris, 25 Sep: its own paragraph under an image — "Otobong Nkanga,
  // Social Consequences V: The Harvest 2022, Wim Waumans Collection, Courtesy
  // of the artist".
  'courtesy of the artist',

  // FUNDING ACKNOWLEDGEMENTS, found 12 Sep 2026 while checking that the caption
  // fix had not cost anything. It had not — but clearing the credit line freed
  // a slot, and what moved up into it at the Menil was the donor list:
  //   "Major funding for this exhibition is generously provided by Sheila Noeth
  //    and Ted Dohmen. Additional support comes from Kathy and George Britton…"
  // The Frick was already shedding these while the Menil was taking them on, so
  // the treatment was inconsistent as well as wrong. A list of funders never
  // describes an exhibition, whoever publishes it.
  'generously provided by',
  'generously supported by',
  'major funding',
  'leadership support',
  'additional support',
  'support is provided by',
  'supported in part by',

  // DEF-03, and it surfaced for real on 11 Sep 2026 rather than in theory.
  //
  // Borghese's Louise Bourgeois page has NO curatorial paragraph at all. Its
  // only substantial text is a ticket discount, a newsletter pitch and the
  // footer address — so the extractor took the discount and that sentence became
  // the exhibition's description, bound for an approval card:
  //
  //   "During the exhibition, those who present the Galleria Borghese ticket at
  //    the Villa Medici ticket office will be entitled to a discount, 8€
  //    instead of 10€."
  //
  // The right answer for that page is an EMPTY summary plus the note that
  // already exists ("No description could be found…"). Empty is honest; wrong
  // is not, and she would be the one asking why the description is nonsense.
  //
  // Be clear about what this is: a blacklist, which is a weak instrument. It
  // catches the visitor-information text these venues actually print, and the
  // next venue will print something it does not know. The real test — "is this
  // prose ABOUT the exhibition?" — is judgement about the outside world, so it
  // belongs to a model, and the compressor already refuses text that is not a
  // description. That remains the SECOND net. Her ruling stands: bad text must
  // not be let through here on the assumption a later stage catches it.
  'entitled to a discount',
  'ticket office',
  'ticket purchase',
  // The Ashmolean, 27 Sep: "No exhibition booking needed for Members, but
  // proof of Membership is required" sat among Aphrodite's paragraphs.
  'proof of membership',
  'subscribe to',
  'to stay updated',
  'opening hours',
  'admission is free',
  'book your visit',
  'buy tickets',
  'for visit info',
  // Image rights notices. Wallace prints three of these at the foot of every
  // exhibition page; they are a description of the PHOTOGRAPH's licence, never
  // of the exhibition, and with the content wrapper wrongly excluded they were
  // what the extractor fell through to.
  'download of this image is authorised',
  'higher image resolution',
  'image licensing policies',
];

module.exports = { BOILERPLATE };
