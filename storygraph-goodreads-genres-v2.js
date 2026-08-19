(()=>{
if(window.__LIB_STORYGRAPH_GOODREADS_GENRES_V2)return;window.__LIB_STORYGRAPH_GOODREADS_GENRES_V2=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const cache=new Map();

/* StoryGraph distingue Type, Genres, Moods e Pace. Qui sono ammesse soltanto
   le etichette della tassonomia Genres; Fiction/Nonfiction, mood e ritmo non
   vengono mai scritti nel campo Generi. */
const STORY_MOODS=['adventurous','challenging','dark','emotional','funny','hopeful','informative','inspiring','lighthearted','mysterious','reflective','relaxing','sad','tense'];
const STORY_PACES=['fast-paced','medium-paced','slow-paced'];
const STORY_TRANSLATIONS={
  'art':'Arte',
  'autobiography':'Autobiografia',
  'biography':'Biografia',
  'business':'Economia e affari',
  'childrens':'Letteratura per bambini',
  'children':'Letteratura per bambini',
  'children s':'Letteratura per bambini',
  'classics':'Classici',
  'comics':'Fumetti',
  'contemporary':'Narrativa contemporanea',
  'cookbook':'Ricettari',
  'crime':'Crime',
  'design':'Design',
  'dystopian':'Distopico',
  'economics':'Economia',
  'education':'Istruzione',
  'erotica':'Erotico',
  'essays':'Saggistica',
  'fantasy':'Fantasy',
  'feminism':'Femminismo',
  'food and drink':'Cibo e bevande',
  'gender':'Studi di genere',
  'graphic novel':'Romanzo grafico',
  'health':'Salute',
  'historical':'Storico',
  'history':'Storia',
  'horror':'Horror',
  'lgbtqia+':'LGBTQIA+',
  'literary':'Narrativa letteraria',
  'magical realism':'Realismo magico',
  'manga':'Manga',
  'mathematics':'Matematica',
  'memoir':'Memorie',
  'middle grade':'Narrativa per ragazzi',
  'music':'Musica',
  'mystery':'Giallo',
  'nature':'Natura',
  'philosophy':'Filosofia',
  'play':'Teatro',
  'poetry':'Poesia',
  'politics':'Politica',
  'psychology':'Psicologia',
  'race':'Razza ed etnia',
  'reference':'Opere di consultazione',
  'religion':'Religione',
  'romance':'Narrativa rosa/sentimentale',
  'science':'Scienza',
  'science fiction':'Fantascienza',
  'self help':'Autoaiuto',
  'short stories':'Racconti',
  'sociology':'Sociologia',
  'speculative fiction':'Narrativa speculativa',
  'sports':'Sport',
  'technology':'Tecnologia',
  'thriller':'Thriller',
  'travel':'Viaggi',
  'true crime':'Crimini reali',
  'video games':'Videogiochi',
  'young adult':'Narrativa per giovani adulti'
};
const STORY_KEYS=Object.keys(STORY_TRANSLATIONS).sort((a,b)=>b.length-a.length);

/* Goodreads usa una tassonomia diversa e molto più granulare. La teniamo
   separata per non fondere due generi StoryGraph adiacenti (es. Historical + Romance). */
const GOODREADS_TRANSLATIONS={
  ...STORY_TRANSLATIONS,
  'fiction':'Narrativa',
  'nonfiction':'Non-fiction',
  'non fiction':'Non-fiction',
  'adventure':'Avventura',
  'angels':'Angeli',
  'christian':'Cristiano',
  'christian fiction':'Narrativa cristiana',
  'dark romance':'Romance oscuro',
  'demons':'Demoni',
  'detective':'Investigativo',
  'fairy tales':'Fiabe',
  'historical fiction':'Storico',
  'historical romance':'Narrativa rosa storica',
  'humor':'Umorismo',
  'humour':'Umorismo',
  'mythology':'Mitologia',
  'new adult':'Narrativa per nuovi adulti',
  'paranormal':'Paranormale',
  'paranormal romance':'Romance paranormale',
  'romantic suspense':'Suspense romantica',
  'supernatural':'Soprannaturale',
  'time travel':'Viaggi nel tempo',
  'urban fantasy':'Fantasy urbano',
  'vampires':'Vampiri',
  'witches':'Streghe',
  'western':'Western',
  'war':'Guerra',
  'military fiction':'Narrativa militare',
  'historical mystery':'Giallo storico',
  'cozy mystery':'Giallo cozy',
  'psychological thriller':'Thriller psicologico',
  'psychological horror':'Horror psicologico',
  'gothic':'Gotico',
  'gothic horror':'Horror gotico',
  'suspense':'Suspense',
  'family saga':'Saga familiare',
  'chick lit':'Chick lit',
  'literary fiction':'Narrativa letteraria',
  'contemporary romance':'Narrativa rosa contemporanea',
  'fantasy romance':'Romantasy',
  'romantasy':'Romantasy',
  'urban':'Urban',
  'noir':'Noir'
};

function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·]+/g,' '))}
function translateStoryGenre(label){return STORY_TRANSLATIONS[norm(label)]||''}
function translateGoodreadsGenre(label){return GOODREADS_TRANSLATIONS[norm(label)]||''}
function wordIndex(hay,needle){const re=new RegExp(`(?:^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'i'),m=re.exec(hay);return m?m.index+(m[0].startsWith(' ')?1:0):-1}
function splitStoryGenres(text){
  let s=norm(text),out=[];
  while(s){
    let matched='';
    for(const key of STORY_KEYS){if(s===key||s.startsWith(key+' ')){matched=key;break}}
    if(!matched){window.__LIB_UNMAPPED_STORYGRAPH_GENRE__=s;return[]}
    out.push(translateStoryGenre(matched));s=s.slice(matched.length).trim()
  }
  return uniq(out)
}
function storyGenresFromLine(line){
  let x=clean(stripMd(line)).toLowerCase();if(!/^(?:fiction|nonfiction)(?:\s|$)/.test(x))return[];
  x=x.replace(/^(?:fiction|nonfiction)(?:\s+|$)/,'').trim();let cut=x.length;
  for(const stop of [...STORY_MOODS,...STORY_PACES]){const i=wordIndex(x,stop);if(i>=0&&i<cut)cut=i}
  x=x.slice(0,cut).trim();return x?splitStoryGenres(x):[]
}
function similar(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return true;const stop=new Set(['il','lo','la','i','gli','le','un','una','uno','di','del','della','dei','delle','the','a','an','of','and','e']),xa=x.split(' ').filter(w=>w.length>2&&!stop.has(w)),ya=y.split(' ').filter(w=>w.length>2&&!stop.has(w)),ys=new Set(ya),c=xa.filter(w=>ys.has(w)).length;return c>=Math.min(2,Math.min(xa.length,ya.length))&&c/Math.max(xa.length,ya.length)>=.6}
async function fetchText(url,timeout=12000){for(let attempt=0;attempt<2;attempt++){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'}});if(r.ok){const text=await r.text();if(text&&text.length>180)return text}if(r.status!==429&&r.status!==503)return''}catch(e){}finally{clearTimeout(t)}if(attempt===0)await new Promise(r=>setTimeout(r,1800))}return''}
async function jina(target){return fetchText('https://r.jina.ai/'+target)}
function normalizeCode(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}

function storyBlocks(text){
  const raw=String(text||'');
  return raw.split(/^###\s+/m).map(part=>part.trim()).filter(Boolean).map(part=>{
    const lines=part.split(/\r?\n/).map(stripMd).filter(Boolean),title=clean(lines[0]||'');
    if(!title||/^(?:remove book|report|content warnings?)$/i.test(title))return null;
    const joined=lines.join('\n'),m=joined.match(/ISBN\/UID:\s*([^\n]+)/i),code=clean(m?.[1]||'').replace(/^None$/i,'');
    let tagLine='';for(const line of lines){if(/^(?:fiction|nonfiction)(?:\s|$)/i.test(line)){tagLine=line;break}}
    return{title,code:normalizeCode(code),text:joined,genres:tagLine?storyGenresFromLine(tagLine):[],tagLine}
  }).filter(Boolean)
}
function storyMatch(blocks,{title,author,code}){
  const c=normalizeCode(code),surname=norm(author).split(' ').filter(Boolean).pop();
  if(c){const exact=blocks.find(b=>b.code===c);if(exact)return exact}
  if(title){const matches=blocks.filter(b=>similar(b.title,title)&&(!surname||norm(b.text).includes(surname)));if(matches.length)return matches[0]}
  return null
}
async function resolveStoryGraph({title,author,code}){
  title=clean(title);author=clean(author);code=normalizeCode(code);const queries=[];
  if(code)queries.push(code);if(title&&author)queries.push(`${title} ${author}`);else if(title)queries.push(title);
  for(const q of uniq(queries)){
    const url='https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),page=await jina(url);if(!page)continue;
    const blocks=storyBlocks(page),match=storyMatch(blocks,{title,author,code});
    if(match)return{found:true,genres:uniq(match.genres),labels:match.tagLine?[match.tagLine]:[],url,matchedTitle:match.title,matchedCode:match.code}
  }
  return{found:false,genres:[],labels:[],url:'',matchedTitle:'',matchedCode:''}
}

function decodeDdg(u){try{const x=new URL(u);if(!/duckduckgo\.com$/i.test(x.hostname))return u;const v=x.searchParams.get('uddg');return v?decodeURIComponent(v):u}catch(e){return u}}
function goodreadsLinks(text){const out=[],seen=new Set();for(const raw of String(text||'').match(/https?:\/\/[^\s)\]>'"]+/g)||[]){let u=decodeDdg(raw.replace(/&amp;/g,'&'));try{const x=new URL(u);if(!/(^|\.)goodreads\.com$/i.test(x.hostname)||!x.pathname.startsWith('/book/show/'))continue;x.search='';x.hash='';u=x.href;if(!seen.has(u)){seen.add(u);out.push(u)}}catch(e){}}return out}
function pageTitle(text){for(const line of String(text||'').split(/\r?\n/)){const m=line.match(/^#\s+(.+?)\s*$/);if(m&&norm(m[1])!=='goodreads')return clean(stripMd(m[1]).replace(/\s*\([^)]*edition[^)]*\)\s*$/i,''))}return''}
function goodreadsLabels(text){
  const raw=String(text||''),labels=[];
  const linkRes=[/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/genres\/[^)]+\)/gi,/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/shelf\/show\/[^)]+\)/gi];
  for(const re of linkRes){let m;while((m=re.exec(raw)))labels.push(stripMd(m[1]))}
  if(labels.length)return uniq(labels);
  const lines=raw.split(/\r?\n/);let start=-1;for(let i=0;i<lines.length;i++){const x=stripMd(lines[i]);if(/^genres?$/i.test(x)){start=i+1;break}}
  if(start>=0){for(let i=start;i<Math.min(lines.length,start+70);i++){const line=lines[i];if(i>start&&/^#{1,5}\s+/.test(line))break;const x=stripMd(line);if(!x||x.length>60||/^(?:see all|genres?|community reviews?|ratings?|friends reviews?|reader q&a)$/i.test(x))continue;if(/[A-Za-zÀ-ÿ]/.test(x))labels.push(x)}}
  return uniq(labels)
}
async function resolveGoodreads({title,author,code}){
  title=clean(title);author=clean(author);code=normalizeCode(code);if(!title||!author)return{found:false,genres:[],labels:[],url:''};
  const surname=norm(author).split(' ').pop(),queries=[`site:goodreads.com/book/show \"${title}\" \"${author}\"`,code?`site:goodreads.com/book/show \"${code}\" \"${title}\"`:''].filter(Boolean),candidates=[],seen=new Set();
  for(const q of queries){const search=await jina('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q));for(const u of goodreadsLinks(search)){if(!seen.has(u)){seen.add(u);candidates.push(u)}}if(candidates.length)break}
  for(const url of candidates.slice(0,5)){
    const page=await jina(url);if(!page)continue;const np=norm(page);if(surname&&!np.includes(surname))continue;
    const pt=pageTitle(page);if(pt&&!similar(pt,title))continue;
    const labels=goodreadsLabels(page),genres=uniq(labels.map(translateGoodreadsGenre).filter(Boolean));
    return{found:true,genres,labels,url,matchedTitle:pt||title}
  }
  return{found:false,genres:[],labels:[],url:''}
}

async function resolveGenres(opts={}){
  const key=[normalizeCode(opts.code),norm(opts.title),norm(opts.author)].join('|');if(cache.has(key))return cache.get(key);
  const sg=await resolveStoryGraph(opts);if(sg.found){const r={...sg,source:'storygraph'};cache.set(key,r);return r}
  const gr=await resolveGoodreads(opts);if(gr.found){const r={...gr,source:'goodreads'};cache.set(key,r);return r}
  const r={found:false,genres:[],labels:[],url:'',source:''};cache.set(key,r);return r
}
function writeGenres(genres,source='',url=''){
  const f=document.getElementById('editCategory');if(!f)return false;const value=uniq(genres).join(', ');
  f.value=value;f.dataset.genreSource=source||'';f.dataset.genreSourceUrl=url||'';
  f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));return true
}
let active={code:'',until:0,pending:false,lastSig:'',lastAttempt:0};
function signature(){return [normalizeCode(document.getElementById('editCode')?.value),norm(document.getElementById('editTitle')?.value),norm(document.getElementById('editAuthor')?.value)].join('|')}
function beginLookup(force=false){
  const d=document.getElementById('editDialog'),code=normalizeCode(document.getElementById('editCode')?.value);if(!d?.open||!code)return;
  if(!force&&active.code===code&&Date.now()<active.until)return;
  const f=document.getElementById('editCategory');if(f){f.value='';f.dataset.genreSource='';f.dataset.genreSourceUrl='';f.dispatchEvent(new Event('input',{bubbles:true}))}
  active={code,until:Date.now()+65000,pending:false,lastSig:'',lastAttempt:0};setTimeout(()=>run(true),900)
}
async function run(force=false){
  if(active.pending||!active.code||Date.now()>active.until)return;
  const d=document.getElementById('editDialog'),code=normalizeCode(document.getElementById('editCode')?.value),title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value);
  if(!d?.open||code!==active.code)return;
  if(!title||!author){const f=document.getElementById('editCategory');if(f&&f.value)writeGenres([], '', '');return}
  const sig=signature(),now=Date.now();if(!force&&sig===active.lastSig&&now-active.lastAttempt<7000)return;
  active.lastSig=sig;active.lastAttempt=now;active.pending=true;
  try{
    const r=await resolveGenres({title,author,code});
    if(signature()!==sig||normalizeCode(document.getElementById('editCode')?.value)!==active.code)return;
    writeGenres(r.genres,r.source,r.url);
    window.__LIB_GENRE_DELEGATE_LAST__={sig,genres:r.genres,labels:r.labels||[],source:r.source||'',url:r.url||'',found:r.found,field:document.getElementById('editCategory')?.value||''};
    active.until=0
  }catch(e){window.__LIB_GENRE_DELEGATE_ERROR__=String(e&&e.message||e);writeGenres([], '', '');active.until=0}
  finally{active.pending=false}
}
function boot(){
  const btn=document.getElementById('lookupMetadataBtn'),code=document.getElementById('editCode'),title=document.getElementById('editTitle'),author=document.getElementById('editAuthor');
  if(btn&&!btn.__storyGraphGenresV2){btn.__storyGraphGenresV2=true;btn.addEventListener('click',()=>beginLookup(true),true)}
  if(code&&!code.__storyGraphGenresV2){code.__storyGraphGenresV2=true;let timer=null;code.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(normalizeCode(code.value).length>=8)beginLookup(false)},750)});code.addEventListener('blur',()=>{if(normalizeCode(code.value).length>=8)beginLookup(false)})}
  for(const el of [title,author])if(el&&!el.__storyGraphGenresV2){el.__storyGraphGenresV2=true;el.addEventListener('input',()=>{if(active.code)setTimeout(()=>run(true),200)});el.addEventListener('change',()=>{if(active.code)setTimeout(()=>run(true),100)})}
  if(active.code&&Date.now()<active.until)run(false)
}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>=1200)clearInterval(timer)},500);setTimeout(boot,0);
window.__LIB_LOOKUP_SPECIFIC_GENRES=async opts=>(await resolveGenres(opts||{})).genres;
window.__LIB_RESOLVE_AUTHORITATIVE_GENRES=resolveGenres;
window.__LIB_GENRE_SOURCE_POLICY='storygraph-then-goodreads';
window.__LIB_STORYGRAPH_GENRES_TEST__={storyGenresFromLine,translateStoryGenre,storyBlocks,storyMatch};
})();