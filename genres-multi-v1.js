(()=>{
  if(window.__LIB_MULTI_GENRES_V1)return;
  window.__LIB_MULTI_GENRES_V1=true;

  const VERSION=1;
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
  const uniq=arr=>{
    const out=[],seen=new Set();
    for(const raw of arr||[]){const x=clean(raw);if(!x)continue;const k=norm(x);if(k&&!seen.has(k)){seen.add(k);out.push(x)}}
    return out;
  };

  function mappedGenres(text){
    const n=norm(text),out=[];
    if(!n)return out;
    const add=x=>{if(x&&!out.includes(x))out.push(x)};
    if(/\bhorror\b|horror fiction|horror tales|storie dell orrore|racconti dell orrore/.test(n))add('Horror');
    if(/\bgothic\b|gotico|gothic fiction/.test(n))add('Gotico');
    if(/\bparanormal\b/.test(n))add('Paranormale');
    if(/\bsupernatural\b|soprannatural/.test(n))add('Soprannaturale');
    if(/\bthriller\b|thrillers|suspense/.test(n))add('Thriller');
    if(/\bmystery\b|mysteries|\bgiallo\b|\bgialli\b|detective fiction|detective stories/.test(n))add('Giallo');
    if(/\bcrime\b|crime fiction|noir|police procedural|poliziesc/.test(n))add('Crime');
    if(/\bfantasy\b|fantasy fiction/.test(n))add('Fantasy');
    if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');
    if(/\bdystopi/.test(n))add('Distopico');
    if(/\bromance\b|romantic fiction|romanzo rosa|rosa romance/.test(n))add('Romance');
    if(/young adult|ya fiction/.test(n))add('Young Adult');
    if(/juvenile fiction|children s fiction|children fiction|ragazzi|per ragazzi/.test(n))add('Ragazzi');
    if(/\badventure\b|adventure fiction|avventura/.test(n))add('Avventura');
    if(/historical fiction|historical novel|romanzo storico|narrativa storica/.test(n))add('Storico');
    if(/\bhumou?r\b|humorous fiction|comic fiction|umorismo|comico/.test(n))add('Umorismo');
    if(/\bdrama\b|dramatic fiction|drammatic/.test(n))add('Drammatico');
    if(/\bbiograph|autobiograph|memoir|biografia|autobiografia/.test(n))add('Biografia');
    if(/\bpoetry\b|poesia/.test(n))add('Poesia');
    if(/\bessays?\b|saggistica|nonfiction essays/.test(n))add('Saggistica');
    if(!out.length&&/^(?:fiction|narrativa|letteratura|romanzo|novel)$/.test(n))add('Narrativa');
    return out;
  }

  function parseGenreInput(value,{keepUnknown=true}={}){
    const source=Array.isArray(value)?value:[value];
    const out=[];
    for(const raw of source){
      for(const part of String(raw??'').split(/[,;|\n]+/)){
        const x=clean(part);if(!x)continue;
        const mapped=mappedGenres(x);
        if(mapped.length){out.push(...mapped);continue}
        if(keepUnknown){
          const n=norm(x);
          const looksNoise=x.length>60||n.split(' ').length>7||/isbn|ean|editore|publisher|pagine|formato|hotel|alcohol|family|families|death|murder victims|maine|colorado|translations|criticism|bibliography/.test(n);
          if(!looksNoise)out.push(x);
        }
      }
    }
    const list=uniq(out);
    if(list.length>1){
      const i=list.findIndex(x=>norm(x)==='narrativa');if(i>=0)list.splice(i,1);
    }
    return list;
  }

  function bookGenres(book){
    const fromArray=Array.isArray(book?.genres)?book.genres:[];
    const parsed=parseGenreInput(fromArray.length?fromArray:(book?.category||''),{keepUnknown:true});
    return parsed;
  }
  function formatGenres(list){return uniq(list).join(', ')}
  function syncBookGenres(book){
    if(!book||typeof book!=='object')return false;
    const genres=bookGenres(book),joined=formatGenres(genres);
    let changed=false;
    if(JSON.stringify(book.genres||[])!==JSON.stringify(genres)){book.genres=genres;changed=true}
    if(clean(book.category)!==joined){book.category=joined;changed=true}
    return changed;
  }

  function migrateAll(){
    if(typeof books==='undefined'||!Array.isArray(books))return false;
    let changed=false;for(const b of books)changed=syncBookGenres(b)||changed;
    if(changed&&typeof saveBooks==='function')saveBooks();
    return changed;
  }

  function patchTexts(){
    try{if(typeof viewInfo!=='undefined'&&viewInfo?.categories)viewInfo.categories=['Generi',''] }catch(e){}
    const nav=document.querySelector('.links a[data-view="categories"]');if(nav)nav.textContent='Generi';
    const input=document.getElementById('editCategory');if(input){
      const label=input.closest('.edit-field')?.querySelector('label');if(label)label.textContent='Generi';
      input.placeholder='Es. Horror, Thriller, Gotico';
    }
    const hint=document.querySelector('.code-hint');if(hint)hint.textContent=hint.textContent.replace(/categoria/gi,'generi');
  }

  function patchGenreField(){
    const input=document.getElementById('editCategory');if(!input||input.__multiGenreValueGuard)return false;
    const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');if(!desc?.get||!desc?.set)return false;
    input.__multiGenreValueGuard=true;
    Object.defineProperty(input,'value',{
      configurable:true,
      get(){return desc.get.call(this)},
      set(v){desc.set.call(this,formatGenres(parseGenreInput(v,{keepUnknown:true})))}
    });
    input.addEventListener('blur',()=>{const next=formatGenres(parseGenreInput(desc.get.call(input),{keepUnknown:true}));if(next!==desc.get.call(input))desc.set.call(input,next)});
    return true;
  }

  function patchSearch(){
    if(typeof searchableBooks!=='function'||searchableBooks.__multiGenresV1)return false;
    const base=searchableBooks;
    searchableBooks=function(){
      const q=document.getElementById('search')?.value.toLowerCase().trim()||'';
      if(!q)return [...books];
      return books.filter(b=>`${b.title||''} ${b.author||''} ${b.saga||''} ${b.prequel||''} ${b.sequel||''} ${formatGenres(bookGenres(b))} ${b.publisher||''}`.toLowerCase().includes(q));
    };
    searchableBooks.__multiGenresV1=true;searchableBooks.__base=base;
    return true;
  }

  function patchCategoryFilter(){
    if(typeof getFilteredBooks!=='function'||getFilteredBooks.__multiGenresV1)return false;
    const baseGet=getFilteredBooks;
    getFilteredBooks=function(){
      if(typeof currentView==='undefined'||currentView!=='categories')return baseGet.apply(this,arguments);
      const selected=typeof selectedCategory!=='undefined'?selectedCategory:'';
      let list;
      try{
        const prev=selectedCategory;selectedCategory='';list=baseGet.apply(this,arguments);selectedCategory=prev;
      }catch(e){list=typeof searchableBooks==='function'?searchableBooks():[]}
      if(selected)list=list.filter(b=>bookGenres(b).some(g=>norm(g)===norm(selected)));
      if(typeof compareBooksByAuthor==='function')list=[...list].sort(compareBooksByAuthor);
      return list;
    };
    getFilteredBooks.__multiGenresV1=true;getFilteredBooks.__base=baseGet;

    if(typeof renderViewControls==='function'&&!renderViewControls.__multiGenresV1){
      const baseControls=renderViewControls;
      renderViewControls=function(){
        baseControls.apply(this,arguments);
        if(typeof currentView==='undefined'||currentView!=='categories')return;
        const box=document.getElementById('viewControls');if(!box)return;
        const genres=uniq(books.flatMap(bookGenres)).sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));
        if(typeof selectedCategory!=='undefined'&&selectedCategory&&!genres.some(g=>norm(g)===norm(selectedCategory)))selectedCategory='';
        box.innerHTML=`<div class="category-filter-wrap"><label for="categoryFilter">Filtra per genere</label><select class="category-filter" id="categoryFilter"><option value="">Tutti i generi</option>${genres.map(g=>`<option value="${typeof esc==='function'?esc(g):g}" ${selectedCategory===g?'selected':''}>${typeof esc==='function'?esc(g):g}</option>`).join('')}</select></div>`;
        const sel=document.getElementById('categoryFilter');if(sel)sel.onchange=e=>{selectedCategory=e.target.value;currentPage=1;render()};
      };
      renderViewControls.__multiGenresV1=true;renderViewControls.__base=baseControls;
    }
    return true;
  }

  function patchDialog(){
    if(typeof fillDialog!=='function'||fillDialog.__multiGenresV1||!document.getElementById('editCategory'))return false;
    const baseFill=fillDialog;
    fillDialog=function(b={}){baseFill(b);const input=document.getElementById('editCategory');if(input)input.value=formatGenres(bookGenres(b))};
    fillDialog.__multiGenresV1=true;fillDialog.__base=baseFill;

    const form=document.getElementById('editForm');
    if(form&&typeof form.onsubmit==='function'&&!form.onsubmit.__multiGenresV1){
      const baseSubmit=form.onsubmit;
      const wrapped=async function(e){
        const mode=typeof dialogMode!=='undefined'?dialogMode:'edit',id=typeof editingId!=='undefined'?editingId:null;
        const input=document.getElementById('editCategory');
        if(input)input.value=formatGenres(parseGenreInput(input.value,{keepUnknown:true}));
        await baseSubmit.call(this,e);
        const dlg=document.getElementById('editDialog');if(dlg?.open)return;
        const genres=parseGenreInput(input?.value||'',{keepUnknown:true});
        const b=mode==='add'?books?.[0]:books?.find?.(x=>x.id==id);
        if(b){b.genres=genres;b.category=formatGenres(genres);if(typeof saveBooks==='function')saveBooks();if(typeof render==='function')render()}
      };
      wrapped.__multiGenresV1=true;wrapped.__base=baseSubmit;form.onsubmit=wrapped;
    }
    return true;
  }

  function titleMatch(a,b){
    const x=norm(a),y=norm(b);if(!x||!y)return false;
    return x===y||x.includes(y)||y.includes(x);
  }
  function authorMatch(list,author){
    const a=norm(author);if(!a)return true;
    return (list||[]).some(v=>{const n=norm(v);return n===a||n.includes(a)||a.includes(n)});
  }
  function collectFromTexts(values){
    const out=[];for(const v of values||[])out.push(...parseGenreInput(v,{keepUnknown:false}));return uniq(out);
  }
  async function fetchJson(url,timeout=8000){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
    try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(timer)}
  }
  async function lookupGenres(book){
    const title=clean(book?.title),author=clean(book?.author),code=clean(book?.code||book?.isbn||'').replace(/[^0-9Xx]/g,'').toUpperCase();
    const found=[];
    const add=v=>found.push(...collectFromTexts(Array.isArray(v)?v:[v]));
    if(code){
      const g=await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('isbn:'+code)}&maxResults=10&projection=full`);
      for(const item of g?.items||[]){const v=item.volumeInfo||{};if(title&&!titleMatch(v.title||'',title))continue;if(author&&!authorMatch(v.authors,author))continue;add(v.categories||[])}
      const o=await fetchJson(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(code)}&fields=${encodeURIComponent('title,author_name,isbn,subject')}&limit=10`);
      for(const d of o?.docs||[]){if(title&&!titleMatch(d.title||'',title))continue;if(author&&!authorMatch(d.author_name,author))continue;add(d.subject||[])}
    }
    if(!found.length&&title&&author){
      const q=`intitle:"${title}" inauthor:"${author}"`;
      const g=await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&projection=full`);
      for(const item of g?.items||[]){const v=item.volumeInfo||{};if(!titleMatch(v.title||'',title)||!authorMatch(v.authors,author))continue;add(v.categories||[])}
      const o=await fetchJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&fields=${encodeURIComponent('title,author_name,subject')}&limit=10`);
      for(const d of o?.docs||[]){if(!titleMatch(d.title||'',title)||!authorMatch(d.author_name,author))continue;add(d.subject||[])}
    }
    return uniq(found);
  }

  async function enrichSavedGenres(){
    if(typeof books==='undefined'||!Array.isArray(books)||!books.length)return;
    const pending=books.filter(b=>Number(b.genresLookupVersion||0)<VERSION).slice(0,12);
    if(!pending.length)return;
    for(const b of pending){
      try{
        const fetched=await lookupGenres(b),merged=uniq([...bookGenres(b),...fetched]);
        b.genres=merged;b.category=formatGenres(merged);b.genresLookupVersion=VERSION;b.genresLookupAt=Date.now();
      }catch(e){b.genresLookupVersion=VERSION;b.genresLookupAt=Date.now()}
    }
    if(typeof saveBooks==='function')saveBooks();
    if(typeof render==='function')render();
  }

  window.__LIB_BOOK_GENRES=bookGenres;
  window.__LIB_PARSE_GENRES=parseGenreInput;
  window.__LIB_ENRICH_GENRES=enrichSavedGenres;

  function boot(){
    patchTexts();migrateAll();patchSearch();patchCategoryFilter();patchGenreField();patchDialog();
    if(typeof currentView!=='undefined'&&currentView==='categories'&&typeof render==='function')render();
  }
  let tries=0;const timer=setInterval(()=>{tries++;boot();if(document.getElementById('editCategory')&&typeof fillDialog==='function'&&tries>25)clearInterval(timer);if(tries>=100)clearInterval(timer)},120);
  setTimeout(()=>{boot();setTimeout(enrichSavedGenres,900)},0);
})();
