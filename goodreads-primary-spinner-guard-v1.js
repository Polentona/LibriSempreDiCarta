(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_PRIMARY_SPINNER_GUARD_V1)return;root.__LIB_GOODREADS_PRIMARY_SPINNER_GUARD_V1=true;
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
function el(id){return typeof document!=='undefined'?document.getElementById(id):null}
function ensureStyle(){if(el('goodreadsPrimarySpinnerStyle'))return;const st=document.createElement('style');st.id='goodreadsPrimarySpinnerStyle';st.textContent=`#lookupStatus[data-goodreads-primary-busy="1"]{font-size:0!important;min-height:24px;display:flex;align-items:center}#lookupStatus[data-goodreads-primary-busy="1"]::before{content:"📖";display:inline-block;font-size:20px;line-height:1;transform-origin:center;animation:goodreadsPrimarySpin .85s linear infinite}#lookupStatus[data-goodreads-primary-busy="1"] .lookup-book-spinner{display:none!important}@keyframes goodreadsPrimarySpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;document.head.appendChild(st)}
let activeCode='';
function start(){const s=el('lookupStatus'),c=code(el('editCode')?.value||'');if(!s||!c)return;ensureStyle();activeCode=c;s.dataset.goodreadsPrimaryBusy='1'}
function tick(){const s=el('lookupStatus');if(!s||!activeCode)return;const current=code(el('editCode')?.value||'');if(current!==activeCode){delete s.dataset.goodreadsPrimaryBusy;activeCode='';return}const last=root.__LIB_LOOKUP_PROGRESS_V11_LAST__||root.__LIB_LOOKUP_PROGRESS_V10_LAST__;const finished=last?.code===activeCode&&['complete','settled-with-gaps','timeout','cancelled'].includes(last.reason);if(finished){delete s.dataset.goodreadsPrimaryBusy;activeCode='';return}s.dataset.goodreadsPrimaryBusy='1'}
function boot(){const btn=el('lookupMetadataBtn');if(!btn){setTimeout(boot,100);return}ensureStyle();document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')start()},true);setInterval(tick,120)}
if(typeof document!=='undefined')boot();
root.__LIB_GOODREADS_PRIMARY_SPINNER_GUARD_TEST__={start,tick};
})();
