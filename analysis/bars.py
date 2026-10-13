import numpy as np
b = np.load('beats.npy'); f = np.load('frames.npz')
t, rms, bass, mid, high, voc = f['t'], f['rms'], f['bass'], f['mid'], f['high'], f['voc']
i = np.arange(len(b)); slope, icpt = np.polyfit(i, b, 1)
res = b - (slope*i+icpt)
print('fit period %.5f s -> %.3f BPM, intercept %.3f, max residual %.3f' % (slope, 60/slope, icpt, abs(res).max()))
# check drift: fit first half vs second half
h=len(b)//2
print('first half BPM %.3f, second half BPM %.3f' % (60/np.polyfit(i[:h],b[:h],1)[0], 60/np.polyfit(i[h:],b[h:],1)[0]))
# silence
thr = rms.max()*0.02
sil = rms < thr
# find runs of silence > 0.25s
runs=[]; start=None
for k,s in enumerate(sil):
    if s and start is None: start=k
    if not s and start is not None:
        if t[k]-t[start] > 0.25: runs.append((round(t[start],2), round(t[k],2)))
        start=None
if start is not None: runs.append((round(t[start],2), round(t[-1],2)))
print('silences', runs)
# per-second energy summary in dB
def db(x): return 20*np.log10(x+1e-9)
sec = np.arange(0, int(t[-1])+1)
out=[]
for s in sec:
    m=(t>=s)&(t<s+1)
    out.append((s, rms[m].mean(), bass[m].mean(), voc[m].mean(), high[m].mean()))
o=np.array(out)
for col,name in [(1,'rms'),(2,'bass'),(3,'voc'),(4,'high')]:
    o[:,col]=o[:,col]/o[:,col].max()
print('sec  rms  bass voc  high')
for r in o: print('%3d  %.2f %.2f %.2f %.2f %s' % (r[0], r[1], r[2], r[3], r[4], '#'*int(r[1]*40)))
