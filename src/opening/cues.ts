import {BEATS, downbeat, lastBeatIndex, snap} from '../timing';

const nextBeat = (t: number) => BEATS[lastBeatIndex(t) + 1].t;

// Every cue in the 0:00–1:24 shot list, snapped to the beat nearest Tom's lyric time.
export const T = {
	red: snap(4), // "Pulse is dropping": battery turns red
	popup: snap(7), // "stay with me": low-battery pop-up
	camera: downbeat(4), // verse: camera viewfinder
	lights: snap(14), // "Bright lights"
	mute: snap(17), // "voices fading"
	likes: snap(21), // "Counting every heartbeat"
	one: snap(24),
	two: nextBeat(snap(24) + 0.01),
	doubt: snap(26), // "then doubt": Seen, count drops
	call: snap(29), // "I could hear them calling"
	decline: snap(31.6),
	texts: snap(33), // "I could feel them try"
	dnd: snap(36), // "Then the world went quiet"
	dndTap: nextBeat(snap(36) + 0.01),
	fly: snap(40), // "and I started to fly"
	brk: downbeat(22), // break: 10% pop-up
	stayTap: nextBeat(downbeat(22) + 0.01),
	build: downbeat(23), // scroll accelerates into the tunnel
	spark: snap(49), // "Every beat a spark": each beat flashes a post
	fire: snap(55), // "drum's on fire": huge heart, red 1%
	fade: downbeat(32), // screen dims and glitches
	clear: snap(65), // "Clear!": crack, 0%, black
	rebuild: downbeat(36), // she looks up; party fades in out of focus
	riser: 77, // focus sharpens, frame edges crack
	kickOut: downbeat(43), // hold on her face, eyes up
	flatline: 84.5, // "Flatline": type slams
	drop: downbeat(45), // drop 1: the frame shatters
	end: downbeat(46),
};

/** Battery percentage over the opening. */
export const batteryAt = (t: number): number => {
	if (t >= T.clear) return 0;
	if (t < T.red) return 23;
	if (t < T.brk) return Math.round(20 - ((t - T.red) / (T.brk - T.red)) * 9); // 20 → 11
	if (t < T.build) return 10;
	// once per bar through the build, reaching 1% at "drum's on fire" (bar 29)
	const steps = [9, 7, 5, 4, 3, 2, 1];
	for (let i = steps.length - 1; i >= 0; i--) {
		if (t >= downbeat(23 + i)) return steps[i];
	}
	return 10;
};

export const clockAt = (t: number) => (t < 60 ? '1:47' : '1:48');
