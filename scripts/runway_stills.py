"""Generate the 0% stills on Runway (default model nano_banana_2.1; see MODEL) from docs/image-prompts.md.

Usage: python3 scripts/runway_stills.py M1 C1          # the two identity references
       python3 scripts/runway_stills.py P7 P1 ...      # specific stills
       python3 scripts/runway_stills.py all            # every still in the doc that isn't on disk yet
       python3 scripts/runway_stills.py --fetch P7 ..  # re-download finished tasks, no new credits
       python3 scripts/runway_stills.py --model gpt_image_2 M1   # another image model on the account
       python3 scripts/runway_stills.py --cap 2000 ... # stop before total spend passes 2000 credits ($20)

Needs RUNWAY_API_KEY. Writes media/stills/<ID>.<ext> and copies it to public/stills/.
References: media/stills/M1.* is passed as @maya to every prompt that names Maya, media/stills/C1.* as
@friends to every prompt that names Jess, Kai, Dev or Sam, and matched sets also pass their first
image as @scene (SCENE below). Task IDs are printed and saved in media/stills/tasks.json the moment a
task is created, and every credit spent is logged in media/stills/spend.json. Never prints the key.
"""
import base64, json, mimetypes, os, re, shutil, ssl, subprocess, sys, threading, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.dev.runwayml.com/v1'
KEY = os.environ['RUNWAY_API_KEY']
MODEL = 'nano_banana_2.1'  # Tom's pick, 2026-10-13 (6 credits per still)
# 16:9-ish size per model (each model accepts its own list of ratios)
RATIOS = {'gen4_image': '1920:1080', 'gpt_image_2': '1920:1088', 'gemini_image3_pro': '2752:1536', 'nano_banana_2.1': '2752:1536'}
# Upright stills: they are shown inside the phone (and C1 is the lock screen).
PORTRAIT = {'C1', 'O27', *(f'O{i}' for i in range(1, 15))}
PORTRAIT_RATIO = '1536:2752'
# Matched sets: the later image is passed the first one as @scene so the framing carries over.
SCENE = {'P8': 'P7', 'P22': 'P21', 'P35': 'P34', 'P38': 'P37', 'P39': 'P37', 'P40': 'P37'}
FRIENDS = ('Jess', 'Kai', 'Dev', 'Sam')
CA = '/root/.ccr/ca-bundle.crt'
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
OUT = os.path.join(ROOT, 'media', 'stills')
PUB = os.path.join(ROOT, 'public', 'stills')
TASKS = os.path.join(OUT, 'tasks.json')
SPEND = os.path.join(OUT, 'spend.json')
LOCK = threading.Lock()


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
    """ID -> prompt from the tables in docs/image-prompts.md (| ID | Used at | Prompt |)."""
    md = open(os.path.join(ROOT, 'docs', 'image-prompts.md')).read()
    return {m.group(1): m.group(2).strip() for m in re.finditer(r'^\| ([A-Z]\d+) \| [^|]+ \| (.+) \|$', md, re.M)}


def on_disk(sid):
    return next((f for f in sorted(os.listdir(OUT)) if f.split('.')[0] == sid and f.split('.')[-1] in ('png', 'jpg', 'jpeg', 'webp')), None) if os.path.isdir(OUT) else None


_refs = {}


def ref_uri(sid):
    # Runway caps inline images, so send a 1376px JPEG copy (made with ffmpeg).
    if sid not in _refs:
        f = on_disk(sid)
        if not f:
            raise RuntimeError(f'reference {sid} is not in media/stills yet')
        small = os.path.join(OUT, 'ref', f'{sid}.jpg')
        os.makedirs(os.path.dirname(small), exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OUT, f), '-vf', 'scale=1376:1376:force_original_aspect_ratio=decrease', '-q:v', '3', small], check=True)
        _refs[sid] = 'data:image/jpeg;base64,' + base64.b64encode(open(small, 'rb').read()).decode()
    return _refs[sid]


