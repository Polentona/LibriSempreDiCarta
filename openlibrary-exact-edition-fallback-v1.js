(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_OPENLIBRARY_EXACT_EDITION_FALLBACK_V1)return;
root.__LIB_OPENLIBRARY_EXACT_EDITION_FALLBACK_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const cache=new Map();
function yearOf(v){const m=clean(v).match(/\b((?:18|19|20)\d{2})\b/);return m?m[1]:''}
function firstText(v){if(Array.isArray(v))return clean(v.find(Boolean)||'');return clean(v)}
function coverUrl(id){id=Number(id);return Number.isInteger(id)&&id>0?`https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`:''}
async function exactEdition(code){
  const key=isbn(code);if(!key)return null;if(cache.has(key))return await cache.get(key);
  const p=(async()=>{
    const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);
    try{
      const r=await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(key)}.json`,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});
      if(!r.ok)return null;const d=await r.json();
      const ids=[...(d.isbn_13||[]),...(d.isbn_10||[])].map(isbn).filter(Boolean);
      if(ids.length&&!ids.includes(key))return null;
      const publisher=firstText(d.publishers),published=yearOf(d.publish_date),cover=coverUrl((d.covers||[])[0]);
      const out={code:key,title:clean(d.title||''),publisher,published,cover,openLibraryKey:clean(d.key||''),source:'openlibrary-exact-isbn'};
      return out.title||out.publisher||out.published||out.cover?out:null
    }catch(e){root.__LIB_OPENLIBRARY_EXACT_EDITION_ERROR__=String(e&&e.message||e);return null}
    finally{clearTimeout(t)}
  })();cache.set(key,p);return await p
}
function install(){
  const api=root.__LIB_GOODREADS_PRIMARY_METADATA_TEST__;if(!api?.resolveAll||!root.__LIB_GOODREADS_PRIMARY_DETAILS_INSTALLED_V3)return false;
  const base=api.resolveAll;if(base.__openLibraryExactEditionFallbackV1)return true;
  const wrapped=async input=>{
    const r=await Promise.resolve(base(input)).catch(()=>null),ed=await exactEdition(input?.code).catch(()=>null);
    if(!ed)return r;
    const out={...(r||{}),exactEditionFallback:ed};
    if(ed.title&&!clean(out.title))out.title=ed.title;
    if(ed.publisher)out.publisher=ed.publisher;
    if(ed.published)out.published=ed.published;
    if(ed.cover)out.cover=ed.cover;
    root.__LIB_OPENLIBRARY_EXACT_EDITION_LAST__={input:{code:isbn(input?.code),title:clean(input?.title),author:clean(input?.author)},edition:ed,result:{publisher:out.publisher||'',published:out.published||'',cover:out.cover||''},at:Date.now()};
    return out
  };
  wrapped.__openLibraryExactEditionFallbackV1=true;
  api.resolveAll=wrapped;
  root.__LIB_METADATA_EDITION_POLICY='exact-isbn-edition-before-generic-cover-v1';
  return true
}
(function boot(n=0){if(install())return;if(n<600)setTimeout(()=>boot(n+1),100)})();
root.__LIB_OPENLIBRARY_EXACT_EDITION_TEST__={exactEdition,yearOf,coverUrl};
})();
