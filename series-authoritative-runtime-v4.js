(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4)return;
root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4=true;

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
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').replace(/[.;:\s]+$/,'').trim();
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
  const tables=[...doc.querySelectorAll('table.infobox, table.sinottico')];
  for(const table of tables)for(const tr of table.querySelectorAll('tr')){
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
  const out={saga:'',prequel:'',sequel:'',found:false};
  const re=/^\s*\|\s*([^=|\n]+?)\s*=\s*(.*?)\s*$/gm;let m;
  while((m=re.exec(String(wt||'')))){
    const key=norm(m[1]).replace(/ /g,'_'),value=clean(stripWiki(m[2]));if(!value)continue;
    if(!out.saga&&/^(?:serie|series|series_name|book_series|saga|ciclo|trilogia|trilogy)$/.test(key)){out.saga=safeSaga(value,title);out.found=true;continue}
    if(!out.prequel&&/^(?:preceduto|preceduta|preceduto_da|preceduta_da|preceded|preceded_by|previous|previous_book|prequel|libro_precedente)$/.test(key)){out.prequel=safeTitle(value,title);out.found=true;continue}
    if(!out.sequel&&/^(?:seguito|seguita|seguito_da|seguita_da|followed|followed_by|next|next_book|sequel|libro_successivo)$/.test(key)){out.sequel=safeTitle(value,title);out.found=true}
  }
  return out;
}
function mergeFields(a,b,title,hint,blob){
  let saga=safeSaga(a?.saga||b?.saga,title);
  const h=safeSaga(hint,title);if(!saga&&h&&norm(blob).includes(norm(h)))saga=h;
  return{saga,prequel:safeTitle(a?.prequel||b?.prequel,title),sequel:safeTitle(a?.sequel||b?.sequel,title),found:!!(a?.found||b?.found)};
}
function relationAccepted(r){return !!r&&(!!r.prequel||!!r.sequel);}
async function wikipediaStructured(input={}){
  const title=clean(input.title),author=clean(input.author),hint=safeSaga(input.saga,title);if(!title||!author)return null;
  for(const lang of ['it','en']){
    const pages=uniq([...(await wikiSearch(lang,`"${title}" "${author}"`,7)),...(await wikiSearch(lang,`${title} ${author}`,7))]).slice(0,12);
    for(const page of pages){
      if(!sameTitle(page,title)&&!titleVariants(title).some(v=>norm(page).includes(norm(v))))continue;
      const p=await wikiParse(lang,page);if(!p.html&&!p.wt)continue;
      const blob=(p.html||'')+' '+(p.wt||'');if(!norm(blob).includes(norm(author)))continue;
      const f=mergeFields(renderedFields(p.html,title),rawFields(p.wt,title),title,hint,blob);
      if(!f.prequel&&!f.sequel)continue;
      const r={saga:f.saga,prequel:f.prequel,sequel:f.sequel,verified:true,authoritative:true,checked:true,source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g,'_'))}`,method:'structured-book-infobox'};
      root.__LIB_SERIES_V4_SOURCE={lang,page,fields:f};return r;
    }
  }
  return null;
}

function mdLinks(raw,kind){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');if(kind==='book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;if(kind==='series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}}
  return out;
}
function goodreadsBookTitle(label){return safeTitle(clean(label).replace(/\s*\([^()]{0,100}?,\s*#\s*\d+(?:\.\d+)?\)\s*$/i,''));}
function posFrom(label,around=''){
  for(const s of [label,around]){const m=String(s||'').match(/(?:,|\s)#\s*(\d+(?:\.\d+)?)/i)||String(s||'').match(/\b(?:book|libro|volume|vol)\s*#?\s*(\d+(?:\.\d+)?)/i);if(m)return Number(m[1])}
  return NaN;
}
function sagaFromSeriesLabel(label,title){return safeSaga(clean(label).replace(/\s+#\s*\d+(?:\.\d+)?\s*$/,''),title);}
async function goodreadsOrdered(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const search=await jina('https://www.goodreads.com/search?q='+encodeURIComponent([isbn,title,author].filter(Boolean).join(' '))+'&search_type=books',8500);if(!search)return null;
  const surname=norm(author).split(' ').pop();
  for(const b of mdLinks(search,'book').slice(0,7)){
    const page=await jina(b.url,8500);if(!page||!norm(page).includes(surname))continue;
    const heading=(String(page).match(/^#\s+(.+)$/m)||[])[1]||b.label;if(!sameTitle(heading,title)&&!sameTitle(b.label,title))continue;
    for(const s of mdLinks(page,'series').slice(0,3)){
      const sp=await jina(s.url,9000);if(!sp)continue;const rows=[];let order=0;
      for(const l of mdLinks(sp,'book')){
        const t=goodreadsBookTitle(l.label);if(!t)continue;const around=String(sp).slice(Math.max(0,l.index-90),l.index+l.label.length+160),position=posFrom(l.label,around);if(Number.isFinite(position))rows.push({title:t,position,order:order++});
      }
      const ded=[];for(const r of rows.sort((a,b)=>a.position-b.position||a.order-b.order))if(!ded.some(x=>sameTitle(x.title,r.title)))ded.push(r);
      const i=ded.findIndex(x=>sameTitle(x.title,title));if(i<0)continue;
      const cur=ded[i],lower=ded.filter(x=>x.position<cur.position).at(-1),higher=ded.find(x=>x.position>cur.position);
      const saga=sagaFromSeriesLabel(s.label,title)||safeSaga(input.saga,title);
      const r={saga,prequel:lower?.title||'',sequel:higher?.title||'',verified:true,authoritative:true,checked:true,source:s.url,method:'ordered-series-page'};
      if(relationAccepted(r))return r;
    }
  }
  return null;
}

const resolveCache=new Map();
async function resolve(input={}){
  const key=[code(input.code),norm(input.title),norm(input.author),norm(input.saga)].join('|');if(resolveCache.has(key))return resolveCache.get(key);
  const p=(async()=>{
    const diag={input:{code:code(input.code),title:clean(input.title),author:clean(input.author),saga:clean(input.saga)},attempts:[]};root.__LIB_SERIES_V4_LAST=diag;
    const wi=await wikipediaStructured(input).catch(()=>null);diag.attempts.push({source:'wikipedia-structured-book',result:wi});if(relationAccepted(wi)){diag.result=wi;return wi}
    const gr=await goodreadsOrdered(input).catch(()=>null);diag.attempts.push({source:'goodreads-ordered-series',result:gr});if(relationAccepted(gr)){diag.result=gr;return gr}
    const empty={saga:safeSaga(input.saga,input.title),prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:'',method:'none'};diag.result=empty;return empty;
  })();resolveCache.set(key,p);return p;
}

root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_SERIES_NEIGHBORS=resolve;
root.__LIB_FIND_RELATIONS=resolve;
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_SERIES_RELATION_POLICY='single-owner-structured-book-then-ordered-series-v4';

let active=false,manual=new Set(),timer=null,seq=0,lastCode='';
function values(){const get=id=>clean(document.getElementById(id)?.value||'');return{code:code(get('editCode')),title:get('editTitle'),author:get('editAuthor'),saga:get('editSaga')}}
function setAuto(id,value){const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function schedule(ms=250){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){
  const token=++seq,input=values();if(!active||!input.code||!input.title||!input.author)return;
  const r=await resolve(input).catch(()=>null);if(token!==seq||!active)return;const now=values();if(now.code!==input.code||!sameTitle(now.title,input.title)||norm(now.author)!==norm(input.author))return;
  if(r&&r.verified){setAuto('editSaga',r.saga||input.saga||'');setAuto('editPrequel',r.prequel||'');setAuto('editSequel',r.sequel||'')}
  else{setAuto('editPrequel','');setAuto('editSequel','')}
  root.__LIB_SERIES_V4_APPLIED={input,result:r,at:Date.now()};
}
function activate(){active=true;manual.clear();resolveCache.clear();schedule(700)}
function boot(){
  const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,150);return}
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor','editSaga','editPrequel','editSequel']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('input',e=>{
      if(e.isTrusted){if(id==='editCode'){lastCode=code(el.value);activate()}else if(['editSaga','editPrequel','editSequel'].includes(id))manual.add(id)}
      if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(450);
    });
    el.addEventListener('change',()=>{if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(250)});
  }
  new MutationObserver(()=>{if(!dlg.open){active=false;manual.clear();clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});
}
boot();
root.__LIB_SERIES_V4_TEST__={renderedFields,rawFields,wikipediaStructured,goodreadsOrdered,resolve,safeTitle,safeSaga,sameTitle};
})();
