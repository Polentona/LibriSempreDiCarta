(()=>{
if(window.__LIB_GOODREADS_GENRES_ONLY_V10)return;window.__LIB_GOODREADS_GENRES_ONLY_V10=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const cache=new Map();
const NON_GENRES=new Set(['fiction','nonfiction','non fiction','adult','young adult','ya','audiobook','audiobooks','kindle','ebooks','ebook','books','novels','novel','literature','book club','to read','owned','favorites','favourites','read','currently reading','did not finish','dnf','france','french literature','american','british literature','italian literature','school','library','new adult']);
let active={code:'',sig:'',until:0,genres:[],sourceUrl:'',pending:false,lastAttempt:0};
function signature(){return [clean(document.getElementById('editCode')?.value),norm(document.getElementById('editTitle')?.value),norm(document.getElementById('editAuthor')?.value)].join('|')}
function similar(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return true;const stop=new Set(['il','lo','la','i','gli','le','un','una','uno','di','del','della','dei','delle','the','a','of','and','e']),xa=x.split(' ').filter(w=>w.length>2&&!stop.has(w)),ya=y.split(' ').filter(w=>w.length>2&&!stop.has(w)),ys=new Set(ya),c=xa.filter(w=>ys.has(w)).length;return c>=Math.min(2,Math.min(xa.length,ya.length))&&c/Math.max(xa.length,ya.length)>=.62}
function mapLabel(label){const n=norm(label),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};if(!n||NON_GENRES.has(n))return out;
  if(/paranormal romance|romance paranormal/.test(n))return['Paranormal Romance'];
  if(/urban fantasy/.test(n))return['Urban Fantasy'];
  if(/historical romance/.test(n)){add('Storico');add('Narrativa rosa/sentimentale');return out}
  if(/romantic suspense/.test(n)){add('Narrativa rosa/sentimentale');add('Thriller');return out}
  if(/^contemporary$|contemporary fiction|contemporary women|women s fiction|womens fiction|narrativa contemporanea/.test(n))add('Narrativa contemporanea');
  if(/^romance$|romance fiction|romantic fiction|romanzo rosa|narrativa rosa|sentimentale/.test(n))add('Narrativa rosa/sentimentale');
  if(/chick lit|chicklit/.test(n))add('Chick Lit');
  if(/^mystery$|mystery thriller|detective|giallo/.test(n))add('Giallo');
  if(/^crime$|crime fiction|noir/.test(n))add('Crime');
  if(/^thriller$|suspense|psychological thriller/.test(n))add('Thriller');
  if(/^horror$|horror fiction/.test(n))add('Horror');
  if(/^gothic$|gothic fiction|gotico/.test(n))add('Gotico');
  if(/^paranormal$|supernatural/.test(n))add('Paranormale');
  if(/^fantasy$|fantasy fiction/.test(n))add('Fantasy');
  if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');
  if(/historical fiction|^historical$|romanzo storico/.test(n))add('Storico');
  if(/dystopi/.test(n))add('Distopico');
  if(/magical realism|realismo magico/.test(n))add('Realismo magico');
  if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');
  if(/^adventure$|adventure fiction|avventura/.test(n))add('Avventura');
  if(/literary fiction/.test(n))add('Narrativa letteraria');
  if(/family saga/.test(n))add('Saga familiare');
  if(/^humou?r$|humorous|comedy/.test(n))add('Umorismo');
  if(/^biography$|biographies/.test(n))add('Biografia');
  if(/^memoir$|memoirs/.test(n))add('Memoir');
  if(/^poetry$/.test(n))add('Poesia');
  if(/^essays?$/.test(n))add('Saggistica');
  if(/^dark romance$/.test(n))add('Dark Romance');
  return out
}
async function fetchText(url,timeout=11000){for(let attempt=0;attempt<2;attempt++){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'}});if(r.ok){const text=await r.text();if(text&&text.length>250)return text}if(r.status!==429&&r.status!==503)return''}catch(e){}finally{clearTimeout(t)}if(attempt===0)await new Promise(r=>setTimeout(r,2200))}return''}
async function jina(target){return fetchText('https://r.jina.ai/'+target)}
function decodeDdg(u){try{const x=new URL(u);if(!/duckduckgo\.com$/i.test(x.hostname))return u;const v=x.searchParams.get('uddg');return v?decodeURIComponent(v):u}catch(e){return u}}
function goodreadsLinks(text){const out=[],seen=new Set();for(const raw of String(text||'').match(/https?:\/\/[^\s)\]>'"]+/g)||[]){let u=decodeDdg(raw.replace(/&amp;/g,'&'));try{const x=new URL(u);if(!/(^|\.)goodreads\.com$/i.test(x.hostname)||!x.pathname.startsWith('/book/show/'))continue;x.search='';x.hash='';u=x.href;if(!seen.has(u)){seen.add(u);out.push(u)}}catch(e){}}return out}
function pageTitle(text){for(const line of String(text||'').split(/\r?\n/)){const m=line.match(/^#\s+(.+?)\s*$/);if(m&&norm(m[1])!=='goodreads')return clean(m[1].replace(/\s*\([^)]*edition[^)]*\)\s*$/i,''))}return''}
function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·-]+/g,' '))}
function labelsFromGenreSection(text){const raw=String(text||''),labels=[];
  const linkRes=[/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/genres\/[^)]+\)/gi,/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/shelf\/show\/[^)]+\)/gi];
  for(const re of linkRes){let m;while((m=re.exec(raw)))labels.push(stripMd(m[1]))}
  const lines=raw.split(/\r?\n/);let start=-1;for(let i=0;i<lines.length;i++){const x=stripMd(lines[i]);if(/^genres?$/i.test(x)){start=i+1;break}}
  if(start>=0){for(let i=start;i<Math.min(lines.length,start+90);i++){const line=lines[i];if(i>start&&/^#{1,5}\s+/.test(line))break;const x=stripMd(line);if(!x||x.length>70||/^(?:see all|genres?|community reviews?|ratings?|friends reviews?|reader q&a)$/i.test(x))continue;if(/[A-Za-zÀ-ÿ]/.test(x))labels.push(x)}}
  return uniq(labels)
}
function mappedGenres(text){const labels=labelsFromGenreSection(text),mapped=uniq(labels.flatMap(mapLabel));return{labels,mapped}}
async function resolveGoodreads({title,author,code}){title=clean(title);author=clean(author);code=clean(code);const k=[norm(title),norm(author)].join('|');if(!title||!author)return{genres:[],labels:[],url:''};if(cache.has(k))return cache.get(k);const surname=norm(author).split(' ').pop(),queries=[`site:goodreads.com/book/show \"${title}\" \"${author}\"`,code?`site:goodreads.com/book/show \"${code}\" \"${title}\"`:'' ].filter(Boolean);let candidates=[];
  for(const q of queries){const search=await jina('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q));candidates=uniq([...candidates,...goodreadsLinks(search)]);if(candidates.length)break}
  for(const url of candidates.slice(0,4)){const page=await jina(url);if(!page)continue;const np=norm(page);if(surname&&!np.includes(surname))continue;const pt=pageTitle(page);if(pt&&!similar(pt,title))continue;const r=mappedGenres(page);if(r.mapped.length){const out={genres:r.mapped,labels:r.labels,url,title:pt||title};cache.set(k,out);window.__LIB_GOODREADS_GENRES_LAST__=out;return out}}
  window.__LIB_GOODREADS_GENRES_LAST__={genres:[],labels:[],url:'',title};return{genres:[],labels:[],url:''}
}
function writeGenres(genres,url=''){const f=document.getElementById('editCategory');if(!f)return false;const value=uniq(genres).join(', ');f.value=value;f.dataset.genreSource=value?'goodreads':'';f.dataset.goodreadsUrl=url||'';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));return true}
function enforce(){const f=document.getElementById('editCategory');if(!f||!active.code||Date.now()>active.until)return;if(active.genres.length){const expected=uniq(active.genres).join(', ');if(f.value!==expected)writeGenres(active.genres,active.sourceUrl)}else if(f.value){f.value='';f.dataset.genreSource='';f.dispatchEvent(new Event('input',{bubbles:true}))}}
async function run(force=false){if(active.pending||!active.code||Date.now()>active.until)return;const d=document.getElementById('editDialog'),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),code=clean(document.getElementById('editCode')?.value);if(!d?.open||code!==active.code||!title||!author){enforce();return}const sig=signature();if(!active.sig||active.sig!==sig)active.sig=sig;const now=Date.now();if(!force&&now-active.lastAttempt<7500){enforce();return}active.lastAttempt=now;active.pending=true;try{const r=await resolveGoodreads({title,author,code});active.genres=r.genres;active.sourceUrl=r.url;if(r.genres.length)writeGenres(r.genres,r.url);else enforce();window.__LIB_GENRE_DELEGATE_LAST__={sig,genres:r.genres,labels:r.labels||[],source:'goodreads',url:r.url||'',field:document.getElementById('editCategory')?.value||''}}catch(e){window.__LIB_GENRE_DELEGATE_ERROR__=String(e&&e.message||e);enforce()}finally{active.pending=false}}
function beginLookup(){const f=document.getElementById('editCategory'),code=clean(document.getElementById('editCode')?.value);if(f){f.value='';f.dataset.genreSource='';f.dispatchEvent(new Event('input',{bubbles:true}))}active={code,sig:'',until:Date.now()+50000,genres:[],sourceUrl:'',pending:false,lastAttempt:0};setTimeout(()=>run(true),900);setTimeout(()=>run(true),8500);setTimeout(()=>run(true),22000)}
function boot(){const btn=document.getElementById('lookupMetadataBtn');if(btn&&!btn.__goodreadsOnlyV10){btn.__goodreadsOnlyV10=true;btn.addEventListener('click',beginLookup,true)}if(active.code&&Date.now()<active.until){enforce();run(false)}}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>=1200)clearInterval(timer)},500);setTimeout(boot,0);
window.__LIB_LOOKUP_SPECIFIC_GENRES=async opts=>(await resolveGoodreads(opts||{})).genres;
window.__LIB_GOODREADS_DIRECT_V10=true;
window.__LIB_GENRE_SOURCE_POLICY='goodreads-only';
})();
