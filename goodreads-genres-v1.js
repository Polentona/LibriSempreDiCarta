(()=>{
if(window.__LIB_GENRE_DELEGATE_V6)return;window.__LIB_GENRE_DELEGATE_V6=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
const GENERIC=new Set(['fiction','narrativa','letteratura','romanzo','novel','ragazzi','young adult','adult','libri per ragazzi','letterature straniere testi']);
let lastSig='',pending=false,lastAttempt=0;
function generic(v){const parts=String(v||'').split(/[,;|]/).map(norm).filter(Boolean);return !parts.length||parts.every(x=>GENERIC.has(x))}
function genreMap(text){
  const n=norm(text),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};
  if(!n)return out;
  const paranormalRomance=/paranormal romance|romance paranormal/.test(n);
  if(/narrativa rosa contemporanea|narrativa contemporanea|contemporary fiction|\bcontemporary\b|contemporane[oa]/.test(n))add('Narrativa contemporanea');
  if(!paranormalRomance&&/narrativa rosa|narrativa sentimentale|rosa sentimentale|romanzo rosa|romance fiction|romantic fiction|\bromance\b|\bsentimentale\b/.test(n))add('Narrativa rosa/sentimentale');
  if(/urban fantasy/.test(n))add('Urban Fantasy');else if(/\bfantasy\b/.test(n))add('Fantasy');
  if(paranormalRomance)add('Paranormal Romance');else if(/\bparanormal\b/.test(n))add('Paranormale');
  if(/\bhorror\b/.test(n))add('Horror');if(/\bgothic\b|gotico/.test(n))add('Gotico');
  if(/\bthriller\b|suspense/.test(n))add('Thriller');if(/\bmystery\b|detective fiction|\bgiallo\b/.test(n))add('Giallo');if(/\bcrime\b|noir/.test(n))add('Crime');
  if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');if(/historical fiction|romanzo storico|narrativa storica/.test(n))add('Storico');
  if(/dystopi/.test(n))add('Distopico');if(/magical realism|realismo magico/.test(n))add('Realismo magico');if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');
  if(/chick lit|chicklit/.test(n))add('Chick Lit');if(/\badventure\b|avventura/.test(n))add('Avventura');
  return out
}
async function fetchText(url,timeout=8500){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}}
async function reader(target){
  const attempts=[
    'https://r.jina.ai/'+target,
    'https://api.allorigins.win/raw?url='+encodeURIComponent(target),
    'https://corsproxy.io/?url='+encodeURIComponent(target)
  ];
  for(const u of attempts){const text=await fetchText(u);if(text&&text.length>250)return text}
  return''
}
function slug(v){return norm(v).replace(/\s+/g,'-')}
function classificationGenres(text){
  const raw=String(text||'');if(!raw)return[];
  const plain=clean(raw),n=norm(plain),chunks=[];
  for(const key of ['classificazione','genere','categoria']){const i=n.indexOf(key);if(i>=0)chunks.push(plain.slice(Math.max(0,i-100),i+850))}
  chunks.push(plain.slice(0,2400));
  return uniq(chunks.flatMap(genreMap))
}
async function retailerGenres({title,author,code}){
  const isbn=String(code||'').replace(/\D/g,'');if(!isbn)return[];
  const parts=clean(author).split(/\s+/).filter(Boolean),authorSlug=slug([...parts.slice(-1),...parts.slice(0,-1)].join(' ')),titleSlug=slug(title);
  const targets=[
    `https://www.unilibro.it/libro/${authorSlug}/${titleSlug}/${isbn}`,
    `https://www.eurolibro.it/libro/isbn/${isbn}.html`
  ];
  for(const target of targets){const text=await reader(target);const gs=classificationGenres(text);if(gs.length){window.__LIB_GENRE_RETAILER_LAST__={target,genres:gs};return gs}}
  return[]
}
function applyGenres(genres){
  const field=document.getElementById('editCategory');if(!field||!genres.length)return false;
  const current=clean(field.value),currentSpecific=generic(current)?[]:current.split(/[,;|]/).map(clean).filter(Boolean);
  const merged=uniq([...currentSpecific,...genres]);if(!merged.length)return false;
  field.value=merged.join(', ');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));return true
}
async function run(force=false){
  if(pending)return;
  const dlg=document.getElementById('editDialog'),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),code=clean(document.getElementById('editCode')?.value),field=document.getElementById('editCategory');
  if(!dlg?.open||!title||!author||!field||!generic(field.value))return;
  const sig=[code,norm(title),norm(author)].join('|'),now=Date.now();if(!force&&sig===lastSig&&now-lastAttempt<30000)return;lastSig=sig;lastAttempt=now;pending=true;
  try{
    let genres=[];
    if(typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'){
      try{await window.__LIB_RESOLVE_UNIVERSAL_SERIES({code,title,author,saga:document.getElementById('editSaga')?.value||'',publisher:document.getElementById('editPublisher')?.value||''});genres=uniq(window.__LIB_LAST_UNIVERSAL_GENRES__||[]).flatMap(genreMap)}catch(e){}
    }
    if(!genres.length)genres=await retailerGenres({title,author,code});
    if(genres.length)applyGenres(genres);
    window.__LIB_GENRE_DELEGATE_LAST__={sig,genres,field:field.value};
  }catch(e){window.__LIB_GENRE_DELEGATE_ERROR__=String(e&&e.message||e)}finally{pending=false}
}
function boot(){
  const field=document.getElementById('editCategory'),code=document.getElementById('editCode'),btn=document.getElementById('lookupMetadataBtn');
  if(field&&!field.__genreV6){field.__genreV6=true;field.addEventListener('change',()=>{if(generic(field.value))run(true)})}
  if(code&&!code.__genreV6){code.__genreV6=true;code.addEventListener('change',()=>{lastSig='';setTimeout(()=>run(true),300)})}
  if(btn&&!btn.__genreV6){btn.__genreV6=true;btn.addEventListener('click',()=>{lastSig='';setTimeout(()=>run(true),1200)})}
  run(false)
}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>=480)clearInterval(timer)},500);setTimeout(boot,0);
window.__LIB_LOOKUP_SPECIFIC_GENRES=opts=>retailerGenres(opts||{});
window.__LIB_GOODREADS_DIRECT_V4=false;
})();
