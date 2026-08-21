(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_PRIMARY_RECOVERY_V2)return;
root.__LIB_GOODREADS_PRIMARY_RECOVERY_V2=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const v=clean(raw),k=norm(v);if(v&&k&&!seen.has(k)){seen.add(k);out.push(v)}}return out};
const cache=new Map(),inflight=new Map();
let baseResolveAll=null,baseGenres=null,baseSeries=null,basePlot=null;

function api(){return root.__LIB_GOODREADS_PRIMARY_METADATA_TEST__||null}
function cleanTitle(v){return api()?.cleanTitle?api().cleanTitle(v):clean(v).replace(/\s*[:\-–—|]\s*(?:romanzo|novel|libro|book)\s*$/i,'').trim()}
function cleanPlot(v){return api()?.cleanPlot?api().cleanPlot(v):clean(v)}
function goodreadsGenres(v){return api()?.goodreadsGenres?api().goodreadsGenres(v):[]}
function parseSeriesMeta(raw,title=''){return api()?.parseSeriesMeta?api().parseSeriesMeta(raw,title):{saga:'',position:NaN}}
function parseDescription(raw){return api()?.parseDescription?api().parseDescription(raw):''}
function isItalian(v){return api()?.isItalian?api().isItalian(v):false}
function validTitle(v){const n=norm(v);return !!n&&!/^(?:title )?browse books the storygraph$|^browse books$|^goodreads$|^search$/.test(n)&&!/there s nothing on the storygraph matching/.test(n)}
function validStoryGraph(sg){if(!sg)return false;const raw=String(sg.raw||''),title=cleanTitle(sg.title||'');if(/there['’]?s nothing on the storygraph matching/i.test(raw))return false;if(!validTitle(title))return false;if(/\/browse\?search_term=/i.test(String(sg.bookUrl||''))&&!/\/books\/[0-9a-f-]{20,}/i.test(raw))return false;return !!(sg.author||sg.publisher||sg.description||(sg.genres||[]).length||Number.isInteger(sg.series?.position))}
function urlAbs(u){u=clean(u).replace(/[),.;]+$/,'');if(!u)return'';if(/^https?:\/\//i.test(u))return u;if(u.startsWith('/'))return 'https://www.goodreads.com'+u;return''}
function links(raw,kind='book'){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\(([^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){const label=clean(m[1]),url=urlAbs(m[2]);if(!url)continue;
    if(kind==='book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;
    if(kind==='editions'&&!/goodreads\.com\/(?:work\/editions|book\/editions)\//i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }return out
}
async function text(url,timeout=12000){
  const broker=root.__LIB_BROKER_TEXT;
  if(typeof broker==='function')return await broker(url,timeout);
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});return r.ok?await r.text():''}catch(e){return''}finally{clearTimeout(t)}
}
async function jina(target,timeout=12000){for(const t of uniq([target,target.replace(/^https:\/\//i,'http://')])){const raw=await text('https://r.jina.ai/'+t,timeout);if(raw&&raw.length>80)return raw}return''}
function firstHeading(raw){for(const m of String(raw||'').matchAll(/^#\s+(.+)$/gm)){const t=cleanTitle(m[1].replace(/\[([^\]]+)\]\([^)]*\)/g,'$1'));if(validTitle(t)&&!/editions|reviews|goodreads/i.test(norm(t)))return t}return''}
function authorFrom(raw){const s=String(raw||''),start=s.search(/^#\s+/m),part=start>=0?s.slice(start):s;for(const m of part.matchAll(/^###\s+(.+)$/gm)){const v=clean(m[1].replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')).replace(/\s*\([^)]*(?:translator|traduttore|editor|illustrator)[^)]*\)/gi,'').trim();if(!v||/^(?:genres|book details|ratings|reviews|want to read|shop this series|about the author)$/i.test(norm(v)))continue;if(v.split(/\s+/).length<=7&&!/\d/.test(v))return v}return''}
function coverFrom(raw){const urls=[];for(const m of String(raw||'').matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g))urls.push(m[1]);for(const u of String(raw||'').match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)||[])urls.push(u);return urls.find(u=>/compressed\.photo\.goodreads\.com\/books|ssl-images-amazon\.com.*goodreads|images-na\.ssl-images-amazon\.com/i.test(u))||''}
function containsIsbn(raw,target){const n=isbn(target);return !!n&&String(raw||'').split(/[^0-9Xx-]+/).some(x=>isbn(x)===n)}
function editionsLink(raw){return links(raw,'editions')[0]?.url||((String(raw||'').match(/https?:\/\/(?:www\.)?goodreads\.com\/work\/editions\/[\w.-]+/i)||[])[0]||'')}
function bookInfo(raw,url){if(!raw)return null;const title=firstHeading(raw),author=authorFrom(raw),series=parseSeriesMeta(raw,title),seriesUrl=links(raw,'series')[0]?.url||'';if(!validTitle(title)&&!author)return null;return{source:'goodreads',title,author,publisher:'',published:'',description:cleanPlot(parseDescription(raw)),genres:goodreadsGenres(raw),cover:coverFrom(raw),series,seriesUrl,bookUrl:url||'',editionsUrl:editionsLink(raw),raw}}
function parseAutocomplete(raw){
  raw=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();let data=null;try{data=JSON.parse(raw)}catch(e){}
  const arr=Array.isArray(data)?data:Array.isArray(data?.results)?data.results:[],out=[];
  for(const x of arr){const bookId=String(x?.bookId||x?.book_id||x?.id||'').match(/\d+/)?.[0]||'',bookUrl=urlAbs(x?.bookUrl||x?.book_url||'')||(bookId?'https://www.goodreads.com/book/show/'+bookId:'');if(bookUrl)out.push({url:bookUrl,title:cleanTitle(x?.bookTitleBare||x?.title||''),cover:x?.imageUrl||x?.image_url||'',author:clean(x?.author?.name||x?.authorName||'')})}
  if(out.length)return out;const ids=[...raw.matchAll(/"(?:bookId|book_id)"\s*:\s*"?(\d+)/g)].map(m=>m[1]);return uniq(ids).map(id=>({url:'https://www.goodreads.com/book/show/'+id,title:'',cover:'',author:''}))
}
async function autocomplete(query){const target='https://www.goodreads.com/book/auto_complete?format=json&q='+encodeURIComponent(query),raw=await jina(target,11000);return parseAutocomplete(raw)}
async function searchLinks(query){const target='https://www.goodreads.com/search?q='+encodeURIComponent(query)+'&search_type=books',raw=await jina(target,11000);return links(raw,'book')}
async function scanExactEdition(editionsUrl,target){
  const a=api();if(!a?.editionBlocks||!a?.parseEditionBlock||!editionsUrl)return null;const base=String(editionsUrl).replace(/[?&]page=\d+/i,'').replace(/[?&]+$/,'');
  for(let p=1;p<=10;p++){const u=p===1?base:base+(base.includes('?')?'&':'?')+'page='+p,raw=await jina(u,12000);if(!raw)continue;const all=a.editionBlocks(raw).map(a.parseEditionBlock),hit=all.find(x=>isbn(x.isbn)===isbn(target));if(hit)return{...hit,pageUrl:u};if(p>1&&!/\bnext\b/i.test(raw)&&!all.length)break}return null
}
async function loadGoodreadsBook(url,target,seed={}){
  const raw=await jina(url,12000);if(!raw)return null;let info=bookInfo(raw,url);if(!info)return null;let edition=null;if(info.editionsUrl)edition=await scanExactEdition(info.editionsUrl,target);
  const exact=containsIsbn(raw,target)||!!edition;if(!exact&&target)return null;
  if(edition?.url&&(!info.author||!info.genres.length||!info.description)){const eraw=await jina(edition.url,12000),e=bookInfo(eraw,edition.url);if(e)info={...info,...e,seriesUrl:e.seriesUrl||info.seriesUrl,editionsUrl:e.editionsUrl||info.editionsUrl}}
  return{...info,title:cleanTitle(edition?.title||info.title||seed.title||''),author:clean(info.author||seed.author||''),publisher:clean(edition?.publisher||''),published:clean(edition?.published||''),cover:edition?.cover||info.cover||seed.cover||'',series:Number.isFinite(edition?.series?.position)?edition.series:info.series,exactEdition:edition||null,isbn:isbn(target)}
}
async function locateGoodreads(target,seed={}){
  const key=isbn(target),candidates=[],seen=new Set(),add=u=>{u=urlAbs(u);if(u&&!seen.has(u)){seen.add(u);candidates.push(u)}};
  if(key){const direct='https://www.goodreads.com/book/isbn/'+key,raw=await jina(direct,12000);for(const l of links(raw,'book').slice(0,3))add(l.url);if(containsIsbn(raw,key)&&validTitle(firstHeading(raw)))add(direct)}
  for(const r of await autocomplete(key).catch(()=>[]))add(r.url);for(const r of await searchLinks(key).catch(()=>[]))add(r.url);
  if(seed.title){const q=clean(seed.title+' '+(seed.author||''));for(const r of await autocomplete(q).catch(()=>[]))add(r.url);for(const r of await searchLinks(q).catch(()=>[]))add(r.url)}
  for(const u of candidates.slice(0,12)){const b=await loadGoodreadsBook(u,key,seed).catch(()=>null);if(b)return b}return null
}
async function goodreadsRelations(gr,input){const a=api();if(!a?.resolveRelations||!gr)return null;return await a.resolveRelations(gr,input).catch(()=>null)}
function usefulBaseResult(r){if(!r)return false;if(r.source==='goodreads'&&r.goodreads)return true;if(r.source==='storygraph'&&validStoryGraph(r.storygraph))return true;return false}
async function storygraph(input){const a=api();if(!a?.storyGraphPrimary)return null;const sg=await a.storyGraphPrimary(input).catch(()=>null);return validStoryGraph(sg)?sg:null}
async function fallbackSeed(code){const fn=root.__LIB_RESILIENT_ISBN_LOOKUP;if(typeof fn!=='function')return null;return await fn(code).catch(()=>null)}
function fromStoryGraph(sg,legacy={}){return{source:'storygraph',title:cleanTitle(sg?.title||legacy.title||''),author:clean(sg?.author||legacy.author||''),publisher:clean(sg?.publisher||legacy.publisher||''),published:clean(sg?.published||legacy.published||''),genres:sg?.genres||[],saga:clean(sg?.series?.saga||legacy.saga||''),prequel:'',sequel:'',plot:cleanPlot(sg?.description||legacy.description||''),cover:sg?.cover||legacy.cover||'',relations:null,goodreads:null,storygraph:sg}}
async function buildFromGoodreads(gr,input,legacy={}){
  const a=api(),sgNeed=!gr.genres?.length||!gr.description||!gr.publisher||!gr.published||!gr.series?.saga||!Number.isInteger(gr.series?.position),sg=sgNeed?await storygraph({code:input.code,title:gr.title,author:gr.author}).catch(()=>null):null;
  let genres=gr.genres?.length?gr.genres:(sg?.genres||[]),plot=cleanPlot(gr.description||'');if(!plot&&sg?.description)plot=isItalian(sg.description)?cleanPlot(sg.description):(a?.translateItalian?await a.translateItalian(sg.description).catch(()=>''):'');
  let relations=await goodreadsRelations(gr,{code:input.code,title:gr.title,author:gr.author}).catch(()=>null);if(!relations&&sg?.series?.saga&&Number.isInteger(sg.series.position)&&a?.resolveRelationsStoryGraph)relations=await a.resolveRelationsStoryGraph(sg,{code:input.code,title:gr.title,author:gr.author}).catch(()=>null);
  return{source:'goodreads',title:cleanTitle(gr.title||legacy.title||''),author:clean(gr.author||legacy.author||''),publisher:clean(gr.publisher||sg?.publisher||legacy.publisher||''),published:clean(gr.published||sg?.published||legacy.published||''),genres,saga:clean(relations?.saga||gr.series?.saga||sg?.series?.saga||legacy.saga||''),prequel:cleanTitle(relations?.prequel||legacy.prequel||''),sequel:cleanTitle(relations?.sequel||legacy.sequel||''),plot:plot||cleanPlot(legacy.description||''),cover:gr.cover||sg?.cover||legacy.cover||'',relations,goodreads:gr,storygraph:sg}
}
async function resolveEnhanced(input={}){
  const code=isbn(input.code),legacy=input.legacy||{},base=baseResolveAll||root.__LIB_GOODREADS_PRIMARY_BASE_RESOLVE_ALL_V2;
  if(!code)return typeof base==='function'?await base(input):null;
  const key=code;if(cache.has(key))return cache.get(key);if(inflight.has(key))return await inflight.get(key);
  const task=(async()=>{
    let first=typeof base==='function'?await base(input).catch(()=>null):null;if(usefulBaseResult(first))return first;
    let gr=await locateGoodreads(code,{title:legacy.title||input.title,author:legacy.author||input.author,cover:legacy.cover||''}).catch(()=>null);if(gr)return await buildFromGoodreads(gr,input,legacy);
    let sg=await storygraph({code,title:legacy.title||input.title,author:legacy.author||input.author}).catch(()=>null);if(sg)return fromStoryGraph(sg,legacy);
    const seed=await fallbackSeed(code);if(seed){
      gr=await locateGoodreads(code,seed).catch(()=>null);if(gr)return await buildFromGoodreads(gr,input,{...legacy,title:seed.title||legacy.title,author:seed.author||legacy.author,publisher:seed.publisher||legacy.publisher,published:seed.year||legacy.published,description:seed.description||legacy.description,cover:seed.cover||legacy.cover});
      sg=await storygraph({code,title:seed.title,author:seed.author}).catch(()=>null);if(sg)return fromStoryGraph(sg,{...legacy,title:seed.title,author:seed.author,publisher:seed.publisher,published:seed.year,description:seed.description,cover:seed.cover})
    }
    if(first&&!/browse books the storygraph/i.test(norm(first.title||'')))return first;
    return seed?{source:'fallback',title:cleanTitle(seed.title||legacy.title||''),author:clean(seed.author||legacy.author||''),publisher:clean(seed.publisher||legacy.publisher||''),published:clean(seed.year||legacy.published||''),genres:[],saga:'',prequel:'',sequel:'',plot:cleanPlot(seed.description||legacy.description||''),cover:seed.cover||legacy.cover||'',relations:null,goodreads:null,storygraph:null}:null
  })().finally(()=>inflight.delete(key));inflight.set(key,task);const r=await task;if(r)cache.set(key,r);return r
}
function install(){const a=api();if(!a||root.__LIB_GOODREADS_PRIMARY_RECOVERY_INSTALLED_V2)return false;
  const original=a.resolveAll;baseResolveAll=original;a.resolveAll=resolveEnhanced;root.__LIB_GOODREADS_PRIMARY_BASE_RESOLVE_ALL_V2=original;
  baseGenres=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;baseSeries=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;basePlot=root.__LIB_RESOLVE_OFFICIAL_PLOT;
  root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async input=>{const r=await resolveEnhanced({...input,legacy:{}}).catch(()=>null);if(r?.genres?.length)return{found:true,reachable:true,genres:r.genres,source:r.goodreads?.genres?.length?'goodreads':(r.source||'storygraph'),url:r.goodreads?.bookUrl||r.storygraph?.bookUrl||''};return typeof baseGenres==='function'?await baseGenres(input):null};
  const series=async input=>{const r=await resolveEnhanced({...input,legacy:{saga:input?.saga||''}}).catch(()=>null);if(r?.relations?.authoritative)return r.relations;return typeof baseSeries==='function'?await baseSeries(input):null};root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_SERIES_NEIGHBORS=series;root.__LIB_FIND_RELATIONS=series;root.__LIB_RESOLVE_UNIVERSAL_SERIES=series;root.__LIB_RESOLVE_BOUNDED_RELATIONS=series;
  root.__LIB_RESOLVE_OFFICIAL_PLOT=async input=>{const r=await resolveEnhanced({...input,legacy:{}}).catch(()=>null);if(r?.plot)return r.plot;return typeof basePlot==='function'?await basePlot(input):''};
  root.__LIB_GOODREADS_PRIMARY_RECOVERY_INSTALLED_V2=true;return true
}
(function boot(n=0){if(install())return;if(n<500)setTimeout(()=>boot(n+1),80)})();
root.__LIB_GOODREADS_PRIMARY_RECOVERY_TEST__={validStoryGraph,parseAutocomplete,bookInfo,locateGoodreads,resolveEnhanced,containsIsbn};
})();
