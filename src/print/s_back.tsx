import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {beatsIn, bt} from '../timing';
import {TokTicLogo} from '../ui/TokTicLogo';
import {Density, useDensities} from './density';
import {hash2, INK, MONO} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, ecg, inked, kickNudge, lerp, slap, stamp} from './kit';
import {inPoly, Poly} from './masks';
import {CAM0, Plate, Sheet, sheetMatrix} from './press';
import {OnSheet, Paper, PaperFill, Press} from './Press';

// 2:23.6–2:38.2 "Beep, beep, beep, I'm coming back ... I came back to life to feel everything!"
// Sam put Maya's phone on charge in the kitchen and it fights back. Its own things are lime (the screen, the Stay
// button, the battery); its voice and its pull are ultramarine, spreading over the warm prints of the night.
// Then the receipt tears, she holds the phone lit cold, Jess calls her from the doorway, and warm wins into the
// drop-3 flip (s_battery.tsx).

type Pt = [number, number];
type Geo = Pick<Sheet, 'w' | 'h' | 'cx' | 'cy' | 's' | 'rot' | 'crop' | 'flipX'>;

// ------------------------------------------------------------------ cues (all on the grid)

// Receipt
const A_P24 = F.beep1; // 143.627 beep: P24, the screen wakes lime, 1%
const B_MACRO = bt(77, 2); // 144.080 beep: phone macro, 2%
const C_SPOOL = bt(77, 3); // 144.533 beep: 3%, the receipt unspools out of the screen
const BACK = bt(78, 1); // 145.438 "I'M COMING BACK"
const GONE = bt(78, 3); // 146.355 "maya. you've been gone 47 min"
const D_P25 = F.beep2; // 147.273 beep: P25, 9%
const LIKES = bt(79, 2); // 147.725 beep: cold card over the left third, 14%
const TAGS = bt(79, 3); // 148.178 beep: second card, 22%
const REACH = bt(79, 4); // 148.631 the cold reaches her
const E_P26 = bt(80, 1); // 149.095 P26 slapped warm: the night fights back
const DEV = bt(80, 2); // 149.548 punch on Dev
const STAY = bt(80, 3); // 150.001 'Stay connected?' half-covers it, 41%
const BEG = bt(80, 4); // 150.465 the Stay button begs, 48%
const FLOOD = [bt(81, 1), bt(81, 2), bt(81, 3), bt(81, 4)]; // 150.918 'hear the monitor sing'

// Tear-off
const TEAR = F.alive; // 152.729 the tear reveals P27
const NUDGE1 = bt(82, 2);
const CAPTION = bt(82, 3); // 153.670 'to feel everything'
const NUDGE2 = bt(82, 4);
const PUNCH = bt(83, 1); // 154.575 kick out: cold punch-in on her face
const JESS = bt(83, 3); // 155.504 P28, Jess in the doorway
const JESS2 = bt(83, 4);
const SPLIT = bt(84, 1); // 156.386 cold Maya against warm Jess
const WARM_PUSH = bt(84, 2); // 156.828
const COLD_PUSH = bt(84, 3); // 157.292
const WARM_FLOOD = bt(84, 4); // 157.756, into the 2:38.2 drop

/** The phone's battery on every beat of the receipt: it climbs slowly, then faster and faster. */
const PCT_BEATS = beatsIn(F.beep1 - 0.01, F.alive - 0.01).map((b) => b.t);
const PCT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 22, 26, 30, 34, 41, 48, 57, 73, 88, 99];
const pctAt = (t: number) => {
	let n = -1;
	for (let i = 0; i < PCT_BEATS.length; i++) if (PCT_BEATS[i] <= t) n = i;
	return n < 0 ? 0 : PCT[Math.min(n, PCT.length - 1)];
};
/** The beeps: the first three beats of bars 77, 79 and 81. */
const BEEPS = [77, 79, 81].flatMap((bar) => [1, 2, 3].map((k) => bt(bar, k)));

// ------------------------------------------------------------------ photo data (traced on gridded copies)

// Screen quads, corners in this order: top-left, top-right, bottom-right, bottom-left of the screen as its UI is
// drawn (the long edge furthest from the camera is the top).
/** P24: the phone on the counter, the charger end on the left, the notch end on the right. */
const Q24: Pt[] = [
	[0.466, 0.65],
	[0.655, 0.601],
	[0.718, 0.656],
	[0.522, 0.729],
];
/** P25: the phone face-up in the bottom-left foreground (out of focus). */
const Q25: Pt[] = [
	[0.163, 0.822],
	[0.449, 0.818],
	[0.449, 0.886],
	[0.133, 0.892],
];
/** P27: the phone in her hand, the notch end up-left. */
const Q27: Pt[] = [
	[0.391, 0.693],
	[0.515, 0.845],
	[0.52, 0.921],
	[0.387, 0.761],
];
/** P27: Maya (hair, face, jacket, the arm, and the hand with the phone in it, so her fingers print cold too). */
const MAYA27: Poly = [
	[0.6, 0.03],
	[0.65, 0.022],
	[0.7, 0.04],
	[0.74, 0.075],
	[0.77, 0.12],
	[0.79, 0.2],
	[0.805, 0.3],
	[0.82, 0.4],
	[0.83, 0.48],
	[0.86, 0.54],
	[0.893, 0.59],
	[0.905, 0.65],
	[0.908, 0.8],
	[0.91, 1.0],
	[0.48, 1.0],
	// the hand under the phone: two fingers, the index fingertip, the blurred finger below the bezel
	[0.478, 0.952],
	[0.47, 0.942],
	[0.462, 0.934],
	[0.4545, 0.922],
	[0.452, 0.908],
	[0.447, 0.899],
	[0.4365, 0.896],
	[0.4305, 0.878],
	[0.4345, 0.861],
	[0.433, 0.848],
	[0.42, 0.845],
	[0.412, 0.832],
	// the phone's case: its bottom edge, the notch end, its top edge up to the thumb
	[0.409, 0.818],
	[0.4, 0.804],
	[0.39, 0.795],
	[0.38, 0.784],
	[0.3745, 0.766],
	[0.3745, 0.748],
	[0.377, 0.728],
	[0.381, 0.702],
	[0.386, 0.685],
	[0.392, 0.683],
	[0.45, 0.757],
	[0.471, 0.784],
	// the thumb, then the sleeve's edge
	[0.4765, 0.775],
	[0.4775, 0.762],
	[0.484, 0.752],
	[0.494, 0.749],
	[0.505, 0.752],
	[0.513, 0.745],
	[0.513, 0.7],
	[0.511, 0.65],
	[0.52, 0.57],
	[0.535, 0.525],
	[0.545, 0.45],
	[0.55, 0.35],
	[0.55, 0.25],
	[0.548, 0.17],
	[0.56, 0.1],
	[0.575, 0.06],
];
const FACE27 = {u: 0.636, v: 0.34};
/** P28: the point between Jess's face (0.5, 0.42) and her held-out hand (0.40, 0.68): the split crop centre. */
const JESS28_MID = {u: 0.49, v: 0.5};
/** Phone centres (where the cold spreads from). */
const PHONE24 = {u: 0.59, v: 0.665};
const PHONE25 = {u: 0.29, v: 0.855};
/** P26: Dev's face, singing into the butter knife. */
const DEV26 = {u: 0.37, v: 0.4};

