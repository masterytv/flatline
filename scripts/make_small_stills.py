"""Make 1280px JPEG copies of public/stills/* in public/stills/small/ for fast use in the edit
(feed thumbnails, blurred flips). Run after adding or replacing stills."""
import os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'stills')
DST = os.path.join(SRC, 'small')
os.makedirs(DST, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    name, ext = os.path.splitext(f)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        continue
    sid = name.split('_')[0]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(SRC, f), '-vf', 'scale=1280:-2', '-q:v', '3', os.path.join(DST, sid + '.jpg')], check=True)
    print(sid)
