"""Generate the 0% stills on Runway (gen4_image) from docs/image-prompts.md.

Usage: python3 scripts/runway_stills.py M0            # the Maya reference
       python3 scripts/runway_stills.py S1 R3 ...     # specific stills
       python3 scripts/runway_stills.py all           # every still except M0
       python3 scripts/runway_stills.py --fetch S1 .. # re-download finished tasks, no new credits
       python3 scripts/runway_stills.py --model gpt_image_2 M0   # another image model on the account

Needs RUNWAY_API_KEY. Writes media/stills/<ID>.<ext> and copies to public/stills/.
Shots with Maya use media/stills/M0.* as a reference image tagged @maya.
Never prints the key.
"""
import base64, json, mimetypes, os, re, shutil, ssl, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.dev.runwayml.com/v1'
KEY = os.environ['RUNWAY_API_KEY']
MODEL = 'gen4_image'
# 16:9-ish size per model (each model accepts its own list of ratios)
RATIOS = {'gen4_image': '1920:1080', 'gpt_image_2': '1920:1088', 'gemini_image3_pro': '2752:1536', 'nano_banana_2.1': '2752:1536'}
CA = '/root/.ccr/ca-bundle.crt'
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
OUT = os.path.join(ROOT, 'media', 'stills')
PUB = os.path.join(ROOT, 'public', 'stills')


def call(method, path, body=None, tries=4):
    # GETs are retried on dropped connections; a POST is not, so a task is never paid for twice.
    n = tries if method == 'GET' else 1
    for attempt in range(n):
        try:
            return _call(method, path, body)
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if attempt == n - 1:
                raise
            time.sleep(2 ** attempt)


def _call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None)
    req.add_header('Authorization', f'Bearer {KEY}')
    req.add_header('X-Runway-Version', '2024-11-06')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise urllib.error.HTTPError(e.url, e.code, f'{method} {path}: {e.code} {e.read().decode()[:500]}', e.headers, None) from None


def prompts():
    md = open(os.path.join(ROOT, 'docs', 'image-prompts.md')).read()
    out = {}
    m = re.search(r'## M0[^\n]*\n> (.+)', md)
    out['M0'] = m.group(1).strip()
    for row in re.finditer(r'^\| (S\d+|R\d+) \| [^|]+ \| (.+) \|$', md, re.M):
        out[row.group(1)] = row.group(2).strip()
    return out


def reference():
    for f in sorted(os.listdir(OUT)) if os.path.isdir(OUT) else []:
        if f.startswith('M0.'):
            p = os.path.join(OUT, f)
            mime = mimetypes.guess_type(p)[0] or 'image/png'
            return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    return None


TASKS = os.path.join(OUT, 'tasks.json')


def remember(sid, tid):
    os.makedirs(OUT, exist_ok=True)
    known = json.load(open(TASKS)) if os.path.exists(TASKS) else {}
    known[sid] = tid
    json.dump(known, open(TASKS, 'w'), indent=1)


def wait(sid, tid):
    while True:
        t = call('GET', f'/tasks/{tid}')
        if t['status'] == 'SUCCEEDED':
            return t['output'][0]
        if t['status'] in ('FAILED', 'CANCELLED'):
            raise RuntimeError(f'{sid}: {t["status"]} {t.get("failure")} {t.get("failureCode")}')
        time.sleep(4)


def generate(sid, text, ref):
    body = {'model': MODEL, 'promptText': text, 'ratio': RATIOS[MODEL]}
    if ref and sid != 'M0' and 'Maya' in text:
        body['promptText'] = text.replace('Maya', '@maya', 1)
        body['referenceImages'] = [{'uri': ref, 'tag': 'maya'}]
    tid = call('POST', '/text_to_image', body)['id']
    remember(sid, tid)
    return download(sid, wait(sid, tid))


def download(sid, url):
    host = urllib.parse.urlparse(url).netloc
    try:
        r = urllib.request.urlopen(url, context=CTX, timeout=120)
    except Exception as e:
        raise RuntimeError(f'download from {host} failed ({e}); task saved, retry with --fetch {sid}')
    with r:
        data = r.read()
        ext = (mimetypes.guess_extension(r.headers.get_content_type()) or '.png').replace('.jpe', '.jpg')
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PUB, exist_ok=True)
    for old in os.listdir(OUT):
        if old.split('.')[0] == sid and old != 'tasks.json':
            os.remove(os.path.join(OUT, old))
    path = os.path.join(OUT, sid + ext)
    open(path, 'wb').write(data)
    shutil.copy(path, os.path.join(PUB, sid + ext))
    return f'{sid}: ok ({len(data) // 1024} KB, {host})'


def main():
    global MODEL
    ps = prompts()
    args = sys.argv[1:]
    if args[:1] == ['--model']:
        MODEL, args = args[1], args[2:]
    if args and args[0] == '--fetch':
        known = json.load(open(TASKS))
        for i in args[1:] or list(known):
            try:
                print(download(i, wait(i, known[i])), flush=True)
            except Exception as e:
                print(f'{i}: ERROR {e}', flush=True)
        return
    ids = [i for i in ps if i != 'M0'] if args == ['all'] else args
    ref = reference()
    before = call('GET', '/organization')['creditBalance']
    with ThreadPoolExecutor(max_workers=2) as pool:  # Runway allows 2 at a time
        futs = {pool.submit(generate, i, ps[i], ref): i for i in ids}
        for f, i in futs.items():
            try:
                print(f.result(), flush=True)
            except Exception as e:
                print(f'{i}: ERROR {e}', flush=True)
    after = call('GET', '/organization')['creditBalance']
    print(f'credits: {before} -> {after} (used {before - after})')


if __name__ == '__main__':
    main()
