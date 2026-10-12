"""Static audit checks. Run from repository root with Python 3 and Git."""
from pathlib import Path
import subprocess, re, json, xml.etree.ElementTree as ET
from html.parser import HTMLParser
BASE='https://tselegacytileworks.com/'
def original(path):
    return subprocess.check_output(['git','show','d50eee5:'+path]).decode('utf-8').replace('\r\n','\n')
contact=Path('contact.html').read_text(encoding='utf-8')
assert 'action="send-estimate.php" method="post"' in contact
assert 'novalidate' not in contact
js=Path('js/main.js').read_text(encoding='utf-8')
assert 'mailto:' not in js
assert "Cameron@tselegacytileworks.com" in Path('send-estimate.php').read_text()
assert Path('_site/send-estimate.php').read_bytes()==Path('send-estimate.php').read_bytes()
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
assert 'Sitemap: '+BASE+'sitemap.xml' in Path('robots.txt').read_text()
for source, route in routes.items():
    source_text=Path(source).read_text(encoding='utf-8')
    built_text=(Path('_site')/route/'index.html').read_text(encoding='utf-8')
    for text in (source_text,built_text):
        assert '<link rel="canonical" href="'+BASE+route+'">' in text,source
        assert '<meta property="og:url" content="'+BASE+route+'">' in text,source
        assert 'ninjabearstudios.github.io' not in text,source
for page in Path('_site').rglob('*.html'):
    assert 'ninjabearstudios.github.io' not in page.read_text(encoding='utf-8'),page
assert Path('_site/robots.txt').read_bytes()==Path('robots.txt').read_bytes()
assert Path('_site/sitemap.xml').read_bytes()==Path('sitemap.xml').read_bytes()
# Source photography and artwork remain available, unchanged.
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=DMRT','d50eee5','--','assets','favicon.ico','favicon-512.png']).decode()
assert not changed.strip(),changed
assert re.search(r'<form[\s\S]*?</form>',Path('_site/contact/index.html').read_text(encoding='utf-8'))[0]==re.search(r'<form[\s\S]*?</form>',contact)[0].replace('action="send-estimate.php"','action="../send-estimate.php"')
print('PASS: POST form/build endpoint, preserved base styles and source assets, sitemap, JSON-LD syntax, IDs, and alt attributes.')
