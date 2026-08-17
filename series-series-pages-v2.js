(()=>{
if(window.__LIB_SERIES_PAGES_V2)return;
window.__LIB_SERIES_PAGES_V2=true;

const cache=new Map();

function clean(v){
  return String(v||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/<[^>]+>/g,' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
    .replace(/[\*_`~]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
}
function esc(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function slug(v){return norm(v).replace(/'/g,'').replace(/\s+/g,'-').replace(/^-+|-+$/g,'')}
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
function splitSeriesList(v,author=''){
  let raw=clean(v);
  if(author){const a=esc(clean(author));raw=raw.replace(new RegExp('\\s[-–—]\\s+'+a+'\\b.*$','i'),'')}
  raw=raw.replace(/\s+(?:e|and)\s+(?=[A-ZÀ-ÖØ-Ý“"'])/g,', ');
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
function parseAdjacentSeriesList(text,title,author,sagaHint,source=''){
  const lines=String(text||'').split(/\r?\n/).map(x=>clean(x.replace(/^\s*#{1,6}\s*/,''))).filter(Boolean);
  const hint=norm(sagaHint);if(!hint)return null;
  for(let i=0;i<lines.length;i++){
    const n=norm(lines[i]);
    if(!n.includes(hint)||!/(?:trilogia|trilogy|saga|serie|series)/i.test(lines[i]))continue;
    for(let j=i;j<=Math.min(lines.length-1,i+4);j++){
      if(j===i&&/:/.test(lines[j]))continue;
      const items=splitSeriesList(lines[j],author),rel=relationFromItems(items,title,sagaHint,source);
      if(rel)return rel;
    }
  }
  return null;
}
async function reader(url,timeout=8500){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});
    if(!r.ok)return'';
    return await r.text();
  }catch(e){return''}finally{clearTimeout(timer)}
}
function directSeriesUrls(sagaHint){
  const s=slug(cleanSeriesName(sagaHint));if(!s)return[];
  const slugs=[s];
  if(s.endsWith('-series'))slugs.push(s.replace(/-series$/,''));else slugs.push(s+'-series');
  const roots=['https://www.tealibri.it/serie/','https://www.lafeltrinelli.it/serie/','https://www.ibs.it/serie/'];
  const out=[];
  for(const root of roots)for(const x of slugs){const u=root+x;if(!out.includes(u))out.push(u)}
  return out;
}
async function directSeriesEvidence(input,sagaHint){
  const title=clean(input.title),author=clean(input.author),saga=cleanSeriesName(sagaHint);
  const out={saga:'',prequel:'',sequel:'',source:''};if(!title||!author||!saga)return out;
  const urls=directSeriesUrls(saga),pages=await Promise.all(urls.map(async url=>({url,text:await reader(url)})));
  for(const page of pages){
    if(!page.text)continue;
    const n=norm(page.text);
    if(author&&!n.includes(norm(author)))continue;
    const rel=parseCompilation(page.text,title,author,page.url)||parseAdjacentSeriesList(page.text,title,author,saga,page.url);
    if(!rel)continue;
    out.saga=cleanSeriesName(rel.saga)||saga;out.prequel=cleanBookTitle(rel.prequel);out.sequel=cleanBookTitle(rel.sequel);out.source=page.url;
    if(out.prequel||out.sequel)return out;
  }
  return out;
}
function install(){
  const current=window.__LIB_FIND_RELATIONS;
  if(typeof current!=='function'){setTimeout(install,100);return}
  if(current.__seriesPagesV2)return;
  const base=current;
  const wrapped=async input=>{
    let b={prequel:'',sequel:'',saga:'',sagaChecked:false,source:''};
    try{b=await Promise.resolve(base(input||{}))||b}catch(e){}
    if(b.prequel&&b.sequel)return b;
    const sagaHint=cleanSeriesName(b.saga)||cleanSeriesName(input?.saga);
    if(!sagaHint)return b;
    const key=[norm(input?.code),norm(input?.title),norm(input?.author),norm(sagaHint),'series-pages-v2'].join('|');
    let p=cache.get(key);
    if(!p){p=directSeriesEvidence(input||{},sagaHint).catch(()=>({saga:'',prequel:'',sequel:'',source:''}));cache.set(key,p)}
    const extra=await p;
    return {
      ...b,
      prequel:cleanBookTitle(extra.prequel)||cleanBookTitle(b.prequel)||'',
      sequel:cleanBookTitle(extra.sequel)||cleanBookTitle(b.sequel)||'',
      saga:cleanSeriesName(b.saga)||cleanSeriesName(extra.saga)||sagaHint,
      sagaChecked:Boolean(b.sagaChecked||extra.saga||sagaHint),
      source:extra.source||b.source||''
    };
  };
  wrapped.__seriesPagesV2=true;
  window.__LIB_FIND_RELATIONS=wrapped;
}
install();

setTimeout(()=>{
  try{
    if(typeof books==='undefined'||!Array.isArray(books)||typeof saveBooks!=='function')return;
    let changed=false;
    for(const b of books){
      if(Number(b.seriesPagesMigrationVersion||0)>=2)continue;
      const code=String(b.code||b.isbn||'').replace(/[^0-9Xx]/g,'');
      if(code&&b.title&&b.author&&b.saga&&(!b.prequel||!b.sequel)){b.relationsLookupVersion=0;b.relationsLookupAt=0}
      b.seriesPagesMigrationVersion=2;changed=true;
    }
    if(changed)saveBooks();
  }catch(e){}
},120);
})();
