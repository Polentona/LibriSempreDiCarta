from pathlib import Path

p=Path('series-universal-resolver-v1.js')
text=p.read_text(encoding='utf-8')
old="""function wikiSectionRelations(wikitext,title,source){
  const sections=wikiSections(wikitext),results=[];
  for(let i=0;i<sections.length;i++){
    const s=sections[i],h=clean(s.title);if(!/\\b(?:serie|saga|trilogia|ciclo)\\b/i.test(h))continue;
    const list=[];
    for(const line of s.lines){if(/^\\s*[#*]+\\s+/.test(line))list.push(line)}
    // Alcune pagine mettono una sottosezione di serie e poi un'altra sottosezione: non oltrepassarla.
    const r=relation(list,title,h,source,'wikipedia-author-section');if(r)results.push(r);
  }
  return results;
}"""
new="""function wikiListTitle(line){
  const raw=String(line||'').replace(/^\\s*[#*]+\\s*/, '').trim();
  // Nelle bibliografie Wikipedia il primo wikilink e' normalmente il titolo locale
  // dell'opera. Prenderlo prima di traduzione, anno, editore e ISBN evita che i
  // dettagli successivi contaminino il confronto tra volumi.
  let m=raw.match(/\\[\\[([^\\]|]+)\\|([^\\]]+)\\]\\]/);
  if(m){const t=tidyTitle(m[2]);if(t)return t}
  m=raw.match(/\\[\\[([^\\]]+)\\]\\]/);
  if(m){const t=tidyTitle(m[1].replace(/\\s*\\([^)]*\\)\\s*$/,''));if(t)return t}
  // Se la voce non e' linkata, usa il primo testo in corsivo (convenzione tipica
  // delle bibliografie) e solo in ultima istanza il parser generico della riga.
  m=raw.match(/''([^']{2,190})''/);
  if(m){const t=tidyTitle(m[1]);if(t)return t}
  return tidyTitle(raw)
}
function wikiSectionRelations(wikitext,title,source){
  const sections=wikiSections(wikitext),results=[];
  for(let i=0;i<sections.length;i++){
    const s=sections[i],h=clean(s.title);if(!/\\b(?:serie|saga|trilogia|ciclo)\\b/i.test(h))continue;
    const list=[];
    for(const line of s.lines){
      if(!/^\\s*[#*]+\\s+/.test(line))continue;
      const t=wikiListTitle(line);if(t)list.push(t)
    }
    const r=relation(list,title,h,source,'wikipedia-author-section');if(r)results.push(r);
  }
  return results;
}"""
if text.count(old)!=1: raise SystemExit(f'anchor wikiSectionRelations trovato {text.count(old)} volte')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

idx=Path('index.html'); s=idx.read_text(encoding='utf-8')
old2='<script src="series-universal-resolver-v1.js?v=2"></script>'
new2='<script src="series-universal-resolver-v1.js?v=4"></script>'
if s.count(old2)!=1: raise SystemExit(f'cache anchor trovato {s.count(old2)} volte')
idx.write_text(s.replace(old2,new2,1),encoding='utf-8')
print('DONE')
