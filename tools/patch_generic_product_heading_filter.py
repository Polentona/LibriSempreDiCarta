from pathlib import Path
import re

# Nuovo fallback resiliente: blocca heading UI/commerciali come titoli.
p=Path('isbn-resilient-fallback-v1.js')
s=p.read_text()
old="|just a moment|access denied)$/i.test(n))return false;"
new="|just a moment|access denied|product details|product information|book details|details|dettagli prodotto|informazioni prodotto|dettagli del prodotto|scheda prodotto)$/i.test(n))return false;"
if old not in s:
    raise SystemExit('validTitle anchor non trovato')
s=s.replace(old,new,1)
p.write_text(s)

# Fallback storico: stessa protezione.
p=Path('italian-catalog-fallback-v3.js')
s=p.read_text()
old="|descrizione|sinossi|trama|dettagli|informazioni|recensioni|libro di|un libro di|back to top|torna su|select your cookie preferences|cookie preferences|accessibility|accessibilita|amazon|amazon it|account e liste|resi e ordini|tutte le categorie|tutto|buy now|acquista ora|aggiungi al carrello)$/i.test(n)"
new="|descrizione|sinossi|trama|dettagli|informazioni|recensioni|product details|product information|book details|dettagli prodotto|informazioni prodotto|dettagli del prodotto|scheda prodotto|libro di|un libro di|back to top|torna su|select your cookie preferences|cookie preferences|accessibility|accessibilita|amazon|amazon it|account e liste|resi e ordini|tutte le categorie|tutto|buy now|acquista ora|aggiungi al carrello)$/i.test(n)"
if old not in s:
    raise SystemExit('isNavigationTitle anchor non trovato')
s=s.replace(old,new,1)
p.write_text(s)

# Bump script resilient direttamente in index.
p=Path('index.html')
s=p.read_text()
m=re.search(r'isbn-resilient-fallback-v1\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione resilient non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s)

# Bump catalog fallback via bg8 e bg loader.
p=Path('bg/bg8.js')
s=p.read_text()
m=re.search(r'italian-catalog-fallback-v3\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione catalog fallback non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s)

p=Path('index.html')
s=p.read_text()
m=re.search(r'bg\$\{i\}\.js\?v=(\d+)',s)
if not m: raise SystemExit('versione bg non trovata')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
p.write_text(s)
