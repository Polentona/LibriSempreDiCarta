from pathlib import Path

ROOT = Path('.')


def replace_once(path, old, new, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: atteso 1 anchor in {path}, trovati {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'patched {label}: {path}')

# 1) Esporta il fallback ISBN robusto, cosi il coordinatore puo usarlo direttamente
#    anche quando Google Books e Open Library restituiscono zero candidati.
replace_once(
    'isbn-resilient-fallback-v1.js',
    'function toGoogle(rec,code){',
    "window.__LIB_RESILIENT_ISBN_LOOKUP=resilientLookup;\nfunction toGoogle(rec,code){",
    'export resilientLookup'
)

# 2) Migliora la pulizia dei titoli provenienti dagli snippet dei motori di ricerca.
replace_once(
    'isbn-resilient-fallback-v1.js',
    "function cleanCommercialTitle(v){let t=clean(v);t=t.replace(/\\s*\\((?:grande\\s+distrib[^)]*|ediz(?:ione)?[^)]*|vol\\.?\\s*\\d+[^)]*)\\)?\\s*$/i,'').trim();t=t.replace(/\\s+(?:grande\\s+distrib(?:uzione)?|ediz(?:ione)?\\s+economica)\\s*$/i,'').trim();return t}",
    "function cleanCommercialTitle(v){let t=clean(v);t=t.replace(/\\s*\\((?:grande\\s+distrib[^)]*|ediz(?:ione)?[^)]*|vol\\.?\\s*\\d+[^)]*)\\)?\\s*$/i,'').trim();t=t.replace(/\\s*\\((?:grande\\s+distrib|ediz(?:ione)?|vol\\.?\\s*\\d+).*$/i,'').trim();t=t.replace(/\\s+(?:grande\\s+distrib(?:uzione)?|ediz(?:ione)?\\s+economica)\\s*$/i,'').trim();t=t.replace(/\\s*[-–—|]\\s*(?:TheBanco(?:\\.it)?|Libraccio(?:\\.it)?|IBS|Amazon(?:\\.it)?|Feltrinelli|Mondadori Store|Unilibro|Hoepli).*$/i,'').trim();return t}",
    'clean search result titles'
)

# 3) Aggiunge un parser fail-closed degli snippet: accetta un risultato soltanto se
#    nello stesso blocco compaiono ISBN esatto + titolo valido + autore o editore.
replace_once(
    'isbn-resilient-fallback-v1.js',
    'async function discoverRetail(code){',
    r'''function searchSnippetRecord(text,code){
  const s=String(text||''),aa=aliases(code),matches=[];const re=/\[([^\]]{2,240})\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(s)))matches.push({title:m[1],url:decodeBing(m[2].replace(/&amp;/g,'&')),start:m.index,end:re.lastIndex});
  for(let i=0;i<matches.length;i++){
    const hit=matches[i];if(!domainOf(hit.url))continue;const end=i+1<matches.length?matches[i+1].start:Math.min(s.length,hit.start+2200),block=s.slice(hit.start,end),compact=normCode(block);
    if(!aa.some(x=>x&&compact.includes(x)))continue;
    const title=cleanCommercialTitle(htmlDecode(hit.title));if(!validTitle(title))continue;
    let author='';const am=block.match(/(?:Autore|Author|scritto\s+da|di)\s*[:\-]?\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+){0,5})/i);if(am)author=clean(am[1]);
    if(author&&!validAuthor(author))author='';
    let publisher='';const pm=block.match(/(?:Editore|Publisher|edita\s+da)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9 .&'’_-]{2,100})/i);if(pm)publisher=cleanPublisher(pm[1].split(/\s{2,}|\n/)[0]);
    const year=block.match(/\b((?:18|19|20)\d{2})\b/)?.[1]||'';
    if(!author&&!publisher)continue;
    return {title,author,publisher,year,category:'',description:'',cover:'',source:sourceName(hit.url)+' (risultato ISBN verificato)',url:hit.url,score:31};
  }
  return null
}
async function discoverRetail(code){''',
    'search snippet parser'
)

# 4) Usa gli snippet verificati sia nelle ricerche TheBanco sia in Bing/Google.
replace_once(
    'isbn-resilient-fallback-v1.js',
    "for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}",
    "for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const sn=searchSnippetRecord(t,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}",
    'TheBanco snippet fallback'
)
replace_once(
    'isbn-resilient-fallback-v1.js',
    "for(const q of [`\\\"${ean}\\\"`,`\\\"${ean}\\\" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);for(const x of linksFrom(b))add(x);if(links.length>=8)break}",
    "for(const q of [`\\\"${ean}\\\"`,`\\\"${ean}\\\" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);const sn=searchSnippetRecord(b,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}for(const x of linksFrom(b))add(x);if(links.length>=8)break}const g=await jina('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(`\\\"${ean}\\\" libro`),8500);const gsn=searchSnippetRecord(g,ean);if(gsn){const enriched=await appleSearch(gsn);if(enriched.score>=20)return enriched}for(const x of linksFrom(g))add(x);",
    'Bing and Google snippet fallback'
)

# 5) Il coordinatore ISBN usa direttamente il fallback resiliente se le API primarie
#    non hanno prodotto alcun candidato, invece di mostrare subito "nessun dato".
replace_once(
    'isbn-cover.js',
    "    if(type==='isbn'&&candidates.length){\n      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact;\n      const seriesVerified=candidates.filter(c=>c.saga&&c.author&&!/^(IVA|EAN|ISBN|EUR|SKU)$/i.test(c.author.trim()));if(seriesVerified.length)candidates=seriesVerified\n    }",
    "    if(type==='isbn'&&candidates.length){\n      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact;\n      const seriesVerified=candidates.filter(c=>c.saga&&c.author&&!/^(IVA|EAN|ISBN|EUR|SKU)$/i.test(c.author.trim()));if(seriesVerified.length)candidates=seriesVerified\n    }\n    /* UNIVERSAL_ISBN_DIRECT_FALLBACK_V1 */\n    if(type==='isbn'&&!candidates.length&&typeof window.__LIB_RESILIENT_ISBN_LOOKUP==='function'){\n      try{\n        const rec=await window.__LIB_RESILIENT_ISBN_LOOKUP(code);\n        if(rec?.title&&(rec.author||rec.publisher)){\n          candidates=[normalizeCandidateMetadata({title:rec.title||'',saga:'',author:rec.author||'',description:rec.description||'',category:rec.category||'',publisher:rec.publisher||'',publishedDate:rec.year||'',covers:rec.cover?[{url:rec.cover,source:rec.source||'Fonte ISBN verificata'}]:[],source:rec.source||'Fonte ISBN verificata',identifiers:[normalizeLoose(code)],exact:true})]\n        }\n      }catch(e){window.__LIB_RESILIENT_ISBN_DIRECT_ERROR__=String(e&&e.message||e);console.warn('Fallback ISBN resiliente diretto non disponibile',e)}\n    }",
    'direct ISBN fallback in coordinator'
)

# 6) Dopo il resolver editoriale ristretto, esegue il nuovo resolver universale.
#    Questo scopre la saga da titolo+autore, senza richiedere una whitelist.
replace_once(
    'isbn-cover.js',
    "    if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){",
    "    /* UNIVERSAL_SERIES_FALLBACK_V1 */\n    if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'&&candidate.title&&candidate.author){\n      try{\n        const universalRel=await window.__LIB_RESOLVE_UNIVERSAL_SERIES({code,title:candidate.title,author:candidate.author,publisher:candidate.publisher||'',saga:candidate.saga||'',description:candidate.description||''});\n        window.__LIB_LAST_UNIVERSAL_SERIES_RESULT__=universalRel||null;\n        if(universalRel?.saga){candidate.saga=safeBookRelation(universalRel.saga);setAutoField('editSaga',candidate.saga,true)}\n        if(universalRel?.authoritative){\n          authoritativeRelationsResolved=true;\n          candidate.prequel=safeBookRelation(universalRel.prequel||'');candidate.sequel=safeBookRelation(universalRel.sequel||'');\n          setAutoField('editPrequel',candidate.prequel,true);setAutoField('editSequel',candidate.sequel,true);\n        }\n      }catch(e){window.__LIB_LAST_UNIVERSAL_SERIES_ERROR__=String(e&&e.message||e);console.warn('Resolver universale serie non disponibile',e)}\n    }\n\n    if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){",
    'universal series fallback in applyCandidate'
)

# 7) Carica esplicitamente il motore ISBN e il resolver universale dal documento corrente.
#    Il guard interno di isbn-cover evita doppie inizializzazioni in caso di vecchie cache.
replace_once(
    'index.html',
    '<script src="series-neighbors-standalone-v5.js?v=5"></script>\n<script src="lookup-lock.js?v=1"></script>',
    '<script src="series-neighbors-standalone-v5.js?v=5"></script>\n<script src="series-universal-resolver-v1.js?v=1"></script>\n<script src="isbn-cover.js?v=20260817-1"></script>\n<script src="lookup-lock.js?v=2"></script>',
    'load universal series and ISBN coordinator'
)

print('Patch universale ISBN/serie completata.')
