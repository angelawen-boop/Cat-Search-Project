//@ How dates and times are shown: date ranges, 'x weeks ago', local stamps.
//@piece relTime


function relTime(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"just now";const m=Math.floor(s/60);if(m<60)return m+" minute"+(m===1?"":"s")+" ago";const h=Math.floor(m/60);if(h<24)return h+" hour"+(h===1?"":"s")+" ago";const day=Math.floor(h/24);return day+" day"+(day===1?"":"s")+" ago";}
//@piece minsSinceIso

function minsSinceIso(iso){if(!iso)return Infinity;const d=new Date(iso);if(isNaN(d))return Infinity;return(Date.now()-d.getTime())/60000;}
//@piece MS_MO,MS_WK

const MS_MO=1e3*60*60*24*30.44, MS_WK=1e3*60*60*24*7;
//@piece moSince

const moSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_MO;};
//@piece wksSince

const wksSince=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");return isNaN(x)?null:(Date.now()-x)/MS_WK;};
//@piece MON3

const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//@piece fmtDate

const fmtDate=d=>{if(!d)return null;const x=new Date(d+"T00:00:00");if(isNaN(x))return d;return x.getDate()+" "+MON3[x.getMonth()]+" "+x.getFullYear();};
//@piece fmtRefresh

function fmtRefresh(iso){if(!iso)return"never";const d=new Date(iso);if(isNaN(d))return"never";const mon=MON3[d.getMonth()];let h=d.getHours();const ap=h<12?"am":"pm";h=h%12;if(h===0)h=12;const mm=String(d.getMinutes()).padStart(2,"0");return mon+" "+d.getDate()+", "+d.getFullYear()+" "+h+":"+mm+ap;}
//@piece dateRange

function dateRange(r){const a=fmtDate(r.startDate),b=fmtDate(r.endDate);if(a&&b)return a+" \u2014 "+b;if(b)return"until "+b;if(a){const st=new Date(r.startDate+"T00:00:00");const past=!isNaN(st)&&st<=new Date();return(past?"open since ":"opens ")+a;}return"dates unknown";}
//@piece localStamp

function localStamp(iso){const d=iso?new Date(iso):new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
//@piece localReadable

// One way to write a moment (her decision): "Sep 26, 2026 1:22pm", as "Last refreshed".
function localReadable(iso){return fmtRefresh(iso||new Date().toISOString());}
