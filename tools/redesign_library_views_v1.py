from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

# 1) Banner di navigazione: deve contenere anche il pulsante Aggiungi libro.
old_nav='.nav{max-width:1180px;margin:auto;min-height:54px;'
new_nav='.nav{width:calc(100% - 44px);max-width:1650px;margin:auto;min-height:54px;'
if old_nav not in s:
    raise SystemExit('CSS nav atteso non trovato')
s=s.replace(old_nav,new_nav,1)

# 2) Stili per directory autori, categorie e vista saghe.
extra_css=r'''
main.wide-view{max-width:1500px}
.view-controls:empty{display:none}.view-controls{margin:2px 0 18px}
.alphabet-filter{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;max-width:980px;margin:8px auto 22px}.alphabet-btn{width:31px;height:29px;border:1px solid #6f6155;border-radius:2px;background:rgba(255,249,240,.58);color:var(--ink);font:inherit;font-size:11px;cursor:pointer;padding:0}.alphabet-btn:hover{background:#f0dfca}.alphabet-btn.active{background:#607e56;color:white;border-color:#607e56}
.author-directory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.author-entry{background:rgba(252,247,239,.94);border:1px solid rgba(170,130,90,.22);border-radius:11px;padding:15px 18px;box-shadow:0 5px 15px rgba(82,56,35,.08)}.author-entry-name{font-size:17px;line-height:1.3}.author-entry-count{font-size:10px;color:var(--muted);margin-top:5px}
.category-filter-wrap{display:flex;align-items:center;gap:10px;max-width:520px}.category-filter-wrap label{font-size:12px}.category-filter{min-width:260px;max-width:100%;border:1px solid #d4bea7;border-radius:8px;background:#fff8ef;color:var(--ink);padding:8px 11px;font:inherit;font-size:12px;outline:none}
.series-list{display:flex;flex-direction:column;gap:18px}.series-row{background:rgba(252,247,239,.95);border:1px solid rgba(170,130,90,.19);border-radius:16px;box-shadow:0 9px 22px rgba(82,56,35,.11);padding:25px 28px;display:grid;grid-template-columns:255px minmax(0,1fr);gap:30px;align-items:center}.series-info{align-self:stretch;display:flex;flex-direction:column;justify-content:center}.series-name{font-family:Arial,sans-serif;font-style:italic;font-size:26px;font-weight:700;text-transform:uppercase;margin:0 0 5px}.series-authors{font-size:14px;line-height:1.4;margin-bottom:9px}.series-rating-label{font-size:9px;font-family:Arial,sans-serif;font-style:italic;margin-bottom:2px}.series-average{display:flex;align-items:center;gap:8px}.avg-stars{font-family:Arial,sans-serif;font-size:18px;letter-spacing:3px;white-space:nowrap}.avg-number{font-family:Arial,sans-serif;font-size:10px;color:var(--muted)}.series-note-label{font-size:9px;margin-top:12px;margin-bottom:4px}.series-note{width:100%;min-height:54px;resize:vertical;border:1px solid #d8c4ad;border-radius:7px;background:rgba(255,255,255,.28);padding:7px 9px;color:var(--ink);font:inherit;font-size:10px;line-height:1.4;outline:none}
.series-carousel{display:flex;align-items:center;gap:13px;min-width:0}.series-covers{display:flex;align-items:flex-start;gap:20px;min-width:0;flex:1}.series-cover-card{width:132px;flex:0 0 132px;text-align:center}.series-cover-frame{width:132px;height:198px;border:1px solid #5d544c;border-radius:14px;background:#f8eee1;overflow:hidden;display:grid;place-items:center}.series-cover-img{width:100%;height:100%;object-fit:cover;display:block}.series-cover-empty{width:100%;height:100%;display:grid;place-items:center;text-align:center;padding:10px;color:#887667;font-size:9px;background:#e4d5c3}.series-owned{min-height:19px;padding-top:5px;font-size:9px;font-weight:600}.series-slide{width:40px;height:44px;flex:0 0 40px;border:0;background:transparent;color:var(--ink);font-size:34px;line-height:1;cursor:pointer}.series-slide:disabled{visibility:hidden;cursor:default}
@media(max-width:1150px){.series-row{grid-template-columns:220px minmax(0,1fr);padding:22px 20px}.series-covers{gap:12px}.series-cover-card{width:110px;flex-basis:110px}.series-cover-frame{width:110px;height:165px}}
@media(max-width:850px){.author-directory{grid-template-columns:repeat(2,minmax(0,1fr))}.series-row{grid-template-columns:1fr}.series-info{max-width:none}.series-carousel{overflow:hidden}.series-covers{overflow-x:auto;padding-bottom:7px}.series-slide{display:none}}
@media(max-width:560px){.author-directory{grid-template-columns:1fr}.alphabet-filter{justify-content:flex-start}.category-filter-wrap{align-items:stretch;flex-direction:column}.category-filter{width:100%;min-width:0}}
'''
if '</style>' not in s:
    raise SystemExit('Chiusura style non trovata')
