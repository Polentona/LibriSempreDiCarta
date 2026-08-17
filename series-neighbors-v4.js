(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_FINAL_NEIGHBORS_V4_BOOT)return;root.__LIB_FINAL_NEIGHBORS_V4_BOOT=true;
const cache=new Map();
const clean=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/[\*_`~]/g,'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const same=(a,b)=>{const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' ')))};
const variants=v=>{const r=clean(v),out=[];for(const x of [r,...r.split(/\s*(?:[.:]|\s[-–—]\s)\s*/)]){const n=norm(x);if(n&&!out.some(y=>norm(y)===n))out.push(clean(x))}return out};
const matches=(candidate,title)=>variants(title).some(t=>same(candidate,t));
function tidyTitle(v){let x=clean(v).replace(/^[|:=\-–—•·“”"'\s]+|[|:=\-–—•·“”"'\s]+$/g,'').replace(/^#?\s*\d{1,3}\s*[.)\-:]\s*/,'').replace(/\s+(?:ISBN|EAN)\b.*$/i,'').replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'').replace(/[.;,:\s]+$/,'').trim();return x&&x.length<=190?x:''}
function tidySaga(v){let x=clean(v).replace(/^[|:=\-–—\s]+|[|:=\-–—\s]+$/g,'').replace(/^(?:la\s+|the\s+)?(?:serie|series|saga|trilogia|trilogy|ciclo)\s+(?:di|of)\s+/i,'').replace(/\s+(?:series|serie|saga|trilogy|trilogia)\s*$/i,'').trim();return x&&x.length<=120?x:''}
function splitTitles(v){let raw=clean(v).replace(/\s+(?:ISBN|EAN|editore|publisher)\b.*$/i,'');raw=raw.replace(/\s+(?:e|and|&)\s+(?=[A-ZÀ-ÖØ-Ý“"'])/g,', ');let p=raw.split(/\s*[,;•·|/]\s*/).map(tidyTitle).filter(Boolean);if(p.length<2&&(raw.match(/[-–—]/g)||[]).length>=2)p=raw.split(/\s*[-–—]\s*/).map(tidyTitle).filter(Boolean);return p.filter((x,i,a)=>a.findIndex(y=>same(x,y))===i).slice(0,40)}
function relation(items,title,saga,source){const list=(items||[]).map(tidyTitle).filter(Boolean);if(list.length<2)return null;const i=list.findIndex(x=>matches(x,title));if(i<0)return null;return{prequel:i>0?list[i-1]:'',sequel:i<list.length-1?list[i+1]:'',saga:tidySaga(saga),source,items:list}}
function parseExplicit(text,title,sagaHint,source='Google Books'){
  const raw=clean(text),sg=tidySaga(sagaHint);if(!raw)return null;let m;
  const patterns=[
    /(?:la\s+|the\s+)?(?:trilogia|trilogy|saga|serie|series|ciclo)\s+(?:di|of)\s+([^:.;]{1,120})\s*:\s*([^.;]{5,650})/ig,
    /(?:la\s+|the\s+)?(?:trilogia|trilogy|saga|serie|series|ciclo)\s+[“"']?([^:.;“”"']{1,120})[”"']?\s*:\s*([^.;]{5,650})/ig
  ];
  for(const re of patterns){while((m=re.exec(raw))){const named=tidySaga(m[1]);if(sg&&named&&!(norm(named).includes(norm(sg))||norm(sg).includes(norm(named))))continue;const r=relation(splitTitles(m[2]),title,named||sg,source);if(r)return r}}
  const chunks=raw.split(/\n|(?<=[.!?])\s+/).filter(Boolean);
  for(const chunk of chunks){if(sg&&!norm(chunk).includes(norm(sg)))continue;if(!variants(title).some(t=>norm(chunk).includes(norm(t))))continue;const colon=chunk.indexOf(':');if(colon>=0){const r=relation(splitTitles(chunk.slice(colon+1)),title,sg,source);if(r)return r}}
  return null;
}
function authorMatch(authors,author){const a=norm(author);if(!a)return true;if(!Array.isArray(authors)||!authors.length)return true;const parts=a.split(' ').filter(x=>x.length>2);return authors.some(v=>{const n=norm(v);return n===a||n.includes(a)||a.includes(n)||(parts.length>=2&&parts.every(x=>n.includes(x)))})}
async function getJson(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(timer)}}
async function googleNeighbors(input,sagaName){
  const title=clean(input?.title),author=clean(input?.author),sg=tidySaga(sagaName);if(!title||!author||!sg)return null;
  const key=[norm(title),norm(author),norm(sg)].join('|');if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const surname=author.split(/\s+/).filter(Boolean).pop()||author;
    const queries=[
      `inauthor:${surname} "${sg}"`,
      `inauthor:${surname} "${title}" "${sg}"`,
      `inauthor:${surname} "trilogia" "${sg}"`,
      `inauthor:${surname} "trilogy" "${sg}"`,
      `inauthor:${surname} "series" "${sg}"`,
      `inauthor:${surname}`
    ];
    const seen=new Set();
    for(const q of queries){
      for(const startIndex of [0,40]){
        const d=await getJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40&startIndex=${startIndex}&projection=full&printType=books`);
        const items=d?.items||[];if(!items.length)break;
        for(const it of items){if(it.id&&seen.has(it.id))continue;if(it.id)seen.add(it.id);const v=it.volumeInfo||{};if(!authorMatch(v.authors,author))continue;const source=v.canonicalVolumeLink||v.infoLink||'Google Books';const texts=[[v.title,v.subtitle].filter(Boolean).join(': '),v.description||''];for(const text of texts){const rel=parseExplicit(text,title,sg,source);if(rel&&(rel.prequel||rel.sequel))return rel}}
        if(items.length<40)break;
      }
    }
    return null;
  })();cache.set(key,promise);return promise;
}
async function resolve(input,baseResult){const b=baseResult||{};if(b.prequel&&b.sequel)return b;const sg=tidySaga(b.saga)||tidySaga(input?.saga);if(!sg)return b;const g=await googleNeighbors(input,sg);return{...b,prequel:tidyTitle(g?.prequel)||tidyTitle(b.prequel)||'',sequel:tidyTitle(g?.sequel)||tidyTitle(b.sequel)||'',saga:tidySaga(b.saga)||tidySaga(g?.saga)||sg,sagaChecked:Boolean(b.sagaChecked||g?.saga||sg),source:g?.source||b.source||''}}
function installOn(current){if(typeof current!=='function'||current.__finalNeighborsV4)return current;const base=current;const wrapped=async input=>{let b={prequel:'',sequel:'',saga:'',sagaChecked:false,source:''};try{b=await Promise.resolve(base(input||{}))||b}catch(e){}try{return await resolve(input||{},b)}catch(e){return b}};wrapped.__finalNeighborsV4=true;wrapped.__wrappedBase=base;return wrapped}
function ensure(){const cur=root.__LIB_FIND_RELATIONS;if(typeof cur==='function'&&!cur.__finalNeighborsV4)root.__LIB_FIND_RELATIONS=installOn(cur)}
let ticks=0;const timer=setInterval(()=>{ensure();if(++ticks>=150)clearInterval(timer)},100);ensure();
root.__LIB_SERIES_NEIGHBORS_V4_TEST__={parseExplicit,splitTitles,relation,resolve,googleNeighbors};
if(typeof module!=='undefined'&&module.exports)module.exports=root.__LIB_SERIES_NEIGHBORS_V4_TEST__;
})();
