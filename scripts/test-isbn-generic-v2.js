const {chromium}=require('playwright-core');
const ISBN='9788868363710';
const EXPECTED={title:'I lupi del Calla. La torre nera (Vol. 5)',author:'Stephen King',publisher:'Sperling & Kupfer',year:'2017',genres:['Fantasy','Horror'],saga:'La Torre Nera',prequel:'La sfera del buio',sequel:'La canzone di Susannah'};
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);
const core=v=>norm(v).replace(/\b(?:vol|volume)\s*5\b/g,' ').replace(/\s+/g,' ').trim();
const sameTitle=(a,b)=>core(a)===core(b);
const exactGenres=v=>{const got=new Set(String(v||'').split(/[,;|]/).map(norm).filter(Boolean)),exp=new Set(EXPECTED.genres.map(norm));return got.size===exp.size&&[...exp].every(x=>got.has(x))};
const privacy=v=>/per quanto riguarda la pubblicita|terze parti selezionate|dati di geolocalizzazione|caratteristiche del dispositivo|annunci e contenuti personalizzati|consenso cookie|cookie policy/i.test(norm(v));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1400,height:1100}});
  page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
  page.on('response',r=>{if(r.status()>=400&&!/googleapis\.com\/books|r\.jina\.ai/.test(r.url()))console.log('HTTP',r.status(),r.url())});

  // Solo i due endpoint che GitHub Actions rate-limita vengono simulati con
  // dati già verificati. Wikipedia, il resolver di saga, la pagina editore,
  // la copertina e tutta la logica di Libri di Carta restano live.
  await page.route('**://www.googleapis.com/books/v1/volumes**',async route=>{
    const u=new URL(route.request().url()),q=u.searchParams.get('q')||'';if(!q.includes(ISBN)){await route.continue();return}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({kind:'books#volumes',totalItems:1,items:[{id:'GeGoswEACAAJ',volumeInfo:{title:EXPECTED.title,authors:[EXPECTED.author],publisher:EXPECTED.publisher,publishedDate:EXPECTED.year,industryIdentifiers:[{type:'ISBN_13',identifier:ISBN},{type:'ISBN_10',identifier:'8868363712'}],imageLinks:{thumbnail:'https://books.google.com/books/content?id=GeGoswEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'}}}]})});
  });
  await page.route('**://r.jina.ai/https://app.thestorygraph.com/browse?**',async route=>{
    await route.fulfill({status:200,contentType:'text/plain',body:`### I lupi del Calla. La torre nera\nStephen King\nISBN/UID: ${ISBN}\nFiction Fantasy Horror Adventurous Dark Mysterious Medium-paced\n`});
  });

  await page.goto('https://polentona.github.io/LibriSempreDiCarta/?generic-v2='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#addBookBtn').click();
  await page.locator('#editDialog[open]').waitFor({timeout:15000});
  await page.locator('#editCode').fill(ISBN);
  await page.locator('#lookupMetadataBtn').click();

  const ids=['editCode','editTitle','editAuthor','editPublisher','editPublishedDate','editCategory','editSaga','editPrequel','editSequel','editPlot','editCover'];
  let current={},metadataChoiceSeen=false,coverChoiceSeen=false;
  const until=Date.now()+110000;
  while(Date.now()<until){
    await page.waitForTimeout(650);
    const metas=page.locator('#metadataOverlay[open] .metadata-choice');
    if(await metas.count()){metadataChoiceSeen=true;const texts=await metas.allTextContents();let idx=texts.findIndex(t=>norm(t).includes('stephen king')&&norm(t).includes('sperling'));if(idx<0)idx=0;await metas.nth(idx).click().catch(()=>{});await page.waitForTimeout(500)}
    const covers=page.locator('#metadataOverlay[open] .cover-choice');
    if(await covers.count()){coverChoiceSeen=true;await covers.first().click().catch(()=>{});await page.waitForTimeout(400)}
    current=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value||''])),ids);
    if(sameTitle(current.editTitle,EXPECTED.title)&&same(current.editAuthor,EXPECTED.author)&&same(current.editPublisher,EXPECTED.publisher)&&String(current.editPublishedDate).includes(EXPECTED.year)&&exactGenres(current.editCategory)&&same(current.editSaga,EXPECTED.saga)&&same(current.editPrequel,EXPECTED.prequel)&&same(current.editSequel,EXPECTED.sequel)&&current.editPlot.length>500&&!privacy(current.editPlot)&&(current.editCover||coverChoiceSeen))break;
  }
  await page.waitForTimeout(2500);
  current=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value||''])),ids);
  const state=await page.evaluate(async({ISBN,EXPECTED})=>{
    const input={code:ISBN,title:document.getElementById('editTitle')?.value||EXPECTED.title,author:document.getElementById('editAuthor')?.value||EXPECTED.author,publisher:document.getElementById('editPublisher')?.value||EXPECTED.publisher,saga:document.getElementById('editSaga')?.value||EXPECTED.saga};
    let rel=null,official='';try{rel=await window.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS?.(input)}catch(e){rel={error:String(e)}}try{official=await window.__LIB_RESOLVE_OFFICIAL_PLOT?.(input)||''}catch(e){official='__ERROR__'+String(e)}
    let src='';try{src=await (await fetch('series-verified-order-v2.js?source-check='+Date.now(),{cache:'no-store'})).text()}catch(e){}
    return{rel,official,loader:!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V40,seriesV2:!!window.__LIB_VERIFIED_SERIES_ORDER_V2,seriesPolicy:window.__LIB_SERIES_RELATION_POLICY||'',catalogPolicy:window.__LIB_SERIES_CATALOG_POLICY||'',plotV8:!!window.__LIB_PUBLISHER_PLOT_LOCK_V8,plotPolicy:window.__LIB_PLOT_SOURCE_POLICY||'',genreV2:!!window.__LIB_GENRE_WHITELIST_ENFORCER_V2,genrePolicy:window.__LIB_GENRE_SOURCE_POLICY||'',genreLast:window.__LIB_GENRE_WHITELIST_LAST__||null,noSpecific:!!src&&!src.includes(ISBN)&&!src.includes(EXPECTED.author)&&!src.includes(EXPECTED.saga),seriesDiag:window.__LIB_VERIFIED_SERIES_V2_LAST__||null,seriesSource:window.__LIB_VERIFIED_SERIES_V2_LAST_SOURCE||null};
  },{ISBN,EXPECTED});
  const status=await page.locator('#lookupStatus').innerText();
  console.log('FINAL',JSON.stringify({current,status,metadataChoiceSeen,coverChoiceSeen,state:{...state,officialLength:state.official.length,officialPreview:state.official.slice(0,180)}}));
  const bad=[];
  if(!state.loader||!state.seriesV2)bad.push('series-runtime');
  if(state.seriesPolicy!=='structured-book-relations-then-ordered-series')bad.push('series-policy:'+state.seriesPolicy);
  if(state.catalogPolicy!=='no-hardcoded-relations')bad.push('catalog-policy');
  if(!state.noSpecific)bad.push('book-specific-production-code');
  if(!state.plotV8||state.plotPolicy!=='publisher-first-official-retry-lock-v8')bad.push('plot-v8');
  if(!state.genreV2||state.genrePolicy!=='storygraph-then-goodreads-whitelist')bad.push('genre-runtime');
  if(!same(current.editCode,ISBN))bad.push('isbn');
  if(!sameTitle(current.editTitle,EXPECTED.title))bad.push('title:'+current.editTitle);
  if(!same(current.editAuthor,EXPECTED.author))bad.push('author');
  if(!same(current.editPublisher,EXPECTED.publisher))bad.push('publisher');
  if(!String(current.editPublishedDate).includes(EXPECTED.year))bad.push('year');
  if(!exactGenres(current.editCategory))bad.push('genres:'+current.editCategory);
  if(!same(current.editSaga,EXPECTED.saga))bad.push('saga:'+current.editSaga);
  if(!same(current.editPrequel,EXPECTED.prequel))bad.push('prequel:'+current.editPrequel);
  if(!same(current.editSequel,EXPECTED.sequel))bad.push('sequel:'+current.editSequel);
  if(/during his|chancellor|the shining/i.test(current.editPrequel+' '+current.editSequel))bad.push('relation-garbage');
  if(!state.rel?.verified||!same(state.rel.saga,EXPECTED.saga)||!same(state.rel.prequel,EXPECTED.prequel)||!same(state.rel.sequel,EXPECTED.sequel))bad.push('verified-relations');
  if(state.rel?.method!=='structured-book-infobox')bad.push('relation-method:'+String(state.rel?.method||''));
  if(current.editPlot.length<500||privacy(current.editPlot)||!/^rumore di passi sul sentiero del vettore/i.test(current.editPlot.trim()))bad.push('plot');
  if((state.official||'').length<500||!same(current.editPlot,state.official))bad.push('official-plot');
  if(!current.editCover&&!coverChoiceSeen)bad.push('cover');
  await browser.close();
  if(bad.length)throw new Error(bad.join(' | '));
  console.log('ISBN_9788868363710_ALL_FIELDS_GENERIC_V2_OK');
})().catch(e=>{console.error('ISBN_9788868363710_ALL_FIELDS_GENERIC_V2_FAIL',e.stack||e.message);process.exit(1)});
