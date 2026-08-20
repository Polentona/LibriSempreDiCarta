(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GENRE_RESOLVER_RESILIENT_V1)return;root.__LIB_GENRE_RESOLVER_RESILIENT_V1=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+]+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const success=new Map(),inflight=new Map(),retryAfter=new Map();let round=0;
function keyOf(i={}){return[code(i.code),norm(i.title),norm(i.author)].join('|')}
function uniq(a){return[...new Set((a||[]).map(clean).filter(Boolean))]}
async function text(target){const url='https://r.jina.ai/'+target;return typeof root.__LIB_BROKER_TEXT==='function'?await root.__LIB_BROKER_TEXT(url,10000):''}
async function freshStoryGraph(input={}){
  const api=root.__LIB_STORYGRAPH_GENRES_TEST__;if(!api?.storyBlocks||!api?.storyMatch)return null;
  const q=clean(input.title)+' '+clean(input.author),c=code(input.code),queries=uniq([q,c]);const token=++round;
  for(const term of queries){
    const target='https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(term)+'&lib_retry='+token;
    const raw=await text(target);if(!raw)continue;
    const blocks=api.storyBlocks(raw),match=api.storyMatch(blocks,{title:input.title,author:input.author,code:c});
    if(match?.genres?.length)return{found:true,reachable:true,genres:uniq(match.genres),labels:match.tagLine?[match.tagLine]:[],url:target.replace('&lib_retry='+token,''),matchedTitle:match.title,matchedCode:match.code,source:'storygraph'};
    const links=api.storyLinks?api.storyLinks(match?.raw||raw):[];
    for(const u of links.slice(0,3)){
      const page=await text(u+(u.includes('?')?'&':'?')+'lib_retry='+token);if(!page)continue;
      const bb=api.storyBlocks(page),mm=api.storyMatch(bb,{title:input.title,author:input.author,code:c})||bb.find(x=>x?.genres?.length);
      if(mm?.genres?.length)return{found:true,reachable:true,genres:uniq(mm.genres),labels:mm.tagLine?[mm.tagLine]:[],url:u,matchedTitle:mm.title,matchedCode:mm.code,source:'storygraph'}
    }
  }
  return null
}
function install(){
  if(root.__LIB_GENRE_RESOLVER_RESILIENT_V1_INSTALLED)return true;
  if(!root.__LIB_STORYGRAPH_GOODREADS_GENRES_V3||typeof root.__LIB_RESOLVE_AUTHORITATIVE_GENRES!=='function')return false;
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;if(base.__genreResilientV1)return true;
  const wrapped=async input=>{
    input=input||{};const key=keyOf(input),hit=success.get(key);if(hit)return hit;
    if(inflight.has(key))return await inflight.get(key);
    const task=(async()=>{
      let first=null;try{first=await base(input)}catch(e){}
      if(first?.found&&first.genres?.length){success.set(key,first);return first}
      if(Date.now()<(retryAfter.get(key)||0))return first||{found:false,transient:true,genres:[],source:'storygraph-unavailable'};
      const fresh=await freshStoryGraph(input).catch(()=>null);
      if(fresh?.found&&fresh.genres?.length){success.set(key,fresh);retryAfter.delete(key);return fresh}
      retryAfter.set(key,Date.now()+3500);return first||{found:false,transient:true,genres:[],source:'storygraph-unavailable'}
    })().finally(()=>inflight.delete(key));inflight.set(key,task);return await task
  };
  wrapped.__genreResilientV1=true;root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=wrapped;root.__LIB_LOOKUP_SPECIFIC_GENRES=async i=>(await wrapped(i||{})).genres||[];root.__LIB_GENRE_RESOLVER_RESILIENT_V1_INSTALLED=true;return true
}
(function start(n=0){if(install())return;if(n<120)setTimeout(()=>start(n+1),100)})();
root.__LIB_GENRE_RESOLVER_RESILIENT_V1_TEST__={keyOf,freshStoryGraph,install,success};
})();
