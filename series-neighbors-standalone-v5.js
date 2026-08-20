(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V42)return;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V42=true;
root.__LIB_SINGLE_OWNER_RUNTIME='20260820-2';

/* Gli script legacy sono ancora referenziati dall'HTML storico. Impediamo che
   quelli caricati dopo questo loader possano reinstallare resolver concorrenti. */
root.__LIB_UNIFIED_BOOK_ENRICHER_V1=true;
root.__LIB_UNIVERSAL_SERIES_V2=true;

function loadOnce(id,src){
  if(document.getElementById(id))return;
  const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s);
}

/* Metadati ISBN e trama: restano separati dalle relazioni di saga e dai generi. */
loadOnce('libIsbnMetadataRescueV1','isbn-metadata-rescue-v1.js?v=20260819-1');
loadOnce('libIsbnSbnRescueV3','isbn-sbn-rescue-v1.js?v=20260819-3');
loadOnce('libIsbnDirectCatalogV2','isbn-direct-catalog-v1.js?v=20260819-2');
loadOnce('libPublisherPlotPriorityV3','publisher-plot-priority-v3.js?v=20260819-3');
loadOnce('libPublisherPlotResilienceV5','publisher-plot-resilience-v5.js?v=20260820-5');
loadOnce('libPublisherPlotResilienceV6','publisher-plot-resilience-v6.js?v=20260820-6');
loadOnce('libPublisherPlotResilienceV7','publisher-plot-resilience-v7.js?v=20260820-7');
loadOnce('libPublisherPlotLockV8','publisher-plot-lock-v8.js?v=20260820-8');

/* Un solo proprietario dei campi Saga / Prequel / Sequel. */
loadOnce('libSeriesAuthoritativeRuntimeV4','series-authoritative-runtime-v4.js?v=20260820-4');

/* Il modulo multi-genere gestisce solo salvataggio/UI; la rete e la fonte dei
   generi appartengono esclusivamente al resolver StoryGraph/Goodreads V3. */
loadOnce('libGenresMultiV6','genres-multi-v1.js?v=20260820-7');
loadOnce('libGenresAuthoritativeV3','genres-authoritative-v3.js?v=20260820-3');

root.__LIB_GENRE_SOURCE_POLICY='storygraph-then-goodreads-only-if-storygraph-absent-v3';
root.__LIB_PLOT_SOURCE_POLICY='publisher-first-official-retry-lock-v8';
root.__LIB_SERIES_RELATION_POLICY='single-owner-structured-book-then-ordered-series-v4';
})();
