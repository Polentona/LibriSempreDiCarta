const fs=require('fs'),vm=require('vm');
global.window=global;
global.Event=class{constructor(type,opts={}){this.type=type;this.bubbles=!!opts.bubbles;this.isTrusted=false}};
function field(v=''){const listeners={};return{value:v,className:'',textContent:'',innerText:'',innerHTML:'',dataset:{},disabled:false,addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e)},setAttribute(){},removeAttribute(){}}}
const nodes={
  editDialog:{open:true},editCode:field('9788845279553'),editTitle:field('I sussurri della morte'),editAuthor:field('Simon Beckett'),editPublisher:field('Bompiani'),editSaga:field('David Hunter'),editPlot:field(''),lookupStatus:field(''),lookupMetadataBtn:field(''),metadataOverlay:{open:false}
};
global.document={getElementById:id=>nodes[id]||null,addEventListener(){}};
global.MutationObserver=class{observe(){}};
const realSetTimeout=setTimeout;global.setInterval=()=>0;global.clearInterval=()=>{};global.setTimeout=(fn,ms)=>0;global.clearTimeout=()=>{};
vm.runInThisContext(fs.readFileSync('isbn-field-sanitizer-v2.js','utf8'));
global.__LIB_RESOLVE_OFFICIAL_PLOT=async()=>`[](https://www. bompiani. it/catalogo/test)Simon Beckett Una trama ufficiale sufficientemente lunga da essere mantenuta dal pulitore automatico. Contiene un secondo periodo narrativo utile per superare la soglia minima. € 12. 35 acquista`;
vm.runInThisContext(fs.readFileSync('publisher-plot-lock-v8.js','utf8'));
(async()=>{
  await global.__LIB_PUBLISHER_PLOT_LOCK_V8_TEST__.enforce(true);
  const plotState=global.__LIB_PUBLISHER_PLOT_LOCK_STATE__;
  if(!plotState?.settled||!plotState?.complete||plotState.reason!=='official')throw new Error('Stato trama non completo: '+JSON.stringify(plotState));
  if(nodes.editPlot.value.length<60||/https?|www\s*\.|€|\bacquista\b/i.test(nodes.editPlot.value))throw new Error('Trama non pulita: '+nodes.editPlot.value);

  global.__LIB_SERIES_SAGA_LOCK_STATE__={code:'9788845279553',settled:true,complete:true};
  global.__LIB_STORYGRAPH_GENRE_LOCK_STATE__={code:'9788845279553',settled:true,complete:true};
  global.__LIB_PUBLISHER_PLOT_LOCK_STATE__={code:'9788845279553',settled:false,complete:false,pending:true};
  nodes.lookupStatus.className='lookup-status lookup-busy';
  vm.runInThisContext(fs.readFileSync('isbn-enrichment-progress-v10.js','utf8'));
  const progress=global.__LIB_LOOKUP_PROGRESS_V11_TEST__;
  progress.activate();
  nodes.lookupStatus.className='lookup-status ok';nodes.lookupStatus.textContent='Metadati base pronti';
  progress.onStatusMutation();
  if(!String(nodes.lookupStatus.className).includes('lookup-busy'))throw new Error('Spinner terminato prima della trama.');
  if(nodes.lookupMetadataBtn.disabled!==true)throw new Error('Pulsante riabilitato prima della trama.');
  global.__LIB_PUBLISHER_PLOT_LOCK_STATE__={code:'9788845279553',settled:true,complete:true,pending:false,reason:'official'};
  progress.tick();
  const last=global.__LIB_LOOKUP_PROGRESS_V11_LAST__;
  if(last?.reason!=='complete'||!last?.plot?.complete)throw new Error('Progress non completato con trama: '+JSON.stringify(last));
  if(nodes.lookupMetadataBtn.disabled!==false)throw new Error('Pulsante non riabilitato a fine ricerca.');
  if(!global.__LIB_PUBLISHER_PLOT_LOCK_V9||!global.__LIB_ISBN_ENRICHMENT_PROGRESS_V11)throw new Error('Marker V9/V11 mancanti.');
  console.log('PLOT_PROGRESS_V11_OK',JSON.stringify({plotLength:nodes.editPlot.value.length,state:plotState,progress:last}));
})().catch(e=>{console.error('PLOT_PROGRESS_V11_FAIL',e.stack||e.message);process.exit(1)});
