(()=>{
function ready(){try{return typeof books!=='undefined'&&typeof saveBooks==='function'&&typeof fillDialog==='function'&&document.getElementById('editDialog')}catch(e){return false}}
function boot(){
  if(!ready()){setTimeout(boot,80);return}
  if(document.getElementById('editIsbn'))return;
  const $x=id=>document.getElementById(id);
  let searchTimer=null,searchToken=0,lastSearchedIsbn='',draftCoverWasAuto=false;

  const style=document.createElement('style');
  style.textContent=`
  .isbn-hint{font-size:10px;color:#75685d;line-height:1.4;margin-top:2px}
  .cover-draft{display:grid;grid-template-columns:105px 1fr;gap:14px;align-items:center;border:1px dashed #d3bda5;border-radius:10px;padding:11px;background:rgba(255,255,255,.18)}
  .cover-preview{width:95px;aspect-ratio:2/3;object-fit:cover;border-radius:5px;background:#ddcbb8;box-shadow:0 3px 9px rgba(82,56,35,.14)}
  .cover-preview-empty{width:95px;aspect-ratio:2/3;display:grid;place-items:center;text-align:center;padding:8px;border-radius:5px;background:#ddcbb8;color:#806f60;font-size:9px}
  .cover-draft strong{display:block;font-size:11px;font-weight:500;margin-bottom:5px}.cover-search-status{font-size:10px;line-height:1.45;color:#75685d}
  .cover-picker-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(50,39,30,.38);backdrop-filter:blur(2px)}
  .cover-picker-overlay.open{display:flex}.cover-picker{width:min(760px,100%);max-height:86vh;overflow:auto;background:#fbf4e9;border:1px solid #d6bea5;border-radius:15px;box-shadow:0 24px 70px rgba(55,38,26,.34);padding:20px;color:#2d251f;font-family:"Segoe Print","Bradley Hand","Comic Sans MS",cursive}
  .cover-picker h3{font-size:20px;font-weight:500;margin:0 0 5px}.cover-picker p{font-size:11px;color:#75685d;margin:0 0 14px}.cover-choice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
  .cover-choice{border:1px solid #d7c1aa;border-radius:9px;background:#fff9f0;padding:8px;cursor:pointer;font:inherit;color:#2d251f}.cover-choice:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(82,56,35,.12)}.cover-choice img{width:100%;height:190px;object-fit:contain;display:block;background:#efe3d4;border-radius:5px}.cover-choice span{display:block;font-size:9px;margin-top:6px;text-align:center;color:#75685d}.cover-picker-actions{display:flex;justify-content:flex-end;margin-top:14px}
  @media(max-width:620px){.cover-draft{grid-template-columns:80px 1fr}.cover-preview,.cover-preview-empty{width:74px}.cover-choice-grid{grid-template-columns:repeat(2,1fr)}.cover-choice img{height:160px}}
  `;
  document.head.appendChild(style);

  const ratingField=$x('editRating').closest('.edit-field');
  const isbnField=document.createElement('div');
  isbnField.className='edit-field';
  isbnField.innerHTML=`<label for="editIsbn">ISBN</label><input id="editIsbn" inputmode="text" autocomplete="off" placeholder="ISBN-10 o ISBN-13"><div class="isbn-hint">Se la copertina è vuota, verrà cercata automaticamente tramite ISBN.</div>`;
  ratingField.parentNode.insertBefore(isbnField,ratingField);

  const coverField=$x('editCover').closest('.edit-field');
  const previewField=document.createElement('div');
  previewField.className='edit-field full';
  previewField.innerHTML=`<div class="cover-draft"><div id="coverPreviewBox"><div class="cover-preview-empty">Nessuna copertina</div></div><div><strong>Copertina nella bozza</strong><div class="cover-search-status" id="coverSearchStatus">Inserisci l'ISBN: se non hai indicato una copertina, la cercherò automaticamente.</div></div></div>`;
  coverField.insertAdjacentElement('afterend',previewField);

  const overlay=document.createElement('div');
  overlay.className='cover-picker-overlay';overlay.id='coverPickerOverlay';overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<section class="cover-picker" role="dialog" aria-modal="true" aria-labelledby="coverPickerTitle"><h3 id="coverPickerTitle">Scegli la copertina</h3><p id="coverPickerText"></p><div class="cover-choice-grid" id="coverChoices"></div><div class="cover-picker-actions"><button class="dialog-btn" id="closeCoverPicker" type="button">Nessuna di queste</button></div></section>`;
  document.body.appendChild(overlay);

  function normalizeIsbn(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
  function validIsbn(v){const n=normalizeIsbn(v);return n.length===10||n.length===13}
  function secureUrl(u){return String(u||'').replace(/^http:/i,'https:')}
  function setStatus(msg){$x('coverSearchStatus').textContent=msg}
  function showPreview(url){
    const box=$x('coverPreviewBox');box.innerHTML='';
    if(!url){box.innerHTML='<div class="cover-preview-empty">Nessuna copertina</div>';return}
    const img=document.createElement('img');img.className='cover-preview';img.alt='Anteprima copertina';img.src=url;
    img.onerror=()=>{box.innerHTML='<div class="cover-preview-empty">Copertina non disponibile</div>'};box.appendChild(img);
  }
  function setDraftCover(url,automatic=true){$x('editCover').value=secureUrl(url);draftCoverWasAuto=automatic;showPreview($x('editCover').value)}
  function hidePicker(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');$x('coverChoices').innerHTML=''}
  function showPicker(covers,isbn){
    $x('coverPickerText').textContent=`Ho trovato ${covers.length} copertine per l'ISBN ${isbn}. Seleziona quella corretta.`;
    $x('coverChoices').innerHTML='';
    covers.forEach((c,i)=>{
      const btn=document.createElement('button');btn.type='button';btn.className='cover-choice';
      btn.innerHTML=`<img src="${c.url}" alt="Copertina ${i+1}"><span>${c.source}</span>`;
      btn.onclick=()=>{setDraftCover(c.url,true);setStatus('Copertina selezionata. Ora è visibile nella bozza del libro.');hidePicker()};
      $x('coverChoices').appendChild(btn);
    });
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
  }
  function imageWorks(url){return new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish(false),4500);img.onload=()=>finish(img.naturalWidth>20&&img.naturalHeight>20);img.onerror=()=>finish(false);img.src=url})}
  function pushCandidate(list,seen,url,source){url=secureUrl(url);if(!url||seen.has(url))return;seen.add(url);list.push({url,source})}

  async function fetchCoverCandidates(isbn){
    const list=[],seen=new Set();let openLibraryFound=false;
    const tasks=[];
    tasks.push(fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=10`).then(r=>r.ok?r.json():null).then(data=>{
      (data?.items||[]).forEach(item=>{const l=item.volumeInfo?.imageLinks||{};const u=l.extraLarge||l.large||l.medium||l.small||l.thumbnail||l.smallThumbnail;if(u)pushCandidate(list,seen,u,'Google Books')})
    }).catch(()=>{}));
    tasks.push(fetch(`https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(isbn)}&fields=cover_i&limit=10`).then(r=>r.ok?r.json():null).then(data=>{
      (data?.docs||[]).forEach(d=>{if(d.cover_i){openLibraryFound=true;pushCandidate(list,seen,`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,'Open Library')}})
    }).catch(()=>{}));
    tasks.push(fetch(`https://openlibrary.org/api/volumes/brief/isbn/${encodeURIComponent(isbn)}.json`).then(r=>r.ok?r.json():null).then(data=>{
      (data?.items||[]).forEach(item=>{const u=item.cover?.large||item.cover?.medium||item.cover?.small;if(u){openLibraryFound=true;pushCandidate(list,seen,u,'Open Library')}})
    }).catch(()=>{}));
    await Promise.all(tasks);
    if(!openLibraryFound)pushCandidate(list,seen,`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`,'Open Library');
    const checked=await Promise.all(list.slice(0,12).map(async c=>(await imageWorks(c.url))?c:null));
    return checked.filter(Boolean);
  }

  async function searchCovers(force=false){
    const isbn=normalizeIsbn($x('editIsbn').value);
    if(!validIsbn(isbn)){if($x('editIsbn').value.trim())setStatus('ISBN incompleto: inserisci un ISBN-10 o ISBN-13.');return {kind:'invalid',count:0}}
    if($x('editCover').value.trim()&&!force)return {kind:'already',count:1};
    if(!force&&lastSearchedIsbn===isbn)return {kind:'done',count:0};
    const token=++searchToken;lastSearchedIsbn=isbn;setStatus('Sto cercando la copertina tramite ISBN…');
    const covers=await fetchCoverCandidates(isbn);
    if(token!==searchToken||normalizeIsbn($x('editIsbn').value)!==isbn)return {kind:'stale',count:0};
    if(!covers.length){setStatus('Non ho trovato una copertina per questo ISBN. Puoi lasciare il libro senza copertina oppure inserire un URL manualmente.');return {kind:'none',count:0}}
    if(covers.length===1){setDraftCover(covers[0].url,true);setStatus('Ho trovato una copertina e l’ho inserita automaticamente nella bozza.');return {kind:'single',count:1}}
    setStatus(`Ho trovato ${covers.length} copertine: scegli quella corretta nel riquadro aperto sopra la pagina.`);showPicker(covers,isbn);return {kind:'multiple',count:covers.length}
  }

  const originalFillDialog=fillDialog;
  fillDialog=function(b={}){originalFillDialog(b);$x('editIsbn').value=b.isbn||'';lastSearchedIsbn='';draftCoverWasAuto=false;showPreview(b.cover||'');setStatus('Inserisci l\'ISBN: se non hai indicato una copertina, la cercherò automaticamente.')};

  const originalSubmit=$x('editForm').onsubmit;
  $x('editForm').onsubmit=async e=>{
    e.preventDefault();
    const modeBefore=dialogMode,idBefore=editingId,isbn=normalizeIsbn($x('editIsbn').value);
    if(!$x('editCover').value.trim()&&validIsbn(isbn)){
      const result=await searchCovers(true);
      if(result.kind==='multiple')return;
    }
    originalSubmit.call($x('editForm'),e);
    if(modeBefore==='add'){
      if(books[0]){books[0].isbn=isbn;saveBooks();render()}
    }else{
      const b=books.find(x=>x.id==idBefore);if(b){b.isbn=isbn;saveBooks();render()}
    }
  };

  $x('editIsbn').addEventListener('input',()=>{
    clearTimeout(searchTimer);lastSearchedIsbn='';searchToken++;
    const isbn=normalizeIsbn($x('editIsbn').value);
    if(draftCoverWasAuto){$x('editCover').value='';draftCoverWasAuto=false;showPreview('')}
    if(!$x('editCover').value.trim()&&validIsbn(isbn))searchTimer=setTimeout(()=>searchCovers(false),650);
    else if(!validIsbn(isbn))setStatus('Inserisci un ISBN-10 o ISBN-13; la ricerca partirà automaticamente quando sarà completo.');
  });
  $x('editIsbn').addEventListener('blur',()=>{clearTimeout(searchTimer);if(!$x('editCover').value.trim()&&validIsbn($x('editIsbn').value))searchCovers(false)});
  $x('editCover').addEventListener('input',()=>{searchToken++;draftCoverWasAuto=false;showPreview($x('editCover').value.trim());if($x('editCover').value.trim())setStatus('Copertina inserita manualmente. La ricerca automatica tramite ISBN non verrà usata.')});
  $x('closeCoverPicker').onclick=()=>{hidePicker();setStatus('Nessuna delle copertine trovate è stata selezionata.')};
  overlay.addEventListener('click',e=>{if(e.target===overlay){hidePicker();setStatus('Scelta copertina chiusa senza selezione.')}});
}
boot();
})();