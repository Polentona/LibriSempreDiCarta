(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V5)return;
root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V5=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];

function titleVariants(v){
  const raw=clean(v),out=[];
  const add=x=>{x=clean(x).replace(/\s*[\[(](?:vol(?:ume)?\.?\s*)?#?\d+(?:\.\d+)?[\])]\s*$/i,'').replace(/\s*(?:vol(?:ume)?\.?\s*)#?\d+(?:\.\d+)?\s*$/i,'').trim();if(x&&!out.some(y=>norm(y)===norm(x)))out.push(x)};
  add(raw);
  for(const p of raw.split(/\s*(?:[.:]|[-–—])\s*/))if(p.length>2)add(p);
  return out;
}
function sameTitle(a,b){
  for(const x0 of titleVariants(a))for(const y0 of titleVariants(b)){
    const x=norm(x0),y=norm(y0);if(!x||!y)continue;
    if(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))return true;
  }
  return false;
}
function safeTitle(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').replace(/[.;:\s]+$/,'').trim();
  const n=norm(x);if(!x||x.length<2||x.length>180||sameTitle(x,current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|website|homepage|language|released|published|pubblicato|during his|chancellor|speaker)\b/i.test(n))return'';
  return x;
}
function safeSaga(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di\s+|of\s+)?/i,'').trim();
  const n=norm(x);if(!x||x.length>100||n===norm(current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x)||/(?:18|19|20)\d{2}/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|released|published|pubblicato|romanzo|novel|libro|book|volume)\b/i.test(n))return'';
  return x;
}

const jsonCache=new Map(),textCache=new Map();
async function getJson(url,ms=9000){
  if(jsonCache.has(url))return jsonCache.get(url);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}})();
  jsonCache.set(url,p);return p;
}
async function jina(target,ms=9500){
  const key=target;if(textCache.has(key))return textCache.get(key);
  const p=(async()=>{
    const routes=['https://r.jina.ai/'+target];
    if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));
    for(const u of routes){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(r.ok){const s=await r.text();if(s.length>120)return s}}catch(e){}finally{clearTimeout(t)}}
    return'';
  })();textCache.set(key,p);return p;
}

