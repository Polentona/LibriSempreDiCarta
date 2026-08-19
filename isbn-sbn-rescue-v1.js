(()=>{
if(window.__LIB_ISBN_SBN_RESCUE_V2)return;window.__LIB_ISBN_SBN_RESCUE_V2=true;
const previousFetch=window.fetch.bind(window),rawFetch=window.fetch.bind(window),cache=new Map();
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
function isbn13to10(v){const n=code(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-s%11)%11;return core+(c===10?'X':String(c))}
function isbn10to13(v){const n=code(v);if(!/^\d{9}[\dX]$/.test(n))return'';const core='978'+n.slice(0,9);let s=0;for(let i=0;i<12;i++)s+=Number(core[i])*(i%2?3:1);return core+String((10-s%10)%10)}
function aliases(v){const n=code(v),a=n.length===10?isbn10to13(n):n,b=n.length===13?isbn13to10(n):n;return [...new Set([n,a,b].filter(Boolean))]}
async function fetchText(url,timeout=8500){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await rawFetch(url,{signal:c.signal,headers:{Accept:'application/json,text/plain,text/html,*/*'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}}
function parseJsonLoose(text){const s=String(text||'').trim();if(!s)return null;try{return JSON.parse(s)}catch(e){}const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1))}catch(e){}}return null}
function authorName(v){const x=clean(v);if(!x)return'';const p=x.split(',').map(clean).filter(Boolean);if(p.length===2&&p[0]&&p[1])return `${p[1]} ${p[0]}`.trim();return x}
function titleOnly(v){return clean(v).split(/\s+\/\s+/)[0].trim()}
function publicationParts(v){const x=clean(v);let publisher='',year='';const ym=x.match(/\b((?:18|19|20)\d{2})\b/);if(ym)year=ym[1];const colon=x.indexOf(':');if(colon>=0){let tail=x.slice(colon+1).trim();if(year){const i=tail.lastIndexOf(year);if(i>=0)tail=tail.slice(0,i)}tail=tail.replace(/[;,\s]+$/,'').trim();const comma=tail.lastIndexOf(',');if(comma>=0&&/\d{4}/.test(tail.slice(comma+1)))tail=tail.slice(0,comma);publisher=clean(tail)}return{publisher,year}}
function recordFromSbn(data){const rows=Array.isArray(data?.briefRecords)?data.briefRecords:[];for(const r of rows){const title=titleOnly(r?.titolo||''),author=authorName(r?.autorePrincipale||r?.nomi?.[0]||''),p=publicationParts(r?.pubblicazione||'');if(title&&author)return{title,author,publisher:p.publisher,year:p.year,cover:clean(r?.copertina||''),categories:[],description:'',source:'OPAC SBN'}}return null}
function slug(v){return norm(v).replace(/\s+/g,'-')}
function specificGenres(text){
  const n=norm(text),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};if(!n)return out;
  const parRom=/paranormal romance|romance paranormal/.test(n);
  if(/narrativa rosa contemporanea|narrativa contemporanea|contemporary fiction|\bcontemporary\b|contemporane[oa]/.test(n))add('Narrativa contemporanea');
  if(!parRom&&/narrativa rosa|narrativa sentimentale|romanzo rosa|romantic fiction|romance fiction|\bromance\b|\bsentimentale\b/.test(n))add('Narrativa rosa/sentimentale');
  if(/urban fantasy/.test(n))add('Urban Fantasy');else if(/\bfantasy\b/.test(n))add('Fantasy');
  if(parRom)add('Paranormal Romance');else if(/\bparanormal\b/.test(n))add('Paranormale');
  if(/\bhorror\b/.test(n))add('Horror');if(/\bgothic\b|gotico/.test(n))add('Gotico');if(/\bthriller\b|suspense/.test(n))add('Thriller');
  if(/\bmystery\b|detective fiction|\bgiallo\b|poliziesc/.test(n))add('Giallo');if(/\bcrime\b|noir/.test(n))add('Crime');
  if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');if(/historical fiction|romanzo storico|narrativa storica/.test(n))add('Storico');
  if(/dystopi/.test(n))add('Distopico');if(/magical realism|realismo magico/.test(n))add('Realismo magico');if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');
  if(/chick lit|chicklit/.test(n))add('Chick Lit');if(/\badventure\b|avventura/.test(n))add('Avventura');return out
}
function classificationSlice(text){
  const raw=String(text||''),low=raw.toLowerCase(),idx=low.indexOf('classificazione');if(idx<0)return'';
  return clean(raw.slice(idx,Math.min(raw.length,idx+900)))
}
async function enrichGenresFromRetailer(rec,isbn){
  if(!rec?.title||!rec?.author)return rec;
  const parts=clean(rec.author).split(/\s+/).filter(Boolean),authorSlug=slug([...parts.slice(-1),...parts.slice(0,-1)].join(' ')),titleSlug=slug(rec.title),ean=aliases(isbn).find(x=>/^97[89]\d{10}$/.test(x))||code(isbn);
  const target=`https://www.unilibro.it/libro/${authorSlug}/${titleSlug}/${ean}`;
  const text=await fetchText('https://r.jina.ai/'+target,8000),slice=classificationSlice(text),genres=specificGenres(slice);
  window.__LIB_SBN_GENRE_ENRICH_LAST__={target,length:text.length,slice,genres};
  if(genres.length)rec.categories=uniq(genres);
  return rec
}
async function sbnLookup(isbn){const ean=aliases(isbn).find(x=>/^97[89]\d{10}$/.test(x))||code(isbn),target='http://opac.sbn.it/opacmobilegw/search.json?isbn='+encodeURIComponent(ean),attempts=[
  'https://r.jina.ai/'+target,
  'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
  'https://corsproxy.io/?url='+encodeURIComponent(target),
  'https://opac.sbn.it/opacmobilegw/search.json?isbn='+encodeURIComponent(ean)
];const diag=[];for(const u of attempts){const text=await fetchText(u);const data=parseJsonLoose(text),rec=recordFromSbn(data);diag.push({url:u,ok:!!rec,length:text.length,numFound:data?.numFound??null});if(rec){await enrichGenresFromRetailer(rec,ean).catch(()=>rec);window.__LIB_SBN_RESCUE_LAST__={isbn,diag,rec};return rec}}window.__LIB_SBN_RESCUE_LAST__={isbn,diag,rec:null};return null}
function googleShape(rec,isbn){const ids=aliases(isbn).map(x=>({type:x.length===10?'ISBN_10':'ISBN_13',identifier:x})),v={title:rec.title,authors:[rec.author],publisher:rec.publisher||'',publishedDate:rec.year||'',language:'it',industryIdentifiers:ids,categories:rec.categories||[],description:rec.description||''};if(rec.cover)v.imageLinks={thumbnail:rec.cover,smallThumbnail:rec.cover,medium:rec.cover,large:rec.cover};return{kind:'books#volumes',totalItems:1,items:[{id:'sbn-rescue-'+code(isbn),volumeInfo:v,__sbnRescue:true}]}}
async function lookup(isbn){const k=code(isbn);if(cache.has(k))return cache.get(k);const p=sbnLookup(k);cache.set(k,p);return p}
window.__LIB_SBN_ISBN_LOOKUP=lookup;
window.fetch=async function(input,init){let u;try{u=new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return previousFetch(input,init)}if(!(u.hostname==='www.googleapis.com'&&u.pathname.includes('/books/v1/volumes')))return previousFetch(input,init);const q=u.searchParams.get('q')||'',m=q.match(/^isbn:([0-9Xx-]+)/i);if(!m)return previousFetch(input,init);const isbn=code(m[1]);let original=null;try{original=await previousFetch(input,init);if(original?.ok){const data=await original.clone().json();if(data?.items?.length)return original}}catch(e){}try{const rec=await lookup(isbn);if(rec?.title&&rec?.author)return new Response(JSON.stringify(googleShape(rec,isbn)),{status:200,headers:{'content-type':'application/json; charset=utf-8'}})}catch(e){window.__LIB_SBN_RESCUE_ERROR__=String(e&&e.message||e)}return original||previousFetch(input,init)};
})();
