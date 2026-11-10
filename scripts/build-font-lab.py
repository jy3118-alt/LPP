"""Build three full-Korean/Latin animated font experiments and small specimens."""
from pathlib import Path
from copy import deepcopy
from tempfile import TemporaryDirectory
import hashlib, json, math, zipfile
from fontTools import subset
from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor
from fontTools.ttLib import TTFont
from fontTools.varLib import build
from fontTools.varLib.instancer import instantiateVariableFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'web/font-lab';OUT.mkdir(parents=True,exist_ok=True)
KOREAN=range(0xAC00,0xD7A4)
CHARS=set(KOREAN)|set(range(0x20,0x7F))|set(range(0x3131,0x3164))|set(range(0x2000,0x2070))
# Specimens support the on-screen copy and a useful set of real LPP titles.
SAMPLE='한글은소리와감정이되어흐릅니다말로다못한마음음악을듣는순간우리지글움직이는노래기록고개를들어라눈부셔두고간것봐줄만하다고요시차빈집에불켜지면내구끝조금더정해ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:;\'"-—'

# Include every glyph used by the comparison page and its preset phrases.
if (OUT/'index.html').exists(): SAMPLE += (OUT/'index.html').read_text()

def rename(f,family):
 for rec in list(f['name'].names):
  if rec.nameID in (1,2,3,4,6,16,17):f['name'].names.remove(rec)
 post=family.replace(' ','')
 for k,v in {1:family,2:'Regular',3:post+':1.0',4:family+' Regular',6:post+'-Regular',16:family,17:'Regular',5:'Version 1.000'}.items():f['name'].setName(v,k,3,1,0x409)

def small_specimen(font,path):
 f=deepcopy(font);opts=subset.Options();opts.hinting=False;opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*']
 ss=subset.Subsetter(options=opts);ss.populate(text=SAMPLE);ss.subset(f);f.flavor='woff';f.save(path)

def build_from(source,family,gain,phase_shift):
 font=TTFont(source)
 if 'fvar' in font:font=instantiateVariableFont(font,{'wght':600},inplace=True)
 opts=subset.Options();opts.hinting=False;opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*']
 ss=subset.Subsetter(options=opts);ss.populate(unicodes=CHARS);ss.subset(font)
 for tag in ['STAT','DSIG','BASE','vhea','vmtx']:
  if tag in font:del font[tag]
 space=DesignSpaceDocument();axis=AxisDescriptor();axis.name='Ink impression';axis.tag='BOIL';axis.minimum=0;axis.default=0;axis.maximum=3;space.addAxis(axis)
 with TemporaryDirectory(prefix='lpp-font-lab-') as temp:
  for phase in range(4):
   f=deepcopy(font)
   for name in f.getGlyphOrder():
    g=f['glyf'][name]
    if g.isComposite() or g.numberOfContours<=0:continue
    salt=int.from_bytes(hashlib.sha256(name.encode()).digest()[:2],'big')/997
    for i,(x,y) in enumerate(g.coordinates):
     t=salt+phase*2.17+phase_shift
     dx=gain*(math.sin(x*.027+y*.021+t)+.3*math.sin(y*.073+t*1.9))
     dy=gain*.8*(math.sin(y*.029-x*.019+t*1.3)+.3*math.sin(x*.07-t))
     g.coordinates[i]=(round(x+dx),round(y+dy))
    g.recalcBounds(f['glyf'])
   rename(f,family);path=Path(temp)/f'master-{phase}.ttf';f.save(path)
   sd=SourceDescriptor();sd.path=str(path);sd.name=f'phase-{phase}';sd.familyName=family;sd.styleName=f'Phase {phase}';sd.location={'Ink impression':phase}
   if phase==0:sd.copyInfo=sd.copyFeatures=sd.copyLib=True
   space.addSource(sd);print(f'{family}: master {phase+1}/4',flush=True)
  result,_,_=build(space);rename(result,family);return result

def archive(label,krfont,english,origin):
 ttf=OUT/f'{label}-korean.ttf';krfont.save(ttf)
 small_specimen(krfont,OUT/f'{label}-korean-preview.woff')
 readme=f'''LPP {label.title()} — prototype variable font pair\n\nKorean base: {origin} (SIL Open Font License 1.1).\nLatin companion: {'Caveat' if label=='wave' else 'Rock Salt' if label=='grain' else 'LPP Pulse Korean Latin glyphs'}; see included license files.\nBoth are derivatives, not typefaces drawn from scratch. They include an animated BOIL axis from 0 to 3. Korean covers all 11,172 modern precomposed Hangul syllables.\n'''
 with zipfile.ZipFile(OUT/f'{label}-fonts.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  z.write(ttf,ttf.name)
  if english:z.write(ROOT/english,Path(english).name)
  z.writestr('README.txt',readme);z.write(ROOT/'web/fonts/OFL.txt','OFL.txt')
  if label=='wave':z.write(ROOT/'font-sources/OFL-Caveat.txt','OFL-Caveat.txt')
  if label=='grain':z.write(ROOT/'font-sources/LICENSE-RockSalt.txt','LICENSE-RockSalt.txt')
 ttf.unlink();print(f'{label}: packaged',flush=True)

wave=build_from('/Users/scdi/Library/Fonts/GowunDodum-Regular.ttf','LPP Wave Korean',7,.4)
archive('wave',wave,'web/fonts/lpp-hand-ink.ttf','Gowun Dodum');del wave
pulse=build_from('/Users/scdi/Documents/ChatGPT/TAPtoTALK/font/NotoSansKR-VariableFont_wght.ttf','LPP Pulse Korean',10,1.1)
archive('pulse',pulse,None,'Noto Sans KR');del pulse
rough=TTFont('/Users/scdi/Documents/ChatGPT/3D Character/story-prologue/dist/fonts/open-cosmos-ink-kr-11172/OpenCosmosInkKR11172-VF.ttf');rename(rough,'LPP Grain Korean')
# Amplify the existing smooth motion while keeping all glyphs and metrics.
for variations in rough['gvar'].variations.values():
 for variation in variations:
  variation.coordinates=[None if p is None else (round(p[0]*1.32),round(p[1]*1.32)) for p in variation.coordinates]
archive('grain',rough,'web/fonts/lpp-rough-ink.ttf','Noto Serif KR / Open Cosmos Ink KR Full')
print('All font pairs built',flush=True)
