const { chromium } = require('playwright');

const ISBN='9788868363710';
const EXPECTED={
  title:'I lupi del Calla. La torre nera',
  author:'Stephen King',
  publisher:'Sperling & Kupfer',
  year:'2017',
  genres:['Fantasy','Horror'],
  saga:'La Torre Nera',
  prequel:'La sfera del buio',
  sequel:'La canzone di Susannah'
};
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);
const titleCore=v=>norm(v).replace(/\b(?:vol|volume)\s*\d+\b/g,' ').replace(/\s+/g,' ').trim();
const sameTitle=(a,b)=>titleCore(a)===titleCore(b)||titleCore(a).startsWith(titleCore(b)+' ')||titleCore(b).startsWith(titleCore(a)+' ');
const genreSet=v=>new Set(String(v||'').split(/[,;|]/).map(norm).filter(Boolean));
const exactGenres=v=>{const got=genreSet(v),exp=new Set(EXPECTED.genres.map(norm));return got.size===exp.size&&[...exp].every(x=>got.has(x))};
const privacy=v=>/per quanto riguarda la pubblicita|terze parti selezionate|dati di geolocalizzazione|caratteristiche del dispositivo|annunci e contenuti personalizzati|consenso cookie|cookie policy/i.test(norm(v));

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
  page.on('response',r=>{if(r.status()>=400&&!/googleapis\.com\/books|r\.jina\.ai/.test(r.url()))console.log('HTTP',r.status(),r.url())});

  /* GitHub Actions viene spesso limitato da Google Books. Qui simuliamo solo
     la risposta bibliografica ISBN già verificata; il sito caricato è quello LIVE. */
  await page.route('**://www.googleapis.com/books/v1/volumes**',async route=>{
    const u=new URL(route.request().url()),q=u.searchParams.get('q')||'';
    if(!q.includes(ISBN)){await route.continue();return}
    const body={kind:'books#volumes',totalItems:1,items:[{id:'GeGoswEACAAJ',volumeInfo:{
      title:'I lupi del Calla. La torre nera (Vol. 5)',authors:[EXPECTED.author],publisher:EXPECTED.publisher,publishedDate:EXPECTED.year,
      industryIdentifiers:[{type:'ISBN_13',identifier:ISBN},{type:'ISBN_10',identifier:'8868363712'}],
      imageLinks:{thumbnail:'https://books.google.com/books/content?id=GeGoswEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'}
    }}]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });

  /* StoryGraph/Jina applica rate limit ai runner. La fixture riproduce le
     etichette verificate sulla pagina StoryGraph: Fiction, Fantasy, Horror + mood/pace. */
  await page.route(/r\.jina\.ai\/https?:\/\/app\.thestorygraph\.com\/browse/i,async route=>{
    await route.fulfill({status:200,contentType:'text/plain',body:`### I lupi del Calla. La torre nera\nStephen King\nISBN/UID: ${ISBN}\nFiction Fantasy Horror Adventurous Dark Mysterious Medium-paced\n`});
  });

  await page.goto('https://polentona.github.io/LibriSempreDiCarta/?single-owner-test='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#addBookBtn').click();
  await page.locator('#editDialog[open]').waitFor({timeout:15000});
  await page.locator('#editCode').fill(ISBN);
  await page.locator('#lookupMetadataBtn').click();

  const ids=['editCode','editTitle','editAuthor','editPublisher','editPublishedDate','editCategory','editSaga','editPrequel','editSequel','editPlot','editCover'];
  const read=()=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value||''])),ids);
  let current={},metadataChoiceSeen=false,coverChoiceSeen=false;
  const until=Date.now()+110000;
  while(Date.now()<until){
    await page.waitForTimeout(500);
    const metas=page.locator('#metadataOverlay[open] .metadata-choice');
    if(await metas.count()){
      metadataChoiceSeen=true;const texts=await metas.allTextContents();
      let idx=texts.findIndex(t=>norm(t).includes('stephen king')&&norm(t).includes('sperling'));if(idx<0)idx=0;
      await metas.nth(idx).click().catch(()=>{});await page.waitForTimeout(400);
    }
    const covers=page.locator('#metadataOverlay[open] .cover-choice');
    if(await covers.count()){coverChoiceSeen=true;await covers.first().click().catch(()=>{});await page.waitForTimeout(300)}
    current=await read();
    const ready=sameTitle(current.editTitle,EXPECTED.title)&&same(current.editAuthor,EXPECTED.author)&&same(current.editPublisher,EXPECTED.publisher)
      &&String(current.editPublishedDate).includes(EXPECTED.year)&&exactGenres(current.editCategory)
      &&same(current.editSaga,EXPECTED.saga)&&same(current.editPrequel,EXPECTED.prequel)&&same(current.editSequel,EXPECTED.sequel)
      &&current.editPlot.length>=500&&!privacy(current.editPlot)&&(current.editCover||coverChoiceSeen);
    if(ready)break;
  }

  current=await read();
  const stable=[];
  for(let i=0;i<12;i++){
    stable.push(await page.evaluate(()=>({saga:document.getElementById('editSaga')?.value||'',prequel:document.getElementById('editPrequel')?.value||'',sequel:document.getElementById('editSequel')?.value||'',genres:document.getElementById('editCategory')?.value||''})));
    await page.waitForTimeout(500);
  }
  current=await read();

  const state=await page.evaluate(async({ISBN})=>{
    const get=id=>document.getElementById(id)?.value||'';
    const input={code:ISBN,title:get('editTitle'),author:get('editAuthor'),publisher:get('editPublisher'),saga:get('editSaga')};
    let rel=null,genres=null,official='';
    try{rel=await window.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS?.(input)}catch(e){rel={error:String(e)}}
    try{genres=await window.__LIB_RESOLVE_AUTHORITATIVE_GENRES?.(input)}catch(e){genres={error:String(e)}}
    try{official=await window.__LIB_RESOLVE_OFFICIAL_PLOT?.(input)||''}catch(e){official='__ERROR__'+String(e)}
    let seriesSrc='',loaderSrc='';
    try{seriesSrc=await (await fetch('series-authoritative-runtime-v4.js?source-check='+Date.now(),{cache:'no-store'})).text()}catch(e){}
    try{loaderSrc=await (await fetch('series-neighbors-standalone-v5.js?source-check='+Date.now(),{cache:'no-store'})).text()}catch(e){}
    return{
      rel,genres,official,
      loaderV42:!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V42,
      seriesV4:!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4,
      seriesGuard:!!window.__LIB_SERIES_SINGLE_OWNER_GUARD_V1,
      genreV3:!!window.__LIB_GENRES_AUTHORITATIVE_V3,
      plotV8:!!window.__LIB_PUBLISHER_PLOT_LOCK_V8,
      seriesPolicy:window.__LIB_SERIES_RELATION_POLICY||'',
      genrePolicy:window.__LIB_GENRE_SOURCE_POLICY||'',
      plotPolicy:window.__LIB_PLOT_SOURCE_POLICY||'',
      seriesLast:window.__LIB_SERIES_V4_LAST||null,
      genreLast:window.__LIB_GENRE_V3_LAST||null,
      noSpecific:!!seriesSrc&&!seriesSrc.includes(ISBN)&&!seriesSrc.includes('Stephen King')&&!seriesSrc.includes('La Torre Nera'),
      noLegacyLoads:!!loaderSrc&&!/series-verified-order-v1|series-verified-order-v2|series-verified-saga-v3|storygraph-goodreads-genres-v2|genre-whitelist-enforcer-v2/.test(loaderSrc)
    };
  },{ISBN});

  console.log('FINAL',JSON.stringify({current,stable,metadataChoiceSeen,coverChoiceSeen,state:{...state,officialLength:state.official.length,officialPreview:state.official.slice(0,140)}}));
  const bad=[];
  if(!state.loaderV42||!state.seriesV4||!state.seriesGuard)bad.push('single-series-runtime');
  if(!state.genreV3)bad.push('single-genre-runtime');
  if(state.seriesPolicy!=='single-owner-structured-book-then-ordered-series-v4')bad.push('series-policy:'+state.seriesPolicy);
  if(state.genrePolicy!=='storygraph-then-goodreads-only-if-storygraph-absent-v3')bad.push('genre-policy:'+state.genrePolicy);
  if(!state.noSpecific)bad.push('book-specific-production-code');
  if(!state.noLegacyLoads)bad.push('legacy-resolver-loaded');
  if(!same(current.editCode,ISBN))bad.push('isbn');
  if(!sameTitle(current.editTitle,EXPECTED.title))bad.push('title:'+current.editTitle);
  if(!same(current.editAuthor,EXPECTED.author))bad.push('author:'+current.editAuthor);
  if(!same(current.editPublisher,EXPECTED.publisher))bad.push('publisher:'+current.editPublisher);
  if(!String(current.editPublishedDate).includes(EXPECTED.year))bad.push('year:'+current.editPublishedDate);
  if(!exactGenres(current.editCategory))bad.push('genres:'+current.editCategory);
  if(!same(current.editSaga,EXPECTED.saga))bad.push('saga:'+current.editSaga);
  if(!same(current.editPrequel,EXPECTED.prequel))bad.push('prequel:'+current.editPrequel);
  if(!same(current.editSequel,EXPECTED.sequel))bad.push('sequel:'+current.editSequel);
  if(/during his|chancellor|the shining/i.test(current.editPrequel+' '+current.editSequel))bad.push('relation-garbage');
  if(!state.rel?.verified||!same(state.rel.prequel,EXPECTED.prequel)||!same(state.rel.sequel,EXPECTED.sequel))bad.push('verified-relations');
  if(!state.genres?.found||!exactGenres((state.genres.genres||[]).join(', '))||state.genres.source!=='storygraph')bad.push('storygraph-genres');
  if(current.editPlot.length<500||privacy(current.editPlot)||!/^rumore di passi sul sentiero del vettore/i.test(current.editPlot.trim()))bad.push('plot');
  if((state.official||'').length<500||!same(current.editPlot,state.official))bad.push('official-plot');
  if(!current.editCover&&!coverChoiceSeen)bad.push('cover');
  for(const s of stable){
    if(!same(s.saga,EXPECTED.saga)||!same(s.prequel,EXPECTED.prequel)||!same(s.sequel,EXPECTED.sequel)||!exactGenres(s.genres)){bad.push('unstable-fields:'+JSON.stringify(s));break}
  }

  await browser.close();
  if(bad.length)throw new Error(bad.join(' | '));
  console.log('ISBN_9788868363710_ALL_FIELDS_SINGLE_OWNER_OK');
})().catch(e=>{console.error('ISBN_9788868363710_ALL_FIELDS_SINGLE_OWNER_FAIL',e.stack||e.message);process.exit(1)});
