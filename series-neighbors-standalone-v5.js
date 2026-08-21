(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_SERIES_NEIGHBORS_STANDALONE_V59)return;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V59=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V58=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V57=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V56=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V55=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V54=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V53=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V52=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V51=true;
root.__LIB_SERIES_NEIGHBORS_STANDALONE_V50=true;
root.__LIB_SINGLE_OWNER_RUNTIME='20260822-2';
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
function loadOnce(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
loadOnce('libIsbnRequestBrokerV1','isbn-request-broker-v1.js?v=20260820-1');
/* Resolver storici: disponibili soltanto come terzo livello, dopo Goodreads e StoryGraph. */
loadOnce('libIsbnMetadataRescueV1','isbn-metadata-rescue-v1.js?v=20260819-1');
loadOnce('libIsbnSbnRescueV3','isbn-sbn-rescue-v1.js?v=20260819-3');
loadOnce('libIsbnDirectCatalogV2','isbn-direct-catalog-v1.js?v=20260819-2');
loadOnce('libPublisherPlotPriorityV3','publisher-plot-priority-v3.js?v=20260819-3');
loadOnce('libPublisherPlotResilienceV5','publisher-plot-resilience-v5.js?v=20260820-5');
loadOnce('libPublisherPlotResilienceV6','publisher-plot-resilience-v6.js?v=20260820-6');
loadOnce('libPublisherPlotResilienceV7','publisher-plot-resilience-v7.js?v=20260820-7');
loadOnce('libIsbnFieldSanitizerV2','isbn-field-sanitizer-v2.js?v=20260820-2');
loadOnce('libPlotResolverResilientV1','plot-resolver-resilient-v1.js?v=20260820-1');
loadOnce('libSeriesAuthoritativeRuntimeV7','series-authoritative-runtime-v7.js?v=20260820-11');
loadOnce('libSeriesSingleOwnerGuardV1','series-single-owner-guard-v1.js?v=20260820-6');
loadOnce('libSeriesRelationStabilizerV8','series-relation-stabilizer-v8.js?v=20260820-1');
loadOnce('libSeriesLocalizationResilientV1','series-localization-resilient-v1.js?v=20260820-2');
loadOnce('libSeriesResolverStabilityV1','series-resolver-stability-v1.js?v=20260820-2');
loadOnce('libGenresMultiV6','genres-multi-v1.js?v=20260820-8');
loadOnce('libStoryGraphGoodreadsGenresV3','storygraph-goodreads-genres-v3.js?v=20260820-1');
loadOnce('libGenreResolverResilientV1','genre-resolver-resilient-v1.js?v=20260820-1');
/* Goodreads resta primario: V2 recupera l'ISBN, V3 completa editore/data e vicini di serie direttamente da Goodreads. */
loadOnce('libGoodreadsPrimaryMetadataV1','goodreads-primary-metadata-v1.js?v=20260821-2');
loadOnce('libGoodreadsPrimaryRecoveryV2','goodreads-primary-recovery-v2.js?v=20260821-1');
loadOnce('libGoodreadsPrimaryDetailsV3','goodreads-primary-details-v3.js?v=20260821-1');
/* Se Goodreads/StoryGraph non restituiscono relazioni complete, usa una pagina-serie italiana verificabile; Wikidata è il fallback strutturato successivo. */
loadOnce('libItalianRetailerSeriesFallbackV1','italian-retailer-series-fallback-v1.js?v=20260822-1');
loadOnce('libWikidataSeriesFallbackV1','wikidata-series-fallback-v1.js?v=20260822-1');
loadOnce('libPublisherPlotLockV8','publisher-plot-lock-v8.js?v=20260820-12');
loadOnce('libSeriesSagaLockV9','series-saga-lock-v9.js?v=20260820-2');
loadOnce('libStoryGraphGenreLockV4','storygraph-genre-lock-v4.js?v=20260820-3');
loadOnce('libIsbnEnrichmentProgressV11','isbn-enrichment-progress-v10.js?v=20260820-2');
/* Router UI: blocca il vecchio lookup ISBN e mantiene un unico spinner continuo. */
loadOnce('libGoodreadsPrimaryUiRouterV2','goodreads-primary-spinner-guard-v1.js?v=20260821-2');
root.__LIB_METADATA_SOURCE_POLICY='goodreads-primary-then-storygraph-then-fallback-v3';
root.__LIB_GENRE_SOURCE_POLICY='goodreads-primary-then-storygraph-v3';
root.__LIB_PLOT_SOURCE_POLICY_PREVIOUS='publisher-first-official-retry-lock-v9-sanitized';
root.__LIB_PLOT_SOURCE_POLICY='goodreads-italian-primary-then-storygraph-translated-v3';
root.__LIB_SERIES_RELATION_POLICY_PREVIOUS='goodreads-primary-position-search-italian-physical-v3';
root.__LIB_SERIES_RELATION_POLICY='goodreads-primary-then-italian-retailer-then-wikidata-v1';
})();
