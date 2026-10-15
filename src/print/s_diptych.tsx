import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, SERIF} from './ink';
import {clamp01, CropMarks, easeIn, easeInOut, easeOut, inked, kickNudge, lerp, RegTarget, Slug, slap, stamp, Tape} from './kit';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, Press, SheetCanvas} from './Press';
import {Frame, K_FILL, useStage, VMap} from './stage';

// 2:52.8 to 3:07.8, build 3: the walk back (bars 93 to 101.1).
// Diptych: the zine, before and after. P34 (earlier, lit by her phone) printed cold on the left page; a flat cold
//   rule under 'my heart stopped' runs to the fold, the three dots step onto the blank right page one per beat
//   (cold, the two inks overprinted, heat), then P35 (now, under a streetlight) is pulled onto it in orange and
//   black; a page turn lands P36 (the five walking home) across the spread.
// Hoist: the same lyric goes public as fly-posters on a pale wall, the type going from black to orange as she comes
//   alive. P37 (Dev, arms down) with a FLATLINE snipe, MY HEART / STOPPED stamped black on the wall (its heat beats
//   once more off register), P38 (Jess, arms out), MY HEART throbbing in heat (the heart restarting), P39 (Kai, arms
//   rising) with an AND I STARTED snipe, then P40 (Maya, arms fully up) hoisted through the swell with her key plate
//   drifting out of register, a DANCING snipe, a cut in to her face on the swell's last beat, and the snap into
//   register on the final-drop downbeat.

/* ----------------------------------------------------------------------------------------------------- */
/* photos                                                                                                */

type Photo = {map: string; crop: [number, number, number, number]};

/**
 * Crops (image fractions u0, v0, u1, v1 of the 2752x1536 still), each matched to the aspect of the box it prints in.
 * All seven were read off gridded copies of the real photos. P37 to P40 share one pale wall whose left edge (the
 * dark street beyond it) slants from u 0.335 at the top to u 0.35 at the bottom: the wall posters' crops start at or
 * just past it, or the street prints as a solid black bar down the poster's left side.
 */
const PHOTOS: Record<string, Photo> = {
	// her profile (u 0.50-0.69, eye at u 0.65 v 0.36) at the middle, facing the fold; the bottom stops at v 0.92,
	// above the phone's glow (u 0.82-0.92, v 0.92-1), which printed as a hole in the corner
	P34: {map: 'P34', crop: [0.345, 0, 0.873, 0.92]},
	// her face (u 0.47-0.62, v 0.2-0.6) a little right of centre, turned toward the fold; the streetlight top left
	P35: {map: 'P35', crop: [0.213, 0, 0.787, 1]},
	// the gutter (the crop's centre, u 0.4725) falls in the gap between Kai (right edge u 0.445) and Sam's shoe (u 0.50)
	P36: {map: 'P36', crop: [0, 0.019, 0.945, 0.981]},
	// Dev (u 0.40-0.62) on the pale wall; the crop starts clear of the wall's dark left edge (u 0.335-0.34)
	P37: {map: 'P37', crop: [0.347, 0, 0.7365, 1]},
	// Jess: her raised hand (u 0.347-0.38) stays in, the sleeve beyond the wall is trimmed; her other hand ends u 0.715
	P38: {map: 'P38', crop: [0.345, 0, 0.7344, 1]},
	// Kai (u 0.36-0.65, arms up, face u 0.52 v 0.3), cropped like P37
	P39: {map: 'P39', crop: [0.347, 0, 0.7364, 1]},
	// Maya, arms up: hands v 0.105-0.21, face u 0.475-0.535 v 0.37-0.48, elbows u 0.325 (trimmed to the wall) and 0.70
	P40: {map: 'P40', crop: [0.34, 0, 0.7293, 1]},
};
const photo = (id: string): Photo => PHOTOS[id];

/* ----------------------------------------------------------------------------------------------------- */
/* shared                                                                                                */

type Pose = {cx: number; cy: number; s: number; rot: number};
type Move = {t: number; to: Pose; dur: number};
const pose = (cx: number, cy: number, s: number, rot = 0): Pose => ({cx, cy, s, rot});

const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: a.s * Math.pow(b.s / a.s, k), rot: lerp(a.rot, b.rot, k)});

/** Camera on short, fast moves: each one starts on its beat from wherever the last one had got to. */
const track = (t: number, moves: Move[]): Pose => {
	let from = moves[0].to;
	let to = moves[0].to;
	let t0 = -1e9;
	let dur = 1;
	for (const m of moves.slice(1)) {
		const mt = at(m.t);
		if (mt > t) break;
		from = lerpPose(from, to, easeOut((mt - t0) / dur));
		to = m.to;
		t0 = mt;
		dur = m.dur;
	}
	return lerpPose(from, to, easeOut((t - t0) / dur));
};

/**
 * The hit every beat gives the rostrum: a few px of shake and a punch, gone in a quarter beat. `shake` scales the
 * shake (the 9:16 cut halves it: its stage px are 1.78 frame px on a frame 1080 wide).
 */
const beatHit = (cam: Pose, t: number, from: number, amp: (beatT: number) => number = () => 1, shake = 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || BEATS[i].t < from - 1e-6) return cam;
	const a = amp(BEATS[i].t);
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * a;
	const s = cam.s * (1 + 0.012 * k);
	return {cx: cam.cx - ((hash2(i, 3, 43) - 0.5) * 16 * k * shake) / s, cy: cam.cy - ((hash2(i, 5, 43) - 0.5) * 11 * k * shake) / s, s, rot: cam.rot + (hash2(i, 7, 43) - 0.5) * 0.5 * k};
};

/**
 * 9:16: the phone looks at each stage through SEAM (full bleed on the stage's centre), so the section's own camera is
 * the phone's camera. A phone pose: world point (cx, cy) at the frame's centre, z frame px per world px.
 */
const SEAM: Frame = {k: K_FILL, x: 960, y: 540};
const ph = (cx: number, cy: number, z: number, rot = 0): Pose => pose(cx, cy, z / K_FILL, rot);
const V_SHAKE = 0.5;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;

/**
 * When an animation cued on beat c starts, so that the cue's own frame (the first whose mid-frame time is past c)
 * already shows one frame of it: half a frame before that frame's start.
 */
const at = (c: number) => (Math.round(c * 30) - 0.5) / 30;

/** World-space SVG layer (children in world px), so one ink mask can cover a whole block of type. */
const WorldSvg: React.FC<{box: [number, number, number, number]; children: React.ReactNode; style?: React.CSSProperties}> = ({box, children, style}) => {
	const [x, y, w, h] = box;
	return (
		<svg viewBox={`${x} ${y} ${w} ${h}`} style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'visible', mixBlendMode: 'multiply', ...style}}>
			{children}
		</svg>
	);
};

/** A scale about a point, as an SVG transform. */
const about = (x: number, y: number, s: number, rot = 0) => `translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-x} ${-y})`;

/**
 * A snipe: a strip pasted across a poster. `bar` set: a solid strip with the word knocked out (letters show what is
 * under it, or paper with `paperLetters`). `bar` unset: a paper strip with the word printed in `ink`.
 */
const Snipe: React.FC<{
	id: string;
	cx: number;
	cy: number;
	w: number;
	h: number;
	rot: number;
	text: string;
	size: number;
	spacing?: number;
	bar?: string;
	ink?: string;
	paperLetters?: boolean;
	s?: number;
	dx?: number;
	dy?: number;
}> = ({id, cx, cy, w, h, rot, text, size, spacing = 0.04, bar, ink = INK.key, paperLetters, s = 1, dx = 0, dy = 0}) => {
	const base = h / 2 + size * 0.86 * 0.5; // centre the caps (Anton cap height 0.859 em)
	const letters = (fill: string) => (
		<text x={w / 2} y={base} textAnchor="middle" fontFamily="Anton" fontSize={size} letterSpacing={size * spacing} fill={fill}>
			{text}
		</text>
	);
	return (
		<div style={{position: 'absolute', left: cx - w / 2 + dx, top: cy - h / 2 + dy, width: w, height: h, transform: `rotate(${rot}deg) scale(${s})`, mixBlendMode: 'multiply'}}>
			<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0, overflow: 'visible', ...inked(900, (cx * 0.37) % 300, 11, true)}}>
				<defs>
					<mask id={`snipe-${id}`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
						<rect width={w} height={h} fill="white" />
						{letters('black')}
					</mask>
				</defs>
				{bar ? (
					<>
						{paperLetters && <rect width={w} height={h} fill={INK.paper} />}
						<rect width={w} height={h} fill={bar} mask={`url(#snipe-${id})`} />
					</>
				) : (
					<>
						<rect width={w} height={h} fill={INK.paper} />
						{letters(ink)}
					</>
				)}
			</svg>
		</div>
	);
};

/** The squeegee crossing a page top to bottom, a bead of ink ahead of the blade. */
const Squeegee: React.FC<{x: number; y: number; w: number; ink: string}> = ({x, y, w, ink}) => (
	<div style={{position: 'absolute', left: x - 50, top: y - 14, width: w + 100, height: 60}}>
		<div style={{position: 'absolute', left: 50, top: 0, width: w, height: 14, background: ink, borderRadius: 7, mixBlendMode: 'multiply', ...inked(500, 0, 3)}} />
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 13,
				width: w + 100,
				height: 30,
				background: 'linear-gradient(180deg, #4A4540 0%, #2A2724 55%, #1E1C1A 100%)',
				borderRadius: 4,
				boxShadow: '0 14px 26px rgba(40,25,10,0.38)',
			}}
		/>
		<div style={{position: 'absolute', left: 0, top: 19, width: w + 100, height: 4, background: 'rgba(255,255,255,0.13)'}} />
	</div>
);

