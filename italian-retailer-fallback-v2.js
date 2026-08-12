(()=>{
if(window.__LIB_ITALIAN_RETAILER_FALLBACK_V2)return;
window.__LIB_ITALIAN_RETAILER_FALLBACK_V2=true;

const STORES=['libraccio.it','ibs.it','mondadoristore.it','amazon.it','giunti.it'];
const STORE_NAMES={'libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','amazon.it':'Amazon Italia','giunti.it':'Giunti'};
let timer=null,runToken=0,lastKey='';

const $=id=>document.getElementById(id);
function normCode(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function clean(v){return String(v||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
function plain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`#|]/g,' '))}
function slug(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' e ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-')}
function domainOf(u){try{const h=new URL(u).hostname.replace(/^www\./,'');return STORES.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function storeName(u){return STORE_NAMES[domainOf(u)]||'store italiano'}
function isbn13to10(v){const n=normCode(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))}
function codeAppears(text,code){return normCode(text).includes(normCode(code))}
function explicitlyForeign(text){const p=plain(text).toLowerCase();return /testo\s+in\s+(english|inglese|francese|français|tedesco|deutsch|spagnolo|español)/i.test(p)||/lingua\s*[:|]?\s*(english|inglese|francese|tedesco|spagnolo)/i.test(p)}
function italianScore(text){
  const t=' '+plain(text).toLowerCase()+' ';
  const ita=[' il ',' lo ',' la ',' gli ',' le ',' un ',' una ',' che ',' di ',' del ',' della ',' delle ',' dei ',' e ',' è ',' per ',' con ',' nel ',' nella ',' non ',' si ',' al ',' alla ',' tra ',' quando ',' libro ',' romanzo ',' storia ',' edizione ',' descrizione ',' autore ',' editore ',' persone ',' viene ',' sono ',' dopo ',' nella '];
  const eng=[' the ',' and ',' of ',' to ',' in ',' is ',' with ',' for ',' from ',' book ',' novel ',' story ',' edition ',' description ',' author ',' publisher ',' people ',' after ',' are '];
  let a=0,b=0;for(const w of ita)if(t.includes(w))a++;for(const w of eng)if(t.includes(w))b++;return a-b
}
function looksItalian(text){const p=plain(text);return p.length>=45&&italianScore(p)>=3}
function trimPlot(v){
  let p=plain(v).replace(/^(descrizione|sinossi|trama|descrizione del libro|descrizione prodotto)\s*/i,'').trim();
  const stops=[' Dettagli',' Dettagli prodotto',' Informazioni sul prodotto',' Scheda tecnica',' Recensioni',' Acquista',' Compra',' Prezzo',' Formato',' Editore:',' ISBN:',' EAN:',' Codice EAN:',' Disponibilità',' Leggi di più',' Leggi di meno'];
  for(const x of stops){const i=p.indexOf(x);if(i>80)p=p.slice(0,i)}
  p=p.replace(/\s+/g,' ').trim();if(p.length>1800)p=p.slice(0,1800).replace(/\s+\S*$/,'')+'…';return p
}
function extractSection(text,heads){
  const lines=String(text||'').split(/\n/);
  for(let i=0;i<lines.length;i++){
    const h=plain(lines[i]).toLowerCase().replace(/:$/,'');
    if(!heads.some(x=>h===x||h.endsWith(' '+x)||h.startsWith(x+' ')))continue;
    const out=[];
    for(let j=i+1;j<lines.length&&out.join(' ').length<2100;j++){
      const raw=lines[j].trim(),p=plain(raw);if(!p)continue;
      if(/^#{1,6}\s/.test(raw)&&out.length)break;
      if(/^(dettagli|dettagli prodotto|informazioni sul prodotto|scheda tecnica|recensioni|prodotti correlati|potrebbero interessarti|informazioni e contatti)/i.test(p)&&out.length)break;
      out.push(p)
    }
    const plot=trimPlot(out.join(' '));if(looksItalian(plot))return plot
  }
  return''
}
function extractPlot(text){
  if(explicitlyForeign(text))return'';
  let p=extractSection(text,['descrizione','sinossi','trama','descrizione del libro','descrizione prodotto','descrizione dell’editore',"descrizione dell'editore"]);if(p)return p;
  const raw=plain(text);
  for(const re of [/Descrizione\s+(.{60,1900}?)(?=Dettagli|Editore|Codice EAN|EAN|ISBN|Anno edizione|Acquista|Compra|Recensioni|$)/is,/Sinossi\s+(.{60,1900}?)(?=Dettagli|Editore|EAN|ISBN|Acquista|Compra|Recensioni|$)/is,/Trama\s+(.{60,1900}?)(?=Dettagli|Editore|EAN|ISBN|Acquista|Compra|Recensioni|$)/is]){
    const m=raw.match(re);if(m){p=trimPlot(m[1]);if(looksItalian(p))return p}
  }
  return''
}
function cleanCategory(v){
  let s=plain(v).replace(/^[:\-–|\s]+/,'').replace(/\s{2,}/g,' ').trim();
  s=s.replace(/^Italiano\.\s*/i,'').replace(/^Libri\s*[-–>]\s*/i,'').trim();
  if(!s||s.length>120)return'';
  if(/gialli|thriller|mystery|detective/i.test(s))return 'Gialli e thriller';
  if(/narrativa/i.test(s))return s.includes(' - ')?s:'Narrativa';
  return s
}
function extractCategory(text){
  const raw=String(text||''),p=plain(raw);
  const patterns=[/(?:^|\n)\s*Genere\s*(?:\n|:|\|)+\s*([^\n]{2,120})/i,/(?:^|\n)\s*Categoria\s*(?:\n|:|\|)+\s*([^\n]{2,120})/i,/(?:^|\n)\s*Materia\s*(?:\n|:|\|)+\s*([^\n]{2,120})/i,/(?:^|\n)\s*Reparto\s*(?:\n|:|\|)+\s*([^\n]{2,120})/i,/Home\s*>\s*([^>\n]{2,80})\s*>/i];
  for(const re of patterns){const m=raw.match(re)||p.match(re);if(m){const c=cleanCategory(m[1]);if(c&&!/home|libri|ebook|audiolibri|catalogo/i.test(c))return c}}
  return''
}
function categoryScore(v){const s=String(v||'').toLowerCase();if(!s)return 0;if(/gialli|thriller|mystery|detective/.test(s))return 5;if(/fantascienza|fantasy|horror|rosa|romance|storico|biograf|saggistica|poesia|fumetti/.test(s))return 4;if(/narrativa/.test(s))return 2;return 3}
async function reader(url,timeout=11500){
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}
}
function candidateUrls(code,title,author){
  const t=slug(title),a=slug(author),i10=isbn13to10(code),urls=[];
  if(t&&a)urls.push(`https://www.libraccio.it/libro/${encodeURIComponent(code)}/${a}/${t}.html`);
  urls.push(`https://www.mondadoristore.it/p/${encodeURIComponent(code)}`);
  if(t&&a)urls.push(`https://www.ibs.it/${t}-libro-${a}/e/${encodeURIComponent(code)}`);
  urls.push(`https://www.giunti.it/search?q=${encodeURIComponent(code)}`);
  urls.push(i10?`https://www.amazon.it/dp/${i10}`:`https://www.amazon.it/s?k=${encodeURIComponent(code)}&i=stripbooks`);
  return urls
}
async function inspect(url,code){
  const text=await reader(url);if(!text||!codeAppears(text,code))return null;
  return {url,source:storeName(url),plot:extractPlot(text),category:extractCategory(text)}
}
function setStatus(msg,kind='ok'){const el=$('lookupStatus');if(el){el.textContent=msg;el.className=`lookup-status ${kind}`.trim()}}
async function run(force=false){
  const code=normCode($('editCode')?.value),plot=$('editPlot'),cat=$('editCategory'),title=$('editTitle')?.value.trim(),author=$('editAuthor')?.value.trim();
  if(!code||code.length<10||!plot||!cat||!title)return;
  const type=$('editCodeType')?.value||'auto';if(type==='issn')return;
  const needPlot=!plot.value.trim(),needCat=!cat.value.trim();if(!force&&!needPlot&&!needCat)return;
  const key=[code,needPlot?'p':'',needCat?'c':'',title,author].join('|');if(!force&&key===lastKey)return;lastKey=key;
  const token=++runToken;setStatus('Sto completando trama e categoria consultando Libraccio, IBS, Mondadori Store, Amazon Italia e Giunti…','busy');
  const results=(await Promise.all(candidateUrls(code,title,author).map(u=>inspect(u,code)))).filter(Boolean);if(token!==runToken)return;
  const plots=results.filter(x=>x.plot&&looksItalian(x.plot)).sort((a,b)=>b.plot.length-a.plot.length);
  const cats=results.filter(x=>x.category).sort((a,b)=>categoryScore(b.category)-categoryScore(a.category));
  const used=[];
  if((needPlot||force)&&plots[0]){plot.value=plots[0].plot;plot.dispatchEvent(new Event('input',{bubbles:true}));used.push(`trama da ${plots[0].source}`)}
  if((needCat||force)&&cats[0]){cat.value=cats[0].category;cat.dispatchEvent(new Event('input',{bubbles:true}));used.push(`categoria da ${cats[0].source}`)}
  if(used.length)setStatus(`Dati italiani completati: ${used.join(' e ')}. Controlla la bozza prima di salvare.`,'ok');
  else setStatus('Ho controllato gli store italiani disponibili, ma non ho trovato altri dati affidabili per completare i campi mancanti.','warn')
}
function schedule(force=false,delay=450){clearTimeout(timer);timer=setTimeout(()=>run(force),delay)}
function boot(){
  const code=$('editCode'),status=$('lookupStatus'),btn=$('lookupMetadataBtn');if(!code||!status||!btn){setTimeout(boot,120);return}
  const obs=new MutationObserver(()=>{const t=status.textContent.toLowerCase();if(t.includes('dati trovati')||t.includes('copertina corretta')||t.includes('controlla la bozza'))schedule(false,250)});obs.observe(status,{childList:true,subtree:true,characterData:true});
  btn.addEventListener('click',()=>{lastKey='';runToken++;schedule(false,1400)});
  code.addEventListener('input',()=>{lastKey='';runToken++});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-meta-choice]')||e.target.closest?.('.cover-choice'))schedule(false,500)});
}
boot();
})();