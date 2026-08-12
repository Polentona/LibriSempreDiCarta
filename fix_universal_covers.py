from pathlib import Path

p = Path('isbn-cover.js')
s = p.read_text(encoding='utf-8')

marker = '/* UNIVERSAL_RETAIL_COVERS_V1 */'
if marker not in s:
    anchor = "  function identifiersFromGoogle(v){return (v.industryIdentifiers||[]).map(x=>normalizeLoose(x.identifier)).filter(Boolean)}\n"
    if anchor not in s:
        raise SystemExit('Anchor identifiersFromGoogle non trovato')

    helpers = r'''

  /* UNIVERSAL_RETAIL_COVERS_V1 */
  const RETAIL_COVER_DOMAINS=['amazon.it','libraccio.it','ibs.it','mondadoristore.it','giunti.it','bancolibri.it','libreriauniversitaria.it','unilibro.it'];
  const RETAIL_COVER_NAMES={'amazon.it':'Amazon Italia','libraccio.it':'Libraccio','ibs.it':'IBS','mondadoristore.it':'Mondadori Store','giunti.it':'Giunti','bancolibri.it':'Bancolibri','libreriauniversitaria.it':'Libreria Universitaria','unilibro.it':'Unilibro'};
  function isbn13to10Ui(v){const n=normalizeLoose(v);if(!/^978\d{10}$/.test(n))return'';const core=n.slice(3,12);let sum=0;for(let i=0;i<9;i++)sum+=Number(core[i])*(10-i);const c=(11-(sum%11))%11;return core+(c===10?'X':String(c))}
  function retailDomain(url){try{const h=new URL(url).hostname.replace(/^www\./,'');return RETAIL_COVER_DOMAINS.find(d=>h===d||h.endsWith('.'+d))||''}catch(e){return''}}
  function retailName(url){return RETAIL_COVER_NAMES[retailDomain(url)]||'Catalogo italiano'}
  async function retailReader(url,timeout=11000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch('https://r.jina.ai/'+url,{signal:ctrl.signal,headers:{Accept:'text/plain'}});if(!r.ok)return'';return await r.text()}catch(e){return''}finally{clearTimeout(timer)}}
  function retailImageUrl(url){const u=secureUrl(String(url||'').replace(/&amp;/g,'&').trim());if(!u)return'';if(/^https?:\/\/(?:m\.media-amazon\.com|images(?:-na)?\.ssl-images-amazon\.com)\//i.test(u))return 'https://images.weserv.nl/?url='+encodeURIComponent(u);return u}
  function retailLinks(text){const out=[],seen=new Set(),re=/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;let m;while((m=re.exec(String(text||'')))){const u=m[1].replace(/&amp;/g,'&');if(retailDomain(u)&&!seen.has(u)){seen.add(u);out.push(u)}}return out}
  function retailImages(text,pageUrl,title=''){
    const found=[],seen=new Set(),words=normalizeText(title).split(' ').filter(w=>w.length>3);
    const add=(raw,label='')=>{let u=String(raw||'').replace(/&amp;/g,'&').replace(/[)>.,;]+$/,'').trim();if(!/^https?:\/\//i.test(u)||seen.has(u))return;seen.add(u);const hay=(u+' '+label).toLowerCase();let score=0;if(/m\.media-amazon\.com\/images\/i\//i.test(u)||/ssl-images-amazon\.com/i.test(u))score+=18;if(/\.(?:jpg|jpeg|png|webp|avif)(?:\?|$)/i.test(u))score+=5;if(/cover|copertin|product|libro|book/i.test(hay))score+=4;for(const w of words)if(hay.includes(w))score+=2;if(/logo|icon|sprite|banner|badge|qr|visa|mastercard|paypal|placeholder|avatar|favicon|kindle|prime|header|footer|cookie|klarna/i.test(hay))score-=30;if(score>0)found.push({url:retailImageUrl(u),source:retailName(pageUrl),score})};
    let m;const md=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;while((m=md.exec(String(text||''))))add(m[2],m[1]);
    const raw=/(https?:\/\/[^\s\"'<>]+?(?:\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s\"'<>]*)?|m\.media-amazon\.com\/images\/I\/[^\s\"'<>]+))/gi;while((m=raw.exec(String(text||''))))add(m[1]);
    return found.sort((a,b)=>b.score-a.score)
  }
  async function retailerCoversForIsbn(code,title='',author=''){
    const n=normalizeLoose(code),i10=n.length===13?isbn13to10Ui(n):(n.length===10?n:''),pages=[];
    if(i10)pages.push(`https://www.amazon.it/dp/${encodeURIComponent(i10)}`);
    pages.push(`https://www.libraccio.it/libro/${encodeURIComponent(n)}/`);
    pages.push(`https://www.mondadoristore.it/p/${encodeURIComponent(n)}`);
    pages.push(`https://www.giunti.it/search?q=${encodeURIComponent(n)}`);
    const query=`\"${n}\" \"${title||''}\" ${author||''} (site:amazon.it OR site:libraccio.it OR site:ibs.it OR site:mondadoristore.it OR site:giunti.it OR site:bancolibri.it OR site:libreriauniversitaria.it OR site:unilibro.it)`;
    const search=await retailReader('https://www.google.com/search?hl=it&num=12&q='+encodeURIComponent(query),12000);
    for(const u of retailLinks(search).slice(0,10))if(!pages.includes(u))pages.push(u);
    const aliases=[n,i10].filter(Boolean),checks=await Promise.all(pages.slice(0,12).map(async u=>{const text=await retailReader(u);if(!text)return[];const body=normalizeLoose(text);if(aliases.length&&!aliases.some(a=>body.includes(a)))return[];return retailImages(text,u,title).slice(0,3)}));
    const out=[],seen=new Set();for(const c of checks.flat().sort((a,b)=>(b.score||0)-(a.score||0))){if(c.url&&!seen.has(c.url)){seen.add(c.url);out.push({url:c.url,source:c.source})}}
    return out.slice(0,10)
  }
  function mergeCoverOptions(a,b){const out=[],seen=new Set();for(const c of [...(a||[]),...(b||[])]){const x=typeof c==='string'?{url:c,source:'Fonte bibliografica'}:c,u=secureUrl(x?.url||'');if(u&&!seen.has(u)){seen.add(u);out.push({url:u,source:x.source||'Fonte bibliografica'})}}return out}
'''
    s = s.replace(anchor, anchor + helpers)

