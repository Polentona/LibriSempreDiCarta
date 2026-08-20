const {chromium}=require('playwright');
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);
const pad=s=>String(s)+'\nDeterministic series fixture. '.repeat(5);

const DARK='https://www.goodreads.com/series/40750-the-dark-tower';
const HALO='https://www.goodreads.com/series/59827-halo';
const HUNTER='https://www.goodreads.com/series/54603-david-hunter';
const current={sphere:'https://www.goodreads.com/book/show/4004-la-sfera-del-buio',wolves:'https://www.goodreads.com/book/show/5005-i-lupi-del-calla',sacrifice:'https://www.goodreads.com/book/show/2002-sacrifice',hunter:'https://www.goodreads.com/book/show/3333-i-sussurri-della-morte',wrong:'https://www.goodreads.com/book/show/9999-wrong-book'};
const canonical={waste:'https://www.goodreads.com/book/show/3003-the-waste-lands',wizard:'https://www.goodreads.com/book/show/4000-wizard-and-glass',wind:'https://www.goodreads.com/book/show/4500-wind',wolves:'https://www.goodreads.com/book/show/5000-wolves',song:'https://www.goodreads.com/book/show/6000-song',halo1:'https://www.goodreads.com/book/show/1000-halo',halo2:'https://www.goodreads.com/book/show/2000-hades',halo3:'https://www.goodreads.com/book/show/3000-heaven',hunter2:'https://www.goodreads.com/book/show/2222-written-in-bone',hunter3:'https://www.goodreads.com/book/show/3330-whispers',hunter4:'https://www.goodreads.com/book/show/4444-calling',hunter45:'https://www.goodreads.com/book/show/4450-short'};
const SG4='https://app.thestorygraph.com/books/44444444-4444-4444-8444-444444444444';
let wikiCalls=0,storyCalls=0,wrongReads=0;

