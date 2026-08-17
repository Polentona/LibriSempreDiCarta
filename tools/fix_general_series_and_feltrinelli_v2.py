from pathlib import Path


def one(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); n=text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: atteso 1 anchor in {path}, trovati {n}')
    p.write_text(text.replace(old,new,1),encoding='utf-8'); print('OK',label)

# ---- ISBN: amplia il fallback italiano senza hardcode di titoli/ISBN ----
one('isbn-resilient-fallback-v1.js',
    "'bompiani.it','tealibri.it','feltrinellieditore.it','einaudi.it','rizzolilibri.it',",
    "'bompiani.it','tealibri.it','feltrinellieditore.it','lafeltrinelli.it','einaudi.it','rizzolilibri.it',",
    'trust lafeltrinelli')

one('isbn-resilient-fallback-v1.js',
    "'tealibri.it':'TEA','feltrinellieditore.it':'Feltrinelli','einaudi.it':'Einaudi','rizzolilibri.it':'Rizzoli'",
    "'tealibri.it':'TEA','feltrinellieditore.it':'Feltrinelli','lafeltrinelli.it':'Feltrinelli','einaudi.it':'Einaudi','rizzolilibri.it':'Rizzoli'",
    'source name lafeltrinelli')

old_site='''  const siteQ=`"${ean}" (site:thebanco.it OR site:ibs.it OR site:libraccio.it OR site:unilibro.it OR site:libreriauniversitaria.it OR site:hoepli.it OR site:abebooks.com OR site:bompiani.it)`;'''
new_site='''  // Ricerca diretta nei cataloghi che espongono EAN/ISBN nella scheda prodotto.
  for(const u of [`https://www.lafeltrinelli.it/search?query=${encodeURIComponent(ean)}`,`https://www.mondadoristore.it/search?q=${encodeURIComponent(ean)}`]){
    const t=await jina(u,8500);const sn=searchSnippetRecord(t,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}
    for(const x of linksFrom(t))add(x)
  }
  const siteQ=`"${ean}" (site:thebanco.it OR site:ibs.it OR site:libraccio.it OR site:unilibro.it OR site:libreriauniversitaria.it OR site:hoepli.it OR site:abebooks.com OR site:bompiani.it OR site:lafeltrinelli.it OR site:mondadoristore.it OR site:giunti.it)`;'''
one('isbn-resilient-fallback-v1.js',old_site,new_site,'italian retailer discovery')

# ---- Relazioni: un resolver incompleto non puo' bloccare la cascata ----
old_safe="function safeBookRelation(v){const x=cleanRelationTitle(v);return x&&!screenMediaNoise(x)&&!relationMarkupNoise(x)?x:''}"
new_safe=old_safe+'''\nfunction relationResolverComplete(rel){
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
}'''
one('isbn-cover.js',old_safe,new_safe,'relation completeness helpers')

one('isbn-cover.js',
    "        authoritativeRelationsResolved=!!localRel?.authoritative;",
    "        authoritativeRelationsResolved=relationResolverComplete(localRel);",
    'local resolver completeness')

# Il bounded resolver prima impostava resolved=true prima ancora di validare i campi.
one('isbn-cover.js',
    "        if(boundedRel?.authoritative){\n          authoritativeRelationsResolved=true;\n          candidate.saga=safeBookRelation(boundedRel.saga||'');",
    "        if(boundedRel?.authoritative){\n          candidate.saga=safeBookRelation(boundedRel.saga||'');",
    'bounded no premature success')
one('isbn-cover.js',
    "          setAutoField('editSaga',candidate.saga,true);\n          setAutoField('editPrequel',candidate.prequel,true);\n          setAutoField('editSequel',candidate.sequel,true);\n        }\n      }catch(e){\n        window.__LIB_LAST_BOUNDED_RELATIONS_ERROR__",
    "          setAutoField('editSaga',candidate.saga,true);\n          setAutoField('editPrequel',candidate.prequel,true);\n          setAutoField('editSequel',candidate.sequel,true);\n          authoritativeRelationsResolved=relationResolverComplete({...boundedRel,saga:candidate.saga,prequel:candidate.prequel,sequel:candidate.sequel});\n        }\n      }catch(e){\n        window.__LIB_LAST_BOUNDED_RELATIONS_ERROR__",
    'bounded success after validation')

old_universal_cond="    if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'&&candidate.title&&candidate.author){"
new_universal_cond="    if(type==='isbn'&&typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'&&candidate.title&&candidate.author&&(!authoritativeRelationsResolved||candidateRelationsIncomplete(candidate))){"
one('isbn-cover.js',old_universal_cond,new_universal_cond,'always continue incomplete relations')

one('isbn-cover.js',
    "        if(universalRel?.authoritative){\n          authoritativeRelationsResolved=true;\n          candidate.prequel=safeBookRelation(universalRel.prequel||'');candidate.sequel=safeBookRelation(universalRel.sequel||'');\n          setAutoField('editPrequel',candidate.prequel,true);setAutoField('editSequel',candidate.sequel,true);\n        }",
    "        if(universalRel?.authoritative){\n          candidate.prequel=safeBookRelation(universalRel.prequel||'');candidate.sequel=safeBookRelation(universalRel.sequel||'');\n          setAutoField('editPrequel',candidate.prequel,true);setAutoField('editSequel',candidate.sequel,true);\n          authoritativeRelationsResolved=relationResolverComplete({...universalRel,saga:candidate.saga||universalRel.saga,prequel:candidate.prequel,sequel:candidate.sequel});\n        }",
    'universal success after validation')

# Se il resolver universale non basta, usa UNA volta il resolver Wikipedia strutturato
# gia' presente, senza riattivare tutta la vecchia cascata commerciale.
anchor="    if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){"
fallback='''    /* STRUCTURED_WIKIPEDIA_LAST_RESORT_V1 */
    if(type==='isbn'&&candidateRelationsIncomplete(candidate)&&typeof window.__LIB_FIND_RELATIONS==='function'&&candidate.title&&candidate.author){
      try{
        const structuredRel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga||'',description:candidate.description||''});
        window.__LIB_LAST_STRUCTURED_RELATIONS_RESULT__=structuredRel||null;
        if(structuredRel?.sagaChecked&&structuredRel.saga){candidate.saga=safeBookRelation(structuredRel.saga);setAutoField('editSaga',candidate.saga,true)}
        if(structuredRel?.prequel){candidate.prequel=safeBookRelation(structuredRel.prequel);setAutoField('editPrequel',candidate.prequel,true)}
        if(structuredRel?.sequel){candidate.sequel=safeBookRelation(structuredRel.sequel);setAutoField('editSequel',candidate.sequel,true)}
      }catch(e){window.__LIB_LAST_STRUCTURED_RELATIONS_ERROR__=String(e&&e.message||e);console.warn('Resolver Wikipedia strutturato non disponibile',e)}
    }

'''+anchor
one('isbn-cover.js',anchor,fallback,'structured wikipedia last resort')

# Cache bust delle sole risorse modificate.
one('index.html','<script src="isbn-resilient-fallback-v1.js?v=4"></script>','<script src="isbn-resilient-fallback-v1.js?v=5"></script>','isbn fallback cache bust')
one('index.html','<script src="series-universal-resolver-v1.js?v=1"></script>','<script src="series-universal-resolver-v1.js?v=2"></script>','universal cache bust')
one('index.html','<script src="isbn-cover.js?v=20260817-1"></script>','<script src="isbn-cover.js?v=20260817-2"></script>','coordinator cache bust')

print('DONE')
