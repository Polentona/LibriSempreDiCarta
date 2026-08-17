from pathlib import Path
p=Path('isbn-resilient-fallback-v1.js');s=p.read_text(encoding='utf-8')
old="""  let start=-1;for(let i=0;i<lines.length;i++){if(/^\\s*#{1,3}\\s+/.test(lines[i])&&titleSimilarity(cleaned[i],title)>=.55){start=i;break}}if(start>=0){const out=[];for(let j=start+1;j<Math.min(lines.length,start+45)&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j],n=normText(x);if(!x)continue;if(/^\\s*#{1,3}\\s+/.test(raw)&&out.length&&/(?:caratteristiche|dettagli|autore|conosci l autore|recensioni|acquista)/i.test(n))break;if(/^(?:isbn|isbn cartaceo|isbn ebook|editore|prezzo|pagine|formato|data di uscita|condividi|scegli formato|acquista il libro)$/i.test(n))continue;if(/^\\d{4}$/.test(x)||validAuthor(x))continue;if(x.length<55)continue;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}return''
}
"""
new="""  let start=-1;for(let i=0;i<lines.length;i++){if(/^\\s*#{1,3}\\s+/.test(lines[i])&&titleSimilarity(cleaned[i],title)>=.55){start=i;break}}if(start>=0){const out=[];for(let j=start+1;j<Math.min(lines.length,start+45)&&out.join(' ').length<2600;j++){const raw=lines[j],x=cleaned[j],n=normText(x);if(!x)continue;if(/^\\s*#{1,3}\\s+/.test(raw)&&out.length&&/(?:caratteristiche|dettagli|autore|conosci l autore|recensioni|acquista)/i.test(n))break;if(/^(?:isbn|isbn cartaceo|isbn ebook|editore|prezzo|pagine|formato|data di uscita|condividi|scegli formato|acquista il libro)$/i.test(n))continue;if(/^\\d{4}$/.test(x)||validAuthor(x))continue;if(x.length<55)continue;out.push(x)}const p=cleanPlot(out.join(' '));if(p)return p}
  /* Molti editori, tra cui Rizzoli, mettono la sinossi subito dopo ISBN/EAN senza una heading 'Descrizione'. */
  for(let i=0;i<cleaned.length;i++){
    const n=normText(cleaned[i]);if(!/^(?:isbn(?: cartaceo| ebook)?|ean)(?: |$)/i.test(n)||!/(?:97[89]\\d{10}|\\d{9}[\\dx])/.test(n.replace(/\\s+/g,'')))continue;
    const out=[];
    for(let j=i+1;j<Math.min(lines.length,i+28)&&out.join(' ').length<2600;j++){
      const raw=lines[j],x=cleaned[j],xn=normText(x);if(!x)continue;
      if(/^\\s*#{1,5}\\s+/.test(raw)&&/(?:caratteristiche|dettagli|informazioni|recensioni|conosci l autore|autore|acquista)/i.test(xn))break;
      if(/^(?:editore|prezzo|pagine|formato|data di uscita|isbn|ean|condividi|scegli formato|acquista il libro)$/i.test(xn))continue;
      if(/^\\d{4}$/.test(x)||validAuthor(x)||x.length<55)continue;
      out.push(x)
    }
    const p=cleanPlot(out.join(' '));if(p)return p
  }
  return''
}
"""
if old not in s: raise SystemExit('officialPlot tail block missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('index.html');s=p.read_text(encoding='utf-8').replace('isbn-resilient-fallback-v1.js?v=8','isbn-resilient-fallback-v1.js?v=9').replace('bg${i}.js?v=32','bg${i}.js?v=33');p.write_text(s,encoding='utf-8')
print('official plot structure v9 applied')
