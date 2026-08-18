(()=>{
  if(window.__LIB_LIBRARY_UI_RULES_V1)return;
  window.__LIB_LIBRARY_UI_RULES_V1=true;

  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const escRe=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  function primaryAuthor(author){
    let raw=clean(author);if(!raw)return'';
    const split=raw.split(/\s*(?:;|&|\be\b|\band\b)\s*/i).filter(Boolean);if(split.length>1)raw=split[0];
    const comma=raw.split(',').map(clean).filter(Boolean);
    if(comma.length>1){
      const firstWords=comma[0].split(/\s+/).filter(Boolean),secondWords=comma[1].split(/\s+/).filter(Boolean);
      if(firstWords.length>=2&&secondWords.length>=2)raw=comma[0];
    }
    return clean(raw.replace(/\([^)]*\)/g,''));
  }
  function surname(author){
    const main=primaryAuthor(author);if(!main)return'';
    if(main.includes(','))return clean(main.split(',')[0]).toLocaleLowerCase('it');
    const parts=main.split(/\s+/).filter(Boolean);return (parts.at(-1)||main).toLocaleLowerCase('it');
  }
  function cmp(a,b){return clean(a).localeCompare(clean(b),'it',{sensitivity:'base',numeric:true})}
  function yearOf(book){
    const raw=clean(book?.publishedDate||book?.publication||book?.year||'');
    const m=raw.match(/(?:18|19|20)\d{2}/);if(m)return Number(m[0]);
    const d=Date.parse(raw);return Number.isFinite(d)?new Date(d).getFullYear():9999;
  }

  function canonicalTitle(book){
    const title=clean(book?.title),saga=clean(book?.saga);if(!title||!saga)return title;
    if(norm(title)===norm(saga))return title;
    const e=escRe(saga);
    const atStart=title.match(new RegExp('^\\s*'+e+'\\s*(?:[.:-]|[-–—])\\s*(.+)$','i'));
    if(atStart)return saga+'. '+clean(atStart[1]);
    const atEnd=title.match(new RegExp('^(.+?)\\s*(?:[.:-]|[-–—])\\s*'+e+'\\s*$','i'));
    if(atEnd)return saga+'. '+clean(atEnd[1]);
    if(norm(saga)==='baciata da un angelo')return saga+'. '+title;
    return title;
  }

  function compareBooks(a,b){
    const sa=surname(a?.author),sb=surname(b?.author);let c=cmp(sa,sb);if(c)return c;
    c=cmp(primaryAuthor(a?.author),primaryAuthor(b?.author));if(c)return c;
    const as=clean(a?.saga),bs=clean(b?.saga);
    if(as&&bs){
      c=cmp(as,bs);if(c)return c;
      c=yearOf(a)-yearOf(b);if(c)return c;
      return cmp(canonicalTitle(a),canonicalTitle(b));
    }
    if(!as&&!bs)return cmp(canonicalTitle(a),canonicalTitle(b));
    const ak=as||canonicalTitle(a),bk=bs||canonicalTitle(b);c=cmp(ak,bk);if(c)return c;
    if(as||bs){c=yearOf(a)-yearOf(b);if(c)return c}
    return cmp(canonicalTitle(a),canonicalTitle(b));
  }

  function migrateSeriesTitleOrder(){
    if(typeof books==='undefined'||!Array.isArray(books))return false;
    let changed=false;
    for(const b of books){
      const next=canonicalTitle(b);
      if(next&&next!==clean(b.title)){b.title=next;changed=true}
    }
    if(changed&&typeof saveBooks==='function')saveBooks();
    return changed;
  }

  const style=document.createElement('style');
  style.textContent=`
    .book{align-items:stretch!important}
    .book .info{display:flex!important;flex-direction:column!important;height:100%!important;min-height:100%!important}
    .book-side-details{padding:10px 10px 0;color:var(--ink);font-size:9px;line-height:1.28}
    .book-side-details .relation-item+.relation-item{margin-top:10px}
    .cover-rating{margin-top:9px;text-align:left}
    .cover-rating-label{display:block;font-size:7px!important;line-height:1.1;margin:0 0 2px 0!important;text-transform:uppercase}
    .cover-rating .stars{justify-content:flex-start!important;gap:0!important;margin:0!important;padding:0!important}
    .cover-rating .star{font-size:14px!important;line-height:1!important;padding:0!important;margin:0!important;min-width:0!important;width:auto!important}
    .cover-rating .star:first-child{margin-left:-1px!important}
    .meta{display:flex!important;align-items:flex-start!important;gap:10px!important;margin-top:8px!important;width:100%!important}
    .meta>.panel:first-child{flex:0 1 45%!important;width:45%!important;max-width:340px!important;min-width:200px!important}
    .meta>.notes{flex:1 1 auto!important;min-width:0!important}
    .book-manage{margin-top:auto!important;padding-top:14px!important;display:flex!important;justify-content:flex-end!important;gap:8px!important}
    @media(max-width:620px){
      .meta{display:block!important}
      .meta>.panel:first-child{width:100%!important;max-width:none!important;min-width:0!important}
      .meta>.notes{margin-top:10px!important}
      .book-manage{padding-top:10px!important}
    }
  `;
  document.head.appendChild(style);

  const originalGetFiltered=window.getFilteredBooks;
  if(typeof originalGetFiltered==='function'){
    window.getFilteredBooks=function(){return [...originalGetFiltered()].sort(compareBooks)};
  }

  const originalBind=window.bind;
  if(typeof originalBind==='function'){
    window.bind=function(){
      originalBind();
      document.querySelectorAll('.star').forEach(s=>s.onclick=()=>{
        const b=books.find(x=>x.id==s.dataset.id);if(!b)return;
        const clicked=Number(s.dataset.v)||0,current=Number(b.rating)||0;
        b.rating=current===clicked?0:clicked;
        saveBooks();render();
      });
    };
  }

  function sideDetails(b){
    const rows=[];
    if(clean(b.prequel))rows.push(`<div class="relation-item"><span class="relation-label">Prequel:</span><span class="relation-title">${esc(b.prequel)}</span></div>`);
    if(clean(b.sequel))rows.push(`<div class="relation-item"><span class="relation-label">Sequel:</span><span class="relation-title">${esc(b.sequel)}</span></div>`);
    rows.push(`<div class="cover-rating"><span class="cover-rating-label">IL MIO RATING</span><div class="stars">${stars(Number(b.rating)||0,b.id)}</div></div>`);
    return `<div class="book-side-details">${rows.join('')}</div>`;
  }

  window.bookMarkup=function(b){
    const note=clean(b.notes);
    const noteMarkup=note?`<div class="notes"><span class="label">LE MIE NOTE</span><textarea data-notes="${b.id}">${esc(b.notes)}</textarea></div>`:'';
    return `<section class="book">
      <label class="read-corner" title="Segna come letto"><input type="checkbox" data-read="${b.id}" ${b.read?'checked':''}><span class="read-box"></span></label>
      <div class="cover-column"><div class="cover-wrap"><div class="tape"></div>${coverMarkup(b)}</div>${sideDetails(b)}</div>
      <div class="info"><h2 class="title">${esc(canonicalTitle(b))}</h2><p class="author">${esc(b.author)}</p><span class="label">TRAMA</span><p class="plot">${esc(b.plot)}</p>
      <div class="meta"><div class="panel"><h3>SAGA</h3><div class="saga-value">${esc(b.saga||'—')}</div></div>${noteMarkup}</div>
      ${b.loanTo?`<div class="loan-summary">Prestato a ${esc(b.loanTo)}</div>`:''}
      <div class="book-manage"><button class="manage-btn" data-edit="${b.id}" type="button">↗ Apri scheda</button><button class="manage-btn delete" data-delete="${b.id}" type="button">Elimina</button></div>
      </div></section>`;
  };

  window.__LIB_COMPARE_BOOKS_UI=compareBooks;
  window.__LIB_CANONICAL_DISPLAY_TITLE=canonicalTitle;
  migrateSeriesTitleOrder();
  if(typeof render==='function')render();
})();

