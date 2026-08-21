(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_PRIMARY_DETAILS_V3)return;
root.__LIB_GOODREADS_PRIMARY_DETAILS_V3=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const v=clean(raw),k=norm(v);if(v&&k&&!seen.has(k)){seen.add(k);out.push(v)}}return out};
const cache=new Map(),pageCache=new Map();
let baseResolveAll=null,baseGenres=null,baseSeries=null,basePlot=null;

function api(){return root.__LIB_GOODREADS_PRIMARY_METADATA_TEST__||null}
function recovery(){return root.__LIB_GOODREADS_PRIMARY_RECOVERY_TEST__||null}
function cleanTitle(v){return api()?.cleanTitle?api().cleanTitle(v):clean(v).replace(/\s*[:|–—-]\s*(?:romanzo|novel|libro|book)\s*$/i,'').trim()}
function cleanPlot(v){return api()?.cleanPlot?api().cleanPlot(v):clean(v)}
function seriesMeta(raw,title=''){return api()?.parseSeriesMeta?api().parseSeriesMeta(raw,title):{saga:'',position:NaN}}
function goodreadsGenres(raw){return api()?.goodreadsGenres?api().goodreadsGenres(raw):[]}
function isItalian(v){return api()?.isItalian?api().isItalian(v):false}
function yearOf(v){const m=clean(v).match(/\b((?:18|19|20)\d{2})\b/);return m?m[1]:''}
function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·]+/g,' '))}
function goodreadsUrl(u){u=clean(u).replace(/[),.;]+$/,'');if(!u)return'';if(/^https?:\/\//i.test(u))return u;if(u.startsWith('/'))return 'https://www.goodreads.com'+u;return''}
function links(raw,kind='book'){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\(([^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){const label=cleanTitle(stripMd(m[1])),url=goodreadsUrl(m[2]);if(!url)continue;
    if(kind==='book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='editions'&&!/goodreads\.com\/(?:work\/editions|book\/editions)\//i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }
  return out
}
async function text(url,timeout=12000){
  const broker=root.__LIB_BROKER_TEXT;if(typeof broker==='function')return await broker(url,timeout);
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});return r.ok?await r.text():''}catch(e){return''}finally{clearTimeout(t)}
}
async function jina(target,timeout=12000){
  const key=String(target||'');if(pageCache.has(key))return pageCache.get(key);
  const p=(async()=>{for(const t of uniq([key,key.replace(/^https:\/\//i,'http://')])){const raw=await text('https://r.jina.ai/'+t,timeout);if(raw&&raw.length>80)return raw}return''})();
  pageCache.set(key,p);return await p
}
function parsePublisherDate(raw){
  const s=String(raw||'');let publisher='',published='';
  const pubBy=s.match(/(?:^|\n)\s*(?:Edition\s+)?Published\s+([^\n]{1,100}?)\s+by\s+([^\n]{2,140})/i);
  if(pubBy){published=yearOf(pubBy[1]);publisher=stripMd(pubBy[2]).replace(/\s*(?:\||·).*$/,'').trim()}
  if(!publisher){const m=s.match(/(?:^|\n)\s*Publisher\s*:?\s*([^\n]{2,140})/i);if(m)publisher=stripMd(m[1])}
  if(!published){const m=s.match(/(?:^|\n)\s*(?:Edition Pub Date|Publication Date|Published)\s*:?\s*([^\n]{2,120})/i);if(m)published=yearOf(m[1])}
  if(!published){const m=s.match(/\bFirst published\s+([^\n]{2,100})/i);if(m)published=yearOf(m[1])}
  publisher=clean(publisher).replace(/\s*(?:ISBN|ASIN|Format|Language)\s*:.*$/i,'').trim();
  return{publisher,published}
}
function pageLooksItalian(raw,description=''){
  return /\b(?:Traduttore|Traduttrice|Italian Edition|Edition language\s*:\s*Italian|Language\s*:\s*Italian|Lingua\s*:\s*Italiano)\b/i.test(String(raw||''))||isItalian(description)
}
function normalizeSaga(v){return clean(v).replace(/^\s*(?:series|serie|saga)\s*:\s*/i,'').replace(/\s+#\s*\d+(?:\.\d+)?\s*$/,'').trim()}
function sameSaga(a,b){const x=norm(normalizeSaga(a)),y=norm(normalizeSaga(b));return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x))}
function relationComplete(r){if(!r?.authoritative||!clean(r.saga))return false;const pre=clean(r.prequel),seq=clean(r.sequel);if(r.initial)return !!seq;if(r.terminal)return !!pre;return !!pre&&!!seq}
function infoFromRaw(raw,url){
  const rec=recovery(),base=rec?.bookInfo?rec.bookInfo(raw,url):null,title=cleanTitle(base?.title||links(raw,'book')[0]?.label||''),meta=seriesMeta(raw,title),pd=parsePublisherDate(raw);
  return{...(base||{}),source:'goodreads',title,author:clean(base?.author||''),publisher:clean(base?.publisher||pd.publisher||''),published:clean(base?.published||pd.published||''),description:cleanPlot(base?.description||''),genres:(base?.genres?.length?base.genres:goodreadsGenres(raw)),cover:base?.cover||'',series:(base?.series?.saga?base.series:meta),seriesUrl:base?.seriesUrl||'',bookUrl:url||base?.bookUrl||'',editionsUrl:base?.editionsUrl||links(raw,'editions')[0]?.url||'',raw:String(raw||'')}
}
async function bookPage(url){
  url=goodreadsUrl(url);if(!url)return null;const raw=await jina(url);if(!raw)return null;return infoFromRaw(raw,url)
}
async function exactItalianPhysical(book){
  if(!book)return null;if(pageLooksItalian(book.raw,book.description)&&book.title)return{title:book.title,source:'goodreads-page'};
  const a=api();if(!a?.editionBlocks||!a?.parseEditionBlock)return null;let ed=book.editionsUrl||links(book.raw,'editions')[0]?.url||'';if(!ed)return null;
  const base=String(ed).replace(/[?&]page=\d+/i,'').replace(/[?&]+$/,'');
  for(let p=1;p<=10;p++){
    const u=p===1?base:base+(base.includes('?')?'&':'?')+'page='+p,raw=await jina(u);if(!raw)continue;
    const blocks=a.editionBlocks(raw).map(a.parseEditionBlock).filter(Boolean);
    const it=blocks.find(x=>(/italian|italiano/i.test(x.language)||/Edition language\s*:\s*Italian|Language\s*:\s*Italian/i.test(x.raw||''))&&x.physical&&x.title);
    if(it)return{title:cleanTitle(it.title),publisher:clean(it.publisher||''),published:clean(it.published||''),cover:it.cover||'',source:'goodreads-editions'};
    if(p>1&&!blocks.length)break
  }
  return null
}
async function searchBookLinks(query){
  const target='https://www.goodreads.com/search?q='+encodeURIComponent(query)+'&search_type=books',raw=await jina(target);return links(raw,'book')
}
async function neighborByPosition(saga,position,author){
  if(!saga||!Number.isInteger(position)||position<1)return null;
  const queries=uniq([`${saga} #${position} ${author||''}`,`${saga} ${position} ${author||''}`]);const seen=new Set(),candidates=[];
  for(const q of queries){for(const l of await searchBookLinks(q).catch(()=>[])){if(!seen.has(l.url)){seen.add(l.url);candidates.push(l)}}}
  let fallback=null;
  for(const l of candidates.slice(0,14)){
    const b=await bookPage(l.url).catch(()=>null);if(!b)continue;const sm=b.series?.saga?b.series:seriesMeta(b.raw,b.title);if(Number(sm?.position)!==position||!sameSaga(sm?.saga,saga))continue;
    const it=await exactItalianPhysical(b).catch(()=>null);if(it?.title)return{title:it.title,book:b,edition:it};
    if(!fallback&&b.title)fallback={title:b.title,book:b,edition:null}
  }
  return fallback&&pageLooksItalian(fallback.book.raw,fallback.book.description)?fallback:null
}
async function relationsFromGoodreads(gr,input={}){
  const saga=normalizeSaga(gr?.series?.saga||''),position=Number(gr?.series?.position);if(!saga||!Number.isInteger(position)||position<1)return null;
  const author=clean(gr.author||input.author||''),pre=position>1?await neighborByPosition(saga,position-1,author).catch(()=>null):null,seq=await neighborByPosition(saga,position+1,author).catch(()=>null);
  if(position>1&&!pre)return null;if(!seq)return null;
  return{saga,prequel:pre?.title||'',sequel:seq?.title||'',position,initial:position===1,terminal:false,authoritative:true,verified:true,checked:true,source:'goodreads',method:'goodreads-position-search-italian-physical-v3',localizedPrequel:true,localizedSequel:true,localizationPending:false}
}
async function locate(code,seed={}){
  const rec=recovery();if(rec?.locateGoodreads){const b=await rec.locateGoodreads(code,seed).catch(()=>null);if(b)return b}
  return null
}
async function enrichGoodreads(gr,code,seed={}){
  if(!gr)return null;let out={...gr};
  if((!out.raw||!out.title)&&out.bookUrl){const b=await bookPage(out.bookUrl).catch(()=>null);if(b)out={...out,...b,series:b.series?.saga?b.series:out.series,raw:b.raw||out.raw}}
  const pd=parsePublisherDate(out.raw||'');
  out.publisher=clean(out.exactEdition?.publisher||out.publisher||pd.publisher||'');
  out.published=clean(out.exactEdition?.published||out.published||pd.published||'');
  out.title=cleanTitle(out.exactEdition?.title||out.title||seed.title||'');
  out.author=clean(out.author||seed.author||'');
  out.genres=out.genres?.length?out.genres:goodreadsGenres(out.raw||'');
  out.cover=out.exactEdition?.cover||out.cover||seed.cover||'';
  const sm=out.series?.saga?out.series:seriesMeta(out.raw||'',out.title);out.series=sm;
  return out
}
async function enrichResult(input={},r=null){
  const code=isbn(input.code),legacy=input.legacy||{},seed={title:r?.title||legacy.title||input.title||'',author:r?.author||legacy.author||input.author||'',cover:r?.cover||legacy.cover||''};
  let gr=r?.goodreads||null;if(!gr||!gr.raw||!gr.series?.saga||!gr.publisher||!gr.published)gr=await locate(code,seed).catch(()=>gr);
  gr=await enrichGoodreads(gr,code,seed).catch(()=>gr);if(!gr)return r;
  let relations=relationComplete(r?.relations)?r.relations:null;if(!relations)relations=await relationsFromGoodreads(gr,{...input,author:gr.author||seed.author}).catch(()=>null);
  const saga=normalizeSaga(relations?.saga||gr.series?.saga||r?.saga||legacy.saga||'');
  const genres=gr.genres?.length?gr.genres:(r?.genres||[]),description=cleanPlot(gr.description||''),plot=description&&pageLooksItalian(gr.raw,description)?description:cleanPlot(r?.plot||legacy.description||'');
  return{...(r||{}),source:'goodreads',title:cleanTitle(gr.title||r?.title||seed.title),author:clean(gr.author||r?.author||seed.author),publisher:clean(gr.publisher||r?.publisher||legacy.publisher||''),published:clean(gr.published||r?.published||legacy.published||''),genres,saga,prequel:cleanTitle(relations?.prequel||r?.prequel||legacy.prequel||''),sequel:cleanTitle(relations?.sequel||r?.sequel||legacy.sequel||''),plot,cover:gr.cover||r?.cover||legacy.cover||'',relations:relations||r?.relations||null,goodreads:gr,storygraph:r?.storygraph||null}
}
async function resolveAll(input={}){
  const key=isbn(input.code)+'|'+norm(input.title||input.legacy?.title||'');if(cache.has(key))return await cache.get(key);
  const p=(async()=>{const base=baseResolveAll;const r=typeof base==='function'?await base(input).catch(()=>null):null;return await enrichResult(input,r)})();cache.set(key,p);return await p
}
function install(){
  const a=api();if(!a||root.__LIB_GOODREADS_PRIMARY_DETAILS_INSTALLED_V3)return false;
  baseResolveAll=a.resolveAll;baseGenres=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;baseSeries=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;basePlot=root.__LIB_RESOLVE_OFFICIAL_PLOT;
  a.resolveAll=resolveAll;
  root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async input=>{const r=await resolveAll({...input,legacy:{}}).catch(()=>null);if(r?.genres?.length)return{found:true,reachable:true,genres:r.genres,source:r.goodreads?.genres?.length?'goodreads':(r.source||'storygraph'),url:r.goodreads?.bookUrl||r.storygraph?.bookUrl||''};return typeof baseGenres==='function'?await baseGenres(input):null};
  const series=async input=>{const r=await resolveAll({...input,legacy:{saga:input?.saga||''}}).catch(()=>null);if(r?.relations?.authoritative)return r.relations;return typeof baseSeries==='function'?await baseSeries(input):null};
  root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_SERIES_NEIGHBORS=series;root.__LIB_FIND_RELATIONS=series;root.__LIB_RESOLVE_UNIVERSAL_SERIES=series;root.__LIB_RESOLVE_BOUNDED_RELATIONS=series;
  root.__LIB_RESOLVE_OFFICIAL_PLOT=async input=>{const r=await resolveAll({...input,legacy:{}}).catch(()=>null);if(r?.plot)return r.plot;return typeof basePlot==='function'?await basePlot(input):''};
  root.__LIB_GOODREADS_PRIMARY_DETAILS_INSTALLED_V3=true;return true
}
(function boot(n=0){if(install())return;if(n<500)setTimeout(()=>boot(n+1),80)})();
root.__LIB_GOODREADS_PRIMARY_DETAILS_TEST__={parsePublisherDate,pageLooksItalian,infoFromRaw,neighborByPosition,relationsFromGoodreads,enrichGoodreads,enrichResult,resolveAll};
})();
