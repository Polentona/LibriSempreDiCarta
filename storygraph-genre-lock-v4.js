(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_STORYGRAPH_GENRE_LOCK_V4)return;root.__LIB_STORYGRAPH_GENRE_LOCK_V4=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
function sameTitle(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x))}
function input(){if(typeof document==='undefined')return{code:'',title:'',author:''};const g=id=>clean(document.getElementById(id)?.value||'');return{code:code(g('editCode')),title:g('editTitle'),author:g('editAuthor')}}
function keyOf(i){return[i.code,norm(i.title),norm(i.author)].join('|')}
const successCache=new Map();
async function fetchText(url,ms=8000){if(successCache.has(url))return successCache.get(url);const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});if(!r.ok)return'';const s=await r.text();if(s&&s.length>120){successCache.set(url,s);return s}return''}catch(e){return''}finally{clearTimeout(t)}}
async function jina(target){const urls=['https://r.jina.ai/'+target];if(/^https:\/\//i.test(target))urls.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));for(const u of urls){const s=await fetchText(u);if(s)return s}return''}
async function resolveStoryGraph(i){
  const api=root.__LIB_STORYGRAPH_GENRES_TEST__;if(!api?.storyBlocks||!api?.storyMatch||!api?.storyLinks)return null;
  const queries=[];if(i.title&&i.author)queries.push(`${i.title} ${i.author}`);if(i.code)queries.push(i.code);
  const candidates=[],seen=new Set(),add=u=>{if(u&&!seen.has(u)){seen.add(u);candidates.push(u)}};
  for(const q of queries){
    const target='https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),raw=await jina(target);if(!raw)continue;
    const blocks=api.storyBlocks(raw),match=api.storyMatch(blocks,i);
    if(match?.genres?.length)return{genres:uniq(match.genres),source:'storygraph',url:target,title:match.title||i.title};
    for(const u of api.storyLinks(match?.raw||raw))add(u);
    if(candidates.length)break;
  }
  for(const url of candidates.slice(0,4)){
    const raw=await jina(url);if(!raw)continue;const blocks=api.storyBlocks(raw),match=api.storyMatch(blocks,i)||blocks.find(b=>sameTitle(b.title,i.title)&&norm(b.text).includes(norm(i.author).split(' ').pop()));
    if(match?.genres?.length)return{genres:uniq(match.genres),source:'storygraph',url,title:match.title||i.title};
  }
  return null
}
let active=false,stable=null,inflight=false,lastTry=0,tries=0,manual=false;
function apply(){if(!active||manual||!stable)return;const i=input();if(keyOf(i)!==stable.key)return;const el=document.getElementById('editCategory');if(!el)return;const value=stable.genres.join(', ');if(!value||el.value===value)return;el.value=value;el.dataset.genreSource='storygraph';el.dataset.genreSourceUrl=stable.url||'';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function remember(i,r){if(!r?.genres?.length)return false;stable={key:keyOf(i),genres:uniq(r.genres),url:r.url||'',at:Date.now()};apply();root.__LIB_STORYGRAPH_GENRE_LOCK_LAST__={input:i,...r,at:Date.now()};return true}
function consumeDelegate(){const i=input(),d=root.__LIB_GENRE_DELEGATE_LAST__;if(d?.found&&d.source==='storygraph'&&Array.isArray(d.genres)&&d.genres.length)return remember(i,{genres:d.genres,url:d.url||'',source:'storygraph'});return false}
async function resolve(){if(!active||inflight||manual)return;const i=input();if(!i.code||!i.title||!i.author)return;if(consumeDelegate())return;const now=Date.now();if(now-lastTry<4500||tries>=12)return;lastTry=now;tries++;inflight=true;try{const r=await resolveStoryGraph(i);if(keyOf(input())!==keyOf(i))return;if(r)remember(i,r)}catch(e){root.__LIB_STORYGRAPH_GENRE_LOCK_ERROR__=String(e&&e.message||e)}finally{inflight=false}}
function activate(){active=true;stable=null;inflight=false;lastTry=0;tries=0;manual=false;successCache.clear();setTimeout(resolve,650)}
function boot(){if(typeof document==='undefined')return;const dlg=document.getElementById('editDialog'),cat=document.getElementById('editCategory');if(!dlg||!cat){setTimeout(boot,150);return}cat.addEventListener('input',e=>{if(e.isTrusted)manual=true});document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);for(const id of ['editCode','editTitle','editAuthor']){const el=document.getElementById(id);el?.addEventListener('input',()=>{if(dlg.open)activate()});el?.addEventListener('change',()=>{if(dlg.open)activate()})}new MutationObserver(()=>{if(dlg.open)activate();else{active=false;stable=null;manual=false}}).observe(dlg,{attributes:true,attributeFilter:['open']});if(dlg.open)activate();setInterval(()=>{if(!active)return;if(!stable)consumeDelegate();apply();resolve()},800)}
boot();
root.__LIB_GENRE_SOURCE_POLICY='storygraph-direct-then-goodreads-only-if-absent-v3';
root.__LIB_STORYGRAPH_GENRE_LOCK_TEST__={resolveStoryGraph,remember,apply,consumeDelegate,keyOf};
})();
