from pathlib import Path
p=Path('series-universal-resolver-v1.js')
s=p.read_text(encoding='utf-8')
old="for(const line of s.lines){if(/^\\s*[#*]+\\s+/.test(line))list.push(line)}"
new="for(const line of s.lines){if(/^\\s*[#*]+(?=\\s|''|\\[\\[|[A-Za-zÀ-ÿ])/.test(line))list.push(line)}"
if s.count(old)!=1: raise SystemExit(f'anchor lista trovato {s.count(old)} volte')
p.write_text(s.replace(old,new,1),encoding='utf-8')
idx=Path('index.html'); h=idx.read_text(encoding='utf-8')
old2='<script src="series-universal-resolver-v1.js?v=2"></script>'
new2='<script src="series-universal-resolver-v1.js?v=5"></script>'
if h.count(old2)!=1: raise SystemExit(f'cache anchor trovato {h.count(old2)} volte')
idx.write_text(h.replace(old2,new2,1),encoding='utf-8')
print('DONE')
