(()=>{
if(window.__LIB_SERIES_COMPAT_GENERIC_V1)return;window.__LIB_SERIES_COMPAT_GENERIC_V1=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const cmp=(a,b)=>clean(a).localeCompare(clean(b),'it',{sensitivity:'base',numeric:true});

window.__LIB_AUTHORITATIVE_SERIES_CATALOG=[];
window.__LIB_INSTALL_CANONICAL_SERIES_GUARDS=()=>{};
window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async input=>{
  if(typeof window.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS==='function')return window.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS(input||{});
  return {saga:clean(input?.saga),prequel:'',sequel:'',verified:false,authoritative:false,checked:false,source:''};
};

if(!window.__LIB_LIBRARY_UI_RULES_LOADER_V1){
  window.__LIB_LIBRARY_UI_RULES_LOADER_V1=true;
  const ui=document.createElement('script');ui.src='library-ui-rules-v1.js?v=20260819-2';ui.async=false;document.head.appendChild(ui);
}

function primaryAuthor(author){let raw=clean(author);if(!raw)return'';raw=raw.split(/\s*(?:;|&|\be\b|\band\b)\s*/i).filter(Boolean)[0]||raw;return clean(raw.replace(/\([^)]*\)/g,''))}
function surname(author){const a=primaryAuthor(author);if(!a)return'';if(a.includes(','))return clean(a.split(',')[0]);const p=a.split(/\s+/).filter(Boolean);return p.at(-1)||a}
function publicationValue(book){const raw=clean(book?.publishedDate||book?.publication||book?.year||book?.published||'');if(!raw)return Number.POSITIVE_INFINITY;const iso=raw.match(/^((?:18|19|20)\d{2})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/);if(iso){const y=Number(iso[1]),m=Math.max(1,Math.min(12,Number(iso[2])||1)),d=Math.max(1,Math.min(31,Number(iso[3])||1));return Date.UTC(y,m-1,d)}const y=raw.match(/(?:18|19|20)\d{2}/);if(y)return Date.UTC(Number(y[0]),0,1);const d=Date.parse(raw);return Number.isFinite(d)?d:Number.POSITIVE_INFINITY}
function sameBookTitle(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;return x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' '))}
function sameSeriesGroup(a,b){return norm(primaryAuthor(a?.author))===norm(primaryAuthor(b?.author))&&!!norm(a?.saga)&&norm(a?.saga)===norm(b?.saga)}
function relationDepth(book,list){if(!clean(book?.saga))return null;const group=list.filter(x=>sameSeriesGroup(book,x));if(group.length<2)return null;let current=book,depth=0;const seen=new Set();for(let i=0;i<group.length+2;i++){const marker=String(current?.id??group.indexOf(current));if(seen.has(marker))return null;seen.add(marker);const pre=clean(current?.prequel);let previous=pre?group.find(x=>x!==current&&sameBookTitle(pre,x?.title)):null;if(!previous)previous=group.find(x=>x!==current&&clean(x?.sequel)&&sameBookTitle(x.sequel,current?.title))||null;if(!previous)return depth;depth++;current=previous}return null}
function compareHome(a,b,list){let c=cmp(surname(a?.author),surname(b?.author));if(c)return c;const ga=clean(a?.saga)||clean(a?.title),gb=clean(b?.saga)||clean(b?.title);c=cmp(ga,gb);if(c)return c;if(sameSeriesGroup(a,b)){const da=relationDepth(a,list),db=relationDepth(b,list);if(Number.isInteger(da)&&Number.isInteger(db)&&da!==db)return da-db}const pa=publicationValue(a),pb=publicationValue(b);if(pa!==pb){if(!Number.isFinite(pa))return 1;if(!Number.isFinite(pb))return -1;return pa-pb}c=cmp(a?.title,b?.title);if(c)return c;return (Number(a?.id)||0)-(Number(b?.id)||0)}
function install(){const current=window.getFilteredBooks;if(typeof current!=='function'||current.__genericHomeOrderV1)return false;const wrapped=function(){const list=current.apply(this,arguments);try{if(typeof currentView!=='undefined'&&currentView==='home'){const copy=[...(Array.isArray(list)?list:[])];return copy.sort((a,b)=>compareHome(a,b,copy))}}catch(e){}return list};wrapped.__genericHomeOrderV1=true;wrapped.__genericHomeOrderV1Base=current;window.getFilteredBooks=wrapped;try{if(typeof currentView!=='undefined'&&currentView==='home'&&typeof render==='function')render()}catch(e){}return true}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>=100)clearInterval(timer)},100);setTimeout(install,0);
window.__LIB_SERIES_CATALOG_POLICY='no-hardcoded-relations';
})();