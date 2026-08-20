(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_ISBN_FIELD_SANITIZER_V2)return;root.__LIB_ISBN_FIELD_SANITIZER_V2=true;
const clean=v=>String(v??'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

const RETAILERS=new Set(['ibs','libraccio','libreria universitaria','lafeltrinelli','feltrinelli retail','mondadori store','unilibro','hoepli','amazon','amazon it','giunti al punto']);
const IMPRINT_PARENT=[
  ['bompiani','giunti'],['bompiani','giunti editore'],
  ['sperling & kupfer','mondadori'],['sperling e kupfer','mondadori'],
  ['einaudi','mondadori'],['rizzoli','mondadori'],['piemme','mondadori']
];
function joinedImprint(v){
  const n=norm(v);if(!n)return'';
  for(const [imprint,parent] of IMPRINT_PARENT){
    const i=norm(imprint),p=norm(parent);
    if(n===`${i} ${p}`||n===`${p} ${i}`)return clean(imprint);
  }
  return'';
}
function publisherParts(v){
  return String(v||'')
    .split(/\s*(?:[,;:|+]\s*|\s+\/\s+)\s*/)
    .map(clean).filter(Boolean);
}
function cleanPublisher(v){
  let x=clean(v)
    .replace(/^(?:editore|publisher)\s*[:\-]?\s*/i,'')
    .replace(/\s+(?:provider|fornitore|distributore)\s*[:\-].*$/i,'').trim();
  if(!x)return'';
  const joined=joinedImprint(x);if(joined)return joined;
  let parts=publisherParts(x);if(parts.length<=1)return x;
  const normalized=parts.map(norm),keep=parts.map(()=>true);
  for(let i=0;i<parts.length;i++)if(RETAILERS.has(normalized[i])&&parts.length>1)keep[i]=false;
  for(const [imprint,parent] of IMPRINT_PARENT){
    const ii=normalized.indexOf(norm(imprint)),pi=normalized.indexOf(norm(parent));
    if(ii>=0&&pi>=0)keep[pi]=false;
  }
  parts=parts.filter((_,i)=>keep[i]);
  return clean(parts.join(', '))||x;
}
function markdownToText(v){
  let s=String(v||'');
  s=s.replace(/!\[[^\]]*\]\(\s*[^)]*\)/g,' ');
  s=s.replace(/\[([^\]]*)\]\(\s*https?:\/\/[^)]*\)/gi,'$1');
  s=s.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1');
  s=s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi,'$1').replace(/<[^>]+>/g,' ');
  return s;
}
function rawUrlNoise(s){
  return String(s||'')
    .replace(/https?:\/\/[^\s]+/gi,' ')
    .replace(/https?:\/\/\s*(?:www\.)?\s*[a-z0-9-]+\s*\.\s*[a-z]{2,}(?:\s*\/\s*[^\s]+)*/gi,' ')
    .replace(/\bwww\s*\.\s*[a-z0-9-]+\s*\.\s*[a-z]{2,}(?:\s*\/\s*[^\s]+)*/gi,' ');
}
function cutCommerceTail(s){
  const text=String(s||''),patterns=[
    /(?:^|\s)€\s*\d{1,5}(?:[.,]\s*\d{1,2})?/gi,
    /\bEUR\s*\d{1,5}(?:[.,]\d{1,2})?/gi,
    /\b(?:acquista|compra|aggiungi al carrello|metti nel carrello|ordina(?: ora)?|buy now)\b/gi,
    /\b(?:prezzo|price)\s*[:\-]?\s*(?:€|EUR)?\s*\d/gi
  ];
  let cut=-1;for(const re of patterns){let m;while((m=re.exec(text))){if(m.index>=80&&(cut<0||m.index<cut)){cut=m.index;break}}}
  return cut>=0?text.slice(0,cut):text;
}
function trimLeadingIdentity(s,author='',title=''){
  let x=clean(s);
  for(const v of [title,author]){
    const t=clean(v);if(!t)continue;const n=norm(t),start=norm(x.slice(0,Math.max(t.length+25,120)));
    if(start.startsWith(n)){const esc=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');x=x.replace(new RegExp('^\\s*'+esc+'\\s*[:|–—-]?\\s*','i'),'').trim()}
  }
  return x;
}
function cleanPlot(v,{author='',title=''}={}){
  let s=markdownToText(v);s=rawUrlNoise(s);s=cutCommerceTail(s);s=trimLeadingIdentity(s,author,title);
  s=s.replace(/^(?:descrizione(?: del libro| prodotto)?|sinossi|trama|abstract|presentazione)\s*[:\-]?\s*/i,'').trim();
  s=s.replace(/\s+(?:€|EUR)\s*\d{1,5}(?:[.,]\s*\d{1,2})?\s*$/i,'').replace(/\s+\b(?:acquista|compra|ordina)\b\s*$/i,'');
  return clean(s);
}
function code(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}
let manualPublisher=false,manualPlot=false,lastCode='';
function fields(){if(typeof document==='undefined')return{};return{dlg:document.getElementById('editDialog'),publisher:document.getElementById('editPublisher'),plot:document.getElementById('editPlot'),author:document.getElementById('editAuthor'),title:document.getElementById('editTitle'),code:document.getElementById('editCode')}}
function apply(){
  const f=fields();if(!f.dlg?.open)return;
  if(f.publisher&&!manualPublisher){
    const before=clean(f.publisher.value),next=cleanPublisher(before);
    if(next&&next!==before){f.publisher.value=next;f.publisher.dispatchEvent(new Event('input',{bubbles:true}));f.publisher.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  if(f.plot&&!manualPlot){
    const before=clean(f.plot.value),next=cleanPlot(before,{author:f.author?.value||'',title:f.title?.value||''});
    if(next.length>=60&&next!==before){f.plot.value=next;f.plot.dispatchEvent(new Event('change',{bubbles:true}))}
  }
}
function boot(){
  if(typeof document==='undefined')return;const f=fields();if(!f.dlg||!f.publisher||!f.plot||!f.code){setTimeout(boot,150);return}
  lastCode=code(f.code.value);
  f.publisher.addEventListener('input',e=>{if(e.isTrusted)manualPublisher=true;else setTimeout(apply,0)});
  f.plot.addEventListener('input',e=>{if(e.isTrusted)manualPlot=true;else setTimeout(apply,0)});
  f.code.addEventListener('input',e=>{if(e.isTrusted){const now=code(f.code.value);if(now!==lastCode){lastCode=now;manualPublisher=false;manualPlot=false}}});
  document.addEventListener('click',e=>{if(e.target?.id==='lookupMetadataBtn'){manualPublisher=false;manualPlot=false;setTimeout(apply,450);setTimeout(apply,1300);setTimeout(apply,3200)}},true);
  new MutationObserver(()=>{if(f.dlg.open){manualPublisher=false;manualPlot=false;setTimeout(apply,350)}}).observe(f.dlg,{attributes:true,attributeFilter:['open']});
  setInterval(apply,600);
}
boot();
root.__LIB_CLEAN_PUBLISHER=cleanPublisher;
root.__LIB_CLEAN_AUTOMATIC_PLOT=(v,meta)=>cleanPlot(v,meta||{});
root.__LIB_ISBN_FIELD_SANITIZER_TEST__={cleanPublisher,cleanPlot,cutCommerceTail,rawUrlNoise,markdownToText,publisherParts,joinedImprint};
})();