s=s.replace('</style>',extra_css+'\n</style>',1)

# 3) Header e area principale: Home diventa la vista iniziale e aggiungiamo un contenitore per i filtri.
header_main=r'''<header><div class="nav"><div class="brand"><span class="books">📚</span><strong>Libri di Carta</strong></div><div class="links"><a href="#" data-view="home" class="active">Home</a><a href="#" data-view="library">La mia libreria</a><a href="#" data-view="read">Letti</a><a href="#" data-view="unread">Da leggere</a><a href="#" data-view="loaned">Prestati</a><a href="#" data-view="authors">Autori</a><a href="#" data-view="categories">Categorie</a><a href="#" data-view="series">Saghe e trilogie</a></div><label class="search">⌕<input id="search" placeholder="Cerca un libro, autore…"></label><button class="add-book-btn" id="addBookBtn" type="button"><span class="plus">＋</span>Aggiungi libro</button></div></header>
<main><div class="intro"><h1 id="viewTitle">Home</h1><p id="viewSubtitle">Tutti i libri inseriti nel sito.</p></div><div class="view-controls" id="viewControls"></div><div class="pagination" id="pagination"><button class="page-arrow" id="prevPage">←</button><div class="page-status" id="pageStatus"></div><button class="page-arrow" id="nextPage">→</button></div><div id="list"></div></main>'''
s,n=re.subn(r'<header><div class="nav">.*?</header>\s*<main>.*?</main>',header_main,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'Header/main sostituiti {n} volte')

# 4) Spunta fisica direttamente nel modulo, non tramite wrapper esterni.
read_check='<label class="edit-check"><input id="editRead" type="checkbox"> Libro letto</label>'
physical_check=read_check+'\n<label class="edit-check"><input id="editInLibrary" type="checkbox"> In libreria</label>'
if read_check not in s:
    raise SystemExit('Checkbox Libro letto non trovato')
s=s.replace(read_check,physical_check,1)

