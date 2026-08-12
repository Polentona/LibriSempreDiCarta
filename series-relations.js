(()=>{
if(window.__LIB_FIND_RELATIONS)return;

const relationCache=new Map();
const BAD_HOSTS=/^(?:www\.)?(?:google\.[^/]+|bing\.com|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[^/]+|x\.com|twitter\.com)$/i;

function clean(v){
  return String(v||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\*\*/g,'')
    .replace(/^\s*#{1,6}\s*/,'')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
    .replace(/\s+/g,' ')
    .trim()
}
function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim()
}
function escRe(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sourceKey(source){
  const s=String(source||'');
  if(/^Google Books$/i.test(s))return'google-books';
  if(/^Google$/i.test(s))return'google-search';
  if(/^Bing$/i.test(s))return'bing-search';
  try{return new URL(s).hostname.replace(/^www\./,'').toLowerCase()}catch(e){return s.toLowerCase()||'unknown'}
}
function titleSegments(v){
  const raw=clean(v),parts=raw.split(/\s*(?:[.:]|\s[-–—]\s)\s*/).map(clean).filter(x=>x.length>=2);
  const out=[],seen=new Set();
  for(const x of [raw,...parts]){const n=norm(x);if(n&&!seen.has(n)){seen.add(n);out.push(x)}}
  return out
}
function titleVariants(v){
  const seg=titleSegments(v),out=[];
  for(const x of seg){const n=norm(x);if(n&&n.length>=2&&!out.some(y=>norm(y)===n))out.push(x)}
  return out
}
function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  if(x===y)return true;
  if(x.length>=7&&y.startsWith(x+' '))return true;
  if(y.length>=7&&x.startsWith(y+' '))return true;
  return false
}
function matchesTarget(v,title){return titleVariants(title).some(t=>sameTitle(v,t))}
function stripSaga(v,saga){
  let x=clean(v),sg=clean(saga);if(!x||!sg)return x;
  const e=escRe(sg);
  x=x.replace(new RegExp('^'+e+'\\s*(?:[.:-]|[-–—])\\s*','i'),'')
     .replace(new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+e+'$','i'),'')
     .trim();
  return x||clean(v)
}
function cleanRelatedTitle(v,saga=''){
  let x=clean(v)
    .replace(/^[-–—•·|\s]+/,'')
    .replace(/^(?:libro|book|volume)\s*#?\s*\d{1,2}\s*[.)\-:]?\s*/i,'')
    .replace(/^#?\s*\d{1,2}\s*[.)\-:]\s*/,'')
    .replace(/^\(?\s*(?:vol\.?|volume)\s*\d{1,2}\s*\)?\s*/i,'')
    .replace(/\s+(?:isbn|ean)\b.*$/i,'')
    .replace(/\s+\((?:ebook|kindle|paperback|hardcover|copertina[^)]*|edizione[^)]*)\)\s*$/i,'')
    .replace(/^["“”«»\s]+|["“”«»\s]+$/g,'')
    .trim();
  x=stripSaga(x,saga);
  x=x.replace(/\s*[|•]\s*(?:Amazon|IBS|Libraccio|Mondadori|Giunti|Google Books).*$/i,'').trim();
  return x.length>=2&&x.length<=190?x:''
}
function splitSeriesList(v){
  const raw=clean(v).replace(/\s+(?:e|and)\s+(?=[A-ZÀ-ÖØ-Ý“"'])/g,', ');
  const quoted=[];let m;
  const qre=/[“"]([^”"\n]{2,190})[”"]/g;
  while((m=qre.exec(raw)))quoted.push(cleanRelatedTitle(m[1]));
  if(quoted.length>=2)return quoted.filter(Boolean);
  let parts=raw.split(/\s*[,;•·|]\s*/).map(x=>cleanRelatedTitle(x)).filter(Boolean);
  if(parts.length<2&&(/\s+[–—]\s+/.test(raw)||(raw.match(/\s-\s/g)||[]).length>=2))parts=raw.split(/\s+[–—-]\s+/).map(x=>cleanRelatedTitle(x)).filter(Boolean);
  return parts.filter(x=>x.length<=190)
}
function relationFromItems(items,title,source='',score=6,saga=''){
  const cleaned=(items||[]).map(x=>cleanRelatedTitle(x,saga)).filter(Boolean);
  if(cleaned.length<2||cleaned.length>30)return null;
  const idx=cleaned.findIndex(x=>matchesTarget(x,title));if(idx<0)return null;
  return {prequel:idx>0?cleaned[idx-1]:'',sequel:idx<cleaned.length-1?cleaned[idx+1]:'',source,score,items:cleaned}
}
function addSagaEvidence(out,name,source,strength,reason,items=[]){
  const value=clean(name).replace(/^["“”'«»\s]+|["“”'«»\s]+$/g,'').replace(/\s+/g,' ').trim();
  const n=norm(value);if(!value||value.length<2||value.length>100)return;
  if(/^(?:trilogia|saga|serie|ciclo|series|trilogy|romanzo|novel|libro|books?)$/i.test(n))return;
  out.push({value,source:sourceKey(source),strength,reason,items})
}
function repeatedAffixSaga(items,title,source,out){
  const counts=new Map(),sample=new Map();
  for(const raw of items||[]){
    const seg=titleSegments(raw);
    for(const part of seg.slice(1)){
      const n=norm(part);if(!n||n.length<6)continue;
      counts.set(n,(counts.get(n)||0)+1);if(!sample.has(n))sample.set(n,part)
    }
  }
  for(const [n,count] of counts){
    if(count<2)continue;
    const value=sample.get(n);if(titleVariants(title).some(v=>norm(v)===n)||items.some(x=>norm(x).includes(n)))addSagaEvidence(out,value,source,3,'repeated-title-affix',items)
  }
}
function parseExplicitSeries(text,title,source,relations,sagas,baseScore=8){
  const p=String(text||'');let m;
  const named=[
    {re:/(?:ha\s+pubblicato\s+)?(?:la\s+)?saga\s+["“”']?([^\n("“”':]{2,100})["“”']?\s*(?:\(([^)]{8,1100})\)|:\s*([^\n]{8,1100}))/gi,strength:4,kind:'saga'},
    {re:/(?:la\s+)?(?:serie|ciclo)\s+["“”']?([^\n("“”':]{2,100})["“”']?\s*(?:\(([^)]{8,1100})\)|:\s*([^\n]{8,1100}))/gi,strength:3.5,kind:'series'},
    {re:/(?:la\s+)?trilogia\s+(?:di\s+)?["“”']?([^\n("“”':]{2,100})["“”']?\s*(?:\(([^)]{8,1100})\)|:\s*([^\n]{8,1100}))/gi,strength:2.2,kind:'trilogy'}
  ];
  for(const spec of named){
    while((m=spec.re.exec(p))){
      const name=clean(m[1]),list=m[2]||m[3]||'',items=splitSeriesList(list);
      const rel=relationFromItems(items,title,source,baseScore+(spec.kind==='saga'?3:2),name);if(rel)relations.push(rel);
      repeatedAffixSaga(items,title,source,sagas);
      if(!items.some(x=>matchesTarget(x,title)))continue;
      let strength=spec.strength;
      if(spec.kind==='trilogy'){
        const nameIsTitle=items.some(x=>sameTitle(x,name));
        const nameIsAffix=items.filter(x=>titleSegments(x).slice(1).some(seg=>norm(seg)===norm(name))).length>=2;
        if(nameIsTitle||nameIsAffix)strength=3.1;else strength=0;
      }
      if(strength)addSagaEvidence(sagas,name,source,strength,'explicit-named-list',items)
    }
  }
  const unnamed=[
    /(?:trilogia|saga|serie|ciclo)[^\n.]{0,150}?(?:composta|formata|costituita)\s+da\s*:?\s*([^\n]{8,1100})/gi,
    /(?:i\s+)?(?:tre|3)\s+(?:romanzi|libri|volumi)[^\n.]{0,120}?(?:sono|:|comprendono|comprende)\s*([^\n]{8,1100})/gi,
    /(?:titoli|libri)(?:\s+della\s+trilogia|\s+della\s+serie)?\s+(?:in\s+ordine|nell['’]ordine)\s*(?:sono)?\s*:?\s*([^\n]{8,1100})/gi
  ];
  for(const re of unnamed)while((m=re.exec(p))){const items=splitSeriesList(m[1]);const rel=relationFromItems(items,title,source,baseScore+2);if(rel)relations.push(rel);repeatedAffixSaga(items,title,source,sagas)}
}
function parseNarrativeTriples(text,title,source,relations,baseScore=8){
  const p=clean(text),patterns=[
    /(?:comincia|inizia)(?:[^.]{0,180}?)\s+con\s+(?:il\s+libro\s+)?["“”']?([^"“”'.]{3,180})["“”']?\s+(?:per\s+)?(?:passare|proseguire)\s+(?:a|con)\s+["“”']?([^"“”'.]{3,180})["“”']?\s+e\s+(?:finisce|termina|conclude)\s+con\s+["“”']?([^"“”'.]{3,180})/i,
    /(?:formata|composta|costituita)\s+da\s+["“”']?([^"“”',;]{3,180})["“”']?\s*,\s*["“”']?([^"“”',;]{3,180})["“”']?\s+(?:e|and)\s+["“”']?([^"“”'.;]{3,180})/i
  ];
  for(const re of patterns){const m=p.match(re);if(m){const rel=relationFromItems([m[1],m[2],m[3]],title,source,baseScore+2);if(rel)relations.push(rel)}}
}
function chronologicalTitle(v){
  let x=clean(v)
    .replace(/^(?:il\s+suo\s+romanzo|il\s+romanzo|il\s+libro|un\s+romanzo|romanzo|libro)\s+/i,'')
    .replace(/^(?:sono\s+poi\s+seguit[ie]|sono\s+seguit[ie]|seguono)\s+/i,'')
    .replace(/,\s+(?:il|un)\s+romanzo\b.*$/i,'')
    .replace(/\s+(?:pubblicato|edito|uscito)\b.*$/i,'')
    .trim();
  return cleanRelatedTitle(x)
}
function parseChronologicalOrder(text,title,source,relations,baseScore=8){
  const p=clean(text);let m;
  const first=/(?:il\s+suo\s+romanzo|il\s+romanzo|il\s+libro|un\s+romanzo|romanzo|libro)\s+([^()]{3,180}?)\s*\((?:pubblicato(?:\s+in\s+[^()]{1,45})?\s+nel\s+)?((?:18|19|20)\d{2})\)[^.]{0,700}?(?:sono\s+poi\s+seguit[ie]|sono\s+seguit[ie]|seguono)\s+([^()]{3,180}?)\s*\(((?:18|19|20)\d{2})\)\s+(?:e|,)\s+([^()]{3,180}?)\s*\(((?:18|19|20)\d{2})\)/gi;
  while((m=first.exec(p))){
    const items=[chronologicalTitle(m[1]),chronologicalTitle(m[3]),chronologicalTitle(m[5])].filter(Boolean);
    const rel=relationFromItems(items,title,source,baseScore+4);if(rel)relations.push(rel)
  }
  const second=/([A-ZÀ-ÖØ-Ý][^.!?]{3,180}?)\.\s*A questo\s+(?:è|e)\s+seguito\s+([^.!?]{3,180}?)\.\s*Del\s+(?:18|19|20)\d{2}\s+(?:è|e)\s+([^.!?]{3,180}?)(?:\.|$)/gi;
  while((m=second.exec(p))){
    const items=[chronologicalTitle(m[1]),chronologicalTitle(m[2]),chronologicalTitle(m[3])].filter(Boolean);
    const rel=relationFromItems(items,title,source,baseScore+3);if(rel)relations.push(rel)
  }
  const third=/Dopo\s+["“”']?([^"“”']{3,180})["“”']?\s+e\s+["“”']?([^"“”']{3,180})["“”']?[^.]{0,260}?(?:terzo|3[°º]|ultimo)\s+(?:capitolo|volume|libro)[^.]{0,140}?["“”']?([^"“”'.]{3,180})/gi;
  while((m=third.exec(p))){
    const items=[chronologicalTitle(m[1]),chronologicalTitle(m[2]),chronologicalTitle(m[3])].filter(Boolean);
    const rel=relationFromItems(items,title,source,baseScore+3);if(rel)relations.push(rel)
  }
}
function cleanNeighbor(v){return cleanRelatedTitle(String(v||'').replace(/^\s*(?:il\s+romanzo|il\s+libro|the\s+novel|the\s+book)\s+/i,'').replace(/\s*\([^)]*(?:\d{4}|editore|publisher)[^)]*\)\s*$/i,'').replace(/\s+(?:pubblicato|edito|uscito)\b.*$/i,''))}
function parseExplicitNeighbors(text,title,source,relations,baseScore=9){
  const p=clean(text),out={prequel:'',sequel:'',source,score:baseScore,items:[]};let m;
  const pre=[/(?:preceduto|preceduta)\s+da\s+["“”']?([^"“”'\n.;]{3,180})/i,/(?:prequel|libro precedente|volume precedente)\s*[:\-]\s*["“”']?([^"“”'\n.;]{3,180})/i,/(?:seguito|seguita)\s+di\s+["“”']?([^"“”'\n.;]{3,180})/i,/(?:sequel|follow-up)\s+di\s+["“”']?([^"“”'\n.;]{3,180})/i];
  const next=[/(?:seguito|seguita)\s+da\s+["“”']?([^"“”'\n.;]{3,180})/i,/(?:sequel|libro successivo|volume successivo)\s*[:\-]\s*["“”']?([^"“”'\n.;]{3,180})/i,/(?:followed by)\s+["“”']?([^"“”'\n.;]{3,180})/i];
  for(const re of pre){m=p.match(re);if(m){const x=cleanNeighbor(m[1]);if(x&&!matchesTarget(x,title)){out.prequel=x;break}}}
  for(const re of next){m=p.match(re);if(m){const x=cleanNeighbor(m[1]);if(x&&!matchesTarget(x,title)){out.sequel=x;break}}}
  const variants=titleVariants(title).sort((a,b)=>b.length-a.length);
  for(const v of variants){
    const e=escRe(v);
    if(!out.sequel){const mm=p.match(new RegExp(e+'[^.]{0,320}\\.\\s*(?:A questo|A esso|Al quale)\\s+(?:è|e)\\s+seguito\\s+["“”\']?([^"“”\'.;]{3,180})','i'));if(mm)out.sequel=cleanNeighbor(mm[1])}
    if(!out.sequel){const mm=p.match(new RegExp(e+'[^.]{0,260}\\.\\s*Del\\s+(?:18|19|20)\\d{2}\\s+(?:è|e)\\s+["“”\']?([^"“”\'.;]{3,180})','i'));if(mm)out.sequel=cleanNeighbor(mm[1])}
    if(!out.prequel){const mm=p.match(new RegExp('["“”\']?([^"“”\'.;]{3,180})["“”\']?\\.\\s*(?:A questo|A esso|Al quale)\\s+(?:è|e)\\s+seguito\\s+'+e,'i'));if(mm)out.prequel=cleanNeighbor(mm[1])}
  }
  if(out.prequel&&matchesTarget(out.prequel,title))out.prequel='';
  if(out.sequel&&matchesTarget(out.sequel,title))out.sequel='';
  if(out.prequel||out.sequel)relations.push(out)
}
function parseEvidence(text,title,source,score=7){const relations=[],sagas=[];parseExplicitSeries(text,title,source,relations,sagas,score);parseNarrativeTriples(text,title,source,relations,score);parseChronologicalOrder(text,title,source,relations,score);parseExplicitNeighbors(text,title,source,relations,score);return {relations,sagas}}
async function reader(url,timeout=10500){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function searchLinks(text){
  const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(text||'')))){let u=m[1].replace(/&amp;/g,'&');try{const url=new URL(u);if(url.hostname.includes('google.')&&url.pathname==='/url'&&url.searchParams.get('q'))u=url.searchParams.get('q');const x=new URL(u),host=x.hostname.replace(/^www\./,'');if(BAD_HOSTS.test(host)||seen.has(u))continue;if(!/^https?:$/.test(x.protocol))continue;seen.add(u);out.push(u)}catch(e){}}
  return out
}
async function googleBooksEvidence(title,author){
  const bases=titleVariants(title).slice(0,3),queries=[];for(const b of bases)queries.push(`inauthor:"${author}" "${b}"`);queries.push(`inauthor:"${author}" trilogia`,`inauthor:"${author}" saga`,`inauthor:"${author}" series`);
  const relations=[],sagas=[],seen=new Set();let checked=false;
  for(const q of queries){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
    try{const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40`,{signal:ctrl.signal});if(!r.ok)continue;const data=await r.json();if((data.items||[]).length)checked=true;for(const item of data.items||[]){if(item?.id&&seen.has(item.id))continue;if(item?.id)seen.add(item.id);const v=item.volumeInfo||{},blob=[v.title,v.subtitle,v.description,(v.categories||[]).join(' ')].filter(Boolean).join('\n');const ev=parseEvidence(blob,title,'Google Books',9);relations.push(...ev.relations);sagas.push(...ev.sagas);for(const field of [v.title,v.subtitle]){const t=clean(field);let m=t.match(/^(?:La\s+)?trilogia\s+di\s+([^:]{2,90})\s*:\s*(.+)$/i);if(m){const items=splitSeriesList(m[2]);if(items.some(x=>matchesTarget(x,title))){const name=clean(m[1]),nameIsTitle=items.some(x=>sameTitle(x,name));if(nameIsTitle)addSagaEvidence(sagas,name,'Google Books',3.2,'compilation-title',items);const rel=relationFromItems(items,title,'Google Books',12,nameIsTitle?name:'');if(rel)relations.push(rel)}}}}}catch(e){}finally{clearTimeout(timer)}}
  return {relations,sagas,checked}
}
function chooseSaga(evidence){
  const groups=new Map();
  for(const e of evidence||[]){const key=norm(e.value);if(!key)continue;const g=groups.get(key)||{value:e.value,max:0,total:0,sources:new Set()};g.max=Math.max(g.max,e.strength||0);g.total+=e.strength||0;g.sources.add(e.source||'unknown');groups.set(key,g)}
  const ranked=[...groups.values()].sort((a,b)=>b.max-a.max||b.sources.size-a.sources.size||b.total-a.total);
  for(const g of ranked)if(g.max>=3.5||(g.max>=3&&g.sources.size>=1)||(g.sources.size>=2&&g.total>=4.5))return g.value;
  return''
}
function bestRelations(candidates,saga=''){
  const good=(candidates||[]).filter(x=>x&&(x.prequel||x.sequel));if(!good.length)return {prequel:'',sequel:''};
  good.sort((a,b)=>(Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.prequel)+Number(!!a.sequel))||(b.score||0)-(a.score||0));
  const top={prequel:'',sequel:''};for(const c of good){if(!top.prequel&&c.prequel)top.prequel=stripSaga(c.prequel,saga);if(!top.sequel&&c.sequel)top.sequel=stripSaga(c.sequel,saga);if(top.prequel&&top.sequel)break}return top
}
window.__LIB_FIND_RELATIONS=async function(input={}){
  const title=clean(input.title),author=clean(input.author),hint=clean(input.saga),code=String(input.code||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(!title||!author)return {prequel:'',sequel:'',saga:'',sagaChecked:false,source:''};
  const key=[code,norm(title),norm(author),norm(hint),'v5'].join('|');if(relationCache.has(key))return relationCache.get(key);
  const promise=(async()=>{
    const variants=titleVariants(title),base=variants.length>1?variants[1]:variants[0],extra=variants.slice(2,4);
    const queries=[`"${base}" "${author}" trilogia saga serie`,`"${base}" "${author}" sequel prequel seguito preceduto`,`"${base}" "${author}" "sono poi seguiti"`,`"${base}" "${author}" "A questo è seguito"`,...extra.map(v=>`"${base}" "${v}" "${author}" saga`)];
    const searchJobs=[];for(const q of queries.slice(0,4)){searchJobs.push(reader(`https://www.google.com/search?hl=it&num=15&q=${encodeURIComponent(q)}`,11000));searchJobs.push(reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000))}
    const [searchTexts,gb]=await Promise.all([Promise.all(searchJobs),googleBooksEvidence(title,author)]);
    const relations=[...gb.relations],sagas=[...gb.sagas];let checked=gb.checked||searchTexts.some(Boolean);
    searchTexts.forEach((txt,i)=>{if(!txt)return;const src=i%2===0?'Google':'Bing',ev=parseEvidence(txt,title,src,7);relations.push(...ev.relations);sagas.push(...ev.sagas)});
    const links=[];for(const txt of searchTexts)for(const u of searchLinks(txt))if(!links.includes(u))links.push(u);
    const priority=links.sort((a,b)=>{const good=/newtoncompton|bompiani|ibs\.it|libraccio|mondadori|giunti|hoepli|unilibro|libreriauniversitaria|amazon\.it/i;return Number(good.test(b))-Number(good.test(a))}).slice(0,12);
    const pages=await Promise.all(priority.map(async u=>({u,text:await reader(u,10000)})));for(const p of pages){if(!p.text)continue;checked=true;const ev=parseEvidence(p.text,title,p.u,10);relations.push(...ev.relations);sagas.push(...ev.sagas)}
    const saga=chooseSaga(sagas),rel=bestRelations(relations,saga);
    return {prequel:rel.prequel||'',sequel:rel.sequel||'',saga:saga||'',sagaChecked:checked,source:''}
  })();
  relationCache.set(key,promise);return promise
};
})();