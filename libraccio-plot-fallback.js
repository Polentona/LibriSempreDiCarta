(()=>{
if(window.__LIB_LIBRACCIO_PLOT_FALLBACK)return;window.__LIB_LIBRACCIO_PLOT_FALLBACK=true;
let token=0,timer=null,last='';
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase();
const plain=s=>String(s||'').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#|]/g,' ').replace(/\s+/g,' ').trim();
const safePlot=s=>typeof window.__LIB_CLEAN_BOOK_PLOT==='function'?window.__LIB_CLEAN_BOOK_PLOT(s):plain(s);
function italian(s){const t=' '+plain(s).toLowerCase()+' ';const it=[' il ',' la ',' le ',' gli ',' che ',' di ',' del ',' della ',' un ',' una ',' e ',' è ',' per ',' con ',' nel ',' nella ',' non ',' si ',' tra ',' quando ',' libro ',' romanzo ',' persone ',' storia '];const en=[' the ',' and ',' of ',' to ',' in ',' is ',' with ',' for ',' book ',' novel ',' story '];let a=0,b=0;it.forEach(x=>a+=t.includes(x));en.forEach(x=>b+=t.includes(x));return plain(s).length>55&&a-b>=3}
async function read(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch('https://r.jina.ai/'+url,{signal:c.signal});return r.ok?await r.text():''}catch(e){return''}finally{clearTimeout(t)}}
function links(md){const out=[];let m;const re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;while((m=re.exec(md))){const u=m[1].replace(/&amp;/g,'&');try{const h=new URL(u).hostname;if(h.endsWith('libraccio.it')&&!out.includes(u))out.push(u)}catch(e){}}return out}
function plot(md){const lines=String(md||'').split(/\n/);for(let i=0;i<lines.length;i++){const h=plain(lines[i]).toLowerCase();if(h!=='descrizione'&&!h.startsWith('descrizione '))continue;const a=[];for(let j=i+1;j<lines.length&&a.join(' ').length<1800;j++){const raw=lines[j].trim(),p=plain(raw);if(!p)continue;if(/^#{1,6}\s/.test(raw)&&a.length)break;if(/^(dettagli|scheda tecnica|recensioni|acquista|compra)$/i.test(p)&&a.length)break;a.push(p)}const x=a.join(' ').replace(/\s+/g,' ').trim();if(italian(x))return x.length>1600?x.slice(0,1600).replace(/\s+\S*$/,'')+'…':x}const txt=plain(md),m=txt.match(/Descrizione\s+(.{80,1800}?)(?=Dettagli|Editore:|Codice EAN:|ISBN|Anno edizione|Acquista|Compra|Recensioni|$)/i);return m&&italian(m[1])?m[1].trim():''}
async function lookup(code){
  const listUrl=`https://www.libraccio.it/uc/ProductList.aspx?idList=${encodeURIComponent(code)}&col=1&isCarousel=true`;
  const first=await read(listUrl);if(!first)return'';
  let p=plot(first);if(p)return p;
  const candidates=links(first).filter(u=>norm(u).includes(code)||u.includes('/libro/'+code+'/')).slice(0,3);
  for(const u of candidates){const md=await read(u);if(!norm(md).includes(code))continue;p=plot(md);if(p)return p}
  return''
}
async function run(){const code=norm($('editCode')?.value),ta=$('editPlot');if(!ta||ta.value.trim()||!/^97[89]\d{10}$/.test(code)||last===code)return;last=code;const my=++token;const s=$('lookupStatus');if(s){s.textContent='Sto verificando anche la descrizione italiana su Libraccio…';s.className='lookup-status busy'}const p=await lookup(code);if(my!==token||!ta||ta.value.trim())return;p=safePlot(p);if(p){ta.value=p;ta.dispatchEvent(new Event('input',{bubbles:true}));if(s){s.textContent='Trama italiana recuperata da Libraccio. Controlla la bozza prima di salvare.';s.className='lookup-status ok'}}}
function boot(){const s=$('lookupStatus'),c=$('editCode');if(!s||!c){setTimeout(boot,150);return}new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,450)}).observe(s,{childList:true,subtree:true,characterData:true});c.addEventListener('input',()=>{last='';token++})}
boot();
})();