(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_SINGLE_OWNER_GUARD_V1)return;root.__LIB_SERIES_SINGLE_OWNER_GUARD_V1=true;
function enforce(){
  const base=root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS;
  if(typeof base!=='function'||!root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4)return false;
  /* I vecchi wrapper controllano questi marker prima di agganciarsi. */
  base.__directV7=true;
  base.__wikiAuthoritativeV3=true;
  base.__googleSeriesV10=true;
  base.__verifiedSeriesV1=true;
  base.__verifiedSeriesV2=true;
  base.__verifiedSeriesSagaV3=true;
  for(const name of ['__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS','__LIB_RESOLVE_SERIES_NEIGHBORS','__LIB_FIND_RELATIONS','__LIB_RESOLVE_UNIVERSAL_SERIES','__LIB_RESOLVE_BOUNDED_RELATIONS'])root[name]=base;
  root.__LIB_SERIES_RELATION_POLICY='single-owner-structured-book-then-ordered-series-v4';
  return true;
}
let n=0;const t=setInterval(()=>{n++;enforce();if(n>=140)clearInterval(t)},100);setTimeout(enforce,0);
root.__LIB_SERIES_SINGLE_OWNER_ENFORCE=enforce;
})();