function mdLinks(raw,kind){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){
    const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');
    if(kind==='book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }
  return out;
}
function goodreadsBookTitle(label){
  return safeTitle(clean(label)
    .replace(/\s*\([^()]{0,120}?,\s*#\s*\d+(?:\.\d+)?\)\s*$/i,'')
    .replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,''));
}
function seriesMetaFromLabel(label,title=''){
  const m=clean(label).match(/\(([^()]{2,120}?),\s*#\s*(\d+(?:\.\d+)?)\)\s*$/i);
  return m?{saga:safeSaga(m[1],title),position:Number(m[2])}:{saga:'',position:NaN};
}
function positionFromText(v){
  const s=clean(v);if(!s)return NaN;
  if(/(?:#|\b(?:book|libro|volume|vol)\s*)\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+/i.test(s))return NaN;
  if(/\bpart\s+\d+\s+of\s+\d+/i.test(s)||/\bparte\s+\d+\s+di\s+\d+/i.test(s))return NaN;
  const m=s.match(/(?:,|\s)#\s*(\d+(?:\.\d+)?)/i)||s.match(/\b(?:book|libro|volume|vol)\s*#?\s*(\d+(?:\.\d+)?)/i);
  return m?Number(m[1]):NaN;
}
function seriesHeadingNear(raw,link){
  const around=String(raw||'').slice(Math.max(0,link.index-360),link.index+link.label.length+360);
  const matches=[...around.matchAll(/^#{1,6}\s+(.{2,120}?)\s+#\s*(\d+(?:\.\d+)?)\s*$/gmi)];
  if(!matches.length)return{saga:'',position:NaN};
  const ln=norm(link.label);
  const hit=matches.find(m=>!ln||norm(m[1]).includes(ln)||ln.includes(norm(m[1])))||matches[matches.length-1];
  return{saga:safeSaga(hit[1]),position:Number(hit[2])};
}
function currentSeriesInfo(raw,link,searchLabel,title){
  const byLabel=seriesMetaFromLabel(searchLabel,title);if(Number.isFinite(byLabel.position))return byLabel;
  const around=String(raw||'').slice(Math.max(0,link.index-320),link.index+link.label.length+320);
  const p=positionFromText(around),h=seriesHeadingNear(raw,link);
  return{saga:h.saga||safeSaga(link.label,title),position:Number.isFinite(p)?p:h.position};
}
function parseSeriesRows(raw){
  const firstByPosition=new Map();let order=0;
  for(const l of mdLinks(raw,'book')){
    const t=goodreadsBookTitle(l.label);if(!t)continue;
    const around=String(raw||'').slice(Math.max(0,l.index-130),l.index+l.label.length+210);
    const position=Number.isFinite(positionFromText(l.label))?positionFromText(l.label):positionFromText(around);
    if(!Number.isFinite(position))continue;
    if(!firstByPosition.has(position))firstByPosition.set(position,{title:t,position,order:order++,url:l.url});
  }
  return[...firstByPosition.values()].sort((a,b)=>a.position-b.position||a.order-b.order);
}
function goodreadsBookId(url){return(String(url||'').match(/\/book\/show\/(\d+)/i)||[])[1]||''}
async function italianEditionTitle(row){
  if(!row?.url)return row?.title||'';
  const id=goodreadsBookId(row.url);if(!id)return row.title||'';
  const targets=[
    `https://www.goodreads.com/book/editions/${id}?utf8=%E2%9C%93&filter_by_format=&filter_by_language=it`,
    `https://www.goodreads.com/book/editions/${id}?filter_by_language=it`
  ];
  for(const target of targets){
    const raw=await jina(target,9000);if(!raw)continue;
    const links=mdLinks(raw,'book');
    for(let i=0;i<links.length;i++){
      const l=links[i],end=links[i+1]?.index??Math.min(String(raw).length,l.index+2200),block=String(raw).slice(l.index,end);
      if(!/Edition\s+language\s*:\s*Italian|Lingua\s+edizione\s*:\s*Italiano/i.test(block))continue;
      const meta=seriesMetaFromLabel(l.label);
      if(Number.isFinite(meta.position)&&Number.isFinite(row.position)&&meta.position!==row.position)continue;
      const t=goodreadsBookTitle(l.label);if(t)return t;
    }
    const chunks=String(raw).split(/Edition\s+language\s*:\s*Italian|Lingua\s+edizione\s*:\s*Italiano/i);
    for(let i=0;i<chunks.length-1;i++){
      const seg=chunks[i].slice(-1200),heads=[...seg.matchAll(/^#{1,5}\s+(.+)$/gm)];
      for(let j=heads.length-1;j>=0;j--){const t=goodreadsBookTitle(heads[j][1]);if(t&&!/^editions?$|^edizioni$/i.test(t))return t}
    }
  }
  return row.title||'';
}
async function goodreadsCandidates(title,author,isbn){
  const queries=uniq([isbn,`"${title}" ${author}`,`${title} ${author}`].filter(Boolean)),out=[],seen=new Set();
  for(const q of queries){
    const raw=await jina('https://www.goodreads.com/search?q='+encodeURIComponent(q)+'&search_type=books',8500);if(!raw)continue;
    for(const b of mdLinks(raw,'book')){
      if(seen.has(b.url))continue;seen.add(b.url);out.push({...b,exactIsbn:!!isbn&&q===isbn});if(out.length>=14)break;
    }
    if(out.length>=14)break;
  }
  return out;
}
function relationAccepted(r){return !!r&&(!!r.prequel||!!r.sequel);}
async function goodreadsOrdered(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const surname=norm(author).split(' ').pop(),candidates=await goodreadsCandidates(title,author,isbn);
  for(const b of candidates){
    const page=await jina(b.url,8500);if(!page||!norm(page).includes(surname))continue;
    const heading=(String(page).match(/^#\s+(.+)$/m)||[])[1]||goodreadsBookTitle(b.label)||b.label;
    const listed=goodreadsBookTitle(b.label)||b.label;
    if(!b.exactIsbn&&!sameTitle(heading,title)&&!sameTitle(listed,title))continue;
    for(const s of mdLinks(page,'series').slice(0,5)){
      const info=currentSeriesInfo(page,s,b.label,title);if(!Number.isFinite(info.position))continue;
      const seriesPage=await jina(s.url,9000);if(!seriesPage)continue;
      const rows=parseSeriesRows(seriesPage);if(!rows.some(x=>x.position===info.position))continue;
      const sequence=Number.isInteger(info.position)?rows.filter(x=>Number.isInteger(x.position)):rows;
      const lower=sequence.filter(x=>x.position<info.position).at(-1),higher=sequence.find(x=>x.position>info.position);
      if(!lower&&!higher)continue;
      const prequel=lower?await italianEditionTitle(lower):'';
      const sequel=higher?await italianEditionTitle(higher):'';
      const saga=info.saga||safeSaga(input.saga,title)||safeSaga(s.label,title);
      const r={saga,prequel:safeTitle(prequel,title),sequel:safeTitle(sequel,title),verified:true,authoritative:true,checked:true,source:s.url,method:'goodreads-ordered-series-primary',position:info.position};
      if(relationAccepted(r))return r;
    }
  }
  return null;
}

async function wikiSearch(lang,q,limit=7){
  const u=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=${limit}&format=json&origin=*&srsearch=${encodeURIComponent(q)}`;
  const d=await getJson(u);return(d?.query?.search||[]).map(x=>x.title).filter(Boolean);
}
async function wikiParse(lang,page){
  const u=`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text|wikitext&format=json&origin=*`;
  const d=await getJson(u);return{html:d?.parse?.text?.['*']||'',wt:d?.parse?.wikitext?.['*']||''};
}
function renderedFields(html,title){
  const out={saga:'',prequel:'',sequel:'',found:false};if(!html||typeof DOMParser==='undefined')return out;
  let doc;try{doc=new DOMParser().parseFromString(html,'text/html')}catch(e){return out}
  for(const table of doc.querySelectorAll('table.infobox, table.sinottico'))for(const tr of table.querySelectorAll('tr')){
    const th=tr.querySelector('th'),td=tr.querySelector('td');if(!th||!td)continue;
    const label=norm(th.textContent),value=clean(td.textContent);if(!value)continue;
    if(!out.saga&&/^(?:serie|series|book series|saga|ciclo|trilogia|trilogy)$/.test(label)){out.saga=safeSaga(value,title);out.found=true;continue}
    if(!out.prequel&&/^(?:preceduto da|preceduta da|preceded by|previous book|previous|prequel|libro precedente)$/.test(label)){out.prequel=safeTitle(value,title);out.found=true;continue}
    if(!out.sequel&&/^(?:seguito da|seguita da|followed by|next book|next|sequel|libro successivo)$/.test(label)){out.sequel=safeTitle(value,title);out.found=true}
  }
  return out;
}
function stripWiki(v){return String(v||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/>]*\/>/gi,' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\{\{[^{}]*\}\}/g,' ').replace(/''+/g,'').replace(/<[^>]+>/g,' ')}
function rawFields(wt,title){
  const out={saga:'',prequel:'',sequel:'',found:false},re=/^\s*\|\s*([^=|\n]+?)\s*=\s*(.*?)\s*$/gm;let m;
  while((m=re.exec(String(wt||'')))){
    const key=norm(m[1]).replace(/ /g,'_'),value=clean(stripWiki(m[2]));if(!value)continue;
    if(!out.saga&&/^(?:serie|series|series_name|book_series|saga|ciclo|trilogia|trilogy)$/.test(key)){out.saga=safeSaga(value,title);out.found=true;continue}
    if(!out.prequel&&/^(?:preceduto|preceduta|preceduto_da|preceduta_da|preceded|preceded_by|previous|previous_book|prequel|libro_precedente)$/.test(key)){out.prequel=safeTitle(value,title);out.found=true;continue}
    if(!out.sequel&&/^(?:seguito|seguita|seguito_da|seguita_da|followed|followed_by|next|next_book|sequel|libro_successivo)$/.test(key)){out.sequel=safeTitle(value,title);out.found=true}
  }
  return out;
}
function mergeFields(a,b,title,hint,blob){
  let saga=safeSaga(a?.saga||b?.saga,title),h=safeSaga(hint,title);if(!saga&&h&&norm(blob).includes(norm(h)))saga=h;
  return{saga,prequel:safeTitle(a?.prequel||b?.prequel,title),sequel:safeTitle(a?.sequel||b?.sequel,title),found:!!(a?.found||b?.found)};
}
async function wikipediaStructured(input={}){
  const title=clean(input.title),author=clean(input.author),hint=safeSaga(input.saga,title);if(!title||!author)return null;
  for(const lang of ['it','en']){
    const pages=uniq([...(await wikiSearch(lang,`"${title}" "${author}"`,7)),...(await wikiSearch(lang,`${title} ${author}`,7))]).slice(0,12);
    for(const page of pages){
      if(!sameTitle(page,title)&&!titleVariants(title).some(v=>norm(page).includes(norm(v))))continue;
      const p=await wikiParse(lang,page);if(!p.html&&!p.wt)continue;
      const blob=(p.html||'')+' '+(p.wt||'');if(!norm(blob).includes(norm(author)))continue;
      const f=mergeFields(renderedFields(p.html,title),rawFields(p.wt,title),title,hint,blob);if(!f.prequel&&!f.sequel)continue;
      return{saga:f.saga,prequel:f.prequel,sequel:f.sequel,verified:true,authoritative:true,checked:true,source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g,'_'))}`,method:'structured-book-infobox-fallback'};
    }
  }
  return null;
}

const resolveCache=new Map();
async function resolve(input={}){
  const key=[code(input.code),norm(input.title),norm(input.author),norm(input.saga)].join('|');if(resolveCache.has(key))return resolveCache.get(key);
  const p=(async()=>{
    const diag={input:{code:code(input.code),title:clean(input.title),author:clean(input.author),saga:clean(input.saga)},attempts:[]};root.__LIB_SERIES_V5_LAST=diag;root.__LIB_SERIES_V4_LAST=diag;
    const gr=await goodreadsOrdered(input).catch(()=>null);diag.attempts.push({source:'goodreads-ordered-series',result:gr});if(relationAccepted(gr)){diag.result=gr;return gr}
    const wi=await wikipediaStructured(input).catch(()=>null);diag.attempts.push({source:'wikipedia-structured-book-fallback',result:wi});if(relationAccepted(wi)){diag.result=wi;return wi}
    const empty={saga:safeSaga(input.saga,input.title),prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:'',method:'none'};diag.result=empty;return empty;
  })();resolveCache.set(key,p);return p;
}

root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_SERIES_NEIGHBORS=resolve;
root.__LIB_FIND_RELATIONS=resolve;
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_SERIES_RELATION_POLICY='single-owner-goodreads-ordered-series-then-structured-book-v5';

let active=false,manual=new Set(),timer=null,seq=0;
function values(){const get=id=>clean(document.getElementById(id)?.value||'');return{code:code(get('editCode')),title:get('editTitle'),author:get('editAuthor'),saga:get('editSaga')}}
function setAuto(id,value){const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function schedule(ms=250){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){
  const token=++seq,input=values();if(!active||!input.code||!input.title||!input.author)return;
  const r=await resolve(input).catch(()=>null);if(token!==seq||!active)return;const now=values();if(now.code!==input.code||!sameTitle(now.title,input.title)||norm(now.author)!==norm(input.author))return;
  if(r&&r.verified){setAuto('editSaga',r.saga||input.saga||'');setAuto('editPrequel',r.prequel||'');setAuto('editSequel',r.sequel||'')}else{setAuto('editPrequel','');setAuto('editSequel','')}
  root.__LIB_SERIES_V5_APPLIED={input,result:r,at:Date.now()};root.__LIB_SERIES_V4_APPLIED=root.__LIB_SERIES_V5_APPLIED;
}
function activate(){active=true;manual.clear();resolveCache.clear();schedule(700)}
function boot(){
  const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,150);return}
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor','editSaga','editPrequel','editSequel']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('input',e=>{if(e.isTrusted&&['editSaga','editPrequel','editSequel'].includes(id))manual.add(id);if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(450)});
    el.addEventListener('change',()=>{if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(250)});
  }
  new MutationObserver(()=>{if(!dlg.open){active=false;manual.clear();clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});
}
boot();
root.__LIB_SERIES_V5_TEST__={goodreadsOrdered,wikipediaStructured,resolve,parseSeriesRows,seriesMetaFromLabel,positionFromText,italianEditionTitle,safeTitle,safeSaga,sameTitle};
})();