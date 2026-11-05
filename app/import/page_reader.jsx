//@ Reading one show's page: can it be read, title, dates, description.
//@piece withLongYears

// "4 Sep 26" → "4 Sep 2026": a two-digit year after a day and month, for a venue with shortYear.
function withLongYears(l){
  return String(l).replace(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?)\s+(\d{2})(?![\d:])/gi,"$1 20$2");
}
//@piece linksIn


// Every address in whatever she pasted — commas, spaces, lines, or mixed in
// with other words, tracking tags dropped. A repeat is read once (same finished address).
function linksIn(text){
  const out=[],seen=new Set();
  for(const m of String(text||"").matchAll(/https?:\/\/[^\s,;<>"'\]\[]+/gi)){
    const u=withoutTracking(m[0].replace(/[.,;:!?)\]]+$/,""));
    const k=normalizeUrlKey(u);
    if(!k||seen.has(k))continue;
    seen.add(k); out.push(u);
  }
  return out;
}
//@piece typedLink

// A link she typed or pasted, "https://" added when left off; null when it is not a web address.
function typedLink(text){
  const t=String(text||"").trim(); if(!t)return null;
  let u=null; try{ u=new URL(/^https?:\/\//i.test(t)?t:"https://"+t); }catch{}
  return u&&/^https?:$/.test(u.protocol)&&u.hostname.includes(".")?u.href:null;
}
//@piece splitPageTitle


// "Hammershøi. The Eye that Listens | Museo Nacional Thyssen-Bornemisza".
// A bar always parts the show from the site. A dash only when the words after
// it are the site's own (Courtauld) — Mauritshuis titles a show "The Grand
// Tour - Destination Italy", and that dash belongs to the title.
function splitPageTitle(t,host){
  // HTML codes in a page title are decoded ("Chagall&#039;s", Mia).
  // A separator with no site after it is dropped ("Van Dyck, the European -", Genoa).
  let s=decodeEntities(stripMd(t)).replace(/\s+(?:[-–—|]\s*)+$/,"");
  if(!s)return{show:"",site:""};
  // A dash-led tail naming the site ("… – Enfilade"; "… - KHM.at", picked-shows R1).
  let site="";
  const m=s.match(/^(.*\S)\s+[-–—]\s+([^-–—|]+)$/);
  if(m){
    const h=foldText(host);
    const flat=x=>foldText(x).replace(/[^a-z0-9]/g,"");
    const bare=h.replace(/^www\./,"");
    if(foldText(m[2]).split(/[^a-z0-9]+/).some(w=>w.length>=4&&h.includes(w))||flat(m[2])===flat(bare)||flat(m[2])===flat(bare.split(".")[0])){ s=m[1].trim(); site=m[2].trim(); }
  }
  // Several bars: the show is named first, the site last ("Venice: Canaletto and
  // His Rivals | Past exhibitions | National Gallery"). A blog's label before the show
  // ("Exhibition | Canaletto and the Art of Venice | Enfilade") is not its name. AL-050.
  let parts=s.split(" | ").map(x=>x.trim()).filter(Boolean);
  while(parts.length>1&&TITLE_LABEL.test(parts[0]))parts=parts.slice(1);
  // The site can come first ("Nationalmuseum | Fantasy and Reality – …"): the part named for the site is the site.
  const namesSite=x=>{ const h=foldText(host); return foldText(x).split(/[^a-z0-9]+/).some(w=>w.length>=4&&h.includes(w)); };
  if(parts.length>1&&!site&&namesSite(parts[0])&&!namesSite(parts[parts.length-1]))return{show:parts[parts.length-1],site:parts[0]};
  if(parts.length>1&&!site)return{show:parts[0],site:parts[parts.length-1]};
  return{show:parts[0]||s,site};
}
//@piece TITLE_LABEL

const TITLE_LABEL=/^(?:exhibitions?|mostra|ausstellung|exposition|exposición|tentoonstelling)$/i;
//@piece GENERIC_TITLE_WORDS

// Words too general to name a show.
const GENERIC_TITLE_WORDS=new Set(["exhibition","exhibitions","mostra","ausstellung","exposition","tentoonstelling","the","a","an","and","of"]);
//@piece LINK_RAW_CHARS


// The scraper's 2,000-character description cut (her decision). Read from under the
// show's heading, skipping the date line: some venues print the dates at the foot of
// the page (Jacquemart-André).
const LINK_RAW_CHARS=2000;
//@piece LINK_DATE_LINES

const LINK_DATE_LINES=60;
//@piece LINK_DATE_LINE_MAX

// A date line longer than this is a paragraph that carries the dates; it stays in the passage.
const LINK_DATE_LINE_MAX=150;
//@piece LINK_HALF_LOOK

// How many lines past a one-sided date the reader looks for a full range.
const LINK_HALF_LOOK=6;
//@piece PASSAGE_END


// THE PASSAGE'S SHARED RULES. What the scraper drops by the page's structure (ticket boxes, captions,
// related shows) a text reader drops by its words. A sentence holding one of the scraper's own
// boilerplate phrases goes (BOILERPLATE, shared). A short line that is the page's furniture — a
// ticket or visit label, a price, a floor, a photo credit — goes. The passage ends where the page
// turns to other shows or the newsletter. Rules and cases: docs/add_by_link.md, "The passage".
const PASSAGE_END=/^(?:related(?: [a-z]+)?|you (?:may|might) also like|more exhibitions|other exhibitions|upcoming exhibitions|current exhibitions|past exhibitions|stay connected!?|follow us|subscribe to (?:our|the) newsletter|sign up for (?:our|the) e?-?newsletter.*)$/i;
//@piece PASSAGE_END_AFTER

const PASSAGE_END_AFTER=300;
//@piece FURNITURE

const FURNITURE=/^(?:(?:buy|book|get) )?tickets?(?: (?:now|online|here|prices|required|programme))?\.?$|^(?:book|buy) now$|^(?:admission|admission prices|prices|general admission(?: pricing)?:?|opening hours.*|accessibility|audio (?:guide|tour)|share|plan your visit|getting here|location:? .*|become a member(?: today)?|free for members|free with museum admission|sponsored by|supported by|programme|show photos.*|image gallery.*|more info(?:rmation)?|read more|see more|scroll(?:en)?|ready to visit\?|now on view|this is a past exhibition\.?|jump to|partners and sponsors|exhibition resources|parking .*|drop off .*|email your questions.*)$/i;
//@piece CAPTION

// A picture's caption: a short line naming a work and ending on its year, no sentence ("Anna Atkins,
// cyanotopi, 1843", Louisiana). An artist and a work in a caption read like the show's own (her concern).
const CAPTION=/^[^.!?]{3,120},\s*(?:c\.\s*|ca\.\s*)?\d{4}(?:\s*[–-]\s*\d{2,4})?(?:\s*\(detail\))?\s*\.?$/i;
//@piece isFurniture

function isFurniture(t){
  if(!t||t.length>90)return false;
  return FURNITURE.test(t)||/(?:[$€£]|\b(?:chf|eur|usd|gbp|sek|dkk)\b)\s?\d/i.test(t)&&!/[a-z]{4,}\s+[a-z]{4,}\s+[a-z]{4,}/i.test(t.replace(/\b(?:adults?|concessions?|members?|students?|children|free|tickets?|incl|collection|exhibitions?|small)\b/gi,""))
    ||/\b(?:floor|level)\s+-?\d/i.test(t)||/\bphoto:/i.test(t)||CAPTION.test(t);
}
//@piece withoutBoilerplate

function withoutBoilerplate(t){
  const bad=x=>{ const low=x.toLowerCase(); return BOILERPLATE.some(b=>low.includes(b))||LINK_JUNK.some(r=>r.test(low)); };
  const parts=sentencesOf(t);
  if(!parts.some(bad))return t;
  return parts.filter(x=>!bad(x)).join(" ").trim();
}
//@piece NOT_A_STOP

// A paragraph's sentences. A full stop after an initial or a short abbreviation ("Margot and
// Jeremiah M. Bogert", "David L. Klein, Jr. Foundation", "c. 1664") does not end one: splitting
// there left a funder list's tail behind its dropped "support is provided by" (Frick).
const NOT_A_STOP=/(?:^|[\s(])(?:\p{L}|Mr|Mrs|Ms|Dr|St|Jr|Sr|Inc|Ltd|Co|ca|cf|vol|nos?|pp?|fig|approx|eds?|inv|op)\.$/iu;
//@piece sentencesOf

function sentencesOf(t){
  const s=String(t||""),out=[],re=/[.!?…]["”’»)\]]*\s+(?=["“‘«(\[]?[\p{Lu}\d])/gu;
  let start=0,m;
  while((m=re.exec(s))){ if(NOT_A_STOP.test(s.slice(start,m.index+1)))continue; out.push(s.slice(start,m.index+m[0].length).trim()); start=m.index+m[0].length; }
  out.push(s.slice(start).trim());
  return out.filter(Boolean);
}
//@piece isProse

// A paragraph reads as prose: eight words or more, and a sentence that ends. A label, a name, a
// logo, an address, opening hours or a caption with no sentence is not one.
function isProse(t){
  const s=String(t||"").trim();
  return s.split(/\s+/).length>=8&&(sentencesOf(s).length>1||/[.!?…]["”’»)\]]*$/.test(s)&&!NOT_A_STOP.test(s));
}
//@piece LINK_JUNK

// Sentences whole-page text carries that the scraper drops by the page's structure: funders,
// tickets, members' offers, opening times, visitor and access notes, links' own words, cookie and
// newsletter notices, credits. Matched on the lower-cased sentence. Cases: docs/add_by_link.md, "The passage".
const LINK_JUNK=[
  /\bmade possible\b/,/\bsponsor\w*/,/^(?:\S+\s+){0,6}(?:is|are|was|were)\s+(?:generously\s+|kindly\s+)?supported by\b/,/^supported by\b/,
  /\bwith (?:the )?(?:generous |kind |additional )?support (?:of|from)\b/,/\b(?:leadership|major|additional|principal|generous) (?:support|supporters?)\b/,
  /\bfor (?:their|its|his|her) (?:generous )?support\b/,/\bwith thanks to\b/,/\bindemnity\b/,
  /\btickets?\b/,/\bfree admission\b|\badmission (?:free|prices?|tickets?)\b|\byour admission\b|\badmission to the exhibition\b|\bgeneral admission\b/,
  /\bmembers? (?:go|visit|can|enjoy|receive|get|only|preview|mornings?|events?)\b|\bfor members\b|\bmembership\b|\bjoin (?:as a member|today|now)\b/,
  /\b\d{1,2}(?:[.:]\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)(?![a-z])/,/\bopen (?:daily|from|until|on|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bopening (?:hours|times)\b|\blast (?:admission|entry|entrance)\b/,
  /\bwe look forward to welcoming\b/,/\bplease note\b/,/\bvirtual queue\b|\bwait times\b/,/\bthe age of \d/,
  /\belevators?\b|\bwheelchairs?\b|\bstep-free\b|\blarge[- ]print\b|\bseating is provided\b|\bwelcome cart\b|\baccessible (?:audio|toilets?|entrances?)\b/,
  /\baudio ?(?:tours?|guides?)\b|\baudioguides?\b/,
  /\bclick here\b|\bselect to view\b|\blightbox\b|\bopens in a new\b|\bfind out more\b|\bread more\b|\bdownload (?:the|our|a|large)\b|\bshare your feedback\b/,
  /\bcookies?\b|\bconsent\b|\bdata protection\b|\bprivacy (?:notice|statement|policy)\b|\bexternal provider\b|\bunsubscribe\b|\breceive updates\b|\bin your inbox\b|\bnewsletter\b|\bsign up\b/,
  /[\w.-]+@[\w-]+\.[a-z]/,/\bphone:|\btel\.?:|\btoll free\b/,/\bcourtesy\b/,/^credits?:/,/\blicensed by\b/,/\bphoto(?:graph)? by\b|\bphoto:/,/\bcopyright\b/,
  /\bramp\b|\blearn more\b|\bon floor -?\d|\bvisit page\b|\bplease be aware\b|\bsubject to change\b|\badmit(?:tance)?\b|\bstaff will be available\b|\baccessing the (?:gallery|museum|building)\b/,
  /\blogo\b|\byoutube\b|\bvimeo\b|\byour browser\b|\bunder the (?:patronage|auspices)\b|\bpatrocinio\b|\bcontribution from\b|\bchance to win\b/,
  /\btarif\b|\b\d+(?:[.,]\d+)?\s?(?:euros?|€)(?![\w])|[£$€]\s?\d|\b(?:chf|eur|usd|gbp|sek|dkk|nok)\s?\d|\bconcessions?\b|\breduced (?:rate|price)\b|\bdiscounts?\b|\bmember benefits\b/,
  /\byour inbox\b|\byour (?:generosity|donation|gift)\b|\bsubscription\b|\byour \w+ account\b|\bweb ?page\b|\bhow to get to\b|\bview details\b|\bunderwritten\b/,
  /\b\d{1,2}[.:]\d{2}\s?[-–]\s?\d{1,2}[.:]\d{2}\b|\bmore information\b|\bour \w+ page\b|\bshare your\b/,
  /\banalytics\b|\bpersonal (?:information|data)\b/,
  /\btraditional owners\b|\bwe acknowledge\b|\bgroup visits?\b|\bprivate tours?\b|\bexclusive tours?\b|\btime slots?\b|\bprior registration\b|\byour group\b/,/\b(?:view|see|click|explore|find)\b.*\bhere\s*\.?$/
];
//@piece CAPTION_VERB

// A paragraph that is a picture's caption or description, not the show's own text: "(detail)", a
// work's size, a credit line ("Gift of …", "Bequest of …") with a year, a work in its medium with a
// year and no verb, a description of a picture ("Charcoal drawing of landscape with …"), or a name
// then a title in one short verbless sentence ("Johan Tobias Sergel, Self portrait …").
const CAPTION_VERB=/\b(?:is|are|was|were|has|have|had|will|would|can|could|became|becomes|brings?|presents?|explores?|shows?|features?|offers?|celebrates?|examines?|traces?|reveals?|includes?|focuses|invites?|highlights?|tells?|returns?|marks?|opens?)\b/i;
//@piece CAPTION_MEDIUM

const CAPTION_MEDIUM=/\b(?:oil|tempera|acrylic|gouache|watercolou?r|pastel|charcoal|graphite|ink|chalk)\s+(?:on|and)\b|\bon (?:canvas|panel|paper|board|wood|copper|linen|vellum)\b|\b(?:etching|engraving|lithograph|woodcut|aquatint|gelatin silver|albumen print|bronze|marble|terracotta)\b/i;
//@piece CAPTION_SIZE

const CAPTION_SIZE=/\d+(?:[.,]\d+)?(?:\s+\d\/\d)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s+\d\/\d)?\s*(?:cm|mm|in)\b/i;
//@piece CAPTION_CREDIT

const CAPTION_CREDIT=/\b(?:gift of|bequest of|museum purchase|purchased (?:with|from)|accession|museum no\.)/i;
//@piece PICTURE_OF

const PICTURE_OF=/^(?:(?:an?|the|een|ein|eine|un|une|uno|una)\s+)?(?:[\p{L}'’-]+\s+){0,5}(?:painting|drawing|photograph|photo|print|etching|engraving|portrait|portret|sculpture|image|poster|close[- ]up|relief|tapestry|schilderij|gemälde|ritratto|dipinto|tableau)(?:\s+(?:of|van|von|de|di)\b|:)|^(?:affiche|plakat|locandina|cartel)\b/iu;
//@piece WORK_THEN_PICTURE

// A work named then described as a picture: "Guido Cagnacci's The Death of Cleopatra, a painting of a topless woman …" (Cincinnati).
const WORK_THEN_PICTURE=/^[^.]{3,120},\s+an?\s+(?:[\p{L}-]+\s+){0,5}(?:painting|drawing|etching|engraving|photograph|print|sculpture|tapestry)\s+of\b/iu;
//@piece isCaption

function isCaption(t){
  const s=String(t||"").trim(), year=/\b1[0-9]{3}\b|\b20[0-9]{2}\b/.test(s), first=sentencesOf(s)[0]||s;
  const big=s.split(/\s+/).filter(w=>/^\p{L}{4,}/u.test(w)), caps=big.filter(w=>/^\p{Lu}/u.test(w)).length;
  // "detail" marks a caption only outside a long paragraph of prose ("purged of descriptive detail, geometric…", MoMA's Matisse).
  const prose=s.split(/\s+/).length>=40&&CAPTION_VERB.test(s);
  return !prose&&/\(detail\)|^detail\b|\bdetail,|\bdetail of\b/i.test(s)||WORK_THEN_PICTURE.test(s)||big.length>=3&&s.split(/\s+/).length<=15&&caps/big.length>=0.75&&!CAPTION_VERB.test(s)||CAPTION_SIZE.test(s)||CAPTION_CREDIT.test(s)&&year||CAPTION.test(first.replace(/\.$/,""))
    ||CAPTION_MEDIUM.test(s)&&year&&!CAPTION_VERB.test(s)||PICTURE_OF.test(s)&&!/\b(?:is|are|was|were|has|have|had|will|would|can|could)\b/i.test(s)
    ||/^(?:\p{Lu}[\p{L}.'’-]*\s+){0,3}\p{Lu}[\p{L}.'’-]*,\s/u.test(s)&&sentencesOf(s).length===1&&s.split(/\s+/).length<=14&&!CAPTION_VERB.test(s);
}
//@piece LINK_BOX

// A heading that turns from the show to other matter ends the passage once the show's own text is in:
// other shows, events, the shop, the press and reviews, the newsletter, sharing, the footer. An online feature's
// section is passed over to the next heading (Rijksmuseum's "Online special", narrated by Joanna Lumley, between
// its introduction and its show). A box's heading
// (tickets, visiting, supporters, curators, films, pictures, the catalogue) ends it only once a fair
// part of the show's text is in (LINK_BOX_AFTER): below a short introduction the show's text can carry on
// under a box with no heading of its own (Kunsthaus); below the text, what follows is the page's programme
// (Alte Pinakothek's tours and participation project).
const LINK_BOX=/^(?:tickets?|ticket|admission|prices|pricing|(?:opening |museum )?hours|opening times|visit|visitor|visiting|plan your visit|getting here|directions|address|location|access|accessib|membership|members?\b|become a member|curators?|credits|support|supported|sponsor|partners|media partners|in (?:cooperation|collaboration|partnership) with|with (?:generous |additional )?support|exhibition (?:film|guide|catalogue|supporters)|film|videos?|trailer|audio|(?:guided )?tours|führungen|publication|catalogue|images|impressions|(?:photo |image )?gallery|(?:exhibition |key )?highlights|selected works|installation|featured|downloads?|resources|large print)/i;
//@piece LINK_BOX_AFTER

const LINK_BOX_AFTER=600;
//@piece ONLINE_FEATURE

const ONLINE_FEATURE=/^online (?:special|tour|exhibition|feature)/i;
//@piece OTHER_MATTER

const OTHER_MATTER=/^(?:related|you (?:may|might) also|(?:see )?(?:more|other|further|upcoming|current|past|all) exhibitions|(?:exhibition |related |upcoming )?(?:events?|programmes?|programs?)$|(?:museum )?shop\b|newsletter|sign up|stay (?:in touch|connected)|follow|connect with|share\b|footer|(?:selected )?press\b|reviews?$|what’s on|explore more|discover more|privacy|manage consent|[\w ]*cookies)/i;
//@piece cardTitle


// A venue's own link options (its MUSEUMS entry's `linkRead`). Cases: docs/add_by_link.md,
// "Venue link rules".
// The title as the card shows it: a venue with capsTitles recases each part typed in capitals; any
// title typed wholly in capitals is recased (Scuderie "PONTORMO", Albertina "PICASSO – BACON"),
// unless it is one short word (an artist's acronym, "KAWS").
function cardTitle(t,vc){
  // A swept venue's title as the sweep writes it (Borghese's em dash; her decision: the sweep's rules).
  const swept=DATES.sweptVenueTitle(vc,t);
  if(swept!==t)return swept;
  const lo=linkOptions(vc)||{};
  // A venue whose name and subtitle are parted by a full stop (capsStops; the Correr's archive) recases each part.
  if(lo.capsTitles&&lo.capsStops)return String(t||"").split(/(\.\s+)/).map((p,i)=>i%2?p:DATES.capsTitleParts(p)).join("");
  if(lo.capsTitles)return DATES.capsTitleParts(t);
  const s=String(t||"");
  if(/\p{Ll}/u.test(s)||!/\p{Lu}/u.test(s))return s;
  const words=s.split(/[^\p{L}]+/u).filter(w=>w.length>=3);
  return words.length>=2||words.some(w=>w.length>=6)?DATES.capsTitleParts(s):s;
}
//@piece linkOptions

function linkOptions(vc){ return (vc&&MU[vc]&&MU[vc].linkRead)||(linkEntry(vc)||{}).linkRead||null; }
//@piece joinTitle

function joinTitle(name,sub,dashAfterColon){
  if(/[:.!?]\s*$/.test(name))return name+" "+sub;
  return name+(dashAfterColon&&name.includes(":")?" – ":": ")+sub;
}
//@piece pageUnreadWhy


// Why a link came back with no page. Parallel answering 202 ("accepted", no page sent) for a page the
// site serves to anyone (the Borghese's archive site) is Parallel's fault, said as the shop's line says it.
function pageUnreadWhy(e){
  if(e&&e.http_status_code===202)return "The page contents cannot be seen \u2014 Parallel fault. Import the full saved page.";
  return e?"The museum refused the page ("+String(e.http_status_code||e.error_type||"no reason given")+").":"The page came back empty.";
}
//@piece SCRIPT_DATES_NOTE


// ── THE SHOW PAGE READER ── Where the sweep has met a case and she has decided it, this reader follows the
// sweep's rule, shared code where it can be (dates.js) — never a rule of its own (her decision).
// One engine in steps, as the scraper's: each step reads and writes `pg`,
// the page being read, and a venue's own options (`pg.lr`, its linkRead) sit in the step they change.
// Rules and the case behind each: docs/add_by_link.md, "The general reader". `rules`, when given,
// collects the name of every rule that changed this page's result: the proof list keeps a page only
// for a rule no other page at its venue shows (docs/testing.md). The app passes none.
// One page → {ok, base, between, under, afterDates, start, end, raw, site, link, noDates, shown, shownWhy, dateLine, dateNote} or {ok:false, why}.
// A link's page whose dates a script draws after loading (her wording); and the sign of it, a template
// placeholder the script never filled ("{{daysLeft(exhibition.end)}}").
const SCRIPT_DATES_NOTE="Dates cannot be seen \u2014 JS-rendering.";
//@piece SCRIPT_PLACEHOLDER

const SCRIPT_PLACEHOLDER=/\{\{[^{}\n]{1,80}\}\}/;
//@piece readShowPage

function readShowPage(res,url,vc,rules){
  const pg=pageToRead(res,url,vc,rules);
  if(pg.fail)return pg.fail;
  joinHeadingOverTwoLines(pg);
  showFromCrumb(pg);
  titleCandidates(pg);
  if(!pg.cands.length){ pg.rule("fail:no-title"); return{ok:false,why:"Couldn’t find the show’s title on the page."}; }
  const fail=findDates(pg);
  if(fail)return fail;
  settleName(pg);
  finishName(pg);
  offerSubtitleLines(pg);
  takePassage(pg);
  return pageResult(pg);
}
//@piece pageToRead


// Step 1. The page's lines, its page title split into show and site, and the venue's date rewrites.
function pageToRead(res,url,vc,rules){
  const rule=t=>{ if(rules&&!rules.includes(t))rules.push(t); };
  const lr=linkOptions(vc);
  const text=String(oneText(res)||"");
  if(text.trim().length<SHELL_CHARS){ rule("fail:empty"); return{fail:{ok:false,why:"The page came back empty."}}; }
  // A bot check in place of the page (the sweep's own test, shared): never read as a show.
  const head=(text.match(/^\s*#\s+(.+)$/m)||[])[1];
  if(CHALLENGE_TITLE.test(String(res&&res.title||""))||CHALLENGE_TITLE.test(stripMd(head))){ rule("fail:bot-check"); return{fail:{ok:false,why:BOT_CHECK_SAID.charAt(0).toUpperCase()+BOT_CHECK_SAID.slice(1)+"."}}; }
  const host=hostOf(siteUrlOf(url));
  let{show,site}=splitPageTitle(res&&res.title,host);
  // A venue whose page title on some pages is a section's name, never the show's (linkRead.tabNotName;
  // Getty's collection pages, "Museum Collection | Museum Collection | Getty"): the heading names the show.
  if(lr&&lr.tabNotName&&lr.tabNotName.test(show)){ show=""; rule("tabNotName"); }
  // A venue whose retired show addresses open a list of shows (linkRead.listingPage; Louisiana's "Past
  // Exhibitions"): Parallel was sent the list, not the page she sees, so it is Parallel's fault, said as 202 is.
  if(lr&&lr.listingPage&&(lr.listingPage.test(String(show||"").trim())||lr.listingPage.test(stripMd(head).trim()))){ rule("fail:listing-page"); return{fail:{ok:false,why:pageUnreadWhy({http_status_code:202})}}; }
  if(site)rule(String(res.title).includes(" | ")?"tab:bars":"tab:site-after-dash");
  if(TITLE_LABEL.test(decodeEntities(stripMd(res&&res.title)).split(" | ")[0].trim()))rule("tab:label");
  // A venue's own date forms rewritten before reading: two-digit years (shortYear, NGV), "as of" for
  // "to" (asOfTo, Palazzo Reale Milano).
  const dateText=l=>lr&&lr.shortYear?withLongYears(l):lr&&lr.asOfTo?String(l).replace(/\s+as of\s+/gi," to "):l;
  // The venue an all-number date's order is looked up under (DATE_ORDER, dates.js): its own site's,
  // whether or not it has an entry here.
  const dateVenue=vc||occVenueId(hostOf(siteUrlOf(url)));
  // A venue that types a space before a comma (linkRead.spaceBeforeComma; MoMA's "Toyo Ito , SANAA"): dropped, so its
  // heading matches the tab title and wins over the title repeated in its events list.
  const lines=text.split("\n").map(l=>lr&&lr.spaceBeforeComma?l.replace(/(\S) +,/g,"$1,"):l);
  return{res,url,vc,rules,rule,lr,host,show,site,lines,dateText,dateVenue,broken:-1,after:-1,
    words:l=>foldText(stripMd(l)).replace(/[^a-z0-9]+/g," ").trim(),
    // A show page's own date line: page text, so no loose single dates.
    rangeIn:l=>DATES.findDateRange(dateText(l),{looseSingles:false,slashes:true,venue:dateVenue})};
}
//@piece joinHeadingOverTwoLines


// Step 2. A heading broken over two lines (Berlin: "## Donatello  " then "Inventor of the
// Renaissance") is one heading, the page's own name for the show: the tab title's mark
// joins its parts when the tab title reads the same, else the scraper's join. Berlin's
// tab titles can be misspelt or German, so the heading wins over them. A date line is
// never the heading's second half (Munich: "### Alte Pinakothek" over the dates).
function joinHeadingOverTwoLines(pg){
  const{lines,show,rule,dateVenue}=pg;
  for(let i=0;i+1<lines.length;i++){
    const hm=lines[i].match(/^(\s*#{1,6}\s+)(\S.*?)\s{2,}$/);
    const next=stripMd(lines[i+1]);
    if(!hm||!next||/^\s*#/.test(lines[i+1]))continue;
    const nd=DATES.findDateRange(next,{looseSingles:false,venue:dateVenue});
    if(nd.start||nd.end){ rule("heading:date-line-not-joined"); continue; }
    const name=stripMd(hm[2]),lo=String(show||"").toLowerCase();
    const sep=lo.startsWith(name.toLowerCase())&&lo.endsWith(next.toLowerCase())?show.slice(name.length,show.length-next.length):"";
    // A first line ending in a comma runs on (linkRead.headingCommaJoin; Louisiana's Arbus).
    const runOn=pg.lr&&pg.lr.headingCommaJoin&&/,$/.test(name);
    lines[i]=hm[1]+(runOn?name+" "+next:sep&&sep.length<=3?name+sep+next:joinTitle(name,next,true));
    lines[i+1]="";
    pg.broken=i;
    rule(sep&&sep.length<=3?"heading:two-lines-tab-mark":"heading:two-lines");
    break;
  }
}
//@piece showFromCrumb


// Step 3. A page title the page never prints can be a sentence (Cincinnati, Cagnacci: "Guido
// Cagnacci’s Death of Cleopatra will be the centerpiece…"): the breadcrumb's last step
// names the show instead (linkRead.crumb).
function showFromCrumb(pg){
  const{lr,lines,show}=pg;
  if(!(lr&&lr.crumb&&!(show&&lines.some(l=>foldText(stripMd(l)).includes(foldText(show))))))return;
  const crumb=lines.map(stripMd).find(l=>/^\s*Home\s*»/.test(l));
  const last=crumb?crumb.split("»").pop().trim():"";
  if(last){ pg.show=last; pg.rule("crumb"); }
}
//@piece titleCandidates


// Step 4. Candidate title lines, in order; the title is the first with dates under it.
function titleCandidates(pg){
  const{lr,lines,show,words}=pg;
  const cands=[],candRule=[];
  const add=(i,t)=>{ if(i>=0&&!cands.includes(i)){ cands.push(i); candRule.push(t); } };
  // A venue whose show heading follows a marker line (linkRead.titleAfter; Dresden's
  // "Active page:"): that heading is tried first and is the title.
  if(lr&&lr.titleAfter){
    const m=lines.findIndex(l=>lr.titleAfter.test(stripMd(l)));
    if(m>=0)pg.after=lines.findIndex((l,k)=>k>m&&/^\s*#{1,6}\s+\S/.test(l));
    add(pg.after,"titleAfter");
  }
  // A venue whose show heading carries a mark of its own (linkRead.titleHeading) tries it first.
  if(lr&&lr.titleHeading)add(lines.findIndex(l=>/^\s*#{1,6}\s+\S/.test(l)&&lr.titleHeading.test(stripMd(l).trim())),"titleHeading");
  add(lines.findIndex(l=>/^\s*#\s+\S/.test(l)),"h1");
  add(pg.broken,"two-lines");
  if(show){
    const fs=foldText(show);
    add(lines.findIndex(l=>/^\s*#{2,3}\s+\S/.test(l)&&foldText(stripMd(l)).includes(fs)),"h2-h3-holds-tab");
    const piece=" "+words(show)+" ";
    // A "##"/"###" heading that is part of the tab ("## Brancusi" in "Brancusi at the Neue Nationalgalerie").
    add(lines.findIndex(l=>/^\s*#{2,3}\s+\S/.test(l)&&words(l)&&piece.includes(" "+words(l)+" ")),"h2-h3-inside-tab");
    add(lines.findIndex(l=>foldText(stripMd(l)).includes(fs)),"line-holds-tab");
    add(lines.findIndex(l=>{ const w=words(l); return w.split(" ").length>=2&&w.length<=80&&piece.includes(" "+w+" "); }),"line-inside-tab");
  }
  pg.cands=cands; pg.candRule=candRule;
}
//@piece venueNamesFor


// Step 5. The dates: under a title line, else just above it, else none — what the page shows kept for the note.
// Sets the title line `h`, the date line `d`…`dEnd` and the range; returns a failure, or null.
// The names of the venue a page is read for, and of the houses sharing its site, and the site the tab
// title names: a line that is only one of these is never the show's title unless its dates sit under
// it (her decision; Brancusi's "Neue Nationalgalerie" line under the dates).
function venueNamesFor(pg){
  const{vc,host,site,words}=pg;
  const h=String(host||"").replace(/^www\./,"");
  const houses=Object.entries(LINK_VENUES).filter(([id,v])=>id===vc||(v.sites||[]).some(x=>x.host===h)).map(([,v])=>v);
  const names=[site,...[MU[vc]||{},...houses].flatMap(v=>[v.name,v.short,v.card,v.lookupName])];
  return new Set(names.filter(Boolean).map(words).filter(Boolean));
}
//@piece findDates

function findDates(pg){
  const{lr,lines,rule,rangeIn,dateText,dateVenue,cands,candRule}=pg;
  const venueNames=venueNamesFor(pg), nameOnly=i=>venueNames.has(pg.words(lines[i]));
  const datesAboveFor=(h,n,via)=>{
    for(let k=h-1,seen=0;k>=0&&seen<n;k--){
      const l=stripMd(lines[k]); if(!l)continue; seen++;
      const r=rangeIn(l);
      if(r.start||r.end)return{d:k,range:r,via};
    }
    return null;
  };
  const datesUnder=h=>{
    // A line giving one side only (a paragraph's "from 12 June 2026") stands only if no full range
    // follows within a few lines (Van Gogh Museum: the range sits below its introduction).
    let half=null;
    const take=x=>{ if(x.range.start&&x.range.end)return x; if(!half)half=x; return null; };
    // Under a top heading, another top heading starts another part of the page: its dates are its own
    // (the Borghese's archive: "# Insights | 1998 / 2026", the site, over "# Correggio and Antiquity").
    // A lower heading is not (San Marco's "### Date di apertura" under its "###" title).
    const top=l=>/^\s*#\s+\S/.test(String(l)), underTop=top(lines[h]);
    // A venue that labels its date line (linkRead.dateLine) is read there, anywhere on the page.
    if(lr&&lr.dateLine){
      for(let k=0;k<lines.length;k++){
        const l=stripMd(lines[k]); if(!l||!lr.dateLine.test(l))continue;
        const r=rangeIn(l);
        if(r.start||r.end)return{d:k,range:r,via:"dates:dateLine"};
      }
    }
    for(let k=h+1,seen=0;k<lines.length&&seen<LINK_DATE_LINES;k++){
      const l=stripMd(lines[k]); if(!l)continue; seen++;
      if(underTop&&top(lines[k])){ rule("dates:stop-at-heading"); break; }
      // A venue whose box of other shows sits below (linkRead.datesUntil): never read past it.
      if(lr&&lr.datesUntil&&lr.datesUntil.test(l.trim())){ rule("datesUntil"); break; }
      const nx=[];
      for(let j=k+1;j<lines.length&&nx.length<2;j++){ const t=stripMd(lines[j]); if(t)nx.push([j,t]); }
      // Opening and closing dates on two lines, "From 12 June 2026" over "Until 6 September 2026"
      // (Van Gogh Museum), "Held on 14 feb 2014" over "to 26 may 2014" (Reina Sofía): read together
      // before either alone, whatever word comes before the opening date.
      if(nx.length&&!(rangeIn(l).start&&rangeIn(l).end)&&/^(?:until|till|to|through|bis|au|al|jusqu|hasta)\b/i.test(nx[0][1])){
        const r2=rangeIn(l+" "+nx[0][1]);
        if(r2.start&&r2.end)return{d:k,dEnd:nx[0][0],range:r2,via:"dates:two-lines"};
      }
      if(half&&k>half.d+LINK_HALF_LOOK)break;
      const r=rangeIn(l);
      if(r.start||r.end){ const t=take({d:k,range:r,via:"dates:under"}); if(t)return t; }
      // A range printed over three lines, the middle one only "to" or a dash (Berlin).
      if(nx.length===2&&/^(?:-|–|—|to|bis|until|till|through|al|au|tot)$/i.test(nx[0][1])){
        const r3=rangeIn(l+" "+nx[0][1]+" "+nx[1][1]);
        if(r3.start&&r3.end)return{d:k,dEnd:nx[1][0],range:r3,via:"dates:three-lines"};
      }
    }
    return half;
  };
  let h=cands[0],found=null;
  for(const i of cands){ found=datesUnder(i); if(found){ h=i; break; } }
  // None under any candidate: dates printed just above the heading ("Until 25.10.2026", Kunsthaus).
  if(!found)for(const i of cands){ if(nameOnly(i))continue; found=datesAboveFor(i,2,"dates:above-heading"); if(found){ h=i; break; } }
  if(found)rule("title:"+candRule[cands.indexOf(h)]+(h===cands[0]?"":"-not-first"));
  if(!found){
    const h0=cands.find(i=>!nameOnly(i));
    if(h0===undefined){ rule("fail:venue-name-only"); return{ok:false,why:"Couldn’t find the show’s title on the page."}; }
    const near=[];
    for(let k=h0+1;k<lines.length&&near.length<LINK_DATE_LINES;k++){ const l=stripMd(lines[k]); if(!l)continue; if(lr&&lr.datesUntil&&lr.datesUntil.test(l.trim()))break; near.push([k,l]); }
    // A date the page prints but that is not one (months only, a season, no year), else none at all:
    // kept undated with the sweep's own note, the dates left blank (her decision: the sweep's rules, a day
    // never invented). The Borghese prints most past shows' dates only in the poster.
    // A day and month with no year (Chantilly's English pages): quoted as the sweep quotes it (unusableDateText).
    // All numbers in an order nothing settles: the order-unknown note (orderUnknown).
    const mo=near.map(([k,l])=>({k,r:DATES.findDateRange(dateText(l),{looseSingles:true,venue:dateVenue})})).find(x=>x.r.shownText);
    const ny=mo?null:near.map(([k,l])=>({k,t:DATES.unusableDateText(dateText(l))})).find(x=>x.t);
    h=h0; rule("title:"+candRule[cands.indexOf(h0)]);
    found=mo&&mo.r.orderUnknown?{d:mo.k,range:{start:"",end:""},noDates:true,orderUnknown:true,via:"dates:order-unknown"}
      :mo?{d:mo.k,range:{start:"",end:""},noDates:true,shown:mo.r.shownText,shownWhy:mo.r.shownWhy,via:"dates:shown-only"}
      :ny?{d:ny.k,range:{start:"",end:""},noDates:true,shown:ny.t,shownWhy:"no year is published anywhere",via:"dates:no-year"}
      :{d:h0,range:{start:"",end:""},noDates:true,via:"dates:none"};
    // No dates, and the page still holds a script's unfilled placeholder ("{{daysLeft(exhibition.end)}}", Getty):
    // its dates are drawn by script, so the card says so (SCRIPT_DATES_NOTE).
    if(found.via==="dates:none"&&SCRIPT_PLACEHOLDER.test(lines.join("\n"))){ found.scriptDates=true; rule("dates:script"); }
  }
  const d=found.d,dEnd=found.dEnd||found.d;
  let range=found.range;
  rule(found.via);
  // The printed date line's shape, digits and words blanked ("a, a 9, 9, 9:9 a a-…"): a new shape is a new page to keep.
  if(pg.rules){
    const shown=decodeEntities(lines.slice(d,dEnd+1).map(stripMd).join(" "));
    rule("date-shape:"+shown.replace(/\d+/g,"9").replace(/\p{L}+/gu,"a").replace(/\ba(?:\s+a\b)+/g,"a").replace(/\s*[-‐-―]\s*/g,"-").replace(/\s+/g," ").trim().slice(0,80));
    if(range.start&&range.end&&range.start.slice(0,4)!==range.end.slice(0,4)&&(String(range.raw||shown).match(/\b\d{4}\b/g)||[]).length<2)rule("dates:year-worked-out");
  }
  if(dateText(lines[d])!==lines[d])rule("dates:venue-rewrite");
  // One side only: a full range further down that shares that date completes it. A range
  // ending on another day never does.
  if(!range.start||!range.end){
    for(let k=d+1;k<lines.length;k++){
      const r=DATES.findDateRange(dateText(stripMd(lines[k])),{looseSingles:false,venue:dateVenue});
      if(r.start&&r.end&&((range.end&&r.end===range.end)||(range.start&&r.start===range.start))){ range={...range,start:r.start,end:r.end}; rule("dates:one-side-completed"); break; }
    }
  }
  // A run the page says was cut short closes on the day it really closed (MSK Ghent's Van Eyck).
  range=DATES.closedEarly(range,lines.map(stripMd).join("\n"),dateVenue);
  if(range.closedEarlyFrom)rule("dates:closed-early");
  Object.assign(pg,{h,found,d,dEnd,range,heading:stripMd(lines[h])});
  return null;
}
//@piece settleName


// Step 6. The name. The heading is the name, as in the scraper (titleFromPage). The page title adds
// only what the page backs: written the same (spacing, quotes and "&" aside), its spelling stands
// (Tate "90s"); its words past the heading all on the line under the heading, that fuller line joins
// (Poldi Pezzoli); the heading then a separator and a subtitle, the page title stands (KHM "Head and
// Shoulders. Coins in Fashion"). Never its dates, site name or another spelling (MFAH, NPG,
// Philadelphia). A heading that is generic words, the site's name or shares no word with the page
// title gives way to the page title. A title line that is not a heading keeps the page title's
// show, or the line when it runs on.
function settleName(pg){
  const{lr,lines,rule,dateText,dateVenue,h,heading,show,site,broken,after,words,host}=pg;
  const flatName=x=>foldText(stripMd(x)).replace(/&/g," and ").replace(/[^a-z0-9]/g,"");
  const nameWords=x=>foldText(stripMd(x)).replace(/&/g," and ").split(/[^a-z0-9]+/).filter(w=>w&&!GENERIC_TITLE_WORDS.has(w));
  const isHeading=/^\s*#{1,6}\s/.test(lines[h])||h===broken||(after>=0&&h===after);
  const hw=new Set(nameWords(heading));
  // A heading over two lines, or after a venue's marker line, is the page's own name whatever the
  // page title says (Berlin's can be German or misspelt).
  const ownHeading=h===broken||(after>=0&&h===after);
  // A page title naming the site and sharing no word with the heading is the site's own label
  // ("Information: Wallraf-Richartz-Museum"), not the show's name. AL-056a.
  const namesSite=x=>nameWords(x).some(w=>w.length>=4&&foldText(host||"").includes(w));
  const tabIsSiteLabel=!!(show&&namesSite(show)&&!namesSite(heading));
  const headingIsSite=!ownHeading&&(!hw.size||!!(site&&flatName(site)===flatName(heading))||!!(show&&!nameWords(show).some(w=>hw.has(w))&&!tabIsSiteLabel));
  let base;
  if(isHeading&&!headingIsSite){
    base=heading.trim();
    const datedText=x=>{ const r=DATES.findDateRange(dateText(x),{looseSingles:true,venue:dateVenue}); return !!(r.start||r.end)||/^\(?\d{4}\)?$/.test(x.trim()); };
    const k=lines.findIndex((l,i)=>i>h&&stripMd(l)), next=k>0?decodeEntities(stripMd(lines[k])).trim():"";
    const nw=new Set(nameWords(next)), extra=show?nameWords(show).filter(w=>!hw.has(w)):[];
    const rest=show&&flatName(show).startsWith(flatName(heading))?show.slice(show.length-(show.length-heading.length)).replace(/^[^\s.:–—-]*/,""):"";
    if(ownHeading){ rule("name:heading"); }
    else if(show&&flatName(show)===flatName(base)){ base=show; rule("name:tab-spelling"); }
    else if(extra.length&&next&&next.length<=160&&!datedText(next)&&extra.every(w=>nw.has(w))){
      const joined=joinTitle(base,next);
      base=flatName(joined)===flatName(show)?show:joined; rule("name:heading-and-line");
    }else if(show&&/^\s*[.:]\s+\S/.test(rest)&&nameWords(rest).length&&!datedText(rest)&&!(site&&flatName(rest).endsWith(flatName(site)))){ base=show; rule("name:tab-subtitle"); }
  }else{
    const wrapped=show&&heading&&foldText(show).indexOf(foldText(heading))>0;
    base=wrapped?heading:show&&heading.length>show.length&&heading.length<=200&&foldText(heading).startsWith(foldText(show))?heading:(show||heading);
  }
  rule(base===show?(base===heading?"name:tab-is-heading":"name:tab"):base===heading?"name:heading":"name:heading-trimmed");
  if(lr&&lr.title){ const vt=venueTitle(lines,h,heading,lr,words); if(vt&&vt!==base){ base=vt; rule("name:venue-"+lr.title); } }
  pg.base=base;
}
//@piece finishName


// Step 7. What is not the name comes off it: a generic label (shared), then the venue's own.
function finishName(pg){
  const{lr,rule}=pg;
  let base=pg.base;
  // A generic label before the show's own name: "Exhibition: Hubert Robert" (NGA), "Exhibition
  // Vincent's Path to Fame" (Van Gogh Museum), "Mostra Rothko a Firenze" (San Marco).
  { const b=base.replace(/^(?:exhibitions?|mostra|ausstellung|exposition|exposición|tentoonstelling)\s*[:–—-]?\s+(?=\S)/i,"").trim();
    if(b!==base&&b.split(/\s+/).length>=1&&/\p{L}{2}/u.test(b)){ base=b; rule("label-dropped"); } }
  // A venue whose heading runs on past the page title's name (linkRead.tabTitle, the page title's tail
  // that is not the name; Łazienki): that name.
  if(lr&&lr.tabTitle){ const t=(pg.show||"").replace(lr.tabTitle,"").trim();
    if(t&&base.length>t.length&&foldText(base).startsWith(foldText(t))){ base=t; rule("tabTitle"); } }
  // A venue whose headline runs on past the show's name (linkRead.firstSentence; San Marco's
  // press releases): its first sentence only.
  if(lr&&lr.firstSentence){ const b=base.split(/[.!?](?=\s+\p{Lu})/u)[0].trim()||base; if(b!==base)rule("firstSentence"); base=b; }
  // A label the venue puts before the show's own name (linkRead.titleDrop).
  if(lr&&lr.titleDrop){ const b=base.replace(lr.titleDrop,"").trim()||base; if(b!==base)rule("titleDrop"); base=b; }
  // Quotation marks round the whole name (linkRead.unquote; "Mostra “Rothko a Firenze”").
  if(lr&&lr.unquote){ const b=base.replace(/^[“"«‘']\s*(.+?)\s*[”"»’']$/u,"$1"); if(b!==base)rule("unquote"); base=b; }
  // A doubled colon is the venue's typo (NGA, Souvenirs of the Gilded Age).
  if(/\s*:{2,}/.test(base)){ base=base.replace(/\s*:{2,}/g,":"); rule("doubled-colon"); }
  // HTML codes the site left in its heading are decoded, as in the rest of the page ("S&eacute;rusier", Łazienki).
  { const b=decodeEntities(base); if(b!==base)rule("entities"); base=b; }
  pg.base=base;
}
//@piece offerSubtitleLines


// Step 8. The short lines between the title and the dates (or the first few under a title whose
// dates sit above it), offered to Claude as a possible subtitle.
function offerSubtitleLines(pg){
  const{lr,lines,h,d,base}=pg;
  pg.between=lr&&lr.title?[]:lines.slice(h+1,d>h?d:Math.min(lines.length,h+4)).map(stripMd).filter(l=>l&&l.length<=120&&!foldText(base).includes(foldText(l))&&!(lr&&lr.skip&&lr.skip.test(l)));
  if(pg.between.length)pg.rule("between");
}
//@piece LINK_PARAGRAPHS


// Step 9. The passage handed to Claude: the show's own paragraphs from under the title, up to the
// scraper's cut of four paragraphs or 2,000 characters (her decision), the date line left out unless
// it is a paragraph; the venue's own start, stop and skip lines, then the shared rules (see THE
// PASSAGE'S SHARED RULES). The page's text keeps its paragraphs, headings, lists and quotations, and
// they are read as the scraper reads a page's markup: a paragraph's lines are one paragraph (Musée
// des Arts Décoratifs prints a line per few words); a list, a quotation or a table is never the
// show's text (menus, reviews, captions, artists' quotes); a heading turning to other matter ends it.
const LINK_PARAGRAPHS=4;
//@piece takePassage

function takePassage(pg){
  const{lr,lines,rule,h,d,dEnd,heading}=pg;
  const dateLine=decodeEntities(stripMd(lines[d])).replace(/\s+/g," ").trim();
  const keepDateLine=dateLine.length>LINK_DATE_LINE_MAX;
  if(keepDateLine)rule("date-line-kept");
  const headingText=decodeEntities(heading).replace(/\s+/g," ").trim();
  let from=h+1;
  // fromLast: the last such line, where a menu names the section above it (the Tate library).
  if(lr&&lr.from){
    for(let k=h+1;k<lines.length;k++){ if(lr.from.test(stripMd(lines[k]))){ from=k+1; if(!lr.fromLast)break; } }
    if(from>h+1)rule("from");
  }
  // The page under the title in blocks: a heading; a list, quotation or table; or a paragraph, its
  // lines joined. A blank line, a heading or a change of kind starts a new block.
  const blocks=[];
  let cur=null;
  const kindOf=l=>/^\s*#{1,6}\s/.test(l)?"heading":/^\s*>/.test(l)?"quote":/^\s*\|/.test(l)?"table":/^\s*(?:[*+-]|\d+\.)\s/.test(l)?"list":"text";
  for(let k=from;k<lines.length;k++){
    if(k>d&&k<=dEnd||k===d&&!keepDateLine)continue;
    const line=lines[k], own=stripMd(line);
    // The passage ends at the first line matching linkRead.until (a box for other shows).
    if(lr&&lr.until&&lr.until.test(own)){ rule("until"); break; }
    if(!own){ cur=null; continue; }
    if(lr&&lr.skip&&lr.skip.test(own)){ rule("skip"); continue; }
    if(lr&&lr.skipEntities&&/&#?\w+;/.test(own)){ rule("skipEntities"); continue; }
    let t=decodeEntities(own).replace(/\s+/g," ").trim();
    // A line indented under a list item belongs to it; a heading run into a line ("Members only ###
    // A Member's Field Guide", MoMA) is a link to other matter.
    let kind=/^\s{2,}\S/.test(line)&&cur&&cur.kind==="list"?"list":kindOf(line);
    if(kind==="text"&&/\s#{2,6}\s/.test(line)){ kind="heading"; t=t.replace(/^.*\s#{2,6}\s+/,""); }
    // A lead paragraph set as a heading ("##### In 1938, René Magritte gave a lecture…", KMSKA) is a
    // paragraph; a heading that is a link is a card for other matter.
    if(kind==="heading"&&(!/\]\(/.test(line)||lr&&lr.capsText)&&t.split(/\s+/).length>=15&&isProse(t))kind="text";
    if(kind==="heading"||!cur||cur.kind!==kind||kind==="list"&&/^\s*(?:[*+-]|\d+\.)\s/.test(line)){
      cur={kind,text:t,k}; blocks.push(cur);
      if(kind==="heading")cur=null;
    }else cur.text+=" "+t;
  }
  // A sentence wrapped over paragraphs, a line each (a press release's PDF, Enfilade): a paragraph of six
  // words or more that stops mid-sentence joins the next when that one opens in lower case, or when it
  // stops on a word no sentence ends on ("the", "of", a comma). A label or a picture's description above
  // a paragraph stops on neither and stays apart.
  for(let i=0;i+1<blocks.length;i++){
    const a=blocks[i],b=blocks[i+1];
    if(a.kind==="text"&&b.kind==="text"&&!/[.!?:;…"”’»)]$/.test(a.text)&&a.text.split(/\s+/).length>=6
      &&(/^\p{Ll}/u.test(b.text)||/(?:\s(?:a|an|the|of|and|or|to|in|for|with|by|from|his|her|its|their|as|at|on)|,)$/i.test(a.text))){ a.text+=" "+b.text; blocks.splice(i+1,1); i--; }
  }
  let raw="",paras=0,passOver=false;
  const seen=new Set();
  for(const b of blocks){
    if(raw.length>=LINK_RAW_CHARS)break;
    if(paras>=LINK_PARAGRAPHS){ rule("end:four-paragraphs"); break; }
    const t=b.text;
    // Ends only once the show's own text is in: Getty prints "Related Events" above its description.
    if(b.kind==="heading"){ passOver=ONLINE_FEATURE.test(t); if(passOver){ rule("skip:online-feature"); continue; } }
    if(passOver)continue;
    if(b.kind==="heading"||PASSAGE_END.test(t)){
      if(raw&&(OTHER_MATTER.test(t)||PASSAGE_END.test(t))){ rule("end:other-matter"); break; }
      if(raw.length>=LINK_BOX_AFTER&&LINK_BOX.test(t)){ rule("end:box"); break; }
      continue;
    }
    if(b.kind!=="text"){ rule("skip:"+b.kind); continue; }
    if((t===dateLine&&!keepDateLine)||t===headingText||seen.has(t))continue;
    if(isFurniture(t)){ rule("skip:furniture"); continue; }
    if(isCaption(t)){ rule("skip:caption"); continue; }
    // The show's title printed again with a subtitle and no sentence ("Paradise on Earth. Flemish landscape painting from
    // Bruegel to Rubens", Dresden).
    if(pg.base&&foldText(t).startsWith(foldText(pg.base))&&t.split(/\s+/).length<=15&&!CAPTION_VERB.test(t)){ rule("skip:title"); continue; }
    if(!isProse(t)){ rule("skip:not-prose"); continue; }
    // A line typed in capitals is a heading or a quotation shouted (Rijksmuseum's "THIS IS AN ABSOLUTELY
    // FABULOUS SHOW…"), not the show's text.
    const letters=t.replace(/[^\p{L}]/gu,"");
    if(!(lr&&lr.capsText)&&letters.length>=12&&(t.match(/\p{Lu}/gu)||[]).length/letters.length>0.7){ rule("skip:capitals"); continue; }
    const l=withoutBoilerplate(t);
    if(l!==t)rule("boilerplate");
    if(!l||!isProse(l)||isCaption(l))continue;
    if(lr&&lr.minLine&&l.length<lr.minLine){ rule("minLine"); continue; }
    seen.add(t);
    raw+=(raw?"\n":"")+l;
    paras++;
  }
  if(!raw)rule("no-description");
  Object.assign(pg,{dateLine,raw});
}
//@piece pageResult


// Step 10. The answer: the link without tracking tails (or the venue's query, cleanLink), and the
// site's name for a venue the app has not met.
function pageResult(pg){
  const{lr,url,lines,h,rule,range,found,site,vc,host}=pg;
  // The first line under the heading, for a venue whose subtitle sits there.
  const under=lines.slice(h+1).map(stripMd).find(Boolean)||"";
  // The first two lines under the dates, where a house line can sit (linkVenue).
  const afterDates=pg.d>h?lines.slice(pg.dEnd+1).map(stripMd).filter(Boolean).slice(0,2):[];
  let tracked=false; try{ tracked=[...new URL(url).searchParams.keys()].some(k=>TRACKING_PARAM.test(k)); }catch{}
  const link=lr&&lr.cleanLink?String(url).split(/[?#]/)[0]:tracked?withoutTracking(url):url;
  if(link!==url)rule(lr&&lr.cleanLink?"cleanLink":"tracking");
  return{ok:true,base:pg.base,between:pg.between,under,afterDates,start:range.start||"",end:range.end||"",raw:pg.raw.slice(0,LINK_RAW_CHARS),site:site||(linkEntry(vc)||{}).name||host.replace(/^www\./,""),link,noDates:!!found.noDates,scriptDates:!!found.scriptDates,orderUnknown:!!found.orderUnknown,shown:found.shown||"",shownWhy:found.shownWhy||"",dateLine:found.noDates&&!found.shown?"":pg.dateLine,dateNote:DATES.closedEarlyNote(range)};
}
//@piece venueTitle


// A venue's title from its own headings (linkRead.title). "pieces": the heading is the "##"
// and "###" lines run together, joined as the scraper joins them. "subtitle": the "##" line
// under the heading, unless it names one of linkRead.places or is a credit (linkRead.credit).
function venueTitle(lines,h,heading,lr,words){
  const near=[];
  for(let k=h+1;k<lines.length&&near.length<40;k++){ if(lines[k].trim())near.push(lines[k]); }
  if(lr.title==="pieces"){
    const a=near.findIndex(l=>/^\s*##\s+\S/.test(l));
    if(a<0||!/^\s*###\s+\S/.test(near[a+1]||""))return"";
    const name=stripMd(near[a]),sub=stripMd(near[a+1]);
    return words(name+" "+sub)===words(heading)?joinTitle(name,sub,lr.dashAfterColon):"";
  }
  const sub=/^\s*##\s+\S/.test(near[0]||"")?stripMd(near[0]):"";
  if(!sub||(lr.places||[]).some(p=>foldText(p)===foldText(sub))||(lr.credit&&lr.credit.test(sub)))return heading.trim();
  return joinTitle(heading.trim(),sub,lr.dashAfterColon);
}
//@piece linkTitle


// The title is what the catalogue would be called (her decision): a printed subtitle
// is kept. One that carries on the sentence ("and the Masters of Light") joins with a
// space. Claude's subtitle must match one of the page's lines, capitals and spacing
// ignored, and the page's spelling is kept.
function linkTitle(base,subtitle,between){
  const k=v=>foldText(v).replace(/\s+/g," ").trim();
  const sub=(between||[]).find(l=>k(l)===k(subtitle))||"";
  if(!sub||foldText(base).includes(foldText(sub)))return base;
  return base.replace(/[\s:.—-]+$/,"")+(/^(and|&)\s/.test(sub)?" ":": ")+sub;
}
//@piece nameInLines


// A venue whose full name sits on a line below its heading (linkRead.nameInLines): that line.
function nameInLines(page,vc){
  if(!(linkOptions(vc)||{}).nameInLines)return"";
  const b=foldText(page.base).trim();
  return (page.between||[]).filter(l=>{ const f=foldText(l).trim(); return f.length>b.length&&f.startsWith(b); })
    .sort((x,y)=>y.length-x.length)[0]||"";
}
