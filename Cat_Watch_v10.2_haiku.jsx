import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

const MUSEUMS = [
  { id:"met", short:"The Met", name:"The Metropolitan Museum of Art", city:"New York",
    exBase:"https://www.metmuseum.org/exhibitions/", shopSearch:"https://store.metmuseum.org/search?q=", shopHome:"https://store.metmuseum.org/", listUrl:"https://www.metmuseum.org/exhibitions" },
  { id:"ng", short:"National Gallery", name:"The National Gallery", city:"London",
    exBase:"https://www.nationalgallery.org.uk/exhibitions/", shopSearch:"https://shop.nationalgallery.org.uk/search?q=", shopHome:"https://shop.nationalgallery.org.uk/", listUrl:"https://www.nationalgallery.org.uk/exhibitions" },
  { id:"rijks", short:"Rijksmuseum", name:"Rijksmuseum", city:"Amsterdam",
    exBase:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/", shopSearch:"https://www.rijksmuseumshop.nl/en/search?q=", shopHome:"https://www.rijksmuseumshop.nl/en/", listUrl:"https://www.rijksmuseum.nl/en/whats-on/exhibitions/now-on-view" },
  { id:"acq", short:"Acquavella", name:"Acquavella Galleries", city:"New York",
    exBase:"https://www.acquavellagalleries.com/exhibitions/", shopSearch:"https://acquavellagalleries.myshopify.com/search?q=", shopHome:"https://acquavellagalleries.myshopify.com/", listUrl:"https://www.acquavellagalleries.com/exhibitions" },
  { id:"louvre", short:"Louvre", name:"Louvre Museum", city:"Paris", exBase:null, shopSearch:null, shopHome:"https://boutique.louvre.fr/en/", listUrl:null },
  { id:"uffizi", short:"Uffizi", name:"Uffizi Galleries", city:"Florence", exBase:null, shopSearch:null, shopHome:"https://shop.uffizi.it/en/", listUrl:null },
  { id:"borghese", short:"Borghese", name:"Galleria Borghese", city:"Rome", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"brera", short:"Brera", name:"Pinacoteca di Brera", city:"Milan", exBase:null, shopSearch:null, shopHome:"https://bottegabrera.org/en/", listUrl:null },
  { id:"capo", short:"Capodimonte", name:"Museo e Real Bosco di Capodimonte aka Museo Nazionale di Capodimonte", city:"Naples", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"dellav", short:"Accademia", name:"Gallerie dell'Accademia", city:"Venice", exBase:null, shopSearch:null, shopHome:null, listUrl:null },
  { id:"khm", short:"KHM Vienna", name:"Kunsthistorisches Museum", city:"Vienna", exBase:null, shopSearch:null, shopHome:"https://shop.khm.at/en/", listUrl:null },
  { id:"moma", short:"MoMA", name:"Museum of Modern Art", city:"New York", exBase:null, shopSearch:null, shopHome:"https://store.moma.org/", listUrl:null },
  { id:"frick", short:"Frick", name:"The Frick Collection", city:"New York", exBase:null, shopSearch:null, shopHome:"https://shop.frick.org/", listUrl:null },
  { id:"morgan", short:"Morgan", name:"Morgan Library & Museum", city:"New York", exBase:null, shopSearch:null, shopHome:"https://shop.themorgan.org/", listUrl:null },
  { id:"menil", short:"Menil", name:"The Menil Collection", city:"Houston", exBase:null, shopSearch:null, shopHome:"https://bookstore.menil.org/", listUrl:null },
  { id:"artic", short:"Art Institute", name:"Art Institute of Chicago", city:"Chicago", exBase:null, shopSearch:null, shopHome:"https://shop.artic.edu/", listUrl:null },
  { id:"va", short:"V&A", name:"Victoria and Albert Museum", city:"London", exBase:null, shopSearch:null, shopHome:"https://www.vam.ac.uk/shop", listUrl:null },
  { id:"brit", short:"British Museum", name:"The British Museum", city:"London", exBase:null, shopSearch:null, shopHome:"https://britishmuseumshoponline.org/", listUrl:null },
  { id:"wallace", short:"Wallace", name:"The Wallace Collection", city:"London", exBase:null, shopSearch:null, shopHome:"https://wallacecollectionshop.org/", listUrl:null },
  { id:"tate-modern", short:"Tate Modern", name:"Tate Modern", city:"London", exBase:null, shopSearch:null, shopHome:"https://shop.tate.org.uk/", listUrl:null },
  { id:"tate-britain", short:"Tate Britain", name:"Tate Britain", city:"London", exBase:null, shopSearch:null, shopHome:"https://shop.tate.org.uk/", listUrl:null },
];
const MU = Object.fromEntries(MUSEUMS.map(m=>[m.id,m]));

// ---- v9 pro forma helpers (pure) ----
const KNOWN_VENUES = new Set(MUSEUMS.map(m=>m.id));
function isValidYMD(s){ if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+"T00:00:00"); return !isNaN(d.getTime()); }
// SAME ADDRESS MEANS SAME EXHIBITION — the one identity test with no
// judgement in it, and the scraper's own settled rule. Scheme and host are
// lowercased because hosts are case-insensitive by spec; THE PATH IS NOT
// TOUCHED, because folding it merged two exhibitions that differed only in
// capitalisation. A trailing slash and a #fragment are not part of identity.
function normalizeUrlKey(u){
  try{
    const x=new URL(String(u||"").trim());
    x.hash="";
    const path=x.pathname.replace(/\/+$/,"");
    return x.protocol.toLowerCase()+"//"+x.host.toLowerCase()+path+x.search;
  }catch{ return ""; }
}

function urlLooksValid(u){ if(!u)return false; try{ const url=new URL(String(u).trim()); if(!/^https?:$/.test(url.protocol))return false; if(!/^[a-z0-9.-]+$/i.test(url.hostname))return false; if(!url.hostname.includes("."))return false; return true; }catch{ return false; } }
function csvParse(text){
  const out=[]; let i=0,field="",row=[],inQ=false; text=String(text).replace(/\r\n?/g,"\n");
  const pushF=()=>{row.push(field);field="";}; const pushR=()=>{out.push(row);row=[];};
  while(i<text.length){ const c=text[i];
    if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i+=2;continue;} inQ=false;i++;continue;} field+=c;i++;continue; }
    if(c==='"'){inQ=true;i++;continue;}
    if(c===','){pushF();i++;continue;}
    if(c==='\n'){pushF();pushR();i++;continue;}
    field+=c;i++;
  }
  if(field.length>0||row.length>0){pushF();pushR();}
  return out.filter(r=>r.some(c=>String(c).trim()!==""));
}

const TIERS = {
  upcoming:{ label:"Announced", note:"Not open yet. Catalogue usually appears at opening.", ink:"#4A5A6B", wash:"#E1E5EB", time:"upcoming", ord:3 },
  recent:  { label:"Recently opened", note:"Just opened. Catalogue should be available now.", ink:"#2D6B5A", wash:"#D4EDE4", time:"current", ord:0 },
  current: { label:"On now", note:"In print. Cheapest it will ever be.", ink:"#2D4A3F", wash:"#DBE7E1", time:"current", ord:1 },
  fresh:   { label:"Closed under 3 months", note:"Still stocked. Comfortable window.", ink:"#556B3E", wash:"#E3E8D8", time:"past", ord:4 },
  closing: { label:"Closed 3\u20136 months", note:"Shop stock thinning. Buy now if you want it.", ink:"#9C7020", wash:"#F0E6CE", time:"past", ord:5 },
  urgent:  { label:"Closed 6\u201312 months", note:"Final call. Reprints are rare.", ink:"#A13823", wash:"#F0DCD6", time:"past", ord:6 },
  lapsed:  { label:"Closed over a year", note:"Assume out of print. Secondhand only.", ink:"#6B2E2E", wash:"#E5D6D4", time:"past", ord:7 },
  unknown: { label:"Dates unclear", note:"No reliable end date found.", ink:"#6A6560", wash:"#E3DED7", time:"current", ord:2 },
};

function relTime(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"just now";const m=Math.floor(s/60);if(m<60)return m+" minute"+(m===1?"":"s")+" ago";const h=Math.floor(m/60);if(h<24)return h+" hour"+(h===1?"":"s")+" ago";const day=Math.floor(h/24);return day+" day"+(day===1?"":"s")+" ago";}
function minsSinceIso(iso){if(!iso)return Infinity;const d=new Date(iso);if(isNaN(d))return Infinity;return(Date.now()-d.getTime())/60000;}
const MS_MO=1e3*60*60*24*30.44, MS_WK=1e3*60*60*24*7;
const moSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_MO;};
const wksSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_WK;};

function tierFor(r){
  const now=new Date(),st=r.startDate?new Date(r.startDate+"T00:00:00"):null,en=r.endDate?new Date(r.endDate+"T00:00:00"):null;
  if(st&&!isNaN(st)&&st>now)return"upcoming";
  if(en&&!isNaN(en)){if(en>=now){return(st&&wksSince(r.startDate)<=6)?"recent":"current";}const m=moSince(r.endDate);if(m<3)return"fresh";if(m<6)return"closing";if(m<12)return"urgent";return"lapsed";}
  if(st&&!isNaN(st)&&st<=now)return wksSince(r.startDate)<=6?"recent":"current";
  return"unknown";
}

