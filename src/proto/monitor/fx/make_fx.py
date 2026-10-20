"""MONITOR prototype: graphic treatments of the stills (posterised halftone plates, mattes, contours).

Writes images to public/stills/fx/monitor/ (git-ignored by extension) and geometry-only JSON
(no pixels) to src/proto/monitor/data/. Needs numpy, Pillow and opencv-python-headless
(pip install --target <dir> opencv-python-headless, then PYTHONPATH=<dir>).

Usage: python3 src/proto/monitor/fx/make_fx.py
"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SRC = os.path.join(ROOT, 'public', 'stills')
OUT = os.path.join(SRC, 'fx', 'monitor')
DATA = os.path.join(ROOT, 'src', 'proto', 'monitor', 'data')
os.makedirs(OUT, exist_ok=True)
os.makedirs(DATA, exist_ok=True)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def load(id_, small=False):
    p = os.path.join(SRC, 'small', f'{id_}.jpg') if small else os.path.join(SRC, f'{id_}.png')
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255.0


def luma(rgb):
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def levels(L, lo=1, hi=99, gamma=1.0):
    a, b = np.percentile(L, lo), np.percentile(L, hi)
    return np.clip((L - a) / (b - a), 0, 1) ** gamma


def unsharp(L, radius=3, amount=0.6):
    blur = cv2.GaussianBlur(L, (0, 0), radius)
    return np.clip(L + amount * (L - blur), 0, 1)


def spot(h, w, pitch, angle_deg=45):
    """Euclidean dot screen in [0,1]: 0 at the dot centres."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.deg2rad(angle_deg)
    u = (x * np.cos(a) + y * np.sin(a)) / pitch
    v = (-x * np.sin(a) + y * np.cos(a)) / pitch
    return 0.5 - 0.25 * (np.cos(2 * np.pi * u) + np.cos(2 * np.pi * v))


def posterised_halftone(L, palette, pitch, angle=45):
    """Clustered-dot dither between adjacent palette levels: flat fills where the tone is flat, dots in the gradients."""
    n = len(palette)
    pal = np.stack([hexrgb(c) for c in palette])
    v = L * (n - 1)
    k = np.clip(np.floor(v), 0, n - 2).astype(np.int32)
    frac = v - k
    s = spot(*L.shape, pitch, angle)
    aa = 2.2 / pitch  # about one pixel of anti-aliasing
    a = np.clip((frac - s) / aa + 0.5, 0, 1)[..., None]
    out = pal[k] * (1 - a) + pal[k + 1] * a
    return out.astype(np.uint8)


def save(arr, name, mode='RGB'):
    Image.fromarray(arr, mode).save(os.path.join(OUT, name), optimize=True)
    print('wrote', name)


# ----------------------------------------------------------------------------------------- R14: Maya, arms up

