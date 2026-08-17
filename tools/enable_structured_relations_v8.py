from pathlib import Path

# 1) Carica il nuovo motore strutturato (Wikipedia + campi espliciti)
#    prima dell'interfaccia ISBN, senza toccare lo sfondo base64.
p = Path('bg/bg8.js')
s = p.read_text(encoding='utf-8')
old_loader = "(()=>{if(document.querySelector('script[data-isbn-cover]'))return;const p=document.createElement('script');p.src='italian-metadata.js?v=9';p.onload=()=>{const c=document.createElement('script');c.src='italian-catalog-fallback-v3.js?v=12';c.dataset.catalogFallback='1';c.onload=()=>{const q=document.createElement('script');q.src='series-relations.js?v=6';q.dataset.seriesRelations='1';q.onload=()=>{const s=document.createElement('script');s.src='isbn-cover.js?v=18';s.dataset.isbnCover='1';s.onload=()=>{const r=document.createElement('script');r.src='italian-retailer-fallback-v2.js?v=2';r.dataset.retailerFallback='1';document.head.appendChild(r)};document.head.appendChild(s)};document.head.appendChild(q)};document.head.appendChild(c)};document.head.appendChild(p)})();"
new_loader = "(()=>{if(document.querySelector('script[data-isbn-cover]'))return;const p=document.createElement('script');p.src='italian-metadata.js?v=9';p.onload=()=>{const c=document.createElement('script');c.src='italian-catalog-fallback-v3.js?v=12';c.dataset.catalogFallback='1';c.onload=()=>{const q=document.createElement('script');q.src='series-relations.js?v=6';q.dataset.seriesRelations='1';q.onload=()=>{const w=document.createElement('script');w.src='series-structured-sources.js?v=1';w.dataset.structuredRelations='1';const loadIsbn=()=>{const s=document.createElement('script');s.src='isbn-cover.js?v=19';s.dataset.isbnCover='1';s.onload=()=>{const r=document.createElement('script');r.src='italian-retailer-fallback-v2.js?v=2';r.dataset.retailerFallback='1';document.head.appendChild(r)};document.head.appendChild(s)};w.onload=loadIsbn;w.onerror=loadIsbn;document.head.appendChild(w)};document.head.appendChild(q)};document.head.appendChild(c)};document.head.appendChild(p)})();"
if old_loader not in s:
    raise SystemExit('Loader atteso non trovato in bg/bg8.js')
s = s.replace(old_loader, new_loader, 1)
p.write_text(s, encoding='utf-8')

# 2) Passa anche la trama al motore relazioni: puo' contenere il nome della serie
#    e informazioni come "secondo della trilogia...".
p = Path('isbn-cover.js')
s = p.read_text(encoding='utf-8')
old = "window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga})"
new = "window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga,description:candidate.description||''})"
if old not in s:
    raise SystemExit('Chiamata relazioni candidato non trovata')
s = s.replace(old, new, 1)

old = "window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||''})"
new = "window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||'',description:b.plot||b.description||''})"
if old not in s:
    raise SystemExit('Chiamata relazioni libri salvati non trovata')
s = s.replace(old, new, 1)

if 'RELATIONS_LOOKUP_VERSION=7' not in s:
    raise SystemExit('Versione relazioni 7 non trovata')
s = s.replace('RELATIONS_LOOKUP_VERSION=7', 'RELATIONS_LOOKUP_VERSION=8', 1)
p.write_text(s, encoding='utf-8')
