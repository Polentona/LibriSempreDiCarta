from pathlib import Path
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
anchor="""  window.__LIB_INSPECT_FRONT_COVER=inspectFrontCover;
  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}
  async function usableCovers(covers){
    const seen=new Set(),list=[];
    for(const c of covers||[]){const url=secureUrl(typeof c==='string'?c:c.url),source=typeof c==='string'?'Fonte bibliografica':(c.source||'Fonte bibliografica');if(url&&!seen.has(url)){seen.add(url);list.push({url,source})}}
    const tested=await Promise.all(list.slice(0,12).map(async c=>({c,q:await inspectFrontCover(c.url)})));
    window.__LIB_LAST_COVER_QUALITY__=tested.map(x=>({url:x.c.url,source:x.c.source,...x.q}));
    return tested.filter(x=>x.q.ok).map(x=>x.c)
  }
"""
replacement="""  window.__LIB_INSPECT_FRONT_COVER=inspectFrontCover;
  function trustedEanCoverCheck(url){return new Promise(resolve=>{
    const img=new Image();let done=false;
    const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish({ok:false,reason:'timeout'}),6500);
    img.onerror=()=>finish({ok:false,reason:'load'});
    img.onload=()=>{const w=img.naturalWidth,h=img.naturalHeight,ratio=w/Math.max(1,h);finish({ok:w>=100&&h>=150&&ratio>=0.43&&ratio<=0.86,reason:'trusted-ean-ratio',w,h,ratio})};
    img.src=secureUrl(url)
  })}
  window.__LIB_TRUSTED_EAN_COVER_CHECK=trustedEanCoverCheck;
  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}
  async function usableCovers(covers){
    const seen=new Set(),list=[];
    for(const c of covers||[]){const url=secureUrl(typeof c==='string'?c:c.url),source=typeof c==='string'?'Fonte bibliografica':(c.source||'Fonte bibliografica');if(url&&!seen.has(url)){seen.add(url);list.push({url,source})}}
    const tested=await Promise.all(list.slice(0,12).map(async c=>({c,q:/Messaggerie Libri · EAN/i.test(c.source)?await trustedEanCoverCheck(c.url):await inspectFrontCover(c.url)})));
    window.__LIB_LAST_COVER_QUALITY__=tested.map(x=>({url:x.c.url,source:x.c.source,...x.q}));
    return tested.filter(x=>x.q.ok).map(x=>x.c)
  }
"""
if anchor not in s: raise SystemExit('cover quality anchor missing')
s=s.replace(anchor,replacement,1)
old="const messaggerieOk=await imageWorks(exactMessaggerie.url);"
new="const messaggerieProbe=await trustedEanCoverCheck(exactMessaggerie.url),messaggerieOk=!!messaggerieProbe.ok;"
if old not in s: raise SystemExit('messaggerie probe marker missing')
s=s.replace(old,new,1)
old2="window.__LIB_EXACT_EAN_COVER__={code:exactEan,url:exactMessaggerie.url,ok:messaggerieOk,retailerFallback:!messaggerieOk}"
new2="window.__LIB_EXACT_EAN_COVER__={code:exactEan,url:exactMessaggerie.url,ok:messaggerieOk,probe:messaggerieProbe,retailerFallback:!messaggerieOk}"
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
idx=Path('index.html');t=idx.read_text(encoding='utf-8')
oldv='isbn-cover.js?v=20260817-14';newv='isbn-cover.js?v=20260817-15'
if oldv not in t: raise SystemExit('v14 cache marker missing')
idx.write_text(t.replace(oldv,newv,1),encoding='utf-8')
print('DONE trusted EAN cover v15')