old = """    const forcedCover=verifiedUiCover(code);if(forcedCover&&(!$x('editCover').value.trim()||autoFields.has('editCover')))setDraftCover(forcedCover,true);\n    const coverAlready=$x('editCover').value.trim()&&!autoFields.has('editCover');\n    let pickerOpened=false;if(!coverAlready&&candidate.covers?.length)pickerOpened=await showCoverPicker(candidate.covers,code);"""
new = """    const forcedCover=verifiedUiCover(code);if(forcedCover&&(!$x('editCover').value.trim()||autoFields.has('editCover')))setDraftCover(forcedCover,true);\n    const coverAlready=$x('editCover').value.trim()&&!autoFields.has('editCover');\n    if(type==='isbn'&&!coverAlready){const retail=await retailerCoversForIsbn(code,candidate.title||'',candidate.author||'');candidate.covers=mergeCoverOptions(candidate.covers,retail)}\n    let pickerOpened=false;if(!coverAlready&&candidate.covers?.length)pickerOpened=await showCoverPicker(candidate.covers,code);"""
if old not in s:
    raise SystemExit('Blocco applyCandidate non trovato')
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')

bg = Path('bg/bg8.js')
t = bg.read_text(encoding='utf-8')
t2 = t.replace('isbn-cover.js?v=5', 'isbn-cover.js?v=6')
if t2 == t:
    raise SystemExit('Versione isbn-cover.js?v=5 non trovata in bg8.js')
bg.write_text(t2, encoding='utf-8')
