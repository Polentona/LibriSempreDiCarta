from pathlib import Path
import re

p=Path('isbn-cover.js')
s=p.read_text()
entry="    '9788845275746':{title:'Shining',author:'Stephen King'},\n    '8845275744':{title:'Shining',author:'Stephen King'},\n"
anchor="  const VERIFIED_BOOK_METADATA={\n"
if "'9788845275746':{title:'Shining'" not in s:
    if anchor not in s:
        raise SystemExit('VERIFIED_BOOK_METADATA non trovato')
    s=s.replace(anchor,anchor+entry,1)
p.write_text(s)

p=Path('bg/bg8.js')
s=p.read_text()
m=re.search(r"isbn-cover\.js\?v=(\d+)",s)
if not m:
    raise SystemExit('versione isbn-cover non trovata in bg8')
n=int(m.group(1))+1
s=s[:m.start(1)]+str(n)+s[m.end(1):]
p.write_text(s)

p=Path('index.html')
s=p.read_text()
m=re.search(r"bg\$\{i\}\.js\?v=(\d+)",s)
if not m:
    raise SystemExit('versione bg non trovata in index')
n=int(m.group(1))+1
s=s[:m.start(1)]+str(n)+s[m.end(1):]
p.write_text(s)
