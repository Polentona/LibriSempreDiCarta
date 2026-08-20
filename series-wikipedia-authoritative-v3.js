(()=>{
/* Compatibilità: il resolver Wikipedia storico non deve più installare wrapper
   né scrivere Saga/Prequel/Sequel. La lettura strutturata di Wikipedia è ora
   interna al proprietario unico series-authoritative-runtime-v4.js. */
if(window.__LIB_WIKI_AUTHORITATIVE_V3_BOOT)return;
window.__LIB_WIKI_AUTHORITATIVE_V3_BOOT=true;
window.__LIB_WIKI_AUTHORITATIVE_V3_DISABLED='single-owner-series-runtime-v4';
})();
