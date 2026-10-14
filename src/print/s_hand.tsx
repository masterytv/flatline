import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {PhoneScreen} from '../opening/ScreenScenes';
import {DISPLAY_FONT, PHONE_H, PHONE_W} from '../theme';
import {beatsIn, bt} from '../timing';
import {PAPER_URL, useDensities} from './density';
import {INK} from './ink';
import {clamp01, easeInOut, easeOut, inked, kickNudge, lerp} from './kit';
import {Cam, Plate} from './press';
import {CamLayer, Paper, Press} from './Press';
import {P1_PLATES, POSTER, posterSheet, sheetCam, SheetMarks, WIRE_Y} from './s_drop';
import {MonoText, P, Part, PartShape, PartState} from './s_hand_parts';

// 1:24.8 to 1:32.2 (bars 45-48): GRAFT 1, Uninstall's drop-1 hand-over printed in Proof of Life's inks.
// The phone shatters on a cream flash; its 56 shards (the frozen O27 screen, exactly as the opening drew them) hang
// over a key-black flood, and through the phone-shaped gap P1 is already on the press. The 1:24 FLATLINE stays,
// knocked out to bare paper, and dissolves into the flood as a halftone where the opening faded it. TokTic's 24 parts
// spill out (lime: they are the app's own pieces), then dance a new layout every bar: an exploded diagram (46), a
// feed column (47), a ring (48). Every kick snaps their silhouettes open as windows onto P1, longer each bar. On the
// half-beat before 1:32 they fly at the lens, the windows swell into one sheet and the camera pulls back to the
// poster framing Progs (s_drop.tsx) starts from on 92.172.

const W = 1920;
const H = 1080;

/** Beat times in [t0, t1) from the grid. */
const beatTimes = (t0: number, t1: number) => beatsIn(t0 - 1e-3, t1 - 1e-3).map((b) => b.t);
/** Index of the last time <= t in a sorted list and the seconds since it. */
const since = (t: number, times: number[]) => {
	let i = -1;
	for (let k = 0; k < times.length; k++) if (times[k] <= t) i = k;
	return {i, dt: i < 0 ? -1 : t - times[i]};
};
const outBack = (x: number, s = 1.7) => {
	const k = clamp01(x) - 1;
	return 1 + (s + 1) * k * k * k + s * k * k;
};
const seg = (t: number, t0: number, t1: number) => clamp01((t - t0) / (t1 - t0));

// ------------------------------------------------------------------------------------------------ cues (all grid beats)

const SPILL = bt(45, 3); // 85.705: the parts slip out through the cracks
const FACETS = [bt(45, 2), bt(45, 4)]; // 85.252, 86.169: lime catches on the glass
const BEATS46 = beatTimes(bt(46), bt(49)); // 12 beats, a pose each
/** 91.940: the half-beat before 1:32, the midpoint of two grid beats (never a fixed BPM). */
const FLY = (bt(48, 4) + bt(49)) / 2;
const END = F.flatline2;
/** Every kick that snaps the windows open: bars 46-48 (in bar 45 the glass has the beats, and would cover them). */
const KICKS = beatTimes(T.end, END);

/** How long the windows stay open after each kick: a glimpse in bar 46, most of the beat by bar 48. */
const holdFor = (k: number) => (k < bt(47) ? 0.15 : k < bt(48) ? 0.21 : 0.26);

// ------------------------------------------------------------------------------------------------ the sheet and the camera

/** The camera covers the frame with P1's poster until the fly-in, then pulls back to Progs' framing. */
const COVER: Cam = {
	cx: POSTER.cx,
	cy: POSTER.cy,
	s: Math.max(W / POSTER.w, H / POSTER.h) * 1.002,
};
const camAt = (t: number): Cam => {
	if (t < FLY) return COVER;
	const to = sheetCam(t);
	const k = easeInOut(seg(t, FLY, END));
	return {
		cx: lerp(COVER.cx, to.cx, k),
		cy: lerp(COVER.cy, to.cy, k),
		s: COVER.s * Math.pow(to.s / COVER.s, k),
	};
};

// ------------------------------------------------------------------------------------------------ the phone and its glass