/** Where a squeegee that starts at t0 is (0 at the top edge, 1 past the bottom), and whether it is on screen. */
const pullAt = (t: number, cue: number, dur: number) => {
	const t0 = at(cue);
	const x = clamp01((t - t0) / dur);
	const k = t < t0 ? 0 : 1 - (1 - x) * (1 - x); // hits fast on the beat, eases into the bottom edge
	const exit = clamp01((t - t0 - dur) / 0.1);
	return {k, on: t >= t0 && exit < 1, exit};
};

/* ----------------------------------------------------------------------------------------------------- */
/* DIPTYCH (172.815 to 180.106): the zine                                                                */

const SPREAD = {x: 80, y: 40, w: 1760, h: 1000};
const GUT = SPREAD.x + SPREAD.w / 2; // the fold, x 960
const IMG_W = 720;
const IMG_H = 700;
const IMG_TOP = 96;
const LEFT_IMG = {x: GUT - 60 - IMG_W, y: IMG_TOP}; // 180..900
const RIGHT_IMG = {x: GUT + 60, y: IMG_TOP}; // 1020..1740
const CAP1 = 870; // caption baseline, line 1
const CAP2 = 985; // line 2
const CAP_SIZE = 80;
const DOT_D = 40;
const DOT_X = [GUT + 82, GUT + 152, GUT + 222];
const STARTED_X = GUT + 268;
const RULE_Y = CAP1 + 38; // the flat rule under 'my heart stopped', below the descenders

type Box = {x: number; y: number; w: number; h: number};
type Line = {text: string; x: number; y: number; end?: boolean};
/** Where the zine's pages put their prints and words (world px); the 9:16 cut lays the pages out for the phone. */
type ZineLayout = {
	left: Box; // P34, cold
	right: Box; // P35, orange then black
	crop: Record<'P34' | 'P35', [number, number, number, number]>;
	cap: number; // caption size
	heart: Line[]; // 'my heart stopped', cold, on the left page
	heartAt: [number, number]; // where its stamp scales from
	started: Line[]; // 'and I started', heat, on the right page
	dancing: Line & {size: number};
	dotX: number[];
	dotY: number;
	dotD: number;
	rule: {x0: number; y: number};
	poise: number; // the orange squeegee's wait, on the top margin
	poiseK: number; // the black squeegee's wait
};
const ZL16: ZineLayout = {
	left: {...LEFT_IMG, w: IMG_W, h: IMG_H},
	right: {...RIGHT_IMG, w: IMG_W, h: IMG_H},
	crop: {P34: PHOTOS.P34.crop, P35: PHOTOS.P35.crop},
	cap: CAP_SIZE,
	heart: [{text: 'my heart stopped', x: LEFT_IMG.x + IMG_W, y: CAP1, end: true}],
	heartAt: [LEFT_IMG.x + IMG_W, CAP1],
	started: [{text: 'and I started', x: STARTED_X, y: CAP1}],
	dancing: {text: 'dancing', x: RIGHT_IMG.x, y: CAP2, size: 140},
	dotX: DOT_X,
	dotY: CAP1 - DOT_D / 2,
	dotD: DOT_D,
	rule: {x0: LEFT_IMG.x, y: RULE_Y},
	poise: 56, // where the orange squeegee waits, on the top margin (the 94.4 framing shows it)
	// where a black squeegee waits: lower, resting on the screen over the print's top edge, so the pushes on 95.2 and
	// 96.2 (framed tighter and lower than 94.4) still show the blade waiting
	poiseK: 136,
};
/**
 * 9:16: each page is a phone-shaped column. The prints are narrower (500 wide, one phone width at the page views'
 * zoom) and the words are set big in short lines under them: 'my heart / stopped' (cold, flush to the fold) on the
 * left; on the right the dots step over the fold on the 'stopped' line, then 'and I / started' (heat) and 'dancing'
 * (black). Before is the smaller print, after the taller one. Crops re-read off the photos for the new boxes: P34's
 * profile (eye u 0.65 v 0.36) left of centre, looking at the fold; P35's face (u 0.47-0.62) centred.
 */
const ZLV: ZineLayout = {
	left: {x: 420, y: 110, w: 500, h: 390},
	right: {x: 1000, y: 110, w: 500, h: 490},
	crop: {P34: [0.275, 0.05, 0.8975, 0.92], P35: [0.283, 0, 0.807, 0.92]},
	cap: 116,
	heart: [
		{text: 'my heart', x: 880, y: 624, end: true},
		{text: 'stopped', x: 880, y: 742, end: true},
	],
	heartAt: [880, 742],
	started: [
		{text: 'and I', x: GUT + 208, y: 742},
		{text: 'started', x: 1000, y: 860},
	],
	dancing: {text: 'dancing', x: 1000, y: 978, size: 136},
	// the dots stay on the left page with her: three beats strung on the flat rule under 'stopped', twice the size
	dotX: [520, 640, 760],
	dotY: 790,
	dotD: 80,
	rule: {x0: 420, y: 790},
	poise: 100, // on the image's top edge, below the feed's top bar in the 94.4 framing
	poiseK: 136,
};
/** Whether the dots sit on the left page (9:16), where they stay through the page turn. */
const dotsLeft = (L: ZineLayout) => L.dotX[0] < GUT;

/**
 * 9:16: FLATLINE as two stacked snipes over P34, FLAT on her face and LINE under it, the letters windows onto her.
 * LINE lands where the battery's flat rule was (frame y 958 under the slam's camera): the line becomes the word.
 */
const FLAT_V = [
	{text: 'FLAT', cx: 690, cy: 300, rot: -2},
	// a wedge of paper between the two strips (15 px at the left, 55 at the right); where the crossed bars overlapped,
	// multiply printed a dark sliver
	{text: 'LINE', cx: 690, cy: 565, rot: 2.5},
];
const FLAT_V_BOX = {w: 520, h: 230, size: 240};
/** Where the vertical stamp lifts from (the stack's middle). */
const FLAT_V_LIFT = '690px 432px';

/**
 * The three dots cross from the screen world into real life: the first in cold, the second the two inks
 * overprinted a little out of register (plum, with a fringe of each), the third in heat, the ink of 'and I started'.
 * Coordinates in the svg's own px; `s` scales each dot (its stamp).
 */
const Dots: React.FC<{L: ZineLayout; x0: number; y: number; n: number; s?: (i: number) => number}> = ({L, x0, y, n, s = () => 1}) => (
	<>
		{L.dotX.slice(0, n).map((x, i) => {
			const r = (L.dotD / 2) * s(i);
			const cx = x - GUT + x0;
			const blend: React.CSSProperties = {mixBlendMode: 'multiply'};
			if (i === 0) return <circle key={i} cx={cx} cy={y} r={r} fill={INK.cold} />;
			if (i === 2) return <circle key={i} cx={cx} cy={y} r={r} fill={INK.heat} />;
			return (
				<g key={i}>
					<circle cx={cx - 3} cy={y + 2} r={r} fill={INK.cold} style={blend} />
					<circle cx={cx + 3} cy={y - 2} r={r} fill={INK.heat} style={blend} />
				</g>
			);
		})}
	</>
);

const Z = {
	slam: bt(93), // 172.815 'Flatline': the zine slams open, P34 cold on the left, FLATLINE across the spread
	caption: bt(93, 3), // 173.732 'my heart stopped'; the stamp lifts
	rule: bt(93, 4), // 174.184 the flat rule draws under it to the fold
	dots: [bt(94), bt(94, 2), bt(94, 3)], // 174.626, 175.078, 175.543
	orange: bt(95), // 176.448 P35 orange pull, 'and I started'
	blackWait: bt(95, 2), // 176.924 the black squeegee drops onto the screen
	black: bt(95, 3), // 177.377 black pull, 'dancing'
	turn: bt(96), // 178.283 page turn lands: P36 across the spread, orange
	black2Wait: bt(96, 2), // 178.736 the black squeegee drops onto the spread
	black2: bt(96, 3), // 179.188 black pull
};
const PULL = 0.22;
const TURN = 6 / 30; // the page turns in 6 frames and lands on the downbeat

const ZINE_MOVES: Move[] = [
	{t: -1e9, to: pose(960, 540, 1), dur: 1},
	{t: Z.caption, to: pose(585, 548, 1.27), dur: 0.16}, // the left page: her profile and the caption
	{t: bt(93, 4), to: pose(600, 540, 1.31), dur: 0.3},
	{t: Z.dots[0], to: pose(905, 600, 1.4), dur: 0.14}, // the fold: the sentence runs across it
	{t: Z.dots[1], to: pose(975, 604, 1.46), dur: 0.12},
	{t: Z.dots[2], to: pose(1045, 608, 1.52), dur: 0.12},
	{t: bt(94, 4), to: pose(1330, 470, 1.18), dur: 0.2}, // the blank right page, the squeegee poised
	{t: Z.orange, to: pose(1390, 520, 1.24), dur: 0.14},
	{t: bt(95, 2), to: pose(1390, 505, 1.3), dur: 0.3}, // a push, the black blade waiting at the top
	{t: Z.black, to: pose(960, 540, 1), dur: 0.16}, // wide: before and after, side by side
	{t: bt(95, 4), to: pose(960, 536, 1.045), dur: 0.3},
	{t: Z.turn - TURN, to: pose(960, 540, 1.01), dur: 0.2},
	{t: Z.turn, to: pose(960, 540, 1), dur: 0.1},
	{t: bt(96, 2), to: pose(1010, 535, 1.09), dur: 0.2}, // a push, the black blade waiting across the spread
	{t: Z.black2, to: pose(1010, 556, 1.12), dur: 0.3},
	{t: bt(96, 4), to: pose(1180, 420, 1.36), dur: 0.18}, // in on their heads (Sam laughing on Dev's back, Maya at the right), into the cut
];

