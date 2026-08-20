const fs=require('fs'),vm=require('vm');
global.window=global;
global.Event=class{constructor(type,opts={}){this.type=type;this.bubbles=!!opts.bubbles;this.isTrusted=false}};
const field=v=>({value:v||'',addEventListener(){},dispatchEvent(){}});
const nodes={
  editDialog:{open:true},
  editCode:field('9788845279553'),
  editTitle:field('I sussurri della morte'),
  editAuthor:field('Simon Beckett'),
  editSaga:field(''),editPrequel:field(''),editSequel:field(''),
  lookupMetadataBtn:{id:'lookupMetadataBtn'}
};
global.document={getElementById:id=>nodes[id]||null,addEventListener(){}};
global.MutationObserver=class{observe(){}};
const realSetTimeout=setTimeout;global.setInterval=()=>0;
global.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V7=true;
global.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS=async()=>({
  saga:'David Hunter',prequel:'Written in Bone',sequel:'The Calling of the Grave',
  authoritative:true,verified:true,checked:true,position:3,initial:false,terminal:false,
  method:'goodreads-ordered-series-primary-v7'
});
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=global.__LIB_RESOLVE_VERIFIED_SERIES_NEIGHBORS;
const pad=s=>String(s)+'\nStoryGraph deterministic fixture content for realistic response size. '.repeat(3);
function response(status,body,contentType='text/plain'){return Promise.resolve({ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body),headers:{get:()=>contentType}})}
global.fetch=async url=>{
  url=String(url);
  if(url.startsWith('https://openlibrary.org/'))return response(503,'{}','application/json');
  let target=url.startsWith('https://r.jina.ai/')?url.slice('https://r.jina.ai/'.length):url;
  if(target.startsWith('http://'))target='https://'+target.slice(7);
  let decoded=target;try{decoded=decodeURIComponent(target)}catch(e){}
  const n=decoded.toLowerCase();
  if(n.includes('thestorygraph.com/browse')||n.includes('duckduckgo.com/html')){
    if(n.includes('written in bone'))return response(200,pad('[Written in Bone](https://app.thestorygraph.com/books/1191ad0c-733e-4770-b642-0af72c515804)\nSimon Beckett'));
    if(n.includes('calling of the grave'))return response(200,pad('[The Calling of the Grave](https://app.thestorygraph.com/books/0edbd72c-d6a2-4f35-af42-7eb0ffa63e99)\nSimon Beckett'));
  }
  if(n.includes('/books/1191ad0c-733e-4770-b642-0af72c515804/editions'))return response(200,pad('David Hunter #2\n### Scritto nelle ossa\nSimon Beckett\nLanguage: Italian'));
  if(n.includes('/books/0edbd72c-d6a2-4f35-af42-7eb0ffa63e99/editions'))return response(200,pad('David Hunter #4\n### La voce dei morti\nSimon Beckett\nLanguage: Italian'));
  if(n.includes('/books/1191ad0c-733e-4770-b642-0af72c515804'))return response(200,pad('### Written in Bone\nSimon Beckett\nDavid Hunter #2'));
  if(n.includes('/books/0edbd72c-d6a2-4f35-af42-7eb0ffa63e99'))return response(200,pad('### The Calling of the Grave\nSimon Beckett\nDavid Hunter #4'));
  return response(404,'not found');
};
vm.runInThisContext(fs.readFileSync('series-relation-stabilizer-v8.js','utf8'));
(async()=>{
  await new Promise(r=>realSetTimeout(r,30));
  const input={code:'9788845279553',title:'I sussurri della morte',author:'Simon Beckett',saga:''};
  const out=await global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS(input);
  if(out.saga!=='David Hunter')throw new Error('Saga inattesa: '+out.saga);
  if(out.prequel!=='Scritto nelle ossa')throw new Error('Prequel non localizzato: '+out.prequel);
  if(out.sequel!=='La voce dei morti')throw new Error('Sequel non localizzato: '+out.sequel);
  if(global.__LIB_SERIES_RELATION_POLICY!=='goodreads-order-canonical-localization-stable-v8')throw new Error('Policy V8 assente');
  await new Promise(r=>realSetTimeout(r,250));
  if(nodes.editSaga.value!=='David Hunter'||nodes.editPrequel.value!=='Scritto nelle ossa'||nodes.editSequel.value!=='La voce dei morti')throw new Error('Il dialogo già aperto non è stato valorizzato: '+JSON.stringify({saga:nodes.editSaga.value,prequel:nodes.editPrequel.value,sequel:nodes.editSequel.value}));
  console.log('SERIES_STABILIZER_V8_OK',JSON.stringify(out));
  process.exit(0);
})().catch(e=>{console.error('SERIES_STABILIZER_V8_FAIL',e.stack||e.message);process.exit(1)});
