from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')

old="""  const RETAIL_COVER_DOMAINS=['amazon.it','libraccio.it','ibs.it','mondadoristore.it','giunti.it','bancolibri.it','libreriauniversitaria.it','unilibro.it'];
  const RETAIL_COVER_NAMES={'amazon.it':'Amazon Italia','libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','giunti.it':'Giunti','bancolibri.it':'Bancolibri','libreriauniversitaria.it':'Libreria Universitaria','unilibro.it':'Unilibro'};
"""
new="""  const RETAIL_COVER_DOMAINS=['amazon.it','libraccio.it','ibs.it','mondadoristore.it','giunti.it','bancolibri.it','libreriauniversitaria.it','unilibro.it','thebanco.it'];
  const RETAIL_COVER_NAMES={'amazon.it':'Amazon Italia','libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','giunti.it':'Giunti','bancolibri.it':'Bancolibri','libreriauniversitaria.it':'Libreria Universitaria','unilibro.it':'Unilibro','thebanco.it':'TheBanco'};
"""
if old not in s: raise SystemExit('domain block not found')
s=s.replace(old,new,1)

anchor="""  function retailName(url){return RETAIL_COVER_NAMES[retailDomain(url)]||'Catalogo italiano'}
"""
insert=r"""  function retailName(url){return RETAIL_COVER_NAMES[retailDomain(url)]||'Catalogo italiano'}
  function retailListingUrl(url){
    try{
      const u=new URL(url),p=u.pathname.toLowerCase(),q=u.search.toLowerCase();
      return /(?:^|\/)(?:search|ricerca|cerca|catalogo)(?:\/|$)/i.test(p)||/[?&](?:q|query|keyword|search|s)=/i.test(q)||/google\.com\/search/i.test(url)
    }catch(e){return true}
  }
  const COVER_STOP_WORDS=new Set(['il','lo','la','i','gli','le','un','uno','una','di','del','della','dei','degli','delle','da','dal','dallo','dalla','e','ed','a','al','alla','ai','agli','alle','in','nel','nella','nei','nelle','con','per','su','tra','fra','the','a','an','of','and','to','in','on','for']);
  function coverIdentityWords(v){return normalizeText(v).split(' ').filter(w=>w.length>2&&!COVER_STOP_WORDS.has(w))}
  function retailPageMatchesBook(text,code,title='',author=''){
    const raw=String(text||''),digits=normalizeLoose(raw),isbn=normalizeLoose(code);if(!raw||!isbn||!digits.includes(isbn))return false;
    const hay=normalizeText(raw),tw=coverIdentityWords(title),aw=coverIdentityWords(author),fullTitle=normalizeText(title);
    let titleOk=!tw.length;if(fullTitle&&hay.includes(fullTitle))titleOk=true;
    if(!titleOk&&tw.length){const hit=tw.filter(w=>hay.includes(w)).length;titleOk=hit>=Math.max(1,Math.ceil(tw.length*.67))}
    const authorOk=!aw.length||aw.some(w=>hay.includes(w));
    return titleOk&&authorOk
  }
  function retailTargetWindow(text,code,title='',author=''){
    const raw=String(text||'');if(!raw)return'';
    const probes=[String(title||'').trim(),String(author||'').trim(),String(code||'').trim()].filter(Boolean);
    let idx=-1;for(const x of probes){const i=raw.toLowerCase().indexOf(x.toLowerCase());if(i>=0&&(idx<0||i<idx))idx=i}
    if(idx<0)return raw.slice(0,18000);
    return raw.slice(Math.max(0,idx-5000),Math.min(raw.length,idx+15000))
  }
"""
if anchor not in s: raise SystemExit('retailName anchor not found')
s=s.replace(anchor,insert,1)

