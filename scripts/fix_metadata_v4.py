from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label} anchor missing")
    return text.replace(old, new, 1)


# Catalogo italiano: scarta falsi autori, conferma meglio le saghe e usa
# il catalogo verificato anche quando Google Books restituisce gia' un record.
p = Path("italian-catalog-fallback-v3.js")
s = p.read_text(encoding="utf-8")

old = r"""  if(/\b(milano|monza|brianza|lodi|roma|torino|napoli|bologna|firenze|genova|venezia|provincia|regione|comune|lombardia|lazio|piemonte|italia|spedizione|consegna|negozio|libreria|magazzino|disponibile|carrello|cookie|assistenza|ritiro|punti vendita)\b/i.test(n))return false;
  const w=a.split(/\s+/).filter(Boolean);return w.length>=1&&w.length<=6&&/^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,5}$/.test(a)
"""
new = r"""  if(/\b(milano|monza|brianza|lodi|roma|torino|napoli|bologna|firenze|genova|venezia|provincia|regione|comune|lombardia|lazio|piemonte|italia|spedizione|consegna|negozio|libreria|magazzino|disponibile|carrello|cookie|assistenza|ritiro|punti vendita|iva|ean|isbn|eur|euro|sku|codice|prezzo|sconto|traduttore|collana|pagine|formato|dati)\b/i.test(n))return false;
  if(/^[A-ZÀ-Ý]{2,4}$/.test(a))return false;
  const w=a.split(/\s+/).filter(Boolean);return w.length>=1&&w.length<=6&&/^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,5}$/.test(a)
"""
s = replace_once(s, old, new, "validAuthor")

old = r"""    const q=`"${candidate}" "${novel}" ${rec.author||''} saga serie`;
    const [g,b]=await Promise.all([
      reader(`https://www.google.com/search?hl=it&num=10&q=${encodeURIComponent(q)}`,11000),
      reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000)
    ]);
    const hay=normText(g+' '+b),c=normText(candidate),n=normText(novel);
    const evidence=[`saga ${c}`,`serie ${c}`,`ciclo ${c}`,`${c} saga`,`${c} serie`].some(x=>hay.includes(x));
    const both=hay.includes(c)&&hay.includes(n);
    if(evidence&&both){rec.saga=candidate;rec.title=novel;rec.score=(rec.score||0)+3;return rec}
"""
new = r"""    const q=`"${candidate}" "${novel}" ${rec.author||''}`;
    const [g,b]=await Promise.all([
      reader(`https://www.google.com/search?hl=it&num=10&q=${encodeURIComponent(q)}`,11000),
      reader(`https://www.bing.com/search?setlang=it-IT&q=${encodeURIComponent(q)}`,11000)
    ]);
    const hay=normText(g+' '+b),c=normText(candidate),n=normText(novel);
    const ce=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    const evidence=new RegExp(`(?:saga|serie|ciclo)(?:\\s+[a-z0-9]+){0,10}\\s+${ce}|${ce}(?:\\s+[a-z0-9]+){0,10}\\s+(?:saga|serie|ciclo)`,'i').test(hay);
    const both=hay.includes(c)&&hay.includes(n);
    if(evidence&&both){rec.saga=candidate;rec.title=novel;rec.score=(rec.score||0)+5;return rec}
"""
s = replace_once(s, old, new, "confirmCompositeSaga")

old = r"""  try{
    const data=await r.clone().json();if((data.items||[]).length)return r;
    const code=norm(m[1]),rec=await findCatalog(code);if(!rec)return r;
    data.items=[makeGoogleItem(rec,code)];data.totalItems=1;return jsonResponse(r,data)
  }catch(e){return r}
"""
new = r"""  try{
    const data=await r.clone().json(),code=norm(m[1]),rec=await findCatalog(code);if(!rec)return r;
    const verified=makeGoogleItem(rec,code),vv=verified.volumeInfo||{};
    if(!(data.items||[]).length){data.items=[verified];data.totalItems=1;return jsonResponse(r,data)}
    const first=data.items[0],v=first.volumeInfo=first.volumeInfo||{};
    if(rec.saga){v.title=rec.title||v.title;v.subtitle='';v.seriesName=rec.saga}
    else if(rec.title&&!v.title)v.title=rec.title;
    if(rec.author)v.authors=[rec.author];
    if(rec.publisher&&!v.publisher)v.publisher=rec.publisher;
    if(rec.year&&!v.publishedDate)v.publishedDate=rec.year;
    if(rec.description&&!v.description)v.description=rec.description;
    if(rec.category&&!(v.categories||[]).length)v.categories=[rec.category];
    if(rec.cover&&!Object.keys(v.imageLinks||{}).length)v.imageLinks=vv.imageLinks;
    const ids=aliases(code).map(id=>({type:id.length===10?'ISBN_10':'ISBN_13',identifier:id}));
    const current=(v.industryIdentifiers||[]).map(x=>norm(x.identifier));
    for(const id of ids)if(!current.includes(norm(id.identifier)))v.industryIdentifiers=(v.industryIdentifiers||[]).concat(id);
    first.__italianCatalogVerified=true;
    return jsonResponse(r,data)
  }catch(e){return r}
"""
s = replace_once(s, old, new, "Google wrapper")
p.write_text(s, encoding="utf-8")


# Interfaccia: durante la ricerca mostra esclusivamente un libro rotante; al
# termine della compilazione automatica l'indicatore sparisce.
p = Path("isbn-cover.js")
s = p.read_text(encoding="utf-8")