const FRAME = 14; // the opening's bezel
const PW = PHONE_W + 2 * FRAME;
const PH = PHONE_H + 2 * FRAME;
const PS = (H * 0.92) / PH; // ScreenOpening's phone scale at 1080p
const PHONE = {
	x: W / 2 - (PW * PS) / 2,
	y: H / 2 - (PH * PS) / 2,
	w: PW * PS,
	h: PH * PS,
	r: 70 * PS,
};

type Shard = {pts: [number, number][]; cx: number; cy: number};
/** The opening's 56 shards: same seeds, same jittered 4x7 grid, so they break exactly where its glass broke. */
const SHARDS: Shard[] = (() => {
	const cols = 4;
	const rows = 7;
	const v = (c: number, r: number): [number, number] => {
		const edge = c === 0 || r === 0 || c === cols || r === rows;
		const jx = edge ? 0 : (random(`vx${c}-${r}`) - 0.5) * (PW / cols) * 0.6;
		const jy = edge ? 0 : (random(`vy${c}-${r}`) - 0.5) * (PH / rows) * 0.6;
		return [(c / cols) * PW + jx, (r / rows) * PH + jy];
	};
	const out: Shard[] = [];
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			const a = v(c, r);
			const b = v(c + 1, r);
			const d = v(c + 1, r + 1);
			const e = v(c, r + 1);
			const tris: [number, number][][] =
				random(`split${c}-${r}`) < 0.5
					? [
							[a, b, d],
							[a, d, e],
						]
					: [
							[a, b, e],
							[b, d, e],
						];
			for (const pts of tris)
				out.push({
					pts,
					cx: (pts[0][0] + pts[1][0] + pts[2][0]) / 3,
					cy: (pts[0][1] + pts[1][1] + pts[2][1]) / 3,
				});
		}
	}
	return out;
})();

/** The glass opens a notch on each beat of bar 45 (the hang has a pulse), on top of its drag. */
const OPEN_STEPS = [bt(45, 2), bt(45, 3), bt(45, 4)];
const glassOpen = (t: number) => 1 + OPEN_STEPS.reduce((s, b) => s + 0.32 * outBack((t - b) / 0.16, 2.2) * (t >= b ? 1 : 0), 0);

/**
 * Shards with drag (v·e^(-3·dt)): they slow and hang, turning, open a notch per beat, then drop away on 46.1.
 * PROVISIONAL until O27 exists: the shards carry the opening's frozen screen (O27 under the Clear! crack) and were
 * judged on its dark FaceWorld stand-in; re-check the facet-catch strength (0.62) and the sheen on her warm face.
 */