/** The spread lands on the table: 1.05 to 1 in 3 frames. */
const spreadScale = (t: number) => (t < Z.slam ? 1 : 1 + 0.05 * (1 - easeOut((t - Z.slam) / (3 / 30))));
/** Scale a world point about the middle of the spread. */
const sp = (S: number, x: number, y: number): [number, number] => [960 + (x - 960) * S, 540 + (y - 540) * S];

/**
 * 9:16, the phone's camera on the zine (frame px per world px; a page fills the phone at 1.92). It opens on the left
 * page, FLAT / LINE stamped over her (LINE where the battery's rule was), punches in on the echo and lifts the stamp
 * off into her profile over 'my heart / stopped'. The rule runs to the fold, the dots step onto it under 'stopped'
 * with her face held above (the heart's stop stays on her), then a cut to the right page with the orange blade
 * already pulling P35, her face as the black blade drops, the whole 'after' page for the black pull and 'dancing'. The
 * spread is seen once, before/after side by side at 177.8, pushing in as the page turns; then the five walking home
 * full bleed: Sam on Dev's back, Maya, Jess and Kai under the black pull, Maya closer into the cut.
 */
const ZINE_MOVES_V: Move[] = [
	// the left page fills the phone, thrown a little askew: FLAT / LINE stamped over her, LINE level on the battery's rule
	{t: -1e9, to: ph(690, 566, 1.92, -3), dur: 1},
	{t: bt(93, 2), to: ph(710, 450, 2.02), dur: 0.06}, // the orange echo: a punch in, square, on the stack
	{t: Z.caption, to: ph(690, 470, 2), dur: 0.15}, // the stamp lifts off: her profile over 'my heart / stopped'
	// the rule draws to the fold and the camera leans after it, no further than keeps 'my heart' whole (x 78-878)
	{t: Z.rule, to: ph(722, 520, 2.1), dur: 0.3},
	// the dots step onto the rule under 'stopped', one per beat, her face held above them: a cut out, then two pushes
	{t: Z.dots[0], to: ph(700, 570, 1.85), dur: 0.02},
	{t: Z.dots[1], to: ph(705, 570, 1.95), dur: 0.12},
	{t: Z.dots[2], to: ph(710, 570, 2.05), dur: 0.12},
	{t: bt(94, 4), to: ph(712, 556, 2.15), dur: 0.12}, // a last push on her eye; the heart is still stopped
	{t: Z.orange, to: ph(1225, 545, 1.85), dur: 0.02}, // cut: the right page, the orange blade already pulling P35 down
	{t: bt(95, 2), to: ph(1250, 350, 3.2), dur: 0.12}, // a push on her face, the black blade waiting above it
	{t: Z.black, to: ph(1219, 622, 1.7), dur: 0.02}, // cut: the whole 'after' page for the black pull and 'dancing' (its descender above y 1620)
	{t: bt(95, 4), to: ph(985, 560, 0.9), dur: 0.2}, // pull back: before and after side by side, the photos the phone's width
	{t: Z.turn - TURN, to: ph(960, 540, 1.3), dur: 0.18}, // in with the turning page as it sweeps over the fold
	{t: Z.turn, to: ph(1188, 540, 1.92), dur: 0.02}, // the turn lands, full bleed: Sam on Dev's back, Maya's hand reaching in
	{t: bt(96, 2), to: ph(1550, 470, 1.92), dur: 0.02}, // cut: Maya, the black blade dropping above her
	{t: Z.black2, to: ph(690, 520, 1.92), dur: 0.02}, // cut: Jess and Kai as the black pull passes down them
	{t: bt(96, 4), to: ph(1550, 440, 2.2), dur: 0.02}, // cut: Maya again, closer, into the cut to the wall
	{t: bt(96, 4) + 0.06, to: ph(1556, 430, 2.32), dur: 0.36}, // leaning in after her, into the cut
];

const zineCam = (t: number, vertical = false): Cam => {
	const base = track(t, vertical ? ZINE_MOVES_V : ZINE_MOVES);
	const big = (b: number) => (near(b, Z.slam) ? 2.6 : near(b, Z.turn) ? 2.2 : Z.dots.some((d) => near(d, b)) ? 1.5 : 1);
	return vertical ? beatHit(base, t, Z.slam, big, V_SHAKE) : beatHit(base, t, Z.slam, big);
};

const p34Plates = (t: number): Plate[] => {
	const [bx, by] = kickNudge(t, 2, 2.2);
	return [{ch: 2, ink: INK.cold, angle: 75, cell: 6.5, kind: 'line', gain: 1.0, dx: bx, dy: by}];
};

const p35Plates = (t: number, oPull: number, kPull: number): Plate[] => {
	const [hx, hy] = kickNudge(t, 1, 3);
	const [kx, ky] = kickNudge(t, 0, 1.5);
	return [
		{ch: 1, ink: INK.heat, angle: 15, cell: 7, pull: oPull, pullY: true, dx: 2 + hx, dy: -1 + hy},
		{ch: 0, ink: INK.key, angle: 45, cell: 7, pull: kPull, pullY: true, gain: 0.85, gamma: 1.25, dx: kx, dy: ky},
	];
};

/**
 * `cell`: 8.5 on the 16:9 spread. The phone cuts in on the five at 2x, where 8.5 made Sam's laugh a dozen dots, so
 * its spread is printed finer (P36_CELL_V).
 */
const p36Plates = (t: number, kPull: number, cell = 8.5): Plate[] => {
	const [hx, hy] = kickNudge(t, 1, 3);
	const [kx, ky] = kickNudge(t, 0, 1.5);
	// orange alone would flood the night street, so it is opened up a little (gamma)
	const plates: Plate[] = [{ch: 1, ink: INK.heat, angle: 15, cell, gamma: 1.5, dx: 2 + hx, dy: -1 + hy}];
	if (kPull > 0) plates.push({ch: 0, ink: INK.key, angle: 45, cell, pull: kPull, pullY: true, gain: 0.85, gamma: 1.3, dx: kx, dy: ky});
	return plates;
};
const P36_CELL_V = 5.5;

/** The pages: two leaves of a stapled zine on the table, the fold in the middle. */
const Leaves: React.FC = () => (
	<>
		<div style={{position: 'absolute', left: SPREAD.x, top: SPREAD.y, width: SPREAD.w, height: SPREAD.h, boxShadow: '0 26px 54px rgba(60,40,20,0.38), 0 3px 6px rgba(60,40,20,0.25)'}}>
			<Paper x={0} y={0} w={SPREAD.w} h={SPREAD.h} />
		</div>
		{/* the stack of pages under the spread shows at the outer edges */}
		<div style={{position: 'absolute', left: SPREAD.x - 4, top: SPREAD.y + 6, width: 4, height: SPREAD.h - 8, background: '#D7CBB2'}} />
		<div style={{position: 'absolute', left: SPREAD.x + SPREAD.w, top: SPREAD.y + 6, width: 4, height: SPREAD.h - 8, background: '#D7CBB2'}} />
	</>
);

/** The fold's shading and the staples, laid over the ink. */
const Fold: React.FC = () => (
	<>
		<div
			style={{
				position: 'absolute',
				left: SPREAD.x,
				top: SPREAD.y,
				width: SPREAD.w,
				height: SPREAD.h,
				background:
					'linear-gradient(90deg, rgba(60,40,20,0.07) 0%, rgba(60,40,20,0) 14%, rgba(60,40,20,0) 41%, rgba(60,40,20,0.16) 48.6%, rgba(30,20,10,0.42) 50%, rgba(60,40,20,0.14) 51.4%, rgba(60,40,20,0) 58%, rgba(60,40,20,0) 86%, rgba(60,40,20,0.07) 100%)',
				mixBlendMode: 'multiply',
			}}
		/>
		{[300, 780].map((y) => (
			<div
				key={y}
				style={{
					position: 'absolute',
					left: GUT - 2,
					top: y - 22,
					width: 4,
					height: 44,
					borderRadius: 2,
					background: 'linear-gradient(90deg, #8B8680, #D8D4CC 45%, #77726B)',
					boxShadow: '0 1px 1px rgba(0,0,0,0.3)',
				}}
			/>
		))}
	</>
);

/** The right page as it was before the turn, in page px (0,0 = the fold at the top of the spread). */
const RightPageFace: React.FC<{d: Record<string, Density>; t: number; res: number; L: ZineLayout}> = ({d, t, res, L}) => {
	const p = photo('P35');
	const R = L.right;
	return (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: INK.paper}}>
			<Paper x={0} y={0} w={SPREAD.w / 2} h={SPREAD.h} />
			<div style={{position: 'absolute', left: R.x - GUT, top: R.y - SPREAD.y}}>
				<SheetCanvas res={res} sheet={{map: d[p.map], crop: L.crop.P35, w: R.w, h: R.h, seed: 35, plates: p35Plates(t, 2, 2)}} />
			</div>
			<CropMarks x={R.x - GUT} y={R.y - SPREAD.y} w={R.w} h={R.h} gap={10} len={26} />
			<Slug x={R.x - GUT} y={22} text="13 · AFTER · 2:52 AM · THE WALK HOME" size={14} />
			<WorldSvg box={[0, 0, SPREAD.w / 2, SPREAD.h]}>
				{!dotsLeft(L) && <Dots L={L} x0={0} y={L.dotY - SPREAD.y} n={3} />}
				{L.started.map((l) => (
					<text key={l.text} x={l.x - GUT} y={l.y - SPREAD.y} fontFamily={SERIF} fontStyle="italic" fontSize={L.cap} fill={INK.heat}>
						{l.text}
					</text>
				))}
				<text x={L.dancing.x - GUT} y={L.dancing.y - SPREAD.y} fontFamily={SERIF} fontStyle="italic" fontSize={L.dancing.size} fill={INK.key}>
					{L.dancing.text}
				</text>
			</WorldSvg>
		</div>
	);
};