const S=[
["met","Musical Bodies","2026-06-07","2026-09-27","Instruments as sculptural and bodily objects from the Met's collection.","musical-bodies"],
["met","Costume Art","2026-05-10","2027-01-10","Costume Institute spring show. Inaugurates new fashion galleries.","costume-art"],
["met","Giacometti in the Temple of Dendur","2026-06-12","2026-09-08","Giacometti's elongated figures alongside the Egyptian temple.","giacometti-in-the-temple-of-dendur"],
["met","Orientalism: Between Fact and Fantasy",null,"2027-02-28","Nineteenth-century European depictions of the Middle East and North Africa.","orientalism-between-fact-and-fantasy"],
["met","Futurism, Constructivism, and Dada in Georgia",null,"2026-10-27","The avant-garde in Tbilisi during Georgia's brief independence.","futurism-constructivism-and-dada-in-georgia-1917-1928"],
["met","Rediscovering Della Robbia at The Met",null,"2028-01-17","Glazed terracotta from the Della Robbia workshop.","rediscovering-della-robbia-at-the-met"],
["met","Revolution!",null,"2026-09-07","Prints and visual material around revolutionary upheaval.","revolution"],
["met","City of Memory: Nanjing",null,"2027-01-03","Chinese painting from the Ming\u2013Qing transition.","city-of-memory-nanjing-in-the-17th-century"],
["met","Household Gods",null,"2027-06-27","Hindu devotional chromolithographs and domestic devotion.","household-gods-hindu-devotional-prints-1860-1930"],
["met","Ecologies of Painting",null,"2027-01-17","Painting through landscape, environment and material relations.","ecologies-of-painting"],
["met","Flip Sides: Seeing Korean Art Anew",null,"2027-05-31","Korean objects revealing their reverse or hard-to-see aspects.","flip-sides-seeing-korean-art-anew"],
["met","The Infinite Artistry of Japanese Ceramics",null,"2027-08-08","Japanese ceramic traditions across technique, glaze and form.","the-infinite-artistry-of-japanese-ceramics"],
["met","Cottage Industry: Val-Kill Furniture Shop",null,"2027-05-09","Eleanor Roosevelt's Val-Kill workshop.","cottage-industry-the-val-kill-furniture-shop"],
["met","Afterlives: Contemporary Art in the Byzantine Crypt",null,"2027-01-10","Contemporary work in the Byzantine galleries.","afterlives-contemporary-art-in-the-byzantine-crypt"],
["met","Celebrating the Year of the Horse",null,"2027-01-26","Asian works for the lunar new year.","celebrating-the-year-of-the-horse"],
["met","Independence and Identity",null,"2026-09-29","Works on paper addressing independence movements.","independence-and-identity-selections-from-the-department-of-drawings-and-prints"],
["met","A King\u2019s Carpet: Louis XIV and the Savonnerie","2026-09-08","2028-03-05","Savonnerie carpets and French court display.","a-kings-carpet-louis-xiv-and-the-savonnerie"],
["met","Chasing Clouds","2026-09-14","2027-02-28","Cloud studies across painting, drawing and photography.","chasing-clouds"],
["met","The Genesis Facade Commission: Liu Wei","2026-09-17","2027-06-08","Liu Wei's sculptures for the facade niches.","the-genesis-facade-commission-liu-wei"],
["met","David Hartt: Peripheries","2026-09-25","2027-02-07","Architecture, migration and the edges of cities.","david-hartt-peripheries"],
["met","There Are No Words: Si Lewen\u2019s Parade","2026-10-01","2027-01-05","Wordless picture sequence on war.","there-are-no-words-si-lewens-parade"],
["met","Krasner and Pollock: Past Continuous","2026-10-04","2027-01-31","Lee Krasner and Jackson Pollock, exchange and divergence.","krasner-and-pollock-past-continuous"],
["met","Designing the Gilded Age: Tiffany","2026-10-22","2027-02-07","Drawings from Tiffany's decorating studios.","designing-the-gilded-age-drawings-from-the-studios-of-louis-c-tiffany"],
["met","Across Wine-Dark Seas","2026-12-20","2027-04-11","Greek visual culture around the Mediterranean.","across-wine-dark-seas-art-and-identity-beyond-ancient-greece"],
["met","John Galliano: Horizons","2027-05-09","2028-01-09","Costume Institute 2027 on Galliano's career.","john-galliano-horizons"],
["met","Lillian Bassman: Bazaar and Beyond","2026-03-02","2026-07-26","Fashion photographer for Harper's Bazaar.","lillian-bassman-bazaar-and-beyond"],
["met","Gothic by Design","2026-04-16","2026-07-19","Architectural drawing in the Gothic period.","gothic-by-design-the-dawn-of-architectural-draftsmanship"],
["met","Raphael: Sublime Poetry","2026-03-29","2026-06-28","First comprehensive US presentation of Raphael.","raphael-sublime-poetry"],
["met","A Passion for Jade","2022-07-02","2026-06-28","Heber Bishop's jade collection.","passion-for-jade"],
["met","Embracing Color: Enamel in Chinese Decorative Arts","2022-07-02","2026-06-28","Cloisonn\u00e9 and painted enamel across six centuries.","embracing-color"],
["met","Making It Modern: European Ceramics","2025-06-16","2026-06-14","Studio ceramics from the Eidelberg collection.","making-it-modern-european-ceramics-from-the-martin-eidelberg-collection"],
["met","The Genesis Facade Commission: Jeffrey Gibson","2025-09-12","2026-06-09","Gibson's beaded sculptures for the facade.","the-facade-commission-jeffrey-gibson"],
["met","Iba Ndiaye","2025-05-31","2026-05-31","Senegalese modernist painter.","iba-n-diaye-between-latitude-and-longitude"],
["met","The Magical City: George Morrison\u2019s New York","2025-07-17","2026-05-31","Ojibwe painter's abstract New York work.","the-magical-city-george-morrison-s-new-york"],
["met","Fanmania","2025-12-11","2026-05-12","Folding fans as fashion and display.","fanmania"],
["met","Chinese Painting and Calligraphy","2025-11-22","2026-05-10","Rotation from the Met's holdings.","chinese-painting-and-calligraphy-selections-from-the-collection"],
["met","View Finding: Walther Collection","2025-10-28","2026-05-03","Photography, African and diasporic practice.","view-finding-selections-from-the-walther-collection"],
["met","Seeing Silence: Helene Schjerfbeck","2025-12-05","2026-04-05","Finnish painter's pared-back portraits.","seeing-silence-the-paintings-of-helene-schjerfbeck"],
["met","Jousting Armor of Philip I of Castile","2023-05-11","2026-04-01","Rare surviving jousting harness.","the-jousting-armor-of-philip-i-of-castile"],
["met","Spectrum of Desire: Middle Ages","2025-10-17","2026-03-29","Medieval desire, sexuality and gender.","spectrum-of-desire-love-sex-and-gender-in-the-middle-ages"],
["met","Emily Sargent: Portrait of a Family","2025-07-01","2026-03-08","Watercolours by Sargent's sister.","emily-sargent-portrait-of-a-family"],
["met","Impressions of the Imagination","2026-02-05","2026-03-03","Printed bestiary imagery.","impressions-of-the-imagination-new-medieval-beasts-in-print"],
["met","The Brooklyn Bridge Up Close","2025-12-08","2026-02-22","Bridge construction in drawings and prints.","the-brooklyn-bridge-up-close"],
["met","Colorful Korea","2024-12-02","2026-02-16","Korean textiles and ceramics.","colorful-korea"],
["met","Witnessing Humanity: John Wilson","2025-09-20","2026-02-08","African American figurative work on race and dignity.","witnessing-humanity-the-art-of-john-wilson"],
["met","Man Ray: When Objects Dream","2025-09-14","2026-02-01","Photographs, rayographs across Dada and Surrealism.","man-ray-when-objects-dream"],
["met","Celebrating the Year of the Snake","2025-01-11","2026-02-01","Asian works featuring the snake.","celebrating-the-year-of-the-snake"],
["met","Casa Susanna","2025-07-21","2026-01-25","1950s\u201360s Catskills retreat photographs.","casa-susanna"],
["met","Divine Egypt","2025-10-12","2026-01-19","Major Egyptian exhibition on twenty deities.","divine-egypt"],
["met","Christmas Tree and Neapolitan Cr\u00e8che","2025-11-25","2026-01-06","Annual Neapolitan cr\u00e8che figures.","christmas-tree-and-neapolitan-baroque-creche-2025"],
["met","Ganesha: Lord of New Beginnings","2022-11-19","2026-01-04","Depictions of Ganesha across Asian art.","ganesha"],
["ng","Zurbar\u00e1n",null,"2026-08-23","First UK exhibition of Zurbar\u00e1n.","zurbaran"],
["ng","Monet and Renoir: Painting Side by Side","2026-07-27","2026-09-15","Two Impressionist paintings at the same motif.","monet-and-renoir-painting-side-by-side"],
["ng","Waldm\u00fcller: Landscapes","2026-07-02","2026-09-20","First UK exhibition of Waldm\u00fcller.","waldmuller-landscapes"],
["ng","Take One Picture 2026",null,"2026-08-31","Children's artworks inspired by Canaletto.","take-one-picture-2026"],
["ng","Renoir and Love","2026-10-03","2027-01-31","Renoir gathered around the theme of love.","renoir-and-love"],
["ng","Yinka Shonibare and Gainsborough","2026-10-15","2027-02-07","Britain's celebrated work reimagined.","yinka-shonibare-and-thomas-gainsborough-a-conversation"],
["ng","Van Eyck: The Portraits","2026-11-21","2027-04-11","All of Van Eyck's portraits together.","van-eyck-the-portraits"],
["ng","Catharina van Hemessen","2027-03-04","2027-05-30","Renaissance artist who painted herself into history.","catharina-van-hemessen"],
["ng","German Expressionism","2027-03-20","2027-08-01","Fifty German Expressionist works.","german-expressionism-modern-painting-1900-1918"],
["ng","Stubbs: Portrait of a Horse","2026-03-12","2026-05-31","George Stubbs, master of horse painting.","past/stubbs-portrait-of-a-horse"],
["ng","Wright of Derby: From the Shadows","2025-11-07","2026-05-10","Joseph Wright of Derby's candlelight paintings.","past/wright-of-derby-from-the-shadows"],
["ng","Ming Wong: Dance of the Sun on the Water","2026-01-15","2026-04-06","Short film based on Saint Sebastian.","past/the-national-gallery-artist-in-residence-ming-wong"],
["ng","Edwin Austin Abbey","2025-11-20","2026-02-15","American artist and Pennsylvania Capitol ceiling.","past/edwin-austin-abbey-by-the-dawn-s-early-light"],
["ng","Radical Harmony: Neo-Impressionists","2025-09-13","2026-02-08","Seurat, Van Gogh, Signac and Pissarro.","past/radical-harmony-neo-impressionists"],
["ng","Millet: Life on the Land","2025-08-07","2025-10-19","The subjects that made Millet famous.","past/millet-life-on-the-land"],
["ng","Take One Picture 2025","2025-06-11","2025-08-31","Children's artworks inspired by de Hooch.","past/take-one-picture-2025"],
["ng","Jos\u00e9 Mar\u00eda Velasco","2025-03-29","2025-08-17","Mexico's landscape painter.","past/velasco"],
["ng","The Carracci Cartoons","2025-04-10","2025-07-06","Carracci brothers' creative process.","past/the-carracci-cartoons-myths-in-the-making"],
["ng","Siena: The Rise of Painting","2025-03-08","2025-06-22","Earliest Sienese trecento paintings.","past/siena-the-rise-of-painting"],
["ng","Parmigianino","2024-12-05","2025-03-09","Visionary Renaissance artist at work.","past/parmigianino-the-vision-of-saint-jerome"],
["ng","Discover Constable and The Hay Wain","2024-10-17","2025-02-02","Behind the making of The Hay Wain.","past/discover-constable-and-the-hay-wain"],
["ng","Van Gogh: Poets and Lovers","2024-09-14","2025-01-19","Once-in-a-century Van Gogh exhibition.","past/van-gogh-poets-and-lovers"],
["ng","NG Stories: Making a National Gallery","2024-10-04","2025-01-12","Two hundred years of Gallery history.","past/ng-stories-making-a-national-gallery"],
["ng","Hockney and Piero: A Longer Look","2024-08-08","2024-10-27","Hockney against Piero della Francesca.","past/hockney-and-piero-a-longer-look"],
["ng","Discover Degas and Miss La La","2024-06-06","2024-09-01","The circus performer's life.","past/discover-degas-and-miss-la-la"],
["rijks","Ed van der Elsken. Up Close","2026-06-19","2026-09-13","Unfiltered street energy across decades.","ed-van-der-elsken"],
["rijks","Fiep Westendorp","2026-06-19","2026-09-13","150 original drawings by the illustrator.","fiep-westendorp"],
["rijks","Carel Visser in the Rijksmuseum Gardens","2026-06-05","2026-10-25","Most influential Dutch sculptor of the twentieth century.","carel-visser"],
["rijks","WORN","2026-03-27","2027-03-21","Dress and textiles: garments from 1640 to 1930.","worn"],
["rijks","Willem de Kooning at work","2026-10-09","2027-01-17","120 works tracing De Kooning's process.","willem-de-kooning-at-work"],
["rijks","Document Netherlands: New Energy","2026-10-09","2027-01-17","Annual commission to a Dutch photographer.","document-netherlands-new-energy"],
["rijks","The Art of Drawing","2027-02-12","2027-05-23","Transformation of drawing, 100 highlights.","draw"],
["rijks","Metamorphoses","2026-02-06","2026-05-25","Ovid: Bernini, Titian to Rodin, Magritte, Bourgeois.","metamorphoses"],
["rijks","Fake!","2026-02-06","2026-05-25","Early photocollages and photomontages.","fake"],
["rijks","Suit Yourself: Menswear 1750\u20131850","2025-03-22","2026-03-15","A century of men's dress.","suit-yourself-or100-years-of-menswear-1750-1850"],
["rijks","Occupied City","2025-09-12","2026-01-25","Amsterdam under occupation, Steve McQueen.","steve-mcqueen-occupied-city"],
["rijks","At Home in the 17th Century","2025-10-17","2026-01-11","Domestic life with Rembrandt, Hals, Vermeer.","past/thuis-in-de-17de-eeuw"],
["rijks","Document Nederland: Tina Farifteh","2025-11-01","2026-01-11","Annual Dutch photography commission.","past/document-nederland-tina-farifteh"],
["rijks","Isamu Noguchi in the Gardens","2025-05-28","2025-10-26","Garden sculpture devoted to Noguchi.","past/isamu-noguchi-in-de-rijksmuseumtuinen"],
["rijks","Crossings","2025-07-04","2025-10-12","Photography from the Indian subcontinent.","crossings"],
["rijks","Fiona Tan: Monomania","2025-07-04","2025-09-14","The artist's view on the collection.","fiona-tan-monomania"],
["rijks","Asian Bronze","2024-09-27","2025-01-12","Four thousand years of Asian bronze.","past/asian-bronze"],
["rijks","Festival Frenzy","2024-09-27","2025-01-12","Dutch festivals photographed.","past/festival-frenzy"],
["rijks","Lee Ufan in the Gardens","2024-05-28","2024-10-27","Garden sculpture devoted to Lee Ufan.","past/lee-ufan"],
["rijks","Frans Hals","2024-02-16","2024-06-09","Major Haarlem portraitist retrospective.","past/frans-hals"],
["acq","Joan Mir\u00f3 | Jean Paul Riopelle","2026-09-01",null,"Palm Beach. Two painters shown together.","joan-miro-jean-paul-riopelle"],
["acq","Matisse: The Pursuit of Harmony","2026-04-09","2026-05-22","New York. Matisse's investigation of form.","matisse2"],
["acq","Soft Reins: From Degas to Fordjour","2026-02-06","2026-04-06","Palm Beach. Horse and equestrian.","soft-reins"],
["acq","Masters of Modernism","2025-12-13","2026-02-02","Palm Beach. Gauguin to Warhol survey.","masters-of-modernism"],
["acq","Nicole Wittenberg: All the Way","2025-10-16","2025-12-05","New York. First solo.","nicole-wittenberg2"],
["acq","Yuka Kashihara: Stardust","2025-10-15","2025-12-08","Palm Beach. Recent paintings.","yuka-kashihara2"],
["acq","Miquel Barcel\u00f3","2025-04-24","2025-05-30","New York. Recent work.","miquel-barcelo4"],
["acq","Joani Tremblay","2025-04-17","2025-06-15","Palm Beach. Landscape painting.","joani-tremblay"],
["acq","Postwar Abstraction","2025-02-28","2025-04-13","Palm Beach. Postwar abstract painting.","postwar-abstraction"],
["acq","Portraiture: Cassatt to Warhol","2025-01-21","2025-04-04","New York. Impressionism to Pop.","portraiture-from-cassatt-to-warhol"],
["acq","Harumi Klossowska de Rola","2025-01-11","2025-02-23","Palm Beach. Balthus's daughter.","harumi-klossowska-de-rola"],
["acq","Portraiture: Cassatt to Warhol (Palm Beach)","2024-11-22","2025-01-05","Palm Beach. First staging.","portraiture-from-cassatt-to-warhol-palm-beach"],
["acq","Tom Sachs: Bronze","2024-11-07","2024-12-13","New York. Bricolage in bronze.","tom-sachs3"],
["acq","Jacob El Hanani: Drawing on Canvas","2024-09-10","2024-10-18","New York. Microscopically fine line drawing.","jacob-el-hanani"],
];

