import {T} from '../opening/cues';
import {SONG_DURATION, bt, snap} from '../timing';

// Every cue from drop 1 to the end card. Lyric cues snap to the beat nearest Tom's timing;
// section cues sit on bar lines from the beat grid.
export const F = {
	drop1: T.drop, // 1:24.8 (the opening runs the shatter until T.end)
	dump1: T.end, // photo cuts every 2 beats
	flatline2: snap(92), // 1:32 "Flatline": strobe + type
	heart: bt(51), // 1:35.9 "My heart stopped... and I started dancing"
	stopped: bt(51, 3),
	started: bt(53),
	dancing: bt(54),
	flatline3: bt(61), // 1:54.3 "Flatline"
	couch: bt(62), // drop 2: friends put their phones down, one glow off per beat
	glowsOff: [bt(62, 3), bt(63), bt(63, 3), bt(64), bt(64, 3)],
	join: bt(65), // they join her
	groove: bt(68), // 2:07.1
	// "No pain, no fear, no clock, no name": the start of each sung "no", measured from the voice (the phrases are
	// syncopated, so beats were up to 0.7 s early; Tom, 2026-10-15). The second words land about 128.90, 129.88, 130.50, 131.5.
	noWords: [128.72, 129.62, 130.32, 130.95],
	light: snap(132), // "Just light, so bright"
	fourMin: snap(135), // "gone for four minutes"
	forever: snap(137), // "free for forever"
	together: snap(139), // "back in the beat, we move together"
	beep1: bt(77), // 2:23.6 "Beep, beep, beep, I'm coming back"
	beep2: bt(79), // 2:27.3
	flood: bt(81), // 2:30.9 "hear the monitor sing"
	alive: bt(82), // 2:32.7 "I came back to life to feel everything!"
	kickOut3: 154.6,
	drop3: bt(85), // 2:38.2: she flips the phone face-down
	table: bt(85, 3),
	dump3: bt(86),
	type2: bt(93), // 2:52.8 "Flatline / My heart stopped..."
	type3: bt(97), // 3:00.1 repeat, bigger; arms rise
	swell: 184,
	final: bt(101), // 3:07.4 final drop: one photo per beat
	still: snap(194), // 3:14 "Still": freeze
	dancing2: 196.464, // loudest beat: explode into the group selfie
	slow: bt(107),
	dawn: bt(109),
	screenTime: bt(111),
	stillDancing: 209.0, // last words
	songEnd: SONG_DURATION,
	endCardOut: SONG_DURATION + 3.5,
};
