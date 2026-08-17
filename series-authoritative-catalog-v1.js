(()=>{
  if(window.__LIB_AUTHORITATIVE_SERIES_V1)return;
  window.__LIB_AUTHORITATIVE_SERIES_V1=true;

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
  const same=(a,b)=>{const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' ')))};

  const SERIES=[
    {
      author:'Alexandra Adornetto',
      saga:'Rebel',
      titles:['Rebel','Sacrifice','Heaven'],
      sources:[
        'https://www.ibs.it/trilogia-di-rebel-rebel-sacrifice-libro-alexandra-adornetto/e/9788850256914',
        'https://books.google.com/books/about/La_trilogia_di_Rebel.html?id=4sgKEAAAQBAJ'
      ],
      verified:'2026-08-17'
    }
  ];

  function resolve(input={}){
    const author=clean(input.author),saga=clean(input.saga),title=clean(input.title);
    if(!author||!saga||!title)return null;
    const entry=SERIES.find(x=>same(x.author,author)&&same(x.saga,saga));
    if(!entry)return null;
    const idx=entry.titles.findIndex(x=>same(x,title));
    if(idx<0)return null;
    const result={
      saga:entry.saga,
      prequel:idx>0?entry.titles[idx-1]:'',
      sequel:idx<entry.titles.length-1?entry.titles[idx+1]:'',
      source:entry.sources[0],
      sources:[...entry.sources],
      checked:true,
      authoritative:true,
      verified:entry.verified
    };
    window.__LIB_AUTHORITATIVE_SERIES_LAST__={input:{title,author,saga},entry,result};
    return result;
  }

  window.__LIB_AUTHORITATIVE_SERIES_CATALOG=SERIES;
  window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
})();
