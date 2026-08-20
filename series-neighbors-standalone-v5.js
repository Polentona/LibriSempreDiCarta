(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V49)return;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V49=true;
root.__LIB_SINGLE_OWNER_RUNTIME='20260820-13';

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
loadOnce('libPublisherPlotLockV8','publisher-plot-lock-v8.js?v=20260820-11');
loadOnce('libIsbnFieldSanitizerV2','isbn-field-sanitizer-v2.js?v=20260820-2');

/* Goodreads stabilisce ordine e posizione. V7 mantiene il resolver canonico;
   V8 localizza i titoli; V9 mantiene Saga/Prequel/Sequel autorevoli anche se
   altri writer ISBN terminano più tardi. */
loadOnce('libSeriesAuthoritativeRuntimeV7','series-authoritative-runtime-v7.js?v=20260820-11');
loadOnce('libSeriesSingleOwnerGuardV1','series-single-owner-guard-v1.js?v=20260820-6');
loadOnce('libSeriesRelationStabilizerV8','series-relation-stabilizer-v8.js?v=20260820-1');
loadOnce('libSeriesSagaLockV9','series-saga-lock-v9.js?v=20260820-1');

/* Generi: StoryGraph resta la sorgente primaria. Il lock V4 riusa il parser
   autorevole e conserva l'ultimo risultato StoryGraph contro overwrite tardivi. */
loadOnce('libGenresMultiV6','genres-multi-v1.js?v=20260820-8');
loadOnce('libStoryGraphGoodreadsGenresV3','storygraph-goodreads-genres-v3.js?v=20260820-1');
loadOnce('libStoryGraphGenreLockV4','storygraph-genre-lock-v4.js?v=20260820-1');

root.__LIB_GENRE_SOURCE_POLICY='storygraph-direct-then-goodreads-only-if-absent-v3';
root.__LIB_PLOT_SOURCE_POLICY='publisher-first-official-retry-lock-v8-sanitized';
root.__LIB_SERIES_RELATION_POLICY='goodreads-order-canonical-localization-stable-v8';
})();
