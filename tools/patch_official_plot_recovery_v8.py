from pathlib import Path

# isbn-resilient-fallback-v1.js
p=Path('isbn-resilient-fallback-v1.js');s=p.read_text(encoding='utf-8')
old="""function publisherDomain(v){for(const [re,d] of PUBLISHER_DOMAINS)if(re.test(String(v||'')))return d;return''}
function headingAuthor(body,title){
"""
new="""function publisherDomain(v){for(const [re,d] of PUBLISHER_DOMAINS)if(re.test(String(v||'')))return d;return''}
function publisherDirectUrls(rec,domain){
  let title=cleanCommercialTitle(rec?.title||'').replace(/\\s*[.:-]\\s*(?:nuova\\s+ediz(?:ione)?\\.?|nuova\\s+edizione|ediz(?:ione)?\\.?\\s*\\d*)\\s*$/i,'').trim();
  const slug=normText(title).replace(/\\s+/g,'-');const out=[];
  if(domain==='rizzolilibri.it'&&slug)out.push(`https://www.rizzolilibri.it/libri/${slug}/`);
  return out
}
function headingAuthor(body,title){
"""
if old not in s: raise SystemExit('publisher anchor missing')
s=s.replace(old,new,1)
old2="""async function enrichOfficial(rec){
  if(!rec?.title)return rec;const domain=publisherDomain(rec.publisher);if(!domain)return rec;
  const q=`site:${domain} \\\"${rec.title}\\\" ${rec.author?`\\\"${rec.author}\\\"`:''}`;
  const b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500);const urls=linksFrom(b).filter(u=>domainOf(u)===domain);
"""
new2="""async function enrichOfficial(rec){
  if(!rec?.title)return rec;const domain=publisherDomain(rec.publisher);if(!domain)return rec;
  const q=`site:${domain} \\\"${rec.title}\\\" ${rec.author?`\\\"${rec.author}\\\"`:''}`;
  const direct=publisherDirectUrls(rec,domain),b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500),urls=[...direct,...linksFrom(b).filter(u=>domainOf(u)===domain)].filter((u,i,a)=>a.indexOf(u)===i);
"""
if old2 not in s: raise SystemExit('enrichOfficial start missing')
s=s.replace(old2,new2,1)
anchor="""  return rec
}
function searchSnippetRecord(text,code){
"""
repl="""  return rec
}
window.__LIB_RESOLVE_OFFICIAL_PLOT=async function(input={}){
  try{
    const rec={title:cleanCommercialTitle(input.title||''),author:clean(input.author||''),publisher:cleanPublisher(input.publisher||''),description:''};
    if(!rec.title||!rec.publisher)return'';
    const out=await enrichOfficial(rec);return cleanPlot(out?.description||'')
  }catch(e){return''}
};
function searchSnippetRecord(text,code){
"""
if anchor not in s: raise SystemExit('official resolver insertion missing')
s=s.replace(anchor,repl,1)
p.write_text(s,encoding='utf-8')

# isbn-cover.js
p=Path('isbn-cover.js');s=p.read_text(encoding='utf-8')
s=s.replace("  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}", "  window.__LIB_INSPECT_FRONT_COVER=inspectFrontCover;\n  function imageWorks(url){return inspectFrontCover(url).then(x=>!!x.ok)}",1)
needle="""    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);setAutoField('editPrequel',candidate.prequel);setAutoField('editSequel',candidate.sequel);
"""
replace="""    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);setAutoField('editPrequel',candidate.prequel);setAutoField('editSequel',candidate.sequel);
    /* OFFICIAL_PLOT_RECOVERY_V1: la trama viene recuperata separatamente dai metadati ISBN e mai da recensioni. */
    if(type==='isbn'&&!cleanBookPlotDescription(candidate.description||'')&&typeof window.__LIB_RESOLVE_OFFICIAL_PLOT==='function'&&candidate.title&&candidate.publisher){
      try{
        const officialPlot=cleanBookPlotDescription(await window.__LIB_RESOLVE_OFFICIAL_PLOT({title:candidate.title,author:candidate.author||'',publisher:candidate.publisher||''}));
        if(officialPlot){candidate.description=officialPlot;setAutoField('editPlot',officialPlot)}
      }catch(e){console.warn('Trama ufficiale editore non disponibile',e)}
    }
"""
if needle not in s: raise SystemExit('applyCandidate field line missing')
s=s.replace(needle,replace,1)
p.write_text(s,encoding='utf-8')

# cache bust
p=Path('bg/bg8.js');s=p.read_text(encoding='utf-8').replace('isbn-cover.js?v=29','isbn-cover.js?v=30');p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('isbn-resilient-fallback-v1.js?v=7','isbn-resilient-fallback-v1.js?v=8').replace('bg${i}.js?v=31','bg${i}.js?v=32');p.write_text(s,encoding='utf-8')
print('official plot recovery v8 applied')
