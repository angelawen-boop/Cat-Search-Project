//@ Reaching the page's capabilities, and its store: read-only mode, the unread markers.
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


async function useCap(name){
  try{
    if(typeof window==="undefined"||!window.claude||typeof window.claude.use!=="function")return null;
    const cap=await window.claude.use(name);
    // A READ-ONLY COPY CANNOT WRITE TO THE STORE — see ONE COPY EDITS.
    return (name==="db"&&cap&&cloudReadOnly)?readOnlyStore(cap):cap;
  }catch{ return null; }
}
//@piece cloudReadOnly

let cloudReadOnly=false;
//@piece readOnlyStore


// The store, with every write refused. Reads pass through.
function readOnlyStore(db){
  const no=()=>Promise.reject({code:"read_only",message:"This copy is read only."});
  // Named members only: the platform's namespace is frozen, and spreading it
  // would copy nothing its prototype holds.
  return {doc:path=>({get:()=>db.doc(path).get(),set:no,update:no,delete:no}),
          collection:c=>db.collection(c)};
}
//@piece rawStore

async function rawStore(){
  try{ return (typeof window!=="undefined"&&window.claude&&window.claude.use)?await window.claude.use("db"):null; }catch{ return null; }
}
