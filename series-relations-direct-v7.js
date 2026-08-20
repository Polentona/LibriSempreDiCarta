(()=>{
/* Bootstrap eseguito prima di ogni altro runtime legacy.
   Nessuna relazione viene più calcolata qui: il proprietario unico dei campi
   Saga/Prequel/Sequel è series-authoritative-runtime-v4.js. */
if(window.__LIB_EARLY_RUNTIME_GUARD_V2)return;
window.__LIB_EARLY_RUNTIME_GUARD_V2=true;
window.__LIB_DIRECT_RELATIONS_V7=true;
window.__LIB_UNIFIED_BOOK_ENRICHER_V1=true;
window.__LIB_UNIVERSAL_SERIES_V2=true;

/* Impedisce ai vecchi moduli generi di inizializzarsi prima del resolver V3. */
window.__LIB_GOODREADS_GENRES_LOADER_V1=true;
window.__LIB_GOODREADS_GENRES_ONLY_V10=true;
window.__LIB_GENRE_SEARCH_FALLBACK_V2=true;
window.__LIB_GENRE_OPENLIBRARY_WORK_V1=true;
window.__LIB_GENRE_CODETABS_V1=true;
window.__LIB_GENRE_DIRECT_RETAILER_V1=true;
window.__LIB_STORYGRAPH_GOODREADS_GENRES_V1=true;
window.__LIB_STORYGRAPH_GOODREADS_GENRES_V2=true;
window.__LIB_GENRE_WHITELIST_V1=true;
window.__LIB_GENRE_WHITELIST_ENFORCER_V2=true;
})();
