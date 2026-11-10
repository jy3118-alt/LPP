"""Soften PoVF's geometric face outlines without changing its emotion axes."""
from pathlib import Path
from math import sin
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
f=TTFont(root/'web/fonts/PoVF.ttf');g=f['glyf']['uni110B']
for i,(x,y) in enumerate(g.coordinates):
 dx=3.8*sin(x*.035+y*.025)+1.5*sin(y*.08-x*.013)
 dy=3.4*sin(y*.033-x*.021)+1.3*sin(x*.09+y*.014)
 g.coordinates[i]=(round(x+dx),round(y+dy))
g.recalcBounds(f['glyf'])
for rec in f['name'].names:
 if rec.nameID in (1,4,6,16):
  value={1:'LPP Feeling Ink',4:'LPP Feeling Ink',6:'LPPFeelingInk',16:'LPP Feeling Ink'}[rec.nameID]
  try:rec.string=value.encode(rec.getEncoding())
  except (UnicodeEncodeError,LookupError):pass
f.save(root/'web/fonts/PoVF-ink.ttf')
print('Built feeling face:',len(f['fvar'].axes),'emotion axes preserved')
