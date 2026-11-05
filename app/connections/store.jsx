//@ The page's capabilities, and the only door to its store: the read-only lock, the unread markers.
//@piece STORE_UNREAD


// A STORE READ THAT FAILED IS NEVER SHOWN AS "NOTHING THERE", AND NEVER SAVED OVER (her decision: her link
// venues once came up as bare addresses after a failed read, and the next import would have written the list
// back with only its new venue). A part of the store that could not be read this opening is named on the page,
// and its write refuses until the page is opened again. A part that is simply empty is read as empty.
const STORE_UNREAD=new Set();
//@piece storeUnreadSeen

let storeUnreadSeen=()=>{};
//@piece markUnread
   // the page's banner, told when a read fails
function markUnread(what){ STORE_UNREAD.add(what); storeUnreadSeen([...STORE_UNREAD]); }
//@piece UNREAD_OCC,UNREAD_LINKS,UNREAD_PAGES,UNREAD_PASTES,UNREAD_SWEEPS,UNREAD_QUAR

const UNREAD_OCC="the link venues", UNREAD_LINKS="the links waiting in the Links box", UNREAD_PAGES="the pages waiting in the Pages list",
  UNREAD_PASTES="the boxes waiting in Paste",
  UNREAD_SWEEPS="the sweep log", UNREAD_QUAR="the quarantine list";
//@piece useCap


// One of the page's capabilities, or null when this viewer has none. The store ("db") is
// reached only through the door below.
async function useCap(name){
  try{
    if(typeof window==="undefined"||!window.claude||typeof window.claude.use!=="function")return null;
    return await window.claude.use(name);
  }catch{ return null; }
}
//@piece cloudReadOnly

let cloudReadOnly=false;
//@piece storeRef


// THE STORE'S DOOR — the only code that reads or writes the page's store. Its rules:
// - no store in this viewer: every operation rejects {code:"no_store"};
// - a read-only copy (see ONE COPY EDITS): every write rejects {code:"read_only"}, except the
//   one-tab claim's own, made with {claim:true};
// - with {part} (an UNREAD_ name): a read that fails, or finds no store, marks that part
//   unread, and while it is unread its writes reject {code:"unread"}.
// A path of four steps or more is reached through its parent record (lookups/<id>/pieces/<n>).
function storeRef(db,path){
  const s=String(path).split("/");
  let r=db.doc(s.slice(0,2).join("/"));
  for(let i=2;i+1<s.length;i+=2)r=r.collection(s[i]).doc(s[i+1]);
  return r;
}
//@piece storeNo

function storeNo(code){
  return code==="read_only"?{code,message:"This copy is read only."}
    :code==="unread"?{code,message:"This part of the store could not be read, so it is not written."}
    :{code,message:"This viewer can\u2019t reach the page\u2019s store."};
}
//@piece storeReached

// True when the store is reached and, with {part}, that part is not unread: a write may go ahead.
async function storeReached(o){
  if(o&&o.part&&STORE_UNREAD.has(o.part))return false;
  return !!(await useCap("db"));
}
//@piece storeRead

// One record: {exists,data}.
async function storeRead(path,o){
  try{
    const db=await useCap("db");
    if(!db)throw storeNo("no_store");
    const s=await storeRef(db,path).get();
    return {exists:!!s.exists,data:s.exists?s.data():undefined};
  }catch(e){ if(o&&o.part)markUnread(o.part); throw e; }
}
//@piece storeList

// A collection's records, [{id,data}], in the order and number asked: {by,dir,limit}.
async function storeList(coll,q,o){
  try{
    const db=await useCap("db");
    if(!db)throw storeNo("no_store");
    let c=db.collection(coll);
    if(q&&q.by)c=c.orderBy(q.by,q.dir);
    if(q&&q.limit)c=c.limit(q.limit);
    const s=await c.get();
    return s.docs.map(d=>({id:d.id,data:d.data()}));
  }catch(e){ if(o&&o.part)markUnread(o.part); throw e; }
}
//@piece storeWrite

// Writes one record whole; {merge:true} adds its fields to the record instead.
async function storeWrite(path,value,o){
  const db=await storeWritable(o);
  const r=storeRef(db,path);
  await ((o&&o.merge)?r.update(value):r.set(value));
}
//@piece storeDelete

async function storeDelete(path,o){
  const db=await storeWritable(o);
  await storeRef(db,path).delete();
}
//@piece storeWritable

// The store for a write, or the rule that refuses it.
async function storeWritable(o){
  if(o&&o.part&&STORE_UNREAD.has(o.part))throw storeNo("unread");
  const db=await useCap("db");
  if(!db)throw storeNo("no_store");
  if(cloudReadOnly&&!(o&&o.claim))throw storeNo("read_only");
  return db;
}
