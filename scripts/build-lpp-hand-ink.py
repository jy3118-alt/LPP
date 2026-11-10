"""Build LPP Hand Ink from Caveat (SIL OFL), adding a BOIL outline axis."""
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
font=instantiateVariableFont(TTFont(root/'font-sources/Caveat-Variable.ttf'),{'wght':600},inplace=True)
options=subset.Options(); options.hinting=False; options.name_IDs=['*']; options.name_legacy=True; options.name_languages=['*']
sub=subset.Subsetter(options=options); sub.populate(unicodes=list(range(0x20,0x250))+list(range(0x2000,0x2070))); sub.subset(font)
for tag in ('STAT','DSIG'):
 if tag in font: del font[tag]
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
  for name_id,value in {1:'LPP Hand Ink',2:'Regular',3:f'LPPHandInk:1.0:{phase}',4:'LPP Hand Ink Regular',6:'LPPHandInk-Regular',16:'LPP Hand Ink',17:'Regular',5:'Version 1.000'}.items():master['name'].setName(value,name_id,3,1,0x409)
  path=Path(temp)/f'master-{phase}.ttf';master.save(path)
  src=SourceDescriptor();src.path=str(path);src.name=f'impression-{phase}';src.familyName='LPP Hand Ink';src.styleName=f'Impression {phase}';src.location={'Ink impression':phase}
  if phase==0:src.copyInfo=src.copyLib=src.copyFeatures=True
  space.addSource(src)
 variable,_,_=build(space);variable.save(root/'web/fonts/lpp-hand-ink.ttf');variable.flavor='woff';variable.save(root/'web/fonts/lpp-hand-ink.woff')
 print('Built LPP Hand Ink:',len(variable.getBestCmap()),'characters, BOIL 0–3')
