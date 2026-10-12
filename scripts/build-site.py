"""Build directory-index URLs and backward-compatible legacy redirects.
Run: python scripts/build-site.py. Output: _site (serve this directory locally).
"""
from pathlib import Path
import json,re,shutil,html
ROOT=Path(__file__).resolve().parent.parent
ROUTES=json.loads((ROOT/'scripts/routes.json').read_text())
OUT=ROOT/'_site'
OUT.mkdir(exist_ok=True)
for folder in ('assets','css','js'):
    shutil.copytree(ROOT/folder,OUT/folder,dirs_exist_ok=True)
for name in ('favicon-small.ico','favicon-32.png','apple-touch-icon.png','robots.txt','sitemap.xml','send-estimate.php','.user.ini'):
    shutil.copy2(ROOT/name,OUT/name)
for source,route in ROUTES.items():
    content=(ROOT/source).read_text(encoding='utf-8')
    if route:
        # Preserve fragments on this page; rebase only relative file/link attributes.
        def attribute(match):
            name,value=match.groups()
            if name=='srcset':
                value=', '.join('../'+candidate.strip() for candidate in value.split(','))
            elif value and not value.startswith(('#','/','https:','http:','mailto:','tel:','data:')):
                value='../'+value
            return name+'="'+value+'"'
        content=re.sub(r'\b(href|src|srcset|data-full|action)="([^"]*)"',attribute,content)
    target=OUT/route/'index.html'
    target.parent.mkdir(exist_ok=True)
    target.write_text(content,encoding='utf-8',newline='\n')
    if route:
        destination='./'+route
        canonical='https://tselegacytileworks.com/'+route
        # JS preserves query/filter and anchor state. Meta refresh and link support no-JS visitors.
        redirect='''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Page moved | Legacy TileWorks</title>
<link rel="canonical" href="CANONICAL">
<script>location.replace(DESTINATION + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0;url=DESTINATION_TEXT">
</head><body><p>This page has moved. <a href="DESTINATION_TEXT">Continue to Legacy TileWorks</a>.</p></body></html>
'''.replace('CANONICAL',html.escape(canonical)).replace('DESTINATION_TEXT',destination).replace('DESTINATION',json.dumps(destination))
        (OUT/source).write_text(redirect,encoding='utf-8',newline='\n')
print('Built 11 clean pages and 10 legacy redirects in _site.')