# 5) Motore principale delle viste.
core=r'''const PAGE_SIZE=50, SERIES_PAGE_SIZE=20;
let currentPage=1,currentView='home',editingId=null,dialogMode='edit';
let selectedAuthorLetter='',selectedCategory='';
const seriesOffsets={};
const $=id=>document.getElementById(id);
const SERIES_NOTES_KEY='libriDiCarta.seriesNotes.v1';
let seriesNotes={};
try{const savedNotes=JSON.parse(localStorage.getItem(SERIES_NOTES_KEY));if(savedNotes&&typeof savedNotes==='object'&&!Array.isArray(savedNotes))seriesNotes=savedNotes}catch(e){seriesNotes={}}
function saveSeriesNotes(){try{localStorage.setItem(SERIES_NOTES_KEY,JSON.stringify(seriesNotes))}catch(e){console.error('Impossibile salvare le note delle saghe',e)}}
const viewInfo={
  home:['Home','Tutti i libri inseriti nel sito.'],
  library:['La mia libreria',''],
  read:['Letti','Solo i libri che hai segnato come letti.'],
  unread:['Da leggere','Solo i libri che non hai ancora segnato come letti.'],
  loaned:['Prestati','Solo i libri attualmente prestati.'],
  authors:['Autori',''],
  categories:['Categorie',''],
  series:['Saghe e trilogie','']
};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stars(n,id){return [1,2,3,4,5].map(v=>`<button class="star ${v<=n?'on':''}" data-id="${id}" data-v="${v}" type="button">★</button>`).join('')}
function isInLibrary(book){return book?.inLibrary===true||book?.physicalOwned===true}
function authorSurname(author){
  const raw=String(author||'').trim();if(!raw)return'';
  const first=raw.split(/\s*(?:;|&| e | and )\s*/i)[0].trim();
  if(first.includes(','))return first.split(',')[0].trim().toLowerCase();
  const parts=first.replace(/\([^)]*\)/g,'').trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length-1]||first).toLowerCase();
}
function authorInitial(author){return (authorSurname(author).normalize('NFD').replace(/[\u0300-\u036f]/g,'').charAt(0)||'').toUpperCase()}
function compareAuthors(a,b){return authorSurname(a).localeCompare(authorSurname(b),'it',{sensitivity:'base'})||String(a||'').localeCompare(String(b||''),'it',{sensitivity:'base'})}
function compareBooksByAuthor(a,b){return compareAuthors(a.author,b.author)||String(a.title||'').localeCompare(String(b.title||''),'it',{sensitivity:'base'})}
function publicationSortValue(book){
  const raw=String(book?.publishedDate||book?.publication||book?.year||'').trim();
  const y=raw.match(/(?:18|19|20)\d{2}/);if(y)return Number(y[0]);
  const d=Date.parse(raw);return Number.isFinite(d)?new Date(d).getFullYear():9999;
}
function searchableBooks(){
  const q=$('search').value.toLowerCase().trim();
  if(!q)return [...books];
  return books.filter(b=>`${b.title||''} ${b.author||''} ${b.saga||''} ${b.prequel||''} ${b.sequel||''} ${b.category||''} ${b.publisher||''}`.toLowerCase().includes(q));
}
function getFilteredBooks(){
  let f=searchableBooks();
  if(currentView==='library')f=f.filter(isInLibrary);
  else if(currentView==='read')f=f.filter(b=>b.read);
  else if(currentView==='unread')f=f.filter(b=>!b.read);
  else if(currentView==='loaned')f=f.filter(b=>(b.loanTo||'').trim());
  else if(currentView==='categories'){
    if(selectedCategory)f=f.filter(b=>String(b.category||'').trim()===selectedCategory);
    f=[...f].sort(compareBooksByAuthor);
  }
  return f;
}
function setView(view){
  currentView=view;currentPage=1;
  const info=viewInfo[view]||viewInfo.home;
  $('viewTitle').textContent=info[0];$('viewSubtitle').textContent=info[1];$('viewSubtitle').style.display=info[1]?'':'none';
  document.querySelector('main')?.classList.toggle('wide-view',view==='series'||view==='authors');
  document.querySelectorAll('.links a[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===view));
  render();
}
function coverMarkup(b){return b.cover?`<img class="cover" src="${esc(b.cover)}" alt="Copertina di ${esc(b.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="cover cover-empty" style="display:none">Nessuna copertina</div>`:`<div class="cover cover-empty">Nessuna copertina</div>`}
function relationsMarkup(b){const rows=[];if((b.prequel||'').trim())rows.push(`<div class="relation-item"><span class="relation-label">Prequel:</span><span class="relation-title">${esc(b.prequel)}</span></div>`);if((b.sequel||'').trim())rows.push(`<div class="relation-item"><span class="relation-label">Sequel:</span><span class="relation-title">${esc(b.sequel)}</span></div>`);return rows.length?`<div class="book-relations">${rows.join('')}</div>`:''}
function bookMarkup(b){return `<section class="book">
  <label class="read-corner" title="Segna come letto"><input type="checkbox" data-read="${b.id}" ${b.read?'checked':''}><span class="read-box"></span></label>
  <div class="cover-column"><div class="cover-wrap"><div class="tape"></div>${coverMarkup(b)}</div>${relationsMarkup(b)}</div>
  <div class="info"><h2 class="title">${esc(b.title)}</h2><p class="author">${esc(b.author)}</p><span class="label">TRAMA</span><p class="plot">${esc(b.plot)}</p>
  <div class="meta"><div class="panel"><h3>IL MIO RATING</h3><div class="stars">${stars(b.rating,b.id)}</div></div>
  <div class="panel"><h3>SAGA</h3><div class="saga-value">${esc(b.saga||'—')}</div></div>
  <div class="notes"><span class="label">LE MIE NOTE</span><textarea data-notes="${b.id}">${esc(b.notes)}</textarea></div></div>
  ${b.loanTo?`<div class="loan-summary">Prestato a ${esc(b.loanTo)}</div>`:''}
  <div class="book-manage"><button class="manage-btn" data-edit="${b.id}" type="button">↗ Apri scheda</button><button class="manage-btn delete" data-delete="${b.id}" type="button">Elimina</button></div>
  </div></section>`}
function setPagination(pages,total,from,to,noun='libri'){
  const box=$('pagination');box.style.display='grid';
  $('pageStatus').innerHTML=`<strong>Pagina ${currentPage} di ${pages}</strong><br>Mostra ${from}–${to} di ${total} ${noun}`;
  $('prevPage').disabled=currentPage<=1;$('nextPage').disabled=currentPage>=pages;
}
function renderBookList(f){
  const pages=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(currentPage>pages)currentPage=pages;
  const start=(currentPage-1)*PAGE_SIZE,vis=f.slice(start,start+PAGE_SIZE);
  $('list').innerHTML=vis.length?vis.map(bookMarkup).join(''):`<div class="empty-state">Nessun libro da mostrare in questa sezione.</div>`;
  setPagination(pages,f.length,f.length?start+1:0,Math.min(start+PAGE_SIZE,f.length),'libri');bind();
}
function renderViewControls(){
  const box=$('viewControls');box.innerHTML='';
  if(currentView==='authors'){
    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    box.innerHTML=`<div class="alphabet-filter" aria-label="Filtra gli autori per iniziale del cognome">${letters.map(l=>`<button type="button" class="alphabet-btn ${selectedAuthorLetter===l?'active':''}" data-author-letter="${l}" title="Cognomi che iniziano per ${l}">${l}</button>`).join('')}</div>`;
    box.querySelectorAll('[data-author-letter]').forEach(btn=>btn.onclick=()=>{const l=btn.dataset.authorLetter;selectedAuthorLetter=selectedAuthorLetter===l?'':l;currentPage=1;render()});
  }else if(currentView==='categories'){
    const categories=[...new Set(books.map(b=>String(b.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));
    if(selectedCategory&&!categories.includes(selectedCategory))selectedCategory='';
    box.innerHTML=`<div class="category-filter-wrap"><label for="categoryFilter">Filtra per categoria</label><select class="category-filter" id="categoryFilter"><option value="">Tutte le categorie</option>${categories.map(c=>`<option value="${esc(c)}" ${selectedCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>`;
    $('categoryFilter').onchange=e=>{selectedCategory=e.target.value;currentPage=1;render()};
  }
}
function renderAuthors(){
  $('pagination').style.display='none';
  const map=new Map();
  for(const b of searchableBooks()){
    const name=String(b.author||'').trim();if(!name)continue;
    if(selectedAuthorLetter&&authorInitial(name)!==selectedAuthorLetter)continue;
    const key=name.toLocaleLowerCase('it');
    const row=map.get(key)||{name,count:0};row.count++;map.set(key,row);
  }
  const rows=[...map.values()].sort((a,b)=>compareAuthors(a.name,b.name));
  $('list').innerHTML=rows.length?`<div class="author-directory">${rows.map(a=>`<div class="author-entry"><div class="author-entry-name">${esc(a.name)}</div><div class="author-entry-count">${a.count} ${a.count===1?'libro':'libri'}</div></div>`).join('')}</div>`:`<div class="empty-state">Nessun autore per questa lettera.</div>`;
}
function sagaKey(name){return String(name||'').trim().toLocaleLowerCase('it')}
function buildSeriesGroups(){
  const map=new Map();
  for(const b of searchableBooks()){
    const saga=String(b.saga||'').trim();if(!saga)continue;
    const key=sagaKey(saga);if(!map.has(key))map.set(key,{key,name:saga,books:[]});map.get(key).books.push(b);
  }
  const groups=[...map.values()];
  for(const g of groups)g.books.sort((a,b)=>publicationSortValue(a)-publicationSortValue(b)||String(a.title||'').localeCompare(String(b.title||''),'it',{sensitivity:'base'}));
  groups.sort((a,b)=>{
    const aa=[...new Set(a.books.map(x=>String(x.author||'').trim()).filter(Boolean))].sort(compareAuthors)[0]||'';
    const bb=[...new Set(b.books.map(x=>String(x.author||'').trim()).filter(Boolean))].sort(compareAuthors)[0]||'';
    return compareAuthors(aa,bb)||a.name.localeCompare(b.name,'it',{sensitivity:'base'});
  });
  return groups;
}
function averageRatingMarkup(group){
  const ratings=group.books.map(b=>Number(b.rating)||0).filter(n=>n>0);const avg=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:0;
  const rounded=Math.round(avg);const glyphs=[1,2,3,4,5].map(v=>v<=rounded?'★':'☆').join('');
  return `<div class="series-rating-label">ranking medio</div><div class="series-average"><span class="avg-stars">${glyphs}</span><span class="avg-number">${ratings.length?avg.toFixed(1).replace('.',',')+' / 5':'nessun voto'}</span></div>`;
}
function seriesCoverMarkup(b){
  const image=b.cover?`<img class="series-cover-img" src="${esc(b.cover)}" alt="Copertina di ${esc(b.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="series-cover-empty" style="display:none">Nessuna copertina</div>`:`<div class="series-cover-empty">Nessuna copertina</div>`;
  return `<div class="series-cover-card" title="${esc(b.title)}"><div class="series-cover-frame">${image}</div><div class="series-owned">${isInLibrary(b)?'in libreria':'&nbsp;'}</div></div>`;
}
function seriesRowMarkup(g){
  const authors=[...new Set(g.books.map(b=>String(b.author||'').trim()).filter(Boolean))].sort(compareAuthors);
  const maxOffset=Math.max(0,Math.floor((g.books.length-1)/5)*5);let offset=Math.min(Math.max(0,seriesOffsets[g.key]||0),maxOffset);seriesOffsets[g.key]=offset;
  const visible=g.books.slice(offset,offset+5);const encoded=encodeURIComponent(g.key);const note=seriesNotes[g.key]||'';
  return `<section class="series-row"><div class="series-info"><h2 class="series-name">${esc(g.name)}</h2><div class="series-authors">${esc(authors.join(' · '))}</div>${averageRatingMarkup(g)}<label class="series-note-label" for="series-note-${encoded}">NOTE</label><textarea id="series-note-${encoded}" class="series-note" data-series-note="${encoded}" placeholder="Es. saga completa / incompleta...">${esc(note)}</textarea></div><div class="series-carousel"><button class="series-slide" type="button" data-series-dir="-1" data-series-key="${encoded}" ${offset<=0?'disabled':''} aria-label="Copertine precedenti">‹</button><div class="series-covers">${visible.map(seriesCoverMarkup).join('')}</div><button class="series-slide" type="button" data-series-dir="1" data-series-key="${encoded}" ${offset+5>=g.books.length?'disabled':''} aria-label="Copertine successive">›</button></div></section>`;
}
function renderSeries(){
  const groups=buildSeriesGroups(),pages=Math.max(1,Math.ceil(groups.length/SERIES_PAGE_SIZE));if(currentPage>pages)currentPage=pages;
  const start=(currentPage-1)*SERIES_PAGE_SIZE,vis=groups.slice(start,start+SERIES_PAGE_SIZE);
  $('list').innerHTML=vis.length?`<div class="series-list">${vis.map(seriesRowMarkup).join('')}</div>`:`<div class="empty-state">Nessuna saga o trilogia da mostrare.</div>`;
  setPagination(pages,groups.length,groups.length?start+1:0,Math.min(start+SERIES_PAGE_SIZE,groups.length),groups.length===1?'saga':'saghe');
  document.querySelectorAll('[data-series-dir]').forEach(btn=>btn.onclick=()=>{const key=decodeURIComponent(btn.dataset.seriesKey);seriesOffsets[key]=Math.max(0,(seriesOffsets[key]||0)+Number(btn.dataset.seriesDir)*5);renderSeries()});
  document.querySelectorAll('[data-series-note]').forEach(t=>t.onchange=()=>{const key=decodeURIComponent(t.dataset.seriesNote);seriesNotes[key]=t.value;saveSeriesNotes()});
}
function render(){
  renderViewControls();
  if(currentView==='authors'){renderAuthors();return}
  if(currentView==='series'){renderSeries();return}
  renderBookList(getFilteredBooks());
}
function fillDialog(b={}){
  $('editTitle').value=b.title||'';$('editAuthor').value=b.author||'';$('editCover').value=b.cover||'';$('editPlot').value=b.plot||'';
  $('editRating').value=String(Number(b.rating)||0);$('editLoanTo').value=b.loanTo||'';$('editLoanDate').value=b.loanDate||'';$('editNotes').value=b.notes||'';$('editRead').checked=!!b.read;$('editInLibrary').checked=isInLibrary(b);
}
function openEdit(id){
  const b=books.find(x=>x.id==id);if(!b)return;dialogMode='edit';editingId=b.id;fillDialog(b);
  $('dialogTitle').textContent='Scheda del libro';$('saveDialogBtn').textContent='Salva modifiche';$('editDialog').showModal();
}
function openAdd(){
  dialogMode='add';editingId=null;fillDialog({rating:0,read:false,inLibrary:false});
  $('dialogTitle').textContent='Aggiungi un nuovo libro';$('saveDialogBtn').textContent='Aggiungi libro';$('editDialog').showModal();
  setTimeout(()=>$('editTitle').focus(),0);
}
function deleteBook(id){
  const b=books.find(x=>x.id==id);if(!b)return;
  if(confirm(`Vuoi eliminare definitivamente “${b.title}” dalla libreria?`)){books=books.filter(x=>x.id!=id);saveBooks();render()}
}
function bind(){
  document.querySelectorAll('.star').forEach(s=>s.onclick=()=>{const b=books.find(x=>x.id==s.dataset.id);if(b){b.rating=+s.dataset.v;saveBooks();render()}});
  document.querySelectorAll('[data-read]').forEach(c=>c.onchange=()=>{const b=books.find(x=>x.id==c.dataset.read);if(b){b.read=c.checked;saveBooks();render()}});
  document.querySelectorAll('[data-loan]').forEach(i=>i.onchange=()=>{const b=books.find(x=>x.id==i.dataset.loan);if(b){b.loanTo=i.value;saveBooks();render()}});
  document.querySelectorAll('[data-notes]').forEach(t=>t.onchange=()=>{const b=books.find(x=>x.id==t.dataset.notes);if(b){b.notes=t.value;saveBooks()}});
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openEdit(btn.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>deleteBook(btn.dataset.delete));
}
$('editForm').onsubmit=e=>{
  e.preventDefault();
  const data={title:$('editTitle').value.trim(),author:$('editAuthor').value.trim(),cover:$('editCover').value.trim(),plot:$('editPlot').value.trim(),rating:+$('editRating').value,loanTo:$('editLoanTo').value.trim(),loanDate:$('editLoanDate').value.trim(),notes:$('editNotes').value,read:$('editRead').checked,inLibrary:$('editInLibrary').checked};
  if(dialogMode==='add'){
    const nextId=books.reduce((m,b)=>Math.max(m,Number(b.id)||0),0)+1;
    books.unshift({id:nextId,...data});saveBooks();$('editDialog').close();setView('home');
  }else{
    const b=books.find(x=>x.id==editingId);if(!b)return;Object.assign(b,data);delete b.physicalOwned;saveBooks();$('editDialog').close();editingId=null;render();
  }
};
function closeDialog(){if($('editDialog').open)$('editDialog').close();editingId=null;dialogMode='edit'}
$('cancelEdit').onclick=closeDialog;
$('editDialog').addEventListener('click',e=>{if(e.target===$('editDialog'))closeDialog()});
$('addBookBtn').onclick=openAdd;
document.querySelectorAll('.links a[data-view]').forEach(a=>a.onclick=e=>{e.preventDefault();setView(a.dataset.view)});
$('search').oninput=()=>{currentPage=1;render()};
$('prevPage').onclick=()=>{if(currentPage>1){currentPage--;render();scrollTo({top:0,behavior:'smooth'})}};
$('nextPage').onclick=()=>{currentPage++;render();scrollTo({top:0,behavior:'smooth'})};
render();
</script>'''
pattern=r'const PAGE_SIZE=50;.*?\nrender\(\);\n</script>'
s,n=re.subn(pattern,lambda m:core,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'Motore core sostituito {n} volte')

# Sanity check sul risultato.
required=[
    'id="editInLibrary"',
    "currentView='home'",
    "currentView==='library')f=f.filter(isInLibrary)",
    'data-author-letter',
    'id="categoryFilter"',
    'class="series-row"',
    'data-series-note',
    '↗ Apri scheda',
    'max-width:1650px'
]
for marker in required:
    if marker not in s:
        raise SystemExit('Marker mancante dopo patch: '+marker)
if s==original:
    raise SystemExit('La patch non ha modificato index.html')
p.write_text(s,encoding='utf-8')
print('PATCH_OK',len(original),len(s))
