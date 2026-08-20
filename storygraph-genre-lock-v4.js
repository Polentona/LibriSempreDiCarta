(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_STORYGRAPH_GENRE_LOCK_V6)return;
root.__LIB_STORYGRAPH_GENRE_LOCK_V6=true;
root.__LIB_STORYGRAPH_GENRE_LOCK_V5=true;
root.__LIB_STORYGRAPH_GENRE_LOCK_V4=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const MAX_TRIES=12;
let active=false,stable=null,inflight=false,lastTry=0,tries=0,manual=false,exhausted=false;

function input(){
  if(typeof document==='undefined')return{code:'',title:'',author:''};
  const g=id=>clean(document.getElementById(id)?.value||'');
  return{code:code(g('editCode')),title:g('editTitle'),author:g('editAuthor')};
}
function keyOf(i){return[i.code,norm(i.title),norm(i.author)].join('|')}
function state(reason=''){
  const i=input();
  root.__LIB_STORYGRAPH_GENRE_LOCK_STATE__={
    active,code:i.code,title:i.title,author:i.author,
    pending:!!active&&!stable&&!manual&&!exhausted,
    settled:!!stable||manual||exhausted||!active,
    complete:!!stable,manual,exhausted,tries,reason,source:stable?.source||'',at:Date.now()
  };
  return root.__LIB_STORYGRAPH_GENRE_LOCK_STATE__;
}
function apply(){
  if(!active||manual||!stable)return;
  const i=input();if(keyOf(i)!==stable.key)return;
  const el=document.getElementById('editCategory');if(!el)return;
  const value=stable.genres.join(', ');if(!value)return;
  if(el.value!==value){
    el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  el.dataset.genreSource=stable.source||'';
  el.dataset.genreSourceUrl=stable.url||'';
  el.dataset.metadataSource=stable.source||'';
}
function remember(i,r){
  if(!r?.genres?.length)return false;
  stable={key:keyOf(i),genres:uniq(r.genres),url:r.url||'',source:r.source||'goodreads',at:Date.now()};
  exhausted=false;apply();
  root.__LIB_STORYGRAPH_GENRE_LOCK_LAST__={input:i,...r,at:Date.now()};
  state(stable.source||'authoritative');
  return true;
}
async function resolve(){
  if(!active||inflight||manual||stable)return;
  const i=input();
  if(!i.code||!i.title||!i.author){state('waiting-metadata');return}
  const now=Date.now();if(now-lastTry<2600)return;
  if(tries>=MAX_TRIES){exhausted=true;state('exhausted');return}
  const fn=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;
  if(typeof fn!=='function'){state('waiting-resolver');return}
  lastTry=now;tries++;inflight=true;state('resolving');
  try{
    const r=await Promise.resolve(fn(i));
    if(keyOf(input())!==keyOf(i))return;
    if(r?.found&&Array.isArray(r.genres)&&r.genres.length)remember(i,r);
  }catch(e){root.__LIB_STORYGRAPH_GENRE_LOCK_ERROR__=String(e&&e.message||e)}
  finally{
    inflight=false;
    if(!stable&&tries>=MAX_TRIES){exhausted=true;state('exhausted')}
    else state(stable?(stable.source||'authoritative'):'pending');
  }
}
function activate(){
  active=true;stable=null;inflight=false;lastTry=0;tries=0;manual=false;exhausted=false;
  state('activated');setTimeout(resolve,350);
}
function boot(){
  if(typeof document==='undefined')return;
  const dlg=document.getElementById('editDialog'),cat=document.getElementById('editCategory');
  if(!dlg||!cat){setTimeout(boot,120);return}
  cat.addEventListener('input',e=>{if(e.isTrusted){manual=true;state('manual')}});
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor']){
    const el=document.getElementById(id);
    el?.addEventListener('input',()=>{if(dlg.open)activate()});
    el?.addEventListener('change',()=>{if(dlg.open)activate()});
  }
  new MutationObserver(()=>{if(dlg.open)activate();else{active=false;stable=null;manual=false;exhausted=false;state('closed')}}).observe(dlg,{attributes:true,attributeFilter:['open']});
  if(dlg.open)activate();
  setInterval(()=>{if(!active)return;apply();resolve()},650);
}
boot();
root.__LIB_GENRE_SOURCE_POLICY='goodreads-primary-then-storygraph-v1';
root.__LIB_STORYGRAPH_GENRE_LOCK_TEST__={remember,apply,keyOf,resolve,state};
})();