function buildSeed(){return S.map(([m,t,s,e,d,sl])=>{const id=m+"-"+t.toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,50);const mu=MU[m];return{id,museumId:m,title:t,startDate:s||null,endDate:e||null,summary:d,exUrl:sl?(mu.exBase+sl):mu.listUrl,interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,shopUrl:null,shopState:null};});}

function mergeSeedInto(existing){const byId=new Map(existing.map(r=>[r.id,r]));for(const s of buildSeed()){const p=byId.get(s.id);if(p)byId.set(s.id,{...p,startDate:p.startDate||s.startDate,endDate:p.endDate||s.endDate,summary:p.summary||s.summary,exUrl:p.exUrl||s.exUrl,watching:p.watching||false});else byId.set(s.id,s);}return Array.from(byId.values());}

const cleanIsbn=v=>{if(!v)return null;const d=String(v).replace(/[^0-9]/g,"");return d.length===13?d:null;};
const fmtIsbn=v=>{const c=cleanIsbn(v);return c?c.slice(0,3)+"-"+c.slice(3):null;};
const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");if(isNaN(x))return d;return x.getDate()+" "+MON3[x.getMonth()]+" "+x.getFullYear();};
function fmtRefresh(iso){if(!iso)return"never";const d=new Date(iso);if(isNaN(d))return"never";const mon=MON3[d.getMonth()];let h=d.getHours();const ap=h<12?"am":"pm";h=h%12;if(h===0)h=12;const mm=String(d.getMinutes()).padStart(2,"0");return mon+" "+d.getDate()+", "+d.getFullYear()+" "+h+":"+mm+ap;}
function dateRange(r){const a=fmtDate(r.startDate),b=fmtDate(r.endDate);if(a&&b)return a+" \u2014 "+b;if(b)return"until "+b;if(a){const st=new Date(r.startDate+"T00:00:00");const past=!isNaN(st)&&st<=new Date();return(past?"open since ":"opens ")+a;}return"dates unknown";}

function buyLinks(r){const isbn=cleanIsbn(r.isbn13),title=r.catalogueTitle||r.title,q=encodeURIComponent(isbn||title),tq=encodeURIComponent(title),mu=MU[r.museumId],out=[];if(r.shopUrl)out.push({name:"Museum shop",href:r.shopUrl});else if(mu&&mu.shopSearch)out.push({name:"Museum shop",href:mu.shopSearch+tq});else if(mu&&mu.shopHome)out.push({name:"Museum shop",href:mu.shopHome});if(r.publisherUrl)out.push({name:"Publisher",href:r.publisherUrl});out.push({name:"Amazon AU",href:"https://www.amazon.com.au/s?k="+q},{name:"AbeBooks AU",href:"https://www.abebooks.com/servlet/SearchResults?kn="+(isbn||tq)+"&sts=t"},{name:"Alibris",href:"https://www.alibris.com/booksearch?keyword="+q});return out;}

async function askClaude(prompt,opts){opts=opts||{};let res;const tool={type:"web_search_20250305",name:"web_search"};if(opts.maxUses)tool.max_uses=opts.maxUses;if(opts.allowedDomains&&opts.allowedDomains.length)tool.allowed_domains=opts.allowedDomains;try{res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:4096,messages:[{role:"user",content:prompt}],tools:[tool]})});}catch(e){return{ok:false,text:"",detail:"Network: "+e.message};}const raw=await res.text();if(!res.ok)return{ok:false,text:"",detail:"HTTP "+res.status};let data;try{data=JSON.parse(raw);}catch{return{ok:false,text:"",detail:"Not JSON"};}const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");return{ok:true,text,detail:"stop:"+data.stop_reason+"\n"+text.slice(0,500)};}

function extractObjects(text){if(!text)return[];const out=[];let depth=0,start=-1,inStr=false,esc=false;for(let i=0;i<text.length;i++){const c=text[i];if(inStr){if(esc)esc=false;else if(c==="\\")esc=true;else if(c==='"')inStr=false;continue;}if(c==='"')inStr=true;else if(c==="{"){if(depth===0)start=i;depth++;}else if(c==="}"){depth--;if(depth===0&&start!==-1){try{out.push(JSON.parse(text.slice(start,i+1)));}catch{}start=-1;}}}return out;}

const today=()=>new Date().toISOString().slice(0,10);
function exPrompt(mu,p){
  return `Read the museum's ${p} exhibition listing at ${mu.listUrl}.
Extract EVERY exhibition shown on that listing. Do not open individual exhibition pages.
For each exhibition return ONLY:
- exact exhibition-page URL as linked from the listing
- title
- startDate
- endDate
- one-sentence description if the listing provides one
Do not search for catalogues or catalogue information.
Do not add commentary.
Return JSON array only.
[{"url":"","title":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","summary":""}]`;
}
function shopDomain(mu){if(!mu||!mu.shopHome)return null;try{return new URL(mu.shopHome).hostname;}catch{return null;}}
function shopPrompt(r,mu){return'Search ONLY this museum shop for the printed exhibition catalogue (the book) for: "'+r.title+'" at '+(mu?mu.name:"")+'.\nLook for the catalogue\'s own product page in this shop. Return JSON only, no other text:\n{inShop: true or false, shopUrl: the product page URL in this shop or null, catalogueTitle, isbn13: 13 digits only, publisher, publisherUrl}\nIf you cannot find the catalogue in this shop, return inShop:false.';}
function webPrompt(r,mu){return'Confirm whether a printed exhibition catalogue (a book) exists for: "'+r.title+'" at '+(mu?mu.name:"")+'.\nReturn JSON only, no other text:\n{hasCatalogue: "yes" or "no", catalogueTitle, isbn13: 13 digits only, publisher, publisherUrl}\nIf no catalogue was ever published, hasCatalogue:"no".';}

const SKEY="cw-v3";
// DORMANT in v8: Claude cloud save is kept in the file but nothing calls it.
// Drive is the single source of truth. Re-wire this only if Drive is retired.
async function safeSave(rows,lastRun,lastSaved){const data=JSON.stringify({rows,lastRun,lastSaved:lastSaved||new Date().toISOString()});for(let i=0;i<3;i++){try{const r=await window.storage.set(SKEY,data,false);if(r)return{ok:true};}catch{}await new Promise(r=>setTimeout(r,500*(i+1)));}return{ok:false};}

// ---- Google Drive spine (v8) ----------------------------------------------
// Ledger files are saved as cat-watch-ledger-<localstamp>.json. Newest loads
// on open; every save writes a NEW file (versioned backups, nothing deleted).
const DRIVE_MCP={type:"url",url:"https://drivemcp.googleapis.com/mcp/v1",name:"google-drive"};
const LEDGER_PREFIX="cat-watch-ledger-";
let AUTOLOAD_FIRED=false; // module-level: survives a strict-mode remount so open never costs two Drive calls

// Local 24hr timestamp (browser's timezone), e.g. 2026-08-23-2230 = 10:30pm local.
function localStamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
function localReadable(){const d=new Date(),p=n=>String(n).padStart(2,"0");return p(d.getHours())+":"+p(d.getMinutes())+" "+p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();}

// One instrumented call to Drive via the Anthropic API + MCP. Returns text + diagnostics.
async function askDrive(prompt){
  let res,raw;
  try{
    res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,messages:[{role:"user",content:prompt}],mcp_servers:[DRIVE_MCP]})});
  }catch(e){return{ok:false,usedTool:false,text:"",detail:"Could not reach Drive (network): "+(e&&e.message?e.message:String(e))};}
  if(!res.ok){raw=await res.text().catch(()=>"");return{ok:false,usedTool:false,text:"",detail:"HTTP "+res.status+" "+raw.slice(0,300)};}
  raw=await res.text();
  let data;try{data=JSON.parse(raw);}catch{return{ok:false,usedTool:false,text:"",detail:"Drive reply was not JSON."};}
  const blocks=Array.isArray(data.content)?data.content:[];
  const text=blocks.filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const usedTool=blocks.some(b=>b.type==="mcp_tool_use");
  const toolErr=blocks.some(b=>b.type==="mcp_tool_result"&&b.is_error===true);
  return{ok:true,usedTool,toolErr,text,detail:"blocks: "+blocks.map(b=>b.type).join(", ")+"\n"+text.slice(0,400)};
}

// Pull the newest ledger JSON out of a Drive read reply.
function extractLedgerJson(text){
  if(!text)return null;
  let depth=0,start=-1,inStr=false,esc=false,best=null;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(inStr){if(esc)esc=false;else if(c==="\\")esc=true;else if(c==='"')inStr=false;continue;}
    if(c==='"')inStr=true;else if(c==="{"){if(depth===0)start=i;depth++;}
    else if(c==="}"){depth--;if(depth===0&&start!==-1){const chunk=text.slice(start,i+1);try{const o=JSON.parse(chunk);if(o&&Array.isArray(o.rows))best=o;}catch{}start=-1;}}}
  return best;
}

