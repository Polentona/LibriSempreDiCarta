(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V6)return;
root.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V6=true;

const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const uniq=a=>[...new Map((a||[]).filter(Boolean).map(x=>[norm(x),clean(x)])).values()];

function isbn13to10(v){
  const n=code(v);if(!/^978\d{10}$/.test(n))return'';
  const core=n.slice(3,12);let sum=0;for(let i=0;i<9;i++)sum+=Number(core[i])*(10-i);
  const c=(11-sum%11)%11;return core+(c===10?'X':String(c));
}
function isbnAliases(v){const n=code(v),x=isbn13to10(n);return [...new Set([n,x].filter(Boolean))]}
function rawContainsIsbn(raw,isbn){
  const aa=isbnAliases(isbn);if(!aa.length)return false;
  const tokens=String(raw||'').match(/(?:97[89][0-9Xx\s-]{9,24}|[0-9][0-9Xx\s-]{8,20})/g)||[];
  return tokens.some(x=>aa.includes(code(x)));
}
function titleVariants(v){
  const raw=clean(v),out=[];
  const add=x=>{x=clean(x).replace(/\s*[\[(](?:vol(?:ume)?\.?\s*)?#?\d+(?:\.\d+)?[\])]\s*$/i,'').replace(/\s*(?:vol(?:ume)?\.?\s*)#?\d+(?:\.\d+)?\s*$/i,'').trim();if(x&&!out.some(y=>norm(y)===norm(x)))out.push(x)};
  add(raw);for(const p of raw.split(/\s*(?:[.:]|[-–—])\s*/))if(p.length>2)add(p);return out;
}
function sameTitle(a,b){
  for(const x0 of titleVariants(a))for(const y0 of titleVariants(b)){
    const x=norm(x0),y=norm(y0);if(!x||!y)continue;
    if(x===y||(x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' ')))return true;
  }
  return false;
}
function safeTitle(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'')
    .replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,'')
    .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'')
    .replace(/[.;:\s]+$/,'').trim();
  const n=norm(x);if(!x||x.length<2||x.length>180||sameTitle(x,current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|website|homepage|language|released|published|pubblicato)\b/i.test(n))return'';
  return x;
}
function safeSaga(v,current=''){
  let x=clean(v).replace(/^[#*:;|=\-–—•·"“”'«»\s]+|["“”'«»\s]+$/g,'')
    .replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di\s+|of\s+)?/i,'').trim();
  const n=norm(x);if(!x||x.length>100||n===norm(current))return'';
  if(/https?:|www\.|\.\.\.|…|[{}<>]|\|/.test(x)||/(?:18|19|20)\d{2}/.test(x))return'';
  if(/\b(?:isbn|ean|publisher|editore|author|autore|released|published|pubblicato|romanzo|novel|libro|book|volume)\b/i.test(n))return'';
  return x;
}

const jsonCache=new Map(),textCache=new Map();
async function getJson(url,ms=9000){
  if(jsonCache.has(url))return jsonCache.get(url);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'},cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}})();
  jsonCache.set(url,p);return p;
}
async function jina(target,ms=9500){
  const key=target;if(textCache.has(key))return textCache.get(key);
  const p=(async()=>{
    const routes=['https://r.jina.ai/'+target];
    if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));
    for(const u of routes){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,headers:{Accept:'text/plain'},cache:'no-store'});if(r.ok){const s=await r.text();if(s.length>100)return s}}catch(e){}finally{clearTimeout(t)}}
    return'';
  })();textCache.set(key,p);return p;
}