(()=>{
  if(window.__LIB_PLOT_PROMO_FILTER_V1)return;
  window.__LIB_PLOT_PROMO_FILTER_V1=true;

  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
  function plain(v){
    const d=document.createElement('div');
    d.innerHTML=String(v||'').replace(/<br\s*\/?\s*>/gi,'\n');
    return String(d.textContent||d.innerText||'')
      .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
      .replace(/\u00a0/g,' ')
      .replace(/[ \t]+/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }
  function promoLike(v){
    const n=norm(v);if(!n)return false;
    return /(?:ora al cinema|adesso al cinema|da questo (?:romanzo|libro).{0,40}\bfilm\b|dal (?:romanzo|libro).{0,40}\bfilm\b|romanzo da cui.{0,35}\bfilm\b|libro da cui.{0,35}\bfilm\b|serie tv|serie televisiva|netflix|prime video|amazon prime|disney\+?|sky|now tv|nuova edizione|edizione speciale|edizione cinematografica|milioni? di copie|copie vendute|bestseller|caso editoriale|successo mondiale|dall'autore di|dall'autrice di|ha un nuovo capitolo)/i.test(n);
  }
  function sanitizePlot(v){
    let p=plain(v);if(!p)return'';
    p=p.replace(/^(?:descrizione(?: dell['’]editore| del libro| prodotto)?|sinossi|trama|abstract|presentazione)\s*[:\-–—]?\s*/i,'').trim();

    const exactPromos=[
      /\bla storia di\s+[^.!?]{1,120}?\s+ha un nuovo capitolo\b[.!?]?/ig,
      /\bda questo (?:romanzo|libro)\s+(?:(?:è|e)\s+tratto\s+)?(?:il\s+)?film(?:\s+ora\s+al\s+cinema)?\b[.!?]?/ig,
      /\bdal (?:romanzo|libro)\s+(?:(?:è|e)\s+tratto\s+)?(?:il\s+)?film(?:\s+ora\s+al\s+cinema)?\b[.!?]?/ig,
      /\b(?:il\s+)?(?:romanzo|libro)\s+da\s+cui\s+(?:è|e)\s+tratto\s+il\s+film\b[^.!?]{0,80}[.!?]?/ig,
      /\b(?:ora|adesso)\s+al\s+cinema\b[.!?]?/ig,
      /\bda questo (?:romanzo|libro)\s+(?:la|una)\s+serie\s+(?:tv|televisiva)\b[^.!?]{0,100}[.!?]?/ig,
      /\b(?:ora|adesso)\s+(?:su|in)\s+(?:netflix|prime video|amazon prime video|disney\+|sky|now tv)\b[^.!?]{0,80}[.!?]?/ig
    ];
    for(const re of exactPromos)p=p.replace(re,' ');
    p=p.replace(/\s+/g,' ').trim().replace(/^[,;:–—\-\.\s]+|[,;:–—\-\s]+$/g,'').trim();

    let changed=true,passes=0;
    while(changed&&p&&passes++<6){
      changed=false;
      const m=p.match(/^([^.!?]{1,220}[.!?])(?:\s+|$)/);
      if(m&&promoLike(m[1])){p=p.slice(m[0].length).trim();changed=true}
    }
    if(p){
      const parts=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[p];
      while(parts.length>1&&parts.at(-1).trim().length<=220&&promoLike(parts.at(-1))){parts.pop()}
      p=parts.join(' ').replace(/\s+/g,' ').trim();
    }
    if(!p)return'';
    if(p.length<=240&&promoLike(p))return'';
    if(/\b(?:customer reviews?|recensioni degli utenti|recensioni dei clienti|verified purchase|acquisto verificato|reviewed in|recensito in|translate review|double tap to read)\b/i.test(p))return'';
    if(p.length<60)return'';
    if(p.length>2600)p=p.slice(0,2600).replace(/\s+\S*$/,'')+'…';
    return p;
  }

  window.__LIB_CLEAN_BOOK_PLOT=sanitizePlot;
  window.__LIB_SANITIZE_PLOT_PROMOS=sanitizePlot;

  function wrapOfficialPlotResolver(){
    const current=window.__LIB_RESOLVE_OFFICIAL_PLOT;
    if(typeof current!=='function'||current.__plotPromoWrapped)return;
    const wrapped=async function(input={}){return sanitizePlot(await current(input))};
    wrapped.__plotPromoWrapped=true;
    window.__LIB_RESOLVE_OFFICIAL_PLOT=wrapped;
  }

  let recoveryToken=0;
  function installPlotFieldGuard(){
    const ta=document.getElementById('editPlot');
    if(!ta||ta.__plotPromoGuard)return !!ta;
    const desc=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
    if(!desc?.get||!desc?.set)return false;
    ta.__plotPromoGuard=true;
    Object.defineProperty(ta,'value',{
      configurable:true,
      get(){return desc.get.call(this)},
      set(v){
        const raw=String(v??''),filtered=sanitizePlot(raw);
        desc.set.call(this,filtered);
        if(raw.trim()&&raw.trim()!==filtered&&promoLike(raw)){
          window.__LIB_LAST_PLOT_PROMO_REMOVAL__={raw,filtered,at:Date.now()};
          if(!filtered)scheduleOfficialRecovery(ta,desc)
        }
      }
    });
    ta.addEventListener('blur',()=>{
      const raw=desc.get.call(ta),filtered=sanitizePlot(raw);
      if(raw!==filtered)desc.set.call(ta,filtered)
    });
    return true;
  }

  function scheduleOfficialRecovery(ta,desc){
    const token=++recoveryToken;
    setTimeout(async()=>{
      if(token!==recoveryToken||desc.get.call(ta).trim())return;
      wrapOfficialPlotResolver();
      const resolver=window.__LIB_RESOLVE_OFFICIAL_PLOT;
      if(typeof resolver!=='function')return;
      const title=document.getElementById('editTitle')?.value.trim()||'';
      const author=document.getElementById('editAuthor')?.value.trim()||'';
      const publisher=document.getElementById('editPublisher')?.value.trim()||'';
      const code=document.getElementById('editCode')?.value.trim()||'';
      if(!title||!publisher)return;
      try{
        const plot=sanitizePlot(await resolver({title,author,publisher,code}));
        if(token!==recoveryToken||!plot||desc.get.call(ta).trim())return;
        desc.set.call(ta,plot);
        window.__LIB_LAST_PLOT_PROMO_RECOVERY__={title,publisher,plotLength:plot.length,at:Date.now()};
      }catch(e){window.__LIB_LAST_PLOT_PROMO_RECOVERY_ERROR__=String(e?.message||e)}
    },350);
  }

  function migrateSavedPlots(){
    if(typeof books==='undefined'||!Array.isArray(books)||typeof saveBooks!=='function')return false;
    let changed=false;
    for(const b of books){
      if(!String(b.plot||'').trim())continue;
      const next=sanitizePlot(b.plot);
      if(next!==b.plot){b.plot=next;changed=true}
    }
    if(changed){saveBooks();if(typeof render==='function')render()}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    wrapOfficialPlotResolver();
    installPlotFieldGuard();
    migrateSavedPlots();
    if(tries>=40)clearInterval(timer)
  },125);
  setTimeout(()=>{wrapOfficialPlotResolver();installPlotFieldGuard();migrateSavedPlots()},0);
})();
