(()=>{
if(window.__LIB_GENRE_DELEGATE_V8)return;window.__LIB_GENRE_DELEGATE_V8=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
const GENERIC=new Set(['fiction','narrativa','letteratura','romanzo','novel','ragazzi','young adult','adult','libri per ragazzi','letterature straniere testi']);
const WEAK=new Set([...GENERIC,'crime']);
let lastSig='',pending=false,lastAttempt=0;
function weak(v){const parts=String(v||'').split(/[,;|]/).map(norm).filter(Boolean);return !parts.length||parts.every(x=>WEAK.has(x))}
function genreMap(text){
  const n=norm(text),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};if(!n)return out;
  const paranormalRomance=/paranormal romance|romance paranormal/.test(n);
  if(/narrativa rosa contemporanea|narrativa contemporanea|contemporary fiction|\bcontemporary\b|contemporane[oa]/.test(n))add('Narrativa contemporanea');
  if(!paranormalRomance&&/narrativa rosa|narrativa sentimentale|rosa sentimentale|romanzo rosa|romance fiction|romantic fiction|\bromance\b|\bsentimentale\b/.test(n))add('Narrativa rosa/sentimentale');
  if(/chick lit|chicklit/.test(n))add('Chick Lit');
  if(/urban fantasy/.test(n))add('Urban Fantasy');else if(/\bfantasy\b/.test(n))add('Fantasy');
  if(paranormalRomance)add('Paranormal Romance');else if(/\bparanormal\b/.test(n))add('Paranormale');
  if(/\bhorror\b/.test(n))add('Horror');if(/\bgothic\b|gotico/.test(n))add('Gotico');
  if(/\bthriller\b|suspense/.test(n))add('Thriller');if(/\bmystery\b|detective fiction|\bgiallo\b/.test(n))add('Giallo');if(/\bcrime\b|noir/.test(n))add('Crime');
  if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');if(/historical fiction|romanzo storico|narrativa storica/.test(n))add('Storico');
  if(/dystopi/.test(n))add('Distopico');if(/magical realism|realismo magico/.test(n))add('Realismo magico');if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');
  if(/\badventure\b|avventura/.test(n))add('Avventura');return out
}
async function fetchText(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}}
async function jina(target){const x=await fetchText('https://r.jina.ai/'+target);return x&&x.length>300?x:''}
function decodeDdg(u){try{const x=new URL(u);if(!/duckduckgo\.com$/i.test(x.hostname))return u;const v=x.searchParams.get('uddg');return v?decodeURIComponent(v):u}catch(e){return u}}
function goodreadsLinks(text){const out=[],seen=new Set(),re=/(https?:\/\/[^\s)\]>'"]+)/g;let m;while((m=re.exec(String(text||'')))){let u=decodeDdg(m[1].replace(/&amp;/g,'&'));try{const x=new URL(u);if(!/(^|\.)goodreads\.com$/i.test(x.hostname)||!x.pathname.startsWith('/book/show/'))continue;x.search='';u=x.href;if(!seen.has(u)){seen.add(u);out.push(u)}}catch(e){}}return out}
function titleFromPage(text){for(const line of String(text||'').split(/\r?\n/)){const m=line.match(/^#\s+(.+?)\s*$/);if(m&&norm(m[1])!=='goodreads')return clean(m[1])}return''}
function similar(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return true;const stop=new Set(['il','lo','la','i','gli','le','un','una','uno','di','del','della','dei','delle','the','a','of']),xa=x.split(' ').filter(w=>w.length>2&&!stop.has(w)),ya=y.split(' ').filter(w=>w.length>2&&!stop.has(w)),ys=new Set(ya),c=xa.filter(w=>ys.has(w)).length;return c>=Math.min(2,Math.min(xa.length,ya.length))&&c/Math.max(xa.length,ya.length)>=.6}
function genresFromGoodreads(text){const s=String(text||''),low=s.toLowerCase(),i=low.indexOf('genres');if(i<0)return[];return uniq(genreMap(s.slice(i,Math.min(s.length,i+1800))))}
async function goodreadsGenres({title,author}){
  const q=`site:goodreads.com/book/show \"${clean(title)}\" \"${clean(author)}\"`,search=await jina('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q)),surname=norm(author).split(' ').pop();
  for(const url of goodreadsLinks(search).slice(0,6)){
    const page=await jina(url);if(!page||!norm(page).includes(surname))continue;const pt=titleFromPage(page);if(pt&&!similar(pt,title))continue;const gs=genresFromGoodreads(page);if(gs.length){window.__LIB_GOODREADS_GENRES_LAST__={url,title:pt||title,genres:gs};return gs}
  }
  return[]
}
async function retailerGenres({title,author,code}){const isbn=String(code||'').replace(/\D/g,'');if(!isbn)return[];const p=clean(author).split(/\s+/),slug=v=>norm(v).replace(/\s+/g,'-'),target=`https://www.unilibro.it/libro/${slug([...p.slice(-1),...p.slice(0,-1)].join(' '))}/${slug(title)}/${isbn}`,text=await jina(target);return genreMap(text)}
function applyGenres(genres,{replace=false}={}){const field=document.getElementById('editCategory');if(!field||!genres.length)return false;const old=replace||weak(field.value)?[]:field.value.split(/[,;|]/).map(clean).filter(Boolean),merged=uniq([...old,...genres]);field.value=merged.join(', ');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));return true}
async function run(force=false){if(pending)return;const dlg=document.getElementById('editDialog'),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),code=clean(document.getElementById('editCode')?.value),field=document.getElementById('editCategory');if(!dlg?.open||!title||!author||!field)return;const sig=[code,norm(title),norm(author)].join('|'),now=Date.now();if(!force&&sig===lastSig&&now-lastAttempt<30000)return;if(!force&&!weak(field.value))return;lastSig=sig;lastAttempt=now;pending=true;try{let gs=await goodreadsGenres({title,author});let source='goodreads';if(!gs.length){gs=await retailerGenres({title,author,code});source='retailer'}if(!gs.length&&typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'){try{await window.__LIB_RESOLVE_UNIVERSAL_SERIES({code,title,author,saga:document.getElementById('editSaga')?.value||'',publisher:document.getElementById('editPublisher')?.value||''});gs=uniq(window.__LIB_LAST_UNIVERSAL_GENRES__||[]).flatMap(genreMap);source='universal'}catch(e){}}if(gs.length)applyGenres(gs,{replace:source==='goodreads'||weak(field.value)});window.__LIB_GENRE_DELEGATE_LAST__={sig,genres:gs,source,field:field.value}}catch(e){window.__LIB_GENRE_DELEGATE_ERROR__=String(e&&e.message||e)}finally{pending=false}}
function boot(){const field=document.getElementById('editCategory'),code=document.getElementById('editCode'),btn=document.getElementById('lookupMetadataBtn');if(field&&!field.__genreV8){field.__genreV8=true;field.addEventListener('change',()=>{if(weak(field.value))run(true)})}if(code&&!code.__genreV8){code.__genreV8=true;code.addEventListener('change',()=>{lastSig='';setTimeout(()=>run(true),500)})}if(btn&&!btn.__genreV8){btn.__genreV8=true;btn.addEventListener('click',()=>{lastSig='';setTimeout(()=>run(true),1400)})}run(false)}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>=480)clearInterval(timer)},500);setTimeout(boot,0);
window.__LIB_LOOKUP_SPECIFIC_GENRES=opts=>goodreadsGenres(opts||{});window.__LIB_GOODREADS_DIRECT_V8=true;
})();