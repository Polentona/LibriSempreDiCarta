(()=>{
if(window.__LIB_LOOKUP_LOCK)return;window.__LIB_LOOKUP_LOCK=true;
function boot(){
  const dialog=document.getElementById('editDialog'),status=document.getElementById('lookupStatus');
  if(!dialog||!status){setTimeout(boot,120);return}

  const cover=document.getElementById('editCover');
  if(cover&&!document.getElementById('manualCoverUpload')){
    const field=cover.closest('.edit-field');
    const style=document.createElement('style');
    style.textContent=`
      .manual-cover-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:7px}
      .manual-cover-btn{border:1px solid #cbb398;background:#f4e5d2;color:#2d251f;border-radius:7px;padding:6px 10px;font:inherit;font-size:10px;cursor:pointer;white-space:nowrap}
      .manual-cover-btn:hover{background:#ead7bf}.manual-cover-btn.secondary{background:#fff8ef}
      .manual-cover-help{font-size:9px;line-height:1.45;color:#75685d;margin-top:4px}
      .manual-cover-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
    `;
    document.head.appendChild(style);

    const tools=document.createElement('div');
    tools.innerHTML=`<div class="manual-cover-tools"><input class="manual-cover-file" id="manualCoverUpload" type="file" accept="image/*"><button class="manual-cover-btn" id="manualCoverChoose" type="button">Scegli immagine dal PC</button><button class="manual-cover-btn secondary" id="manualCoverRemove" type="button">Rimuovi copertina</button></div><div class="manual-cover-help">Se la ricerca automatica non trova la copertina, puoi incollare un URL qui sopra oppure scegliere un’immagine dal tuo computer.</div>`;
    field.appendChild(tools);

    const picker=document.getElementById('manualCoverUpload');
    const choose=document.getElementById('manualCoverChoose');
    const remove=document.getElementById('manualCoverRemove');

    function manualPreview(dataUrl){
      const box=document.getElementById('coverPreviewBox');
      if(!box||!/^data:image\//i.test(dataUrl||''))return;
      box.innerHTML='';
      const img=document.createElement('img');
      img.className='cover-preview';img.alt='Anteprima copertina';img.src=dataUrl;
      box.appendChild(img);
    }

    function imageToCompactDataUrl(file){
      return new Promise((resolve,reject)=>{
        if(!file||!/^image\//i.test(file.type||'')){reject(new Error('Il file scelto non è un’immagine.'));return}
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error('Non riesco a leggere il file scelto.'));
        reader.onload=()=>{
          const img=new Image();
          img.onerror=()=>reject(new Error('L’immagine scelta non è leggibile.'));
          img.onload=()=>{
            const maxW=600,maxH=900;
            const scale=Math.min(1,maxW/Math.max(1,img.naturalWidth),maxH/Math.max(1,img.naturalHeight));
            const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
            const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
            const ctx=canvas.getContext('2d');
            ctx.fillStyle='#fffaf3';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
            let quality=.82,data='';
            do{data=canvas.toDataURL('image/webp',quality);quality-=.08}while(data.length>460000&&quality>=.5);
            if(!/^data:image\/webp/i.test(data))data=canvas.toDataURL('image/jpeg',.78);
            resolve(data)
          };
          img.src=String(reader.result||'')
        };
        reader.readAsDataURL(file)
      })
    }

    choose.onclick=()=>picker.click();
    picker.onchange=async()=>{
      const file=picker.files&&picker.files[0];if(!file)return;
      choose.disabled=true;choose.textContent='Sto preparando l’immagine…';
      try{
        const dataUrl=await imageToCompactDataUrl(file);
        cover.value=dataUrl;
        cover.dispatchEvent(new Event('input',{bubbles:true}));
        manualPreview(dataUrl);
        status.textContent='Copertina caricata manualmente dal PC: non verrà sostituita dalla ricerca automatica.';
        status.className='lookup-status ok';
      }catch(e){
        status.textContent=(e&&e.message)||'Non sono riuscito a caricare questa immagine.';
        status.className='lookup-status warn';
      }finally{
        choose.disabled=false;choose.textContent='Scegli immagine dal PC';
      }
    };
    remove.onclick=()=>{
      picker.value='';cover.value='';cover.dispatchEvent(new Event('input',{bubbles:true}));
      const box=document.getElementById('coverPreviewBox');if(box)box.innerHTML='<div class="cover-preview-empty">Nessuna copertina</div>';
      status.textContent='Copertina rimossa. Puoi cercarla automaticamente, incollare un URL oppure sceglierla dal PC.';
      status.className='lookup-status';
    };

    new MutationObserver(()=>{
      if(dialog.hasAttribute('open')&&/^data:image\//i.test(cover.value||''))setTimeout(()=>manualPreview(cover.value),0)
    }).observe(dialog,{attributes:true,attributeFilter:['open']});
  }

  let locked=false;
  const controls=()=>[...dialog.querySelectorAll('input,textarea,select,button[type="submit"]')];
  function setLocked(on){
    if(on===locked)return;locked=on;
    for(const el of controls()){
      if(on){el.dataset.lookupPrevDisabled=el.disabled?'1':'0';el.disabled=true;el.setAttribute('aria-disabled','true')}
      else if(el.dataset.lookupPrevDisabled!==undefined){el.disabled=el.dataset.lookupPrevDisabled==='1';if(!el.disabled)el.removeAttribute('aria-disabled');delete el.dataset.lookupPrevDisabled}
    }
    dialog.classList.toggle('lookup-locked',on);
  }
  function sync(){const busy=status.classList.contains('busy')||status.classList.contains('lookup-busy')||!!status.querySelector('.lookup-book-spinner');setLocked(busy)}
  new MutationObserver(sync).observe(status,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['class']});
  sync();
}
boot();
})();

/* SERIES_RENAME_UI_V2: modifica inline del nome nella vista "Saghe e trilogie", senza prompt. */
(()=>{
if(window.__LIB_SERIES_RENAME_UI_V2)return;window.__LIB_SERIES_RENAME_UI_V2=true;
const OVERRIDE_KEY='libriDiCarta.seriesNameOverrides.v1';
let overrides={};
try{const saved=JSON.parse(localStorage.getItem(OVERRIDE_KEY));if(saved&&typeof saved==='object'&&!Array.isArray(saved))overrides=saved}catch(e){overrides={}}
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const escRe=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function keyOf(v){try{return typeof sagaKey==='function'?sagaKey(v):clean(v).toLocaleLowerCase('it')}catch(e){return clean(v).toLocaleLowerCase('it')}}
function saveOverrides(){try{localStorage.setItem(OVERRIDE_KEY,JSON.stringify(overrides))}catch(e){console.error('Impossibile salvare i nomi personalizzati delle saghe',e)}}
function applyOverrides(){
  if(typeof books==='undefined'||!Array.isArray(books))return false;
  let changed=false;
  for(const b of books){const forced=clean(overrides[String(b.id)]);if(forced&&clean(b.saga)!==forced){b.saga=forced;changed=true}}
  return changed
}
function renameTitlePrefix(title,oldName,newName){
  const t=clean(title);if(!t||!oldName)return t;
  if(norm(t)===norm(oldName))return newName;
  const start=new RegExp('^\\s*'+escRe(oldName)+'\\s*(?:[.:-]|[-–—])\\s*','i');
  if(start.test(t))return t.replace(start,newName+'. ');
  const end=new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+escRe(oldName)+'\\s*$','i');
  if(end.test(t)){const novel=t.replace(end,'').trim();return novel?newName+'. '+novel:t}
  return t
}
function renameSeries(oldKey,newName){
  newName=clean(newName);if(!newName||typeof books==='undefined'||!Array.isArray(books))return {ok:false,reason:'empty'};
  const members=books.filter(b=>keyOf(b.saga)===oldKey);if(!members.length)return {ok:false,reason:'missing'};
  const oldName=clean(members[0].saga),newKey=keyOf(newName);
  if(norm(oldName)===norm(newName)&&oldName===newName)return {ok:true,unchanged:true};
  if(newKey!==oldKey&&books.some(b=>!members.includes(b)&&keyOf(b.saga)===newKey))return {ok:false,reason:'duplicate'};
  for(const b of members){
    b.title=renameTitlePrefix(b.title,oldName,newName);
    b.saga=newName;
    b.relationsLookupAt=Date.now();
    b.relationsLookupVersion=Math.max(10,Number(b.relationsLookupVersion)||0);
    overrides[String(b.id)]=newName;
  }
  if(typeof seriesNotes!=='undefined'&&seriesNotes&&newKey!==oldKey){
    const oldNote=String(seriesNotes[oldKey]||'').trim();
    if(oldNote&&!String(seriesNotes[newKey]||'').trim())seriesNotes[newKey]=seriesNotes[oldKey];
    delete seriesNotes[oldKey];
    if(typeof saveSeriesNotes==='function')saveSeriesNotes();
  }
  if(typeof seriesOffsets!=='undefined'&&newKey!==oldKey){
    if(seriesOffsets[oldKey]!=null&&seriesOffsets[newKey]==null)seriesOffsets[newKey]=seriesOffsets[oldKey];
    delete seriesOffsets[oldKey];
  }
  saveOverrides();
  if(typeof saveBooks==='function')saveBooks();
  if(typeof render==='function')render();
  return {ok:true}
}
function titleText(title){
  if(!title)return'';
  const node=[...title.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&clean(n.textContent));
  return clean(node?.textContent||title.dataset.seriesName||'')
}
function decorate(){
  document.querySelectorAll('.series-row').forEach(row=>{
    const title=row.querySelector('.series-name');if(!title||title.querySelector('.series-name-input')||title.querySelector('.series-rename-btn'))return;
    const keyButton=row.querySelector('[data-series-key]');if(!keyButton)return;
    const encoded=keyButton.dataset.seriesKey||'';
    title.dataset.seriesName=titleText(title)||clean(books.find(b=>keyOf(b.saga)===decodeURIComponent(encoded))?.saga||'');
    const btn=document.createElement('button');
    btn.type='button';btn.className='series-rename-btn';btn.dataset.seriesRename=encoded;btn.title='Modifica nome della saga';btn.setAttribute('aria-label','Modifica nome della saga');btn.textContent='✎';
    title.appendChild(btn)
  })
}
function installStyle(){
  if(document.getElementById('seriesRenameStyle'))return;
  const style=document.createElement('style');style.id='seriesRenameStyle';
  style.textContent=`
    .series-name .series-rename-btn{margin-left:9px;vertical-align:3px;border:1px solid #bca58d;background:#f7ead9;color:#4f4339;border-radius:6px;width:27px;height:25px;padding:0;font:16px/1 Arial,sans-serif;cursor:pointer;text-transform:none;box-shadow:0 2px 5px rgba(82,56,35,.08)}
    .series-name .series-rename-btn:hover{background:#ead7bf}.series-name .series-rename-btn:focus-visible{outline:2px solid #607e56;outline-offset:2px}
    .series-name.series-name-editing{display:flex;align-items:center;max-width:100%;border-bottom:0;margin-bottom:5px}
    .series-name-input{width:min(100%,430px);min-width:170px;border:0;border-bottom:2px solid #6f6155;background:rgba(255,250,243,.8);color:inherit;border-radius:0;padding:1px 4px 2px;font:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;text-transform:none;outline:none}
    .series-name-input:focus{border-bottom-color:#607e56;background:#fffaf3}
    .series-name-input.series-name-input-error{border-bottom-color:#a84f43;background:#fff1ee}
    .series-rename-hint{display:block;margin-top:4px;font:9px/1.3 Arial,sans-serif;font-style:normal;font-weight:400;text-transform:none;color:#75685d}
    .series-rename-hint.error{color:#9b4138}
  `;
  document.head.appendChild(style)
}
function startInlineEdit(btn){
  const row=btn.closest('.series-row'),title=row?.querySelector('.series-name');if(!row||!title||title.querySelector('.series-name-input'))return;
  const oldKey=decodeURIComponent(btn.dataset.seriesRename||'');
  const current=clean(title.dataset.seriesName)||clean(books.find(b=>keyOf(b.saga)===oldKey)?.saga||'');
  title.classList.add('series-name-editing');
  title.textContent='';
  const input=document.createElement('input');input.type='text';input.className='series-name-input';input.value=current;input.setAttribute('aria-label','Nome della saga');input.autocomplete='off';
  const hint=document.createElement('span');hint.className='series-rename-hint';hint.textContent='Invio per salvare · Esc per annullare';
  title.append(input,hint);
  let finished=false;
  const cancel=()=>{if(finished)return;finished=true;if(typeof render==='function')render()};
  const save=()=>{
    if(finished)return;
    const value=clean(input.value);
    input.classList.remove('series-name-input-error');hint.classList.remove('error');
    if(!value){input.classList.add('series-name-input-error');hint.classList.add('error');hint.textContent='Il nome non può essere vuoto';input.focus();return}
    const result=renameSeries(oldKey,value);
    if(result?.ok){finished=true;if(result.unchanged&&typeof render==='function')render();return}
    if(result?.reason==='duplicate'){
      input.classList.add('series-name-input-error');hint.classList.add('error');hint.textContent='Esiste già una saga con questo nome';input.focus();input.select();return
    }
    cancel()
  };
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();save()}
    else if(e.key==='Escape'){e.preventDefault();cancel()}
  });
  input.addEventListener('blur',()=>{setTimeout(()=>{if(!finished&&document.activeElement!==input)save()},0)});
  input.focus();input.select()
}
function bootRename(){
  const list=document.getElementById('list');if(!list){setTimeout(bootRename,120);return}
  installStyle();applyOverrides();
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-series-rename]');if(!btn)return;
    e.preventDefault();e.stopPropagation();startInlineEdit(btn)
  },true);
  new MutationObserver(()=>decorate()).observe(list,{childList:true,subtree:true});
  decorate();
  if(typeof saveBooks==='function'&&!saveBooks.__seriesOverrideWrapped){
    const original=saveBooks;
    saveBooks=function(){applyOverrides();return original()};
    saveBooks.__seriesOverrideWrapped=true;
  }
  const form=document.getElementById('editForm');
  if(form&&!form.__seriesOverrideCapture){
    form.__seriesOverrideCapture=true;
    form.addEventListener('submit',()=>{
      try{
        if(typeof dialogMode==='undefined'||dialogMode!=='edit'||editingId==null)return;
        const sagaInput=document.getElementById('editSaga');if(!sagaInput)return;
        const value=clean(sagaInput.value);if(value)overrides[String(editingId)]=value;else delete overrides[String(editingId)];saveOverrides()
      }catch(e){}
    },true)
  }
}
bootRename();
})();
