const {chromium}=require('playwright');

const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);
const pad=s=>String(s)+'\nDeterministic Goodreads fixture used by the pull request test. '.repeat(4);

const DARK_SERIES='https://www.goodreads.com/series/40750-the-dark-tower';
const HALO_SERIES='https://www.goodreads.com/series/59827-halo';
const current={
  sphere:'https://www.goodreads.com/book/show/4004-la-sfera-del-buio',
  wolves:'https://www.goodreads.com/book/show/5005-i-lupi-del-calla',
  sacrifice:'https://www.goodreads.com/book/show/2002-sacrifice'
};
const canonical={
  waste:'https://www.goodreads.com/book/show/3003-the-waste-lands',
  wizard:'https://www.goodreads.com/book/show/4000-wizard-and-glass',
  wind:'https://www.goodreads.com/book/show/4500-the-wind-through-the-keyhole',
  wolves:'https://www.goodreads.com/book/show/5000-wolves-of-the-calla',
  song:'https://www.goodreads.com/book/show/6000-song-of-susannah',
  halo1:'https://www.goodreads.com/book/show/1000-halo',
  halo2:'https://www.goodreads.com/book/show/2000-hades',
  halo3:'https://www.goodreads.com/book/show/3000-heaven'
};

function searchFixture(q){
  const n=norm(q);
  if(n.includes('9788868363697')||n.includes('la sfera del buio'))return pad(`[La sfera del buio (La Torre Nera, #4)](${current.sphere})\nStephen King`);
  if(n.includes('9788868363710')||n.includes('i lupi del calla'))return pad(`[I lupi del Calla (La Torre Nera, #5)](${current.wolves})\nStephen King`);
  if(n.includes('sacrifice')&&n.includes('alexandra'))return pad(`[Sacrifice (Halo, #2)](${current.sacrifice})\nAlexandra Adornetto`);
  return pad('No matching Goodreads books in this deterministic fixture.');
}
function bookFixture(url){
  if(url===current.sphere)return pad(`# La sfera del buio. La torre nera\nStephen King\n### The Dark Tower #4\n[The Dark Tower](${DARK_SERIES})`);
  if(url===current.wolves)return pad(`# I lupi del Calla. La torre nera\nStephen King\n### The Dark Tower #5\n[The Dark Tower](${DARK_SERIES})`);
  if(url===current.sacrifice)return pad(`# Sacrifice\nAlexandra Adornetto\n### Halo #2\n[Halo](${HALO_SERIES})`);
  return pad('Generic Goodreads canonical book page.');
}
function seriesFixture(url){
  if(url===DARK_SERIES)return pad(`
# The Dark Tower Series
### Book 3
[The Waste Lands (The Dark Tower, #3)](${canonical.waste})
### Book 4
[Wizard and Glass (The Dark Tower, #4)](${canonical.wizard})
### Book 4.5
[The Wind Through the Keyhole (The Dark Tower, #4.5)](${canonical.wind})
### Book 5
[Wolves of the Calla (The Dark Tower, #5)](${canonical.wolves})
### Book 6
[Song of Susannah (The Dark Tower, #6)](${canonical.song})
### Book 1-3
[The Dark Tower #1-3](https://www.goodreads.com/book/show/1300-dark-tower-box)
`);
  if(url===HALO_SERIES)return pad(`
# Halo Series
### Book 1
[Halo (Halo, #1)](${canonical.halo1})
### Book 2
[Hades (Halo, #2)](${canonical.halo2})
### Book 3
[Heaven (Halo, #3)](${canonical.halo3})
`);
  return pad('Unknown Goodreads series fixture.');
}
const editions={
  '3003':'Terre Desolate (La Torre Nera, #3)',
  '4000':'La sfera del buio (La Torre Nera, #4)',
  '5000':'I lupi del Calla (La Torre Nera, #5)',
  '6000':'La canzone di Susannah (La Torre Nera, #6)',
  '1000':'Rebel (Halo, #1)',
  '3000':'Heaven (Halo, #3)'
};
function editionsFixture(id){
  const title=editions[id];if(!title)return pad('No Italian edition in this fixture.');
  return pad(`## Editions\n[${title}](https://www.goodreads.com/book/show/9${id}-italian-edition)\nPublished by an Italian publisher\nEdition language: Italian\n`);
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const pageErrors=[];let wikiCalls=0;
  page.on('pageerror',e=>pageErrors.push(e.message));

  await page.route('**://r.jina.ai/**',async route=>{
    let requested=route.request().url();try{requested=decodeURIComponent(requested)}catch(e){}
    const marker=requested.indexOf('https://www.goodreads.com/');
    const target=marker>=0?requested.slice(marker):requested;
    let body='';
    if(target.includes('/search?')){
      let q='';try{q=new URL(target).searchParams.get('q')||''}catch(e){}
      body=searchFixture(q);
    }else if(target.startsWith(DARK_SERIES)||target.startsWith(HALO_SERIES))body=seriesFixture(target.split('?')[0]);
    else if(target.includes('/book/editions/')){
      const id=(target.match(/\/book\/editions\/(\d+)/)||[])[1]||'';body=editionsFixture(id);
    }else body=bookFixture(target.split('?')[0]);
    await route.fulfill({status:200,contentType:'text/plain',body});
  });

  await page.route('**://it.wikipedia.org/w/api.php**',async route=>{
    wikiCalls++;
    const u=new URL(route.request().url()),action=u.searchParams.get('action');
    if(action==='query')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[{title:'Voce volutamente sbagliata'}]}})});
    const html='<p>Stephen King Alexandra Adornetto</p><table class="infobox"><tr><th>Serie</th><td>Serie sbagliata</td></tr><tr><th>Preceduto da</th><td>La canzone di Susannah</td></tr></table>';
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({parse:{text:{'*':html},wikitext:{'*':'{{Libro|preceduto da=La canzone di Susannah}}'}}})});
  });
  await page.route('**://en.wikipedia.org/w/api.php**',route=>{wikiCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[]}})})});

  try{
    await page.goto('http://127.0.0.1:8000/?goodreads-series-primary='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V45&&!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V5,null,{timeout:20000});

    const cases=[
      {name:'Dark Tower #4',input:{code:'9788868363697',title:'La sfera del buio. La torre nera',author:'Stephen King',saga:''},expected:{saga:'La Torre Nera',prequel:'Terre Desolate',sequel:'I lupi del Calla',position:4}},
      {name:'Dark Tower #5',input:{code:'9788868363710',title:'I lupi del Calla. La torre nera',author:'Stephen King',saga:''},expected:{saga:'La Torre Nera',prequel:'La sfera del buio',sequel:'La canzone di Susannah',position:5}},
      {name:'Halo #2',input:{code:'',title:'Sacrifice',author:'Alexandra Adornetto',saga:''},expected:{saga:'Halo',prequel:'Rebel',sequel:'Heaven',position:2}}
    ];
    const results=[];
    for(const tc of cases){
      const out=await page.evaluate(async input=>await window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS(input),tc.input);
      const diag=await page.evaluate(()=>window.__LIB_SERIES_V5_LAST||null);
      results.push({name:tc.name,out,diag});
      const bad=[];
      if(!same(out?.saga,tc.expected.saga))bad.push('saga='+out?.saga);
      if(!same(out?.prequel,tc.expected.prequel))bad.push('prequel='+out?.prequel);
      if(!same(out?.sequel,tc.expected.sequel))bad.push('sequel='+out?.sequel);
      if(out?.position!==tc.expected.position)bad.push('position='+out?.position);
      if(out?.method!=='goodreads-ordered-series-primary')bad.push('method='+out?.method);
      if(!/goodreads\.com\/series\//i.test(out?.source||''))bad.push('source='+out?.source);
      if(diag?.attempts?.[0]?.source!=='goodreads-ordered-series')bad.push('first-source='+diag?.attempts?.[0]?.source);
      if((diag?.attempts||[]).length!==1)bad.push('fallback-used='+JSON.stringify(diag?.attempts));
      if(bad.length)throw new Error(tc.name+': '+bad.join(' | '));
    }
    const policy=await page.evaluate(()=>window.__LIB_SERIES_RELATION_POLICY||'');
    if(policy!=='single-owner-goodreads-ordered-series-then-structured-book-v5')throw new Error('Policy inattesa: '+policy);
    if(wikiCalls!==0)throw new Error('Wikipedia è stata interrogata nonostante Goodreads abbia risolto le serie: '+wikiCalls);
    if(pageErrors.length)throw new Error('Page errors: '+pageErrors.join(' || '));
    console.log('GOODREADS_PRIMARY_RESULTS',JSON.stringify({results,policy,wikiCalls}));
    console.log('GOODREADS_SERIES_PRIMARY_OK');
  }finally{await browser.close()}
})().catch(e=>{console.error('GOODREADS_SERIES_PRIMARY_FAIL',e.stack||e.message);process.exit(1)});