// ------------------------------------------------------------------ geometry

const FW = 1960;
const FH = 1094;
const ASPECT = 2752 / 1536;

/**
 * The camera, done by placing the whole sheet: photo point (u, v) lands at screen (sx, sy) with the sheet scaled S.
 * The halftone screen stays fixed to the paper, so a push or a whip never slides the image under the dots, and a
 * macro at S = 3.3 prints with 28 px cells from the same 8.5 px plate.
 */
const aim = (u: number, v: number, S: number, sx = 960, sy = 540, flipX = false): Geo => ({
	w: FW,
	h: FH,
	s: S,
	cx: sx - S * ((flipX ? 1 - u : u) - 0.5) * FW,
	cy: sy - S * (v - 0.5) * FH,
	flipX,
});
const FULL: Geo = {w: FW, h: FH, cx: 960, cy: 540};

/** Photo fraction -> screen px for a sheet seen through the fixed camera. */
const toScreen = (g: Geo, u: number, v: number): Pt => {
	const [x0, y0, x1, y1] = g.crop ?? [0, 0, 1, 1];
	let fx = (u - x0) / (x1 - x0);
	if (g.flipX) fx = 1 - fx;
	const fy = (v - y0) / (y1 - y0);
	const m = sheetMatrix(g, CAM0, 1920, 1080);
	const px = fx * g.w;
	const py = fy * g.h;
	return [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]];
};

/** Grow a quad about its centre (so the lime laps onto the black bezel, never leaving a paper rim). */
const inflate = (q: Pt[], k: number): Pt[] => {
	const cx = q.reduce((a, p) => a + p[0], 0) / q.length;
	const cy = q.reduce((a, p) => a + p[1], 0) / q.length;
	return q.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};

/** CSS matrix3d that maps a W x H box onto a screen quad (TL, TR, BR, BL): a homography. */
const quadMatrix = (W: number, H: number, q: Pt[]): string => {
	const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
	const dx1 = x1 - x2;
	const dx2 = x3 - x2;
	const dx3 = x0 - x1 + x2 - x3;
	const dy1 = y1 - y2;
	const dy2 = y3 - y2;
	const dy3 = y0 - y1 + y2 - y3;
	const den = dx1 * dy2 - dx2 * dy1;
	const g = (dx3 * dy2 - dx2 * dy3) / den;
	const h = (dx1 * dy3 - dx3 * dy1) / den;
	const a = x1 - x0 + g * x1;
	const b = x3 - x0 + h * x3;
	const d = y1 - y0 + g * y1;
	const e = y3 - y0 + h * y3;
	const n = (x: number) => x.toFixed(8);
	return `matrix3d(${n(a / W)},${n(d / W)},0,${n(g / W)},${n(b / H)},${n(e / H)},0,${n(h / H)},0,0,1,0,${n(x0)},${n(y0)},0,1)`;
};

// ------------------------------------------------------------------ plates and masks

const HEAT = (cell: number, o: Partial<Plate> = {}): Plate => ({ch: 1, ink: INK.heat, angle: 15, cell, ...o});
const KEY = (cell: number, o: Partial<Plate> = {}): Plate => ({ch: 0, ink: INK.key, angle: 45, cell, ...o});
const COLD = (cell: number, o: Partial<Plate> = {}): Plate => ({ch: 2, ink: INK.cold, angle: 75, cell, kind: 'line', ...o});

const vnoise = (x: number, y: number, s: number) => {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const fx = x - xi;
	const fy = y - yi;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const a = hash2(xi, yi, s);
	const b = hash2(xi + 1, yi, s);
	const c = hash2(xi, yi + 1, s);
	const d = hash2(xi + 1, yi + 1, s);
	const top = a + (b - a) * sx;
	return top + (c + (d - c) * sx - top) * sy;
};
const fbm = (x: number, y: number, s: number) => 0.6 * vnoise(x, y, s) + 0.3 * vnoise(x * 2.3, y * 2.3, s + 7) + 0.1 * vnoise(x * 5.1, y * 5.1, s + 13);

