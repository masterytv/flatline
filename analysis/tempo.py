import librosa, numpy as np
y, sr = librosa.load('Flatline.mp3', sr=22050, mono=True)
hop=256
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
# fine global tempo from autocorrelation in strong sections
def seg_tempo(a,b):
    s=int(a*sr/hop); e=int(b*sr/hop)
    ac = librosa.autocorrelate(oenv[s:e]-oenv[s:e].mean())
    lags = np.arange(len(ac))*hop/sr
    m=(lags>0.40)&(lags<0.52)
    k=np.argmax(ac[m]); lag=lags[m][k]
    # parabolic refine
    idx=np.where(m)[0][k]
    y0,y1,y2=ac[idx-1],ac[idx],ac[idx+1]; d=0.5*(y0-y2)/(y0-2*y1+y2)
    lag=(idx+d)*hop/sr
    # also use 8-beat lag for precision
    m8=(lags>8*0.45)&(lags<8*0.475); i8=np.where(m8)[0][np.argmax(ac[m8])]
    y0,y1,y2=ac[i8-1],ac[i8],ac[i8+1]; d8=0.5*(y0-y2)/(y0-2*y1+y2); lag8=(i8+d8)*hop/sr/8
    return 60/lag, 60/lag8
for a,b in [(8,40),(85,96),(114,126),(158,172),(187,202),(5,205)]:
    print(a,b, ['%.2f'%x for x in seg_tempo(a,b)])
