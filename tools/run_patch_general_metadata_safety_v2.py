from pathlib import Path
import re

src = Path('tools/patch_general_metadata_safety_v1.py').read_text(encoding='utf-8')
try:
    exec(compile(src, 'tools/patch_general_metadata_safety_v1.py', 'exec'), {})
except SystemExit as exc:
    # La v1 applica prima tutte le correzioni ai parser e fallisce soltanto
    # sul cache-busting per una regexp sovra-escapata. Recuperiamo solo quel caso.
    if 'cache bust bg8 fallito' not in str(exc):
        raise

    p = Path('bg/bg8.js')
    s = p.read_text(encoding='utf-8')
    s, n1 = re.subn(r'italian-catalog-fallback-v3\.js\?v=\d+', 'italian-catalog-fallback-v3.js?v=13', s, count=1)
    s, n2 = re.subn(r'series-relations\.js\?v=\d+', 'series-relations.js?v=7', s, count=1)
    s, n3 = re.subn(r'isbn-cover\.js\?v=\d+', 'isbn-cover.js?v=24', s, count=1)
    if not (n1 == n2 == n3 == 1):
        raise SystemExit(f'cache bust v2 bg8 fallito: {n1=} {n2=} {n3=}')
    p.write_text(s, encoding='utf-8')

    p = Path('index.html')
    s = p.read_text(encoding='utf-8')
    s, n = re.subn(r'bg/bg\$\{i\}\.js\?v=\d+', 'bg/bg${i}.js?v=24', s, count=1)
    if n != 1:
        raise SystemExit('cache bust v2 index fallito')
    p.write_text(s, encoding='utf-8')

print('PATCH_GENERAL_METADATA_SAFETY_V2_OK')
