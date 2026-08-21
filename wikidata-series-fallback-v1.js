(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_WIKIDATA_SERIES_FALLBACK_V1)return;
root.__LIB_WIKIDATA_SERIES_FALLBACK_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cache=new Map(),apiCache=new Map();

function titleCore(v){
  return clean(v).replace(/\s*\((?:romanzo|novel|libro|book|film|serie televisiva|tv series)\)\s*$/i,'').trim()
}
function sameTitle(a,b){
  const x=norm(titleCore(a)),y=norm(titleCore(b));
  return !!x&&!!y&&(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))
}
function cleanSaga(v){
  return clean(v).replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di\s+|of\s+)?/i,'').replace(/\s+(?:series|serie|saga|trilogy|trilogia|cycle|ciclo)\s*$/i,'').trim()
}
function relationComplete(r){
  if(!r?.authoritative||!clean(r.saga))return false;
  const pre=clean(r.prequel),seq=clean(r.sequel);
  if(r.initial&&r.terminal)return true;
  if(r.initial)return !!seq;
  if(r.terminal)return !!pre;
  return !!pre&&!!seq
}
function qidFromSnak(s){
  const v=s?.mainsnak?.datavalue?.value;
  return v&&typeof v==='object'&&/^Q\d+$/.test(v.id||'')?v.id:''
}
function ordinalFromStatement(s){
  const v=s?.qualifiers?.P1545?.[0]?.datavalue?.value;
  const n=Number(String(v??'').replace(',','.'));
  return Number.isFinite(n)?n:NaN
}
function claimIds(entity,prop){
  const out=[];
  for(const s of entity?.claims?.[prop]||[]){const id=qidFromSnak(s);if(id&&!out.includes(id))out.push(id)}
  return out
}
function displayTitle(entity){
  const it=clean(entity?.labels?.it?.value||'');if(it)return{title:it,localized:true,via:'label-it'};
  const sit=clean(entity?.sitelinks?.itwiki?.title||'');if(sit)return{title:titleCore(sit),localized:true,via:'itwiki'};
  const en=clean(entity?.labels?.en?.value||'');if(en)return{title:en,localized:false,via:'label-en'};
  const sen=clean(entity?.sitelinks?.enwiki?.title||'');if(sen)return{title:titleCore(sen),localized:false,via:'enwiki'};
  return{title:'',localized:false,via:''}
}
function allTitles(entity){
  return [entity?.labels?.it?.value,entity?.sitelinks?.itwiki?.title,entity?.labels?.en?.value,entity?.sitelinks?.enwiki?.title].map(titleCore).filter(Boolean)
}
async function fetchJson(url,timeout=9000){
  if(apiCache.has(url))return await apiCache.get(url);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(t)}})();
  apiCache.set(url,p);return await p
}
async function wdApi(params={}){
  const u=new URL('https://www.wikidata.org/w/api.php');
  const all={format:'json',origin:'*',...params};
  for(const [k,v] of Object.entries(all))if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));
  return await fetchJson(u.href)
}
async function entities(ids=[]){
  const uniq=[...new Set(ids.filter(x=>/^Q\d+$/.test(String(x||''))))];if(!uniq.length)return{};
  const out={};
  for(let i=0;i<uniq.length;i+=40){
    const data=await wdApi({action:'wbgetentities',ids:uniq.slice(i,i+40).join('|'),props:'claims|labels|sitelinks',languages:'it|en',languagefallback:1});
    Object.assign(out,data?.entities||{})
  }
  return out
}
async function authorMatches(entity,author){
  const wanted=norm(author),ids=claimIds(entity,'P50');if(!wanted||!ids.length)return false;
  const map=await entities(ids);
  for(const id of ids){
    const e=map[id];
    const names=[e?.labels?.it?.value,e?.labels?.en?.value,e?.sitelinks?.itwiki?.title,e?.sitelinks?.enwiki?.title].map(norm).filter(Boolean);
    if(names.some(x=>x===wanted||(x.length>=5&&wanted.includes(x))||(wanted.length>=5&&x.includes(wanted))))return true
  }
  return false
}
function seriesMeta(entity){
  const ss=entity?.claims?.P179||[];
  let fallback=null;
  for(const s of ss){
    const series=qidFromSnak(s);if(!series)continue;
    const position=ordinalFromStatement(s),m={series,position};
    if(Number.isFinite(position))return m;
    fallback=fallback||m
  }
  return fallback
}
async function searchWork(input={}){
  const title=clean(input.title),author=clean(input.author);if(!title||!author)return null;
  const ids=[];
  for(const language of ['it','en'])for(const query of [`${title} ${author}`,title]){
    const data=await wdApi({action:'wbsearchentities',search:query,language,uselang:'it',type:'item',limit:12});
    for(const r of data?.search||[]){if(/^Q\d+$/.test(r.id||'')&&!ids.includes(r.id))ids.push(r.id)}
    if(ids.length>=18)break
  }
  const map=await entities(ids);
  for(const id of ids){
    const e=map[id];if(!e||!allTitles(e).some(x=>sameTitle(x,title)))continue;
    if(!await authorMatches(e,author))continue;
    const sm=seriesMeta(e);if(sm?.series)return{id,entity:e,...sm}
  }
  return null
}
function seriesParts(seriesEntity){
  const out=[];
  for(const s of seriesEntity?.claims?.P527||[]){
    const id=qidFromSnak(s),position=ordinalFromStatement(s);
    if(id&&Number.isFinite(position))out.push({id,position})
  }
  return out.sort((a,b)=>a.position-b.position)
}
async function resolveWikidata(input={}){
  const key=[norm(input.title),norm(input.author)].join('|');if(!key.replace(/\|/g,''))return null;
  if(cache.has(key))return await cache.get(key);
  const task=(async()=>{
    const work=await searchWork(input);if(!work)return null;
    const seriesMap=await entities([work.series]),seriesEntity=seriesMap[work.series];if(!seriesEntity)return null;
    let position=work.position;
    const parts=seriesParts(seriesEntity);
    if(!Number.isFinite(position)){const own=parts.find(x=>x.id===work.id);position=own?.position}
    if(!Number.isFinite(position))return null;
    let preId=claimIds(work.entity,'P155')[0]||'',seqId=claimIds(work.entity,'P156')[0]||'';
    const ordered=parts.filter(x=>Number.isFinite(x.position));
    if(!preId)preId=ordered.filter(x=>x.position<position).at(-1)?.id||'';
    if(!seqId)seqId=ordered.find(x=>x.position>position)?.id||'';
    const positions=ordered.map(x=>x.position),min=positions.length?Math.min(...positions):position,max=positions.length?Math.max(...positions):position;
    const initial=!preId&&position===min,terminal=!seqId&&position===max;
    if(!initial&&!preId)return null;if(!terminal&&!seqId)return null;
    const neighbors=await entities([preId,seqId]),pre=preId?displayTitle(neighbors[preId]):{title:'',localized:true},seq=seqId?displayTitle(neighbors[seqId]):{title:'',localized:true};
    if(preId&&(!pre.title||!pre.localized))return null;
    if(seqId&&(!seq.title||!seq.localized))return null;
    const seriesTitle=displayTitle(seriesEntity),saga=cleanSaga(seriesTitle.title||'');if(!saga)return null;
    const result={saga,prequel:pre.title||'',sequel:seq.title||'',position,initial,terminal,authoritative:true,verified:true,checked:true,source:'wikidata',url:`https://www.wikidata.org/wiki/${work.id}`,seriesUrl:`https://www.wikidata.org/wiki/${work.series}`,method:'wikidata-series-claims-v1',localizedPrequel:!preId||pre.localized,localizedSequel:!seqId||seq.localized,localizationPending:false};
    root.__LIB_WIKIDATA_SERIES_LAST__={input:{title:clean(input.title),author:clean(input.author),code:clean(input.code)},work:work.id,series:work.series,result,at:Date.now()};
    return relationComplete(result)?result:null
  })();
  cache.set(key,task);return await task
}
function install(){
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;if(typeof base!=='function')return false;
  if(base.__wikidataSeriesFallbackV1)return true;
  if(!base.__italianRetailerSeriesFallbackV1)return false;
  const wrapped=async input=>{
    const basePromise=Promise.resolve(base(input)).catch(()=>null),timeout={timeout:true};
    const quick=await Promise.race([basePromise,wait(9000).then(()=>timeout)]);
    if(quick!==timeout&&relationComplete(quick))return quick;
    const wd=await resolveWikidata(input).catch(e=>{root.__LIB_WIKIDATA_SERIES_ERROR__=String(e&&e.message||e);return null});
    if(relationComplete(wd))return wd;
    return quick===timeout?await basePromise:quick
  };
  wrapped.__wikidataSeriesFallbackV1=true;
  wrapped.__italianRetailerSeriesFallbackV1=true;
  root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=wrapped;
  root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=wrapped;
  root.__LIB_RESOLVE_SERIES_NEIGHBORS=wrapped;
  root.__LIB_FIND_RELATIONS=wrapped;
  root.__LIB_RESOLVE_UNIVERSAL_SERIES=wrapped;
  root.__LIB_RESOLVE_BOUNDED_RELATIONS=wrapped;
  root.__LIB_SERIES_RELATION_POLICY='goodreads-primary-then-italian-retailer-then-wikidata-v1';
  return true
}
(function boot(n=0){if(install())return;if(n<600)setTimeout(()=>boot(n+1),100)})();
root.__LIB_WIKIDATA_SERIES_FALLBACK_TEST__={resolveWikidata,searchWork,seriesParts,relationComplete,displayTitle,cleanSaga};
})();
