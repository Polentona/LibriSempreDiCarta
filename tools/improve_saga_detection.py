from pathlib import Path
import re

p = Path('italian-catalog-fallback-v3.js')
s = p.read_text(encoding='utf-8')

new_block = r'''function explicitListedSeriesFromText(text,title){
  const p=plain(text),target=normText(title),out=[];
  if(!target)return out;
  const add=(name,list)=>{
    const saga=cleanLine(name).replace(/^["“”'\s:;|•·–—-]+|["“”'\s:;|•·–—-]+$/g,'').trim();
    const listed=cleanLine(list),nl=normText(listed);
    if(!saga||saga.length<2||saga.length>70||!nl.includes(target))return;
    const items=listed.split(/\s*[,;•·|/]\s*/).map(normText).filter(Boolean);
    if(items.length<2)return;
    if(!out.some(x=>normText(x)===normText(saga)))out.push(saga)
  };
  let m;
  const italian=/(?:la\s+)?(?:trilogia|saga|serie|ciclo)\s+di\s+["“”']?([^:"“”'\n|]{2,70})["“”']?\s*:\s*([^\n]{3,320})/gi;
  while((m=italian.exec(p)))add(m[1],m[2]);
  const english=/["“”']?([^:"“”'\n|]{2,70})["“”']?\s+(?:trilogy|series)\s*:\s*([^\n]{3,320})/gi;
  while((m=english.exec(p)))add(m[1],m[2]);
  return out
}
async function googleBooksListedSeries(rec){
  if(!rec?.title||!rec?.author)return'';
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
  try{
    const q=`inauthor:${rec.author}`;
    const url=`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=it&maxResults=40`;
    const r=await baseFetch(url,{signal:ctrl.signal});if(!r.ok)return'';
    const data=await r.json();
    const target=normText(rec.title);
    for(const item of data.items||[]){
      const v=item.volumeInfo||{},blob=[v.title,v.subtitle,v.description,(v.categories||[]).join(' ')].filter(Boolean).join('\n');
      const candidates=explicitListedSeriesFromText(blob,rec.title);if(candidates.length)return candidates[0];
      const t=String(v.title||'');
      const m=t.match(/^(?:La\s+)?(?:trilogia|saga|serie|ciclo)\s+di\s+([^:]{2,70})\s*:\s*(.+)$/i);
      if(m&&normText(m[2]).includes(target))return cleanLine(m[1])
    }
  }catch(e){}finally{clearTimeout(timer)}
  return''
}
async function confirmStandaloneSaga(rec){
  if(!rec||rec.saga||!rec.title||!rec.author)return rec;
  const q=`"${rec.title}" "${rec.author}" trilogia saga serie`;
  const [g,b,gbSaga]=await Promise.all([
    reader(`https://www.google.com/search?hl=it&num=12&q=${encodeURIComponent(q)}`,11000),
    reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000),
    googleBooksListedSeries(rec)
  ]);

  if(gbSaga){rec.saga=gbSaga;rec.score=(rec.score||0)+6;return rec}

  const explicit=[...explicitListedSeriesFromText(g,rec.title),...explicitListedSeriesFromText(b,rec.title)];
  if(explicit.length){
    const groups=new Map();
    for(const value of explicit){
      const key=normText(value),x=groups.get(key)||{value,count:0};x.count++;groups.set(key,x)
    }
    const best=[...groups.values()].sort((a,b)=>b.count-a.count)[0];
    if(best){rec.saga=best.value;rec.score=(rec.score||0)+(best.count>1?6:5);return rec}
  }

  const groups=new Map();
  for(const [source,text] of [['g',g],['b',b]])for(const value of searchSagaCandidates(text,rec.title,rec.author)){
    const key=normText(value);if(!key)continue;
    const x=groups.get(key)||{value,count:0,sources:new Set()};x.count++;x.sources.add(source);groups.set(key,x)
  }
  const best=[...groups.values()].sort((a,b)=>b.sources.size-a.sources.size||b.count-a.count)[0];
  if(best&&(best.sources.size>=2||best.count>=2)){rec.saga=best.value;rec.score=(rec.score||0)+3}
  return rec
}
'''

helper = s.find('function explicitListedSeriesFromText(text,title){')
standalone = s.find('async function confirmStandaloneSaga(rec){')
if standalone < 0:
    raise SystemExit('confirmStandaloneSaga non trovato')
start = helper if helper >= 0 and helper < standalone else standalone
end = s.find('async function confirmCompositeSaga(rec){', standalone)
if end < 0:
    raise SystemExit('confirmCompositeSaga non trovato')
s = s[:start] + new_block + s[end:]
p.write_text(s, encoding='utf-8')

p = Path('bg/bg8.js')
b = p.read_text(encoding='utf-8')
m = re.search(r'italian-catalog-fallback-v3\.js\?v=(\d+)', b)
if not m:
    raise SystemExit('versione catalog fallback non trovata')
version = int(m.group(1)) + 1
b = b[:m.start()] + f'italian-catalog-fallback-v3.js?v={version}' + b[m.end():]
p.write_text(b, encoding='utf-8')
