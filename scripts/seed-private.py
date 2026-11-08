"""Upload authorized app assets/music using credentials supplied only via stdin."""
import sys,json,urllib.request,urllib.parse,hashlib,subprocess,termios
from pathlib import Path
settings=None
if sys.stdin.isatty():
 settings=termios.tcgetattr(sys.stdin);hidden=termios.tcgetattr(sys.stdin);hidden[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSADRAIN,hidden)
print('Ready for private import JSON on stdin (input is hidden).',flush=True)
try:config=json.loads(sys.stdin.readline())
finally:
 if settings:termios.tcsetattr(sys.stdin,termios.TCSADRAIN,settings)
origin=config['origin'].rstrip('/')
headers={'X-LPP-Service-Key':config['serviceKey']}
if config.get('siteToken'):headers['OAI-Sites-Authorization']='Bearer '+config['siteToken']
def send(path,body,extra=None,method='POST'):
 h={**headers,**(extra or {}),'Content-Length':str(len(body))}
 request=urllib.request.Request(origin+path,data=body,headers=h,method=method)
 try:
  with urllib.request.urlopen(request,timeout=180) as response:return json.load(response)
 except urllib.error.HTTPError as error:
  detail=error.read(1000).decode('utf8',errors='replace')
  raise RuntimeError('Import returned HTTP '+str(error.code)+': '+detail) from None
if config.get('assets'):
 for file in sorted(Path(config['assets']).glob('*.woff')):
  send('/api/admin/asset?name='+urllib.parse.quote('fonts/'+file.name),file.read_bytes(),{'Content-Type':'font/woff'},'PUT')
  print('Asset ready: '+file.name,flush=True)
for filename in config.get('music',[]):
 file=Path(filename);data=file.read_bytes()
 probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration:format_tags=title,artist','-of','json',str(file)]))
 info=probe['format'];tags=info.get('tags',{})
 meta={'hash':hashlib.sha256(data).hexdigest(),'title':tags.get('title') or file.stem,'artist':tags.get('artist') or 'My music','filename':file.name,'duration':float(info.get('duration',0))}
 result=send('/api/records',data,{'Content-Type':'audio/mp4','X-LPP-Meta':urllib.parse.quote(json.dumps(meta,separators=(',',':')))})
 print(json.dumps({'title':result['record']['title'],'id':result['record']['id'],'duration':result['record']['duration'],'duplicate':result.get('duplicate',False)},ensure_ascii=False),flush=True)
