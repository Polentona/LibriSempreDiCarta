from pathlib import Path

# ISBN metadata fixes and migration for already-saved books.
p = Path('isbn-cover.js')
s = p.read_text(encoding='utf-8')
old = """  const VERIFIED_BOOK_METADATA={
    '9788854150706':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854150703':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}
  };
"""
new = """  const VERIFIED_BOOK_METADATA={
    '9788854150706':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854150703':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '9788854147317':{title:\"L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854147311':{title:\"L'amore e l'odio\",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}
  };
"""
if old not in s:
    raise SystemExit('VERIFIED_BOOK_METADATA anchor missing')
s = s.replace(old, new, 1)

old = """  function verifiedBookMetadata(code){return VERIFIED_BOOK_METADATA[normalizeLoose(code)]||null}
  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return d.textContent||d.innerText||''}
"""
new = """  function verifiedBookMetadata(code){return VERIFIED_BOOK_METADATA[normalizeLoose(code)]||null}
  function migrateVerifiedSavedBooks(){
    let changed=false;
    for(const b of books){
      const meta=verifiedBookMetadata(b.code||b.isbn||'');if(!meta)continue;
      for(const [k,v] of Object.entries(meta)){if(v&&b[k]!==v){b[k]=v;changed=true}}
    }
    if(changed){saveBooks();render()}
  }
  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return d.textContent||d.innerText||''}
"""
if old not in s:
    raise SystemExit('verifiedBookMetadata anchor missing')
s = s.replace(old, new, 1)

old = """boot();
})();
"""
new = """boot();
migrateVerifiedSavedBooks();
})();
"""
if old not in s:
    raise SystemExit('boot anchor missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Main library cards: rating + saga + notes, loan shown as a small line below.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = ".meta{display:grid;grid-template-columns:.65fr .7fr 1.5fr;gap:10px;margin-top:8px}.panel,.notes{border:1px solid var(--line);border-radius:8px;padding:9px 11px;background:rgba(255,255,255,.13);min-height:70px}.panel h3{font-size:10px;font-weight:400;margin:0 0 7px;border-bottom:1px solid #928277;display:inline-block}.stars{display:flex;gap:1px}.star{border:0;background:transparent;color:#b3aaa2;font-size:20px;padding:0;cursor:pointer}.star.on{color:var(--gold)}.loan{font-size:11px;line-height:1.5}.loan input{font:inherit;border:0;border-bottom:1px dashed #bca995;background:transparent;outline:0;width:100%}.notes textarea{width:100%;min-height:45px;resize:vertical;border:0;background:transparent;outline:0;font:inherit;font-size:11px;line-height:1.45;color:var(--ink)}.read-corner"
new = ".meta{display:grid;grid-template-columns:.65fr .7fr 1.5fr;gap:10px;margin-top:8px}.panel,.notes{border:1px solid var(--line);border-radius:8px;padding:9px 11px;background:rgba(255,255,255,.13);min-height:70px}.panel h3{font-size:10px;font-weight:400;margin:0 0 7px;border-bottom:1px solid #928277;display:inline-block}.stars{display:flex;gap:1px}.star{border:0;background:transparent;color:#b3aaa2;font-size:20px;padding:0;cursor:pointer}.star.on{color:var(--gold)}.saga-value{font-size:11px;line-height:1.5}.loan-summary{font-size:9px;line-height:1.4;color:var(--ink);margin-top:6px}.notes textarea{width:100%;min-height:45px;resize:vertical;border:0;background:transparent;outline:0;font:inherit;font-size:11px;line-height:1.45;color:var(--ink)}.read-corner"
if old not in s:
    raise SystemExit('CSS meta anchor missing')
s = s.replace(old, new, 1)

old = """  <div class=\"meta\"><div class=\"panel\"><h3>IL MIO RATING</h3><div class=\"stars\">${stars(b.rating,b.id)}</div></div>
  <div class=\"panel\"><h3>PRESTATO A</h3><div class=\"loan\"><input data-loan=\"${b.id}\" value=\"${esc(b.loanTo)}\" placeholder=\"Nessuno\">${b.loanDate?`<div>Dal ${esc(b.loanDate)}</div>`:''}</div></div>
  <div class=\"notes\"><span class=\"label\">LE MIE NOTE</span><textarea data-notes=\"${b.id}\">${esc(b.notes)}</textarea></div></div>
  <div class=\"book-manage\">"""
new = """  <div class=\"meta\"><div class=\"panel\"><h3>IL MIO RATING</h3><div class=\"stars\">${stars(b.rating,b.id)}</div></div>
  <div class=\"panel\"><h3>SAGA</h3><div class=\"saga-value\">${esc(b.saga||'—')}</div></div>
  <div class=\"notes\"><span class=\"label\">LE MIE NOTE</span><textarea data-notes=\"${b.id}\">${esc(b.notes)}</textarea></div></div>
  ${b.loanTo?`<div class=\"loan-summary\">Prestato a ${esc(b.loanTo)}</div>`:''}
  <div class=\"book-manage\">"""
if old not in s:
    raise SystemExit('render card anchor missing')
s = s.replace(old, new, 1)

old = "  let f=books.filter(b=>`${b.title} ${b.author}`.toLowerCase().includes(q));\n"
new = "  let f=books.filter(b=>`${b.title} ${b.author} ${b.saga||''}`.toLowerCase().includes(q));\n"
if old not in s:
    raise SystemExit('search anchor missing')
s = s.replace(old, new, 1)

if 'bg${i}.js?v=10' in s:
    s = s.replace('bg${i}.js?v=10', 'bg${i}.js?v=11', 1)
p.write_text(s, encoding='utf-8')

# Cache-bust isbn-cover without touching the background payload.
p = Path('bg/bg8.js')
s = p.read_text(encoding='utf-8')
if 'isbn-cover.js?v=9' not in s:
    raise SystemExit('isbn-cover cache anchor missing')
s = s.replace('isbn-cover.js?v=9', 'isbn-cover.js?v=10', 1)
p.write_text(s, encoding='utf-8')
