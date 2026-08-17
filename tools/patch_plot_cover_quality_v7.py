from pathlib import Path
import re

root=Path('.')

# ---- isbn-cover.js: filtro globale trama + filtro visivo copertine ----
p=root/'isbn-cover.js'
s=p.read_text(encoding='utf-8')

old="""  function normalizeCandidateMetadata(candidate){
    const c={...(candidate||{})};
    c.saga=safeSeriesName(c.saga);c.prequel=safeBookRelation(c.prequel);c.sequel=safeBookRelation(c.sequel);
    c.title=cleanCatalogTitle(seriesTitleWithSagaFirst(c.title,c.saga));
    if(c.author&&!plausibleAuthorName(c.author))c.author='';
    return c
  }
"""
new="""  function plotPlainText(v){
    const d=document.createElement('div');d.innerHTML=String(v||'');
    return String(d.textContent||d.innerText||'').replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g,' ').replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g,'$1').replace(/[\\u200B-\\u200F\\u202A-\\u202E\\u2060\\u2066-\\u2069\\uFEFF]/g,'').replace(/\\u00a0/g,' ').replace(/\\s+/g,' ').trim()
  }
  function reviewNoiseIndex(text){
    const pats=[
      /\\b(?:customer reviews?|user reviews?|recensioni degli utenti|recensioni dei clienti|valutazioni e recensioni)\\b/i,
      /\\b(?:verified purchase|acquisto verificato|reviewed in|recensito in|reviewed on|recensito il)\\b/i,
      /\\b(?:helpful|sending feedback|thank you for your feedback|sorry,? we failed|report this review|translate review|see original)\\b/i,
      /\\b(?:brief content visible|full content visible|double tap to read|read more|read less|leggi di piu|leggi di meno|mostra altre recensioni)\\b/i,
      /\\b(?:[1-5](?:[.,]\\d+)?\\s*(?:out of 5 )?stars?|[1-5](?:[.,]\\d+)?\\s*su\\s*5\\s*stelle)\\b/i
    ];
    let idx=-1;for(const re of pats){const m=re.exec(text);if(m&&(idx<0||m.index<idx))idx=m.index}return idx
  }
  function opinionReviewText(text){
    const n=normalizeText(text);let score=0;
    for(const re of [/\\ba mio parere\\b/i,/\\bsecondo me\\b/i,/\\bmi e piaciut/i,/\\bnon mi e piaciut/i,/\\bho letto\\b/i,/\\bho trovato\\b/i,/\\bconsiglio (?:questo|il|la)\\b/i,/\\bappassionante\\b/i,/\\bdeludente\\b/i,/\\brecensione\\b/i,/\\bverified purchase\\b/i,/\\breviewed in\\b/i])if(re.test(n))score++;
    return score>=2
  }
  function cleanBookPlotDescription(v){
    let p=plotPlainText(v);if(!p)return'';
    p=p.replace(/^(?:descrizione(?: del libro| prodotto)?|sinossi|trama|abstract)\\s*[:\\-]?\\s*/i,'').trim();
    const cut=reviewNoiseIndex(p);
    if(cut>=0){
      const before=p.slice(0,cut).trim();
      if(before.length>=90&&!opinionReviewText(before))p=before;else return''
    }
    if(opinionReviewText(p))return'';
    if(/\\b(?:customer review|verified purchase|sending feedback|translate review|double tap to read|recensioni degli utenti|recensito in)\\b/i.test(p))return'';
    if(/\\b(?:aggiungi al carrello|buy now|spedizione|disponibilita immediata|prezzo|cookie|privacy policy)\\b/i.test(normalizeText(p)))return'';
    p=p.replace(/\\s+/g,' ').trim();
    if(p.length<60)return'';
    if(p.length>2600)p=p.slice(0,2600).replace(/\\s+\\S*$/,'')+'…';
    return p
  }
  window.__LIB_CLEAN_BOOK_PLOT=cleanBookPlotDescription;
  function normalizeCandidateMetadata(candidate){
    const c={...(candidate||{})};
    c.saga=safeSeriesName(c.saga);c.prequel=safeBookRelation(c.prequel);c.sequel=safeBookRelation(c.sequel);
    c.title=cleanCatalogTitle(seriesTitleWithSagaFirst(c.title,c.saga));
    c.description=cleanBookPlotDescription(c.description||'');
    if(c.author&&!plausibleAuthorName(c.author))c.author='';
    return c
  }
"""
if old not in s:
    raise SystemExit('normalizeCandidateMetadata block not found')
