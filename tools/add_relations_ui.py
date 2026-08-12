from pathlib import Path

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: testo non trovato')
    return text.replace(old, new, 1)

# INDEX: visualizzazione sotto la copertina e ricerca.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=replace_once(s,
    '.cover-wrap{position:relative;padding:8px;background:#f8eee1;border-radius:5px;box-shadow:0 4px 10px #5a3b2522;align-self:start}',
    '.cover-column{align-self:start;min-width:0}.cover-wrap{position:relative;padding:8px;background:#f8eee1;border-radius:5px;box-shadow:0 4px 10px #5a3b2522}.book-relations{padding:10px 10px 0;color:var(--ink);font-size:9px;line-height:1.28}.relation-item+.relation-item{margin-top:10px}.relation-label{display:block;font-weight:600;margin-bottom:1px}.relation-title{display:block}',
    'css relazioni')
s=replace_once(s,
    '.cover-wrap{width:150px;margin:auto}',
    '.cover-column{width:150px;margin:auto}.cover-wrap{width:150px;margin:auto}',
    'css mobile relazioni')
s=replace_once(s,
    "let f=books.filter(b=>`${b.title} ${b.author} ${b.saga||''}`.toLowerCase().includes(q));",
    "let f=books.filter(b=>`${b.title} ${b.author} ${b.saga||''} ${b.prequel||''} ${b.sequel||''}`.toLowerCase().includes(q));",
    'ricerca relazioni')
s=replace_once(s,
    "function coverMarkup(b){return b.cover?`<img class=\"cover\" src=\"${esc(b.cover)}\" alt=\"Copertina di ${esc(b.title)}\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='grid'\"><div class=\"cover cover-empty\" style=\"display:none\">Nessuna copertina</div>`:`<div class=\"cover cover-empty\">Nessuna copertina</div>`}\nfunction render(){",
    "function coverMarkup(b){return b.cover?`<img class=\"cover\" src=\"${esc(b.cover)}\" alt=\"Copertina di ${esc(b.title)}\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='grid'\"><div class=\"cover cover-empty\" style=\"display:none\">Nessuna copertina</div>`:`<div class=\"cover cover-empty\">Nessuna copertina</div>`}\nfunction relationsMarkup(b){const rows=[];if((b.prequel||'').trim())rows.push(`<div class=\"relation-item\"><span class=\"relation-label\">Prequel:</span><span class=\"relation-title\">${esc(b.prequel)}</span></div>`);if((b.sequel||'').trim())rows.push(`<div class=\"relation-item\"><span class=\"relation-label\">Sequel:</span><span class=\"relation-title\">${esc(b.sequel)}</span></div>`);return rows.length?`<div class=\"book-relations\">${rows.join('')}</div>`:''}\nfunction render(){",
    'funzione relazioni')
s=replace_once(s,
    '  <div class="cover-wrap"><div class="tape"></div>${coverMarkup(b)}</div>\n  <div class="info">',
    '  <div class="cover-column"><div class="cover-wrap"><div class="tape"></div>${coverMarkup(b)}</div>${relationsMarkup(b)}</div>\n  <div class="info">',
    'render relazioni')
s=replace_once(s,
    'for(let i=1;i<=8;i++){await new Promise((resolve,reject)=>{const s=document.createElement(\'script\');s.src=`bg/bg${i}.js?v=11`;',
    'for(let i=1;i<=8;i++){await new Promise((resolve,reject)=>{const s=document.createElement(\'script\');s.src=`bg/bg${i}.js?v=12`;',
    'cache bg')
p.write_text(s,encoding='utf-8')

