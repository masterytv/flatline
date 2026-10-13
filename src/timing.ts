import grid from '../data/Flatline_beat_grid.json';

export const FPS = 30;
export const SONG_DURATION = grid.duration_s;

/** Seconds to frames, per CLAUDE.md: frame = round(time × 30). */
export const f = (t: number) => Math.round(t * FPS);

export type Beat = {t: number; bar: number; beat: number};

// Tempo drifts from ~128 to ~132 BPM, so always work from these times.
export const BEATS: Beat[] = (grid.beats as number[][]).map(([t, bar, beat]) => ({t, bar, beat}));
export const SECTIONS = grid.sections;

export const downbeat = (bar: number): number => {
	const b = BEATS.find((x) => x.bar === bar && x.beat === 1);
	if (!b) throw new Error(`No downbeat for bar ${bar}`);
	return b.t;
};

/** Time of a given bar and beat (beat 1 = downbeat). */
export const bt = (bar: number, beat = 1): number => {
	const b = BEATS.find((x) => x.bar === bar && x.beat === beat);
	if (!b) throw new Error(`No beat ${bar}.${beat}`);
	return b.t;
};

export const beatsIn = (t0: number, t1: number, list: Beat[] = BEATS) => list.filter((b) => b.t >= t0 && b.t < t1);

/** Index of the last beat at or before t, or -1. */
export const lastBeatIndex = (t: number, list: Beat[] = BEATS): number => {
	let lo = 0;
	let hi = list.length - 1;
	let ans = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (list[mid].t <= t) {
			ans = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return ans;
};

/** 1 on a beat, decaying exponentially until the next one. */
export const pulse = (t: number, decay = 0.12, list: Beat[] = BEATS): number => {
	const i = lastBeatIndex(t, list);
	if (i < 0) return 0;
	return Math.exp(-(t - list[i].t) / decay);
};

/** Nearest beat time to t (Tom's lyric timings are by ear, to the second). */
export const snap = (t: number): number => {
	const i = lastBeatIndex(t);
	const a = BEATS[Math.max(i, 0)];
	const b = BEATS[Math.min(i + 1, BEATS.length - 1)];
	return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a.t : b.t;
};

/** Tom's lyric timing (by ear; authoritative). Times in seconds. */
export const LYRICS: {t: number; text: string}[] = [
	{t: 4, text: 'Pulse is dropping,'},
	{t: 7, text: 'stay with me'},
	{t: 14, text: 'Bright lights over me,'},
	{t: 17, text: 'voices fading out,'},
	{t: 21, text: 'Counting every heartbeat,'},
	{t: 24, text: 'one, two,'},
	{t: 26, text: 'then doubt,'},
	{t: 29, text: 'I could hear them calling,'},
	{t: 33, text: 'I could feel them try,'},
	{t: 36, text: 'Then the world went quiet,'},
	{t: 40, text: 'and I started to fly.'},
	{t: 45, text: 'Faster, faster, faster, higher,'},
	{t: 49, text: 'Every beat a spark, every spark a fire,'},
	{t: 52, text: 'Faster, faster, take me higher,'},
	{t: 55, text: "My heart is a drum and the drum's on fire."},
	{t: 65, text: 'Clear!'},
	{t: 84.5, text: 'Flatline'},
	{t: 92, text: 'Flatline'},
	{t: 96, text: 'My heart stopped... and I started dancing,'},
	{t: 114, text: 'Flatline'},
	{t: 128, text: 'No pain, no fear, no clock, no name,'},
	{t: 132, text: 'Just light, so bright, I\'m not the same,'},
	{t: 135, text: 'I was gone for four minutes, I was free for forever,'},
	{t: 139, text: "Now I'm back in the beat, and we move together."},
	{t: 143, text: "Beep, beep, beep, I'm coming back,"},
	{t: 147, text: "Beep, beep, beep, I'm coming back,"},
	{t: 151, text: 'Beep, beep, beep, hear the monitor sing,'},
	{t: 153, text: 'I came back to life to feel everything!'},
	{t: 172, text: 'Flatline'},
	{t: 173, text: 'My heart stopped... and I started dancing,'},
	{t: 180, text: 'Flatline'},
	{t: 181, text: 'My heart stopped... and I started dancing!'},
	{t: 194, text: 'Still'},
	{t: 196.46, text: 'Dancing'},
	{t: 209, text: 'Still Dancing'},
];
