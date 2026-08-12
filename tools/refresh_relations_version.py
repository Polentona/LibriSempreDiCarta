from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="""  async function enrichSavedRelations(){
    if(typeof window.__LIB_FIND_RELATIONS!=='function')return;
    const now=Date.now(),week=7*24*60*60*1000;
    const pending=books.filter(b=>{const code=normalizeLoose(b.code||b.isbn||'');return code&&b.title&&b.author&&(!b.relationsLookupAt||now-Number(b.relationsLookupAt)>week)&&(!b.prequel||!b.sequel)}).slice(0,8);
"""
new="""  async function enrichSavedRelations(){
    if(typeof window.__LIB_FIND_RELATIONS!=='function')return;
    const RELATIONS_LOOKUP_VERSION=2,now=Date.now(),week=7*24*60*60*1000;
    const pending=books.filter(b=>{const code=normalizeLoose(b.code||b.isbn||'');return code&&b.title&&b.author&&(Number(b.relationsLookupVersion||0)!==RELATIONS_LOOKUP_VERSION||!b.relationsLookupAt||now-Number(b.relationsLookupAt)>week)&&(!b.prequel||!b.sequel||Number(b.relationsLookupVersion||0)!==RELATIONS_LOOKUP_VERSION)}).slice(0,8);
"""
if old not in s: raise SystemExit('blocco enrichSavedRelations non trovato')
s=s.replace(old,new,1)
old='b.relationsLookupAt=now;saveBooks();if(changed)render()'
new='b.relationsLookupAt=now;b.relationsLookupVersion=RELATIONS_LOOKUP_VERSION;saveBooks();if(changed)render()'
if old not in s: raise SystemExit('salvataggio versione relazioni non trovato')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('bg/bg8.js');s=p.read_text(encoding='utf-8')
if 'isbn-cover.js?v=13' not in s: raise SystemExit('isbn-cover v13 non trovato')
s=s.replace('isbn-cover.js?v=13','isbn-cover.js?v=14',1);p.write_text(s,encoding='utf-8')

p=Path('index.html');s=p.read_text(encoding='utf-8')
if 'bg${i}.js?v=13' not in s: raise SystemExit('bg v13 non trovato')
s=s.replace('bg${i}.js?v=13','bg${i}.js?v=14',1);p.write_text(s,encoding='utf-8')
