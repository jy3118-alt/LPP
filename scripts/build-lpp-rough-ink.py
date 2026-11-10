"""Build LPP Rough Ink from Rock Salt (Apache 2.0), adding a BOIL outline axis."""
from pathlib import Path
from copy import deepcopy
from tempfile import TemporaryDirectory
import hashlib, math
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor
from fontTools.varLib import build

root=Path(__file__).resolve().parents[1]
font=TTFont(root/'font-sources/RockSalt-Regular.ttf')
options=subset.Options(); options.hinting=False; options.name_IDs=['*']; options.name_legacy=True; options.name_languages=['*']
sub=subset.Subsetter(options=options); sub.populate(unicodes=list(range(0x20,0x250))+list(range(0x2000,0x2070))); sub.subset(font)
for tag in ('STAT','DSIG','GPOS','kern'):
 if tag in font: del font[tag]
# Rock Salt is unusually wide; reshape its outlines and advances for phone UI.
for name in font.getGlyphOrder():
 glyph=font['glyf'][name]
 if glyph.isComposite():
  for component in glyph.components:
   if hasattr(component,'x'): component.x=round(component.x*.76)
 elif glyph.numberOfContours>0:
  for i,(x,y) in enumerate(glyph.coordinates): glyph.coordinates[i]=(round(x*.76),y)
  glyph.recalcBounds(font['glyf'])
 advance,lsb=font['hmtx'][name];font['hmtx'][name]=(round(advance*.76),round(lsb*.76))
space=DesignSpaceDocument(); axis=AxisDescriptor(); axis.name='Ink impression';axis.tag='BOIL';axis.minimum=0;axis.default=0;axis.maximum=3;space.addAxis(axis)
with TemporaryDirectory(prefix='lpp-hand-ink-') as temp:
 for phase in range(4):
  master=deepcopy(font)
  for name in master.getGlyphOrder():
   glyph=master['glyf'][name]
   if glyph.isComposite() or glyph.numberOfContours<=0: continue
   salt=int.from_bytes(hashlib.sha256(name.encode()).digest()[:2],'big')/997
   for i,(x,y) in enumerate(glyph.coordinates):
    # Each master has the same points and spacing; only its contour wavers.
    t=salt+phase*2.17
    dx=8*math.sin(x*.034+y*.022+t)+3*math.sin(y*.10+t*2)
    dy=7*math.sin(y*.032-x*.021+t*1.4)+2.5*math.sin(x*.10-t)
    glyph.coordinates[i]=(round(x+dx),round(y+dy))
   glyph.recalcBounds(master['glyf'])
  for record in list(master['name'].names):
   if record.nameID in (1,2,3,4,6,16,17): master['name'].names.remove(record)
  for name_id,value in {1:'LPP Rough Ink',2:'Regular',3:f'LPPRoughInk:1.0:{phase}',4:'LPP Rough Ink Regular',6:'LPPRoughInk-Regular',16:'LPP Rough Ink',17:'Regular',5:'Version 1.000'}.items():master['name'].setName(value,name_id,3,1,0x409)
  path=Path(temp)/f'master-{phase}.ttf';master.save(path)
  src=SourceDescriptor();src.path=str(path);src.name=f'impression-{phase}';src.familyName='LPP Rough Ink';src.styleName=f'Impression {phase}';src.location={'Ink impression':phase}
  if phase==0:src.copyInfo=src.copyLib=src.copyFeatures=True
  space.addSource(src)
 variable,_,_=build(space);variable.save(root/'web/fonts/lpp-rough-ink.ttf');variable.flavor='woff';variable.save(root/'web/fonts/lpp-rough-ink.woff')
 print('Built LPP Rough Ink:',len(variable.getBestCmap()),'characters, BOIL 0–3')
