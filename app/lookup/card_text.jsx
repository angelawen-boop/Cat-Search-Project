//@ What the catalogue part of a card says: shop lines, publisher lines, buy links.
//@piece buyLinks


// The shop link searches by the EXHIBITION's title (her decision): shops index the
// show's name; resellers use the ISBN or the book's title. Booko: booko.au/<isbn>,
// or its title search with no ISBN.
function buyLinks(r){const isbn=cleanIsbn(r.isbn13),title=r.catalogueTitle||r.title,q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title),mu=MU[r.museumId],out=[];if(r.shopUrl)out.push({name:shopLinkLabel(r.shopState),href:r.shopUrl});else if(shopButtonUrl(mu,r.title))out.push({name:"Museum shop",href:shopButtonUrl(mu,r.title)});if(r.publisherUrl)out.push({name:publisherLinkLabel(r.publisherResult),href:r.publisherUrl});out.push({name:"Amazon",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks",href:"https://www.abebooks.com/servlet/SearchResults?ds=30&dym=on&kn="+(isbn||tq)+"&rollup=on&sortby=17"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q},{name:"Booko",href:isbn?"https://booko.au/"+isbn:"https://booko.au/search?query_type=1&q="+tq.replace(/%20/g,"+")});return out;}
//@piece publisherLinkLabel



// The publisher button claims only what was verified (docs/app.md §1): "Publisher" =
// the book's own page; "Publisher's section" = the section it sits in; "Publisher's
// website" = the home page. An old row with no kind keeps the plain label.
function publisherLinkLabel(kind){
  if(kind==="container")return "Publisher\u2019s section";
  if(kind==="site")return "Publisher\u2019s website";
  return "Publisher";
}
//@piece publisherNote


// Each publisher-step outcome says which one it was, in one sentence (C-052 to
// C-069a). No result recorded says nothing: the step did not finish, or the row
// predates outcomes (her decision). Self-published and the book's own page say nothing.
function publisherNote(result,hasUrl){
  if(result==="container")return "Publisher\u2019s link opens the section this book sits in, not the book\u2019s own page.";
  if(result==="site")     return "Couldn\u2019t find this book on the publisher\u2019s site — the link opens their home page.";
  if(result==="nosite")   return "Couldn\u2019t work out the publisher\u2019s own website, so there\u2019s no link to it.";
  if(result==="unnamed")  return "No publisher was named for this book, so none was looked for.";
  // Self-published: no button is answer enough (her decision).
  if(result==="selfpublished")return "";
  if(result==="product")  return "";
  return "";
}
//@piece shopHeadline



// ── A BOOK LEAVING THE SHOP — "Re-check museum shop" (docs/app.md §1) ───────
// Only Re-check moves the shop status; she presses it after seeing the change, so it
// is not a monitor. With a link it re-reads that page (gone, redirected or sold out →
// "No longer", link kept as "Museum shop (last seen)"; buyable again → "Back"). With
// none it runs the shop step alone ("Now"). No history kept; a failed check changes
// nothing. Pre-order counts as in the shop; sold out in any language counts as gone.
//
// shopState: "shop" | "gone" | "web" | "none" | "blocked" | "script" | "parallel" | "unconfirmed" | null; "gone" keeps shopUrl.
// "blocked": the shop refused every page opened (KHM). "script": its pages opened with no
// books on them, drawn by script (MoMA). "parallel": a venue whose books Parallel drops
// (`shopUnseen`, the Städel), its pages showing no priced line. "unconfirmed": a section she confirmed though the
// finder could not read it (`shopUnseen` "unconfirmed"; Berlin's English one), cause unchecked. Each way whether the book is there is
// UNKNOWN — never "not in the shop". shopChange: "now" | "back" | null on a "shop" row.
// A legacy "gone" on a "web" row reads as plain "web".

// The one line at the top of the catalogue panel. Outside the component so a
// fixture can read the wording, for the reason countDecisions moved out.
// `null` means the ordinary grey sentence stands on its own.
function shopHeadline(shopState,shopChange){
  if(shopState==="shop"){
    if(shopChange==="back")return "Back in the museum shop.";
    if(shopChange==="now") return "Now in the museum shop.";
    return "In the museum shop.";
  }
  if(shopState==="gone")return "No longer in the museum shop.";
  return null;
}
//@piece SHOP_BLOCKED_HEAD


// A blocked shop says so, in her wording (docs/app.md §1): the headline in the red and
// weight of "No longer in the museum shop.", the rest grey.
const SHOP_BLOCKED_HEAD="The museum shop is blocked";
//@piece SHOP_SCRIPT_HEAD

const SHOP_SCRIPT_HEAD="The museum shop contents cannot be seen — JS-rendering";
//@piece SHOP_PARALLEL_HEAD

const SHOP_PARALLEL_HEAD="The museum shop contents cannot be seen — Parallel fault";
//@piece SHOP_UNCONFIRMED_HEAD

const SHOP_UNCONFIRMED_HEAD="The museum shop contents cannot be seen — unconfirmed page problem";
//@piece shopUnread

// A shop the lookup could not read: refused, drawn by script, or dropped by Parallel (her wording for each).
const shopUnread=s=>s==="blocked"||s==="script"||s==="parallel"||s==="unconfirmed";
//@piece shopUnreadHead

const shopUnreadHead=s=>s==="script"?SHOP_SCRIPT_HEAD:s==="parallel"?SHOP_PARALLEL_HEAD:s==="unconfirmed"?SHOP_UNCONFIRMED_HEAD:SHOP_BLOCKED_HEAD;
//@piece shopUnreadSaid

// Re-check's line for each: "Re-check didn’t work — museum shop " + this.
const shopUnreadSaid=s=>s==="script"?"contents cannot be seen — JS-rendering":s==="parallel"?"contents cannot be seen — Parallel fault":s==="unconfirmed"?"contents cannot be seen — unconfirmed page problem":"is blocked";
//@piece SHOP_BLOCKED_FOUND_REST

const SHOP_BLOCKED_FOUND_REST=" — search it manually. The catalogue is stocked elsewhere.";
//@piece SHOP_BLOCKED_NONE_REST

const SHOP_BLOCKED_NONE_REST=". The catalogue also does not appear to exist elsewhere. Search manually to confirm.";
//@piece englishLine


// The English-edition line on a foreign book: how far an English edition was looked
// for (her decision), or which original the English edition on the card translates.
// It never restates the publisher-page status. Null: nothing to say — and on a card
// with several versions, whose own lines say it.
function englishLine(r){
  if(Array.isArray(r&&r.editions)&&r.editions.length>1)return null;
  const c=r&&r.englishCheck;
  const o=r&&r.originalEdition;
  // An English book of the show refused as a different book (her wording, Hubert Robert):
  // named for her, never filed as the card's book, no buy links.
  const b=r&&r.otherVenueBook;
  if((c==="publisher"||c==="shops")&&b&&b.title&&b.isbn13)
    return "No English edition. An English catalogue from the show’s other venue is a different book: "
      +b.title+(b.publisher?", "+b.publisher:"")+", ISBN "+fmtIsbn(b.isbn13)+".";
  if(c==="english"&&o&&o.title)return "English edition of \u201c"+o.title+"\u201d"+(o.publisher?" ("+o.publisher+")":"")+".";
  // Her wording; the publisher is printed above, so not again here (her decision).
  if(c==="publisher")return "No English edition — checked publisher's site and bookshops.";
  if(c==="shops")return "No English edition found in bookshops.";
  if(c==="unknownlang")return "The book\u2019s language couldn\u2019t be confirmed, so no English edition was looked for.";
  if(c==="stopped")return "English edition not checked \u2014 the search stopped part-way. Search again to retry.";
  return null;
}
//@piece shopButtonUrl


// The shop button's label. "(last seen)" is what tells her the page may be
// dead or sold out while the link is still worth keeping.
// The card's "Museum shop" link with no book page of its own: a section written in for the venue (her decision:
// Basel, the Städel), else the shop's search for the show, else its front page. Null when there is none.
function shopButtonUrl(mu,title){
  if(!mu)return null;
  return mu.shopLink||(mu.shopSearch?mu.shopSearch+encodeURIComponent(title):mu.shopHome||null);
}
//@piece shopLinkLabel

function shopLinkLabel(shopState){ return shopState==="gone"?"Museum shop (last seen)":"Museum shop"; }