s=s.replace(old,new,1)

old2="""  function imageWorks(url){return new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish(false),4200);img.onload=()=>finish(img.naturalWidth>20&&img.naturalHeight>20);img.onerror=()=>finish(false);img.src=url})}
  async function usableCovers(covers){
    const seen=new Set(),list=[];
    for(const c of covers||[]){const url=secureUrl(typeof c==='string'?c:c.url),source=typeof c==='string'?'Fonte bibliografica':(c.source||'Fonte bibliografica');if(url&&!seen.has(url)){seen.add(url);list.push({url,source})}}
    const checked=await Promise.all(list.slice(0,12).map(async c=>(await imageWorks(c.url))?c:null));return checked.filter(Boolean)
  }
"""
new2="""  function coverProbeUrl(url){
    const u=secureUrl(url);if(!u)return'';if(/images\\.weserv\\.nl\\//i.test(u))return u;
    return 'https://images.weserv.nl/?url='+encodeURIComponent(u)
  }
  function inspectFrontCover(url){return new Promise(resolve=>{
    const img=new Image();img.crossOrigin='anonymous';let done=false;
    const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish({ok:false,reason:'timeout'}),6500);
    img.onerror=()=>finish({ok:false,reason:'load'});
    img.onload=()=>{
      const w=img.naturalWidth,h=img.naturalHeight,ratio=w/Math.max(1,h);
      if(w<55||h<90)return finish({ok:false,reason:'small',w,h,ratio});
      if(ratio<0.43||ratio>0.86)return finish({ok:false,reason:'ratio',w,h,ratio});
      try{
        const cw=40,ch=60,cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,cw,ch);const d=ctx.getImageData(0,0,cw,ch).data;
        const col=[];for(let x=0;x<cw;x++){let sum=0,sum2=0;for(let y=0;y<ch;y++){const i=(y*cw+x)*4,lum=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=lum;sum2+=lum*lum}const mean=sum/ch,sd=Math.sqrt(Math.max(0,sum2/ch-mean*mean));col.push({mean,sd})}
        const edgeMean=(start,end)=>{let z=0,n=0;for(let x=start;x<end;x++){z+=col[x].mean;n++}return z/Math.max(1,n)};
        const leftBg=edgeMean(0,3),rightBg=edgeMean(cw-3,cw);
        let lm=0;for(let x=0;x<cw;x++){if(Math.abs(col[x].mean-leftBg)<14&&col[x].sd<20)lm++;else break}
        let rm=0;for(let x=cw-1;x>=0;x--){if(Math.abs(col[x].mean-rightBg)<14&&col[x].sd<20)rm++;else break}
        const marginFrac=(lm+rm)/cw,oneSide=Math.max(lm,rm)/cw;
        if(marginFrac>0.24||oneSide>0.20)return finish({ok:false,reason:'side-margins',w,h,ratio,marginFrac,oneSide});
        return finish({ok:true,reason:'front',w,h,ratio,marginFrac,oneSide})
      }catch(e){return finish({ok:true,reason:'ratio-only',w,h,ratio})}
    };
    img.src=coverProbeUrl(url)
  })}
  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}
  async function usableCovers(covers){
    const seen=new Set(),list=[];
    for(const c of covers||[]){const url=secureUrl(typeof c==='string'?c:c.url),source=typeof c==='string'?'Fonte bibliografica':(c.source||'Fonte bibliografica');if(url&&!seen.has(url)){seen.add(url);list.push({url,source})}}
    const tested=await Promise.all(list.slice(0,12).map(async c=>({c,q:await inspectFrontCover(c.url)})));
    window.__LIB_LAST_COVER_QUALITY__=tested.map(x=>({url:x.c.url,source:x.c.source,...x.q}));
    return tested.filter(x=>x.q.ok).map(x=>x.c)
  }
"""
if old2 not in s:
    raise SystemExit('imageWorks block not found')
s=s.replace(old2,new2,1)

s=s.replace("if(desc)c.description=stripHtml(desc);", "if(desc)c.description=cleanBookPlotDescription(desc);", 1)
p.write_text(s,encoding='utf-8')