/** The app's cold ink spreading out from a point: 1 inside the ragged front, 0 outside. Distances in photo heights. */
const spreadMask = (cu: number, cv: number, R: number, seed: number) => (u: number, v: number) => {
	if (R <= 0) return 0;
	const d = Math.hypot((u - cu) * ASPECT, v - cv);
	const n = (fbm(u * 11, v * 11, seed) - 0.5) * 0.22;
	return clamp01((R + n - d) / 0.02);
};

/** A punch-in that is a cut: full size on the beat's first frame, overshooting a touch and settling. */
const punch = (t: number, t0: number, amt: number) => (t < t0 ? 0 : amt * (1 + 0.35 * Math.exp(-(t - t0) / 0.05)));

/** Steps up on each beat in the list (a fast ease), so spreads and pushes move on the beat. */
const stepped = (t: number, beats: number[], steps: number[], dur = 0.14) => beats.reduce((a, b, i) => a + steps[i] * easeOut((t - b) / dur), 0);

/** A warm print in register, its orange nudged on every kick. */
const warmPlates = (t: number, cell: number, seed: number, o: Partial<Plate> = {}): Plate[] => {
	const [kx, ky] = kickNudge(t, seed, 2.2);
	return [HEAT(cell, {dx: kx, dy: ky, ...o}), KEY(cell)];
};

// ------------------------------------------------------------------ TokTic's own things

/** The phone's lime screen, drawn in perspective on the photo's screen: the battery and its ultramarine pulse. */
const LimeScreen: React.FC<{quad: Pt[]; W: number; H: number; pct: number; t: number; beats: number[]; amp?: number; win?: number}> = ({quad, W, H, pct, t, beats, amp = 0.3, win = 1.3}) => {
	const label = `${pct}%`;
	const size = Math.min(H * 0.66, (W * 0.5) / (0.6 * label.length));
	// the logo and the trace's live end sit inboard: on a macro the photo's notch and bezel print over the rim
	const x0 = W * 0.52;
	const x1 = W * 0.9;
	const pts: string[] = [];
	const live = beats.filter((b) => b <= t && b > t - win - 0.3);
	for (let px = x0; px <= x1 + 0.1; px += W / 220) {
		const tx = t - (1 - (px - x0) / (x1 - x0)) * win;
		let v = 0;
		for (const b of live) if (tx - b > -0.2 && tx - b < 0.25) v += ecg(tx - b);
		pts.push(`${px.toFixed(1)},${(H * 0.6 - v * H * amp).toFixed(1)}`);
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: W,
				height: H,
				transformOrigin: '0 0',
				transform: quadMatrix(W, H, quad),
				background: INK.lime,
				mixBlendMode: 'multiply',
				overflow: 'hidden',
				borderRadius: H * 0.08,
			}}
		>
			<div style={{position: 'absolute', left: W * 0.05, top: H * 0.56 - size * 0.62, fontFamily: MONO, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.05, color: INK.key, whiteSpace: 'nowrap'}}>
				{label}
			</div>
			<div style={{position: 'absolute', right: W * 0.12, top: H * 0.14}}>
				<TokTicLogo size={H * 0.11} t={t} color={INK.key} />
			</div>
			<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<polyline points={pts.join(' ')} fill="none" stroke={INK.cold} strokeWidth={H * 0.035} strokeLinejoin="round" strokeLinecap="round" />
				<circle cx={x1} cy={pts.length ? Number(pts[pts.length - 1].split(',')[1]) : H * 0.6} r={H * 0.035} fill={INK.cold} />
			</svg>
		</div>
	);
};

/** A notification card: printed solid ultramarine, the type knocked out to paper, a lime dot for the app. */
const Card: React.FC<{x: number; y: number; w?: number; t: number; at: number; rot?: number; head?: string; text: string; size?: number; seed?: number}> = ({x, y, w, t, at, rot = 0, head = 'TOKTIC · NOW', text, size = 54, seed = 0}) => {
	const sl = slap(t, at);
	if (!sl.on) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w ?? 'max-content',
				whiteSpace: w ? 'normal' : 'nowrap',
				padding: `${size * 0.42}px ${size * 0.55}px ${size * 0.5}px`,
				background: INK.cold,
				borderRadius: size * 0.36,
				color: INK.paper,
				fontFamily: MONO,
				transform: `rotate(${rot}deg) scale(${sl.s})`,
				transformOrigin: '30% 50%',
				boxShadow: sl.shadow,
				...inked(700, seed * 61, seed * 23, true),
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: size * 0.25, fontSize: size * 0.36, letterSpacing: '0.16em', marginBottom: size * 0.2}}>
				<div style={{width: size * 0.42, height: size * 0.42, borderRadius: size * 0.12, background: INK.lime}} />
				{head}
			</div>
			<div style={{fontSize: size, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.01em'}}>{text}</div>
		</div>
	);
};

// ------------------------------------------------------------------ the receipt: the phone's strip chart

type Block = {at: number; h: number; lines: {s: string; size: number; w?: number; ls?: number; logo?: boolean; rule?: boolean}[]};
const SPOOL_W = 560;
const SPOOL_X = 96; // text column (the trace runs down the margin to its left)
const BLOCKS: Block[] = [
	{
		at: C_SPOOL,
		h: 150,
		lines: [
			{s: '', size: 48, logo: true},
			{s: 'RECONNECTING', size: 28, ls: 0.2},
			{s: '', size: 20, rule: true},
		],
	},
	{
		at: BACK,
		h: 352,
		lines: [
			{s: "I'M", size: 110, w: 500},
			{s: 'COMING', size: 110, w: 500},
			{s: 'BACK', size: 110, w: 500},
		],
	},
	{
		at: GONE,
		h: 300,
		lines: [
			{s: 'maya.', size: 110, w: 500},
			{s: "you've been gone", size: 44},
			{s: '47 min', size: 110, w: 500},
		],
	},
];
const SPOOL_BEATS = beatsIn(C_SPOOL - 0.01, D_P25 - 0.01).map((b) => b.t);
const SPOOL_JUMP = SPOOL_BEATS.map((b) => BLOCKS.find((k) => Math.abs(k.at - b) < 1e-3)?.h ?? 46);
const CREEP = 70; // px of paper a second between the jumps
const feed = (t: number) => (t < C_SPOOL ? 0 : CREEP * (t - C_SPOOL) + stepped(t, SPOOL_BEATS, SPOOL_JUMP, 0.1));

