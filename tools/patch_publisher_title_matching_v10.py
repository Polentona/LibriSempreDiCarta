from pathlib import Path
p=Path('isbn-resilient-fallback-v1.js');s=p.read_text(encoding='utf-8')
old="""function publisherDomain(v){for(const [re,d] of PUBLISHER_DOMAINS)if(re.test(String(v||'')))return d;return''}
function publisherDirectUrls(rec,domain){
  let title=cleanCommercialTitle(rec?.title||'').replace(/\\s*[.:-]\\s*(?:nuova\\s+ediz(?:ione)?\\.?|nuova\\s+edizione|ediz(?:ione)?\\.?\\s*\\d*)\\s*$/i,'').trim();
  const slug=normText(title).replace(/\\s+/g,'-');const out=[];
"""
new="""function publisherDomain(v){for(const [re,d] of PUBLISHER_DOMAINS)if(re.test(String(v||'')))return d;return''}
function publisherLookupTitle(v){
  let t=cleanCommercialTitle(v||'');
  t=t.replace(/\\s*(?:[.:-]|[-–—])\\s*(?:nuova\\s+ediz(?:ione)?\\.?|nuova\\s+edizione|ediz(?:ione)?\\.?\\s*(?:economica|speciale|illustrata|integrale|aggiornata)?|edizione\\s+(?:economica|speciale|illustrata|integrale|aggiornata)|ristampa|reissue)\\s*$/i,'').trim();
  t=t.replace(/\\s*[([]\\s*(?:vol\\.?|volume)\\s*\\.?\\s*#?\\s*\\d{1,3}\\s*[)\\]]\\s*$/i,'').trim();
  return t||cleanCommercialTitle(v||'')
}
function publisherDirectUrls(rec,domain){
  const title=publisherLookupTitle(rec?.title||'');
  const slug=normText(title).replace(/\\s+/g,'-');const out=[];
"""
if old not in s: raise SystemExit('publisher lookup title block missing')
s=s.replace(old,new,1)
old2="""async function enrichOfficial(rec){
  if(!rec?.title)return rec;const domain=publisherDomain(rec.publisher);if(!domain)return rec;
  const q=`site:${domain} \\\"${rec.title}\\\" ${rec.author?`\\\"${rec.author}\\\"`:''}`;
  const direct=publisherDirectUrls(rec,domain),b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500),urls=[...direct,...linksFrom(b).filter(u=>domainOf(u)===domain)].filter((u,i,a)=>a.indexOf(u)===i);
  for(const u of urls.slice(0,4)){
    const text=await jina(u,9000),body=bodyOnly(text);if(!body)continue;
    const n=normText(body),words=titleWords(rec.title);if(words.filter(w=>n.includes(w)).length<Math.min(2,words.length))continue;
    let a=headingAuthor(body,rec.title);if(!a){const lines=String(body).split(/\\n/);a=field(lines,['Autore','Autori','Author','Scritto da'])}
    if(a&&validAuthor(a))rec.author=clean(a);
    const h=String(body).split(/\\n/).map(cleanLine).find(x=>validTitle(x)&&titleSimilarity(x,rec.title)>=0.65);if(h)rec.title=cleanCommercialTitle(h);
    const op=officialPlot(body,rec.title);if(op)rec.description=op;
"""
new2="""async function enrichOfficial(rec){
  if(!rec?.title)return rec;const domain=publisherDomain(rec.publisher);if(!domain)return rec;
  const lookupTitle=publisherLookupTitle(rec.title),q=`site:${domain} \\\"${lookupTitle}\\\" ${rec.author?`\\\"${rec.author}\\\"`:''}`;
  const direct=publisherDirectUrls(rec,domain),b=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8500),urls=[...direct,...linksFrom(b).filter(u=>domainOf(u)===domain)].filter((u,i,a)=>a.indexOf(u)===i);
  for(const u of urls.slice(0,4)){
    const text=await jina(u,9000),body=bodyOnly(text);if(!body)continue;
    const n=normText(body),words=titleWords(lookupTitle);if(words.filter(w=>n.includes(w)).length<Math.min(2,words.length))continue;
    let a=headingAuthor(body,lookupTitle);if(!a){const lines=String(body).split(/\\n/);a=field(lines,['Autore','Autori','Author','Scritto da'])}
    if(a&&validAuthor(a))rec.author=clean(a);
    const h=String(body).split(/\\n/).map(cleanLine).find(x=>validTitle(x)&&titleSimilarity(x,lookupTitle)>=0.65);if(h)rec.title=cleanCommercialTitle(h);
    const op=officialPlot(body,lookupTitle);if(op)rec.description=op;
"""
if old2 not in s: raise SystemExit('enrichOfficial title match block missing')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')

p=Path('index.html');s=p.read_text(encoding='utf-8').replace('isbn-resilient-fallback-v1.js?v=9','isbn-resilient-fallback-v1.js?v=10').replace('bg${i}.js?v=33','bg${i}.js?v=34');p.write_text(s,encoding='utf-8')
print('publisher title matching v10 applied')
