(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_PRIMARY_METADATA_V1)return;
root.__LIB_GOODREADS_PRIMARY_METADATA_V1=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const isbn=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>{const out=[],seen=new Set();for(const v of a||[]){const x=clean(v),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const textCache=new Map(),metaCache=new Map(),inflight=new Map();

const GENRE_MAP={
  'thriller':'Thriller','crime':'Crime','mystery':'Giallo','horror':'Horror','fantasy':'Fantasy',
  'science fiction':'Fantascienza','historical fiction':'Storico','history':'Storia','historical':'Storico',
  'romance':'Narrativa rosa/sentimentale','paranormal':'Paranormale','supernatural':'Soprannaturale',
  'dystopian':'Distopico','adventure':'Avventura','young adult':'Narrativa per giovani adulti',
  'middle grade':'Narrativa per ragazzi','classics':'Classici','literary fiction':'Narrativa letteraria',
  'contemporary':'Narrativa contemporanea','short stories':'Racconti','poetry':'Poesia','memoir':'Memorie',
  'biography':'Biografia','autobiography':'Autobiografia','true crime':'Crimini reali','war':'Guerra',
  'western':'Western','gothic':'Gotico','psychological thriller':'Thriller psicologico',
  'psychological horror':'Horror psicologico','historical mystery':'Giallo storico','cozy mystery':'Giallo cozy',
  'urban fantasy':'Fantasy urbano','romantasy':'Romantasy','dark romance':'Romance oscuro',
  'historical romance':'Narrativa rosa storica','contemporary romance':'Narrativa rosa contemporanea',
  'graphic novel':'Romanzo grafico','comics':'Fumetti','manga':'Manga','humor':'Umorismo','humour':'Umorismo',
  'mythology':'Mitologia','religion':'Religione','philosophy':'Filosofia','psychology':'Psicologia',
  'science':'Scienza','nature':'Natura','travel':'Viaggi','sports':'Sport','music':'Musica','art':'Arte',
  'essays':'Saggistica','self help':'Autoaiuto','business':'Economia e affari','economics':'Economia',
  'technology':'Tecnologia','education':'Istruzione','food and drink':'Cibo e bevande','cookbook':'Ricettari',
  'erotica':'Erotico','noir':'Noir','family saga':'Saga familiare','chick lit':'Chick lit',
  'speculative fiction':'Narrativa speculativa','magical realism':'Realismo magico',
  'lgbtqia+':'LGBTQIA+','feminism':'Femminismo'
};
const GENRE_KEYS=Object.keys(GENRE_MAP).sort((a,b)=>b.length-a.length);
const GENRE_PRIORITY=['Crime','Giallo','Thriller','Thriller psicologico','Giallo storico','Giallo cozy','Horror','Horror psicologico','Fantasy','Fantasy urbano','Fantascienza','Storico','Storia','Distopico','Paranormale','Soprannaturale','Avventura','Narrativa letteraria','Narrativa contemporanea','Narrativa rosa/sentimentale','Narrativa rosa storica','Narrativa rosa contemporanea','Romantasy','Romance oscuro','Classici','Racconti','Crimini reali','Noir'];

function cleanTitle(v){
  let x=clean(v)
    .replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'')
    .replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,'')
    .replace(/\s*\([^()]{2,100}?(?:,\s*)?#?\s*\d+(?:\.\d+)?\)\s*$/i,'')
    .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'')
    .replace(/\s*(?:(?:[:|–—-]\s*)|(?:\(\s*))(?:(?:un|a)\s+)?(?:romanzo|novel|libro|book)\s*\)?\s*$/i,'')
    .replace(/\s*[:|]\s*(?:edizione|edition)\s+[^:|]{1,80}$/i,'')
    .replace(/\s+/g,' ').trim();
  return x;
}
function cleanSaga(v){
  let x=clean(v).replace(/\s+#\s*\d+(?:\.\d+)?\s*$/,'').replace(/^\s*(?:series|serie|saga)\s*:\s*/i,'').trim();
  return x.length<=120?x:'';
}
function stripMd(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#•·]+/g,' '))}
function isItalian(text){
  const n=' '+norm(text)+' ';if(n.length<100)return false;
  const it=[' il ',' lo ',' la ',' gli ',' le ',' di ',' del ',' della ',' dei ',' delle ',' che ',' un ',' una ',' per ',' con ',' nel ',' nella ',' non ',' e ',' alla ',' anche ',' come ',' ma ',' piu ',' suo ',' sua ',' sono ',' al ',' da '];
  const en=[' the ',' and ',' of ',' to ',' in ',' a ',' an ',' with ',' from ',' for ',' is ',' are ',' his ',' her ',' but ',' not ',' on ',' as ',' that '];
  let a=0,b=0;for(const w of it)if(n.includes(w))a++;for(const w of en)if(n.includes(w))b++;
  return a>=4&&a>=b;
}
function cleanPlot(v){
  let x=String(v||'').replace(/\r/g,'\n');
  x=x.replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]*)\]\((?:https?:\/\/|www\.)[^)]*\)/gi,'$1');
  x=x.replace(/https?:\/\/\S+|www\.\S+/gi,' ');
  x=x.replace(/\s+/g,' ').trim();
  const cut=x.search(/\s+(?:€|EUR\b|\bprezzo\b|\bacquista\b|\bcompra\b|\baggiungi al carrello\b|\bspedizione\b|\bdisponibilit[aà]\b)/i);
  if(cut>150)x=x.slice(0,cut).trim();
  x=x.replace(/^(?:descrizione|description|trama|sinossi)\s*[:\-–—]?\s*/i,'').trim();
  return x;
}
function normalizePublisher(v){
  let x=clean(v).replace(/^published\s+.+?\s+by\s+/i,'').replace(/^publisher\s*:\s*/i,'');
  return x.replace(/\s*(?:,\s*|\s*:\s*)?(?:provider|fornitore)\s*:.*$/i,'').trim();
}
function normalizeDate(v){
  const x=clean(v),m=x.match(/\b((?:18|19|20)\d{2})\b/);return m?m[1]:x;
}
function goodreadsGenres(raw){
  const s=String(raw||''),labels=[];
  for(const re of [/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/genres\/[^)]+\)/gi,/\[([^\]]{2,80})\]\((?:https?:\/\/(?:www\.)?goodreads\.com)?\/shelf\/show\/[^)]+\)/gi]){let m;while((m=re.exec(s)))labels.push(stripMd(m[1]))}
  if(!labels.length){
    const m=s.match(/Genres\s*([A-Za-zÀ-ÿ][^\n]{2,500}?)(?:\n|\.{3}more|\bpages\b)/i);
    if(m){const compact=clean(m[1]);for(const k of GENRE_KEYS){const re=new RegExp(`(?:^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'i');if(re.test(compact))labels.push(k)}}
  }
  const mapped=[];for(const label of uniq(labels)){const k=norm(label);if(k==='fiction'||k==='nonfiction'||k==='non fiction'||/audiobook|literature$/.test(k))continue;const v=GENRE_MAP[k];if(v)mapped.push(v)}
  const out=uniq(mapped);
  return out.sort((a,b)=>{const ia=GENRE_PRIORITY.indexOf(a),ib=GENRE_PRIORITY.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,'it')});
}
function rawContainsIsbn(raw,target){const n=isbn(target);if(!n)return false;return String(raw||'').split(/[^0-9Xx-]+/).some(t=>isbn(t)===n)}
function mdLinks(raw,kind=''){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');
    if(kind==='book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;
    if(kind==='editions'&&!/goodreads\.com\/work\/editions\/|goodreads\.com\/book\/editions\//i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }return out;
}
async function fetchText(url,timeout=10000){
  if(textCache.has(url))return await textCache.get(url);
  const p=(async()=>{const fn=root.__LIB_BROKER_TEXT; if(typeof fn==='function')return await fn(url,timeout);
    const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});return r.ok?await r.text():''}catch(e){return''}finally{clearTimeout(t)}})();
  textCache.set(url,p);return await p;
}
async function jina(target,timeout=10000){
  for(const t of [target,target.replace(/^https:\/\//i,'http://')]){
    if(!t)continue;const raw=await fetchText('https://r.jina.ai/'+t,timeout);if(raw&&raw.length>120)return raw;
  }return'';
}
function headingTitle(raw){
  for(const m of String(raw||'').matchAll(/^#\s+(.+)$/gm)){const t=cleanTitle(stripMd(m[1]));if(t&&!/goodreads|editions|reviews/i.test(norm(t)))return t}return'';
}
function parseAuthor(raw){
  const s=String(raw||''),titlePos=s.search(/^#\s+/m),after=titlePos>=0?s.slice(titlePos):s;
  for(const m of after.matchAll(/^###\s+(.+)$/gm)){let t=stripMd(m[1]);if(!t||/^(?:about the author|ratings|reviews|book details|genres|want to read|shop this series)$/i.test(norm(t)))continue;
    t=t.replace(/\s*\([^)]*(?:translator|traduttore|editor|illustrator)[^)]*\)\s*/gi,'').split(/\s*,\s*/)[0].trim();
    if(t&&t.split(/\s+/).length<=7&&!/\d/.test(t))return t;
  }return'';
}
function parseSeriesMeta(raw,title=''){
  const s=String(raw||''),patterns=[
    /^###\s+(.+?)\s+#\s*(\d+(?:\.\d+)?)\s*$/gmi,
    /\bBook\s+(\d+(?:\.\d+)?)\s+of\s+\d+\s*:\s*([^\n]+)/gi
  ];
  for(const re of patterns){const m=re.exec(s);if(!m)continue;
    if(re===patterns[0])return{saga:cleanSaga(stripMd(m[1])),position:Number(m[2])};
    return{saga:cleanSaga(stripMd(m[2])),position:Number(m[1])};
  }
  const t=String(title||'').match(/\(([^()]{2,120}?),\s*#\s*(\d+(?:\.\d+)?)\)\s*$/i);
  return t?{saga:cleanSaga(t[1]),position:Number(t[2])}:{saga:'',position:NaN};
}
function parseDescription(raw){
  const s=String(raw||'');
  const g=s.search(/(?:^|\n)\s*Genres\b/i);let before=g>=0?s.slice(0,g):s;
  const anchors=[...before.matchAll(/(?:Rate this book|Want to Read|Shop this series|Average rating[^\n]*)\s*$/gmi)];
  let start=anchors.length?anchors.at(-1).index+anchors.at(-1)[0].length:before.search(/^#\s+/m);
  if(start<0)start=0;let x=before.slice(start);
  x=x.replace(/^.*?^(?:Rate this book|Want to Read|Shop this series)\s*$/gmi,' ');
  const lines=x.split(/\n+/).map(stripMd).filter(Boolean).filter(l=>!/^(\d(?:\.\d+)?\s+[\d,]+\s+ratings|book details|first published|want to read|shop this series|rate this book)$/i.test(l));
  const joined=clean(lines.join(' '));
  const firstPub=joined.search(/\b\d+\s+pages\b|\bFirst published\b/i);
  return cleanPlot(firstPub>150?joined.slice(0,firstPub):joined);
}
function coverFromRaw(raw){
  const urls=[];
  for(const m of String(raw||'').matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g))urls.push(m[1]);
  for(const u of String(raw||'').match(/https?:\/\/[^\s"'<>]+(?:goodreads|ssl-images-amazon)[^\s"'<>]+?\.(?:jpg|jpeg|png)/gi)||[])urls.push(u);
  return urls.find(u=>/compressed\.photo\.goodreads\.com\/books|images-na\.ssl-images-amazon\.com\/images\/S\/compressed\.photo\.goodreads\.com\/books/i.test(u))||'';
}
function editionsLink(raw){
  const links=mdLinks(raw,'editions');if(links.length)return links[0].url;
  const m=String(raw||'').match(/https?:\/\/(?:www\.)?goodreads\.com\/work\/editions\/[\w.-]+/i);return m?m[0]:'';
}
function editionBlocks(raw){
  const s=String(raw||''),heads=[...s.matchAll(/^#{1,4}\s+(.+)$/gm)],out=[];
  for(let i=0;i<heads.length;i++){const start=heads[i].index,end=heads[i+1]?.index??s.length,block=s.slice(start,end);if(!/\bISBN\s*:/i.test(block))continue;out.push({title:cleanTitle(stripMd(heads[i][1])),block,start})}
  if(out.length)return out;
  const chunks=s.split(/(?=Published\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4}))/i);
  return chunks.map(block=>({title:'',block,start:s.indexOf(block)})).filter(x=>/\bISBN\s*:/i.test(x.block));
}
function parseEditionBlock(b){
  const block=String(b?.block||''),im=block.match(/\bISBN\s*:\s*([0-9Xx-]{10,20})/i),lang=(block.match(/Edition language\s*:\s*([^\n]+)/i)||[])[1]||'';
  const pub=block.match(/Published\s+([^\n]+?)\s+by\s+([^\n]+)/i),formatLine=(block.match(/\n([^,\n]{1,90}(?:Paperback|Hardcover|Mass Market|Hardback|Tascabile|Brossura)[^,\n]*)/i)||[])[1]||'';
  const ebook=/\b(?:Kindle|ebook|e-book|digital|epub|mobi|audiobook|audio)\b/i.test(block),physical=!ebook&&/\b(?:Paperback|Hardcover|Hardback|Mass Market|Tascabile|Brossura|Copertina)\b/i.test(block);
  const links=mdLinks(block,'book');
  const rawTitle=clean(b.title||links[0]?.label||'');
  return{title:cleanTitle(rawTitle),rawTitle,isbn:isbn(im?.[1]||''),language:clean(lang),publisher:normalizePublisher(pub?.[2]||''),published:normalizeDate(pub?.[1]||''),physical,ebook,url:links[0]?.url||'',cover:coverFromRaw(block),raw:block,series:parseSeriesMeta(rawTitle)};
}
async function goodreadsSearch(isbnCode){
  const target='https://www.goodreads.com/search?q='+encodeURIComponent(isbnCode)+'&search_type=books',raw=await jina(target,9000);
  return{raw,books:mdLinks(raw,'book'),editions:mdLinks(raw,'editions')};
}
async function goodreadsBookPage(url){const raw=await jina(url,9500);return raw?{url,raw,title:headingTitle(raw),author:parseAuthor(raw),series:parseSeriesMeta(raw),description:parseDescription(raw),genres:goodreadsGenres(raw),cover:coverFromRaw(raw),editions:editionsLink(raw),seriesUrl:mdLinks(raw,'series')[0]?.url||''}:null}
async function exactEditionFromWork(url,isbnCode){
  if(!url)return null;
  const base=String(url).replace(/[?&]page=\d+/i,'').replace(/[?&]+$/,'');
  const pages=[url];
  if(/goodreads\.com\/work\/editions\//i.test(base)){
    for(let n=2;n<=8;n++)pages.push(base+(base.includes('?')?'&':'?')+'page='+n);
  }
  const seen=new Set();
  for(const u of pages){
    if(!u||seen.has(u))continue;seen.add(u);
    const raw=await jina(u,10000);if(!raw)continue;
    const blocks=editionBlocks(raw).map(parseEditionBlock),exact=blocks.find(x=>x.isbn===isbn(isbnCode));
    if(exact)return{...exact,pageUrl:u};
    const next=String(raw).match(/\[next\s*»?\]\((https?:\/\/(?:www\.)?goodreads\.com\/work\/editions\/[^)]+)\)/i)?.[1]||'';
    if(next&&!seen.has(next))pages.push(next);
  }
  return null;
}
async function resolveGoodreadsEdition(isbnCode){
  const key=isbn(isbnCode);if(!key)return null;if(metaCache.has(key))return metaCache.get(key);if(inflight.has(key))return await inflight.get(key);
  const task=(async()=>{
    const search=await goodreadsSearch(key);let pages=[];
    for(const l of search.books.slice(0,5)){const p=await goodreadsBookPage(l.url);if(p)pages.push(p);if(p&&rawContainsIsbn(p.raw,key))break}
    let exactPage=pages.find(p=>rawContainsIsbn(p.raw,key))||null,edition=null;
    const editionLinks=uniq([exactPage?.editions,...search.editions.map(x=>x.url),...pages.map(x=>x.editions)].filter(Boolean));
    for(const u of editionLinks){edition=await exactEditionFromWork(u,key);if(edition)break}
    if(edition?.url&&!exactPage){exactPage=await goodreadsBookPage(edition.url)}
    if(edition?.url&&exactPage&&!rawContainsIsbn(exactPage.raw,key)){const p=await goodreadsBookPage(edition.url);if(p)exactPage=p}
    if(!exactPage&&pages.length)exactPage=pages[0];
    if(!exactPage&&!edition)return null;
    const result={
      source:'goodreads',isbn:key,
      title:cleanTitle(edition?.title||exactPage?.title||''),
      author:clean(exactPage?.author||''),
      publisher:normalizePublisher(edition?.publisher||''),
      published:normalizeDate(edition?.published||''),
      description:cleanPlot(exactPage?.description||''),
      genres:exactPage?.genres||[],
      cover:edition?.cover||exactPage?.cover||'',
      series:(Number.isFinite(edition?.series?.position)?edition.series:null)||exactPage?.series||parseSeriesMeta(edition?.rawTitle||edition?.title||''),
      seriesUrl:exactPage?.seriesUrl||'',
      bookUrl:exactPage?.url||edition?.url||'',
      editionsUrl:exactPage?.editions||editionLinks[0]||'',
      raw:exactPage?.raw||''
    };
    return result;
  })().finally(()=>inflight.delete(key));
  inflight.set(key,task);const r=await task;if(r)metaCache.set(key,r);return r;
}

function parseSeriesRows(raw){
  const s=String(raw||''),rows=[],heads=[...s.matchAll(/^###\s+Book\s+([^\n]+)\s*$/gmi)];
  for(let i=0;i<heads.length;i++){const token=clean(heads[i][1]);if(/[-–—]/.test(token))continue;const p=Number(token);if(!Number.isFinite(p)||!Number.isInteger(p))continue;
    const start=heads[i].index+heads[i][0].length,end=heads[i+1]?.index??Math.min(s.length,start+2200),chunk=s.slice(start,end),link=mdLinks(chunk,'book')[0];if(link){const t=cleanTitle(link.label);if(t)rows.push({position:p,title:t,url:link.url})}
  }
  if(rows.length)return [...new Map(rows.map(x=>[x.position,x])).values()].sort((a,b)=>a.position-b.position);
  let order=0;const first=new Map();for(const l of mdLinks(s,'book')){const around=s.slice(Math.max(0,l.index-220),l.index+l.label.length+260),m=around.match(/(?:#|Book\s*)\s*(\d+(?:\.\d+)?)/i);if(!m)continue;const p=Number(m[1]);if(!Number.isInteger(p)||first.has(p))continue;first.set(p,{position:p,title:cleanTitle(l.label),url:l.url,order:order++})}
  return [...first.values()].sort((a,b)=>a.position-b.position||a.order-b.order);
}
async function italianPhysicalEdition(row){
  if(!row?.url)return null;const page=await goodreadsBookPage(row.url),links=uniq([page?.editions,`https://www.goodreads.com/book/editions/${(row.url.match(/\/book\/show\/(\d+)/)||[])[1]||''}?filter_by_language=it`].filter(x=>x&&!/editions\/\?/.test(x)));
  for(const u of links){const raw=await jina(u,9500);if(!raw)continue;const blocks=editionBlocks(raw).map(parseEditionBlock).filter(x=>/italian|italiano/i.test(x.language)||/Edition language\s*:\s*Italian/i.test(x.raw||''));const physical=blocks.find(x=>x.physical&&x.title);if(physical)return physical}
  return null;
}
async function storyGraphItalianNeighbor(saga,position,author){
  if(!saga||!Number.isInteger(position)||!author)return null;
  const q=`"${saga} #${position}" "${author}"`;
  const search=await jina('https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),9000);
  if(!search)return null;
  const urls=[];
  for(const m of String(search).matchAll(/\[([^\]]+)\]\((https?:\/\/(?:app|beta)\.thestorygraph\.com\/books\/[0-9a-f-]{20,})\)/gi))urls.push(m[2]);
  for(const u of uniq(urls).slice(0,5)){
    const raw=await jina(u,9000);
    if(!raw||!norm(raw).includes(norm(author).split(' ').pop()))continue;
    const sm=parseSeriesMeta(raw),title=headingTitle(raw);
    if(sm.position!==position)continue;
    for(const eu of [u.replace(/\/$/,'')+'/editions',u.replace(/\/$/,'')+'/editions?page=2']){
      const er=await jina(eu,9000);
      if(!er)continue;
      const marks=[...er.matchAll(/Language\s*:\s*Italian|Lingua\s*:\s*Italiano/gi)];
      for(const mark of marks){
        const seg=er.slice(Math.max(0,mark.index-1700),mark.index+500);
        if(/\b(?:ebook|e-book|Kindle|digital)\b/i.test(seg)&&!/\b(?:Paperback|Hardcover|Tascabile|Brossura|Copertina)\b/i.test(seg))continue;
        const hs=[...seg.matchAll(/^###\s+(.+)$/gm)];
        for(let i=hs.length-1;i>=0;i--){
          const t=cleanTitle(hs[i][1]);
          if(t)return{title:t,source:'storygraph'};
        }
      }
    }
    if(title&&isItalian(title))return{title,source:'storygraph'};
  }
  return null;
}
async function resolveRelations(primary,input={}){
  if(!primary?.seriesUrl||!Number.isInteger(primary.series?.position))return null;
  const raw=await jina(primary.seriesUrl,10000);if(!raw)return null;const rows=parseSeriesRows(raw),pos=primary.series.position,currentIndex=rows.findIndex(x=>x.position===pos);if(currentIndex<0)return null;
  const localize=async(direction)=>{
    let i=currentIndex+direction;
    while(i>=0&&i<rows.length){const row=rows[i];if(!Number.isInteger(row.position)){i+=direction;continue}
      const it=await italianPhysicalEdition(row).catch(()=>null);if(it?.title)return{title:it.title,row,source:'goodreads'};
      const sg=await storyGraphItalianNeighbor(primary.series.saga,row.position,input.author||primary.author).catch(()=>null);if(sg?.title)return{title:sg.title,row,source:'storygraph'};
      i+=direction;
    }return null;
  };
  const [pre,seq]=await Promise.all([localize(-1),localize(1)]);
  const initial=!pre,terminal=!seq;
  return{saga:cleanSaga(primary.series.saga),prequel:pre?.title||'',sequel:seq?.title||'',position:pos,initial,terminal,authoritative:true,verified:true,checked:true,source:'goodreads',method:'goodreads-primary-ordered-physical-it-v1',localizedPrequel:true,localizedSequel:true,localizationPending:false};
}

function storyGraphCover(raw){
  const urls=[];
  for(const m of String(raw||'').matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g))urls.push(m[1]);
  for(const u of String(raw||'').match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)||[])urls.push(u);
  return urls.find(u=>/thestorygraph|cloudinary|amazon|goodreads|book/i.test(u))||urls[0]||'';
}
function storyGraphPublisher(raw){return normalizePublisher((String(raw||'').match(/(?:^|\n)\s*(?:Publisher|Editore)\s*:\s*([^\n]+)/i)||[])[1]||'')}
function storyGraphPublished(raw){return normalizeDate((String(raw||'').match(/(?:^|\n)\s*(?:Edition Pub Date|Publication Date|Published|Data di pubblicazione)\s*:\s*([^\n]+)/i)||[])[1]||'')}
function storyGraphDescription(raw){
  const s=String(raw||''),patterns=[/(?:^|\n)#{1,5}\s*Description\s*\n([\s\S]*?)(?=\n#{1,5}\s|\nISBN\/UID:|\n\d+\s+pages|$)/i,/(?:^|\n)\s*Description\s*:\s*([\s\S]*?)(?=\n(?:Genres?|Moods?|Pace|ISBN\/UID|Format|Publisher|Edition Pub Date)\s*:|$)/i];
  for(const re of patterns){const m=s.match(re);if(m){const p=cleanPlot(m[1]);if(p)return p}}return'';
}
function storyGraphGenres(raw){
  const line=String(raw||'').split(/\r?\n/).map(stripMd).filter(Boolean).find(x=>/^(?:fiction|nonfiction)(?:\s|$)/i.test(x))||'';if(!line)return[];
  const n=norm(line.replace(/^(?:fiction|nonfiction)\s*/i,'')),out=[];
  for(const k of GENRE_KEYS){const re=new RegExp(`(?:^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'i');if(re.test(n))out.push(GENRE_MAP[k])}
  return uniq(out).sort((a,b)=>{const ia=GENRE_PRIORITY.indexOf(a),ib=GENRE_PRIORITY.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,'it')});
}
function storyGraphBookLinks(raw){
  const out=[],seen=new Set();for(const m of String(raw||'').matchAll(/\[([^\]]+)\]\((https?:\/\/(?:app|beta)\.thestorygraph\.com\/books\/[0-9a-f-]{20,})\)/gi)){const u=m[2].replace(/\/editions.*$/,'');if(!seen.has(u)){seen.add(u);out.push(u)}}return out;
}
function storyGraphInfo(raw,fallback={}){
  const title=cleanTitle(headingTitle(raw)||fallback.title||''),author=clean(fallback.author||'');
  return{source:'storygraph',title,author,publisher:storyGraphPublisher(raw),published:storyGraphPublished(raw),genres:storyGraphGenres(raw),description:storyGraphDescription(raw),series:parseSeriesMeta(raw,title),cover:storyGraphCover(raw),bookUrl:fallback.bookUrl||'',raw:String(raw||'')};
}
async function storyGraphPrimary(input={}){
  const code=isbn(input.code),title=cleanTitle(input.title),author=clean(input.author);if(!code&&!title)return null;
  const qs=uniq([code,title&&author?`${title} ${author}`:''].filter(Boolean)),surname=norm(author).split(' ').pop();
  for(const q of qs){
    const searchUrl='https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(q),raw=await jina(searchUrl,9500);if(!raw)continue;
    const urls=storyGraphBookLinks(raw);
    for(const u of urls.slice(0,6)){
      const page=await jina(u,9500);if(!page)continue;if(surname&&!norm(page).includes(surname))continue;
      if(code&&rawContainsIsbn(page,code)===false&&title){const pt=cleanTitle(headingTitle(page));if(pt&&norm(pt)!==norm(title)&&!norm(pt).includes(norm(title))&&!norm(title).includes(norm(pt)))continue}
      const info=storyGraphInfo(page,{title,author,bookUrl:u});if(info.title||info.genres.length||info.description)return info;
    }
    const blocks=String(raw).split(/^###\s+/m).map(x=>x.trim()).filter(Boolean);
    for(const part of blocks){
      const lines=part.split(/\n/).map(stripMd).filter(Boolean),t=cleanTitle(lines[0]);if(!t)continue;const txt=lines.join('\n'),cm=(txt.match(/ISBN\/UID:\s*([^\n]+)/i)||[])[1]||'',c=isbn(cm);
      if(code&&c&&c!==code)continue;if(title&&norm(t)!==norm(title)&&!norm(t).includes(norm(title))&&!norm(title).includes(norm(t)))continue;if(surname&&!norm(txt).includes(surname))continue;
      return storyGraphInfo(part,{title:t,author,bookUrl:searchUrl});
    }
  }return null;
}
async function resolveRelationsStoryGraph(primary,input={}){
  const pos=primary?.series?.position,saga=cleanSaga(primary?.series?.saga||'');if(!Number.isInteger(pos)||!saga)return null;
  const localize=async(direction)=>{for(let p=pos+direction,steps=0;p>0&&steps<14;p+=direction,steps++){const r=await storyGraphItalianNeighbor(saga,p,input.author||primary.author).catch(()=>null);if(r?.title)return{...r,position:p}}return null};
  const [pre,seq]=await Promise.all([localize(-1),localize(1)]);
  return{saga,prequel:pre?.title||'',sequel:seq?.title||'',position:pos,initial:!pre,terminal:!seq,authoritative:true,verified:true,checked:true,source:'storygraph',method:'storygraph-secondary-physical-it-v1',localizedPrequel:true,localizedSequel:true,localizationPending:false};
}
async function translateItalian(text){
  text=cleanPlot(text);if(!text||isItalian(text))return text;
  const chunks=[];for(let rest=text;rest;){let cut=Math.min(1800,rest.length);if(cut<rest.length){const p=Math.max(rest.lastIndexOf('. ',cut),rest.lastIndexOf('; ',cut),rest.lastIndexOf(', ',cut));if(p>600)cut=p+1}chunks.push(rest.slice(0,cut));rest=rest.slice(cut).trim()}
  const out=[];for(const ch of chunks){const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(ch)+'&langpair=en|it';try{const c=new AbortController(),t=setTimeout(()=>c.abort(),9000),r=await fetch(url,{signal:c.signal,cache:'no-store'});clearTimeout(t);if(!r.ok)return'';const j=await r.json(),x=clean(j?.responseData?.translatedText||'');if(!x)return'';out.push(x)}catch(e){return''}}
  return cleanPlot(out.join(' '));
}
async function resolveAll(input={}){
  const code=isbn(input.code),legacy=input.legacy||{};
  const gr=await resolveGoodreadsEdition(code).catch(()=>null);
  let sg=null;
  const needSg=!gr||!gr.title||!gr.author||!gr.publisher||!gr.published||!gr.genres?.length||!gr.description||!gr.cover||!gr.series?.saga||!Number.isInteger(gr.series?.position);
  if(needSg)sg=await storyGraphPrimary({code,title:gr?.title||input.title,author:gr?.author||input.author}).catch(()=>null);

  const title=cleanTitle(gr?.title||sg?.title||legacy.title||input.title);
  const author=clean(gr?.author||sg?.author||legacy.author||input.author);
  const publisher=normalizePublisher(gr?.publisher||sg?.publisher||legacy.publisher||'');
  const published=normalizeDate(gr?.published||sg?.published||legacy.published||'');

  let genres=gr?.genres?.length?gr.genres:(sg?.genres||[]);
  if(!genres.length&&gr){sg=sg||await storyGraphPrimary({code,title,author}).catch(()=>null);genres=sg?.genres||[]}

  let plot=cleanPlot(gr?.description||'');
  if(!plot){sg=sg||await storyGraphPrimary({code,title,author}).catch(()=>null);if(sg?.description)plot=isItalian(sg.description)?cleanPlot(sg.description):await translateItalian(sg.description)}
  if(!plot)plot=cleanPlot(legacy.description||'');

  let relations=gr?await resolveRelations(gr,{code,title,author}).catch(()=>null):null;
  if(!relations){sg=sg||await storyGraphPrimary({code,title,author}).catch(()=>null);if(sg?.series?.saga&&Number.isInteger(sg.series.position))relations=await resolveRelationsStoryGraph(sg,{code,title,author}).catch(()=>null)}
  if(!relations){const fallbackSeries=root.__LIB_GOODREADS_PRIMARY_BASE_SERIES_V1;if(typeof fallbackSeries==='function')relations=await Promise.resolve(fallbackSeries({code,title,author,saga:gr?.series?.saga||sg?.series?.saga||legacy.saga||'',description:plot})).catch(()=>null)}

  let saga=cleanSaga(relations?.saga||gr?.series?.saga||sg?.series?.saga||legacy.saga||'');
  let prequel=cleanTitle(relations?.prequel||''),sequel=cleanTitle(relations?.sequel||'');
  if(!prequel&&!relations?.initial)prequel=cleanTitle(legacy.prequel||'');
  if(!sequel&&!relations?.terminal)sequel=cleanTitle(legacy.sequel||'');
  const cover=gr?.cover||sg?.cover||legacy.cover||'';
  return{source:gr?'goodreads':sg?'storygraph':'fallback',title,author,publisher,published,genres,saga,prequel,sequel,plot,cover,relations,goodreads:gr,storygraph:sg};
}

function field(id){return typeof document!=='undefined'?document.getElementById(id):null}
function value(id){return clean(field(id)?.value||'')}
function setField(id,v,source){const el=field(id);v=clean(v);if(!el||!v)return;if(el.value!==v){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}if(source)el.dataset.metadataSource=source}
function setGenres(genres,source){const el=field('editCategory');if(!el||!genres?.length)return;el.value=genres.join(', ');el.dataset.genreSource=source;el.dataset.metadataSource=source;el.dispatchEvent(new Event('change',{bubbles:true}))}
function setCover(url,source){const el=field('editCover');if(!el||!url)return;el.value=url;el.dataset.metadataSource=source;try{root.__LIB_SET_DRAFT_COVER?.(url,true)}catch(e){}el.dispatchEvent(new Event('change',{bubbles:true}))}
function snapshot(){return{title:value('editTitle'),author:value('editAuthor'),publisher:value('editPublisher'),published:value('editPublishedDate'),genres:value('editCategory'),saga:value('editSaga'),prequel:value('editPrequel'),sequel:value('editSequel'),description:value('editPlot'),cover:value('editCover')}}
function applyResult(r){
  if(!r)return;const src=r.source;
  setField('editTitle',cleanTitle(r.title),src);setField('editAuthor',r.author,src);setField('editPublisher',r.publisher,src);setField('editPublishedDate',r.published,src);
  setGenres(r.genres,src);setField('editSaga',r.saga,src);setField('editPrequel',r.prequel,src);setField('editSequel',r.sequel,src);setField('editPlot',r.plot,src);setCover(r.cover,src);
}
function busyStart(){
  const el=field('lookupStatus');if(!el)return;
  if(!document.getElementById('goodreadsPrimarySpinnerStyle')){const st=document.createElement('style');st.id='goodreadsPrimarySpinnerStyle';st.textContent=`
    #lookupStatus[data-goodreads-primary-busy="1"]{font-size:0!important;min-height:24px;display:flex;align-items:center}
    #lookupStatus[data-goodreads-primary-busy="1"]::before{content:"📖";display:inline-block;font-size:20px;line-height:1;transform-origin:center;animation:goodreadsPrimarySpin .85s linear infinite}
    #lookupStatus[data-goodreads-primary-busy="1"] .lookup-book-spinner{display:none!important}
    @keyframes goodreadsPrimarySpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  `;document.head.appendChild(st)}
  el.dataset.goodreadsPrimaryBusy='1';el.setAttribute('aria-label','Ricerca dati in corso');
}
function busyEnd(ok=true){
  const el=field('lookupStatus');if(!el)return;delete el.dataset.goodreadsPrimaryBusy;el.classList.remove('lookup-busy','busy');
  el.removeAttribute('aria-label');el.textContent=ok?'Dati verificati con Goodreads; StoryGraph usato solo dove necessario.':'Ricerca completata con i dati disponibili.';el.classList.add(ok?'ok':'warn')
}
let uiToken=0;
async function runUiLookup(){
  const code=isbn(value('editCode'));if(code.length!==10&&code.length!==13)return;
  const token=++uiToken;busyStart();await wait(450);
  const legacy=snapshot(),input={code,title:legacy.title,author:legacy.author,legacy};
  let r=await resolveAll(input).catch(()=>null);if(token!==uiToken)return;
  if(r){if(!r.genres.length&&legacy.genres)r.genres=legacy.genres.split(/[,;|/\n]+/).map(clean).filter(Boolean);applyResult(r);root.__LIB_GOODREADS_PRIMARY_LAST__={input,result:r,at:Date.now()}}
  const final=r?{title:cleanTitle(r.title),author:r.author,publisher:r.publisher,published:r.published,genres:r.genres,saga:r.saga,prequel:r.prequel,sequel:r.sequel,plot:r.plot,cover:r.cover,source:r.source}:null;
  const until=Date.now()+3500;while(final&&Date.now()<until&&token===uiToken){applyResult(final);await wait(250)}
  if(token===uiToken)busyEnd(!!r);
}
function installUi(){
  const btn=field('lookupMetadataBtn');if(!btn)return false;if(btn.dataset.goodreadsPrimaryV1)return true;btn.dataset.goodreadsPrimaryV1='1';
  btn.addEventListener('click',()=>{setTimeout(runUiLookup,0)},false);return true;
}
(function boot(n=0){if(installUi())return;if(n<400)setTimeout(()=>boot(n+1),100)})();

function installResolvers(){
  if(root.__LIB_GOODREADS_PRIMARY_RESOLVERS_V1)return true;
  const baseGenres=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES,baseSeries=root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS,basePlot=root.__LIB_RESOLVE_OFFICIAL_PLOT;
  if(typeof baseGenres!=='function'||typeof baseSeries!=='function'||typeof basePlot!=='function')return false;
  root.__LIB_GOODREADS_PRIMARY_BASE_GENRES_V1=baseGenres;root.__LIB_GOODREADS_PRIMARY_BASE_SERIES_V1=baseSeries;root.__LIB_GOODREADS_PRIMARY_BASE_PLOT_V1=basePlot;
  const genre=async input=>{const gr=await resolveGoodreadsEdition(input?.code).catch(()=>null);if(gr?.genres?.length)return{found:true,reachable:true,genres:gr.genres,labels:[],url:gr.bookUrl||gr.editionsUrl||'',matchedTitle:gr.title,matchedCode:gr.isbn,source:'goodreads'};const sg=await storyGraphPrimary(input).catch(()=>null);if(sg?.genres?.length)return{found:true,reachable:true,genres:sg.genres,labels:[],url:sg.bookUrl||'',matchedTitle:sg.title,matchedCode:isbn(input?.code),source:'storygraph'};return await Promise.resolve(baseGenres(input)).catch(()=>null)};
  genre.__goodreadsPrimaryV1=true;
  const series=async input=>{const gr=await resolveGoodreadsEdition(input?.code).catch(()=>null);if(gr){const rel=await resolveRelations(gr,input).catch(()=>null);if(rel)return rel}const sg=await storyGraphPrimary(input).catch(()=>null);if(sg?.series?.saga&&Number.isInteger(sg.series.position)){const rel=await resolveRelationsStoryGraph(sg,input).catch(()=>null);if(rel)return rel}return await Promise.resolve(baseSeries(input)).catch(()=>null)};
  series.__goodreadsPrimaryV1=true;
  const plot=async input=>{const gr=await resolveGoodreadsEdition(input?.code).catch(()=>null),gp=cleanPlot(gr?.description||'');if(gp&&isItalian(gp))return gp;const sg=await storyGraphPrimary(input).catch(()=>null);if(sg?.description){const it=isItalian(sg.description)?cleanPlot(sg.description):await translateItalian(sg.description);if(it)return it}return cleanPlot(await Promise.resolve(basePlot(input)).catch(()=>''))};
  plot.__goodreadsPrimaryV1=true;
  root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=genre;
  root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=series;root.__LIB_RESOLVE_SERIES_NEIGHBORS=series;root.__LIB_FIND_RELATIONS=series;root.__LIB_RESOLVE_UNIVERSAL_SERIES=series;root.__LIB_RESOLVE_BOUNDED_RELATIONS=series;
  root.__LIB_RESOLVE_OFFICIAL_PLOT=plot;
  root.__LIB_GOODREADS_PRIMARY_RESOLVERS_V1=true;
  root.__LIB_METADATA_SOURCE_POLICY='goodreads-primary-then-storygraph-then-fallback-v1';root.__LIB_GENRE_SOURCE_POLICY='goodreads-primary-then-storygraph-v1';root.__LIB_SERIES_RELATION_POLICY='goodreads-primary-physical-italian-then-storygraph-v1';root.__LIB_PLOT_SOURCE_POLICY='goodreads-italian-primary-then-storygraph-translated-v1';
  return true;
}
(function startResolvers(n=0){if(installResolvers())return;if(n<400)setTimeout(()=>startResolvers(n+1),100)})();
root.__LIB_GOODREADS_PRIMARY_METADATA_TEST__={cleanTitle,cleanSaga,cleanPlot,goodreadsGenres,parseEditionBlock,editionBlocks,parseSeriesRows,parseDescription,parseSeriesMeta,isItalian,resolveGoodreadsEdition,resolveRelations,resolveRelationsStoryGraph,storyGraphPrimary,storyGraphInfo,translateItalian,resolveAll,applyResult};
})();