old_func=r"""  async function retailerCoversForIsbn(code,title='',author=''){
    const n=normalizeLoose(code),i10=n.length===13?isbn13to10Ui(n):(n.length===10?n:''),pages=[];
    if(i10)pages.push(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
    pages.push(`https://www.libraccio.it/libro/${encodeURIComponent(n)}/`);
    pages.push(`https://www.mondadoristore.it/p/${encodeURIComponent(n)}`);
    pages.push(`https://www.giunti.it/search?q=${encodeURIComponent(n)}`);
    const query=`\"${n}\" \"${title||''}\" ${author||''} (site:amazon.it OR site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:giunti.it OR site:bancolibri.it OR site:libreriauniversitaria.it OR site:unilibro.it)`;
    const search=await retailReader('https://www.google.com/search?hl=it&num=12&q='+encodeURIComponent(query),12000);
    for(const u of retailLinks(search).slice(0,10))if(!pages.includes(u))pages.push(u);
    const aliases=[n,i10].filter(Boolean),checks=await Promise.all(pages.slice(0,12).map(async u=>{const text=await retailReader(u);if(!text)return[];const body=normalizeLoose(text);if(aliases.length&&!aliases.some(a=>body.includes(a)))return[];return retailImages(text,u,title).slice(0,3)}));
    const out=[],seen=new Set();for(const c of checks.flat().sort((a,b)=>(b.score||0)-(a.score||0))){if(c.url&&!seen.has(c.url)){seen.add(c.url);out.push({url:c.url,source:c.source})}}
    return out.slice(0,10)
  }
"""
new_func=r"""  async function retailerCoversForIsbn(code,title='',author=''){
    const n=normalizeLoose(code),i10=n.length===13?isbn13to10Ui(n):(n.length===10?n:''),queue=[],queued=new Set(),accepted=[];
    const enqueue=u=>{u=String(u||'').replace(/&amp;/g,'&').trim();if(!/^https?:\/\//i.test(u)||!retailDomain(u)||queued.has(u))return;queued.add(u);queue.push(u)};
    if(i10)enqueue(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
    enqueue(`https://www.libraccio.it/libro/${encodeURIComponent(n)}/`);
    enqueue(`https://www.mondadoristore.it/p/${encodeURIComponent(n)}`);
    enqueue(`https://www.giunti.it/search?q=${encodeURIComponent(n)}`);
    enqueue(`https://thebanco.it/search?keyword=${encodeURIComponent(n)}`);
    const query=`\"${n}\" \"${title||''}\" ${author||''} (site:amazon.it OR site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:giunti.it OR site:bancolibri.it OR site:libreriauniversitaria.it OR site:unilibro.it OR site:thebanco.it)`;
    const search=await retailReader('https://www.google.com/search?hl=it&num=14&q='+encodeURIComponent(query),12000);
    for(const u of retailLinks(search).slice(0,14))enqueue(u);
    const diagnostics=[];
    for(let pos=0;pos<queue.length&&pos<24;pos++){
      const u=queue[pos],text=await retailReader(u);if(!text){diagnostics.push({url:u,status:'unreadable'});continue}
      if(retailListingUrl(u)){
        const links=retailLinks(text);for(const link of links.slice(0,18))enqueue(link);
        diagnostics.push({url:u,status:'listing',links:links.length});continue
      }
      const match=retailPageMatchesBook(text,n,title,author);
      diagnostics.push({url:u,status:match?'verified-product':'rejected-product'});
      if(!match)continue;
      const windowText=retailTargetWindow(text,n,title,author),imgs=retailImages(windowText,u,title).slice(0,4);
      for(const c of imgs)accepted.push({...c,pageUrl:u,verified:true})
    }
    window.__LIB_LAST_RETAIL_COVER_PAGES__=diagnostics;
    const out=[],seen=new Set();for(const c of accepted.sort((a,b)=>(b.score||0)-(a.score||0))){if(c.url&&!seen.has(c.url)){seen.add(c.url);out.push({url:c.url,source:c.source,verified:true,pageUrl:c.pageUrl})}}
    return out.slice(0,10)
  }
"""
if old_func not in s: raise SystemExit('retailerCoversForIsbn block not found')
s=s.replace(old_func,new_func,1)

old_apply="""    const coverAlready=$x('editCover').value.trim()&&!autoFields.has('editCover');
    if(type==='isbn'&&!coverAlready){const retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');candidate.covers=mergeCoverOptions(candidate.covers,retail)}
"""
new_apply="""    const coverAlready=$x('editCover').value.trim()&&!autoFields.has('editCover');
    if(type==='isbn'&&!coverAlready){
      const exactOl={url:`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(normalizeLoose(code))}-L.jpg?default=false`,source:'Open Library · ISBN'};
      const retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');
      candidate.covers=mergeCoverOptions(candidate.covers,[exactOl,...retail])
    }
"""
if old_apply not in s: raise SystemExit('apply cover block not found')
s=s.replace(old_apply,new_apply,1)

p.write_text(s,encoding='utf-8')

idx=Path('index.html')
i=idx.read_text(encoding='utf-8')
oldv='isbn-cover.js?v=20260817-6'
newv='isbn-cover.js?v=20260817-12'
if oldv not in i: raise SystemExit('index cache version not found')
i=i.replace(oldv,newv,1)
idx.write_text(i,encoding='utf-8')
print('DONE cover identity v12')