function searchFixture(q){
  const n=norm(q);
  if(n.includes('9788868363697')||n.includes('la sfera del buio'))return pad(`[La sfera del buio (La Torre Nera, #4)](${current.sphere})\nStephen King`);
  if(n.includes('9788868363710')||n.includes('i lupi del calla'))return pad(`[I lupi del Calla (La Torre Nera, #5)](${current.wolves})\nStephen King`);
  if(n.includes('sacrifice')&&n.includes('alexandra'))return pad(`[Sacrifice (Halo, #2)](${current.sacrifice})\nAlexandra Adornetto`);
  if(n.includes('9788845279553')||n.includes('i sussurri della morte'))return pad(`[Unrelated Book](${current.wrong})\nSomeone Else\n[I sussurri della morte (David Hunter, #3)](${current.hunter})\nSimon Beckett`);
  return pad('No Goodreads result');
}
function bookFixture(url){
  if(url===current.sphere)return pad(`# La sfera del buio. La torre nera\nStephen King\nISBN 9788868363697\n### The Dark Tower #4\n[The Dark Tower](${DARK})`);
  if(url===current.wolves)return pad(`# I lupi del Calla. La torre nera\nStephen King\nISBN 9788868363710\n### The Dark Tower #5\n[The Dark Tower](${DARK})`);
  if(url===current.sacrifice)return pad(`# Sacrifice\nAlexandra Adornetto\n### Halo #2\n[Halo](${HALO})`);
  if(url===current.hunter)return pad(`# I sussurri della morte\nSimon Beckett\nISBN 9788845279553\n### David Hunter #3\n[David Hunter](${HUNTER})`);
  if(url===current.wrong){wrongReads++;return pad(`# Unrelated Book\nSomeone Else\nISBN 9780000000000`)}
  return pad('Canonical Goodreads book page');
}
function seriesFixture(url){
  if(url===DARK)return pad(`# The Dark Tower Series\n### Book 3\n[The Waste Lands (The Dark Tower, #3)](${canonical.waste})\n### Book 4\n[Wizard and Glass (The Dark Tower, #4)](${canonical.wizard})\n### Book 4.5\n[The Wind Through the Keyhole (The Dark Tower, #4.5)](${canonical.wind})\n### Book 5\n[Wolves of the Calla (The Dark Tower, #5)](${canonical.wolves})\n### Book 6\n[Song of Susannah (The Dark Tower, #6)](${canonical.song})\n### Book 1-3\n[Box set](https://www.goodreads.com/book/show/1300-box)`);
  if(url===HALO)return pad(`# Halo Series\n### Book 1\n[Halo (Halo, #1)](${canonical.halo1})\n### Book 2\n[Hades (Halo, #2)](${canonical.halo2})\n### Book 3\n[Heaven (Halo, #3)](${canonical.halo3})`);
  if(url===HUNTER)return pad(`# David Hunter Series\n8 primary works\n### Book 2\n[Written in Bone (David Hunter, #2)](${canonical.hunter2})\n### Book 3\n[Whispers of the Dead (David Hunter, #3)](${canonical.hunter3})\n### Book 4\n[The Calling of the Grave (David Hunter, #4)](${canonical.hunter4})\n### Book 4.5\n[Short story (David Hunter, #4.5)](${canonical.hunter45})\n### Book 5\n[The Restless Dead (David Hunter, #5)](https://www.goodreads.com/book/show/5555-restless)`);
  return pad('Unknown series');
}
const editions={'3003':'Terre Desolate (La Torre Nera, #3)','4000':'La sfera del buio (La Torre Nera, #4)','5000':'I lupi del Calla (La Torre Nera, #5)','6000':'La canzone di Susannah (La Torre Nera, #6)','1000':'Rebel (Halo, #1)','3000':'Heaven (Halo, #3)','2222':'Scritto nelle ossa (David Hunter, #2)','4444':'La voce dei morti (David Hunter, #4)'};
function editionsFixture(id){const title=editions[id];return title?pad(`## Editions\n[${title}](https://www.goodreads.com/book/show/9${id}-it)\nEdition language: Italian`):pad('No Italian edition')}
function storyFixture(target){
  if(target.includes('html.duckduckgo.com')&&target.includes('David Hunter'))return pad(`[The Calling of the Grave](${SG4})`);
  if(target.startsWith(SG4+'/editions'))return pad(`## Editions\nDavid Hunter #4\n### La voce dei morti\nSimon Beckett\nLanguage: Italian`);
  if(target.startsWith(SG4))return pad(`David Hunter #4\n### The Calling of the Grave\nSimon Beckett\nISBN/UID: 9780593063453`);
  return pad('No StoryGraph result');
}

