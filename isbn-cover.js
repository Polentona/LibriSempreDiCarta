(()=>{
if(window.__LIB_CODE_LOOKUP_V2)return;
window.__LIB_CODE_LOOKUP_V2=true;

function ready(){
  try{return typeof books!=='undefined'&&typeof saveBooks==='function'&&typeof fillDialog==='function'&&document.getElementById('editDialog')}
  catch(e){return false}
}

function boot(){
  if(!ready()){setTimeout(boot,80);return}
  if(document.getElementById('editCode'))return;

  const $x=id=>document.getElementById(id);
  let searchTimer=null,searchToken=0,lastSearchKey='',draftCoverWasAuto=false;
  const autoFields=new Set();

  /* Se una vecchia versione dello script ha gia' aggiunto il solo campo ISBN,
     la rimuoviamo prima di costruire l'interfaccia nuova. */
  const oldIsbn=$x('editIsbn');
  if(oldIsbn)oldIsbn.closest('.edit-field')?.remove();
  const oldPreview=$x('coverPreviewBox');
  if(oldPreview)oldPreview.closest('.edit-field')?.remove();
  const oldOverlay=$x('coverPickerOverlay');
  if(oldOverlay)oldOverlay.remove();

  const style=document.createElement('style');
  style.textContent=`
  .code-hint{font-size:10px;color:#75685d;line-height:1.45;margin-top:3px}
  .lookup-tools{display:flex;align-items:center;gap:7px;margin-top:6px}.lookup-btn{border:1px solid #cbb398;background:#f4e5d2;color:#2d251f;border-radius:7px;padding:6px 9px;font:inherit;font-size:10px;cursor:pointer;white-space:nowrap}.lookup-btn:hover{background:#ead7bf}.lookup-btn:disabled{opacity:.55;cursor:wait}
  .cover-draft{display:grid;grid-template-columns:105px 1fr;gap:14px;align-items:center;border:1px dashed #d3bda5;border-radius:10px;padding:11px;background:rgba(255,255,255,.18)}
  .cover-preview{width:95px;aspect-ratio:2/3;object-fit:cover;border-radius:5px;background:#ddcbb8;box-shadow:0 3px 9px rgba(82,56,35,.14)}
  .cover-preview-empty{width:95px;aspect-ratio:2/3;display:grid;place-items:center;text-align:center;padding:8px;border-radius:5px;background:#ddcbb8;color:#806f60;font-size:9px}
  .cover-draft strong{display:block;font-size:11px;font-weight:500;margin-bottom:5px}.lookup-status{font-size:10px;line-height:1.5;color:#75685d}.lookup-status.busy{color:#8a643a}.lookup-status.ok{color:#4f7148}.lookup-status.warn{color:#8a5a36}.lookup-status.lookup-busy{display:flex;align-items:center;min-height:24px}.lookup-book-spinner{display:inline-block;font-size:20px;line-height:1;transform-origin:center;animation:lookupBookSpin .85s linear infinite}@keyframes lookupBookSpin{to{transform:rotate(360deg)}}
  .metadata-overlay{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(50,39,30,.42);backdrop-filter:blur(3px)}.metadata-overlay[open]{display:flex}.metadata-overlay::backdrop{background:transparent}
  .metadata-picker{width:min(860px,100%);max-height:88vh;overflow:auto;background:#fbf4e9;border:1px solid #d6bea5;border-radius:15px;box-shadow:0 24px 70px rgba(55,38,26,.34);padding:20px;color:#2d251f;font-family:"Segoe Print","Bradley Hand","Comic Sans MS",cursive}
  .metadata-picker h3{font-size:20px;font-weight:500;margin:0 0 5px}.metadata-picker>p{font-size:11px;color:#75685d;margin:0 0 14px;line-height:1.5}.metadata-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .metadata-choice{border:1px solid #d7c1aa;border-radius:10px;background:#fff9f0;padding:10px;cursor:pointer;font:inherit;color:#2d251f;text-align:left;display:grid;grid-template-columns:82px 1fr;gap:10px;min-height:135px}.metadata-choice:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(82,56,35,.12)}
  .metadata-choice img,.metadata-choice .no-cover{width:82px;height:123px;object-fit:contain;display:grid;place-items:center;background:#efe3d4;border-radius:5px;color:#8b7766;font-size:8px;text-align:center;padding:5px}.metadata-choice strong{display:block;font-size:12px;line-height:1.35;margin-bottom:4px}.metadata-choice .meta-author{font-size:10px;margin-bottom:5px}.metadata-choice .meta-small{font-size:9px;color:#75685d;line-height:1.45}.metadata-choice .meta-source{font-size:8px;color:#92765b;margin-top:5px}
  .cover-choice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}.cover-choice{border:1px solid #d7c1aa;border-radius:9px;background:#fff9f0;padding:8px;cursor:pointer;font:inherit;color:#2d251f}.cover-choice:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(82,56,35,.12)}.cover-choice img{width:100%;height:190px;object-fit:contain;display:block;background:#efe3d4;border-radius:5px}.cover-choice span{display:block;font-size:9px;margin-top:6px;text-align:center;color:#75685d}
  .metadata-actions{display:flex;justify-content:flex-end;margin-top:14px}
  @media(max-width:620px){.cover-draft{grid-template-columns:80px 1fr}.cover-preview,.cover-preview-empty{width:74px}.metadata-choice-grid{grid-template-columns:1fr}.metadata-choice{grid-template-columns:70px 1fr}.metadata-choice img,.metadata-choice .no-cover{width:70px;height:105px}.cover-choice-grid{grid-template-columns:repeat(2,1fr)}.cover-choice img{height:160px}}
  `;
  document.head.appendChild(style);

  const grid=$x('editRating').closest('.edit-grid');
  const ratingField=$x('editRating').closest('.edit-field');

  const typeField=document.createElement('div');
  typeField.className='edit-field';
  typeField.innerHTML=`<label for="editCodeType">Tipo codice</label><select id="editCodeType"><option value="auto">Rileva automaticamente</option><option value="isbn">ISBN</option><option value="issn">ISSN</option><option value="barcode">Codice a barre</option></select>`;
  grid.insertBefore(typeField,ratingField);

  const codeField=document.createElement('div');
  codeField.className='edit-field';
  codeField.innerHTML=`<label for="editCode">ISBN / ISSN / codice a barre</label><input id="editCode" inputmode="text" autocomplete="off" placeholder="Inserisci o incolla il codice"><div class="lookup-tools"><button class="lookup-btn" id="lookupMetadataBtn" type="button">Cerca dati</button></div><div class="code-hint">Quando aggiungi un libro, titolo, autore, trama, categoria e copertina vengono cercati automaticamente.</div>`;
  grid.insertBefore(codeField,ratingField);

  const categoryField=document.createElement('div');
  categoryField.className='edit-field';
  categoryField.innerHTML=`<label for="editCategory">Categoria / genere</label><input id="editCategory" placeholder="Compilata automaticamente quando disponibile">`;
  ratingField.insertAdjacentElement('afterend',categoryField);

  const publisherField=document.createElement('div');
  publisherField.className='edit-field';
  publisherField.innerHTML=`<label for="editPublisher">Editore</label><input id="editPublisher" placeholder="Compilato automaticamente quando disponibile">`;
  categoryField.insertAdjacentElement('afterend',publisherField);

  const dateField=document.createElement('div');
  dateField.className='edit-field';
  dateField.innerHTML=`<label for="editPublishedDate">Pubblicazione</label><input id="editPublishedDate" placeholder="Anno o data di pubblicazione">`;
  publisherField.insertAdjacentElement('afterend',dateField);

  const sagaField=document.createElement('div');
  sagaField.className='edit-field';
  sagaField.innerHTML=`<label for="editSaga">Saga</label><input id="editSaga" placeholder="Nome della saga, se presente">`;
  dateField.insertAdjacentElement('afterend',sagaField);

  const coverField=$x('editCover').closest('.edit-field');
  const previewField=document.createElement('div');
  previewField.className='edit-field full';
  previewField.innerHTML=`<div class="cover-draft"><div id="coverPreviewBox"><div class="cover-preview-empty">Nessuna copertina</div></div><div><strong>Bozza del libro</strong><div class="lookup-status" id="lookupStatus">Inserisci un codice: i dati verranno cercati automaticamente.</div></div></div>`;
  coverField.insertAdjacentElement('afterend',previewField);

  const overlay=document.createElement('dialog');
  overlay.className='metadata-overlay';overlay.id='metadataOverlay';overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<section class="metadata-picker" role="dialog" aria-modal="true" aria-labelledby="metadataPickerTitle"><h3 id="metadataPickerTitle">Scegli il risultato corretto</h3><p id="metadataPickerText"></p><div id="metadataChoices"></div><div class="metadata-actions"><button class="dialog-btn" id="closeMetadataPicker" type="button">Chiudi senza scegliere</button></div></section>`;
  document.body.appendChild(overlay);

  function normalizeLoose(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
  function normalizeText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function formatIssn(v){const n=normalizeLoose(v);return n.length===8?`${n.slice(0,4)}-${n.slice(4)}`:String(v||'').trim()}
  function validIsbn10(v){const n=normalizeLoose(v);if(!/^\d{9}[\dX]$/.test(n))return false;let s=0;for(let i=0;i<10;i++)s+=(n[i]==='X'?10:Number(n[i]))*(10-i);return s%11===0}
  function validIsbn13(v){const n=normalizeLoose(v);if(!/^\d{13}$/.test(n))return false;let s=0;for(let i=0;i<12;i++)s+=Number(n[i])*(i%2?3:1);return (10-(s%10))%10===Number(n[12])}
  function validIssn(v){const n=normalizeLoose(v);if(!/^\d{7}[\dX]$/.test(n))return false;let s=0;for(let i=0;i<7;i++)s+=Number(n[i])*(8-i);const c=(11-(s%11))%11;return (c===10?'X':String(c))===n[7]}
  function resolveType(raw){
    const forced=$x('editCodeType').value,n=normalizeLoose(raw);
    if(forced!=='auto')return forced;
    if(validIsbn13(n)&&(n.startsWith('978')||n.startsWith('979')))return 'isbn';
    if(validIsbn10(n))return 'isbn';
    if(validIssn(n))return 'issn';
    return 'barcode';
  }
  function typeLabel(t){return t==='isbn'?'ISBN':t==='issn'?'ISSN':'codice a barre'}
  function secureUrl(u){return String(u||'').replace(/^http:/i,'https:')}
  function absoluteCoverUrl(u){try{return new URL(secureUrl(u),document.baseURI).href}catch(e){return secureUrl(u)}}
  const VERIFIED_UI_COVERS={'9788854147317':'assets/covers/9788854147317.jpg','8854147311':'assets/covers/9788854147317.jpg'};
  const VERIFIED_BOOK_METADATA={
    '9788854150706':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854150703':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '9788854147317':{title:"L'amore e l'odio",saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854147311':{title:"L'amore e l'odio",saga:'Baciata da un angelo',author:'Elizabeth Chandler'}
  };
  function verifiedUiCover(code){const u=VERIFIED_UI_COVERS[normalizeLoose(code)];return u?absoluteCoverUrl(u):''}
  function verifiedBookMetadata(code){return VERIFIED_BOOK_METADATA[normalizeLoose(code)]||null}
  function migrateVerifiedSavedBooks(){
    let changed=false;
    for(const b of books){
      const meta=verifiedBookMetadata(b.code||b.isbn||'');if(!meta)continue;
      for(const [k,v] of Object.entries(meta)){if(v&&b[k]!==v){b[k]=v;changed=true}}
    }
    if(changed){saveBooks();render()}
  }
  function plausibleAuthorName(v){
    const a=String(v||'').trim(),n=normalizeText(a);if(!a||a.length>120||/\d|€|%|@|https?:|www\./i.test(a))return false;
    if(/\b(iva|ean|isbn|issn|sku|prezzo|sconto|spedizione|consegna|negozio|libreria|carrello|cookie|assistenza|editore|edizione|collana|pagine|formato|categoria|genere|reparto|provincia|regione|comune|disponibile|acquista|compra)\b/i.test(n))return false;
    if(/^[A-ZÀ-Ý]{2,5}$/.test(a))return false;
    return /^[A-Za-zÀ-ÿ'’.,&;\/-]+(?:\s+[A-Za-zÀ-ÿ'’.,&;\/-]+){0,12}$/.test(a)
  }
  function stripSagaFromTitle(title,saga){
    let t=String(title||'').trim(),sg=String(saga||'').trim();if(!t||!sg)return t;
    const e=sg.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    t=t.replace(new RegExp('^'+e+'\\s*(?:[.:-]|[-–—])\\s*','i'),'').replace(new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+e+'$','i'),'').trim();
    return t||String(title||'').trim()
  }
  function normalizeCandidateMetadata(candidate){
    const c={...(candidate||{})};
    c.saga=String(c.saga||'').trim();
    c.title=stripSagaFromTitle(c.title,c.saga);
    if(c.author&&!plausibleAuthorName(c.author))c.author='';
    return c
  }
  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return d.textContent||d.innerText||''}
  function setStatus(msg,kind=''){const el=$x('lookupStatus');if(!el)return;if(kind==='busy'){el.innerHTML='<span class="lookup-book-spinner" aria-hidden="true">📖</span>';el.className='lookup-status lookup-busy';el.setAttribute('aria-label','Ricerca dati in corso');return}el.removeAttribute('aria-label');el.textContent=msg;el.className=`lookup-status ${kind}`.trim()}
  function clearLookupStatus(){const el=$x('lookupStatus');if(!el)return;el.removeAttribute('aria-label');el.textContent='';el.className='lookup-status'}
  function showPreview(url){
    const box=$x('coverPreviewBox');box.innerHTML='';
    if(!url){box.innerHTML='<div class="cover-preview-empty">Nessuna copertina</div>';return}
    const img=document.createElement('img');img.className='cover-preview';img.alt='Anteprima copertina';img.src=secureUrl(url);
    img.onerror=()=>{box.innerHTML='<div class="cover-preview-empty">Copertina non disponibile</div>'};box.appendChild(img);
  }
  function setDraftCover(url,automatic=true){const resolved=absoluteCoverUrl(url);$x('editCover').value=resolved;draftCoverWasAuto=automatic;if(automatic)autoFields.add('editCover');showPreview(resolved)}
  function setAutoField(id,value){
    value=String(value||'').trim();if(!value)return;
    const el=$x(id);if(!el)return;
    if(!el.value.trim()||autoFields.has(id)){el.value=value;autoFields.add(id)}
  }
  function hidePicker(){if(overlay.open)overlay.close();overlay.setAttribute('aria-hidden','true');$x('metadataChoices').innerHTML=''}
  function openPicker(title,text){$x('metadataPickerTitle').textContent=title;$x('metadataPickerText').textContent=text;overlay.setAttribute('aria-hidden','false');if(!overlay.open)overlay.showModal()}
  function imageWorks(url){return new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish(false),4200);img.onload=()=>finish(img.naturalWidth>20&&img.naturalHeight>20);img.onerror=()=>finish(false);img.src=url})}
  async function usableCovers(covers){
    const seen=new Set(),list=[];
    for(const c of covers||[]){const url=secureUrl(typeof c==='string'?c:c.url),source=typeof c==='string'?'Fonte bibliografica':(c.source||'Fonte bibliografica');if(url&&!seen.has(url)){seen.add(url);list.push({url,source})}}
    const checked=await Promise.all(list.slice(0,12).map(async c=>(await imageWorks(c.url))?c:null));return checked.filter(Boolean)
  }
  function getGoogleCover(l={}){return l.extraLarge||l.large||l.medium||l.small||l.thumbnail||l.smallThumbnail||''}
  function joinTitle(t,sub){t=String(t||'').trim();sub=String(sub||'').trim();if(!sub||normalizeText(t).includes(normalizeText(sub)))return t;return `${t} - ${sub}`}
  function identifiersFromGoogle(v){return (v.industryIdentifiers||[]).map(x=>normalizeLoose(x.identifier)).filter(Boolean)}


  /* UNIVERSAL_RETAIL_COVERS_V1 */
  const RETAIL_COVER_DOMAINS=['amazon.it','libraccio.it','ibs.it','mondadoristore.it','giunti.it','bancolibri.it','libreriauniversitaria.it','unilibro.it'];
  const RETAIL_COVER_NAMES={'amazon.it':'Amazon Italia','libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','giunti.it':'Giunti','bancolibri.it':'Bancolibri','libreriauniversitaria.it':'Libreria Universitaria','unilibro.it':'Unilibro'};
  function isbn13to10Ui(v){const n=normalizeLoose(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let sum=0;for(let i=0;i<9;i++)sum+=Number(core[i])*(10-i);const c=(11-(sum%11))%11;return core+(c===10?'X':String(c))}
  function retailDomain(url){try{const h=new URL(url).hostname.replace(/^www\./,'');return RETAIL_COVER_DOMAINS.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
  function retailName(url){return RETAIL_COVER_NAMES[retailDomain(url)]||'Catalogo italiano'}
  async function retailReader(url,timeout=11000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
  function retailImageUrl(url){const u=secureUrl(String(url||'').replace(/&amp;/g,'&').trim());if(!u)return'';if(/^https?:\/\/(?:m\.media-amazon\.com|images(?:-na)?\.ssl-images-amazon\.com)\//i.test(u))return 'https://images.weserv.nl/?url='+encodeURIComponent(u);return u}
  function retailLinks(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){const u=m[1].replace(/&amp;/g,'&');if(retailDomain(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
  function retailImages(text,pageUrl,title=''){
    const found=[],seen=new Set(),words=normalizeText(title).split(' ').filter(w=>w.length>3);
    const add=(raw,label='')=>{let u=String(raw||'').replace(/&amp;/g,'&').replace(/[)>.,;]+$/,'').trim();if(!/^https?:\/\//i.test(u)||seen.has(u))return;seen.add(u);const hay=(u+' '+label).toLowerCase();let score=0;if(/m\.media-amazon\.com\/images\/i\//i.test(u)||/ssl-images-amazon\.com/i.test(u))score+=18;if(/\.(?:jpg|jpeg|png|webp|avif)(?:\?|$)/i.test(u))score+=5;if(/cover|copertin|product|libro|book/i.test(hay))score+=4;for(const w of words)if(hay.includes(w))score+=2;if(/logo|icon|sprite|banner|badge|qr|visa|mastercard|paypal|placeholder|avatar|favicon|kindle|prime|header|footer|cookie|klarna/i.test(hay))score-=30;if(score>0)found.push({url:retailImageUrl(u),source:retailName(pageUrl),score})};
    let m;const md=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;while((m=md.exec(String(text||''))))add(m[2],m[1]);
    const raw=/(https?:\/\/[^\s\"'<>]+?(?:\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s\"'<>]*)?|m\.media-amazon\.com\/images\/I\/[^\s\"'<>]+))/gi;while((m=raw.exec(String(text||''))))add(m[1]);
    return found.sort((a,b)=>b.score-a.score)
  }
  async function retailerCoversForIsbn(code,title='',author=''){
    const n=normalizeLoose(code),i10=n.length===13?isbn13to10Ui(n):(n.length===10?n:''),pages=[];
    if(i10)pages.push(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
    pages.push(`https://www.libraccio.it/libro/${encodeURIComponent(n)}/`);
    pages.push(`https://www.mondadoristore.it/p/${encodeURIComponent(n)}`);
    pages.push(`https://www.giunti.it/search?q=${encodeURIComponent(n)}`);
    const query=`\"${n}\" \"${title||''}\" ${author||''} (site:amazon.it OR site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:giunti.it OR site:bancolibri.it OR site:libreriauniversitaria.it OR site:unilibro.it)`;
    const search=await retailReader('https://www.google.com/search?hl=it&num=12&q='+encodeURIComponent(query),12000);
    for(const u of retailLinks(search).slice(0,10))if(!pages.includes(u))pages.push(u);
    const aliases=[n,i10].filter(Boolean),checks=await Promise.all(pages.slice(0,12).map(async u=>{const text=await retailReader(u);if(!text)return[];const body=normalizeLoose(text);if(aliases.length&&!aliases.some(a=>body.includes(a)))return[];return retailImages(text,u,title).slice(0,3)}));
    const out=[],seen=new Set();for(const c of checks.flat().sort((a,b)=>(b.score||0)-(a.score||0))){if(c.url&&!seen.has(c.url)){seen.add(c.url);out.push({url:c.url,source:c.source})}}
    return out.slice(0,10)
  }
  function mergeCoverOptions(a,b){const out=[],seen=new Set();for(const c of [...(a||[]),...(b||[])]){const x=typeof c==='string'?{url:c,source:'Fonte bibliografica'}:c,u=secureUrl(x?.url||'');if(u&&!seen.has(u)){seen.add(u);out.push({url:u,source:x.source||'Fonte bibliografica'})}}return out}

  async function googleCandidates(code,type){
    let q,print='all';
    if(type==='isbn')q=`isbn:${code}`;
    else if(type==='issn'){q=`\"${formatIssn(code)}\"`;print='magazines'}
    else q=`\"${code}\"`;
    const url=`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&projection=full&printType=${print}`;
    try{
      const r=await fetch(url);if(!r.ok)return[];const data=await r.json();
      return (data.items||[]).map(item=>{
        const v=item.volumeInfo||{},cover=getGoogleCover(v.imageLinks||{}),ids=identifiersFromGoogle(v);
        return {title:joinTitle(v.title,v.subtitle),saga:String(v.seriesName||'').trim(),author:(v.authors||[]).join(', '),description:stripHtml(v.description||''),category:(v.categories||[]).slice(0,4).join(', '),publisher:v.publisher||'',publishedDate:v.publishedDate||'',covers:cover?[{url:cover,source:'Google Books'}]:[],source:'Google Books',identifiers:ids,exact:type==='isbn'?ids.includes(normalizeLoose(code)):false,sourceId:item.id||''}
      }).filter(c=>c.title)
    }catch(e){return[]}
  }

  async function openLibraryCandidates(code,type){
    const query=type==='isbn'?`isbn:${code}`:`\"${type==='issn'?formatIssn(code):code}\"`;
    const fields='key,title,subtitle,author_name,publisher,first_publish_year,publish_date,subject,cover_i,isbn,edition_key';
    try{
      const r=await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&limit=20`);if(!r.ok)return[];const data=await r.json();
      return (data.docs||[]).map(d=>{
        const ids=(d.isbn||[]).map(normalizeLoose),cover=d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`:'';
        return {title:joinTitle(d.title,d.subtitle),saga:'',author:(d.author_name||[]).join(', '),description:'',category:(d.subject||[]).slice(0,4).join(', '),publisher:(d.publisher||[])[0]||'',publishedDate:String(d.first_publish_year||(d.publish_date||[])[0]||''),covers:cover?[{url:cover,source:'Open Library'}]:[],source:'Open Library',identifiers:ids,exact:type==='isbn'?ids.includes(normalizeLoose(code)):false,workKey:d.key||''}
      }).filter(c=>c.title)
    }catch(e){return[]}
  }

  async function crossrefIssnCandidate(code){
    try{
      const r=await fetch(`https://api.crossref.org/journals/${encodeURIComponent(formatIssn(code))}`);if(!r.ok)return[];const data=await r.json();const m=data?.message||{};
      if(!m.title)return[];
      return [{title:m.title,author:'',description:'',category:'Periodico',publisher:m.publisher||'',publishedDate:'',covers:[],source:'Crossref · dati della testata',identifiers:(m.ISSN||[]).map(normalizeLoose),exact:true,serialLevel:true}]
    }catch(e){return[]}
  }

  function mergeCandidates(input){
    const map=new Map();
    for(const c of input){
      const key=[normalizeText(c.title),normalizeText(c.author),normalizeText(c.publisher),normalizeText(c.publishedDate)].join('|');
      if(!map.has(key)){map.set(key,{...c,covers:[...(c.covers||[])],sources:new Set([c.source])});continue}
      const x=map.get(key);x.description=x.description||c.description;x.saga=x.saga||c.saga;x.category=x.category||c.category;x.publisher=x.publisher||c.publisher;x.publishedDate=x.publishedDate||c.publishedDate;x.exact=x.exact||c.exact;x.serialLevel=x.serialLevel||c.serialLevel;x.workKey=x.workKey||c.workKey;x.sources.add(c.source);
      const seen=new Set(x.covers.map(z=>secureUrl(z.url)));for(const z of c.covers||[]){if(!seen.has(secureUrl(z.url))){x.covers.push(z);seen.add(secureUrl(z.url))}}
    }
    return [...map.values()].map(x=>({...x,source:[...x.sources].join(' + ')})).sort((a,b)=>Number(b.exact)-Number(a.exact)||Number(!!b.covers.length)-Number(!!a.covers.length))
  }

  async function enrichOpenLibrary(c){
    if(c.description||!c.workKey||!String(c.workKey).startsWith('/works/'))return c;
    try{const r=await fetch(`https://openlibrary.org${c.workKey}.json`);if(!r.ok)return c;const d=await r.json();const desc=typeof d.description==='string'?d.description:d.description?.value;if(desc)c.description=stripHtml(desc);if(!c.category&&Array.isArray(d.subjects))c.category=d.subjects.slice(0,4).join(', ')}catch(e){}
    return c
  }

  function metadataCard(c,i){
    const cover=c.covers?.[0]?.url||'';
    const img=cover?`<img src="${secureUrl(cover)}" alt="Copertina risultato ${i+1}">`:`<div class="no-cover">Copertina non disponibile</div>`;
    const small=[c.publisher,c.publishedDate].filter(Boolean).join(' · ');
    return `<button class="metadata-choice" type="button" data-meta-choice="${i}">${img}<span><strong>${escapeHtml(c.title)}</strong><span class="meta-author">${escapeHtml(c.author||'Autore non indicato')}</span><span class="meta-small">${escapeHtml(small||'Edizione/data non indicata')}</span><span class="meta-source">${escapeHtml(c.source)}</span></span></button>`
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

  async function showCoverPicker(covers,code){
    const usable=await usableCovers(covers);if(!usable.length)return false;
    if(usable.length===1){setDraftCover(usable[0].url,true);return false}
    const box=$x('metadataChoices');box.className='cover-choice-grid';box.innerHTML='';
    usable.forEach((c,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='cover-choice';btn.innerHTML=`<img src="${c.url}" alt="Copertina ${i+1}"><span>${escapeHtml(c.source)}</span>`;btn.onclick=()=>{setDraftCover(c.url,true);clearLookupStatus();hidePicker()};box.appendChild(btn)});
    clearLookupStatus();openPicker('Scegli la copertina',`Ho trovato ${usable.length} copertine per ${code}. Seleziona quella della tua edizione.`);return true
  }

  async function applyCandidate(candidate,code,type){
    candidate=normalizeCandidateMetadata(await enrichOpenLibrary(candidate));
    const verifiedMeta=verifiedBookMetadata(code);if(verifiedMeta)candidate=normalizeCandidateMetadata({...candidate,...verifiedMeta});
    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);
    const forcedCover=verifiedUiCover(code);if(forcedCover&&(!$x('editCover').value.trim()||autoFields.has('editCover')))setDraftCover(forcedCover,true);
    const coverAlready=$x('editCover').value.trim()&&!autoFields.has('editCover');
    if(type==='isbn'&&!coverAlready){const retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');candidate.covers=mergeCoverOptions(candidate.covers,retail)}
    let pickerOpened=false;if(!coverAlready&&candidate.covers?.length)pickerOpened=await showCoverPicker(candidate.covers,code);
    if(candidate.serialLevel)setStatus(`ISSN riconosciuto. Ho compilato i dati della testata; ricorda che l'ISSN identifica il periodico, non necessariamente il singolo numero. Controlla titolo e numero dell'uscita.`,'warn');
    else if(!pickerOpened)clearLookupStatus();
  }

  async function showMetadataPicker(candidates,code,type){
    const box=$x('metadataChoices');box.className='metadata-choice-grid';box.innerHTML=candidates.map(metadataCard).join('');
    box.querySelectorAll('[data-meta-choice]').forEach(btn=>btn.onclick=async()=>{const c=candidates[Number(btn.dataset.metaChoice)];hidePicker();await applyCandidate(c,code,type)});
    openPicker('Scegli il libro corretto',`Ho trovato ${candidates.length} risultati per ${typeLabel(type)} ${type==='issn'?formatIssn(code):code}. Scegli l'edizione o la testata corretta.`)
  }

  async function fetchCandidates(code,type){
    const tasks=[googleCandidates(code,type),openLibraryCandidates(code,type)];if(type==='issn')tasks.push(crossrefIssnCandidate(code));
    const groups=await Promise.all(tasks);let candidates=mergeCandidates(groups.flat()).map(normalizeCandidateMetadata);
    if(type==='isbn'&&candidates.length){
      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact;
      const seriesVerified=candidates.filter(c=>c.saga&&c.author&&!/^(IVA|EAN|ISBN|EUR|SKU)$/i.test(c.author.trim()));if(seriesVerified.length)candidates=seriesVerified
    }
    if(type==='isbn'&&!candidates.some(c=>c.covers?.length)){
      const direct=`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(code)}-L.jpg?default=false`;
      if(await imageWorks(direct)){if(candidates[0])candidates[0].covers.push({url:direct,source:'Open Library'});else candidates.push({title:'',author:'',description:'',category:'',publisher:'',publishedDate:'',covers:[{url:direct,source:'Open Library'}],source:'Open Library',identifiers:[code],exact:true})}
    }
    return candidates.filter(c=>c.title||c.covers?.length)
  }

  async function lookupMetadata(force=false){
    clearTimeout(searchTimer);
    const raw=$x('editCode').value.trim(),code=normalizeLoose(raw);
    if(!raw){setStatus('Inserisci un ISBN, un ISSN o un codice a barre.');return {kind:'empty'}}
    const type=resolveType(raw),key=`${type}:${code}`;
    if(code.length<8){setStatus('Il codice è troppo corto per avviare la ricerca.','warn');return {kind:'invalid'}}
    if(!force&&key===lastSearchKey)return {kind:'done'};
    lastSearchKey=key;const token=++searchToken;$x('lookupMetadataBtn').disabled=true;setStatus(`Sto cercando titolo, autore, trama, categoria e copertina tramite ${typeLabel(type)}…`,'busy');
    let candidates=[];
    try{candidates=await fetchCandidates(code,type)}finally{if(token===searchToken)$x('lookupMetadataBtn').disabled=false}
    if(token!==searchToken||normalizeLoose($x('editCode').value)!==code)return {kind:'stale'};
    if(!candidates.length){
      if(type==='barcode'&&!((code.length===13)&&(code.startsWith('978')||code.startsWith('979'))))setStatus('Non ho trovato dati bibliografici per questo codice a barre. Se non è un ISBN/EAN libro, le banche dati dei libri potrebbero non riconoscerlo; puoi comunque compilare i campi manualmente.','warn');
      else setStatus(`Non ho trovato dati affidabili per questo ${typeLabel(type)}. Puoi comunque compilare i campi manualmente.`,'warn');
      return {kind:'none'}
    }
    if(candidates.length===1){await applyCandidate(candidates[0],code,type);return {kind:'single',count:1}}
    clearLookupStatus();await showMetadataPicker(candidates,code,type);return {kind:'multiple',count:candidates.length}
  }

  const originalFillDialog=fillDialog;
  fillDialog=function(b={}){
    originalFillDialog(b);autoFields.clear();draftCoverWasAuto=false;lastSearchKey='';searchToken++;
    const oldCode=b.code||b.isbn||'';$x('editCode').value=oldCode;$x('editCodeType').value=b.codeType||(b.isbn?'isbn':'auto');$x('editCategory').value=b.category||'';$x('editPublisher').value=b.publisher||'';$x('editPublishedDate').value=b.publishedDate||'';$x('editSaga').value=b.saga||'';showPreview(b.cover||'');
    setStatus(dialogMode==='add'?'Inserisci un codice: i dati verranno cercati automaticamente.':'Puoi cambiare il codice e premere “Cerca dati” per recuperare eventuali informazioni mancanti.')
  };

  ['editTitle','editSaga','editAuthor','editPlot','editCategory','editPublisher','editPublishedDate'].forEach(id=>$x(id).addEventListener('input',()=>autoFields.delete(id)));
  $x('editCover').addEventListener('input',()=>{searchToken++;draftCoverWasAuto=false;autoFields.delete('editCover');showPreview($x('editCover').value.trim());if($x('editCover').value.trim())setStatus('Copertina inserita manualmente: non verrà sostituita dalla ricerca automatica.')});

  function scheduleLookup(){
    clearTimeout(searchTimer);lastSearchKey='';searchToken++;
    if(draftCoverWasAuto){$x('editCover').value='';draftCoverWasAuto=false;autoFields.delete('editCover');showPreview('')}
    if(dialogMode!=='add'){setStatus('Codice modificato. Premi “Cerca dati” per aggiornare i dati bibliografici.');return}
    const raw=$x('editCode').value.trim(),n=normalizeLoose(raw),forced=$x('editCodeType').value;
    const readyNow=(forced==='isbn'&&(validIsbn10(n)||validIsbn13(n)))||(forced==='issn'&&n.length===8)||(forced==='barcode'&&[8,12,13,14].includes(n.length))||(forced==='auto'&&((validIsbn10(n)||validIsbn13(n))||(raw.includes('-')&&validIssn(n))));
    if(readyNow)searchTimer=setTimeout(()=>lookupMetadata(false),650);else setStatus('Continua a inserire il codice; la ricerca partirà automaticamente quando sarà completo.')
  }
  $x('editCode').addEventListener('input',scheduleLookup);
  $x('editCode').addEventListener('blur',()=>{clearTimeout(searchTimer);const n=normalizeLoose($x('editCode').value);if(dialogMode==='add'&&n.length>=8)lookupMetadata(false)});
  $x('editCodeType').addEventListener('change',()=>{lastSearchKey='';if(dialogMode==='add'&&normalizeLoose($x('editCode').value).length>=8)lookupMetadata(true)});
  $x('lookupMetadataBtn').onclick=()=>lookupMetadata(true);

  const originalSubmit=$x('editForm').onsubmit;
  $x('editForm').onsubmit=async e=>{
    e.preventDefault();
    const modeBefore=dialogMode,idBefore=editingId,code=normalizeLoose($x('editCode').value),codeType=resolveType($x('editCode').value);
    if(modeBefore==='add'&&code&&(!$x('editTitle').value.trim()||!$x('editAuthor').value.trim())){
      const result=await lookupMetadata(true);if(result.kind==='multiple')return
    }
    originalSubmit.call($x('editForm'),e);
    const extras={code,codeType,category:$x('editCategory').value.trim(),publisher:$x('editPublisher').value.trim(),publishedDate:$x('editPublishedDate').value.trim(),saga:$x('editSaga').value.trim(),isbn:codeType==='isbn'?code:''};
    if(modeBefore==='add'){
      if(books[0]){Object.assign(books[0],extras);saveBooks();render()}
    }else{
      const b=books.find(x=>x.id==idBefore);if(b){Object.assign(b,extras);saveBooks();render()}
    }
  };

  $x('closeMetadataPicker').onclick=()=>{hidePicker();setStatus('Scelta chiusa senza modificare la bozza.','warn')};
  overlay.addEventListener('click',e=>{if(e.target===overlay){hidePicker();setStatus('Scelta chiusa senza modificare la bozza.','warn')}});
}

boot();
migrateVerifiedSavedBooks();
})();