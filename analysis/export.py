import numpy as np, json
b=np.load('beats2.npy'); B=np.load('beatfeat.npy'); S=json.load(open('sections.json'))
def sec_of(t):
    for s in S:
        if s['start']-0.01<=t<s['end']-0.01: return s['key']
    return 'pickup' if t<S[0]['end'] else 'end'
beats=[]
for i,t in enumerate(b):
    bar = 0 if i<3 else (i-3)//4+1
    beat = (i-3)%4+1 if i>=3 else i+2
    beats.append([round(float(t),3), bar, beat])
out={"song":"Flatline","file":"Flatline.mp3","duration_s":212.42,
 "tempo_note":"Tempo is not constant: it drifts from about 128 BPM (start) to about 132 BPM (end). Use these beat times, not a fixed BPM grid.",
 "beats_format":"[time_seconds, bar, beat_in_bar]; bar 0 = pickup beats before bar 1; beat 1 = downbeat",
 "sections":[{k:s[k] for k in ('key','label','start','end','bars','vocals','music','probable_lyric')} for s in S],
 "beats":beats}
txt=json.dumps(out, separators=(',',':'))
# pretty sections, compact beats
sec_txt='[\n'+',\n'.join(json.dumps(x, separators=(',',':')) for x in out['sections'])+'\n]'
beats_txt=',\n'.join(json.dumps(x, separators=(',',':')) for x in beats)
final='{\n"song":"Flatline",\n"file":"Flatline.mp3",\n"duration_s":212.42,\n"tempo_note":%s,\n"beats_format":%s,\n"sections":%s,\n"beats":[\n%s\n]\n}\n' % (json.dumps(out['tempo_note']), json.dumps(out['beats_format']), sec_txt, beats_txt)
json.loads(final)
open('Flatline_beat_grid.json','w').write(final)
# per-bar csv
rows=['bar,start_seconds,start_timecode,section,energy_0_100,bass_0_100']
bar_idx=list(range(3,len(b),4))
for n,s in enumerate(bar_idx,1):
    e=min(s+4,len(b)); r=B[s:e].mean(0); t=float(b[s])
    rows.append('%d,%.3f,%d:%05.2f,%s,%d,%d' % (n,t,t//60,t%60,sec_of(t),round(r[0]*100),round(r[1]*100)))
open('Flatline_bars.csv','w').write('\n'.join(rows)+'\n')
print(len(final), len('\n'.join(rows)))
