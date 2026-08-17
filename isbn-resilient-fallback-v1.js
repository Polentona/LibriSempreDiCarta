(()=>{
if(window.__LIB_ISBN_RESILIENT_V1)return;
window.__LIB_ISBN_RESILIENT_V1=true;

const nativeFetch=window.fetch.bind(window);
const cache=new Map();
const TRUSTED=[
  'thebanco.it','ibs.it','libraccio.it','mondadoristore.it','giunti.it','hoepli.it',
  'unilibro.it','libreriauniversitaria.it','eurolibro.it','abebooks.com','abebooks.it',
  'bompiani.it','tealibri.it','feltrinellieditore.it','lafeltrinelli.it','einaudi.it','rizzolilibri.it',
  'adelphi.it','sellerio.it','newtoncompton.com','salani.it','longanesi.it','garzanti.it',
  'corbaccio.it','nord.it','piemme.it','sperling.it','fazi.it','harpercollins.it'
];
const SOURCE_NAMES={
  'thebanco.it':'TheBanco','ibs.it':'IBS','libraccio.it':'Libraccio','mondadoristore.it':'Mondadori Store',
  'giunti.it':'Giunti','hoepli.it':'Hoepli','unilibro.it':'Unilibro','libreriauniversitaria.it':'Libreria Universitaria',
  'eurolibro.it':'EuroLibro','abebooks.com':'AbeBooks','abebooks.it':'AbeBooks','bompiani.it':'Bompiani',
  'tealibri.it':'TEA','feltrinellieditore.it':'Feltrinelli','lafeltrinelli.it':'Feltrinelli','einaudi.it':'Einaudi','rizzolilibri.it':'Rizzoli'
};

function normCode(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function isbn13to10(v){const n=normCode(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))}
function isbn10to13(v){const n=normCode(v);if(!/^\d{9}[\dX]$/.test(n))return'';const core='978'+n.slice(0,9);let s=0;for(let i=0;i<12;i++)s+=Number(core[i])*(i%2?3:1);return core+((10-(s%10))%10)}
function aliases(v){const n=normCode(v),out=[n];const a=n.length===10?isbn10to13(n):n,b=n.length===13?isbn13to10(n):n;if(a&&!out.includes(a))out.push(a);if(b&&!out.includes(b))out.push(b);return out.filter(Boolean)}
function clean(v){return String(v||'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function normText(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function htmlDecode(v){const el=document.createElement('textarea');el.innerHTML=String(v||'');return clean(el.value)}
function domainOf(u){try{const h=new URL(u).hostname.toLowerCase().replace(/^www\./,'');return TRUSTED.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function sourceName(u){return SOURCE_NAMES[domainOf(u)]||domainOf(u)||'Catalogo'}
function titleWords(v){return normText(v).split(' ').filter(w=>w.length>2&&!['the','del','della','delle','dei','degli','una','uno','con','per'].includes(w))}
function titleSimilarity(a,b){const x=titleWords(a),y=titleWords(b);if(!x.length||!y.length)return 0;const xs=new Set(x),ys=new Set(y);const common=[...xs].filter(w=>ys.has(w)).length;return common/Math.max(xs.size,ys.size)}
function validTitle(v){const t=clean(v),n=normText(t);if(!t||t.length<2||t.length>220)return false;if(/https?:|www\.|\[\]\(|^\W+$|^!\[|^image\b|^img\b/i.test(t))return false;if(/^(?:i tuoi ordini in negozio|i miei ordini|ordini in negozio|dettagli prodotto|product details|product information|book details)$/i.test(n))return false;if(/^(?:libraccio(?: it)?|ibs|amazon(?: it)?|mondadori(?: store)?|giunti|hoepli|unilibro|eurolibro|thebanco(?: it)?|abebooks|home|catalogo|libri|ricerca|search|just a moment|access denied|product details|product information|book details|details|dettagli prodotto|informazioni prodotto|dettagli del prodotto|scheda prodotto)$/i.test(n))return false;if(/^(?:(?:\d+[,.]?)?\s*(?:recensioni?|reviews?|ratings?|valutazioni?)|libri universitari|libri scolastici|shopping cart|pronto alla spedizione|esaurito|disponibile|venditori?|condizione|prezzo)$/i.test(n))return false;if(/(?:cookie|carrello|privacy|accedi|registrati|servizio clienti|security verification)/i.test(n))return false;return true}
function validAuthor(v){const a=clean(v),n=normText(a);if(!a||a.length<2||a.length>140||/\d|https?:|www\.|€|@/.test(a))return false;if(/(?:editore|publisher|isbn|ean|prezzo|sconto|traduttore|categoria|genere|libraccio|amazon|thebanco|bompiani varia)/i.test(n))return false;return /^[A-Za-zÀ-ÿ'’.\- ]+$/.test(a)}
function cleanCommercialTitle(v){let t=clean(v);t=t.replace(/\s*\((?:grande\s+distrib[^)]*|ediz(?:ione)?[^)]*|vol\.?\s*\d+[^)]*)\)?\s*$/i,'').trim();t=t.replace(/\s*\((?:grande\s+distrib|ediz(?:ione)?|vol\.?\s*\d+).*$/i,'').trim();t=t.replace(/\s+(?:grande\s+distrib(?:uzione)?|ediz(?:ione)?\s+economica)\s*$/i,'').trim();t=t.replace(/\s*[-–—|]\s*(?:TheBanco(?:\.it)?|Libraccio(?:\.it)?|IBS|Amazon(?:\.it)?|Feltrinelli|Mondadori Store|Unilibro|Hoepli).*$/i,'').trim();return t}
function cleanPublisher(v){let p=clean(v).replace(/^(?:editore|publisher|casa editrice)\s*:?\s*/i,'').trim();if(/^[A-ZÀ-Ý0-9 .&'’-]{3,}$/.test(p))p=p.toLowerCase().replace(/(^|\s|[-'’])([a-zà-ÿ])/g,(m,a,b)=>a+b.toUpperCase());p=p.replace(/\s+(?:Varia|Editore|Edizioni)$/i,m=>/editore|edizioni/i.test(m)?'':m).trim();return p}
function safeCategory(v){const x=clean(v);if(!x||x.length>120||/https?:|\[\]\(|cookie|carrello/i.test(x))return'';const n=normText(x);if(/mystery|thriller|crime|gialli/.test(n))return 'Gialli e thriller';if(/horror/.test(n))return 'Horror';if(/fantasy/.test(n))return 'Fantasy';if(/science fiction|fantascienza/.test(n))return 'Fantascienza';if(/juvenile|young adult|ragazzi/.test(n))return 'Libri per ragazzi';if(/fiction|narrativa|letteratura/.test(n))return 'Narrativa';return x}
function cleanPlot(v){
  let p=htmlDecode(String(v||'').replace(/<br\s*\/?\s*>/gi,' ')).replace(/\s+/g,' ').trim();if(!p)return'';
  const markers=[/\b(?:customer reviews?|recensioni degli utenti|recensioni dei clienti|verified purchase|acquisto verificato|reviewed in|recensito in|helpful|sending feedback|thank you for your feedback|translate review|see original|double tap to read)\b/i,/\b(?:read more|read less|leggi di piu|leggi di meno)\b/i,/\b(?:[1-5](?:[.,]\d+)?\s*(?:out of 5 )?stars?|[1-5](?:[.,]\d+)?\s*su\s*5\s*stelle)\b/i];let cut=-1;for(const re of markers){const m=re.exec(p);if(m&&(cut<0||m.index<cut))cut=m.index}if(cut>=0){const before=p.slice(0,cut).trim();if(before.length>=90&&!/\b(?:a mio parere|secondo me|mi e piaciut|ho letto|ho trovato|consiglio|appassionante|deludente)\b/i.test(normText(before)))p=before;else return''}
  const n=normText(p);let score=0;for(const re of [/\ba mio parere\b/,/\bsecondo me\b/,/\bmi e piaciut/,/\bho letto\b/,/\bho trovato\b/,/\bconsiglio\b/,/\bappassionante\b/,/\bdeludente\b/,/\brecensione\b/])if(re.test(n))score++;if(score>=2)return'';return p.length>=60?p:''
}
function officialPlot(body,title){
  const lines=String(body||'').split(/\n/),cleaned=lines.map(cleanLine);for(let i=0;i<lines.length;i++){const h=normText(cleaned[i]);if(!/^(?:descrizione|sinossi|trama|descrizione del libro|descrizione prodotto)$/.test(h))continue;const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j];if(!x)continue;if(/^\s*#{1,5}\s+/.test(raw)&&out.length)break;if(/^(?:caratteristiche|dettagli|informazioni|recensioni|acquista|conosci l autore|autore)$/i.test(normText(x))&&out.length)break;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}
  let start=-1;for(let i=0;i<lines.length;i++){if(/^\s*#{1,3}\s+/.test(lines[i])&&titleSimilarity(cleaned[i],title)>=.55){start=i;break}}if(start>=0){const out=[];for(let j=start+1;j<Math.min(lines.length,start+45)&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j],n=normText(x);if(!x)continue;if(/^\s*#{1,3}\s+/.test(raw)&&out.length&&/(?:caratteristiche|dettagli|autore|conosci l autore|recensioni|acquista)/i.test(n))break;if(/^(?:isbn|isbn cartaceo|isbn ebook|editore|prezzo|pagine|formato|data di uscita|condividi|scegli formato|acquista il libro)$/i.test(n))continue;if(/^\d{4}$/.test(x)||validAuthor(x))continue;if(x.length<55)continue;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}return''
}
function responseJson(data){return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8'}})}
function exactIds(v,code){const ids=(v?.industryIdentifiers||[]).map(x=>normCode(x?.identifier));const aa=aliases(code);return !ids.length||ids.some(x=>aa.includes(x))}
function validGoogleItem(item,code){const v=item?.volumeInfo||{},title=cleanCommercialTitle(v.title||''),authors=(v.authors||[]).filter(validAuthor),publisher=cleanPublisher(v.publisher||''),description=cleanPlot(v.description||'');if(!validTitle(title)||!exactIds(v,code))return false;if(!authors.length&&!publisher&&description.length<60)return false;if((v.categories||[]).some(x=>/https?:|\[\]\(/.test(String(x))))return false;return true}
function sanitizeGoogle(data,code){if(!data||!Array.isArray(data.items))return null;const items=data.items.filter(x=>validGoogleItem(x,code));if(!items.length)return null;for(const item of items){const v=item.volumeInfo||{};v.title=cleanCommercialTitle(v.title);v.authors=(v.authors||[]).filter(validAuthor);v.publisher=cleanPublisher(v.publisher||'');v.description=cleanPlot(v.description||'');v.categories=(v.categories||[]).map(safeCategory).filter(Boolean)}return {...data,items,totalItems:items.length}}

async function openLibrary(code){
  const ean=aliases(code).find(x=>/^97[89]\d{10}$/.test(x))||normCode(code);
  try{
    const u='https://openlibrary.org/search.json?isbn='+encodeURIComponent(ean)+'&fields=title,author_name,publisher,publish_year,first_publish_year,isbn,subject,cover_i,language&limit=10';
    const r=await nativeFetch(u);if(!r.ok)return null;const data=await r.json();
    for(const d of data.docs||[]){const ids=(d.isbn||[]).map(normCode);if(ids.length&&!ids.some(x=>aliases(code).includes(x)))continue;const title=cleanCommercialTitle(d.title||''),author=clean((d.author_name||[])[0]||'');if(!validTitle(title)||!validAuthor(author))continue;const years=(d.publish_year||[]).filter(y=>/^\d{4}$/.test(String(y))).map(Number);const pubs=(d.publisher||[]).map(cleanPublisher).filter(Boolean);const cats=(d.subject||[]).map(safeCategory).filter(Boolean);return {title,author,publisher:pubs[0]||'',year:years.length===1?String(years[0]):'',category:cats[0]||'',description:'',cover:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`:'',source:'Open Library',score:25}}
  }catch(e){}
  return null
}
async function jina(url,timeout=10000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await nativeFetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function decodeBing(u){try{const x=new URL(u);if(!/(^|\.)bing\.com$/i.test(x.hostname))return u;const enc=x.searchParams.get('u')||'';if(!enc.startsWith('a1'))return u;let b=enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return decodeURIComponent(escape(atob(b)))}catch(e){return u}}
function linksFrom(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){let u=m[1].replace(/&amp;/g,'&');u=decodeBing(u);if(/(?:this\.onerror|placeholder|\/assets?\/|\.(?:jpg|jpeg|png|webp|svg)(?:[?#]|$))/i.test(u))continue;if(domainOf(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
function bodyOnly(text){const s=String(text||''),i=s.indexOf('Markdown Content:');return (i>=0?s.slice(i+'Markdown Content:'.length):s).replace(/^URL Source:.*$/gmi,'')}
function cleanLine(v){return clean(String(v||'').replace(/^\s*#{1,6}\s*/,'').replace(/^\s*[>*•-]+\s*/,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`]/g,''))}
function explicitCodeInBody(body,code){const compact=normCode(body),aa=aliases(code);return aa.some(x=>compact.includes(x))}
function field(lines,names){for(const raw of lines){const line=cleanLine(raw);for(const name of names){const re=new RegExp('^'+name+'\\s*[:|]?\\s*(.+)$','i'),m=line.match(re);if(m&&clean(m[1]))return cleanLine(m[1])}}return''}
function nearbyLines(body,code){const lines=String(body||'').split(/\n/),aa=aliases(code);let idx=-1;for(let i=0;i<lines.length;i++){const n=normCode(lines[i]);if(aa.some(x=>x&&n.includes(x))){idx=i;break}}if(idx<0)return lines.slice(0,100);return lines.slice(Math.max(0,idx-30),Math.min(lines.length,idx+45))}
function titleNearCode(lines){
  for(let i=0;i<lines.length;i++){
    if(!/\b(?:ISBN|EAN)\b/i.test(lines[i]))continue;
    const start=Math.max(0,i-14);
    // Prima scelta: un vero heading di prodotto vicino al codice.
    for(let j=i-1;j>=start;j--){
      const raw=String(lines[j]||''),x=cleanLine(raw),n=normText(x);
      if(!/^\s*#{1,4}\s+/.test(raw)||!x||!validTitle(x))continue;
      if(/^(?:isbn|ean|anno|editore|publisher|autore|author|prezzo|venditori|condizione|categoria|genere|recensioni?|reviews?)\b/i.test(n))continue;
      return cleanCommercialTitle(x)
    }
    // Seconda scelta: testo bibliografico, mai elementi UI o contatori.
    for(let j=i-1;j>=start;j--){
      const x=cleanLine(lines[j]),n=normText(x);if(!x||!validTitle(x))continue;
      if(/^(?:isbn|ean|anno|editore|publisher|autore|author|prezzo|venditori|condizione|categoria|genere|recensioni?|reviews?|libri universitari|libri scolastici)\b/i.test(n))continue;
      if(/^di\s+/i.test(x)||/\b\d{4}\b/.test(x)&&/,/.test(x))continue;
      if(x===x.toUpperCase()&&x.length<45)continue;
      return cleanCommercialTitle(x)
    }
  }
  return''
}
function compactRecord(lines){for(const raw of lines){const x=cleanLine(raw),m=x.match(/^di\s+(.{2,100}?),\s*((?:18|19|20)\d{2}),\s*(.{2,100})$/i);if(m)return {author:clean(m[1]),year:m[2],publisher:cleanPublisher(m[3])}}return {}}
function inspectPage(text,url,code){
  const body=bodyOnly(text);if(!body||!explicitCodeInBody(body,code))return null;const lines=nearbyLines(body,code),compactRec=compactRecord(lines);
  const header=String(text||'').match(/^Title:\s*(.+)$/mi)?.[1]||'';
  let title=field(lines,['Titolo','Title'])||titleNearCode(lines)||cleanCommercialTitle(header);
  title=cleanCommercialTitle(title);if(!validTitle(title))return null;
  let author=field(lines,['Autore','Autori','Author','Scritto da'])||compactRec.author||'';
  author=clean(author.replace(/^di\s+/i,''));
  let publisher=cleanPublisher(field(lines,['Editore','Publisher','Casa editrice'])||compactRec.publisher||'');
  const year=(field(lines,['Anno','Anno edizione','Pubblicazione'])||compactRec.year||'').match(/\b(18|19|20)\d{2}\b/)?.[0]||'';
  let category=safeCategory(field(lines,['Genere','Categoria','Reparto','Materia']));
  if(author&&!validAuthor(author))author='';
  if(!author&&!publisher)return null;
  let description='';const joined=lines.map(cleanLine).join(' '),dm=joined.match(/(?:Descrizione|Sinossi|Trama|Abstract)\s*:?\s*(.{80,1600}?)(?=\s(?:ISBN|EAN|Editore|Anno|Autore|Prezzo|Recensioni)\b|$)/i);if(dm&&!/carrello|spedizione|venditori|disponibile|prezzo/i.test(dm[1]))description=cleanPlot(dm[1]);
  let score=12+(author?5:0)+(publisher?4:0)+(year?3:0)+(description?3:0)+(category?1:0);if(domainOf(url)==='thebanco.it')score+=2;
  return {title,author,publisher,year,category,description,cover:'',source:sourceName(url),score,url}
}
async function appleSearch(rec){
  if(!rec?.title||!rec?.author)return rec;const term=cleanCommercialTitle(rec.title)+' '+rec.author;
  const data=await new Promise(resolve=>{const cb='__libApple_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script'),timer=setTimeout(done,6500);function done(v){clearTimeout(timer);try{delete window[cb]}catch(e){};s.remove();resolve(v||null)}window[cb]=done;s.onerror=()=>done(null);s.src='https://itunes.apple.com/search?term='+encodeURIComponent(term)+'&country=IT&media=ebook&entity=ebook&limit=12&callback='+cb;document.head.appendChild(s)});
  if(!data?.results?.length)return rec;const surname=normText(rec.author).split(' ').pop();let best=null,bestScore=-1;for(const x of data.results){if(x.kind!=='ebook'||!validTitle(x.trackName)||!validAuthor(x.artistName))continue;const a=normText(x.artistName),sim=titleSimilarity(rec.title,x.trackName);let sc=sim*10;if(surname&&a.split(' ').includes(surname))sc+=5;if(sc>bestScore){best=x;bestScore=sc}}if(!best||bestScore<7)return rec;
  if(titleSimilarity(rec.title,best.trackName)>=0.45)rec.title=cleanCommercialTitle(best.trackName);
  if(rec.author.split(/\s+/).length===1||normText(best.artistName).includes(normText(rec.author)))rec.author=clean(best.artistName);
  if(!rec.description&&best.description)rec.description=cleanPlot(best.description);
  if(!rec.category&&best.genres?.length)rec.category=safeCategory(best.genres[0]);
  rec.score=(rec.score||0)+7;rec.appleValidated=true;return rec
}
const PUBLISHER_DOMAINS=[
  [/bompiani/i,'bompiani.it'],[/\btea\b/i,'tealibri.it'],[/feltrinelli/i,'feltrinellieditore.it'],[/einaudi/i,'einaudi.it'],
  [/rizzoli/i,'rizzolilibri.it'],[/adelphi/i,'adelphi.it'],[/sellerio/i,'sellerio.it'],[/newton/i,'newtoncompton.com'],
  [/salani/i,'salani.it'],[/longanesi/i,'longanesi.it'],[/garzanti/i,'garzanti.it'],[/corbaccio/i,'corbaccio.it'],
  [/piemme/i,'piemme.it'],[/sperling/i,'sperling.it'],[/fazi/i,'fazi.it'],[/harpercollins/i,'harpercollins.it'],[/mondadori/i,'mondadori.it']
];
function publisherDomain(v){for(const [re,d] of PUBLISHER_DOMAINS)if(re.test(String(v||'')))return d;return''}
function publisherDirectUrls(rec,domain){
  let title=cleanCommercialTitle(rec?.title||'').replace(/\s*[.:-]\s*(?:nuova\s+ediz(?:ione)?\.?|nuova\s+edizione|ediz(?:ione)?\.?\s*\d*)\s*$/i,'').trim();
  const slug=normText(title).replace(/\s+/g,'-');const out=[];
  if(domain==='rizzolilibri.it'&&slug)out.push(`https://www.rizzolilibri.it/libri/${slug}/`);
  return out
}
function headingAuthor(body,title){
  const lines=String(body||'').split(/\n/);let near=-1;
  for(let i=0;i<lines.length;i++){const raw=String(lines[i]||''),x=cleanLine(raw);if(/^\s*#{1,3}\s+/.test(raw)&&titleSimilarity(x,title)>=0.55){near=i;break}}
  if(near<0)return'';
  for(let i=near+1;i<Math.min(lines.length,near+9);i++){const raw=String(lines[i]||''),x=cleanLine(raw);if(!/^\s*#{2,4}\s+/.test(raw))continue;if(validAuthor(x)&&titleSimilarity(x,title)<0.35)return x}
  return''
}
async function enrichOfficial(rec){
  if(!rec?.title)return rec;const domain=publisherDomain(rec.publisher);if(!domain)return rec;
  const q=`site:${domain} \"${rec.title}\" ${rec.author?`\"${rec.author}\"`:''}`;
  const direct=publisherDirectUrls(rec,domain),b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500),urls=[...direct,...linksFrom(b).filter(u=>domainOf(u)===domain)].filter((u,i,a)=>a.indexOf(u)===i);
  for(const u of urls.slice(0,4)){
    const text=await jina(u,9000),body=bodyOnly(text);if(!body)continue;
    const n=normText(body),words=titleWords(rec.title);if(words.filter(w=>n.includes(w)).length<Math.min(2,words.length))continue;
    let a=headingAuthor(body,rec.title);if(!a){const lines=String(body).split(/\n/);a=field(lines,['Autore','Autori','Author','Scritto da'])}
    if(a&&validAuthor(a))rec.author=clean(a);
    const h=String(body).split(/\n/).map(cleanLine).find(x=>validTitle(x)&&titleSimilarity(x,rec.title)>=0.65);if(h)rec.title=cleanCommercialTitle(h);
    const op=officialPlot(body,rec.title);if(op)rec.description=op;
    rec.officialSource=u;rec.score=(rec.score||0)+8;break
  }
  return rec
}
window.__LIB_RESOLVE_OFFICIAL_PLOT=async function(input={}){
  try{
    const rec={title:cleanCommercialTitle(input.title||''),author:clean(input.author||''),publisher:cleanPublisher(input.publisher||''),description:''};
    if(!rec.title||!rec.publisher)return'';
    const out=await enrichOfficial(rec);return cleanPlot(out?.description||'')
  }catch(e){return''}
};
function searchSnippetRecord(text,code){
  const s=String(text||''),aa=aliases(code),matches=[];const re=/\[([^\]]{2,240})\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(s)))matches.push({title:m[1],url:decodeBing(m[2].replace(/&amp;/g,'&')),start:m.index,end:re.lastIndex});
  for(let i=0;i<matches.length;i++){
    const hit=matches[i];if(!domainOf(hit.url))continue;const end=i+1<matches.length?matches[i+1].start:Math.min(s.length,hit.start+2200),block=s.slice(hit.start,end),compact=normCode(block);
    if(!aa.some(x=>x&&compact.includes(x)))continue;
    const title=cleanCommercialTitle(htmlDecode(hit.title));if(!validTitle(title))continue;
    let author='';const am=block.match(/(?:Autore|Author|scritto\s+da|di)\s*[:\-]?\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+){0,5})/i);if(am)author=clean(am[1]);if(author&&!validAuthor(author))author='';
    let publisher='';const pm=block.match(/(?:Editore|Publisher|edita\s+da)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9 .&'’_-]{2,100})/i);if(pm)publisher=cleanPublisher(pm[1].split(/\s{2,}|\n/)[0]);
    const year=block.match(/\b((?:18|19|20)\d{2})\b/)?.[1]||'';if(!author&&!publisher)continue;
    return {title,author,publisher,year,category:'',description:'',cover:'',source:sourceName(hit.url)+' (risultato ISBN verificato)',url:hit.url,score:31};
  }
  return null
}
async function discoverRetail(code){
  const ean=aliases(code).find(x=>/^97[89]\d{10}$/.test(x))||normCode(code),i10=aliases(code).find(x=>/^\d{9}[\dX]$/.test(x))||isbn13to10(ean),links=[];
  const add=u=>{if(domainOf(u)&&!links.includes(u))links.push(u)};
  // TheBanco usa AizShop: la ricerca per keyword e' interrogabile senza conoscere lo slug del prodotto.
  for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}
  // Ricerca diretta nei cataloghi che espongono EAN/ISBN nella scheda prodotto.
  for(const u of [`https://www.lafeltrinelli.it/search?query=${encodeURIComponent(ean)}`,`https://www.mondadoristore.it/search?q=${encodeURIComponent(ean)}`]){
    const t=await jina(u,8500);for(const x of linksFrom(t))add(x)
  }
  const siteQ=`"${ean}" (site:thebanco.it OR site:ibs.it OR site:libraccio.it OR site:unilibro.it OR site:libreriauniversitaria.it OR site:hoepli.it OR site:abebooks.com OR site:bompiani.it OR site:lafeltrinelli.it OR site:mondadoristore.it OR site:giunti.it)`;
  for(const q of [`"${ean}"`,`"${ean}" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);for(const x of linksFrom(b))add(x);if(links.length>=8)break}const g=await jina('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(`"${ean}" libro`),8500);for(const x of linksFrom(g))add(x);
  add(`https://www.eurolibro.it/libro/isbn/${encodeURIComponent(ean)}.html`);if(i10)add(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
  const recs=(await Promise.all(links.slice(0,10).map(async u=>inspectPage(await jina(u,9500),u,ean)))).filter(Boolean).sort((a,b)=>b.score-a.score);
  if(!recs.length)return null;return await appleSearch(recs[0])
}
async function resilientLookup(code){if(cache.has(code))return cache.get(code);const p=(async()=>{const ol=await openLibrary(code);if(ol&&ol.author&&ol.publisher)return await enrichOfficial(await appleSearch(ol));const web=await discoverRetail(code);if(web)return await enrichOfficial(web);return ol?await enrichOfficial(await appleSearch(ol)):null})();cache.set(code,p);return p}
window.__LIB_RESILIENT_ISBN_LOOKUP=resilientLookup;
function toGoogle(rec,code){const ids=aliases(code).map(x=>({type:x.length===10?'ISBN_10':'ISBN_13',identifier:x})),v={title:rec.title,authors:rec.author?[rec.author]:[],publisher:rec.publisher||'',publishedDate:rec.year||'',language:'it',industryIdentifiers:ids,description:cleanPlot(rec.description||''),categories:rec.category?[rec.category]:[]};if(rec.cover)v.imageLinks={thumbnail:rec.cover,smallThumbnail:rec.cover,medium:rec.cover,large:rec.cover};return {kind:'books#volumes',totalItems:1,items:[{id:'resilient-'+normCode(code),volumeInfo:v,__resilientSource:rec.source||'fallback'}]}}

window.fetch=async function(input,init){
  let u;try{u=new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return nativeFetch(input,init)}
  if(!(u.hostname==='www.googleapis.com'&&u.pathname.includes('/books/v1/volumes')))return nativeFetch(input,init);
  const q=u.searchParams.get('q')||'',m=q.match(/^isbn:([0-9Xx-]+)/i);if(!m)return nativeFetch(input,init);const code=normCode(m[1]);
  let original=null;try{original=await nativeFetch(input,init);if(original.ok){const data=await original.clone().json();const good=sanitizeGoogle(data,code);if(good)return responseJson(good)}}catch(e){}
  try{const rec=await resilientLookup(code);if(rec&&validTitle(rec.title)&&(validAuthor(rec.author)||rec.publisher)){window.__LIB_RESILIENT_ISBN_LAST__={code,rec};return responseJson(toGoogle(rec,code))}}catch(e){window.__LIB_RESILIENT_ISBN_LAST__={code,error:String(e)}}
  return original||nativeFetch(input,init)
};
})();