/** The strip in its own space: x 0..SPOOL_W, y up from the slot (y = 0) into negative values. */
const Spool: React.FC<{t: number}> = ({t}) => {
	const F0 = feed(t);
	const top = -F0;
	// the trace down the left margin: one spike per beat, full height on the beeps
	const marks = SPOOL_BEATS.filter((b) => b <= t).map((b) => ({y: -(F0 - feed(b)), a: BEEPS.some((x) => Math.abs(x - b) < 1e-3) ? 1 : 0.32}));
	const pts: string[] = [];
	for (let y = 0; y >= top; y -= 2) {
		let v = 0;
		for (const m of marks) {
			const dt = (y - m.y) / 420;
			if (dt > -0.2 && dt < 0.25) v += m.a * ecg(dt);
		}
		pts.push(`${(42 + v * 46).toFixed(1)},${y.toFixed(1)}`);
	}
	// serrated leading edge (it was torn off the roll before)
	const teeth: string[] = [];
	for (let i = 0; i <= 26; i++) teeth.push(`${((i / 26) * 100).toFixed(2)}% ${i % 2 ? 0 : 9}px`);
	return (
		<div style={{position: 'absolute', left: 0, top: -2400, width: SPOOL_W, height: 2400, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 0, top: 2400 + top, width: SPOOL_W, height: F0 + 4, filter: 'drop-shadow(0 6px 8px rgba(40,30,60,0.35))'}}>
				<div style={{position: 'absolute', inset: 0, background: '#F7F4ED', clipPath: `polygon(${teeth.join(', ')}, 100% 100%, 0% 100%)`}} />
			</div>
			<svg width={SPOOL_W} height={2400} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<g transform="translate(0 2400)">
					<polyline points={pts.join(' ')} fill="none" stroke={INK.cold} strokeWidth={3.2} strokeLinejoin="round" />
				</g>
			</svg>
			{BLOCKS.filter((k) => k.at <= t).map((k, i) => {
				const yTop = -(F0 - feed(k.at));
				let y = yTop + 8;
				return (
					<div key={i} style={{position: 'absolute', left: 0, top: 2400 + 0, width: SPOOL_W}}>
						{k.lines.map((ln, j) => {
							const yy = y;
							y += ln.size * (ln.size > 60 ? 0.98 : 1.12);
							if (ln.logo)
								return (
									<div key={j} style={{position: 'absolute', left: SPOOL_X + 4, top: yy}}>
										<TokTicLogo size={ln.size} t={k.at} color={INK.cold} />
									</div>
								);
							if (ln.rule) return <div key={j} style={{position: 'absolute', left: SPOOL_X + 4, top: yy + ln.size * 0.5, width: SPOOL_W - SPOOL_X - 24, borderTop: `3px dashed ${INK.cold}`}} />;
							return (
								<div
									key={j}
									style={{
										position: 'absolute',
										left: SPOOL_X,
										top: yy,
										fontFamily: MONO,
										fontWeight: ln.w ?? 400,
										fontSize: ln.size,
										lineHeight: 1,
										letterSpacing: ln.ls ? `${ln.ls}em` : '-0.02em',
										color: INK.cold,
										whiteSpace: 'nowrap',
									}}
								>
									{ln.s}
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
};

// ------------------------------------------------------------------ RECEIPT shots

/**
 * P24's camera: wide on beep 1, a macro on the phone on beep 2, then on beep 3 a whip that drops the phone to the
 * bottom of the frame as the receipt shoots out of it, with a short punch on each lyric line.
 */
const p24Geo = (t: number): Geo => {
	if (t < B_MACRO) {
		// the strips' scatter (s_groove.tsx) leaves P24 printed cold, pushed 1.1x about the phone: beep 1 keeps that
		// framing and turns the same picture warm, the screen lime, with a slap
		const sl = slap(t, A_P24);
		return aim(0.6, 0.66, 1.1 * sl.s + 0.012 * clamp01((t - A_P24) / 0.45), 0.6 * FW - 20, 0.66 * FH - 7);
	}
	const S0 = 2.75 + 0.06 * easeOut((t - B_MACRO) / 0.4);
	if (t < C_SPOOL) return aim(PHONE24.u, PHONE24.v, S0, 960, 560);
	const w = easeOut((t - C_SPOOL) / 0.16);
	const S = lerp(S0, 2.0, w) * (1 + punch(t, BACK, 0.05) + punch(t, GONE, 0.05));
	return aim(PHONE24.u, PHONE24.v, S, 960, lerp(560, 905, w));
};

const P24Shot: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const spool = t >= C_SPOOL;
	const g = p24Geo(t);
	const cell = 8.5;
	const R = spool ? 0.05 + stepped(t, SPOOL_BEATS, [0.04, 0.05, 0.07, 0.06, 0.08, 0.07], 0.16) : 0;
	const cold = spreadMask(PHONE24.u, PHONE24.v, R, 24);
	const [kx, ky] = kickNudge(t, 24, 2.2);
	const plates: Plate[] = [HEAT(cell, {dx: kx, dy: ky, mask: (u, v) => 1 - cold(u, v)}), COLD(8.8, {mask: cold, gain: 1.05}), KEY(cell)];
	const quad = inflate(
		Q24.map(([u, v]) => toScreen(g, u, v)),
		1.03,
	);
	// the slot: the screen's far edge, where the receipt comes out
	const L = toScreen(g, Q24[0][0], Q24[0][1]);
	const Rr = toScreen(g, Q24[1][0], Q24[1][1]);
	const ang = Math.atan2(Rr[1] - L[1], Rr[0] - L[0]);
	const len = Math.hypot(Rr[0] - L[0], Rr[1] - L[1]);
	const k = (len * Math.cos(ang) * 0.86) / SPOOL_W;
	const inset = len * 0.07;
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d.P24, ...g, plates, seed: 24}]} />
			<LimeScreen quad={quad} W={900} H={420} pct={pctAt(t)} t={t} beats={PCT_BEATS} />
			{spool && (
				<div style={{position: 'absolute', left: L[0] + inset * Math.cos(ang), top: L[1] + inset * Math.sin(ang) + 6, transformOrigin: '0 0', transform: `skewY(${(ang * 180) / Math.PI}deg) scale(${k})`}}>
					<Spool t={t} />
				</div>
			)}
		</>
	);
};

const P25Shot: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const sl = slap(t, D_P25);
	const g: Geo = {...FULL, s: sl.s};
	const R = stepped(t, [D_P25, LIKES, TAGS, REACH], [0.16, 0.12, 0.12, 0.3], 0.16);
	const cold = spreadMask(PHONE25.u, PHONE25.v, R, 25);
	const [kx, ky] = kickNudge(t, 25, 2.2);
	const plates: Plate[] = [HEAT(8.5, {dx: kx, dy: ky, mask: (u, v) => 1 - cold(u, v)}), COLD(9, {mask: cold}), KEY(8.5)];
	const quad = inflate(
		Q25.map(([u, v]) => toScreen(g, u, v)),
		1.03,
	);
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d.P25, ...g, plates, seed: 25}]} />
			<LimeScreen quad={quad} W={1000} H={240} pct={pctAt(t)} t={t} beats={PCT_BEATS} amp={0.28} />
			<Card x={60} y={40} w={480} t={t} at={LIKES} rot={-2.2} text="You missed 212 likes" size={68} seed={1} />
			<Card x={280} y={540} w={720} t={t} at={TAGS} rot={1.6} head="TOKTIC · JESS.WAV" text="jess.wav tagged you in 14 photos" size={58} seed={2} />
		</>
	);
};

