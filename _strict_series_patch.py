from pathlib import Path
import re

p=Path('series-relations.js')
s=p.read_text(encoding='utf-8')
pattern=r"function inferSagaFromItems\(items,title\)\{.*?\n\}\nfunction relationFromItems"
replacement="""function inferSagaFromItems(items,title){
  const targetParts=titleSegments(title).slice(1),allowed=new Set(targetParts.map(norm).filter(Boolean));
  if(!allowed.size)return'';
  const counts=new Map(),samples=new Map();
  for(const raw of items||[]){
    const variants=[clean(raw),...[...String(raw||'').matchAll(/\\(([^()]{3,180})\\)/g)].map(m=>clean(m[1]))];
    const seen=new Set();
    for(const variant of variants)for(const seg of titleSegments(variant).slice(1)){
      const n=norm(seg);
      if(!n||!allowed.has(n)||seen.has(n)||n===norm(title)||n.length<7||n.split(' ').length<2||/^(?:libro|book|volume|edizione|romanzo|novel|trilogia|saga|serie|ciclo)$/.test(n))continue;
      seen.add(n);counts.set(n,(counts.get(n)||0)+1);if(!samples.has(n))samples.set(n,seg)
    }
  }
  const best=[...counts.entries()].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]||a[0].length-b[0].length)[0];
  return best?samples.get(best[0])||'':''
}
function relationFromItems"""
s2,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
if n!=1: raise SystemExit('inferSagaFromItems non trovato')
p.write_text(s2,encoding='utf-8')

p=Path('italian-catalog-fallback-v3.js')
s=p.read_text(encoding='utf-8')
old="""  const groups=new Map();
  for(const [source,text] of [['g',g],['b',b]])for(const value of searchSagaCandidates(text,rec.title,rec.author)){
    const key=normText(value);if(!key)continue;const x=groups.get(key)||{value,count:0,sources:new Set()};x.count++;x.sources.add(source);groups.set(key,x)
  }
  const best=[...groups.values()].sort((a,b)=>b.sources.size-a.sources.size||b.count-a.count)[0];
  if(best&&(best.sources.size>=2||best.count>=2)){rec.saga=best.value;rec.score=(rec.score||0)+3}
  return rec
}"""
new="""  // Nessun nome esplicito e verificabile: la serie può comunque avere
  // prequel/sequel, ma il campo Saga deve restare vuoto.
  return rec
}"""
if old not in s: raise SystemExit('fallback euristico saga non trovato')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
s2,n=re.subn(r'const RELATIONS_LOOKUP_VERSION=\d+', 'const RELATIONS_LOOKUP_VERSION=3', s, count=1)
if n!=1: raise SystemExit('RELATIONS_LOOKUP_VERSION non trovato')
p.write_text(s2,encoding='utf-8')

p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
def bump(name,text):
    pat=re.compile(re.escape(name)+r'\?v=(\d+)')
    m=pat.search(text)
    if not m: raise SystemExit(f'versione {name} non trovata')
    return text[:m.start(1)]+str(int(m.group(1))+1)+text[m.end(1):]
for name in ['italian-catalog-fallback-v3.js','series-relations.js','isbn-cover.js']:
    s=bump(name,s)
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
m=re.search(r'bg\$\{i\}\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione loader bg non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s,encoding='utf-8')
