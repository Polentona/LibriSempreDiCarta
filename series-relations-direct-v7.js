(()=>{
if(window.__LIB_DIRECT_RELATIONS_V7)return;
window.__LIB_DIRECT_RELATIONS_V7=true;

const clean=v=>String(v||'')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/\*\*/g,'')
  .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
  .replace(/\s+/g,' ')
  .trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
const sameTitle=(a,b)=>{const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y)return true;return (x.length>=8&&y.startsWith(x+' '))||(y.length>=8&&x.startsWith(y+' '))};
const variants=v=>{const raw=clean(v),parts=raw.split(/\s*(?:[.:]|\s[-–—]\s)\s*/).map(clean).filter(Boolean),out=[];for(const x of [raw,...parts])if(norm(x)&&!out.some(y=>norm(y)===norm(x)))out.push(x);return out};
const matches=(candidate,title)=>variants(title).some(v=>sameTitle(candidate,v));
const tidyTitle=v=>clean(v)
  .replace(/^["“”«»'\s]+|["“”«»'\s]+$/g,'')
  .replace(/^(?:il\s+suo\s+romanzo|il\s+romanzo|il\s+libro|un\s+romanzo|romanzo|libro)\s+/i,'')
  .replace(/\s*\([^)]*(?:(?:18|19|20)\d{2}|editore|publisher|Baldini|Bompiani|Giunti|Mondadori|Newton|Nord|TEA|Dalai)[^)]*\)\s*$/i,'')
  .replace(/\s+(?:pubblicato|edito|uscito)\b.*$/i,'')
  .replace(/\s+(?:isbn|ean)\b.*$/i,'')
  .replace(/[.;,:\s]+$/,'')
  .trim();

function isbn13(code){
  const n=String(code||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(/^\d{13}$/.test(n))return n;
  if(!/^\d{9}[\dX]$/.test(n))return'';
  const core='978'+n.slice(0,9);let s=0;for(let i=0;i<12;i++)s+=Number(core[i])*(i%2?3:1);return core+String((10-s%10)%10)
}
function isbn10(code){
  const n=String(code||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(/^\d{9}[\dX]$/.test(n))return n;
  if(!/^978\d{10}$/.test(n))return'';
  const core=n.slice(3,12);let s=0;for(let i=0;i<9;i++)s+=Number(core[i])*(10-i);const c=(11-(s%11))%11;return core+(c===10?'X':String(c))
}
function slug(v){return norm(v).replace(/'/g,'').replace(/\s+/g,'-').replace(/^-+|-+$/g,'')}
async function reader(url,timeout=11000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
function relationFromItems(items,title){
  const x=items.map(tidyTitle).filter(Boolean);if(x.length<2)return null;
  const idx=x.findIndex(v=>matches(v,title));if(idx<0)return null;
  return {prequel:idx>0?x[idx-1]:'',sequel:idx<x.length-1?x[idx+1]:''}
}
function parseSequence(text,title){
  const p=clean(text),rels=[];let m;
  const patterns=[
    /(?:il\s+suo\s+romanzo|il\s+romanzo|il\s+libro|un\s+romanzo|romanzo|libro)\s+([^()]{3,190}?)\s*\((?:pubblicato(?:\s+in\s+[^()]{1,45})?\s+nel\s+)?((?:18|19|20)\d{2})\).{0,2200}?(?:sono\s+poi\s+seguit[ie]|sono\s+seguit[ie]|seguono)\s+([^()]{3,190}?)\s*\(((?:18|19|20)\d{2})\)\s+(?:e|,)\s+([^()]{3,190}?)\s*\(((?:18|19|20)\d{2})\)/gi,
    /([A-ZÀ-ÖØ-Ý][^.!?]{3,190}?)\.\s*A questo\s+(?:è|e)\s+seguito\s+([^.!?]{3,190}?)\.\s*Del\s+(?:18|19|20)\d{2}\s+(?:è|e)\s+([^.!?]{3,190}?)(?:\.|$)/gi,
    /(?:comincia|inizia)(?:[^.]{0,240}?)\s+con\s+(?:il\s+libro\s+)?["“”']?([^"“”'.]{3,190})["“”']?.{0,420}?(?:passare|proseguire)\s+(?:a|con)\s+["“”']?([^"“”'.]{3,190})["“”']?.{0,420}?(?:finisce|termina|conclude)\s+con\s+["“”']?([^"“”'.]{3,190})/gi
  ];
  while((m=patterns[0].exec(p))){const r=relationFromItems([m[1],m[3],m[5]],title);if(r)rels.push(r)}
  while((m=patterns[1].exec(p))){const r=relationFromItems([m[1],m[2],m[3]],title);if(r)rels.push(r)}
  while((m=patterns[2].exec(p))){const r=relationFromItems([m[1],m[2],m[3]],title);if(r)rels.push(r)}
  const quoted=[];const q=/[“"]([^”"\n]{3,190})[”"]/g;while((m=q.exec(String(text||''))))quoted.push(tidyTitle(m[1]));
  if(quoted.length>=3){for(let i=0;i<=quoted.length-3;i++){const r=relationFromItems(quoted.slice(i,i+3),title);if(r)rels.push(r)}}
  return rels
}
async function directLookup(input){
  const title=clean(input.title),code13=isbn13(input.code),code10=isbn10(input.code);if(!title)return {prequel:'',sequel:''};
  const urls=[];
  if(code13){
    for(const v of variants(title).slice(0,3)){const s=slug(v);if(s)urls.push(`https://www.bompiani.it/catalogo/${s}-${code13}`)}
    urls.push(`https://www.eurolibro.it/libro/isbn/${code13}.html`)
  }
  if(code10)urls.push(`https://www.amazon.it/dp/${code10}`);
  const uniq=[...new Set(urls)];
  const texts=await Promise.all(uniq.map(async url=>({url,text:await reader(url)})));
  const found=[];
  for(const page of texts){if(!page.text)continue;for(const r of parseSequence(page.text,title))found.push({...r,source:page.url})}
  found.sort((a,b)=>(Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.prequel)+Number(!!a.sequel)));
  const out={prequel:'',sequel:''};for(const r of found){if(!out.prequel&&r.prequel)out.prequel=r.prequel;if(!out.sequel&&r.sequel)out.sequel=r.sequel;if(out.prequel&&out.sequel)break}
  return out
}

function install(){
  const original=window.__LIB_FIND_RELATIONS;
  if(typeof original!=='function'){setTimeout(install,80);return}
  if(original.__directV7)return;
  const wrapped=async input=>{
    let base={prequel:'',sequel:'',saga:'',sagaChecked:false,source:''};
    try{base=await original(input)||base}catch(e){}
    if(base.prequel&&base.sequel)return base;
    try{
      const extra=await directLookup(input||{});
      return {...base,prequel:base.prequel||extra.prequel||'',sequel:base.sequel||extra.sequel||''}
    }catch(e){return base}
  };
  wrapped.__directV7=true;
  window.__LIB_FIND_RELATIONS=wrapped;
}
install();
})();
