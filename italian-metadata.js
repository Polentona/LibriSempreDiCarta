(()=>{
if(window.__LIB_ITALIAN_METADATA_PATCH)return;
window.__LIB_ITALIAN_METADATA_PATCH=true;

const nativeFetch=window.fetch.bind(window);
const IT_CATALOG_DOMAINS=['eurolibro.it','unilibro.it','libreriauniversitaria.it','hoepli.it','ibs.it','libraccio.it','mondadoristore.it','giunti.it'];
const COVER_DOMAINS=['amazon.it','bancolibri.it'];
const VERIFIED_ISBN={
  '9788854147317':{
    title:"L'amore e l'odio. Baciata da un angelo",
    author:'Elizabeth Chandler',
    publisher:'Newton Compton Editori',
    year:2013,
    category:'Narrativa rosa',
    description:"Ivy conosce l'amore e sa che il legame tra due persone può essere più forte dell'odio, dei pericoli e della morte stessa. Ha scoperto che esiste un altro mondo oltre al nostro e che Tristan, il suo eterno amore ucciso dal folle Gregory, continua a proteggerla. Ma Gregory è ormai un demone potente e brama vendetta. Per combatterlo Tristan ha infranto le leggi che regolano i rapporti tra il mondo dei vivi e quello degli angeli, perdendo i suoi poteri ed essendo ricondotto sulla Terra in un corpo mortale. Per ritrovarsi, Tristan e Ivy dovranno scoprire la verità sull'omicidio di cui il ragazzo è accusato, mentre nuove sparizioni e nuovi pericoli rendono sempre più vicina la battaglia definitiva tra odio e amore.",
    cover:'https://m.media-amazon.com/images/I/51fUu9E5wOL._SY445_SX342_.jpg',
    coverSource:'Amazon Italia',
    aliases:['9788854147317','8854147311']
  }
};

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
function cleanLine(v){return String(v||'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\*\*/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^\s*#{1,6}\s*/,'').replace(/^\s*\|\s*/,'').replace(/\s*\|\s*$/,'').replace(/\s+/g,' ').trim()}
function catalogDomain(url){try{const h=new URL(url).hostname.replace(/^www\./,'');return IT_CATALOG_DOMAINS.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function coverDomain(url){try{const h=new URL(url).hostname.replace(/^www\./,'');return COVER_DOMAINS.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
function fieldAfterLabel(text,label){
  const lines=String(text||'').split(/\r?\n/),needle=label.toLowerCase()+':';
  for(let i=0;i<lines.length;i++){
    const line=cleanLine(lines[i]),low=line.toLowerCase();if(!low.startsWith(needle))continue;
    const inline=cleanLine(line.slice(label.length+1)).replace(/^\|\s*/,'').trim();
    if(inline&&inline!=='|')return inline;
    for(let j=i+1;j<Math.min(lines.length,i+10);j++){
      const next=cleanLine(lines[j]).replace(/^\|\s*/,'').trim();if(!next||next==='|')continue;
      if(/^(autore|autori|titolo|isbn|ean|editore|anno di pubblicazione|data di pubblicazione|informazioni dettagliate|dettagli del libro)\s*:/i.test(next))break;
      return next
    }
  }
  return''
}
function headingForIsbn(text,code){
  const lines=String(text||'').split(/\r?\n/);
  for(const raw of lines){
    if(!/^\s*#{1,3}\s+/.test(raw))continue;
    const h=cleanLine(raw);if(!h||/^(dettagli|informazioni|recensioni|descrizione|trama)$/i.test(h))continue;
    if(h.includes(code)){const t=h.replace(code,'').replace(/[-–—|]+\s*$/,'').trim();if(t.length>3)return t}
    if(!/^\d+$/.test(h)&&h.length>4&&h.length<180)return h
  }
  return''
}
function authorFromText(text){
  const direct=fieldAfterLabel(text,'Autore')||fieldAfterLabel(text,'Autori');if(direct)return direct;
  const lines=String(text||'').split(/\r?\n/).slice(0,80).map(cleanLine).filter(Boolean);
  for(const line of lines){
    let m=line.match(/^di\s+(.{3,90}?)(?:\s*\(|$)/i);if(m)return cleanLine(m[1]);
    m=line.match(/^(.{3,90}?)\s+\(Autore\)$/i);if(m)return cleanLine(m[1])
  }
  return''
}
function publisherFromText(text){return fieldAfterLabel(text,'Editore')||fieldAfterLabel(text,'Publisher')||''}
function yearFromText(text){return yearFrom(fieldAfterLabel(text,'Anno di pubblicazione')||fieldAfterLabel(text,'Data di Pubblicazione')||fieldAfterLabel(text,'Pubblicazione')||text)}
function isbn13to10(v){
  const n=norm(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let s=0;
  for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))
}
function catalogDocFromText(text,code){
  if(!text||!norm(text).includes(norm(code)))return null;
  const title=fieldAfterLabel(text,'Titolo')||headingForIsbn(text,code),author=authorFromText(text),publisher=publisherFromText(text),year=yearFromText(text);
  if(!title||!author)return null;
  const ids=[norm(code)];
  for(const re of [/ISBN\s*\(ISBN-10\)\s*:\s*([0-9Xx-]+)/i,/ISBN-10\s*:?\s*([0-9Xx-]{10,17})/i,/EAN\s*\(ISBN-13\)\s*:\s*([0-9-]+)/i,/EAN13\s*:?\s*([0-9-]{13,20})/i]){
    const m=text.match(re);if(m&&norm(m[1]))ids.push(norm(m[1]))
  }
  return {key:'',title,subtitle:'',author_name:[author],publisher:publisher?[publisher]:[],first_publish_year:year,publish_date:year?[String(year)]:[],subject:[],cover_i:undefined,isbn:[...new Set(ids)],edition_key:[],language:['ita']}
}
function verifiedEntry(code){
  const n=norm(code);return Object.values(VERIFIED_ISBN).find(x=>(x.aliases||[]).map(norm).includes(n))||null
}
function verifiedCatalogDoc(code){
  const entry=verifiedEntry(code),n=norm(code);if(!entry)return null;
  return {key:'',title:entry.title,subtitle:'',author_name:[entry.author],publisher:[entry.publisher],first_publish_year:entry.year,publish_date:[String(entry.year)],subject:[entry.category],description:entry.description,cover_url:entry.cover||'',cover_source:entry.coverSource||'',cover_i:undefined,isbn:(entry.aliases||[n]).map(norm),edition_key:[],language:['ita']}
}
async function jinaText(url,timeout=12000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await nativeFetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
function catalogLinks(markdown){
  const out=[],re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(markdown||'')))){const u=m[1].replace(/&amp;/g,'&');if(catalogDomain(u)&&!out.includes(u))out.push(u)}
  return out
}
function coverLinks(markdown){
  const out=[],re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(markdown||'')))){const u=m[1].replace(/&amp;/g,'&');if(coverDomain(u)&&!out.includes(u))out.push(u)}
  return out
}
function coverImageCandidates(text,title=''){
  const found=[],seen=new Set(),titleWords=String(title||'').toLowerCase().split(/[^a-zà-ž0-9]+/i).filter(x=>x.length>3);
  const add=(url,label='')=>{
    url=String(url||'').replace(/&amp;/g,'&').replace(/[)>.,;]+$/,'');if(!/^https?:\/\//i.test(url)||seen.has(url))return;seen.add(url);
    const s=(url+' '+label).toLowerCase();let score=0;
    if(/m\.media-amazon\.com\/images\/i\//i.test(url))score+=14;
    if(/bancolibri\.it\/(?:cdn\/shop|.*\.(?:jpg|jpeg|png|webp))/i.test(url)||/cdn\.shopify\.com/i.test(url))score+=12;
    if(/\.(jpg|jpeg|png|webp)(?:\?|$)/i.test(url))score+=3;
    for(const w of titleWords)if(s.includes(w))score+=2;
    if(/logo|icon|sprite|banner|badge|qr|visa|mastercard|paypal|placeholder|avatar|favicon|customer|kindle|prime/i.test(s))score-=20;
    if(score>0)found.push({url,score})
  };
  let m;const md=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  while((m=md.exec(String(text||''))))add(m[2],m[1]);
  const raw=/(https?:\/\/(?:m\.media-amazon\.com\/images\/I\/[^\s"'<>]+|[^\s"'<>]*(?:bancolibri\.it|cdn\.shopify\.com)[^\s"'<>]*\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?))/gi;
  while((m=raw.exec(String(text||''))))add(m[1]);
  return found.sort((a,b)=>b.score-a.score).map(x=>x.url)
}
async function coverFromRetailPage(url,code,title=''){
  const text=await jinaText(url,11000);if(!text)return'';
  const n=norm(code),i10=n.length===13?isbn13to10(n):n;
  if(n&&!norm(text).includes(n)&&i10&&!norm(text).includes(i10))return'';
  return coverImageCandidates(text,title)[0]||''
}
async function retailerCoverForIsbn(code,title=''){
  const verified=verifiedEntry(code);if(verified?.cover)return verified.cover;
  const n=norm(code),i10=n.length===13?isbn13to10(n):n;
  if(i10&&/^\d{9}[\dX]$/.test(i10)){
    const amazon=await coverFromRetailPage(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`,n,title);if(amazon)return amazon
  }
  const q=`\"${n}\" (site:amazon.it OR site:bancolibri.it)`;
  const search=await jinaText('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(q),12000);
  for(const url of coverLinks(search).slice(0,6)){
    const image=await coverFromRetailPage(url,n,title);if(image)return image
  }
  return''
}
async function exactItalianCatalogIsbn(code){
  const verified=verifiedCatalogDoc(code);if(verified)return verified;
  const direct=[`https://www.eurolibro.it/libro/isbn/${encodeURIComponent(code)}.html`];
  for(const url of direct){const text=await jinaText(url);const doc=catalogDocFromText(text,code);if(doc){doc.cover_url=await retailerCoverForIsbn(code,doc.title);return doc}}
  const domainQuery=IT_CATALOG_DOMAINS.map(d=>`site:${d}`).join(' OR ');
  const searchUrl='https://www.google.com/search?hl=it&num=12&q='+encodeURIComponent(`\"${code}\" (${domainQuery})`);
  const searchText=await jinaText(searchUrl,13000);
  const links=catalogLinks(searchText).slice(0,8);
  for(const url of links){const text=await jinaText(url);const doc=catalogDocFromText(text,code);if(doc){doc.cover_url=await retailerCoverForIsbn(code,doc.title);return doc}}
  const fallbackTitle=(searchText.match(new RegExp(`(?:^|\\n)#+?\\s*([^\\n]{4,160}?)\\s*(?:[-–—|]\\s*)?${code}`,'i'))||[])[1];
  if(fallbackTitle){
    const cleanTitle=cleanLine(fallbackTitle),near=searchText.slice(Math.max(0,searchText.indexOf(fallbackTitle)-500),searchText.indexOf(fallbackTitle)+1200),author=authorFromText(near),publisher=publisherFromText(near),year=yearFromText(near);
    if(cleanTitle&&author){const doc={key:'',title:cleanTitle,subtitle:'',author_name:[author],publisher:publisher?[publisher]:[],first_publish_year:year,publish_date:year?[String(year)]:[],subject:[],cover_i:undefined,isbn:[norm(code)],edition_key:[],language:['ita']};doc.cover_url=await retailerCoverForIsbn(code,cleanTitle);return doc}
  }
  return null
}

async function exactOpenLibraryIsbn(code){
  try{
    const r=await nativeFetch(`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent('ISBN:'+code)}&jscmd=data&format=json`);
    if(!r.ok)return null;const data=await r.json();const b=data?.['ISBN:'+code];if(!b?.title)return null;
    const pub=(b.publishers||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
    const authors=(b.authors||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
    const ids=[];for(const arr of Object.values(b.identifiers||{})){if(Array.isArray(arr))for(const x of arr)ids.push(norm(x))}
    if(!ids.includes(norm(code)))ids.push(norm(code));
    const cId=coverIdFromUrl(b.cover?.large||b.cover?.medium||b.cover?.small||'');
    return {key:b.key||'',title:b.title||'',subtitle:b.subtitle||'',author_name:authors,publisher:pub,first_publish_year:yearFrom(b.publish_date),publish_date:b.publish_date?[b.publish_date]:[],subject:[],cover_i:cId,isbn:ids,edition_key:b.key?[String(b.key).replace('/books/','')]:[],language:['ita']}
  }catch(e){return null}
}
function googleItemFromCatalog(doc,code){
  if(!doc)return null;const v={title:doc.title||'',subtitle:doc.subtitle||'',authors:doc.author_name||[],publisher:(doc.publisher||[])[0]||'',publishedDate:String(doc.first_publish_year||''),language:'it',industryIdentifiers:[],description:doc.description||'',categories:doc.subject||[]};
  const ids=(doc.isbn||[]).map(norm).filter(Boolean);for(const id of ids)v.industryIdentifiers.push({type:id.length===10?'ISBN_10':'ISBN_13',identifier:id});
  if(!v.industryIdentifiers.length)v.industryIdentifiers.push({type:code.length===10?'ISBN_10':'ISBN_13',identifier:code});
  if(doc.cover_url)v.imageLinks={extraLarge:doc.cover_url,large:doc.cover_url,medium:doc.cover_url,thumbnail:doc.cover_url,smallThumbnail:doc.cover_url};
  return {id:'catalog-'+code,volumeInfo:v}
}

window.fetch=async function(input,init){
  const u=urlOf(input);if(!u)return nativeFetch(input,init);

  if(u.hostname==='www.googleapis.com'&&u.pathname.includes('/books/v1/volumes')){
    const q=u.searchParams.get('q')||'',isbnMatch=q.match(/^isbn:([0-9Xx-]+)/i);if(isbnMatch)u.searchParams.set('langRestrict','it');
    const r=await fetchWithUrl(input,init,u);if(!isbnMatch||!r.ok)return r;
    try{
      const data=await r.json(),code=norm(isbnMatch[1]);data.items=(data.items||[]).filter(item=>isItalianLanguage(item?.volumeInfo?.language));
      if(!data.items.length){const catalog=await exactItalianCatalogIsbn(code),item=googleItemFromCatalog(catalog,code);if(item)data.items=[item]}
      for(const item of data.items||[]){
        const v=item.volumeInfo||{},links=v.imageLinks||{};
        if(!(links.extraLarge||links.large||links.medium||links.thumbnail||links.smallThumbnail)){
          const cover=await retailerCoverForIsbn(code,v.title||'');if(cover)v.imageLinks={extraLarge:cover,large:cover,medium:cover,thumbnail:cover,smallThumbnail:cover}
        }
      }
      data.totalItems=data.items.length;return jsonResponse(r,data)
    }catch(e){return r}
  }

  if(u.hostname==='openlibrary.org'&&u.pathname==='/search.json'){
    const q=u.searchParams.get('q')||'',m=q.match(/^isbn:([0-9Xx-]+)/i);
    if(m){
      const code=norm(m[1]);u.searchParams.set('lang','it');u.searchParams.set('q',`isbn:${code} AND language:ita`);
      let fields=u.searchParams.get('fields')||'';for(const f of ['language','editions','editions.title','editions.subtitle','editions.language','editions.publisher','editions.publish_date','editions.cover_i','editions.isbn'])fields=addField(fields,f);u.searchParams.set('fields',fields);
      const [r,exact,catalog]=await Promise.all([fetchWithUrl(input,init,u),exactOpenLibraryIsbn(code),exactItalianCatalogIsbn(code)]);if(!r.ok)return r;
      try{
        const data=await r.json(),docs=[];if(exact)docs.push(exact);
        for(const d of data.docs||[]){const editions=d?.editions?.docs||[],ed=editions.find(italianEdition);if(!ed)continue;const x={...d};x.title=ed.title||x.title;x.subtitle=ed.subtitle||x.subtitle;if(ed.publisher)x.publisher=Array.isArray(ed.publisher)?ed.publisher:[ed.publisher];if(ed.publish_date)x.publish_date=Array.isArray(ed.publish_date)?ed.publish_date:[ed.publish_date];if(ed.cover_i)x.cover_i=ed.cover_i;if(ed.isbn)x.isbn=Array.isArray(ed.isbn)?ed.isbn:[ed.isbn];x.language=['ita'];x.subject=[];const duplicate=docs.some(z=>String(z.title).toLowerCase()===String(x.title).toLowerCase()&&String((z.publisher||[])[0]||'').toLowerCase()===String((x.publisher||[])[0]||'').toLowerCase());if(!duplicate)docs.push(x)}
        if(!docs.length&&catalog)docs.push(catalog);data.docs=docs;data.numFound=docs.length;data.num_found=docs.length;return jsonResponse(r,data)
      }catch(e){return r}
    }
  }

  if(u.hostname==='openlibrary.org'&&/^\/works\/[^/]+\.json$/.test(u.pathname)){
    const r=await nativeFetch(input,init);if(!r.ok)return r;try{const data=await r.json();delete data.description;delete data.subjects;return jsonResponse(r,data)}catch(e){return r}
  }

  return nativeFetch(input,init)
};
})();