# ISBN COVER: campi editabili, lookup automatico e migrazione dei libri già salvati.
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
s=replace_once(s,
    '  sagaField.innerHTML=`<label for="editSaga">Saga</label><input id="editSaga" placeholder="Nome della saga, se presente">`;\n  dateField.insertAdjacentElement(\'afterend\',sagaField);\n\n  const coverField=',
    '  sagaField.innerHTML=`<label for="editSaga">Saga</label><input id="editSaga" placeholder="Nome della saga, se presente">`;\n  dateField.insertAdjacentElement(\'afterend\',sagaField);\n\n  const prequelField=document.createElement(\'div\');\n  prequelField.className=\'edit-field\';\n  prequelField.innerHTML=`<label for="editPrequel">Prequel</label><input id="editPrequel" placeholder="Libro precedente, se esistente">`;\n  sagaField.insertAdjacentElement(\'afterend\',prequelField);\n\n  const sequelField=document.createElement(\'div\');\n  sequelField.className=\'edit-field\';\n  sequelField.innerHTML=`<label for="editSequel">Sequel</label><input id="editSequel" placeholder="Libro successivo, se esistente">`;\n  prequelField.insertAdjacentElement(\'afterend\',sequelField);\n\n  const coverField=',
    'campi prequel sequel')
s=replace_once(s,
    "  codeField.innerHTML=`<label for=\"editCode\">ISBN / ISSN / codice a barre</label><input id=\"editCode\" inputmode=\"text\" autocomplete=\"off\" placeholder=\"Inserisci o incolla il codice\"><div class=\"lookup-tools\"><button class=\"lookup-btn\" id=\"lookupMetadataBtn\" type=\"button\">Cerca dati</button></div><div class=\"code-hint\">Quando aggiungi un libro, titolo, autore, trama, categoria e copertina vengono cercati automaticamente.</div>`;",
    "  codeField.innerHTML=`<label for=\"editCode\">ISBN / ISSN / codice a barre</label><input id=\"editCode\" inputmode=\"text\" autocomplete=\"off\" placeholder=\"Inserisci o incolla il codice\"><div class=\"lookup-tools\"><button class=\"lookup-btn\" id=\"lookupMetadataBtn\" type=\"button\">Cerca dati</button></div><div class=\"code-hint\">Quando aggiungi un libro, titolo, autore, trama, categoria, saga, prequel/sequel e copertina vengono cercati automaticamente.</div>`;",
    'testo ricerca')
s=replace_once(s,
    "    c.saga=String(c.saga||'').trim();\n    c.title=stripSagaFromTitle(c.title,c.saga);",
    "    c.saga=String(c.saga||'').trim();c.prequel=String(c.prequel||'').trim();c.sequel=String(c.sequel||'').trim();\n    c.title=stripSagaFromTitle(c.title,c.saga);",
    'normalizza relazioni')
s=replace_once(s,
    "  async function applyCandidate(candidate,code,type){\n    candidate=normalizeCandidateMetadata(await enrichOpenLibrary(candidate));\n    const verifiedMeta=verifiedBookMetadata(code);if(verifiedMeta)candidate=normalizeCandidateMetadata({...candidate,...verifiedMeta});\n    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);",
    "  async function applyCandidate(candidate,code,type){\n    if(type==='isbn')setStatus('', 'busy');\n    candidate=normalizeCandidateMetadata(await enrichOpenLibrary(candidate));\n    const verifiedMeta=verifiedBookMetadata(code);if(verifiedMeta)candidate=normalizeCandidateMetadata({...candidate,...verifiedMeta});\n    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);setAutoField('editPrequel',candidate.prequel);setAutoField('editSequel',candidate.sequel);\n    if(type==='isbn'&&typeof window.__LIB_FIND_RELATIONS==='function'&&candidate.title&&candidate.author){\n      try{const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});if(rel?.saga&&!candidate.saga){candidate.saga=rel.saga;setAutoField('editSaga',rel.saga)}setAutoField('editPrequel',rel?.prequel);setAutoField('editSequel',rel?.sequel)}catch(e){console.warn('Relazioni serie non disponibili',e)}\n    }",
    'lookup relazioni')
