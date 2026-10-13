import numpy as np, json
b=np.load('beats2.npy'); B=np.load('beatfeat.npy')
S=[
 ("intro","Intro",1.43,8.39,None,"spoken","No kick. Monitor beeps.","\"Pulse is dropping... stay with me.\" (likely)"),
 ("verse","Verse",8.39,42.12,[4,21],"vocal","Light kick, steady groove, energy creeps up.","Verse: \"Bright lights over me...\" (likely)"),
 ("break","Break",42.12,43.99,[22,22],"instrumental","Kick drops out for one bar.",""),
 ("build","Build",43.99,60.79,[23,31],"vocal","Kick returns, risers climb; strong vocal hit at about 0:59-1:00.","\"Faster, faster...\" ending \"...the drum's on fire\" (likely)"),
 ("fade","Fade",60.79,64.49,[32,33],"instrumental","Kick gone, energy falling: the heart giving out.",""),
 ("clear","Clear! + flatline",64.49,68.16,[34,35],"vocal","Lowest point of the song.","\"Clear!\" at about 1:05 (confirmed)"),
 ("rebuild","Rebuild",68.16,84.79,[36,44],"vocal","Light kick returns, riser 1:17-1:21, kick pulled out 1:21-1:25.","\"Flatline!\" at about 1:24-1:25 (confirmed); earlier phrases unconfirmed"),
 ("drop1","DROP 1",84.79,95.85,[45,50],"instrumental","Deep instrumental drop (confirmed).",""),
 ("heart","My heart stopped",95.85,114.27,[51,60],"vocal","Bass eases off, mid energy.","\"My heart stopped... and I started dancing\" at about 1:36 (confirmed)"),
 ("drop2","DROP 2",114.27,127.14,[61,67],"vocal","Full bass with vocals.","Probably \"No pain, no fear, no clock, no name...\" (unconfirmed)"),
 ("groove","Groove",127.14,143.63,[68,76],"instrumental","Half-intensity groove, mostly instrumental.",""),
 ("comingback","Coming back",143.63,158.21,[77,84],"vocal","Low energy; kick out 2:34.6-2:38.2.","\"Beep, beep, I'm coming back\" at about 2:23 (confirmed); \"I came back to life to feel everything!\" likely in the kick-out"),
 ("drop3","DROP 3",158.21,172.81,[85,92],"vocal","Full bass with vocals.","Probably \"(Flatline!) My heart stopped...\" (unconfirmed)"),
 ("build3","Build 3",172.81,187.37,[93,100],"vocal","Low, no kick; vocal swell 3:03.7-3:07.4.","Unconfirmed"),
 ("final","FINAL DROP",187.37,203.96,[101,109],"vocal","Loudest part of the song; the peak is bar 106 at 3:16.5.","\"Still...\" at about 3:14, pause, \"...dancing\" at about 3:16-3:17, landing on the loudest moment (confirmed)"),
 ("outro","Outro",203.96,212.42,[110,113],"vocal","No kick, fading out to the end.","\"Still dancing\" at 3:30-3:32, no pause: the last words (confirmed)"),
]
sections=[dict(key=k,label=l,start=s,end=e,bars=br,vocals=v,music=mu,lyrics=ly) for k,l,s,e,br,v,mu,ly in S]
markers=[
 {"text":"Clear!","time":65.0,"confirmed":True},
 {"text":"Flatline!","time":84.5,"confirmed":True},
 {"text":"My heart stopped... and I started dancing","time":96.0,"confirmed":True},
 {"text":"Beep, beep, I'm coming back","time":143.0,"confirmed":True},
 {"text":"Still...","time":194.0,"confirmed":True},
 {"text":"...dancing (loudest moment, bar 106)","time":196.5,"confirmed":True},
 {"text":"Still dancing (last words)","time":210.0,"end":212.0,"confirmed":True},
]
beats=[]
for i,t in enumerate(b):
    bar = 0 if i<3 else (i-3)//4+1
    beat = (i-3)%4+1 if i>=3 else i+2
    beats.append([round(float(t),3), bar, beat])
J=lambda x: json.dumps(x, separators=(',',':'))
txt='{\n"song":"Flatline",\n"file":"Flatline.mp3",\n"duration_s":212.42,\n'
txt+='"tempo_note":%s,\n' % J("Tempo is not constant: it drifts from about 128 BPM (start) to about 132 BPM (end). Use these beat times, not a fixed BPM grid.")
txt+='"beats_format":%s,\n' % J("[time_seconds, bar, beat_in_bar]; bar 0 = pickup beats before bar 1; beat 1 = downbeat")
txt+='"lyric_markers":[\n'+',\n'.join(J(m) for m in markers)+'\n],\n'
txt+='"sections":[\n'+',\n'.join(J(s) for s in sections)+'\n],\n'
txt+='"beats":[\n'+',\n'.join(J(x) for x in beats)+'\n]\n}\n'
json.loads(txt)
open('Flatline_beat_grid_v2.json','w').write(txt)
def sec_of(t):
    for s in sections:
        if s['start']-0.01<=t<s['end']-0.01: return s['key']
    return 'end'
rows=['bar,start_seconds,start_timecode,section,energy_0_100,bass_0_100']
for n,s in enumerate(range(3,len(b),4),1):
    e=min(s+4,len(b)); r=B[s:e].mean(0); t=float(b[s])
    rows.append('%d,%.3f,%d:%05.2f,%s,%d,%d' % (n,t,t//60,t%60,sec_of(t),round(r[0]*100),round(r[1]*100)))
open('Flatline_bars_v2.csv','w').write('\n'.join(rows)+'\n')
print(len(txt), len('\n'.join(rows))+1)
