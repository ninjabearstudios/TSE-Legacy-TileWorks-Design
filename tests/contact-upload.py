"""Local PHP upload integration checks; captures mail, never sends it.
Run with PHP_BIN set to a PHP 8 executable. Optional PHP_TEST_ARGS is a JSON list.
"""
from pathlib import Path
import os,json,tempfile,subprocess,socket,time,urllib.request,urllib.error,uuid,base64
from email import policy
from email.parser import BytesParser
ROOT=Path(__file__).resolve().parent.parent
PHP=os.environ.get('PHP_BIN','php')
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
PDF=b'%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n'
with tempfile.TemporaryDirectory(prefix='tse-upload-test-') as tmp:
 root=Path(tmp);(root/'tmp').mkdir()
 source=(ROOT/'send-estimate.php').read_text(encoding='utf-8')
 # Namespaced mail replacement exists only in this temporary test copy.
 stub='''\nnamespace TSEUploadTest;
use \\finfo;
function mail($to, $subject, $message, $headers) {
    if (file_exists(__DIR__ . '/fail-mail')) return false;
    file_put_contents(__DIR__ . '/capture.json', json_encode(compact('to','subject','message','headers')));
    return true;
}
'''
 (root/'send-estimate.php').write_text(source.replace('declare(strict_types=1);','declare(strict_types=1);'+stub,1),encoding='utf-8')
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 args=[PHP]+json.loads(os.environ.get('PHP_TEST_ARGS','[]'))+['-d','upload_max_filesize=5M','-d','post_max_size=12M','-d','max_file_uploads=20','-d','display_errors=0','-d','sys_temp_dir="'+str(root/'tmp')+'"','-d','upload_tmp_dir="'+str(root/'tmp')+'"','-S',f'127.0.0.1:{port}','-t',str(root)]
 log=open(root/'server.log','wb');server=subprocess.Popen(args,stdout=log,stderr=log,creationflags=0x08000000 if os.name=='nt' else 0)
 url=f'http://127.0.0.1:{port}/send-estimate.php'
 def request(files=(),headers=None,fields=None,clear_rate=True):
  if clear_rate:
   for f in (root/'tmp').glob('tileworks-form-*'):f.unlink()
  capture=root/'capture.json'
  if capture.exists():capture.unlink()
  boundary='test'+uuid.uuid4().hex;parts=[]
  data={'name':'Test Visitor','phone':'9705550100','email':'visitor@example.com','projectType':'Custom shower','details':'Test estimate','website':''}
  if fields:data.update(fields)
  for name,value in data.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
  for filename,mime,content,*field in files:
   key=field[0] if field else 'attachments[]'
   parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+content+b'\r\n')
  body=b''.join(parts)+f'--{boundary}--\r\n'.encode()
  h={'Content-Type':'multipart/form-data; boundary='+boundary,'Accept':'application/json'};h.update(headers or {})
  try:r=urllib.request.urlopen(urllib.request.Request(url,body,h),timeout=20)
  except urllib.error.HTTPError as e:r=e
  raw=r.read();return r.status,raw,json.loads(capture.read_text()) if capture.exists() else None
 try:
  for _ in range(60):
   try:urllib.request.urlopen(url,timeout=.2)
   except urllib.error.HTTPError as e:
    if e.code==405:break
   except OSError:time.sleep(.1)
  else:raise AssertionError('PHP server failed: '+(root/'server.log').read_text())
  status,body,cap=request();assert status==200 and cap['to']=='Cameron@tselegacytileworks.com',(status,body,(root/'server.log').read_text());print('PASS no attachments')
  status,body,cap=request([('bathroom.png','image/png',PNG),('plan.pdf','application/pdf',PDF)])
  assert status==200,(status,body)
  raw=('\r\n'.join(k+': '+v for k,v in cap['headers'].items())+'\r\n\r\n'+cap['message']).encode()
  mail=BytesParser(policy=policy.default).parsebytes(raw);attachments=list(mail.iter_attachments())
  assert len(attachments)==2 and attachments[0].get_payload(decode=True)==PNG and attachments[1].get_payload(decode=True)==PDF
  assert mail['Reply-To']=='visitor@example.com';print('PASS mixed attachment MIME and exact byte roundtrip')
  checks=[('renamed executable',[('photo.jpg','image/jpeg',b'<?php echo 1; ?>')],422),('extension mismatch',[('photo.pdf','application/pdf',PNG)],422),('empty file',[('photo.png','image/png',b'')],413),('six files',[('x.png','image/png',PNG)]*6,422),('per-file limit',[('x.pdf','application/pdf',PDF+b' '* (5*1024*1024))],413),('combined limit',[('x.pdf','application/pdf',PDF+b' '*(4*1024*1024-200))]*3,413),('request limit',[('x.pdf','application/pdf',b' '*(13*1024*1024))],413),('unexpected upload field',[('x.png','image/png',PNG,'other[]')],422)]
  for label,files,expected in checks:
   status,body,cap=request(files);assert status==expected and cap is None,(label,status,body);print('PASS',label)
  for label,kwargs,expected in [('invalid email',{'fields':{'email':'bad'}},422),('spam trap',{'fields':{'website':'bot'}},422),('cross-origin',{'headers':{'Origin':'https://unrelated.example'}},403)]:
   status,body,cap=request(**kwargs);assert status==expected and cap is None,(label,status,body);print('PASS',label)
  status,body,cap=request([('x.png','image/png',PNG)],headers={'Accept':'text/html'});assert status==200 and b'Request submitted' in body;print('PASS no-JavaScript multipart response')
  (root/'fail-mail').touch();status,body,cap=request([('x.png','image/png',PNG)]);assert status==503 and cap is None;print('PASS transport rejection');(root/'fail-mail').unlink()
  for i in range(6):
   status,body,cap=request(clear_rate=(i==0));assert status==(200 if i<5 else 429),(i,status)
  print('PASS rate limit; no real email sent')
 finally:
  server.terminate();server.wait(timeout=10);log.close()
