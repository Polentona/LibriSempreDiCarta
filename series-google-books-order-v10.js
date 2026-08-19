(()=>{
if(window.__LIB_GOOGLE_SERIES_V10_BOOT)return;window.__LIB_GOOGLE_SERIES_V10_BOOT=true;
const cache=new Map();
const clean=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/[\*_`~]/g,'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
function variants(v){const raw=clean(v),out=[];for(const x of [raw,...raw.split(/\s*(?:[.:]|\s[-–—]\s)\s*/)]){const n=norm(x);if(n&&n.length>1&&!out.some(y=>norm(y)===n))out.push(clean(x))}return out}
function same(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' ')))}
function matches(v,title){return variants(title).some(t=>same(v,t))}
function book(v){let x=clean(v).replace(/^[|:=\-–—•·"“”'«»\s]+|[|:=\-–—•·"“”'«»\s]+$/g,'').replace(/^#?\s*\d{1,2}\s*[.)\-:]\s*/,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').replace(/\s+(?:ISBN|EAN)\b.*$/i,'').replace(/[.;,:\s]+$/,'').trim();return x&&x.length<=180?x:''}
function saga(v,author=''){let x=clean(v).replace(/^[|:=\-–—"“”'«»\s]+|[|:=\-–—"“”'«»\s]+$/g,'').replace(/\s+(?:series|serie|trilogy|trilogia)\s*$/i,'').trim();if(!x||x.length>100||norm(x)===norm(author)||/^(?:saga|serie|series|trilogia|trilogy|ciclo)$/i.test(x))return'';return x}
function splitList(v){let raw=clean(v).replace(/\s+(?:ISBN|EAN|Editore|Publisher)\b.*$/i,'');let p=raw.split(/\s*[,;•·|/]\s*/).map(book).filter(Boolean);if(p.length<2&&(raw.match(/[-–—]/g)||[]).length>=2)p=raw.split(/\s*[-–—]\s*/).map(book).filter(Boolean);return p.slice(0,30)}
function fromList(items,title,name='',source='Google Books'){const list=items.map(book).filter(Boolean);if(list.length<2)return null;const i=list.findIndex(x=>matches(x,title));if(i<0)return null;return{prequel:i?list[i-1]:'',sequel:i<list.length-1?list[i+1]:'',saga:name,source}}
function descriptionSaga(text,author=''){const p=clean(text),patterns=[/\b(?:saga|serie)\s+(?:di\s+)?["“”']?([A-ZÀ-ÖØ-Ý][^.;,"“”']{1,90})/i,/\b([A-Z][A-Za-z0-9'’ .-]{2,90}?)\s+series\b/i];for(const re of patterns){const m=p.match(re);if(m){const x=saga(m[1],author);if(x)return x}}return''}
function parse(text,title,author,hint){const out=[];let m;const re=/(?:La\s+)?(trilogia|saga|serie|ciclo)\s+(?:di\s+)?["“”']?([^:\n"“”']{2,100})["“”']?\s*:\s*([^\n]{5,600})/gi;while((m=re.exec(String(text||'')))){const items=splitList(m[3]),name=saga(m[2],author),r=fromList(items,title,'');if(!r)continue;const kind=m[1].toLowerCase(),strong=/^(?:saga|serie|ciclo)$/.test(kind)||!!(hint&&name&&norm(hint)===norm(name));r.saga=strong?name:'';r.strongSaga=strong;out.push(r)}const en=/\b([A-Z][^:\n]{2,100}?)\s+(trilogy|series)\s*:\s*([^\n]{5,600})/gi;while((m=en.exec(String(text||'')))){const items=splitList(m[3]),name=saga(m[1],author),r=fromList(items,title,'');if(!r)continue;const strong=m[2].toLowerCase()==='series'||!!(hint&&name&&norm(hint)===norm(name));r.saga=strong?name:'';r.strongSaga=strong;out.push(r)}return out}
async function fetchJson(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),8500);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(t)}}
function authorOk(list,author){const a=norm(author);return !a||(list||[]).some(v=>{const n=norm(v);return n===a||n.includes(a)||a.includes(n)})}
async function lookup(input){const title=clean(input.title),author=clean(input.author),hint=saga(input.saga,author)||descriptionSaga(input.description||input.plot||'',author);if(!title||!author)return null;const key=[norm(title),norm(author),norm(hint)].join('|');if(cache.has(key))return cache.get(key);const p=(async()=>{const qs=[`inauthor:"${author}" trilogia`,`inauthor:"${author}" saga`,`inauthor:"${author}" serie`,`inauthor:"${author}" trilogy`,`inauthor:"${author}" series`,`inauthor:"${author}" "${title}"`],seen=new Set(),all=[];for(const q of qs){const d=await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40`);for(const it of d?.items||[]){if(it.id&&seen.has(it.id))continue;if(it.id)seen.add(it.id);const v=it.volumeInfo||{};if(!authorOk(v.authors,author))continue;const blob=[v.title,v.subtitle,v.description].filter(Boolean).join('\n');all.push(...parse(blob,title,author,hint))}if(all.some(x=>x.prequel&&x.sequel))break}all.sort((a,b)=>(Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.prequel)+Number(!!a.sequel)));return all[0]||null})();cache.set(key,p);return p}
function install(){if(window.__LIB_UNIVERSAL_SERIES_V2)return true;const current=window.__LIB_FIND_RELATIONS;if(typeof current!=='function')return false;if(current.__googleSeriesV10)return true;const base=current;const wrapped=async input=>{const [b,g]=await Promise.all([Promise.resolve(base(input||{})).catch(()=>({prequel:'',sequel:'',saga:'',sagaChecked:false,source:''})),lookup(input||{}).catch(()=>null)]);if(!g)return b;return{prequel:book(g.prequel)||book(b?.prequel)||'',sequel:book(g.sequel)||book(b?.sequel)||'',saga:g.strongSaga&&g.saga?saga(g.saga,input?.author):saga(b?.saga,input?.author)||'',sagaChecked:Boolean(b?.sagaChecked||g.strongSaga),source:g.source||b?.source||''}};wrapped.__googleSeriesV10=true;window.__LIB_FIND_RELATIONS=wrapped;return true}
let n=0;const timer=setInterval(()=>{n++;if(install()||n>=100)clearInterval(timer)},100);install();
})();

