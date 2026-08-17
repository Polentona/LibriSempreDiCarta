from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if new in s:
        return
    if old not in s:
        raise SystemExit(f'{label}: pattern non trovato in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

# ---------------------------------------------------------------------------
# 1) Catalogo italiano: non sovrascrivere metadati bibliografici validi con
#    frammenti di pagine commerciali e non accettare media audiovisivi come saga.
# ---------------------------------------------------------------------------
p = Path('italian-catalog-fallback-v3.js')
s = p.read_text(encoding='utf-8')

needle = "function normText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}\n"
helper = needle + """function screenMediaNoise(v){
  const n=normText(v);if(!n)return false;
  return /\\b(?:tv|television|televisione|televisivo|televisiva|episodio|episode|episodes|stagione|season|miniserie|mini series|film|movie|cinema|screenplay|teleplay|television play|made for tv|itv|bbc|hbo|netflix|prime video|disney plus|regia|director|starring|cast)\\b/i.test(n)||/\\b(?:s\\d{1,2}e\\d{1,2}|\\d{1,2}x\\d{1,2})\\b/i.test(n)
}
function validBookSeriesName(v){
  const x=cleanLine(v),n=normText(x);
  return !!x&&x.length>=2&&x.length<90&&!screenMediaNoise(x)&&!/^(?:vertigo|narrativa|libri|romanzo|fiction|books?|serie|series|saga|trilogia|trilogy|ciclo)$/i.test(n)
}
"""
if 'function screenMediaNoise(v)' not in s:
    if needle not in s: raise SystemExit('normText non trovato')
    s=s.replace(needle,helper,1)

old="""function validAuthor(v){
  const a=cleanAuthorCandidate(v),n=normText(a);
  if(!a||a.length>140||/\\d|€|%|@|https?:|www\\./i.test(a))return false;
"""
new="""function validAuthor(v){
  const a=cleanAuthorCandidate(v),n=normText(a);
  if(!a||a.length>140||/\\d|€|%|@|https?:|www\\./i.test(a)||screenMediaNoise(a))return false;
"""
if old in s: s=s.replace(old,new,1)

old="if(!x||x.length<2||x.length>90||/^(vertigo|narrativa|libri|romanzo|fiction|books?|serie|saga|trilogia)$/i.test(x))return'';"
new="if(!x||x.length<2||x.length>90||screenMediaNoise(x)||/^(vertigo|narrativa|libri|romanzo|fiction|books?|serie|saga|trilogia)$/i.test(x))return'';"
if old in s: s=s.replace(old,new,1)

old="if(!x||x.length<2||x.length>70)return;\n    const n=normText(x);"
new="if(!x||x.length<2||x.length>70||screenMediaNoise(x))return;\n    const n=normText(x);"
if old in s: s=s.replace(old,new,1)

old="if(!x||x.length<2||x.length>70||/^(?:trilogia|saga|serie|ciclo|series|trilogy)$/i.test(x))return'';"
new="if(!x||x.length<2||x.length>70||screenMediaNoise(x)||/^(?:trilogia|saga|serie|ciclo|series|trilogy)$/i.test(x))return'';"
if old in s: s=s.replace(old,new,1)

# Autore da cataloghi web: un mononimo viene accettato solo se confermato da >=2 pagine.
marker="""function mergeCatalogRecords(records){
  if(!records?.length)return null;
  const out={...records[0]};
  out.author=chooseCatalogField(records,'author',validAuthor)||out.author||'';
  out.saga=chooseCatalogField(records,'saga',v=>v.length>=2&&v.length<90)||out.saga||'';
"""
replacement="""function chooseCatalogAuthor(records){
  const value=chooseCatalogField(records,'author',validAuthor);if(!value)return'';
  const words=cleanAuthorCandidate(value).split(/\\s+/).filter(Boolean);
  if(words.length>1)return value;
  const key=normText(value),count=(records||[]).filter(r=>normText(r?.author||'')===key).length;
  return count>=2?value:''
}
function chooseCatalogSaga(records){
  const groups=new Map();
  for(const r of records||[]){const value=cleanLine(r?.saga||'');if(!validBookSeriesName(value))continue;const key=normText(value),g=groups.get(key)||{value,count:0,score:0};g.count++;g.score+=(r.score||0);groups.set(key,g)}
  const best=[...groups.values()].sort((a,b)=>b.count-a.count||b.score-a.score)[0];
  return best&&best.count>=2?best.value:''
}
function mergeCatalogRecords(records){
  if(!records?.length)return null;
  const out={...records[0]};
  out.author=chooseCatalogAuthor(records);
  out.saga=chooseCatalogSaga(records);
"""
if marker in s: s=s.replace(marker,replacement,1)

old="const direct=[gbSaga,libraccioSaga].filter(Boolean);"
new="const direct=[gbSaga,libraccioSaga].filter(validBookSeriesName);"
if old in s: s=s.replace(old,new,1)

old="""  const v={title:rec.title,seriesName:rec.saga||'',authors:rec.author?[rec.author]:[],publisher:rec.publisher||'',publishedDate:rec.year||'',language:'it',industryIdentifiers:ids,description:rec.description||'',categories:rec.category?[rec.category]:[]};
"""
new="""  const v={title:rec.title,seriesName:validBookSeriesName(rec.saga)?rec.saga:'',authors:rec.author&&validAuthor(rec.author)?[rec.author]:[],publisher:rec.publisher||'',publishedDate:rec.year||'',language:'it',industryIdentifiers:ids,description:rec.description||'',categories:rec.category?[rec.category]:[]};
"""
if old in s: s=s.replace(old,new,1)

old="""    if(rec.saga){v.title=rec.title||v.title;v.subtitle='';v.seriesName=rec.saga}
    else if(rec.title&&!v.title)v.title=rec.title;
    if(rec.author)v.authors=[rec.author];
"""
new="""    if(rec.saga&&validBookSeriesName(rec.saga)){
      if(!v.title&&rec.title)v.title=rec.title;
      if(!v.seriesName)v.seriesName=rec.saga;
    }else if(rec.title&&!v.title)v.title=rec.title;
    const currentAuthors=(v.authors||[]).filter(validAuthor);
    if(currentAuthors.length)v.authors=currentAuthors;
    else if(rec.author&&validAuthor(rec.author))v.authors=[rec.author];
"""
if old not in s and 'const currentAuthors=(v.authors||[]).filter(validAuthor);' not in s:
    raise SystemExit('blocco override Google Books non trovato')
if old in s: s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Motore relazioni: filtra qualsiasi candidato audiovisivo e riconosce
#    continuazioni/sequel espresse in forma narrativa.
# ---------------------------------------------------------------------------
p=Path('series-relations.js')
s=p.read_text(encoding='utf-8')

# Escludi anche domini dedicati a cinema/TV.
s=s.replace("const BAD_HOSTS=/^(?:www\\.)?(?:google\\.[^/]+|bing\\.com|youtube\\.com|youtu\\.be|facebook\\.com|instagram\\.com|tiktok\\.com|pinterest\\.[^/]+|x\\.com|twitter\\.com)$/i;",
            "const BAD_HOSTS=/^(?:www\\.)?(?:google\\.[^/]+|bing\\.com|youtube\\.com|youtu\\.be|facebook\\.com|instagram\\.com|tiktok\\.com|pinterest\\.[^/]+|x\\.com|twitter\\.com|imdb\\.com|themoviedb\\.org|rottentomatoes\\.com|tvguide\\.com|thetvdb\\.com)$/i;")

needle="""function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').replace(/\\s+/g,' ').trim()
}
"""
helper=needle+"""function screenMediaNoise(v){
  const n=norm(v);if(!n)return false;
  return /\\b(?:tv|television|televisione|televisivo|televisiva|episodio|episode|episodes|stagione|season|miniserie|mini series|film|movie|cinema|screenplay|teleplay|television play|made for tv|itv|bbc|hbo|netflix|prime video|disney plus|regia|director|starring|cast)\\b/i.test(n)||/\\b(?:s\\d{1,2}e\\d{1,2}|\\d{1,2}x\\d{1,2})\\b/i.test(n)
}
"""
if 'function screenMediaNoise(v)' not in s:
    if needle not in s: raise SystemExit('norm series-relations non trovato')
    s=s.replace(needle,helper,1)

old="""  x=stripSaga(x,saga);
  x=x.replace(/\\s*[|•]\\s*(?:Amazon|IBS|Libraccio|Mondadori|Giunti|Google Books).*$/i,'').trim();
  return x.length>=2&&x.length<=190?x:''
"""
new="""  x=stripSaga(x,saga);
  x=x.replace(/\\s*[|•]\\s*(?:Amazon|IBS|Libraccio|Mondadori|Giunti|Google Books).*$/i,'').trim();
  if(screenMediaNoise(x))return'';
  return x.length>=2&&x.length<=190?x:''
"""
if old in s: s=s.replace(old,new,1)

old="const n=norm(value);if(!value||value.length<2||value.length>100)return;"
new="const n=norm(value);if(!value||value.length<2||value.length>100||screenMediaNoise(value))return;"
if old in s: s=s.replace(old,new,1)

old="for(const e of evidence||[]){const key=norm(e.value);if(!key)continue;"
new="for(const e of evidence||[]){if(screenMediaNoise(e.value))continue;const key=norm(e.value);if(!key)continue;"
if old in s: s=s.replace(old,new,1)

anchor="""    if(!out.sequel){const mm=p.match(new RegExp(e+'[^.]{0,260}\\\\.\\\\s*Del\\\\s+(?:18|19|20)\\\\d{2}\\\\s+(?:è|e)\\\\s+[\"“”\\']?([^\"“”\\'.;]{3,180})','i'));if(mm)out.sequel=cleanNeighbor(mm[1])}
"""
# The exact source string contains single escaping; use direct literal search fallback below.
insert_lines="""    if(!out.sequel){const mm=p.match(new RegExp(e+'[^.]{0,180}?(?:continua|continuano|prosegue|proseguono)\\\\s+(?:nel|con\\\\s+il|con|in)\\\\s+(?:romanzo|libro)\\\\s+[\"“”\\']?([^\"“”\\'.;]{3,180})','i'));if(mm)out.sequel=cleanNeighbor(mm[1])}
    if(!out.sequel){const mm=p.match(new RegExp('[\"“”\\']?([A-ZÀ-ÖØ-Ý][^\"“”\\'.;]{2,140})[\"“”\\']?\\\\s*(?:,|-|–|—)?\\\\s*(?:il\\\\s+)?(?:sequel|seguito|follow-up)\\\\s+(?:di|del|della|to)\\\\s+(?:the\\\\s+)?'+e,'i'));if(mm)out.sequel=cleanNeighbor(mm[1])}
"""
if 'continua|continuano|prosegue|proseguono' not in s:
    target="    if(!out.prequel){const mm=p.match(new RegExp('[\"“”\\']?([^\"“”\\'.;]{3,180})[\"“”\\']?\\\\.\\\\s*(?:A questo|A esso|Al quale)\\\\s+(?:è|e)\\\\s+seguito\\\\s+'+e,'i'));if(mm)out.prequel=cleanNeighbor(mm[1])}\n"
    if target not in s: raise SystemExit('punto inserimento parseExplicitNeighbors non trovato')
    s=s.replace(target,insert_lines+target,1)

# Nuova query generica esplicita sul seguito, utile per fonti editoriali.
old="`\\\"${base}\\\" \\\"${author}\\\" sequel prequel seguito preceduto`,"
# nothing needed if not exact; existing query already has sequel/prequel.

p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Form ISBN: ultimo filtro prima di mostrare i dati + pulizia dei suffissi
#    commerciali/volume dal titolo.
# ---------------------------------------------------------------------------
p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
needle="  function normalizeText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}\n"
helper=needle+"""  function screenMediaNoise(v){
    const n=normalizeText(v);if(!n)return false;
    return /\\b(?:tv|television|televisione|televisivo|televisiva|episodio|episode|episodes|stagione|season|miniserie|mini series|film|movie|cinema|screenplay|teleplay|television play|made for tv|itv|bbc|hbo|netflix|prime video|disney plus|regia|director|starring|cast)\\b/i.test(n)||/\\b(?:s\\d{1,2}e\\d{1,2}|\\d{1,2}x\\d{1,2})\\b/i.test(n)
  }
  function safeBookRelation(v){const x=String(v||'').replace(/\\s+/g,' ').trim();return x&&!screenMediaNoise(x)?x:''}
  function cleanCatalogTitle(v){
    let t=String(v||'').replace(/\\s+/g,' ').trim();if(!t)return'';
    t=t.replace(/\\s*[:|]\\s*[^:|]{0,220}\\bAmazon(?:\\.it)?\\b.*$/i,'').trim();
    t=t.replace(/\\s*[|]\\s*(?:Amazon|IBS|Libraccio|Mondadori|Giunti|Google Books).*$/i,'').trim();
    t=t.replace(/\\s*[([]\\s*(?:vol\\.?|volume)\\s*\\.?\\s*#?\\s*\\d{1,3}\\s*[)\\]]\\s*$/i,'').trim();
    t=t.replace(/\\s*(?:[-–—,:]\\s*)?(?:vol\\.?|volume)\\s*\\.?\\s*#?\\s*\\d{1,3}\\s*$/i,'').trim();
    return t
  }
"""
if 'function safeBookRelation(v)' not in s:
    if needle not in s: raise SystemExit('normalizeText isbn-cover non trovato')
    s=s.replace(needle,helper,1)

old="""    c.saga=String(c.saga||'').trim();c.prequel=String(c.prequel||'').trim();c.sequel=String(c.sequel||'').trim();
    c.title=seriesTitleWithSagaFirst(c.title,c.saga);
"""
new="""    c.saga=safeBookRelation(c.saga);c.prequel=safeBookRelation(c.prequel);c.sequel=safeBookRelation(c.sequel);
    c.title=cleanCatalogTitle(seriesTitleWithSagaFirst(c.title,c.saga));
"""
if old in s: s=s.replace(old,new,1)

# Sanitize every relation assignment coming from remote resolvers.
s=s.replace("candidate.saga=String(localRel.saga).trim();setAutoField('editSaga',candidate.saga,true)","candidate.saga=safeBookRelation(localRel.saga);setAutoField('editSaga',candidate.saga,true)")
s=s.replace("candidate.prequel=String(localRel.prequel||'').trim();","candidate.prequel=safeBookRelation(localRel.prequel);")
s=s.replace("candidate.sequel=String(localRel.sequel||'').trim();","candidate.sequel=safeBookRelation(localRel.sequel);")
s=s.replace("candidate.prequel=String(rel0.prequel).trim();setAutoField('editPrequel',candidate.prequel,true)","candidate.prequel=safeBookRelation(rel0.prequel);setAutoField('editPrequel',candidate.prequel,true)")
s=s.replace("candidate.sequel=String(rel0.sequel).trim();setAutoField('editSequel',candidate.sequel,true)","candidate.sequel=safeBookRelation(rel0.sequel);setAutoField('editSequel',candidate.sequel,true)")
s=s.replace("candidate.saga=String(rel.saga||'').trim();","candidate.saga=safeBookRelation(rel.saga);")
s=s.replace("candidate.prequel=String(rel?.prequel||'').trim();","candidate.prequel=safeBookRelation(rel?.prequel);")
s=s.replace("candidate.sequel=String(rel?.sequel||'').trim();","candidate.sequel=safeBookRelation(rel?.sequel);")
s=s.replace("candidate.saga=String(rel2.saga).trim();setAutoField('editSaga',candidate.saga,true)","candidate.saga=safeBookRelation(rel2.saga);setAutoField('editSaga',candidate.saga,true)")
s=s.replace("candidate.prequel=String(rel2.prequel).trim();setAutoField('editPrequel',candidate.prequel,true)","candidate.prequel=safeBookRelation(rel2.prequel);setAutoField('editPrequel',candidate.prequel,true)")
s=s.replace("candidate.sequel=String(rel2.sequel).trim();setAutoField('editSequel',candidate.sequel,true)","candidate.sequel=safeBookRelation(rel2.sequel);setAutoField('editSequel',candidate.sequel,true)")

p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# 4) Cache bust: forza il browser a usare davvero i file corretti.
# ---------------------------------------------------------------------------
p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
s,n1=re.subn(r"italian-catalog-fallback-v3\\.js\\?v=\\d+","italian-catalog-fallback-v3.js?v=13",s,count=1)
s,n2=re.subn(r"series-relations\\.js\\?v=\\d+","series-relations.js?v=7",s,count=1)
s,n3=re.subn(r"isbn-cover\\.js\\?v=\\d+","isbn-cover.js?v=24",s,count=1)
if not (n1==n2==n3==1): raise SystemExit(f'cache bust bg8 fallito {n1=} {n2=} {n3=}')
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
s,n=re.subn(r"bg/bg\\$\\{i\\}\\.js\\?v=\\d+","bg/bg${i}.js?v=24",s,count=1)
if n!=1: raise SystemExit('cache bust index fallito')
p.write_text(s,encoding='utf-8')

print('PATCH_GENERAL_METADATA_SAFETY_OK')