function mdLinks(raw,kind=''){
  const out=[],seen=new Set(),re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(raw||'')))){
    const label=clean(m[1]),url=m[2].replace(/[),.;]+$/,'');
    if(kind==='goodreads-book'&&!/goodreads\.com\/book\/show\//i.test(url))continue;
    if(kind==='goodreads-series'&&!/goodreads\.com\/series\/\d+/i.test(url))continue;
    if(kind==='storygraph-book'&&!/(?:app|beta)\.thestorygraph\.com\/books\/[0-9a-f-]{20,}/i.test(url))continue;
    if(!seen.has(url)){seen.add(url);out.push({label,url,index:m.index})}
  }
  return out;
}
function goodreadsBookTitle(label){
  return safeTitle(clean(label).replace(/\s*\([^()]{0,120}?,\s*#\s*\d+(?:\.\d+)?\)\s*$/i,'').replace(/\s*\((?:Italian Edition|Edizione italiana)\)\s*$/i,''));
}
function seriesMetaFromLabel(label,title=''){
  const m=clean(label).match(/\(([^()]{2,120}?),\s*#\s*(\d+(?:\.\d+)?)\)\s*$/i);
  return m?{saga:safeSaga(m[1],title),position:Number(m[2])}:{saga:'',position:NaN};
}
function positionFromText(v){
  const s=clean(v);if(!s)return NaN;
  if(/(?:#|\b(?:book|libro|volume|vol)\s*)\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+/i.test(s))return NaN;
  if(/\bpart\s+\d+\s+of\s+\d+/i.test(s)||/\bparte\s+\d+\s+di\s+\d+/i.test(s))return NaN;
  const m=s.match(/(?:,|\s)#\s*(\d+(?:\.\d+)?)/i)||s.match(/\b(?:book|libro|volume|vol)\s*#?\s*(\d+(?:\.\d+)?)/i);
  return m?Number(m[1]):NaN;
}
function headingTitle(raw){
  for(const m of String(raw||'').matchAll(/^#{1,4}\s+(.+)$/gm)){
    const t=safeTitle(m[1]);if(t&&!/^(?:editions?|reviews?|series)$/i.test(norm(t)))return t;
  }
  return'';
}
function seriesInfoFromBookPage(raw,seriesLink,searchLabel,title){
  const byLabel=seriesMetaFromLabel(searchLabel,title);if(Number.isFinite(byLabel.position))return byLabel;
  const around=String(raw||'').slice(Math.max(0,seriesLink.index-500),seriesLink.index+seriesLink.label.length+500);
  const p=positionFromText(around);
  const patterns=[
    /^#{1,6}\s+(.{2,120}?)\s+#\s*(\d+(?:\.\d+)?)\s*$/gmi,
    /(?:^|\n)\s*([^\n#]{2,120}?)\s+#\s*(\d+(?:\.\d+)?)\s*(?=\n|$)/gmi
  ];
  for(const re of patterns){for(const m of around.matchAll(re)){
    const saga=safeSaga(m[1],title),pos=Number(m[2]);if(saga&&Number.isFinite(pos))return{saga,position:pos};
  }}
  return{saga:safeSaga(seriesLink.label,title),position:p};
}
function parseGoodreadsSeriesRows(raw){
  const s=String(raw||''),heads=[...s.matchAll(/^###\s+Book\s+([^\n]+)\s*$/gmi)],rows=[];
  for(let i=0;i<heads.length;i++){
    const token=clean(heads[i][1]);if(/[-–—]/.test(token))continue;
    const pos=Number(token);if(!Number.isFinite(pos))continue;
    const start=heads[i].index+heads[i][0].length,end=heads[i+1]?.index??Math.min(s.length,start+1800),chunk=s.slice(start,end);
    const link=mdLinks(chunk,'goodreads-book')[0];if(!link)continue;
    const title=goodreadsBookTitle(link.label);if(title)rows.push({title,position:pos,url:link.url,order:rows.length});
  }
  if(rows.length)return[...new Map(rows.map(r=>[r.position,r])).values()].sort((a,b)=>a.position-b.position||a.order-b.order);
  const firstByPosition=new Map();let order=0;
  for(const l of mdLinks(s,'goodreads-book')){
    const t=goodreadsBookTitle(l.label);if(!t)continue;
    const around=s.slice(Math.max(0,l.index-180),l.index+l.label.length+240),position=positionFromText(around);
    if(Number.isFinite(position)&&!firstByPosition.has(position))firstByPosition.set(position,{title:t,position,order:order++,url:l.url});
  }
  return[...firstByPosition.values()].sort((a,b)=>a.position-b.position||a.order-b.order);
}
function goodreadsBookId(url){return(String(url||'').match(/\/book\/show\/(\d+)/i)||[])[1]||''}
async function goodreadsItalianTitle(row,author=''){
  if(!row?.url)return row?.title||'';const id=goodreadsBookId(row.url);if(!id)return row.title||'';
  const targets=[`https://www.goodreads.com/book/editions/${id}?filter_by_language=it`,`https://www.goodreads.com/book/editions/${id}?utf8=%E2%9C%93&filter_by_language=it`];
  for(const target of targets){
    const raw=await jina(target,8500);if(!raw)continue;const links=mdLinks(raw,'goodreads-book');
    for(let i=0;i<links.length;i++){
      const l=links[i],end=links[i+1]?.index??Math.min(String(raw).length,l.index+2200),block=String(raw).slice(l.index,end);
      if(!/Edition\s+language\s*:\s*Italian|Lingua\s+edizione\s*:\s*Italiano|Language\s*:\s*Italian/i.test(block))continue;
      const t=goodreadsBookTitle(l.label);if(t)return t;
    }
  }
  return row.title||'';
}
async function goodreadsCandidates(title,author,isbn){
  const queries=uniq([isbn,`"${title}" ${author}`,`${title} ${author}`].filter(Boolean)),out=[],seen=new Set();
  for(const q of queries){
    const raw=await jina('https://www.goodreads.com/search?q='+encodeURIComponent(q)+'&search_type=books',8500);if(!raw)continue;
    for(const b of mdLinks(raw,'goodreads-book')){if(!seen.has(b.url)){seen.add(b.url);out.push({...b,query:q});if(out.length>=18)break}}
    if(out.length>=18)break;
  }
  return out;
}
function relationComplete(r){
  if(!r?.authoritative)return false;
  if(r.initial&&r.terminal)return true;
  if(r.initial)return !!r.sequel;
  if(r.terminal)return !!r.prequel;
  return !!r.prequel&&!!r.sequel;
}
async function goodreadsOrdered(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const surname=norm(author).split(' ').pop(),candidates=await goodreadsCandidates(title,author,isbn),partials=[];
  for(const b of candidates){
    const page=await jina(b.url,8500);if(!page||!norm(page).includes(surname))continue;
    const listed=goodreadsBookTitle(b.label)||b.label,head=headingTitle(page)||listed;
    const exactIsbn=isbn?rawContainsIsbn(page,isbn):false;
    if(isbn&&!exactIsbn&&!sameTitle(head,title)&&!sameTitle(listed,title))continue;
    if(!isbn&&!sameTitle(head,title)&&!sameTitle(listed,title))continue;
    for(const s of mdLinks(page,'goodreads-series').slice(0,6)){
      const info=seriesInfoFromBookPage(page,s,b.label,title);if(!Number.isFinite(info.position))continue;
      const seriesPage=await jina(s.url,9000);if(!seriesPage)continue;
      const rows=parseGoodreadsSeriesRows(seriesPage);if(!rows.some(x=>x.position===info.position))continue;
      const sequence=Number.isInteger(info.position)?rows.filter(x=>Number.isInteger(x.position)):rows;
      const lower=sequence.filter(x=>x.position<info.position).at(-1),higher=sequence.find(x=>x.position>info.position);
      const min=sequence[0]?.position,max=sequence.at(-1)?.position;
      const initial=!lower&&info.position===min,terminal=!higher&&info.position===max;
      const prequel=lower?await goodreadsItalianTitle(lower,author):'',sequel=higher?await goodreadsItalianTitle(higher,author):'';
      const r={saga:info.saga||safeSaga(input.saga,title)||safeSaga(s.label,title),prequel:safeTitle(prequel,title),sequel:safeTitle(sequel,title),verified:true,authoritative:true,checked:true,source:s.url,method:'goodreads-ordered-series-primary-v6',position:info.position,initial,terminal};
      if(relationComplete(r))return r;partials.push(r);
    }
  }
  return partials.sort((a,b)=>Number(!!b.prequel)+Number(!!b.sequel)-Number(!!a.prequel)-Number(!!a.sequel))[0]||null;
}

function storyGraphInfo(raw,title=''){
  const s=String(raw||'');
  for(const m of s.matchAll(/(?:^|\n)\s*([^\n#]{2,100}?)\s+#\s*(\d+(?:\.\d+)?)\s*(?=\n|$)/gmi)){
    const saga=safeSaga(m[1],title),position=Number(m[2]);if(saga&&Number.isFinite(position))return{saga,position};
  }
  return{saga:'',position:NaN};
}
function storyGraphTitle(raw){
  const s=String(raw||'');for(const m of s.matchAll(/^###\s+(.+)$/gm)){const t=safeTitle(m[1]);if(t&&!/^(?:editions?|remove book)$/i.test(norm(t)))return t}return headingTitle(s);
}
async function storyGraphItalianTitle(bookUrl,fallback=''){
  const base=String(bookUrl||'').replace(/\?.*$/,'').replace(/\/$/,'');if(!base)return fallback;
  for(const u of [base+'/editions',base+'/editions?page=2',base+'/editions?page=3']){
    const raw=await jina(u,8500);if(!raw)continue;const s=String(raw),marks=[...s.matchAll(/Language\s*:\s*Italian/gi)];
    for(const mark of marks){const seg=s.slice(Math.max(0,mark.index-1400),mark.index),heads=[...seg.matchAll(/^###\s+(.+)$/gm)];for(let i=heads.length-1;i>=0;i--){const t=safeTitle(heads[i][1]);if(t&&!/^(?:editions?|remove book)$/i.test(norm(t)))return t}}
  }
  return fallback;
}
async function storyGraphSearchPages(query){
  const targets=[
    'https://html.duckduckgo.com/html/?q='+encodeURIComponent('site:app.thestorygraph.com/books '+query),
    'https://html.duckduckgo.com/html/?q='+encodeURIComponent('site:beta.thestorygraph.com/books '+query),
    'https://app.thestorygraph.com/browse?search_term='+encodeURIComponent(query)
  ];
  const out=[],seen=new Set();
  for(const target of targets){const raw=await jina(target,8500);if(!raw)continue;for(const l of mdLinks(raw,'storygraph-book')){const u=l.url.replace(/\/editions.*$/,'');if(!seen.has(u)){seen.add(u);out.push(u)}}if(out.length>=10)break}
  return out;
}
async function storyGraphCurrent(input={}){
  const title=clean(input.title),author=clean(input.author),isbn=code(input.code);if(!title||!author)return null;
  const queries=uniq([isbn&&`"${isbn}" "${title}"`, `"${title}" "${author}"`,`${title} ${author}`].filter(Boolean)),surname=norm(author).split(' ').pop();
  for(const q of queries){for(const url of await storyGraphSearchPages(q)){
    const raw=await jina(url,8500);if(!raw||!norm(raw).includes(surname))continue;
    const t=storyGraphTitle(raw),exact=isbn?rawContainsIsbn(raw,isbn):false;if(!exact&&!sameTitle(t,title))continue;
    const info=storyGraphInfo(raw,title);if(Number.isFinite(info.position))return{...info,url,title:t};
  }}
  return null;
}
async function storyGraphNeighbor(saga,position,author){
  if(!saga||!Number.isFinite(position)||position<1)return null;const surname=norm(author).split(' ').pop();
  for(const url of await storyGraphSearchPages(`"${saga} #${position}" "${author}"`)){
    const raw=await jina(url,8500);if(!raw||!norm(raw).includes(surname))continue;const info=storyGraphInfo(raw);if(norm(info.saga)!==norm(saga)||info.position!==position)continue;
    const t=storyGraphTitle(raw);if(!t)continue;return{title:await storyGraphItalianTitle(url,t),url,position};
  }
  return null;
}
async function storyGraphCompletion(input={},seed=null){
  let base=seed&&Number.isFinite(seed.position)?{saga:seed.saga,position:seed.position,url:''}:await storyGraphCurrent(input);if(!base?.saga||!Number.isFinite(base.position))return null;
  let prequel=seed?.prequel||'',sequel=seed?.sequel||'',initial=!!seed?.initial,terminal=!!seed?.terminal;
  if(!prequel&&base.position>1){const n=await storyGraphNeighbor(base.saga,base.position-1,input.author);if(n)prequel=n.title}
  if(!sequel&&!terminal){const n=await storyGraphNeighbor(base.saga,base.position+1,input.author);if(n)sequel=n.title}
  if(base.position===1)initial=true;
  const r={saga:safeSaga(base.saga,input.title),prequel:safeTitle(prequel,input.title),sequel:safeTitle(sequel,input.title),verified:true,authoritative:true,checked:true,source:'https://app.thestorygraph.com/',method:'storygraph-series-completion-v1',position:base.position,initial,terminal};
  return r.prequel||r.sequel?r:null;
}
function mergeRelation(a,b,input={}){
  if(!a&&!b)return null;const x=a||{},y=b||{};
  return{saga:safeSaga(x.saga||y.saga||input.saga,input.title),prequel:safeTitle(x.prequel||y.prequel,input.title),sequel:safeTitle(x.sequel||y.sequel,input.title),verified:!!(x.verified||y.verified),authoritative:!!(x.authoritative||y.authoritative),checked:true,source:[x.source,y.source].filter(Boolean).join(' + '),method:[x.method,y.method].filter(Boolean).join('+'),position:Number.isFinite(x.position)?x.position:y.position,initial:!!(x.initial||y.initial),terminal:!!(x.terminal||y.terminal)};
}

async function wikiSearch(lang,q,limit=7){const u=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=${limit}&format=json&origin=*&srsearch=${encodeURIComponent(q)}`;const d=await getJson(u);return(d?.query?.search||[]).map(x=>x.title).filter(Boolean)}
async function wikiParse(lang,page){const u=`https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text|wikitext&format=json&origin=*`;const d=await getJson(u);return{html:d?.parse?.text?.['*']||'',wt:d?.parse?.wikitext?.['*']||''}}
function renderedFields(html,title){
  const out={saga:'',prequel:'',sequel:''};if(!html||typeof DOMParser==='undefined')return out;let doc;try{doc=new DOMParser().parseFromString(html,'text/html')}catch(e){return out}
  for(const table of doc.querySelectorAll('table.infobox, table.sinottico'))for(const tr of table.querySelectorAll('tr')){const th=tr.querySelector('th'),td=tr.querySelector('td');if(!th||!td)continue;const label=norm(th.textContent),value=clean(td.textContent);if(!value)continue;if(!out.saga&&/^(?:serie|series|book series|saga|ciclo|trilogia|trilogy)$/.test(label))out.saga=safeSaga(value,title);else if(!out.prequel&&/^(?:preceduto da|preceduta da|preceded by|previous book|previous|prequel|libro precedente)$/.test(label))out.prequel=safeTitle(value,title);else if(!out.sequel&&/^(?:seguito da|seguita da|followed by|next book|next|sequel|libro successivo)$/.test(label))out.sequel=safeTitle(value,title)}return out;
}
function stripWiki(v){return String(v||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/>]*\/>/gi,' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\{\{[^{}]*\}\}/g,' ').replace(/''+/g,'').replace(/<[^>]+>/g,' ')}
function rawFields(wt,title){
  const out={saga:'',prequel:'',sequel:''},re=/^\s*\|\s*([^=|\n]+?)\s*=\s*(.*?)\s*$/gm;let m;
  while((m=re.exec(String(wt||'')))){const key=norm(m[1]).replace(/ /g,'_'),value=clean(stripWiki(m[2]));if(!value)continue;if(!out.saga&&/^(?:serie|series|series_name|book_series|saga|ciclo|trilogia|trilogy)$/.test(key))out.saga=safeSaga(value,title);else if(!out.prequel&&/^(?:preceduto|preceduta|preceduto_da|preceduta_da|preceded|preceded_by|previous|previous_book|prequel|libro_precedente)$/.test(key))out.prequel=safeTitle(value,title);else if(!out.sequel&&/^(?:seguito|seguita|seguito_da|seguita_da|followed|followed_by|next|next_book|sequel|libro_successivo)$/.test(key))out.sequel=safeTitle(value,title)}return out;
}
async function wikipediaStructured(input={}){
  const title=clean(input.title),author=clean(input.author);if(!title||!author)return null;
  for(const lang of ['it','en']){const pages=uniq([...(await wikiSearch(lang,`"${title}" "${author}"`,7)),...(await wikiSearch(lang,`${title} ${author}`,7))]).slice(0,12);for(const page of pages){if(!sameTitle(page,title)&&!titleVariants(title).some(v=>norm(page).includes(norm(v))))continue;const p=await wikiParse(lang,page);const blob=(p.html||'')+' '+(p.wt||'');if(!blob||!norm(blob).includes(norm(author)))continue;const a=renderedFields(p.html,title),b=rawFields(p.wt,title),r={saga:a.saga||b.saga,prequel:a.prequel||b.prequel,sequel:a.sequel||b.sequel};if(r.prequel||r.sequel)return{...r,verified:true,authoritative:true,checked:true,source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g,'_'))}`,method:'structured-book-infobox-fallback-v6'}}}
  return null;
}

const resolveCache=new Map();
async function resolve(input={}){
  const key=[code(input.code),norm(input.title),norm(input.author),norm(input.saga)].join('|');if(resolveCache.has(key))return resolveCache.get(key);
  const p=(async()=>{
    const diag={input:{code:code(input.code),title:clean(input.title),author:clean(input.author),saga:clean(input.saga)},attempts:[]};root.__LIB_SERIES_V6_LAST=diag;
    const gr=await goodreadsOrdered(input).catch(()=>null);diag.attempts.push({source:'goodreads-ordered-series',result:gr});if(relationComplete(gr)){diag.result=gr;return gr}
    const sg=await storyGraphCompletion(input,gr).catch(()=>null);diag.attempts.push({source:'storygraph-series-completion',result:sg});let best=mergeRelation(gr,sg,input);if(relationComplete(best)){diag.result=best;return best}
    const wi=await wikipediaStructured(input).catch(()=>null);diag.attempts.push({source:'wikipedia-structured-book-fallback',result:wi});best=mergeRelation(best,wi,input);if(best&&(best.prequel||best.sequel)){diag.result=best;return best}
    const empty={saga:safeSaga(input.saga,input.title),prequel:'',sequel:'',verified:false,authoritative:false,checked:true,source:'',method:'none'};diag.result=empty;return empty;
  })();resolveCache.set(key,p);return p;
}

root.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
root.__LIB_RESOLVE_SERIES_NEIGHBORS=resolve;
root.__LIB_FIND_RELATIONS=resolve;
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_RESOLVE_BOUNDED_RELATIONS=resolve;
root.__LIB_SERIES_RELATION_POLICY='single-owner-goodreads-complete-then-storygraph-then-wikipedia-v6';

let active=false,manual=new Set(),timer=null,seq=0;
function values(){if(typeof document==='undefined')return{code:'',title:'',author:'',saga:''};const get=id=>clean(document.getElementById(id)?.value||'');return{code:code(get('editCode')),title:get('editTitle'),author:get('editAuthor'),saga:get('editSaga')}}
function setAuto(id,value){if(typeof document==='undefined')return;const el=document.getElementById(id);if(!el||manual.has(id))return;const v=clean(value);if(el.value===v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function schedule(ms=250){if(!active)return;clearTimeout(timer);timer=setTimeout(run,ms)}
async function run(){const token=++seq,input=values();if(!active||!input.code||!input.title||!input.author)return;const r=await resolve(input).catch(()=>null);if(token!==seq||!active)return;const now=values();if(now.code!==input.code||!sameTitle(now.title,input.title)||norm(now.author)!==norm(input.author))return;if(r?.authoritative){setAuto('editSaga',r.saga||input.saga||'');setAuto('editPrequel',r.prequel||'');setAuto('editSequel',r.sequel||'')}root.__LIB_SERIES_V6_APPLIED={input,result:r,at:Date.now()}}
function activate(){active=true;manual.clear();resolveCache.clear();schedule(450)}
function boot(){
  if(typeof document==='undefined')return;const dlg=document.getElementById('editDialog');if(!dlg){setTimeout(boot,150);return}
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn')activate()},true);
  for(const id of ['editCode','editTitle','editAuthor','editSaga','editPrequel','editSequel']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('input',e=>{if(e.isTrusted&&['editSaga','editPrequel','editSequel'].includes(id))manual.add(id);if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(350)});el.addEventListener('change',()=>{if(active&&['editTitle','editAuthor','editSaga'].includes(id))schedule(180)})}
  new MutationObserver(()=>{if(dlg.open)activate();else{active=false;manual.clear();clearTimeout(timer);seq++}}).observe(dlg,{attributes:true,attributeFilter:['open']});
}
boot();
root.__LIB_SERIES_V6_TEST__={resolve,goodreadsOrdered,parseGoodreadsSeriesRows,goodreadsItalianTitle,storyGraphInfo,storyGraphCurrent,storyGraphNeighbor,storyGraphCompletion,relationComplete,mergeRelation,rawContainsIsbn,safeTitle,safeSaga,sameTitle};
})();
