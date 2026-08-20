(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_PUBLISHER_PLOT_RESILIENCE_V7)return;root.__LIB_PUBLISHER_PLOT_RESILIENCE_V7=true;
root.__LIB_PLOT_V7_DEPLOY_MARKER='20260820-all-fields';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const oldOfficial=typeof root.__LIB_RESOLVE_OFFICIAL_PLOT==='function'?root.__LIB_RESOLVE_OFFICIAL_PLOT:null;
const oldPriority=typeof root.__LIB_RESOLVE_PLOT_PRIORITY==='function'?root.__LIB_RESOLVE_PLOT_PRIORITY:null;
const cache=new Map(),attempts=new Map();
let manual=false,lastCode='';
function privacyNoise(v){const n=norm(v);return /\b(?:per quanto riguarda la pubblicita|terze parti selezionate|dati di geolocalizzazione precisi|scansione attiva delle caratteristiche del dispositivo|archiviare e o accedere a informazioni su un dispositivo|annunci e contenuti personalizzati|valutazione degli annunci|osservazioni del pubblico|sviluppo di prodotti|gestisci le preferenze|consenso cookie|cookie policy|privacy policy)\b/i.test(n)}
function otherNoise(v){const n=norm(v);return /\b(?:recensione|verified purchase|a mio parere|serie tv|adattamento cinematograf|netflix|prime video|aggiungi al carrello|newsletter|servizio clienti)\b/i.test(n)}
function strict(v){let x=clean(v);if(!x||x.length<60||privacyNoise(x))return'';if(otherNoise(x)){const parts=(x.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(clean).filter(p=>p&&!privacyNoise(p)&&!otherNoise(p));x=clean(parts.join(' '))}if(x.length<60)return'';if(x.length>2600)x=x.slice(0,2600).replace(/\s+\S*$/,'')+'…';return x}
function inputNow(){return{code:code($('editCode')?.value||''),title:clean($('editTitle')?.value||''),author:clean($('editAuthor')?.value||''),publisher:clean($('editPublisher')?.value||''),saga:clean($('editSaga')?.value||'')}}
function sig(i){return[i.code,norm(i.title),norm(i.author),norm(i.publisher),norm(i.saga)].join('|')}
async function official(input={}){const i={...input,code:code(input.code)};const k=sig(i);if(cache.has(k))return cache.get(k);if(!oldOfficial)return'';let p='';try{p=strict(await oldOfficial(i))}catch(e){}if(p)cache.set(k,p);return p}
root.__LIB_RESOLVE_OFFICIAL_PLOT=official;
root.__LIB_RESOLVE_PLOT_PRIORITY=async input=>{const p=await official(input||{});if(p)return p;if(oldPriority){try{const r=await oldPriority(input||{});return strict(r?.plot||r||'')}catch(e){}}return''};
root.__LIB_PLOT_SOURCE_POLICY='publisher-first-sperling-direct-v7-official-lock';
async function enforce(){
  const ta=$('editPlot'),dlg=$('editDialog'),i=inputNow();if(!ta||!dlg?.open||manual||!/^97[89]\d{10}$/.test(i.code)||!i.title||!i.author||!i.publisher)return;
  const k=sig(i),n=attempts.get(k)||0;let p=cache.get(k)||'';
  if(!p&&n<8){attempts.set(k,n+1);p=await official(i)}
  if(manual)return;
  if(p){
    if(norm(ta.value)!==norm(p)){ta.value=p;ta.dispatchEvent(new Event('input',{bubbles:true}));ta.dispatchEvent(new Event('change',{bubbles:true}))}
    attempts.set(k,99);
    const st=$('lookupStatus');if(st){st.textContent='Trama recuperata dal sito ufficiale '+i.publisher+'.';st.className='lookup-status ok'}
  }else if(privacyNoise(ta.value)){
    ta.value='';ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
}
function boot(){const c=$('editCode'),ta=$('editPlot'),dlg=$('editDialog');if(!c||!ta||!dlg){setTimeout(boot,150);return}
  c.addEventListener('input',e=>{if(e.isTrusted){manual=false;lastCode=code(c.value);attempts.clear()}});
  ta.addEventListener('input',e=>{if(e.isTrusted)manual=true});
  new MutationObserver(()=>{if(dlg.open){manual=false;attempts.clear();setTimeout(enforce,300)}}).observe(dlg,{attributes:true,attributeFilter:['open']});
  setInterval(()=>{const now=code(c.value);if(now!==lastCode){lastCode=now;manual=false;attempts.clear()}enforce()},1200);
  setTimeout(enforce,500)
}
boot();
root.__LIB_PUBLISHER_PLOT_RESILIENCE_V7_TEST__={privacyNoise,strict,cache};
})();
