(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_RELATION_STABILIZER_V8)return;root.__LIB_SERIES_RELATION_STABILIZER_V8=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
function sameTitle(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))}
function safeTitle(v,current=''){let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,'').replace(/[.;:\s]+$/,'').trim();if(!x||x.length<2||x.length>180||sameTitle(x,current))return'';if(/https?:|www\.|[{}<>]|\|/.test(x))return'';return x}
function relationComplete(r){if(!r?.authoritative)return false;if(r.initial&&r.terminal)return true;if(r.initial)return !!r.sequel;if(r.terminal)return !!r.prequel;return !!r.prequel&&!!r.sequel}

const textCache=new Map(),jsonCache=new Map(),bestCache=new Map(),pending=new Map(),failedAt=new Map();
async function fetchText(url,ms=6500){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(!r.ok)return'';const s=await r.text();return s.length>80?s:''}catch(e){return''}finally{clearTimeout(t)}}
async function jina(target,ms=6500){if(textCache.has(target))return textCache.get(target);const routes=['https://r.jina.ai/'+target];if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));for(const u of routes){const s=await fetchText(u,ms);if(s){textCache.set(target,s);return s}}return''}
async function getJson(url,ms=7000){if(jsonCache.has(url))return jsonCache.get(url);const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}})();jsonCache.set(url,p);return p}
function storyGraphLinks(raw){const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(raw||'')))){let url=m[2].replace(/[),.;]+$/,''),label=clean(m[1]);const mm=url.match(/https?:\/\/(?:app|beta)\.thestorygraph\.com\/(?:books|book_reviews)\/([0-9a-f-]{20,})/i);if(!mm)continue;url='https://app.thestorygraph.com/books/'+mm[1];if(!seen.has(url)){seen.add(url);out.push({url,label})}}return out}
function headingTitle(raw){for(const m of String(raw||'').matchAll(/^#{1,4}\s+(.+)$/gm)){const t=safeTitle(m[1]);if(t&&!/^(?:editions?|reviews?|remove book)$/i.test(norm(t)))return t}return''}
function italianFromRaw(raw){const s=String(raw||''),marks=[...s.matchAll(/Language\s*:\s*Italian|Lingua\s*:\s*Italiano/gi)];for(const mark of marks){const seg=s.slice(Math.max(0,mark.index-1700),mark.index),heads=[...seg.matchAll(/^###\s+(.+)$/gm)];for(let i=heads.length-1;i>=0;i--){const t=safeTitle(heads[i][1]);if(t&&!/^(?:editions?|remove book)$/i.test(norm(t)))return t}}return''}
async function storyGraphItalian(canonical,author){const surname=norm(author).split(' ').pop(),queries=uniq([`"${canonical}" "${author}"`,`${canonical} ${author}`]),links=[];for(const q of queries){const targets=['https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),'https://html.duckduckgo.com/html/?q='+encodeURIComponent('site:app.thestorygraph.com/books '+q)];for(const target of targets){const raw=await jina(target,5200);for(const l of storyGraphLinks(raw))if(!links.some(x=>x.url===l.url))links.push(l);if(links.length>=8)break}if(links.length)break}for(const l of links.slice(0,8)){const page=await jina(l.url,5200);if(!page||surname&&!norm(page).includes(surname))continue;const h=headingTitle(page),canonicalSeen=sameTitle(l.label,canonical)||sameTitle(h,canonical)||norm(page).includes(norm(canonical));if(!canonicalSeen)continue;let it=italianFromRaw(page);if(it)return it;for(const suffix of ['/editions','/editions?page=2','/editions?page=3']){const ed=await jina(l.url+suffix,5200);it=italianFromRaw(ed);if(it)return it}}return''}
function langItalian(e){return (e?.languages||[]).some(x=>/\/languages\/(?:ita|it)$/i.test(String(x?.key||x||'')))}
async function openLibraryItalian(canonical,author){const u='https://openlibrary.org/search.json?title='+encodeURIComponent(canonical)+'&author='+encodeURIComponent(author)+'&fields=key,title,author_name&limit=5',d=await getJson(u,6000),surname=norm(author).split(' ').pop();for(const doc of d?.docs||[]){if(surname&&!norm((doc.author_name||[]).join(' ')).includes(surname))continue;const key=String(doc.key||'');if(!/^\/works\/OL\d+W$/i.test(key))continue;const ed=await getJson('https://openlibrary.org'+key+'/editions.json?limit=100',6500);for(const e of ed?.entries||[]){if(!langItalian(e))continue;const t=safeTitle(e.title||'');if(t)return t}}return''}
async function localizeTitle(canonical,author){if(!canonical)return'';const sg=storyGraphItalian(canonical,author).catch(()=>''),ol=openLibraryItalian(canonical,author).catch(()=>'');const fast=await Promise.race([Promise.all([sg,ol]).then(([a,b])=>a||b||''),wait(9500).then(()=>'')]);return fast||''}
function keyOf(input){return[code(input.code),norm(input.title),norm(input.author),norm(input.saga)].join('|')}
function mergedBase(oldR,newR){if(!oldR)return newR;if(!newR)return oldR;return{...oldR,...newR,saga:newR.saga||oldR.saga,prequel:newR.prequel||oldR.prequel,sequel:newR.sequel||oldR.sequel}}

let baseResolver=null,resolveV8=null;
function installResolver(){
  if(resolveV8)return true;
  if(!root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7||typeof root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS!=='function')return false;
  baseResolver=root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS;
  resolveV8=async function(input={}){
    const key=keyOf(input),cached=bestCache.get(key);let base=await Promise.resolve(baseResolver(input)).catch(()=>null);base=mergedBase(base,cached);if(!base?.authoritative||!relationComplete(base))return base;
    const preDone=!base.prequel||!!base.localizedPrequel,seqDone=!base.sequel||!!base.localizedSequel;if(preDone&&seqDone){bestCache.set(key,base);return base}
    let task=pending.get(key);const lastFail=failedAt.get(key)||0;
    if(!task&&Date.now()-lastFail>7000){
      task=(async()=>{
        const [pre,se]=await Promise.all([
          preDone?'':localizeTitle(base.prequel,input.author),
          seqDone?'':localizeTitle(base.sequel,input.author)
        ]);
        const out={...base,prequel:pre||base.prequel,sequel:se||base.sequel,localizedPrequel:preDone||!!pre,localizedSequel:seqDone||!!se,localizationPending:false,method:[base.method,'canonical-title-localizer-v8'].filter(Boolean).join('+')};
        if(pre||se||preDone||seqDone)bestCache.set(key,out);else failedAt.set(key,Date.now());
        return out;
      })().catch(()=>{failedAt.set(key,Date.now());return base}).finally(()=>pending.delete(key));
      pending.set(key,task);
    }
    if(!task)return {...base,localizationPending:true};
    const quick=await Promise.race([task,wait(3200).then(()=>null)]);return quick||{...base,localizationPending:true};
  };
  resolveV8.__seriesV8=true;
  root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolveV8;
  for(const n of ['__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS','__LIB_RESOLVE_SERIES_NEIGHBORS','__LIB_FIND_RELATIONS','__LIB_RESOLVE_UNIVERSAL_SERIES','__LIB_RESOLVE_BOUNDED_RELATIONS'])root[n]=resolveV8;
  root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8=true;
  root.__LIB_SERIES_RELATION_POLICY='goodreads-order-canonical-localization-stable-v8';
  return true;
}

let active=false,timer=null,seq=0,retries=0,lastStable=null;const manual=new Set();
function values(){if(typeof document==='undefined')return{code:'',title:'',author:'',saga:''};const g=id=>clean(document.getElementById(id)?.value||'');return{code:code(g('editCode')),title:g('editTitle'),author:g('editAuthor'),saga:g('editSaga')}}
function sameInput(a,b){return a.code===b.code&&sameTitle(a.title,b.title)&&norm(a.author)===norm(b.author)}
function setAuto(id,value,allowEmpty=false){const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(!v&&!allowEmpty)return;if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function applyResult(input,r){if(!active||!r?.authoritative||!sameInput(values(),input))return;if(r.saga)setAuto('editSaga',r.saga);if(r.prequel)setAuto('editPrequel',r.prequel);else if(r.initial)setAuto('editPrequel','',true);if(r.sequel)setAuto('editSequel',r.sequel);else if(r.terminal)setAuto('editSequel','',true);if(r.localizedPrequel||r.localizedSequel)lastStable={input,result:r};root.__LIB_SERIES_V8_APPLIED={input,result:r,at:Date.now()}}
function schedule(ms=300){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){const token=++seq,input=values();if(!active)return;if(!input.code||!input.title||!input.author){if(retries++<10)schedule(650);return}if(!installResolver()){if(retries++<20)schedule(250);return}const r=await resolveV8(input).catch(()=>null);if(token!==seq||!active||!sameInput(values(),input))return;applyResult(input,r);if((r?.localizationPending||!(r?.localizedPrequel||!r?.prequel)||!(r?.localizedSequel||!r?.sequel))&&retries++<10)schedule(4500)}
function activate(){active=true;manual.clear();retries=0;lastStable=null;schedule(120)}
function boot(){if(typeof document==='undefined')return;const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,120);return}document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);for(const id of ['editSaga','editPrequel','editSequel'])document.getElementById(id)?.addEventListener('input',e=>{if(e.isTrusted)manual.add(id)});for(const id of ['editCode','editTitle','editAuthor']){const el=document.getElementById(id);el?.addEventListener('input',()=>{if(dlg.open){active=true;retries=0;schedule(280)}});el?.addEventListener('change',()=>{if(dlg.open)schedule(180)})}new MutationObserver(()=>{if(dlg.open)activate();else{active=false;manual.clear();lastStable=null;clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});if(dlg.open)activate();setInterval(()=>{if(active&&lastStable&&sameInput(values(),lastStable.input))applyResult(lastStable.input,lastStable.result)},700)}
(function start(n=0){if(installResolver()){boot();return}if(n<80)setTimeout(()=>start(n+1),100)})();
root.__LIB_SERIES_V8_TEST__={installResolver,storyGraphItalian,openLibraryItalian,localizeTitle,relationComplete,storyGraphLinks,italianFromRaw};
})();
