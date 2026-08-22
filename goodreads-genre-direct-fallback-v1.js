(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_GENRE_DIRECT_FALLBACK_V1)return;
root.__LIB_GOODREADS_GENRE_DIRECT_FALLBACK_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const cache=new Map();

const MATCHERS=[
  ['Giallo',[/\bmystery\b/i,/\bdetective\b/i]],
  ['Noir',[/\bnoir\b/i]],
  ['Thriller',[/\bthriller\b/i]],
  ['Fantasy',[/\bfantasy\b/i]],
  ['Fantascienza',[/\bscience fiction\b/i,/\bsci[\s-]?fi\b/i]],
  ['Horror',[/\bhorror\b/i]],
  ['Romanzo rosa',[/\bromance\b/i]],
  ['Romanzo storico',[/\bhistorical fiction\b/i,/\bhistorical\b/i]],
  ['Avventura',[/\badventure\b/i]],
  ['Comics',[/\bcomics?\b/i,/\bgraphic novel\b/i]],
  ['Crime',[/\bcrime\b/i]]
];

function canonicalize(values){
  if(typeof root.__LIB_CANONICALIZE_GENRES==='function'){
    try{const x=root.__LIB_CANONICALIZE_GENRES(values);if(Array.isArray(x))return uniq(x)}catch(e){}
  }
  const text=(Array.isArray(values)?values:[values]).map(clean).join(' ');
  const hits=[];
  for(let order=0;order<MATCHERS.length;order++){
    const [name,res]=MATCHERS[order];let best=-1;
    for(const re of res){const m=re.exec(text);re.lastIndex=0;if(m&&(best<0||m.index<best))best=m.index}
    if(best>=0)hits.push({name,index:best,order});
  }
  hits.sort((a,b)=>a.index-b.index||a.order-b.order);
  return uniq(hits.map(x=>x.name));
}

function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·]+/g,' '))}
function identityOk(raw,input){
  const n=norm(stripMd(raw)),title=norm(input?.title),author=norm(input?.author),surname=author.split(' ').filter(Boolean).pop()||'';
  if(title&&!(n.includes(title)||title.split(' ').filter(w=>w.length>3).every(w=>n.includes(w))))return false;
  if(surname&&!n.includes(surname))return false;
  return true
}
function labelsFromRaw(raw){
  raw=String(raw||'');const labels=[];
  const add=v=>{v=stripMd(v);if(v&&v.length<=80)labels.push(v)};
  const d=typeof DOMParser!=='undefined'&&/<(?:html|body|a|div|span)\b/i.test(raw)?(()=>{try{return new DOMParser().parseFromString(raw,'text/html')}catch(e){return null}})():null;
  if(d){
    for(const a of d.querySelectorAll('a[href*="/genres/"],a[href*="/shelf/show/"]'))add(a.textContent||'');
    for(const el of d.querySelectorAll('[class*="genreButton"] span,[class*="BookPageMetadataSection__genreButton"]'))add(el.textContent||'');
  }
  for(const re of [/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/genres\/[^)]+\)/gi,/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/shelf\/show\/[^)]+\)/gi]){
    let m;while((m=re.exec(raw)))add(m[1]);
  }
  if(!labels.length){
    const m=/Genres?/i.exec(raw);
    if(m){
      const section=raw.slice(m.index,Math.min(raw.length,m.index+1400)),low=section.toLowerCase(),compact={Giallo:['mystery','detective'],Noir:['noir'],Thriller:['thriller'],Fantasy:['fantasy'],Fantascienza:['science fiction','sci-fi','sci fi'],Horror:['horror'],'Romanzo rosa':['romance'],'Romanzo storico':['historical fiction','historical'],Avventura:['adventure'],Comics:['comics','comic','graphic novel'],Crime:['crime']};
      for(const [name,res] of MATCHERS){
        const bounded=res.some(re=>{const ok=re.test(section);re.lastIndex=0;return ok}),joined=(compact[name]||[]).some(x=>low.includes(x));
        if(bounded||joined)labels.push(name)
      }
    }
  }
  return uniq(labels)
}
async function fetchRaw(url,timeout=7500){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/html,text/plain,*/*'},cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const text=await r.text();if(!text||text.length<300)throw new Error('empty');
    return text
  }finally{clearTimeout(t)}
}
async function readerCandidates(target){
  const routes=[
    'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
    'https://corsproxy.io/?url='+encodeURIComponent(target),
    'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(target),
    'https://r.jina.ai/'+target
  ];
  const settled=await Promise.allSettled(routes.map((u,i)=>fetchRaw(u,i===routes.length-1?9000:7500)));
  return uniq(settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value))
}
async function directGoodreads(input={}){
  const code=isbn(input.code),title=clean(input.title),author=clean(input.author);
  if(!code||!title||!author)return null;
  const key=[code,norm(title),norm(author)].join('|');if(cache.has(key))return await cache.get(key);
  const task=(async()=>{
    const targets=[
      'https://www.goodreads.com/book/isbn/'+encodeURIComponent(code),
      'https://www.goodreads.com/search?q='+encodeURIComponent(code)
    ];
    for(const target of targets){
      const raws=await readerCandidates(target);
      for(const raw of raws){
        if(!identityOk(raw,input))continue;
        const labels=labelsFromRaw(raw),genres=canonicalize(labels);
        if(genres.length)return{found:true,reachable:true,genres,labels,url:target,matchedTitle:title,matchedCode:code,source:'goodreads',method:'goodreads-isbn-direct-proxy-v1'}
      }
    }
    return null
  })();
  cache.set(key,task);return await task
}
function install(){
  if(root.__LIB_GOODREADS_GENRE_DIRECT_FALLBACK_V1_INSTALLED)return true;
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;if(typeof base!=='function')return false;
  if(base.__goodreadsGenreDirectFallbackV1)return true;
  const wrapped=async input=>{
    const gr=await directGoodreads(input||{}).catch(()=>null);
    if(gr?.found&&Array.isArray(gr.genres)&&gr.genres.length)return gr;
    return await Promise.resolve(base(input||{}))
  };
  wrapped.__goodreadsGenreDirectFallbackV1=true;wrapped.__base=base;
  root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=wrapped;
  root.__LIB_LOOKUP_SPECIFIC_GENRES=async input=>(await wrapped(input||{}))?.genres||[];
  root.__LIB_GOODREADS_GENRE_DIRECT_FALLBACK_V1_INSTALLED=true;
  root.__LIB_GENRE_SOURCE_POLICY='goodreads-direct-isbn-then-storygraph-v4';
  return true
}
(function boot(n=0){if(install())return;if(n<600)setTimeout(()=>boot(n+1),100)})();
root.__LIB_GOODREADS_GENRE_DIRECT_FALLBACK_TEST__={directGoodreads,labelsFromRaw,canonicalize,identityOk};
})();