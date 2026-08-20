(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GENRES_AUTHORITATIVE_V3)return;
root.__LIB_GENRES_AUTHORITATIVE_V3=true;

const ALLOWED=['Giallo','Noir','Thriller','Fantasy','Fantascienza','Horror','Romanzo rosa','Romanzo storico','Avventura','Comics','Crime'];
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};

const MATCHERS=[
  ['Giallo',["mystery","giallo","gialli","detective fiction"]],
  ['Noir',["noir"]],
  ['Thriller',["thriller"]],
  ['Fantasy',["fantasy"]],
  ['Fantascienza',["science fiction","sci fi","fantascienza"]],
  ['Horror',["horror","orrore"]],
  ['Romanzo rosa',["romance","romanzo rosa","narrativa rosa","narrativa sentimentale"]],
  ['Romanzo storico',["historical fiction","historical","romanzo storico","narrativa storica","storico"]],
  ['Avventura',["adventure","avventura"]],
  ['Comics',["comics","comic","fumetti"]],
  ['Crime',["crime"]]
];
const STORY_STOPS=['adventurous','challenging','dark','emotional','funny','hopeful','informative','inspiring','lighthearted','mysterious','reflective','relaxing','sad','tense','fast paced','medium paced','slow paced'];
function wordIndex(hay,needle){const re=new RegExp('(?:^|\\s)'+needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s|$)','i'),m=re.exec(hay);return m?m.index+(m[0].startsWith(' ')?1:0):-1}
function canonicalFromText(v){
  const n=norm(v);if(!n)return[];const hits=[];
  for(let order=0;order<MATCHERS.length;order++){
    const [name,keys]=MATCHERS[order];let best=-1;
    for(const key of keys){const i=wordIndex(n,key);if(i>=0&&(best<0||i<best))best=i}
    if(best>=0)hits.push({name,index:best,order});
  }
  hits.sort((a,b)=>a.index-b.index||a.order-b.order);return uniq(hits.map(x=>x.name));
}
function canonical(values){const out=[];for(const raw of Array.isArray(values)?values:[values])for(const g of canonicalFromText(raw))if(!out.includes(g))out.push(g);return out}
function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·]+/g,' '))}
function storyGenres(line){
  let x=norm(stripMd(line));if(!/^(?:fiction|nonfiction)(?:\s|$)/.test(x))return[];
  x=x.replace(/^(?:fiction|nonfiction)(?:\s+|$)/,'').trim();let cut=x.length;
  for(const stop of STORY_STOPS){const i=wordIndex(x,stop);if(i>=0&&i<cut)cut=i}
  return canonicalFromText(x.slice(0,cut));
}
function similar(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return true;
  const stop=new Set(['il','lo','la','i','gli','le','un','una','uno','di','del','della','dei','delle','the','a','an','of','and','e']);
  const xa=x.split(' ').filter(w=>w.length>2&&!stop.has(w)),ya=y.split(' ').filter(w=>w.length>2&&!stop.has(w)),ys=new Set(ya),c=xa.filter(w=>ys.has(w)).length;
  return c>=Math.min(2,Math.min(xa.length,ya.length))&&c/Math.max(xa.length,ya.length)>=.6;
}

const textCache=new Map();
async function jina(target,ms=11000){
  const key=target;if(textCache.has(key))return textCache.get(key);
  const p=(async()=>{const routes=['https://r.jina.ai/'+target];if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));for(const u of routes){for(let attempt=0;attempt<2;attempt++){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(r.ok){const s=await r.text();if(s.length>140)return s}if(r.status!==429&&r.status!==503)break}catch(e){}finally{clearTimeout(t)}if(attempt===0)await new Promise(r=>setTimeout(r,900))}}return''})();
  textCache.set(key,p);return p;
}
function storyBlocks(text){
  return String(text||'').split(/^###\s+/m).map(part=>part.trim()).filter(Boolean).map(part=>{
    const lines=part.split(/\r?\n/).map(stripMd).filter(Boolean),title=clean(lines[0]||'');if(!title||/^(?:remove book|report|content warnings?)$/i.test(title))return null;
    const joined=lines.join('\n'),m=joined.match(/ISBN\/UID:\s*([^\n]+)/i),isbn=code(clean(m?.[1]||'').replace(/^None$/i,''));
    const tagLine=lines.find(line=>/^(?:fiction|nonfiction)(?:\s|$)/i.test(line))||'';
    return{title,isbn,text:joined,tagLine,genres:storyGenres(tagLine)};
  }).filter(Boolean);
}
function storyMatch(blocks,input){
  const isbn=code(input.code),surname=norm(input.author).split(' ').filter(Boolean).pop();if(isbn){const exact=blocks.find(b=>b.isbn===isbn);if(exact)return exact}
  const matches=blocks.filter(b=>similar(b.title,input.title)&&(!surname||norm(b.text).includes(surname)));return matches[0]||null;
}
async function resolveStoryGraph(input){
  const queries=[];if(code(input.code))queries.push(code(input.code));if(clean(input.title)&&clean(input.author))queries.push(clean(input.title)+' '+clean(input.author));else if(clean(input.title))queries.push(clean(input.title));
  let reachable=false;
  for(const q of uniq(queries)){
    const url='https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),page=await jina(url);if(!page)continue;reachable=true;
    const match=storyMatch(storyBlocks(page),input);if(match)return{found:true,reachable:true,genres:canonical(match.genres),labels:match.tagLine?[match.tagLine]:[],url,matchedTitle:match.title,matchedCode:match.isbn,source:'storygraph'};
  }
  return{found:false,reachable,genres:[],labels:[],url:'',source:'storygraph'};
}
function mdLinks(raw){const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(raw||'')))){const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');if(!/goodreads\.com\/book\/show\//i.test(url)||seen.has(url))continue;seen.add(url);out.push({label,url})}return out}
function pageTitle(text){for(const line of String(text||'').split(/\r?\n/)){const m=line.match(/^#\s+(.+?)\s*$/);if(m&&norm(m[1])!=='goodreads')return stripMd(m[1])}return''}
function goodreadsLabels(text){
  const raw=String(text||''),labels=[];
  for(const re of [/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/genres\/[^)]+\)/gi,/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/shelf\/show\/[^)]+\)/gi]){let m;while((m=re.exec(raw)))labels.push(stripMd(m[1]))}
  return uniq(labels);
}
async function resolveGoodreads(input){
  const title=clean(input.title),author=clean(input.author);if(!title||!author)return{found:false,genres:[],labels:[],url:'',source:'goodreads'};
  const search=await jina('https://www.goodreads.com/search?q='+encodeURIComponent([code(input.code),title,author].filter(Boolean).join(' '))+'&search_type=books',9000);if(!search)return{found:false,genres:[],labels:[],url:'',source:'goodreads'};
  const surname=norm(author).split(' ').pop();
  for(const b of mdLinks(search).slice(0,7)){
    const page=await jina(b.url,9000);if(!page||!norm(page).includes(surname))continue;const pt=pageTitle(page)||b.label;if(!similar(pt,title)&&!similar(b.label,title))continue;
    const labels=goodreadsLabels(page);return{found:true,genres:canonical(labels),labels,url:b.url,source:'goodreads',matchedTitle:pt};
  }
  return{found:false,genres:[],labels:[],url:'',source:'goodreads'};
}

