(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_ISBN_REQUEST_BROKER_V1)return;root.__LIB_ISBN_REQUEST_BROKER_V1=true;
const rawFetch=typeof root.fetch==='function'?root.fetch.bind(root):null;if(!rawFetch)return;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const inflight=new Map(),cache=new Map(),failureCache=new Map(),lanes=new Map(),lastAt=new Map();
const stats={network:0,deduped:0,cacheHits:0,failures:0,status429:0};
function urlOf(input){try{return typeof input==='string'?input:String(input?.url||input)}catch(e){return''}}
function controlled(url){try{const h=new URL(url).hostname.toLowerCase();return ['r.jina.ai','html.duckduckgo.com','www.bing.com','api.allorigins.win','corsproxy.io','api.codetabs.com'].includes(h)}catch(e){return false}}
function laneOf(url){try{return new URL(url).hostname.toLowerCase()==='r.jina.ai'?'jina':'search'}catch(e){return'search'}}
function cloneRecord(r){return new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers})}
function record(resp,body){const headers={};try{resp.headers.forEach((v,k)=>headers[k]=v)}catch(e){}return{status:resp.status,statusText:resp.statusText||'',headers,body:String(body||''),at:Date.now()}}
function enqueue(lane,job){const prev=lanes.get(lane)||Promise.resolve();const next=prev.catch(()=>{}).then(job);lanes.set(lane,next.finally(()=>{if(lanes.get(lane)===next)lanes.delete(lane)}));return next}
async function run(url,init,lane){
  const gap=lane==='jina'?520:140,last=lastAt.get(lane)||0,wait=Math.max(0,gap-(Date.now()-last));if(wait)await sleep(wait);
  const fail=failureCache.get(url);if(fail&&Date.now()-fail.at<4200)return cloneRecord(fail.rec);
  lastAt.set(lane,Date.now());stats.network++;
  let resp;try{resp=await rawFetch(url,init)}catch(e){stats.failures++;throw e}
  let body='';try{body=await resp.clone().text()}catch(e){}
  const rec=record(resp,body);
  if(resp.ok&&body){cache.set(url,rec);failureCache.delete(url)}else{stats.failures++;if(resp.status===429)stats.status429++;failureCache.set(url,{at:Date.now(),rec})}
  return cloneRecord(rec)
}
async function brokerFetch(input,init={}){
  const url=urlOf(input),method=String(init?.method||input?.method||'GET').toUpperCase();
  if(method!=='GET'||!controlled(url))return rawFetch(input,init);
  const hit=cache.get(url);if(hit&&Date.now()-hit.at<10*60*1000){stats.cacheHits++;return cloneRecord(hit)}
  const fail=failureCache.get(url);if(fail&&Date.now()-fail.at<4200){stats.cacheHits++;return cloneRecord(fail.rec)}
  if(inflight.has(url)){stats.deduped++;const rec=await inflight.get(url);return cloneRecord(rec)}
  const lane=laneOf(url),task=enqueue(lane,async()=>{const r=await run(url,init,lane),body=await r.clone().text().catch(()=>'');return record(r,body)}).finally(()=>inflight.delete(url));
  inflight.set(url,task);const rec=await task;return cloneRecord(rec)
}
root.fetch=function(input,init){return brokerFetch(input,init)};
root.__LIB_BROKER_FETCH=brokerFetch;
root.__LIB_BROKER_TEXT=async function(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await brokerFetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});return r.ok?await r.text():''}catch(e){return''}finally{clearTimeout(t)}};
root.__LIB_ISBN_REQUEST_BROKER_STATS__=stats;
root.__LIB_ISBN_REQUEST_BROKER_TEST__={controlled,laneOf,brokerFetch,stats,cache,failureCache};
})();
