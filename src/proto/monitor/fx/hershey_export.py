"""Exports single-stroke script words (Hershey 'cursive') as smoothed polylines for the line to write.
Needs the Hershey-Fonts package on PYTHONPATH. Output: src/proto/monitor/data/script.json (geometry only)."""
import json
import os

from HersheyFonts import HersheyFonts

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')


def chaikin(pts, n=2):
    for _ in range(n):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        out.append(pts[-1])
        pts = out
    return pts


f = HersheyFonts()
f.load_default_font('cursive')
f.normalize_rendering(100)
words = {}
for word in ['dancing', 'still dancing']:
    strokes = [chaikin([(float(x), float(-y)) for x, y in s]) for s in f.strokes_for_text(word)]
    xs = [p[0] for s in strokes for p in s]
    ys = [p[1] for s in strokes for p in s]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    # Baseline: y = 0 in Hershey coordinates (after flip); normalise by width so the word is 1 unit wide.
    w = x1 - x0
    words[word] = {
        'aspect': (y1 - y0) / w,
        'strokes': [[(round((x - x0) / w, 4), round((y - y0) / w, 4)) for x, y in s] for s in strokes],
        'baseline': round((0 - y0) / w, 4),
    }
json.dump(words, open(os.path.join(DATA, 'script.json'), 'w'))
print({k: (len(v['strokes']), round(v['aspect'], 3), v['baseline']) for k, v in words.items()})
