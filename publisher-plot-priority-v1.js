(()=>{
if(window.__LIB_PUBLISHER_PLOT_PRIORITY_V1)return;
window.__LIB_PUBLISHER_PLOT_PRIORITY_V1=true;

const $=id=>document.getElementById(id);
const normCode=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const slug=v=>norm(v).replace(/\s+/g,'-');
const OFFICIAL=[
  {test:/\bbompiani\b/i,domain:'bompiani.it',name:'Bompiani',direct:(code,title)=>`https://www.bompiani.it/catalogo/${slug(title)}-${code}`},
  {test:/\bmondadori\b/i,domain:'mondadori.it',name:'Mondadori'},
  {test:/\beinaudi\b/i,domain:'einaudi.it',name:'Einaudi'},
  {test:/\bfeltrinelli\b/i,domain:'feltrinellieditore.it',name:'Feltrinelli'},
  {test:/\brizzoli\b/i,domain:'rizzolilibri.it',name:'Rizzoli'},
  {test:/\bsperling\b/i,domain:'sperling.it',name:'Sperling & Kupfer'},
  {test:/\bpiemme\b/i,domain:'edizpiemme.it',name:'Piemme'},
  {test:/\bgarzanti\b/i,domain:'garzanti.it',name:'Garzanti'},
  {test:/\blonganesi\b/i,domain:'longanesi.it',name:'Longanesi'},
  {test:/\bnewton\s+compton\b/i,domain:'newtoncompton.com',name:'Newton Compton'},
  {test:/\bgiunti\b/i,domain:'giunti.it',name:'Giunti'},
  {test:/\bsalani\b/i,domain:'salani.it',name:'Salani'},
  {test:/\badelphi\b/i,domain:'adelphi.it',name:'Adelphi'},
  {test:/\bsellerio\b/i,domain:'sellerio.it',name:'Sellerio'},
  {test:/\bfazi\b/i,domain:'fazieditore.it',name:'Fazi'},
  {test:/\bmarsilio\b/i,domain:'marsilioeditori.it',name:'Marsilio'},
  {test:/\bneri\s+pozza\b/i,domain:'neripozza.it',name:'Neri Pozza'},
  {test:/\bharpercollins\b/i,domain:'harpercollins.it',name:'HarperCollins Italia'}
];
const FALLBACK_DOMAINS=['ibs.it','libraccio.it','libreriauniversitaria.it','lafeltrinelli.it','hoepli.it','unilibro.it','mondadoristore.it','giunti.it'];
const cache=new Map();
let runToken=0,timer=null,lastKey='',manualPlot=false;

function publisherInfo(v){const n=norm(v);return OFFICIAL.find(x=>x.test.test(n))||null}
function hostMatches(url,domain){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');return h===domain||h.endsWith('.'+domain)}catch(e){return false}}
function textFromHtml(raw,url=''){
  const s=String(raw||'');
  if(!/<(?:html|body|main|div|article|p|h1|h2|meta)\b/i.test(s))return s;
  try{
    const d=new DOMParser().parseFromString(s,'text/html');
    const meta=[...d.querySelectorAll('meta[name="description"],meta[property="og:description"]')].map(x=>clean(x.getAttribute('content'))).filter(Boolean);
    const links=[...d.querySelectorAll('a[href]')].map(a=>{try{return `[${clean(a.textContent)}](${new URL(a.getAttribute('href'),url||location.href).href})`}catch(e){return''}}).filter(Boolean);
    return [...meta, ...links, clean(d.body?.innerText||'')].filter(Boolean).join('\n')
  }catch(e){return s}
}
async function get(url,timeout=7500){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'}});if(!r.ok)return'';return textFromHtml(await r.text(),url)}catch(e){return''}finally{clearTimeout(t)}}
async function readTarget(target){
  const routes=[target,'https://r.jina.ai/'+target,'https://api.allorigins.win/raw?url='+encodeURIComponent(target),'https://corsproxy.io/?url='+encodeURIComponent(target),'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(target)];
  for(const u of routes){const x=await get(u,u===target?4500:7000);if(x.length>180)return x}
  return''
}
function linksFrom(text,allowed){const out=[],seen=new Set();let m;const raw=String(text||'');const res=[/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g,/href=["'](https?:\/\/[^"']+)["']/gi,/(https?:\/\/[^\s<>)\]]+)/gi];for(const re of res){while((m=re.exec(raw))){const u=String(m[1]||'').replace(/&amp;/g,'&').replace(/[),.;]+$/,'');if(!u||seen.has(u))continue;if(allowed.some(d=>hostMatches(u,d))){seen.add(u);out.push(u)}}}return out}
function exactIsbn(text,code){const hay=normCode(text);return !!code&&hay.includes(normCode(code))}
function titleVariants(title){let t=clean(title),out=[t];const after=t.match(/^[^.!?]{2,70}[.!?]\s+(.{3,220})$/);if(after)out.push(after[1]);const colon=t.match(/^[^:]{2,70}:\s*(.{3,220})$/);if(colon)out.push(colon[1]);return [...new Set(out.map(clean).filter(Boolean))]}
function titleLooksRight(text,title){const n=norm(text),vars=titleVariants(title).map(norm).filter(x=>x.length>4);return !vars.length||vars.some(x=>n.includes(x))}
function linePlain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^\s*#{1,6}\s*/,'').replace(/[*_`>|]/g,' '))}
function reviewNoise(s){const n=norm(s);return /\b(?:recensione|recensioni|customer review|verified purchase|acquisto verificato|reviewed in|recensito in|a mio parere|secondo me|mi e piaciut|non mi e piaciut|ho letto|ho trovato|io penso|consiglio questo|consiglio il libro|stelle su 5|out of 5 stars)\b/i.test(n)}
function mediaNoise(s){const n=norm(s);return /\b(?:serie tv|serie televisiv|miniserie|miniserie tv|adattamento cinematograf|adattamento televisiv|trasposizione cinematograf|trasposizione televisiv|tratto dal film|tratta dal film|da cui e stato tratto il film|da cui e stata tratta la serie|netflix|prime video|disney plus|hbo|regia di|diretto da|starring|cast del film|sul grande schermo)\b/i.test(n)}
function boilerplate(s){const n=norm(s);return /\b(?:cookie|privacy policy|aggiungi al carrello|acquista ora|spedizione|disponibilita|newsletter|servizio clienti|termini e condizioni|tutti i libri|catalogo|menu principale)\b/i.test(n)}
function dedupeParagraphs(v){const out=[],seen=new Set();for(const p of String(v||'').split(/\n+/).map(linePlain).filter(Boolean)){const k=norm(p);if(k.length<2||seen.has(k))continue;seen.add(k);out.push(p)}return out.join('\n')}
function stripBadSentences(v){
  const paras=dedupeParagraphs(v).split(/\n+/).map(clean).filter(Boolean),out=[];
  for(const p of paras){
    if(reviewNoise(p)||mediaNoise(p)||boilerplate(p)){
      const sentences=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
      const kept=sentences.map(clean).filter(s=>s&&!reviewNoise(s)&&!mediaNoise(s)&&!boilerplate(s));
      if(kept.join(' ').length>=45)out.push(kept.join(' '));
    }else out.push(p)
  }
  return clean(out.join(' '))
}
function safePlot(v){
  let p=stripBadSentences(v);if(!p)return'';
  if(typeof window.__LIB_CLEAN_BOOK_PLOT==='function')p=window.__LIB_CLEAN_BOOK_PLOT(p)||'';
  p=stripBadSentences(p).replace(/^(?:descrizione(?: del libro| prodotto)?|sinossi|trama|abstract|presentazione)\s*[:\-]?\s*/i,'').trim();
  if(p.length<60||reviewNoise(p)&&p.length<140)return'';
  if(p.length>2600)p=p.slice(0,2600).replace(/\s+\S*$/,'')+'…';
  return p
}
function stopHeading(v){const n=norm(v);return /^(?:formato|legatura|pagine|in libreria da|ebook|isbn|ean|dettagli|dettagli prodotto|scheda tecnica|informazioni sul prodotto|recensioni|autore|l autore|biografia|acquista|compra|disponibilita|prodotti correlati|potrebbero interessarti)$/.test(n)}
function extractAfterHeading(text){
  const lines=String(text||'').split(/\r?\n/);const heads=/^(?:descrizione|descrizione del libro|descrizione dell editore|sinossi|trama|trama libro|abstract|presentazione|il libro)$/;
  for(let i=0;i<lines.length;i++){
    if(!heads.test(norm(linePlain(lines[i]))))continue;
    const out=[];
    for(let j=i+1;j<Math.min(lines.length,i+35)&&out.join(' ').length<3000;j++){
      const p=linePlain(lines[j]);if(!p)continue;if(stopHeading(p)&&out.length)break;if(/^#{1,6}\s/.test(String(lines[j]))&&out.length)break;if(p.length>=35)out.push(p)
    }
    const plot=safePlot(out.join('\n'));if(plot)return plot
  }
  return''
}
function extractBompiani(text,title,author){
  const lines=String(text||'').split(/\r?\n/),tv=titleVariants(title).map(norm),an=norm(author);let start=-1;
  for(let i=0;i<Math.min(lines.length,180);i++){const p=linePlain(lines[i]),n=norm(p);if(tv.some(t=>t&&n===t)){start=i+1;break}}
  if(start<0){for(let i=0;i<Math.min(lines.length,180);i++){const p=linePlain(lines[i]);if(an&&norm(p)===an){start=i+1;break}}}
  if(start<0)return extractAfterHeading(text);
  const out=[];
  for(let i=start;i<Math.min(lines.length,start+45);i++){
    const raw=String(lines[i]),p=linePlain(raw),n=norm(p);if(!p)continue;
    if(an&&n===an&&!out.length)continue;
    if(stopHeading(p)||/^(?:formato|legatura|pagine|in libreria da|ebook|isbn)\b/.test(n))break;
    if(/^#{1,6}\s/.test(raw)&&out.length)break;
    if(p.length>=45&&!boilerplate(p))out.push(p)
  }
  return safePlot(out.join('\n'))
}
function extractMetaCandidate(text){
  const lines=String(text||'').split(/\r?\n/).map(linePlain).filter(Boolean);
  for(const p of lines.slice(0,35)){const s=safePlot(p);if(s&&s.length>=120&&!/\b(?:isbn|prezzo|acquista|editore|publisher)\b/i.test(norm(s)))return s}
  return''
}
function extractPlot(text,kind,title,author){return kind==='Bompiani'?extractBompiani(text,title,author):(extractAfterHeading(text)||extractMetaCandidate(text))}
async function discover(domain,code,title){
  const q=`site:${domain} \"${code}\" \"${titleVariants(title).slice(-1)[0]||title}\"`,urls=['https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),'https://html.duckduckgo.com/html/?q='+encodeURIComponent(q)];
  for(const u of urls){const x=await readTarget(u);if(!x)continue;const ll=linksFrom(x,[domain]);if(ll.length)return ll}
  return[]
}
async function officialPlot({code,title,author,publisher}={}){
  code=normCode(code||$('editCode')?.value||'');title=clean(title||$('editTitle')?.value||'');author=clean(author||$('editAuthor')?.value||'');publisher=clean(publisher||$('editPublisher')?.value||'');
  const info=publisherInfo(publisher);if(!info||!/^97[89]\d{10}$/.test(code)||!title)return null;
  const key='official|'+code+'|'+info.domain+'|'+norm(title);if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const urls=[];
    if(info.direct){for(const t of titleVariants(title)){const u=info.direct(code,t);if(u&&!urls.includes(u))urls.push(u)}}
    const found=await discover(info.domain,code,title);for(const u of found)if(!urls.includes(u))urls.push(u);
    for(const u of urls.slice(0,6)){
      const text=await readTarget(u);if(!text||!exactIsbn(text,code)||!titleLooksRight(text,title))continue;
      const p=extractPlot(text,info.name,title,author);if(p)return{plot:p,source:info.name,url:u,official:true}
    }
    return null
  })();cache.set(key,promise);return promise
}
async function fallbackPlot({code,title,author}={}){
  code=normCode(code||$('editCode')?.value||'');title=clean(title||$('editTitle')?.value||'');author=clean(author||$('editAuthor')?.value||'');if(!/^97[89]\d{10}$/.test(code)||!title)return null;
  const key='fallback|'+code+'|'+norm(title);if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    try{const rec=await window.__LIB_METADATA_RESCUE_LOOKUP?.(code);const p=safePlot(rec?.description||'');if(p)return{plot:p,source:rec?.source||'catalogo italiano',official:false}}catch(e){}
    const domainQuery=FALLBACK_DOMAINS.map(d=>'site:'+d).join(' OR '),q=`\"${code}\" (${domainQuery})`,searches=['https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),'https://html.duckduckgo.com/html/?q='+encodeURIComponent(q)];
    const pages=[];
    for(const s of searches){const x=await readTarget(s);for(const u of linksFrom(x,FALLBACK_DOMAINS))if(!pages.includes(u))pages.push(u);if(pages.length>=8)break}
    for(const u of pages.slice(0,8)){const text=await readTarget(u);if(!text||!exactIsbn(text,code)||!titleLooksRight(text,title))continue;const p=extractAfterHeading(text)||extractMetaCandidate(text);if(p)return{plot:p,source:new URL(u).hostname.replace(/^www\./,''),url:u,official:false}}
    return null
  })();cache.set(key,promise);return promise
}
window.__LIB_RESOLVE_OFFICIAL_PLOT=async input=>{const r=await officialPlot(input||{});return r?.plot||''};
window.__LIB_RESOLVE_PLOT_PRIORITY=async input=>await officialPlot(input||{})||await fallbackPlot(input||{});
window.__LIB_PLOT_SOURCE_POLICY='publisher-first-then-clean-fallbacks';

function setStatus(msg,cls='ok'){const s=$('lookupStatus');if(!s)return;s.textContent=msg;s.className='lookup-status '+cls}
function currentInput(){return{code:normCode($('editCode')?.value||''),title:clean($('editTitle')?.value||''),author:clean($('editAuthor')?.value||''),publisher:clean($('editPublisher')?.value||'')}}
async function run(){
  const input=currentInput(),plot=$('editPlot');if(!plot||manualPlot||!/^97[89]\d{10}$/.test(input.code)||!input.title||!input.publisher)return;
  const key=[input.code,norm(input.title),norm(input.publisher)].join('|');if(key===lastKey)return;lastKey=key;const my=++runToken;
  let result=null;try{result=await officialPlot(input)}catch(e){}
  if(my!==runToken||manualPlot)return;
  if(result?.plot){plot.value=result.plot;setStatus(`Trama recuperata dal sito ufficiale ${result.source}.`);return}
  const existing=safePlot(plot.value||'');if(existing){if(existing!==plot.value)plot.value=existing;return}
  try{result=await fallbackPlot(input)}catch(e){}
  if(my!==runToken||manualPlot)return;
  if(result?.plot){plot.value=result.plot;setStatus(`Trama recuperata da ${result.source} dopo il controllo del sito dell'editore.`)}
}
function schedule(delay=650){clearTimeout(timer);timer=setTimeout(run,delay)}
function boot(){
  const code=$('editCode'),plot=$('editPlot'),status=$('lookupStatus');if(!code||!plot||!status){setTimeout(boot,120);return}
  code.addEventListener('input',()=>{manualPlot=false;lastKey='';runToken++;schedule(900)});
  plot.addEventListener('input',e=>{if(e.isTrusted)manualPlot=true});
  ['editTitle','editAuthor','editPublisher'].forEach(id=>$(id)?.addEventListener('input',e=>{if(e.isTrusted){lastKey='';schedule(700)}}));
  new MutationObserver(()=>{lastKey='';schedule(650)}).observe(status,{childList:true,subtree:true,characterData:true,attributes:true});
  schedule(900)
}
boot();
})();