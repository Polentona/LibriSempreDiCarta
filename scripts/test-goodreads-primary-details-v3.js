const fs=require('fs'),vm=require('vm');
global.window=global;
global.document={getElementById:()=>null,head:{appendChild(){}},createElement:()=>({})};
global.Event=function(){};global.setTimeout=(fn)=>0;global.clearTimeout=()=>{};
global.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async()=>({found:false});
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>null;
global.__LIB_RESOLVE_OFFICIAL_PLOT=async()=>'';
global.__LIB_RESILIENT_ISBN_LOOKUP=async()=>null;
const pages=new Map(),gr='https://www.goodreads.com/';
const pad=s=>String(s)+'\n'+('fixture Goodreads abbastanza lunga per superare la soglia del broker. '.repeat(3));
const current=pad(`
### Robert Langdon #5
# Origin
### Dan Brown
Rate this book
Robert Langdon è al Guggenheim di Bilbao per assistere a una conferenza in cui Edmond Kirsch promette di rispondere alle grandi domande dell'umanità. La serata precipita nel caos e Langdon deve proteggere una scoperta capace di cambiare il rapporto tra scienza e fede, in una corsa attraverso Bilbao e Barcellona.
Genres
[Thriller](${gr}genres/thriller)
[Mystery](${gr}genres/mystery)
[Adventure](${gr}genres/adventure)
560 pages, Hardcover
Published October 3, 2017 by Mondadori
![cover](https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/origin-it.jpg)
ISBN: 9788804681960
`);
pages.set(gr+'search?q=9788804681960&search_type=books',pad(`[Origin](${gr}book/show/40495797-origin)`));
pages.set(gr+'book/show/40495797-origin',current);
pages.set(gr+'book/isbn/9788804681960',current);
pages.set(gr+'book/auto_complete?format=json&q=9788804681960',pad('[]'));
const pre=pad(`
### Robert Langdon #4
# Inferno
### Dan Brown
Language: Italian
Rate this book
Robert Langdon si risveglia a Firenze senza memoria e viene trascinato in una corsa contro il tempo legata a Dante, a un mistero scientifico e a una minaccia globale. La descrizione è volutamente lunga e italiana per identificare l'edizione corretta.
Genres
[Thriller](${gr}genres/thriller)
[Mystery](${gr}genres/mystery)
![cover](https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/inferno-it.jpg)
`);
const seq=pad(`
### Robert Langdon #6
# L'ultimo segreto
### Dan Brown
Language: Italian
Rate this book
Mentre si trova a Praga con Katherine Solomon, Robert Langdon si ritrova coinvolto in una nuova indagine tra antichi segreti, scienza noetica e forze oscure. La descrizione italiana serve a selezionare l'edizione pubblicata in Italia.
Genres
[Thriller](${gr}genres/thriller)
[Mystery](${gr}genres/mystery)
![cover](https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/secret-it.jpg)
`);
for(const q of ['Robert Langdon #4 Dan Brown','Robert Langdon 4 Dan Brown'])pages.set(gr+'search?q='+encodeURIComponent(q)+'&search_type=books',pad(`[Inferno](${gr}book/show/17212231-inferno)`));
for(const q of ['Robert Langdon #6 Dan Brown','Robert Langdon 6 Dan Brown'])pages.set(gr+'search?q='+encodeURIComponent(q)+'&search_type=books',pad(`[L'ultimo segreto](${gr}book/show/224104112-l-ultimo-segreto)`));
pages.set(gr+'book/show/17212231-inferno',pre);
pages.set(gr+'book/show/224104112-l-ultimo-segreto',seq);
global.__LIB_BROKER_TEXT=async url=>{let target=String(url).replace(/^https:\/\/r\.jina\.ai\//,'').replace(/^http:\/\/www\.goodreads\.com/,'https://www.goodreads.com');return pages.get(target)||''};
vm.runInThisContext(fs.readFileSync('goodreads-primary-metadata-v1.js','utf8'));
vm.runInThisContext(fs.readFileSync('goodreads-primary-recovery-v2.js','utf8'));
vm.runInThisContext(fs.readFileSync('goodreads-primary-details-v3.js','utf8'));
(async()=>{
  const t=global.__LIB_GOODREADS_PRIMARY_DETAILS_TEST__;if(!t)throw Error('Details V3 non installato');
  const pd=t.parsePublisherDate(current);if(pd.publisher!=='Mondadori'||pd.published!=='2017')throw Error('Editore/data non estratti '+JSON.stringify(pd));
  const r=await global.__LIB_GOODREADS_PRIMARY_METADATA_TEST__.resolveAll({code:'9788804681960',title:'',author:'',legacy:{}});
  if(r.source!=='goodreads')throw Error('Fonte non Goodreads '+r.source);
  if(r.title!=='Origin'||r.author!=='Dan Brown'||r.publisher!=='Mondadori'||r.published!=='2017')throw Error('Metadati errati '+JSON.stringify({title:r.title,author:r.author,publisher:r.publisher,published:r.published}));
  if(r.saga!=='Robert Langdon'||r.prequel!=='Inferno'||r.sequel!=="L'ultimo segreto")throw Error('Relazioni errate '+JSON.stringify({saga:r.saga,prequel:r.prequel,sequel:r.sequel,relations:r.relations}));
  if(!r.relations?.authoritative||r.relations?.source!=='goodreads')throw Error('Relazioni non autorevoli Goodreads');
  for(const g of ['Giallo','Thriller','Avventura'])if(!r.genres.includes(g))throw Error('Genere mancante '+g+': '+r.genres.join(', '));
  if(!/goodreads\.com\/books/.test(r.cover))throw Error('Copertina non Goodreads '+r.cover);
  if(!/Guggenheim|Kirsch/i.test(r.plot)||/https?|€|acquista/i.test(r.plot))throw Error('Trama non valida '+r.plot);
  console.log('GOODREADS_PRIMARY_DETAILS_V3_OK',JSON.stringify({title:r.title,publisher:r.publisher,published:r.published,saga:r.saga,prequel:r.prequel,sequel:r.sequel,genres:r.genres,cover:r.cover}));
  process.exit(0);
})().catch(e=>{console.error('GOODREADS_PRIMARY_DETAILS_V3_FAIL',e.stack||e.message);process.exit(1)});
