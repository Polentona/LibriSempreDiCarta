(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_PLOT_RESOLVER_RESILIENT_V1)return;root.__LIB_PLOT_RESOLVER_RESILIENT_V1=true;
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const slug=v=>norm(v).replace(/\s+/g,'-');
const success=new Map(),inflight=new Map(),retryAfter=new Map();
function keyOf(i={}){return[code(i.code),norm(i.title),norm(i.author),norm(i.publisher)].join('|')}
function sanitize(v,i){let p=clean(v);if(typeof root.__LIB_CLEAN_AUTOMATIC_PLOT==='function'){try{p=clean(root.__LIB_CLEAN_AUTOMATIC_PLOT(p,{author:i.author,title:i.title})||p)}catch(e){}}return p}
function valid(v,i){const p=sanitize(v,i);return p.length>=80&&!/https?|www\s*\.|€|\bacquista\b/i.test(p)?p:''}
function plain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^\s*#{1,6}\s*/,'').replace(/[*_`>|]/g,' '))}
function extract(raw,i){
  const lines=String(raw||'').split(/\r?\n/);let start=-1;
  for(let n=0;n<lines.length;n++){const x=norm(plain(lines[n]));if(/^(?:descrizione|trama|sinossi|presentazione|abstract)$/.test(x)){start=n+1;break}}
  if(start<0)return'';const out=[];
  for(let n=start;n<Math.min(lines.length,start+45);n++){
    const rawLine=String(lines[n]),p=plain(rawLine),x=norm(p);if(!p)continue;
    if(out.length&&(/^#{1,6}\s/.test(rawLine)||/^(?:dettagli|recensioni|informazioni|autore|editore|isbn|ean|prezzo|disponibilita|acquista|compra|spedizione)\b/.test(x)))break;
    if(/^(?:leggi di piu|leggi di meno)$/.test(x))continue;if(p.length>=18)out.push(p)
  }
  return valid(out.join(' '),i)
}
async function brokerText(target){const u='https://r.jina.ai/'+target;return typeof root.__LIB_BROKER_TEXT==='function'?await root.__LIB_BROKER_TEXT(u,11000):''}
async function directRetailer(i){
  const c=code(i.code);if(!/^97[89]\d{10}$/.test(c)||!i.title||!i.author)return'';
  const libraccio=`https://www.libraccio.it/libro/${c}/${slug(i.author)}/${slug(i.title)}.html`,raw=await brokerText(libraccio);let p=extract(raw,i);if(p){root.__LIB_LAST_PLOT_SOURCE__={source:'Libraccio',url:libraccio,official:false};return p}
  const search=`https://www.ibs.it/search/?query=${encodeURIComponent(c)}`,sr=await brokerText(search),m=String(sr||'').match(new RegExp(`https?:\\/\\/www\\.ibs\\.it\\/[^\\s)]+\\/e\\/${c}`,'i'));
  if(m){const page=await brokerText(m[0]),q=extract(page,i);if(q){root.__LIB_LAST_PLOT_SOURCE__={source:'IBS',url:m[0],official:false};return q}}
  return''
}
function install(){
  if(root.__LIB_PLOT_RESOLVER_RESILIENT_V1_INSTALLED)return true;
  if(typeof root.__LIB_RESOLVE_OFFICIAL_PLOT!=='function')return false;
  const base=root.__LIB_RESOLVE_OFFICIAL_PLOT;if(base.__plotResilientV1)return true;
  const wrapped=async input=>{
    input=input||{};const key=keyOf(input),hit=success.get(key);if(hit)return hit;
    if(inflight.has(key))return await inflight.get(key);
    const task=(async()=>{
      let p='';try{p=valid(await base(input),input)}catch(e){}if(p){success.set(key,p);root.__LIB_LAST_PLOT_SOURCE__={source:clean(input.publisher)||'Editore',official:true};return p}
      if(Date.now()<(retryAfter.get(key)||0))return'';
      p=await directRetailer(input).catch(()=>'');if(p){success.set(key,p);retryAfter.delete(key);return p}
      retryAfter.set(key,Date.now()+4200);return''
    })().finally(()=>inflight.delete(key));inflight.set(key,task);return await task
  };
  wrapped.__plotResilientV1=true;root.__LIB_RESOLVE_OFFICIAL_PLOT=wrapped;root.__LIB_PLOT_RESOLVER_RESILIENT_V1_INSTALLED=true;return true
}
(function start(n=0){if(install())return;if(n<120)setTimeout(()=>start(n+1),100)})();
root.__LIB_PLOT_RESOLVER_RESILIENT_V1_TEST__={keyOf,extract,directRetailer,install,success};
})();
