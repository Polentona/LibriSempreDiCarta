const fs=require('fs'),vm=require('vm');
global.window=global;
global.Event=class{constructor(type,opts={}){this.type=type;this.bubbles=!!opts.bubbles;this.isTrusted=false}};
function field(v=''){const listeners={};return{value:v,dataset:{},className:'',textContent:'',innerHTML:'',disabled:false,addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e)},setAttribute(){},removeAttribute(){}}}
const docListeners={};
const nodes={
  editDialog:{open:true},
  editCode:field('9788845279553'),
  editTitle:field('I sussurri della morte'),
  editAuthor:field('Simon Beckett'),
  editSaga:field('David Hunter'),editPrequel:field('Written in Bone'),editSequel:field('The Calling of the Grave'),editCategory:field(''),
  lookupMetadataBtn:{id:'lookupMetadataBtn',disabled:false},
  lookupStatus:field(''),metadataOverlay:{open:false}
};
nodes.lookupStatus.className='lookup-status lookup-busy';
global.document={getElementById:id=>nodes[id]||null,addEventListener(type,fn){(docListeners[type]||(docListeners[type]=[])).push(fn)}};
global.MutationObserver=class{constructor(fn){this.fn=fn}observe(){}};
global.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8=true;
const pending={saga:'David Hunter',prequel:'Written in Bone',sequel:'The Calling of the Grave',authoritative:true,verified:true,checked:true,position:3,initial:false,terminal:false,localizedPrequel:false,localizedSequel:false,localizationPending:true};
const localized={saga:'David Hunter',prequel:'Scritto nelle ossa',sequel:'La voce dei morti',authoritative:true,verified:true,checked:true,position:3,initial:false,terminal:false,localizedPrequel:true,localizedSequel:true,localizationPending:false};
global.__LIB_SERIES_V8_APPLIED={result:pending};
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>global.__LIB_SERIES_V8_APPLIED.result;
const pad=s=>String(s)+'\nStoryGraph fixture sufficientemente lunga per il resolver autorevole. '.repeat(4);
function response(status,body){return Promise.resolve({ok:status>=200&&status<300,status,text:async()=>body})}
global.fetch=async url=>{
  const u=String(url);
  if(u.includes('r.jina.ai/')&&u.includes('thestorygraph.com/browse'))return response(200,pad('I sussurri della morte\nSimon Beckett\nfiction crime mystery thriller dark mysterious tense fast-paced'));
  return response(404,'not found');
};
global.__LIB_STORYGRAPH_GENRES_TEST__={
  storyBlocks(raw){return raw.includes('I sussurri della morte')?[{title:'I sussurri della morte',code:'',text:'I sussurri della morte Simon Beckett',raw,genres:['Crime','Giallo','Thriller'],tagLine:'fiction crime mystery thriller dark mysterious tense fast-paced'}]:[]},
  storyMatch(blocks){return blocks[0]||null},storyLinks(){return[]}
};
(async()=>{
  vm.runInThisContext(fs.readFileSync('isbn-enrichment-progress-v10.js','utf8'));
  global.__LIB_LOOKUP_PROGRESS_V10_TEST__.activate();
  vm.runInThisContext(fs.readFileSync('series-saga-lock-v9.js','utf8'));
  vm.runInThisContext(fs.readFileSync('storygraph-genre-lock-v4.js','utf8'));

  await new Promise(r=>setTimeout(r,180));
  nodes.lookupStatus.className='lookup-status ok';nodes.lookupStatus.textContent='Trama recuperata dal sito ufficiale.';
  global.__LIB_LOOKUP_PROGRESS_V10_TEST__.onStatusMutation();
  if(!nodes.lookupStatus.className.includes('lookup-busy'))throw new Error('Lo spinner è scomparso prima del completamento differito.');
  if(nodes.editPrequel.value==='Written in Bone'||nodes.editSequel.value==='The Calling of the Grave')throw new Error('Il lock ha mantenuto un titolo canonico inglese non localizzato.');

  await new Promise(r=>setTimeout(r,420));
  if(!nodes.lookupStatus.className.includes('lookup-busy'))throw new Error('Lo spinner non è rimasto visibile durante la localizzazione.');
  global.__LIB_SERIES_V8_APPLIED={result:localized};

  await new Promise(r=>setTimeout(r,1700));
  global.__LIB_LOOKUP_PROGRESS_V10_TEST__.tick();
  if(nodes.editSaga.value!=='David Hunter'||nodes.editPrequel.value!=='Scritto nelle ossa'||nodes.editSequel.value!=='La voce dei morti')throw new Error('Relazioni italiane non applicate: '+JSON.stringify({saga:nodes.editSaga.value,prequel:nodes.editPrequel.value,sequel:nodes.editSequel.value}));
  if(nodes.editCategory.value!=='Crime, Giallo, Thriller')throw new Error('Generi StoryGraph inattesi: '+nodes.editCategory.value);
  if(nodes.lookupStatus.className.includes('lookup-busy'))throw new Error('Lo spinner è rimasto attivo dopo il completamento di tutti i dati.');
  if(!global.__LIB_SERIES_SAGA_LOCK_STATE__?.complete)throw new Error('Stato Saga non completato.');
  if(!global.__LIB_STORYGRAPH_GENRE_LOCK_STATE__?.complete)throw new Error('Stato Generi non completato.');
  if(!global.__LIB_SERIES_SAGA_LOCK_V10||!global.__LIB_STORYGRAPH_GENRE_LOCK_V5||!global.__LIB_ISBN_ENRICHMENT_PROGRESS_V10)throw new Error('Marker progress/localizzazione mancanti.');
  console.log('SAGA_GENRES_PROGRESS_V10_OK',JSON.stringify({saga:nodes.editSaga.value,prequel:nodes.editPrequel.value,sequel:nodes.editSequel.value,genres:nodes.editCategory.value,status:nodes.lookupStatus.textContent}));
  process.exit(0);
})().catch(e=>{console.error('SAGA_GENRES_PROGRESS_V10_FAIL',e.stack||e.message);process.exit(1)});
