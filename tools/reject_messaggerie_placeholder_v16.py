from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="""  function trustedEanCoverCheck(url){return new Promise(resolve=>{\n    const img=new Image();let done=false;\n    const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish({ok:false,reason:'timeout'}),6500);\n    img.onerror=()=>finish({ok:false,reason:'load'});\n    img.onload=()=>{const w=img.naturalWidth,h=img.naturalHeight,ratio=w/Math.max(1,h);finish({ok:w>=100&&h>=150&&ratio>=0.43&&ratio<=0.86,reason:'trusted-ean-ratio',w,h,ratio})};\n    img.src=secureUrl(url)\n  })}\n"""
new="""  function trustedEanCoverCheck(url){return new Promise(resolve=>{\n    const direct=new Image();let done=false;\n    const finish=v=>{if(done)return;done=true;clearTimeout(totalTimer);resolve(v)};\n    const totalTimer=setTimeout(()=>finish({ok:false,reason:'ean-check-timeout'}),7000);\n    direct.onerror=()=>finish({ok:false,reason:'load'});\n    direct.onload=()=>{\n      const w=direct.naturalWidth,h=direct.naturalHeight,ratio=w/Math.max(1,h);\n      if(!(w>=100&&h>=150&&ratio>=0.43&&ratio<=0.86))return finish({ok:false,reason:'ratio',w,h,ratio});\n      const probe=new Image();probe.crossOrigin='anonymous';let probeDone=false;\n      const stopProbe=v=>{if(probeDone)return;probeDone=true;clearTimeout(probeTimer);finish(v)};\n      const probeTimer=setTimeout(()=>stopProbe({ok:false,reason:'ean-content-unverified',w,h,ratio}),2800);\n      probe.onerror=()=>stopProbe({ok:false,reason:'ean-content-unverified',w,h,ratio});\n      probe.onload=()=>{\n        try{\n          const cw=36,ch=48,cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(probe,0,0,cw,ch);const d=ctx.getImageData(0,0,cw,ch).data;\n          let white=0,blue=0,other=0,dark=0,total=0;\n          for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];total++;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);\n            if(r>235&&g>235&&b>235){white++;continue}\n            if(mx<105)dark++;\n            const isBlue=b>80&&b>r*1.18&&b>g*1.05&&(mx-mn)>28;\n            if(isBlue)blue++;else if(mx<225||mn<205)other++;\n          }\n          const whiteFrac=white/total,blueFrac=blue/total,otherFrac=other/total,darkFrac=dark/total;\n          const placeholder=whiteFrac>0.58&&blueFrac>0.035&&otherFrac<0.09&&darkFrac<0.20;\n          return stopProbe({ok:!placeholder,reason:placeholder?'messaggerie-placeholder':'trusted-ean-content',w,h,ratio,whiteFrac,blueFrac,otherFrac,darkFrac});\n        }catch(e){return stopProbe({ok:false,reason:'ean-content-unverified',w,h,ratio})}\n      };\n      probe.src=coverProbeUrl(url);\n    };\n    direct.src=secureUrl(url)\n  })}\n"""
if old not in s:
    raise SystemExit('trustedEanCoverCheck block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
t=idx.read_text(encoding='utf-8')
t=t.replace('isbn-cover.js?v=20260817-15','isbn-cover.js?v=20260817-16')
idx.write_text(t,encoding='utf-8')
print('DONE placeholder v16')
