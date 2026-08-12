from pathlib import Path

# --- series-relations.js ---
p = Path('series-relations.js')
s = p.read_text(encoding='utf-8')

old = '''function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  return x===y||(x.length>6&&y.startsWith(x+' '))||(y.length>6&&x.startsWith(y+' '))
}
'''
new = '''function titleSegments(v){
  const raw=clean(v),parts=raw.split(/\\s*(?:[.:]|\\s[-–—]\\s)\\s*/).map(clean).filter(x=>x.length>=3);
  const out=[],seen=new Set();for(const x of [raw,...parts]){const n=norm(x);if(n&&!seen.has(n)){seen.add(n);out.push(x)}}return out
}
function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  if(x===y||(x.length>6&&y.startsWith(x+' '))||(y.length>6&&x.startsWith(y+' ')))return true;
  const ax=titleSegments(a).map(norm).filter(Boolean),by=titleSegments(b).map(norm).filter(Boolean);
  const aset=new Set(ax),bset=new Set(by);
  if(ax.length>1&&by.length>1&&ax.length===by.length&&ax.every(v=>bset.has(v)))return true;
  const strong=v=>v.split(' ').length>=2&&v.length>=7;
  if(ax.some(v=>strong(v)&&v===y)||by.some(v=>strong(v)&&v===x))return true;
  return false
}
'''
if old not in s: raise SystemExit('sameTitle non trovato')
s = s.replace(old, new, 1)

old = "const preferred=par.find(p=>(sg&&norm(p).includes(sg))||(tg&&norm(p).includes(tg)));"
new = "const preferred=par.find(p=>(sg&&norm(p).includes(sg))||(tg&&(norm(p).includes(tg)||sameTitle(p,target))));"
if old not in s: raise SystemExit('preferenza parentesi non trovata')
s = s.replace(old, new, 1)

old = '''function relationFromItems(items,title,saga='',source='',score=5){
  const cleaned=items.map(x=>cleanRelatedTitle(x,saga,title)).filter(Boolean);
  if(cleaned.length<2||cleaned.length>20)return null;
  const idx=cleaned.findIndex(x=>sameTitle(x,title));if(idx<0)return null;
  const prequel=idx>0?cleaned[idx-1]:'';
  const sequel=idx<cleaned.length-1?cleaned[idx+1]:'';
  if(!prequel&&!sequel)return null;
  return {prequel,sequel,source,score,items:cleaned}
}
'''
new = '''function inferSagaFromItems(items,title){
  const counts=new Map(),samples=new Map();
  for(const raw of items||[]){
    const variants=[clean(raw),...[...String(raw||'').matchAll(/\\(([^()]{3,180})\\)/g)].map(m=>clean(m[1]))];
    const seen=new Set();
    for(const variant of variants)for(const seg of titleSegments(variant).slice(1)){
      const n=norm(seg);if(!n||seen.has(n)||n===norm(title)||n.length<7||n.split(' ').length<2||/^(?:libro|book|volume|edizione|romanzo|novel|trilogia|saga|serie|ciclo)$/.test(n))continue;
      seen.add(n);counts.set(n,(counts.get(n)||0)+1);if(!samples.has(n))samples.set(n,seg)
    }
  }
  const best=[...counts.entries()].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]||a[0].length-b[0].length)[0];
  return best?samples.get(best[0])||'':''
}
function relationFromItems(items,title,saga='',source='',score=5){
  const inferred=saga||inferSagaFromItems(items,title),target=stripSaga(title,inferred);
  const cleaned=items.map(x=>cleanRelatedTitle(x,inferred,title)).filter(Boolean);
  if(cleaned.length<2||cleaned.length>20)return null;
  const idx=cleaned.findIndex(x=>sameTitle(x,target)||sameTitle(x,title));if(idx<0)return null;
  const prequel=idx>0?cleaned[idx-1]:'';
  const sequel=idx<cleaned.length-1?cleaned[idx+1]:'';
  if(!prequel&&!sequel)return null;
  return {prequel,sequel,saga:inferred||'',source,score,items:cleaned}
}
'''
if old not in s: raise SystemExit('relationFromItems non trovato')
s = s.replace(old, new, 1)

start = s.find("function parseNumberedLists(text,title,saga='',source='',baseScore=9){")
end = s.find("function parseNarrativeTriples", start)
if start < 0 or end < 0: raise SystemExit('parseNumberedLists non trovato')
new_block = '''function parseNumberedLists(text,title,saga='',source='',baseScore=9){
  const raw=String(text||''),matches=[];let m;
  const lineRe=/(?:^|\\n)\\s*(?:[-*]\\s*)?(?:(?:libro|book|volume)\\s*)?#?\\s*(\\d{1,2})\\s*[.)\\-:]\\s*([^\\n]{2,220})/gi;
  while((m=lineRe.exec(raw))){const n=Number(m[1]);if(n>=1&&n<=30)matches.push({n,text:m[2],pos:m.index})}
  const inlineRe=/(?:^|\\s)(?:libro|book|volume)\\s*#?\\s*(\\d{1,2})\\s*[.:\\-]\\s*(.*?)(?=(?:\\s+(?:libro|book|volume)\\s*#?\\s*\\d{1,2}\\s*[.:\\-])|$)/gi;
  while((m=inlineRe.exec(raw))){const n=Number(m[1]);if(n>=1&&n<=30)matches.push({n,text:m[2],pos:m.index})}
  matches.sort((a,b)=>a.pos-b.pos);
  const out=[];
  for(const cur of matches){
    const near=matches.filter(x=>Math.abs(x.pos-cur.pos)<2600).sort((a,b)=>a.pos-b.pos);
    const inferred=saga||inferSagaFromItems(near.map(x=>x.text),title),target=stripSaga(title,inferred);
    const curTitle=cleanRelatedTitle(cur.text,inferred,title);if(!sameTitle(curTitle,target)&&!sameTitle(curTitle,title))continue;
    const prev=near.filter(x=>x.n===cur.n-1&&x.pos<cur.pos).sort((a,b)=>b.pos-a.pos)[0];
    const next=near.filter(x=>x.n===cur.n+1&&x.pos>cur.pos).sort((a,b)=>a.pos-b.pos)[0];
    const rel={prequel:prev?cleanRelatedTitle(prev.text,inferred,title):'',sequel:next?cleanRelatedTitle(next.text,inferred,title):'',saga:inferred||'',source,score:baseScore,items:[]};
    if(rel.prequel||rel.sequel)out.push(rel)
  }
  return out
}
'''
s = s[:start] + new_block + s[end:]

