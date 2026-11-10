"""Prepare the selected Wave Korean variable font as lazy, offline-ready subsets."""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from fontTools import subset
from fontTools.ttLib import TTFont

root=Path(__file__).resolve().parents[1];directory=root/'web/fonts'
with ZipFile(root/'web/font-lab/wave-fonts.zip') as archive:raw=archive.read('wave-korean.ttf')
font=TTFont(BytesIO(raw)); cmap=font.getBestCmap()
assert all(cp in cmap for cp in range(0xAC00,0xD7A4))
ranges=[(0x3131,0x3163,'wave-jamo')]+[(a,min(a+0x1ff,0xD7A3),f'wave-kr-{a:04x}') for a in range(0xAC00,0xD7A4,0x200)]
css=["@font-face{font-family:'LPP Wave Latin';src:url('lpp-hand-ink.woff') format('woff');font-style:normal;font-weight:100 900;font-display:swap;unicode-range:U+0000-024F,U+2000-206F}"]
for lo,hi,name in ranges:
 f=TTFont(BytesIO(raw));options=subset.Options();options.hinting=False;options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];sub=subset.Subsetter(options=options);sub.populate(unicodes=range(lo,hi+1));sub.subset(f);f.flavor='woff';f.save(directory/(name+'.woff'))
 css.append(f"@font-face{{font-family:'LPP Wave Korean';src:url('{name}.woff') format('woff');font-style:normal;font-weight:100 900;font-display:swap;unicode-range:U+{lo:04X}-{hi:04X}}}")
 print(name,hi-lo+1,flush=True)
(directory/'wave.css').write_text('\n'.join(css)+'\n')
