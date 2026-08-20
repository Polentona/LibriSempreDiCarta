const fs=require('fs'),vm=require('vm');
global.window=global;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let networkCalls=0;
global.fetch=async url=>{
  networkCalls++;const u=String(url);await sleep(15);
  if(u.includes('libraccio.it'))return new Response(`## Descrizione\nÈ un semplice libro antico, ma custodisce un segreto. Questa è una trama italiana sufficientemente lunga per verificare il fallback diretto senza URL, prezzi o pulsanti commerciali. Un secondo periodo completa la sinossi del romanzo.\n\n## Dettagli\nEditore: TEA`,{status:200});
  if(u.includes('thestorygraph.com'))return new Response('STORYGRAPH_OK '.repeat(30),{status:200});
  return new Response('GENERIC_OK '.repeat(30),{status:200});
};
vm.runInThisContext(fs.readFileSync('isbn-request-broker-v1.js','utf8'));

(async()=>{
  const same='https://r.jina.ai/https://example.com/book';const before=networkCalls;
  const rr=await Promise.all([fetch(same),fetch(same),fetch(same)]);await Promise.all(rr.map(r=>r.text()));
  if(networkCalls-before!==1)throw new Error('Il broker non ha deduplicato le richieste identiche: '+(networkCalls-before));

  global.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8=true;let seriesCalls=0;
  const good={saga:'Will Piper',prequel:'La biblioteca dei morti',sequel:'I custodi della biblioteca',authoritative:true,verified:true,checked:true,position:2,initial:false,terminal:false,localizedPrequel:true,localizedSequel:true,localizationPending:false};
  global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>{seriesCalls++;return seriesCalls===1?good:null};
  global.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;
  vm.runInThisContext(fs.readFileSync('series-resolver-stability-v1.js','utf8'));
  global.__LIB_SERIES_RESOLVER_STABILITY_V1_TEST__.install();
  const r1=await global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper',saga:''});
  const r2=await global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper',saga:'Will Piper'});
  if(r1?.prequel!=='La biblioteca dei morti'||r2?.sequel!=='I custodi della biblioteca'||seriesCalls!==1)throw new Error('Cache relazioni instabile: '+JSON.stringify({r1,r2,seriesCalls}));

  global.__LIB_STORYGRAPH_GOODREADS_GENRES_V3=true;
  global.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async()=>({found:false,transient:true,genres:[],source:'storygraph-unavailable'});
  global.__LIB_STORYGRAPH_GENRES_TEST__={
    storyBlocks(raw){return raw.includes('STORYGRAPH_OK')?[{title:'Book of Souls',code:'',text:'Book of Souls Glenn Cooper',raw,genres:['Storico','Giallo','Thriller'],tagLine:'fiction historical mystery thriller mysterious tense fast-paced'}]:[]},
    storyMatch(blocks){return blocks[0]||null},storyLinks(){return[]}
  };
  vm.runInThisContext(fs.readFileSync('genre-resolver-resilient-v1.js','utf8'));
  global.__LIB_GENRE_RESOLVER_RESILIENT_V1_TEST__.install();
  const g=await global.__LIB_RESOLVE_AUTHORITATIVE_GENRES({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper'});
  if(!g?.found||JSON.stringify(g.genres)!==JSON.stringify(['Storico','Giallo','Thriller']))throw new Error('Retry StoryGraph non riuscito: '+JSON.stringify(g));

  global.__LIB_CLEAN_AUTOMATIC_PLOT=v=>String(v||'').replace(/\s+/g,' ').trim();
  global.__LIB_RESOLVE_OFFICIAL_PLOT=async()=>'';
  vm.runInThisContext(fs.readFileSync('plot-resolver-resilient-v1.js','utf8'));
  global.__LIB_PLOT_RESOLVER_RESILIENT_V1_TEST__.install();
  const p=await global.__LIB_RESOLVE_OFFICIAL_PLOT({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper',publisher:'TEA'});
  if(p.length<120||/https?|www\.|€|\bacquista\b/i.test(p))throw new Error('Fallback trama non valido: '+p);

  console.log('ISBN_NETWORK_RESILIENCE_V1_OK',JSON.stringify({broker:global.__LIB_ISBN_REQUEST_BROKER_STATS__,series:r2,genres:g.genres,plotLength:p.length,networkCalls}));
})().catch(e=>{console.error('ISBN_NETWORK_RESILIENCE_V1_FAIL',e.stack||e.message);process.exit(1)});