def request(sid, text):
    """The text_to_image body for one still: prompt, size and reference images."""
    if 'no text' not in text.lower():
        text += ' No text, no captions, no watermark.'
    refs, lead = [], []
    if sid != 'M1' and 'Maya' in text:
        refs.append({'uri': ref_uri('M1'), 'tag': 'maya'})
        text = text.replace('Maya', '@maya', 1)
    if sid not in ('C1',) and any(re.search(rf'\b{n}\b', text) for n in FRIENDS):
        refs.append({'uri': ref_uri('C1'), 'tag': 'friends'})
        lead.append('Jess, Kai, Dev and Sam are the four friends in @friends (Jess on the top step, then Kai, then Dev, Sam on the bottom step); keep their faces, hair and clothes.')
    if sid in SCENE:
        refs.append({'uri': ref_uri(SCENE[sid]), 'tag': 'scene'})
        lead.append('Same place, light and camera position as @scene.')
    body = {'model': MODEL, 'promptText': ' '.join(lead + [text]), 'ratio': PORTRAIT_RATIO if sid in PORTRAIT and MODEL == 'nano_banana_2.1' else RATIOS[MODEL]}
    if refs:
        body['referenceImages'] = refs[:3]
    return body


def load(path, default):
    return json.load(open(path)) if os.path.exists(path) else default


def remember(sid, tid):
    with LOCK:
        os.makedirs(OUT, exist_ok=True)
        known = load(TASKS, {})
        known[sid] = tid
        json.dump(known, open(TASKS, 'w'), indent=1)


def log_spend(sid, credits):
    with LOCK:
        rows = load(SPEND, [])
        rows.append({'id': sid, 'credits': credits, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
        json.dump(rows, open(SPEND, 'w'), indent=1)


def spent():
    return sum(r['credits'] for r in load(SPEND, []))


def wait(sid, tid):
    while True:
        t = call('GET', f'/tasks/{tid}')
        if t['status'] == 'SUCCEEDED':
            return t['output'][0]
        if t['status'] in ('FAILED', 'CANCELLED'):
            raise RuntimeError(f'{sid}: {t["status"]} {t.get("failure")} {t.get("failureCode")}')
        time.sleep(4)


def generate(sid, text, cap):
    with LOCK:
        if cap is not None and spent() + 6 > cap:
            raise RuntimeError(f'skipped: total spend would pass the {cap}-credit cap ({spent()} spent)')
    body = request(sid, text)
    before = call('GET', '/organization')['creditBalance']
    tid = call('POST', '/text_to_image', body)['id']
    remember(sid, tid)
    print(f'{sid}: task {tid}', flush=True)
    url = wait(sid, tid)
    log_spend(sid, 6)  # nano_banana_2.1 price; the balance check in main() reports the real total
    return download(sid, url) + f' [{len(body.get("referenceImages", []))} refs, balance was {before}]'


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
    for d in (OUT, PUB):
        for old in os.listdir(d):
            if old.split('.')[0] == sid and old not in ('tasks.json', 'spend.json'):
                os.remove(os.path.join(d, old))
    path = os.path.join(OUT, sid + ext)
    open(path, 'wb').write(data)
    shutil.copy(path, os.path.join(PUB, sid + ext))
    _refs.pop(sid, None)
    return f'{sid}: ok ({len(data) // 1024} KB, {host})'


def main():
    global MODEL
    ps = prompts()
    args = sys.argv[1:]
    cap = None
    while args and args[0].startswith('--') and args[0] != '--fetch':
        if args[0] == '--model':
            MODEL, args = args[1], args[2:]
        elif args[0] == '--cap':
            cap, args = int(args[1]), args[2:]
        else:
            raise SystemExit(f'unknown option {args[0]}')
    if args and args[0] == '--fetch':
        known = load(TASKS, {})
        for i in args[1:] or list(known):
            try:
                print(download(i, wait(i, known[i])), flush=True)
            except Exception as e:
                print(f'{i}: ERROR {e}', flush=True)
        return
    ids = [i for i in ps if not on_disk(i)] if args == ['all'] else args
    missing = [i for i in ids if i not in ps]
    if missing:
        raise SystemExit(f'no prompt for {missing}')
    before = call('GET', '/organization')['creditBalance']
    with ThreadPoolExecutor(max_workers=2) as pool:  # Runway allows 2 at a time
        futs = {pool.submit(generate, i, ps[i], cap): i for i in ids}
        for f, i in futs.items():
            try:
                print(f.result(), flush=True)
            except Exception as e:
                print(f'{i}: ERROR {e}', flush=True)
    after = call('GET', '/organization')['creditBalance']
    print(f'credits: {before} -> {after} (used {before - after}; logged total {spent()})')


if __name__ == '__main__':
    main()
