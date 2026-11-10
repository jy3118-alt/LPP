"""Build small, animated LPP letter-form studies derived from Gowun Dodum."""
from pathlib import Path
from tempfile import TemporaryDirectory
from copy import deepcopy
from math import sin,cos,hypot
import hashlib
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.designspaceLib import DesignSpaceDocument,AxisDescriptor,SourceDescriptor
from fontTools.varLib import build
root=Path(__file__).resolve().parents[1];out=root/'web/letter-studies';out.mkdir(exist_ok=True)
source=Path('/Users/scdi/Library/Fonts/GowunDodum-Regular.ttf')
characters='LPP 가나다 마음 음악 느낌 소리 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?' 
f=TTFont(source);opts=subset.Options();opts.hinting=False;opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*'];sub=subset.Subsetter(options=opts);sub.populate(text=characters);sub.subset(f)
for tag in ('STAT','BASE','DSIG','vhea','vmtx'):
 if tag in f:del f[tag]
f.flavor='woff';f.save(out/'original-preview.woff');f.flavor=None

def rename(font,name):
 for rec in list(font['name'].names):
  if rec.nameID in (1,2,3,4,6,16,17):font['name'].names.remove(rec)
 ps=name.replace(' ','')
 for i,value in {1:name,2:'Regular',3:ps+':1.0',4:name+' Regular',6:ps+'-Regular',16:name,17:'Regular',5:'Version 1.000'}.items():font['name'].setName(value,i,3,1,0x409)

def transform(g,variant,phase,salt):
 coords=list(g.coordinates);start=0
 for end in g.endPtsOfContours:
  points=coords[start:end+1];n=len(points)
  for j,(x,y) in enumerate(points):
   a=points[(j-1)%n];b=points[(j+1)%n];tx=b[0]-a[0];ty=b[1]-a[1];length=hypot(tx,ty) or 1
   # TrueType contour direction makes the left normal expand filled ink.
   strength=variant['weight'];nx=-ty/length;ny=tx/length
   wave=sin(y*.009+x*.004+salt)*variant['bend'];x2=(x-500)*variant['width']+500+variant['slant']*(y-300)+wave+strength*nx
   y2=y+sin(x*.008+salt)*variant['lift']+strength*ny
   t=salt+phase*2.17
   dx=variant['jiggle']*(sin(x*.03+y*.018+t)+.25*sin(y*.07+t*1.9))
   dy=variant['jiggle']*.8*(sin(y*.028-x*.02+t*1.3)+.25*sin(x*.07-t))
   g.coordinates[start+j]=(round(x2+dx),round(y2+dy))
  start=end+1

variants=[dict(id='breath',name='LPP Breath Study',weight=8,width=1.06,slant=.015,bend=15,lift=7,jiggle=7),dict(id='flow',name='LPP Flow Study',weight=12,width=.91,slant=.15,bend=26,lift=12,jiggle=9),dict(id='pulse',name='LPP Pulse Study',weight=22,width=.96,slant=-.025,bend=21,lift=14,jiggle=12)]
for variant in variants:
 space=DesignSpaceDocument();axis=AxisDescriptor();axis.name='Ink impression';axis.tag='BOIL';axis.minimum=0;axis.default=0;axis.maximum=3;space.addAxis(axis)
 with TemporaryDirectory(prefix='lpp-study-') as d:
  for phase in range(4):
   master=deepcopy(f)
   for name in master.getGlyphOrder():
    g=master['glyf'][name]
    if g.isComposite() or g.numberOfContours<=0:continue
    salt=int.from_bytes(hashlib.sha256(name.encode()).digest()[:2],'big')/997
    transform(g,variant,phase,salt);g.recalcBounds(master['glyf'])
   rename(master,variant['name']);path=Path(d)/f'{phase}.ttf';master.save(path)
   src=SourceDescriptor();src.path=str(path);src.name=f'phase-{phase}';src.familyName=variant['name'];src.styleName=f'Phase {phase}';src.location={'Ink impression':phase}
   if phase==0:src.copyInfo=src.copyFeatures=src.copyLib=True
   space.addSource(src)
  font,_,_=build(space);rename(font,variant['name']);font.save(out/(variant['id']+'-study.ttf'));font.flavor='woff';font.save(out/(variant['id']+'-study.woff'))
  print(variant['id'],len(font.getBestCmap()),'preview characters',flush=True)
