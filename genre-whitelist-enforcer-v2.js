(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_GENRE_WHITELIST_ENFORCER_V2)return;root.__LIB_GENRE_WHITELIST_ENFORCER_V2=true;
const ALLOWED=['Giallo','Noir','Thriller','Fantasy','Fantascienza','Horror','Romanzo rosa','Romanzo storico','Avventura','Comics','Crime'];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const patterns=[['Giallo',/\b(?:mystery|giallo|gialli|detective fiction)\b/],['Noir',/\bnoir\b/],['Thriller',/\bthriller\b/],['Fantasy',/\bfantasy\b/],['Fantascienza',/\b(?:science fiction|sci fi|fantascienza)\b/],['Horror',/\b(?:horror|orrore)\b/],['Romanzo rosa',/\b(?:romance|romanzo rosa|narrativa rosa|narrativa sentimentale)\b/],['Romanzo storico',/\b(?:historical fiction|historical|romanzo storico|narrativa storica|storico)\b/],['Avventura',/\b(?:adventure|avventura)\b/],['Comics',/\b(?:comics|comic|fumetti)\b/],['Crime',/\bcrime\b/]];
function canonical(v){if(typeof root.__LIB_CANONICALIZE_GENRES==='function')return root.__LIB_CANONICALIZE_GENRES(v);const n=norm(Array.isArray(v)?v.join(' '):v),out=[];for(const [name,re] of patterns)if(re.test(n)&&!out.includes(name))out.push(name);return out}
let setting=false;
function field(){return document.getElementById('editCategory')}
function set(v){const f=field();if(!f)return;const value=canonical(v).join(', ');if(f.value===value)return;setting=true;f.value=value;f.dataset.genreWhitelistCanonical=value;f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));setting=false}
function enforce(){const dlg=document.getElementById('editDialog'),f=field();if(!dlg?.open||!f||setting||document.activeElement===f)return;const delegated=root.__LIB_GENRE_WHITELIST_LAST__;if(delegated&&delegated.sig){if(delegated.found)set(delegated.genres||[]);else{const current=canonical(f.value);if(!current.length)set([])}return}set(f.value)}
function boot(){const f=field();if(!f){setTimeout(boot,150);return}if(!f.__genreWhitelistEnforcerV2){f.__genreWhitelistEnforcerV2=true;f.addEventListener('blur',()=>setTimeout(()=>set(f.value),0))}setInterval(enforce,600);setTimeout(enforce,100)}
boot();root.__LIB_ALLOWED_GENRES=[...ALLOWED];root.__LIB_GENRE_WHITELIST_ENFORCER_V2_TEST__={canonical,enforce};
})();
