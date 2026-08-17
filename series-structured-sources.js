(()=>{
if(window.__LIB_STRUCTURED_RELATIONS||typeof window.__LIB_FIND_RELATIONS!=='function')return;
window.__LIB_STRUCTURED_RELATIONS=true;

const baseFindRelations=window.__LIB_FIND_RELATIONS;
const cache=new Map();

function clean(v){
  return String(v||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g,'$2')
    .replace(/<[^>]+>/g,' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
    .replace(/[\*_`~]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\s+/g,' ').trim();
}
function esc(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function titleVariants(v){
  const raw=clean(v),parts=raw.split(/\s*(?:[.:]|\s[-–—]\s)\s*/).map(clean).filter(Boolean),out=[];
  for(const x of [raw,...parts]){const n=norm(x);if(n&&n.length>1&&!out.some(y=>norm(y)===n))out.push(x)}
  return out;
}
function sameTitle(a,b){
  const x=norm(a),y=norm(b);if(!x||!y)return false;
  return x===y||(x.length>=7&&y.startsWith(x+' '))||(y.length>=7&&x.startsWith(y+' '));
}
function matchesTitle(v,title){return titleVariants(title).some(t=>sameTitle(v,t))}
function cleanSeriesName(v){
  let x=clean(v).replace(/^[|:=\-–—\s]+|[|:=\-–—\s]+$/g,'').trim();
  x=x.replace(/\s+(?:series|serie|trilogy|trilogia)\s*$/i,'').trim();
  if(!x||x.length>120||/^(?:serie|series|saga|trilogia|trilogy|ciclo)$/i.test(x))return'';
  return x;
}
function cleanBookTitle(v){
  let x=clean(v)
    .replace(/^[|:=\-–—•·\s]+|[|:=\-–—•·\s]+$/g,'')
    .replace(/^(?:libro|book|volume)\s*#?\s*\d{1,2}\s*[.)\-:]?\s*/i,'')
    .replace(/^#?\s*\d{1,2}\s*[.)\-:]\s*/,'')
    .replace(/\s+(?:ISBN|EAN)\b.*$/i,'')
    .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/,'')
    .trim();
  return x.length>=2&&x.length<=190?x:'';
}
const labels={
  saga:['Serie','Series','Book series','Saga','Ciclo','Trilogia','Trilogy'],
  prequel:['Preceduto da','Preceduta da','Preceded by','Previous book','Previous','Prequel'],
  sequel:['Seguito da','Seguita da','Followed by','Next book','Next','Sequel']
};
const allLabels=[...labels.saga,...labels.prequel,...labels.sequel].sort((a,b)=>b.length-a.length);
const allLabelsRe=allLabels.map(esc).join('|');
function valueFromLine(line,field){
  let x=String(line||'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g,'$2').replace(/[\*_`~]/g,'').trim();
  for(const label of labels[field]){
    const e=esc(label);
    let m=x.match(new RegExp('^\\s*\\|?\\s*'+e+'\\s*(?:\\||:|=|→|[-–—])\\s*(.+?)\\s*\\|?\\s*$','i'));
    if(!m)m=x.match(new RegExp('^\\s*\\|?\\s*'+e+'\\s+(.+?)\\s*\\|?\\s*$','i'));
    if(m){
      let v=m[1].replace(new RegExp('\\s+(?:'+allLabelsRe+')\\s*(?:\\||:|=|→|[-–—])?.*$','i'),'').trim();
      return field==='saga'?cleanSeriesName(v):cleanBookTitle(v);
    }
  }
  return'';
}
function flatValue(text,field){
  const p=clean(text),labelRe=labels[field].map(esc).join('|');
  const re=new RegExp('(?:^|\\s)(?:'+labelRe+')\\s*(?:\\||:|=|→|[-–—])?\\s*(.{2,180}?)(?=\\s+(?:'+allLabelsRe+')\\b|$)','i');
  const m=p.match(re);if(!m)return'';
  return field==='saga'?cleanSeriesName(m[1]):cleanBookTitle(m[1]);
}
function structuredFields(text,title){
  const out={saga:'',prequel:'',sequel:''},lines=String(text||'').split(/\r?\n/);
  for(const line of lines){
    for(const field of ['saga','prequel','sequel'])if(!out[field])out[field]=valueFromLine(line,field);
    if(out.saga&&out.prequel&&out.sequel)break;
  }
  for(const field of ['saga','prequel','sequel'])if(!out[field])out[field]=flatValue(text,field);
  if(out.prequel&&matchesTitle(out.prequel,title))out.prequel='';
  if(out.sequel&&matchesTitle(out.sequel,title))out.sequel='';
  return out;
}
function narrativeSaga(text){
  const p=clean(text);if(!p)return'';
  const patterns=[
    /\b(?:primo|secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono|decimo)\s*(?:libro|romanzo|volume)?\s*(?:della|del|nella)\s+(?:trilogia|saga|serie)\s+(?:chiamata|denominata|intitolata)?\s*([A-ZÀ-ÖØ-Ý][^.;]{1,100})/i,
    /\b(?:trilogia|saga|serie)\s+(?:chiamata|denominata|intitolata)\s+([A-ZÀ-ÖØ-Ý][^.;]{1,100})/i,
    /\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:book|novel|volume)\s+(?:in|of)\s+(?:the\s+)?([A-Z][^.;]{1,100}?)\s+(?:series|trilogy)\b/i
  ];
  for(const re of patterns){const m=p.match(re);if(m){const x=cleanSeriesName(m[1]);if(x)return x}}
  return'';
}
function headingLists(text,title){
  const lines=String(text||'').split(/\r?\n/),out=[];let heading='',items=[];
  const flush=()=>{
    if(!heading||items.length<2){items=[];return}
    const idx=items.findIndex(x=>matchesTitle(x,title));
    if(idx>=0){
      out.push({saga:cleanSeriesName(heading),prequel:idx>0?items[idx-1]:'',sequel:idx<items.length-1?items[idx+1]:'',score:90});
    }
    items=[];
  };
  for(const raw of lines){
    const hm=raw.match(/^\s*#{2,6}\s+(.+?)\s*$/);
    if(hm){flush();const h=clean(hm[1]);heading=/(?:series|serie|saga|trilogy|trilogia|ciclo)/i.test(h)?h:'';continue}
    if(!heading)continue;
    const bm=raw.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+?)\s*$/);
    if(bm){
      let x=cleanBookTitle(bm[1]);
      x=x.replace(/,\s*(?:[^,]{0,80},\s*)?(?:18|19|20)\d{2}\b.*$/,'').replace(/\s*\((?:18|19|20)\d{2}\).*$/,'').trim();
      if(x)items.push(x);
    }
  }
  flush();return out;
}
async function fetchJson(url,timeout=8000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(timer)}
}
async function reader(url,timeout=9000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}
}
async function wikiSearch(lang,query,limit=5){
  const api=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srnamespace=0&srlimit=${limit}&format=json&origin=*&srsearch=${encodeURIComponent(query)}`;
  const data=await fetchJson(api);return (data?.query?.search||[]).map(x=>x.title).filter(Boolean);
}
async function wikiWikitext(lang,page){
  const api=`https://${lang}.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&origin=*&page=${encodeURIComponent(page)}`;
  const data=await fetchJson(api);return data?.parse?.wikitext?.['*']||'';
}
function wikiUrl(lang,page){return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(page).replace(/ /g,'_'))}`}
async function wikipediaEvidence(input){
  const title=clean(input.title),author=clean(input.author),description=String(input.description||input.plot||'');
  const out={saga:'',prequel:'',sequel:'',checked:false,source:'',score:0};
  const local=structuredFields(description,title),localSaga=local.saga||narrativeSaga(description);
  if(localSaga){out.saga=localSaga;out.score=35}
  if(local.prequel){out.prequel=local.prequel;out.score=Math.max(out.score,45)}
  if(local.sequel){out.sequel=local.sequel;out.score=Math.max(out.score,45)}

  const requests=[];
  for(const lang of ['it','en']){
    requests.push((async()=>({lang,kind:'book',pages:await wikiSearch(lang,`\"${title}\" \"${author}\"`,5)}))());
    requests.push((async()=>({lang,kind:'book',pages:await wikiSearch(lang,`${title} ${author}`,5)}))());
    requests.push((async()=>({lang,kind:'author',pages:await wikiSearch(lang,`\"${author}\"`,3)}))());
    if(localSaga)requests.push((async()=>({lang,kind:'series',pages:await wikiSearch(lang,`\"${localSaga}\" \"${author}\"`,4)}))());
  }
  const groups=await Promise.all(requests),candidates=[],seen=new Set();
  for(const g of groups)for(const page of g.pages){const k=g.lang+'|'+page;if(seen.has(k))continue;seen.add(k);candidates.push({lang:g.lang,page,kind:g.kind})}

  for(const c of candidates.slice(0,14)){
    const url=wikiUrl(c.lang,c.page);
    const [rendered,wikitext]=await Promise.all([reader(url),wikiWikitext(c.lang,c.page)]);
    const text=[rendered,wikitext].filter(Boolean).join('\n');if(!text)continue;
    const ntext=norm(text),authorOk=!author||ntext.includes(norm(author)),titleOk=matchesTitle(c.page,title)||titleVariants(title).some(v=>ntext.includes(norm(v)));
    if(!authorOk&&c.kind!=='series')continue;
    if(c.kind==='book'&&!titleOk)continue;
    out.checked=true;

    const sf=structuredFields(text,title);
    if(sf.saga&&(!out.saga||out.score<100)){out.saga=sf.saga;out.source=url;out.score=100}
    if(sf.prequel){out.prequel=sf.prequel;out.source=url;out.score=Math.max(out.score,110)}
    if(sf.sequel){out.sequel=sf.sequel;out.source=url;out.score=Math.max(out.score,110)}

    const ns=narrativeSaga(text);if(ns&&!out.saga){out.saga=ns;out.source=url;out.score=Math.max(out.score,70)}
    for(const list of headingLists(rendered,title)){
      if(list.saga&&!out.saga){out.saga=list.saga;out.source=url}
      if(list.prequel&&!out.prequel){out.prequel=list.prequel;out.source=url}
      if(list.sequel&&!out.sequel){out.sequel=list.sequel;out.source=url}
      out.score=Math.max(out.score,list.score||90);
    }
    if(out.saga&&out.prequel&&out.sequel&&out.score>=100)break;
  }
  return out;
}

window.__LIB_FIND_RELATIONS=async function(input={}){
  const key=[norm(input.code),norm(input.title),norm(input.author),norm(input.saga),norm(input.description||input.plot),'structured-v1'].join('|');
  if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const [base,extra]=await Promise.all([
      Promise.resolve(baseFindRelations(input)).catch(()=>({prequel:'',sequel:'',saga:'',sagaChecked:false,source:''})),
      wikipediaEvidence(input).catch(()=>({saga:'',prequel:'',sequel:'',checked:false,source:'',score:0}))
    ]);
    return {
      prequel:cleanBookTitle(extra.prequel)||cleanBookTitle(base?.prequel)||'',
      sequel:cleanBookTitle(extra.sequel)||cleanBookTitle(base?.sequel)||'',
      saga:cleanSeriesName(extra.saga)||cleanSeriesName(base?.saga)||'',
      sagaChecked:Boolean(base?.sagaChecked||extra.checked||extra.saga),
      source:extra.source||base?.source||''
    };
  })();
  cache.set(key,promise);return promise;
};
})();
