const {chromium}=require('playwright');
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);
const pad=s=>String(s)+'\nFixture deterministica. '.repeat(8);

const DARK='https://www.goodreads.com/series/40750-the-dark-tower';
const HALO='https://www.goodreads.com/series/59827-halo';
const HUNTER='https://www.goodreads.com/series/54603-david-hunter';
const GR={
  sphere:'https://www.goodreads.com/book/show/4004-la-sfera-del-buio',
  wolves:'https://www.goodreads.com/book/show/5005-i-lupi-del-calla',
  sacrifice:'https://www.goodreads.com/book/show/2002-sacrifice',
  hunter:'https://www.goodreads.com/book/show/3333-i-sussurri-della-morte',
  waste:'https://www.goodreads.com/book/show/3003-the-waste-lands',
  wizard:'https://www.goodreads.com/book/show/4000-wizard-and-glass',
  wind:'https://www.goodreads.com/book/show/4500-wind',
  wolvesCanon:'https://www.goodreads.com/book/show/5000-wolves',
  song:'https://www.goodreads.com/book/show/6000-song',
  halo1:'https://www.goodreads.com/book/show/1000-halo',
  halo2:'https://www.goodreads.com/book/show/2000-hades',
  halo3:'https://www.goodreads.com/book/show/3000-heaven',
  hunter2:'https://www.goodreads.com/book/show/2222-written-in-bone',
  hunter3:'https://www.goodreads.com/book/show/3330-whispers',
  hunter4:'https://www.goodreads.com/book/show/4444-calling',
  hunter45:'https://www.goodreads.com/book/show/4450-short'
};
const SG={
  dark3:'https://app.thestorygraph.com/books/00000003-0000-4000-8000-000000000003',
  dark4:'https://app.thestorygraph.com/books/00000004-0000-4000-8000-000000000004',
  dark5:'https://app.thestorygraph.com/books/00000005-0000-4000-8000-000000000005',
  dark6:'https://app.thestorygraph.com/books/00000006-0000-4000-8000-000000000006',
  halo1:'https://app.thestorygraph.com/books/10000001-0000-4000-8000-000000000001',
  halo2:'https://app.thestorygraph.com/books/10000002-0000-4000-8000-000000000002',
  halo3:'https://app.thestorygraph.com/books/10000003-0000-4000-8000-000000000003',
  hunter2:'https://app.thestorygraph.com/books/20000002-0000-4000-8000-000000000002',
  hunter3:'https://app.thestorygraph.com/books/20000003-0000-4000-8000-000000000003',
  hunter4:'https://app.thestorygraph.com/books/20000004-0000-4000-8000-000000000004'
};

