(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7)return;
root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const legacyResolver=typeof root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS==='function'?root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS:null;

function isbn13to10(v){
  const n=code(v);if(!/^978\d{10}$/.test(n))return'';
  const core=n.slice(3,12);let sum=0;for(let i=0;i<9;i++)sum+=Number(core[i])*(10-i);
  const c=(11-sum%11)%11;return core+(c===10?'X':String(c));
}
function isbnAliases(v){const n=code(v),x=isbn13to10(n);return [...new Set([n,x].filter(Boolean))]}
function rawContainsIsbn(raw,isbn){
  const aa=isbnAliases(isbn);if(!aa.length)return false;
  const tokens=String(raw||'').match(/(?:97[89][0-9Xx\s-]{9,24}|[0-9][0-9Xx\s-]{8,20})/g)||[];
  return tokens.some(x=>aa.includes(code(x)));
}
function titleVariants(v){
  const raw=clean(v),out=[];
  const add=x=>{x=clean(x).replace(/\s*[\[(](?:vol(?:ume)?\.?\s*)?#?\d+(?:\.\d+)?[\])]\s*$/i,'').replace(/\s*(?:vol(?:ume)?\.?\s*)#?\d+(?:\.\d+)?\s*$/i,'').trim();if(x&&!out.some(y=>norm(y)===norm(x)))out.push(x)};
  add(raw);for(const p of raw.split(/\s*(?:[.:]|[-–—])\s*/))if(p.length>2)add(p);return out;
}
function sameTitle(a,b){
  for(const x0 of titleVariants(a))for(const y0 of titleVariants(b)){
    const x=norm(x0),y=norm(y0);if(!x||!y)continue;
    if(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))return true;
  }
  return false;
}
function safeTitle(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'')
    .replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,'')
    .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'')
    .replace(/[.;:\s]+$/,'').trim();
  const n=norm(x);if(!x||x.length<2||x.length>180||sameTitle(x,current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|website|homepage|language|released|published|pubblicato)\b/i.test(n))return'';
  return x;
}
function safeSaga(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'')
    .replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di\s+|of\s+)?/i,'')
    .replace(/\s+(?:series|serie|saga|trilogy|trilogia|cycle|ciclo)\s*$/i,'')
    .replace(/^(?:dr\.?|doctor|dott\.?|dottor)\s+/i,'').trim();
  const n=norm(x);if(!x||x.length>100||n===norm(current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x)||/(?:18|19|20)\d{2}/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|released|published|pubblicato|romanzo|novel|libro|book|volume)\b/i.test(n))return'';
  return x;
}
function sagaKey(v){return norm(v).replace(/\b(?:series|serie|saga|trilogy|trilogia|cycle|ciclo)\b/g,' ').replace(/^(?:dr|doctor|dott|dottor)\s+/,'').replace(/\s+/g,' ').trim()}
function sameSaga(a,b){const x=sagaKey(a),y=sagaKey(b);return !!x&&!!y&&(x===y||(x.length>=5&&y.includes(x))||(y.length>=5&&x.includes(y)))}
function positionFromText(v){
  const s=clean(v);if(!s)return NaN;
  if(/(?:#|\b(?:book|libro|volume|vol)\s*)\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+/i.test(s))return NaN;
  const m=s.match(/(?:,|\s)#\s*(\d+(?:\.\d+)?)/i)||s.match(/\b(?:book|libro|volume|vol)\s*#?\s*(\d+(?:\.\d+)?)/i);
  return m?Number(m[1]):NaN;
}
function relationComplete(r){
  if(!r?.authoritative)return false;
  if(r.initial&&r.terminal)return true;
  if(r.initial)return !!r.sequel;
  if(r.terminal)return !!r.prequel;
  return !!r.prequel&&!!r.sequel;
}
function normalizeRelation(r,input={}){
  if(!r)return null;
  return {...r,saga:safeSaga(r.saga||input.saga,input.title),prequel:safeTitle(r.prequel,input.title),sequel:safeTitle(r.sequel,input.title)};
}
function mergeRelation(a,b,input={}){
  if(!a&&!b)return null;const x=a||{},y=b||{};
  return normalizeRelation({
    saga:y.saga||x.saga||input.saga,
    prequel:y.prequel||x.prequel||'',
    sequel:y.sequel||x.sequel||'',
    verified:!!(x.verified||y.verified),authoritative:!!(x.authoritative||y.authoritative),checked:true,
    source:[x.source,y.source].filter(Boolean).join(' + '),
    method:[x.method,y.method].filter(Boolean).join('+'),
    position:Number.isFinite(y.position)?y.position:x.position,
    initial:!!(x.initial||y.initial),terminal:!!(x.terminal||y.terminal),
    localizedPrequel:!!(y.localizedPrequel||x.localizedPrequel),
    localizedSequel:!!(y.localizedSequel||x.localizedSequel)
  },input);
}

const successTextCache=new Map();
async function fetchText(url,ms=7200){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(!r.ok)return'';const s=await r.text();return s.length>100?s:''}catch(e){return''}finally{clearTimeout(t)}
}
async function jina(target,ms=7200){
  if(successTextCache.has(target))return successTextCache.get(target);
  const routes=['https://r.jina.ai/'+target];
  if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));
  for(const u of routes){const s=await fetchText(u,ms);if(s){successTextCache.set(target,s);return s}}
  return'';
}
function mdLinks(raw,kind=''){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){
    const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');
    if(kind==='goodreads-book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='goodreads-series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;
    if(kind==='storygraph-book'&&!/(?:app|beta)\.thestorygraph\.com\/books\/[0-9a-f-]{20,}/i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }
  return out;
}
function goodreadsBookTitle(label){
  return safeTitle(clean(label).replace(/\s*\([^()]{0,120}?,\s*#\s*\d+(?:\.\d+)?\)\s*$/i,'').replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,''));
}
function seriesMetaFromLabel(label,title=''){
  const m=clean(label).match(/\(([^()]{2,120}?),\s*#\s*(\d+(?:\.\d+)?)\)\s*$/i);
  return m?{saga:safeSaga(m[1],title),position:Number(m[2])}:{saga:'',position:NaN};
}
function headingTitle(raw){
  for(const m of String(raw||'').matchAll(/^#{1,4}\s+(.+)$/gm)){
    const t=safeTitle(m[1]);if(t&&!/^(?:editions?|reviews?|series)$/i.test(norm(t)))return t;
  }
  return'';
}
function parseGoodreadsSeriesRows(raw){
  const s=String(raw||''),heads=[...s.matchAll(/^###\s+Book\s+([^\n]+)\s*$/gmi)],rows=[];
  for(let i=0;i<heads.length;i++){
    const token=clean(heads[i][1]);if(/[-–—]/.test(token))continue;
    const pos=Number(token);if(!Number.isFinite(pos))continue;
    const start=heads[i].index+heads[i][0].length,end=heads[i+1]?.index??Math.min(s.length,start+1800),chunk=s.slice(start,end);
    const link=mdLinks(chunk,'goodreads-book')[0];if(!link)continue;
    const title=goodreadsBookTitle(link.label);if(title)rows.push({title,position:pos,url:link.url,order:rows.length});
  }
  if(rows.length)return[...new Map(rows.map(r=>[r.position,r])).values()].sort((a,b)=>a.position-b.position||a.order-b.order);
  const first=new Map();let order=0;
  for(const l of mdLinks(s,'goodreads-book')){
    const title=goodreadsBookTitle(l.label);if(!title)continue;
    const around=s.slice(Math.max(0,l.index-180),l.index+l.label.length+240),position=positionFromText(around);
    if(Number.isFinite(position)&&!first.has(position))first.set(position,{title,position,url:l.url,order:order++});
  }
  return[...first.values()].sort((a,b)=>a.position-b.position||a.order-b.order);
}
async function goodreadsCandidates(title,author,isbn){
  const queries=uniq([isbn,`"${title}" ${author}`].filter(Boolean)),out=[],seen=new Set();
  for(const q of queries){
    const raw=await jina('https://www.goodreads.com/search?q='+encodeURIComponent(q)+'&search_type=books',6500);if(!raw)continue;
    for(const b of mdLinks(raw,'goodreads-book'))if(!seen.has(b.url)){seen.add(b.url);out.push(b);if(out.length>=10)break}
    if(out.length)break;
  }
  return out;
}
async function goodreadsOrdered(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const surname=norm(author).split(' ').pop(),candidates=await goodreadsCandidates(title,author,isbn);
  for(const b of candidates.slice(0,8)){
    const page=await jina(b.url,6500);if(!page||!norm(page).includes(surname))continue;
    const listed=goodreadsBookTitle(b.label)||b.label,head=headingTitle(page)||listed,exactIsbn=isbn?rawContainsIsbn(page,isbn):false;
    if(isbn&&!exactIsbn&&!sameTitle(head,title)&&!sameTitle(listed,title))continue;
    if(!isbn&&!sameTitle(head,title)&&!sameTitle(listed,title))continue;
    const labelMeta=seriesMetaFromLabel(b.label,title);
    for(const s of mdLinks(page,'goodreads-series').slice(0,4)){
      const around=String(page).slice(Math.max(0,s.index-500),s.index+s.label.length+500);
      const pos=Number.isFinite(labelMeta.position)?labelMeta.position:positionFromText(around);if(!Number.isFinite(pos))continue;
      const seriesPage=await jina(s.url,7000);if(!seriesPage)continue;
      const rows=parseGoodreadsSeriesRows(seriesPage);if(!rows.some(x=>x.position===pos))continue;
      const sequence=Number.isInteger(pos)?rows.filter(x=>Number.isInteger(x.position)):rows;
      const lower=sequence.filter(x=>x.position<pos).at(-1),higher=sequence.find(x=>x.position>pos),min=sequence[0]?.position,max=sequence.at(-1)?.position;
      const initial=!lower&&pos===min,terminal=!higher&&pos===max;
      return normalizeRelation({
        saga:labelMeta.saga||safeSaga(s.label,title),
        prequel:lower?.title||'',sequel:higher?.title||'',verified:true,authoritative:true,checked:true,
        source:s.url,method:'goodreads-ordered-series-primary-v7',position:pos,initial,terminal,
        prequelRow:lower||null,sequelRow:higher||null
      },input);
    }
  }
  return null;
}
function goodreadsBookId(url){return(String(url||'').match(/\/book\/show\/(\d+)/i)||[])[1]||''}
async function goodreadsItalianTitle(row){
  const id=goodreadsBookId(row?.url);if(!id)return'';
  const raw=await jina(`https://www.goodreads.com/book/editions/${id}?filter_by_language=it`,6500);if(!raw)return'';
  const links=mdLinks(raw,'goodreads-book');
  for(let i=0;i<links.length;i++){
    const l=links[i],end=links[i+1]?.index??Math.min(String(raw).length,l.index+2200),block=String(raw).slice(l.index,end);
    if(!/Edition\s+language\s*:\s*Italian|Lingua\s+edizione\s*:\s*Italiano|Language\s*:\s*Italian/i.test(block))continue;
    const t=goodreadsBookTitle(l.label);if(t)return t;
  }
  return'';
}

function storyGraphInfo(raw,title=''){
  const s=String(raw||'');
  for(const m of s.matchAll(/(?:^|\n)\s*([^\n#]{2,100}?)\s+#\s*(\d+(?:\.\d+)?)\s*(?=\n|$)/gmi)){
    const saga=safeSaga(m[1],title),position=Number(m[2]);if(saga&&Number.isFinite(position))return{saga,position};
  }
  return{saga:'',position:NaN};
}
function storyGraphTitle(raw){
  const s=String(raw||'');for(const m of s.matchAll(/^###\s+(.+)$/gm)){const t=safeTitle(m[1]);if(t&&!/^(?:editions?|remove book)$/i.test(norm(t)))return t}return headingTitle(s);
}
async function storyGraphItalianTitle(bookUrl){
  const base=String(bookUrl||'').replace(/\?.*$/,'').replace(/\/$/,'');if(!base)return'';
  for(const u of [base+'/editions',base+'/editions?page=2']){
    const raw=await jina(u,6500);if(!raw)continue;const s=String(raw),marks=[...s.matchAll(/Language\s*:\s*Italian|Lingua\s*:\s*Italiano/gi)];
    for(const mark of marks){
      const seg=s.slice(Math.max(0,mark.index-1500),mark.index),heads=[...seg.matchAll(/^###\s+(.+)$/gm)];
      for(let i=heads.length-1;i>=0;i--){const t=safeTitle(heads[i][1]);if(t&&!/^(?:editions?|remove book)$/i.test(norm(t)))return t}
    }
  }
  return'';
}
async function storyGraphSearchPages(query){
  const targets=[
    'https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(query),
    'https://html.duckduckgo.com/html/?q='+encodeURIComponent('site:app.thestorygraph.com/books '+query)
  ],out=[],seen=new Set();
  for(const target of targets){
    const raw=await jina(target,6500);if(!raw)continue;
    for(const l of mdLinks(raw,'storygraph-book')){const u=l.url.replace(/\/editions.*$/,'');if(!seen.has(u)){seen.add(u);out.push(u)}}
    if(out.length>=8)break;
  }
  return out;
}
async function storyGraphCurrent(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const surname=norm(author).split(' ').pop(),queries=uniq([isbn&&`"${isbn}" "${title}"`,`"${title}" "${author}"`].filter(Boolean));
  for(const q of queries)for(const url of await storyGraphSearchPages(q)){
    const raw=await jina(url,6500);if(!raw||!norm(raw).includes(surname))continue;
    const t=storyGraphTitle(raw),exact=isbn?rawContainsIsbn(raw,isbn):false;if(!exact&&!sameTitle(t,title))continue;
    const info=storyGraphInfo(raw,title);if(Number.isFinite(info.position))return{...info,url,title:t};
  }
  return null;
}
async function storyGraphNeighbor(saga,position,author){
  if(!saga||!Number.isFinite(position)||position<1)return null;
  const surname=norm(author).split(' ').pop();
  for(const url of await storyGraphSearchPages(`"${saga} #${position}" "${author}"`)){
    const raw=await jina(url,6500);if(!raw||!norm(raw).includes(surname))continue;
    const info=storyGraphInfo(raw);if(!sameSaga(info.saga,saga)||info.position!==position)continue;
    const canonical=storyGraphTitle(raw);if(!canonical)continue;
    const italian=await storyGraphItalianTitle(url);
    return{title:italian||canonical,canonical,url,position,localized:!!italian};
  }
  return null;
}
async function storyGraphEnrich(input={},seed=null){
  let current=await storyGraphCurrent(input).catch(()=>null);
  const pos=Number.isFinite(current?.position)?current.position:seed?.position;
  const saga=safeSaga(current?.saga||seed?.saga||input.saga,input.title);
  if(!saga||!Number.isFinite(pos))return null;
  if(Number.isFinite(seed?.position)&&Number.isFinite(current?.position)&&seed.position!==current.position)return null;
  let prequel=seed?.prequel||'',sequel=seed?.sequel||'',localizedPrequel=false,localizedSequel=false;
  if(pos>1&&!seed?.initial){
    const n=await storyGraphNeighbor(saga,pos-1,input.author).catch(()=>null);
    if(n?.title){prequel=n.title;localizedPrequel=!!n.localized}
  }
  if(!seed?.terminal){
    const n=await storyGraphNeighbor(saga,pos+1,input.author).catch(()=>null);
    if(n?.title){sequel=n.title;localizedSequel=!!n.localized}
  }
  if(seed?.prequelRow&&!localizedPrequel){
    const it=await goodreadsItalianTitle(seed.prequelRow).catch(()=>null);if(it){prequel=it;localizedPrequel=true}
  }
  if(seed?.sequelRow&&!localizedSequel){
    const it=await goodreadsItalianTitle(seed.sequelRow).catch(()=>null);if(it){sequel=it;localizedSequel=true}
  }
  return normalizeRelation({
    saga,prequel,sequel,verified:true,authoritative:true,checked:true,
    source:[seed?.source,current?.url,'https://app.thestorygraph.com/'].filter(Boolean).join(' + '),
    method:'goodreads-order-storygraph-localization-v7',position:pos,
    initial:!!seed?.initial||(pos===1&&!prequel),terminal:!!seed?.terminal,
    localizedPrequel,localizedSequel
  },input);
}

const stableCache=new Map(),pendingLocalization=new Map();
function keyOf(input){return[code(input.code),norm(input.title),norm(input.author),norm(input.saga)].join('|')}
async function baseResolve(input={}){
  let gr=await goodreadsOrdered(input).catch(()=>null);
  if(relationComplete(gr))return gr;
  let sg=await storyGraphEnrich(input,gr).catch(()=>null),best=mergeRelation(gr,sg,input);
  if(relationComplete(best))return best;
  if(legacyResolver){
    const old=await Promise.resolve(legacyResolver(input)).catch(()=>null);
    best=mergeRelation(best,old,input);if(best&&(best.prequel||best.sequel))return best;
  }
  return best||{saga:safeSaga(input.saga,input.title),prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:'',method:'none-v7'};
}
async function resolve(input={}){
  const key=keyOf(input),hit=stableCache.get(key);if(hit)return hit;
  const base=normalizeRelation(await baseResolve(input),input);
  if(!base)return null;
  if(!relationComplete(base))return base;
  const task=storyGraphEnrich(input,base).then(loc=>{
    const out=relationComplete(loc)?mergeRelation(base,loc,input):base;
    if(relationComplete(out))stableCache.set(key,out);
    return out;
  }).catch(()=>base);
  pendingLocalization.set(key,task);
  const quick=await Promise.race([task,wait(2800).then(()=>null)]);
  if(quick){pendingLocalization.delete(key);return quick}
  task.finally(()=>pendingLocalization.delete(key));
  return {...base,localizationPending:true};
}

root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_SERIES_NEIGHBORS=resolve;
root.__LIB_FIND_RELATIONS=resolve;
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_RESOLVE_BOUNDED_RELATIONS=resolve;
root.__LIB_SERIES_RELATION_POLICY='goodreads-order-storygraph-localization-retry-v7';

let active=false,manual=new Set(),timer=null,seq=0,retries=0;
function values(){
  if(typeof document==='undefined')return{code:'',title:'',author:'',saga:''};
  const get=id=>clean(document.getElementById(id)?.value||'');
  return{code:code(get('editCode')),title:get('editTitle'),author:get('editAuthor'),saga:get('editSaga')};
}
function setAuto(id,value,allowEmpty=false){
  if(typeof document==='undefined')return;const el=document.getElementById(id);if(!el||manual.has(id))return;
  const v=clean(value);if(!v&&!allowEmpty)return;if(el.value===v)return;
  el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
}
function sameInput(a,b){return a.code===b.code&&sameTitle(a.title,b.title)&&norm(a.author)===norm(b.author)}
function applyResult(input,r){
  if(!active||!r?.authoritative||!sameInput(values(),input))return;
  if(r.saga)setAuto('editSaga',r.saga);
  if(r.prequel)setAuto('editPrequel',r.prequel);else if(r.initial)setAuto('editPrequel','',true);
  if(r.sequel)setAuto('editSequel',r.sequel);else if(r.terminal)setAuto('editSequel','',true);
  root.__LIB_SERIES_V7_APPLIED={input,result:r,at:Date.now()};
}
function schedule(ms=350){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){
  const token=++seq,input=values();if(!active)return;
  if(!input.code||!input.title||!input.author){if(retries<8){retries++;schedule(700)}return}
  const r=await resolve(input).catch(()=>null);if(token!==seq||!active||!sameInput(values(),input))return;
  applyResult(input,r);
  const key=keyOf(input),p=pendingLocalization.get(key);
  if(p)p.then(loc=>{if(active&&sameInput(values(),input))applyResult(input,loc)});
  if((!relationComplete(r)||r?.localizationPending)&&retries<3){retries++;schedule(4200)}
}
function activate(){active=true;manual.clear();retries=0;stableCache.clear();successTextCache.clear();schedule(500)}
function boot(){
  if(typeof document==='undefined')return;const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,150);return}
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor','editSaga','editPrequel','editSequel']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('input',e=>{
      if(e.isTrusted&&['editSaga','editPrequel','editSequel'].includes(id))manual.add(id);
      if(active&&['editTitle','editAuthor'].includes(id)){retries=0;schedule(e.isTrusted?250:500)}
    });
    el.addEventListener('change',e=>{if(active&&['editTitle','editAuthor'].includes(id)){retries=0;schedule(e.isTrusted?180:450)}});
  }
  new MutationObserver(()=>{if(dlg.open)activate();else{active=false;manual.clear();clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});
}
boot();

root.__LIB_SERIES_V7_TEST__={resolve,baseResolve,goodreadsOrdered,parseGoodreadsSeriesRows,goodreadsItalianTitle,storyGraphCurrent,storyGraphNeighbor,storyGraphEnrich,relationComplete,mergeRelation,safeTitle,safeSaga,sameTitle,sameSaga};
})();