/** The 0:07 / 0:42 pop-up again, now with the battery climbing: 'Stay connected?' [Close] [Stay]. */
const StayCard: React.FC<{t: number}> = ({t}) => {
	const sl = slap(t, STAY);
	if (!sl.on) return null;
	const beg = t >= BEG ? Math.exp(-(t - BEG) / 0.16) : 0;
	const ring = t >= BEG ? clamp01((t - BEG) / 0.4) : 0;
	return (
		<div
			style={{
				position: 'absolute',
				left: 930,
				top: 150,
				width: 840,
				height: 700,
				background: INK.cold,
				borderRadius: 44,
				color: INK.paper,
				fontFamily: MONO,
				transform: `rotate(1.6deg) scale(${sl.s})`,
				transformOrigin: '50% 50%',
				boxShadow: sl.shadow,
				padding: '56px 64px',
				boxSizing: 'border-box',
				...inked(800, 17, 41, true),
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 24, letterSpacing: '0.18em'}}>
				<div style={{width: 26, height: 26, borderRadius: 8, background: INK.lime}} />
				TOKTIC
			</div>
			<div style={{fontSize: 230, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.06em', marginTop: 26}}>{pctAt(t)}%</div>
			<div style={{fontSize: 64, lineHeight: 1.1, marginTop: 18}}>Stay connected?</div>
			<div style={{display: 'flex', gap: 28, marginTop: 52}}>
				<div style={{flex: 1, height: 116, borderRadius: 30, border: `5px solid ${INK.paper}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, boxSizing: 'border-box'}}>Close</div>
				<div style={{flex: 1, position: 'relative'}}>
					{ring > 0 && ring < 1 && (
						<div style={{position: 'absolute', inset: -40 * ring, borderRadius: 30 + 40 * ring, border: `${8 * (1 - ring)}px solid ${INK.lime}`}} />
					)}
					<div
						style={{
							height: 116,
							borderRadius: 30,
							background: INK.lime,
							color: INK.key,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 54,
							fontWeight: 500,
							transform: `scale(${1 + 0.09 * beg})`,
						}}
					>
						Stay
					</div>
				</div>
			</div>
		</div>
	);
};

/** P26 slapped down warm over the infected P25: the night fights back. */
const P26Card: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const sl = slap(t, E_P26);
	// a punch onto Dev and his butter-knife microphone on 80.2, zooming about his face so he holds his place
	const card: Geo = {w: 1850, h: 1033, cx: 972, cy: 548, rot: -1.4, s: sl.s};
	const [px, py] = toScreen(card, DEV26.u, DEV26.v);
	const k = 1 + punch(t, DEV, 0.3);
	const base: Geo = {...card, s: sl.s * k, cx: px + (card.cx - px) * k, cy: py + (card.cy - py) * k};
	const plates = warmPlates(t, 8.5, 26);
	return (
		<>
			<OnSheet sheet={base}>
				<div style={{position: 'absolute', inset: 0, boxShadow: sl.shadow}}>
					<Paper x={0} y={0} w={base.w} h={base.h} />
				</div>
			</OnSheet>
			<Press sheets={[{map: d.P26, ...base, plates, seed: 26}]} />
		</>
	);
};

// ------------------------------------------------------------------ the flood: 'hear the monitor sing'

/** One warm face per beat (P26: Dev mid-song, Sam, Kai; then P25: Maya laughing), each buried by the cold within the beat. */
type Macro = {
	id: 'P25' | 'P26';
	u: number;
	v: number;
	wu: number;
	/** where the face lands on screen */
	at?: Pt;
	/** a finer screen and a tone curve for a pale face on a pale wall */
	cell?: number;
	heat?: Partial<Plate>;
	key?: Partial<Plate>;
	text: string;
	x: number;
	y: number;
	rot: number;
};
// Sam and Maya are pale, evenly lit faces against pale walls. At 8.5 their eyes and mouths are two cells wide and
// print as nothing, so each face was bare paper inside a hair mass. Both get a finer screen (about 16 to 18 px on
// screen, still a macro dot) and a heavier key, so the eyes and mouth print. Sam (skin and wall both near 0) gets a
// gamma that brings up her features; Maya (skin about 0.1 to 0.2, the wall in front of her nose about 0.45) gets the
// opposite curve, so her face stays clean paper cut out against the orange wall, with the eye, nostril and laughing
// mouth in key. Traced on the faces: P26 Sam eye 0.715,0.33, mouth 0.715,0.375; P25 Maya eye 0.353,0.362, mouth
// 0.36,0.40, nose tip 0.372,0.38 (Jess's face to her right, 0.41 to 0.44, sits at the frame's right edge).
const MACROS: Macro[] = [
	{id: 'P26', u: 0.37, v: 0.4, wu: 0.4, text: 'maya, come back', x: 60, y: 40, rot: -2.5},
	{id: 'P26', u: 0.72, v: 0.355, wu: 0.28, cell: 5, heat: {gain: 1.4, lift: 0.03, gamma: 0.6}, key: {gain: 1.2, gamma: 0.8}, text: "everyone's online", x: 320, y: 178, rot: 1.8},
	{id: 'P26', u: 0.588, v: 0.415, wu: 0.32, cell: 5.5, heat: {gain: 1.3, lift: 0.02, gamma: 0.7}, key: {gain: 1.2, gamma: 0.8}, text: "you're missing it", x: 590, y: 316, rot: -1.4},
	{id: 'P25', u: 0.36, v: 0.39, wu: 0.22, at: [1300, 830], cell: 4, heat: {gain: 1.2, gamma: 1.2}, key: {gain: 1.5, gamma: 0.6}, text: "don't go", x: 860, y: 452, rot: 2.4},
];
const FACE_AT: Pt = [1350, 760];
const COVER = [0.5, 0.65, 0.82, 1.05];

/** The monitor line: a sweep across the frame, a spike on every beat of the flood. */
const SweepECG: React.FC<{t: number; y: number; amp: number}> = ({t, y, amp}) => {
	const t0 = FLOOD[0] - 0.12;
	const span = F.alive - t0;
	const head = (clamp01((t - t0) / span) * 1980) - 30;
	const pts: string[] = [];
	for (let x = -30; x <= head; x += 3) {
		const tx = t0 + ((x + 30) / 1980) * span;
		let v = 0;
		FLOOD.forEach((b, i) => {
			if (tx - b > -0.2 && tx - b < 0.25) v += ecg(tx - b) * (0.75 + 0.12 * i);
		});
		pts.push(`${x},${(y - v * amp).toFixed(1)}`);
	}
	const last = pts.length ? pts[pts.length - 1].split(',').map(Number) : [head, y];
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
			<polyline points={pts.join(' ')} fill="none" stroke={INK.cold} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" style={{mixBlendMode: 'multiply'}} />
			<circle cx={last[0]} cy={last[1]} r={14} fill={INK.cold} />
		</svg>
	);
};

const FloodScene: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	let k = 0;
	while (k + 1 < FLOOD.length && FLOOD[k + 1] <= t) k++;
	const m = MACROS[k];
	const since = t - FLOOD[k];
	const sl = slap(t, FLOOD[k]);
	const S = (sl.s + 0.02 * clamp01(since / 0.45)) / m.wu;
	const [ax, ay] = m.at ?? FACE_AT;
	const g = aim(m.u, m.v, S, ax, ay);
	// the cold rolls in from the bottom-right corner and buries the face within the beat
	const cu = m.u + (1920 - ax) / (S * FW);
	const cv = m.v + (1080 - ay) / (S * FH);
	const diag = Math.hypot((1920 / (S * FW)) * ASPECT, 1080 / (S * FH));
	const R = COVER[k] * diag * easeInOut(clamp01((since - 0.05) / 0.33));
	const cold = spreadMask(cu, cv, R, 81 + k);
	const cell = m.cell ?? 8.5;
	const plates: Plate[] = [
		HEAT(cell, {mask: (u, v) => 1 - cold(u, v), dx: 6 * Math.exp(-since / 0.08), dy: -4 * Math.exp(-since / 0.08), ...m.heat}),
		COLD(8, {mask: cold, gain: 1.1}),
		KEY(cell, m.key),
	];
	const n = Math.round(4 - k);
	const pct = pctAt(t);
	const cd = stamp(t, FLOOD[k]);
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d[m.id], ...g, plates, seed: 90 + k}]} />
			{/* the monitor line runs under the cards, so its spikes never cut their type */}
			<SweepECG t={t} y={612} amp={150} />
			{MACROS.slice(0, k + 1).map((c, i) => (
				<Card key={i} x={c.x} y={c.y} t={t} at={FLOOD[i]} rot={c.rot} text={c.text} size={60} seed={10 + i} />
			))}
			{/* the streak countdown */}
			<div
				style={{
					position: 'absolute',
					left: 60,
					top: 660,
					width: 700,
					height: 370,
					background: INK.cold,
					color: INK.paper,
					fontFamily: MONO,
					borderRadius: 30,
					padding: '30px 44px',
					boxSizing: 'border-box',
					transform: `rotate(-1deg) scale(${cd.s})`,
					transformOrigin: '0% 100%',
					boxShadow: '0 10px 24px rgba(30,20,60,0.35)',
					...inked(800, 3, 9, true),
				}}
			>
				<div style={{fontSize: 40, letterSpacing: '0.02em'}}>your streak ends in</div>
				<div style={{fontSize: 250, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.05em', marginTop: 4}}>0:0{n}</div>
			</div>
			{/* the battery, charging in lime */}
			<div
				style={{
					position: 'absolute',
					left: 1360,
					top: 60,
					width: 500,
					height: 200,
					background: INK.cold,
					borderRadius: 30,
					display: 'flex',
					alignItems: 'center',
					gap: 26,
					padding: '0 36px',
					boxSizing: 'border-box',
					transform: `rotate(1.2deg) scale(${cd.s})`,
					boxShadow: '0 10px 24px rgba(30,20,60,0.35)',
					...inked(600, 31, 5, true),
				}}
			>
				<div style={{position: 'relative', width: 170, height: 92, border: `8px solid ${INK.paper}`, borderRadius: 18, boxSizing: 'border-box'}}>
					<div style={{position: 'absolute', left: 6, top: 6, bottom: 6, width: `calc(${pct}% - 12px)`, background: INK.lime, borderRadius: 8}} />
					<div style={{position: 'absolute', right: -22, top: 24, width: 12, height: 28, borderRadius: 4, background: INK.paper}} />
				</div>
				<div style={{fontFamily: MONO, fontWeight: 500, fontSize: 120, lineHeight: 1, color: INK.paper, letterSpacing: '-0.05em'}}>{pct}%</div>
			</div>
		</>
	);
};

export const Receipt: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P24', 'P25', 'P26']);
	if (!d) return <PaperFill />;
	if (t < D_P25) return <AbsoluteFill>{<P24Shot t={t} d={d} />}</AbsoluteFill>;
	if (t < FLOOD[0])
		return (
			<AbsoluteFill>
				<P25Shot t={t < E_P26 ? t : E_P26 - 0.001} d={d} />
				{t >= E_P26 && (
					<>
						<P26Card t={t} d={d} />
						<StayCard t={t} />
					</>
				)}
			</AbsoluteFill>
		);
	return (
		<AbsoluteFill>
			<FloodScene t={t} d={d} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ TEAR-OFF

/** The tear: a ragged line from the top edge to the bottom, low wobble plus fibre jitter. */
const TEAR_LINE: Pt[] = (() => {
	const pts: Pt[] = [];
	const N = 90;
	for (let i = 0; i <= N; i++) {
		const k = i / N;
		const y = -80 + k * 1240;
		const low = (vnoise(k * 7, 0.5, 71) - 0.5) * 90;
		const hi = (hash2(i, 3, 72) - 0.5) * 16;
		pts.push([1060 - 210 * k + low + hi, y]);
	}
	return pts;
})();
const PIVOT: Pt = [TEAR_LINE[TEAR_LINE.length - 1][0], 1080];

const TornPiece: React.FC<{side: -1 | 1; k: number; children: React.ReactNode}> = ({side, k, children}) => {
	const far = side < 0 ? -900 : 2820;
	const poly = side < 0 ? [[far, -80] as Pt, ...TEAR_LINE, [far, 1160] as Pt] : [...TEAR_LINE, [far, 1160] as Pt, [far, -80] as Pt];
	const clip = `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
	// the fibres: a whiter band along the torn edge, as wide as the paper's top layer that came away
	const bandIn: Pt[] = [...TEAR_LINE, ...TEAR_LINE.slice().reverse().map(([x, y], i) => [x + side * (6 + 10 * hash2(i, 5, 73)), y] as Pt)];
	const a = side * (5 * easeOut(k / 0.35) + 16 * easeIn(k));
	const dx = side * 1350 * easeIn(k);
	const dy = 260 * easeIn(k);
	return (
		<div style={{position: 'absolute', inset: 0, transformOrigin: `${PIVOT[0]}px ${PIVOT[1]}px`, transform: `translate(${dx}px, ${dy}px) rotate(${a}deg)`, filter: 'drop-shadow(0 18px 26px rgba(40,25,10,0.45))'}}>
			<div style={{position: 'absolute', inset: 0, clipPath: clip}}>
				{children}
				<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
					<polygon points={bandIn.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="#F8F4EA" />
					<polyline points={TEAR_LINE.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="rgba(120,100,80,0.35)" strokeWidth={1.5} />
				</svg>
			</div>
		</div>
	);
};

const maya27 = (u: number, v: number) => (inPoly(MAYA27, u, v) ? 1 : 0);

/** P27: the friends warm behind her, Maya printed cold by the screen, the phone at 100%. */
const P27Shot: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const s = 1 + punch(t, NUDGE1, 0.04) + punch(t, CAPTION, 0.04) + punch(t, NUDGE2, 0.04);
	// each push closes in about the space between her face and the phone, so neither leaves the frame
	const g = aim(0.55, 0.6, s, 0.55 * FW - 20, 0.6 * FH - 7);
	const [kx, ky] = kickNudge(t, 27, 2.2);
	const plates: Plate[] = [HEAT(8.5, {dx: kx, dy: ky, mask: (u, v) => 1 - maya27(u, v)}), COLD(8, {mask: maya27, gain: 1.08}), KEY(8.5)];
	const quad = inflate(
		Q27.map(([u, v]) => toScreen(g, u, v)),
		1.04,
	);
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d.P27, ...g, plates, seed: 27}]} />
			<LimeScreen quad={quad} W={900} H={260} pct={100} t={t} beats={beatsIn(TEAR - 1.4, t + 0.01).map((b) => b.t)} amp={0.26} win={1.1} />
		</>
	);
};

/** 154.575: a cold ultramarine punch-in on her face, pushing in through the kick-out. */
const ColdFace: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const k = (t - PUNCH) / (JESS - PUNCH);
	const g = aim(FACE27.u, FACE27.v, 2.9 * (1.0 + 0.04 * easeOut(k * 3) + 0.04 * k), 1000, 540);
	const [kx, ky] = kickNudge(t, 31, 1.6);
	// only she prints: the kitchen drops out to bare paper, the screen has her
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d.P27, ...g, plates: [COLD(8, {gain: 1.12, dx: kx, dy: ky, mask: maya27}), KEY(8.5, {gain: 0.9, mask: maya27})], seed: 31}]} />
		</>
	);
};

