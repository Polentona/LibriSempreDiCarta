(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_ISBN_ENRICHMENT_PROGRESS_V10)return;root.__LIB_ISBN_ENRICHMENT_PROGRESS_V10=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
let active=false,lookupCode='',startedAt=0,baseSettled=false,finalText='',finalClass='',timer=null;
function el(id){return typeof document!=='undefined'?document.getElementById(id):null}
function currentCode(){return code(el('editCode')?.value||'')}
function busyNode(){const s=el('lookupStatus');return !!s&&String(s.className||'').split(/\s+/).includes('lookup-busy')}
function sameState(s){return !!s&&s.code===lookupCode}
function deferred(){const saga=root.__LIB_SERIES_SAGA_LOCK_STATE__,genre=root.__LIB_STORYGRAPH_GENRE_LOCK_STATE__;return{saga,genre,sagaSettled:sameState(saga)&&!!saga.settled,genreSettled:sameState(genre)&&!!genre.settled,sagaComplete:sameState(saga)&&!!saga.complete,genreComplete:sameState(genre)&&!!genre.complete}}
function forceSpinner(){const s=el('lookupStatus');if(!s)return;s.innerHTML='<span class="lookup-book-spinner" aria-hidden="true">📖</span>';s.className='lookup-status lookup-busy';s.setAttribute?.('aria-label','Ricerca dati in corso')}
function finish(reason='complete'){
  if(!active)return;const d=deferred(),s=el('lookupStatus'),btn=el('lookupMetadataBtn');active=false;clearInterval(timer);timer=null;if(btn)btn.disabled=false;
  if(s){s.removeAttribute?.('aria-label');const exhausted=(d.saga?.exhausted||d.genre?.exhausted)&&!(d.sagaComplete&&d.genreComplete);s.textContent=exhausted&&!finalText?'Ricerca completata: alcuni dati non sono stati trovati automaticamente.':(finalText||'Dati recuperati.');s.className=exhausted?'lookup-status warn':(finalClass&&!/lookup-busy/.test(finalClass)?finalClass:'lookup-status ok')}
  root.__LIB_LOOKUP_PROGRESS_V10_LAST__={code:lookupCode,reason,saga:d.saga||null,genre:d.genre||null,finishedAt:Date.now()}
}
function tick(){if(!active)return;const dlg=el('editDialog');if(!dlg?.open||currentCode()!==lookupCode){finish('cancelled');return}const btn=el('lookupMetadataBtn');if(btn)btn.disabled=true;const d=deferred();if(baseSettled&&d.sagaSettled&&d.genreSettled){finish(d.sagaComplete&&d.genreComplete?'complete':'settled-with-gaps');return}if(Date.now()-startedAt>95000){finish('timeout');return}forceSpinner()}
function activate(){const c=currentCode();if(!c)return;active=true;lookupCode=c;startedAt=Date.now();baseSettled=false;finalText='';finalClass='';clearInterval(timer);forceSpinner();const btn=el('lookupMetadataBtn');if(btn)btn.disabled=true;timer=setInterval(tick,220);root.__LIB_LOOKUP_PROGRESS_V10_STATE__={code:c,active:true,startedAt}}
function onStatusMutation(){const s=el('lookupStatus');if(!s)return;if(busyNode()){if(!active)activate();return}if(!active)return;const overlay=el('metadataOverlay');if(overlay?.open){finish('choice-required');return}baseSettled=true;const text=clean(s.textContent||s.innerText||'');if(text)finalText=text;if(s.className)finalClass=String(s.className);const d=deferred();if(d.sagaSettled&&d.genreSettled)finish(d.sagaComplete&&d.genreComplete?'complete':'settled-with-gaps');else forceSpinner()}
function boot(){const s=el('lookupStatus');if(!s){setTimeout(boot,120);return}new MutationObserver(onStatusMutation).observe(s,{childList:true,subtree:true,attributes:true,characterData:true});if(busyNode())activate();document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')setTimeout(()=>{if(busyNode())activate()},0)},true)}
if(typeof document!=='undefined')boot();
root.__LIB_LOOKUP_PROGRESS_V10_TEST__={activate,onStatusMutation,tick,deferred,finish};
})();
