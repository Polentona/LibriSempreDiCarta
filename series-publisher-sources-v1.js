(()=>{
if(window.__LIB_PUBLISHER_RELATIONS_V1||typeof window.__LIB_FIND_RELATIONS!=='function')return;
window.__LIB_PUBLISHER_RELATIONS_V1=true;

const baseFindRelations=window.__LIB_FIND_RELATIONS;
const cache=new Map();
const BAD_HOSTS=/^(?:www\.)?(?:google\.[^/]+|bing\.com|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[^/]+|x\.com|twitter\.com)$/i;
const OFFICIAL_PUBLISHERS=/(?:^|\.)(?:tealibri\.it|nord\.it|longanesi\.it|garzanti\.it|guanda\.it|salani\.it|newtoncompton\.com|mondadori\.it|rizzolilibri\.it|sperling\.it|feltrinellieditore\.it|einaudi\.it|adelphi\.it|sellerio\.it|fazi\.it|giuntieditore\.it)$/i;
const BOOK_SOURCES=/(?:^|\.)(?:ibs\.it|libraccio\.it|hoepli\.it|unilibro\.it|libreriauniversitaria\.it|lafeltrinelli\.it|mondadoristore\.it)$/i;

function clean(v){
  return String(v||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g,'$2')
    .replace(/<[^>]+>/g,' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
    .replace(/[\*_`~]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim()}
function esc(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  return x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' '));
}
function titleVariants(v){
  const raw=clean(v),parts=raw.split(/\s*(?:[.:]|\s[-–—]\s)\s*/).map(clean).filter(Boolean),out=[];
  for(const x of [raw,...parts]){const n=norm(x);if(n&&n.length>1&&!out.some(y=>norm(y)===n))out.push(x)}
  return out;
}
function matchesTitle(v,title){return titleVariants(title).some(t=>sameTitle(v,t))}
function cleanSeriesName(v){
  let x=clean(v).replace(/^[|:=\-–—\s]+|[|:=\-–—\s]+$/g,'').trim();
  x=x.replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy)\s+(?:di|of)\s+/i,'').trim();
  x=x.replace(/\s+(?:series|serie|saga|trilogy|trilogia)\s*$/i,'').trim();
  if(!x||x.length>120||/^(?:serie|series|saga|trilogia|trilogy|ciclo)$/i.test(x))return'';
  return x;
}
function cleanBookTitle(v){
  let x=clean(v)
    .replace(/^[|:=\-–—•·\s]+|[|:=\-–—•·\s]+$/g,'')
    .replace(/^(?:libro|book|volume)\s*#?\s*\d{1,2}\s*[.)\-:]?\s*/i,'')
    .replace(/^#?\s*\d{1,2}\s*[.)\-:]\s*/,'')
    .replace(/\s+(?:ISBN|EAN)\b.*$/i,'')
    .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'')
    .trim();
  if(/^(?:home|libri|books|autore|author|autori|authors|serie|series|saga|trilogia|trilogy|scopri|acquista|compra|wishlist|menu)$/i.test(x))return'';
  return x.length>=2&&x.length<=190?x:'';
}
function cutSeriesTail(v,author=''){
  let x=String(v||'').trim();
  if(author){const a=esc(clean(author));x=x.replace(new RegExp('\\s[-–—]\\s+'+a+'\\b.*$','i'),'')}
  return x.replace(/\s[-–—]\s+(?:Libro|Book|TEA|IBS|Amazon|Libraccio|Hoepli|Unilibro|Mondadori|Feltrinelli|Rizzoli|Garzanti|Editore|Publisher)\b.*$/i,'').trim();
}
function splitSeriesList(v,author=''){
  const raw=cutSeriesTail(clean(v),author).replace(/\s+(?:e|and)\s+(?=[A-ZÀ-ÖØ-Ý“"'])/g,', ');
  let parts=raw.split(/\s*[,;•·|]\s*/).map(cleanBookTitle).filter(Boolean);
  const hyphens=(raw.match(/[-–—]/g)||[]).length;
  if(parts.length<2&&hyphens>=2)parts=raw.split(/\s*[-–—]\s*/).map(cleanBookTitle).filter(Boolean);
  const out=[];
  for(const p of parts){if(!out.some(x=>sameTitle(x,p)))out.push(p)}
  return out.slice(0,30);
}
function relationFromItems(items,title,saga='',source=''){
  const cleaned=(items||[]).map(cleanBookTitle).filter(Boolean);if(cleaned.length<2)return null;
  const idx=cleaned.findIndex(x=>matchesTitle(x,title));if(idx<0)return null;
  return {saga:cleanSeriesName(saga),prequel:idx>0?cleaned[idx-1]:'',sequel:idx<cleaned.length-1?cleaned[idx+1]:'',source,items:cleaned};
}
function parseCompilation(text,title,author,source=''){
  const p=String(text||''),patterns=[
    /(?:la\s+|the\s+)?(?:trilogia|trilogy|saga|serie|series)\s+(?:di|of)\s+([^:\n]{2,100})\s*:\s*([^\n]{5,650})/gi,
    /(?:trilogia|trilogy|saga|serie|series)\s+["“”']?([^:\n"“”']{2,100})["“”']?\s*:\s*([^\n]{5,650})/gi
  ];
  for(const re of patterns){let m;while((m=re.exec(p))){
    const saga=cleanSeriesName(m[1]),items=splitSeriesList(m[2],author),rel=relationFromItems(items,title,saga,source);
    if(rel)return rel;
  }}
  return null;
}
function headingSeriesName(text){
  const lines=String(text||'').split(/\r?\n/).slice(0,120);
  for(const raw of lines){
    const m=raw.match(/^\s*#{1,4}\s+(.+?)\s*$/);if(!m)continue;
    const h=clean(m[1]);if(!/(?:series|serie|saga|trilogy|trilogia)/i.test(h))continue;
    const s=cleanSeriesName(h);if(s)return s;
  }
  return'';
}
function linkedBookList(text,title,author,source=''){
  const p=String(text||''),authorOk=!author||norm(p).includes(norm(author));if(!authorOk)return null;
  const re=/\[([^\]\n]{2,190})\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g,items=[];let m;
  while((m=re.exec(p))){
    const label=cleanBookTitle(m[1]),url=String(m[2]||'');if(!label)continue;
    if(!/(?:\/libri?\/|\/books?\/|\/titoli?\/|\/prodotto\/|\/product\/)/i.test(url))continue;
    if(author&&sameTitle(label,author))continue;
    if(!items.some(x=>sameTitle(x,label)))items.push(label);
  }
  if(items.length<2)return null;
  const rel=relationFromItems(items,title,headingSeriesName(p),source);return rel;
}
function parseEvidence(text,title,author,source=''){
  return parseCompilation(text,title,author,source)||linkedBookList(text,title,author,source);
}
async function reader(url,timeout=9500){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
function searchLinks(text){
  const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(text||'')))){let u=m[1].replace(/&amp;/g,'&');try{
    const first=new URL(u);if(first.hostname.includes('google.')&&first.pathname==='/url'&&first.searchParams.get('q'))u=first.searchParams.get('q');
    const x=new URL(u),host=x.hostname.replace(/^www\./,'');if(BAD_HOSTS.test(host)||seen.has(u)||!/^https?:$/.test(x.protocol))continue;
    seen.add(u);out.push(u);
  }catch(e){}}
  return out;
}
function linkRank(u){
  try{const host=new URL(u).hostname.replace(/^www\./,'').toLowerCase();if(OFFICIAL_PUBLISHERS.test(host))return 100;if(BOOK_SOURCES.test(host))return 55;return 10}catch(e){return 0}
}
async function publisherEvidence(input){
  const title=clean(input.title),author=clean(input.author),code=String(input.code||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  const out={saga:'',prequel:'',sequel:'',checked:false,source:''};if(!title||!author)return out;
  const baseTitle=titleVariants(title)[0]||title,queries=[
    `"${baseTitle}" "${author}" trilogia serie saga`,
    `${code?`"${code}" `:''}"${author}" "${baseTitle}" serie`
  ];
  const jobs=[];for(const q of queries){jobs.push(reader(`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent(q)}`,10500));jobs.push(reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,10500))}
  const searchTexts=await Promise.all(jobs);out.checked=searchTexts.some(Boolean);
  for(const txt of searchTexts){if(!txt)continue;const rel=parseEvidence(txt,title,author,'search');if(rel){out.saga=rel.saga;out.prequel=rel.prequel;out.sequel=rel.sequel;out.source=rel.source;if(out.prequel&&out.sequel)return out}}
  const links=[];for(const txt of searchTexts)for(const u of searchLinks(txt))if(!links.includes(u))links.push(u);
  links.sort((a,b)=>linkRank(b)-linkRank(a));
  for(const u of links.slice(0,8)){
    const txt=await reader(u,9500);if(!txt)continue;out.checked=true;
    const n=norm(txt);if(author&&!n.includes(norm(author)))continue;
    if(code&&!n.includes(norm(code))&&!titleVariants(title).some(v=>n.includes(norm(v))))continue;
    const rel=parseEvidence(txt,title,author,u);if(!rel)continue;
    if(rel.saga)out.saga=rel.saga;if(rel.prequel)out.prequel=rel.prequel;if(rel.sequel)out.sequel=rel.sequel;out.source=u;
    if(out.prequel&&out.sequel)break;
  }
  return out;
}

window.__LIB_FIND_RELATIONS=async function(input={}){
  const key=[norm(input.code),norm(input.title),norm(input.author),norm(input.saga),'publisher-v1'].join('|');if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const base=await Promise.resolve(baseFindRelations(input)).catch(()=>({prequel:'',sequel:'',saga:'',sagaChecked:false,source:''}));
    if(base?.prequel&&base?.sequel&&base?.saga)return base;
    const extra=await publisherEvidence(input).catch(()=>({saga:'',prequel:'',sequel:'',checked:false,source:''}));
    return {
      prequel:cleanBookTitle(extra.prequel)||cleanBookTitle(base?.prequel)||'',
      sequel:cleanBookTitle(extra.sequel)||cleanBookTitle(base?.sequel)||'',
      saga:cleanSeriesName(extra.saga)||cleanSeriesName(base?.saga)||'',
      sagaChecked:Boolean(base?.sagaChecked||extra.checked||extra.saga),
      source:extra.source||base?.source||''
    };
  })();cache.set(key,promise);return promise;
};

setTimeout(()=>{
  try{
    if(typeof books==='undefined'||!Array.isArray(books)||typeof saveBooks!=='function')return;
    let changed=false;
    for(const b of books){
      if(Number(b.publisherRelationsMigrationVersion||0)>=1)continue;
      const code=String(b.code||b.isbn||'').replace(/[^0-9Xx]/g,'');
      if(code&&b.title&&b.author&&(!b.saga||!b.prequel||!b.sequel)){b.relationsLookupVersion=0;b.relationsLookupAt=0}
      b.publisherRelationsMigrationVersion=1;changed=true;
    }
    if(changed)saveBooks();
  }catch(e){}
},60);
})();