/** 155.504: Jess in the bright doorway, calling her. */
const JessShot: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const sl = slap(t, JESS);
	// tight enough for her face to read (and her held-out hand and the bright doorway stay in), so the split's 2.17x
	// continues the push
	const g = aim(0.47, 0.5, (sl.s + punch(t, JESS2, 0.06)) * 1.85);
	return (
		<>
			<PaperFill />
			<Press sheets={[{map: d.P28, ...g, plates: warmPlates(t, 8.5, 28), seed: 28}]} />
		</>
	);
};

/** Where the split sits on each beat of bar 84 (screen x of the boundary). */
const splitX = (t: number) => {
	// each push is a shove: there in two frames, a little past, back
	const e = (t0: number) => {
		const k = clamp01((t - t0) / 0.1);
		return k <= 0 ? 0 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
	};
	let x = 960 * e(SPLIT); // cold slams in from the left, shoving Jess right
	x += (600 - 960) * e(WARM_PUSH);
	x += (1210 - 600) * e(COLD_PUSH);
	x += (-80 - 1210) * easeOut((t - WARM_FLOOD) / 0.14); // past the edge: the lean leaves no paper wedge
	return x;
};

const Split: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const x = splitX(t);
	const flood = clamp01((t - WARM_FLOOD) / (F.drop3 - WARM_FLOOD));
	const lean = 26; // the boundary leans a little, like a hand-cut edge
	// cold Maya (mirrored to face Jess), anchored to the boundary: warm pushing shoves her out of frame
	const cold = aim(FACE27.u, FACE27.v + 0.06, 1 / 0.44, x - 470, 540, true);
	// warm Jess, anchored to the boundary, centring as she takes the frame
	const wx = lerp(x + 480, 960, easeOut((t - WARM_FLOOD) / 0.14));
	const warm = aim(JESS28_MID.u, JESS28_MID.v, (1 + 0.06 * flood) / 0.46, wx, 540);
	const [kx, ky] = kickNudge(t, 84, 3);
	const warmPl: Plate[] = [HEAT(8.5, {dx: kx, dy: ky, gain: 1 + 1.8 * easeIn(flood), lift: -0.55 * easeIn(flood)}), KEY(8.5)];
	const coldPl: Plate[] = [COLD(8, {gain: 1.12, mask: maya27}), KEY(8.5, {gain: 0.9, mask: maya27})];
	const leftClip = `polygon(-10px -10px, ${x + lean - 5}px -10px, ${x - lean - 5}px 1090px, -10px 1090px)`;
	const rightClip = `polygon(${x + lean + 5}px -10px, 1930px -10px, 1930px 1090px, ${x - lean + 5}px 1090px)`;
	return (
		<>
			<PaperFill />
			{x > 0 && (
				<AbsoluteFill style={{clipPath: leftClip}}>
					<Press sheets={[{map: d.P27, ...cold, plates: coldPl, seed: 41}]} />
				</AbsoluteFill>
			)}
			<AbsoluteFill style={{clipPath: rightClip}}>
				<Press sheets={[{map: d.P28, ...warm, plates: warmPl, seed: 42}]} />
			</AbsoluteFill>
		</>
	);
};

