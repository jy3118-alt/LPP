"""Soften PoVF's geometric face outlines without changing its emotion axes."""
from pathlib import Path
from math import sin
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
f=TTFont(root/'web/fonts/PoVF.ttf');g=f['glyf']['uni110B']
for i,(x,y) in enumerate(g.coordinates):
 dx=6*sin(x*.024+y*.020)+2*sin(y*.045-x*.013)
 dy=5.5*sin(y*.023-x*.019)+2*sin(x*.046+y*.014)
 g.coordinates[i]=(round(x+dx),round(y+dy))
g.recalcBounds(f['glyf'])
for rec in f['name'].names:
 if rec.nameID in (1,4,6,16):
  value={1:'LPP Feeling Ink',4:'LPP Feeling Ink',6:'LPPFeelingInk',16:'LPP Feeling Ink'}[rec.nameID]
  try:rec.string=value.encode(rec.getEncoding())
  except (UnicodeEncodeError,LookupError):pass
f.save(root/'web/fonts/PoVF-ink.ttf')
print('Built feeling face:',len(f['fvar'].axes),'emotion axes preserved')
