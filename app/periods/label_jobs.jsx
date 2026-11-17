//@ The labelling jobs: Label, Relabel, Label import cards, what each says, and putting the labels onto rows or cards.
//@piece labelCardsJob


// Every new show gets its period while she reviews the cards: one ask for
// the import, written onto the card (docs/periods.md). A miss leaves the card without
// one, for Label to fill later. `props` are the import's cards. Hands back nothing when there is
// no new show, else {labels: Map card index → label, at, said} (labelsOntoCards writes them).
async function labelCardsJob(props){
  const shows=[];
  props.forEach((p,i)=>{ if(p.type==="add")shows.push(periodShow(i,p.cand)); });
  if(!shows.length)return null;
  // Not words: the lookup log's name and title for the record.
  const tape=tapeStart("Label import cards",{title:shows.length+" new shows"});
  const {labels,batches}=await labelPeriods(shows);
  const said=labelSummary(shows.length,batches);
  saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
  const at=new Date().toISOString();
  return {labels,at,said};
}
//@piece labelsOntoCards

// The labels onto the import's cards — only if they are still the same cards (`cur` is the cards
// as they stand now, `props` the cards that were labelled).
const labelsOntoCards=(cur,props,{labels,at})=>cur!==props?cur:props.map((p,i)=>labels.has(i)?{...p,cand:{...p.cand,...labels.get(i),labelledAt:at}}:p);
//@piece labelLedgerStart

// Label: every show (stage 3: the whole ledger, her decision) with no period or no themes yet, dismissed ones
// included. Fills only; a labelled show is never relabelled. Not an edit of hers: editedAt stays.
// What there is to label: {todo}, or {said} when there is nothing.
function labelLedgerStart(rows){
  const todo=rows.filter(r=>!labelDone(r));
  if(!todo.length)return {said:{ok:true,text:W.labelNothingToDo}};
  return {todo};
}
//@piece labelLedgerJob

// Label's job on `todo` (labelLedgerStart). `progress` takes each progress line {done,total,label}.
// Hands back `labels` (Map id → label, or null when none came back; labelsOntoRows writes them),
// `said` — her line — and `debug`, the diagnostic.
async function labelLedgerJob(todo,progress){
  progress({done:0,total:todo.length,label:W.labellingPeriods});
  // Each run is one record in the lookup log: every question, Claude's answer, each batch's outcome.
  // Not words: the lookup log's name and title for the record.
  const tape=tapeStart("Label periods",{title:todo.length+" exhibitions"});
  let said={ok:false,text:W.labelDidntFinish}, batches=[], labels=null;
  try{
    const res=await labelPeriods(todo.map((r,i)=>periodShow(i,r)),(done,total)=>progress({done,total,label:W.labellingPeriods}));
    batches=res.batches;
    const at=new Date().toISOString();
    const byId=new Map(); res.labels.forEach((v,i)=>byId.set(todo[i].id,{...v,labelledAt:at}));
    if(byId.size)labels=byId;
    said=labelSummary(todo.length,batches);
  }catch(e){ said={ok:false,text:say(W.labelDidntFinishWhy,{why:String((e&&e.message)||e)})}; }
  const debug=said.text+"\n"+batches.map((b,j)=>say(W.labelBatch,{n:j+1,labelled:b.labelled,of:b.shows,tries:b.tries,word:b.tries===1?W.try:W.tries,why:b.why?" \u2014 "+b.why:""})).join("\n");
  saveLookupTape(tape,{ok:said.ok,said:said.text,detail:JSON.stringify(batches)});
  return {labels,said,debug};
}
//@piece labelsOntoRows

// The labels onto the rows as they stand now; a row labelled meanwhile is skipped.
const labelsOntoRows=(rows,byId)=>rows.map(r=>byId.has(r.id)&&!labelDone(r)?{...r,...byId.get(r.id)}:r);
//@piece relabelJob

// Relabel (her design): one show asked afresh under the current rules, its label
// replaced; what it says shows in that card's drawer. Not an edit of hers: editedAt stays.
// `r` is the card as it was pressed; `latest()` the ledger as it stands when the answer arrives.
// Hands back `rows` to put in place (or null) and `said`, the line for the card {id,failed,text,regrouped}.
async function relabelJob(r,latest){
  const id=r.id;
  // Not words: the lookup log's name for the record.
  const tape=tapeStart("Relabel",r);
  let said, rows=null;
  try{
    const {labels,batches}=await labelPeriods([periodShow(0,r)]);
    const v=labels.get(0)&&{...labels.get(0),periodKeep:false,relabelledAt:new Date().toISOString()};
    if(v){
      const next=landOnCard(latest(),id,r,{...r,...v});
      rows=next;
      const nr={...r,...v}, shown=periodOf(nr,artistPeriods(next));
      said={id,failed:false,regrouped:shown!==nr.period,text:say(W.relabelled,{period:periodText(nr),regrouped:shown!==nr.period?say(W.shownWithArtist,{artist:nr.periodArtist,period:PERIOD_NAME[shown]}):""})};
    }else said={id,failed:true,text:say(W.relabelDidntFinish,{why:batches[0]&&batches[0].why||W.noAnswer})};
  }catch(e){ said={id,failed:true,text:say(W.relabelDidntFinish,{why:String((e&&e.message)||e)})}; }
  finally{ saveLookupTape(tape,{ok:!said.failed,said:said.text}); }
  return {rows,said};
}
//@piece keptPeriodSaid

// "Keep this period"'s line for the card; `r` is the card before the mark.
const keptPeriodSaid=(id,r)=>({id,failed:false,text:say(W.relabelledKept,{period:periodText(r)})});
