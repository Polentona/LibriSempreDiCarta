(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GENRE_WHITELIST_V1)return;root.__LIB_GENRE_WHITELIST_V1=true;

const ALLOWED=['Giallo','Noir','Thriller','Fantasy','Fantascienza','Horror','Romanzo rosa','Romanzo storico','Avventura','Comics','Crime'];
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9+]+/g,' ').replace(/\s+/g,' ').trim();
const uniq=a=>{const out=[],seen=new Set();for(const raw of a||[]){const x=clean(raw),k=norm(x);if(x&&k&&!seen.has(k)){seen.add(k);out.push(x)}}return out};

/*
  Tassonomia ammessa in Libri di Carta.
  StoryGraph resta la fonte primaria; Goodreads viene usato solo quando
  StoryGraph non trova il libro. Fiction/Nonfiction non sono generi ammessi.
*/
const MATCHERS=[
  {name:'Giallo',patterns:[/\bmystery\b/,/\bgiallo\b/,/\bgialli\b/,/\bdetective fiction\b/]},
  {name:'Noir',patterns:[/\bnoir\b/]},
  {name:'Thriller',patterns:[/\bthriller\b/]},
  {name:'Fantasy',patterns:[/\bfantasy\b/]},
  {name:'Fantascienza',patterns:[/\bscience fiction\b/,/\bsci fi\b/,/\bfantascienza\b/]},
  {name:'Horror',patterns:[/\bhorror\b/,/\borrore\b/]},
  {name:'Romanzo rosa',patterns:[/\bromance\b/,/\bromanzo rosa\b/,/\bnarrativa rosa\b/,/\bnarrativa sentimentale\b/]},
  {name:'Romanzo storico',patterns:[/\bhistorical fiction\b/,/\bhistorical\b/,/\bromanzo storico\b/,/\bnarrativa storica\b/,/\bstorico\b/]},
  {name:'Avventura',patterns:[/\badventure\b/,/\bavventura\b/]},
  {name:'Comics',patterns:[/\bcomics\b/,/\bcomic\b/,/\bfumetti\b/]},
  {name:'Crime',patterns:[/\bcrime\b/]}
];

function extractText(text){
  const n=norm(text);if(!n)return[];
  const hits=[];
  for(let order=0;order<MATCHERS.length;order++){
    const item=MATCHERS[order];let best=-1;
    for(const re of item.patterns){const i=n.search(re);if(i>=0&&(best<0||i<best))best=i}
    if(best>=0)hits.push({name:item.name,index:best,order});
  }
  /* "science fiction" contiene la parola fiction ma non fantasy; Fiction da sola non viene mai mappato. */
  hits.sort((a,b)=>a.index-b.index||a.order-b.order);
  return uniq(hits.map(x=>x.name));
}
function canonicalize(values){
  const out=[];
  for(const raw of Array.isArray(values)?values:[values])for(const g of extractText(raw))if(!out.includes(g))out.push(g);
  return out
}
function fromResult(r){
  if(!r||typeof r!=='object')return[];
  /* Le labels originali hanno precedenza: conservano la tassonomia esposta dalla fonte. */
  return canonicalize([...(Array.isArray(r.labels)?r.labels:[]),...(Array.isArray(r.genres)?r.genres:[])]);
}
function field(){return document.getElementById('editCategory')}
let setting=false;
function setField(genres,source='',url=''){
  const f=field();if(!f)return false;
  const gs=canonicalize(genres),value=gs.join(', ');
  setting=true;
  f.value=value;
  f.dataset.genreWhitelistCanonical=value;
  f.dataset.genreSource=source||f.dataset.genreSource||'';
  f.dataset.genreSourceUrl=url||f.dataset.genreSourceUrl||'';
  f.dispatchEvent(new Event('input',{bubbles:true}));
  f.dispatchEvent(new Event('change',{bubbles:true}));
  setting=false;
  return true
}

function normalizeResolverResult(r){
  if(!r||typeof r!=='object')return r;
  return {...r,genres:fromResult(r)}
}
function installResolverWrappers(){
  const base=root.__LIB_RESOLVE_AUTHORITATIVE_GENRES;
  if(typeof base==='function'&&!base.__genreWhitelistV1){
    const wrapped=async function(opts){return normalizeResolverResult(await base(opts))};
    wrapped.__genreWhitelistV1=true;wrapped.__base=base;
    root.__LIB_RESOLVE_AUTHORITATIVE_GENRES=wrapped
  }
  const specific=root.__LIB_LOOKUP_SPECIFIC_GENRES;
  if(typeof specific==='function'&&!specific.__genreWhitelistV1){
    const wrapped=async function(opts){return canonicalize(await specific(opts))};
    wrapped.__genreWhitelistV1=true;wrapped.__base=specific;
    root.__LIB_LOOKUP_SPECIFIC_GENRES=wrapped
  }
  root.__LIB_GENRE_SOURCE_POLICY='storygraph-then-goodreads-whitelist';
  root.__LIB_ALLOWED_GENRES=[...ALLOWED]
}

