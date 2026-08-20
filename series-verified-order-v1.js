(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_VERIFIED_SERIES_ORDER_V1)return;root.__LIB_VERIFIED_SERIES_ORDER_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
const stop=new Set(['the','and','of','a','an','il','lo','la','i','gli','le','un','uno','una','di','del','della','delle','dei','degli']);
const words=v=>norm(v).split(' ').filter(x=>x.length>2&&!stop.has(x));

function titleVariants(v){
  const raw=clean(v),out=[];
  const add=x=>{x=clean(x).replace(/\s*[\[(](?:vol(?:ume)?\.?\s*)?#?\d+(?:\.\d+)?[\])]\s*$/i,'').replace(/\s*(?:vol(?:ume)?\.?\s*)#?\d+(?:\.\d+)?\s*$/i,'').trim();if(x&&!out.some(y=>norm(y)===norm(x)))out.push(x)};
  add(raw);for(const p of raw.split(/\s*(?:[.:]|[-–—])\s*/))if(p.length>2)add(p);return out;
}
function sameTitle(a,b){
  const av=titleVariants(a),bv=titleVariants(b);
  for(const x0 of av)for(const y0 of bv){
    const x=norm(x0),y=norm(y0);if(!x||!y)continue;
    if(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))return true;
    const xa=new Set(words(x)),ya=new Set(words(y));if(!xa.size||!ya.size)continue;
    const c=[...xa].filter(w=>ya.has(w)).length;if(c>=Math.min(2,Math.min(xa.size,ya.size))&&c/Math.max(xa.size,ya.size)>=.78)return true;
  }return false;
}
function safeTitle(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').replace(/[.;:\s]+$/,'').trim();
  const n=norm(x);if(!x||x.length<2||x.length>180||sameTitle(x,current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|website|homepage|language|released|published|pubblicato|during his|chancellor|speaker)\b/i.test(n))return'';
  if(/\b(?:he|she|they|we|you)\s+(?:is|are|was|were|has|have|had|will|would|can|could)\b/i.test(n))return'';return x;
}
function safeSaga(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di\s+|of\s+)?/i,'').trim();
  const n=norm(x);if(!x||x.length>100||sameTitle(x,current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x)||/(?:18|19|20)\d{2}/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|released|published|pubblicato|romanzo|novel|libro|book|volume)\b/i.test(n))return'';return x;
}
function complete(r){if(!r||!r.verified||!clean(r.saga))return false;if(r.initial&&r.terminal)return true;if(r.initial)return !!clean(r.sequel);if(r.terminal)return !!clean(r.prequel);return !!clean(r.prequel)&&!!clean(r.sequel)}
function relationFromOrdered(items,title,saga,source){
  const rows=(items||[]).filter(Boolean).map(x=>({...x,title:safeTitle(x.title,title)})).filter(x=>x.title),dedup=[];
  for(const row of rows)if(!dedup.some(x=>sameTitle(x.title,row.title)))dedup.push(row);if(dedup.length<2)return null;
  dedup.sort((a,b)=>(Number.isFinite(a.position)?a.position:1e9)-(Number.isFinite(b.position)?b.position:1e9)||(a.order??1e9)-(b.order??1e9));
  const i=dedup.findIndex(x=>sameTitle(x.title,title));if(i<0)return null;
  return{saga:safeSaga(saga,title),prequel:i>0?dedup[i-1].title:'',sequel:i<dedup.length-1?dedup[i+1].title:'',position:Number.isFinite(dedup[i].position)?dedup[i].position:i+1,total:dedup.length,initial:i===0,terminal:i===dedup.length-1,authoritative:true,verified:true,checked:true,source,items:dedup.map(x=>x.title)};
}

