import librosa, numpy as np
y, sr = librosa.load('Flatline.mp3', sr=22050, mono=True)
hop=256
S=np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs=librosa.fft_frequencies(sr=sr, n_fft=2048)
Sh,Sp=librosa.decompose.hpss(S, margin=(1.0,2.0))
band=(freqs>=300)&(freqs<3500)
voc=Sh[band].sum(0)
on=np.maximum(0, np.diff(librosa.amplitude_to_db(voc+1e-6), prepend=0))
on=np.convolve(on, np.ones(4)/4, mode='same')
t=librosa.frames_to_time(np.arange(len(voc)), sr=sr, hop_length=hop)
b=np.load('beats2.npy')
def nearest_beat(x):
    i=np.argmin(abs(b-x)); bar=0 if i<3 else (i-3)//4+1; bt=(i-3)%4+1 if i>=3 else i+2
    return b[i], bar, bt
for name,c in [('Clear!',65.0),('Flatline! shout',84.5),('My heart stopped',96.0),('Beep beep',143.0),('Still',194.0),('dancing',196.5)]:
    m=(t>c-1.5)&(t<c+1.5)
    # vocal-band harmonic energy onsets: top 3 candidates
    idx=np.where(m)[0]; top=idx[np.argsort(on[idx])[-3:][::-1]]
    cands=[(round(t[k],2), round(on[k],1)) for k in top]
    bt=nearest_beat(t[top[0]])
    print('%-18s user~%5.1f  onset candidates %s  -> nearest beat %.2f (bar %d beat %d)' % (name,c,cands,bt[0],bt[1],bt[2]))
