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
    .book-side-details{padding:10px 10px 0;color:var(--ink);font-size:9px;line-height:1.28}
    .book-side-details .relation-item+.relation-item{margin-top:10px}
    .cover-rating{margin-top:12px;text-align:left}
    .cover-rating-label{display:block;font-size:9px;margin-bottom:2px;text-transform:uppercase}
    .cover-rating .stars{justify-content:flex-start}
    .cover-rating .star{font-size:20px}
    .meta{grid-template-columns:minmax(210px,.7fr) minmax(0,1.5fr)}
    .meta:not(:has(.notes)){grid-template-columns:minmax(210px,420px)}
    @media(max-width:620px){.meta{grid-template-columns:1fr}.meta:not(:has(.notes)){grid-template-columns:1fr}}
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