/** 'to feel everything': her line, in her voice, stamped in screen space (paper trapped so it reads on any print). */
const Caption: React.FC<{t: number}> = ({t}) => {
	const st = stamp(t, CAPTION);
	if (!st.on) return null;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...inked(900, 11, 3, true)}}>
			<g transform={`translate(70 1000) scale(${st.s}) translate(-70 -1000)`}>
				{(['to feel', 'everything'] as const).map((w, i) => (
					<text key={w} x={70} y={875 + i * 125} fontFamily="Instrument Serif" fontStyle="italic" fontSize={150} fill={INK.key} stroke={INK.paper} strokeWidth={26} strokeLinejoin="round" paintOrder="stroke">
						{w}
					</text>
				))}
			</g>
		</svg>
	);
};

export const TearOff: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P25', 'P26', 'P27', 'P28']);
	if (!d) return <PaperFill />;
	const tk = (t - TEAR) / 0.42;
	let shot: React.ReactNode;
	if (t < PUNCH) shot = <P27Shot t={t} d={d} />;
	else if (t < JESS) shot = <ColdFace t={t} d={d} />;
	else if (t < SPLIT) shot = <JessShot t={t} d={d} />;
	else shot = <Split t={t} d={d} />;
	return (
		<AbsoluteFill>
			{shot}
			{t < JESS && <Caption t={t} />}
			{tk < 1 && (
				<>
					<TornPiece side={-1} k={clamp01(tk)}>
						<FloodScene t={TEAR - 0.001} d={d} />
					</TornPiece>
					<TornPiece side={1} k={clamp01(tk)}>
						<FloodScene t={TEAR - 0.001} d={d} />
					</TornPiece>
				</>
			)}
		</AbsoluteFill>
	);
};
