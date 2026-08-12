from pathlib import Path
import re

p = Path('italian-catalog-fallback-v3.js')
s = p.read_text(encoding='utf-8')


def replace_between(text, start_marker, end_marker, replacement):
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]


# Amazon inserisce spesso caratteri Unicode invisibili (LTR/RTL marks) nei dettagli
# prodotto. Li eliminiamo a monte, così "Editore ‏ : ‎ Nord" diventa "Editore : Nord".
plain_block = r'''function plain(v){return String(v||'')
  .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
  .replace(/\u00A0/g,' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/[*_`|]/g,' ')
  .replace(/\r/g,'')
  .replace(/[ \t]+/g,' ')
  .trim()
}
'''
s = replace_between(s, 'function plain(v){', 'function cleanLine(v){', plain_block)


# Autori: preferiamo indicatori espliciti dei cataloghi e soprattutto il formato
# Amazon "di Nome Cognome (Autore)". Non usiamo più righe generiche vicine al titolo.
author_block = r'''function cleanAuthorCandidate(v){
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
'''
s = replace_between(s, 'function cleanAuthorCandidate(v){', 'function escapeRe(v){', author_block)


# Saga/serie: gestiamo sia i campi classici sia i formati usati da Amazon
# ("Parte della serie", "Libro 3 di 3: ...", "Ring Trilogy", ecc.).
saga_block = r'''function sagaFrom(text,title){
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
'''
s = replace_between(s, 'function sagaFrom(text,title){', 'function splitTitleSaga(title,text){', saga_block)


publisher_block = r'''function cleanPublisherCandidate(v){
  return cleanLine(String(v||'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,''))
    .replace(/^(?:Editore|Publisher|Casa editrice)\s*:?\s*/i,'')
    .replace(/^[\s:;|•·–—-]+/,'')
    .replace(/[\s:;|•·–—-]+$/,'')
    .trim()
}
function publisherFrom(text){return cleanPublisherCandidate(fieldAfter(text,['Editore','Publisher','Casa editrice']))}
'''
s = replace_between(s, 'function publisherFrom(text){', 'function categoryFrom(text,title=', publisher_block)


# Se la pagina Amazon ha fornito la copertina, la stessa pagina deve essere trattata
# anche come fonte bibliografica completa. Diamo un piccolo bonus alle pagine Amazon
# quando contengono campi espliciti, senza renderle l'unica fonte.
old = """  const rawTitle=titleFrom(text,code),split=splitTitleSaga(rawTitle,text),title=split.title,saga=split.saga,author=authorFrom(text,rawTitle),publisher=publisherFrom(text),year=yearFrom(text),description=descriptionFrom(text),category=categoryFrom(text,rawTitle),cover=bestCover(text,rawTitle,url);\n  if(!title)return null;\n  let score=4+(author?4:0)+(publisher?2:0)+(year?1:0)+(description?4:0)+(category?2:0)+(cover?2:0)+(saga?3:0);if(['Libraccio','Libreria Universitaria','Unilibro','IBS'].includes(sourceName(url)))score+=1;\n"""
new = """  const rawTitle=titleFrom(text,code),split=splitTitleSaga(rawTitle,text),title=split.title,saga=split.saga,author=authorFrom(text,rawTitle),publisher=cleanPublisherCandidate(publisherFrom(text)),year=yearFrom(text),description=descriptionFrom(text),category=categoryFrom(text,rawTitle),cover=bestCover(text,rawTitle,url);\n  if(!title)return null;\n  let score=4+(author?4:0)+(publisher?2:0)+(year?1:0)+(description?4:0)+(category?2:0)+(cover?2:0)+(saga?3:0);if(['Libraccio','Libreria Universitaria','Unilibro','IBS'].includes(sourceName(url)))score+=1;if(sourceName(url)==='Amazon Italia'&&(author||publisher||saga))score+=3;\n"""
if old not in s:
    raise SystemExit('inspectText anchor missing')
s = s.replace(old, new, 1)

# Normalizziamo sempre l'editore prima del consenso tra le fonti.
s = s.replace(
    "  out.publisher=chooseCatalogField(records,'publisher',v=>v.length<120)||out.publisher||'';",
    "  out.publisher=cleanPublisherCandidate(chooseCatalogField(records,'publisher',v=>v.length<120)||out.publisher||'');",
    1
)

# Backup generale per saghe che non sono riportate nel titolo: se nessuno store ha un
# campo serie leggibile, cerchiamo prove concordanti (Google + Bing) di una saga/serie.
if '/* STANDALONE_SAGA_DISCOVERY_V2 */' not in s:
    marker = 'async function confirmCompositeSaga(rec){'
    pos = s.index(marker)
    helper = r'''/* STANDALONE_SAGA_DISCOVERY_V2 */
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
async function confirmStandaloneSaga(rec){
  if(!rec||rec.saga||!rec.title||!rec.author)return rec;
  const q=`"${rec.title}" "${rec.author}" saga serie trilogy series`;
  const [g,b]=await Promise.all([
    reader(`https://www.google.com/search?hl=it&num=10&q=${encodeURIComponent(q)}`,11000),
    reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000)
  ]);
  const groups=new Map();
  for(const [source,text] of [['g',g],['b',b]])for(const value of searchSagaCandidates(text,rec.title,rec.author)){
    const key=normText(value),x=groups.get(key)||{value,count:0,sources:new Set()};x.count++;x.sources.add(source);groups.set(key,x)
  }
  const best=[...groups.values()].sort((a,b)=>b.sources.size-a.sources.size||b.count-a.count)[0];
  if(best&&(best.sources.size>=2||best.count>=2)){rec.saga=best.value;rec.score=(rec.score||0)+3}
  return rec
}
'''
    s = s[:pos] + helper + s[pos:]

old_return = '    return await confirmCompositeSaga(mergeCatalogRecords(inspected))\n'
new_return = '    return await confirmStandaloneSaga(await confirmCompositeSaga(mergeCatalogRecords(inspected)))\n'
if old_return not in s and new_return not in s:
    raise SystemExit('findCatalog return anchor missing')
if old_return in s:
    s = s.replace(old_return, new_return, 1)

# Se il catalogo italiano trova l'editore dell'edizione ISBN esatta, deve prevalere su
# un valore sporco/incompleto eventualmente arrivato da Google Books.
s = s.replace(
    '    if(rec.publisher&&!v.publisher)v.publisher=rec.publisher;',
    '    if(rec.publisher)v.publisher=cleanPublisherCandidate(rec.publisher);',
    1
)

p.write_text(s, encoding='utf-8')

# Cache bust: carichiamo la nuova versione del parser del catalogo su tutti i browser.
p = Path('bg/bg8.js')
s = p.read_text(encoding='utf-8')
s = re.sub(r"italian-catalog-fallback-v3\.js\?v=\d+", "italian-catalog-fallback-v3.js?v=6", s, count=1)
p.write_text(s, encoding='utf-8')
