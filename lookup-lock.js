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
      .physical-library-check{grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:8px 0 2px;font-size:12px;color:#2d251f}
      .physical-library-check input{width:auto;accent-color:#607e56}
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

  /* Stato privato: indica se il volume esiste fisicamente nella libreria.
     Il campo vive solo nella scheda/modulo e non viene renderizzato nella pagina principale. */
  let physical=document.getElementById('editPhysicalOwned');
  if(!physical){
    const grid=document.getElementById('editRating')?.closest('.edit-grid');
    const readCheck=document.getElementById('editRead')?.closest('.edit-check');
    if(grid){
      const label=document.createElement('label');
      label.className='physical-library-check';
      label.innerHTML='<input id="editPhysicalOwned" type="checkbox"> Presente fisicamente nella mia libreria';
      if(readCheck&&readCheck.parentElement===grid)grid.insertBefore(label,readCheck);else grid.appendChild(label);
      physical=document.getElementById('editPhysicalOwned');
    }
  }

  /* Estende la scheda completa anche quando viene riaperto un libro già salvato. */
  if(physical&&typeof fillDialog==='function'&&!fillDialog.__physicalOwnedV1){
    const previousFillDialog=fillDialog;
    const wrappedFillDialog=function(b={}){
      previousFillDialog(b);
      physical.checked=b.physicalOwned===true;
    };
    wrappedFillDialog.__physicalOwnedV1=true;
    fillDialog=wrappedFillDialog;
  }

  /* Salva la spunta sia in aggiunta sia in modifica, senza mostrarla nella card principale. */
  const form=document.getElementById('editForm');
  if(physical&&form&&form.onsubmit&&!form.onsubmit.__physicalOwnedV1){
    const previousSubmit=form.onsubmit;
    const wrappedSubmit=async function(e){
      const modeBefore=typeof dialogMode!=='undefined'?dialogMode:'edit';
      const idBefore=typeof editingId!=='undefined'?editingId:null;
      const physicalBefore=!!physical.checked;
      const result=await previousSubmit.call(form,e);
      /* Se il modulo è ancora aperto, il salvataggio precedente non si è concluso
         (ad esempio perché è aperto il selettore dei risultati). */
      if(dialog.open)return result;
      if(modeBefore==='add'){
        if(Array.isArray(books)&&books[0]){books[0].physicalOwned=physicalBefore;saveBooks();render()}
      }else{
        const b=Array.isArray(books)?books.find(x=>x.id==idBefore):null;
        if(b){b.physicalOwned=physicalBefore;saveBooks();render()}
      }
      return result
    };
    wrappedSubmit.__physicalOwnedV1=true;
    form.onsubmit=wrappedSubmit;
  }

  /* Il vecchio pulsante "Modifica" apre già lo stesso dialog completo: lo rinominiamo
     in modo esplicito e continuiamo ad applicare l'etichetta dopo ogni render. */
  function labelBookOpenButtons(){
    document.querySelectorAll('[data-edit]').forEach(btn=>{
      btn.textContent='↗ Apri scheda';
      btn.title='Riapri la scheda completa del libro';
    });
  }
  const list=document.getElementById('list');
  if(list){new MutationObserver(labelBookOpenButtons).observe(list,{childList:true,subtree:true});labelBookOpenButtons()}

  new MutationObserver(()=>{
    if(dialog.hasAttribute('open')&&typeof dialogMode!=='undefined'&&dialogMode==='edit'){
      const title=document.getElementById('dialogTitle');if(title)title.textContent='Scheda del libro';
    }
  }).observe(dialog,{attributes:true,attributeFilter:['open']});

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