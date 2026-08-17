from pathlib import Path
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="""  function setAutoField(id,value,allowEmpty=false){
    value=String(value||'').trim();
    const el=$x(id);if(!el)return;
    if(!value&&!allowEmpty)return;
    if(!el.value.trim()||autoFields.has(id)){el.value=value;autoFields.add(id)}
  }
  function hidePicker(){"""
new="""  let universalRelationTimer=null,universalRelationToken=0;
  async function completeUniversalRelationsFromFields(){
    if(typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES!=='function')return null;
    const title=String($x('editTitle')?.value||'').trim(),author=String($x('editAuthor')?.value||'').trim();
    if(!title||!author||!plausibleAuthorName(author))return null;
    const existing={saga:$x('editSaga')?.value||'',prequel:$x('editPrequel')?.value||'',sequel:$x('editSequel')?.value||''};
    if(!candidateRelationsIncomplete(existing))return null;
    const signature=normalizeText(title)+'|'+normalizeText(author),token=++universalRelationToken;
    try{
      const rel=await window.__LIB_RESOLVE_UNIVERSAL_SERIES({
        code:normalizeLoose($x('editCode')?.value||''),title,author,
        publisher:String($x('editPublisher')?.value||'').trim(),
        saga:safeSeriesName($x('editSaga')?.value||''),
        description:String($x('editPlot')?.value||'').trim()
      });
      window.__LIB_LAST_DECOUPLED_SERIES_RESULT__=rel||null;
      if(token!==universalRelationToken)return null;
      const now=normalizeText($x('editTitle')?.value||'')+'|'+normalizeText($x('editAuthor')?.value||'');if(now!==signature)return null;
      if(rel?.saga){const saga=safeSeriesName(rel.saga);if(saga)setAutoField('editSaga',saga,true)}
      if(rel?.authoritative){
        setAutoField('editPrequel',safeBookRelation(rel.prequel||''),true);
        setAutoField('editSequel',safeBookRelation(rel.sequel||''),true);
      }
      return rel||null;
    }catch(e){window.__LIB_LAST_DECOUPLED_SERIES_ERROR__=String(e&&e.message||e);console.warn('Completamento universale relazioni non disponibile',e);return null}
  }
  function scheduleUniversalRelations(delay=450){
    clearTimeout(universalRelationTimer);
    universalRelationTimer=setTimeout(()=>{completeUniversalRelationsFromFields()},delay)
  }
  function setAutoField(id,value,allowEmpty=false){
    value=String(value||'').trim();
    const el=$x(id);if(!el)return;
    if(!value&&!allowEmpty)return;
    if(!el.value.trim()||autoFields.has(id)){
      el.value=value;autoFields.add(id);
      if(id==='editTitle'||id==='editAuthor')scheduleUniversalRelations()
    }
  }
  for(const id of ['editTitle','editAuthor']){
    const el=$x(id);if(el){el.addEventListener('input',()=>scheduleUniversalRelations(650));el.addEventListener('change',()=>scheduleUniversalRelations(120))}
  }
  window.__LIB_COMPLETE_RELATIONS_FROM_FIELDS__=completeUniversalRelationsFromFields;
  function hidePicker(){"""
if s.count(old)!=1: raise SystemExit(f'anchor setAutoField trovato {s.count(old)} volte')
p.write_text(s.replace(old,new,1),encoding='utf-8')
idx=Path('index.html'); h=idx.read_text(encoding='utf-8')
old2='<script src="isbn-cover.js?v=20260817-3"></script>'
new2='<script src="isbn-cover.js?v=20260817-6"></script>'
if h.count(old2)!=1: raise SystemExit(f'cache ISBN anchor trovato {h.count(old2)} volte')
idx.write_text(h.replace(old2,new2,1),encoding='utf-8')
print('DONE')
