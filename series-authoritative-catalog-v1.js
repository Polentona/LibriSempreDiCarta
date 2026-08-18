(()=>{
  if(window.__LIB_AUTHORITATIVE_SERIES_V1)return;
  window.__LIB_AUTHORITATIVE_SERIES_V1=true;

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
  const same=(a,b)=>{const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' ')))};
  const escRe=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function withoutSaga(title,saga){
    let t=clean(title),s=clean(saga);if(!t||!s)return t;
    const e=escRe(s);
    t=t.replace(new RegExp('^\\s*'+e+'\\s*(?:[.:-]|[-–—])?\\s*','i'),'').trim();
    t=t.replace(new RegExp('\\s*(?:[.:-]|[-–—])?\\s*'+e+'\\s*$','i'),'').trim();
    return t;
  }
  const sameTitle=(candidate,canonical,saga)=>same(candidate,canonical)||same(withoutSaga(candidate,saga),canonical);

  const SERIES=[
    {
      author:'Alexandra Adornetto',
      saga:'Rebel',
      titles:['Rebel','Sacrifice','Heaven'],
      codes:{
        '9788850238934':0,
        '9788850253449':0,
        '9788850238941':1,
        '9788850253456':1,
        '9788850238958':2,
        '8850238959':2,
        '9788850253463':2
      },
      sources:[
        'https://www.ibs.it/trilogia-di-rebel-rebel-sacrifice-libro-alexandra-adornetto/e/9788850256914',
        'https://www.ibs.it/heaven-libro-alexandra-adornetto/e/9788850238958',
        'https://books.google.com/books/about/La_trilogia_di_Rebel.html?id=4sgKEAAAQBAJ'
      ],
      verified:'2026-08-18'
    },
    {
      author:'Elizabeth Chandler',
      saga:'Baciata da un angelo',
      titles:["L'amore che non muore","Il potere dell'amore",'Anime gemelle','In fondo al cuore',"L'amore e l'odio",'Sarà per sempre'],
      sources:[
        'https://www.ibs.it/libri/traduttore/elizabeth-chandler',
        'https://www.libreriauniversitaria.it/amore-odio-baciata-angelo-chandler/libro/9788854147317',
        'https://www.libreriauniversitaria.it/sara-sempre-baciata-angelo-chandler/libro/9788854150706'
      ],
      verified:'2026-08-17'
    },
    {
      author:'Kerstin Gier',
      saga:'Trilogia dei sogni',
      titles:['Il libro dei sogni','La porta di Liv. Silver',"L'ultimo segreto"],
      codes:{'9788863807035':1,'8863807035':1},
      sources:['https://books.google.com/books/about/Silver_La_Trilogia.html?id=ydS2DQAAQBAJ','https://www.ibs.it/porta-di-liv-silver-trilogia-libro-kerstin-gier/e/9788863807035'],
      verified:'2026-08-17'
    },
    {
      author:'Kerstin Gier',
      saga:'Trilogia delle gemme',
      titles:['Red','Blue','Green'],
      codes:{'9788850230884':1,'8850230885':1},
      sources:['https://books.google.com/books/about/Red_Blue_Green_La_Trilogia.html?id=-HcFlavOcOgC','https://www.ibs.it/blue-trilogia-delle-gemme-vol-libro-kerstin-gier/e/9788850230884'],
      verified:'2026-08-17'
    },
    {
      author:'Koji Suzuki',
      saga:'Ring',
      titles:['Ring','Spiral','Loop'],
      codes:{'8842913316':1,'9788842913313':1},
      sources:[
        'https://www.penguinrandomhouse.com/books/175557/spiral-by-koji-suzuki/',
        'https://kodansha.us/book/ring-trilogy/loop-paperback/'
      ],
      verified:'2026-08-17'
    },
    {
      author:'Simon Beckett',
      saga:'David Hunter',
      titles:['La chimica della morte','Scritto nelle ossa','I sussurri della morte','La voce dei morti','Acque morte','Il profumo della morte'],
      codes:{'9788845283253':2},
      sources:['https://www.bompiani.it/catalogo/i-sussurri-della-morte-9788845279553','https://www.bompiani.it/autori/simon-beckett-524'],
      verified:'2026-08-17'
    },
    {
      author:'Stephen King',
      saga:'',
      titles:['Shining','Doctor Sleep'],
      codes:{'9788845275746':0,'8845275744':0},
      sources:[
        'https://www.bompiani.it/autori/stephen-king-773',
        'https://stephenking.com/news/doctor-sleep-release-date-325.html'
      ],
      verified:'2026-08-17'
    }
  ];

  function titleMatchesForAuthor(author,title){
    const hits=[];
    for(const candidate of SERIES){
      if(!same(candidate.author,author))continue;
      const candidateIdx=candidate.titles.findIndex(x=>sameTitle(title,x,candidate.saga));
      if(candidateIdx>=0)hits.push({entry:candidate,idx:candidateIdx});
    }
    return hits;
  }

  function resolve(input={}){
    const author=clean(input.author),saga=clean(input.saga),title=clean(input.title),code=clean(input.code).replace(/[^0-9Xx]/g,'').toUpperCase();
    let entry=null,idx=-1;
    if(code){
      entry=SERIES.find(x=>x.codes&&Object.prototype.hasOwnProperty.call(x.codes,code))||null;
      if(entry)idx=Number(entry.codes[code]);
    }
    if(!entry&&author&&saga&&title){
      entry=SERIES.find(x=>same(x.author,author)&&same(x.saga,saga))||null;
      if(entry)idx=entry.titles.findIndex(x=>sameTitle(title,x,entry.saga));
    }
    /*
      Il nome della saga puo' non essere ancora disponibile quando parte la ricerca ISBN.
      In quel caso usiamo autore + titolo SOLO se identifica un'unica voce del catalogo
      canonico italiano. Questo evita di passare ai fallback generici dell'intera
      bibliografia dell'autore, che possono mescolare serie diverse o titoli originali.
    */
    if(!entry&&author&&title){
      const hits=titleMatchesForAuthor(author,title);
      if(hits.length===1){entry=hits[0].entry;idx=hits[0].idx}
    }
    if(!entry||idx<0||idx>=entry.titles.length)return null;
    const result={
      saga:entry.saga,
      prequel:idx>0?entry.titles[idx-1]:'',
      sequel:idx<entry.titles.length-1?entry.titles[idx+1]:'',
      source:entry.sources[0],
      sources:[...entry.sources],
      checked:true,
      authoritative:true,
      terminal:idx===entry.titles.length-1,
      initial:idx===0,
      verified:entry.verified
    };
    window.__LIB_AUTHORITATIVE_SERIES_LAST__={input:{title,author,saga,code},entry,result};
    return result;
  }

  /*
    GUARDIA CANONICA V2
    Un'estremita' della saga ha intenzionalmente uno dei due vicini vuoto.
    I resolver generici non devono interpretare quel vuoto come un dato mancante e
    sovrascriverlo con elementi presi dalla bibliografia generale dell'autore.
  */
  function canonicalComplete(rel){
    if(!rel?.authoritative||!clean(rel.saga))return false;
    if(rel.initial&&rel.terminal)return true;
    if(rel.initial)return !!clean(rel.sequel);
    if(rel.terminal)return !!clean(rel.prequel);
    return !!clean(rel.prequel)&&!!clean(rel.sequel);
  }
  function canonicalRelation(rel){
    return {
      saga:clean(rel.saga),prequel:clean(rel.prequel),sequel:clean(rel.sequel),
      sagaChecked:true,checked:true,authoritative:true,
      initial:!!rel.initial,terminal:!!rel.terminal,
      source:rel.source||'',sources:Array.isArray(rel.sources)?[...rel.sources]:[]
    };
  }
  function obviousRelationGarbage(v){
    const x=clean(v),n=norm(v);if(!x)return false;
    if(x.length>190)return true;
    return /\b(?:author of|autore di|writer of|scrittore di|born (?:18|19|20)\d{2}|nato (?:nel )?(?:18|19|20)\d{2})\b/i.test(n);
  }
  function sanitizeRelations(rel){
    if(!rel||typeof rel!=='object')return rel;
    const out={...rel};
    if(obviousRelationGarbage(out.prequel))out.prequel='';
    if(obviousRelationGarbage(out.sequel))out.sequel='';
    return out;
  }
  function wrapResolver(name){
    const current=window[name];
    if(typeof current!=='function'||current.__canonicalSeriesGuardV2)return false;
    const wrapped=async function(input={}){
      const canonical=resolve(input||{});
      if(canonicalComplete(canonical)){
        const result=canonicalRelation(canonical);
        window.__LIB_CANONICAL_RELATION_GUARD_LAST__={resolver:name,input,result,blockedFallback:true};
        return result;
      }
      const result=await current(input||{});
      const safe=sanitizeRelations(result);
      if(safe!==result||safe?.prequel!==result?.prequel||safe?.sequel!==result?.sequel){
        window.__LIB_CANONICAL_RELATION_GUARD_LAST__={resolver:name,input,result:safe,blockedGarbage:true};
      }
      return safe;
    };
    for(const key of Object.keys(current)){try{wrapped[key]=current[key]}catch(e){}}
    wrapped.__canonicalSeriesGuardV2=true;
    window[name]=wrapped;
    return true;
  }
  function installCanonicalGuards(){
    for(const name of [
      '__LIB_RESOLVE_UNIVERSAL_SERIES',
      '__LIB_FIND_RELATIONS',
      '__LIB_RESOLVE_SERIES_NEIGHBORS',
      '__LIB_RESOLVE_BOUNDED_RELATIONS'
    ])wrapResolver(name);
  }

  window.__LIB_AUTHORITATIVE_SERIES_CATALOG=SERIES;
  window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS=resolve;
  window.__LIB_INSTALL_CANONICAL_SERIES_GUARDS=installCanonicalGuards;

  let guardAttempts=0;
  const guardTimer=setInterval(()=>{
    guardAttempts++;
    installCanonicalGuards();
    if(guardAttempts>=80)clearInterval(guardTimer);
  },125);
  setTimeout(installCanonicalGuards,0);
})();
