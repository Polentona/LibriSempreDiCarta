(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_PUBLISHER_PLOT_LOCK_V8)return;root.__LIB_PUBLISHER_PLOT_LOCK_V8=true;
root.__LIB_PUBLISHER_PLOT_LOCK_V9=true;
root.__LIB_PUBLISHER_PLOT_LOCK_V8_LATE_RESOLVER=true;
root.__LIB_PUBLISHER_PLOT_LOCK_V8_SANITIZED=true;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const getOfficial=()=>typeof root.__LIB_RESOLVE_OFFICIAL_PLOT==='function'?root.__LIB_RESOLVE_OFFICIAL_PLOT:null;
const sanitizePlot=(v,i)=>{let p=clean(v);if(typeof root.__LIB_CLEAN_AUTOMATIC_PLOT==='function'){try{p=clean(root.__LIB_CLEAN_AUTOMATIC_PLOT(p,{author:i.author,title:i.title})||p)}catch(e){}}return p};
let manual=false,lastCode='',inflight=false,lastTry=0,tries=0;
function noise(v){const n=norm(v);return /\b(?:per quanto riguarda la pubblicita|terze parti selezionate|dati di geolocalizzazione precisi|scansione attiva delle caratteristiche del dispositivo|archiviare e o accedere a informazioni su un dispositivo|annunci e contenuti personalizzati|osservazioni del pubblico|consenso cookie|cookie policy|privacy policy|gestisci le preferenze)\b/i.test(n)}
function input(){return{code:code($('editCode')?.value||''),title:clean($('editTitle')?.value||''),author:clean($('editAuthor')?.value||''),publisher:clean($('editPublisher')?.value||''),saga:clean($('editSaga')?.value||'')}}
function publish(extra={}){const i=input();root.__LIB_PUBLISHER_PLOT_LOCK_STATE__={active:!!$('editDialog')?.open,code:i.code,title:i.title,author:i.author,publisher:i.publisher,pending:!!inflight,settled:false,complete:false,manual,exhausted:false,tries,reason:'waiting',at:Date.now(),...extra};return root.__LIB_PUBLISHER_PLOT_LOCK_STATE__}
function validPlot(v){const p=sanitizePlot(v,input());return p.length>=60&&!noise(p)}
async function enforce(force=false){
  const dlg=$('editDialog'),ta=$('editPlot'),i=input(),official=getOfficial();
  if(!dlg?.open||!ta||!/^97[89]\d{10}$/.test(i.code)||!i.title||!i.author||!i.publisher){publish({settled:false,reason:'waiting-input'});return}
  if(manual){publish({pending:false,settled:true,complete:!!clean(ta.value),manual:true,reason:'manual'});return}
  if(inflight)return;
  if(!official){publish({pending:false,settled:false,complete:false,reason:'waiting-resolver'});return}
  const now=Date.now();if(!force&&now-lastTry<3200)return;lastTry=now;tries++;inflight=true;publish({pending:true,settled:false,complete:false,reason:'fetching'});
  let p='';try{p=sanitizePlot(await official(i)||'',i)}catch(e){root.__LIB_PUBLISHER_PLOT_LOCK_ERROR__=String(e&&e.message||e)}finally{inflight=false}
  if(manual){publish({pending:false,settled:true,complete:!!clean(ta.value),manual:true,reason:'manual'});return}
  if(p.length>=60&&!noise(p)){
    if(norm(ta.value)!==norm(p)){ta.value=p;ta.dispatchEvent(new Event('input',{bubbles:true}));ta.dispatchEvent(new Event('change',{bubbles:true}))}
    const st=$('lookupStatus');if(st){st.textContent='Trama recuperata dal sito ufficiale '+i.publisher+'.';st.className='lookup-status ok'}
    publish({pending:false,settled:true,complete:true,exhausted:false,reason:'official',length:p.length});return;
  }
  if(noise(ta.value)){ta.value='';ta.dispatchEvent(new Event('input',{bubbles:true}))}
  const exhausted=tries>=12;publish({pending:false,settled:exhausted,complete:false,exhausted,reason:exhausted?'not-found':'retry'});
}
function boot(){const c=$('editCode'),ta=$('editPlot'),dlg=$('editDialog');if(!c||!ta||!dlg){setTimeout(boot,150);return}c.addEventListener('input',e=>{if(e.isTrusted){manual=false;lastCode=code(c.value);lastTry=0;tries=0;publish({reason:'code-change'})}});ta.addEventListener('input',e=>{if(e.isTrusted){manual=true;publish({pending:false,settled:true,complete:!!clean(ta.value),manual:true,reason:'manual'})}});new MutationObserver(()=>{if(dlg.open){manual=false;lastTry=0;tries=0;publish({reason:'dialog-open'});setTimeout(()=>enforce(true),350)}else publish({active:false,pending:false,settled:true,complete:false,reason:'dialog-closed'})}).observe(dlg,{attributes:true,attributeFilter:['open']});setInterval(()=>{const now=code(c.value);if(now!==lastCode){lastCode=now;manual=false;lastTry=0;tries=0;publish({reason:'code-change'})}enforce(false)},900);setTimeout(()=>enforce(true),600)}
boot();root.__LIB_PLOT_SOURCE_POLICY='publisher-first-official-retry-lock-v9-sanitized';root.__LIB_PUBLISHER_PLOT_LOCK_V8_TEST__={noise,enforce,getOfficial,sanitizePlot,validPlot,publish};
})();