# ---- italian-retailer-fallback-v2.js ----
p=root/'italian-retailer-fallback-v2.js';s=p.read_text(encoding='utf-8')
needle="function looksLikeBoilerplate(text){const p=plain(text).toLowerCase();const bad=['tutti i libri','schede bibliografiche','navigazione della pagina','vai al contenuto','menu principale','accedi o registrati','carrello','servizio clienti','cookie','privacy policy','termini e condizioni','recensioni e schede','libri autori recensioni','catalogo libraccio','negozi libraccio','aggiungi al carrello','altre offerte vendute','attualmente non disponibile'];return bad.some(x=>p.includes(x))}\n"
insert=needle+"""function cleanPlotGlobal(v){
  if(typeof window.__LIB_CLEAN_BOOK_PLOT==='function')return window.__LIB_CLEAN_BOOK_PLOT(v);
  let p=plain(v).replace(/\\s+/g,' ').trim();if(!p)return'';
  const markers=[/\\b(?:customer reviews?|recensioni degli utenti|recensioni dei clienti|verified purchase|acquisto verificato|reviewed in|recensito in|helpful|sending feedback|thank you for your feedback|translate review|see original|double tap to read)\\b/i,/\\b(?:read more|read less|leggi di piu|leggi di meno)\\b/i,/\\b(?:[1-5](?:[.,]\\d+)?\\s*(?:out of 5 )?stars?|[1-5](?:[.,]\\d+)?\\s*su\\s*5\\s*stelle)\\b/i];
  let cut=-1;for(const re of markers){const m=re.exec(p);if(m&&(cut<0||m.index<cut))cut=m.index}if(cut>=0){const before=p.slice(0,cut).trim();if(before.length>=90&&!/\\b(?:a mio parere|secondo me|mi e piaciut|ho letto|ho trovato|consiglio|appassionante|deludente)\\b/i.test(normText(before)))p=before;else return''}
  const n=normText(p);let score=0;for(const re of [/\\ba mio parere\\b/,/\\bsecondo me\\b/,/\\bmi e piaciut/,/\\bho letto\\b/,/\\bho trovato\\b/,/\\bconsiglio\\b/,/\\bappassionante\\b/,/\\bdeludente\\b/,/\\brecensione\\b/])if(re.test(n))score++;if(score>=2)return'';
  return p.length>=60?p:''
}
"""
if needle not in s: raise SystemExit('retailer insertion point missing')
s=s.replace(needle,insert,1)
s=s.replace("function looksLikePlot(text){const p=plain(text);if(!looksItalian(p)||looksLikeBoilerplate(p))return false;", "function looksLikePlot(text){const p=cleanPlotGlobal(text);if(!p||!looksItalian(p)||looksLikeBoilerplate(p))return false;",1)
s=s.replace("function trimPlot(v){let p=plain(v)", "function trimPlot(v){let p=plain(v)",1)
s=s.replace("if(p.length>1800)p=p.slice(0,1800).replace(/\\s+\\S*$/,'')+'…';return p}", "if(p.length>1800)p=p.slice(0,1800).replace(/\\s+\\S*$/,'')+'…';return cleanPlotGlobal(p)}",1)
s=s.replace("if(needPlot&&plots[0]){plot.value=plots[0].plot;plot.dispatchEvent(new Event('input',{bubbles:true}))}", "if(needPlot&&plots[0]){const safe=cleanPlotGlobal(plots[0].plot);if(safe){plot.value=safe;plot.dispatchEvent(new Event('input',{bubbles:true}))}}",1)
p.write_text(s,encoding='utf-8')

# ---- libraccio-plot-fallback.js ----
p=root/'libraccio-plot-fallback.js';s=p.read_text(encoding='utf-8')
s=s.replace("const plain=s=>String(s||'').replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g,' ').replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g,'$1').replace(/[*_`>#|]/g,' ').replace(/\\s+/g,' ').trim();\n", "const plain=s=>String(s||'').replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g,' ').replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g,'$1').replace(/[*_`>#|]/g,' ').replace(/\\s+/g,' ').trim();\nconst safePlot=s=>typeof window.__LIB_CLEAN_BOOK_PLOT==='function'?window.__LIB_CLEAN_BOOK_PLOT(s):plain(s);\n",1)
s=s.replace("if(p){ta.value=p;ta.dispatchEvent(new Event('input',{bubbles:true}));", "p=safePlot(p);if(p){ta.value=p;ta.dispatchEvent(new Event('input',{bubbles:true}));",1)
p.write_text(s,encoding='utf-8')