/** P36's left half: the back of the turning page, already printed in orange. */
const P36HalfFace: React.FC<{d: Record<string, Density>; t: number; res: number; cell: number}> = ({d, t, res, cell}) => {
	const p = photo('P36');
	return (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: INK.paper}}>
			<Paper x={0} y={0} w={SPREAD.w / 2} h={SPREAD.h} />
			<SheetCanvas
				res={res}
				sheet={{
					map: d[p.map],
					crop: p.crop,
					w: SPREAD.w,
					h: SPREAD.h,
					seed: 36,
					plates: p36Plates(t, 0, cell),
					clip: [
						[0, 0],
						[0.5, 0],
						[0.5, 1],
						[0, 1],
					],
				}}
			/>
		</div>
	);
};

export const Diptych: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	const L = vertical ? ZLV : ZL16;
	const d = useDensities(['P34', 'P35', 'P36'].map((id) => photo(id).map));
	const cam = zineCam(t, vertical);
	const S = spreadScale(t);
	const turnK = clamp01((t - (Z.turn - TURN)) / TURN);
	const turning = turnK > 0 && turnK < 1;
	const turned = t >= Z.turn;
	// the turn: an ease-in flip that slaps down on the beat (degrees, 0 = flat on the right, 180 = flat on the left)
	const theta = 180 * easeIn(turnK) * 0.35 + 180 * easeInOut(turnK) * 0.65;

	const o35 = pullAt(t, Z.orange, PULL);
	const k35 = pullAt(t, Z.black, PULL);
	const k36 = pullAt(t, Z.black2, 0.26);
	const rTop = SPREAD.y;
	const pageH = SPREAD.h;
	const sqY = (k: number, y0: number) => y0 + k * (rTop + pageH + 40 - y0); // the blade's world y, from where it waited
	const imgPull = (k: number, y0: number, top: number, h: number) => (k <= 0 ? 0 : clamp01((sqY(k, y0) - top) / h));
	const oPull35 = imgPull(o35.k, L.poise, L.right.y, L.right.h);
	const kPull35 = imgPull(k35.k, L.poiseK, L.right.y, L.right.h);

	const c36 = vertical ? P36_CELL_V : 8.5;
	const sheets: Sheet[] = [];
	if (d) {
		const place = (cx: number, cy: number) => {
			const [x, y] = sp(S, cx, cy);
			return {cx: x, cy: y, s: S};
		};
		const p34 = photo('P34');
		const p35 = photo('P35');
		const p36 = photo('P36');
		if (!turned) {
			sheets.push({map: d[p34.map], crop: L.crop.P34, w: L.left.w, h: L.left.h, ...place(L.left.x + L.left.w / 2, L.left.y + L.left.h / 2), seed: 34, plates: p34Plates(t)});
			if (!turning && t >= Z.orange) {
				sheets.push({map: d[p35.map], crop: L.crop.P35, w: L.right.w, h: L.right.h, ...place(L.right.x + L.right.w / 2, L.right.y + L.right.h / 2), seed: 35, plates: p35Plates(t, oPull35, kPull35)});
			}
			if (turning) {
				// under the lifting page: the next spread's right half, orange already
				sheets.push({
					map: d[p36.map],
					crop: p36.crop,
					w: SPREAD.w,
					h: SPREAD.h,
					...place(960, 540),
					seed: 36,
					plates: p36Plates(t, 0, c36),
					clip: [
						[0.5, 0],
						[1, 0],
						[1, 1],
						[0.5, 1],
					],
				});
			}
		} else {
			sheets.push({map: d[p36.map], crop: p36.crop, w: SPREAD.w, h: SPREAD.h, ...place(960, 540), seed: 36, plates: p36Plates(t, imgPull(k36.k, L.poiseK, SPREAD.y, SPREAD.h), c36)});
		}
	}

	// FLATLINE stamped across the spread on the downbeat; lifted off on 'my heart stopped'
	const flat = stamp(t, Z.slam);
	const lift = t < at(Z.caption) ? 0 : easeOut((t - at(Z.caption)) / (5 / 30));
	// on 93.2 the stamp's last heartbeat: an orange strike of the same bar, off register, gone in a few frames
	const echo = t >= bt(93, 2) && t < Z.caption ? Math.exp(-(t - bt(93, 2)) / 0.09) : 0;
	const cap = stamp(t, Z.caption);
	// the turning page's canvas: fine enough for the zoom it is seen at (the 9:16 frame is 1.78 stage px per px)
	const res = vertical ? Math.min(2, Math.max(1, cam.s * K_FILL)) : Math.max(1, cam.s);
	const spreadT = `translate(960px, 540px) scale(${S}) translate(-960px, -540px)`;

	// captions on the right page are printed by the squeegee: revealed above the blade only
	const revealY = (k: number, y0: number) => (k <= 0 ? -1e4 : sqY(k, y0));
	const clipAbove = (y: number): React.CSSProperties => ({clipPath: `inset(0 0 ${Math.max(0, 3000 - y)}px 0)`});

	return (
		<AbsoluteFill style={{background: '#D2C3A4'}}>
			<CamLayer cam={cam}>
				{/* 9:16: the phone's wide sees much more table above and below the spread */}
				{vertical ? <Paper tint="#CFC0A0" x={-1600} y={-2200} w={5120} h={5500} /> : <Paper tint="#CFC0A0" />}
				<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: spreadT}}>
					<Leaves />
				</div>
			</CamLayer>
			{d && <Press cam={cam} sheets={sheets} />}
			<CamLayer cam={cam}>
				<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 3000, transformOrigin: '0 0', transform: spreadT}}>
					{!turned && (
						<>
							<CropMarks x={L.left.x} y={L.left.y} w={L.left.w} h={L.left.h} gap={10} len={26} color={INK.cold} />
							{!turning && <CropMarks x={L.right.x} y={L.right.y} w={L.right.w} h={L.right.h} gap={10} len={26} />}
							{/* left page: one cold ink, the caption in it */}
							{cap.on && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 13, 7)}>
									<g transform={about(L.heartAt[0], L.heartAt[1], cap.s)}>
										{L.heart.map((l) => (
											<text key={l.text} x={l.x} y={l.y} textAnchor={l.end ? 'end' : undefined} fontFamily={SERIF} fontStyle="italic" fontSize={L.cap} fill={INK.cold}>
												{l.text}
											</text>
										))}
									</g>
								</WorldSvg>
							)}
							{/* the dots: the sentence steps over the fold onto the blank page, one per beat (9:16: on the left page's rule) */}
							{(!turning || dotsLeft(L)) && t >= Z.dots[0] && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(300, 40, 0, true)}>
									<Dots L={L} x0={GUT} y={L.dotY} n={Z.dots.filter((b) => t >= b).length} s={(i) => stamp(t, Z.dots[i]).s * (1 + 0.25 * Math.exp(-(t - Z.dots[i]) / 0.05))} />
								</WorldSvg>
							)}
							{/* 93.4: the flat rule runs under the caption to the fold, where the dots will pick it up */}
							{t >= at(Z.rule) && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(600, 3, 29)}>
									<line x1={L.rule.x0} y1={L.rule.y} x2={lerp(L.rule.x0, GUT - 16, easeOut((t - at(Z.rule)) / 0.2))} y2={L.rule.y} stroke={INK.cold} strokeWidth={5} />
								</WorldSvg>
							)}
							{/* the right page's words, printed by the two pulls */}
							{!turning && o35.k > 0 && (
								<div style={{position: 'absolute', inset: 0, ...clipAbove(revealY(o35.k, L.poise))}}>
									<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 31, 2)}>
										{L.started.map((l) => (
											<text key={l.text} x={l.x} y={l.y} fontFamily={SERIF} fontStyle="italic" fontSize={L.cap} fill={INK.heat}>
												{l.text}
											</text>
										))}
									</WorldSvg>
								</div>
							)}
							{!turning && k35.k > 0 && (
								<div style={{position: 'absolute', inset: 0, ...clipAbove(revealY(k35.k, L.poiseK))}}>
									<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 5, 19)}>
										<text x={L.dancing.x} y={L.dancing.y} fontFamily={SERIF} fontStyle="italic" fontSize={L.dancing.size} fill={INK.key}>
											{L.dancing.text}
										</text>
									</WorldSvg>
								</div>
							)}
							<Slug x={L.left.x} y={SPREAD.y + 22} text="12 · BEFORE · 1:47 AM · THE SOFA" size={14} color={INK.cold} />
							{!turning && <Slug x={L.right.x} y={SPREAD.y + 22} text="13 · AFTER · 2:52 AM · THE WALK HOME" size={14} />}
						</>
					)}
					{turned && <Slug x={SPREAD.x + 30} y={SPREAD.y + SPREAD.h - 34} text="14–15 · ALL FIVE · 2:58 AM · O 15° K 45°" size={14} color={INK.paper} />}
					<Fold />
					{/* FLATLINE: the shout, stamped across both pages; on the left its letters are windows onto her */}
					{flat.on && lift < 1 && !vertical && (
						<div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - lift, transform: `translate(0px, ${-46 * lift}px) scale(${1 + 0.12 * lift})`, transformOrigin: '960px 470px'}}>
							{echo > 0.03 && (
								<Snipe id="zine-flat-echo" cx={960} cy={466} w={1600} h={360} rot={-2} text="FLATLINE" size={380} spacing={0.03} bar={INK.heat} s={1.012} dx={16 * echo} dy={-11 * echo} />
							)}
							<Snipe id="zine-flat" cx={960} cy={466} w={1600} h={360} rot={-2} text="FLATLINE" size={380} spacing={0.03} bar={INK.key} s={flat.s} />
						</div>
					)}
					{/* 9:16: FLAT / LINE, two snipes stacked over her on the left page */}
					{flat.on && lift < 1 && vertical && (
						<div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - lift, transform: `translate(0px, ${-46 * lift}px) scale(${1 + 0.12 * lift})`, transformOrigin: FLAT_V_LIFT}}>
							{echo > 0.03 &&
								FLAT_V.map((l) => (
									<Snipe key={l.text} id={`zine-v-echo-${l.text}`} cx={l.cx} cy={l.cy} w={FLAT_V_BOX.w} h={FLAT_V_BOX.h} rot={l.rot} text={l.text} size={FLAT_V_BOX.size} spacing={0.03} bar={INK.heat} s={1.012} dx={12 * echo} dy={-8 * echo} />
								))}
							{FLAT_V.map((l) => (
								<Snipe key={l.text} id={`zine-v-${l.text}`} cx={l.cx} cy={l.cy} w={FLAT_V_BOX.w} h={FLAT_V_BOX.h} rot={l.rot} text={l.text} size={FLAT_V_BOX.size} spacing={0.03} bar={INK.key} s={flat.s} />
							))}
						</div>
					)}
				</div>
				{/* the page turn: the right leaf lifts off the fold and lands on the left */}
				{turning && d && (
					<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 3000, transformOrigin: '0 0', transform: spreadT}}>
						{/* its shadow on the pages beneath */}
						<div
							style={{
								position: 'absolute',
								left: theta < 90 ? GUT : SPREAD.x,
								top: SPREAD.y,
								width: SPREAD.w / 2,
								height: SPREAD.h,
								background:
									theta < 90
										? 'linear-gradient(90deg, rgba(40,25,10,0.5), rgba(40,25,10,0.1) 70%, rgba(40,25,10,0))'
										: 'linear-gradient(270deg, rgba(40,25,10,0.5), rgba(40,25,10,0.1) 70%, rgba(40,25,10,0))',
								opacity: Math.sin((theta * Math.PI) / 180) * 0.9,
								mixBlendMode: 'multiply',
							}}
						/>
						{theta < 90 ? (
							<div
								style={{
									position: 'absolute',
									left: GUT,
									top: SPREAD.y,
									width: SPREAD.w / 2,
									height: SPREAD.h,
									transformOrigin: '0 50%',
									transform: `perspective(2600px) rotateY(${-theta}deg)`,
									boxShadow: '0 10px 30px rgba(40,25,10,0.3)',
								}}
							>
								<RightPageFace d={d} t={t} res={res} L={L} />
								<div
									style={{
										position: 'absolute',
										inset: 0,
										background: `linear-gradient(90deg, rgba(40,25,10,${0.3 * Math.sin((theta * Math.PI) / 180)}), rgba(255,250,240,${0.12 * Math.sin((theta * Math.PI) / 180)}))`,
									}}
								/>
							</div>
						) : (
							<div
								style={{
									position: 'absolute',
									left: SPREAD.x,
									top: SPREAD.y,
									width: SPREAD.w / 2,
									height: SPREAD.h,
									transformOrigin: '100% 50%',
									transform: `perspective(2600px) rotateY(${180 - theta}deg)`,
									boxShadow: '0 10px 30px rgba(40,25,10,0.3)',
								}}
							>
								<P36HalfFace d={d} t={t} res={res} cell={c36} />
								<div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, rgba(40,25,10,${0.3 * Math.sin((theta * Math.PI) / 180)}), rgba(255,250,240,0))`}} />
							</div>
						)}
					</div>
				)}
				{/* the squeegees */}
				<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 3000, transformOrigin: '0 0', transform: spreadT}}>
					{t >= at(bt(94, 4)) && t < at(Z.orange) && <Squeegee x={GUT + 22} y={L.poise - 90 * (1 - easeOut((t - at(bt(94, 4))) / 0.15))} w={SPREAD.w / 2 - 44} ink={INK.heat} />}
					{o35.on && <Squeegee x={GUT + 22} y={sqY(o35.k, L.poise) + 400 * o35.exit} w={SPREAD.w / 2 - 44} ink={INK.heat} />}
					{/* 95.2 and 96.2: the black squeegee drops onto the screen on the beat and waits for the pull */}
					{t >= at(Z.blackWait) && t < at(Z.black) && <Squeegee x={GUT + 22} y={L.poiseK - 120 * (1 - easeOut((t - at(Z.blackWait)) / 0.1))} w={SPREAD.w / 2 - 44} ink={INK.key} />}
					{t >= at(Z.black2Wait) && t < at(Z.black2) && <Squeegee x={SPREAD.x + 20} y={L.poiseK - 120 * (1 - easeOut((t - at(Z.black2Wait)) / 0.1))} w={SPREAD.w - 40} ink={INK.key} />}
					{k35.on && <Squeegee x={GUT + 22} y={sqY(k35.k, L.poiseK) + 400 * k35.exit} w={SPREAD.w / 2 - 44} ink={INK.key} />}
					{k36.on && <Squeegee x={SPREAD.x + 20} y={sqY(k36.k, L.poiseK) + 400 * k36.exit} w={SPREAD.w - 40} ink={INK.key} />}
				</div>
			</CamLayer>
		</AbsoluteFill>
	);
};

/* ----------------------------------------------------------------------------------------------------- */
/* HOIST (180.106 to 187.826): the wall of fly-posters                                                   */

const H = {
	flat: bt(97), // 180.106 'Flatline': P37 slapped up, the FLATLINE snipe across it
	heart: bt(97, 3), // 181.023 MY HEART / STOPPED stamped on the wall
	p38: bt(98), // 181.928 P38
	kick: bt(98, 3), // 182.834 a register kick
	started: bt(99), // 183.740 AND I STARTED + P39; P40 starts rising
	steps: [bt(99, 2), bt(99, 3), bt(99, 4)], // 184.204, 184.668, 185.121
	dancing: bt(100), // 185.562 DANCING stamps on screen
	widest: bt(100, 3), // 186.479 the drift at its widest
	snap: bt(101), // 187.373 final drop: snap into register
};

const PW = 600; // a wall poster's image, paper px (aspect 0.698 = its crop's)
const PH = 860;
const PM = 14; // paper margin round the image
const PFOOT = 40;

type Poster = {id: string; cx: number; cy: number; rot: number; t0: number; label: string};
const WALL: Poster[] = [
	{id: 'P37', cx: 360, cy: 530, rot: -1.8, t0: H.flat, label: '01/04 · DEV · 3:00 AM · ARMS DOWN'},
	{id: 'P38', cx: 2060, cy: 520, rot: 1.4, t0: H.p38, label: '02/04 · JESS · 3:01 AM · ARMS OUT'},
	{id: 'P39', cx: 2700, cy: 545, rot: -1.0, t0: H.started, label: '03/04 · KAI · 3:03 AM · ARMS UP'},
];
const HERO = {id: 'P40', cx: 3560, w: 680, h: 975, cy: 515}; // Maya, hoisted; cy is where she ends up
// her poster is the finer print (the others are 7.5): her face is ~96 px wide on it, 17 dots instead of 13, so it
// still reads as a face through the push to 1.2 and the drift
const HERO_CELL = 5.5;

/** World point of image fraction (u, v) of a photo printed in a box of w x h centred on (cx, cy). */
const inBox = (id: string, u: number, v: number, cx: number, cy: number, w: number, h: number): [number, number] => {
	const [u0, v0, u1, v1] = PHOTOS[id].crop;
	return [cx - w / 2 + ((u - u0) / (u1 - u0)) * w, cy - h / 2 + ((v - v0) / (v1 - v0)) * h];
};
// Faces read off the photos: Dev's in P37 (u 0.50, v 0.29), Jess's in P38 (u 0.505, v 0.31; eyes v 0.29), Maya's in
// P40 (u 0.505, v 0.37-0.48, centre 0.43; eyes v 0.415; her hands v 0.105-0.21)
const DEV_FACE = inBox('P37', 0.5, 0.29, 360, 530, 600, 860);
const JESS_FACE = inBox('P38', 0.505, 0.31, 2060, 520, 600, 860);
const MAYA_FACE = inBox('P40', 0.505, 0.43, 3560, 515, 680, 975);

/** The heart block on the wall, both lines set to the same measure (MY HEART 3.695 em, STOPPED 3.192 em). */
const MH = {x: 880, w: 836, base1: 352};
const MH_S1 = MH.w / 3.695;
const MH_S2 = MH.w / 3.192;
const MH_BASE2 = MH.base1 + 26 + MH_S2 * 0.859;
/**
 * 9:16: the heart block hangs on the wall under Jess's poster (P38's paper ends at y 990), right-aligned to her print,
 * so the phone holds poster over type: the type first under the bare patch, then P38 slapped up above it. Its right
 * edge (x 2346) stays left of Kai's frame (x 2360 on).
 */
const MHV = {x: 1510, w: 836, base1: 1234};
const MHV_BASE2 = MHV.base1 + 26 + MH_S2 * 0.859;

const SNIPE_Y = 800;

const HOIST_MOVES: Move[] = [
	{t: -1e9, to: pose(430, 600, 1.28), dur: 1}, // tight: Dev and the FLATLINE snipe
	{t: bt(97, 2), to: pose(DEV_FACE[0], DEV_FACE[1] + 70, 2.1), dur: 0.06}, // punch in: his face, head back, eyes shut
	{t: H.heart, to: pose(880, 490, 1), dur: 0.05}, // cut: Dev at the left, the heart block
	{t: bt(97, 4), to: pose(895, 485, 1.03), dur: 0.3},
	{t: H.p38, to: pose(1820, 520, 1), dur: 0.08}, // whip right: the heart block and Jess
	{t: bt(98, 2), to: pose(JESS_FACE[0], JESS_FACE[1] + 40, 2.3), dur: 0.06}, // punch in: Jess, her face and both hands
	{t: H.kick, to: pose(1210, 520, 0.8), dur: 0.08}, // the register kick: wide, the wall so far
	{t: bt(98, 4), to: pose(MH.x + MH.w / 2, 392, 1.12), dur: 0.1}, // push in on the heart block: it beats again, in heat
	{t: bt(98, 4) + 0.12, to: pose(MH.x + MH.w / 2 + 12, 388, 1.16), dur: 0.33},
	{t: H.started, to: pose(3050, 590, 1), dur: 0.08}, // Kai and AND I STARTED; Maya's poster comes up from below
	{t: H.steps[0], to: pose(3075, 570, 1), dur: 0.2},
	{t: H.steps[1], to: pose(3100, 555, 1), dur: 0.2},
	{t: H.steps[2], to: pose(3120, 545, 1), dur: 0.2},
	{t: H.dancing, to: pose(3140, 525, 0.96), dur: 0.08}, // AND I STARTED / DANCING on one line
	// the swell: a push a beat into her, the plates sliding further apart
	{t: bt(100, 2), to: pose(3300, 500, 1.1), dur: 0.12},
	{t: H.widest, to: pose(3470, 532, 1.2), dur: 0.12}, // her hands to DANCING, the plates furthest apart
	// the last beat of the swell: cut in to her face (15% of the frame), eyes high, her arms going up out of frame
	{t: bt(100, 4), to: pose(MAYA_FACE[0] + 18, MAYA_FACE[1] + 25, 3), dur: 0.03},
	{t: bt(100, 4) + 0.04, to: pose(MAYA_FACE[0] + 22, MAYA_FACE[1] + 22, 3.07), dur: 0.42},
	{t: H.snap, to: pose(3480, 525, 1), dur: 0.05}, // the drop: out to the whole poster, in register, taped up
];

/**
 * 9:16, the phone's camera on the wall (frame px per world px). Every lyric is framed whole: FLATLINE across Dev's
 * poster, MY HEART / STOPPED as wide as the phone allows, AND I / STARTED stacked over Kai, DAN / CING stacked on Maya.
 * The heart block hangs under Jess's poster: it stamps under the pasted patch where she goes, she is slapped up above
 * it, and the kick holds the stacked pair. Between them it punches in on the faces on the off beats (Dev, Jess), and
 * from 99.2 follows Maya's poster up the wall one pull per beat, the camera lagging so she climbs the frame, then
 * pushes in through the swell, cuts to her face and snaps out to the whole poster on the drop.
 */
const HOIST_MOVES_V: Move[] = [
	{t: -1e9, to: ph(380, 600, 1.45), dur: 1}, // Dev's poster filling the width, the FLATLINE snipe whole across it
	{t: bt(97, 2), to: ph(300, 365, 2.4), dur: 0.04}, // punch in: his face, head back, eyes shut
	// cut: MY HEART / STOPPED low in the frame, centred on the safe area (x 61-939), under the bare patch P38 will cover
	{t: H.heart, to: ph(1966, 880, 1.05), dur: 0.03},
	{t: bt(97, 4), to: ph(1966, 870, 1.05, -1), dur: 0.3}, // STOPPED's heat beats once more: a lean
	{t: H.p38, to: ph(1992, 820, 0.99), dur: 0.08}, // P38 slapped up above the type: out a touch, poster over type
	{t: bt(98, 2), to: ph(1960, 400, 2.3), dur: 0.06}, // punch in: her face and raised hand
	{t: H.kick, to: ph(1992, 820, 0.99), dur: 0.08}, // the register kick: the stacked pair, poster over type, y 223-1618
	{t: bt(98, 4), to: ph(1966, 1300, 1.05), dur: 0.1}, // in on the heart block: it beats again, in heat
	{t: bt(98, 4) + 0.12, to: ph(1970, 1288, 1.05), dur: 0.33},
	{t: H.started, to: ph(2720, 640, 1.5), dur: 0.03}, // cut: Kai, AND I / STARTED
	// Maya's poster hoisted up the wall, a pull per beat; the camera follows a little behind, so she climbs the frame
	{t: H.steps[0], to: ph(3560, 1050, 1.4), dur: 0.03},
	{t: H.steps[1], to: ph(3560, 960, 1.4), dur: 0.2},
	{t: H.steps[2], to: ph(3560, 860, 1.4), dur: 0.2},
	{t: H.dancing, to: ph(3560, 738, 1.55), dur: 0.08}, // DAN / CING stamped on her: a punch in, the poster bleeding, CING above y 1620
	{t: bt(100, 2), to: ph(3560, 760, 1.7), dur: 0.12}, // the swell: pushes a beat apart, the plates sliding apart
	{t: H.widest, to: ph(3565, 790, 1.8), dur: 0.12},
	// the swell's last beat: cut in to her face, the words gone below (the DAN strip's top edge, y ~708, kept below the
	// frame's bottom edge: 3.4 at y 450 left a sliver of it along the bottom)
	{t: bt(100, 4), to: ph(3510, 435, 3.6), dur: 0.03},
	{t: bt(100, 4) + 0.04, to: ph(3512, 438, 3.68), dur: 0.42},
	{t: H.snap, to: ph(3560, 600, 1.2), dur: 0.05}, // the drop: out to the whole poster, in register, taped up
];

const hoistCam = (t: number, vertical = false): Cam => {
	const big = (b: number) => (near(b, H.flat) ? 2.4 : near(b, H.kick) ? 2 : near(b, H.dancing) ? 2 : near(b, H.snap) ? 3 : 1);
	return vertical ? beatHit(track(t, HOIST_MOVES_V), t, H.flat, big, V_SHAKE) : beatHit(track(t, HOIST_MOVES), t, H.flat, big);
};

/**
 * 9:16 type on the wall. FLATLINE sits lower and further left on Dev's poster, so the punch in on his face and the frames of the heart
 * block stay clear of it.
 * AND I STARTED is two paper strips stacked over Kai, DANCING two orange strips stacked on Maya's poster below her
 * face (offsets from her poster's centre), each line at least 180 px tall on the phone.
 */
/** Narrower than 16:9's (900 x 250, size 232), so the opening can frame Dev's poster at 1.45 with the word whole. */
const SNIPE_V = {cx: 340, cy: 880, w: 620, h: 180, size: 160};
const STARTED_V = [
	{text: 'AND I', cx: 2610, cy: 760, w: 430, h: 200, rot: -2.5},
	{text: 'STARTED', cx: 2700, cy: 950, w: 640, h: 200, rot: 2},
];
const STARTED_SIZE_V = 170;
const DANCING_V = [
	{text: 'DAN', dx: -20, dy: 315, w: 450, h: 230, rot: -3},
	{text: 'CING', dx: 20, dy: 530, w: 520, h: 230, rot: 2},
];
const DANCING_SIZE_V = 210;
/** Maya's drift reads a little wider on the phone, where her poster fills the frame. */
const V_DRIFT = 1.3;

/** Maya's poster height through the swell: a pull on the rope each beat, with a little overshoot. */
const HOIST_STEPS: [number, number][] = [
	[H.started, 1350],
	[H.steps[0], 1110],
	[H.steps[1], 880],
	[H.steps[2], 680],
	[H.dancing, HERO.cy],
];
const heroY = (t: number) => {
	let y = HERO.cy + 1150;
	let prev = y;
	let t0 = -1;
	for (const [tt, yy] of HOIST_STEPS) {
		if (t < tt) break;
		prev = y;
		y = yy;
		t0 = tt;
	}
	if (t0 < 0) return y;
	const k = clamp01((t - at(t0)) / 0.16);
	// back ease: overshoots ~4% and settles
	const e = 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
	return lerp(prev, y, e);
};

/** How far Maya's plates are out of register (screen px), stepping up through the swell; 0 from the drop. */
const DRIFT: [number, number][] = [
	[H.started, 6],
	[H.steps[0], 10],
	[H.steps[1], 14],
	[H.steps[2], 18],
	[H.dancing, 21],
	[bt(100, 2), 24],
	[H.widest, 29],
	[bt(100, 4), 18],
];
/** The close-up's drift, from its first frame: a fringe on her hair and sleeves, about a dot and a half. */
const CLOSE_DRIFT = 18;
const driftAt = (t: number) => {
	if (t >= H.snap) return 0;
	let v = 0;
	let prev = 0;
	let t0 = -1;
	for (const [tt, vv] of DRIFT) {
		if (t < tt) break;
		prev = v;
		v = vv;
		t0 = tt;
	}
	return t0 < 0 ? 0 : lerp(prev, v, easeOut((t - at(t0)) / 0.12));
};

/** Paste stains and torn remnants of older posters: the wall has been posted on before. */
const SCRAPS: {x: number; y: number; w: number; h: number; r: number; word?: string}[] = [
	{x: -330, y: 250, w: 300, h: 560, r: -3, word: 'SAT 14'},
	{x: 1250, y: 700, w: 380, h: 300, r: 2},
	{x: 2430, y: 40, w: 220, h: 170, r: 4},
	{x: 3070, y: 990, w: 420, h: 150, r: -2},
	{x: 3990, y: 300, w: 300, h: 640, r: 3, word: 'JUNE'},
];
/** 9:16 moves the pale scrap that sat under the heart block in 16:9 off to the left, out of every phone frame. */
const SCRAP_V_X: Record<number, number> = {1: 1040};
const WallMarks: React.FC<{vertical?: boolean}> = ({vertical = false}) => (
	<>
		{SCRAPS.map(({x: x16, y, w, h, r, word}, i) => {
			const x = vertical ? (SCRAP_V_X[i] ?? x16) : x16;
			const pts: string[] = [];
			const n = 9;
			for (let k = 0; k <= n; k++) pts.push(`${((k / n) * w).toFixed(0)},${(hash2(k, i, 1) * 30).toFixed(0)}`);
			for (let k = n; k >= 0; k--) pts.push(`${((k / n) * w).toFixed(0)},${(h - hash2(k, i, 2) * 30).toFixed(0)}`);
			return (
				<svg key={i} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'visible', transform: `rotate(${r}deg)`}}>
					<defs>
						<clipPath id={`scrap-${i}`}>
							<polygon points={pts.join(' ')} />
						</clipPath>
					</defs>
					<polygon points={pts.join(' ')} fill="#E8DECA" stroke="rgba(120,95,60,0.2)" strokeWidth={1.5} />
					{word && (
						<g clipPath={`url(#scrap-${i})`} opacity={0.075}>
							<text x={-40} y={h * 0.62} fontFamily="Anton" fontSize={h * 0.5} fill={INK.key}>
								{word}
							</text>
						</g>
					)}
				</svg>
			);
		})}
		{[
			[820, 640, 340, 0.06],
			[2370, 720, 280, 0.05],
			[3090, 300, 420, 0.06],
			[120, 960, 380, 0.05],
		].map(([x, y, r, a], i) => (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: x - r,
					top: y - r * 0.6,
					width: r * 2,
					height: r * 1.2,
					borderRadius: '50%',
					background: `radial-gradient(closest-side, rgba(150,115,60,${a}), rgba(150,115,60,0))`,
					mixBlendMode: 'multiply',
				}}
			/>
		))}
	</>
);

