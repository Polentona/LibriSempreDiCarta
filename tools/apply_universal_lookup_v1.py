from pathlib import Path


def one(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: anchor {n} in {path}')
    p.write_text(text.replace(old,new,1),encoding='utf-8'); print('OK',label)

one('isbn-resilient-fallback-v1.js','function toGoogle(rec,code){',"window.__LIB_RESILIENT_ISBN_LOOKUP=resilientLookup;\nfunction toGoogle(rec,code){",'export resilient')

one('isbn-resilient-fallback-v1.js',
"function cleanCommercialTitle(v){let t=clean(v);t=t.replace(/\\s*\\((?:grande\\s+distrib[^)]*|ediz(?:ione)?[^)]*|vol\\.?\\s*\\d+[^)]*)\\)?\\s*$/i,'').trim();t=t.replace(/\\s+(?:grande\\s+distrib(?:uzione)?|ediz(?:ione)?\\s+economica)\\s*$/i,'').trim();return t}",
"function cleanCommercialTitle(v){let t=clean(v);t=t.replace(/\\s*\\((?:grande\\s+distrib[^)]*|ediz(?:ione)?[^)]*|vol\\.?\\s*\\d+[^)]*)\\)?\\s*$/i,'').trim();t=t.replace(/\\s*\\((?:grande\\s+distrib|ediz(?:ione)?|vol\\.?\\s*\\d+).*$/i,'').trim();t=t.replace(/\\s+(?:grande\\s+distrib(?:uzione)?|ediz(?:ione)?\\s+economica)\\s*$/i,'').trim();t=t.replace(/\\s*[-–—|]\\s*(?:TheBanco(?:\\.it)?|Libraccio(?:\\.it)?|IBS|Amazon(?:\\.it)?|Feltrinelli|Mondadori Store|Unilibro|Hoepli).*$/i,'').trim();return t}",
'clean titles')

one('isbn-resilient-fallback-v1.js','async function discoverRetail(code){',r'''function searchSnippetRecord(text,code){
  const s=String(text||''),aa=aliases(code),matches=[];const re=/\[([^\]]{2,240})\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(s)))matches.push({title:m[1],url:decodeBing(m[2].replace(/&amp;/g,'&')),start:m.index,end:re.lastIndex});
  for(let i=0;i<matches.length;i++){
    const hit=matches[i];if(!domainOf(hit.url))continue;const end=i+1<matches.length?matches[i+1].start:Math.min(s.length,hit.start+2200),block=s.slice(hit.start,end),compact=normCode(block);
    if(!aa.some(x=>x&&compact.includes(x)))continue;
    const title=cleanCommercialTitle(htmlDecode(hit.title));if(!validTitle(title))continue;
    let author='';const am=block.match(/(?:Autore|Author|scritto\s+da|di)\s*[:\-]?\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+){0,5})/i);if(am)author=clean(am[1]);if(author&&!validAuthor(author))author='';
    let publisher='';const pm=block.match(/(?:Editore|Publisher|edita\s+da)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9 .&'’_-]{2,100})/i);if(pm)publisher=cleanPublisher(pm[1].split(/\s{2,}|\n/)[0]);
    const year=block.match(/\b((?:18|19|20)\d{2})\b/)?.[1]||'';if(!author&&!publisher)continue;
    return {title,author,publisher,year,category:'',description:'',cover:'',source:sourceName(hit.url)+' (risultato ISBN verificato)',url:hit.url,score:31};
  }
  return null
}
async function discoverRetail(code){''','snippet parser')

old_tb="for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}"
new_tb="for(const u of [`https://thebanco.it/search?keyword=${encodeURIComponent(ean)}`,`https://thebanco.it/search?q=${encodeURIComponent(ean)}`]){const t=await jina(u,8500);for(const x of linksFrom(t))add(x);const sn=searchSnippetRecord(t,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}const self=inspectPage(t,u,ean);if(self){const enriched=await appleSearch(self);if(enriched.score>=20)return enriched}}"
one('isbn-resilient-fallback-v1.js',old_tb,new_tb,'thebanco snippet')

old_bing='''for(const q of [`"${ean}"`,`"${ean}" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);for(const x of linksFrom(b))add(x);if(links.length>=8)break}'''
new_bing='''for(const q of [`"${ean}"`,`"${ean}" libro`,siteQ]){const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);const sn=searchSnippetRecord(b,ean);if(sn){const enriched=await appleSearch(sn);if(enriched.score>=20)return enriched}for(const x of linksFrom(b))add(x);if(links.length>=8)break}const g=await jina('https://www.google.com/search?hl=it&num=10&q='+encodeURIComponent(`"${ean}" libro`),8500);const gsn=searchSnippetRecord(g,ean);if(gsn){const enriched=await appleSearch(gsn);if(enriched.score>=20)return enriched}for(const x of linksFrom(g))add(x);'''
one('isbn-resilient-fallback-v1.js',old_bing,new_bing,'search snippets')

old_candidates="""    if(type==='isbn'&&candidates.length){
      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact;
      const seriesVerified=candidates.filter(c=>c.saga&&c.author&&!/^(IVA|EAN|ISBN|EUR|SKU)$/i.test(c.author.trim()));if(seriesVerified.length)candidates=seriesVerified
    }"""
new_candidates=old_candidates+"""
    /* UNIVERSAL_ISBN_DIRECT_FALLBACK_V1 */
    if(type==='isbn'&&!candidates.length&&typeof window.__LIB_RESILIENT_ISBN_LOOKUP==='function'){
      try{
        const rec=await window.__LIB_RESILIENT_ISBN_LOOKUP(code);
        if(rec?.title&&(rec.author||rec.publisher)){
          candidates=[normalizeCandidateMetadata({title:rec.title||'',saga:'',author:rec.author||'',description:rec.description||'',category:rec.category||'',publisher:rec.publisher||'',publishedDate:rec.year||'',covers:rec.cover?[{url:rec.cover,source:rec.source||'Fonte ISBN verificata'}]:[],source:rec.source||'Fonte ISBN verificata',identifiers:[normalizeLoose(code)],exact:true})]
        }
      }catch(e){window.__LIB_RESILIENT_ISBN_DIRECT_ERROR__=String(e&&e.message||e);console.warn('Fallback ISBN resiliente diretto non disponibile',e)}
    }"""
one('isbn-cover.js',old_candidates,new_candidates,'ISBN direct coordinator')

anchor="    if(type==='isbn'&&!authoritativeRelationsResolved&&window.__LIB_ALLOW_LEGACY_RELATION_SEARCH===true&&typeof window.__LIB_RESOLVE_SERIES_NEIGHBORS==='function'&&candidate.title&&candidate.author&&candidate.saga&&(!candidate.prequel||!candidate.sequel)){"
universal="""    /* UNIVERSAL_SERIES_FALLBACK_V1 */
    if(type==='isbn'&&!authoritativeRelationsResolved&&typeof window.__LIB_RESOLVE_UNIVERSAL_SERIES==='function'&&candidate.title&&candidate.author){
      try{
        const universalRel=await window.__LIB_RESOLVE_UNIVERSAL_SERIES({code,title:candidate.title,author:candidate.author,publisher:candidate.publisher||'',saga:candidate.saga||'',description:candidate.description||''});
        window.__LIB_LAST_UNIVERSAL_SERIES_RESULT__=universalRel||null;
        if(universalRel?.saga){candidate.saga=safeBookRelation(universalRel.saga);setAutoField('editSaga',candidate.saga,true)}
        if(universalRel?.authoritative){
          authoritativeRelationsResolved=true;
          candidate.prequel=safeBookRelation(universalRel.prequel||'');candidate.sequel=safeBookRelation(universalRel.sequel||'');
          setAutoField('editPrequel',candidate.prequel,true);setAutoField('editSequel',candidate.sequel,true);
        }
      }catch(e){window.__LIB_LAST_UNIVERSAL_SERIES_ERROR__=String(e&&e.message||e);console.warn('Resolver universale serie non disponibile',e)}
    }

"""+anchor
one('isbn-cover.js',anchor,universal,'universal series coordinator')

old_idx='<script src="series-neighbors-standalone-v5.js?v=5"></script>\n<script src="lookup-lock.js?v=1"></script>'
new_idx='<script src="series-neighbors-standalone-v5.js?v=5"></script>\n<script src="series-universal-resolver-v1.js?v=1"></script>\n<script src="isbn-cover.js?v=20260817-1"></script>\n<script src="lookup-lock.js?v=2"></script>'
one('index.html',old_idx,new_idx,'index loaders')

print('DONE')
