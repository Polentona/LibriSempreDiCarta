(()=>{
if(window.__LIB_ITALIAN_CATALOG_FALLBACK_V3)return;
window.__LIB_ITALIAN_CATALOG_FALLBACK_V3=true;

const baseFetch=window.fetch.bind(window);
const ALLOWED=['libraccio.it','ibs.it','mondadoristore.it','amazon.it','giunti.it','bancolibri.it','libreriauniversitaria.it','unilibro.it','eurolibro.it','hoepli.it'];
const SOURCE_NAMES={'libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','amazon.it':'Amazon Italia','giunti.it':'Giunti','bancolibri.it':'Bancolibri','libreriauniversitaria.it':'Libreria Universitaria','unilibro.it':'Unilibro','eurolibro.it':'Eurolibro','hoepli.it':'Hoepli'};
const cache=new Map();

function norm(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function plain(v){return String(v||'')
  .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
  .replace(/\u00A0/g,' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/[*_`|]/g,' ')
  .replace(/\r/g,'')
  .replace(/[ \t]+/g,' ')
  .trim()
}
function cleanLine(v){return plain(v).replace(/^\s*#{1,6}\s*/,'').replace(/^\s*[>•*-]+\s*/,'').replace(/\s+/g,' ').trim()}
function normText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function isbn13to10(v){const n=norm(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))}
function isbn10to13(v){const n=norm(v);if(!/^\d{9}[\dX]$/.test(n))return'';const core='978'+n.slice(0,9);let s=0;for(let i=0;i<12;i++)s+=Number(core[i])*(i%2?3:1);return core+((10-(s%10))%10)}
function aliases(code){const n=norm(code),out=[n];const i13=n.length===10?isbn10to13(n):n,i10=n.length===13?isbn13to10(n):n;if(i13&&!out.includes(i13))out.push(i13);if(i10&&!out.includes(i10))out.push(i10);return out.filter(Boolean)}
function hostDomain(url){try{const h=new URL(url).hostname.replace(/^www\./,'');return ALLOWED.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function sourceName(url){return SOURCE_NAMES[hostDomain(url)]||'Catalogo italiano'}
function codeAppears(text,code){const n=norm(text);return aliases(code).some(x=>x&&n.includes(x))}

async function reader(url,timeout=10500){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await baseFetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
function searchLinks(text){
  const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(text||'')))){
    let u=m[1].replace(/&amp;/g,'&');
    try{const x=new URL(u);if(/google\./i.test(x.hostname)&&x.pathname==='/url'&&x.searchParams.get('q'))u=x.searchParams.get('q')}catch(e){}
    if(hostDomain(u)&&!seen.has(u)){seen.add(u);out.push(u)}
  }
  return out
}
function fieldAfter(text,labels){
  const lines=String(text||'').split(/\n/);
  for(let i=0;i<lines.length;i++){
    const line=cleanLine(lines[i]);
    for(const label of labels){
      const re=new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:]?\\s*(.*)$','i'),m=line.match(re);if(!m)continue;
      const inline=cleanLine(m[1]);if(inline&&inline!=='-')return inline;
      for(let j=i+1;j<Math.min(lines.length,i+7);j++){const next=cleanLine(lines[j]);if(!next||next==='-')continue;if(/^(Titolo|Autore|Autori|Editore|Publisher|ISBN|EAN|Anno|Data|Pagine|Formato|Collana|Genere|Categoria)\b/i.test(next))break;return next}
    }
  }
  return''
}

function cleanBookTitleCandidate(v){
  let t=cleanLine(v);if(!t)return'';
  const amazonSeo=/\s*:\s*Amazon(?:\.it)?\s*:\s*(?:Books?|Libri)\s*$/i;
  const wasAmazonSeo=amazonSeo.test(t);
  t=t.replace(amazonSeo,'').replace(/\s*[-|]\s*Amazon(?:\.it)?(?:\s*:\s*(?:Books?|Libri))?\s*$/i,'').trim();
  if(wasAmazonSeo){
    const parts=t.split(/\s+:\s+/);
    if(parts.length>1){
      const tail=parts[parts.length-1].trim();
      const creditsLike=/^[A-Za-zÀ-ÿ'’.-]+,\s*[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*(?:,\s*[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)*)*\.?$/.test(tail);
      if(creditsLike)t=parts.slice(0,-1).join(' : ').trim();
    }
  }
  return t.replace(/\s+/g,' ').trim()
}
function titleFrom(text,code){
  const labeled=fieldAfter(text,['Titolo','Title']);
  if(labeled){
    let cleaned=cleanBookTitleCandidate(labeled).replace(new RegExp('\\s*[-–—]?\\s*'+norm(code)+'\\s*$'),'').trim();
    cleaned=cleanBookTitleCandidate(cleaned);
    if(cleaned&&!isNavigationTitle(cleaned))return cleaned
  }
  const lines=String(text||'').split(/\n/);
  let best='',bestScore=-99;
  for(let i=0;i<lines.length;i++){
    const raw=lines[i];if(!/^\s*#{1,3}\s+/.test(raw))continue;
    let h=cleanBookTitleCandidate(raw);if(!h||h.length<2||h.length>190||isNavigationTitle(h))continue;
    h=cleanBookTitleCandidate(h.replace(new RegExp('\\s*[-–—|]?\\s*'+norm(code)+'\\s*$','i'),'').trim());
    if(!h||isNavigationTitle(h))continue;
    const around=plain(lines.slice(Math.max(0,i-5),i+10).join('\n'));
    let score=2;
    if(codeAppears(h,code))score+=6;
    if(codeAppears(around,code))score+=5;
    if(/\((?:Autore|Autrice|Author)\)|\b(?:Autore|Autrice|Author|Editore|Publisher|ISBN|EAN)\b/i.test(around))score+=3;
    if(/\b(?:copertina flessibile|copertina rigida|formato kindle|paperback|hardcover)\b/i.test(around))score+=2;
    if(/^.{2,90}$/.test(h))score+=1;
    if(score>bestScore){best=h;bestScore=score}
  }
  return best
}
function isNavigationTitle(v){
  const n=normText(v);if(!n)return true;
  return /^(?:skip to(?: .*)?|salta a(?: .*)?|main content|contenuto principale|keyboard shortcuts?|scorciatoie da tastiera|search|cerca|cart|carrello|navigation|navigazione|menu|home|libri|ricerca|risultati|descrizione|sinossi|trama|dettagli|informazioni|recensioni|libro di|un libro di|back to top|torna su|select your cookie preferences|cookie preferences|accessibility|accessibilita|amazon|amazon it|account e liste|resi e ordini|tutte le categorie|tutto|buy now|acquista ora|aggiungi al carrello)$/i.test(n)
}
function cleanAuthorCandidate(v){
  let a=cleanLine(v)
    .replace(/\s*\((?:Autore|Autrice|Author)\).*$/i,'')
    .replace(/^\s*(?:di|by)\s+/i,'')
    .replace(/\s*[|•]\s*.*$/,'')
    .trim();
  const comma=a.match(/^([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+),\s*([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+)?)$/);
  if(comma)a=`${comma[2]} ${comma[1]}`;
  return a
}
function validAuthor(v){
  const a=cleanAuthorCandidate(v),n=normText(a);
  if(!a||a.length>140||/\d|€|%|@|https?:|www\./i.test(a))return false;
  if(/\b(spedizione|consegna|negozio|libreria|magazzino|disponibile|carrello|cookie|assistenza|ritiro|punti vendita|iva|ean|isbn|issn|eur|euro|sku|codice|prezzo|sconto|traduttore|traduzione|collana|pagine|formato|dati|dettagli|edizione|editore|publisher|categoria|genere|reparto|home|menu|newsletter|acquista|compra|offerta|usato|nuovo|provincia|regione|comune|copertina|formato kindle|formato cartaceo)\b/i.test(n))return false;
  if(/^[A-ZÀ-Ý]{2,5}$/.test(a))return false;
  const people=a.split(/\s*(?:&|\be\b|;|\/)\s*/i).filter(Boolean);
  if(!people.length||people.length>8)return false;
  return people.every(person=>{
    const words=person.split(/\s+/).filter(Boolean);
    if(words.length<1||words.length>7)return false;
    if(words.length===1)return /^[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]{2,}$/.test(words[0]);
    return words.every(w=>/^[A-Za-zÀ-ÿ'’.-]+$/.test(w))&&words.some(w=>/^[A-ZÀ-ÖØ-Ý]/.test(w));
  })
}
function amazonAuthorsFrom(text){
  const p=plain(text),out=[],seen=new Set();
  const re=/\b([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+(?:(?:de|del|della|di|da|van|von|le|la|du|dos|das)\s+)?[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+){0,5})\s*\((?:Autore|Autrice|Author)\)/g;
  let m;while((m=re.exec(p))){const a=cleanAuthorCandidate(m[1]);if(validAuthor(a)){const k=normText(a);if(!seen.has(k)){seen.add(k);out.push(a)}}}
  return out.join(', ')
}
function authorFrom(text,title=''){
  const amazon=amazonAuthorsFrom(text);if(amazon)return amazon;
  const labeled=fieldAfter(text,['Autore','Autori','Autore/i','Scritto da','Written by']);if(validAuthor(labeled))return cleanAuthorCandidate(labeled);
  const lines=String(text||'').split(/\n/);
  for(const raw of lines){
    const line=cleanLine(raw),m=line.match(/^(?:di|by|un libro di|libro di|scritto da)\s+(.{3,140})$/i);
    if(m&&validAuthor(m[1]))return cleanAuthorCandidate(m[1]);
  }
  const p=plain(text);
  for(const re of [/\bUn libro di\s+([^\n|]{3,140})/i,/\bLibro di\s+([^\n|]{3,140})/i,/\bScritto da\s+([^\n|]{3,140})/i]){
    const m=p.match(re);if(m){const a=cleanAuthorCandidate(m[1]).replace(/\s+(edito|editore|sconto|isbn|ean|prezzo)\b.*$/i,'').trim();if(validAuthor(a))return a}
  }
  return''
}
function escapeRe(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sagaFrom(text,title){
  const direct=fieldAfter(text,['Saga','Serie','Ciclo','Trilogia','Nome serie','Nome della serie','Serie di libri','Parte della serie','Parte di una serie','Book series']);
  const cleanSaga=v=>{
    let x=cleanLine(v).replace(/^[\s:|•·–—-]+/,'').replace(/[\s|•·–—-]+$/,'').trim();
    x=x.replace(/\s+(?:Visualizza|Vedi|Scopri|Tutti i libri|All books).*$/i,'').trim();
    if(!x||x.length<2||x.length>90||/^(vertigo|narrativa|libri|romanzo|fiction|books?|serie|saga|trilogia)$/i.test(x))return'';
    return x
  };
  const d=cleanSaga(direct);if(d)return d;
  const p=plain(text),parts=String(title||'').split(/\s*(?:\.|\s[-–—]\s|:)\s*/).map(cleanLine).filter(x=>x.length>2);
  const amazonPatterns=[
    /\b(?:Parte|Fa parte)\s+(?:della|di una)\s+(?:serie|saga)\s*[:\-]?\s*([^\n]{2,90})/i,
    /\b(?:Libro|Volume)\s+\d+\s+(?:di|su)\s+\d+\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:Book|Volume)\s+\d+\s+of\s+\d+\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:Series|Trilogy|Book series)\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:Trilogia|Saga|Serie)\s+(?:di\s+)?["“”']?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*){0,4})/i
  ];
  for(const re of amazonPatterns){const m=p.match(re);const x=cleanSaga(m?.[1]||'');if(x&&!normText(title).includes(normText(x)))return x}
  const reverse=p.match(/\b([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*){0,4})\s+(?:Trilogy|Series)\b/);
  if(reverse){const x=cleanSaga(reverse[1]);if(x&&!normText(title).includes(normText(x)))return x}
  const re=/(?:la\s+)?(?:saga|serie|ciclo|trilogia)\s+["“”']?([^"“”'()\n]{2,90})["“”']?\s*\(([^)]{3,900})\)/gi;let m;
  while((m=re.exec(p))){const name=cleanSaga(m[1]),list=normText(m[2]);if(name&&parts.some(x=>list.includes(normText(x))))return name}
  for(const part of parts){const e=escapeRe(part);if(new RegExp('(?:saga|serie|ciclo|trilogia)\\s+'+e+'(?:\\b|\\s|\\.)','i').test(p))return part}
  return''
}
function splitTitleSaga(title,text){
  let t=cleanLine(title),saga=sagaFrom(text,t);if(!saga)return {title:t,saga:''};const e=escapeRe(saga);
  t=t.replace(new RegExp('^'+e+'\\s*(?:[.:-]|[-–—])\\s*','i'),'').replace(new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+e+'$','i'),'').trim();
  return {title:t||cleanLine(title),saga}
}
function yearFrom(text){const labeled=fieldAfter(text,['Anno edizione','Anno pubblicazione','Anno di pubblicazione','Data di Pubblicazione','Data pubblicazione','Pubblicazione']);const m=String(labeled||text).match(/\b(18|19|20)\d{2}\b/);return m?m[0]:''}
function cleanPublisherCandidate(v){
  return cleanLine(String(v||'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,''))
    .replace(/^(?:Editore|Publisher|Casa editrice)\s*:?\s*/i,'')
    .replace(/^[\s:;|•·–—-]+/,'')
    .replace(/[\s:;|•·–—-]+$/,'')
    .trim()
}
function publisherFrom(text){return cleanPublisherCandidate(fieldAfter(text,['Editore','Publisher','Casa editrice']))}
function categoryFrom(text,title=''){
  const direct=fieldAfter(text,['Genere','Categoria','Reparto','Materia']);if(direct&&direct.length<120)return direct;
  const p=plain(text),m=p.match(/Home\s*[>›/]\s*([^>›/\n]{2,100})\s*[>›/]/i);if(m){const c=cleanLine(m[1]);if(c&&!normText(title).includes(normText(c)))return c}
  return''
}
function descriptionFrom(text){
  const lines=String(text||'').split(/\n/),heads=['descrizione','descrizione libro','descrizione del libro','sinossi','trama'];
  for(let i=0;i<lines.length;i++){
    const h=normText(cleanLine(lines[i]));if(!heads.some(x=>h===x||h.startsWith(x+' ')))continue;
    const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2200;j++){const raw=lines[j],c=cleanLine(raw);if(!c)continue;if(/^\s*#{1,5}\s+/.test(raw)&&out.length)break;if(/^(dettagli|informazioni|recensioni|consegna|acquista|compra|prodotti correlati|scheda)/i.test(c)&&out.length)break;out.push(c)}
    let d=plain(out.join(' ')).replace(/\s+/g,' ').trim();if(d.length>80){if(d.length>1800)d=d.slice(0,1800).replace(/\s+\S*$/,'')+'…';if(!/aggiungi al carrello|cookie|privacy policy|tutti i libri/i.test(d))return d}
  }
  return''
}
function bestCover(text,title,pageUrl){
  const found=[],seen=new Set(),words=normText(title).split(' ').filter(w=>w.length>3);
  function add(url,alt=''){
    url=String(url||'').replace(/&amp;/g,'&').replace(/[)>.,;]+$/,'');if(!/^https?:\/\//i.test(url)||seen.has(url))return;seen.add(url);
    const hay=(url+' '+alt).toLowerCase();let score=0;if(/m\.media-amazon\.com\/images\/i\//i.test(url))score+=18;if(/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(url))score+=4;if(/cover|copertin|product|libro|book/i.test(hay))score+=5;for(const w of words)if(hay.includes(w))score+=2;if(/logo|icon|sprite|banner|badge|qr|visa|mastercard|paypal|placeholder|avatar|favicon|kindle|prime|header|footer|cookie/i.test(hay))score-=30;if(score>2)found.push({url,score})
  }
  let m;const md=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;while((m=md.exec(String(text||''))))add(m[2],m[1]);
  const raw=/(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?)/gi;while((m=raw.exec(String(text||''))))add(m[1]);
  found.sort((a,b)=>b.score-a.score);let u=found[0]?.url||'';if(/^https?:\/\/(?:m\.media-amazon\.com|images(?:-na)?\.ssl-images-amazon\.com)\//i.test(u))u='https://images.weserv.nl/?url='+encodeURIComponent(u);return u
}
function inspectText(text,url,code){
  if(!text||!codeAppears(text,code))return null;
  const rawTitle=titleFrom(text,code),split=splitTitleSaga(rawTitle,text),title=split.title,saga=split.saga,author=authorFrom(text,rawTitle),publisher=cleanPublisherCandidate(publisherFrom(text)),year=yearFrom(text),description=descriptionFrom(text),category=categoryFrom(text,rawTitle),cover=bestCover(text,rawTitle,url);
  if(!title)return null;
  let score=4+(author?4:0)+(publisher?2:0)+(year?1:0)+(description?4:0)+(category?2:0)+(cover?2:0)+(saga?3:0);if(['Libraccio','Libreria Universitaria','Unilibro','IBS'].includes(sourceName(url)))score+=1;if(sourceName(url)==='Amazon Italia'&&(author||publisher||saga))score+=3;
  return {title,saga,author,publisher,year,description,category,cover,source:sourceName(url),score}
}
function chooseCatalogField(records,field,validator=v=>!!cleanLine(v)){
  const groups=new Map();
  for(const r of records){
    const value=cleanLine(r?.[field]||'');if(!value||!validator(value))continue;
    const key=normText(value);if(!key)continue;
    const g=groups.get(key)||{value,count:0,score:0};g.count++;g.score+=(r.score||0);if(value.length>g.value.length)g.value=value;groups.set(key,g)
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count||b.score-a.score)[0]?.value||''
}
function mergeCatalogRecords(records){
  if(!records?.length)return null;
  const out={...records[0]};
  out.author=chooseCatalogField(records,'author',validAuthor)||out.author||'';
  out.saga=chooseCatalogField(records,'saga',v=>v.length>=2&&v.length<90)||out.saga||'';
  out.publisher=cleanPublisherCandidate(chooseCatalogField(records,'publisher',v=>v.length<120)||out.publisher||'');
  out.year=chooseCatalogField(records,'year',v=>/^\d{4}$/.test(v))||out.year||'';
  out.category=chooseCatalogField(records,'category',v=>v.length<150)||out.category||'';
  if(!out.description)out.description=records.find(r=>r.description)?.description||'';
  if(!out.cover)out.cover=records.find(r=>r.cover)?.cover||'';
  if(out.saga){const split=splitTitleSaga(out.title,`Saga: ${out.saga}`);out.title=split.title;out.saga=split.saga||out.saga}
  return out
}
/* STANDALONE_SAGA_DISCOVERY_V2 */
function searchSagaCandidates(text,title,author){
  const p=plain(text),out=[];
  const add=v=>{
    let x=cleanLine(v).replace(/^["“”'\s:;|•·–—-]+|["“”'\s:;|•·–—-]+$/g,'').trim();
    x=x.replace(/^(?:the|la|il)\s+/i,'').trim();
    if(!x||x.length<2||x.length>70)return;
    const n=normText(x);if(!n||n===normText(title)||n===normText(author)||/^(book|books|libro|libri|novel|novels|fiction|serie|series|saga|trilogy|trilogia|volume)$/i.test(n))return;
    out.push(x)
  };
  let m;
  const rev=/\b([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*){0,4})\s+(?:trilogy|series|saga|serie|ciclo|trilogia)\b/g;
  while((m=rev.exec(p)))add(m[1]);
  const fwd=/\b(?:saga|serie|ciclo|trilogia|series|trilogy)\s+(?:di|of|the)?\s*["“”']?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*){0,4})/g;
  while((m=fwd.exec(p)))add(m[1]);
  return out
}
function explicitListedSeriesFromText(text,title){
  const p=plain(text),target=normText(title),out=[];
  if(!target)return out;
  const add=(name,list)=>{
    const saga=cleanLine(name).replace(/^["“”'\s:;|•·–—-]+|["“”'\s:;|•·–—-]+$/g,'').trim();
    const listed=cleanLine(list),nl=normText(listed);
    if(!saga||saga.length<2||saga.length>70||!nl.includes(target))return;
    const items=listed.split(/\s*[,;•·|/]\s*/).map(normText).filter(Boolean);
    if(items.length<2)return;
    if(!out.some(x=>normText(x)===normText(saga)))out.push(saga)
  };
  let m;
  const italian=/(?:la\s+)?(?:trilogia|saga|serie|ciclo)\s+di\s+["“”']?([^:"“”'\n|]{2,70})["“”']?\s*:\s*([^\n]{3,320})/gi;
  while((m=italian.exec(p)))add(m[1],m[2]);
  const english=/["“”']?([^:"“”'\n|]{2,70})["“”']?\s+(?:trilogy|series)\s*:\s*([^\n]{3,320})/gi;
  while((m=english.exec(p)))add(m[1],m[2]);
  return out
}
async function googleBooksListedSeries(rec){
  if(!rec?.title||!rec?.author)return'';
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
  try{
    const q=`inauthor:${rec.author}`;
    const url=`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=it&maxResults=40`;
    const r=await baseFetch(url,{signal:ctrl.signal});if(!r.ok)return'';
    const data=await r.json();
    const target=normText(rec.title);
    for(const item of data.items||[]){
      const v=item.volumeInfo||{},blob=[v.title,v.subtitle,v.description,(v.categories||[]).join(' ')].filter(Boolean).join('\n');
      const candidates=explicitListedSeriesFromText(blob,rec.title);if(candidates.length)return candidates[0];
      const t=String(v.title||'');
      const m=t.match(/^(?:La\s+)?(?:trilogia|saga|serie|ciclo)\s+di\s+([^:]{2,70})\s*:\s*(.+)$/i);
      if(m&&normText(m[2]).includes(target))return cleanLine(m[1])
    }
  }catch(e){}finally{clearTimeout(timer)}
  return''
}
async function confirmStandaloneSaga(rec){
  if(!rec||rec.saga||!rec.title||!rec.author)return rec;
  const q=`"${rec.title}" "${rec.author}" trilogia saga serie`;
  const [g,b,gbSaga]=await Promise.all([
    reader(`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent(q)}`,11000),
    reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000),
    googleBooksListedSeries(rec)
  ]);

  if(gbSaga){rec.saga=gbSaga;rec.score=(rec.score||0)+6;return rec}

  const explicit=[...explicitListedSeriesFromText(g,rec.title),...explicitListedSeriesFromText(b,rec.title)];
  if(explicit.length){
    const groups=new Map();
    for(const value of explicit){
      const key=normText(value),x=groups.get(key)||{value,count:0};x.count++;groups.set(key,x)
    }
    const best=[...groups.values()].sort((a,b)=>b.count-a.count)[0];
    if(best){rec.saga=best.value;rec.score=(rec.score||0)+(best.count>1?6:5);return rec}
  }

  const groups=new Map();
  for(const [source,text] of [['g',g],['b',b]])for(const value of searchSagaCandidates(text,rec.title,rec.author)){
    const key=normText(value);if(!key)continue;
    const x=groups.get(key)||{value,count:0,sources:new Set()};x.count++;x.sources.add(source);groups.set(key,x)
  }
  const best=[...groups.values()].sort((a,b)=>b.sources.size-a.sources.size||b.count-a.count)[0];
  if(best&&(best.sources.size>=2||best.count>=2)){rec.saga=best.value;rec.score=(rec.score||0)+3}
  return rec
}
async function confirmCompositeSaga(rec){
  if(!rec||rec.saga)return rec;
  const original=cleanLine(rec.title),parts=original.split(/\s*(?:\.\s+|\s[-–—]\s|:\s+)\s*/).map(cleanLine).filter(x=>x.length>2);
  if(parts.length<2)return rec;
  const novel=parts[0],possible=parts.slice(1).filter(x=>x.length>=3&&x.length<=90);
  for(const candidate of possible){
    const q=`"${candidate}" "${novel}" ${rec.author||''}`;
    const [g,b]=await Promise.all([
      reader(`https://www.google.com/search?hl=it&num=10&q=${encodeURIComponent(q)}`,11000),
      reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000)
    ]);
    const hay=normText(g+' '+b),c=normText(candidate),n=normText(novel);
    const ce=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    const evidence=new RegExp(`(?:saga|serie|ciclo)(?:\\s+[a-z0-9]+){0,10}\\s+${ce}|${ce}(?:\\s+[a-z0-9]+){0,10}\\s+(?:saga|serie|ciclo)`,'i').test(hay);
    const both=hay.includes(c)&&hay.includes(n);
    if(evidence&&both){rec.saga=candidate;rec.title=novel;rec.score=(rec.score||0)+5;return rec}
  }
  return rec
}
async function findCatalog(code){
  const key=norm(code);if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const a=aliases(key),ean=a.find(x=>/^97[89]\d{10}$/.test(x))||key,i10=a.find(x=>/^\d{9}[\dX]$/.test(x))||'';
    const direct=[`https://www.eurolibro.it/libro/isbn/${encodeURIComponent(ean)}.html`,`https://www.libraccio.it/libro/${encodeURIComponent(ean)}/`];if(i10)direct.push(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
    let pages=[...direct];
    const searches=[`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent('"'+ean+'"')}`,`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent('"'+ean+'"')}`];
    const searchTexts=await Promise.all(searches.map(u=>reader(u,12000)));for(const t of searchTexts)for(const u of searchLinks(t))if(!pages.includes(u))pages.push(u);
    pages=pages.slice(0,14);
    const inspected=(await Promise.all(pages.map(async u=>inspectText(await reader(u),u,ean)))).filter(Boolean).sort((x,y)=>y.score-x.score);
    return await confirmStandaloneSaga(await confirmCompositeSaga(mergeCatalogRecords(inspected)))
  })();cache.set(key,promise);return promise
}
function makeGoogleItem(rec,code){
  const ids=aliases(code).map(id=>({type:id.length===10?'ISBN_10':'ISBN_13',identifier:id}));
  const v={title:rec.title,seriesName:rec.saga||'',authors:rec.author?[rec.author]:[],publisher:rec.publisher||'',publishedDate:rec.year||'',language:'it',industryIdentifiers:ids,description:rec.description||'',categories:rec.category?[rec.category]:[]};
  if(rec.cover)v.imageLinks={extraLarge:rec.cover,large:rec.cover,medium:rec.cover,thumbnail:rec.cover,smallThumbnail:rec.cover};
  return {id:'catalog-v3-'+norm(code),volumeInfo:v}
}
function jsonResponse(original,data){const h=new Headers(original.headers);h.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(data),{status:original.ok?original.status:200,statusText:original.ok?original.statusText:'OK',headers:h})}

window.fetch=async function(input,init){
  let u;try{u=new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return baseFetch(input,init)}
  const r=await baseFetch(input,init);
  if(!(u.hostname==='www.googleapis.com'&&u.pathname.includes('/books/v1/volumes')))return r;
  const q=u.searchParams.get('q')||'',m=q.match(/^isbn:([0-9Xx-]+)/i);if(!m)return r;
  try{
    const data=await r.clone().json(),code=norm(m[1]),rec=await findCatalog(code);if(!rec)return r;
    const verified=makeGoogleItem(rec,code),vv=verified.volumeInfo||{};
    if(!(data.items||[]).length){data.items=[verified];data.totalItems=1;return jsonResponse(r,data)}
    const first=data.items[0],v=first.volumeInfo=first.volumeInfo||{};
    if(rec.saga){v.title=rec.title||v.title;v.subtitle='';v.seriesName=rec.saga}
    else if(rec.title&&!v.title)v.title=rec.title;
    if(rec.author)v.authors=[rec.author];
    if(rec.publisher)v.publisher=cleanPublisherCandidate(rec.publisher);
    if(rec.year&&!v.publishedDate)v.publishedDate=rec.year;
    if(rec.description&&!v.description)v.description=rec.description;
    if(rec.category&&!(v.categories||[]).length)v.categories=[rec.category];
    if(rec.cover&&!Object.keys(v.imageLinks||{}).length)v.imageLinks=vv.imageLinks;
    const ids=aliases(code).map(id=>({type:id.length===10?'ISBN_10':'ISBN_13',identifier:id}));
    const current=(v.industryIdentifiers||[]).map(x=>norm(x.identifier));
    for(const id of ids)if(!current.includes(norm(id.identifier)))v.industryIdentifiers=(v.industryIdentifiers||[]).concat(id);
    first.__italianCatalogVerified=true;
    return jsonResponse(r,data)
  }catch(e){return r}
};
})();