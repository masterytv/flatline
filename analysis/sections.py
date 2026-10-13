import numpy as np, json
b=np.load('beats2.npy'); B=np.load('beatfeat.npy')
bar_start_idx=list(range(3,len(b),4))
def bt(n): return float(b[bar_start_idx[n-1]])  # time of bar n
END=212.42
S=[ # name, label, first bar, last bar (inclusive), kind, note, probable lyric
 ('intro','Intro',None,3,'instrumental','No kick. Monitor beeps, spoken line.','"Pulse is dropping... stay with me."'),
 ('verse','Verse',4,21,'vocal','Light kick, steady groove, energy creeps up.','Verse: "Bright lights over me..."'),
 ('break','Break',22,22,'instrumental','Kick drops out for one bar: a breath before the build.',''),
 ('build','Build',23,30,'vocal','Kick returns, hats and risers climb; kick thins in the last 2 bars.','"Faster, faster..."'),
 ('clear','"Clear!"',31,31,'vocal','Sharp vocal hit around 0:59-1:00.','"Clear!"'),
 ('flatline','Flatline',32,35,'instrumental','No kick, energy fades for 4 bars (not true silence).','(flatline tone)'),
 ('predrop','Pre-drop',36,44,'vocal','Light kick back, vocal phrases, riser at bars 41-42, kick pulled out for the last 2 bars.','"(Flatline!) My heart stopped..."'),
 ('drop1','DROP 1',45,50,'instrumental','Full bass, essentially no vocals.','(instrumental drop)'),
 ('breakdown1','Breakdown',51,60,'vocal','Bass fades, mid energy, vocal phrases.','"No pain, no fear, no clock, no name..."'),
 ('drop2','DROP 2',61,67,'vocal','Full bass with vocals.','"My heart stopped... and I started dancing"'),
 ('groove','Groove',68,76,'instrumental','Half-intensity groove, steady bass, little vocal.','(mostly instrumental)'),
 ('breakdown2','Breakdown 2',77,84,'vocal','Low energy; kick out for the last 2 bars; vocals in second half.','"Beep, beep, I\'m coming back..."'),
 ('drop3','DROP 3',85,92,'vocal','Full bass with vocals.','"(Flatline!) My heart stopped..."'),
 ('build2','Build 2',93,100,'vocal','Drops low, vocal swells in last 2 bars, no kick.','"I came back to life to feel everything!"'),
 ('final','FINAL DROP',101,109,'vocal','Loudest part of the song; peak at bar 106.','"My heart stopped... and I started dancing!"'),
 ('outro','Outro',110,113,'instrumental','No kick, fading out.','"Still dancing."'),
]
sections=[]
for key,label,fb,lb,kind,note,lyr in S:
    start = 1.43 if fb is None else bt(fb)
    end = bt(lb+1) if lb+1<=len(bar_start_idx) else END
    if key=='outro': end=211.5
    sections.append(dict(key=key,label=label,start=round(start,2),end=round(end,2),bars=None if fb is None else [fb,lb],vocals=kind,music=note,probable_lyric=lyr))
for s in sections:
    s['length']=round(s['end']-s['start'],1)
    m=lambda x: '%d:%04.1f'%(x//60, x%60)
    print('%-12s %7s - %7s  %5.1fs  bars %-9s %s' % (s['label'], m(s['start']), m(s['end']), s['length'], s['bars'], s['vocals']))
json.dump(sections, open('sections.json','w'), indent=1)
