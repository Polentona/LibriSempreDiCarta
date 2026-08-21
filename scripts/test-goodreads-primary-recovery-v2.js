const fs=require('fs'),vm=require('vm');
global.window=global;
global.document={getElementById:()=>null,head:{appendChild(){}},createElement:()=>({})};
global.Event=function(){};
global.setTimeout=(fn)=>0;global.clearTimeout=()=>{};
global.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async()=>({found:false});
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>null;
global.__LIB_RESOLVE_OFFICIAL_PLOT=async()=>'';
global.__LIB_RESILIENT_ISBN_LOOKUP=async()=>({title:'Il libro delle anime',author:'Glenn Cooper',publisher:'TEA',year:'2011',description:'',cover:'',source:'fallback'});
const pages=new Map(),gr='https://www.goodreads.com/';
const pad=s=>String(s)+'\n'+('fixture Goodreads abbastanza lunga per superare la soglia del broker. '.repeat(3));
pages.set(gr+'search?q=9788850225798&search_type=books',pad('No Goodreads ISBN search results'));
pages.set(gr+'book/auto_complete?format=json&q=9788850225798',pad('[]'));
const current=pad(`
### Will Piper #2
# Il libro delle anime
### Glenn Cooper
Rate this book
È un libro, un semplice libro antico. Ma custodisce un segreto. Un segreto scritto col sangue nel 1297 che riappare nella vita di Will Piper. La scoperta conduce a una nuova corsa contro il tempo e a un mistero che attraversa i secoli, abbastanza lungo da essere una trama valida e interamente italiana.
Genres
[Thriller](${gr}genres/thriller)
[Mystery](${gr}genres/mystery)
[Fantasy](${gr}genres/fantasy)
[Crime](${gr}genres/crime)
[Historical Fiction](${gr}genres/historical-fiction)
421 pages, Paperback
[Book details & editions](${gr}work/editions/6865913-the-book-of-souls)
[Will Piper](${gr}series/12345-will-piper)
![cover](https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/abc.jpg)
ISBN: 9788850225798
`);
pages.set(gr+'book/isbn/9788850225798',current);
pages.set(gr+'book/show/13379510-il-libro-delle-anime',current);
pages.set(gr+'work/editions/6865913-the-book-of-souls',pad(`
## Il libro delle anime (Will Piper, #2)
Published May 1st 2011 by TEA
Paperback, 426 pages
ISBN: 9788850225798
Edition language: Italian
[Il libro delle anime](${gr}book/show/13379510-il-libro-delle-anime)
`));
pages.set(gr+'series/12345-will-piper',pad(`
### Book 1
[Library of the Dead (Will Piper #1)](${gr}book/show/1-library)
### Book 1.5
[Short Digital](${gr}book/show/15-short)
### Book 2
[Book of Souls (Will Piper #2)](${gr}book/show/13379510-il-libro-delle-anime)
### Book 2.5
[Digital Interlude](${gr}book/show/25-digital)
### Book 3
[The Keepers of the Library (Will Piper #3)](${gr}book/show/3-keepers)
`));
pages.set(gr+'book/show/1-library',pad(`# Library of the Dead\n### Glenn Cooper\n[Book details & editions](${gr}work/editions/1-library)\n`));
pages.set(gr+'work/editions/1-library',pad(`## La biblioteca dei morti\nPublished 2010 by TEA\nPaperback, 400 pages\nISBN: 9788850220000\nEdition language: Italian\n[La biblioteca dei morti](${gr}book/show/10-biblioteca)\n`));
pages.set(gr+'book/editions/1?filter_by_language=it',pages.get(gr+'work/editions/1-library'));
pages.set(gr+'book/show/3-keepers',pad(`# The Keepers of the Library\n### Glenn Cooper\n[Book details & editions](${gr}work/editions/3-keepers)\n`));
pages.set(gr+'work/editions/3-keepers',pad(`## I custodi della biblioteca\nPublished 2012 by TEA\nPaperback, 400 pages\nISBN: 9788850229999\nEdition language: Italian\n[I custodi della biblioteca](${gr}book/show/30-custodi)\n`));
pages.set(gr+'book/editions/3?filter_by_language=it',pages.get(gr+'work/editions/3-keepers'));
pages.set('https://app.thestorygraph.com/browse?search_term=9788850225798',pad(`Title: Browse Books | The StoryGraph\n# Title: Browse Books | The StoryGraph\nThere's nothing on The StoryGraph matching "9788850225798".\n![logo](https://assets.thestorygraph.com/logo.png)`));
global.__LIB_BROKER_TEXT=async url=>{let target=String(url).replace(/^https:\/\/r\.jina\.ai\//,'').replace(/^http:\/\/www\.goodreads\.com/,'https://www.goodreads.com').replace(/^http:\/\/app\.thestorygraph\.com/,'https://app.thestorygraph.com');return pages.get(target)||''};
vm.runInThisContext(fs.readFileSync('goodreads-primary-metadata-v1.js','utf8'));
vm.runInThisContext(fs.readFileSync('goodreads-primary-recovery-v2.js','utf8'));
(async()=>{
  const t=global.__LIB_GOODREADS_PRIMARY_RECOVERY_TEST__;
  if(!t)throw Error('Recovery API non installata');
  if(t.validStoryGraph({title:'Title: Browse Books | The StoryGraph',bookUrl:'https://app.thestorygraph.com/browse?search_term=x',raw:`There's nothing on The StoryGraph matching "x".`}))throw Error('Il no-match StoryGraph è stato accettato');
  const grbook=await t.locateGoodreads('9788850225798',{});if(!grbook)throw Error('ISBN Goodreads diretto non trovato');
  if(grbook.title!=='Il libro delle anime'||grbook.publisher!=='TEA'||grbook.published!=='2011')throw Error('Edizione Goodreads errata '+JSON.stringify(grbook));
  const r=await t.resolveEnhanced({code:'9788850225798',title:'',author:'',legacy:{}});
  if(r.source!=='goodreads')throw Error('Fonte non Goodreads: '+r.source);
  if(r.title!=='Il libro delle anime'||r.author!=='Glenn Cooper'||r.publisher!=='TEA'||r.published!=='2011')throw Error('Metadati base errati '+JSON.stringify(r));
  if(r.saga!=='Will Piper'||r.prequel!=='La biblioteca dei morti'||r.sequel!=='I custodi della biblioteca')throw Error('Relazioni errate '+JSON.stringify({saga:r.saga,prequel:r.prequel,sequel:r.sequel}));
  for(const g of ['Crime','Giallo','Thriller','Fantasy','Storico'])if(!r.genres.includes(g))throw Error('Genere mancante '+g+': '+r.genres.join(', '));
  if(!/^È un libro/.test(r.plot)||/https?|€|acquista/i.test(r.plot))throw Error('Trama non valida '+r.plot);
  if(!/goodreads\.com\/books/.test(r.cover))throw Error('Copertina non Goodreads '+r.cover);
  console.log('GOODREADS_PRIMARY_RECOVERY_V2_OK',JSON.stringify({title:r.title,publisher:r.publisher,genres:r.genres,saga:r.saga,prequel:r.prequel,sequel:r.sequel,source:r.source}));
  process.exit(0);
})().catch(e=>{console.error('GOODREADS_PRIMARY_RECOVERY_V2_FAIL',e.stack||e.message);process.exit(1)});
