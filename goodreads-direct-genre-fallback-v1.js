(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_DIRECT_GENRE_FALLBACK_V1)return;
root.__LIB_GOODREADS_DIRECT_GENRE_FALLBACK_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const cache=new Map(),textCache=new Map();
const MAP={
  'adventure':'Avventura','crime':'Crime','mystery':'Giallo','thriller':'Thriller','mystery thriller':'Thriller',
  'suspense':'Suspense','fiction':'Narrativa','historical fiction':'Storico','history':'Storia','historical':'Storico',
  'horror':'Horror','fantasy':'Fantasy','science fiction':'Fantascienza','romance':'Narrativa rosa/sentimentale',
  'young adult':'Narrativa per giovani adulti','middle grade':'Narrativa per ragazzi','classics':'Classici',
  'literary fiction':'Narrativa letteraria','contemporary':'Narrativa contemporanea','short stories':'Racconti',
  'true crime':'Crimini reali','psychological thriller':'Thriller psicologico','historical mystery':'Giallo storico',
  'cozy mystery':'Giallo cozy','urban fantasy':'Fantasy urbano','gothic':'Gotico','noir':'Noir','war':'Guerra'
};
const PRIORITY=['Crime','Giallo','Thriller','Thriller psicologico','Giallo storico','Giallo cozy','Suspense','Horror','Fantasy','Fantasy urbano','Fantascienza','Storico','Avventura','Narrativa letteraria','Narrativa contemporanea','Narrativa rosa/sentimentale','Classici','Crimini reali','Noir','Narrativa'];
function decodeHtml(v){
  if(typeof document!=='undefined'){const t=document.createElement('textarea');t.innerHTML=String(v||'');return clean(t.value.replace(/<[^>]+>/g,' '))}
  return clean(String(v||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'"))
}
function mapGenres(labels){
  const out=[];for(const raw of uniq(labels)){const k=norm(raw);if(k==='audiobook'||k==='literature'||k==='nonfiction'||k==='non fiction')continue;const v=MAP[k];if(v)out.push(v)}
  return uniq(out).sort((a,b)=>{const ia=PRIORITY.indexOf(a),ib=PRIORITY.indexOf(b);return(ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,'it')})
}
function parseGenres(raw){
  const s=String(raw||''),labels=[];let m;
  const md=/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/(?:genres|shelf\/show)\/[^)\s]+\)/gi;
  while((m=md.exec(s)))labels.push(clean(m[1]));
  const html=/<a\b[^>]*href=["'][^"']*\/(?:genres|shelf\/show)\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;
  while((m=html.exec(s)))labels.push(decodeHtml(m[1]));
  const json=/["'](?:name|label)["']\s*:\s*["']([^"']{2,80})["'][\s\S]{0,260}?["'](?:webUrl|url)["']\s*:\s*["'][^"']*\/(?:genres|shelf\/show)\//gi;
  while((m=json.exec(s)))labels.push(clean(m[1]));
  if(!labels.length){
    const compact=decodeHtml(s),g=compact.match(/\bGenres?\b\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ +&'\/-]{2,500}?)(?:\bCommunity Reviews?\b|\bReaders also enjoyed\b|\bAbout the author\b|$)/i);
    if(g){const n=norm(g[1]);for(const k of Object.keys(MAP).sort((a,b)=>b.length-a.length)){const re=new RegExp(`(?:^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'i');if(re.test(n))labels.push(k)}}
  }
  return mapGenres(labels)
}
async function fetchText(url,timeout=12000){
  if(textCache.has(url))return await textCache.get(url);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/html,text/plain,*/*'},cache:'no-store'});if(!r.ok)return'';const x=await r.text();return x&&x.length>300?x:''}catch(e){return''}finally{clearTimeout(t)}})();
  textCache.set(url,p);return await p
}
async function reader(target){
  const routes=[
    'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
    'https://corsproxy.io/?url='+encodeURIComponent(target),
    'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(target),
    'https://r.jina.ai/'+target,
    'https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://')
  ];
  for(const url of routes){const raw=await fetchText(url);if(raw&&parseGenres(raw).length)return{raw,url}}
  return null
}
async function resolveDirect(input={}){
  const key=isbn(input.code);if(!key)return null;if(cache.has(key))return await cache.get(key);
  const task=(async()=>{
    const target='https://www.goodreads.com/book/isbn/'+encodeURIComponent(key),got=await reader(target);if(!got)return null;
    const genres=parseGenres(got.raw);if(!genres.length)return null;
    const result={found:true,reachable:true,genres,labels:genres,url:target,source:'goodreads',method:'goodreads-isbn-proxy-html-v1'};
    root.__LIB_GOODREADS_DIRECT_GENRE_LAST__={input:{code:key,title:clean(input.title),author:clean(input.author)},result,route:got.url,at:Date.now()};
    return result
  })();cache.set(key,task);return await task
}
function install(){
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;if(typeof base!=='function'||!root.__LIB_GOODREADS_PRIMARY_DETAILS_INSTALLED_V3)return false;
  if(base.__goodreadsDirectGenreFallbackV1)return true;
  const wrapped=async input=>{
    const direct=await resolveDirect(input).catch(()=>null);if(direct?.found&&direct.genres?.length)return direct;
    return await Promise.resolve(base(input)).catch(()=>null)
  };
  wrapped.__goodreadsDirectGenreFallbackV1=true;
  root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=wrapped;
  root.__LIB_LOOKUP_SPECIFIC_GENRES=async input=>(await wrapped(input||{}))?.genres||[];
  root.__LIB_GENRE_SOURCE_POLICY='goodreads-direct-isbn-then-goodreads-primary-then-storygraph-v1';
  return true
}
(function boot(n=0){if(install())return;if(n<600)setTimeout(()=>boot(n+1),100)})();
root.__LIB_GOODREADS_DIRECT_GENRE_TEST__={parseGenres,mapGenres,resolveDirect};
})();