function searchFixture(q){
  const n=norm(q);
  if(n.includes('9788868363697')||n.includes('la sfera del buio'))return pad(`[La sfera del buio (La Torre Nera, #4)](${GR.sphere})\nStephen King`);
  if(n.includes('9788868363710')||n.includes('i lupi del calla'))return pad(`[I lupi del Calla (La Torre Nera, #5)](${GR.wolves})\nStephen King`);
  if(n.includes('sacrifice')&&n.includes('alexandra'))return pad(`[Sacrifice (Halo, #2)](${GR.sacrifice})\nAlexandra Adornetto`);
  if(n.includes('9788845279553')||n.includes('i sussurri della morte'))return pad(`[I sussurri della morte (Dr. David Hunter series, #3)](${GR.hunter})\nSimon Beckett`);
  return pad('No Goodreads result');
}
function grBook(url){
  if(url===GR.sphere)return pad(`# La sfera del buio. La torre nera\nStephen King\nISBN 9788868363697\n### The Dark Tower #4\n[The Dark Tower](${DARK})`);
  if(url===GR.wolves)return pad(`# I lupi del Calla. La torre nera\nStephen King\nISBN 9788868363710\n### The Dark Tower #5\n[The Dark Tower](${DARK})`);
  if(url===GR.sacrifice)return pad(`# Sacrifice\nAlexandra Adornetto\n### Halo #2\n[Halo](${HALO})`);
  if(url===GR.hunter)return pad(`# I sussurri della morte\nSimon Beckett\nISBN 9788845279553\n### Dr. David Hunter series #3\n[Dr. David Hunter series](${HUNTER})`);
  return pad('Canonical Goodreads book');
}
function grSeries(url){
  if(url===DARK)return pad(`# The Dark Tower Series
### Book 3
[The Waste Lands (The Dark Tower, #3)](${GR.waste})
### Book 4
[Wizard and Glass (The Dark Tower, #4)](${GR.wizard})
### Book 4.5
[The Wind Through the Keyhole (The Dark Tower, #4.5)](${GR.wind})
### Book 5
[Wolves of the Calla (The Dark Tower, #5)](${GR.wolvesCanon})
### Book 6
[Song of Susannah (The Dark Tower, #6)](${GR.song})`);
  if(url===HALO)return pad(`# Halo Series
### Book 1
[Halo (Halo, #1)](${GR.halo1})
### Book 2
[Hades (Halo, #2)](${GR.halo2})
### Book 3
[Heaven (Halo, #3)](${GR.halo3})`);
  if(url===HUNTER)return pad(`# Dr. David Hunter Series
### Book 2
[Written in Bone (Dr. David Hunter series, #2)](${GR.hunter2})
### Book 3
[Whispers of the Dead (Dr. David Hunter series, #3)](${GR.hunter3})
### Book 4
[The Calling of the Grave (Dr. David Hunter series, #4)](${GR.hunter4})
### Book 4.5
[Short story (Dr. David Hunter series, #4.5)](${GR.hunter45})`);
  return pad('Unknown series');
}
function storySearch(target){
  let q='';try{q=new URL(target).searchParams.get('search_term')||new URL(target).searchParams.get('q')||''}catch(e){}
  q=decodeURIComponent(q);const n=norm(q);
  const link=u=>pad(`[Result](${u})`);
  if(n.includes('9788868363697')||n.includes('la sfera del buio'))return link(SG.dark4);
  if(n.includes('9788868363710')||n.includes('i lupi del calla'))return link(SG.dark5);
  if(n.includes('sacrifice')&&n.includes('alexandra'))return link(SG.halo2);
  if(n.includes('9788845279553')||n.includes('i sussurri della morte'))return link(SG.hunter3);
  if(n.includes('la torre nera 3')||n.includes('the dark tower 3'))return link(SG.dark3);
  if(n.includes('la torre nera 4')||n.includes('the dark tower 4'))return link(SG.dark4);
  if(n.includes('la torre nera 5')||n.includes('the dark tower 5'))return link(SG.dark5);
  if(n.includes('la torre nera 6')||n.includes('the dark tower 6'))return link(SG.dark6);
  if(n.includes('halo 1'))return link(SG.halo1);
  if(n.includes('halo 3'))return link(SG.halo3);
  if(n.includes('david hunter 2'))return link(SG.hunter2);
  if(n.includes('david hunter 4'))return link(SG.hunter4);
  return pad('No StoryGraph result');
}
const sgMeta=new Map([
  [SG.dark3,['The Waste Lands','La Torre Nera',3,'Stephen King','Terre Desolate']],
  [SG.dark4,['Wizard and Glass','La Torre Nera',4,'Stephen King','La sfera del buio']],
  [SG.dark5,['Wolves of the Calla','La Torre Nera',5,'Stephen King','I lupi del Calla']],
  [SG.dark6,['Song of Susannah','La Torre Nera',6,'Stephen King','La canzone di Susannah']],
  [SG.halo1,['Halo','Halo',1,'Alexandra Adornetto','Rebel']],
  [SG.halo2,['Hades','Halo',2,'Alexandra Adornetto','Sacrifice']],
  [SG.halo3,['Heaven','Halo',3,'Alexandra Adornetto','Heaven']],
  [SG.hunter2,['Written in Bone','David Hunter',2,'Simon Beckett','Scritto nelle ossa']],
  [SG.hunter3,['Whispers of the Dead','David Hunter',3,'Simon Beckett','I sussurri della morte']],
  [SG.hunter4,['The Calling of the Grave','David Hunter',4,'Simon Beckett','La voce dei morti']]
]);
function sgPage(url){
  const base=url.replace(/\/editions.*$/,'');const m=sgMeta.get(base);if(!m)return pad('Unknown StoryGraph book');
  if(url.includes('/editions'))return pad(`## Editions\n### ${m[4]}\n${m[3]}\nLanguage: Italian`);
  const isbn=base===SG.dark4?'ISBN 9788868363697':base===SG.dark5?'ISBN 9788868363710':base===SG.hunter3?'ISBN 9788845279553':'';
  return pad(`### ${m[0]}\n${m[3]}\n${isbn}\n${m[1]} #${m[2]}`);
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**://r.jina.ai/**',async route=>{
    let requested=route.request().url();try{requested=decodeURIComponent(requested)}catch(e){}
    let target=requested;const marker=requested.indexOf('https://r.jina.ai/');if(marker>=0)target=requested.slice(marker+'https://r.jina.ai/'.length);
    if(target.startsWith('http://'))target='https://'+target.slice('http://'.length);
    let body='';
    if(target.includes('goodreads.com/search?')){let q='';try{q=new URL(target).searchParams.get('q')||''}catch(e){}body=searchFixture(q)}
    else if(target.startsWith(DARK)||target.startsWith(HALO)||target.startsWith(HUNTER))body=grSeries(target.split('?')[0]);
    else if(target.includes('goodreads.com/book/editions/'))return route.fulfill({status:429,contentType:'text/plain',body:'rate limited on purpose'});
    else if(target.includes('goodreads.com/book/show/'))body=grBook(target.split('?')[0]);
    else if(target.includes('thestorygraph.com/browse?')||target.includes('duckduckgo.com/html/?'))body=storySearch(target);
    else if(target.includes('thestorygraph.com/books/'))body=sgPage(target);
    else body=pad('No fixture');
    await route.fulfill({status:200,contentType:'text/plain',body});
  });
  try{
    await page.goto('http://127.0.0.1:8000/?series-v7='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.__LIB_SERIES_NEIGHBORS_STANDALONE_V47&&!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7&&!!window.__LIB_ISBN_FIELD_SANITIZER_V2,null,{timeout:20000});
    const cases=[
      {name:'Dark Tower #4',input:{code:'9788868363697',title:'La sfera del buio. La torre nera',author:'Stephen King'},expected:{saga:'La Torre Nera',prequel:'Terre Desolate',sequel:'I lupi del Calla',position:4}},
      {name:'Dark Tower #5',input:{code:'9788868363710',title:'I lupi del Calla. La torre nera',author:'Stephen King'},expected:{saga:'La Torre Nera',prequel:'La sfera del buio',sequel:'La canzone di Susannah',position:5}},
      {name:'Halo #2',input:{code:'',title:'Sacrifice',author:'Alexandra Adornetto'},expected:{saga:'Halo',prequel:'Rebel',sequel:'Heaven',position:2}},
      {name:'David Hunter #3',input:{code:'9788845279553',title:'I sussurri della morte',author:'Simon Beckett'},expected:{saga:'David Hunter',prequel:'Scritto nelle ossa',sequel:'La voce dei morti',position:3}}
    ],results=[];
    for(const tc of cases){
      const out=await page.evaluate(async input=>await window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS(input),tc.input);
      results.push({name:tc.name,out});
      const bad=[];for(const k of ['saga','prequel','sequel'])if(!same(out?.[k],tc.expected[k]))bad.push(k+'='+out?.[k]);
      if(out?.position!==tc.expected.position)bad.push('position='+out?.position);
      if(!String(out?.method||'').includes('goodreads'))bad.push('method='+out?.method);
      if(bad.length)throw new Error(tc.name+': '+bad.join(' | '));
    }
    const sanitized=await page.evaluate(()=>({
      colon:window.__LIB_CLEAN_PUBLISHER('Bompiani : Giunti'),
      comma:window.__LIB_CLEAN_PUBLISHER('Bompiani, Giunti'),
      joined:window.__LIB_CLEAN_PUBLISHER('Bompiani Giunti'),
      joinedEditore:window.__LIB_CLEAN_PUBLISHER('Bompiani Giunti Editore'),
      giunti:window.__LIB_CLEAN_PUBLISHER('Giunti')
    }));
    for(const k of ['colon','comma','joined','joinedEditore'])if(sanitized[k]!=='Bompiani')throw new Error('Pulizia editore '+k+': '+sanitized[k]);
    if(sanitized.giunti!=='Giunti')throw new Error('Giunti singolo alterato: '+sanitized.giunti);
    const globals=await page.evaluate(()=>({policy:window.__LIB_SERIES_RELATION_POLICY,v6:!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V6,v7:!!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7}));
    if(globals.policy!=='goodreads-order-storygraph-localization-retry-v7')throw new Error('Policy inattesa: '+globals.policy);
    if(globals.v6)throw new Error('Il runtime V6 non deve essere caricato insieme al V7');
    if(errors.length)throw new Error('Page errors: '+errors.join(' || '));
    console.log('SERIES_V7_RESULTS',JSON.stringify({results,sanitized,globals}));
    console.log('SERIES_V7_OK');
  }finally{await browser.close()}
})().catch(e=>{console.error('SERIES_V7_FAIL',e.stack||e.message);process.exit(1)});
