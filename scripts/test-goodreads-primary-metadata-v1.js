const fs=require('fs'),vm=require('vm');
global.window=global;
global.document={getElementById:()=>null,head:{appendChild(){}},createElement:()=>({})};
global.Event=function(){};
global.__LIB_RESOLVE_AUTHORITATIVE_GENRES=async()=>({found:false});
global.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=async()=>null;
global.__LIB_RESOLVE_OFFICIAL_PLOT=async()=>'';
const pages=new Map();
const gr='https://www.goodreads.com/';
pages.set(gr+'search?q=9788850225798&search_type=books',`GOODREADS SEARCH RESULTS filler filler filler filler filler filler filler filler filler filler filler
[Il libro delle anime (Will Piper, #2)](${gr}book/show/13379510-il-libro-delle-anime)`);
pages.set(gr+'book/show/13379510-il-libro-delle-anime',`
### Will Piper #2
# Il libro delle anime
### Glenn Cooper
Rate this book
È un libro, un semplice libro antico. Ma custodisce un segreto. Un segreto che è stato scritto col sangue nel 1297 e riappare nella vita di Will Piper. Questo testo italiano serve come trama abbastanza lunga per essere considerata valida dal resolver e non contiene prezzi o collegamenti commerciali.
Genres
[Thriller](${gr}genres/thriller)
[Mystery](${gr}genres/mystery)
[Fiction](${gr}genres/fiction)
[Fantasy](${gr}genres/fantasy)
[Crime](${gr}genres/crime)
[Historical Fiction](${gr}genres/historical-fiction)
421 pages, Paperback
[Book details & editions](${gr}work/editions/6865913-the-book-of-souls)
[Will Piper](${gr}series/12345-will-piper)
![cover](https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/abc.jpg)
ISBN: 9788850225798
`);
pages.set(gr+'work/editions/6865913-the-book-of-souls',`
## Book of Souls (Will Piper, #2)
Published January 1st 2010 by Arrow
Paperback, 426 pages
ISBN: 9780099534471
Edition language: English
[Book of Souls](${gr}book/show/111-book-of-souls)
## Il libro delle anime (Will Piper, #2)
Published May 1st 2011 by TEA
I grandi della TEA, Paperback, 426 pages
ISBN: 9788850225798
Edition language: Italian
[Il libro delle anime](${gr}book/show/13379510-il-libro-delle-anime)
`);
pages.set(gr+'series/12345-will-piper',`
### Book 1
[Library of the Dead (Will Piper #1)](${gr}book/show/1-library)
### Book 1.5
[Short Digital](${gr}book/show/15-short)
### Book 2
[Book of Souls (Will Piper #2)](${gr}book/show/13379510-il-libro-delle-anime)
### Book 2.5
[Il tempo della verità](${gr}book/show/25-time)
### Book 3
[The Keepers of the Library (Will Piper #3)](${gr}book/show/3-keepers)
`);
pages.set(gr+'book/show/1-library',`# Library of the Dead
### Glenn Cooper
[Book details & editions](${gr}work/editions/1-library)
`);
pages.set(gr+'work/editions/1-library',`## La biblioteca dei morti
Published 2010 by TEA
Paperback, 400 pages
ISBN: 9788850220000
Edition language: Italian
[La biblioteca dei morti](${gr}book/show/10-biblioteca)
`);
pages.set(gr+'book/editions/1?filter_by_language=it',pages.get(gr+'work/editions/1-library'));
pages.set(gr+'book/show/3-keepers',`# The Keepers of the Library
### Glenn Cooper
[Book details & editions](${gr}work/editions/3-keepers)
`);
pages.set(gr+'work/editions/3-keepers',`## I custodi della biblioteca
Published 2012 by TEA
Paperback, 400 pages
ISBN: 9788850229999
Edition language: Italian
[I custodi della biblioteca](${gr}book/show/30-custodi)
`);
pages.set(gr+'book/editions/3?filter_by_language=it',pages.get(gr+'work/editions/3-keepers'));
global.__LIB_BROKER_TEXT=async url=>{
  const target=url.replace(/^https:\/\/r\.jina\.ai\//,'').replace(/^http:\/\/www\.goodreads\.com/,'https://www.goodreads.com');
  return pages.get(target)||'';
};
vm.runInThisContext(fs.readFileSync('goodreads-primary-metadata-v1.js','utf8'));
(async()=>{
  const t=global.__LIB_GOODREADS_PRIMARY_METADATA_TEST__;
  if(t.cleanTitle('Il libro delle anime : romanzo')!=='Il libro delle anime')throw Error('clean title colon');
  if(t.cleanTitle('Il libro delle anime (romanzo)')!=='Il libro delle anime')throw Error('clean title paren');
  const rows=t.parseSeriesRows(pages.get(gr+'series/12345-will-piper'));
  if(rows.some(x=>!Number.isInteger(x.position))||rows.map(x=>x.position).join(',')!=='1,2,3')throw Error('mezzi volumi non esclusi '+JSON.stringify(rows));
  const ebook=t.parseEditionBlock({title:'Solo ebook',block:'Published 2020 by Test\nKindle Edition\nISBN: 9780000000000\nEdition language: Italian'});
  if(ebook.physical||!ebook.ebook)throw Error('ebook-only non riconosciuto');
  const r=await t.resolveAll({code:'9788850225798',title:'Il libro delle anime : romanzo',author:'Glenn Cooper',legacy:{}});
  if(r.title!=='Il libro delle anime')throw Error('title');
  if(r.publisher!=='TEA')throw Error('publisher '+r.publisher);
  if(r.prequel!=='La biblioteca dei morti'||r.sequel!=='I custodi della biblioteca')throw Error('relations');
  if(!r.genres.includes('Giallo')||!r.genres.includes('Thriller'))throw Error('genres '+r.genres);
  if(r.cover.indexOf('goodreads.com/books')<0)throw Error('cover '+r.cover);
  if(r.source!=='goodreads')throw Error('source '+r.source);
  if(r.genres.includes('Narrativa'))throw Error('fiction generica non esclusa '+r.genres);
  if(!/^È un libro/.test(r.plot)||/https?|€|acquista/i.test(r.plot))throw Error('plot '+r.plot);
  console.log('GOODREADS_PRIMARY_METADATA_V1_OK',JSON.stringify({title:r.title,publisher:r.publisher,genres:r.genres,saga:r.saga,prequel:r.prequel,sequel:r.sequel,cover:r.cover}));
  process.exit(0);
})().catch(e=>{console.error('GOODREADS_PRIMARY_METADATA_V1_FAIL',e.stack||e.message);process.exit(1)});
