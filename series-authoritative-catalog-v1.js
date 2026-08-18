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
      saga:'Shining',
      titles:['Shining','Doctor Sleep'],
      codes:{
        '9788845275746':0,
        '8845275744':0,
        '9788820055684':1,
        '8820055686':1,
        '9788820092665':1
      },
      sources:[
        'https://stephenking.com/news/doctor-sleep-release-date-325.html',
        'https://www.simonandschuster.com/books/Doctor-Sleep/Stephen-King/9781476727653',
        'https://www.ibs.it/doctor-sleep-ediz-italiana-libro-stephen-king/e/9788820055684'
      ],
      verified:'2026-08-19'
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

  /* Carica le regole di ordinamento e rendering delle schede in un modulo separato. */
  if(!window.__LIB_LIBRARY_UI_RULES_LOADER_V1){
    window.__LIB_LIBRARY_UI_RULES_LOADER_V1=true;
    const ui=document.createElement('script');
    ui.src='library-ui-rules-v1.js?v=20260819-2';
    ui.async=false;
    document.head.appendChild(ui);
  }
})();

/* HOME_ORDER_V3: cognome -> gruppo saga/titolo -> ordine reale saga -> data -> titolo. */
(()=>{
  if(window.__LIB_HOME_ORDER_V3_BOOT)return;
  window.__LIB_HOME_ORDER_V3_BOOT=true;

  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
  const cmp=(a,b)=>clean(a).localeCompare(clean(b),'it',{sensitivity:'base',numeric:true});

  function primaryAuthor(author){
    let raw=clean(author);if(!raw)return'';
    raw=raw.split(/\s*(?:;|&|\be\b|\band\b)\s*/i).filter(Boolean)[0]||raw;
    return clean(raw.replace(/\([^)]*\)/g,''));
  }
  function surname(author){
    const a=primaryAuthor(author);if(!a)return'';
    if(a.includes(','))return clean(a.split(',')[0]);
    const p=a.split(/\s+/).filter(Boolean);return p.at(-1)||a;
  }
  function stripSaga(title,saga){
    let t=norm(title),s=norm(saga);if(!t||!s)return t;
    if(t===s)return t;
    if(t.startsWith(s+' '))t=t.slice(s.length).trim();
    if(t.endsWith(' '+s))t=t.slice(0,-s.length).trim();
    return t;
  }
  function sameBookTitle(candidate,title,saga){
    const a=norm(candidate),b=norm(title);if(!a||!b)return false;
    if(a===b)return true;
    const as=stripSaga(candidate,saga),bs=stripSaga(title,saga);
    return !!as&&!!bs&&as===bs;
  }
  function bookCode(book){
    return clean(book?.code||book?.isbn||book?.ean||book?.isbn13||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  }
  function publicationValue(book){
    const raw=clean(book?.publishedDate||book?.publication||book?.year||book?.published||'');
    if(!raw)return Number.POSITIVE_INFINITY;
    const iso=raw.match(/^((?:18|19|20)\d{2})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/);
    if(iso){
      const y=Number(iso[1]),m=Math.max(1,Math.min(12,Number(iso[2])||1)),d=Math.max(1,Math.min(31,Number(iso[3])||1));
      return Date.UTC(y,m-1,d);
    }
    const y=raw.match(/(?:18|19|20)\d{2}/);if(y)return Date.UTC(Number(y[0]),0,1);
    const d=Date.parse(raw);return Number.isFinite(d)?d:Number.POSITIVE_INFINITY;
  }
  function catalogPosition(book){
    const saga=clean(book?.saga),author=primaryAuthor(book?.author);if(!saga||!author)return null;
    const catalog=Array.isArray(window.__LIB_AUTHORITATIVE_SERIES_CATALOG)?window.__LIB_AUTHORITATIVE_SERIES_CATALOG:[];
    const entry=catalog.find(e=>norm(e.author)===norm(author)&&norm(e.saga)===norm(saga));
    if(!entry)return null;
    const code=bookCode(book);
    if(code&&entry.codes&&Object.prototype.hasOwnProperty.call(entry.codes,code))return Number(entry.codes[code]);
    const idx=(entry.titles||[]).findIndex(t=>sameBookTitle(book?.title,t,entry.saga));
    return idx>=0?idx:null;
  }
  function sameSeriesGroup(a,b){
    return norm(primaryAuthor(a?.author))===norm(primaryAuthor(b?.author))&&!!norm(a?.saga)&&norm(a?.saga)===norm(b?.saga);
  }
  function relationDepth(book,list){
    if(!clean(book?.saga))return null;
    const group=list.filter(x=>sameSeriesGroup(book,x));
    if(group.length<2)return null;
    let current=book,depth=0;
    const seen=new Set();
    for(let i=0;i<group.length+2;i++){
      const marker=String(current?.id??group.indexOf(current));
      if(seen.has(marker))return null;seen.add(marker);
      const pre=clean(current?.prequel);
      let previous=pre?group.find(x=>x!==current&&sameBookTitle(pre,x?.title,current?.saga)):null;
      if(!previous){
        previous=group.find(x=>x!==current&&clean(x?.sequel)&&sameBookTitle(x.sequel,current?.title,current?.saga))||null;
      }
      if(!previous)return depth;
      depth++;current=previous;
    }
    return null;
  }
  function compareHome(a,b,list){
    let c=cmp(surname(a?.author),surname(b?.author));if(c)return c;

    const ga=clean(a?.saga)||clean(a?.title),gb=clean(b?.saga)||clean(b?.title);
    c=cmp(ga,gb);if(c)return c;

    if(sameSeriesGroup(a,b)){
      const ca=catalogPosition(a),cb=catalogPosition(b);
      if(Number.isInteger(ca)&&Number.isInteger(cb)&&ca!==cb)return ca-cb;
      const da=relationDepth(a,list),db=relationDepth(b,list);
      if(Number.isInteger(da)&&Number.isInteger(db)&&da!==db)return da-db;
    }

    const pa=publicationValue(a),pb=publicationValue(b);
    if(pa!==pb){
      if(!Number.isFinite(pa))return 1;
      if(!Number.isFinite(pb))return -1;
      return pa-pb;
    }
    c=cmp(a?.title,b?.title);if(c)return c;
    c=cmp(primaryAuthor(a?.author),primaryAuthor(b?.author));if(c)return c;
    return (Number(a?.id)||0)-(Number(b?.id)||0);
  }
  function sortHome(list){
    const copy=[...(Array.isArray(list)?list:[])];
    return copy.sort((a,b)=>compareHome(a,b,copy));
  }
  function install(){
    const current=window.getFilteredBooks;
    if(typeof current!=='function')return false;
    if(current.__homeOrderV3)return true;
    const wrapped=function(){
      const list=current.apply(this,arguments);
      try{
        if(typeof currentView!=='undefined'&&currentView==='home')return sortHome(list);
      }catch(e){console.warn('Ordinamento Home V3:',e)}
      return list;
    };
    wrapped.__homeOrderV3=true;
    wrapped.__homeOrderV3Base=current;
    window.getFilteredBooks=wrapped;
    try{if(typeof currentView!=='undefined'&&currentView==='home'&&typeof render==='function')render()}catch(e){}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    install();
    if(tries>=100)clearInterval(timer);
  },100);
  setTimeout(install,0);
})();