/**
 * 9:16: wheatpaste brushed onto the wall where P38 goes, so the bare patch over MY HEART / STOPPED (181.0, a beat
 * before she is slapped up) reads as a wall made ready: broad wet strokes, a sheen, a couple of drips. Once P38 is up
 * it shows only as a wet margin round her paper.
 */
const PASTE = {cx: 2060, cy: 533, w: 668, h: 950, rot: 1.1};
const PastePatch: React.FC = () => {
	const {w, h} = PASTE;
	// the damp patch: a ragged rectangle, a shade darker than the dry wall
	const pts: string[] = [];
	const n = 12;
	for (let k = 0; k <= n; k++) pts.push(`${((k / n) * w).toFixed(0)},${(hash2(k, 1, 71) * 16).toFixed(0)}`);
	for (let k = 0; k <= n; k++) pts.push(`${(w - hash2(k, 2, 71) * 16).toFixed(0)},${((k / n) * h).toFixed(0)}`);
	for (let k = n; k >= 0; k--) pts.push(`${((k / n) * w).toFixed(0)},${(h - hash2(k, 3, 71) * 16).toFixed(0)}`);
	for (let k = n; k >= 0; k--) pts.push(`${(hash2(k, 4, 71) * 16).toFixed(0)},${((k / n) * h).toFixed(0)}`);
	// the brush: long criss-crossed sweeps, the way paste goes on, faint inside the damp
	const sweeps: [number, number, number, number][] = [
		[40, 120, w - 30, 380],
		[30, 520, w - 50, 230],
		[50, 640, w - 40, 860],
		[20, 900, w - 60, 610],
	];
	return (
		<svg
			viewBox={`0 0 ${w} ${h}`}
			style={{position: 'absolute', left: PASTE.cx - w / 2, top: PASTE.cy - h / 2, width: w, height: h, overflow: 'visible', transform: `rotate(${PASTE.rot}deg)`}}
		>
			<defs>
				<clipPath id="paste-v">
					<polygon points={pts.join(' ')} />
				</clipPath>
			</defs>
			<g style={{mixBlendMode: 'multiply'}}>
				<polygon points={pts.join(' ')} fill="rgba(125,98,58,0.07)" />
				<g clipPath="url(#paste-v)">
					{sweeps.map(([x0, y0, x1, y1], i) => (
						<path key={i} d={`M ${x0} ${y0} L ${x1} ${y1}`} stroke="rgba(125,98,58,0.035)" strokeWidth={150} strokeLinecap="round" fill="none" />
					))}
				</g>
				{/* drips run from the bottom edge toward the type */}
				{[
					[132, 34],
					[402, 22],
					[566, 44],
				].map(([x, len], i) => (
					<path key={i} d={`M ${x} ${h - 8} L ${x} ${h - 8 + len}`} stroke="rgba(125,98,58,0.1)" strokeWidth={7} strokeLinecap="round" fill="none" />
				))}
			</g>
			{/* the wet sheen along one sweep */}
			<path d={`M 90 ${h * 0.24} L ${w - 110} ${h * 0.31}`} stroke="rgba(255,253,245,0.13)" strokeWidth={46} strokeLinecap="round" fill="none" clipPath="url(#paste-v)" />
			<path d={`M 150 ${h * 0.25} L ${w - 180} ${h * 0.3}`} stroke="rgba(255,253,245,0.12)" strokeWidth={12} strokeLinecap="round" fill="none" clipPath="url(#paste-v)" />
		</svg>
	);
};

