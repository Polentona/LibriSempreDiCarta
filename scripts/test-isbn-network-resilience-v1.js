const fs=require('fs'),vm=require('vm');
global.window=global;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let networkCalls=0;
global.fetch=async url=>{
  networkCalls++;const u=String(url);await sleep(15);
  if(u.includes('it.wikipedia.org/w/api.php')){
    const x=new URL(u),search=x.searchParams.get('srsearch')||'',pageids=x.searchParams.get('pageids')||'',titles=x.searchParams.get('titles')||'',prop=x.searchParams.get('prop')||'';
    if(prop==='revisions'&&titles==='Glenn Cooper')return new Response(JSON.stringify({query:{pages:[{pageid:201,title:'Glenn Cooper',revisions:[{slots:{main:{content:`== Opere ==\n=== Trilogia La biblioteca dei morti ===\n* La biblioteca dei morti (The Library of the Dead, 2009)\n* Il libro delle anime (The Book of Souls, 2010)\n* I custodi della biblioteca (The Librarians, 2012)`}}}]}]}}),{status:200,headers:{'content-type':'application/json'}});
    if(prop==='revisions'&&titles==='Simon Beckett')return new Response(JSON.stringify({query:{pages:[{pageid:202,title:'Simon Beckett',revisions:[{slots:{main:{content:`== Opere ==\n=== Serie con David Hunter ===\n# La chimica della morte (The Chemistry of Death) (2006)\n# Scritto nelle ossa (Written in Bone) (2007)\n# I sussurri della morte (Whispers of the Dead) (2009)\n# La voce dei morti (The Calling of the Grave) (2010)`}}}]}]}}),{status:200,headers:{'content-type':'application/json'}});
    if(x.searchParams.get('list')==='search'){
      if(search.includes('Library of the Dead'))return new Response(JSON.stringify({query:{search:[{pageid:101,title:'La biblioteca dei morti',snippet:'Library of the Dead è un romanzo di Glenn Cooper.'}]}}),{status:200,headers:{'content-type':'application/json'}});
      if(search.includes('The Librarians'))return new Response(JSON.stringify({query:{search:[{pageid:102,title:'I custodi della biblioteca',snippet:'The Librarians è un romanzo di Glenn Cooper.'},{pageid:103,title:'The Librarians',snippet:'serie televisiva'}]}}),{status:200,headers:{'content-type':'application/json'}});
      if(search.includes('Calling of the Grave'))return new Response(JSON.stringify({query:{search:[{pageid:104,title:'Simon Beckett',snippet:'La voce dei morti (The Calling of the Grave)'}]}}),{status:200,headers:{'content-type':'application/json'}})
    }
    if(pageids.includes('101'))return new Response(JSON.stringify({query:{pages:{101:{pageid:101,title:'La biblioteca dei morti',extract:'La biblioteca dei morti, titolo originale Library of the Dead, è un romanzo di Glenn Cooper.'}}}}),{status:200,headers:{'content-type':'application/json'}});
    if(pageids.includes('102'))return new Response(JSON.stringify({query:{pages:{102:{pageid:102,title:'I custodi della biblioteca',extract:'I custodi della biblioteca, titolo originale The Librarians, è un romanzo di Glenn Cooper.'},103:{pageid:103,title:'The Librarians',extract:'Serie televisiva.'}}}}),{status:200,headers:{'content-type':'application/json'}})
  }
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
  const canonical={saga:'Will Piper',prequel:'Library of the Dead',sequel:'The Librarians',authoritative:true,verified:true,checked:true,position:2,initial:false,terminal:false,localizedPrequel:false,localizedSequel:false,localizationPending:true};
  global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>{seriesCalls++;return canonical};
  global.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;
  vm.runInThisContext(fs.readFileSync('series-localization-resilient-v1.js','utf8'));
  global.__LIB_SERIES_LOCALIZATION_RESILIENT_V1_TEST__.install();
  vm.runInThisContext(fs.readFileSync('series-resolver-stability-v1.js','utf8'));
  global.__LIB_SERIES_RESOLVER_STABILITY_V1_TEST__.install();
  const r1=await global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper',saga:''});
  const r2=await global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS({code:'9788850225798',title:'Il libro delle anime',author:'Glenn Cooper',saga:'Will Piper'});
  if(r1?.prequel!=='La biblioteca dei morti'||r1?.sequel!=='I custodi della biblioteca'||r1?.localizedPrequel!==true||r1?.localizedSequel!==true||r2?.sequel!=='I custodi della biblioteca'||seriesCalls!==1)throw new Error('Localizzazione/cache relazioni instabile: '+JSON.stringify({r1,r2,seriesCalls}));
  const loc=global.__LIB_SERIES_LOCALIZATION_RESILIENT_V1_TEST__;
  const beckettPre=await loc.wikipediaItalianTitle('Written in Bone','Simon Beckett');
  const beckettSeq=await loc.wikipediaItalianTitle('The Calling of the Grave','Simon Beckett');
  if(beckettPre!=='Scritto nelle ossa'||beckettSeq!=='La voce dei morti')throw new Error('Bibliografia autore non ha localizzato Beckett: '+JSON.stringify({beckettPre,beckettSeq}));
  if(!global.__LIB_SERIES_LOCALIZATION_RESILIENT_V2||!global.__LIB_SERIES_LOCALIZATION_RESILIENT_V2_INSTALLED)throw new Error('Marker localizzatore V2 mancanti');

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

  console.log('ISBN_NETWORK_RESILIENCE_V2_OK',JSON.stringify({broker:global.__LIB_ISBN_REQUEST_BROKER_STATS__,series:r2,beckett:{prequel:beckettPre,sequel:beckettSeq},genres:g.genres,plotLength:p.length,networkCalls}));
})().catch(e=>{console.error('ISBN_NETWORK_RESILIENCE_V2_FAIL',e.stack||e.message);process.exit(1)});