const resolverCache=new Map();
async function resolve(input={}){
  const key=[code(input.code),norm(input.title),norm(input.author)].join('|');if(resolverCache.has(key))return resolverCache.get(key);
  const p=(async()=>{
    const sg=await resolveStoryGraph(input);
    if(sg.found)return sg;
    if(!sg.reachable)return{found:false,transient:true,genres:[],labels:[],url:'',source:'storygraph-unavailable'};
    const gr=await resolveGoodreads(input);return gr.found?gr:{found:false,transient:false,genres:[],labels:[],url:'',source:''};
  })();resolverCache.set(key,p);return p;
}
root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=resolve;
root.__LIB_LOOKUP_SPECIFIC_GENRES=async input=>(await resolve(input||{})).genres;
root.__LIB_GENRE_SOURCE_POLICY='storygraph-then-goodreads-only-if-storygraph-absent-v3';
root.__LIB_ALLOWED_GENRES=[...ALLOWED];

let active=false,manual=false,timer=null,retries=0,seq=0,lastSig='';
function field(){return document.getElementById('editCategory')}
function vals(){const get=id=>clean(document.getElementById(id)?.value||'');return{code:code(get('editCode')),title:get('editTitle'),author:get('editAuthor')}}
function sig(v){return[code(v.code),norm(v.title),norm(v.author)].join('|')}
function setField(genres,source='',url=''){
  const f=field();if(!f||manual)return;const value=canonical(genres).join(', ');if(f.value!==value){f.value=value;f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}))}
  f.dataset.genreSource=source;f.dataset.genreSourceUrl=url;f.dataset.genreWhitelistCanonical=value;
}
function schedule(ms=250){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){
  const input=vals(),signature=sig(input);if(!active||!input.code||!input.title||!input.author)return;if(signature===lastSig&&retries===0)return;
  const token=++seq;lastSig=signature;const r=await resolve(input).catch(()=>({found:false,transient:true,genres:[],source:'error'}));if(token!==seq||!active||sig(vals())!==signature)return;
  if(r.transient){setField([],r.source||'storygraph-unavailable','');root.__LIB_GENRE_V3_LAST={input,result:r,at:Date.now()};if(retries<5){retries++;resolverCache.delete(signature);schedule(2200)}return}
  retries=0;setField(r.genres||[],r.source||'',r.url||'');root.__LIB_GENRE_V3_LAST={input,result:r,at:Date.now()};
}
function activate(){active=true;manual=false;retries=0;lastSig='';resolverCache.clear();textCache.clear();schedule(700)}
function boot(){
  const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,150);return}
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor']){
    const el=document.getElementById(id);if(!el)continue;el.addEventListener('input',e=>{if(e.isTrusted&&id==='editCode')activate();if(active&&id!=='editCode')schedule(450)});el.addEventListener('change',()=>{if(active)schedule(250)});
  }
  const f=field();if(f)f.addEventListener('input',e=>{if(e.isTrusted)manual=true});
  new MutationObserver(()=>{if(!dlg.open){active=false;manual=false;clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});
}
boot();
root.__LIB_GENRES_V3_TEST__={canonical,canonicalFromText,storyGenres,storyBlocks,storyMatch,resolveStoryGraph,resolveGoodreads,resolve};
})();
