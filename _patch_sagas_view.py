from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old='<a href="#" data-view="categories">Categorie</a></div>'
new='<a href="#" data-view="categories">Categorie</a><a href="#" data-view="series">Saghe e trilogie</a></div>'
if old not in s: raise SystemExit('nav Categorie non trovata')
s=s.replace(old,new,1)

old="""authors:['Autori','I libri ordinati per autore.'],
categories:['Categorie','Le categorie saranno mostrate quando verranno associate ai libri.']
};"""
new="""authors:['Autori','I libri ordinati per autore.'],
categories:['Categorie','Le categorie saranno mostrate quando verranno associate ai libri.'],
series:['Saghe e trilogie','I libri appartenenti a saghe e trilogie, ordinati per cognome dell’autore e poi per pubblicazione.']
};"""
if old not in s: raise SystemExit('viewInfo non trovato')
s=s.replace(old,new,1)

marker='function getFilteredBooks(){\n'
helpers="""function authorSurname(author){
  const raw=String(author||'').trim();if(!raw)return'';
  const first=raw.split(/\\s*(?:;|&| e | and )\\s*/i)[0].trim();
  if(first.includes(','))return first.split(',')[0].trim().toLowerCase();
  const parts=first.replace(/\\([^)]*\\)/g,'').trim().split(/\\s+/).filter(Boolean);
  return (parts[parts.length-1]||first).toLowerCase();
}
function publicationSortValue(book){
  const raw=String(book?.publishedDate||book?.publication||book?.year||'').trim();
  const y=raw.match(/(?:18|19|20)\\d{2}/);if(y)return Number(y[0]);
  const d=Date.parse(raw);return Number.isFinite(d)?new Date(d).getFullYear():9999;
}
function getFilteredBooks(){
"""
if marker not in s: raise SystemExit('getFilteredBooks non trovato')
s=s.replace(marker,helpers,1)

old="""  else if(currentView==='authors')f=[...f].sort((a,b)=>a.author.localeCompare(b.author,'it')||a.title.localeCompare(b.title,'it'));
  return f;
}"""
new="""  else if(currentView==='authors')f=[...f].sort((a,b)=>a.author.localeCompare(b.author,'it')||a.title.localeCompare(b.title,'it'));
  else if(currentView==='series'){
    f=f.filter(b=>String(b.saga||'').trim());
    f=[...f].sort((a,b)=>
      authorSurname(a.author).localeCompare(authorSurname(b.author),'it',{sensitivity:'base'})||
      String(a.author||'').localeCompare(String(b.author||''),'it',{sensitivity:'base'})||
      publicationSortValue(a)-publicationSortValue(b)||
      String(a.title||'').localeCompare(String(b.title||''),'it',{sensitivity:'base'})
    );
  }
  return f;
}"""
if old not in s: raise SystemExit('ordinamento autori non trovato')
s=s.replace(old,new,1)

m=re.search(r'bg\$\{i\}\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione loader bg non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s,encoding='utf-8')

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')

start=s.find('  function stripSagaFromTitle(title,saga){')
end=s.find('  function normalizeCandidateMetadata(candidate){',start)
if start<0 or end<0: raise SystemExit('funzione stripSagaFromTitle non trovata')
newfun="""  function seriesTitleWithSagaFirst(title,saga){
    const original=String(title||'').trim(),sg=String(saga||'').trim();if(!original||!sg)return original;
    const e=sg.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
    if(new RegExp('^'+e+'(?:\\s*(?:[.:-]|[-–—])\\s*|$)','i').test(original))return original;
    const suffix=new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+e+'$','i');
    if(suffix.test(original)){
      const novel=original.replace(suffix,'').trim();
      return novel?sg+'. '+novel:original;
    }
    return original;
  }
"""
s=s[:start]+newfun+s[end:]

old='c.title=stripSagaFromTitle(c.title,c.saga);'
if old not in s: raise SystemExit('normalizzazione titolo non trovata')
s=s.replace(old,'c.title=seriesTitleWithSagaFirst(c.title,c.saga);',1)

replacements={
"'9788854150706':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}":"'9788854150706':{title:'Baciata da un angelo. Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}",
"'8854150703':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}":"'8854150703':{title:'Baciata da un angelo. Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}",
"'9788854147317':{title:\"L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}":"'9788854147317':{title:\"Baciata da un angelo. L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}",
"'8854147311':{title:\"L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}":"'8854147311':{title:\"Baciata da un angelo. L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}"
}
for old,new in replacements.items():
    s=s.replace(old,new)

old="""          if(candidate.saga){
            const cleanedTitle=stripSagaFromTitle(candidate.title,candidate.saga);
            if(cleanedTitle&&cleanedTitle!==candidate.title){candidate.title=cleanedTitle;setAutoField('editTitle',cleanedTitle)}
          }
"""
new="""          if(candidate.saga){
            const fullTitle=seriesTitleWithSagaFirst(candidate.title,candidate.saga);
            if(fullTitle&&fullTitle!==candidate.title){candidate.title=fullTitle;setAutoField('editTitle',fullTitle)}
          }
"""
if old not in s: raise SystemExit('titolo relazioni bozza non trovato')
s=s.replace(old,new,1)

old="if(effectiveSaga){const cleanedTitle=stripSagaFromTitle(b.title,effectiveSaga);if(cleanedTitle&&cleanedTitle!==b.title){b.title=cleanedTitle;changed=true}}"
new="if(effectiveSaga){const fullTitle=seriesTitleWithSagaFirst(b.title,effectiveSaga);if(fullTitle&&fullTitle!==b.title){b.title=fullTitle;changed=true}}"
if old not in s: raise SystemExit('titolo relazioni salvate non trovato')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
m=re.search(r'isbn-cover\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione isbn-cover non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s,encoding='utf-8')
