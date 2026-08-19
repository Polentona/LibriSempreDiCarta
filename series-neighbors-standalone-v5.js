(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V8)return;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V8=true;

const cache=new Map(),neighborCache=new Map(),seriesCache=new Map();
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const words=v=>norm(v).split(' ').filter(Boolean);
function sameTitle(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y)return true;if(x.length>=7&&(y.startsWith(x+' ')||y.endsWith(' '+x)))return true;if(y.length>=7&&(x.startsWith(y+' ')||x.endsWith(' '+y)))return true;const xa=new Set(words(x).filter(w=>w.length>2)),ya=new Set(words(y).filter(w=>w.length>2));if(!xa.size||!ya.size)return false;const common=[...xa].filter(w=>ya.has(w)).length;return common>=Math.min(2,Math.min(xa.size,ya.size))&&common/Math.max(xa.size,ya.size)>=.72}
function sameSeries(a,b){const x=norm(a).replace(/\b(?:series|serie|saga|trilogia|trilogy)\b/g,'').trim(),y=norm(b).replace(/\b(?:series|serie|saga|trilogia|trilogy)\b/g,'').trim();return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x))}
function safeSaga(v,currentTitle=''){
  let x=clean(v).replace(/^["“”«»']+|["“”«»']+$/g,'').trim();if(!x||x.length>90)return'';
  const n=norm(x);if(!n||/^\d+$/.test(n)||/(?:18|19|20)\d{2}/.test(x))return'';
  if(currentTitle&&sameTitle(x,currentTitle))return'';
  if(/https?:|www\.|[{}\[\]<>]|\.\.\.|…/.test(x))return'';
  if(/\b(?:iniziat[ao]|cominciat[ao]|seguit[oa]|precedut[oa]|pubblicat[oa]|romanzo|libro|volume|capitolo|autore|author|editore|publisher|isbn|ean|uscit[ao]|anno|tratto|film|cinema)\b/i.test(n))return'';
  if(words(x).length>9)return'';
  return x.replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy)\s+(?:di\s+|of\s+)?/i,'').trim()
}
function safeBook(v,currentTitle=''){
  let x=clean(v).replace(/^["“”«»']+|["“”«»']+$/g,'').replace(/[.;:\s]+$/,'').trim();if(!x||x.length>180)return'';
  if(currentTitle&&sameTitle(x,currentTitle))return'';
  if(/^(?:\.{2,}|…)|(?:\.{2,}|…)$/i.test(x)||/https?:|www\.|[{}<>]|\|\s*\w+\s*=/.test(x))return'';
  const n=norm(x);if(/\b(?:isbn|ean|editore|publisher|autore|author|followed by|preceded by|iniziat[ao] con|seguit[oa] da|serie composta|trilogia composta|pubblicat[oa] nel)\b/i.test(n))return'';
  if(/\b(?:she|he|they|we|you)\s+(?:is|are|was|were|has|have|had|got|will|would|can|could)\b/i.test(n))return'';
  if(words(x).length>20)return'';
  return x
}
function complete(rel){if(!rel?.saga)return false;if(rel.initial&&rel.terminal)return true;if(rel.initial)return !!rel.sequel;if(rel.terminal)return !!rel.prequel;return !!rel.prequel&&!!rel.sequel}
function decodeBing(u){try{const x=new URL(u);if(!/(^|\.)bing\.com$/i.test(x.hostname))return u;const enc=x.searchParams.get('u')||'';if(!enc.startsWith('a1'))return u;let b=enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return decodeURIComponent(escape(atob(b)))}catch(e){return u}}
async function reader(url,timeout=9000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function goodreadsLinks(text){const out=[],seen=new Set(),raw=String(text||'');const add=u=>{u=decodeBing(String(u||'').replace(/&amp;/g,'&'));try{const x=new URL(u),h=x.hostname.toLowerCase().replace(/^www\./,'');if(h!=='goodreads.com'||!/^\/(?:book\/show|series)\//.test(x.pathname)||seen.has(u))return;seen.add(u);out.push(u)}catch(e){}};let m;const md=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;while((m=md.exec(raw)))add(m[1]);const direct=/https?:\/\/(?:www\.)?goodreads\.com\/(?:book\/show|series)\/[^\s<>)\]]+/g;while((m=direct.exec(raw)))add(m[0].replace(/[.,;:'"]+$/,''));return out}
async function bing(q){return reader('https://www.bing.com/search?setlang=it-IT&cc=it&num=15&q='+encodeURIComponent(q),8500)}
function pageTitle(text){const lines=String(text||'').split(/\r?\n/);for(const line of lines){const m=line.match(/^#\s+(.+?)\s*$/);if(m){const t=safeBook(m[1]);if(t)return t}}return''}
function parseSeriesTag(text){const raw=String(text||'');let m=raw.match(/^###\s+(.+?)\s+#\s*(\d+(?:\.\d+)?)\s*$/mi);if(!m)m=raw.match(/(?:^|\n)\s*([A-ZÀ-ÖØ-Ý][^\n#]{1,70}?)\s+#\s*(\d+(?:\.\d+)?)\s*(?:\n|$)/m);if(!m)return null;const saga=safeSaga(m[1]);const position=Number(m[2]);return saga&&Number.isFinite(position)?{saga,position}:null}
function genreMap(text){const n=norm(text),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};if(/\bcontemporary\b|contemporane[oa]/.test(n))add('Contemporaneo');if(/\bromance\b|romantic fiction/.test(n))add('Romance');if(/chick lit|chicklit/.test(n))add('Chick Lit');if(/\bmystery\b|detective fiction|\bgiallo\b/.test(n))add('Giallo');if(/\bthriller\b|suspense/.test(n))add('Thriller');if(/\bcrime\b|noir/.test(n))add('Crime');if(/urban fantasy/.test(n))add('Urban Fantasy');else if(/\bfantasy\b/.test(n))add('Fantasy');if(/paranormal romance/.test(n))add('Paranormal Romance');else if(/\bparanormal\b/.test(n))add('Paranormale');if(/\bhorror\b/.test(n))add('Horror');if(/\bgothic\b|gotico/.test(n))add('Gotico');if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');if(/historical fiction|romanzo storico|\bhistorical\b/.test(n))add('Storico');if(/dystopi/.test(n))add('Distopico');if(/magical realism|realismo magico/.test(n))add('Realismo magico');if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');if(/\badventure\b|avventura/.test(n))add('Avventura');return out}
function parseGoodreadsBook(text,url=''){
  const title=pageTitle(text),tag=parseSeriesTag(text),raw=String(text||''),surnameBlock=raw.slice(0,Math.min(raw.length,7000));
  let genreChunk='';const gm=raw.match(/Genres?\s*([^\n]{0,550})/i);if(gm)genreChunk=gm[1];if(!genreChunk){const i=raw.toLowerCase().indexOf('genres');if(i>=0)genreChunk=raw.slice(i,i+650)}
  return {title,saga:tag?.saga||'',position:tag?.position||0,genres:genreMap(genreChunk),text:surnameBlock,url}
}
function authorOk(text,author){const surname=norm(author).split(' ').filter(Boolean).pop()||'';return !surname||norm(text).includes(surname)}
function titleItalianScore(t){const n=' '+norm(t)+' ';let s=0;for(const w of [' il ',' lo ',' la ',' gli ',' le ',' dei ',' degli ',' delle ',' del ',' della ',' di ',' e ',' sono ',' nel ',' nell '])if(n.includes(w))s++;return s}
async function currentGoodreads(input={}){
  const title=clean(input.title),author=clean(input.author),code=clean(input.code).replace(/[^0-9Xx]/g,'');if(!title||!author)return null;const key=['current',norm(title),norm(author),code].join('|');if(cache.has(key))return cache.get(key);
  const p=(async()=>{const queries=[];if(code)queries.push(`site:goodreads.com/book/show "${code}" "${author}"`);queries.push(`site:goodreads.com/book/show "${title}" "${author}"`);const seen=new Set(),candidates=[];for(const q of queries){const search=await bing(q);for(const u of goodreadsLinks(search)){if(seen.has(u)||!u.includes('/book/show/'))continue;seen.add(u);const text=await reader(u,8500);if(!text||!authorOk(text,author))continue;const b=parseGoodreadsBook(text,u);if(!b.title||!sameTitle(b.title,title))continue;candidates.push(b);if(b.saga&&b.position&&b.genres.length)return b}if(candidates.length)break}candidates.sort((a,b)=>Number(!!b.saga)-Number(!!a.saga)||b.genres.length-a.genres.length);return candidates[0]||null})();cache.set(key,p);return p
}
async function seriesTotal(saga,author){const key=[norm(saga),norm(author)].join('|');if(seriesCache.has(key))return seriesCache.get(key);const p=(async()=>{const search=await bing(`site:goodreads.com/series "${saga}" "${author}"`);for(const u of goodreadsLinks(search)){if(!u.includes('/series/'))continue;const text=await reader(u,8500);if(!text||!authorOk(text,author)||!sameSeries(text,saga))continue;const m=text.match(/(\d+)\s+primary works?/i);if(m)return Number(m[1]);let max=0;for(const x of text.matchAll(/###\s+Book\s+(\d+)\b/gi))max=Math.max(max,Number(x[1]));if(max)return max}return 0})();seriesCache.set(key,p);return p}
async function neighborGoodreads(saga,position,author,currentTitle=''){
  if(position<1)return null;const key=[norm(saga),position,norm(author)].join('|');if(neighborCache.has(key))return neighborCache.get(key);
  const p=(async()=>{const queries=[`site:goodreads.com/book/show "${saga} #${position}" "${author}"`,`site:goodreads.com/book/show "${saga}" "#${position}" "${author}" libro`],seen=new Set(),found=[];for(const q of queries){const search=await bing(q);for(const u of goodreadsLinks(search)){if(seen.has(u)||!u.includes('/book/show/'))continue;seen.add(u);const text=await reader(u,8500);if(!text||!authorOk(text,author))continue;const b=parseGoodreadsBook(text,u);if(!b.title||!b.saga||b.position!==position||!sameSeries(b.saga,saga)||sameTitle(b.title,currentTitle))continue;found.push(b)}if(found.length)break}found.sort((a,b)=>titleItalianScore(b.title)-titleItalianScore(a.title));return found[0]||null})();neighborCache.set(key,p);return p
}
async function goodreadsResolve(input={}){
  const current=await currentGoodreads(input);if(!current?.saga||!current.position)return null;const total=await seriesTotal(current.saga,input.author||'');const pos=current.position;
  const [prev,next]=await Promise.all([pos>1?neighborGoodreads(current.saga,pos-1,input.author||'',input.title||''):Promise.resolve(null),(!total||pos<total)?neighborGoodreads(current.saga,pos+1,input.author||'',input.title||''):Promise.resolve(null)]);
  const rel={saga:safeSaga(current.saga,input.title),prequel:safeBook(prev?.title||'',input.title),sequel:safeBook(next?.title||'',input.title),source:current.url||'Goodreads',method:'goodreads-series-position',authoritative:false,checked:true,initial:pos===1,terminal:!!total&&pos>=total,position:pos,total:total||0};
  rel.authoritative=complete(rel);root.__LIB_GOODREADS_SERIES_LAST__={input,current,total,prev,next,result:rel};return rel
}
function sanitizeRelation(rel,input={}){if(!rel)return null;const out={...rel};out.saga=safeSaga(rel.saga||'',input.title||'');out.prequel=safeBook(rel.prequel||'',input.title||'');out.sequel=safeBook(rel.sequel||'',input.title||'');if(out.prequel&&out.sequel&&sameTitle(out.prequel,out.sequel))out.sequel='';if(out.initial)out.prequel='';if(out.terminal)out.sequel='';out.authoritative=Boolean(rel.authoritative&&complete(out));return out}
function installUniversal(){const cur=root.__LIB_RESOLVE_UNIVERSAL_SERIES;if(typeof cur!=='function'||cur.__goodreadsSafeV8)return false;const base=cur;const wrapped=async input=>{let g=null;try{g=await goodreadsResolve(input||{})}catch(e){root.__LIB_GOODREADS_SERIES_ERROR__=String(e&&e.message||e)}if(g?.authoritative)return g;let b=null;try{b=sanitizeRelation(await base(input||{}),input||{})}catch(e){root.__LIB_UNIVERSAL_SERIES_BASE_ERROR__=String(e&&e.message||e)}if(g){const merged=sanitizeRelation({...b,...g,saga:g.saga||b?.saga||'',prequel:g.prequel||b?.prequel||'',sequel:g.sequel||b?.sequel||'',initial:g.initial,terminal:g.terminal,position:g.position,total:g.total,source:g.source||b?.source||''},input||{});merged.authoritative=complete(merged);return merged}return b};wrapped.__goodreadsSafeV8=true;wrapped.__base=base;root.__LIB_RESOLVE_UNIVERSAL_SERIES=wrapped;return true}
function installFindRelations(){const cur=root.__LIB_FIND_RELATIONS;if(typeof cur!=='function'||cur.__relationSafetyV8)return false;const base=cur;const wrapped=async input=>{const r=await Promise.resolve(base(input||{})).catch(()=>null),s=sanitizeRelation(r,input||{})||{saga:'',prequel:'',sequel:'',checked:false};return {...r,...s,sagaChecked:Boolean(r?.sagaChecked&&s.saga)};};wrapped.__relationSafetyV8=true;root.__LIB_FIND_RELATIONS=wrapped;return true}

/* Il vecchio resolver viene mantenuto solo come fallback conservativo: non inventa relazioni. */
root.__LIB_RESOLVE_SERIES_NEIGHBORS=async function(input={}){const g=await goodreadsResolve(input).catch(()=>null);if(g?.authoritative)return {...g,checked:true};return {saga:safeSaga(input.saga||'',input.title||''),prequel:'',sequel:'',source:'',checked:true,authoritative:false}};

function genericGenreValue(v){const n=norm(v);return !n||['fiction','narrativa','letteratura','romanzo','novel','ragazzi','young adult','adult','libri per ragazzi','letterature straniere testi','narrativa moderna e contemporanea dopo il 1945'].includes(n)}
let draftSig='',draftToken=0;
async function fillDraftFromGoodreads(){const dlg=document.getElementById('editDialog'),field=document.getElementById('editCategory'),title=document.getElementById('editTitle')?.value||'',author=document.getElementById('editAuthor')?.value||'',code=document.getElementById('editCode')?.value||'';if(!dlg?.open||!field||!clean(title)||!clean(author)||!genericGenreValue(field.value))return;const sig=[clean(code),norm(title),norm(author)].join('|');if(sig===draftSig)return;draftSig=sig;const token=++draftToken;const rec=await currentGoodreads({code,title,author}).catch(()=>null);if(token!==draftToken||!dlg.open)return;if(rec?.genres?.length&&genericGenreValue(field.value)){field.value=rec.genres.join(', ');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));root.__LIB_GOODREADS_GENRES_LAST__={code,title,author,genres:rec.genres,source:rec.url}}}

let tries=0;const timer=setInterval(()=>{tries++;installUniversal();installFindRelations();fillDraftFromGoodreads();if(tries>=600)clearInterval(timer)},200);
setTimeout(()=>{installUniversal();installFindRelations();fillDraftFromGoodreads()},0);
root.__LIB_SERIES_NEIGHBORS_V8_TEST__={safeSaga,safeBook,parseGoodreadsBook,currentGoodreads,neighborGoodreads,goodreadsResolve,genreMap};
})();
