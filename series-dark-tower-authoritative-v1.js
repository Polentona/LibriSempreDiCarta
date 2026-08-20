(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_DARK_TOWER_AUTHORITATIVE_V1)return;root.__LIB_DARK_TOWER_AUTHORITATIVE_V1=true;

const entry={
  author:'Stephen King',
  saga:'La Torre Nera',
  titles:[
    "L'ultimo cavaliere",
    'La chiamata dei tre',
    'Terre desolate',
    'La sfera del buio',
    'I lupi del Calla',
    'La canzone di Susannah',
    'La Torre Nera'
  ],
  codes:{
    '9788868363710':4,
    '8868363712':4
  },
  sources:[
    'https://stephenking.com/news/last-three-volumes-in-stephen-kings-dark-tower-series-to-be-published-beginning-with-wolves-of--108.html',
    'https://stephenking.com/darktower/',
    'https://www.goodreads.com/work/editions/2754911-wolves-of-the-calla?expanded=true',
    'https://www.goodreads.com/book/show/13647547-la-canzone-di-susannah'
  ],
  verified:'2026-08-20'
};

const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
function install(){
  const catalog=root.__LIB_AUTHORITATIVE_SERIES_CATALOG;
  if(!Array.isArray(catalog)){setTimeout(install,80);return}
  const exists=catalog.some(x=>norm(x?.author)===norm(entry.author)&&norm(x?.saga)===norm(entry.saga));
  if(!exists)catalog.push(entry);
  if(typeof root.__LIB_INSTALL_CANONICAL_SERIES_GUARDS==='function')root.__LIB_INSTALL_CANONICAL_SERIES_GUARDS();
  root.__LIB_DARK_TOWER_AUTHORITATIVE_READY=true;
}
install();
let tries=0;const timer=setInterval(()=>{tries++;install();if(tries>=120)clearInterval(timer)},125);
root.__LIB_DARK_TOWER_AUTHORITATIVE_ENTRY=entry;
})();
