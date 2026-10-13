import numpy as np, json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, MultipleLocator
b=np.load('beats2.npy'); B=np.load('beatfeat.npy'); S=json.load(open('sections.json'))
energy=np.convolve(B[:,0], np.ones(3)/3, mode='same')
SURF='#fcfcfb'; TXT='#0b0b0b'; TXT2='#52514e'; MUTED='#8a8984'; GRID='#e6e5e1'
BLUE='#2a78d6'; ORANGE='#eb6834'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
fig=plt.figure(figsize=(14,5.2), dpi=150, facecolor=SURF)
ax=fig.add_axes([0.05,0.22,0.93,0.50], facecolor=SURF)
strip=fig.add_axes([0.05,0.09,0.93,0.05], facecolor=SURF, sharex=ax)
for s in S:
    if s['key'].startswith('drop') or s['key']=='final':
        ax.axvspan(s['start'], s['end'], color=ORANGE, alpha=0.12, lw=0)
    if s['key']=='flatline':
        ax.axvspan(s['start'], s['end'], color='#8a8984', alpha=0.15, lw=0)
ax.fill_between(b, 0, energy, color=BLUE, alpha=0.25, lw=0)
ax.plot(b, energy, color=BLUE, lw=2, solid_capstyle='round', solid_joinstyle='round')
clear=[s for s in S if s['key']=='clear'][0]
ax.axvline(59.8, color=TXT2, lw=1, ls=(0,(4,3)))
ax.text(59.8, 0.97, ' "Clear!"', color=TXT, fontsize=9, va='top', ha='left', transform=ax.get_xaxis_transform())
# section labels across the top (two rows to avoid collisions)
row=0
for s in S:
    mid=(s['start']+s['end'])/2
    if s['key'] in ('clear','break'): continue
    bold = s['key'].startswith('drop') or s['key']=='final'
    y = 1.06 if row%2==0 else 1.15
    ax.text(mid, y, s['label'], ha='center', va='bottom', fontsize=9, color=TXT if bold else TXT2, fontweight='bold' if bold else 'normal', transform=ax.get_xaxis_transform())
    row+=1
ax.set_xlim(0, 212.4); ax.set_ylim(0, 1.05)
ax.xaxis.set_major_locator(MultipleLocator(15))
fmt=FuncFormatter(lambda x,p: '%d:%02d'%(x//60, x%60))
ax.xaxis.set_major_formatter(fmt)
ax.set_yticks([0,0.5,1.0]); ax.set_yticklabels(['quiet','','loudest'], color=MUTED, fontsize=9)
ax.grid(axis='y', color=GRID, lw=1); ax.set_axisbelow(True)
for sp in ['top','right','left']: ax.spines[sp].set_visible(False)
ax.spines['bottom'].set_color('#c9c8c3')
ax.tick_params(colors=MUTED, labelsize=9, length=0)
plt.setp(ax.get_xticklabels(), visible=True)
# instrumental strip
for s in S:
    if s['vocals']=='instrumental':
        strip.axvspan(s['start'], s['end'], color=TXT2, lw=0)
strip.set_ylim(0,1); strip.set_yticks([]); 
for sp in strip.spines.values(): sp.set_visible(False)
strip.tick_params(labelbottom=False, length=0)
fig.text(0.05, 0.155, 'Stretches with no vocals (need pure visuals)', color=TXT2, fontsize=9)
fig.text(0.05, 0.945, 'Flatline: energy across the song', color=TXT, fontsize=14, fontweight='bold')
fig.text(0.05, 0.895, 'Loudness per beat. Shaded orange: the four drops. Gray: the flatline stretch. Tempo drifts from 128 to 132 BPM.', color=TXT2, fontsize=10)
fig.savefig('Flatline_energy_map.png', facecolor=SURF)
print('ok')
