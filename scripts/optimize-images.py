"""Generate responsive WebP assets from retained originals (requires Pillow).
Run from repository root. Existing responsive markup makes this safe to rerun.
"""
from pathlib import Path
from PIL import Image, ImageOps
import re, json
root=Path('.')
with Image.open('assets/images/logo-transparent.png') as logo:
    cropped=logo.crop(logo.getbbox())
    cropped.thumbnail((750,400))
    cropped.save('assets/images/logo-cropped.webp',lossless=True)
with Image.open('favicon-512.png') as icon:
    for size,name in [(32,'favicon-32.png'),(180,'apple-touch-icon.png')]:
        resized=icon.copy()
        resized.thumbnail((size,size))
        resized.save(name,optimize=True)
    icon.save('favicon-small.ico',sizes=[(16,16),(32,32),(48,48)])
used=set()
for page in root.glob('*.html'):
    used.update(re.findall(r'(?:src|data-full)="(assets/images/[^\"]+\.(?:jpg|jpeg))"',page.read_text(encoding='utf-8')))
variants={}
for name in sorted(used):
    source=Path(name)
    with Image.open(source) as original:
        im=ImageOps.exif_transpose(original).convert('RGB')
        output=Path('assets/images/optimized')/source.relative_to('assets/images').with_suffix('')
        output.parent.mkdir(parents=True,exist_ok=True)
        sizes=sorted(set([min(im.width,w) for w in [480,960,1440]]))
        candidates=[]
        for width in sizes:
            target=Path(str(output)+f'-{width}.webp')
            quality=78 if source.name=='hero-bathroom.jpg' and width>=1440 else 85
            im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS).save(target,quality=quality,method=6)
            candidates.append((target.as_posix(),width))
        full=Path(str(output)+'-full.webp')
        im.save(full,quality=90,method=6)
        # Keep original full image when WebP does not reduce its payload.
        full_path=full.as_posix() if full.stat().st_size<source.stat().st_size else source.as_posix()
        if full_path==source.as_posix(): full.unlink()
        variants[name]={'width':im.width,'height':im.height,'candidates':candidates,'full':full_path,'original_bytes':source.stat().st_size,'largest_variant_bytes':Path(candidates[-1][0]).stat().st_size}
for page in root.glob('*.html'):
    s=page.read_text(encoding='utf-8')
    def image_tag(match):
        tag=match[0]
        src=re.search(r'src="([^"]+)"',tag)
        if not src or src[1] not in variants: return tag
        v=variants[src[1]]
        tag=re.sub(r' (width|height|srcset|sizes|loading|decoding|fetchpriority)="[^"]*"','',tag)
        hero='hero-bathroom' in src[1]
        gallery=page.name=='projects.html'
        sizes='(max-width: 900px) 94vw, 53vw' if hero else ('(max-width: 700px) 94vw, (max-width: 1100px) 46vw, 31vw' if gallery else '(max-width: 650px) 94vw, (max-width: 900px) 46vw, 48vw')
        attrs=f' width="{v["width"]}" height="{v["height"]}" srcset="'+', '.join(f'{p} {w}w' for p,w in v['candidates'])+f'" sizes="{sizes}"'
        attrs+=' fetchpriority="high"' if hero else ' loading="lazy" decoding="async"'
        return tag[:-1]+attrs+'>'
    s=re.sub(r'<img\b[^>]*>',image_tag,s)
    for name,v in variants.items(): s=s.replace(f'data-full="{name}"',f'data-full="{v["full"]}"')
    page.write_text(s,encoding='utf-8',newline='\n')
with Image.open('assets/images/hero-bathroom.jpg') as im:
    ImageOps.fit(im,(1200,630),method=Image.Resampling.LANCZOS,centering=(.5,.45)).save('assets/images/social-share.jpg',quality=88,optimize=True)
Path('.audit').mkdir(exist_ok=True)
Path('.audit/image-metrics.json').write_text(json.dumps(variants,indent=2),encoding='utf-8')
print(f'Generated responsive images for {len(variants)} original photographs.')
