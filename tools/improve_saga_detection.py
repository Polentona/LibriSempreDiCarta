from pathlib import Path
import re

p = Path('italian-catalog-fallback-v3.js')
s = p.read_text(encoding='utf-8')

old = "const direct=fieldAfter(text,['Saga','Serie','Ciclo','Trilogia','Nome serie','Nome della serie','Serie di libri','Parte della serie','Parte di una serie','Book series']);"
new = "const direct=fieldAfter(text,['Saga','Ciclo','Trilogia','Nome serie','Nome della serie','Serie di libri','Parte della serie','Parte di una serie','Book series']);"
if old not in s:
    raise SystemExit('campo Serie generico non trovato')
s = s.replace(old, new, 1)

old = r'''    /\b(?:Series|Trilogy|Book series)\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:Trilogia|Saga|Serie)\s+(?:di\s+)?["“”']?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*){0,4})/i
'''
new = r'''    /\b(?:Series|Trilogy|Book series)\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:Saga|Trilogia|Ciclo|Serie)\s*[:\-]\s*([^\n]{2,90})/i,
    /\b(?:[Ss]aga|[Tt]rilogia|[Cc]iclo|[Ss]erie)\s+(?:di|del|della|dei|degli|delle)\s+["“”']?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ0-9'’.-]*(?:\s+(?:[A-ZÀ-ÖØ-Ý0-9][A-Za-zÀ-ÿ0-9'’.-]*|di|del|della|dei|degli|delle|da|dal|e|of|the)){0,5})/
'''
if old not in s:
    raise SystemExit('pattern saga generico non trovato')
s = s.replace(old, new, 1)

old = '''function searchSagaCandidates(text,title,author){
  const p=plain(text),out=[];
'''
new = '''function searchSagaCandidates(text,title,author){
  const raw=plain(text),out=[],target=normText(title);
  let p=raw;
  if(target){
    const lines=String(raw||'').split(/\\n/),relevant=[];
    for(let i=0;i<lines.length;i++){
      if(!normText(lines[i]).includes(target))continue;
      relevant.push(lines.slice(Math.max(0,i-2),Math.min(lines.length,i+3)).join('\\n'))
    }
    if(!relevant.length)return out;
    p=relevant.join('\\n')
  }
'''
if old not in s:
    raise SystemExit('searchSagaCandidates non trovato')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

p = Path('bg/bg8.js')
b = p.read_text(encoding='utf-8')
m = re.search(r'italian-catalog-fallback-v3\.js\?v=(\d+)', b)
if not m:
    raise SystemExit('versione catalog fallback non trovata')
version = int(m.group(1)) + 1
b = b[:m.start()] + f'italian-catalog-fallback-v3.js?v={version}' + b[m.end():]
p.write_text(b, encoding='utf-8')