/* BOOK_TITLE_UNDERLINE_FIT_V1: la riga sotto il titolo termina con il testo, non con il banner. */
(()=>{
if(window.__LIB_BOOK_TITLE_UNDERLINE_FIT_V1)return;window.__LIB_BOOK_TITLE_UNDERLINE_FIT_V1=true;
const style=document.createElement('style');
style.id='bookTitleUnderlineFitStyle';
style.textContent=`
  .book .info>.title{
    align-self:flex-start!important;
    width:max-content!important;
    max-width:100%!important;
  }
  @media(max-width:620px){
    .book .info>.title{
      padding-right:0!important;
      max-width:calc(100% - 34px)!important;
    }
  }
`;
document.head.appendChild(style);
})();

/* HOME_ORDER_V2: Home = cognome autore principale -> saga -> data pubblicazione -> titolo. */
(()=>{
if(window.__LIB_HOME_ORDER_V2_BOOT)return;window.__LIB_HOME_ORDER_V2_BOOT=true;
const tidy=v=>String(v??'').replace(/\s+/g,' ').trim();
const coll=(a,b)=>tidy(a).localeCompare(tidy(b),'it',{sensitivity:'base',numeric:true});
function mainAuthor(author){
  let raw=tidy(author);if(!raw)return'';
  raw=raw.split(/\s*(?:;|&|\be\b|\band\b)\s*/i).filter(Boolean)[0]||raw;
  return tidy(raw.replace(/\([^)]*\)/g,''));
}
function authorSurname(author){
  const a=mainAuthor(author);if(!a)return'';
  if(a.includes(','))return tidy(a.split(',')[0]);
  const parts=a.split(/\s+/).filter(Boolean);return parts.at(-1)||a;
}
function publicationValue(book){
  const raw=tidy(book?.publishedDate||book?.publication||book?.year||'');
  if(!raw)return Number.POSITIVE_INFINITY;
  const iso=raw.match(/^((?:18|19|20)\d{2})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/);
  if(iso){
    const y=Number(iso[1]),m=Math.max(1,Math.min(12,Number(iso[2])||1)),d=Math.max(1,Math.min(31,Number(iso[3])||1));
    return Date.UTC(y,m-1,d);
  }
  const y=raw.match(/(?:18|19|20)\d{2}/);if(y)return Date.UTC(Number(y[0]),0,1);
  const parsed=Date.parse(raw);return Number.isFinite(parsed)?parsed:Number.POSITIVE_INFINITY;
}
function compareHome(a,b){
  let c=coll(authorSurname(a?.author),authorSurname(b?.author));if(c)return c;
  c=coll(a?.saga,b?.saga);if(c)return c;
  c=publicationValue(a)-publicationValue(b);if(Number.isFinite(c)&&c)return c;
  c=coll(a?.title,b?.title);if(c)return c;
  c=coll(mainAuthor(a?.author),mainAuthor(b?.author));if(c)return c;
  return (Number(a?.id)||0)-(Number(b?.id)||0);
}
function installHomeOrder(){
  if(typeof getFilteredBooks!=='function'||!window.__LIB_COMPARE_BOOKS_UI)return false;
  const current=window.getFilteredBooks||getFilteredBooks;
  if(current.__homeOrderV2)return true;
  const wrapped=function(){
    const list=current.apply(this,arguments);
    try{
      if(typeof currentView!=='undefined'&&currentView==='home')return [...list].sort(compareHome);
    }catch(e){}
    return list;
  };
  wrapped.__homeOrderV2=true;
  wrapped.__homeOrderV2Base=current;
  window.getFilteredBooks=wrapped;
  try{if(typeof currentView!=='undefined'&&currentView==='home'&&typeof render==='function')render()}catch(e){}
  return true;
}
let tries=0;const orderTimer=setInterval(()=>{tries++;if(installHomeOrder()||tries>=80)clearInterval(orderTimer)},100);
setTimeout(installHomeOrder,0);
})();

/* RESOLVER_AND_GENRES_CACHE_BUST_V3 */
(()=>{
  if(window.__LIB_RESOLVER_AND_GENRES_CACHE_BUST_V3)return;
  window.__LIB_RESOLVER_AND_GENRES_CACHE_BUST_V3=true;
  const r=document.createElement('script');
  r.src='isbn-search-recovery-v2.js?v=20260819-1';
  r.async=false;
  document.head.appendChild(r);
  const u=document.createElement('script');
  u.src='series-universal-resolver-v1.js?v=20260819-2';
  u.async=false;
  document.head.appendChild(u);
  const g=document.createElement('script');
  g.src='genres-multi-v1.js?v=20260819-4';
  g.async=false;
  document.head.appendChild(g);
})();