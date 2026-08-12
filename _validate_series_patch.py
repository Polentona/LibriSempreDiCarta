from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')

old="""  function setAutoField(id,value){
    value=String(value||'').trim();if(!value)return;
    const el=$x(id);if(!el)return;
    if(!el.value.trim()||autoFields.has(id)){el.value=value;autoFields.add(id)}
  }
"""
new="""  function setAutoField(id,value,allowEmpty=false){
    value=String(value||'').trim();
    const el=$x(id);if(!el)return;
    if(!value&&!allowEmpty)return;
    if(!el.value.trim()||autoFields.has(id)){el.value=value;autoFields.add(id)}
  }
"""
if old not in s: raise SystemExit('setAutoField non trovato')
s=s.replace(old,new,1)

old="""      try{const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});if(rel?.saga&&!candidate.saga){candidate.saga=rel.saga;setAutoField('editSaga',rel.saga);const cleanedTitle=stripSagaFromTitle(candidate.title,rel.saga);if(cleanedTitle&&cleanedTitle!==candidate.title){candidate.title=cleanedTitle;setAutoField('editTitle',cleanedTitle)}}setAutoField('editPrequel',rel?.prequel);setAutoField('editSequel',rel?.sequel)}catch(e){console.warn('Relazioni serie non disponibili',e)}
"""
new="""      try{
        const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});
        if(rel?.sagaChecked){
          candidate.saga=String(rel.saga||'').trim();
          setAutoField('editSaga',candidate.saga,true);
          if(candidate.saga){
            const cleanedTitle=stripSagaFromTitle(candidate.title,candidate.saga);
            if(cleanedTitle&&cleanedTitle!==candidate.title){candidate.title=cleanedTitle;setAutoField('editTitle',cleanedTitle)}
          }
        }
        candidate.prequel=String(rel?.prequel||'').trim();
        candidate.sequel=String(rel?.sequel||'').trim();
        setAutoField('editPrequel',candidate.prequel,true);
        setAutoField('editSequel',candidate.sequel,true);
      }catch(e){console.warn('Relazioni serie non disponibili',e)}
"""
if old not in s: raise SystemExit('blocco relazioni applyCandidate non trovato')
s=s.replace(old,new,1)

old="    const RELATIONS_LOOKUP_VERSION=3,now=Date.now(),week=7*24*60*60*1000;"
new="    const RELATIONS_LOOKUP_VERSION=4,now=Date.now(),week=7*24*60*60*1000;"
if old not in s: raise SystemExit('versione relazioni non trovata')
s=s.replace(old,new,1)

old="""      try{const rel=await window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||''});let changed=false;if(rel?.saga&&!b.saga){b.saga=rel.saga;changed=true}const effectiveSaga=rel?.saga||b.saga||'';if(effectiveSaga){const cleanedTitle=stripSagaFromTitle(b.title,effectiveSaga);if(cleanedTitle&&cleanedTitle!==b.title){b.title=cleanedTitle;changed=true}}if(rel?.prequel&&b.prequel!==rel.prequel){b.prequel=rel.prequel;changed=true}if(rel?.sequel&&b.sequel!==rel.sequel){b.sequel=rel.sequel;changed=true}b.relationsLookupAt=now;b.relationsLookupVersion=RELATIONS_LOOKUP_VERSION;saveBooks();if(changed)render()}catch(e){}
"""
new="""      try{
        const rel=await window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||''});let changed=false;
        if(rel?.sagaChecked){const nextSaga=String(rel.saga||'').trim();if(String(b.saga||'').trim()!==nextSaga){b.saga=nextSaga;changed=true}}
        const effectiveSaga=rel?.sagaChecked?String(rel.saga||'').trim():String(b.saga||'').trim();
        if(effectiveSaga){const cleanedTitle=stripSagaFromTitle(b.title,effectiveSaga);if(cleanedTitle&&cleanedTitle!==b.title){b.title=cleanedTitle;changed=true}}
        if(rel?.prequel&&b.prequel!==rel.prequel){b.prequel=rel.prequel;changed=true}
        if(rel?.sequel&&b.sequel!==rel.sequel){b.sequel=rel.sequel;changed=true}
        b.relationsLookupAt=now;b.relationsLookupVersion=RELATIONS_LOOKUP_VERSION;saveBooks();if(changed)render()
      }catch(e){}
"""
if old not in s: raise SystemExit('blocco enrichSavedRelations non trovato')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
if 'series-relations.js?v=3' not in s: raise SystemExit('series-relations v3 non trovato')
if 'isbn-cover.js?v=15' not in s: raise SystemExit('isbn-cover v15 non trovato')
s=s.replace('series-relations.js?v=3','series-relations.js?v=4',1)
s=s.replace('isbn-cover.js?v=15','isbn-cover.js?v=16',1)
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'bg/bg${i}.js?v=15' not in s: raise SystemExit('loader bg v15 non trovato')
s=s.replace('bg/bg${i}.js?v=15','bg/bg${i}.js?v=16',1)
p.write_text(s,encoding='utf-8')
