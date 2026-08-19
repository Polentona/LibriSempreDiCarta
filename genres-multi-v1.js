(()=>{
  if(window.__LIB_MULTI_GENRES_V3)return;
  window.__LIB_MULTI_GENRES_V3=true;

  const VERSION=3;
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
  const uniq=arr=>{const out=[],seen=new Set();for(const raw of arr||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};
  const GENERIC=new Set(['fiction','narrativa','letteratura','romanzo','novel','books','libri']);
  const AUDIENCE=new Set(['young adult','ya','ragazzi','libri per ragazzi','per ragazzi','juvenile fiction','children fiction','children s fiction','teen','teen fiction','adolescenti']);
  let selectedGenres=[];

  const VERIFIED_GENRES=[
    {
      author:'Alexandra Adornetto',saga:'Rebel',titles:['Rebel','Sacrifice','Heaven'],
      genres:['Urban Fantasy','Paranormal Romance'],
      source:'Fonti bibliografiche e classificazioni editoriali verificate',verified:'2026-08-19'
    },
    {
      author:'Stephen King',titles:['Shining'],
      genres:['Horror','Gotico','Paranormale','Thriller'],
      source:'Penguin Random House · Related Genres',verified:'2026-08-19'
    },
    {
      author:'Kerstin Gier',titles:['Blue'],
      genres:['Fantasy','Paranormale','Romance','Viaggi nel tempo'],
      source:'Google Books · Subjects',verified:'2026-08-19'
    }
  ];

  function isGenericOrAudience(v){const n=norm(v);return GENERIC.has(n)||AUDIENCE.has(n)}
  function mappedGenres(text){
    const n=norm(text),out=[];if(!n||isGenericOrAudience(n))return out;
    const add=x=>{if(x&&!out.includes(x))out.push(x)};
    const urban=/\burban fantasy\b/.test(n);
    const paranormalRomance=/\bparanormal(?:\s+and\s+fantasy)?\s+romance\b|\bromance\s+paranormal\b/.test(n);
    const psychologicalHorror=/psychological horror|horror psicologico|terrore psicologico/.test(n);
    const supernaturalHorror=/supernatural horror|horror soprannaturale|orrore soprannaturale/.test(n);
    if(urban)add('Urban Fantasy');
    if(paranormalRomance)add('Paranormal Romance');
    if(psychologicalHorror)add('Horror psicologico');
    if(supernaturalHorror)add('Horror soprannaturale');
    if(/gothic\s*(?:and|&)\s*horror/.test(n)){add('Horror');add('Gotico')}
    if(/\bhorror\b|horror fiction|horror tales|storie dell orrore|racconti dell orrore/.test(n)&&!psychologicalHorror&&!supernaturalHorror)add('Horror');
    if(/\bgothic\b|gotico|gothic fiction/.test(n))add('Gotico');
    if(/paranormal fiction|\bparanormal\b/.test(n)&&!paranormalRomance)add('Paranormale');
    if(/\bsupernatural\b|soprannatural/.test(n)&&!supernaturalHorror)add('Soprannaturale');
    if(/\bthriller\b|thrillers|suspense/.test(n))add('Thriller');
    if(/\bmystery\b|mysteries|\bgiallo\b|\bgialli\b|detective fiction|detective stories/.test(n))add('Giallo');
    if(/\bcrime\b|crime fiction|noir|police procedural|poliziesc/.test(n))add('Crime');
    if(/\bfantasy\b|fantasy fiction/.test(n)&&!urban)add('Fantasy');
    if(/science fiction|sci fi|fantascienza/.test(n))add('Fantascienza');
    if(/\bdystopi/.test(n))add('Distopico');
    if(/\bromance\b|romantic fiction|romanzo rosa/.test(n)&&!paranormalRomance)add('Romance');
    if(/time travel|viaggi? nel tempo|viaggi? temporali?/.test(n))add('Viaggi nel tempo');
    if(/\badventure\b|adventure fiction|avventura/.test(n))add('Avventura');
    if(/historical fiction|historical novel|romanzo storico|narrativa storica/.test(n))add('Storico');
    if(/\bhumou?r\b|humorous fiction|comic fiction|umorismo|comico/.test(n))add('Umorismo');
    if(/\bdrama\b|dramatic fiction|drammatic/.test(n))add('Drammatico');
    if(/\bbiograph|autobiograph|memoir|biografia|autobiografia/.test(n))add('Biografia');
    if(/\bpoetry\b|poesia/.test(n))add('Poesia');
    if(/\bessays?\b|saggistica|nonfiction essays/.test(n))add('Saggistica');
    return out;
  }

  function parseGenreInput(value,{keepUnknown=true}={}){
    const source=Array.isArray(value)?value:[value],out=[];
    for(const raw of source){
      for(const part of String(raw??'').split(/[,;|\/\n]+/)){
        const x=clean(part);if(!x||isGenericOrAudience(x))continue;
        const mapped=mappedGenres(x);if(mapped.length){out.push(...mapped);continue}
        if(keepUnknown){const n=norm(x),noise=x.length>60||n.split(' ').length>7||/isbn|ean|editore|publisher|pagine|formato|hotel|alcohol|family|families|death|murder victims|maine|colorado|translations|criticism|bibliography/.test(n);if(!noise)out.push(x)}
      }
    }
    return uniq(out).filter(x=>!isGenericOrAudience(x));
  }

  function titleEquivalent(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||x.endsWith(' '+y)||y.endsWith(' '+x)||x.startsWith(y+' ')||y.startsWith(x+' '))}
  function verifiedGenres(book){
    const a=norm(book?.author),t=clean(book?.title),s=norm(book?.saga);if(!a||!t)return[];
    for(const rule of VERIFIED_GENRES){
      if(norm(rule.author)!==a)continue;
      if(rule.saga&&s&&norm(rule.saga)!==s)continue;
      if((rule.titles||[]).some(x=>titleEquivalent(t,x)))return [...rule.genres];
    }
    return [];
  }
  function bookGenres(book){
    const src=Array.isArray(book?.genres)&&book.genres.length?book.genres:(book?.category||'');
    const saved=parseGenreInput(src,{keepUnknown:true}),verified=verifiedGenres(book);
    return verified.length?verified:saved;
  }
  function formatGenres(list){return uniq(list).filter(x=>!isGenericOrAudience(x)).join(', ')}
  function syncBookGenres(book){
    if(!book||typeof book!=='object')return false;
    const genres=bookGenres(book);let changed=false;
    if(JSON.stringify(book.genres||[])!==JSON.stringify(genres)){book.genres=genres;changed=true}
    if(Object.prototype.hasOwnProperty.call(book,'category')){delete book.category;changed=true}
    return changed;
  }
  function migrateAll(){if(typeof books==='undefined'||!Array.isArray(books))return false;let changed=false;for(const b of books)changed=syncBookGenres(b)||changed;if(changed&&typeof saveBooks==='function')saveBooks();return changed}

  function installStyle(){
    if(document.getElementById('multiGenreV3Style'))return;
    const style=document.createElement('style');style.id='multiGenreV3Style';style.textContent=`
      .genre-filter{position:relative;width:min(360px,100%)}
      .genre-filter-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #d4bea7;border-radius:8px;background:#fff8ef;color:var(--ink);padding:8px 11px;font:inherit;font-size:12px;cursor:pointer;text-align:left}
      .genre-filter-btn:after{content:'⌄';font-family:Arial,sans-serif;font-size:14px}
      .genre-filter-menu{position:absolute;z-index:20;left:0;top:calc(100% + 5px);width:100%;max-height:310px;overflow:auto;border:1px solid #d4bea7;border-radius:9px;background:#fffaf3;box-shadow:0 10px 28px rgba(82,56,35,.16);padding:7px;display:none}
      .genre-filter.open .genre-filter-menu{display:block}.genre-filter-option{display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:6px;font-size:11px;cursor:pointer}.genre-filter-option:hover{background:#f3e4d1}.genre-filter-option input{accent-color:#607e56}
      .genre-filter-reset{width:100%;border:0;background:transparent;color:#75685d;text-align:left;padding:6px 7px;font:inherit;font-size:10px;cursor:pointer;border-bottom:1px solid #eadbc9;margin-bottom:4px}.genre-filter-reset:hover{color:var(--ink)}
    `;document.head.appendChild(style)
  }
  function patchTexts(){
    try{if(typeof viewInfo!=='undefined'&&viewInfo?.categories)viewInfo.categories=['Generi','']}catch(e){}
    const nav=document.querySelector('.links a[data-view="categories"]');if(nav)nav.textContent='Generi';
    const input=document.getElementById('editCategory');if(input){const label=input.closest('.edit-field')?.querySelector('label');if(label)label.textContent='Generi';input.placeholder='Es. Urban Fantasy, Paranormal Romance'}
    const hint=document.querySelector('.code-hint');if(hint)hint.textContent=hint.textContent.replace(/categoria/gi,'generi');
  }
  function patchGenreField(){
    const input=document.getElementById('editCategory');if(!input||input.__multiGenreV3Guard)return false;
    const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');if(!desc?.get||!desc?.set)return false;
    input.__multiGenreV3Guard=true;Object.defineProperty(input,'value',{configurable:true,get(){return desc.get.call(this)},set(v){desc.set.call(this,formatGenres(parseGenreInput(v,{keepUnknown:true})))}});
    input.addEventListener('blur',()=>{const next=formatGenres(parseGenreInput(desc.get.call(input),{keepUnknown:true}));if(next!==desc.get.call(input))desc.set.call(input,next)});return true;
  }
  function patchSaveBooks(){if(typeof saveBooks!=='function'||saveBooks.__multiGenreV3)return false;const base=saveBooks;saveBooks=function(){if(typeof books!=='undefined'&&Array.isArray(books))for(const b of books)syncBookGenres(b);return base()};saveBooks.__multiGenreV3=true;return true}
  function patchSearch(){if(typeof searchableBooks!=='function'||searchableBooks.__multiGenreV3)return false;const base=searchableBooks;searchableBooks=function(){const q=document.getElementById('search')?.value.toLowerCase().trim()||'';if(!q)return [...books];return books.filter(b=>`${b.title||''} ${b.author||''} ${b.saga||''} ${b.prequel||''} ${b.sequel||''} ${formatGenres(bookGenres(b))} ${b.publisher||''}`.toLowerCase().includes(q))};searchableBooks.__multiGenreV3=true;return true}

  function genreButtonText(){if(!selectedGenres.length)return'Tutti i generi';if(selectedGenres.length===1)return selectedGenres[0];if(selectedGenres.length===2)return selectedGenres.join(' + ');return `${selectedGenres.length} generi selezionati`}
  function renderGenreControl(box){
    const genres=uniq(books.flatMap(bookGenres)).filter(x=>!isGenericOrAudience(x)).sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));
    selectedGenres=selectedGenres.filter(s=>genres.some(g=>norm(g)===norm(s)));
    box.innerHTML=`<div class="genre-filter" id="genreFilter"><button class="genre-filter-btn" id="genreFilterBtn" type="button">${typeof esc==='function'?esc(genreButtonText()):genreButtonText()}</button><div class="genre-filter-menu" id="genreFilterMenu"><button class="genre-filter-reset" id="genreFilterReset" type="button">Tutti i generi</button>${genres.map(g=>`<label class="genre-filter-option"><input type="checkbox" data-genre-filter="${typeof esc==='function'?esc(g):g}" ${selectedGenres.some(s=>norm(s)===norm(g))?'checked':''}><span>${typeof esc==='function'?esc(g):g}</span></label>`).join('')}</div></div>`;
    const root=document.getElementById('genreFilter'),btn=document.getElementById('genreFilterBtn');if(btn)btn.onclick=e=>{e.stopPropagation();root?.classList.toggle('open')};
    document.querySelectorAll('[data-genre-filter]').forEach(cb=>cb.onchange=()=>{const g=cb.dataset.genreFilter||'';if(cb.checked){if(!selectedGenres.some(x=>norm(x)===norm(g)))selectedGenres.push(g)}else selectedGenres=selectedGenres.filter(x=>norm(x)!==norm(g));currentPage=1;render()});
    const reset=document.getElementById('genreFilterReset');if(reset)reset.onclick=()=>{selectedGenres=[];currentPage=1;render()};
  }
  function patchGenreFilter(){
    if(typeof getFilteredBooks!=='function'||getFilteredBooks.__multiGenreV3)return false;
    const baseGet=getFilteredBooks;getFilteredBooks=function(){if(typeof currentView==='undefined'||currentView!=='categories')return baseGet.apply(this,arguments);let list;try{const prev=selectedCategory;selectedCategory='';list=baseGet.apply(this,arguments);selectedCategory=prev}catch(e){list=typeof searchableBooks==='function'?searchableBooks():[]}if(selectedGenres.length)list=list.filter(b=>{const gs=bookGenres(b);return selectedGenres.every(sel=>gs.some(g=>norm(g)===norm(sel)))});if(typeof compareBooksByAuthor==='function')list=[...list].sort(compareBooksByAuthor);return list};getFilteredBooks.__multiGenreV3=true;
    if(typeof renderViewControls==='function'&&!renderViewControls.__multiGenreV3){const baseControls=renderViewControls;renderViewControls=function(){baseControls.apply(this,arguments);if(typeof currentView==='undefined'||currentView!=='categories')return;const box=document.getElementById('viewControls');if(box)renderGenreControl(box)};renderViewControls.__multiGenreV3=true}
    if(!document.__multiGenreV3OutsideClick){document.__multiGenreV3OutsideClick=true;document.addEventListener('click',e=>{const root=document.getElementById('genreFilter');if(root&&!root.contains(e.target))root.classList.remove('open')})}return true;
  }
  function patchDialog(){
    if(typeof fillDialog!=='function'||fillDialog.__multiGenreV3||!document.getElementById('editCategory'))return false;
    const baseFill=fillDialog;fillDialog=function(b={}){baseFill(b);const input=document.getElementById('editCategory');if(input)input.value=formatGenres(bookGenres(b))};fillDialog.__multiGenreV3=true;
    const form=document.getElementById('editForm');if(form&&typeof form.onsubmit==='function'&&!form.onsubmit.__multiGenreV3){const baseSubmit=form.onsubmit;const wrapped=async function(e){const mode=typeof dialogMode!=='undefined'?dialogMode:'edit',id=typeof editingId!=='undefined'?editingId:null,input=document.getElementById('editCategory');if(input)input.value=formatGenres(parseGenreInput(input.value,{keepUnknown:true}));await baseSubmit.call(this,e);const dlg=document.getElementById('editDialog');if(dlg?.open)return;const b=mode==='add'?books?.[0]:books?.find?.(x=>x.id==id),verified=b?verifiedGenres(b):[];if(b){b.genres=verified.length?verified:parseGenreInput(input?.value||'',{keepUnknown:true});delete b.category;if(typeof saveBooks==='function')saveBooks();if(typeof render==='function')render()}};wrapped.__multiGenreV3=true;form.onsubmit=wrapped}return true;
  }

  function titleMatch(a,b){const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x))}
  function authorMatch(list,author){const a=norm(author);if(!a)return true;return(list||[]).some(v=>{const n=norm(v);return n===a||n.includes(a)||a.includes(n)})}
  function collectFromTexts(values){const out=[];for(const v of values||[])out.push(...parseGenreInput(v,{keepUnknown:false}));return uniq(out)}
  async function fetchJson(url,timeout=8500){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(timer)}}
  async function lookupGenres(book){
    const title=clean(book?.title),author=clean(book?.author),code=clean(book?.code||book?.isbn||'').replace(/[^0-9Xx]/g,'').toUpperCase(),found=[];
    const add=v=>found.push(...collectFromTexts(Array.isArray(v)?v:[v]));
    const jobs=[];
    if(code){
      jobs.push(fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('isbn:'+code)}&maxResults=10&projection=full`).then(g=>{for(const item of g?.items||[]){const v=item.volumeInfo||{};if(title&&!titleMatch(v.title||'',title))continue;if(author&&!authorMatch(v.authors,author))continue;add(v.categories||[])}}));
      jobs.push(fetchJson(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(code)}&fields=${encodeURIComponent('title,author_name,isbn,subject')}&limit=10`).then(o=>{for(const d of o?.docs||[]){if(title&&!titleMatch(d.title||'',title))continue;if(author&&!authorMatch(d.author_name,author))continue;add(d.subject||[])}}));
    }
    if(title&&author){
      const q=`intitle:"${title}" inauthor:"${author}"`;
      jobs.push(fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&projection=full`).then(g=>{for(const item of g?.items||[]){const v=item.volumeInfo||{};if(!titleMatch(v.title||'',title)||!authorMatch(v.authors,author))continue;add(v.categories||[])}}));
      jobs.push(fetchJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&fields=${encodeURIComponent('title,author_name,subject')}&limit=15`).then(o=>{for(const d of o?.docs||[]){if(!titleMatch(d.title||'',title)||!authorMatch(d.author_name,author))continue;add(d.subject||[])}}));
    }
    await Promise.allSettled(jobs);return uniq(found).filter(x=>!isGenericOrAudience(x));
  }
  async function enrichSavedGenres(){
    if(typeof books==='undefined'||!Array.isArray(books)||!books.length)return;
    const pending=books.filter(b=>Number(b.genresLookupVersion||0)<VERSION).slice(0,6);if(!pending.length)return;
    for(const b of pending){
      try{const verified=verifiedGenres(b),fetched=verified.length?[]:await lookupGenres(b),fallback=bookGenres(b);b.genres=verified.length?verified:(fetched.length?fetched:fallback);delete b.category;b.genresLookupVersion=VERSION;b.genresLookupAt=Date.now()}catch(e){b.genres=bookGenres(b);delete b.category;b.genresLookupVersion=VERSION;b.genresLookupAt=Date.now()}
    }
    if(typeof saveBooks==='function')saveBooks();if(typeof render==='function')render();if(books.some(b=>Number(b.genresLookupVersion||0)<VERSION))setTimeout(enrichSavedGenres,700);
  }

  window.__LIB_BOOK_GENRES=bookGenres;window.__LIB_PARSE_GENRES=parseGenreInput;window.__LIB_ENRICH_GENRES=enrichSavedGenres;window.__LIB_VERIFIED_GENRES=VERIFIED_GENRES;
  function boot(){installStyle();patchTexts();patchSaveBooks();migrateAll();patchSearch();patchGenreFilter();patchGenreField();patchDialog();if(typeof currentView!=='undefined'&&currentView==='categories'&&typeof render==='function')render()}
  let tries=0;const timer=setInterval(()=>{tries++;boot();if(document.getElementById('editCategory')&&typeof fillDialog==='function'&&tries>25)clearInterval(timer);if(tries>=100)clearInterval(timer)},120);
  setTimeout(()=>{boot();setTimeout(enrichSavedGenres,600)},0);
})();
