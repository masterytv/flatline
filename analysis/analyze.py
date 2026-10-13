import librosa, numpy as np, json, sys
y, sr = librosa.load('Flatline.mp3', sr=22050, mono=True)
dur = len(y)/sr
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time', start_bpm=128, tightness=200)
tempo = float(np.atleast_1d(tempo)[0])
print('duration', round(dur,2), 'tempo', round(tempo,2), 'beats', len(beats), 'first beats', np.round(beats[:8],3))
ibi = np.diff(beats); print('beat interval median', np.median(ibi), 'std', ibi.std())
np.save('beats.npy', beats)
# frame features
hop=512
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
bass = S[(freqs>=30)&(freqs<150)].sum(0)
mid = S[(freqs>=300)&(freqs<3400)].sum(0)
high = S[(freqs>=6000)].sum(0)
# vocal separation (REPET-SIM)
S_full, phase = librosa.magphase(librosa.stft(y, hop_length=hop, n_fft=2048))
S_filter = librosa.decompose.nn_filter(S_full, aggregate=np.median, metric='cosine', width=int(librosa.time_to_frames(2, sr=sr, hop_length=hop)))
S_filter = np.minimum(S_full, S_filter)
margin_v = 10; power=2
mask_v = librosa.util.softmask(S_full - S_filter, margin_v * S_filter, power=power)
S_fg = mask_v * S_full
voc = S_fg[(freqs>=200)&(freqs<4000)].sum(0)
np.savez('frames.npz', t=t, rms=rms, bass=bass, mid=mid, high=high, voc=voc)
print('saved')
