(()=>{
if(window.__LIB_ITALIAN_RETAILER_FALLBACK_V2)return;
window.__LIB_ITALIAN_RETAILER_FALLBACK_V2=true;

const STORES=['libraccio.it','ibs.it','mondadoristore.it','amazon.it','giunti.it'];
const STORE_NAMES={'libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','amazon.it':'Amazon Italia','giunti.it':'Giunti'};
let timer=null,runToken=0,lastKey='';
const $=id=>document.getElementById(id);

function ensureCompletionStyle(){
  if(document.getElementById('libraryCompletionStyle'))return;
  const style=document.createElement('style');style.id='libraryCompletionStyle';
  style.textContent=`.lookup-status.completing{display:flex;align-items:center;gap:9px}.lookup-status.completion-hidden{display:none!important}.completion-book{display:inline-block;font-size:19px;line-height:1;animation:libraryBookSpin .9s linear infinite;transform-origin:center}@keyframes libraryBookSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
  document.head.appendChild(style)
}
function showCompleting(){ensureCompletionStyle();const el=$('lookupStatus');if(!el)return;el.className='lookup-status completing';el.innerHTML='<span class="completion-book" aria-hidden="true">📖</span><span>Completamento…</span>'}
function hideCompleting(){const el=$('lookupStatus');if(!el)return;el.textContent='';el.className='lookup-status completion-hidden'}

function normCode(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function clean(v){return String(v||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
function plain(v){return clean(String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`#|]/g,' '))}
function normText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function slug(v){return normText(v).replace(/\s+/g,'-')}
function domainOf(u){try{const h=new URL(u).hostname.replace(/^www\./,'');return STORES.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function storeName(u){return STORE_NAMES[domainOf(u)]||'store italiano'}
function isbn13to10(v){const n=normCode(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))}
function isbn10to13(v){const n=normCode(v);if(!/^\d{9}[\dX]$/.test(n))return'';const core='978'+n.slice(0,9);let s=0;for(let i=0;i<12;i++)s+=Number(core[i])*(i%2?3:1);return core+((10-(s%10))%10)}
function codeAliases(v){const n=normCode(v),out=[n],i13=n.length===10?isbn10to13(n):n,i10=n.length===13?isbn13to10(n):n;if(i13&&!out.includes(i13))out.push(i13);if(i10&&!out.includes(i10))out.push(i10);return out.filter(Boolean)}
function codeAppears(text,code){const t=normCode(text);return codeAliases(code).some(c=>t.includes(c))}
function explicitlyForeign(text){const p=plain(text).toLowerCase();return /testo\s+in\s+(english|inglese|francese|français|tedesco|deutsch|spagnolo|español)/i.test(p)||/lingua\s*[:|]?\s*(english|inglese|francese|tedesco|spagnolo)/i.test(p)}
function italianScore(text){const t=' '+plain(text).toLowerCase()+' ';const ita=[' il ',' lo ',' la ',' gli ',' le ',' un ',' una ',' che ',' di ',' del ',' della ',' delle ',' dei ',' e ',' è ',' per ',' con ',' nel ',' nella ',' non ',' si ',' al ',' alla ',' tra ',' quando ',' libro ',' romanzo ',' storia ',' edizione ',' descrizione ',' autore ',' editore ',' persone ',' viene ',' sono ',' dopo '];const eng=[' the ',' and ',' of ',' to ',' in ',' is ',' with ',' for ',' from ',' book ',' novel ',' story ',' edition ',' description ',' author ',' publisher ',' people ',' after ',' are '];let a=0,b=0;for(const w of ita)if(t.includes(w))a++;for(const w of eng)if(t.includes(w))b++;return a-b}
function looksItalian(text){const p=plain(text);return p.length>=45&&italianScore(p)>=3}
function looksLikeBoilerplate(text){const p=plain(text).toLowerCase();const bad=['tutti i libri','schede bibliografiche','navigazione della pagina','vai al contenuto','menu principale','accedi o registrati','carrello','servizio clienti','cookie','privacy policy','termini e condizioni','recensioni e schede','libri autori recensioni','catalogo libraccio','negozi libraccio','aggiungi al carrello','altre offerte vendute','attualmente non disponibile'];return bad.some(x=>p.includes(x))}
function looksLikePlot(text){const p=plain(text);if(!looksItalian(p)||looksLikeBoilerplate(p))return false;const words=p.split(/\s+/).filter(Boolean);if(words.length<10)return false;const sentenceMarks=(p.match(/[.!?]/g)||[]).length;return sentenceMarks>=1||words.length>=28}
function trimPlot(v){let p=plain(v).replace(/^(descrizione|sinossi|trama|descrizione del libro|descrizione prodotto)\s*/i,'').trim();const stops=[' Dettagli',' Dettagli prodotto',' Informazioni sul prodotto',' Scheda tecnica',' Recensioni',' Acquista',' Compra',' Prezzo',' Formato',' Editore:',' ISBN:',' EAN:',' Codice EAN:',' Disponibilità',' Leggi di più',' Leggi di meno',' Informazioni e Contatti'];for(const x of stops){const i=p.indexOf(x);if(i>80)p=p.slice(0,i)}p=p.replace(/\s+/g,' ').trim();if(p.length>1800)p=p.slice(0,1800).replace(/\s+\S*$/,'')+'…';return p}
function extractSection(text,heads){const lines=String(text||'').split(/\n/);for(let i=0;i<lines.length;i++){const h=plain(lines[i]).toLowerCase().replace(/:$/,'');if(!heads.some(x=>h===x||h.endsWith(' '+x)||h.startsWith(x+' ')))continue;const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2100;j++){const raw=lines[j].trim(),p=plain(raw);if(!p)continue;if(/^#{1,6}\s/.test(raw)&&out.length)break;if(/^(dettagli|dettagli prodotto|informazioni sul prodotto|scheda tecnica|recensioni|prodotti correlati|potrebbero interessarti|informazioni e contatti)/i.test(p)&&out.length)break;out.push(p)}const plot=trimPlot(out.join(' '));if(looksLikePlot(plot))return plot}return''}
function extractPlot(text){if(explicitlyForeign(text))return'';let p=extractSection(text,['descrizione','sinossi','trama','descrizione del libro','descrizione prodotto','descrizione dell’editore',"descrizione dell'editore"]);if(p)return p;const raw=plain(text);for(const re of [/Descrizione\s+(.{60,1900}?)(?=Dettagli|Editore|Codice EAN|EAN|ISBN|Anno edizione|Acquista|Compra|Recensioni|Informazioni e Contatti|$)/is,/Sinossi\s+(.{60,1900}?)(?=Dettagli|Editore|EAN|ISBN|Acquista|Compra|Recensioni|$)/is,/Trama\s+(.{60,1900}?)(?=Dettagli|Editore|EAN|ISBN|Acquista|Compra|Recensioni|$)/is]){const m=raw.match(re);if(m){p=trimPlot(m[1]);if(looksLikePlot(p))return p}}return''}

function cleanCategory(v){
  let s=plain(v).replace(/^[:\-–|\s]+/,'').replace(/\s{2,}/g,' ').trim();
  if(!s||s.length>150)return'';
  const n=normText(s);
  if(/juvenile|young adult|children|children s|ragazzi|bambini/.test(n)){
    if(/history|military|war|guerra|storia/.test(n))return 'Storia per ragazzi';
    if(/mystery|detective|thriller|crime|gialli/.test(n))return 'Gialli per ragazzi';
    if(/fiction|narrativa/.test(n))return 'Narrativa per ragazzi';
    return 'Libri per ragazzi';
  }
  if(/mystery|detective|gialli|thriller|crime|suspense/.test(n))return 'Gialli e thriller';
  if(/science fiction|fantascienza/.test(n))return 'Fantascienza';
  if(/fantasy/.test(n))return 'Fantasy';
  if(/horror/.test(n))return 'Horror';
  if(/biograph/.test(n))return 'Biografie';
  if(/history|military|war|guerra|storia/.test(n))return 'Storia';
  if(/poetry|poesia/.test(n))return 'Poesia';
  if(/fiction|narrativa/.test(n))return 'Narrativa';
  if(/^libri per ragazzi$/i.test(s))return 'Libri per ragazzi';
  return s.replace(/^Italiano\.\s*/i,'').trim()
}
function isUsefulCategory(v){const n=normText(v);return !!n&&!['home','libri','ebook','audiolibri','catalogo','italiano'].includes(n)}
function extractBreadcrumbCategory(text){
  const p=plain(text);
  const patterns=[/Home\s*>\s*([^>\n]{2,120})\s*>/i,/Home\s*›\s*([^›\n]{2,120})\s*›/i,/Home\s*\/\s*([^\/\n]{2,120})\s*\//i];
  for(const re of patterns){const m=p.match(re);if(m){const c=cleanCategory(m[1]);if(isUsefulCategory(c))return c}}
  return''
}
function extractCategory(text){
  const raw=String(text||''),p=plain(raw);
  const breadcrumb=extractBreadcrumbCategory(raw);if(breadcrumb)return breadcrumb;
  const patterns=[/(?:^|\n)\s*Genere\s*(?:\n|:|\|)+\s*([^\n]{2,140})/i,/(?:^|\n)\s*Categoria\s*(?:\n|:|\|)+\s*([^\n]{2,140})/i,/(?:^|\n)\s*Materia\s*(?:\n|:|\|)+\s*([^\n]{2,140})/i,/(?:^|\n)\s*Reparto\s*(?:\n|:|\|)+\s*([^\n]{2,140})/i,/Subjects?\s*(?:\n|:|\|)+\s*([^\n]{2,140})/i];
  for(const re of patterns){const m=raw.match(re)||p.match(re);if(m){const c=cleanCategory(m[1]);if(isUsefulCategory(c))return c}}
  return''
}
function categoryScore(v){const s=normText(v);if(!s)return 0;if(/storia per ragazzi|gialli per ragazzi|narrativa per ragazzi/.test(s))return 9;if(/libri per ragazzi/.test(s))return 8;if(/gialli|thriller|fantascienza|fantasy|horror|biograf|storia|poesia/.test(s))return 7;if(/narrativa/.test(s))return 5;return 4}

async function reader(url,timeout=11500){const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(t)}}
function titleVariants(title){const s=slug(title),out=[s];const noArticle=s.replace(/^(il|lo|la|i|gli|le|un|uno|una)-/,'');if(noArticle&&!out.includes(noArticle))out.push(noArticle);return out.filter(Boolean)}
function candidateUrls(code,title,author){const aliases=codeAliases(code),ean=aliases.find(x=>/^97[89]\d{10}$/.test(x))||normCode(code),i10=aliases.find(x=>/^\d{9}[\dX]$/.test(x))||isbn13to10(ean),a=slug(author),urls=[];for(const t of titleVariants(title)){if(t&&a)urls.push(`https://www.libraccio.it/libro/${encodeURIComponent(ean)}/${a}/${t}.html`);if(t&&a)urls.push(`https://www.ibs.it/${t}-libro-${a}/e/${encodeURIComponent(ean)}`)}urls.push(`https://www.libraccio.it/libro/${encodeURIComponent(ean)}/`);urls.push(`https://www.mondadoristore.it/p/${encodeURIComponent(ean)}`);urls.push(`https://www.giunti.it/search?q=${encodeURIComponent(ean)}`);urls.push(i10?`https://www.amazon.it/dp/${i10}`:`https://www.amazon.it/s?k=${encodeURIComponent(ean)}&i=stripbooks`);return [...new Set(urls)]}
function extractLinks(markdown){const links=[];const re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(markdown))){const u=m[1].replace(/&amp;/g,'&');if(domainOf(u)&&!links.includes(u))links.push(u)}return links}
async function discoverUrls(code,title,author){const aliases=codeAliases(code),ean=aliases.find(x=>/^97[89]\d{10}$/.test(x))||normCode(code);const q=`\"${ean}\" \"${title}\" ${author||''} (site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:amazon.it OR site:giunti.it)`;const text=await reader('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(q),12000);return text?extractLinks(text).slice(0,8):[]}
async function inspect(url,code,title){const text=await reader(url);if(!text||!codeAppears(text,code))return null;if(title&&normText(title).length>4&&!normText(text).includes(normText(title)))return null;return {url,source:storeName(url),plot:extractPlot(text),category:extractCategory(text)}}
function titleMatch(a,b){const x=normText(a),y=normText(b);if(!x||!y)return 0;if(x===y)return 6;if(x.includes(y)||y.includes(x))return 5;const xs=new Set(x.split(' ')),ys=y.split(' '),common=ys.filter(w=>w.length>2&&xs.has(w)).length;return common/Math.max(1,ys.filter(w=>w.length>2).length)}
async function googleExact(code){
  const aliases=codeAliases(code),out=[];
  for(const c of aliases){
    try{
      const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('isbn:'+c)}&maxResults=10&projection=full&printType=books`);if(!r.ok)continue;const data=await r.json();
      for(const item of data.items||[]){const v=item.volumeInfo||{};const ids=v.industryIdentifiers||[];const exact=ids.some(x=>aliases.includes(normCode(x.identifier)));if(!exact)continue;const cats=(v.categories||[]).map(cleanCategory).filter(isUsefulCategory).sort((a,b)=>categoryScore(b)-categoryScore(a));const plot=looksLikePlot(v.description||'')?trimPlot(v.description):'';if(cats[0]||plot)out.push({plot,category:cats[0]||'',source:'Google Books · ISBN esatto',score:20+categoryScore(cats[0])+(plot?2:0)})}
    }catch(e){}
  }
  return out.sort((a,b)=>b.score-a.score)[0]||null
}
async function googleItalianWork(title,author){if(!title)return null;const q=`intitle:${JSON.stringify(title)}${author?` inauthor:${JSON.stringify(author)}`:''}`;try{const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&projection=full&printType=books&langRestrict=it`);if(!r.ok)return null;const data=await r.json(),out=[];for(const item of data.items||[]){const v=item.volumeInfo||{};if(String(v.language||'').toLowerCase()!=='it')continue;const tm=titleMatch(v.title,title);if(tm<.55)continue;const a=(v.authors||[]).join(', ');if(author&&a&&titleMatch(a,author)<.4)continue;const plot=looksLikePlot(v.description||'')?trimPlot(v.description):'';const cats=(v.categories||[]).map(cleanCategory).filter(isUsefulCategory).sort((x,y)=>categoryScore(y)-categoryScore(x));const category=cats[0]||'';if(plot||category)out.push({plot,category,source:'Google Books · edizione italiana correlata',score:tm+(plot?2:0)+categoryScore(category)})}return out.sort((a,b)=>b.score-a.score)[0]||null}catch(e){return null}}

async function run(force=false){
  const code=normCode($('editCode')?.value),plot=$('editPlot'),cat=$('editCategory'),title=$('editTitle')?.value.trim(),author=$('editAuthor')?.value.trim();
  if(!code||code.length<10||!plot||!cat||!title)return;
  const type=$('editCodeType')?.value||'auto';if(type==='issn')return;
  const needPlot=!plot.value.trim()||!looksLikePlot(plot.value),needCat=!cat.value.trim();if(!force&&!needPlot&&!needCat)return;
  const key=[code,needPlot?'p':'',needCat?'c':'',title,author].join('|');if(!force&&key===lastKey)return;lastKey=key;
  const token=++runToken;showCompleting();
  try{
    const [storeInitial,exactGoogle,relatedGoogle]=await Promise.all([Promise.all(candidateUrls(code,title,author).map(u=>inspect(u,code,title))),googleExact(code),googleItalianWork(title,author)]);if(token!==runToken)return;
    let results=storeInitial.filter(Boolean);
    let hasPlot=results.some(x=>x.plot&&looksLikePlot(x.plot)),hasCat=results.some(x=>x.category);
    if((needPlot&&!hasPlot)||(needCat&&!hasCat)){
      const discovered=await discoverUrls(code,title,author);if(token!==runToken)return;
      const known=new Set(candidateUrls(code,title,author)),extra=discovered.filter(u=>!known.has(u));
      if(extra.length){const more=(await Promise.all(extra.map(u=>inspect(u,code,title)))).filter(Boolean);results=results.concat(more)}
    }
    const plots=results.filter(x=>x.plot&&looksLikePlot(x.plot));if(exactGoogle?.plot)plots.push(exactGoogle);if(relatedGoogle?.plot)plots.push(relatedGoogle);plots.sort((a,b)=>(b.score||0)-(a.score||0)||b.plot.length-a.plot.length);
    const cats=results.filter(x=>x.category);if(exactGoogle?.category)cats.push(exactGoogle);if(relatedGoogle?.category)cats.push(relatedGoogle);cats.sort((a,b)=>categoryScore(b.category)-categoryScore(a.category)||(b.score||0)-(a.score||0));
    if(needPlot&&plots[0]){plot.value=plots[0].plot;plot.dispatchEvent(new Event('input',{bubbles:true}))}
    if(needCat&&cats[0]){cat.value=cats[0].category;cat.dispatchEvent(new Event('input',{bubbles:true}))}
  }finally{if(token===runToken)hideCompleting()}
}
function schedule(force=false,delay=450){clearTimeout(timer);timer=setTimeout(()=>run(force),delay)}
function boot(){
  ensureCompletionStyle();const code=$('editCode'),status=$('lookupStatus'),btn=$('lookupMetadataBtn');if(!code||!status||!btn){setTimeout(boot,120);return}
  const obs=new MutationObserver(()=>{const t=status.textContent.toLowerCase();if(t.includes('dati trovati')||t.includes('copertina corretta')||t.includes('controlla la bozza'))schedule(false,250)});obs.observe(status,{childList:true,subtree:true,characterData:true});
  btn.addEventListener('click',()=>{lastKey='';runToken++;schedule(false,1400)});
  code.addEventListener('input',()=>{lastKey='';runToken++});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-meta-choice]')||e.target.closest?.('.cover-choice'))schedule(false,500)});
}
boot();
})();