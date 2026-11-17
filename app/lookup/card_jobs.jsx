//@ The jobs on one card: Find catalogue / Search again and Re-check museum shop — what they found and what to say.
//@piece findCatalogueJob


// Find catalogue and Search again (findOneCat's job). `row` is the card as it was pressed; `hooks`
// the lookup's (lookupCatalogue); `latest()` the ledger as it stands when the answer arrives.
// Hands back `rows` to commit (or null), `card` — the line for the card {id,text,failed} (or null),
// `banner` — the sentence for the banner (or null), and `detail`, the diagnostic.
// A step that died is not an answer: the card says why, and the reason is not
// stored — it is a fact about one attempt. C-043 to C-045.
async function findCatalogueJob(row,hooks,latest){
  const id=row.id;
  // Not words: the lookup log's names for the two buttons.
  const tape=tapeStart(row.looked?"Search again":"Find catalogue",row);
  const out=await lookupCatalogue(row,hooks);
  saveLookupTape(tape,out);
  const res={detail:out.detail,rows:null,card:null,banner:null};
  // SEARCH AGAIN REPLACES THE CARD ONLY WHEN IT FINISHED. Any step that
  // failed → the card stays as it was, and says so.
  if(row.looked&&out.ok&&out.trouble){
    res.card={id,failed:true,text:say(W.searchAgainDidntFinish,{why:out.trouble.split("[")[0].trim()})};
  } else if(out.ok){
    res.rows=landOnCard(latest(),id,row,out.row);
    if(out.trouble&&out.troubleLang)res.banner=say(W.foundButLanguageStopped,{title:row.title,why:out.trouble.split("[")[0].trim()});
    else if(out.trouble)res.banner=say(W.foundButSearchStopped,{title:row.title,why:out.trouble.split("[")[0].trim()});
  } else {
    // On the card, not in a banner (her decision): Re-check's line word for word,
    // "Re-check" swapped for "Search" or "Search again".
    const why=String(out.detail||"").split("\n").pop().split("[")[0].trim();
    res.card={id,failed:true,text:say(W.didntRun,{what:row.looked?W.searchAgain:W.search,why})};
  }
  return res;
}
//@piece recheckShopJob


// "Re-check museum shop" (her design; see "A BOOK LEAVING THE SHOP" in card_text.jsx; recheckShop's job):
// its answer is printed on the card, under the button she pressed. `found` is the card as it was
// pressed, `hooks` the lookup's, `latest()` the ledger as it stands when the answer arrives.
// Hands back `rows` to commit (or null), `card` {id,text,failed}, and `detail`, the diagnostic.
async function recheckShopJob(found,hooks,latest){
  // Not words: the lookup log's name for the button.
  const tape=tapeStart("Re-check museum shop",found);
  const out=await recheckShopRow(found,hooks);
  saveLookupTape(tape,out);
  const id=found.id;
  return {detail:out.detail||null,
    rows:out.ok&&out.row&&out.row!==found?landOnCard(latest(),id,found,out.row):null,
    card:{id,text:out.said,failed:!out.ok}};
}
