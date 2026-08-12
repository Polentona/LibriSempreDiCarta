(()=>{
if(window.__LIB_ITALIAN_METADATA_PATCH)return;
window.__LIB_ITALIAN_METADATA_PATCH=true;

const nativeFetch=window.fetch.bind(window);

function urlOf(input){
  try{return new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return null}
}
function fetchWithUrl(input,init,url){
  if(typeof input==='string')return nativeFetch(url.toString(),init);
  try{return nativeFetch(new Request(url.toString(),input),init)}catch(e){return nativeFetch(url.toString(),init)}
}
function jsonResponse(original,data){
  const headers=new Headers(original.headers);headers.set('content-type','application/json; charset=utf-8');
  return new Response(JSON.stringify(data),{status:original.status,statusText:original.statusText,headers});
}
function norm(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
function isItalianLanguage(v){
  const x=String(v||'').toLowerCase();return x==='it'||x==='ita'||x==='italian'||x.startsWith('it-')
}
function languageList(v){return Array.isArray(v)?v.map(x=>typeof x==='string'?x:(x?.key||x?.name||'')):[]}
function italianEdition(ed){return languageList(ed?.language).some(isItalianLanguage)}
function yearFrom(v){const m=String(v||'').match(/\b(18|19|20)\d{2}\b/);return m?Number(m[0]):undefined}
function coverIdFromUrl(v){const m=String(v||'').match(/\/b\/id\/(\d+)-/);return m?Number(m[1]):undefined}
function addField(fields,name){const parts=String(fields||'').split(',').map(x=>x.trim()).filter(Boolean);if(!parts.includes(name))parts.push(name);return parts.join(',')}
function cleanLine(v){return String(v||'').replace(/\*\*/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[|#]/g,' ').replace(/\s+/g,' ').trim()}

async function exactOpenLibraryIsbn(code){
  try{
    const r=await nativeFetch(`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent('ISBN:'+code)}&jscmd=data&format=json`);
    if(!r.ok)return null;const data=await r.json();const b=data?.['ISBN:'+code];if(!b?.title)return null;
    const pub=(b.publishers||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
    const authors=(b.authors||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
    const ids=[];for(const arr of Object.values(b.identifiers||{})){if(Array.isArray(arr))for(const x of arr)ids.push(norm(x))}
    if(!ids.includes(norm(code)))ids.push(norm(code));
    const cId=coverIdFromUrl(b.cover?.large||b.cover?.medium||b.cover?.small||'');
    return {
      key:b.key||'',title:b.title||'',subtitle:b.subtitle||'',author_name:authors,publisher:pub,
      first_publish_year:yearFrom(b.publish_date),publish_date:b.publish_date?[b.publish_date]:[],subject:[],
      cover_i:cId,isbn:ids,edition_key:b.key?[String(b.key).replace('/books/','')]:[],language:['ita']
    }
  }catch(e){return null}
}

/* Alcune vecchie edizioni italiane non sono indicizzate da Google Books/Open Library.
   In quel caso usiamo la scheda ISBN di Eurolibro solo per recuperare i dati bibliografici
   essenziali; trama e genere vengono poi completati dal normale fallback degli store italiani. */
async function exactItalianCatalogIsbn(code){
  try{
    const r=await nativeFetch(`https://r.jina.ai/https://www.eurolibro.it/libro/isbn/${encodeURIComponent(code)}.html`,{headers:{Accept:'text/plain'}});
    if(!r.ok)return null;const text=await r.text();
    if(!text||!norm(text).includes(norm(code)))return null;
    const pickHeading=label=>{
      const re=new RegExp(label+'\\s*:?\\s*(?:\\|\\s*)?(?:\\n\\s*)+#{1,6}\\s*([^\\n]+)','i');
      const m=text.match(re);return m?cleanLine(m[1]):''
    };
    let author=pickHeading('Autore');
    let title=pickHeading('Titolo');
    if(!title){
      const m=text.match(/^#\s+(.+?)\s+-\s+(?:libri|nuovo libro|libro usato)/im);if(m)title=cleanLine(m[1])
    }
    if(!author){
      const m=text.match(/(?:^|\n)(?:##\s*)?([^\n:]{3,90})\s*:\s*\n\s*#\s+/i);if(m)author=cleanLine(m[1])
    }
    if(!title)return null;
    const pm=text.match(/(?:^|\n)Editore:\s*([^\n]+)/i);const publisher=pm?cleanLine(pm[1]):'';
    const ym=text.match(/Anno di pubblicazione:\s*((?:18|19|20)\d{2})/i);const year=ym?Number(ym[1]):undefined;
    const i10=text.match(/ISBN\s*\(ISBN-10\):\s*([0-9Xx-]+)/i);const i13=text.match(/EAN\s*\(ISBN-13\):\s*([0-9-]+)/i);
    const ids=[norm(code),norm(i10?.[1]),norm(i13?.[1])].filter(Boolean);
    return {
      key:'',title,subtitle:'',author_name:author?[author]:[],publisher:publisher?[publisher]:[],
      first_publish_year:year,publish_date:year?[String(year)]:[],subject:[],cover_i:undefined,
      isbn:[...new Set(ids)],edition_key:[],language:['ita']
    }
  }catch(e){return null}
}

window.fetch=async function(input,init){
  const u=urlOf(input);if(!u)return nativeFetch(input,init);

  /* Google Books: per i libri privilegiamo esclusivamente record italiani. */
  if(u.hostname==='www.googleapis.com'&&u.pathname.includes('/books/v1/volumes')){
    const q=u.searchParams.get('q')||'';
    const isbnMatch=q.match(/^isbn:([0-9Xx-]+)/i);
    if(isbnMatch)u.searchParams.set('langRestrict','it');
    const r=await fetchWithUrl(input,init,u);
    if(!isbnMatch||!r.ok)return r;
    try{
      const data=await r.json();
      data.items=(data.items||[]).filter(item=>isItalianLanguage(item?.volumeInfo?.language));
      for(const item of data.items){
        const v=item.volumeInfo||{};
        if(!isItalianLanguage(v.language)){delete v.description;delete v.categories}
      }
      data.totalItems=data.items.length;
      return jsonResponse(r,data)
    }catch(e){return r}
  }

  /* Open Library: per un ISBN recuperiamo prima l'edizione esatta, non il Work
     internazionale. Se non esiste nei cataloghi principali, tentiamo anche un
     catalogo italiano indicizzato per ISBN. */
  if(u.hostname==='openlibrary.org'&&u.pathname==='/search.json'){
    const q=u.searchParams.get('q')||'';const m=q.match(/^isbn:([0-9Xx-]+)/i);
    if(m){
      const code=norm(m[1]);
      u.searchParams.set('lang','it');
      u.searchParams.set('q',`isbn:${code} AND language:ita`);
      let fields=u.searchParams.get('fields')||'';
      for(const f of ['language','editions','editions.title','editions.subtitle','editions.language','editions.publisher','editions.publish_date','editions.cover_i','editions.isbn'])fields=addField(fields,f);
      u.searchParams.set('fields',fields);
      const [r,exact,catalog]=await Promise.all([fetchWithUrl(input,init,u),exactOpenLibraryIsbn(code),exactItalianCatalogIsbn(code)]);
      if(!r.ok)return r;
      try{
        const data=await r.json();const docs=[];
        if(exact)docs.push(exact);
        for(const d of data.docs||[]){
          const editions=d?.editions?.docs||[];
          const ed=editions.find(italianEdition);
          if(!ed)continue;
          const x={...d};
          x.title=ed.title||x.title;x.subtitle=ed.subtitle||x.subtitle;
          if(ed.publisher)x.publisher=Array.isArray(ed.publisher)?ed.publisher:[ed.publisher];
          if(ed.publish_date)x.publish_date=Array.isArray(ed.publish_date)?ed.publish_date:[ed.publish_date];
          if(ed.cover_i)x.cover_i=ed.cover_i;
          if(ed.isbn)x.isbn=Array.isArray(ed.isbn)?ed.isbn:[ed.isbn];
          x.language=['ita'];x.subject=[];
          const duplicate=docs.some(z=>String(z.title).toLowerCase()===String(x.title).toLowerCase()&&String((z.publisher||[])[0]||'').toLowerCase()===String((x.publisher||[])[0]||'').toLowerCase());
          if(!duplicate)docs.push(x)
        }
        if(!docs.length&&catalog)docs.push(catalog);
        data.docs=docs;data.numFound=docs.length;data.num_found=docs.length;
        return jsonResponse(r,data)
      }catch(e){return r}
    }
  }

  /* Le descrizioni dei Work di Open Library sono spesso in inglese anche quando
     l'edizione selezionata e' italiana: non le usiamo per compilare la trama. */
  if(u.hostname==='openlibrary.org'&&/^\/works\/[^/]+\.json$/.test(u.pathname)){
    const r=await nativeFetch(input,init);if(!r.ok)return r;
    try{const data=await r.json();delete data.description;delete data.subjects;return jsonResponse(r,data)}catch(e){return r}
  }

  return nativeFetch(input,init)
};
})();