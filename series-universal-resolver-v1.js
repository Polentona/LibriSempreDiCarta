(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_UNIVERSAL_SERIES_V2)return;
root.__LIB_UNIVERSAL_SERIES_V2=true;

const CACHE=new Map();
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const stop=new Set(['the','and','del','della','delle','dei','degli','con','per','una','uno','un','di','da','il','lo','la','gli','le','i','a','al','alla']);
const words=v=>norm(v).split(' ').filter(x=>x.length>2&&!stop.has(x));
function sameTitle(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y)return true;if(x.length>=7&&(y.startsWith(x+' ')||y.endsWith(' '+x)))return true;if(y.length>=7&&(x.startsWith(y+' ')||x.endsWith(' '+y)))return true;const xa=new Set(words(x)),ya=new Set(words(y));if(!xa.size||!ya.size)return false;const c=[...xa].filter(w=>ya.has(w)).length;return c>=Math.min(2,Math.min(xa.size,ya.size))&&c/Math.max(xa.size,ya.size)>=.72}
function variants(v){const r=clean(v),out=[];for(const x of [r,...r.split(/\s*(?:[.:]|\s[-–—]\s)\s*/)]){const c=clean(x);if(c&&!out.some(y=>norm(y)===norm(c)))out.push(c)}return out}
const matchesTitle=(a,b)=>variants(b).some(v=>sameTitle(a,v));
function tidyTitle(v){let x=clean(v).replace(/^[#*:;\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'');x=x.replace(/\s+(?:ISBN|EAN)\b.*$/i,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').trim();x=x.replace(/[.;:\s]+$/,'').trim();if(!x||x.length<2||x.length>190||/https?:|\b(?:film|movie|serie tv|televisione|episodio|stagione)\b/i.test(x))return'';return x}
function tidySaga(v){let x=clean(v).replace(/^["“”«»']+|["“”«»']+$/g,'').replace(/^(?:serie|saga|trilogia|ciclo)\s+(?:di\s+)?/i,'').trim();if(!x||x.length>120||/https?:|\b(?:film|movie|televisione|episodio|stagione)\b/i.test(x))return'';return x}
function relation(items,title,saga,source,method,extra={}){const list=[];for(const raw of items||[]){const t=tidyTitle(raw);if(t&&!list.some(x=>sameTitle(x,t)))list.push(t)}if(list.length<2||list.length>60)return null;const idx=list.findIndex(x=>matchesTitle(x,title));if(idx<0)return null;return {saga:tidySaga(saga),prequel:idx>0?list[idx-1]:'',sequel:idx<list.length-1?list[idx+1]:'',items:list,source,method,authoritative:true,checked:true,initial:idx===0,terminal:idx===list.length-1,...extra}}

const trusted=['lafeltrinelli.it','ibs.it','libreriauniversitaria.it','unilibro.it','hoepli.it','mondadoristore.it','giunti.it','bompiani.it','tealibri.it','feltrinellieditore.it','rizzolilibri.it','einaudi.it','adelphi.it','sellerio.it','salani.it','longanesi.it','garzanti.it','corbaccio.it','editricenord.it','edizpiemme.it','sperling.it','fazieditore.it','harpercollins.it','newtoncompton.com','it.wikipedia.org','books.google.com'];
function host(url){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch(e){return''}}
function trustedUrl(url){const h=host(url);return trusted.some(d=>h===d||h.endsWith('.'+d))}
function decodeBing(u){try{const x=new URL(u);if(!/(^|\.)bing\.com$/i.test(x.hostname))return u;const enc=x.searchParams.get('u')||'';if(!enc.startsWith('a1'))return u;let b=enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return decodeURIComponent(escape(atob(b)))}catch(e){return u}}
function linksFrom(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){const u=decodeBing(m[1].replace(/&amp;/g,'&'));if(trustedUrl(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
async function jina(url,timeout=9000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function authorOk(text,author){const surname=norm(author).split(' ').filter(Boolean).pop()||'';return !!surname&&norm(text).includes(surname)}
function titleOk(text,title){const n=norm(text);return variants(title).some(v=>{const q=norm(v);return q&&n.includes(q)})}

function sagaHints(text){const raw=String(text||''),out=[];let m;const pats=[/(?:^|\n|\s)(?:Serie|Saga|Series|Trilogia)\s*[:|]\s*["“]?([^\n|”"]{2,120})/gi,/(?:questi\s+libri|questi\s+romanzi|i\s+romanzi|i\s+volumi)\s+(?:compongono|formano|costituiscono)\s+(?:la\s+)?(?:saga|serie|trilogia)\s+["“]?([^"”.,;\n]{2,120})/gi,/(?:secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono|decimo)\s+(?:libro|romanzo|volume|capitolo)\s+della\s+(?:serie|saga)\s+(?:di\s+)?["“]?([^"”.,;\n]{2,120})/gi];for(const re of pats)while((m=re.exec(raw))){const s=tidySaga(m[1]);if(s&&!out.some(x=>norm(x)===norm(s)))out.push(s)}return out}
function splitList(v){return String(v||'').split(/\s*[,;•|]\s*|\s+e\s+(?=[A-ZÀ-ÖØ-Ý“"'])/).map(tidyTitle).filter(Boolean)}
function proseRelations(text,title,source,sagaHint=''){
  const raw=String(text||''),hints=[tidySaga(sagaHint),...sagaHints(raw)].filter(Boolean),rels=[];let m;
  const named=/(?:serie|saga|trilogia|ciclo)\s+(?:di\s+)?["“”']?([^:\n("“”']{2,120})["“”']?\s*:\s*([^\n]{12,1800})/gi;
  while((m=named.exec(raw))){const r=relation(splitList(m[2]),title,m[1],source,'explicit-named-list');if(r)rels.push(r)}
  const formed=/(?:serie|saga|trilogia|ciclo)[^\n]{0,180}?(?:composta|formata|costituita)\s+da\s*:?\s*([^\n]{12,1800})/gi;
  while((m=formed.exec(raw))){const r=relation(splitList(m[1]),title,hints[0]||'',source,'explicit-list');if(r)rels.push(r)}
  const terminal=/(?:questo\s+romanzo\s+[^.]{0,80}?)?(?:ultimo|terzo)(?:\s+\w+){0,5}\s+(?:di|della)\s+(?:una\s+)?trilogia[^()]{0,220}\(\s*con\s+([^()]{2,180}?)\s+e\s+([^()]{2,180}?)\s*\)/gi;
  while((m=terminal.exec(raw))){const a=tidyTitle(m[1]),b=tidyTitle(m[2]);if(a&&b){const r=relation([a,b,title],title,hints[0]||'',source,'terminal-trilogy-parenthetical');if(r)rels.push(r)}}
  const respective=/altri\s+due\s+romanzi[^"“]{0,100}rispettivamente\s+["“]([^"”]{2,180})["”]\s+e\s+["“]([^"”]{2,180})["”][^.]{0,220}trilogia/gi;
  while((m=respective.exec(raw))){const r=relation([m[1],m[2],title],title,hints[0]||'',source,'terminal-trilogy-respectively');if(r)rels.push(r)}
  const followed=/[Aa]\s+questo\s+(?:è|e)\s+seguito\s+([^\n.]{2,180})/g;
  while((m=followed.exec(raw))){const pre=tidyTitle(m[1]);if(!pre)continue;const after=raw.slice(m.index,Math.min(raw.length,m.index+900));if(titleOk(after,title)&&(hints.length||/trilogia|serie|saga/i.test(after))){rels.push({saga:hints[0]||'',prequel:pre,sequel:'',items:[pre,title],source,method:'editorial-followed-by',authoritative:true,checked:true,initial:false,terminal:/ultimo|terzo|trilogia/i.test(after)})}}
  rels.sort((a,b)=>{const score=x=>Number(!!x.saga)*3+Number(!!x.prequel)*2+Number(!!x.sequel)*2+Number(!!x.terminal)+Number(!!x.initial);return score(b)-score(a)});return rels[0]||null
}

async function italianWikipediaAuthor(author,title){
  const api='https://it.wikipedia.org/w/api.php';
  async function json(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),8500);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(t)}}
  const q=new URLSearchParams({action:'query',list:'search',srsearch:author,srnamespace:'0',srlimit:'6',format:'json',origin:'*'}),data=await json(api+'?'+q),hits=data?.query?.search||[];
  for(const hit of hits.slice(0,4)){
    const p=new URLSearchParams({action:'parse',page:hit.title,prop:'wikitext',format:'json',origin:'*'}),d=await json(api+'?'+p),wt=d?.parse?.wikitext?.['*']||'';if(!wt)continue;
    const lines=wt.replace(/\r/g,'').split('\n');let currentSaga='';const list=[];
    for(const line of lines){const h=line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);if(h){currentSaga=/serie|saga|trilogia|ciclo/i.test(h[2])?tidySaga(h[2]):'';continue}if(currentSaga&&/^\s*[#*]+/.test(line)){const t=tidyTitle(line.replace(/^\s*[#*]+\s*/,''));if(t)list.push(t)}}
    const r=relation(list,title,currentSaga,`https://it.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g,'_'))}`,'wikipedia-author-section');if(r)return r
  }
  return null
}

async function webResolve(input,sagaHint=''){
  const title=clean(input.title),author=clean(input.author),code=clean(input.code).replace(/[^0-9Xx]/g,''),queries=[];
  if(code)queries.push(`"${code}" "${title}"`);
  queries.push(`"${title}" "${author}" (serie OR saga OR trilogia OR series)`);
  if(sagaHint)queries.push(`"${sagaHint}" "${author}" (serie OR saga OR trilogia OR series)`);
  const pages=[],seen=new Set(),sagas=[],rels=[];
  const addSaga=s=>{s=tidySaga(s);if(s&&!sagas.some(x=>norm(x)===norm(s)))sagas.push(s)};
  for(const q of queries){const search=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8000);for(const s of sagaHints(search))addSaga(s);const sr=proseRelations(search,title,'Bing search',sagaHint||sagas[0]||'');if(sr)rels.push(sr);for(const u of linksFrom(search)){if(!seen.has(u)){seen.add(u);pages.push(u)}}if(pages.length>=12)break}
  for(const u of pages.slice(0,12)){
    const text=await jina(u,9500);if(!text||!authorOk(text,author)||!titleOk(text,title))continue;
    for(const s of sagaHints(text))addSaga(s);
    const r=proseRelations(text,title,u,sagaHint||sagas[0]||'');if(r)rels.push(r)
  }
  if(sagas.length&&!rels.some(r=>r.prequel||r.sequel)){
    const q=`"${sagas[0]}" "${author}" (trilogia OR serie OR saga)`;
    const search=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8000);
    const sr=proseRelations(search,title,'Bing series search',sagas[0]);if(sr)rels.push(sr);
    for(const u of linksFrom(search).slice(0,8)){
      if(seen.has(u))continue;const text=await jina(u,9000);if(!text||!authorOk(text,author))continue;const r=proseRelations(text,title,u,sagas[0]);if(r)rels.push(r)
    }
  }
  for(const r of rels)if(!r.saga&&sagas[0])r.saga=sagas[0];
  rels.sort((a,b)=>{const score=x=>Number(!!x.saga)*4+Number(!!x.prequel)*3+Number(!!x.sequel)*3+Number(!!x.terminal)+Number(!!x.initial);return score(b)-score(a)});
  if(rels[0])return rels[0];
  if(sagas[0])return {saga:sagas[0],prequel:'',sequel:'',items:[],source:'trusted web',method:'series-label-only',authoritative:false,checked:true,initial:false,terminal:false};
  return null
}

async function resolve(input={}){
  const title=clean(input.title),author=clean(input.author),hint=tidySaga(input.saga||''),code=clean(input.code).replace(/[^0-9Xx]/g,'').toUpperCase(),key=[code,norm(title),norm(author),norm(hint)].join('|');
  if(!title||!author)return null;if(CACHE.has(key))return CACHE.get(key);
  const p=(async()=>{
    const diag={input:{code,title,author,saga:hint},steps:[],result:null};root.__LIB_UNIVERSAL_SERIES_LAST__=diag;
    const web=await webResolve({code,title,author},hint);diag.steps.push({source:'trusted-web-exact',hit:!!web});if(web&&(web.prequel||web.sequel||web.saga)){diag.result=web;if(web.authoritative||web.saga)return web}
    const wiki=await italianWikipediaAuthor(author,title);diag.steps.push({source:'it.wikipedia.org',hit:!!wiki});if(wiki){if(!wiki.saga&&web?.saga)wiki.saga=web.saga;diag.result=wiki;return wiki}
    diag.result=web||null;return web||null
  })();CACHE.set(key,p);return p
}

function safeShape(rel){if(!rel)return {saga:'',prequel:'',sequel:'',sagaChecked:false,checked:false,authoritative:false,source:''};return {saga:tidySaga(rel.saga||''),prequel:tidyTitle(rel.prequel||''),sequel:tidyTitle(rel.sequel||''),sagaChecked:!!tidySaga(rel.saga||''),checked:true,authoritative:!!rel.authoritative,initial:!!rel.initial,terminal:!!rel.terminal,source:rel.source||'',method:rel.method||''}}
async function safeResolver(input={}){return safeShape(await resolve(input))}
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_FIND_RELATIONS=safeResolver;
root.__LIB_RESOLVE_SERIES_NEIGHBORS=safeResolver;
root.__LIB_RESOLVE_BOUNDED_RELATIONS=safeResolver;
root.__LIB_ALLOW_LEGACY_RELATION_SEARCH=false;

async function enrichSaved(){
  try{
    if(typeof books==='undefined'||!Array.isArray(books)||typeof saveBooks!=='function')return;
    const VERSION=2,pending=books.filter(b=>b?.title&&b?.author&&(b?.code||b?.isbn)&&Number(b.universalRelationsVersion||0)<VERSION&&(!clean(b.saga)||!clean(b.prequel)||!clean(b.sequel))).slice(0,4);
    if(!pending.length)return;
    let changed=false;
    for(const b of pending){
      try{const r=await resolve({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||'',description:b.plot||''});if(r){if(r.saga&&clean(b.saga)!==clean(r.saga)){b.saga=r.saga;changed=true}if(r.prequel&&clean(b.prequel)!==clean(r.prequel)){b.prequel=r.prequel;changed=true}if(r.sequel&&clean(b.sequel)!==clean(r.sequel)){b.sequel=r.sequel;changed=true}if(r.terminal&&b.sequel){b.sequel='';changed=true}if(r.initial&&b.prequel){b.prequel='';changed=true}}}catch(e){}b.universalRelationsVersion=VERSION;b.universalRelationsAt=Date.now()}
    saveBooks();if(changed&&typeof render==='function')render();if(books.some(b=>Number(b.universalRelationsVersion||0)<VERSION&&b?.title&&b?.author&&(b?.code||b?.isbn)))setTimeout(enrichSaved,900)
  }catch(e){}
}
setTimeout(enrichSaved,1300);
root.__LIB_UNIVERSAL_SERIES_TEST__={clean,norm,tidyTitle,tidySaga,sagaHints,proseRelations,webResolve,resolve};
})();