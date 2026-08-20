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
const exactGenres=v=>{
  const got=new Set(String(v||'').split(/[,;|]/).map(norm).filter(Boolean));
  const exp=new Set(EXPECTED.genres.map(norm));
  return got.size===exp.size&&[...exp].every(x=>got.has(x));
};

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));

  await page.route('**://www.googleapis.com/books/v1/volumes**',async route=>{
    const u=new URL(route.request().url()),q=u.searchParams.get('q')||'';
    if(!q.includes(ISBN)){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({kind:'books#volumes',totalItems:0})});
      return;
    }
    const body={kind:'books#volumes',totalItems:1,items:[{id:'GeGoswEACAAJ',volumeInfo:{
      title:'I lupi del Calla. La torre nera (Vol. 5)',
      authors:[EXPECTED.author],
      publisher:EXPECTED.publisher,
      publishedDate:EXPECTED.year,
      description:'Roland e il suo ka-tet arrivano nel Calla e affrontano i Lupi. Fixture di integrazione usata soltanto nel test della pull request.',
      categories:['Horror'],
      industryIdentifiers:[{type:'ISBN_13',identifier:ISBN},{type:'ISBN_10',identifier:'8868363712'}]
    }}]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });

  await page.route('**://openlibrary.org/api/books**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route('**://covers.openlibrary.org/**',route=>route.fulfill({status:404,body:''}));

  const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64');
  await page.route('**://img.messaggerielibri.it/**',route=>route.fulfill({status:200,contentType:'image/png',body:pixel}));

  await page.route(/r\.jina\.ai\/https?:\/\/app\.thestorygraph\.com\/browse/i,async route=>{
    await route.fulfill({status:200,contentType:'text/plain',body:`### I lupi del Calla. La torre nera\nStephen King\nISBN/UID: ${ISBN}\nFiction Fantasy Horror Adventurous Dark Mysterious Medium-paced\n`});
  });

  await page.route('**://it.wikipedia.org/w/api.php**',async route=>{
    const u=new URL(route.request().url());
    const action=u.searchParams.get('action');
    if(action==='query'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[{title:'I lupi del Calla'}]}})});
      return;
    }
    if(action==='parse'){
      const html='<p>Romanzo di Stephen King.</p><table class="infobox"><tr><th>Serie</th><td>La Torre Nera</td></tr><tr><th>Preceduto da</th><td>La sfera del buio</td></tr><tr><th>Seguito da</th><td>La canzone di Susannah</td></tr></table>';
      const wt='{{Libro|autore=Stephen King|serie=La Torre Nera|preceduto da=La sfera del buio|seguito da=La canzone di Susannah}}';
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({parse:{text:{'*':html},wikitext:{'*':wt}}})});
      return;
    }
    await route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.route('**://en.wikipedia.org/w/api.php**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[]}})}));

  try{
    await page.goto('http://127.0.0.1:8000/?pr-isbn-wolves='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V44&&!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4&&!!window.__LIB_STORYGRAPH_GOODREADS_GENRES_V3,null,{timeout:20000});

    await page.locator('#addBookBtn').click();
    await page.locator('#editDialog[open]').waitFor({timeout:15000});
    await page.locator('#editCode').fill(ISBN);
    await page.locator('#lookupMetadataBtn').click();

    const ids=['editCode','editTitle','editAuthor','editPublisher','editPublishedDate','editCategory','editSaga','editPrequel','editSequel'];
    const read=()=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value||''])),ids);
    let current={};
    const deadline=Date.now()+45000;
    while(Date.now()<deadline){
      await page.waitForTimeout(350);
      const choices=page.locator('#metadataOverlay[open] .metadata-choice');
      if(await choices.count())await choices.first().click().catch(()=>{});
      current=await read();
      if(sameTitle(current.editTitle,EXPECTED.title)&&same(current.editAuthor,EXPECTED.author)&&same(current.editPublisher,EXPECTED.publisher)
        &&String(current.editPublishedDate).includes(EXPECTED.year)&&exactGenres(current.editCategory)
        &&same(current.editSaga,EXPECTED.saga)&&same(current.editPrequel,EXPECTED.prequel)&&same(current.editSequel,EXPECTED.sequel))break;
    }

    current=await read();
    const stable=[];
    for(let i=0;i<12;i++){
      stable.push(await page.evaluate(()=>({
        saga:document.getElementById('editSaga')?.value||'',
        prequel:document.getElementById('editPrequel')?.value||'',
        sequel:document.getElementById('editSequel')?.value||'',
        genres:document.getElementById('editCategory')?.value||''
      })));
      await page.waitForTimeout(300);
    }

    const state=await page.evaluate(()=>({
      loaderV44:!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V44,
      seriesV4:!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V4,
      genreV3:!!window.__LIB_STORYGRAPH_GOODREADS_GENRES_V3,
      seriesPolicy:window.__LIB_SERIES_RELATION_POLICY||'',
      genrePolicy:window.__LIB_GENRE_SOURCE_POLICY||'',
      genreLast:window.__LIB_GENRE_DELEGATE_LAST__||null,
      seriesLast:window.__LIB_SERIES_V4_APPLIED||window.__LIB_SERIES_V4_LAST||null
    }));

    console.log('PR_FINAL',JSON.stringify({current,stable,state,pageErrors}));
    const bad=[];
    if(!state.loaderV44||!state.seriesV4)bad.push('series-runtime');
    if(!state.genreV3)bad.push('genre-runtime');
    if(state.seriesPolicy!=='single-owner-structured-book-then-ordered-series-v4')bad.push('series-policy:'+state.seriesPolicy);
    if(state.genrePolicy!=='storygraph-direct-then-goodreads-only-if-absent-v3')bad.push('genre-policy:'+state.genrePolicy);
    if(!same(current.editCode,ISBN))bad.push('isbn');
    if(!sameTitle(current.editTitle,EXPECTED.title))bad.push('title:'+current.editTitle);
    if(!same(current.editAuthor,EXPECTED.author))bad.push('author:'+current.editAuthor);
    if(!same(current.editPublisher,EXPECTED.publisher))bad.push('publisher:'+current.editPublisher);
    if(!String(current.editPublishedDate).includes(EXPECTED.year))bad.push('year:'+current.editPublishedDate);
    if(!exactGenres(current.editCategory))bad.push('genres:'+current.editCategory);
    if(!same(current.editSaga,EXPECTED.saga))bad.push('saga:'+current.editSaga);
    if(!same(current.editPrequel,EXPECTED.prequel))bad.push('prequel:'+current.editPrequel);
    if(!same(current.editSequel,EXPECTED.sequel))bad.push('sequel:'+current.editSequel);
    if(same(current.editPrequel,EXPECTED.sequel))bad.push('prequel-is-sequel');
    if(!current.editSequel.trim())bad.push('empty-sequel');
    for(const s of stable){
      if(!same(s.saga,EXPECTED.saga)||!same(s.prequel,EXPECTED.prequel)||!same(s.sequel,EXPECTED.sequel)||!exactGenres(s.genres)){
        bad.push('unstable:'+JSON.stringify(s));break;
      }
    }
    if(pageErrors.length)bad.push('page-errors:'+pageErrors.join(' || '));
    if(bad.length)throw new Error(bad.join(' | '));
    console.log('PR_ISBN_9788868363710_OK');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error('PR_ISBN_9788868363710_FAIL',e.stack||e.message);process.exit(1)});
