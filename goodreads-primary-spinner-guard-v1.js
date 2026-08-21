(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GOODREADS_PRIMARY_UI_ROUTER_V2)return;
root.__LIB_GOODREADS_PRIMARY_UI_ROUTER_V2=true;
root.__LIB_GOODREADS_PRIMARY_SPINNER_GUARD_V1=true;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const code=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function el(id){return typeof document!=='undefined'?document.getElementById(id):null}
function valid10(v){const n=code(v);if(!/^\d{9}[\dX]$/.test(n))return false;let s=0;for(let i=0;i<10;i++)s+=(n[i]==='X'?10:Number(n[i]))*(10-i);return s%11===0}
function valid13(v){const n=code(v);if(!/^\d{13}$/.test(n)||!/^97[89]/.test(n))return false;let s=0;for(let i=0;i<12;i++)s+=Number(n[i])*(i%2?3:1);return (10-s%10)%10===Number(n[12])}
function isbnReady(v){return valid10(v)||valid13(v)}
function ensureStyle(){
  if(el('goodreadsPrimarySpinnerStyle'))return;
  const st=document.createElement('style');st.id='goodreadsPrimarySpinnerStyle';st.textContent=`
#lookupStatus[data-goodreads-primary-busy="1"]{font-size:0!important;min-height:24px;display:flex!important;align-items:center}
#lookupStatus[data-goodreads-primary-busy="1"]::before{content:"📖";display:inline-block;font-size:20px;line-height:1;transform-origin:center;animation:goodreadsPrimarySpin .85s linear infinite}
#lookupStatus[data-goodreads-primary-busy="1"] .lookup-book-spinner{display:none!important}
@keyframes goodreadsPrimarySpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
  document.head.appendChild(st)
}
let activeCode='',token=0,autoTimer=null,settleTimer=null,resolverDone=false;
function setBusy(c){
  const s=el('lookupStatus'),btn=el('lookupMetadataBtn');if(!s)return;
  ensureStyle();activeCode=c;resolverDone=false;s.dataset.goodreadsPrimaryBusy='1';s.classList.add('lookup-busy');s.setAttribute('aria-label','Ricerca dati in corso');if(btn)btn.disabled=true;
}
function clearBusy(ok=true){
  const s=el('lookupStatus'),btn=el('lookupMetadataBtn');if(s){delete s.dataset.goodreadsPrimaryBusy;s.classList.remove('lookup-busy','busy');s.removeAttribute('aria-label');if(!clean(s.textContent))s.textContent=ok?'Dati recuperati.':'Ricerca completata con i dati disponibili.';s.classList.add(ok?'ok':'warn')}if(btn)btn.disabled=false;activeCode='';resolverDone=false
}
function snapshot(){return{title:clean(el('editTitle')?.value),author:clean(el('editAuthor')?.value),publisher:clean(el('editPublisher')?.value),published:clean(el('editPublishedDate')?.value),genres:clean(el('editCategory')?.value),saga:clean(el('editSaga')?.value),prequel:clean(el('editPrequel')?.value),sequel:clean(el('editSequel')?.value),description:clean(el('editPlot')?.value),cover:clean(el('editCover')?.value)}}
function updateCoverPreview(url){
  if(!url)return;const box=el('coverPreviewBox');if(!box)return;box.innerHTML='';const img=document.createElement('img');img.className='cover-preview';img.alt='Anteprima copertina';img.src=url;img.onerror=()=>{box.innerHTML='<div class="cover-preview-empty">Copertina non disponibile</div>'};box.appendChild(img)
}
function publishResult(input,r){
  root.__LIB_GOODREADS_PRIMARY_LAST__={input,result:r,at:Date.now()};
  if(r?.genres?.length)root.__LIB_GENRE_DELEGATE_LAST__={found:true,genres:r.genres,source:r.goodreads?.genres?.length?'goodreads':(r.source||'storygraph'),url:r.goodreads?.bookUrl||r.storygraph?.bookUrl||'',at:Date.now()};
  if(r?.relations?.authoritative){root.__LIB_LAST_AUTHORITATIVE_SERIES_RESULT__=r.relations;root.__LIB_SERIES_V8_APPLIED={input,result:r.relations,at:Date.now()}}
}
function statesSettled(c){
  const saga=root.__LIB_SERIES_SAGA_LOCK_STATE__,genre=root.__LIB_STORYGRAPH_GENRE_LOCK_STATE__,plot=root.__LIB_PUBLISHER_PLOT_LOCK_STATE__;
  const same=s=>!s||!s.code||s.code===c;
  return resolverDone&&same(saga)&&same(genre)&&same(plot)&&(!saga||saga.settled)&&(!genre||genre.settled)&&(!plot||plot.settled)
}
function watchSettle(myToken,c){
  clearInterval(settleTimer);const deadline=Date.now()+120000;
  settleTimer=setInterval(()=>{if(myToken!==token||code(el('editCode')?.value)!==c){clearInterval(settleTimer);settleTimer=null;clearBusy(false);return}const s=el('lookupStatus');if(s)s.dataset.goodreadsPrimaryBusy='1';if(statesSettled(c)){clearInterval(settleTimer);settleTimer=null;clearBusy(true);return}if(Date.now()>deadline){clearInterval(settleTimer);settleTimer=null;clearBusy(false)}},180)
}
async function runLookup(){
  const c=code(el('editCode')?.value||'');if(!isbnReady(c))return null;
  const api=root.__LIB_GOODREADS_PRIMARY_METADATA_TEST__;if(!api?.resolveAll||!api?.applyResult){await wait(120);return runLookup()}
  const my=++token;setBusy(c);watchSettle(my,c);const legacy=snapshot(),input={code:c,title:legacy.title,author:legacy.author,legacy};
  let r=null;try{r=await api.resolveAll(input)}catch(e){root.__LIB_GOODREADS_PRIMARY_UI_ERROR__=String(e&&e.message||e)}
  if(my!==token||code(el('editCode')?.value)!==c)return null;
  if(r){api.applyResult(r);updateCoverPreview(r.cover);publishResult(input,r)}resolverDone=true;
  if(statesSettled(c))clearBusy(!!r);return r
}
function interceptButton(e){
  const c=code(el('editCode')?.value||'');if(!isbnReady(c))return;
  e.preventDefault();e.stopImmediatePropagation();runLookup()
}
function scheduleAuto(delay=650){clearTimeout(autoTimer);const c=code(el('editCode')?.value||'');if(!isbnReady(c))return;autoTimer=setTimeout(()=>{const btn=el('lookupMetadataBtn');if(btn)btn.click();else runLookup()},delay)}
function interceptCodeInput(e){
  e.stopImmediatePropagation();token++;clearTimeout(autoTimer);clearInterval(settleTimer);settleTimer=null;const s=el('lookupStatus');if(s){delete s.dataset.goodreadsPrimaryBusy;s.classList.remove('lookup-busy')}scheduleAuto(650)
}
function interceptCodeBlur(e){const c=code(el('editCode')?.value||'');if(!isbnReady(c))return;e.stopImmediatePropagation();scheduleAuto(40)}
function interceptTypeChange(e){const c=code(el('editCode')?.value||'');if(!isbnReady(c))return;e.stopImmediatePropagation();scheduleAuto(20)}
function install(){
  const btn=el('lookupMetadataBtn'),inp=el('editCode'),typ=el('editCodeType');if(!btn||!inp||!typ)return false;if(btn.dataset.goodreadsPrimaryRouterV2)return true;
  ensureStyle();btn.dataset.goodreadsPrimaryRouterV2='1';btn.addEventListener('click',interceptButton,true);inp.addEventListener('input',interceptCodeInput,true);inp.addEventListener('blur',interceptCodeBlur,true);typ.addEventListener('change',interceptTypeChange,true);return true
}
(function boot(n=0){if(install())return;if(n<500)setTimeout(()=>boot(n+1),80)})();
root.__LIB_RUN_GOODREADS_PRIMARY_UI__=runLookup;
root.__LIB_GOODREADS_PRIMARY_UI_ROUTER_TEST__={isbnReady,statesSettled,runLookup,setBusy,clearBusy,scheduleAuto};
})();
