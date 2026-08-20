(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_SAGA_LOCK_V9)return;root.__LIB_SERIES_SAGA_LOCK_V9=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
function sameTitle(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))}
function input(){if(typeof document==='undefined')return{code:'',title:'',author:''};const g=id=>clean(document.getElementById(id)?.value||'');return{code:code(g('editCode')),title:g('editTitle'),author:g('editAuthor')}}
function sameInput(a,b){return a.code===b.code&&sameTitle(a.title,b.title)&&norm(a.author)===norm(b.author)}
function usable(r){return !!r?.authoritative&&!!clean(r.saga)&&(!!clean(r.prequel)||!!clean(r.sequel)||r.initial||r.terminal)}
let active=false,stable=null,inflight=false,lastTry=0,tries=0;const manual=new Set();
function setAuto(id,value,allowEmpty=false){const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(!v&&!allowEmpty)return;if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function remember(i,r){if(!usable(r)||!sameInput(input(),i))return false;stable={input:i,result:r};apply();root.__LIB_SERIES_SAGA_LOCK_LAST__={input:i,result:r,at:Date.now()};return true}
function apply(){if(!active||!stable||!sameInput(input(),stable.input))return;const r=stable.result;if(r.saga)setAuto('editSaga',r.saga);if(r.prequel)setAuto('editPrequel',r.prequel);else if(r.initial)setAuto('editPrequel','',true);if(r.sequel)setAuto('editSequel',r.sequel);else if(r.terminal)setAuto('editSequel','',true)}
function consumeKnown(){const i=input(),candidates=[root.__LIB_SERIES_V8_APPLIED?.result,root.__LIB_LAST_AUTHORITATIVE_SERIES_RESULT__,root.__LIB_LAST_UNIVERSAL_SERIES_RESULT__,root.__LIB_LAST_BOUNDED_RELATIONS_RESULT__];for(const r of candidates)if(remember(i,r))return true;return false}
async function resolve(){if(!active||inflight)return;const i=input();if(!i.code||!i.title||!i.author)return;if(consumeKnown())return;const now=Date.now();if(now-lastTry<4500||tries>=12)return;const fn=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;if(typeof fn!=='function')return;lastTry=now;tries++;inflight=true;try{const r=await Promise.resolve(fn({code:i.code,title:i.title,author:i.author,saga:clean(document.getElementById('editSaga')?.value||'')}));remember(i,r)}catch(e){root.__LIB_SERIES_SAGA_LOCK_ERROR__=String(e&&e.message||e)}finally{inflight=false}}
function activate(){active=true;stable=null;lastTry=0;tries=0;manual.clear();consumeKnown();setTimeout(resolve,350)}
function boot(){if(typeof document==='undefined')return;const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,120);return}document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);for(const id of ['editSaga','editPrequel','editSequel'])document.getElementById(id)?.addEventListener('input',e=>{if(e.isTrusted)manual.add(id)});for(const id of ['editCode','editTitle','editAuthor']){const el=document.getElementById(id);el?.addEventListener('input',()=>{if(dlg.open)activate()});el?.addEventListener('change',()=>{if(dlg.open)activate()})}new MutationObserver(()=>{if(dlg.open)activate();else{active=false;stable=null;manual.clear()}}).observe(dlg,{attributes:true,attributeFilter:['open']});if(dlg.open)activate();setInterval(()=>{if(!active)return;if(!stable)consumeKnown();apply();resolve()},700)}
boot();
root.__LIB_SERIES_SAGA_LOCK_TEST__={usable,sameInput,consumeKnown,apply,resolve};
})();
