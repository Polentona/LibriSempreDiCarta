(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_ITALIAN_RETAILER_SERIES_FALLBACK_V1)return;
root.__LIB_ITALIAN_RETAILER_SERIES_FALLBACK_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cache=new Map(),textCache=new Map();

function absolute(u,base='https://www.lafeltrinelli.it/'){
  u=clean(u).replace(/&amp;/g,'&');if(!u)return'';
  try{return new URL(u,base).href}catch(e){return''}
}
function htmlDoc(raw){
  if(typeof DOMParser==='undefined'||!/<(?:html|body|div|a|main|section)\b/i.test(String(raw||'')))return null;
  try{return new DOMParser().parseFromString(String(raw||''),'text/html')}catch(e){return null}
}
function plainText(raw){
  const d=htmlDoc(raw);if(d?.body)return clean(d.body.textContent||'');
  return clean(String(raw||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]+>/g,' '));
}
async function fetchText(url,timeout=11000){
  if(textCache.has(url))return await textCache.get(url);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});if(!r.ok)return'';const x=await r.text();return x&&x.length>180?x:''}catch(e){return''}finally{clearTimeout(t)}})();
  textCache.set(url,p);return await p
}
async function reader(target){
  const routes=[
    'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
    'https://corsproxy.io/?url='+encodeURIComponent(target),
    'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(target),
    'https://r.jina.ai/'+target
  ];
  for(const u of routes){const raw=await fetchText(u);if(raw)return raw}
  return''
}
function seriesUrlFromRaw(raw,base){
  const d=htmlDoc(raw);if(d){for(const a of d.querySelectorAll('a[href*="/serie/"]')){const u=absolute(a.getAttribute('href'),base);if(/lafeltrinelli\.it\/serie\//i.test(u))return u}}
  const m=String(raw||'').match(/(?:href=["']|\]\()([^"')\s>]*lafeltrinelli\.it\/serie\/[^"')\s>]+)/i)||String(raw||'').match(/(?:href=["']|\]\()([^"')\s>]*\/serie\/[^"')\s>]+)/i);
  return m?absolute(m[1],base):''
}
function cleanSaga(v){
  return clean(v).replace(/^serie\s*(?:di|del|della|dei|degli|delle)?\s*/i,'').replace(/^saga\s*(?:di|del|della|dei|degli|delle)?\s*/i,'').replace(/\s+n\.?\s*\d+(?:\.\d+)?\s*$/i,'').trim()
}
function productSeries(raw,base){
  const d=htmlDoc(raw);let label='',position=NaN,url='';
  if(d){
    for(const a of d.querySelectorAll('a[href*="/serie/"]')){
      const candidate=clean(a.textContent||'');if(!candidate)continue;
      let node=a,around='';
      for(let i=0;i<6&&node;i++,node=node.parentElement){around=clean(node.textContent||'');if(/\b(?:n\.?|vol\.?)\s*\d+/i.test(around))break}
      const pm=around.match(/\b(?:n\.?|vol\.?)\s*(\d+)\b/i);
      if(pm){label=candidate;position=Number(pm[1]);url=absolute(a.getAttribute('href'),base);break}
      if(!label){label=candidate;url=absolute(a.getAttribute('href'),base)}
    }
  }
  const text=plainText(raw);
  if(!Number.isInteger(position)){
    const m=text.match(/\bSerie\s*:?\s*(.{2,100}?)\s+(?:n\.?|vol\.?)\s*(\d+)\b/i);
    if(m){label=label||clean(m[1]);position=Number(m[2])}
  }
  url=url||seriesUrlFromRaw(raw,base);
  return{saga:cleanSaga(label),label:clean(label),position,url}
}
function productUrlFromRaw(raw,targetIsbn,base='https://www.lafeltrinelli.it/'){
  const key=isbn(targetIsbn),d=htmlDoc(raw);
  if(d){for(const a of d.querySelectorAll('a[href*="/e/"]')){const u=absolute(a.getAttribute('href'),base);if(u&&u.includes(key))return u}}
  const re=/https?:\/\/(?:www\.)?lafeltrinelli\.it\/[^\s"'<>)]*\/e\/(97[89]\d{10}|\d{9}[\dXx])/gi;let m;
  while((m=re.exec(String(raw||'')))){if(isbn(m[1])===key)return absolute(m[0],base)}
  return''
}
function validTitle(v){const x=clean(v),n=norm(x);return !!x&&x.length<=180&&!/^(?:libri|serie|tutti i risultati|feltrinelli|aggiungi al carrello|disponibilita|recensioni)$/i.test(n)}
function seriesEntries(raw,base){
  const byPos=new Map(),d=htmlDoc(raw);
  const add=(p,title,url='')=>{p=Number(p);title=clean(title);if(!Number.isInteger(p)||p<1||!validTitle(title))return;const prev=byPos.get(p);if(!prev||prev.title.length>title.length)byPos.set(p,{position:p,title,url:absolute(url,base)})};
  if(d){
    for(const a of d.querySelectorAll('a[href*="/e/"]')){
      const title=clean(a.textContent||'');if(!validTitle(title))continue;let node=a,around='';
      for(let i=0;i<7&&node;i++,node=node.parentElement){around=clean(node.textContent||'');if(/\bVol\.?\s*\d+\b/i.test(around))break}
      const m=around.match(/\bVol\.?\s*(\d+)\b/i);if(m)add(m[1],title,a.getAttribute('href'))
    }
  }
  const lines=String(raw||'').split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const hm=lines[i].match(/^\s*#{1,4}\s+(.+?)\s*$/);if(!hm)continue;
    const title=clean(hm[1].replace(/\[([^\]]+)\]\([^)]*\)/g,'$1'));if(!validTitle(title))continue;
    for(let j=i+1;j<Math.min(lines.length,i+18);j++){
      if(j>i+1&&/^\s*#{1,4}\s+/.test(lines[j]))break;
      const vm=clean(lines[j].replace(/[*_`#]/g,' ')).match(/^Vol\.?\s*(\d+)\b/i);if(vm){add(vm[1],title);break}
    }
  }
  return [...byPos.values()].sort((a,b)=>a.position-b.position)
}
function relationComplete(r){
  if(!r?.authoritative||!clean(r.saga))return false;const pre=clean(r.prequel),seq=clean(r.sequel);if(r.initial&&r.terminal)return true;if(r.initial)return !!seq;if(r.terminal)return !!pre;return !!pre&&!!seq
}
async function resolveRetailer(input={}){
  const key=isbn(input.code);if(!key)return null;if(cache.has(key))return await cache.get(key);
  const task=(async()=>{
    let productUrl='',searchRaw='';
    const searchUrl='https://www.lafeltrinelli.it/search?query='+encodeURIComponent(key);
    searchRaw=await reader(searchUrl);if(searchRaw)productUrl=productUrlFromRaw(searchRaw,key,searchUrl);
    if(!productUrl&&typeof root.__LIB_DIRECT_CATALOG_ISBN_LOOKUP==='function'){
      const rec=await root.__LIB_DIRECT_CATALOG_ISBN_LOOKUP(key).catch(()=>null),u=clean(rec?.source||'');
      if(/lafeltrinelli\.it\//i.test(u)&&/\/e\//i.test(u))productUrl=u;
      else if(/lafeltrinelli\.it\//i.test(u)){const raw=await reader(u);productUrl=productUrlFromRaw(raw,key,u)}
    }
    if(!productUrl)return null;
    const productRaw=await reader(productUrl);if(!productRaw)return null;
    const sm=productSeries(productRaw,productUrl);if(!sm.saga||!Number.isInteger(sm.position)||sm.position<1)return null;
    let seriesUrl=sm.url;
    if(!seriesUrl&&sm.label){const slug=norm(sm.label).replace(/\s+/g,'-');if(slug)seriesUrl='https://www.lafeltrinelli.it/serie/'+slug}
    if(!seriesUrl)return null;
    const seriesRaw=await reader(seriesUrl);if(!seriesRaw)return null;
    const entries=seriesEntries(seriesRaw,seriesUrl),map=new Map(entries.map(x=>[x.position,x]));
    const current=map.get(sm.position),pre=map.get(sm.position-1),seq=map.get(sm.position+1);
    if(current&&input.title&&norm(current.title)!==norm(input.title)&&!norm(current.title).includes(norm(input.title))&&!norm(input.title).includes(norm(current.title)))return null;
    const positions=entries.map(x=>x.position),min=positions.length?Math.min(...positions):sm.position,max=positions.length?Math.max(...positions):sm.position;
    const initial=sm.position===1||sm.position===min&&!pre,terminal=sm.position===max&&!seq;
    if(sm.position>1&&!pre)return null;if(!seq&&!terminal)return null;
    const r={saga:sm.saga,prequel:clean(pre?.title||''),sequel:clean(seq?.title||''),position:sm.position,initial,terminal,authoritative:true,verified:true,checked:true,source:'lafeltrinelli',url:seriesUrl,method:'lafeltrinelli-series-order-v1',localizedPrequel:true,localizedSequel:true,localizationPending:false};
    return relationComplete(r)?r:null
  })();cache.set(key,task);return await task
}
function install(){
  if(!root.__LIB_GOODREADS_PRIMARY_DETAILS_INSTALLED_V3)return false;
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;if(typeof base!=='function')return false;
  if(base.__italianRetailerSeriesFallbackV1)return true;
  const wrapped=async input=>{
    const basePromise=Promise.resolve(base(input)).catch(()=>null),timeout={timeout:true};
    const quick=await Promise.race([basePromise,wait(6500).then(()=>timeout)]);
    if(quick!==timeout&&relationComplete(quick))return quick;
    const retail=await resolveRetailer(input).catch(()=>null);if(relationComplete(retail))return retail;
    return quick===timeout?await basePromise:quick
  };
  wrapped.__italianRetailerSeriesFallbackV1=true;
  root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=wrapped;
  root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=wrapped;
  root.__LIB_RESOLVE_SERIES_NEIGHBORS=wrapped;
  root.__LIB_FIND_RELATIONS=wrapped;
  root.__LIB_RESOLVE_UNIVERSAL_SERIES=wrapped;
  root.__LIB_RESOLVE_BOUNDED_RELATIONS=wrapped;
  root.__LIB_SERIES_RELATION_POLICY='goodreads-primary-then-italian-retailer-series-v1';
  return true
}
(function boot(n=0){if(install())return;if(n<600)setTimeout(()=>boot(n+1),100)})();
root.__LIB_ITALIAN_RETAILER_SERIES_FALLBACK_TEST__={productSeries,productUrlFromRaw,seriesEntries,resolveRetailer,relationComplete,cleanSaga};
})();