s=replace_once(s,
    "$x('editPublishedDate').value=b.publishedDate||'';$x('editSaga').value=b.saga||'';showPreview(b.cover||'');",
    "$x('editPublishedDate').value=b.publishedDate||'';$x('editSaga').value=b.saga||'';$x('editPrequel').value=b.prequel||'';$x('editSequel').value=b.sequel||'';showPreview(b.cover||'');",
    'fill dialog relazioni')
s=replace_once(s,
    "  ['editTitle','editSaga','editAuthor','editPlot','editCategory','editPublisher','editPublishedDate'].forEach",
    "  ['editTitle','editSaga','editPrequel','editSequel','editAuthor','editPlot','editCategory','editPublisher','editPublishedDate'].forEach",
    'listener relazioni')
s=replace_once(s,
    "    const extras={code,codeType,category:$x('editCategory').value.trim(),publisher:$x('editPublisher').value.trim(),publishedDate:$x('editPublishedDate').value.trim(),saga:$x('editSaga').value.trim(),isbn:codeType==='isbn'?code:''};",
    "    const extras={code,codeType,category:$x('editCategory').value.trim(),publisher:$x('editPublisher').value.trim(),publishedDate:$x('editPublishedDate').value.trim(),saga:$x('editSaga').value.trim(),prequel:$x('editPrequel').value.trim(),sequel:$x('editSequel').value.trim(),isbn:codeType==='isbn'?code:''};",
    'salvataggio relazioni')
s=replace_once(s,
    "  $x('closeMetadataPicker').onclick=()=>{hidePicker();setStatus('Scelta chiusa senza modificare la bozza.','warn')};",
    "  async function enrichSavedRelations(){\n    if(typeof window.__LIB_FIND_RELATIONS!=='function')return;\n    const now=Date.now(),week=7*24*60*60*1000;\n    const pending=books.filter(b=>{const code=normalizeLoose(b.code||b.isbn||'');return code&&b.title&&b.author&&(!b.relationsLookupAt||now-Number(b.relationsLookupAt)>week)&&(!b.prequel||!b.sequel)}).slice(0,8);\n    for(const b of pending){\n      try{const rel=await window.__LIB_FIND_RELATIONS({code:b.code||b.isbn||'',title:b.title,author:b.author,saga:b.saga||''});let changed=false;if(rel?.saga&&!b.saga){b.saga=rel.saga;changed=true}if(rel?.prequel&&b.prequel!==rel.prequel){b.prequel=rel.prequel;changed=true}if(rel?.sequel&&b.sequel!==rel.sequel){b.sequel=rel.sequel;changed=true}b.relationsLookupAt=now;saveBooks();if(changed)render()}catch(e){}\n    }\n  }\n  setTimeout(enrichSavedRelations,900);\n\n  $x('closeMetadataPicker').onclick=()=>{hidePicker();setStatus('Scelta chiusa senza modificare la bozza.','warn')};",
    'migrazione relazioni')
p.write_text(s,encoding='utf-8')

# LOADER: relazione prima del form ISBN, cache aggiornata.
p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
old="c.onload=()=>{const s=document.createElement('script');s.src='isbn-cover.js?v=11';s.dataset.isbnCover='1';s.onload=()=>{const r=document.createElement('script');r.src='italian-retailer-fallback-v2.js?v=2';r.dataset.retailerFallback='1';document.head.appendChild(r)};document.head.appendChild(s)};document.head.appendChild(c)"
new="c.onload=()=>{const q=document.createElement('script');q.src='series-relations.js?v=1';q.dataset.seriesRelations='1';q.onload=()=>{const s=document.createElement('script');s.src='isbn-cover.js?v=12';s.dataset.isbnCover='1';s.onload=()=>{const r=document.createElement('script');r.src='italian-retailer-fallback-v2.js?v=2';r.dataset.retailerFallback='1';document.head.appendChild(r)};document.head.appendChild(s)};document.head.appendChild(q)};document.head.appendChild(c)"
s=replace_once(s,old,new,'loader relazioni')
p.write_text(s,encoding='utf-8')
