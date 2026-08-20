const fs=require('fs'),vm=require('vm');
global.window=global;
global.Event=class{constructor(type,opts={}){this.type=type;this.bubbles=!!opts.bubbles;this.isTrusted=false}};
function field(v=''){const listeners={};return{value:v,dataset:{},addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e)}}}
const docListeners={};
const nodes={
  editDialog:{open:true},
  editCode:field('9788845279553'),
  editTitle:field('I sussurri della morte'),
  editAuthor:field('Simon Beckett'),
  editSaga:field(''),editPrequel:field(''),editSequel:field(''),editCategory:field(''),
  lookupMetadataBtn:{id:'lookupMetadataBtn'}
};
global.document={getElementById:id=>nodes[id]||null,addEventListener(type,fn){(docListeners[type]||(docListeners[type]=[])).push(fn)}};
global.MutationObserver=class{observe(){}};
global.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V8=true;
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>({saga:'David Hunter',prequel:'Scritto nelle ossa',sequel:'La voce dei morti',authoritative:true,verified:true,checked:true,position:3,initial:false,terminal:false});
global.__LIB_SERIES_V8_APPLIED={result:{saga:'David Hunter',prequel:'Scritto nelle ossa',sequel:'La voce dei morti',authoritative:true,verified:true,checked:true,position:3,initial:false,terminal:false}};
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
  vm.runInThisContext(fs.readFileSync('series-saga-lock-v9.js','utf8'));
  await new Promise(r=>setTimeout(r,700));
  if(nodes.editSaga.value!=='David Hunter'||nodes.editPrequel.value!=='Scritto nelle ossa'||nodes.editSequel.value!=='La voce dei morti')throw new Error('Lock saga iniziale non applicato: '+JSON.stringify({saga:nodes.editSaga.value,prequel:nodes.editPrequel.value,sequel:nodes.editSequel.value}));
  nodes.editSaga.value='Dr. David Hunter series';nodes.editSaga.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,900));
  if(nodes.editSaga.value!=='David Hunter')throw new Error('Saga autorevole non ripristinata dopo overwrite: '+nodes.editSaga.value);

  vm.runInThisContext(fs.readFileSync('storygraph-genre-lock-v4.js','utf8'));
  await new Promise(r=>setTimeout(r,1200));
  if(nodes.editCategory.value!=='Crime, Giallo, Thriller')throw new Error('Generi StoryGraph inattesi: '+nodes.editCategory.value);
  nodes.editCategory.value='Narrativa';nodes.editCategory.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,1100));
  if(nodes.editCategory.value!=='Crime, Giallo, Thriller')throw new Error('Generi autorevoli non ripristinati dopo overwrite: '+nodes.editCategory.value);
  if(!global.__LIB_SERIES_SAGA_LOCK_V9||!global.__LIB_STORYGRAPH_GENRE_LOCK_V4)throw new Error('Marker V9/V4 mancanti');
  console.log('SAGA_GENRES_V9_OK',JSON.stringify({saga:nodes.editSaga.value,prequel:nodes.editPrequel.value,sequel:nodes.editSequel.value,genres:nodes.editCategory.value}));
  process.exit(0);
})().catch(e=>{console.error('SAGA_GENRES_V9_FAIL',e.stack||e.message);process.exit(1)});