(async()=>{
  const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1400,height:1000}}),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**://r.jina.ai/**',async route=>{
    let requested=route.request().url();try{requested=decodeURIComponent(requested)}catch(e){}
    let target=requested;const marker=requested.indexOf('https://r.jina.ai/');if(marker>=0)target=requested.slice(marker+'https://r.jina.ai/'.length);
    let body='';
    if(target.includes('goodreads.com/search?')){let q='';try{q=new URL(target).searchParams.get('q')||''}catch(e){}body=searchFixture(q)}
    else if(target.startsWith(DARK)||target.startsWith(HALO)||target.startsWith(HUNTER))body=seriesFixture(target.split('?')[0]);
    else if(target.includes('/book/editions/'))body=editionsFixture((target.match(/\/book\/editions\/(\d+)/)||[])[1]||'');
    else if(target.includes('thestorygraph.com')||target.includes('duckduckgo.com')){storyCalls++;body=storyFixture(target)}
    else body=bookFixture(target.split('?')[0]);
    await route.fulfill({status:200,contentType:'text/plain',body});
  });
  await page.route('**://it.wikipedia.org/w/api.php**',route=>{wikiCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[]}})})});
  await page.route('**://en.wikipedia.org/w/api.php**',route=>{wikiCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[]}})})});
  try{
    await page.goto('http://127.0.0.1:8000/?series-v6='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V46&&!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V6&&!!window.__LIB_ISBN_FIELD_SANITIZER_V1,null,{timeout:20000});
    const cases=[
      {name:'Dark Tower #4',input:{code:'9788868363697',title:'La sfera del buio. La torre nera',author:'Stephen King'},expected:{saga:'La Torre Nera',prequel:'Terre Desolate',sequel:'I lupi del Calla',position:4}},
      {name:'Dark Tower #5',input:{code:'9788868363710',title:'I lupi del Calla. La torre nera',author:'Stephen King'},expected:{saga:'La Torre Nera',prequel:'La sfera del buio',sequel:'La canzone di Susannah',position:5}},
      {name:'Halo #2',input:{code:'',title:'Sacrifice',author:'Alexandra Adornetto'},expected:{saga:'Halo',prequel:'Rebel',sequel:'Heaven',position:2}},
      {name:'David Hunter #3',input:{code:'9788845279553',title:'I sussurri della morte',author:'Simon Beckett'},expected:{saga:'David Hunter',prequel:'Scritto nelle ossa',sequel:'La voce dei morti',position:3}}
    ],results=[];
    for(const tc of cases){const out=await page.evaluate(async input=>await window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS(input),tc.input);results.push({name:tc.name,out});const bad=[];for(const k of ['saga','prequel','sequel'])if(!same(out?.[k],tc.expected[k]))bad.push(k+'='+out?.[k]);if(out?.position!==tc.expected.position)bad.push('position='+out?.position);if(out?.method!=='goodreads-ordered-series-primary-v6')bad.push('method='+out?.method);if(bad.length)throw new Error(tc.name+': '+bad.join(' | '))}
    if(wikiCalls!==0)throw new Error('Wikipedia usata nonostante Goodreads completo: '+wikiCalls);
    if(wrongReads<1)throw new Error('Il candidato Goodreads errato non è stato validato/scartato');
    const sg=await page.evaluate(async()=>await window.__LIB_SERIES_V6_TEST__.storyGraphCompletion({title:'I sussurri della morte',author:'Simon Beckett'},{saga:'David Hunter',position:3,prequel:'Scritto nelle ossa',sequel:'',authoritative:true}));
    if(!same(sg?.sequel,'La voce dei morti'))throw new Error('StoryGraph non completa il sequel: '+JSON.stringify(sg));
    const sanitized=await page.evaluate(()=>{
      const dirty=`[](https://www. bompiani. it/catalogo/i-sussurri-della-morte-9788845279553)Simon Beckett All'interno del bungalow, la vittima giace nuda, supina su un tavolo, legata mani e piedi, con evidenti ferite d'arma da taglio, inferte quando, forse, era ancora in vita. La temperatura all'interno dell'edificio supera i 43 gradi. Una sedia davanti al corpo fa pensare che l'assassino abbia assistito allo spettacolo degli ultimi attimi di vita della vittima. Insieme affrontano una nuova, sconcertante avventura nel regno del male e della scienza. € 12. 35 acquista`;
      return{publisher:window.__LIB_CLEAN_PUBLISHER('Bompiani, Giunti'),giunti:window.__LIB_CLEAN_PUBLISHER('Giunti'),plot:window.__LIB_CLEAN_AUTOMATIC_PLOT(dirty,{author:'Simon Beckett',title:'I sussurri della morte'}),policy:window.__LIB_SERIES_RELATION_POLICY};
    });
    if(sanitized.publisher!=='Bompiani'||sanitized.giunti!=='Giunti')throw new Error('Editore non normalizzato: '+JSON.stringify(sanitized));
    if(/https?|www\s*\.|€|\bacquista\b/i.test(sanitized.plot)||sanitized.plot.length<200)throw new Error('Trama non pulita: '+sanitized.plot);
    if(sanitized.policy!=='single-owner-goodreads-complete-then-storygraph-then-wikipedia-v6')throw new Error('Policy inattesa: '+sanitized.policy);
    if(pageErrors.length)throw new Error('Page errors: '+pageErrors.join(' || '));
    console.log('SERIES_V6_RESULTS',JSON.stringify({results,sg,sanitized,wikiCalls,storyCalls,wrongReads}));console.log('SERIES_V6_OK');
  }finally{await browser.close()}
})().catch(e=>{console.error('SERIES_V6_FAIL',e.stack||e.message);process.exit(1)});
