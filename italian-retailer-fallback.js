(()=>{
if(window.__LIB_ITALIAN_RETAILER_FALLBACK)return;
window.__LIB_ITALIAN_RETAILER_FALLBACK=true;

const ALLOWED=['libraccio.it','ibs.it','mondadoristore.it','amazon.it','giunti.it'];
const SOURCE_NAMES={'libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','amazon.it':'Amazon Italia','giunti.it':'Giunti'};
let lastKey='',runToken=0,timer=null;

function $(id){return document.getElementById(id)}
function normCode(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function clean(s){return String(s||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
function plain(s){return clean(String(s||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#|]/g,' '))}
function domainOf(u){try{const h=new URL(u).hostname.replace(/^www\./,'');return ALLOWED.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function sourceOf(u){return SOURCE_NAMES[domainOf(u)]||domainOf(u)||'store italiano'}
function codeAppears(text,code){return normCode(text).includes(normCode(code))}
function isbn13to10(v){const n=normCode(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))}
function italianScore(text){
  const t=' '+plain(text).toLowerCase()+' ';
  const ita=[' il ',' lo ',' la ',' gli ',' le ',' un ',' una ',' che ',' di ',' del ',' della ',' delle ',' dei ',' e ',' è ',' per ',' con ',' nel ',' nella ',' non ',' si ',' al ',' alla ',' tra ',' quando ',' libro ',' romanzo ',' storia ',' edizione ',' editore ',' descrizione '];
  const eng=[' the ',' and ',' of ',' to ',' in ',' is ',' with ',' for ',' a ',' an ',' from ',' book ',' novel ',' story ',' edition ',' publisher ',' description '];
  let a=0,b=0;for(const w of ita)if(t.includes(w))a++;for(const w of eng)if(t.includes(w))b++;return a-b;
}
function looksItalian(text){const p=plain(text);return p.length>=55&&italianScore(p)>=3}
function trimPlot(s){
  let p=plain(s).replace(/^descrizione\s*/i,'').replace(/^sinossi\s*/i,'').replace(/^trama\s*/i,'').trim();
  const stops=[' Leggi di più',' Leggi di +',' Dettagli',' Dettagli prodotto',' Informazioni sul prodotto',' Scheda tecnica',' Recensioni',' Acquista',' Compra',' Prezzo',' Formato',' Editore:',' ISBN:',' Codice EAN:',' Disponibilità'];
  for(const x of stops){const i=p.indexOf(x);if(i>90)p=p.slice(0,i)}
  p=p.replace(/\s+/g,' ').trim();
  if(p.length>1600)p=p.slice(0,1600).replace(/\s+\S*$/,'')+'…';
  return p
}
function extractSection(text,headings){
  const lines=String(text||'').split(/\n/);
  for(let i=0;i<lines.length;i++){
    const h=plain(lines[i]).toLowerCase();
    if(!headings.some(x=>h===x||h.startsWith(x+' ')))continue;
    const out=[];
    for(let j=i+1;j<lines.length&&out.join(' ').length<1900;j++){
      const raw=lines[j].trim(),p=plain(raw);
      if(!p)continue;
      if(/^#{1,6}\s/.test(raw)&&out.length)break;
      if(/^(dettagli|dettagli prodotto|scheda tecnica|informazioni sul prodotto|recensioni|prodotti correlati|potrebbero interessarti)$/i.test(p)&&out.length)break;
      out.push(p)
    }
    const plot=trimPlot(out.join(' '));if(looksItalian(plot))return plot
  }
  return''
}
function extractPlot(text){
  let p=extractSection(text,['descrizione','sinossi','trama','descrizione del libro','descrizione prodotto','descrizione dell’editore','descrizione dell\'editore']);
  if(p)return p;
  const raw=plain(text);
  const patterns=[
    /Descrizione\s+(.{80,1800}?)(?=Dettagli|Editore|Codice EAN|ISBN|Anno edizione|Acquista|Compra|Recensioni|$)/is,
    /Sinossi\s+(.{80,1800}?)(?=Dettagli|Editore|ISBN|Acquista|Compra|Recensioni|$)/is,
    /Trama\s+(.{80,1800}?)(?=Dettagli|Editore|ISBN|Acquista|Compra|Recensioni|$)/is
  ];
  for(const re of patterns){const m=raw.match(re);if(m){p=trimPlot(m[1]);if(looksItalian(p))return p}}
  return''
}
function extractLinks(markdown){
  const links=[];const re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(markdown))){let u=m[1].replace(/&amp;/g,'&');const d=domainOf(u);if(d&&!links.includes(u))links.push(u)}
  const bare=/https?:\/\/[^\s)\]}>]+/g;for(const u0 of markdown.match(bare)||[]){const u=u0.replace(/[.,;]+$/,'');const d=domainOf(u);if(d&&!links.includes(u))links.push(u)}
  return links
}
async function reader(url,timeout=10500){
  const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});
    if(!r.ok)return'';return await r.text()
  }catch(e){return''}finally{clearTimeout(t)}
}
function guessedUrls(code){
  const out=[
    `https://www.libraccio.it/libro/${encodeURIComponent(code)}/`,
    `https://www.ibs.it/e/${encodeURIComponent(code)}`,
    `https://www.mondadoristore.it/p/${encodeURIComponent(code)}`,
    `https://giunti.it/search?q=${encodeURIComponent(code)}`
  ];
  const i10=isbn13to10(code);if(i10)out.push(`https://www.amazon.it/dp/${i10}`);else out.push(`https://www.amazon.it/s?k=${encodeURIComponent(code)}&i=stripbooks`);
  return out
}
async function inspectUrl(url,code){
  const text=await reader(url);if(!text||!codeAppears(text,code))return null;
  const plot=extractPlot(text);if(plot)return{plot,source:sourceOf(url),url};
  const links=extractLinks(text).filter(u=>domainOf(u)===domainOf(url));
  return{plot:'',source:sourceOf(url),url,links}
}
async function searchViaBing(code){
  const q=`\"${code}\" (site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:amazon.it OR site:giunti.it)`;
  const url='https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(q);
  const text=await reader(url,12000);if(!text)return[];
  return extractLinks(text).filter((u,i,a)=>domainOf(u)&&a.indexOf(u)===i)
}
async function findItalianPlot(code){
  const direct=guessedUrls(code);
  const first=await Promise.all(direct.map(u=>inspectUrl(u,code)));
  const plots=first.filter(x=>x?.plot);
  if(plots.length)return plots.sort((a,b)=>b.plot.length-a.plot.length)[0];
  let links=[];for(const x of first)for(const u of x?.links||[])if(!links.includes(u))links.push(u);
  if(!links.length)links=await searchViaBing(code);
  links=links.filter(u=>domainOf(u)).slice(0,6);
  if(!links.length)return null;
  const found=await Promise.all(links.map(u=>inspectUrl(u,code)));
  const valid=found.filter(x=>x?.plot);
  return valid.length?valid.sort((a,b)=>b.plot.length-a.plot.length)[0]:null
}
function setStatus(msg,kind='ok'){
  const el=$('lookupStatus');if(!el)return;el.textContent=msg;el.className=`lookup-status ${kind}`.trim()
}
async function runFallback(force=false){
  const code=normCode($('editCode')?.value);const plot=$('editPlot');if(!code||code.length<10||!plot)return;
  const type=$('editCodeType')?.value||'auto';if(type==='issn')return;
  if(plot.value.trim()&&!force)return;
  const key=code+':'+(plot.value.trim()?'filled':'empty');if(!force&&key===lastKey)return;lastKey=key;
  const token=++runToken;setStatus('Sto cercando anche una trama italiana su Amazon, Giunti, Mondadori, IBS e Libraccio…','busy');
  const result=await findItalianPlot(code);if(token!==runToken)return;
  if(result?.plot&&(!plot.value.trim()||force)){
    plot.value=result.plot;plot.dispatchEvent(new Event('input',{bubbles:true}));
    setStatus(`Trama italiana trovata su ${result.source}. Controlla la bozza prima di salvare.`,'ok');
  }else if(!plot.value.trim())setStatus('I dati bibliografici sono stati trovati, ma non ho trovato una trama italiana affidabile negli store controllati. Il campo resta vuoto per evitare testi in inglese o dati errati.','warn');
}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>runFallback(force),force?50:350)}
function boot(){
  const code=$('editCode'),status=$('lookupStatus'),btn=$('lookupMetadataBtn');
  if(!code||!status||!btn){setTimeout(boot,120);return}
  const obs=new MutationObserver(()=>{
    const txt=status.textContent.toLowerCase();
    if(txt.includes('dati trovati')||txt.includes('non ho trovato dati')||txt.includes('copertina corretta'))schedule(false)
  });
  obs.observe(status,{childList:true,subtree:true,characterData:true});
  btn.addEventListener('click',()=>{lastKey='';runToken++;setTimeout(()=>schedule(false),900)});
  code.addEventListener('input',()=>{lastKey='';runToken++});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-meta-choice]')||e.target.closest?.('.cover-choice'))setTimeout(()=>schedule(false),500)});
}
boot();
})();