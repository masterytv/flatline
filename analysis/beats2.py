import librosa, numpy as np
y, sr = librosa.load('Flatline.mp3', sr=22050, mono=True)
hop=256
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median)
tempo, bf = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, start_bpm=130, tightness=80, trim=False)
b = librosa.frames_to_time(bf, sr=sr, hop_length=hop)
print('n beats', len(b), 'first', np.round(b[:6],3), 'last', np.round(b[-4:],3))
ibi=np.diff(b)
# local bpm in 16-beat windows
for k in range(0, len(b)-16, 32):
    w=b[k:k+17]; p=np.polyfit(np.arange(17), w, 1)[0]
    print('t=%6.1f  local BPM %.2f  max dev %.3f' % (w[0], 60/p, np.abs(w-np.polyval(np.polyfit(np.arange(17), w, 1), np.arange(17))).max()))
# irregular intervals
bad = np.where((ibi<0.40)|(ibi>0.52))[0]
print('irregular intervals at', [(round(b[i],2), round(ibi[i],3)) for i in bad])
np.save('beats2.npy', b)
