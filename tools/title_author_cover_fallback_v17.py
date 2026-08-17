from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
anchor="""  window.__LIB_TRUSTED_EAN_COVER_CHECK=trustedEanCoverCheck;\n  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}\n"""
insert="""  window.__LIB_TRUSTED_EAN_COVER_CHECK=trustedEanCoverCheck;\n  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}\n  async function titleAuthorCoverFallback(title,author){\n    const out=[],seen=new Set(),nt=normalizeText(title),na=normalizeText(author);\n    const stop=new Set(['il','lo','la','i','gli','le','un','uno','una','di','del','della','dei','degli','delle','da','e','ed','a','al','alla','in','nel','con','per','su','the','a','an','of','and','to','in','on','for']);\n    const tw=nt.split(' ').filter(w=>w.length>2&&!stop.has(w)),aw=na.split(' ').filter(w=>w.length>2&&!stop.has(w));\n    const matches=(t,a)=>{const ht=normalizeText(t),ha=normalizeText(a);if(!ht)return false;const th=tw.filter(w=>ht.includes(w)).length,titleOk=!tw.length||ht.includes(nt)||th>=Math.max(1,Math.ceil(tw.length*.67));const authorOk=!aw.length||aw.some(w=>ha.includes(w));return titleOk&&authorOk};\n    const add=(url,source)=>{url=secureUrl(url);if(url&&!seen.has(url)){seen.add(url);out.push({url,source})}};\n    try{\n      const q=`intitle:\"${title}\" inauthor:\"${author}\"`,r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&projection=full`);\n      if(r.ok){const d=await r.json();for(const item of d.items||[]){const v=item.volumeInfo||{},a=(v.authors||[]).join(' ');if(!matches(v.title||'',a))continue;const u=getGoogleCover(v.imageLinks||{});if(u)add(u,'Google Books · titolo/autore')}}\n    }catch(e){}\n    try{\n      const r=await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=12`);\n      if(r.ok){const d=await r.json();for(const doc of d.docs||[]){const a=(doc.author_name||[]).join(' ');if(!matches(doc.title||'',a)||!doc.cover_i)continue;add(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,'Open Library · titolo/autore')}}\n    }catch(e){}\n    window.__LIB_LAST_TITLE_AUTHOR_COVERS__=out.slice(0,10);\n    return out.slice(0,10)\n  }\n  window.__LIB_TITLE_AUTHOR_COVER_FALLBACK=titleAuthorCoverFallback;\n"""
if anchor not in s:
    raise SystemExit('imageWorks anchor not found')
s=s.replace(anchor,insert,1)
old="""      const messaggerieProbe=await trustedEanCoverCheck(exactMessaggerie.url),messaggerieOk=!!messaggerieProbe.ok;\n      let retail=[];\n      if(!messaggerieOk)retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');\n      candidate.covers=mergeCoverOptions(messaggerieOk?[exactMessaggerie,...(candidate.covers||[])]:candidate.covers,[exactOl,...retail]);\n      window.__LIB_EXACT_EAN_COVER__={code:exactEan,url:exactMessaggerie.url,ok:messaggerieOk,probe:messaggerieProbe,retailerFallback:!messaggerieOk}\n"""
new="""      const messaggerieProbe=await trustedEanCoverCheck(exactMessaggerie.url),messaggerieOk=!!messaggerieProbe.ok;\n      let titleAuthorCovers=[],retail=[];\n      if(!messaggerieOk){\n        titleAuthorCovers=await titleAuthorCoverFallback(candidate.title||'',candidate.author||'');\n        if(!titleAuthorCovers.length)retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');\n      }\n      const primary=messaggerieOk?[exactMessaggerie,...(candidate.covers||[])]:[...(candidate.covers||[]),...titleAuthorCovers];\n      candidate.covers=mergeCoverOptions(primary,[exactOl,...retail]);\n      window.__LIB_EXACT_EAN_COVER__={code:exactEan,url:exactMessaggerie.url,ok:messaggerieOk,probe:messaggerieProbe,titleAuthorFallback:titleAuthorCovers.length,retailerFallback:!messaggerieOk&&!titleAuthorCovers.length}\n"""
if old not in s:
    raise SystemExit('cover block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
t=idx.read_text(encoding='utf-8')
t=t.replace('isbn-cover.js?v=20260817-16','isbn-cover.js?v=20260817-17')
idx.write_text(t,encoding='utf-8')
print('DONE title/author cover fallback v17')
