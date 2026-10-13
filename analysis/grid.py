import numpy as np
b=np.load('beats2.npy'); f=np.load('frames.npz')
t,rms,bass,voc,high=f['t'],f['rms'],f['bass'],f['voc'],f['high']
def agg(x,a,c): m=(t>=a)&(t<c); return x[m].mean() if m.any() else 0
edges=np.append(b, b[-1]+np.median(np.diff(b[-8:])))
B=np.array([[agg(x,edges[i],edges[i+1]) for x in (rms,bass,voc,high)] for i in range(len(b))])
B=B/B.max(0)
# bass jumps
jump=B[1:,1]-B[:-1,1]
top=np.argsort(jump)[-10:][::-1]+1
print('biggest bass jumps at beat idx/time:', [(int(i), round(b[i],2), round(jump[i-1],2)) for i in top])
drops=[i for i in top]
# score phases
for ph in range(4):
    print('phase',ph, 'jump beats mod4:', [int(i)%4 for i in top], 'score', sum(1 for i in top if i%4==ph))
np.save('beatfeat.npy', B)
