from pathlib import Path
import re

p = Path('isbn-resilient-fallback-v1.js')
s = p.read_text(encoding='utf-8')

old = "function validTitle(v){const t=clean(v),n=normText(t);if(!t||t.length<2||t.length>220)return false;if(/https?:|www\\.|\\[\\]\\(|^\\W+$/.test(t))return false;if(/^(?:libraccio(?: it)?|ibs|amazon(?: it)?|mondadori(?: store)?|giunti|hoepli|unilibro|eurolibro|thebanco(?: it)?|abebooks|home|catalogo|libri|ricerca|search|just a moment|access denied)$/i.test(n))return false;if(/(?:cookie|carrello|privacy|accedi|registrati|spedizione|servizio clienti|security verification)/i.test(n))return false;return true}"
new = "function validTitle(v){const t=clean(v),n=normText(t);if(!t||t.length<2||t.length>220)return false;if(/https?:|www\\.|\\[\\]\\(|^\\W+$/.test(t))return false;if(/^(?:libraccio(?: it)?|ibs|amazon(?: it)?|mondadori(?: store)?|giunti|hoepli|unilibro|eurolibro|thebanco(?: it)?|abebooks|home|catalogo|libri|ricerca|search|just a moment|access denied)$/i.test(n))return false;if(/^(?:(?:\\d+[,.]?)?\\s*(?:recensioni?|reviews?|ratings?|valutazioni?)|libri universitari|libri scolastici|shopping cart|pronto alla spedizione|esaurito|disponibile|venditori?|condizione|prezzo)$/i.test(n))return false;if(/(?:cookie|carrello|privacy|accedi|registrati|servizio clienti|security verification)/i.test(n))return false;return true}"
if old not in s:
    raise SystemExit('validTitle originale non trovato')
s = s.replace(old, new, 1)

pattern = r"function titleNearCode\(lines\)\{.*?return''\}"
replacement = r'''function titleNearCode(lines){
  for(let i=0;i<lines.length;i++){
    if(!/\b(?:ISBN|EAN)\b/i.test(lines[i]))continue;
    const start=Math.max(0,i-14);
    // Prima scelta: un vero heading di prodotto vicino al codice.
    for(let j=i-1;j>=start;j--){
      const raw=String(lines[j]||''),x=cleanLine(raw),n=normText(x);
      if(!/^\s*#{1,4}\s+/.test(raw)||!x||!validTitle(x))continue;
      if(/^(?:isbn|ean|anno|editore|publisher|autore|author|prezzo|venditori|condizione|categoria|genere|recensioni?|reviews?)\b/i.test(n))continue;
      return cleanCommercialTitle(x)
    }
    // Seconda scelta: testo bibliografico, mai elementi UI o contatori.
    for(let j=i-1;j>=start;j--){
      const x=cleanLine(lines[j]),n=normText(x);if(!x||!validTitle(x))continue;
      if(/^(?:isbn|ean|anno|editore|publisher|autore|author|prezzo|venditori|condizione|categoria|genere|recensioni?|reviews?|libri universitari|libri scolastici)\b/i.test(n))continue;
      if(/^di\s+/i.test(x)||/\b\d{4}\b/.test(x)&&/,/.test(x))continue;
      if(x===x.toUpperCase()&&x.length<45)continue;
      return cleanCommercialTitle(x)
    }
  }
  return''
}'''
s, n = re.subn(pattern, lambda m: replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'titleNearCode sostituito {n} volte')

p.write_text(s, encoding='utf-8')

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')
if 'isbn-resilient-fallback-v1.js?v=1' in h:
    h = h.replace('isbn-resilient-fallback-v1.js?v=1', 'isbn-resilient-fallback-v1.js?v=2', 1)
elif 'isbn-resilient-fallback-v1.js?v=2' not in h:
    raise SystemExit('Tag del modulo resiliente non trovato')
idx.write_text(h, encoding='utf-8')
