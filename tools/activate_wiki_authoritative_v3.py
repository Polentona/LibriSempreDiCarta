from pathlib import Path

idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
block='''<script src="series-wikipedia-authoritative-v3.js?v=1"></script>\n<script src="lookup-lock.js?v=1"></script>\n'''
if 'series-wikipedia-authoritative-v3.js' not in s:
    if '</body>' not in s:
        raise SystemExit('Chiusura body non trovata')
    s=s.replace('</body>',block+'</body>',1)
    idx.write_text(s,encoding='utf-8')

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});"
new="const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga,description:candidate.description||''});"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise SystemExit('Chiamata relazioni del candidato non trovata')
old2="const rel=await window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||''});"
new2="const rel=await window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||'',description:b.plot||b.description||''});"
if old2 in s:
    s=s.replace(old2,new2)
elif new2 not in s:
    raise SystemExit('Chiamata relazioni dei libri salvati non trovata')
s=s.replace('const RELATIONS_LOOKUP_VERSION=7','const RELATIONS_LOOKUP_VERSION=9')
p.write_text(s,encoding='utf-8')
