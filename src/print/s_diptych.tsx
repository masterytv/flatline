import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, SERIF} from './ink';
import {clamp01, CropMarks, easeIn, easeInOut, easeOut, inked, kickNudge, lerp, RegTarget, Slug, slap, stamp, Tape} from './kit';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, Press, SheetCanvas} from './Press';

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

/** The hit every beat gives the rostrum: a few px of shake and a punch, gone in a quarter beat. */
const beatHit = (cam: Pose, t: number, from: number, amp: (beatT: number) => number = () => 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || BEATS[i].t < from - 1e-6) return cam;
	const a = amp(BEATS[i].t);
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * a;
	const s = cam.s * (1 + 0.012 * k);
	return {cx: cam.cx - ((hash2(i, 3, 43) - 0.5) * 16 * k) / s, cy: cam.cy - ((hash2(i, 5, 43) - 0.5) * 11 * k) / s, s, rot: cam.rot + (hash2(i, 7, 43) - 0.5) * 0.5 * k};
};

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

/**
 * The three dots cross from the screen world into real life: the first in cold, the second the two inks
 * overprinted a little out of register (plum, with a fringe of each), the third in heat, the ink of 'and I started'.
 * Coordinates in the svg's own px; `s` scales each dot (its stamp).
 */
const Dots: React.FC<{x0: number; y: number; n: number; s?: (i: number) => number}> = ({x0, y, n, s = () => 1}) => (
	<>
		{DOT_X.slice(0, n).map((x, i) => {
			const r = (DOT_D / 2) * s(i);
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
const POISE = 56; // where the orange squeegee waits, on the top margin (the 94.4 framing shows it)
// where a black squeegee waits: lower, resting on the screen over the print's top edge, so the pushes on 95.2 and
// 96.2 (framed tighter and lower than 94.4) still show the blade waiting
const POISE_K = 136;
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

const zineCam = (t: number): Cam => {
	const base = track(t, ZINE_MOVES);
	const big = (b: number) => (near(b, Z.slam) ? 2.6 : near(b, Z.turn) ? 2.2 : Z.dots.some((d) => near(d, b)) ? 1.5 : 1);
	return beatHit(base, t, Z.slam, big);
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

const p36Plates = (t: number, kPull: number): Plate[] => {
	const [hx, hy] = kickNudge(t, 1, 3);
	const [kx, ky] = kickNudge(t, 0, 1.5);
	// orange alone would flood the night street, so it is opened up a little (gamma)
	const plates: Plate[] = [{ch: 1, ink: INK.heat, angle: 15, cell: 8.5, gamma: 1.5, dx: 2 + hx, dy: -1 + hy}];
	if (kPull > 0) plates.push({ch: 0, ink: INK.key, angle: 45, cell: 8.5, pull: kPull, pullY: true, gain: 0.85, gamma: 1.3, dx: kx, dy: ky});
	return plates;
};

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
const RightPageFace: React.FC<{d: Record<string, Density>; t: number; res: number}> = ({d, t, res}) => {
	const p = photo('P35');
	return (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: INK.paper}}>
			<Paper x={0} y={0} w={SPREAD.w / 2} h={SPREAD.h} />
			<div style={{position: 'absolute', left: RIGHT_IMG.x - GUT, top: RIGHT_IMG.y - SPREAD.y}}>
				<SheetCanvas res={res} sheet={{map: d[p.map], crop: p.crop, w: IMG_W, h: IMG_H, seed: 35, plates: p35Plates(t, 2, 2)}} />
			</div>
			<CropMarks x={RIGHT_IMG.x - GUT} y={RIGHT_IMG.y - SPREAD.y} w={IMG_W} h={IMG_H} gap={10} len={26} />
			<Slug x={RIGHT_IMG.x - GUT} y={22} text="13 · AFTER · 2:52 AM · THE WALK HOME" size={14} />
			<WorldSvg box={[0, 0, SPREAD.w / 2, SPREAD.h]}>
				<Dots x0={0} y={CAP1 - SPREAD.y - DOT_D / 2} n={3} />
				<text x={STARTED_X - GUT} y={CAP1 - SPREAD.y} fontFamily={SERIF} fontStyle="italic" fontSize={CAP_SIZE} fill={INK.heat}>
					and I started
				</text>
				<text x={RIGHT_IMG.x - GUT} y={CAP2 - SPREAD.y} fontFamily={SERIF} fontStyle="italic" fontSize={140} fill={INK.key}>
					dancing
				</text>
			</WorldSvg>
		</div>
	);
};

/** P36's left half: the back of the turning page, already printed in orange. */
const P36HalfFace: React.FC<{d: Record<string, Density>; t: number; res: number}> = ({d, t, res}) => {
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
					plates: p36Plates(t, 0),
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
	const d = useDensities(['P34', 'P35', 'P36'].map((id) => photo(id).map));
	const cam = zineCam(t);
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
	const oPull35 = imgPull(o35.k, POISE, RIGHT_IMG.y, IMG_H);
	const kPull35 = imgPull(k35.k, POISE_K, RIGHT_IMG.y, IMG_H);

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
			sheets.push({map: d[p34.map], crop: p34.crop, w: IMG_W, h: IMG_H, ...place(LEFT_IMG.x + IMG_W / 2, LEFT_IMG.y + IMG_H / 2), seed: 34, plates: p34Plates(t)});
			if (!turning && t >= Z.orange) {
				sheets.push({map: d[p35.map], crop: p35.crop, w: IMG_W, h: IMG_H, ...place(RIGHT_IMG.x + IMG_W / 2, RIGHT_IMG.y + IMG_H / 2), seed: 35, plates: p35Plates(t, oPull35, kPull35)});
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
					plates: p36Plates(t, 0),
					clip: [
						[0.5, 0],
						[1, 0],
						[1, 1],
						[0.5, 1],
					],
				});
			}
		} else {
			sheets.push({map: d[p36.map], crop: p36.crop, w: SPREAD.w, h: SPREAD.h, ...place(960, 540), seed: 36, plates: p36Plates(t, imgPull(k36.k, POISE_K, SPREAD.y, SPREAD.h))});
		}
	}

	// FLATLINE stamped across the spread on the downbeat; lifted off on 'my heart stopped'
	const flat = stamp(t, Z.slam);
	const lift = t < at(Z.caption) ? 0 : easeOut((t - at(Z.caption)) / (5 / 30));
	// on 93.2 the stamp's last heartbeat: an orange strike of the same bar, off register, gone in a few frames
	const echo = t >= bt(93, 2) && t < Z.caption ? Math.exp(-(t - bt(93, 2)) / 0.09) : 0;
	const cap = stamp(t, Z.caption);
	const res = Math.max(1, cam.s);
	const spreadT = `translate(960px, 540px) scale(${S}) translate(-960px, -540px)`;

	// captions on the right page are printed by the squeegee: revealed above the blade only
	const revealY = (k: number, y0: number) => (k <= 0 ? -1e4 : sqY(k, y0));
	const clipAbove = (y: number): React.CSSProperties => ({clipPath: `inset(0 0 ${Math.max(0, 3000 - y)}px 0)`});

	return (
		<AbsoluteFill style={{background: '#D2C3A4'}}>
			<CamLayer cam={cam}>
				<Paper tint="#CFC0A0" />
				<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: spreadT}}>
					<Leaves />
				</div>
			</CamLayer>
			{d && <Press cam={cam} sheets={sheets} />}
			<CamLayer cam={cam}>
				<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 3000, transformOrigin: '0 0', transform: spreadT}}>
					{!turned && (
						<>
							<CropMarks x={LEFT_IMG.x} y={LEFT_IMG.y} w={IMG_W} h={IMG_H} gap={10} len={26} color={INK.cold} />
							{!turning && <CropMarks x={RIGHT_IMG.x} y={RIGHT_IMG.y} w={IMG_W} h={IMG_H} gap={10} len={26} />}
							{/* left page: one cold ink, the caption in it */}
							{cap.on && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 13, 7)}>
									<g transform={about(LEFT_IMG.x + IMG_W, CAP1, cap.s)}>
										<text x={LEFT_IMG.x + IMG_W} y={CAP1} textAnchor="end" fontFamily={SERIF} fontStyle="italic" fontSize={CAP_SIZE} fill={INK.cold}>
											my heart stopped
										</text>
									</g>
								</WorldSvg>
							)}
							{/* the dots: the sentence steps over the fold onto the blank page, one per beat */}
							{!turning && t >= Z.dots[0] && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(300, 40, 0, true)}>
									<Dots x0={GUT} y={CAP1 - DOT_D / 2} n={Z.dots.filter((b) => t >= b).length} s={(i) => stamp(t, Z.dots[i]).s * (1 + 0.25 * Math.exp(-(t - Z.dots[i]) / 0.05))} />
								</WorldSvg>
							)}
							{/* 93.4: the flat rule runs under the caption to the fold, where the dots will pick it up */}
							{t >= at(Z.rule) && (
								<WorldSvg box={[0, 0, 1920, 1080]} style={inked(600, 3, 29)}>
									<line x1={LEFT_IMG.x} y1={RULE_Y} x2={lerp(LEFT_IMG.x, GUT - 16, easeOut((t - at(Z.rule)) / 0.2))} y2={RULE_Y} stroke={INK.cold} strokeWidth={5} />
								</WorldSvg>
							)}
							{/* the right page's words, printed by the two pulls */}
							{!turning && o35.k > 0 && (
								<div style={{position: 'absolute', inset: 0, ...clipAbove(revealY(o35.k, POISE))}}>
									<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 31, 2)}>
										<text x={STARTED_X} y={CAP1} fontFamily={SERIF} fontStyle="italic" fontSize={CAP_SIZE} fill={INK.heat}>
											and I started
										</text>
									</WorldSvg>
								</div>
							)}
							{!turning && k35.k > 0 && (
								<div style={{position: 'absolute', inset: 0, ...clipAbove(revealY(k35.k, POISE_K))}}>
									<WorldSvg box={[0, 0, 1920, 1080]} style={inked(700, 5, 19)}>
										<text x={RIGHT_IMG.x} y={CAP2} fontFamily={SERIF} fontStyle="italic" fontSize={140} fill={INK.key}>
											dancing
										</text>
									</WorldSvg>
								</div>
							)}
							<Slug x={LEFT_IMG.x} y={SPREAD.y + 22} text="12 · BEFORE · 1:47 AM · THE SOFA" size={14} color={INK.cold} />
							{!turning && <Slug x={RIGHT_IMG.x} y={SPREAD.y + 22} text="13 · AFTER · 2:52 AM · THE WALK HOME" size={14} />}
						</>
					)}
					{turned && <Slug x={SPREAD.x + 30} y={SPREAD.y + SPREAD.h - 34} text="14–15 · ALL FIVE · 2:58 AM · O 15° K 45°" size={14} color={INK.paper} />}
					<Fold />
					{/* FLATLINE: the shout, stamped across both pages; on the left its letters are windows onto her */}
					{flat.on && lift < 1 && (
						<div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - lift, transform: `translate(0px, ${-46 * lift}px) scale(${1 + 0.12 * lift})`, transformOrigin: '960px 470px'}}>
							{echo > 0.03 && (
								<Snipe id="zine-flat-echo" cx={960} cy={466} w={1600} h={360} rot={-2} text="FLATLINE" size={380} spacing={0.03} bar={INK.heat} s={1.012} dx={16 * echo} dy={-11 * echo} />
							)}
							<Snipe id="zine-flat" cx={960} cy={466} w={1600} h={360} rot={-2} text="FLATLINE" size={380} spacing={0.03} bar={INK.key} s={flat.s} />
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
								<RightPageFace d={d} t={t} res={res} />
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
								<P36HalfFace d={d} t={t} res={res} />
								<div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, rgba(40,25,10,${0.3 * Math.sin((theta * Math.PI) / 180)}), rgba(255,250,240,0))`}} />
							</div>
						)}
					</div>
				)}
				{/* the squeegees */}
				<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 3000, transformOrigin: '0 0', transform: spreadT}}>
					{t >= at(bt(94, 4)) && t < at(Z.orange) && <Squeegee x={GUT + 22} y={POISE - 90 * (1 - easeOut((t - at(bt(94, 4))) / 0.15))} w={SPREAD.w / 2 - 44} ink={INK.heat} />}
					{o35.on && <Squeegee x={GUT + 22} y={sqY(o35.k, POISE) + 400 * o35.exit} w={SPREAD.w / 2 - 44} ink={INK.heat} />}
					{/* 95.2 and 96.2: the black squeegee drops onto the screen on the beat and waits for the pull */}
					{t >= at(Z.blackWait) && t < at(Z.black) && <Squeegee x={GUT + 22} y={POISE_K - 120 * (1 - easeOut((t - at(Z.blackWait)) / 0.1))} w={SPREAD.w / 2 - 44} ink={INK.key} />}
					{t >= at(Z.black2Wait) && t < at(Z.black2) && <Squeegee x={SPREAD.x + 20} y={POISE_K - 120 * (1 - easeOut((t - at(Z.black2Wait)) / 0.1))} w={SPREAD.w - 40} ink={INK.key} />}
					{k35.on && <Squeegee x={GUT + 22} y={sqY(k35.k, POISE_K) + 400 * k35.exit} w={SPREAD.w / 2 - 44} ink={INK.key} />}
					{k36.on && <Squeegee x={SPREAD.x + 20} y={sqY(k36.k, POISE_K) + 400 * k36.exit} w={SPREAD.w - 40} ink={INK.key} />}
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

const hoistCam = (t: number): Cam => {
	const big = (b: number) => (near(b, H.flat) ? 2.4 : near(b, H.kick) ? 2 : near(b, H.dancing) ? 2 : near(b, H.snap) ? 3 : 1);
	return beatHit(track(t, HOIST_MOVES), t, H.flat, big);
};

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
const WallMarks: React.FC = () => (
	<>
		{SCRAPS.map(({x, y, w, h, r, word}, i) => {
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
	const d = useDensities(['P37', 'P38', 'P39', 'P40'].map((id) => photo(id).map));
	const cam = hoistCam(t);
	const kick = t >= H.kick ? Math.exp(-(t - H.kick) / 0.14) : 0;
	// the close-up on 100.4, a hard cut in, until the drop's snap (t equals at(c) on the frame before a cue's frame)
	const close = t > at(bt(100, 4)) && t <= at(H.snap);
	const drift = close ? CLOSE_DRIFT : driftAt(t);

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

	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper x={-1400} y={-900} w={6400} h={2900} />
				<WallMarks />
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
					<WorldSvg box={[780, 0, 1100, 800]} style={inked(900, 9, 4, true)}>
						<g transform={about(MH.x + MH.w / 2, MH.base1, heartSt.s * (1 + 0.035 * thump))}>
							<text x={MH.x} y={MH.base1} fontFamily="Anton" fontSize={MH_S1} fill={INK.key}>
								MY HEART
							</text>
							{restart && (
								<g style={{mixBlendMode: 'multiply'}}>
									<text x={MH.x + 13 + 9 * thump} y={MH.base1 - 8 - 6 * thump} fontFamily="Anton" fontSize={MH_S1} fill={INK.heat}>
										MY HEART
									</text>
								</g>
							)}
						</g>
						<g transform={about(MH.x, MH_BASE2, heartSt.s)}>
							<text x={MH.x} y={MH_BASE2} fontFamily="Anton" fontSize={MH_S2} fill={INK.key}>
								STOPPED
							</text>
							{ghost > 0.03 && (
								<g transform={about(MH.x + MH.w / 2, MH_BASE2, 1 + 0.035 * ghost)} style={{mixBlendMode: 'multiply'}}>
									<text x={MH.x + 16 * ghost} y={MH_BASE2 - 10 * ghost} fontFamily="Anton" fontSize={MH_S2} fill={INK.heat}>
										STOPPED
									</text>
								</g>
							)}
						</g>
					</WorldSvg>
				)}
				{/* FLATLINE snipe across Dev, black with paper letters */}
				{flatSt.on && <Snipe id="hoist-flat" cx={380} cy={SNIPE_Y} w={900} h={250} rot={-3.5} text="FLATLINE" size={232} spacing={0.035} bar={INK.key} paperLetters s={flatSt.s} />}
				{/* AND I STARTED snipe across Kai: a paper strip printed in orange */}
				{startedSt.on && <Snipe id="hoist-started" cx={2610} cy={SNIPE_Y + 6} w={830} h={190} rot={2.2} text="AND I STARTED" size={136} spacing={0.03} ink={INK.heat} s={startedSt.s} />}
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
				{dancingSt.on && <Snipe id="hoist-dancing" cx={dcx} cy={dcy} w={1040} h={300} rot={-2.5 + sway} text="DANCING" size={280} spacing={0.04} bar={INK.heat} paperLetters s={dancingSt.s * heroS} />}
			</CamLayer>
		</AbsoluteFill>
	);
};
