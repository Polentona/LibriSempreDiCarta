from pathlib import Path
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="""      const exactEan=normalizeLoose(code);
      const exactMessaggerie={url:`https://img.messaggerielibri.it/images/${encodeURIComponent(exactEan)}_0_500_0_0.jpg`,source:'Messaggerie Libri · EAN'};
      const exactOl={url:`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(exactEan)}-L.jpg?default=false`,source:'Open Library · ISBN'};
      const retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');
      candidate.covers=mergeCoverOptions([exactMessaggerie,...(candidate.covers||[])],[exactOl,...retail])
"""
new="""      const exactEan=normalizeLoose(code);
      const exactMessaggerie={url:`https://img.messaggerielibri.it/images/${encodeURIComponent(exactEan)}_0_500_0_0.jpg`,source:'Messaggerie Libri · EAN'};
      const exactOl={url:`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(exactEan)}-L.jpg?default=false`,source:'Open Library · ISBN'};
      const messaggerieOk=await imageWorks(exactMessaggerie.url);
      let retail=[];
      if(!messaggerieOk)retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');
      candidate.covers=mergeCoverOptions(messaggerieOk?[exactMessaggerie,...(candidate.covers||[])]:candidate.covers,[exactOl,...retail]);
      window.__LIB_EXACT_EAN_COVER__={code:exactEan,url:exactMessaggerie.url,ok:messaggerieOk,retailerFallback:!messaggerieOk}
"""
if old not in s: raise SystemExit('v13 block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
idx=Path('index.html');t=idx.read_text(encoding='utf-8')
oldv='isbn-cover.js?v=20260817-13';newv='isbn-cover.js?v=20260817-14'
if oldv not in t: raise SystemExit('v13 cache marker missing')
idx.write_text(t.replace(oldv,newv,1),encoding='utf-8')
print('DONE exact EAN priority v14')
