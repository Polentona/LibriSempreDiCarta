(()=>{
if(window.__LIB_PUBLISHER_PLOT_RESILIENCE_V5)return;
window.__LIB_PUBLISHER_PLOT_RESILIENCE_V5=true;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const slug=v=>norm(v).replace(/\s+/g,'-');
const escRe=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const oldOfficial=typeof window.__LIB_RESOLVE_OFFICIAL_PLOT==='function'?window.__LIB_RESOLVE_OFFICIAL_PLOT:null;
const oldPriority=typeof window.__LIB_RESOLVE_PLOT_PRIORITY==='function'?window.__LIB_RESOLVE_PLOT_PRIORITY:null;
let manual=false,lastCode='',attempts=new Map(),timer=null;

function reviewNoise(v){const n=norm(v);return /\b(?:recensione|recensioni|customer review|verified purchase|acquisto verificato|reviewed in|recensito in|a mio parere|secondo me|mi e piaciut|non mi e piaciut|ho letto|ho trovato|io penso|consiglio questo|consiglio il libro|stelle su 5|out of 5 stars)\b/i.test(n)}
function mediaNoise(v){const n=norm(v);return /\b(?:serie tv|serie televisiv|miniserie|miniserie tv|adattamento cinematograf|adattamento televisiv|trasposizione cinematograf|trasposizione televisiv|tratto dal film|tratta dal film|da cui e stato tratto il film|da cui e stata tratta la serie|netflix|prime video|disney plus|hbo|regia di|diretto da|starring|cast del film|sul grande schermo)\b/i.test(n)}
function boiler(v){const n=norm(v);return /\b(?:cookie|privacy policy|aggiungi al carrello|acquista ora|spedizione|newsletter|servizio clienti|termini e condizioni|menu principale)\b/i.test(n)}
function plain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^\s*#{1,6}\s*/,'').replace(/[*_`>|]/g,' '))}
function sanitize(v){
  const seen=new Set(),out=[];
  for(const raw of String(v||'').split(/\n+/)){
    const p=plain(raw),k=norm(p);if(!p||seen.has(k))continue;seen.add(k);
    if(reviewNoise(p)||mediaNoise(p)||boiler(p)){
      const ss=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
      const keep=ss.map(clean).filter(s=>s&&!reviewNoise(s)&&!mediaNoise(s)&&!boiler(s));
      if(keep.join(' ').length>=45)out.push(keep.join(' '));
    }else out.push(p);
  }
  let x=clean(out.join(' ')).replace(/^(?:descrizione(?: del libro| prodotto)?|sinossi|trama|abstract|presentazione|note editore)\s*[:\-]?\s*/i,'').trim();
  if(typeof window.__LIB_CLEAN_BOOK_PLOT==='function')x=window.__LIB_CLEAN_BOOK_PLOT(x)||'';
  x=clean(x);if(x.length<60)return'';if(x.length>2600)x=x.slice(0,2600).replace(/\s+\S*$/,'')+'…';return x;
}
function htmlToText(raw,url=''){
  const s=String(raw||'');if(!/<(?:html|body|article|main|div|p|h1|h2|meta)\b/i.test(s))return s;
  try{const d=new DOMParser().parseFromString(s,'text/html'),meta=[...d.querySelectorAll('meta[name="description"],meta[property="og:description"]')].map(x=>clean(x.content)).filter(Boolean);return [...meta,clean(d.body?.innerText||'')].filter(Boolean).join('\n')}catch(e){return s}
}
async function get(url,ms=7000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});if(!r.ok)return'';return htmlToText(await r.text(),url)}catch(e){return''}finally{clearTimeout(t)}}
async function readFresh(target){
  const routes=[target,'https://r.jina.ai/'+target];
  if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));
  for(const u of routes){const x=await get(u,u===target?4500:8500);if(x.length>180)return x}
  return'';
}
function stop(v){return /^(?:formato|legatura|pagine|in libreria da|ebook|isbn|ean|dettagli|dettagli prodotto|scheda tecnica|informazioni sul prodotto|recensioni|autore|l autore|biografia|acquista|compra|disponibilita|prodotti correlati|potrebbero interessarti|specifiche|scheda libro|dati bibliografici)$/.test(norm(v))}
function titleVariants(v){const t=clean(v),a=[t],m=t.match(/^[^.!?]{2,70}[.!?]\s+(.{3,220})$/),c=t.match(/^[^:]{2,70}:\s*(.{3,220})$/);if(m)a.push(m[1]);if(c)a.push(c[1]);return [...new Set(a.map(clean).filter(Boolean))]}
function headed(text){
  const ls=String(text||'').split(/\r?\n/),head=/^(?:descrizione|descrizione del libro|descrizione dell editore|sinossi|trama|trama libro|abstract|presentazione|il libro|la trama|note editore)$/;
  for(let i=0;i<ls.length;i++){
    if(!head.test(norm(plain(ls[i]))))continue;
    const out=[];
    for(let j=i+1;j<Math.min(ls.length,i+55)&&out.join(' ').length<3200;j++){
      const raw=String(ls[j]),p=plain(raw);if(!p)continue;
      if((stop(p)||/^\s*#{1,6}\s/.test(raw))&&out.length)break;
      if((p.length>=35||(out.length&&p.length>=12))&&!boiler(p))out.push(p)
    }
    const x=sanitize(out.join('\n'));if(x)return x
  }
  return''
}
function metaCandidate(text,title,author){
  const tn=norm(title),an=norm(author);
  for(const p of String(text||'').split(/\r?\n/).slice(0,55).map(plain).filter(Boolean)){
    const x=sanitize(p),n=norm(x);if(!x||x.length<120)continue;
    if(/\b(?:isbn|prezzo|acquista|editore|publisher|cookie|privacy)\b/i.test(n))continue;
    if((tn&&n.includes(tn))||(an&&n.includes(an))||x.length>=220)return x
  }
  return''
}
function extractBompiani(text,title,author){
  const ls=String(text||'').split(/\r?\n/),tv=titleVariants(title).map(norm),an=norm(author);let start=-1;
  for(let i=0;i<Math.min(ls.length,220);i++){const n=norm(plain(ls[i]));if(tv.some(t=>t&&n===t)){start=i+1;break}}
  if(start<0&&an)for(let i=0;i<Math.min(ls.length,220);i++)if(norm(plain(ls[i]))===an){start=i+1;break}
  if(start<0)return'';const out=[];
  for(let i=start;i<Math.min(ls.length,start+55);i++){
    const raw=String(ls[i]),p=plain(raw),n=norm(p);if(!p)continue;if(an&&n===an&&!out.length)continue;
    if(stop(p)||/^(?:formato|legatura|pagine|in libreria da|ebook|isbn)\b/.test(n))break;
    if(/^#{1,6}\s/.test(raw)&&out.length)break;
    if((p.length>=45||(out.length&&p.length>=12))&&!boiler(p))out.push(p);
  }
  return sanitize(out.join('\n'));
}
async function freshBompiani(input={}){
  const isbn=code(input.code),title=clean(input.title),author=clean(input.author),pub=norm(input.publisher);
  if(!/^97[89]\d{10}$/.test(isbn)||!title||!pub.includes('bompiani'))return'';
  for(const t of titleVariants(title)){
    const url=`https://www.bompiani.it/catalogo/${slug(t)}-${isbn}`,text=await readFresh(url);
    if(!text||!code(text).includes(isbn)||!titleVariants(title).some(v=>norm(text).includes(norm(v))))continue;
    const plot=extractBompiani(text,title,author);if(plot)return plot;
  }
  return'';
}
function sperlingSlugs(title,saga,author){
  let ts=slug(title).replace(/-(?:vol|volume)-?\d+$/,'').replace(/-(?:vol|volume)$/,'');
  const ss=slug(saga),as=slug(author);let core=ts;
  if(ss&&core){core=core.replace(new RegExp('(^|-)'+escRe(ss)+'(?=-|$)'),'$1').replace(/--+/g,'-').replace(/^-+|-+$/g,'')}
  const out=[];const add=x=>{x=String(x||'').replace(/--+/g,'-').replace(/^-+|-+$/g,'');if(x&&!out.includes(x))out.push(x)};
  if(ss&&core&&as)add(`${ss}-${core}-${as}`);
  if(core&&ss&&as)add(`${core}-${ss}-${as}`);
  if(core&&as)add(`${core}-${as}`);
  if(ts&&as)add(`${ts}-${as}`);
  return out
}
async function freshSperling(input={}){
  const isbn=code(input.code),title=clean(input.title),author=clean(input.author),saga=clean(input.saga),pub=norm(input.publisher);
  if(!/^97[89]\d{10}$/.test(isbn)||!title||!author||!pub.includes('sperling'))return'';
  const variants=titleVariants(title).map(norm).filter(Boolean),an=norm(author);
  for(const s of sperlingSlugs(title,saga,author)){
    const url=`https://www.sperling.it/libri/${s}`,text=await readFresh(url);if(!text)continue;
    const n=norm(text);if(!variants.some(v=>v.length>3&&n.includes(v))||!n.includes(an))continue;
    const plot=headed(text)||metaCandidate(text,title,author);if(plot)return plot
  }
  return''
}
async function resilientOfficial(input={}){
  let p='',pub=norm(input.publisher);
  if(pub.includes('sperling')){try{p=await freshSperling(input)}catch(e){}if(p)return sanitize(p)}
  if(oldOfficial){try{p=sanitize(await oldOfficial(input))}catch(e){}}
  if(p)return p;
  try{p=await freshBompiani(input)}catch(e){}
  if(p)return sanitize(p);
  if(!pub.includes('sperling')){try{p=await freshSperling(input)}catch(e){}}
  return sanitize(p);
}
window.__LIB_RESOLVE_OFFICIAL_PLOT=resilientOfficial;
window.__LIB_RESOLVE_PLOT_PRIORITY=async input=>{
  const p=await resilientOfficial(input||{});if(p)return p;
  if(oldPriority){try{const r=await oldPriority(input||{});return sanitize(r?.plot||r||'')}catch(e){}}
  return'';
};
window.__LIB_PLOT_SOURCE_POLICY='publisher-first-sperling-direct-then-clean-fallbacks-resilient';

function current(){return{code:code($('editCode')?.value||''),title:clean($('editTitle')?.value||''),author:clean($('editAuthor')?.value||''),publisher:clean($('editPublisher')?.value||''),saga:clean($('editSaga')?.value||'')}}
async function attempt(){
  const ta=$('editPlot'),dlg=$('editDialog'),inp=current();if(!ta||manual||!dlg?.open||!/^97[89]\d{10}$/.test(inp.code)||!inp.title||!inp.publisher)return;
  const sig=[inp.code,norm(inp.title),norm(inp.publisher),norm(inp.saga)].join('|'),n=attempts.get(sig)||0;if(n>=6)return;attempts.set(sig,n+1);
  const p=await resilientOfficial(inp);if(manual)return;
  if(p){ta.value=p;attempts.set(sig,99);const s=$('lookupStatus');if(s){s.textContent='Trama recuperata dal sito ufficiale '+inp.publisher+'.';s.className='lookup-status ok'}}
}
function boot(){const c=$('editCode'),ta=$('editPlot');if(!c||!ta){setTimeout(boot,150);return}
  c.addEventListener('input',e=>{if(e.isTrusted){manual=false;attempts.clear();lastCode=code(c.value)}});
  ta.addEventListener('input',e=>{if(e.isTrusted)manual=true});
  timer=setInterval(()=>{const now=code(c.value);if(now!==lastCode){lastCode=now;manual=false;attempts.clear()}attempt()},2600);
  setTimeout(attempt,1200);
}
boot();
window.__LIB_PUBLISHER_PLOT_RESILIENCE_V5_TEST__={sperlingSlugs,headed,sanitize};
})();