const textCache=new Map(),jsonCache=new Map();
async function text(target,ms=9500){
  if(textCache.has(target))return textCache.get(target);
  const p=(async()=>{const routes=['https://r.jina.ai/'+target];if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));for(const u of routes){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(r.ok){const s=await r.text();if(s.length>120)return s}}catch(e){}finally{clearTimeout(t)}}return''})();textCache.set(target,p);return p;
}
async function json(url,ms=8500){if(jsonCache.has(url))return jsonCache.get(url);const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}})();jsonCache.set(url,p);return p}
function mdLinks(raw,filter){const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(raw||'')))){const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');if(filter&&!filter(url,label))continue;if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}}return out}
function goodreadsBookTitle(label){let x=clean(label);x=x.replace(/\s*\(([^()]{0,100}?),\s*#\s*\d+(?:\.\d+)?\)\s*$/i,'').trim();x=x.replace(/\s*\([^()]{0,100}\s+#\s*\d+(?:\.\d+)?\)\s*$/i,'').trim();return safeTitle(x)}
function positionNear(raw,link){const around=String(raw||'').slice(Math.max(0,link.index-90),link.index+link.label.length+160);for(const re of [/(?:,|\s)#\s*(\d+(?:\.\d+)?)/i,/\b(?:book|libro|volume|vol)\s*#?\s*(\d+(?:\.\d+)?)/i,/^\s*(\d+(?:\.\d+)?)\s*[.)-]/m]){const m=around.match(re);if(m)return Number(m[1])}return NaN}
function sagaFromGoodreadsLabel(label){const m=clean(label).match(/\(([^()]{2,100}?),\s*#\s*\d+(?:\.\d+)?\)\s*$/i);return m?safeSaga(m[1]):''}
async function goodreads(input){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const q=encodeURIComponent([isbn,title,author].filter(Boolean).join(' ')),search=await text('https://www.goodreads.com/search?q='+q+'&search_type=books',8000);if(!search)return null;
  const sur=norm(author).split(' ').pop(),books=mdLinks(search,u=>/goodreads\.com\/book\/show\//i.test(u)).slice(0,8);
  for(const b of books){const page=await text(b.url,8500);if(!page||!norm(page).includes(sur))continue;const h=(String(page).match(/^#\s+(.+)$/m)||[])[1]||b.label;if(!sameTitle(h,title)&&!sameTitle(b.label,title))continue;const seriesLinks=mdLinks(page,u=>/goodreads\.com\/series\/\d+/i.test(u));if(!seriesLinks.length)continue;
    for(const s of seriesLinks.slice(0,3)){const seriesPage=await text(s.url,9000);if(!seriesPage)continue;const bookLinks=mdLinks(seriesPage,u=>/goodreads\.com\/book\/show\//i.test(u)),rows=[];let order=0,saga=safeSaga(s.label,title);for(const l of bookLinks){const t=goodreadsBookTitle(l.label);if(!t)continue;const p=positionNear(seriesPage,l),tagSaga=sagaFromGoodreadsLabel(l.label);if(!saga&&tagSaga)saga=tagSaga;rows.push({title:t,position:Number.isFinite(p)?p:NaN,order:order++})}let rel=relationFromOrdered(rows.filter(x=>Number.isFinite(x.position)),title,saga,s.url);if(!rel&&rows.length>=2)rel=relationFromOrdered(rows,title,saga,s.url);if(rel&&(complete(rel)||rel.initial||rel.terminal))return rel}
  }return null;
}
function stripWiki(v){return String(v||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/>]*\/>/gi,' ').replace(/\{\{[^{}]{0,600}\}\}/g,' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/''+/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ')}
function infobox(wt,title){const out={saga:'',prequel:'',sequel:'',found:false};for(const raw of String(wt||'').split(/\r?\n/)){const m=raw.match(/^\s*\|\s*([^=|]+?)\s*=\s*(.*?)\s*$/);if(!m)continue;const key=norm(m[1]).replace(/ /g,'_'),val=clean(stripWiki(m[2]));if(!val)continue;if(!out.saga&&/^(?:serie|series|series_name|book_series|saga|ciclo|trilogia|trilogy)$/.test(key)){out.saga=safeSaga(val,title);out.found=true}if(!out.prequel&&/^(?:preceduto|preceduta|preceduto_da|preceduta_da|preceded|preceded_by|previous|previous_book|prequel|libro_precedente)$/.test(key)){out.prequel=safeTitle(val,title);out.found=true}if(!out.sequel&&/^(?:seguito|seguita|seguito_da|seguita_da|followed|followed_by|next|next_book|sequel|libro_successivo)$/.test(key)){out.sequel=safeTitle(val,title);out.found=true}}return out}
async function wikiSearch(lang,q,limit=5){const u=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=${limit}&format=json&origin=*&srsearch=${encodeURIComponent(q)}`,d=await json(u);return(d?.query?.search||[]).map(x=>x.title).filter(Boolean)}
async function wikiText(lang,page){const u=`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`,d=await json(u);return d?.parse?.wikitext?.['*']||''}
async function wikipedia(input){const title=clean(input.title),author=clean(input.author);if(!title||!author)return null;for(const lang of ['it','en']){const pages=uniq([...(await wikiSearch(lang,`"${title}" "${author}"`,6)),...(await wikiSearch(lang,`${title} ${author}`,6))]).slice(0,10);for(const page of pages){if(!sameTitle(page,title)&&!titleVariants(title).some(v=>norm(page).includes(norm(v))))continue;const wt=await wikiText(lang,page);if(!wt||!norm(wt).includes(norm(author)))continue;const f=infobox(wt,title);if(!f.found||(!f.prequel&&!f.sequel))continue;const rel={saga:safeSaga(f.saga||input.saga,title),prequel:f.prequel,sequel:f.sequel,initial:!f.prequel&&!!f.sequel,terminal:!!f.prequel&&!f.sequel,authoritative:true,verified:true,checked:true,source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g,'_'))}`};if(rel.prequel&&sameTitle(rel.prequel,title))rel.prequel='';if(rel.sequel&&sameTitle(rel.sequel,title))rel.sequel='';if(rel.prequel||rel.sequel)return rel}}return null}

const cache=new Map();
async function resolve(input={}){const title=clean(input.title),author=clean(input.author),isbn=code(input.code),hint=safeSaga(input.saga,title);if(!title||!author)return null;const key=[isbn,norm(title),norm(author),norm(hint)].join('|');if(cache.has(key))return cache.get(key);const p=(async()=>{const diag={input:{code:isbn,title,author,saga:hint},attempts:[]};root.__LIB_VERIFIED_SERIES_LAST__=diag;const gr=await goodreads({code:isbn,title,author,saga:hint}).catch(()=>null);diag.attempts.push({source:'goodreads-series',result:gr});if(gr&&complete(gr)){diag.result=gr;return gr}const wi=await wikipedia({code:isbn,title,author,saga:hint}).catch(()=>null);diag.attempts.push({source:'wikipedia-book-infobox',result:wi});if(wi&&(complete(wi)||wi.initial||wi.terminal)){diag.result=wi;return wi}if(gr){diag.result=gr;return gr}const empty={saga:hint,prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:''};diag.result=empty;return empty})();cache.set(key,p);return p}

const originals={};
function installName(name){const cur=root[name];if(typeof cur!=='function'||cur.__verifiedSeriesV1)return false;if(!originals[name])originals[name]=cur;const base=originals[name];const wrapped=async input=>{const v=await resolve(input||{}).catch(()=>null);if(v&&(v.verified||v.prequel||v.sequel))return v;let b=null;try{b=await base(input||{})}catch(e){}return{saga:safeSaga(v?.saga||b?.saga||input?.saga,input?.title),prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:''}};wrapped.__verifiedSeriesV1=true;root[name]=wrapped;return true}
function install(){for(const n of ['__LIB_RESOLVE_UNIVERSAL_SERIES','__LIB_FIND_RELATIONS','__LIB_RESOLVE_SERIES_NEIGHBORS','__LIB_RESOLVE_BOUNDED_RELATIONS'])installName(n)}
root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolve;root.__LIB_SERIES_RELATION_POLICY='verified-ordered-source-only';install();let installs=0;const installTimer=setInterval(()=>{installs++;install();if(installs>=160)clearInterval(installTimer)},100);

const manual=new Set();let lastCode='';
function setAuto(id,value){const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
async function enforceForm(){const dlg=document.getElementById('editDialog');if(!dlg?.open)return;const i={code:code(document.getElementById('editCode')?.value||''),title:clean(document.getElementById('editTitle')?.value||''),author:clean(document.getElementById('editAuthor')?.value||''),saga:clean(document.getElementById('editSaga')?.value||'')};if(!i.title||!i.author)return;const r=await resolve(i).catch(()=>null);if(!r)return;if(r.verified){if(r.saga)setAuto('editSaga',r.saga);setAuto('editPrequel',r.prequel||'');setAuto('editSequel',r.sequel||'')}else{if(!manual.has('editPrequel'))setAuto('editPrequel','');if(!manual.has('editSequel'))setAuto('editSequel','')}}
function boot(){const c=document.getElementById('editCode'),dlg=document.getElementById('editDialog');if(!c||!dlg){setTimeout(boot,150);return}for(const id of ['editSaga','editPrequel','editSequel'])document.getElementById(id)?.addEventListener('input',e=>{if(e.isTrusted)manual.add(id)});c.addEventListener('input',e=>{if(e.isTrusted){manual.clear();cache.clear();lastCode=code(c.value)}});new MutationObserver(()=>{if(dlg.open){manual.clear();setTimeout(enforceForm,600)}}).observe(dlg,{attributes:true,attributeFilter:['open']});setInterval(()=>{const now=code(c.value);if(now!==lastCode){lastCode=now;manual.clear()}enforceForm()},1800);setTimeout(enforceForm,900)}
boot();root.__LIB_VERIFIED_SERIES_TEST__={sameTitle,safeTitle,safeSaga,infobox,relationFromOrdered,resolve};
})();