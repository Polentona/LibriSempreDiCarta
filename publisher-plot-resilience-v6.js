(()=>{
if(window.__LIB_PUBLISHER_PLOT_RESILIENCE_V6)return;
window.__LIB_PUBLISHER_PLOT_RESILIENCE_V6=true;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const slug=v=>norm(v).replace(/\s+/g,'-');
const oldOfficial=typeof window.__LIB_RESOLVE_OFFICIAL_PLOT==='function'?window.__LIB_RESOLVE_OFFICIAL_PLOT:null;
const oldPriority=typeof window.__LIB_RESOLVE_PLOT_PRIORITY==='function'?window.__LIB_RESOLVE_PLOT_PRIORITY:null;
let manual=false,lastCode='',timer=null;
const attempts=new Map();

function reviewNoise(v){return /\b(?:recensione|recensioni|customer review|verified purchase|acquisto verificato|reviewed in|recensito in|a mio parere|secondo me|mi e piaciut|non mi e piaciut|ho letto|ho trovato|io penso|consiglio questo|consiglio il libro|stelle su 5|out of 5 stars)\b/i.test(norm(v))}
function mediaNoise(v){return /\b(?:serie tv|serie televisiv|miniserie|miniserie tv|adattamento cinematograf|adattamento televisiv|trasposizione cinematograf|trasposizione televisiv|tratto dal film|tratta dal film|netflix|prime video|disney plus|hbo|regia di|diretto da|starring|cast del film|sul grande schermo)\b/i.test(norm(v))}
function boiler(v){return /\b(?:cookie|privacy policy|aggiungi al carrello|acquista ora|spedizione|newsletter|servizio clienti|termini e condizioni|menu principale|mondadori store|amazon|ibs|feltrinelli|librerie coop)\b/i.test(norm(v))}
function plain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^\s*#{1,6}\s*/,'').replace(/[*_`>|]/g,' '))}
function sanitize(v){
  const pieces=[];
  for(const raw of String(v||'').split(/\n+/)){
    const p=plain(raw);if(!p)continue;
    if(reviewNoise(p)||mediaNoise(p)||boiler(p)){
      const good=(p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(clean).filter(x=>x&&!reviewNoise(x)&&!mediaNoise(x)&&!boiler(x));
      if(good.join(' ').length>=60)pieces.push(good.join(' '));
    }else pieces.push(p);
  }
  let x=clean(pieces.join(' ')).replace(/^(?:descrizione(?: del libro| prodotto)?|sinossi|trama|abstract|presentazione|note editore)\s*[:\-]?\s*/i,'').trim();
  if(x.length<60)return'';
  if(x.length>2600)x=x.slice(0,2600).replace(/\s+\S*$/,'')+'…';
  return x
}
async function get(url,ms=8500){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'text/plain,text/html,*/*'},cache:'no-store'});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}}
async function readFresh(target){
  const routes=[target,'https://r.jina.ai/'+target];
  if(/^https:\/\//i.test(target))routes.push('https://r.jina.ai/'+target.replace(/^https:\/\//i,'http://'));
  for(const u of routes){const text=await get(u,u===target?4500:9000);if(text.length>180)return text}
  return''
}
function stripVolume(v){return norm(v).replace(/\b(?:vol|volume)\s*\d+\b/g,' ').replace(/\s+/g,' ').trim()}
function titleCandidates(title,saga=''){
  const out=[],add=v=>{v=stripVolume(v);if(v.length>=5&&!out.includes(v))out.push(v)};
  const raw=clean(title);add(raw);
  for(const part of raw.split(/\s*(?:[.!?]|\s[-–—:]\s)\s*/))add(part);
  const sn=norm(saga);
  if(sn){for(const x of [...out])if(x.includes(sn))add(x.split(sn).join(' '))}
  return out.sort((a,b)=>b.length-a.length)
}
function sperlingTitleMatch(text,title,saga=''){
  const n=norm(text),candidates=titleCandidates(title,saga);
  return candidates.some(x=>x.length>=5&&n.includes(x))
}
function sperlingSlugs(title,saga,author){
  let ts=slug(title).replace(/-(?:vol|volume)-?\d+$/,'').replace(/-(?:vol|volume)$/,'');
  const ss=slug(saga),as=slug(author);let core=ts;
  if(ss&&core){const i=core.indexOf(ss);if(i>=0)core=(core.slice(0,i)+core.slice(i+ss.length)).replace(/--+/g,'-').replace(/^-+|-+$/g,'')}
  const out=[],add=x=>{x=String(x||'').replace(/--+/g,'-').replace(/^-+|-+$/g,'');if(x&&!out.includes(x))out.push(x)};
  if(ss&&core&&as)add(`${ss}-${core}-${as}`);
  if(core&&ss&&as)add(`${core}-${ss}-${as}`);
  if(core&&as)add(`${core}-${as}`);
  if(ts&&as)add(`${ts}-${as}`);
  return out
}
function extractSperling(text){
  const lines=String(text||'').split(/\r?\n/);
  let start=-1;
  for(let i=0;i<lines.length;i++){
    const n=norm(plain(lines[i]));
    if(n==='descrizione'||n.startsWith('descrizione ')){start=i+1;break}
  }
  if(start<0)return'';
  const candidates=[];
  for(let i=start;i<Math.min(lines.length,start+24);i++){
    const raw=String(lines[i]).trim();
    if(!raw)continue;
    if(/^!\[/.test(raw)){if(candidates.length)break;continue}
    const p=plain(raw),n=norm(p);if(!p)continue;
    if(/^biografia(?: dell autore)?\b/.test(n)&&candidates.length)break;
    if(/^(?:pagine|anno di uscita|prezzo|edizione|tascabile|ebook|isbn|ean)\b/.test(n))continue;
    if(reviewNoise(p)||mediaNoise(p)||boiler(p))continue;
    const x=sanitize(p);if(x.length<70)continue;
    const quoteLike=/^[«“"]/.test(p)||(/[»”"]/.test(p)&&/\b[A-ZÀ-Ü]{2,}(?:\s+[A-ZÀ-Ü]{2,})*\s*$/.test(p));
    candidates.push({text:x,quoteLike,length:x.length});
  }
  const prose=candidates.filter(x=>!x.quoteLike).sort((a,b)=>b.length-a.length)[0];
  if(prose?.length>=120)return prose.text;
  const any=[...candidates].sort((a,b)=>b.length-a.length)[0];
  return any?.length>=120?any.text:''
}
async function freshSperling(input={}){
  const isbn=code(input.code),title=clean(input.title),author=clean(input.author),saga=clean(input.saga),pub=norm(input.publisher);
  if(!/^97[89]\d{10}$/.test(isbn)||!title||!author||!pub.includes('sperling'))return'';
  const an=norm(author);
  for(const s of sperlingSlugs(title,saga,author)){
    const url=`https://www.sperling.it/libri/${s}`,text=await readFresh(url);if(!text)continue;
    const n=norm(text);if(!n.includes(an)||!sperlingTitleMatch(text,title,saga))continue;
    const plot=extractSperling(text);if(plot)return plot
  }
  return''
}
async function official(input={}){
  const pub=norm(input.publisher);let p='';
  if(pub.includes('sperling')){try{p=await freshSperling(input)}catch(e){}if(p)return p}
  if(oldOfficial){try{p=sanitize(await oldOfficial(input))}catch(e){}if(p)return p}
  return''
}
window.__LIB_RESOLVE_OFFICIAL_PLOT=official;
window.__LIB_RESOLVE_PLOT_PRIORITY=async input=>{
  const p=await official(input||{});if(p)return p;
  if(oldPriority){try{const r=await oldPriority(input||{});return sanitize(r?.plot||r||'')}catch(e){}}
  return''
};
window.__LIB_PLOT_SOURCE_POLICY='publisher-first-sperling-direct-v6-then-clean-fallbacks-resilient';

function current(){return{code:code($('editCode')?.value||''),title:clean($('editTitle')?.value||''),author:clean($('editAuthor')?.value||''),publisher:clean($('editPublisher')?.value||''),saga:clean($('editSaga')?.value||'')}}
async function attempt(){
  const ta=$('editPlot'),dlg=$('editDialog'),inp=current();
  if(!ta||manual||!dlg?.open||!/^97[89]\d{10}$/.test(inp.code)||!inp.title||!inp.author||!inp.publisher)return;
  const sig=[inp.code,norm(inp.title),norm(inp.author),norm(inp.publisher),norm(inp.saga)].join('|');
  const n=attempts.get(sig)||0;if(n>=10)return;attempts.set(sig,n+1);
  const p=await official(inp);if(manual)return;
  if(p){ta.value=p;attempts.set(sig,99);const st=$('lookupStatus');if(st){st.textContent='Trama recuperata dal sito ufficiale '+inp.publisher+'.';st.className='lookup-status ok'}}
}
function boot(){
  const c=$('editCode'),ta=$('editPlot');if(!c||!ta){setTimeout(boot,150);return}
  c.addEventListener('input',e=>{if(e.isTrusted){manual=false;attempts.clear();lastCode=code(c.value)}});
  ta.addEventListener('input',e=>{if(e.isTrusted)manual=true});
  timer=setInterval(()=>{const now=code(c.value);if(now!==lastCode){lastCode=now;manual=false;attempts.clear()}attempt()},2200);
  setTimeout(attempt,900)
}
boot();
window.__LIB_PUBLISHER_PLOT_RESILIENCE_V6_TEST__={sperlingSlugs,titleCandidates,sperlingTitleMatch,extractSperling,sanitize};
})();
