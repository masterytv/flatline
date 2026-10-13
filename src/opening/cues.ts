import {BEATS, beatsIn, bt, downbeat, lastBeatIndex, snap} from '../timing';

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

/**
 * 0:08.4–0:21 viewfinder: a camera event every 2 beats (docs/shot-list.md, cut plan).
 * O1 the party → pinch to 2x on Jess → whip to O2 → tap-to-focus → back to 1x → focus hunts →
 * tilt up to O3 on "Bright lights" → auto-exposure blows out → settles → whip to O4 on "voices fading",
 * then the blur steps up on each of the last four events.
 */
export const CAM = {
	o1: bt(4, 1), // 8.394
	pinch: bt(4, 3), // 9.323
	o2: bt(5, 1), // 10.252
	focus: bt(5, 3), // 11.192
	wide: bt(6, 1), // 12.132
	hunt: bt(6, 3), // 13.073
	o3: bt(7, 1), // 13.944 = T.lights
	blowout: bt(7, 3), // 14.861
	settle: bt(8, 1), // 15.882
	o4: bt(8, 3), // 16.811 = T.mute
	fadeSteps: [bt(9, 1), bt(9, 3), bt(10, 1), bt(10, 3)], // 17.763, 18.704, 19.632, 20.561
};
/** Blur (phone units) after each of CAM.fadeSteps, as Sam's and Kai's voices fade. */
export const CAM_FADE_BLUR = [1.5, 5, 9, 13.5];

/** 0:21–0:29 Maya's post: a 2-photo carousel (O5, then O6), then the doubt beats, one every 2 beats. */
export const POST = {
	ids: ['O5', 'O6'],
	swipe: bt(12, 1), // 23.382: swipe to 2/2
	dim: bt(13, 1), // 25.252: the big digits dim
	sent: bt(14, 1), // 27.121: 'did u see my post??'
	seen: bt(14, 3), // 28.061: 'Seen 1:47'
};

/** 0:33–0:40 texts and Do Not Disturb. Kai's 'maya look up' arrives with his photo of her (O7). */
export const CHAT = {
	kai: T.texts + 2.3, // 35.505: Kai's message lands, with the photo
	kaiPhoto: 'O7',
	fill: bt(18, 3), // 35.561: O7 fills the screen
	dims: [bt(19, 3), bt(20, 1)], // 37.407, 38.371: the room behind dims a step each
	lift: bt(20, 3), // 39.311: the control centre lifts
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

/**
 * Feed posts, each photo used once. Post 0 (kai.mp4, O8) holds under the 10% modal; posts 1–5 are
 * O9 jess.wav, O10 luna.jpeg, O11 dev.zip, O12 nia.gif, O13 theo.exe. Posts 6–9 are TokTic cards
 * (FEED_CARDS), and every post after that is a procedural card, so nothing cycles.
 */
export const FEED_IDS = ['O8', 'O9', 'O10', 'O11', 'O12', 'O13'];
export const FEED_CARDS = ['live', 'text', 'poll', 'ad'] as const;
export type FeedCard = (typeof FEED_CARDS)[number];

/**
 * 1:08–1:21, after the screen dies. Rebuild (every 2 beats): 5 room photos, far to near, each used as ONE
 * glance: its left half lands on the first flip and the look-right pan lands on the second. Riser (every
 * beat): the friends reach for her, one photo per beat, then a white flash as the edge cracks meet.
 */
export const REBUILD_IDS = ['O15', 'O16', 'O17', 'O18', 'O19'];
export const RISER_IDS = ['O20', 'O21', 'O22', 'O23', 'O24', 'O25', 'O26'];

/** One photo on screen: it lands at `at`; a rebuild glance pans to its right half at `turnAt`; `id` null is the white flash. */
export type Glance = {id: string | null; at: number; turnAt: number | null; end: number};

const REBUILD_FLIPS = beatsIn(T.rebuild, T.riser)
	.filter((_, i) => i % 2 === 0)
	.map((b) => b.t);
const RISER_FLIPS = beatsIn(T.riser, T.kickOut).map((b) => b.t);
if (REBUILD_FLIPS.length !== 2 * REBUILD_IDS.length || RISER_FLIPS.length !== RISER_IDS.length + 1) {
	throw new Error(`Flip slots changed: ${REBUILD_FLIPS.length} rebuild flips, ${RISER_FLIPS.length} riser beats`);
}

export const GLANCES: Glance[] = [
	...REBUILD_IDS.map((id, i) => ({id, at: REBUILD_FLIPS[2 * i], turnAt: REBUILD_FLIPS[2 * i + 1], end: REBUILD_FLIPS[2 * i + 2] ?? RISER_FLIPS[0]})),
	...RISER_IDS.map((id, i) => ({id, at: RISER_FLIPS[i], turnAt: null, end: RISER_FLIPS[i + 1]})),
	{id: null, at: RISER_FLIPS[RISER_IDS.length], turnAt: null, end: T.kickOut}, // 80.643 white flash
];
/** The riser's white flash, as the edge cracks meet. */
export const CRACK_FLASH = RISER_FLIPS[RISER_IDS.length];

/** The glance showing at t (null before the rebuild or from the kick-out on). */
export const flipAt = (t: number): Glance | null => GLANCES.find((g) => t >= g.at && t < g.end) ?? null;

/** Kick-out (1:21–1:24.8): small changes every 2 beats under her face. */
export const KICK = {
	crackStep: bt(43, 3), // 82.024: the edge cracks step
	sharp: bt(44, 1), // 82.942: her face is sharp, the push continues
	build: bt(44, 3), // 83.870: the cracks and shake build
};
