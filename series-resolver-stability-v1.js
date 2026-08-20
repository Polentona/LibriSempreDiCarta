(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_RESOLVER_STABILITY_V1)return;root.__LIB_SERIES_RESOLVER_STABILITY_V1=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const bestCache=new Map(),inflight=new Map(),seedSaga=new Map(),retryAfter=new Map();
function keyOf(i={}){return[code(i.code),norm(i.title),norm(i.author)].join('|')}
function shape(r){if(!r?.authoritative||!clean(r.saga))return false;if(r.initial&&r.terminal)return true;if(r.initial)return !!clean(r.sequel);if(r.terminal)return !!clean(r.prequel);return !!clean(r.prequel)&&!!clean(r.sequel)}
function localized(r){if(!shape(r)||r.localizationPending===true)return false;if(clean(r.prequel)&&r.localizedPrequel!==true)return false;if(clean(r.sequel)&&r.localizedSequel!==true)return false;return true}
function merge(a,b){
  if(!a)return b||null;if(!b)return a;
  const preNew=clean(b.prequel),seqNew=clean(b.sequel),preOld=clean(a.prequel),seqOld=clean(a.sequel);
  const keepPre=preOld&&a.localizedPrequel===true&&b.localizedPrequel!==true;
  const keepSeq=seqOld&&a.localizedSequel===true&&b.localizedSequel!==true;
  return {...a,...b,
    saga:clean(b.saga)||clean(a.saga),
    prequel:keepPre?preOld:(preNew||preOld),sequel:keepSeq?seqOld:(seqNew||seqOld),
    localizedPrequel:!!(a.localizedPrequel||b.localizedPrequel),localizedSequel:!!(a.localizedSequel||b.localizedSequel),
    localizationPending:!((a.localizedPrequel||b.localizedPrequel||!(preNew||preOld))&&(a.localizedSequel||b.localizedSequel||!(seqNew||seqOld)))&&!!(a.localizationPending||b.localizationPending),
    authoritative:!!(a.authoritative||b.authoritative),verified:!!(a.verified||b.verified),checked:!!(a.checked||b.checked),
    initial:!!(a.initial||b.initial),terminal:!!(a.terminal||b.terminal)
  }
}
function install(){
  if(root.__LIB_SERIES_RESOLVER_STABILITY_V1_INSTALLED)return true;
  if(!root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8||typeof root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS!=='function')return false;
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;
  if(base.__stableResolverV1)return true;
  const wrapped=async input=>{
    input=input||{};const key=keyOf(input);if(!seedSaga.has(key))seedSaga.set(key,clean(input.saga));
    let best=bestCache.get(key)||null;if(localized(best))return best;
    const running=inflight.get(key);if(running)return merge(best,await running);
    if(best&&Date.now()<(retryAfter.get(key)||0))return best;
    const callInput={...input,saga:seedSaga.get(key)||''};
    const task=Promise.resolve(base(callInput)).then(r=>{
      const out=merge(best,r);if(out&&(out.authoritative||out.saga||out.prequel||out.sequel))bestCache.set(key,out);
      if(!localized(out))retryAfter.set(key,Date.now()+2600);else retryAfter.delete(key);
      return out;
    }).catch(()=>{retryAfter.set(key,Date.now()+2600);return best}).finally(()=>inflight.delete(key));
    inflight.set(key,task);return await task
  };
  wrapped.__stableResolverV1=true;
  for(const n of ['__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS','__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS','__LIB_RESOLVE_SERIES_NEIGHBORS','__LIB_FIND_RELATIONS','__LIB_RESOLVE_UNIVERSAL_SERIES','__LIB_RESOLVE_BOUNDED_RELATIONS'])root[n]=wrapped;
  root.__LIB_SERIES_RESOLVER_STABILITY_V1_INSTALLED=true;return true
}
(function start(n=0){if(install())return;if(n<120)setTimeout(()=>start(n+1),100)})();
root.__LIB_SERIES_RESOLVER_STABILITY_V1_TEST__={keyOf,shape,localized,merge,install,bestCache};
})();