def r14():
    rgb = load('R14')
    H, W = rgb.shape[:2]
    L = unsharp(levels(luma(rgb), 1, 99.5, 0.9), 4, 0.8)
    save(posterised_halftone(L, ['#0E030B', '#45122F', '#C8662F', '#FFC77A', '#FFF1D6'], pitch=10), 'R14_ht.png')

    # Matte: hand-traced polygon (normalised coords) refined by GrabCut on the 1280 px copy.
    m = json.load(open(os.path.join(DATA, 'r14_trace.json')))
    small = (load('R14', True) * 255).astype(np.uint8)
    h, w = small.shape[:2]

    def poly(pts, size):
        im = Image.new('L', size, 0)
        ImageDraw.Draw(im).polygon([(x * size[0], y * size[1]) for x, y in pts], fill=255)
        return np.asarray(im) > 0

    trace = poly(m['outer'], (w, h)) & ~poly(m['hole'], (w, h))
    k = np.ones((25, 25), np.uint8)
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    gc[cv2.dilate(trace.astype(np.uint8), k) > 0] = cv2.GC_PR_BGD
    gc[trace] = cv2.GC_PR_FGD
    gc[cv2.erode(trace.astype(np.uint8), k) > 0] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    res = ((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)) & ~poly(m['exclude'], (w, h))
    # keep the biggest blob only
    n, lab, stats, _ = cv2.connectedComponentsWithStats(res.astype(np.uint8))
    res = lab == (1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    res = cv2.morphologyEx(res.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    # Outline for the rim light: largest external contour, simplified, normalised.
    cs, _ = cv2.findContours(res, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, 1.2, True)[:, 0, :].astype(float)
    pts = [(round(x / w, 4), round(y / h, 4)) for x, y in c]
    json.dump({'outline': pts}, open(os.path.join(DATA, 'r14_outline.json'), 'w'))
    print('outline points', len(pts))

    # Full-res soft matte, faded out below the jacket (no midriff), as alpha.
    big = cv2.resize(res.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    big = cv2.GaussianBlur(big, (0, 0), 2.0)
    yy = np.linspace(0, 1, H)[:, None]
    fade = np.clip((0.86 - yy) / (0.86 - 0.76), 0, 1) ** 1.5
    a = np.clip(big * fade, 0, 1)
    save((a * 255).astype(np.uint8), 'R14_matte.png', 'L')


# ----------------------------------------------------------------------------------------- R12: the eyelid portrait

def r12():
    rgb = load('R12')
    L = unsharp(levels(luma(rgb), 0.5, 99.7, 0.85), 3, 0.7)
    save(posterised_halftone(L, ['#100409', '#4E1733', '#B8584A', '#F2A77A', '#FFE4C2'], pitch=8, angle=30), 'R12_ht.png')


# ----------------------------------------------------------------------------------------- R9: "Still", ink on paper

def r9():
    rgb = load('R9')
    L = unsharp(levels(luma(rgb), 0.5, 97, 0.55), 3, 0.9)
    save(posterised_halftone(L, ['#0B0D12', '#0B0D12', '#E9E2D6'], pitch=11, angle=45), 'R9_ht.png')


# ----------------------------------------------------------------------------------------- R10: dawn, three tones

def r10():
    rgb = load('R10')
    H, W = rgb.shape[:2]
    L = cv2.GaussianBlur(luma(rgb), (0, 0), 1.2)
    # Skyline: scan each column down from the clear sky with a running sky reference; the sky changes slowly,
    # a building is a sudden drop in (luminance + warmth), held for a few pixels.
    blurred = cv2.GaussianBlur(rgb, (0, 0), 1.5)
    feat = luma(blurred) + 0.6 * (blurred[..., 0] - blurred[..., 2])
    y0 = int(0.12 * H)
    ref = feat[y0].copy()
    top = np.full(W, int(0.5 * H), np.float32)
    found = np.zeros(W, bool)
    below = np.zeros(W, np.int32)
    for y in range(y0, int(0.5 * H)):
        drop = feat[y] < ref - 0.045
        below = np.where(drop & ~found, below + 1, 0)
        hit = (below >= 4) & ~found
        top[hit] = y - 3
        found |= hit
        ref = np.where(drop | found, ref, ref * 0.9 + feat[y] * 0.1)
    # light smoothing that keeps spikes: min filter then a small mean
    top = cv2.erode(top.reshape(1, -1), np.ones((1, 3), np.uint8)).ravel()
    top = cv2.blur(top.reshape(1, -1), (5, 1)).ravel()
    cols = np.linspace(0, W - 1, 481).astype(int)
    json.dump({'skyline': [round(float(top[c]) / H, 4) for c in cols]}, open(os.path.join(DATA, 'r10_skyline.json'), 'w'))

    # Foreground silhouette: friends + ledge, traced then GrabCut-refined on the small copy.
    t = json.load(open(os.path.join(DATA, 'r10_trace.json')))
    small = (load('R10', True) * 255).astype(np.uint8)
    h, w = small.shape[:2]
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([(x * w, y * h) for x, y in t['friends']], fill=255)
    tr = np.asarray(im) > 0
    k = np.ones((15, 15), np.uint8)
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    gc[cv2.dilate(tr.astype(np.uint8), k) > 0] = cv2.GC_PR_BGD
    gc[tr] = cv2.GC_PR_FGD
    gc[cv2.erode(tr.astype(np.uint8), k) > 0] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    fg = ((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)).astype(np.float32)
    fg = cv2.resize(fg, (W, H), interpolation=cv2.INTER_LINEAR)
    yy = np.arange(H)[:, None] / H
    fg = np.maximum(fg, (yy > t['ledge']).astype(np.float32))
    fg = np.clip(cv2.GaussianBlur(fg, (0, 0), 1.5) * 1.4 - 0.2, 0, 1)

    # Sky mask from the skyline contour (anti-aliased per column).
    xs = np.arange(W)
    sky_edge = np.interp(xs, np.linspace(0, W - 1, len(top)), top)
    sky = np.clip(sky_edge[None, :] - np.arange(H)[:, None] + 0.5, 0, 1)

    # Layers: sky gradient (peach → rose → pale gold at the horizon), the city as one dusk tone with a halftone
    # darkening toward the roof, and the near-black foreground.
    g = np.clip(yy / 0.42, 0, 1)[:, :, None]
    top_c, mid_c, hor_c = hexrgb('#F2B9C4'), hexrgb('#FFC09A'), hexrgb('#FFE3A6')
    skyc = np.where(g < 0.6, top_c + (mid_c - top_c) * (g / 0.6), mid_c + (hor_c - mid_c) * ((g - 0.6) / 0.4))
    skyc = np.broadcast_to(skyc, (H, W, 3))
    # city: 2-tone halftone between dusk rose and plum, by height below the skyline
    depth = np.clip((yy - 0.30) / 0.55, 0, 1) * np.ones((1, W))
    cityc = posterised_halftone(depth.astype(np.float32), ['#B9707F', '#5E2E45'], pitch=9).astype(np.float32)
    ink = hexrgb('#14100F')
    out = skyc * sky[..., None] + cityc * (1 - sky[..., None])
    out = out * (1 - fg[..., None]) + ink * fg[..., None]
    # backlit rim: silhouette pixels whose neighbour a few px up (and toward the light) is not silhouette
    up = np.zeros_like(fg)
    up[5:, 2:] = fg[:-5, :-2]
    rim = np.clip(fg - up, 0, 1) * (yy < t['ledge'] - 0.005)
    rim = cv2.GaussianBlur(rim, (0, 0), 1.2)
    out = out * (1 - 0.75 * rim[..., None]) + hexrgb('#FFB894') * 0.75 * rim[..., None]
    save(np.clip(out, 0, 255).astype(np.uint8), 'R10_poster.png')


if __name__ == '__main__':
    import sys
    which = sys.argv[1:] or ['r14', 'r12', 'r9', 'r10']
    for name in which:
        globals()[name]()