# ---- italian-catalog-fallback-v3.js ----
p=root/'italian-catalog-fallback-v3.js';s=p.read_text(encoding='utf-8')
old_desc="""function descriptionFrom(text){
  const lines=String(text||'').split(/\\n/),heads=['descrizione','descrizione libro','descrizione del libro','sinossi','trama'];
  for(let i=0;i<lines.length;i++){
    const h=normText(cleanLine(lines[i]));if(!heads.some(x=>h===x||h.startsWith(x+' ')))continue;
    const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2200;j++){const raw=lines[j],c=cleanLine(raw);if(!c)continue;if(/^\\s*#{1,5}\\s+/.test(raw)&&out.length)break;if(/^(dettagli|informazioni|recensioni|consegna|acquista|compra|prodotti correlati|scheda)/i.test(c)&&out.length)break;out.push(c)}
    let d=plain(out.join(' ')).replace(/\\s+/g,' ').trim();if(d.length>80){if(d.length>1800)d=d.slice(0,1800).replace(/\\s+\\S*$/,'')+'…';if(!/aggiungi al carrello|cookie|privacy policy|tutti i libri/i.test(d))return d}
  }
  return''
}
"""
new_desc="""function descriptionFrom(text){
  const sanitize=v=>typeof window.__LIB_CLEAN_BOOK_PLOT==='function'?window.__LIB_CLEAN_BOOK_PLOT(v):plain(v).replace(/\\s+/g,' ').trim();
  const lines=String(text||'').split(/\\n/),heads=['descrizione','descrizione libro','descrizione del libro','sinossi','trama'];
  for(let i=0;i<lines.length;i++){
    const h=normText(cleanLine(lines[i]));if(!heads.some(x=>h===x||h.startsWith(x+' ')))continue;
    const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2200;j++){const raw=lines[j],c=cleanLine(raw);if(!c)continue;if(/^\\s*#{1,5}\\s+/.test(raw)&&out.length)break;if(/^(dettagli|informazioni|recensioni|consegna|acquista|compra|prodotti correlati|scheda)/i.test(c)&&out.length)break;out.push(c)}
    let d=sanitize(out.join(' '));if(d.length>80){if(d.length>1800)d=d.slice(0,1800).replace(/\\s+\\S*$/,'')+'…';if(!/aggiungi al carrello|cookie|privacy policy|tutti i libri/i.test(d))return d}
  }
  return''
}
"""
if old_desc not in s: raise SystemExit('catalog description block missing')
s=s.replace(old_desc,new_desc,1)
p.write_text(s,encoding='utf-8')

