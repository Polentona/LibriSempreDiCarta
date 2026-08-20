(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_LOCALIZATION_RESILIENT_V2)return;
root.__LIB_SERIES_LOCALIZATION_RESILIENT_V1=true;
root.__LIB_SERIES_LOCALIZATION_RESILIENT_V2=true;
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const safe=v=>clean(v).replace(/\s*\([^)]*(?:disambigua|disambiguation)[^)]*\)\s*$/i,'').replace(/^[#*;:\d.\s–—-]+/,'').replace(/[.;:\s]+$/,'').trim();
const cache=new Map(),failedAt=new Map(),inflight=new Map(),authorTextCache=new Map(),authorInflight=new Map();
function same(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>7&&y.startsWith(x+' '))||(y.length>7&&x.startsWith(y+' ')))}
function shape(r){if(!r?.authoritative||!clean(r.saga))return false;if(r.initial&&r.terminal)return true;if(r.initial)return !!clean(r.sequel);if(r.terminal)return !!clean(r.prequel);return !!clean(r.prequel)&&!!clean(r.sequel)}
function localized(r){if(!shape(r)||r.localizationPending===true)return false;if(clean(r.prequel)&&r.localizedPrequel!==true)return false;if(clean(r.sequel)&&r.localizedSequel!==true)return false;return true}
function stripHtml(v){return clean(String(v||'').replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&amp;/g,'&'))}
async function json(url,ms=7500){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}}
function words(v){return norm(v).split(' ').filter(x=>x.length>2&&!['the','and','for','with','of','a','an','il','lo','la','i','gli','le','di','del','della','dei','delle','un','una'].includes(x))}
function scoreCandidate(item,extract,canonical,author){
  const title=safe(item?.title),body=stripHtml((item?.snippet||'')+' '+(extract||'')),all=norm(title+' '+body),cn=norm(canonical),an=norm(author),surname=an.split(' ').filter(Boolean).pop();
  if(!title||same(title,canonical)||same(title,author)||title.length>180)return-99;
  let s=0;if(cn&&all.includes(cn))s+=7;if(surname&&all.includes(surname))s+=5;if(/\b(?:romanzo|novel|libro|book)\b/i.test(all))s+=2;if(/\b(?:film|serie televisiva|television series|episodio|episode|videogioco|video game)\b/i.test(all))s-=8;
  const cw=words(canonical),aw=new Set(words(all));if(cw.length)s+=Math.min(4,cw.filter(x=>aw.has(x)).length);
  return s
}
function plainWikiLine(v){return clean(String(v||'')
  .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ')
  .replace(/<ref\b[^/>]*\/>/gi,' ')
  .replace(/\{\{[^{}]{0,500}\}\}/g,' ')
  .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g,'$1')
  .replace(/\[\[([^\]]+)\]\]/g,'$1')
  .replace(/'{2,5}/g,'')
  .replace(/<[^>]+>/g,' '));
}
function bibliographyTitleFromWikitext(raw,canonical){
  const cn=norm(canonical);if(!cn)return'';
  for(const rawLine of String(raw||'').split(/\r?\n/)){
    if(!norm(rawLine).includes(cn))continue;
    const line=plainWikiLine(rawLine);if(!line)continue;
    const pairs=[...line.matchAll(/([^()]{2,180}?)\s*\(([^()]{2,320})\)/g)];
    for(const m of pairs){
      if(!norm(m[2]).includes(cn))continue;
      const candidate=safe(m[1]);
      if(candidate&&!same(candidate,canonical)&&candidate.length<=180&&!/\b(?:film|serie televisiva|television series|episodio|episode|videogioco|video game)\b/i.test(norm(candidate)))return candidate;
    }
  }
  return'';
}
async function authorPageWikitext(author){
  const key=norm(author);if(!key)return'';if(authorTextCache.has(key))return authorTextCache.get(key);if(authorInflight.has(key))return await authorInflight.get(key);
  const task=(async()=>{
    const base='https://it.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&origin=*';
    let d=await json(base+'&titles='+encodeURIComponent(author),7000),page=d?.query?.pages?.[0],text=page?.revisions?.[0]?.slots?.main?.content||page?.revisions?.[0]?.['*']||'';
    if(!text){
      const s=await json('https://it.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=5&format=json&origin=*&srsearch='+encodeURIComponent('"'+author+'"'),6500),rows=s?.query?.search||[],best=rows.find(x=>same(x.title,author))||rows.find(x=>norm(x.title).includes(norm(author).split(' ').pop()))||rows[0];
      if(best?.pageid){d=await json(base+'&pageids='+best.pageid,7000);page=d?.query?.pages?.[0];text=page?.revisions?.[0]?.slots?.main?.content||page?.revisions?.[0]?.['*']||''}
    }
    if(text)authorTextCache.set(key,text);return text
  })().finally(()=>authorInflight.delete(key));authorInflight.set(key,task);return await task
}
async function authorBibliographyItalianTitle(canonical,author){const raw=await authorPageWikitext(author);return bibliographyTitleFromWikitext(raw,canonical)}
async function wikipediaSearchItalianTitle(canonical,author){
  const q=`"${canonical}" "${author}"`,u='https://it.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=8&format=json&origin=*&srsearch='+encodeURIComponent(q),d=await json(u);let rows=d?.query?.search||[];
  if(!rows.length){const q2=`"${canonical}" ${author.split(' ').pop()}`,d2=await json(u.replace(encodeURIComponent(q),encodeURIComponent(q2)));rows=d2?.query?.search||[]}
  if(!rows.length)return'';
  const ids=rows.map(x=>x.pageid).filter(Boolean).slice(0,8);let extracts={};
  if(ids.length){const e=await json('https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&pageids='+ids.join('|'));extracts=e?.query?.pages||{}}
  const ranked=rows.map(x=>({title:safe(x.title),score:scoreCandidate(x,extracts[x.pageid]?.extract||'',canonical,author)})).sort((a,b)=>b.score-a.score),best=ranked[0];return best?.score>=8?best.title:''
}
async function wikipediaItalianTitle(canonical,author){
  canonical=clean(canonical);author=clean(author);if(!canonical||!author)return'';const key=norm(canonical)+'|'+norm(author),hit=cache.get(key);if(hit)return hit;if(Date.now()-(failedAt.get(key)||0)<4500)return'';if(inflight.has(key))return await inflight.get(key);
  const task=(async()=>{let title=await authorBibliographyItalianTitle(canonical,author).catch(()=>'');if(!title)title=await wikipediaSearchItalianTitle(canonical,author).catch(()=>'');if(title){cache.set(key,title);return title}failedAt.set(key,Date.now());return''})().finally(()=>inflight.delete(key));inflight.set(key,task);return await task
}
function install(){
  if(root.__LIB_SERIES_LOCALIZATION_RESILIENT_V2_INSTALLED)return true;
  if(!root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8||typeof root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS!=='function')return false;
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;if(base.__italianLocalizationV2)return true;
  const wrapped=async input=>{
    const r=await Promise.resolve(base(input||{})).catch(()=>null);if(!r?.authoritative||!shape(r)||localized(r))return r;
    const needPre=!!clean(r.prequel)&&r.localizedPrequel!==true,needSeq=!!clean(r.sequel)&&r.localizedSequel!==true;
    const [pre,seq]=await Promise.all([needPre?wikipediaItalianTitle(r.prequel,input?.author||''):'',needSeq?wikipediaItalianTitle(r.sequel,input?.author||''):'']);
    const out={...r,prequel:pre||r.prequel,sequel:seq||r.sequel,localizedPrequel:!needPre||!!pre,localizedSequel:!needSeq||!!seq,method:[r.method,(pre||seq)?'itwiki-author-bibliography-v2':''].filter(Boolean).join('+')};
    out.localizationPending=!((!out.prequel||out.localizedPrequel)&&(!out.sequel||out.localizedSequel));return out
  };
  wrapped.__italianLocalizationV2=true;
  for(const n of ['__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS','__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS','__LIB_RESOLVE_SERIES_NEIGHBORS','__LIB_FIND_RELATIONS','__LIB_RESOLVE_UNIVERSAL_SERIES','__LIB_RESOLVE_BOUNDED_RELATIONS'])root[n]=wrapped;
  root.__LIB_SERIES_LOCALIZATION_RESILIENT_V1_INSTALLED=true;root.__LIB_SERIES_LOCALIZATION_RESILIENT_V2_INSTALLED=true;return true
}
(function start(n=0){if(install())return;if(n<160)setTimeout(()=>start(n+1),100)})();
root.__LIB_SERIES_LOCALIZATION_RESILIENT_V1_TEST__={same,shape,localized,scoreCandidate,plainWikiLine,bibliographyTitleFromWikitext,authorPageWikitext,authorBibliographyItalianTitle,wikipediaItalianTitle,install,cache};
})();
