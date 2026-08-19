(()=>{
if(window.__LIB_GENRE_DELEGATE_V5)return;window.__LIB_GENRE_DELEGATE_V5=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let lastSig='',pending=false;
function generic(v){const n=norm(v);return !n||['fiction','narrativa','letteratura','romanzo','novel','ragazzi','young adult','adult','libri per ragazzi'].includes(n)}
async function run(){if(pending)return;const dlg=document.getElementById('editDialog'),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),code=clean(document.getElementById('editCode')?.value),field=document.getElementById('editCategory');if(!dlg?.open||!title||!author||!field||!generic(field.value))return;const sig=[code,norm(title),norm(author)].join('|');if(sig===lastSig)return;lastSig=sig;if(typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES!=='function'){lastSig='';return}pending=true;try{await window.__LIB_RESOLVE_UNIVERSAL_SERIES({code,title,author,saga:document.getElementById('editSaga')?.value||'',publisher:document.getElementById('editPublisher')?.value||''});window.__LIB_GENRE_DELEGATE_LAST__={sig,genres:window.__LIB_LAST_UNIVERSAL_GENRES__||[]}}catch(e){window.__LIB_GENRE_DELEGATE_ERROR__=String(e&&e.message||e)}finally{pending=false}}
let tries=0;const timer=setInterval(()=>{tries++;run();if(tries>=240)clearInterval(timer)},500);setTimeout(run,0);
window.__LIB_GOODREADS_DIRECT_V4=false;
})();
