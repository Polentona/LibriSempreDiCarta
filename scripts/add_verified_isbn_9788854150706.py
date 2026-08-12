from pathlib import Path

p=Path('isbn-cover.js')
s=p.read_text(encoding='utf-8')
old="""  const VERIFIED_UI_COVERS={'9788854147317':'assets/covers/9788854147317.jpg','8854147311':'assets/covers/9788854147317.jpg'};
  function verifiedUiCover(code){const u=VERIFIED_UI_COVERS[normalizeLoose(code)];return u?absoluteCoverUrl(u):''}
"""
new="""  const VERIFIED_UI_COVERS={'9788854147317':'assets/covers/9788854147317.jpg','8854147311':'assets/covers/9788854147317.jpg'};
  const VERIFIED_BOOK_METADATA={
    '9788854150706':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'},
    '8854150703':{title:'Sarà per sempre',saga:'Baciata da un angelo',author:'Elizabeth Chandler'}
  };
  function verifiedUiCover(code){const u=VERIFIED_UI_COVERS[normalizeLoose(code)];return u?absoluteCoverUrl(u):''}
  function verifiedBookMetadata(code){return VERIFIED_BOOK_METADATA[normalizeLoose(code)]||null}
"""
if old not in s: raise SystemExit('verified metadata anchor missing')
s=s.replace(old,new,1)
old="""  async function applyCandidate(candidate,code,type){
    candidate=await enrichOpenLibrary(candidate);
    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);
"""
new="""  async function applyCandidate(candidate,code,type){
    candidate=await enrichOpenLibrary(candidate);
    const verifiedMeta=verifiedBookMetadata(code);if(verifiedMeta)candidate={...candidate,...verifiedMeta};
    setAutoField('editTitle',candidate.title);setAutoField('editSaga',candidate.saga);setAutoField('editAuthor',candidate.author);setAutoField('editPlot',candidate.description);setAutoField('editCategory',candidate.category);setAutoField('editPublisher',candidate.publisher);setAutoField('editPublishedDate',candidate.publishedDate);
"""
if old not in s: raise SystemExit('applyCandidate anchor missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('bg/bg8.js')
s=p.read_text(encoding='utf-8')
if 'isbn-cover.js?v=8' not in s: raise SystemExit('isbn loader version missing')
s=s.replace('isbn-cover.js?v=8','isbn-cover.js?v=9',1)
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'bg${i}.js?v=9' not in s: raise SystemExit('background cache version missing')
s=s.replace('bg${i}.js?v=9','bg${i}.js?v=10',1)
p.write_text(s,encoding='utf-8')