old = "  .cover-draft strong{display:block;font-size:11px;font-weight:500;margin-bottom:5px}.lookup-status{font-size:10px;line-height:1.5;color:#75685d}.lookup-status.busy{color:#8a643a}.lookup-status.ok{color:#4f7148}.lookup-status.warn{color:#8a5a36}\n"
new = "  .cover-draft strong{display:block;font-size:11px;font-weight:500;margin-bottom:5px}.lookup-status{font-size:10px;line-height:1.5;color:#75685d}.lookup-status.busy{color:#8a643a}.lookup-status.ok{color:#4f7148}.lookup-status.warn{color:#8a5a36}.lookup-status.lookup-busy{display:flex;align-items:center;min-height:24px}.lookup-book-spinner{display:inline-block;font-size:20px;line-height:1;transform-origin:center;animation:lookupBookSpin .85s linear infinite}@keyframes lookupBookSpin{to{transform:rotate(360deg)}}\n"
s = replace_once(s, old, new, "spinner CSS")

old = "  function setStatus(msg,kind=''){const el=$x('lookupStatus');el.textContent=msg;el.className=`lookup-status ${kind}`.trim()}\n"
new = "  function setStatus(msg,kind=''){const el=$x('lookupStatus');if(!el)return;if(kind==='busy'){el.innerHTML='<span class=\"lookup-book-spinner\" aria-hidden=\"true\">📖</span>';el.className='lookup-status lookup-busy';el.setAttribute('aria-label','Ricerca dati in corso');return}el.removeAttribute('aria-label');el.textContent=msg;el.className=`lookup-status ${kind}`.trim()}\n  function clearLookupStatus(){const el=$x('lookupStatus');if(!el)return;el.removeAttribute('aria-label');el.textContent='';el.className='lookup-status'}\n"
s = replace_once(s, old, new, "setStatus")

old = r"""    usable.forEach((c,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='cover-choice';btn.innerHTML=`<img src="${c.url}" alt="Copertina ${i+1}"><span>${escapeHtml(c.source)}</span>`;btn.onclick=()=>{setDraftCover(c.url,true);setStatus('Dati trovati. Hai scelto la copertina corretta e ora compare nella bozza del libro.','ok');hidePicker()};box.appendChild(btn)});
    openPicker('Scegli la copertina',`Ho trovato ${usable.length} copertine per ${code}. Seleziona quella della tua edizione.`);return true
"""
new = r"""    usable.forEach((c,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='cover-choice';btn.innerHTML=`<img src="${c.url}" alt="Copertina ${i+1}"><span>${escapeHtml(c.source)}</span>`;btn.onclick=()=>{setDraftCover(c.url,true);clearLookupStatus();hidePicker()};box.appendChild(btn)});
    clearLookupStatus();openPicker('Scegli la copertina',`Ho trovato ${usable.length} copertine per ${code}. Seleziona quella della tua edizione.`);return true
"""
s = replace_once(s, old, new, "cover picker")

old = r"""    if(candidate.serialLevel)setStatus(`ISSN riconosciuto. Ho compilato i dati della testata; ricorda che l'ISSN identifica il periodico, non necessariamente il singolo numero. Controlla titolo e numero dell'uscita.`,'warn');
    else if(!pickerOpened)setStatus(`Dati trovati automaticamente tramite ${typeLabel(type)}. Controlla la bozza e completa solo ciò che manca.`,'ok');
"""
new = r"""    if(candidate.serialLevel)setStatus(`ISSN riconosciuto. Ho compilato i dati della testata; ricorda che l'ISSN identifica il periodico, non necessariamente il singolo numero. Controlla titolo e numero dell'uscita.`,'warn');
    else if(!pickerOpened)clearLookupStatus();
"""
s = replace_once(s, old, new, "applyCandidate status")

old = r"""    setStatus(`Ho trovato ${candidates.length} risultati. Scegli quello corretto nel riquadro aperto sopra la pagina.`,'warn');await showMetadataPicker(candidates,code,type);return {kind:'multiple',count:candidates.length}
"""
new = r"""    clearLookupStatus();await showMetadataPicker(candidates,code,type);return {kind:'multiple',count:candidates.length}
"""
s = replace_once(s, old, new, "multiple candidates status")

old = r"""    if(type==='isbn'&&candidates.length){
      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact
    }
"""
new = r"""    if(type==='isbn'&&candidates.length){
      const exact=candidates.filter(c=>c.exact);if(exact.length)candidates=exact;
      const seriesVerified=candidates.filter(c=>c.saga&&c.author&&!/^(IVA|EAN|ISBN|EUR|SKU)$/i.test(c.author.trim()));if(seriesVerified.length)candidates=seriesVerified
    }
"""
s = replace_once(s, old, new, "exact candidates")
p.write_text(s, encoding="utf-8")


# Cache-busting degli script, mantenendo intatto lo sfondo.
p = Path("bg/bg8.js")
s = p.read_text(encoding="utf-8")
if "isbn-cover.js?v=7" not in s:
    raise SystemExit("isbn cache anchor missing")
if "italian-catalog-fallback-v3.js?v=3" not in s:
    raise SystemExit("catalog cache anchor missing")
s = s.replace("isbn-cover.js?v=7", "isbn-cover.js?v=8", 1)
s = s.replace("italian-catalog-fallback-v3.js?v=3", "italian-catalog-fallback-v3.js?v=4", 1)
p.write_text(s, encoding="utf-8")

p = Path("index.html")
s = p.read_text(encoding="utf-8")
if "bg${i}.js?v=8" not in s:
    raise SystemExit("background loader cache anchor missing")
s = s.replace("bg${i}.js?v=8", "bg${i}.js?v=9", 1)
p.write_text(s, encoding="utf-8")
