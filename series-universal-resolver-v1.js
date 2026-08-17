(()=>{
const root=typeof window!=='undefined'?window:globalThis;
if(root.__LIB_UNIVERSAL_SERIES_V1)return;
root.__LIB_UNIVERSAL_SERIES_V1=true;

const cache=new Map();
const clean=v=>String(v||'')
  .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
  .replace(/\u00a0/g,' ')
  .replace(/\s+/g,' ')
  .trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').trim();
const words=v=>norm(v).split(' ').filter(x=>x.length>2&&!['the','and','del','della','delle','dei','degli','con','per','una','uno'].includes(x));
const sameTitle=(a,b)=>{
  const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y)return true;
  if(x.length>=7&&(y.startsWith(x+' ')||y.endsWith(' '+x)))return true;
  if(y.length>=7&&(x.startsWith(y+' ')||x.endsWith(' '+y)))return true;
  const xa=new Set(words(x)),ya=new Set(words(y));if(!xa.size||!ya.size)return false;
  const common=[...xa].filter(w=>ya.has(w)).length;
  return common>=Math.min(2,Math.min(xa.size,ya.size))&&common/Math.max(xa.size,ya.size)>=0.72;
};
function variants(v){
  const r=clean(v),out=[];
  for(const x of [r,...r.split(/\s*(?:[.:]|\s[-–—]\s)\s*/)]){const c=clean(x);if(c&&!out.some(y=>norm(y)===norm(c)))out.push(c)}
  return out;
}
const matchesTitle=(a,b)=>variants(b).some(v=>sameTitle(a,v));
function screenNoise(v){return /\b(?:film|movie|television|televisione|episodio|episode|stagione|season|miniserie|screenplay|teleplay|videogioco|game)\b/i.test(norm(v))}
function stripTemplates(v){
  let x=String(v||'');
  for(let i=0;i<5;i++){const y=x.replace(/\{\{[^{}]*\}\}/g,' ');if(y===x)break;x=y}
  return x;
}
function wikiText(v){
  let x=stripTemplates(v);
  x=x.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/>]*\/>/gi,' ');
  x=x.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1');
  x=x.replace(/\[(?:https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,'$1').replace(/\[(?:https?:\/\/[^\]]+)\]/g,' ');
  x=x.replace(/<[^>]+>/g,' ').replace(/''+/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&');
  return clean(x);
}
function tidyTitle(v){
  let x=wikiText(v).replace(/^[#*:;\-–—•·\s]+/,'').trim();
  x=x.replace(/\s+(?:ISBN|EAN)\b.*$/i,'').trim();
  x=x.replace(/\s*,\s*(?:trad\.|traduzione|Rizzoli|Bompiani|TEA|Mondadori|Feltrinelli|Giunti|Garzanti|Longanesi|Corbaccio|Nord|Piemme|Sperling|Salani|Einaudi|Adelphi)\b.*$/i,'').trim();
  x=x.replace(/\s*\((?:[^()]*(?:18|19|20)\d{2}[^()]*)\)\s*$/,'').trim();
  // Per bibliografie del tipo "Titolo (Original title) (2010), editore...": il titolo italiano e' prima della prima parentesi.
  const firstParen=x.indexOf(' (');if(firstParen>1)x=x.slice(0,firstParen).trim();
  const comma=x.indexOf(',');if(comma>1)x=x.slice(0,comma).trim();
  x=x.replace(/^["“”«»'\s]+|["“”«»'\s]+$/g,'').replace(/[.;:\s]+$/,'').trim();
  if(!x||x.length<2||x.length>190||screenNoise(x)||/^https?:/i.test(x))return'';
  return x;
}
function tidySaga(v){
  let x=wikiText(v).replace(/^=+|=+$/g,'').trim();
  x=x.replace(/^(?:opere|bibliografia)\s*[-–—:]?\s*/i,'').trim();
  if(/^serie\s+(?:con|di|del|della|dello|dei|degli|delle)\s+/i.test(x))x=x.replace(/^serie\s+(?:con|di|del|della|dello|dei|degli|delle)\s+/i,'');
  else if(/^serie\s+/i.test(x))x=x.replace(/^serie\s+/i,'');
  else if(/^saga\s+/i.test(x))x=x.replace(/^saga\s+/i,'');
  else if(/^ciclo\s+(?:di|del|della|dello|dei|degli|delle)\s+/i.test(x))x=x.replace(/^ciclo\s+(?:di|del|della|dello|dei|degli|delle)\s+/i,'');
  x=x.replace(/^["“”«»']+|["“”«»']+$/g,'').trim();
  return x&&x.length<=120&&!screenNoise(x)?x:'';
}
function relation(items,title,saga,source,method){
  const list=[];
  for(const raw of items||[]){const t=tidyTitle(raw);if(t&&!list.some(x=>sameTitle(x,t)))list.push(t)}
  if(list.length<2||list.length>60)return null;
  const idx=list.findIndex(x=>matchesTitle(x,title));if(idx<0)return null;
  return {saga:tidySaga(saga),prequel:idx>0?list[idx-1]:'',sequel:idx<list.length-1?list[idx+1]:'',items:list,source,method,authoritative:true,checked:true,initial:idx===0,terminal:idx===list.length-1};
}
function wikiSections(wikitext){
  const lines=String(wikitext||'').replace(/\r/g,'').split('\n'),sections=[];let current={level:0,title:'',lines:[]};
  for(const line of lines){const m=line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);if(m){if(current.title||current.lines.length)sections.push(current);current={level:m[1].length,title:wikiText(m[2]),lines:[]}}else current.lines.push(line)}
  if(current.title||current.lines.length)sections.push(current);return sections;
}
function wikiSectionRelations(wikitext,title,source){
  const sections=wikiSections(wikitext),results=[];
  for(let i=0;i<sections.length;i++){
    const s=sections[i],h=clean(s.title);if(!/\b(?:serie|saga|trilogia|ciclo)\b/i.test(h))continue;
    const list=[];
    for(const line of s.lines){if(/^\s*[#*]+\s+/.test(line))list.push(line)}
    // Alcune pagine mettono una sottosezione di serie e poi un'altra sottosezione: non oltrepassarla.
    const r=relation(list,title,h,source,'wikipedia-author-section');if(r)results.push(r);
  }
  return results;
}
async function getJson(url,timeout=9000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(timer)}
}
async function italianWikipediaAuthor(author,title){
  const api='https://it.wikipedia.org/w/api.php';
  const q=new URLSearchParams({action:'query',list:'search',srsearch:`intitle:"${author}"`,srnamespace:'0',srlimit:'6',format:'json',origin:'*'});
  let data=await getJson(api+'?'+q.toString());let hits=data?.query?.search||[];
  if(!hits.length){const q2=new URLSearchParams({action:'query',list:'search',srsearch:author,srnamespace:'0',srlimit:'6',format:'json',origin:'*'});data=await getJson(api+'?'+q2.toString());hits=data?.query?.search||[]}
  hits.sort((a,b)=>Number(norm(a.title)===norm(author))*-1-Number(norm(b.title)===norm(author))*-1);
  for(const hit of hits.slice(0,4)){
    const p=new URLSearchParams({action:'parse',page:hit.title,prop:'wikitext',format:'json',origin:'*'}),parsed=await getJson(api+'?'+p.toString());
    const wt=parsed?.parse?.wikitext?.['*']||'';if(!wt)continue;
    const rels=wikiSectionRelations(wt,title,`https://it.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g,'_'))}`);
    if(rels.length){rels.sort((a,b)=>(Number(!!b.saga)+Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.saga)+Number(!!a.prequel)+Number(!!a.sequel)));return rels[0]}
  }
  return null;
}
function groupYearPairs(text){
  const raw=String(text||''),pairs=[];const re=/([A-ZÀ-ÖØ-Ý][^()\n]{1,150}?)\s*\(((?:18|19|20)\d{2})\)/g;let m;
  while((m=re.exec(raw))){const t=tidyTitle(m[1]);if(t)pairs.push({title:t,year:m[2],start:m.index,end:re.lastIndex})}
  const groups=[];let cur=[];
  for(const p of pairs){if(!cur.length||p.start-cur[cur.length-1].end<130)cur.push(p);else{if(cur.length>=2)groups.push(cur);cur=[p]}}
  if(cur.length>=2)groups.push(cur);return groups;
}
function sagaHints(text){
  const raw=String(text||''),out=[];let m;
  const pats=[
    /(?:Serie|Saga|Series|Trilogia)\s*[:|]\s*["“]?([^\n|”"]{2,120})/gi,
    /(?:questi\s+libri|questi\s+romanzi|i\s+romanzi|i\s+volumi)\s+(?:compongono|formano|costituiscono)\s+(?:la\s+)?(?:saga|serie|trilogia)\s+["“]?([^"”.,;\n]{2,120})/gi,
    /(?:l['’]intera\s+)?serie\s+(?:dedicata\s+[^:\n]{0,120}?\s+)?(?:al|alla|a|con)\s+([^:\n]{2,120})\s*:/gi,
    /(?:secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono|decimo)\s+(?:libro|romanzo|volume|capitolo)\s+della\s+(?:serie|saga)\s+(?:di\s+)?["“]?([^"”.,;\n]{2,120})/gi
  ];
  for(const re of pats)while((m=re.exec(raw))){const s=tidySaga(m[1]);if(s&&!out.some(x=>norm(x)===norm(s)))out.push(s)}
  return out;
}
function proseRelations(text,title,source,sagaHint=''){
  const raw=String(text||''),hints=[tidySaga(sagaHint),...sagaHints(raw)].filter(Boolean),groups=groupYearPairs(raw),rels=[];
  for(const g of groups){const list=g.map(x=>x.title);if(!list.some(x=>matchesTitle(x,title)))continue;
    const around=raw.slice(Math.max(0,g[0].start-350),Math.min(raw.length,g[g.length-1].end+350));
    const nearHints=sagaHints(around),saga=nearHints[0]||hints[0]||'';const r=relation(list,title,saga,source,'explicit-year-sequence');if(r)rels.push(r)
  }
  const patterns=[
    /(?:serie|saga|trilogia|ciclo)\s+(?:di\s+)?["“”']?([^:\n("“”']{2,120})["“”']?\s*:\s*([^\n]{12,1800})/gi,
    /(?:serie|saga|trilogia|ciclo)[^\n]{0,180}?(?:composta|formata|costituita)\s+da\s*:?\s*([^\n]{12,1800})/gi
  ];
  let m;while((m=patterns[0].exec(raw))){const items=m[2].split(/\s*[,;•|]\s*|\s+e\s+(?=[A-ZÀ-ÖØ-Ý“"'])/).map(tidyTitle).filter(Boolean),r=relation(items,title,m[1],source,'explicit-named-list');if(r)rels.push(r)}
  while((m=patterns[1].exec(raw))){const items=m[1].split(/\s*[,;•|]\s*|\s+e\s+(?=[A-ZÀ-ÖØ-Ý“"'])/).map(tidyTitle).filter(Boolean),r=relation(items,title,hints[0]||'',source,'explicit-list');if(r)rels.push(r)}
  rels.sort((a,b)=>(Number(!!b.saga)+Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.saga)+Number(!!a.prequel)+Number(!!a.sequel)));return rels[0]||null;
}
const trusted=[
  'bompiani.it','tealibri.it','feltrinellieditore.it','rizzolilibri.it','mondadori.it','einaudi.it','adelphi.it','sellerio.it','salani.it','longanesi.it','garzanti.it','corbaccio.it','editricenord.it','edizpiemme.it','sperling.it','fazieditore.it','harpercollins.it','newtoncompton.com','giunti.it',
  'lafeltrinelli.it','ibs.it','libreriauniversitaria.it','unilibro.it','hoepli.it','mondadoristore.it','books.google.com'
];
function host(url){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch(e){return''}}
function trustedUrl(url){const h=host(url);return trusted.some(d=>h===d||h.endsWith('.'+d))}
function decodeBing(u){try{const x=new URL(u);if(!/(^|\.)bing\.com$/i.test(x.hostname))return u;const enc=x.searchParams.get('u')||'';if(!enc.startsWith('a1'))return u;let b=enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return decodeURIComponent(escape(atob(b)))}catch(e){return u}}
function linksFrom(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){const u=decodeBing(m[1].replace(/&amp;/g,'&'));if(trustedUrl(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
async function jina(url,timeout=8500){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function authorOk(text,author){const n=norm(text),surname=norm(author).split(' ').filter(Boolean).pop()||'';return !!surname&&n.includes(surname)}
async function webExplicit(input,sagaHint=''){
  const title=clean(input.title),author=clean(input.author);if(!title||!author)return null;
  const queries=[`"${title}" "${author}" (serie OR saga OR trilogia OR series)`,sagaHint?`"${sagaHint}" "${author}" (serie OR saga OR trilogia OR series)`:'' ].filter(Boolean),pages=[],seen=new Set();
  for(const q of queries){const search=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8000);for(const u of linksFrom(search)){if(!seen.has(u)){seen.add(u);pages.push(u)}}if(pages.length>=8)break}
  for(const u of pages.slice(0,8)){const text=await jina(u,9000);if(!text||!authorOk(text,author)||!variants(title).some(v=>norm(text).includes(norm(v))))continue;const rel=proseRelations(text,title,u,sagaHint);if(rel)return rel}
  return null;
}
async function resolve(input={}){
  const title=clean(input.title),author=clean(input.author),hint=tidySaga(input.saga||''),key=[norm(title),norm(author),norm(hint)].join('|');
  if(!title||!author)return null;if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const diag={input:{...input,title,author,saga:hint},steps:[],result:null};root.__LIB_UNIVERSAL_SERIES_LAST__=diag;
    // 1. Bibliografia strutturata dell'autore: non richiede di conoscere la saga in anticipo.
    const wiki=await italianWikipediaAuthor(author,title);diag.steps.push({source:'it.wikipedia.org author bibliography',hit:!!wiki});if(wiki){diag.result=wiki;return wiki}
    // 2. Fonti editoriali/librarie: prima titolo+autore, poi una seconda ricerca se emerge un nome di saga.
    const web=await webExplicit(input,hint);diag.steps.push({source:'trusted web',hit:!!web});if(web){diag.result=web;return web}
    diag.result=null;return null;
  })();cache.set(key,promise);return promise;
}
root.__LIB_RESOLVE_UNIVERSAL_SERIES=resolve;
root.__LIB_UNIVERSAL_SERIES_TEST__={clean,norm,tidyTitle,tidySaga,relation,wikiSections,wikiSectionRelations,groupYearPairs,sagaHints,proseRelations,resolve};
if(typeof module!=='undefined'&&module.exports)module.exports=root.__LIB_UNIVERSAL_SERIES_TEST__;
})();
