"""Static audit checks. Run from repository root with Python 3 and Git."""
from pathlib import Path
import subprocess, re, json, xml.etree.ElementTree as ET
from html.parser import HTMLParser
BASE='https://ninjabearstudios.github.io/TSE-Legacy-TileWorks-Design/'
def original(path):
    return subprocess.check_output(['git','show','d50eee5:'+path]).decode('utf-8').replace('\r\n','\n')
contact=Path('contact.html').read_text(encoding='utf-8')
assert re.search(r'<form[\s\S]*?</form>',contact)[0]==re.search(r'<form[\s\S]*?</form>',original('contact.html'))[0]
js=Path('js/main.js').read_text(encoding='utf-8'); old=original('js/main.js')
def form_handler(s): return s[s.index('const form ='):s.index('const year =')]
assert form_handler(js)==form_handler(old)
assert Path('css/styles.css').read_text(encoding='utf-8').startswith(original('css/styles.css'))
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.alts=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='img': self.alts.append('alt' in a)
for p in Path('.').glob('*.html'):
    s=p.read_text(encoding='utf-8'); parsed=Page(); parsed.feed(s)
    assert len(parsed.ids)==len(set(parsed.ids)),p
    assert all(parsed.alts),p
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s):
        data=json.loads(raw); assert data['@context']=='https://schema.org'
        assert not re.search(r'aggregateRating|reviewRating|openingHours|areaServed|address',raw)
urls=[el.text for el in ET.parse('sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
routes=json.loads(Path('scripts/routes.json').read_text())
expected={BASE+route for route in routes.values()}
assert len(urls)==11 and set(urls)==expected
assert 'Disallow:' not in Path('robots.txt').read_text()
# Source photography and artwork remain available, unchanged.
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=DMRT','d50eee5','--','assets','favicon.ico','favicon-512.png']).decode()
assert not changed.strip(),changed
assert re.search(r'<form[\s\S]*?</form>',Path('_site/contact/index.html').read_text(encoding='utf-8'))[0]==re.search(r'<form[\s\S]*?</form>',contact)[0]
print('PASS: original form markup/handler/styles, source assets, sitemap, JSON-LD syntax, IDs, and alt attributes.')
