"""Proof of Life: derive ink-density maps (not new images) from the existing stills.

For each still, writes public/plates/<ID>.png, an RGB density map at 1376x768:
  R = key (warm black) density, G = HEAT (orange) density, B = COLD (ultramarine) density.
The prototype screens these live in a canvas (dots or lines at any cell size, angle and zoom),
so one map per still serves the poster, the macro crops and the dot confetti.

Also writes paper.png (newsprint fibre) and speckle.png (ink voids for riso-style coverage).

Usage: python3 src/print/tools/print_plates.py [IDs...]   (no IDs: paper textures plus every still in public/stills)
Files are git-ignored (derived media). Nothing here generates new imagery.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(ROOT, 'public', 'stills')
OUT = os.path.join(ROOT, 'public', 'plates')
W, H = 1376, 768

# Per-still tuning: local-contrast mix, key threshold, colour-plate ceiling, gamma, warmth weighting.
P = {
    'default': dict(local=0.5, kth=0.42, cmax=0.86, crange=0.70, gamma=0.6, kpow=1.0, bth=0.86, brange=0.72, plo=1, phi=99.5, scurve=0.6, opow=0.9),
    'S3': dict(local=0.15, kth=0.2, cmax=0.95, crange=0.9, gamma=0.8, kpow=1.5),
}


def blur(x, r):
    im8 = Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im8.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


def find(id_):
    for ext in ('.png', '.jpg', '.jpeg', '.webp'):
        p = os.path.join(SRC, id_ + ext)
        if os.path.exists(p):
            return p
    raise SystemExit(f'missing still {id_}')


def plates(id_):
    q = {**P['default'], **P.get(id_, {})}
    im = Image.open(find(id_)).convert('RGB').resize((W, H), Image.LANCZOS)
    rgb = np.asarray(im).astype(np.float32) / 255
    L = np.asarray(im.convert('L')).astype(np.float32) / 255
    # Local contrast: normalise against a 45px neighbourhood so dark loft scenes don't turn to mud
    # and darker skin doesn't fill in solid while lighter skin blows out to bare paper.
    m = blur(L, 32)
    s = np.sqrt(np.maximum(blur((L - m) ** 2, 32), 1e-5))
    n = np.clip(0.5 + 0.2 * (L - m) / (s + 0.05), 0, 1)
    lum = np.clip(q['local'] * n + (1 - q['local']) * (L ** q['gamma']), 0, 1)
    lum = blur(lum, 0.8)
    # levels: stretch to the 1st..99th percentile, then an S-curve, so highlights reach bare paper
    lo, hi = np.percentile(lum, [q['plo'], q['phi']])
    lum = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1)
    lum = lum * lum * (3 - 2 * lum) * q['scurve'] + lum * (1 - q['scurve'])
    k = np.clip((q['kth'] - lum) / q['kth'], 0, 1) ** q['kpow']
    warm = np.clip((rgb[..., 0] - rgb[..., 2]) * 2.2 + 0.35, 0, 1)
    o = np.clip((q['cmax'] - lum) / q['crange'], 0, 1) ** q['opow'] * (0.75 + 0.25 * warm)
    b = np.clip((q['bth'] - lum) / q['brange'], 0, 1) ** q['opow']
    out = np.stack([k, o, b], -1)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, f'{id_}.png'), optimize=True)
    print(id_, 'k%.2f o%.2f b%.2f' % (k.mean(), o.mean(), b.mean()))


def paper():
    rng = np.random.default_rng(7)
    w, h = 2048, 1152
    base = np.array([255, 253, 249], np.float32) / 255  # neutral: multiplied over the cream ground
    # low-frequency cloudiness + fine tooth + a few long fibres
    cloud = blur(rng.random((h, w)).astype(np.float32), 40) - 0.5
    cloud = cloud / (np.abs(cloud).max() + 1e-6)
    tooth = blur(rng.random((h, w)).astype(np.float32), 0.7) - 0.5
    img = np.ones((h, w, 3), np.float32) * base
    img = np.minimum(img, 1)
    img *= (1 + 0.025 * cloud[..., None] + 0.035 * tooth[..., None])
    fib = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(fib)
    for _ in range(1600):
        x, y = rng.random() * w, rng.random() * h
        a = rng.random() * np.pi
        ln = 6 + rng.random() * 26
        d.line([x, y, x + np.cos(a) * ln, y + np.sin(a) * ln], fill=int(40 + rng.random() * 60), width=1)
    f = np.asarray(fib.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    img *= (1 - 0.10 * f[..., None])
    # rare dark flecks
    fl = (rng.random((h, w)) > 0.99985).astype(np.float32)
    fl = blur(fl, 0.9) * 3
    img *= (1 - np.clip(fl, 0, 0.6)[..., None])
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'paper.jpg'), quality=90)
    # speckle: alpha = how much ink is lost (riso coverage grain), tileable-ish noise
    sp = blur(rng.random((1024, 1024)).astype(np.float32), 1.1)
    sp = (sp - sp.mean()) / (sp.std() + 1e-6)
    a = np.clip((sp - 0.6) * 0.35, 0, 0.55)
    coarse = blur(rng.random((1024, 1024)).astype(np.float32), 18)
    coarse = (coarse - coarse.mean()) / (coarse.std() + 1e-6)
    a = np.clip(a + np.clip((coarse - 0.8) * 0.12, 0, 0.25), 0, 0.7)
    rgba = np.zeros((1024, 1024, 4), np.uint8)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, 'speckle.png'), optimize=True)
    # inkmask: the same grain as a CSS mask for DOM ink (type, rules, stamps): alpha = ink kept
    keep = np.zeros((1024, 1024, 4), np.uint8)
    keep[..., :3] = 255
    keep[..., 3] = ((1 - np.clip(a * 0.55, 0, 0.3)) * 255).astype(np.uint8)
    Image.fromarray(keep, 'RGBA').save(os.path.join(OUT, 'inkmask.png'), optimize=True)
    # big solids (black floods, bars): only a whisper of grain, or they read as grunge
    keep[..., 3] = ((1 - np.clip(a * 0.22, 0, 0.12)) * 255).astype(np.uint8)
    Image.fromarray(keep, 'RGBA').save(os.path.join(OUT, 'inkmask_solid.png'), optimize=True)
    print('paper + speckle')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    ids = sys.argv[1:] or sorted({f.split('.')[0] for f in os.listdir(SRC) if f.split('.')[-1] in ('png', 'jpg', 'jpeg', 'webp')})
    if 'paper' in ids or not sys.argv[1:]:
        paper()
    for i in ids:
        if i != 'paper':
            plates(i)