export default function App(){
  const[rows,setRows]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[busy,setBusy]=useState(false);
  const[busyId,setBusyId]=useState(null);
  const[lookPhase,setLookPhase]=useState(null); // DIAGNOSTIC: "shop"|"web"|null — which lookup step is running (revert to plain "Searching…" later)
  const[prog,setProg]=useState({done:0,total:0,label:""});
  const[error,setError]=useState(null);
  const[saveErr,setSaveErr]=useState(false);
  const[debug,setDebug]=useState(null);
  const[showDebug,setShowDebug]=useState(false);
  const[lastRun,setLastRun]=useState(null);
  const[lastSaved,setLastSaved]=useState(null);
  const[saveState,setSaveState]=useState("idle");
  const[firstTime,setFirstTime]=useState(false);
  const[dirty,setDirty]=useState(false);
  const[driveMsg,setDriveMsg]=useState(null);
  const[savedFile,setSavedFile]=useState(null);
  const[loadedInfo,setLoadedInfo]=useState(null);
  const[confirmBox,setConfirmBox]=useState(null); // {text, act} for confirm-before-replace
  const[driveState,setDriveState]=useState("idle");
  const driveStarted=useRef(false);
  const[,setTick]=useState(0);
  const[sortBy,setSortBy]=useState("date");
  const[venueF,setVenueF]=useState(new Set());
  const[timeF,setTimeF]=useState(new Set());
  const[acqWanted,setAcqWanted]=useState(false);
  const[acqOwned,setAcqOwned]=useState(false);
  const[acq3mo,setAcq3mo]=useState(false);
  const[acq6mo,setAcq6mo]=useState(false);
  const[acqNoCat,setAcqNoCat]=useState(false);
  const[showAll,setShowAll]=useState(false);
  const[dismissedOnly,setDismissedOnly]=useState(false);
  const[watchedF,setWatchedF]=useState(false);
  const[showSearch,setShowSearch]=useState(false);
  const[search,setSearch]=useState("");
  const[openCards,setOpenCards]=useState({});
  const[undo,setUndo]=useState(null);
  const undoTimer=useRef(null);
  const fileRef=useRef(null);
  const refreshFileRef=useRef(null);
  const searchRef=useRef(null);
  const[proposals,setProposals]=useState(null); // null = not in refresh review; array = reviewing
  // Listing pages the sweep could not read. NOT proposals — see isMarkerRow().
  const[coverage,setCoverage]=useState([]);
  const[decisions,setDecisions]=useState({}); // proposal index -> "accept"|"reject"|"addnew"
  const[refreshDone,setRefreshDone]=useState(null); // {added,filled,changed} after applying
  const[refreshTouched,setRefreshTouched]=useState([]); // ids added/changed in the last refresh
  const[pinTouched,setPinTouched]=useState(false); // pin those ids to the top this session
  const[showTop,setShowTop]=useState(false); // show the return-to-top button once scrolled down
  useEffect(()=>{const onScroll=()=>setShowTop(window.scrollY>400);window.addEventListener("scroll",onScroll,{passive:true});onScroll();return()=>window.removeEventListener("scroll",onScroll);},[]);

  useEffect(()=>{
    // v8.2 OPEN-EMPTY. The app is a workspace, like a word processor: it opens
    // showing nothing and waits for you to Import your ledger file. It does NOT
    // reach out to Google Drive or Claude storage on open. (The old Drive auto-load
    // routine is retired; its helper functions remain dormant below, uncalled.)
    setRows([]);
    setLoaded(true);
  },[]);

  // Keep the "Last saved ... ago" text and its colour current.
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);

  // EDITS mark the ledger unsaved (dirty). Nothing is written until you Export / Save.
  const commit=useCallback(async(next,lr)=>{
    setRows(next);
    if(lr!==undefined)setLastRun(lr);
    setFirstTime(false);
    setDirty(true);
    
  },[]);

  // LOADS (Import, Reset) are NOT unsaved work. Freshly loaded data matches its
  // source, so there's nothing to lose yet. The unsaved warning only appears once
  // you actually change something.
  const loadLedger=useCallback((next,lr,info)=>{
    setRows(next);
    setLastRun(lr!==undefined?lr:null);
    setFirstTime(false);
    setDirty(false);
    
    setSavedFile(null);
    setError(null);
    setLoadedInfo(info||null);
    setRefreshDone(null);
    setPinTouched(false); setRefreshTouched([]);
  },[]);

  // Write a NEW timestamped ledger copy to Drive. Never overwrites; nothing deleted.
  const saveToDrive=useCallback(async()=>{
    if(driveState==="saving")return;
    setDriveState("saving");setError(null);
    const fname=LEDGER_PREFIX+localStamp()+".json";
    const payload=JSON.stringify({rows,lastRun,savedAt:new Date().toISOString(),savedLocal:localReadable()});
    const prompt=
      "Using Google Drive, create a NEW file named \""+fname+"\" whose entire text content is exactly this JSON:\n"+
      payload+"\n"+
      "Do NOT overwrite, modify, or delete any existing file \u2014 always create a new file. "+
      "After saving, confirm the new file's name and its Drive file ID. Do not take any other action.";
    const r=await askDrive(prompt);
    if(r.ok&&r.usedTool&&!r.toolErr){
      setDirty(false);setDriveState("saved");
      setSavedFile(fname+"  ·  "+localReadable());
      setDebug("Save to Drive OK.\n"+r.detail);
    }else{
      setDriveState("savefail");
      setError("Save to Drive FAILED \u2014 your recent changes are NOT backed up. Try again, or use Export ledger to keep a local copy right now.");
      setDebug("Save to Drive FAILED.\n"+r.detail);
    }
  },[rows,lastRun,driveState]);
  const toggleSet=(setter,val)=>setter(prev=>{const n=new Set(prev);if(n.has(val))n.delete(val);else n.add(val);return n;});
  const clearFilters=()=>{setVenueF(new Set());setTimeF(new Set());setAcqWanted(false);setAcqOwned(false);setAcq3mo(false);setAcq6mo(false);setAcqNoCat(false);setShowAll(false);setDismissedOnly(false);setWatchedF(false);setSearch("");setShowSearch(false);};

  // Conservative duplicate matching for incoming refresh results.
  const normalizeTitle = v => String(v||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/&/g," and ").replace(/\+/g," and ")
    .replace(/[’‘`]/g,"'").replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

  const dateMs = d => {
    if(!d)return null;
    const x=new Date(d+"T00:00:00");
    return isNaN(x)?null:x.getTime();
  };

  const dateRangesOverlap = (a,b) => {
    const as=dateMs(a.startDate), ae=dateMs(a.endDate);
    const bs=dateMs(b.startDate), be=dateMs(b.endDate);
    if(as===null||ae===null||bs===null||be===null)return false;
    return as<=be && bs<=ae;
  };

  const sameExhibition = (a,b) => {
    if(a.museumId!==b.museumId)return false;
    if(normalizeTitle(a.title)!==normalizeTitle(b.title))return false;
    const aHasDates=!!a.startDate&&!!a.endDate;
    const bHasDates=!!b.startDate&&!!b.endDate;
    if(aHasDates&&bHasDates)return dateRangesOverlap(a,b);
    if(aHasDates&&!bHasDates)return true;
    if(!aHasDates&&bHasDates)return true;
    // With neither record carrying dates, a different URL is not enough
    // evidence to merge two potentially separate runs. Exact URL matches
    // are handled before this broader comparison.
    return false;
  };

  // ---- v9 REFRESH ENGINE ----
  // Reads a filled pro forma CSV, compares each row against the current ledger,
  // and produces a list of proposals to review one at a time. Nothing is applied
  // until "Go ahead and update the ledger". Anything the app can't use is not
  // dropped silently — it becomes a plain note on the proposal card.
  // The sentence the scraper stamps on every marker row, verbatim. A marker
  // reports a LISTING PAGE it could not read — it is not an exhibition and was
  // never a proposal. Until now the app had no idea, so each one became an
  // ordinary Add card titled "[past page]"; rejecting is not remembered, so the
  // same junk returned on every future sweep forever.
  //
  // Matched on the NOTES SENTINEL rather than the bracketed title. The scraper
  // writes this sentence at every marker site, so this is the producer saying
  // so — the strongest rung. A bracketed title is a guess about formatting, and
  // a real exhibition could carry brackets.
  const MARKER_SENTINEL = "Marker row, not an exhibition.";
  const isMarkerRow = note => String(note||"").trim().endsWith(MARKER_SENTINEL);

  // Which of two values to offer first when a stitched file disagrees with
  // itself. Her ruling: the FULLER one, clearly marked as a guess, with both
  // shown and one click to switch. Never silent, never irreversible.
  const fuller = (a,b) => (String(b||"").trim().length > String(a||"").trim().length) ? b : a;

  /**
   * Fold rows that are the same exhibition BEFORE anything is compared to the
   * ledger.
   *
   * One stitched file now carries every machine's output, so a venue swept in
   * two places appears twice — one copy with dates and no summary because its
   * detail page timed out, the other the reverse. analyzeProForma compares each
   * row against the LEDGER only, never against the row beside it, so both would
   * become separate Add cards for one exhibition.
   *
   * KEYED ON VENUE + URL, AND NOTHING ELSE. Same address is the same
   * exhibition, always, with no interpretation — the scraper's own rule.
   *
   * ROWS WITH NO URL ARE NEVER FOLDED. The only other key is the title, and
   * sameExhibition() matches on normalised title plus date overlap and returns
   * true whenever EITHER side lacks dates. That is fine against the ledger,
   * where she sees every proposal before it lands; here it would fire before
   * she sees anything, and a title collision would silently fuse two different
   * shows. That is the judgement that destroyed 29 National Gallery
   * exhibitions. An unfolded duplicate costs one extra card she can see.
   *
   * Nothing is invented and nothing is dropped: a group yields exactly one row,
   * built only from values that were in the file, and a genuine disagreement is
   * carried forward as a CHOICE rather than resolved here.
   */
  function foldDuplicateRows(raws){
    const byKey=new Map(), out=[];
    for(const row of raws){
      const key=row.url?(row.venueCode+"|"+normalizeUrlKey(row.url)):"";
      if(!key){ out.push(row); continue; }
      const seen=byKey.get(key);
      if(!seen){ byKey.set(key,row); out.push(row); continue; }
      seen.mergedFrom=(seen.mergedFrom||[seen.line]).concat(row.line);
      for(const f of ["title","startDate","endDate","summary"]){
        const a=seen[f], b=row[f];
        if(!b) continue;                       // nothing to add
        if(!a){ seen[f]=b; continue; }         // fill a gap — no judgement at all
        if(a===b) continue;                    // agreement
        // A REAL DISAGREEMENT. Keep both; the card offers the fuller one first.
        seen.conflicts=seen.conflicts||{};
        if(!seen.conflicts[f]) seen.conflicts[f]=[a];
        if(!seen.conflicts[f].includes(b)) seen.conflicts[f].push(b);
        seen[f]=fuller(a,b);
      }
      // Notes are additive: two runs can each explain something different.
      for(const n of row.rowNotes||[]) if(!(seen.rowNotes||[]).includes(n)) (seen.rowNotes=seen.rowNotes||[]).push(n);
    }
    return out;
  }

  function analyzeProForma(text){
    const table=csvParse(text);
    if(!table.length) return {error:"That file was empty."};
    const header=table[0].map(h=>String(h).trim().toLowerCase());
    const idx=n=>header.indexOf(n);
    if(idx("venue_code")<0||idx("title")<0) return {error:"That file doesn't look like a pro forma (no venue_code / title columns)."};
    const get=(r,n)=>{const j=idx(n);return j>=0?String(r[j]||"").trim():"";};
    const props=[];
    const coverage=[];   // marker rows: listing pages that could not be read
    const parsed=[];

    // ── PASS ONE: read the file. No comparison to anything yet. ──────────────
    // Split out because one stitched file now holds every machine's output, so
    // rows have to be reconciled against EACH OTHER before the ledger is
    // consulted at all.
    for(let k=1;k<table.length;k++){
      const r=table[k], line=k+1;
      const vc=get(r,"venue_code").toLowerCase();
      const title=get(r,"title");
      const rowNote=get(r,"notes");

      // A LISTING PAGE THAT COULD NOT BE READ IS NOT A PROPOSAL. It goes to the
      // coverage panel, where "we tried and were refused" is what it actually
      // says — rather than becoming an exhibition she rejects on every sweep.
      if(isMarkerRow(rowNote)){
        coverage.push({venueId:KNOWN_VENUES.has(vc)?vc:null,venueShort:KNOWN_VENUES.has(vc)?MU[vc].short:(vc||"(blank)"),what:title||"(a listing page)",why:rowNote,url:get(r,"url"),line});
        continue;
      }

      const notes=[];
      if(!vc||!KNOWN_VENUES.has(vc)){ props.push({type:"problem",venueId:null,venueShort:vc||"(blank)",title:title||"(no title)",problem:"Venue code "+(vc?("\u201c"+vc+"\u201d"):"(blank)")+" isn't a known venue \u2014 this row can't be filed.",notes:[],line}); continue; }
      if(!title){ props.push({type:"problem",venueId:vc,venueShort:MU[vc].short,title:"(no title)",problem:"This row has no exhibition title \u2014 it can't be added.",notes:[],line}); continue; }
      let sd=get(r,"start_date"), ed=get(r,"end_date"), url=get(r,"url");
      if(sd&&!isValidYMD(sd)){notes.push("Start date \u201c"+sd+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");sd="";}
      if(ed&&!isValidYMD(ed)){notes.push("End date \u201c"+ed+"\u201d couldn't be read (needs YYYY-MM-DD) \u2014 left blank.");ed="";}
      if(url&&!urlLooksValid(url)){notes.push("Exhibition link \u201c"+url+"\u201d looks garbled \u2014 left blank.");url="";}
      parsed.push({venueCode:vc,title,startDate:sd,endDate:ed,summary:get(r,"summary"),url,
                   rowNotes:rowNote?["Sweeper note: "+rowNote]:[],parseNotes:notes,line});
    }

    // ── PASS TWO: fold rows that are the same exhibition. ────────────────────
    const folded=foldDuplicateRows(parsed);

    // ── PASS THREE: compare each surviving row to the ledger, as before. ─────
    for(const p of folded){
      const vc=p.venueCode, title=p.title, sd=p.startDate, ed=p.endDate, summary=p.summary, url=p.url;
      const notes=p.parseNotes.slice();
      if(!sd)notes.push("No start date.");
      if(!ed)notes.push("No end date.");
      if(!summary)notes.push("No description.");
      if(!url)notes.push("No exhibition link.");
      for(const n of p.rowNotes) notes.push(n);
      // SAY WHEN ROWS WERE FOLDED. She is being shown one card for what was
      // several lines in the file, and that has to be visible or the count on
      // her approval pile will not match the file she fed in.
      if(p.mergedFrom) notes.push("Rows "+p.mergedFrom.join(", ")+" of the file describe this same exhibition \u2014 combined into one.");

      const cand={museumId:vc,title,startDate:sd||null,endDate:ed||null,summary,exUrl:url};
      const exact=url?rows.find(x=>x.museumId===vc&&x.exUrl&&x.exUrl===url):null;
      const match=exact||rows.find(x=>sameExhibition(x,cand));

      // WHERE THE FILE DISAGREED WITH ITSELF, offer the choice on the card.
      // The fuller value is ticked, and marked as a guess; both are shown.
      const choices=p.conflicts?Object.keys(p.conflicts).map(f=>({
        field:f,
        label:{title:"Title",startDate:"Start date",endDate:"End date",summary:"Description"}[f]||f,
        options:p.conflicts[f],
        picked:p[f],
      })):null;

      if(!match){ props.push({type:"add",venueId:vc,venueShort:MU[vc].short,title,cand,notes,line:p.line,choices}); continue; }
      const upd=[];
      const consider=(field,label,oldV,newV)=>{ const o=(oldV==null?"":String(oldV)), n=(newV==null?"":String(newV)); if(!n)return; if(!o)upd.push({field,label,oldVal:"",newVal:n,kind:"fill"}); else if(o!==n)upd.push({field,label,oldVal:o,newVal:n,kind:"change"}); };
      consider("startDate","Start date",match.startDate,sd);
      consider("endDate","End date",match.endDate,ed);
      consider("summary","Description",match.summary,summary);
      consider("exUrl","Exhibition link",match.exUrl,url);
      if(!upd.length&&!choices) continue; // identical — nothing to propose
      const hasChange=upd.some(u=>u.kind==="change");
      props.push({type:hasChange?"change":"fill",venueId:vc,venueShort:MU[vc].short,title,cand,matchId:match.id,upd,notes,line:p.line,choices});
    }
    return {props,coverage};
  }

  function handleRefreshFile(e){
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const res=analyzeProForma(String(reader.result||""));
      if(res.error){setError(res.error);return;}
      if(!res.props.length){
        setCoverage(res.coverage||[]);
        setError("Read the refresh file, but nothing new to propose \u2014 your ledger already matches it."+((res.coverage||[]).length?" ("+res.coverage.length+" listing page"+(res.coverage.length===1?"":"s")+" couldn\u2019t be read \u2014 see below.)":""));
        return;
      }
      setError(null); setProposals(res.props); setCoverage(res.coverage||[]); setDecisions({});
    };
    reader.readAsText(file); e.target.value="";
  }

  // Decision model. Each card holds: {mode} for add/problem ("accept"/"reject"),
  // or {fields:{j:"accept"|"reject"}, mode:"addnew"?} for fill/change.
  const setCardMode=(i,v)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,mode:cur.mode===v?undefined:v}};});
  // Which value she picked where the file disagreed with itself. Per card, per
  // field; absent means "still on the pre-picked fuller one".
  const setChoice=(i,field,val)=>setDecisions(d=>{const cur=d[i]||{};return{...d,[i]:{...cur,choices:{...(cur.choices||{}),[field]:val}}};});
  const setFieldDec=(i,j,v)=>setDecisions(d=>{const cur=d[i]||{};const f={...(cur.fields||{})};f[j]=f[j]===v?undefined:v;return{...d,[i]:{...cur,fields:f,mode:undefined}};});

  function makeLedgerRow(c,now){
    const base=c.museumId+"-"+normalizeTitle(c.title).replace(/[^a-z0-9]+/g,"").slice(0,50);
    return {id:base,museumId:c.museumId,title:c.title,startDate:c.startDate||null,endDate:c.endDate||null,summary:c.summary||"",exUrl:c.exUrl||(MU[c.museumId]?.listUrl||""),interested:true,watching:false,acquiring:null,looked:false,hasCatalogue:"unknown",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,shopUrl:null,shopState:null,addedAt:now,editedAt:null};
  }

  // Apply whatever she picked where the stitched file disagreed with itself.
  // Untouched fields keep the pre-selected fuller value, which is what the card
  // was already showing — so doing nothing gives her exactly what she saw.
  const withChoices=(cand,dec)=>{
    const c=(dec||{}).choices; if(!c)return cand;
    const out={...cand};
    for(const f of Object.keys(c)){
      const v=c[f];
      if(f==="title")out.title=v;
      else if(f==="startDate")out.startDate=v||null;
      else if(f==="endDate")out.endDate=v||null;
      else if(f==="summary")out.summary=v;
    }
    return out;
  };

  function applyRefresh(){
    const byId=new Map(rows.map(r=>[r.id,r]));
    const now=new Date().toISOString();
    const touched=[];
    let added=0,filled=0,changed=0;
    proposals.forEach((p,i)=>{
      const dec=decisions[i]||{};
      if(p.type==="problem")return;
      if(p.type==="add"){
        if(dec.mode!=="accept")return;
        const nrow=makeLedgerRow(withChoices(p.cand,dec),now); let id=nrow.id,c=2; while(byId.has(id)){id=nrow.id+"-"+c;c++;} nrow.id=id; byId.set(id,nrow); touched.push(id); added++; return;
      }
      // fill / change
      if(dec.mode==="addnew"){
        const nrow=makeLedgerRow(withChoices(p.cand,dec),now); let id=nrow.id,c=2; while(byId.has(id)){id=nrow.id+"-"+c;c++;} nrow.id=id; byId.set(id,nrow); touched.push(id); added++; return;
      }
      const m=byId.get(p.matchId); if(!m)return; const patch={...m}; let hit=false;
      p.upd.forEach((u,j)=>{ if((dec.fields||{})[j]==="accept"){ patch[u.field]=u.newVal; if(u.kind==="fill")filled++; else changed++; hit=true; } });
      if(hit){ patch.editedAt=now; byId.set(p.matchId,patch); touched.push(p.matchId); }
    });
    commit(Array.from(byId.values()),new Date().toISOString());
    setProposals(null); setDecisions({}); setRefreshDone({added,filled,changed});
    setRefreshTouched(touched); setPinTouched(touched.length>0); // float just-changed entries to the top, this session
    setVenueF(new Set()); setTimeF(new Set()); setWatchedF(false);
    setAcqWanted(false); setAcqOwned(false); setAcq3mo(false); setAcq6mo(false); setAcqNoCat(false);
    setDismissedOnly(false); setShowAll(false); setSearch("");
  }
  function cancelRefresh(){ setProposals(null); setDecisions({}); setCoverage([]); }
  const pickSort=k=>{setSortBy(k);setPinTouched(false);}; // manual sort releases the pinned refresh group

  async function refreshVenues(ids){
    setBusy(true);setError(null);setDebug(null);
    const periods=[
      {id:"past",inst:"past exhibitions listing"},
      {id:"current",inst:"current exhibitions listing"},
      {id:"upcoming",inst:"upcoming/announced exhibitions listing"}
    ];
    const jobs=[];
    for(const mid of ids){
      const mu=MU[mid];
      if(mu)for(const p of periods)jobs.push({mu,p});
    }

    const found=[];
    let fails=0;
    let firstD=null;

    // Lightweight first pass: read only the museum listing pages.
    // No catalogue research and no individual exhibition-page research here.
    for(let i=0;i<jobs.length;i++){
      const{mu,p}=jobs[i];
      setProg({done:i,total:jobs.length,label:mu.short+" — "+p.id});
      const res=await askClaude(exPrompt(mu,p.inst));
      if(!firstD)firstD=mu.short+"/"+p.id+"\n"+res.detail;
      const items=res.ok?extractObjects(res.text):[];
      if(!items.length){fails++;continue;}

      for(const it of items){
        if(!it||!it.title)continue;
        found.push({
          id:mu.id+"-"+normalizeTitle(it.title).replace(/[^a-z0-9]+/g,"").slice(0,50),
          museumId:mu.id,
          title:String(it.title).trim(),
          startDate:it.startDate||null,
          endDate:it.endDate||null,
          summary:it.summary||"",
          exUrl:it.url||it.exUrl||"",
          hasCatalogue:"unknown"
        });
      }
    }

    // Local merge: exact venue + exact exhibition URL is the first and strongest
    // duplicate shortcut. Only unmatched URLs use the broader duplicate rules.
    const byId=new Map(rows.map(r=>[r.id,r]));
    for(const f of found){
      const exactUrl=f.exUrl
        ? Array.from(byId.values()).find(r=>r.museumId===f.museumId&&r.exUrl===f.exUrl)
        : null;
      // Do not use the title-derived ID as a duplicate shortcut: the same
      // title can legitimately represent a separate run at the same venue.
      const match=exactUrl||Array.from(byId.values()).find(r=>sameExhibition(r,f));

      if(match){
        byId.set(match.id,{
          ...match,
          startDate:f.startDate||match.startDate||null,
          endDate:f.endDate||match.endDate||null,
          summary:f.summary||match.summary,
          exUrl:match.exUrl||f.exUrl||""
        });
      }else{
        const mu=MU[f.museumId];
        byId.set(f.id,{
          ...f,
          exUrl:f.exUrl||mu?.listUrl||"",
          interested:true,
          watching:false,
          acquiring:null,
          looked:false,
          catalogueTitle:null,
          isbn13:null,
          publisher:null,
          publisherUrl:null,
          shopUrl:null
        });
      }
    }

    // Only genuinely new records lacking a usable description get a fallback
    // individual-page lookup. Catalogue research remains completely separate.
    let arr=Array.from(byId.values());
    const existingIds=new Set(rows.map(r=>r.id));
    const newItems=arr.filter(r=>!existingIds.has(r.id)&&!r.summary);
    for(const r of newItems){
      const mu=MU[r.museumId];
      if(!mu||!r.exUrl)continue;
      const prompt=`Open the exhibition page ${r.exUrl} only to obtain a concise one-sentence description for "${r.title}" at ${mu.name}. Return JSON array only with {"title":"...","summary":"..."}. Do not search for or report catalogue information.`;
      const res=await askClaude(prompt);
      const objs=res.ok?extractObjects(res.text):[];
      if(objs.length&&objs[0].summary){
        arr=arr.map(x=>x.id===r.id?{...x,summary:objs[0].summary}:x);
      }
    }

    arr=Array.from(new Map(arr.map(r=>[r.id,r])).values());
    await commit(arr,new Date().toISOString());
    setProg({done:jobs.length,total:jobs.length,label:"Done"});
    setBusy(false);
    setDebug(firstD);
    if(fails===jobs.length)setError("Every search came back empty.");
    else if(fails>0)setError(fails+" of "+jobs.length+" returned nothing.");
  }

  async function lookupCat(row){
    const mu=MU[row.museumId];
    const dom=shopDomain(mu);
    let detail="";
    // Step 1 — search the venue's own shop only, hard-capped.
    if(dom){
      setLookPhase("shop");
      const r1=await askClaude(shopPrompt(row,mu),{allowedDomains:[dom],maxUses:1});
      detail=r1.detail||"";
      const o1=r1.ok?extractObjects(r1.text)[0]:null;
      if(o1&&o1.inShop&&(o1.shopUrl||o1.catalogueTitle)){
        return {ok:true,detail,row:{...row,looked:true,hasCatalogue:"yes",shopState:"shop",catalogueTitle:o1.catalogueTitle||null,isbn13:cleanIsbn(o1.isbn13),publisher:o1.publisher||null,publisherUrl:o1.publisherUrl||null,shopUrl:o1.shopUrl||null}};
      }
    }
    // Step 2 — only if the shop had nothing: one broad search to confirm the catalogue exists at all.
    setLookPhase("web");
    const r2=await askClaude(webPrompt(row,mu),{maxUses:1});
    detail=r2.detail||detail;
    const o2=r2.ok?extractObjects(r2.text)[0]:null;
    if(!r2.ok||!o2)return{row,detail,ok:false};
    if(o2.hasCatalogue==="no"){
      return {ok:true,detail,row:{...row,looked:true,hasCatalogue:"no",shopState:"none",catalogueTitle:null,isbn13:null,publisher:null,publisherUrl:null,shopUrl:null}};
    }
    // Exists on the wider web, but not in the venue's own shop.
    return {ok:true,detail,row:{...row,looked:true,hasCatalogue:"yes",shopState:"web",catalogueTitle:o2.catalogueTitle||null,isbn13:cleanIsbn(o2.isbn13),publisher:o2.publisher||null,publisherUrl:o2.publisherUrl||null,shopUrl:null}};
  }

  async function findOneCat(id){setBusy(true);setBusyId(id);setError(null);const row=rows.find(r=>r.id===id);const out=await lookupCat(row);setDebug(out.detail);if(out.ok)await commit(rows.map(r=>r.id===id?out.row:r));else setError("Catalogue search failed for \u201c"+row.title+"\u201d.");setBusy(false);setBusyId(null);setLookPhase(null);}

  async function findWantedCats(){const targets=rows.filter(r=>r.acquiring==="yes"&&!r.looked&&r.interested);if(!targets.length)return;setBusy(true);setError(null);let next=[...rows];for(let i=0;i<targets.length;i++){setProg({done:i,total:targets.length,label:targets[i].title});const out=await lookupCat(targets[i]);if(out.ok){next=next.map(r=>r.id===out.row.id?out.row:r);setRows(next);}if(i===0)setDebug(out.detail);}await commit(next);setProg({done:targets.length,total:targets.length,label:"Done"});setBusy(false);setLookPhase(null);}

  const dismiss=id=>{commit(rows.map(r=>r.id===id?{...r,interested:false}:r));if(undoTimer.current)clearTimeout(undoTimer.current);setUndo({id});undoTimer.current=setTimeout(()=>setUndo(null),10000);};
  const undoDismiss=()=>{if(!undo)return;commit(rows.map(r=>r.id===undo.id?{...r,interested:true}:r));setUndo(null);if(undoTimer.current)clearTimeout(undoTimer.current);};
  const restore=id=>commit(rows.map(r=>r.id===id?{...r,interested:true}:r));
  const toggleWatch=id=>commit(rows.map(r=>r.id===id?{...r,watching:!r.watching}:r));
  const setAcq=(id,v)=>commit(rows.map(r=>r.id===id?{...r,acquiring:r.acquiring===v?null:v}:r));

  function handleImport(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(d&&Array.isArray(d.rows)){loadLedger(d.rows.map(r=>({...r,watching:r.watching||false})),d.lastRun||null,"Loaded "+d.rows.length+" exhibitions from your file \u2014 no edits yet.");setDebug("Imported "+d.rows.length+" exhibitions from your file. It matches your file, so it's not counted as unsaved until you change something.");}else{setError("That file didn't contain a ledger (no entries found).");}}catch{setError("Could not read that file \u2014 it may not be a valid ledger backup.");}};reader.readAsText(file);e.target.value="";}

  // Confirm-before-replace: Import and Reset can wipe the screen in one tap, so
  // they ask first WHENEVER there is unsaved work showing.
  const openFilePicker=()=>fileRef.current?.click();
  function requestImport(){
    if(rows.length>0&&dirty){setConfirmBox({text:"Importing replaces everything on screen, and you haven't exported these changes yet. They will be lost. Continue?",act:openFilePicker});}
    else openFilePicker();
  }
  const doReset=()=>{const seed=buildSeed();loadLedger(seed,null,"Starter set loaded ("+seed.length+" exhibitions) \u2014 not saved to a file.");setDebug("Reset: loaded the built-in starter set ("+seed.length+" exhibitions). It isn't in any file \u2014 Export / Save if you want to keep it.");};
  function requestReset(){
    if(rows.length>0&&dirty){setConfirmBox({text:"This loads the built-in starter set and replaces everything on screen, which you haven't exported. Those changes will be lost. Continue?",act:doReset});}
    else doReset();
  }

  function handleExport(){
    try{
      const data=JSON.stringify({rows,lastRun,exportedAt:new Date().toISOString(),exportedLocal:localReadable()},null,2);
      const blob=new Blob([data],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const stamp=localStamp();
      const a=document.createElement("a");
      a.href=url;a.download=LEDGER_PREFIX+stamp+".json";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setError(null);
      setDirty(false);
      setSavedFile(LEDGER_PREFIX+stamp+".json  \u00b7  "+localReadable());
      setRefreshDone(null);
      setDebug("Exported "+rows.length+" exhibitions. Check downloads for "+LEDGER_PREFIX+stamp+".json ("+localReadable()+"). File it back to your disk / Drive. On mobile the download may not appear \u2014 laptop is reliable.");
    }catch(e){
      setError("Export failed: "+String(e?.message||e));
    }
  }

  const wantedUnlooked=useMemo(()=>rows.filter(r=>r.acquiring==="yes"&&!r.looked&&r.interested).length,[rows]);

  const view=useMemo(()=>{
    const sq=search.toLowerCase().trim();
    let out=rows.filter(r=>{
      if(sq)return r.title.toLowerCase().includes(sq)||r.summary.toLowerCase().includes(sq)||(MU[r.museumId]?.name||"").toLowerCase().includes(sq);
      if(dismissedOnly)return!r.interested;
      if(!r.interested&&!showAll)return false;
      if(venueF.size>0&&!venueF.has(r.museumId))return false;
      const t=tierFor(r),ts=TIERS[t]?.time||"current";
      if(timeF.size>0){let match=timeF.has(ts);if(timeF.has("recent")&&t==="recent")match=true;if(timeF.has("current")&&t==="recent")match=true;if(!match)return false;}
      if(watchedF&&!r.watching)return false;
      // Acquiring filters stack as AND across the three axes, OR within an axis.
      if(acqWanted||acqOwned){if(!((acqWanted&&r.acquiring==="yes")||(acqOwned&&r.acquiring==="acquired")))return false;}
      if(acq3mo||acq6mo){if(!((acq3mo&&t==="closing")||(acq6mo&&(t==="urgent"||t==="lapsed"))))return false;}
      if(acqNoCat){if(!(r.looked&&r.hasCatalogue==="no"))return false;}
      return true;
    });
    out.sort((a,b)=>{
      if(pinTouched){const aT=refreshTouched.includes(a.id)?0:1,bT=refreshTouched.includes(b.id)?0:1;if(aT!==bT)return aT-bT;}
      if(sortBy==="added"){const d=String(b.addedAt||"").localeCompare(String(a.addedAt||""));if(d!==0)return d;}
      if(sortBy==="edited"){const d=String(b.editedAt||"").localeCompare(String(a.editedAt||""));if(d!==0)return d;if(!a.editedAt&&!b.editedAt){const aH=a.addedAt?1:0,bH=b.addedAt?1:0;if(aH!==bH)return bH-aH;}}
      if(sortBy==="venue"){const d=MUSEUMS.findIndex(m=>m.id===a.museumId)-MUSEUMS.findIndex(m=>m.id===b.museumId);if(d!==0)return d;}
      if(sortBy==="acquiring"){const w={acquired:0,yes:1,no:3};const d=(w[a.acquiring]??2)-(w[b.acquiring]??2);if(d!==0)return d;}
      const ta=tierFor(a),tb=tierFor(b);
      let oa=TIERS[ta]?.ord??9,ob=TIERS[tb]?.ord??9;
      if(acqWanted){if(ta==="upcoming")oa=99;if(tb==="upcoming")ob=99;} // Wanted view: Announced drops to the bottom (nothing to buy yet)
      if(oa!==ob)return oa-ob;
      const da=a.startDate||a.endDate||"",db=b.startDate||b.endDate||"";
      if(ta==="upcoming")return da.localeCompare(db);
      return db.localeCompare(da);
    });
    return out;
  },[rows,sortBy,venueF,timeF,acqWanted,acqOwned,acq3mo,acq6mo,acqNoCat,showAll,dismissedOnly,watchedF,search,pinTouched,refreshTouched]);

  const counts=useMemo(()=>{const c={total:rows.length,dismissed:0,wanted:0,owned:0,pressing:0};for(const r of rows){if(!r.interested){c.dismissed++;continue;}if(r.acquiring==="yes")c.wanted++;if(r.acquiring==="acquired")c.owned++;const t=tierFor(r);if((t==="closing"||t==="urgent")&&r.acquiring!=="no"&&r.acquiring!=="acquired"&&r.hasCatalogue!=="no")c.pressing++;}return c;},[rows]);

  const C={bg:"#E8E4DE",card:"#F5F2ED",ink:"#1E1B18",soft:"#78736C",rule:"#CBC5BB",action:"#2D4A3F",accent:"#A13823",owned:"#7B5EA7",muted:"#B5AFA6"};
  const chip=on=>({padding:"4px 10px",borderRadius:999,border:"1px solid "+(on?C.ink:C.rule),background:on?C.ink:"transparent",color:on?"#fff":C.soft,fontSize:11,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"});
  const sBtn={padding:"5px 12px",borderRadius:4,border:"1px solid "+C.rule,background:"transparent",color:C.soft,fontSize:11,fontWeight:500,cursor:"pointer"};
  const pBtn={...sBtn,background:C.action,color:"#fff",border:"none",opacity:busy?0.5:1,cursor:busy?"wait":"pointer"};
  const lnk={fontSize:11,fontWeight:500,color:C.ink,background:C.card,border:"1px solid "+C.rule,borderRadius:3,padding:"4px 9px",textDecoration:"none",display:"inline-block",whiteSpace:"nowrap"};

  // ---- v9 approval-stage render helpers ----
  const decBtn=(active,color)=>({padding:"3px 9px",borderRadius:4,border:"1px solid "+(active?color:C.rule),background:active?color:"transparent",color:active?"#fff":C.soft,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});
  const renderProposalCard=(p,i)=>{
    const dec=decisions[i]||{};
    const infoRow=(label,val)=><div style={{marginBottom:2}}><b style={{color:C.ink}}>{label}:</b> {val&&String(val).trim()?val:<span style={{color:C.muted}}>{"\u2014"}</span>}</div>;
    return(
      <div key={i} style={{border:"1px solid "+C.rule,borderRadius:6,background:C.card,padding:"10px 12px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,marginBottom:4}}>{p.title}</div>

        {p.type==="problem"&&<div style={{fontSize:12,color:"#6B2E2E"}}>{p.problem}</div>}

        {p.type==="add"&&<div style={{fontSize:11.5,color:C.ink,lineHeight:1.5}}>
          <div style={{fontWeight:700,marginBottom:3}}>{"New show \u2014 not in your ledger yet."}</div>
          {infoRow("Dates",dateRange(p.cand))}
          {infoRow("Description",p.cand.summary)}
          {infoRow("Link",p.cand.exUrl)}
        </div>}

        {(p.type==="fill"||p.type==="change")&&<div style={{fontSize:11.5,color:C.ink}}>
          <div style={{fontWeight:700,marginBottom:5}}>{"Existing entry \u2014 decide each change:"}</div>
          {dec.mode==="addnew"
            ? <div style={{fontStyle:"italic",color:C.action}}>Will be added as a separate new entry instead of changing the existing one.</div>
            : p.upd.map((u,j)=>{const fd=(dec.fields||{})[j];return(
                <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                  <div style={{flex:1,lineHeight:1.4}}><b style={{color:C.ink}}>{u.label}:</b> <span style={{color:C.soft}}>{u.kind==="fill"?("add \u201c"+u.newVal+"\u201d"):("\u201c"+u.oldVal+"\u201d \u2192 \u201c"+u.newVal+"\u201d")}</span></div>
                  <button onClick={()=>setFieldDec(i,j,"accept")} style={decBtn(fd==="accept","#2D6B5A")}>{fd==="accept"?"\u2713 ":""}Accept edit</button>
                  <button onClick={()=>setFieldDec(i,j,"reject")} style={decBtn(fd==="reject","#8A6D3B")}>Reject</button>
                </div>
              );})}
        </div>}

        {/* THE FILE DISAGREED WITH ITSELF about this exhibition — two rows, same
            address, different values. Nothing is resolved silently: both are
            shown, the fuller one is ticked as a starting point, one tap
            switches. Her ruling, 13 Sep. */}
        {p.choices&&p.choices.length>0&&<div style={{marginTop:7,paddingTop:6,borderTop:"1px dotted "+C.rule}}>
          <div style={{fontSize:10.5,color:C.soft,lineHeight:1.5,marginBottom:5}}>The sweep file gave two different answers here. The longer one is picked for you {"\u2014"} change it if it{"\u2019"}s wrong.</div>
          {p.choices.map((ch,j)=>(
            <div key={j} style={{marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.ink,marginBottom:3}}>{ch.label}</div>
              {ch.options.map((opt,k)=>{
                const picked=(dec.choices||{})[ch.field];
                const chosen=(picked===undefined?ch.picked:picked)===opt;
                return(
                  <button key={k} onClick={()=>setChoice(i,ch.field,opt)}
                    style={{...decBtn(chosen,"#2D6B5A"),display:"block",width:"100%",textAlign:"left",marginBottom:3,whiteSpace:"normal",lineHeight:1.4}}>
                    {chosen?"\u2713 ":"\u00a0\u00a0"}{opt&&String(opt).trim()?opt:"(blank)"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>}

        {p.notes&&p.notes.length>0&&<div style={{marginTop:6,fontSize:10.5,color:C.soft,lineHeight:1.5,borderTop:"1px dotted "+C.rule,paddingTop:5}}>{p.notes.map((n,j)=><div key={j}>{"\u00b7 "}{n}</div>)}</div>}

        {p.type==="add"&&<div style={{marginTop:8,display:"flex",gap:6}}>
          <button onClick={()=>setCardMode(i,"accept")} style={decBtn(dec.mode==="accept","#2D6B5A")}>{dec.mode==="accept"?"\u2713 ":""}Add new entry</button>
          <button onClick={()=>setCardMode(i,"reject")} style={decBtn(dec.mode==="reject","#8A6D3B")}>{dec.mode==="reject"?"\u2713 ":""}Reject</button>
        </div>}

        {p.type==="change"&&<div style={{marginTop:8}}>
          <button onClick={()=>setCardMode(i,"addnew")} style={decBtn(dec.mode==="addnew","#4A5A6B")}>{dec.mode==="addnew"?"\u2713 ":""}{"No \u2014 this is a different show, add as separate entry"}</button>
        </div>}

        {p.type==="problem"&&<div style={{marginTop:8}}><button onClick={()=>setCardMode(i,"reject")} style={decBtn(dec.mode==="reject","#8A6D3B")}>{dec.mode==="reject"?"\u2713 ":""}Dismiss</button></div>}
      </div>
    );
  };
  let acceptedCount=0,undecidedCount=0;
  if(proposals)proposals.forEach((p,i)=>{
    if(p.type==="problem")return;
    const dec=decisions[i]||{};
    if(p.type==="add"){ if(dec.mode==="accept")acceptedCount++; else if(!dec.mode)undecidedCount++; return; }
    // fill/change
    if(dec.mode==="addnew"){acceptedCount++;return;}
    const anyAccept=Object.values(dec.fields||{}).some(v=>v==="accept");
    const anyDecided=dec.mode||Object.values(dec.fields||{}).some(v=>v);
    if(anyAccept)acceptedCount++; else if(!anyDecided)undecidedCount++;
  });

  // v8.3 status, file model. Three states: fresh load = neutral line; your edits
  // = loud red banner; after Export/Save = calm green line. Green only appears once
  // you've actually exported this session (a reset seed is in no file, so it's neutral).
  const hasLedger=rows.length>0;
  const showUnsavedBanner=hasLedger&&dirty;
  let savedText=null,savedCol=C.soft,savedWeight=500;
  if(!hasLedger){savedText="No ledger loaded \u2014 tap Import to begin.";}
  else if(dirty){savedText=null;} // the red banner below covers this
  else if(savedFile){savedText="\u2713 Saved \u2014 safe to close  ("+savedFile+")";savedCol="#2D6B5A";savedWeight=600;}
  else{savedText=loadedInfo||"Loaded \u2014 no edits yet.";}

  if(!loaded)return(<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.soft,minHeight:"100vh",display:"grid",placeItems:"center",fontSize:13}}>Opening the ledger{"\u2026"}</div>);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,color:C.ink,minHeight:"100vh",padding:"20px 16px 60px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <header style={{maxWidth:760,margin:"0 auto 14px"}}>
        <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:C.soft,marginBottom:4}}>Exhibition catalogues · acquisition window</div>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,lineHeight:1,fontWeight:500,margin:0,letterSpacing:"-0.02em"}}>Before it goes<span style={{color:C.accent}}> out of print</span></h1>
        {/* Venue refresh buttons removed to protect usage. refreshVenues() is kept dormant below and can be re-wired here later. */}
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
          {/* Bulk "Find catalogues for N Wanted" button removed to protect usage. findWantedCats() is kept dormant below. */}
          <button onClick={requestImport} style={sBtn}>Import</button>
          <button onClick={handleExport} disabled={!hasLedger} style={{...pBtn,opacity:hasLedger?1:0.4,cursor:hasLedger?"pointer":"not-allowed"}}>Export / Save</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{display:"none"}}/>
          <button onClick={()=>refreshFileRef.current?.click()} style={{...sBtn,marginLeft:"auto"}}>Import Refresh</button>
          <input ref={refreshFileRef} type="file" accept=".csv,text/csv" onChange={handleRefreshFile} style={{display:"none"}}/>
        </div>
        {savedText&&<div style={{marginTop:6,fontSize:11,color:savedCol,fontWeight:savedWeight}}>{savedText}</div>}
        {showUnsavedBanner&&refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:"#D8EAE4",border:"2px solid #2D6B5A",borderRadius:5,fontSize:12.5,fontWeight:700,color:"#1F4C40",lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u21BB"}</span>
          <span>{"Refresh applied \u2014 "+refreshDone.added+" added, "+refreshDone.filled+" filled in, "+refreshDone.changed+" updated. Not saved yet \u2014 tap \u201cExport / Save\u201d now."}</span>
        </div>}
        {showUnsavedBanner&&!refreshDone&&<div style={{marginTop:8,padding:"9px 12px",background:"#F7E4C4",border:"2px solid #B5791A",borderRadius:5,fontSize:12.5,fontWeight:700,color:"#6B4A1E",lineHeight:1.4,display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:17,lineHeight:1}}>{"\u26A0"}</span>
          <span>{"UNSAVED CHANGES \u2014 what's on screen is not saved to a file. Tap \u201cExport / Save\u201d before you close this tab or your work is lost."}</span>
        </div>}
        {busy&&prog.total>0&&<div style={{marginTop:8}}><div style={{height:3,background:C.rule,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(prog.done/prog.total*100)+"%",background:C.action,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.soft,marginTop:3}}>{prog.done}/{prog.total} · {prog.label}</div></div>}
        {error&&<div style={{marginTop:8,padding:"7px 11px",background:TIERS.urgent.wash,border:"1px solid "+TIERS.urgent.ink,borderRadius:4,fontSize:11.5,color:"#6B2E2E"}}>{error}</div>}
        {debug&&<div style={{marginTop:4}}><button onClick={()=>setShowDebug(v=>!v)} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>{showDebug?"Hide diagnostic":"Show diagnostic"}</button>{showDebug&&<pre style={{marginTop:4,padding:7,background:"#DDD8D0",border:"1px solid "+C.rule,borderRadius:4,fontSize:9.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:C.soft,maxHeight:160,overflow:"auto"}}>{debug}</pre>}</div>}
        {hasLedger&&<div style={{marginTop:6,fontSize:10.5,color:C.soft}}>Last refreshed: {fmtRefresh(lastRun)}</div>}
        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+C.rule,display:"flex",gap:14,fontSize:10.5,color:C.soft,flexWrap:"wrap",alignItems:"center"}}>
          <span><b style={{color:C.ink}}>{counts.total}</b> Tracked</span>
          <span><b style={{color:C.ink}}>{counts.wanted}</b> Wanted</span>
          <span><b style={{color:C.owned}}>{counts.owned}</b> Owned</span>
          <span><b style={{color:TIERS.urgent.ink}}>{counts.pressing}</b> Closing Window</span>
          {counts.dismissed>0&&<span><b>{counts.dismissed}</b> Dismissed</span>}
          <button onClick={()=>{setShowSearch(v=>!v);setTimeout(()=>searchRef.current?.focus(),100);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.soft,padding:0,lineHeight:1}} title="Search">{"\uD83D\uDD0D"}</button>
        </div>
        {showSearch&&<div style={{marginTop:6}}><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exhibitions\u2026" style={{width:"100%",padding:"7px 10px",border:"1px solid "+C.rule,borderRadius:4,background:C.card,color:C.ink,fontSize:12.5,fontFamily:"inherit",boxSizing:"border-box"}}/></div>}
      </header>

      <div style={{maxWidth:760,margin:"0 auto 12px",display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Sort</span>
          {[["date","Date"],["venue","Venue"],["acquiring","Acquiring"],["added","Recently added"],["edited","Recently edited"]].map(([k,l])=><button key={k} onClick={()=>pickSort(k)} style={chip(sortBy===k&&!pinTouched)}>{l}</button>)}
          {pinTouched&&<span style={{fontSize:10.5,color:C.action,fontWeight:600}}>{"\u2191 just-refreshed entries shown first"}</span>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>When</span>
          {[["upcoming","Upcoming"],["current","Current"],["past","Past"],["recent","Recently opened"]].map(([k,l])=><button key={k} onClick={()=>toggleSet(setTimeF,k)} style={chip(timeF.has(k))}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Venue</span>
          {MUSEUMS.map(m=><button key={m.id} onClick={()=>toggleSet(setVenueF,m.id)} style={chip(venueF.has(m.id))}>{m.short}</button>)}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Acquiring?</span>
          <button onClick={()=>setAcqWanted(v=>!v)} style={chip(acqWanted)}>Wanted</button>
          <button onClick={()=>setAcqOwned(v=>!v)} style={chip(acqOwned)}>Owned</button>
          <button onClick={()=>setAcq3mo(v=>!v)} style={chip(acq3mo)}>3+ mos</button>
          <button onClick={()=>setAcq6mo(v=>!v)} style={chip(acq6mo)}>6+ mos closing window</button>
          <button onClick={()=>setAcqNoCat(v=>!v)} style={chip(acqNoCat)}>No catalogue</button>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:C.soft,marginRight:2}}>Showing</span>
          <button onClick={()=>setWatchedF(v=>!v)} style={chip(watchedF)}>Watched</button>
          <button onClick={()=>{setDismissedOnly(v=>!v);setShowAll(false);}} style={chip(dismissedOnly)}>Dismissed</button>
          <button onClick={()=>{setShowAll(v=>!v);setDismissedOnly(false);}} style={chip(showAll)}>Show all</button>
          <button onClick={clearFilters} style={{...chip(false),color:C.muted,borderColor:C.muted}}>Clear all</button>
        </div>
      </div>

      <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
        {view.length===0&&<div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:5,padding:18,fontSize:12.5,color:C.soft}}>Nothing matches those filters.</div>}
        {(()=>{
          const pinnedCount=pinTouched?view.filter(x=>refreshTouched.includes(x.id)).length:0;
          // Band headers for the two "recently" sorts (only when not in the post-import pinned snapshot).
          const bandMode=(!pinTouched&&(sortBy==="added"||sortBy==="edited"))?sortBy:null;
          const newestAdd=bandMode==="added"?(view.find(x=>x.addedAt)?.addedAt||null):null;
          const newestEdit=bandMode==="edited"?(view.find(x=>x.editedAt)?.editedAt||null):null;
          const bandOf=(x)=>{
            if(bandMode==="added")return !x.addedAt?"seed":(x.addedAt===newestAdd?"add_this":"add_earlier");
            if(bandMode==="edited")return x.editedAt?(x.editedAt===newestEdit?"ed_this":"ed_earlier"):(x.addedAt?"ed_never":"seed");
            return null;
          };
          const BAND_LABEL={add_this:"This import",add_earlier:"Earlier imports",seed:"Original set",ed_this:"This import's edits",ed_earlier:"Earlier edits",ed_never:"Never edited"};
          const bandDivider=(txt)=><div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 2px",color:C.soft}}><div style={{flex:1,height:1,background:C.rule}}/><span style={{fontSize:9.5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{txt}</span><div style={{flex:1,height:1,background:C.rule}}/></div>;
          return view.map((r,i)=>{
          const brk=(pinTouched&&pinnedCount>0&&pinnedCount<view.length&&i===pinnedCount)?bandDivider("Rest of the list"):null;
          let header=null;
          if(bandMode){const b=bandOf(r);const pb=i>0?bandOf(view[i-1]):null;if(b!==pb)header=bandDivider(BAND_LABEL[b]||"");}
          const lead=brk||header;
          const t=tierFor(r),tier=TIERS[t],mu=MU[r.museumId],mo=moSince(r.endDate),isOpen=openCards[r.id],noCat=r.looked&&r.hasCatalogue==="no",isAcq=r.acquiring==="acquired",dismissed=!r.interested,isBusy=busyId===r.id;
          const searchingLabel=lookPhase==="shop"?"Searching venue shop\u2026":lookPhase==="web"?"Searching more broadly\u2026":"Searching\u2026";
          if(dismissed)return(
            <React.Fragment key={r.id}>{lead}
            <article style={{background:"#ECEAE6",border:"1px solid "+C.rule,borderLeft:"4px solid "+C.muted,borderRadius:5,padding:"10px 14px",opacity:0.55}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft}}>{mu?.short}</span>
                <button onClick={()=>restore(r.id)} style={{background:"none",border:"1px solid "+C.action,borderRadius:3,color:C.action,fontSize:10,fontWeight:500,cursor:"pointer",padding:"2px 8px"}}>Restore</button>
              </div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,fontWeight:500,marginTop:3,color:C.soft}}>{r.title}</div>
              <div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{dateRange(r)}</div>
            </article>
            </React.Fragment>
          );
          return(
            <React.Fragment key={r.id}>{lead}
            <article style={{background:C.card,border:"1px solid "+C.rule,borderLeft:"4px solid "+(noCat?C.muted:isAcq?C.owned:tier.ink),borderRadius:5,overflow:"hidden"}}>
              <div style={{padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                  <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginTop:2}}>{mu?.short}</span>
                  {noCat?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.muted,background:"#E3DED7",padding:"2px 7px",borderRadius:3}}>No catalogue</span>
                  :isAcq?<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.owned,background:"#EDE5F5",padding:"2px 7px",borderRadius:3}}>Owned</span>
                  :<span style={{fontSize:9,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:tier.ink,background:tier.wash,padding:"2px 7px",borderRadius:3}}>{tier.label}</span>}
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:0,marginTop:5}}>
                  <h3 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,lineHeight:1.2,fontWeight:500,margin:0,letterSpacing:"-0.01em",flex:1}}>
                    {r.title}
                    {r.exUrl&&<a href={r.exUrl} target="_blank" rel="noopener noreferrer" style={{color:C.action,textDecoration:"none",marginLeft:5,fontSize:13,fontWeight:400}}>{"\u2197"}</a>}
                  </h3>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8,flexShrink:0}}>
                    <button onClick={()=>toggleWatch(r.id)} title={r.watching?"Unwatch":"Watch"} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,lineHeight:1,color:r.watching?"#B8860B":C.muted}}>{r.watching?"\u2605":"\u2606"}</button>
                    {!isAcq&&<button onClick={()=>dismiss(r.id)} title="Not interested" style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:18,lineHeight:1,color:C.muted}}>{"\u00d7"}</button>}
                  </div>
                </div>
                <div style={{fontSize:11,color:C.soft,marginTop:3,marginBottom:6}}>{dateRange(r)}</div>
                {r.summary&&<p style={{fontSize:12.5,lineHeight:1.5,margin:"0 0 8px",color:"#3D3730"}}>{r.summary}</p>}
                {!noCat&&!isAcq&&mo!==null&&mo>0&&(
                  <div style={{margin:"8px 0 6px"}}>
                    <div style={{position:"relative",height:5,background:"#DDD8D0",borderRadius:3}}>
                      <div style={{height:"100%",width:Math.min(100,(mo/12)*100)+"%",background:tier.ink,borderRadius:3}}/>
                      {[3,6].map(k=><span key={k} style={{position:"absolute",left:(k/12*100)+"%",top:-2,width:1,height:10,background:C.soft,opacity:0.5}}/>)}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:8.5,color:C.soft,marginTop:3,letterSpacing:"0.05em"}}><span>CLOSED</span><span>3 MO</span><span>6 MO</span><span>12 MO</span></div>
                  </div>
                )}
                {!noCat&&!isAcq&&<div style={{fontSize:11,color:tier.ink,fontWeight:500,marginBottom:8}}>{tier.note}</div>}
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid "+C.rule}}>
                  <span style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:C.soft}}>Want the catalogue?</span>
                  <button onClick={()=>setAcq(r.id,"yes")} style={chip(r.acquiring==="yes")}>Yes</button>
                  <button onClick={()=>setAcq(r.id,"no")} style={chip(r.acquiring==="no")}>No</button>
                  <button onClick={()=>setAcq(r.id,"acquired")} style={chip(r.acquiring==="acquired")}>Acquired</button>
                  <button onClick={()=>setOpenCards(o=>({...o,[r.id]:!o[r.id]}))} style={{marginLeft:"auto",background:"none",border:"none",color:C.action,fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 0"}}>
                    {isOpen?"Hide":(r.looked&&r.hasCatalogue==="yes")?"\u2713 Catalogue":(r.looked&&r.hasCatalogue==="no")?"\u2717 Catalogue":"Catalogue"}
                  </button>
                </div>
              </div>
              {isOpen&&(
                <div style={{background:"#ECE8E1",borderTop:"1px solid "+C.rule,padding:"12px 14px"}}>
                  {!r.looked?(
                    <div>
                      <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue search run yet.</p>
                      <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{...pBtn,padding:"6px 12px",fontSize:12}}>{isBusy?searchingLabel:"Find catalogue"}</button>
                    </div>
                  ):noCat?(
                    <div>
                      <p style={{fontSize:12,color:C.soft,margin:"0 0 8px"}}>No catalogue found for this exhibition.</p>
                      <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{background:"none",border:"none",color:C.soft,fontSize:11,textDecoration:"underline",cursor:"pointer",padding:0}}>{isBusy?searchingLabel:"Search again"}</button>
                    </div>
                  ):(
                    <div>
                      {r.shopState==="shop"&&<div style={{fontSize:11,color:C.action,fontWeight:600,marginBottom:6}}>In the museum shop.</div>}
                      {r.shopState==="web"&&<div style={{fontSize:11,color:C.soft,marginBottom:6}}>Not in the museum shop \u2014 the shop link below opens the general store; other buy options shown too.</div>}
                      {r.catalogueTitle&&<div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:14.5,fontWeight:500,marginBottom:2,lineHeight:1.3}}>{r.catalogueTitle}</div>}
                      {r.publisher&&<div style={{fontSize:11,color:C.soft,marginBottom:2}}>{r.publisher}</div>}
                      <div style={{fontSize:11.5,fontFamily:"ui-monospace,monospace",marginBottom:10,color:r.isbn13?C.ink:C.soft}}>
                        {r.isbn13?"ISBN "+fmtIsbn(r.isbn13):"ISBN not confirmed \u2014 verify before buying"}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {isAcq?(
                          <>
                            {r.shopUrl&&<a href={r.shopUrl} target="_blank" rel="noopener noreferrer" style={lnk}>Museum shop {"\u2197"}</a>}
                            {r.publisherUrl&&<a href={r.publisherUrl} target="_blank" rel="noopener noreferrer" style={lnk}>Publisher {"\u2197"}</a>}
                          </>
                        ):buyLinks(r).map(l=><a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={lnk}>{l.name} {"\u2197"}</a>)}
                      </div>
                      <button onClick={()=>findOneCat(r.id)} disabled={busy} style={{marginTop:8,background:"none",border:"none",color:C.soft,fontSize:10.5,textDecoration:"underline",cursor:"pointer",padding:0}}>{isBusy?searchingLabel:"Search again"}</button>
                    </div>
                  )}
                </div>
              )}
            </article>
            </React.Fragment>
          );
        });})()}
      </div>
      {showTop&&(
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Return to top"
          style={{position:"fixed",bottom:undo?64:20,left:"50%",transform:"translateX(-50%)",zIndex:998,width:38,height:38,borderRadius:"50%",background:C.card,border:"1px solid "+C.rule,color:C.ink,fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>{"\u2191"}</button>
      )}
      {undo&&(
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.ink,color:"#fff",borderRadius:4,padding:"7px 14px",fontSize:12,display:"flex",gap:10,alignItems:"center",zIndex:999,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          <span>Dismissed</span>
          <button onClick={undoDismiss} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",borderRadius:3,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 8px"}}>Restore</button>
        </div>
      )}
      <div style={{maxWidth:760,margin:"18px auto 0",paddingTop:10,borderTop:"1px solid "+C.rule,fontSize:10,color:C.soft,lineHeight:1.6}}>
        Built-in starter set from venue pages, 20 Aug 2026.{" "}
        <button onClick={requestReset} style={{background:"none",border:"none",color:C.soft,fontSize:10,textDecoration:"underline",cursor:"pointer",padding:0}}>Reset ledger</button>
        {" \u2014 force-loads the starter set onto the screen."}
      </div>
      {proposals&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.5)",zIndex:1100,display:"flex",flexDirection:"column",padding:16}}>
          <div style={{background:C.bg,borderRadius:8,maxWidth:820,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",maxHeight:"100%",overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.rule}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:C.ink}}>{proposals.length} proposed change{proposals.length===1?"":"s"} found</div>
              <div style={{fontSize:11.5,color:C.soft,marginTop:3,lineHeight:1.5}}>Review each one below. Nothing changes in your ledger until you tap {"\u201c"}Go ahead and update the ledger{"\u201d"}.</div>
            </div>
            <div style={{overflow:"auto",padding:"12px 18px",flex:1}}>
              {MUSEUMS.map(m=>{const grp=proposals.map((p,i)=>({p,i})).filter(x=>x.p.venueId===m.id);if(!grp.length)return null;return(
                <div key={m.id} style={{marginBottom:14}}>
                  <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>{m.short}</div>
                  {grp.map(({p,i})=>renderProposalCard(p,i))}
                </div>
              );})}
              {coverage.length>0&&(
                /* PAGES THAT COULD NOT BE READ — a report, not a decision.
                   These were Add cards until 13 Sep, so a refused venue put
                   junk on this pile that came back on every future sweep,
                   because rejecting is not remembered. Shown last, below the
                   real work, because nothing here needs answering. */
                <div style={{marginBottom:14,marginTop:6,paddingTop:12,borderTop:"1px solid "+C.rule}}>
                  <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.soft,marginBottom:6,fontWeight:600}}>Pages that couldn{"\u2019"}t be read {"\u00b7"} nothing to decide</div>
                  <div style={{fontSize:11.5,color:C.soft,lineHeight:1.55,marginBottom:8}}>The sweep tried these and was turned away. No exhibitions were collected from them, so nothing is missing from your ledger that was ever offered.</div>
                  {coverage.map((cv,i)=>(
                    <div key={i} style={{border:"1px solid "+C.rule,borderRadius:6,padding:"8px 10px",marginBottom:6,background:C.card}}>
                      <div style={{fontSize:12,color:C.ink}}><strong>{cv.venueShort}</strong> {"\u2014"} {cv.what}</div>
                      <div style={{fontSize:11.5,color:C.soft,marginTop:2,lineHeight:1.5}}>{cv.why}</div>
                    </div>
                  ))}
                </div>
              )}
              {(()=>{const grp=proposals.map((p,i)=>({p,i})).filter(x=>x.p.venueId===null);if(!grp.length)return null;return(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:C.accent,marginBottom:6,fontWeight:600}}>Couldn{"\u2019"}t be filed</div>
                  {grp.map(({p,i})=>renderProposalCard(p,i))}
                </div>
              );})()}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+C.rule,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={cancelRefresh} style={sBtn}>Cancel refresh</button>
              <span style={{fontSize:11.5,color:C.soft,marginLeft:"auto"}}>{acceptedCount} to apply {"\u00b7"} {undecidedCount} undecided</span>
              <button onClick={applyRefresh} style={pBtn}>Go ahead and update the ledger</button>
            </div>
          </div>
        </div>
      )}
      {confirmBox&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,16,0.45)",display:"grid",placeItems:"center",zIndex:1000,padding:16}}>
          <div style={{background:C.card,border:"1px solid "+C.rule,borderRadius:8,maxWidth:420,padding:"18px 20px",boxShadow:"0 6px 24px rgba(0,0,0,0.25)"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:8}}>Replace what's on screen?</div>
            <div style={{fontSize:12.5,color:"#3D3730",lineHeight:1.5,marginBottom:16}}>{confirmBox.text}</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmBox(null)} style={sBtn}>Cancel</button>
              <button onClick={()=>{const a=confirmBox.act;setConfirmBox(null);a&&a();}} style={{...pBtn,background:C.accent}}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
