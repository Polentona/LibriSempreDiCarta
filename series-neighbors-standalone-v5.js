(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V11)return;root.__LIB_SERIES_NEIGHBORS_STANDALONE_V11=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').trim();
function safeSaga(v,title=''){let x=clean(v).replace(/^["“”«»']+|["“”«»']+$/g,'');const n=norm(x);if(!x||x.length>100||n===norm(title)||/(?:18|19|20)\d{2}|https?:|www\.|\.{2,}|…/.test(x)||/\b(?:iniziat[ao]|seguit[oa]|precedut[oa]|pubblicat[oa]|romanzo|libro|volume|capitolo|autore|editore|isbn|ean|film|cinema)\b/i.test(n))return'';return x.replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy)\s+(?:di\s+|of\s+)?/i,'').trim()}
function safeBook(v,title=''){let x=clean(v).replace(/^["“”«»']+|["“”«»']+$/g,'').replace(/[.;:\s]+$/,'');const n=norm(x);if(!x||x.length>190||n===norm(title)||/https?:|www\.|\.{2,}|…|[{}<>]/.test(x)||/\b(?:isbn|ean|editore|publisher|autore|author|followed by|preceded by|iniziat[ao] con|seguit[oa] da|pubblicat[oa] nel)\b/i.test(n)||/\b(?:she|he|they|we|you)\s+(?:is|are|was|were|has|have|had|got|will|would|can|could)\b/i.test(n))return'';return x}
root.__LIB_RESOLVE_SERIES_NEIGHBORS=async function(input={}){if(typeof root.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'){const r=await root.__LIB_RESOLVE_UNIVERSAL_SERIES(input).catch(()=>null);if(r)return {...r,saga:safeSaga(r.saga,input.title),prequel:safeBook(r.prequel,input.title),sequel:safeBook(r.sequel,input.title),checked:true}}return{saga:safeSaga(input.saga,input.title),prequel:'',sequel:'',authoritative:false,checked:false,source:''}};
function loadOnce(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
loadOnce('libIsbnMetadataRescueV1','isbn-metadata-rescue-v1.js?v=20260819-1');
loadOnce('libGenresMultiV6','genres-multi-v1.js?v=20260819-6');
loadOnce('libGenreDelegateV6','goodreads-genres-v1.js?v=20260819-6');
root.__LIB_SERIES_NEIGHBORS_V11_TEST__={safeSaga,safeBook};
})();
