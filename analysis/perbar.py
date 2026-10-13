import numpy as np
b=np.load('beats2.npy'); B=np.load('beatfeat.npy')
starts=list(range(3,len(b),4))
print('bar start   rms  bass voc  high')
for n,s in enumerate(starts,1):
    e=min(s+4,len(b)); r=B[s:e].mean(0)
    print('%3d %6.2f  %.2f %.2f %.2f %.2f %s%s' % (n,b[s],r[0],r[1],r[2],r[3],'#'*int(r[0]*30), '  V' if r[2]>0.35 else ''))