/** A poster's paper (DOM), under its print. */
const PosterPaper: React.FC<{cx: number; cy: number; w: number; h: number; rot: number; s: number; shadow: string; label: string; wet: number; children?: React.ReactNode}> = ({
	cx,
	cy,
	w,
	h,
	rot,
	s,
	shadow,
	label,
	wet,
	children,
}) => {
	const W = w + 2 * PM;
	const Hh = h + PM + PFOOT;
	return (
		<div
			style={{
				position: 'absolute',
				left: cx - w / 2 - PM,
				top: cy - h / 2 - PM,
				width: W,
				height: Hh,
				transformOrigin: `${PM + w / 2}px ${PM + h / 2}px`,
				transform: `rotate(${rot}deg) scale(${s})`,
				boxShadow: shadow,
			}}
		>
			<Paper x={0} y={0} w={W} h={Hh} />
			<Slug x={PM} y={PM + h + 13} text={label} size={14} />
			<RegTarget x={W - PM - 12} y={PM + h + 21} r={7} />
			{/* fresh paste: a sheen and a wrinkle that dry off in half a second */}
			{wet > 0 && (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: `linear-gradient(115deg, rgba(255,255,255,0) 20%, rgba(255,255,255,${0.22 * wet}) 38%, rgba(255,255,255,0) 52%, rgba(90,70,40,${0.1 * wet}) 64%, rgba(255,255,255,0) 76%)`,
					}}
				/>
			)}
			{children}
		</div>
	);
};

