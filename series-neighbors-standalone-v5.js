(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V46)return;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V46=true;
root.__LIB_SINGLE_OWNER_RUNTIME='20260820-10';

/* I resolver legacy non devono più poter diventare proprietari dei campi. */
root.__LIB_UNIFIED_BOOK_ENRICHER_V1=true;
root.__LIB_UNIVERSAL_SERIES_V2=true;
root.__LIB_GOODREADS_GENRES_LOADER_V1=true;
root.__LIB_GOODREADS_GENRES_ONLY_V10=true;
root.__LIB_GENRE_SEARCH_FALLBACK_V2=true;
root.__LIB_GENRE_OPENLIBRARY_WORK_V1=true;
root.__LIB_GENRE_CODETABS_V1=true;
root.__LIB_GENRE_DIRECT_RETAILER_V1=true;
root.__LIB_STORYGRAPH_GOODREADS_GENRES_V1=true;
root.__LIB_STORYGRAPH_GOODREADS_GENRES_V2=true;
root.__LIB_GENRES_AUTHORITATIVE_V3=true;
root.__LIB_GENRE_WHITELIST_V1=true;
root.__LIB_GENRE_WHITELIST_ENFORCER_V2=true;

function loadOnce(id,src){
  if(document.getElementById(id))return;
  const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s);
}

/* Metadati ISBN e trama. Il sanitizer interviene solo sui valori automatici. */
loadOnce('libIsbnMetadataRescueV1','isbn-metadata-rescue-v1.js?v=20260819-1');
loadOnce('libIsbnSbnRescueV3','isbn-sbn-rescue-v1.js?v=20260819-3');
loadOnce('libIsbnDirectCatalogV2','isbn-direct-catalog-v1.js?v=20260819-2');
loadOnce('libPublisherPlotPriorityV3','publisher-plot-priority-v3.js?v=20260819-3');
loadOnce('libPublisherPlotResilienceV5','publisher-plot-resilience-v5.js?v=20260820-5');
loadOnce('libPublisherPlotResilienceV6','publisher-plot-resilience-v6.js?v=20260820-6');
loadOnce('libPublisherPlotResilienceV7','publisher-plot-resilience-v7.js?v=20260820-7');
loadOnce('libPublisherPlotLockV8','publisher-plot-lock-v8.js?v=20260820-10');
loadOnce('libIsbnFieldSanitizerV1','isbn-field-sanitizer-v1.js?v=20260820-1');

/* Un solo proprietario di Saga / Prequel / Sequel.
   Goodreads deve produrre una relazione completa; StoryGraph completa i buchi;
   Wikipedia resta l'ultima risorsa. */
loadOnce('libSeriesAuthoritativeRuntimeV6','series-authoritative-runtime-v6.js?v=20260820-10');
loadOnce('libSeriesSingleOwnerGuardV1','series-single-owner-guard-v1.js?v=20260820-4');

/* Generi: StoryGraph resta la sorgente primaria. */
loadOnce('libGenresMultiV6','genres-multi-v1.js?v=20260820-8');
loadOnce('libStoryGraphGoodreadsGenresV3','storygraph-goodreads-genres-v3.js?v=20260820-1');

root.__LIB_GENRE_SOURCE_POLICY='storygraph-direct-then-goodreads-only-if-absent-v3';
root.__LIB_PLOT_SOURCE_POLICY='publisher-first-official-retry-lock-v8';
root.__LIB_SERIES_RELATION_POLICY='single-owner-goodreads-complete-then-storygraph-then-wikipedia-v6';
})();