old = '''async function googleBooksEvidence(title,author,saga=''){
  const queries=[`inauthor:"${author}" "${title}"`,`inauthor:"${author}" trilogia`,`inauthor:"${author}" saga`,`inauthor:"${author}" series`],out=[];
'''
new = '''async function googleBooksEvidence(title,author,saga=''){
  const variants=titleSegments(title).filter(x=>norm(x)!==norm(title)).slice(0,2);
  const queries=[`inauthor:"${author}" "${title}"`,...variants.map(v=>`inauthor:"${author}" "${v}"`),`inauthor:"${author}" trilogia`,`inauthor:"${author}" saga`,`inauthor:"${author}" series`],out=[];
'''
if old not in s: raise SystemExit('googleBooksEvidence non trovato')
s = s.replace(old, new, 1)

old = '''    const q1=`"${title}" "${author}" trilogia saga serie ordine`;
    const q2=`"${title}" "${author}" "composta da" OR "formata da"`;
    const q3=`"${title}" "${author}" prequel sequel "preceduto da" "seguito da"`;
'''
new = '''    const parts=titleSegments(title).filter(x=>norm(x)!==norm(title)).slice(0,3),partQuery=parts.length>1?parts.map(x=>`"${x}"`).join(' '):`"${title}"`;
    const q1=`"${title}" "${author}" trilogia saga serie ordine`;
    const q2=`${partQuery} "${author}" "composta da" OR "formata da" OR "serie è composta da"`;
    const q3=`${partQuery} "${author}" prequel sequel "preceduto da" "seguito da"`;
'''
if old not in s: raise SystemExit('query relazioni non trovate')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

# --- isbn-cover.js ---
p = Path('isbn-cover.js')
s = p.read_text(encoding='utf-8')
old = "try{const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});if(rel?.saga&&!candidate.saga){candidate.saga=rel.saga;setAutoField('editSaga',rel.saga)}setAutoField('editPrequel',rel?.prequel);setAutoField('editSequel',rel?.sequel)}catch(e){console.warn('Relazioni serie non disponibili',e)}"
new = "try{const rel=await window.__LIB_FIND_RELATIONS({code,title:candidate.title,author:candidate.author,saga:candidate.saga});if(rel?.saga&&!candidate.saga){candidate.saga=rel.saga;setAutoField('editSaga',rel.saga);const cleanedTitle=stripSagaFromTitle(candidate.title,rel.saga);if(cleanedTitle&&cleanedTitle!==candidate.title){candidate.title=cleanedTitle;setAutoField('editTitle',cleanedTitle)}}setAutoField('editPrequel',rel?.prequel);setAutoField('editSequel',rel?.sequel)}catch(e){console.warn('Relazioni serie non disponibili',e)}"
if old not in s: raise SystemExit('applyCandidate relazioni non trovato')
s = s.replace(old, new, 1)

old = "if(rel?.saga&&!b.saga){b.saga=rel.saga;changed=true}if(rel?.prequel&&b.prequel!==rel.prequel){b.prequel=rel.prequel;changed=true}if(rel?.sequel&&b.sequel!==rel.sequel){b.sequel=rel.sequel;changed=true}b.relationsLookupAt=now;"
new = "if(rel?.saga&&!b.saga){b.saga=rel.saga;changed=true}const effectiveSaga=rel?.saga||b.saga||'';if(effectiveSaga){const cleanedTitle=stripSagaFromTitle(b.title,effectiveSaga);if(cleanedTitle&&cleanedTitle!==b.title){b.title=cleanedTitle;changed=true}}if(rel?.prequel&&b.prequel!==rel.prequel){b.prequel=rel.prequel;changed=true}if(rel?.sequel&&b.sequel!==rel.sequel){b.sequel=rel.sequel;changed=true}b.relationsLookupAt=now;"
if old not in s: raise SystemExit('enrichSavedRelations non trovato')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# --- bg/bg8.js ---
p = Path('bg/bg8.js')
s = p.read_text(encoding='utf-8')
if 'series-relations.js?v=1' not in s or 'isbn-cover.js?v=12' not in s: raise SystemExit('versioni loader inattese')
s = s.replace('series-relations.js?v=1','series-relations.js?v=2',1).replace('isbn-cover.js?v=12','isbn-cover.js?v=13',1)
p.write_text(s, encoding='utf-8')

# --- index.html ---
p = Path('index.html')
s = p.read_text(encoding='utf-8')
if 'bg${i}.js?v=12' not in s: raise SystemExit('cache background v12 non trovato')
s = s.replace('bg${i}.js?v=12','bg${i}.js?v=13',1)
p.write_text(s, encoding='utf-8')
