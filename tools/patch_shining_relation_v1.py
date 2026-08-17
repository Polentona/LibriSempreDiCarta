from pathlib import Path
import re

# Catalogo: relazione verificata Shining -> Doctor Sleep, senza inventare un nome di saga.
p=Path('series-authoritative-catalog-v1.js')
s=p.read_text(encoding='utf-8')
if "codes:{'9788845275746':0" not in s:
    entry=""",
    {
      author:'Stephen King',
      saga:'',
      titles:['Shining','Doctor Sleep'],
      codes:{'9788845275746':0,'8845275744':0},
      sources:[
        'https://www.bompiani.it/autori/stephen-king-773',
        'https://stephenking.com/news/doctor-sleep-release-date-325.html'
      ],
      verified:'2026-08-17'
    }"""
    needle='\n  ];\n\n  function resolve(input={}){'
    if needle not in s: raise SystemExit('punto catalogo non trovato')
    s=s.replace(needle,entry+needle,1)
p.write_text(s,encoding='utf-8')

# Resolver nel form: gli ISBN verificati devono essere consultabili anche quando
# il libro non ha un nome di saga; un valore saga vuoto autorevole deve inoltre
# cancellare eventuali falsi positivi provenienti da fonti dinamiche.
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="if(type==='isbn'&&typeof window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){"
new="if(type==='isbn'&&typeof window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&(!candidate.prequel||!candidate.sequel)){"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('condizione authoritative non trovata')
old2="if(localRel.saga){candidate.saga=safeBookRelation(localRel.saga);setAutoField('editSaga',candidate.saga,true)}"
new2="candidate.saga=safeBookRelation(localRel.saga);setAutoField('editSaga',candidate.saga,true)"
if old2 in s:
    s=s.replace(old2,new2,1)
elif new2 not in s:
    raise SystemExit('assegnazione saga authoritative non trovata')
p.write_text(s,encoding='utf-8')

# Cache bust dei due file effettivamente coinvolti.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s,n1=re.subn(r'series-authoritative-catalog-v1\.js\?v=\d+','series-authoritative-catalog-v1.js?v=4',s,count=1)
s,n2=re.subn(r'bg/bg\$\{i\}\.js\?v=\d+','bg/bg${i}.js?v=25',s,count=1)
if n1!=1 or n2!=1: raise SystemExit(f'cache bust index fallito: {n1=} {n2=}')
p.write_text(s,encoding='utf-8')

p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
s,n=re.subn(r'isbn-cover\.js\?v=\d+','isbn-cover.js?v=25',s,count=1)
if n!=1: raise SystemExit('cache bust isbn-cover fallito')
p.write_text(s,encoding='utf-8')

print('PATCH_SHINING_RELATION_OK')
