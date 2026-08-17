(()=>{
if(window.__LIB_BOUNDED_SERIES_V1)return;
window.__LIB_BOUNDED_SERIES_V1=true;

const cache=new Map();
const publisherDomains=[
  [/bompiani/i,'bompiani.it'],[/\btea\b/i,'tealibri.it'],[/feltrinelli/i,'feltrinellieditore.it'],[/einaudi/i,'einaudi.it'],
  [/rizzoli/i,'rizzolilibri.it'],[/adelphi/i,'adelphi.it'],[/sellerio/i,'sellerio.it'],[/newton/i,'newtoncompton.com'],
  [/salani/i,'salani.it'],[/longanesi/i,'longanesi.it'],[/garzanti/i,'garzanti.it'],[/corbaccio/i,'corbaccio.it'],
  [/\bnord\b/i,'editricenord.it'],[/piemme/i,'edizpiemme.it'],[/sperling/i,'sperling.it'],[/fazi/i,'fazieditore.it'],
  [/harpercollins/i,'harpercollins.it'],[/mondadori/i,'mondadori.it']
];
const trustedDomains=new Set([
  'bompiani.it','tealibri.it','feltrinellieditore.it','einaudi.it','rizzolilibri.it','adelphi.it','sellerio.it',
  'newtoncompton.com','salani.it','longanesi.it','garzanti.it','corbaccio.it','editricenord.it','edizpiemme.it',
  'sperling.it','fazieditore.it','harpercollins.it','mondadori.it','stephenking.com','books.google.com','ibs.it'
]);
function clean(v){return String(v||'').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').trim()}
function sameTitle(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y)return true;if(x.length>=6&&y.startsWith(x+' '))return true;if(y.length>=6&&x.startsWith(y+' '))return true;return false}
function screenNoise(v){const n=norm(v);return /\b(?:tv|television|episodio|episode|stagione|season|miniserie|film|movie|cinema|screenplay|teleplay|itv|bbc|hbo|netflix|regia|director|starring|cast)\b/i.test(n)||/\b(?:s\d{1,2}e\d{1,2}|\d{1,2}x\d{1,2})\b/i.test(n)}
function cleanTitle(v){let x=clean(v).replace(/^["“”«»'\s]+|["“”«»'\s]+$/g,'').replace(/\s*\((?:18|19|20)\d{2}\)\s*$/,'').replace(/^\s*\d{1,2}\s*[.)-]\s*/,'').replace(/\s*\((?:novel|romanzo|book|libro)[^)]*\)\s*$/i,'').trim();if(screenNoise(x)||x.length<2||x.length>190)return'';return x}
function hostOf(url){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch(e){return''}}
function trusted(url){const h=hostOf(url);return [...trustedDomains].some(d=>h===d||h.endsWith('.'+d))}
function decodeBing(u){try{const x=new URL(u);if(!/(^|\.)bing\.com$/i.test(x.hostname))return u;const enc=x.searchParams.get('u')||'';if(!enc.startsWith('a1'))return u;let b=enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return decodeURIComponent(escape(atob(b)))}catch(e){return u}}
function linksFrom(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){const u=decodeBing(m[1].replace(/&amp;/g,'&'));if(trusted(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
async function jina(url,timeout=8500){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
function publisherDomain(p){for(const [re,d] of publisherDomains)if(re.test(String(p||'')))return d;return''}
function authorSurname(a){return norm(a).split(' ').filter(Boolean).pop()||''}
function validPage(text,title,author){const n=norm(text);if(!n)return false;const tn=norm(title),sur=authorSurname(author);if(!tn||!sur)return false;const core=tn.split(' ').filter(w=>w.length>2).slice(0,4);return core.filter(w=>n.includes(w)).length>=Math.min(2,core.length)&&n.includes(sur)}
function trailingProperName(desc){const d=clean(desc).replace(/[.:;,-]+$/,'');const m=d.match(/([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ'’.-]+){0,4})$/);return m?clean(m[1]):''}
function splitItems(raw){let s=clean(raw).replace(/\s+e\s+(?=[A-ZÀ-ÖØ-Ý“"'])/g,', ').replace(/\s+and\s+(?=[A-ZÀ-ÖØ-Ý“"'])/gi,', ');let parts=s.split(/\s*[,;•|]\s*/).map(cleanTitle).filter(Boolean);if(parts.length<2){const num=[];const re=/(?:^|\s)(\d{1,2})[.)]\s*([^\n]{2,180}?)(?=(?:\s+\d{1,2}[.)]\s)|$)/g;let m;while((m=re.exec(s)))num.push(cleanTitle(m[2]));if(num.length>=2)parts=num.filter(Boolean)}return parts.filter(x=>x.length<=190)}
function relation(items,title,saga,source){const cleaned=items.map(cleanTitle).filter(Boolean);if(cleaned.length<2||cleaned.length>30)return null;const idx=cleaned.findIndex(x=>sameTitle(x,title));if(idx<0)return null;return {saga:clean(saga),prequel:idx>0?cleaned[idx-1]:'',sequel:idx<cleaned.length-1?cleaned[idx+1]:'',items:cleaned,source,authoritative:true,checked:true,terminal:idx===cleaned.length-1,initial:idx===0}}
function parseExplicit(text,title,source){
  const p=String(text||'').replace(/\r/g,' ');let m;
  // Esempio editoriale: "l'intera serie dedicata ... David Hunter: Titolo (2006), Titolo (2007), ..."
  const descriptor=/(?:l['’]intera\s+)?(?:serie|saga|ciclo)\s+([^:\n]{2,190})\s*:\s*([^\n]{20,1600})/gi;
  while((m=descriptor.exec(p))){let saga=trailingProperName(m[1]);if(!saga){const z=clean(m[1]).replace(/^(?:di|del|della|dedicata?\s+.*?\s+a(?:l|lla)?\s+)/i,'');saga=clean(z)}const items=splitItems(m[2]);const r=relation(items,title,saga,source);if(r&&saga)return r}
  const named=/(?:trilogia|serie|saga|ciclo)\s+(?:di\s+)?["“”']?([^:\n("“”']{2,100})["“”']?\s*:\s*([^\n]{12,1500})/gi;
  while((m=named.exec(p))){const saga=clean(m[1]),items=splitItems(m[2]);const r=relation(items,title,saga,source);if(r&&saga&&!screenNoise(saga))return r}
  // Frase senza nome di saga: ordine esplicito di volumi. Restituisce relazioni, saga vuota.
  const ordered=/(?:serie|saga|trilogia|ciclo)[^\n]{0,180}?(?:composta|formata|costituita)\s+da\s*:?\s*([^\n]{12,1500})/gi;
  while((m=ordered.exec(p))){const r=relation(splitItems(m[1]),title,'',source);if(r)return r}
  return null
}
async function resolve(input={}){
  const title=clean(input.title),author=clean(input.author),publisher=clean(input.publisher),key=[norm(title),norm(author),norm(publisher)].join('|');if(!title||!author)return null;if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const domain=publisherDomain(publisher);const queries=[];
    if(domain)queries.push(`site:${domain} "${title}" "${author}"`);
    queries.push(`"${title}" "${author}" (serie OR saga OR trilogia OR series)`);
    const pages=[];const seen=new Set();
    for(const q of queries.slice(0,2)){
      const results=await jina('https://www.bing.com/search?setlang=it-IT&q='+encodeURIComponent(q),8000);for(const u of linksFrom(results)){if(!seen.has(u)){seen.add(u);pages.push(u)}}
      if(pages.length>=4)break
    }
    // Se abbiamo il dominio editore, preferisci quelle pagine.
    pages.sort((a,b)=>Number(hostOf(b)===domain)-Number(hostOf(a)===domain));
    for(const u of pages.slice(0,4)){
      const text=await jina(u,9000);if(!validPage(text,title,author))continue;const rel=parseExplicit(text,title,u);if(rel){window.__LIB_BOUNDED_SERIES_LAST__={input,pages,chosen:u,rel};return rel}
    }
    window.__LIB_BOUNDED_SERIES_LAST__={input,pages,chosen:'',rel:null};return null
  })();cache.set(key,promise);return promise
}
window.__LIB_RESOLVE_BOUNDED_RELATIONS=resolve;
})();