(()=>{
if(window.__LIB_GENRE_OPENLIBRARY_WORK_V1)return;window.__LIB_GENRE_OPENLIBRARY_WORK_V1=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];
const GENERIC=new Set(['fiction','narrativa','letteratura','romanzo','novel','ragazzi','young adult','adult','libri per ragazzi','letterature straniere testi']);
const stop=new Set(['the','and','del','della','delle','dei','degli','con','per','una','uno','un','di','da','il','lo','la','gli','le','i','a','al','alla','des','les','la','le','de','du','et']);
const words=v=>norm(v).split(' ').filter(x=>x.length>2&&!stop.has(x));
function sameTitle(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.startsWith(y+' ')||y.startsWith(x+' '))return true;const xa=new Set(words(x)),ya=new Set(words(y));if(!xa.size||!ya.size)return false;const common=[...xa].filter(w=>ya.has(w)).length;return common>=Math.min(2,Math.min(xa.size,ya.size))&&common/Math.max(xa.size,ya.size)>=.72}
async function getJson(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(t)}}
function stripWiki(v){return String(v||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/>]*\/>/gi,' ').replace(/\{\{[^{}]{0,600}\}\}/g,' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/''+/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ')}
function originalFromWikitext(wt,title){
  for(const raw of String(wt||'').split(/\r?\n/)){
    const line=clean(stripWiki(raw));if(!line||!norm(line).includes(norm(title)))continue;
    const groups=[...line.matchAll(/\(([^()]{3,220})\)/g)].map(m=>clean(m[1]));
    for(const g of groups){
      let x=g.replace(/,?\s*(?:18|19|20)\d{2}(?:\s*[-–]\s*(?:18|19|20)\d{2})?\s*$/,'').replace(/^["“”«»']+|["“”«»']+$/g,'').trim();
      if(!x||sameTitle(x,title)||/^\d+$/.test(x)||/^(?:romanzo|novel|edizione|volume)\b/i.test(x))continue;
      if(words(x).length>=1&&x.length<=180)return x;
    }
  }
  return'';
}
async function wikipediaOriginal(author,title){
  const base='https://it.wikipedia.org/w/api.php';
  async function parse(page){if(!page)return'';const p=new URLSearchParams({action:'parse',page,prop:'wikitext',format:'json',origin:'*'}),d=await getJson(base+'?'+p);return d?.parse?.wikitext?.['*']||''}
  let page=author,wt=await parse(page);
  if(!wt){const q=new URLSearchParams({action:'query',list:'search',srsearch:author,srnamespace:'0',srlimit:'3',format:'json',origin:'*'}),d=await getJson(base+'?'+q);page=d?.query?.search?.[0]?.title||'';wt=await parse(page)}
  const original=originalFromWikitext(wt,title);window.__LIB_GENRE_WIKI_ORIGINAL_LAST__={page,original};return original;
}
function mapSubjects(subjects,year){
  const raw=Array.isArray(subjects)?subjects.join(' | '):String(subjects||''),n=norm(raw),out=[],add=x=>{if(x&&!out.includes(x))out.push(x)};
  const relationship=/relations entre hommes et femmes|relations? hommes femmes|man woman relationships?|male female relationships?|interpersonal relations|love stories|romance|romantic|sentimental|amour|courtship|dating/.test(n);
  const contemporary=/contemporary women|contemporary fiction|contemporary literature|modern life|modern women|contemporane[oa]/.test(n);
  const historical=/historical|history fiction|romanzo storico|narrativa storica|world war|guerre? mondiale|victorian|medieval|middle ages|renaissance|ancien regime|19th century|18th century|17th century/.test(n);
  const speculative=/fantasy|science fiction|sci fi|fantascienza|dystopi|paranormal|supernatural|horror|gothic|gotico|magic/.test(n);
  if(contemporary)add('Narrativa contemporanea');
  if(relationship)add('Narrativa rosa/sentimentale');
  if(/chick lit|chicklit/.test(n))add('Chick Lit');
  if(/mystery|detective fiction|detective stories|giallo/.test(n))add('Giallo');
  if(/crime fiction|crime stories|\bcrime\b|murder|omicid/.test(n))add('Crime');
  if(/thriller|suspense/.test(n))add('Thriller');
  if(/psychological fiction|fiction psychological|psychological/.test(n))add('Psicologico');
  if(/urban fantasy/.test(n))add('Urban Fantasy');else if(/\bfantasy\b/.test(n))add('Fantasy');
  if(/paranormal romance/.test(n))add('Paranormal Romance');else if(/\bparanormal\b|supernatural/.test(n))add('Paranormale');
  if(/\bhorror\b/.test(n))add('Horror');if(/gothic|gotico/.test(n))add('Gotico');
  if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');
  if(historical)add('Storico');if(/dystopi/.test(n))add('Distopico');if(/magical realism|realismo magico/.test(n))add('Realismo magico');if(/time travel|viaggi? nel tempo/.test(n))add('Viaggi nel tempo');if(/adventure|avventura/.test(n))add('Avventura');if(/humou?r|umor/.test(n))add('Umorismo');
  const y=Number(year)||0;
  if(!contemporary&&relationship&&y>=1950&&!historical&&!speculative)add('Narrativa contemporanea');
  return out;
}
async function openLibrary(title,author){
  if(!title||!author)return[];
  const u='https://openlibrary.org/search.json?'+new URLSearchParams({title,author,fields:'key,title,author_name,subject,first_publish_year',limit:'12'}),d=await getJson(u,10000),surname=norm(author).split(' ').pop(),out=[];
  for(const doc of d?.docs||[]){if(surname&&!norm((doc.author_name||[]).join(' ')).includes(surname))continue;out.push(...mapSubjects(doc.subject||[],doc.first_publish_year||0))}
  return uniq(out);
}
function apply(genres){
  const f=document.getElementById('editCategory');if(!f||!genres.length)return false;
  const old=String(f.value||'').split(/[,;|]/).map(clean).filter(Boolean).filter(x=>!GENERIC.has(norm(x)));
  const merged=uniq([...old,...genres]);if(!merged.length)return false;
  f.value=merged.join(', ');f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
const cache=new Map();
async function resolve({title,author}){
  const sig=norm(title)+'|'+norm(author);if(cache.has(sig))return cache.get(sig);
  const p=(async()=>{
    const current=await openLibrary(title,author),original=await wikipediaOriginal(author,title),origGenres=original?await openLibrary(original,author):[];
    const genres=uniq([...current,...origGenres]);window.__LIB_GENRE_OPENLIBRARY_LAST__={title,author,original,current,origGenres,genres};return genres;
  })();cache.set(sig,p);return p;
}
let busy=false,lastSig='',lastAt=0;
async function run(force=false){
  if(busy)return;const d=document.getElementById('editDialog'),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),isbn=String(document.getElementById('editCode')?.value||'').replace(/\D/g,'');
  if(!d?.open||!title||!author||!isbn)return;const sig=isbn+'|'+norm(title)+'|'+norm(author),now=Date.now();if(!force&&sig===lastSig&&now-lastAt<45000)return;lastSig=sig;lastAt=now;busy=true;
  try{const genres=await resolve({title,author});if(genres.length)apply(genres)}catch(e){window.__LIB_GENRE_OPENLIBRARY_ERROR__=String(e&&e.message||e)}finally{busy=false}
}
function boot(){const btn=document.getElementById('lookupMetadataBtn'),code=document.getElementById('editCode');if(btn&&!btn.__olGenreV1){btn.__olGenreV1=true;btn.addEventListener('click',()=>setTimeout(()=>run(true),1500))}if(code&&!code.__olGenreV1){code.__olGenreV1=true;code.addEventListener('change',()=>setTimeout(()=>run(true),700))}run(false)}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>=480)clearInterval(timer)},750);setTimeout(boot,0);
window.__LIB_RESOLVE_OPENLIBRARY_GENRES=resolve;
})();