/**
 * A poster's two plates. `close`: the close-up on 100.4, printed finer (about the dot size on screen of the wide frames,
 * so her face is ~25 dots across), its heat pushed up a little so the shading of her closed eyes and mouth reads.
 */
const posterPlates = (t: number, seed: number, kick: number, drift = 0, cell = 7.5, close = false): Plate[] => {
	const [hx, hy] = kickNudge(t, 1 + seed, 2.5);
	const [kx, ky] = kickNudge(t, seed, 1.5);
	return [
		{ch: 1, ink: INK.heat, angle: 15, cell, gain: close ? 1.2 : 1, gamma: close ? 0.9 : 1, dx: 2 + hx + 15 * kick, dy: -1 + hy - 9 * kick},
		// the drift moves the key alone, mostly sideways: hair and sleeves fringe in orange while the faces, whose
		// shading is all in the heat, stay whole (moving the heat instead slid her face off its own eyes and mouth)
		{ch: 0, ink: INK.key, angle: 45, cell, gain: 0.85, gamma: 1.25, dx: kx - 8 * kick - drift, dy: ky + 5 * kick + 0.2 * drift},
	];
};

export const Hoist: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	const d = useDensities(['P37', 'P38', 'P39', 'P40'].map((id) => photo(id).map));
	const cam = hoistCam(t, vertical);
	const kick = t >= H.kick ? Math.exp(-(t - H.kick) / 0.14) : 0;
	// the close-up on 100.4, a hard cut in, until the drop's snap (t equals at(c) on the frame before a cue's frame)
	const close = t > at(bt(100, 4)) && t <= at(H.snap);
	const drift0 = close ? CLOSE_DRIFT : driftAt(t);
	const drift = vertical ? drift0 * V_DRIFT : drift0;

	// the wall posters
	const live = WALL.filter((p) => t >= p.t0);
	const wallSheets: Sheet[] = [];
	if (d) {
		live.forEach((p, n) => {
			const sl = slap(t, p.t0);
			const ph = photo(p.id);
			wallSheets.push({map: d[ph.map], crop: ph.crop, w: PW, h: PH, cx: p.cx, cy: p.cy, s: sl.s, rot: p.rot + 1.2 * (1 - sl.k), seed: 37 + n * 5, plates: posterPlates(t, n * 3, kick, drift * 0.35)});
		});
	}

	// Maya, hoisted
	const heroOn = t >= H.started;
	const hy = heroY(t);
	const pasted = t >= H.snap ? slap(t, H.snap) : null;
	const sway = t < H.snap ? Math.sin((t - H.started) * 5.1) * 0.9 * (1 - clamp01((t - H.dancing) / 1.2) * 0.6) : 0;
	const heroS = pasted ? pasted.s : 1;
	const p40 = photo(HERO.id);
	const heroSheet: Sheet | null =
		d && heroOn ? {map: d[p40.map], crop: p40.crop, w: HERO.w, h: HERO.h, cx: HERO.cx, cy: hy, s: heroS, rot: sway, seed: 40, plates: posterPlates(t, 9, kick * 0.6, drift, close ? 3.8 : HERO_CELL, close)} : null;
	const heroShadow = pasted ? pasted.shadow : `0 34px 60px rgba(45,30,15,0.42)`;

	// type
	const flatSt = stamp(t, H.flat);
	const heartSt = stamp(t, H.heart);
	// STOPPED is black (the heart has stopped); its heat beats once more off register on 97.4, and again on the kick
	const ghostAt = (b: number, until: number) => (t >= b && t < until ? Math.exp(-(t - b) / 0.13) : 0);
	const ghost = Math.max(ghostAt(bt(97, 4), H.p38), ghostAt(H.kick, H.started));
	// 98.4: the heart starts again before the words say so. MY HEART overprints in heat, off register, and throbs
	// twice (ba-dum), a beat ahead of AND I STARTED
	const beatK = (b: number) => (t >= b ? Math.exp(-(t - b) / 0.08) : 0);
	const restart = t > at(bt(98, 4)) && t < H.started;
	const thump = restart ? Math.max(beatK(at(bt(98, 4))), 0.7 * beatK(at(bt(98, 4)) + 0.17)) : 0;
	const startedSt = stamp(t, H.started);
	const dancingSt = stamp(t, H.dancing);
	const rot40 = (sway * Math.PI) / 180;
	// the DANCING snipe is pasted on Maya's poster: it rides with her
	const dLocal = SNIPE_Y + 10 - HERO.cy;
	const dOff = 34; // a little right of her centre, clear of AND I STARTED
	const dcx = HERO.cx + Math.cos(rot40) * dOff - Math.sin(rot40) * dLocal;
	const dcy = hy + Math.sin(rot40) * dOff + Math.cos(rot40) * dLocal;
	// 9:16: DAN / CING, each strip riding on her poster the same way
	const onHero = (ox: number, oy: number): [number, number] => [HERO.cx + Math.cos(rot40) * ox - Math.sin(rot40) * oy, hy + Math.sin(rot40) * ox + Math.cos(rot40) * oy];
	// the heart block: between Dev and Jess in 16:9, under Jess's poster in 9:16
	const mh = vertical ? MHV : MH;
	const mhBase2 = vertical ? MHV_BASE2 : MH_BASE2;

	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				{/* 9:16: the wall runs further down, under the heart block's frames */}
				{vertical ? <Paper x={-1400} y={-900} w={6400} h={3600} /> : <Paper x={-1400} y={-900} w={6400} h={2900} />}
				<WallMarks vertical={vertical} />
				{vertical && <PastePatch />}
				{live.map((p, n) => {
					const sl = slap(t, p.t0);
					return (
						<PosterPaper
							key={n}
							cx={p.cx}
							cy={p.cy}
							w={PW}
							h={PH}
							rot={p.rot + 1.2 * (1 - sl.k)}
							s={sl.s}
							shadow={sl.shadow === 'none' ? 'none' : sl.shadow}
							label={p.label}
							wet={1 - clamp01((t - p.t0) / 0.6)}
						/>
					);
				})}
			</CamLayer>
			{d && <Press cam={cam} sheets={wallSheets} />}
			<CamLayer cam={cam}>
				{/* MY HEART / STOPPED, stamped straight onto the wall */}
				{heartSt.on && (
					<WorldSvg box={vertical ? [MHV.x - 100, MHV.base1 - 352, 1100, 800] : [780, 0, 1100, 800]} style={inked(900, 9, 4, true)}>
						<g transform={about(mh.x + mh.w / 2, mh.base1, heartSt.s * (1 + 0.035 * thump))}>
							<text x={mh.x} y={mh.base1} fontFamily="Anton" fontSize={MH_S1} fill={INK.key}>
								MY HEART
							</text>
							{restart && (
								<g style={{mixBlendMode: 'multiply'}}>
									<text x={mh.x + 13 + 9 * thump} y={mh.base1 - 8 - 6 * thump} fontFamily="Anton" fontSize={MH_S1} fill={INK.heat}>
										MY HEART
									</text>
								</g>
							)}
						</g>
						<g transform={about(mh.x, mhBase2, heartSt.s)}>
							<text x={mh.x} y={mhBase2} fontFamily="Anton" fontSize={MH_S2} fill={INK.key}>
								STOPPED
							</text>
							{ghost > 0.03 && (
								<g transform={about(mh.x + mh.w / 2, mhBase2, 1 + 0.035 * ghost)} style={{mixBlendMode: 'multiply'}}>
									<text x={mh.x + 16 * ghost} y={mhBase2 - 10 * ghost} fontFamily="Anton" fontSize={MH_S2} fill={INK.heat}>
										STOPPED
									</text>
								</g>
							)}
						</g>
					</WorldSvg>
				)}
				{/* FLATLINE snipe across Dev, black with paper letters */}
				{flatSt.on && (
					<Snipe
						id="hoist-flat"
						cx={vertical ? SNIPE_V.cx : 380}
						cy={vertical ? SNIPE_V.cy : SNIPE_Y}
						w={vertical ? SNIPE_V.w : 900}
						h={vertical ? SNIPE_V.h : 250}
						rot={-3.5}
						text="FLATLINE"
						size={vertical ? SNIPE_V.size : 232}
						spacing={0.035}
						bar={INK.key}
						paperLetters
						s={flatSt.s}
					/>
				)}
				{/* AND I STARTED snipe across Kai: a paper strip printed in orange (9:16: two strips, stacked) */}
				{startedSt.on && !vertical && <Snipe id="hoist-started" cx={2610} cy={SNIPE_Y + 6} w={830} h={190} rot={2.2} text="AND I STARTED" size={136} spacing={0.03} ink={INK.heat} s={startedSt.s} />}
				{startedSt.on &&
					vertical &&
					STARTED_V.map((l) => <Snipe key={l.text} id={`hoist-started-${l.text.length}`} cx={l.cx} cy={l.cy} w={l.w} h={l.h} rot={l.rot} text={l.text} size={STARTED_SIZE_V} spacing={0.03} ink={INK.heat} s={startedSt.s} />)}
				{/* Maya's poster, off the wall until the drop pastes it flat */}
				{heroOn && (
					<PosterPaper
						cx={HERO.cx}
						cy={hy}
						w={HERO.w}
						h={HERO.h}
						rot={sway}
						s={heroS}
						shadow={heroShadow}
						label={`04/04 · MAYA · REGISTER ${drift >= 0.5 ? '+' + Math.round(drift) + ' PX' : 'OK'}`}
						wet={pasted ? 1 - clamp01((t - H.snap) / 0.4) : 0}
					/>
				)}
			</CamLayer>
			{heroSheet && <Press cam={cam} sheets={[heroSheet]} />}
			<CamLayer cam={cam}>
				{/* the drop pastes her up: tape on the top corners */}
				{pasted && (
					<div
						style={{
							position: 'absolute',
							left: HERO.cx - HERO.w / 2 - PM,
							top: hy - HERO.h / 2 - PM,
							width: HERO.w + 2 * PM,
							height: 60,
							transformOrigin: `${PM + HERO.w / 2}px ${PM + HERO.h / 2}px`,
							transform: `scale(${heroS})`,
						}}
					>
						<Tape x={34} y={20} w={150} h={44} rot={-38} seed={4} />
						<Tape x={HERO.w + 2 * PM - 34} y={20} w={150} h={44} rot={36} seed={7} />
					</div>
				)}
				{/* DANCING: an orange snipe with paper letters across her feet, the payoff */}
				{dancingSt.on && !vertical && <Snipe id="hoist-dancing" cx={dcx} cy={dcy} w={1040} h={300} rot={-2.5 + sway} text="DANCING" size={280} spacing={0.04} bar={INK.heat} paperLetters s={dancingSt.s * heroS} />}
				{dancingSt.on &&
					vertical &&
					DANCING_V.map((l) => {
						const [x, y] = onHero(l.dx, l.dy);
						return <Snipe key={l.text} id={`hoist-dancing-${l.text}`} cx={x} cy={y} w={l.w} h={l.h} rot={l.rot + sway} text={l.text} size={DANCING_SIZE_V} spacing={0.04} bar={INK.heat} paperLetters s={dancingSt.s * heroS} />;
					})}
			</CamLayer>
		</AbsoluteFill>
	);
};

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {Diptych: {v: () => SEAM}, Hoist: {v: () => SEAM}};