# ---- isbn-resilient-fallback-v1.js: rifiuta recensioni e preferisce trama editore ----
p=root/'isbn-resilient-fallback-v1.js';s=p.read_text(encoding='utf-8')
anchor="function safeCategory(v){const x=clean(v);if(!x||x.length>120||/https?:|\\[\\]\\(|cookie|carrello/i.test(x))return'';const n=normText(x);if(/mystery|thriller|crime|gialli/.test(n))return 'Gialli e thriller';if(/horror/.test(n))return 'Horror';if(/fantasy/.test(n))return 'Fantasy';if(/science fiction|fantascienza/.test(n))return 'Fantascienza';if(/juvenile|young adult|ragazzi/.test(n))return 'Libri per ragazzi';if(/fiction|narrativa|letteratura/.test(n))return 'Narrativa';return x}\n"
helper=anchor+"""function cleanPlot(v){
  let p=htmlDecode(String(v||'').replace(/<br\\s*\\/?\\s*>/gi,' ')).replace(/\\s+/g,' ').trim();if(!p)return'';
  const markers=[/\\b(?:customer reviews?|recensioni degli utenti|recensioni dei clienti|verified purchase|acquisto verificato|reviewed in|recensito in|helpful|sending feedback|thank you for your feedback|translate review|see original|double tap to read)\\b/i,/\\b(?:read more|read less|leggi di piu|leggi di meno)\\b/i,/\\b(?:[1-5](?:[.,]\\d+)?\\s*(?:out of 5 )?stars?|[1-5](?:[.,]\\d+)?\\s*su\\s*5\\s*stelle)\\b/i];let cut=-1;for(const re of markers){const m=re.exec(p);if(m&&(cut<0||m.index<cut))cut=m.index}if(cut>=0){const before=p.slice(0,cut).trim();if(before.length>=90&&!/\\b(?:a mio parere|secondo me|mi e piaciut|ho letto|ho trovato|consiglio|appassionante|deludente)\\b/i.test(normText(before)))p=before;else return''}
  const n=normText(p);let score=0;for(const re of [/\\ba mio parere\\b/,/\\bsecondo me\\b/,/\\bmi e piaciut/,/\\bho letto\\b/,/\\bho trovato\\b/,/\\bconsiglio\\b/,/\\bappassionante\\b/,/\\bdeludente\\b/,/\\brecensione\\b/])if(re.test(n))score++;if(score>=2)return'';return p.length>=60?p:''
}
function officialPlot(body,title){
  const lines=String(body||'').split(/\\n/),cleaned=lines.map(cleanLine);for(let i=0;i<lines.length;i++){const h=normText(cleaned[i]);if(!/^(?:descrizione|sinossi|trama|descrizione del libro|descrizione prodotto)$/.test(h))continue;const out=[];for(let j=i+1;j<lines.length&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j];if(!x)continue;if(/^\\s*#{1,5}\\s+/.test(raw)&&out.length)break;if(/^(?:caratteristiche|dettagli|informazioni|recensioni|acquista|conosci l autore|autore)$/i.test(normText(x))&&out.length)break;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}
  let start=-1;for(let i=0;i<lines.length;i++){if(/^\\s*#{1,3}\\s+/.test(lines[i])&&titleSimilarity(cleaned[i],title)>=.55){start=i;break}}if(start>=0){const out=[];for(let j=start+1;j<Math.min(lines.length,start+45)&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j],n=normText(x);if(!x)continue;if(/^\\s*#{1,3}\\s+/.test(raw)&&out.length&&/(?:caratteristiche|dettagli|autore|conosci l autore|recensioni|acquista)/i.test(n))break;if(/^(?:isbn|isbn cartaceo|isbn ebook|editore|prezzo|pagine|formato|data di uscita|condividi|scegli formato|acquista il libro)$/i.test(n))continue;if(/^\\d{4}$/.test(x)||validAuthor(x))continue;if(x.length<55)continue;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}return''
}
"""
if anchor not in s: raise SystemExit('resilient safeCategory anchor missing')
s=s.replace(anchor,helper,1)
s=s.replace("description=clean(v.description||'');", "description=cleanPlot(v.description||'');",1)
s=s.replace("v.publisher=cleanPublisher(v.publisher||'');v.categories=(v.categories||[]).map(safeCategory).filter(Boolean)", "v.publisher=cleanPublisher(v.publisher||'');v.description=cleanPlot(v.description||'');v.categories=(v.categories||[]).map(safeCategory).filter(Boolean)",1)
s=s.replace("description=clean(dm[1]);", "description=cleanPlot(dm[1]);",1)
s=s.replace("if(!rec.description&&best.description)rec.description=htmlDecode(best.description);", "if(!rec.description&&best.description)rec.description=cleanPlot(best.description);",1)
old_enrich="""    const h=String(body).split(/\\n/).map(cleanLine).find(x=>validTitle(x)&&titleSimilarity(x,rec.title)>=0.65);if(h)rec.title=cleanCommercialTitle(h);
    rec.officialSource=u;rec.score=(rec.score||0)+8;break
"""
new_enrich="""    const h=String(body).split(/\\n/).map(cleanLine).find(x=>validTitle(x)&&titleSimilarity(x,rec.title)>=0.65);if(h)rec.title=cleanCommercialTitle(h);
    const op=officialPlot(body,rec.title);if(op)rec.description=op;
    rec.officialSource=u;rec.score=(rec.score||0)+8;break
"""
if old_enrich not in s: raise SystemExit('enrichOfficial block missing')
s=s.replace(old_enrich,new_enrich,1)
s=s.replace("description:rec.description||''", "description:cleanPlot(rec.description||'')",1)
p.write_text(s,encoding='utf-8')

# ---- cache busting ----
p=root/'bg/bg8.js';s=p.read_text(encoding='utf-8')
s=s.replace("isbn-cover.js?v=28","isbn-cover.js?v=29")
s=s.replace("italian-retailer-fallback-v2.js?v=2","italian-retailer-fallback-v2.js?v=3")
s=s.replace("italian-catalog-fallback-v3.js?v=15","italian-catalog-fallback-v3.js?v=16")
p.write_text(s,encoding='utf-8')

p=root/'index.html';s=p.read_text(encoding='utf-8')
s=s.replace("isbn-resilient-fallback-v1.js?v=6","isbn-resilient-fallback-v1.js?v=7")
s=s.replace("bg${i}.js?v=30","bg${i}.js?v=31")
p.write_text(s,encoding='utf-8')

print('plot/cover quality v7 patch applied')