let lastSeen='';
function applyDelegateResult(){
  const r=root.__LIB_GENRE_DELEGATE_LAST__;if(!r||typeof r!=='object')return;
  const marker=JSON.stringify([r.sig,r.source,r.url,r.found,r.labels,r.genres]);if(marker===lastSeen)return;
  lastSeen=marker;
  const d=document.getElementById('editDialog');if(d&&!d.open)return;
  const gs=fromResult(r);
  /* Se la fonte è stata trovata ma non contiene nessuno dei generi ammessi, il campo resta vuoto. */
  setField(gs,r.source||'',r.url||'');
  root.__LIB_GENRE_WHITELIST_LAST__={source:r.source||'',labels:r.labels||[],genres:gs,found:!!r.found,sig:r.sig||''}
}

function installField(){
  const f=field();if(!f||f.__genreWhitelistV1)return;
  f.__genreWhitelistV1=true;
  f.placeholder='Es. Fantasy, Horror, Romanzo storico';
  f.addEventListener('input',()=>{
    if(setting)return;
    f.dataset.genreWhitelistCanonical=canonicalize(f.value).join(', ')
  });
  /* genres-multi-v1 ha un normalizzatore più vecchio: questo passaggio, registrato dopo,
     ripristina i nomi canonici della nuova tassonomia. */
  f.addEventListener('blur',()=>setTimeout(()=>{
    const value=f.dataset.genreWhitelistCanonical||canonicalize(f.value).join(', ');
    if(value!==f.value)setField(value,f.dataset.genreSource||'',f.dataset.genreSourceUrl||'')
  },0));
}

function installSaveGuard(){
  try{
    if(typeof saveBooks==='function'&&!saveBooks.__genreWhitelistV1){
      const base=saveBooks;
      saveBooks=function(){
        const snapshots=new Map();
        try{if(typeof books!=='undefined'&&Array.isArray(books))for(const b of books){const raw=Array.isArray(b?.genres)?b.genres:(b?.category||'');const gs=canonicalize(raw);if(gs.length)snapshots.set(String(b.id),gs)}}catch(e){}
        const result=base.apply(this,arguments);
        try{
          if(typeof books!=='undefined'&&Array.isArray(books)){
            let changed=false;
            for(const b of books){const gs=snapshots.get(String(b.id));if(!gs)continue;if(JSON.stringify(b.genres||[])!==JSON.stringify(gs)){b.genres=gs;changed=true}if(Object.prototype.hasOwnProperty.call(b,'category')){delete b.category;changed=true}}
            if(changed)localStorage.setItem('libriDiCarta.books.v1',JSON.stringify(books))
          }
        }catch(e){}
        return result
      };
      saveBooks.__genreWhitelistV1=true;saveBooks.__genreWhitelistBase=base
    }
  }catch(e){}

  const form=document.getElementById('editForm');
  if(form&&!form.__genreWhitelistV1){
    form.__genreWhitelistV1=true;
    form.addEventListener('submit',()=>{
      const f=field(),canonical=f?.dataset.genreWhitelistCanonical||canonicalize(f?.value||'').join(', ');
      if(f)setField(canonical,f.dataset.genreSource||'',f.dataset.genreSourceUrl||'');
      let mode='',id=null;
      try{mode=typeof dialogMode!=='undefined'?dialogMode:'';id=typeof editingId!=='undefined'?editingId:null}catch(e){}
      const title=clean(document.getElementById('editTitle')?.value),author=clean(document.getElementById('editAuthor')?.value),gs=canonicalize(canonical);
      setTimeout(()=>{
        try{
          if(typeof books==='undefined'||!Array.isArray(books))return;
          let b=null;
          if(mode==='edit'&&id!=null)b=books.find(x=>String(x.id)===String(id));
          if(!b&&mode==='add')b=books.find(x=>clean(x.title)===title&&clean(x.author)===author)||books[0];
          if(!b)return;
          b.genres=gs;delete b.category;
          localStorage.setItem('libriDiCarta.books.v1',JSON.stringify(books));
          if(typeof render==='function')render()
        }catch(e){}
      },40)
    },true)
  }
}

function boot(){installResolverWrappers();installField();installSaveGuard();applyDelegateResult()}
let tries=0;const timer=setInterval(()=>{tries++;boot();if(tries>1200)clearInterval(timer)},250);setTimeout(boot,0);
root.__LIB_CANONICALIZE_GENRES=canonicalize;
root.__LIB_GENRE_WHITELIST_TEST__={extractText,canonicalize,fromResult,allowed:[...ALLOWED]};
})();
