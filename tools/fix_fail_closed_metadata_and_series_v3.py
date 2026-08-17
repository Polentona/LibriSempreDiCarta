from pathlib import Path


def one(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); n=text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: atteso 1 anchor in {path}, trovati {n}')
    p.write_text(text.replace(old,new,1),encoding='utf-8'); print('OK',label)

# 1) Mai più usare il testo di uno snippet/search result come scheda bibliografica.
#    I motori servono solo per scoprire URL; poi la pagina viene aperta e l'ISBN verificato nel corpo.
one('isbn-resilient-fallback-v1.js',
"for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const sn=searchSnippetRecord(t,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}",
"for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}",
'TheBanco no snippet metadata')

one('isbn-resilient-fallback-v1.js',
"  for(const u of [`https://www.lafeltrinelli.it/search?query=${encodeURIComponent(ean)}`,`https://www.mondadoristore.it/search?q=${encodeURIComponent(ean)}`]){\n    const t=await jina(u,8500);const sn=searchSnippetRecord(t,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}\n    for(const x of linksFrom(t))add(x)\n  }",
"  for(const u of [`https://www.lafeltrinelli.it/search?query=${encodeURIComponent(ean)}`,`https://www.mondadoristore.it/search?q=${encodeURIComponent(ean)}`]){\n    const t=await jina(u,8500);for(const x of linksFrom(t))add(x)\n  }",
'Italian retailer no snippet metadata')

one('isbn-resilient-fallback-v1.js',
"for(const q of [`\"${ean}\"`,`\"${ean}\" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);const sn=searchSnippetRecord(b,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}for(const x of linksFrom(b))add(x);if(links.length>=8)break}const g=await jina('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(`\"${ean}\" libro`),8500);const gsn=searchSnippetRecord(g,ean);if(gsn){const enriched=await appleSearch(gsn);if(enriched.score>=20)return enriched}for(const x of linksFrom(g))add(x);",
"for(const q of [`\"${ean}\"`,`\"${ean}\" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);for(const x of linksFrom(b))add(x);if(links.length>=8)break}const g=await jina('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(`\"${ean}\" libro`),8500);for(const x of linksFrom(g))add(x);",
'Search engines discovery only')

# Scarta anche link palesemente non prodotto emersi dal markdown di una pagina.
one('isbn-resilient-fallback-v1.js',
"function linksFrom(text){const out=[],seen=new Set(),re=/\\[[^\\]]*\\]\\((https?:\\/\\/[^)\\s]+)\\)/g;let m;while((m=re.exec(String(text||'')))){let u=m[1].replace(/&amp;/g,'&');u=decodeBing(u);if(domainOf(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}",
"function linksFrom(text){const out=[],seen=new Set(),re=/\\[[^\\]]*\\]\\((https?:\\/\\/[^)\\s]+)\\)/g;let m;while((m=re.exec(String(text||'')))){let u=m[1].replace(/&amp;/g,'&');u=decodeBing(u);if(/(?:this\\.onerror|placeholder|\\/assets?\\/|\\.(?:jpg|jpeg|png|webp|svg)(?:[?#]|$))/i.test(u))continue;if(domainOf(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}",
'product-like links only')

# Ulteriore fail-closed per titoli UI/markdown.
one('isbn-resilient-fallback-v1.js',
"if(/https?:|www\\.|\\[\\]\\(|^\\W+$/.test(t))return false;",
"if(/https?:|www\\.|\\[\\]\\(|^\\W+$|^!\\[|^image\\b|^img\\b/i.test(t))return false;if(/^(?:i tuoi ordini in negozio|i miei ordini|ordini in negozio|dettagli prodotto|product details|product information|book details)$/i.test(n))return false;",
'reject UI titles')

# 2) Valida il nome della saga separatamente dai titoli dei libri.
old_helpers="""function relationResolverComplete(rel){
  if(!rel?.authoritative)return false;
  const saga=safeBookRelation(rel.saga||''),pre=safeBookRelation(rel.prequel||''),seq=safeBookRelation(rel.sequel||'');
  if(!saga)return false;
  if(rel.initial&&rel.terminal)return true;
  if(rel.initial)return !!seq;
  if(rel.terminal)return !!pre;
  return !!pre&&!!seq;
}
function candidateRelationsIncomplete(candidate){
  return !safeBookRelation(candidate?.saga||'')||!safeBookRelation(candidate?.prequel||'')||!safeBookRelation(candidate?.sequel||'');
}"""
new_helpers="""function safeSeriesName(v){
  const x=safeBookRelation(v),n=normalizeText(x);if(!x||x.length>100)return'';
  if(/['’]{2}|[`{}\\[\\]|]|https?:|www\\.|[<>]/i.test(x))return'';
  if(/\\b(?:released|published|same year|publication|romanzo|novel|book|libro|volume|chapter|capitolo|preceded|followed|autore|author|publisher|editore|isbn|ean)\\b/i.test(n))return'';
  if(n.split(' ').filter(Boolean).length>12)return'';
  return x
}
function relationResolverComplete(rel){
  if(!rel?.authoritative)return false;
  const saga=safeSeriesName(rel.saga||''),pre=safeBookRelation(rel.prequel||''),seq=safeBookRelation(rel.sequel||'');
  if(!saga)return false;
  if(rel.initial&&rel.terminal)return true;
  if(rel.initial)return !!seq;
  if(rel.terminal)return !!pre;
  return !!pre&&!!seq;
}
function candidateRelationsIncomplete(candidate){
  return !safeSeriesName(candidate?.saga||'')||!safeBookRelation(candidate?.prequel||'')||!safeBookRelation(candidate?.sequel||'');
}"""
one('isbn-cover.js',old_helpers,new_helpers,'safe series names')

# Usa safeSeriesName in tutti i punti del nuovo percorso.
for old,new,label in [
("c.saga=safeBookRelation(c.saga);","c.saga=safeSeriesName(c.saga);",'normalize saga'),
("candidate.saga=safeBookRelation(localRel.saga);setAutoField('editSaga',candidate.saga,true)","candidate.saga=safeSeriesName(localRel.saga);setAutoField('editSaga',candidate.saga,true)",'local saga safe'),
("candidate.saga=safeBookRelation(boundedRel.saga||'');","candidate.saga=safeSeriesName(boundedRel.saga||'');",'bounded saga safe'),
("if(universalRel?.saga){candidate.saga=safeBookRelation(universalRel.saga);setAutoField('editSaga',candidate.saga,true)}","if(universalRel?.saga){candidate.saga=safeSeriesName(universalRel.saga);setAutoField('editSaga',candidate.saga,true)}",'universal saga safe'),
("if(structuredRel?.sagaChecked&&structuredRel.saga){candidate.saga=safeBookRelation(structuredRel.saga);setAutoField('editSaga',candidate.saga,true)}","if(structuredRel?.sagaChecked&&structuredRel.saga){const cleanSaga=safeSeriesName(structuredRel.saga);if(cleanSaga){candidate.saga=cleanSaga;setAutoField('editSaga',candidate.saga,true)}}",'structured saga safe')]:
    one('isbn-cover.js',old,new,label)

# Cache bust.
one('index.html','<script src="isbn-resilient-fallback-v1.js?v=5"></script>','<script src="isbn-resilient-fallback-v1.js?v=6"></script>','isbn cache v6')
one('index.html','<script src="isbn-cover.js?v=20260817-2"></script>','<script src="isbn-cover.js?v=20260817-3"></script>','coordinator cache v3')
print('DONE')
