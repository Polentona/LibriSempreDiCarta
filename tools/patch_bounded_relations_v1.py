from pathlib import Path

# Carica il resolver bounded prima del loader legacy.
idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
tag='<script src="series-bounded-resolver-v1.js?v=1"></script>'
if tag not in h:
    marker='<script src="isbn-resilient-fallback-v1.js?v=2"></script>'
    if marker not in h:
        raise SystemExit('Modulo ISBN resiliente v2 non trovato in index')
    h=h.replace(marker, marker+'\n'+tag, 1)
idx.write_text(h,encoding='utf-8')

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
needle="""    if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){"""
if needle not in s:
    raise SystemExit('Punto inserimento bounded non trovato')
block="""    /* BOUNDED_PUBLISHER_RELATIONS_V1: una sola ricerca editoriale verificabile, poi stop. */
    if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_BOUNDED_RELATIONS==='function'&&candidate.title&&candidate.author){
      try{
        const boundedRel=await window.__LIB_RESOLVE_BOUNDED_RELATIONS({code,title:candidate.title,author:candidate.author,publisher:candidate.publisher||'',saga:candidate.saga||'',description:candidate.description||''});
        window.__LIB_LAST_BOUNDED_RELATIONS_RESULT__=boundedRel||null;
        if(boundedRel?.authoritative){
          authoritativeRelationsResolved=true;
          candidate.saga=safeBookRelation(boundedRel.saga||'');
          candidate.prequel=safeBookRelation(boundedRel.prequel||'');
          candidate.sequel=safeBookRelation(boundedRel.sequel||'');
          setAutoField('editSaga',candidate.saga,true);
          setAutoField('editPrequel',candidate.prequel,true);
          setAutoField('editSequel',candidate.sequel,true);
        }
      }catch(e){
        window.__LIB_LAST_BOUNDED_RELATIONS_ERROR__=String(e&&e.message||e);
        console.warn('Resolver editoriale limitato non disponibile',e)
      }
    }
"""
s=s.replace(needle,block+"\n"+needle,1)

# I vecchi resolver restano nel repository per compatibilita' ma non vengono eseguiti
# durante l'import ISBN, salvo attivazione diagnostica esplicita.
s=s.replace("if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'", "if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'", 2)
s=s.replace("if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_FIND_RELATIONS==='function'", "if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_FIND_RELATIONS==='function'", 1)
p.write_text(s,encoding='utf-8')
