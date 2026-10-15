"""Find where sung words start in a window of Flatline, for syncing type to the voice.

Usage: python3 analysis/word_onsets.py <t0> <t1> [media/Flatline.mp3]

The groove repeats every bar, so the background at any moment is estimated as the median of the same moment one to
four bars earlier and later (bar lines from data/Flatline_beat_grid.json, so tempo drift is followed); what is left
is mostly the voice. Prints, every 25 ms, the voice power and its low/high balance: back vowels ("no", "clock")
sit low (500-1500 Hz), front vowels ("pain", "fear", "name") high (1800-3500 Hz), so words show up as the balance
flips. Also writes word_onsets.png (voice spectrogram and power) next to the current directory.
Used on 2026-10-15 to place "Clear!" (65.33) and "No pain, no fear, no clock, no name" (128.72, 129.62, 130.32, 130.95).
"""
import json, os, sys

import librosa
import matplotlib
import numpy as np

matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t0, t1 = float(sys.argv[1]), float(sys.argv[2])
song = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'media', 'Flatline.mp3')
grid = json.load(open(os.path.join(ROOT, 'data', 'Flatline_beat_grid.json')))
B = np.array(grid['beats'])
beats, down = B[:, 0], B[B[:, 2] == 1, 0]

sr, hop = 44100, 256
y, _ = librosa.load(song, sr=sr, mono=True)
S = np.abs(librosa.stft(y, n_fft=4096, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=4096)
T = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)


def bar_pos(t):
    i = np.searchsorted(down, t) - 1
    return i + (t - down[i]) / (down[i + 1] - down[i])


def at_pos(p):
    i = int(np.floor(p))
    return down[i] + (p - i) * (down[i + 1] - down[i])


frames = np.where((T >= t0) & (T <= t1))[0]
voice = np.zeros((S.shape[0], len(frames)))
for n, j in enumerate(frames):
    p = bar_pos(T[j])
    others = [S[:, int(round(at_pos(p + k) * sr / hop))] for k in (-4, -3, -2, -1, 1, 2, 3, 4)]
    bg = np.minimum(np.median(np.stack(others, 1), 1), S[:, j])
    fg = S[:, j] - bg
    voice[:, n] = fg ** 2 / (fg ** 2 + (1.5 * bg) ** 2 + 1e-12) * S[:, j]

tt = T[frames]
power = (voice[(freqs >= 250) & (freqs <= 3500)] ** 2).sum(0)
power = np.convolve(power, np.ones(3) / 3, mode='same')
power /= power.max()
low = (voice[(freqs >= 500) & (freqs <= 1500)] ** 2).sum(0)
high = (voice[(freqs >= 1800) & (freqs <= 3500)] ** 2).sum(0)
for x in np.arange(t0, t1, 0.025):
    j = np.argmin(abs(tt - x))
    on_beat = ' beat' if np.min(abs(beats - x)) < 0.0125 else ''
    print(f'{x:8.3f} power {power[j]:.2f} low/high {low[j] / (high[j] + 1e-9):6.1f} {"#" * int(50 * power[j])}{on_beat}')

fig, ax = plt.subplots(2, 1, figsize=(20, 8), sharex=True, gridspec_kw={'height_ratios': [3, 1]})
sel = (freqs >= 200) & (freqs <= 4000)
ax[0].pcolormesh(tt, freqs[sel], librosa.amplitude_to_db(voice[sel], ref=np.max), shading='auto', cmap='magma', vmin=-50, vmax=0)
ax[1].plot(tt, power, 'k')
for x in beats[(beats >= t0) & (beats <= t1)]:
    for a in ax:
        a.axvline(x, color='grey', lw=0.6, ls=':')
ax[1].set_xticks(np.arange(round(t0, 1), t1, 0.1))
ax[1].tick_params(axis='x', rotation=90, labelsize=7)
plt.tight_layout()
plt.savefig('word_onsets.png', dpi=65)
