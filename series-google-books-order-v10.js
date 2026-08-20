(()=>{
/* Compatibilità: questo file resta referenziato dall'HTML, ma non risolve più
   saga/prequel/sequel e non carica resolver o gestori generi concorrenti. */
if(window.__LIB_GOOGLE_SERIES_V10_BOOT)return;
window.__LIB_GOOGLE_SERIES_V10_BOOT=true;
window.__LIB_GOOGLE_SERIES_V10_DISABLED='single-owner-series-runtime-v4';
})();

/* BOOK_TITLE_UNDERLINE_FIT_V1: la riga sotto il titolo termina con il testo. */
(()=>{
if(window.__LIB_BOOK_TITLE_UNDERLINE_FIT_V1)return;window.__LIB_BOOK_TITLE_UNDERLINE_FIT_V1=true;
const style=document.createElement('style');
style.id='bookTitleUnderlineFitStyle';
style.textContent=`
  .book .info>.title{align-self:flex-start!important;width:max-content!important;max-width:100%!important;}
  @media(max-width:620px){.book .info>.title{padding-right:0!important;max-width:calc(100% - 34px)!important;}}
`;
document.head.appendChild(style);
})();

/* HOME_ORDER_V2: Home = cognome autore principale -> saga -> data -> titolo. */
(()=>{
if(window.__LIB_HOME_ORDER_V2_BOOT)return;window.__LIB_HOME_ORDER_V2_BOOT=true;
const tidy=v=>String(v??'').replace(/\s+/g,' ').trim();
const coll=(a,b)=>tidy(a).localeCompare(tidy(b),'it',{sensitivity:'base',numeric:true});
function mainAuthor(author){let raw=tidy(author);if(!raw)return'';raw=raw.split(/\s*(?:;|&|\be\b|\band\b)\s*/i).filter(Boolean)[0]||raw;return tidy(raw.replace(/\([^)]*\)/g,''))}
function authorSurname(author){const a=mainAuthor(author);if(!a)return'';if(a.includes(','))return tidy(a.split(',')[0]);const parts=a.split(/\s+/).filter(Boolean);return parts.at(-1)||a}
function publicationValue(book){const raw=tidy(book?.publishedDate||book?.publication||book?.year||'');if(!raw)return Number.POSITIVE_INFINITY;const iso=raw.match(/^((?:18|19|20)\d{2})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/);if(iso){const y=Number(iso[1]),m=Math.max(1,Math.min(12,Number(iso[2])||1)),d=Math.max(1,Math.min(31,Number(iso[3])||1));return Date.UTC(y,m-1,d)}const y=raw.match(/(?:18|19|20)\d{2}/);if(y)return Date.UTC(Number(y[0]),0,1);const parsed=Date.parse(raw);return Number.isFinite(parsed)?parsed:Number.POSITIVE_INFINITY}
function compareHome(a,b){let c=coll(authorSurname(a?.author),authorSurname(b?.author));if(c)return c;c=coll(a?.saga,b?.saga);if(c)return c;c=publicationValue(a)-publicationValue(b);if(Number.isFinite(c)&&c)return c;c=coll(a?.title,b?.title);if(c)return c;c=coll(mainAuthor(a?.author),mainAuthor(b?.author));if(c)return c;return(Number(a?.id)||0)-(Number(b?.id)||0)}
function installHomeOrder(){if(typeof getFilteredBooks!=='function')return false;const current=window.getFilteredBooks||getFilteredBooks;if(current.__homeOrderV2)return true;const wrapped=function(){const list=current.apply(this,arguments);try{if(typeof currentView!=='undefined'&&currentView==='home')return[...list].sort(compareHome)}catch(e){}return list};wrapped.__homeOrderV2=true;wrapped.__homeOrderV2Base=current;window.getFilteredBooks=wrapped;try{if(typeof currentView!=='undefined'&&currentView==='home'&&typeof render==='function')render()}catch(e){}return true}
let tries=0;const timer=setInterval(()=>{tries++;if(installHomeOrder()||tries>=80)clearInterval(timer)},100);setTimeout(installHomeOrder,0);
})();

/* Manteniamo soltanto il recupero ISBN aggiuntivo, che non scrive generi o relazioni. */
(()=>{
if(window.__LIB_ISBN_SEARCH_RECOVERY_LOADED)return;window.__LIB_ISBN_SEARCH_RECOVERY_LOADED=true;
const s=document.createElement('script');s.src='isbn-search-recovery-v2.js?v=20260819-1';s.async=false;document.head.appendChild(s);
})();