const Glass: React.FC<{t: number}> = ({t}) => {
	const dt = t - T.drop;
	const fall = Math.max(0, t - T.end);
	if (dt < 0 || fall > 0.55) return null;
	const drag = 1 - Math.exp(-3 * dt);
	const open = glassOpen(t);
	return (
		<div
			style={{
				position: 'absolute',
				left: W / 2 - PW / 2,
				top: H / 2 - PH / 2,
				width: PW,
				height: PH,
				transform: `scale(${PS})`,
			}}
		>
			{SHARDS.map((s, i) => {
				const dx = s.cx - PW / 2;
				const dy = s.cy - PH / 2;
				const k = (0.1 + 0.2 * random(`sv${i}`)) * open;
				let caught = 0;
				let jolt = 0;
				for (const b of FACETS) {
					if (t >= b && random(`facet${b}-${i}`) < 0.5) {
						caught = Math.max(caught, Math.exp(-(t - b) / 0.16));
						jolt += (random(`fj${b}-${i}`) - 0.5) * 14 * Math.exp(-(t - b) / 0.12);
					}
				}
				const ox = dx * k * drag;
				const oy = dy * k * drag + 18 * drag + 0.5 * 9000 * fall * fall * (0.8 + 0.4 * random(`sg${i}`));
				const rot = (random(`sr${i}`) - 0.5) * 36 * drag + jolt + (random(`sr2${i}`) - 0.5) * 500 * fall;
				const sc = 1 + 0.08 * random(`sz${i}`) * drag;
				const clip = `polygon(${s.pts.map(([px, py]) => `${px.toFixed(1)}px ${py.toFixed(1)}px`).join(',')})`;
				const pts = s.pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							inset: 0,
							transformOrigin: `${s.cx}px ${s.cy}px`,
							transform: `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
						}}
					>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								clipPath: clip,
								background: '#050608',
							}}
						>
							{/* the frozen kick-out screen (O27 and the Clear! crack), as the opening's shards carry it */}
							<div
								style={{
									position: 'absolute',
									left: FRAME,
									top: FRAME,
									width: PHONE_W,
									height: PHONE_H,
									borderRadius: 56,
									overflow: 'hidden',
								}}
							>
								<PhoneScreen t={T.drop - 0.01} />
							</div>
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 50%)',
								}}
							/>
						</div>
						<svg
							viewBox={`0 0 ${PW} ${PH}`}
							style={{
								position: 'absolute',
								inset: 0,
								width: PW,
								height: PH,
								overflow: 'visible',
							}}
						>
							<polygon points={pts} fill={INK.lime} opacity={0.62 * caught} />
							<polygon points={pts} fill="none" stroke={INK.lime} strokeWidth={1.6 + 2.4 * caught} strokeLinejoin="round" opacity={0.45 + 0.55 * caught} />
						</svg>
					</div>
				);
			})}
		</div>
	);
};

// ------------------------------------------------------------------------------------------------ the 24 parts

type Slot = {p: Part; x: number; y: number; z: number; s: number};

// exploded-diagram layout (screen px, z toward the camera), as Uninstall placed them
const SLOTS: Slot[] = [
	{
		p: P.card('jess.wav liked your post', '“out tonight”'),
		x: 420,
		y: 190,
		z: 120,
		s: 1.25,
	},
	{
		p: P.card('@kai.mp4 mentioned you', 'in a comment'),
		x: 1490,
		y: 215,
		z: -150,
		s: 1.2,
	},
	{
		p: P.card('You have 12 new likes', 'Keep the streak going'),
		x: 330,
		y: 880,
		z: -80,
		s: 1.2,
	},
	{
		p: P.card('3 new stories', 'from people you follow'),
		x: 1560,
		y: 880,
		z: 180,
		s: 1.25,
	},
	{
		p: P.card('Low battery', '20% remaining. Stay connected?'),
		x: 990,
		y: 975,
		z: -300,
		s: 1.05,
	},
	{p: P.heart(70), x: 770, y: 360, z: 250, s: 3.1},
	{p: P.heart(70), x: 1260, y: 720, z: 60, s: 2.4},
	{p: P.heart(70, true), x: 1800, y: 560, z: -200, s: 1.9},
	{p: P.heart(70, true), x: 120, y: 530, z: -120, s: 2.2},
	{p: P.battery(), x: 1190, y: 395, z: 0, s: 2.4},
	{p: P.signal(), x: 620, y: 700, z: 100, s: 2.2},
	{p: P.clock('1:48'), x: 1010, y: 110, z: -250, s: 1.3},
	{p: P.logo(), x: 960, y: 545, z: 300, s: 1.5},
	{p: P.button('Stay'), x: 1450, y: 520, z: -60, s: 1.6},
	{p: P.bubble('where r u??'), x: 520, y: 525, z: -200, s: 1.5},
	{p: P.bubble('maya look up'), x: 1660, y: 375, z: 40, s: 1.35},
	{p: P.bubble('did u see my post??', true), x: 790, y: 830, z: 140, s: 1.35},
	{p: P.badge('99+'), x: 1335, y: 115, z: 200, s: 2.1},
	{p: P.pill('@maya.xo'), x: 230, y: 335, z: 60, s: 1.5},
	{p: P.moon(), x: 1720, y: 710, z: -100, s: 2.3},
	{p: P.toggle(), x: 1150, y: 860, z: -150, s: 2.0},
	{p: P.seen('Seen 1:47'), x: 440, y: 655, z: -260, s: 1.5},
	{p: P.spinner(), x: 1835, y: 180, z: -50, s: 2.0},
	{p: P.avatar(), x: 120, y: 125, z: 0, s: 2.0},
];
const N = SLOTS.length;
const COLUMN_ORDER = [12, 0, 5, 14, 9, 1, 16, 6, 18, 2, 10, 15, 3, 17, 8, 13, 4, 7, 19, 11, 20, 21, 22, 23];
const TEXTY = ['clock', 'seen'];

type Pose = {
	x: number;
	y: number;
	z: number;
	s: number;
	rot: number;
	rotY: number;
};

const proj = (q: Pose) => {
	const k = 1600 / (1600 - q.z);
	return {
		X: W / 2 + (q.x - W / 2) * k,
		Y: H / 2 + (q.y - H / 2) * k,
		S: q.s * k,
	};
};
const transformOf = (q: Pose, extra = 1) => {
	const {X, Y, S} = proj(q);
	const c = Math.cos((q.rotY * Math.PI) / 180);
	const sk = Math.sin((q.rotY * Math.PI) / 180) * 10;
	const s = S * extra;
	return `translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${q.rot.toFixed(2)}) skewY(${sk.toFixed(2)}) scale(${(s * Math.max(0.02, Math.abs(c))).toFixed(4)} ${s.toFixed(4)})`;
};
const maxDim = (p: Part) => Math.max(p.w, p.h * 1.6);
const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
	x: lerp(a.x, b.x, k),
	y: lerp(a.y, b.y, k),
	z: lerp(a.z, b.z, k),
	s: lerp(a.s, b.s, k),
	rot: lerp(a.rot, b.rot, k),
	rotY: lerp(a.rotY, b.rotY, k),
});

/** Pose j (0-11) of the bars 46-48 choreography. */
const poseFor = (i: number, j: number): Pose => {
	const sl = SLOTS[i];
	const jitter = (random(`rot${i}-${j}`) - 0.5) * 16;
	if (j < 4) {
		// bar 46, the exploded diagram: four steps outward, one per beat
		const k = 0.62 + 0.38 * ((j + 1) / 4);
		return {
			x: W / 2 + (sl.x - W / 2) * k,
			y: H / 2 + (sl.y - H / 2) * k,
			z: sl.z * k,
			s: sl.s * (0.7 + 0.3 * k),
			rot: jitter * (1 - k * 0.5),
			rotY: 0,
		};
	}
	const c = COLUMN_ORDER.indexOf(i);
	if (j < 8) {
		// bar 47, the feed: one column scrolling up a slot per beat
		const step = j - 4;
		let pos = c - 3 - step;
		pos = ((((pos + 8) % N) + N) % N) - 8;
		const fit = Math.min(3.2, 640 / maxDim(sl.p));
		return {
			x: W / 2 + (c % 2 ? 110 : -110),
			y: H / 2 + pos * 250,
			z: (c % 3) * 80 - 80,
			s: fit,
			rot: (c % 2 ? 1 : -1) * 2.5,
			rotY: 0,
		};
	}
	// bar 48, the loop: a ring turning three notches (45°) per beat; one notch would just swap each part for its neighbour
	const a = ((c + 3 * (j - 8)) / N) * Math.PI * 2 - Math.PI / 2;
	const fit = Math.min(1.7, 300 / maxDim(sl.p));
	return {
		x: W / 2 + Math.cos(a) * 780,
		y: H / 2 + Math.sin(a) * 330,
		z: Math.sin(a) * 140,
		s: fit,
		rot: 0,
		rotY: 0,
	};
};

/** The spill (85.705 to 86.634): out of the phone through the cracks, with drag. */
const spillPose = (i: number, t: number): Pose => {
	const sl = SLOTS[i];
	const drag = 1 - Math.exp(-3.5 * Math.max(0, t - SPILL));
	const k = 0.08 + 0.4 * drag;
	return {
		x: W / 2 + (sl.x - W / 2) * k,
		y: H / 2 + (sl.y - H / 2) * k,
		z: sl.z * k,
		s: sl.s * (0.2 + 0.5 * drag),
		rot: (random(`sp${i}`) - 0.5) * 50 * (1 - drag * 0.6),
		rotY: 0,
	};
};

/** Where each part is at t (shared by the flood's mask and the drawing, so the windows align exactly). */
const partPose = (i: number, t: number): Pose => {
	if (t < T.end) return spillPose(i, t);
	const {i: j, dt} = since(t, BEATS46);
	const prev = j <= 0 ? spillPose(i, T.end) : poseFor(i, j - 1);
	const next = poseFor(i, j);
	const q = lerpPose(prev, next, outBack(dt / 0.18, 1.7));
	// on each downbeat every piece flips 180° about Y, like a card
	q.rotY = j % 4 === 0 ? 180 * clamp01(dt / 0.16) : 0;
	if (t < FLY) return q;
	// 91.940: they fly at the lens, converging on its axis
	const k = Math.pow(seg(t, FLY, FLY + 0.16), 1.5);
	const ring = poseFor(i, 11);
	return {
		x: lerp(ring.x, W / 2 + (ring.x - W / 2) * 0.12, k),
		y: lerp(ring.y, H / 2 + (ring.y - H / 2) * 0.12, k),
		z: lerp(ring.z, 1500, k),
		s: ring.s,
		rot: (random(`fly${i}`) - 0.5) * 140 * k,
		rotY: 0,
	};
};

/** Window state at t: open after each kick for that bar's hold, punching in a little; open for good from the fly-in. */
const windowAt = (t: number) => {
	if (t >= FLY)
		return {
			open: true,
			punch: 0,
			dil: 1500 * Math.pow(seg(t, FLY + 0.05, FLY + 0.13), 2),
		};
	const {i, dt} = since(t, KICKS);
	if (i < 0) return {open: false, punch: 0, dil: 0};
	return {open: dt < holdFor(KICKS[i]), punch: Math.exp(-dt / 0.05), dil: 0};
};

// ------------------------------------------------------------------------------------------------ halftone masks (CSS)

/** A 45° dot screen as a CSS mask tile: dots on the tile's corners and centre. `holes` punches them out instead. */
const dotScreen = (cell: number, r: number, holes: boolean): React.CSSProperties => {
	const dots = [
		[0, 0],
		[cell, 0],
		[0, cell],
		[cell, cell],
		[cell / 2, cell / 2],
	]
		.map(([x, y]) => `<circle cx='${x}' cy='${y}' r='${r.toFixed(2)}' fill='${holes ? 'black' : 'white'}'/>`)
		.join('');
	const svg = holes
		? `<svg xmlns='http://www.w3.org/2000/svg' width='${cell}' height='${cell}'><defs><mask id='m'><rect width='${cell}' height='${cell}' fill='white'/>${dots}</mask></defs><rect width='${cell}' height='${cell}' fill='white' mask='url(#m)'/></svg>`
		: `<svg xmlns='http://www.w3.org/2000/svg' width='${cell}' height='${cell}'>${dots}</svg>`;
	const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
	return {
		WebkitMaskImage: url,
		maskImage: url,
		WebkitMaskSize: `${cell}px ${cell}px`,
		maskSize: `${cell}px ${cell}px`,
		WebkitMaskRepeat: 'repeat',
		maskRepeat: 'repeat',
	};
};

// ------------------------------------------------------------------------------------------------ the 1:24 FLATLINE, carried over

/** The opening's FlatlineType after the drop: same face, size, place and shake; it fades out 85.54-86.43 as it did. */
const typeState = (t: number) => {
	const n = Math.floor(t * 30);
	const shake = (1 - clamp01((t - T.flatline) / 0.4)) * 14;
	const out = clamp01((t - (T.drop + 0.75)) / (T.end - 0.2 - (T.drop + 0.75)));
	return {
		sx: (random(`fs${n}`) - 0.5) * shake,
		sy: (random(`fy${n}`) - 0.5) * shake,
		out,
	};
};

const FlatlineWord: React.FC<{
	t: number;
	color?: string;
	paper?: boolean;
	style?: React.CSSProperties;
}> = ({t, color, paper, style}) => {
	const {sx, sy, out} = typeState(t);
	return (
		<AbsoluteFill
			style={{
				alignItems: 'center',
				justifyContent: 'center',
				transform: `translate(${sx}px, ${sy}px)`,
			}}
		>
			<div
				style={{
					fontFamily: DISPLAY_FONT,
					fontWeight: 700,
					fontSize: 300,
					letterSpacing: -9,
					lineHeight: 1,
					textAlign: 'center',
					transform: `scale(${1 + 0.08 * out})`,
					whiteSpace: 'nowrap',
					...(paper
						? {
								color: 'transparent',
								backgroundColor: INK.paper,
								backgroundImage: `url(${PAPER_URL})`,
								backgroundBlendMode: 'multiply',
								backgroundSize: '2048px 1152px',
								WebkitBackgroundClip: 'text',
								backgroundClip: 'text',
							}
						: {color}),
					...style,
				}}
			>
				FLATLINE
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ the section

const TITLES: [number, string][] = [
	[bt(46), 'TOKTIC 4.2  ·  FIG. 1  EXPLODED VIEW  ·  24 PARTS'],
	[bt(47), 'TOKTIC 4.2  ·  FIG. 2  THE FEED  ·  1 SLOT / BEAT'],
	[bt(48), 'TOKTIC 4.2  ·  FIG. 3  THE LOOP  ·  45° / BEAT'],
];

export const HandOver: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P1']);
	const cam = camAt(t);

	// P1 on the press: in both inks, the orange plate landing off register on the drop and settling; every kick nudges
	const settle = 10 * Math.exp(-(t - T.drop) / 0.35);
	const plates: Plate[] = P1_PLATES.map((p, k) => {
		const [nx, ny] = kickNudge(t, 40 + k, 2.4, SPILL, FLY);
		return {
			...p,
			dx: nx + (p.ch === 1 ? settle : 0),
			dy: ny - (p.ch === 1 ? settle * 0.6 : 0),
		};
	});

	// beat energy for the parts (signal bars, battery)
	const all = beatTimes(T.drop, END);
	const {dt: bdt} = since(t, all);
	const st: PartState = {
		t,
		beat: bdt < 0 ? 0 : Math.exp(-bdt / 0.12),
		charge: bdt < 0 ? 0 : Math.exp(-bdt / 0.32),
	};

	const spilled = t >= SPILL;
	const poses = SLOTS.map((_, i) => partPose(i, t));
	const order = SLOTS.map((_, i) => i).sort((a, b) => poses[a].z - poses[b].z);
	const win = spilled ? windowAt(t) : {open: false, punch: 0, dil: 0};
	const extra = 1 + 0.12 * win.punch;
	const phoneHole = t < T.end;
	// the windows have swallowed the flood: from here it is one sheet
	const joined = t >= FLY + 0.13;
	const fly = seg(t, FLY, FLY + 0.16);

	// the flash: cream paper on the drop, breaking up into a coarse halftone as it goes
	const fdt = t - T.drop;
	const FC = 36;
	const fr = fdt < 0.06 ? FC : FC * 0.53 * (1 - clamp01((fdt - 0.06) / 0.24));
	// the type: bare paper until 85.54, then eaten by key dots until 86.43
	const ty = typeState(t);
	const TC = 18;
	const tr = TC * 0.54 * ty.out;

	// the wire: the opening's lime rule (6 px, glowing) settling to Progs' 4 px ink line
	const wk = easeOut(seg(t, T.drop, T.drop + 0.6));
	const wireW = lerp(6, 4, wk);

	const title = [...TITLES].reverse().find(([at]) => t >= at);
	const leaders = t >= T.end && t < bt(47) ? 1 - seg(t, bt(46, 4), bt(47)) : 0;
	const svgBox: React.CSSProperties = {
		position: 'absolute',
		inset: 0,
		width: '100%',
		height: '100%',
		overflow: 'visible',
	};

	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{/* the press sheet under everything: P1 already printed, its marks just off frame until the pull-back */}
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[posterSheet(d.P1, plates)]} />}
			<CamLayer cam={cam}>
				<SheetMarks code="K+O" />
			</CamLayer>

			{/* the key flood: the dead phone's dark as ink. Holes: the phone-shaped gap (bar 45), the parts' silhouettes on each kick */}
			{!joined && (
				<svg viewBox={`0 0 ${W} ${H}`} style={{...svgBox, ...inked(1024, 0, 0, true)}}>
					<defs>
						<mask id="hand-flood" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
							<rect x={0} y={0} width={W} height={H} fill="white" />
							{phoneHole && <rect x={PHONE.x} y={PHONE.y} width={PHONE.w} height={PHONE.h} rx={PHONE.r} fill="black" />}
							{win.open &&
								order.map((i) => {
									const {S} = proj(poses[i]);
									const sw = win.dil > 0 ? win.dil / Math.max(0.05, S * extra) : 0;
									return (
										<g key={i} transform={transformOf(poses[i], extra)}>
											<PartShape p={SLOTS[i].p} mode="sil" s={st} sil={{ink: 'black', grow: sw}} />
										</g>
									);
								})}
						</mask>
					</defs>
					<rect x={0} y={0} width={W} height={H} fill={INK.key} mask="url(#hand-flood)" />
				</svg>
			)}

			<Glass t={t} />

			{/* the wire */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: WIRE_Y - wireW / 2,
					height: wireW,
					background: INK.lime,
					boxShadow: wk < 1 ? `0 0 ${(24 * (1 - wk)).toFixed(1)}px ${INK.lime}` : undefined,
				}}
			/>

			{/* the 1:24 FLATLINE, knocked out of the flood to bare paper, dissolving into a halftone (the spill bursts over it) */}
			{t < T.end && <FlatlineWord t={t} paper style={tr > 0.2 ? dotScreen(TC, tr, true) : undefined} />}

			{/* the parts, the exploded view's leaders and the title block */}
			{spilled && (
				<svg viewBox={`0 0 ${W} ${H}`} style={{...svgBox, ...inked(1024, 211, 97, true)}}>
					{leaders > 0 && (
						<g opacity={leaders}>
							{order.map((i) => {
								const {X, Y, S} = proj(poses[i]);
								const p = SLOTS[i].p;
								const len = Math.hypot(X - W / 2, Y - H / 2) || 1;
								const ux = (X - W / 2) / len;
								const uy = (Y - H / 2) / len;
								const r = 0.5 * (Math.abs(ux) * p.w + Math.abs(uy) * p.h) * S + 30;
								const lx = X - ux * r;
								const ly = Y - uy * r;
								return (
									<g key={i}>
										<line
											x1={W / 2 + ux * 40}
											y1={H / 2 + uy * 40}
											x2={lx - ux * 15}
											y2={ly - uy * 15}
											stroke={INK.lime}
											strokeWidth={1.4}
											strokeDasharray="3 7"
										/>
										<circle cx={lx} cy={ly} r={14} fill={INK.key} stroke={INK.lime} strokeWidth={1.4} />
										<MonoText x={lx} y={ly + 5} size={13} fill={INK.lime} anchor="middle" spacing={0}>
											{String(i + 1).padStart(2, '0')}
										</MonoText>
									</g>
								);
							})}
						</g>
					)}
					{order.map((i) => {
						const q = poses[i];
						const {X, Y, S} = proj(q);
						// past the lens (or off frame): gone
						if (X < -900 || X > W + 900 || Y < -900 || Y > H + 900 || q.z > 1150) return null;
						const p = SLOTS[i].p;
						// the type parts' outlines read as scribble once they rush at the lens
						if (fly > 0.25 && TEXTY.includes(p.kind)) return null;
						return (
							<g key={i} transform={transformOf(q, win.open ? extra : 1)}>
								{!win.open && <PartShape p={p} mode="body" s={st} />}
								{(win.open || !TEXTY.includes(p.kind)) && <PartShape p={p} mode="edge" s={st} edgeW={1.6 + 3 * fly} />}
							</g>
						);
					})}
					{title && t < FLY && (
						<MonoText x={48} y={1046} size={16} fill={INK.paper}>
							{title[1]}
						</MonoText>
					)}
				</svg>
			)}

			{/* the cream flash, key type on paper, breaking up into dots */}
			{fr > 0.3 && (
				<AbsoluteFill style={fr < FC * 0.5 ? dotScreen(FC, fr, false) : undefined}>
					<AbsoluteFill style={{background: INK.paper}}>
						<AbsoluteFill
							style={{
								backgroundImage: `url(${PAPER_URL})`,
								backgroundSize: '2048px 1152px',
								mixBlendMode: 'multiply',
							}}
						/>
					</AbsoluteFill>
					<FlatlineWord t={t} color={INK.key} style={inked(900, 31, 7, true)} />
					<div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: WIRE_Y - wireW / 2,
							height: wireW,
							background: INK.lime,
						}}
					/>
				</AbsoluteFill>
			)}
		</AbsoluteFill>
	);
};
