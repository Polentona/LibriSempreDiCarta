(()=>{
if(window.__LIB_FIND_RELATIONS)return;

const relationCache=new Map();
const BAD_HOSTS=/^(?:www\.)?(?:google\.[^/]+|bing\.com|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[^/]+|x\.com|twitter\.com)$/i;

function clean(v){
  return String(v||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\*\*/g,'')
    .replace(/^\s*#{1,6}\s*/,'')
    .replace(/\s+/g,' ')
    .trim()
}
function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim()
}
function escRe(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  return x===y||(x.length>6&&y.startsWith(x+' '))||(y.length>6&&x.startsWith(y+' '))
}
function stripSaga(v,saga){
  let x=clean(v);const sg=clean(saga);if(!x||!sg)return x;
  const e=escRe(sg);
  x=x.replace(new RegExp('^'+e+'\\s*(?:[.:-]|[-–—])\\s*','i'),'').replace(new RegExp('\\s*(?:[.:-]|[-–—])\\s*'+e+'$','i'),'').trim();
  return x
}
function cleanRelatedTitle(v,saga='',target=''){
  let x=clean(v)
    .replace(/^[-–—•·|\s]+/,'')
    .replace(/^(?:libro|book|volume)\s*#?\s*\d{1,2}\s*[.)\-:]?\s*/i,'')
    .replace(/^#?\s*\d{1,2}\s*[.)\-:]\s*/,'')
    .replace(/\s+(?:isbn|ean)\b.*$/i,'')
    .replace(/\s+\((?:ebook|kindle|paperback|hardcover|copertina[^)]*|edizione[^)]*)\)\s*$/i,'')
    .trim();
  const par=[...x.matchAll(/\(([^()]{3,180})\)/g)].map(m=>clean(m[1]));
  if(par.length){
    const sg=norm(saga),tg=norm(target);
    const preferred=par.find(p=>(sg&&norm(p).includes(sg))||(tg&&norm(p).includes(tg)));
    if(preferred)x=preferred
  }
  x=x.replace(/^["“”'«»\s]+|["“”'«»\s]+$/g,'').trim();
  x=stripSaga(x,saga);
  x=x.replace(/\s*[|•]\s*(?:Amazon|IBS|Libraccio|Mondadori|Giunti|Google Books).*$/i,'').trim();
  return x.length>=2&&x.length<=180?x:''
}
function relationFromItems(items,title,saga='',source='',score=5){
  const cleaned=items.map(x=>cleanRelatedTitle(x,saga,title)).filter(Boolean);
  if(cleaned.length<2||cleaned.length>20)return null;
  const idx=cleaned.findIndex(x=>sameTitle(x,title));if(idx<0)return null;
  const prequel=idx>0?cleaned[idx-1]:'';
  const sequel=idx<cleaned.length-1?cleaned[idx+1]:'';
  if(!prequel&&!sequel)return null;
  return {prequel,sequel,source,score,items:cleaned}
}
function splitSeriesList(v){
  let raw=clean(v).replace(/\s+(?:e|and)\s+/gi,', ');
  let parts=raw.split(/\s*[,;•·|]\s*/).filter(Boolean);
  if(parts.length<2&&(/\s+[–—]\s+/.test(raw)||(raw.match(/\s-\s/g)||[]).length>=2))parts=raw.split(/\s+[–—-]\s+/).filter(Boolean);
  if(parts.length<2&&(raw.match(/-/g)||[]).length>=2&&!/\s-\s/.test(raw))parts=raw.split(/-/).filter(Boolean);
  return parts
}
function parseNamedLists(text,title,saga='',source='',baseScore=7){
  const p=String(text||''),out=[];let m;
  const patterns=[
    /(?:la\s+)?(?:trilogia|saga|serie|ciclo|series|trilogy)\s+(?:di|del|della|dei|degli|delle|of)?\s*["“”']?([^:\n("“”']{2,90})["“”']?\s*:\s*([^\n]{8,650})/gi,
    /(?:la\s+)?(?:trilogia|saga|serie|ciclo)\s+["“”']?([^\n(]{2,90})["“”']?\s*\(([^)]{8,650})\)/gi,
    /(?:trilogia|saga|serie|ciclo)[^\n.]{0,130}?(?:composta|formata|costituita)\s+da\s*:?\s*([^\n]{8,650})/gi,
    /(?:titles?|titoli)(?:\s+dei\s+libri)?\s+(?:in\s+ordine|nell['’]ordine)\s*(?:sono)?\s*:?\s*([^\n]{8,650})/gi
  ];
  for(let pi=0;pi<patterns.length;pi++){
    const re=patterns[pi];
    while((m=re.exec(p))){
      let name='',list='';
      if(pi<2){name=clean(m[1]);list=m[2]}else list=m[1];
      const rel=relationFromItems(splitSeriesList(list),title,saga||name,source,baseScore+(pi<2?1:0));
      if(rel){if(!saga&&name&&!/^(?:trilogia|saga|serie|ciclo)$/i.test(name))rel.saga=name;out.push(rel)}
    }
  }
  return out
}
function parseNumberedLists(text,title,saga='',source='',baseScore=9){
  const raw=String(text||''),matches=[];let m;
  const lineRe=/(?:^|\n)\s*(?:[-*]\s*)?(?:(?:libro|book|volume)\s*)?#?\s*(\d{1,2})\s*[.)\-:]\s*([^\n]{2,220})/gi;
  while((m=lineRe.exec(raw))){const n=Number(m[1]);if(n>=1&&n<=30)matches.push({n,text:m[2],pos:m.index})}
  const inlineRe=/(?:^|\s)(?:libro|book|volume)\s*#?\s*(\d{1,2})\s*[.:\-]\s*(.*?)(?=(?:\s+(?:libro|book|volume)\s*#?\s*\d{1,2}\s*[.:\-])|$)/gi;
  while((m=inlineRe.exec(raw))){const n=Number(m[1]);if(n>=1&&n<=30)matches.push({n,text:m[2],pos:m.index})}
  matches.sort((a,b)=>a.pos-b.pos);
  const out=[];
  for(const cur of matches){
    const curTitle=cleanRelatedTitle(cur.text,saga,title);if(!sameTitle(curTitle,title))continue;
    const near=matches.filter(x=>Math.abs(x.pos-cur.pos)<2200);
    const prev=near.filter(x=>x.n===cur.n-1&&x.pos<cur.pos).sort((a,b)=>b.pos-a.pos)[0];
    const next=near.filter(x=>x.n===cur.n+1&&x.pos>cur.pos).sort((a,b)=>a.pos-b.pos)[0];
    const rel={prequel:prev?cleanRelatedTitle(prev.text,saga,title):'',sequel:next?cleanRelatedTitle(next.text,saga,title):'',source,score:baseScore,items:[]};
    if(rel.prequel||rel.sequel)out.push(rel)
  }
  return out
}
function parseNarrativeTriples(text,title,saga='',source='',baseScore=7){
  const p=clean(text),out=[];let m;
  const patterns=[
    /(?:comincia|inizia)(?:[^.]{0,120}?)\s+con\s+(?:il\s+libro\s+)?["“”']?([^"“”'.]{3,150})["“”']?\s+(?:per\s+)?(?:passare|proseguire)\s+(?:a|con)\s+["“”']?([^"“”'.]{3,150})["“”']?\s+e\s+(?:finisce|termina|conclude)\s+con\s+["“”']?([^"“”'.]{3,150})/i,
    /(?:formata|composta)\s+da\s+["“”']?([^"“”',;]{3,150})["“”']?\s*,\s*["“”']?([^"“”',;]{3,150})["“”']?\s+(?:e|and)\s+["“”']?([^"“”'.;]{3,150})/i
  ];
  for(const re of patterns){m=p.match(re);if(m){const rel=relationFromItems([m[1],m[2],m[3]],title,saga,source,baseScore);if(rel)out.push(rel)}}
  return out
}
function parseExplicitNeighbors(text,title,saga='',source='',baseScore=8){
  const p=clean(text),out={prequel:'',sequel:'',source,score:baseScore,items:[]};
  const pre=[/(?:preceduto|preceduta)\s+da\s+["“”']?([^"“”'\n.;]{3,160})/i,/(?:prequel|libro precedente|volume precedente)\s*[:\-]\s*["“”']?([^"“”'\n.;]{3,160})/i];
  const next=[/(?:seguito|seguita)\s+da\s+["“”']?([^"“”'\n.;]{3,160})/i,/(?:sequel|libro successivo|volume successivo)\s*[:\-]\s*["“”']?([^"“”'\n.;]{3,160})/i];
  for(const re of pre){const m=p.match(re);if(m){out.prequel=cleanRelatedTitle(m[1],saga,title);break}}
  for(const re of next){const m=p.match(re);if(m){out.sequel=cleanRelatedTitle(m[1],saga,title);break}}
  if(out.prequel&&sameTitle(out.prequel,title))out.prequel='';if(out.sequel&&sameTitle(out.sequel,title))out.sequel='';
  return out.prequel||out.sequel?[out]:[]
}
function parseRelations(text,title,saga='',source='',score=6){
  return [
    ...parseNumberedLists(text,title,saga,source,score+3),
    ...parseNamedLists(text,title,saga,source,score+1),
    ...parseNarrativeTriples(text,title,saga,source,score+1),
    ...parseExplicitNeighbors(text,title,saga,source,score+2)
  ]
}
async function reader(url,timeout=9500){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
function searchLinks(text){
  const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;
  while((m=re.exec(String(text||'')))){
    let u=m[1].replace(/&amp;/g,'&');
    try{
      const url=new URL(u);if(url.hostname.includes('google.')&&url.pathname==='/url'&&url.searchParams.get('q'))u=url.searchParams.get('q');
      const x=new URL(u),host=x.hostname.replace(/^www\./,'');if(BAD_HOSTS.test(host)||seen.has(u))continue;
      if(!/^https?:$/.test(x.protocol))continue;seen.add(u);out.push(u)
    }catch(e){}
  }
  return out
}
async function googleBooksEvidence(title,author,saga=''){
  const queries=[`inauthor:"${author}" "${title}"`,`inauthor:"${author}" trilogia`,`inauthor:"${author}" saga`,`inauthor:"${author}" series`],out=[];
  const seen=new Set();
  for(const q of queries){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7500);
    try{
      const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40`,{signal:ctrl.signal});if(!r.ok)continue;
      const data=await r.json();
      for(const item of data.items||[]){if(item?.id&&seen.has(item.id))continue;if(item?.id)seen.add(item.id);const v=item.volumeInfo||{};
        const blob=[v.title,v.subtitle,v.description,(v.categories||[]).join(' ')].filter(Boolean).join('\n');
        out.push(...parseRelations(blob,title,saga,'Google Books',9));
      }
    }catch(e){}finally{clearTimeout(timer)}
    if(out.some(x=>x.prequel&&x.sequel))break
  }
  return out
}
function bestRelations(candidates){
  const good=(candidates||[]).filter(x=>x&&(x.prequel||x.sequel));if(!good.length)return {prequel:'',sequel:'',saga:'',source:''};
  good.sort((a,b)=>(Number(!!b.prequel)+Number(!!b.sequel))-(Number(!!a.prequel)+Number(!!a.sequel))||(b.score||0)-(a.score||0));
  const top={...good[0]};
  for(const c of good){
    if(!top.prequel&&c.prequel)top.prequel=c.prequel;
    if(!top.sequel&&c.sequel)top.sequel=c.sequel;
    if(!top.saga&&c.saga)top.saga=c.saga;
    if(top.prequel&&top.sequel)break
  }
  return {prequel:top.prequel||'',sequel:top.sequel||'',saga:top.saga||'',source:top.source||''}
}

window.__LIB_FIND_RELATIONS=async function(input={}){
  const title=clean(input.title),author=clean(input.author),saga=clean(input.saga),code=String(input.code||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(!title||!author)return {prequel:'',sequel:'',saga:'',source:''};
  const key=[code,norm(title),norm(author),norm(saga)].join('|');if(relationCache.has(key))return relationCache.get(key);
  const promise=(async()=>{
    const q1=`"${title}" "${author}" trilogia saga serie ordine`;
    const q2=`"${title}" "${author}" "composta da" OR "formata da"`;
    const q3=`"${title}" "${author}" prequel sequel "preceduto da" "seguito da"`;
    const [g1,g2,b1,gb]=await Promise.all([
      reader(`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent(q1)}`,10500),
      reader(`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent(q2)}`,10500),
      reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q1+' '+q3)}`,10500),
      googleBooksEvidence(title,author,saga)
    ]);
    let candidates=[...gb,...parseRelations(g1,title,saga,'Google',6),...parseRelations(g2,title,saga,'Google',6),...parseRelations(b1,title,saga,'Bing',6)];
    let best=bestRelations(candidates);if(best.prequel&&best.sequel)return best;
    const links=[];for(const u of [...searchLinks(g1),...searchLinks(g2),...searchLinks(b1)])if(!links.includes(u))links.push(u);
    const pages=(await Promise.all(links.slice(0,6).map(async u=>({u,text:await reader(u,9000)})))).filter(x=>x.text);
    for(const p of pages)candidates.push(...parseRelations(p.text,title,saga,p.u,8));
    best=bestRelations(candidates);
    return best
  })();
  relationCache.set(key,promise);return promise
};
})();
