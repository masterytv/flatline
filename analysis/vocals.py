import librosa, numpy as np
y, sr = librosa.load('Flatline.mp3', sr=22050, mono=True)
hop=512
S, ph = librosa.magphase(librosa.stft(y, n_fft=2048, hop_length=hop))
Sh, Sp = librosa.decompose.hpss(S, margin=(1.0,3.0))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
# vocal-ish: harmonic content 250-3000 Hz with strong temporal variation (melody), REPET foreground
Sf = librosa.decompose.nn_filter(S, aggregate=np.median, metric='cosine', width=int(librosa.time_to_frames(2, sr=sr, hop_length=hop)))
Sf = np.minimum(S, Sf)
mask = librosa.util.softmask(S - Sf, 10*Sf, power=2)
fg = (mask*Sh)[(freqs>=250)&(freqs<3000)].sum(0)
bg = S[(freqs>=250)&(freqs<3000)].sum(0)
ratio = fg/(bg+1e-9)
t = librosa.frames_to_time(np.arange(len(ratio)), sr=sr, hop_length=hop)
b=np.load('beats2.npy')
edges=np.append(b, b[-1]+0.45)
r=np.array([ratio[(t>=edges[i])&(t<edges[i+1])].mean() for i in range(len(b))])
thr=np.percentile(r,60)
act=r>thr
segs=[];s=None
for i,a in enumerate(act):
    if a and s is None: s=i
    if (not a) and s is not None:
        if i-s>=3: segs.append((round(b[s],1), round(b[i],1)))
        s=None
print('threshold', round(thr,3))
print('likely vocal phrases (>=3 beats):')
for a,c in segs: print('  %6.1f - %6.1f' % (a,c))
np.save('vocratio.npy', r)
