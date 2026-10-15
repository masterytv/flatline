import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {DISPLAY_FONT, PHONE_H, PHONE_W} from '../theme';
import {beatsIn, bt} from '../timing';
import {Density, PAPER_URL, useDensities} from './density';
import {INK} from './ink';
import {clamp01, easeInOut, easeOut, inked, kickNudge, lerp} from './kit';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, Press} from './Press';
import {P1_PLATES, POSTER, posterSheet, sheetCam, SheetMarks, WIRE_Y} from './s_drop';
import {MonoText, P, Part, PartShape, PartState} from './s_hand_parts';
import {bleed, Frame, K_FILL, useStage, VMap, vtrack} from './stage';

// 1:24.8 to 1:32.2 (bars 45-48): GRAFT 1, Uninstall's drop-1 hand-over printed in Proof of Life's inks.
// The phone shatters on a cream flash. Its 56 shards (the frozen kick-out screen: O27 under the Clear! crack, now
// printed in the screen world's inks, cold line and key) hang over a key-black flood, and through the phone-shaped
// gap P1 is already on the press, framed on Jess under the lantern. The 1:24 FLATLINE stays, knocked out to bare
// paper, and dissolves into the flood as a halftone where the opening faded it. TokTic's 24 parts spill out (lime:
// they are the app's own pieces), then dance a new layout every bar: an exploded diagram (46), a feed column (47),
// a ring (48). They never stop moving between beats. Every kick snaps their silhouettes open as windows onto P1,
// longer each bar; in bar 48 each kick opens onto a different part of the print. On the half-beat before 1:32 they
// fly at the lens, the windows swell into one sheet and the camera pulls back to the poster framing Progs
// (s_drop.tsx) starts from on 92.172.

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
/** Bars 46, 47, 48 and the 1:32 downbeat. */
const BAR_T = [bt(46), bt(47), bt(48), bt(49)];
const BAR_BEATS = [0, 1, 2].map((b) => beatTimes(BAR_T[b], BAR_T[b + 1]));
/** 91.940: the half-beat before 1:32, the midpoint of two grid beats (never a fixed BPM). */
const FLY = (bt(48, 4) + bt(49)) / 2;
const END = F.flatline2;
/** Every kick that snaps the windows open: bars 46-48 (in bar 45 the glass has the beats, and would cover them). */
const KICKS = beatTimes(T.end, END);
/** How long the windows stay open after each kick: a glimpse in bar 46, most of the beat by bar 48. */
const holdFor = (k: number) => (k < bt(47) ? 0.15 : k < bt(48) ? 0.21 : 0.26);
/** The fly-in: the windows shut for one frame on the cue, then swell until they are one sheet. */
const FLY_OPEN = FLY + 0.025;
const FLY_JOIN = FLY + 0.125;

// ------------------------------------------------------------------------------------------------ the sheet and the camera

const PX0 = POSTER.cx - POSTER.w / 2;
const PY0 = POSTER.cy - POSTER.h / 2;
/** P1's point (u, v) at the frame centre at scale s, clamped so the sheet still covers the frame. */
const camOn = (u: number, v: number, s: number): Cam => {
	const hw = W / 2 / s;
	const hh = H / 2 / s;
	return {
		cx: Math.min(PX0 + POSTER.w - hw, Math.max(PX0 + hw, PX0 + u * POSTER.w)),
		cy: Math.min(PY0 + POSTER.h - hh, Math.max(PY0 + hh, PY0 + v * POSTER.h)),
		s,
	};
};
/** Bars 46-47: the whole poster covering the frame, so every window shows the photo. */
const COVER: Cam = {
	cx: POSTER.cx,
	cy: POSTER.cy,
	s: Math.max(W / POSTER.w, H / POSTER.h) * 1.002,
};
/**
 * Bar 48: each kick opens onto a different part of P1 (cut while the windows are shut, so only the content changes):
 * the whole sheet, Kai's side, Dev and Sam, then in close on Jess before the pull-back.
 */
const RING_CAMS: Cam[] = [COVER, camOn(0.34, 0.66, 1.5), camOn(0.66, 0.62, 1.42), camOn(0.5, 0.6, 1.8)];

/** The glass opens a notch on each beat of bar 45 (the hang has a pulse), on top of its drag. */
const OPEN_STEPS = [bt(45, 2), bt(45, 3), bt(45, 4)];
const notches = (t: number) => OPEN_STEPS.reduce((s, b) => s + (t >= b ? outBack((t - b) / 0.16, 2.2) : 0), 0);

/** Bar 45 frames P1 ~1.4x closer than the cover, so the gap prints it on a finer screen (same ~10 px on screen). */
const HOLE_CELL = 5.6;
/**
 * 9:16: the camera is in 1.8x closer than the 16:9 frame, so P1 prints on a screen half as fine (about 9-12 px dots on
 * the phone, where the faces still read through the windows), coarsening back to the 16:9 screen as the windows join,
 * so Progs takes over the same print.
 */
const vCell = (t: number) => (t < FLY ? 0.5 : lerp(0.5, 1, easeInOut(seg(t, FLY, END))));

const camAt = (t: number): Cam => {
	// bar 45: the phone-shaped gap frames P1 top to bottom: the lantern at the top, the raised hands, Jess laughing
	// low in the gap (below the type and the spill); it steps in on each notch
	if (t < T.end) return camOn(0.5, 0.457, 1.7 + 0.07 * notches(t));
	if (t < BAR_T[2]) return COVER;
	const ring = RING_CAMS[Math.max(0, since(Math.min(t, FLY - 1e-4), BAR_BEATS[2]).i)];
	if (t < FLY) return ring;
	const to = sheetCam(t);
	const k = easeInOut(seg(t, FLY, END));
	return {
		cx: lerp(ring.cx, to.cx, k),
		cy: lerp(ring.cy, to.cy, k),
		s: ring.s * Math.pow(to.s / ring.s, k),
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

/**
 * O27 as the frozen screen shows it (DeadScreen at T.drop−0.01): cover-fitted to the 430x932 screen and pushed 1.1x
 * about its centre. Phone px (with bezel) -> image fraction.
 */
const O27_K = Math.max(PHONE_W / 1536, PHONE_H / 2752) * 1.1;
const uOf = (x: number) => 0.5 + (x - FRAME - PHONE_W / 2) / (1536 * O27_K);
const vOf = (y: number) => 0.5 + (y - FRAME - PHONE_H / 2) / (2752 * O27_K);
/** The screen world's inks: a cold line screen under key dots. */
const O27_PLATES: Plate[] = [
	{ch: 2, ink: INK.cold, angle: 75, cell: 5.2, kind: 'line', gain: 0.9, dx: 1.2, dy: -0.8},
	{ch: 0, ink: INK.key, angle: 45, cell: 6.2},
];

type Shard = {pts: [number, number][]; cx: number; cy: number; box: [number, number, number, number]};
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
			for (const pts of tris) {
				const xs = pts.map((p) => p[0]);
				const ys = pts.map((p) => p[1]);
				out.push({
					pts,
					cx: (pts[0][0] + pts[1][0] + pts[2][0]) / 3,
					cy: (pts[0][1] + pts[1][1] + pts[2][1]) / 3,
					box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
				});
			}
		}
	}
	return out;
})();
/** Where each shard sits on the 135° diagonal (0 top left, 1 bottom right): the facet catch sweeps along it. */
const DIAG = SHARDS.map((s) => (s.cx / PW + s.cy / PH) / 2);

const rrect = (x: number, y: number, w: number, h: number, r: number) =>
	`M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
/** The bezel round the screen, in key. */
const BEZEL_D = `M0,0 H${PW} V${PH} H0 Z ${rrect(FRAME, FRAME, PHONE_W, PHONE_H, 56)}`;

/** The opening's Clear! crack (ScreenScenes Crack, seed 'clear' at 262, 430), in phone px with bezel. */
const CRACK = (() => {
	const seed = 'clear';
	const x = 262 + FRAME;
	const y = 430 + FRAME;
	const lines: {d: string; w: number}[] = [];
	for (let i = 0; i < 11; i++) {
		const ang = (i / 11) * Math.PI * 2 + random(`${seed}a${i}`) * 0.5;
		let px = x;
		let py = y;
		let d = `M${px},${py}`;
		const len = 180 + random(`${seed}l${i}`) * 420;
		for (let s = 1; s <= 5; s++) {
			const a = ang + (random(`${seed}j${i}-${s}`) - 0.5) * 0.7;
			px += (Math.cos(a) * len) / 5;
			py += (Math.sin(a) * len) / 5;
			d += ` L${px.toFixed(1)},${py.toFixed(1)}`;
		}
		lines.push({d, w: i % 3 === 0 ? 2.4 : 1.3});
	}
	const rings = [30, 60, 95].map((r, i) => ({r, dash: `${0.12 + random(`${seed}r${i}`) * 0.2} 0.15`}));
	return {x, y, lines, rings};
})();

type ShardPose = {ox: number; oy: number; rot: number; sc: number; lime: number; rim: number};

/** The facet catch fades as print does: solid lime breaking into a shrinking 45° dot screen (never a tint). */
const LIME_CELL = 12;
const LIME_LEVELS = 8;
const limeLevel = (lime: number) => (lime >= 0.97 ? LIME_LEVELS + 1 : Math.ceil(lime * LIME_LEVELS - 0.4));

/**
 * Shards with drag (v·e^(-3·dt)): they slow and hang, turning, and on each notch they spread, shrink and turn a little
 * further, so the gaps onto P1 widen a step per beat. They drop away under gravity on 46.1. A facet catch is a hard
 * lime flash on a third of them, sweeping down the diagonal over two frames and gone in about five.
 */
const shardPose = (i: number, t: number): ShardPose | null => {
	const s = SHARDS[i];
	const dt = t - T.drop;
	const fall = Math.max(0, t - T.end);
	if (dt < 0 || fall > 0.55) return null;
	const drag = 1 - Math.exp(-3 * dt);
	const n = notches(t);
	const k = (0.1 + 0.22 * random(`sv${i}`)) * (1 + 0.55 * n);
	let lime = 0;
	let rim = 0;
	let jolt = 0;
	for (const b of FACETS) {
		if (random(`facet${b}-${i}`) >= 0.34) continue;
		// the top-left of the glass catches on the beat itself, the rest sweeps down over the next two frames
		const at = b + 0.066 * Math.max(0, DIAG[i] - 0.4) / 0.6;
		if (t < at) continue;
		const e = t - at;
		lime = Math.max(lime, e < 0.034 ? 1 : Math.exp(-(e - 0.034) / 0.07));
		rim = Math.max(rim, 4 * Math.exp(-e / 0.12));
		jolt += (random(`fj${b}-${i}`) - 0.5) * 18 * Math.exp(-e / 0.12);
	}
	const dx = s.cx - PW / 2;
	const dy = s.cy - PH / 2;
	return {
		ox: dx * k * drag,
		oy: dy * k * 0.7 * drag + 18 * drag + 0.5 * 9000 * fall * fall * (0.8 + 0.4 * random(`sg${i}`)),
		rot: (random(`sr${i}`) - 0.5) * 36 * drag + (random(`sn${i}`) - 0.5) * 26 * n + jolt + (random(`sr2${i}`) - 0.5) * 500 * fall,
		sc: (1 + 0.06 * random(`sz${i}`) * drag) * (1 - 0.1 * n),
		lime,
		rim,
	};
};

/** SVG transform of a shard: phone px -> screen px. */
const shardTf = (s: Shard, q: ShardPose, sx = 0, sy = 0) =>
	`translate(${(W / 2 + sx).toFixed(1)} ${(H / 2 + sy).toFixed(1)}) scale(${PS.toFixed(5)}) translate(${-PW / 2} ${-PH / 2}) translate(${(s.cx + q.ox).toFixed(2)} ${(s.cy + q.oy).toFixed(2)}) rotate(${q.rot.toFixed(2)}) scale(${q.sc.toFixed(4)}) translate(${(-s.cx).toFixed(2)} ${(-s.cy).toFixed(2)})`;

/** The shard as a press sheet: its bounding box of the frozen screen, cropped from O27's plate, clipped to the triangle. */
const shardSheet = (map: Density, i: number, q: ShardPose): Sheet => {
	const s = SHARDS[i];
	const [x0, y0, x1, y1] = s.box;
	const bw = x1 - x0;
	const bh = y1 - y0;
	const r = (q.rot * Math.PI) / 180;
	const vx = (x0 + x1) / 2 - s.cx;
	const vy = (y0 + y1) / 2 - s.cy;
	const px = s.cx + q.ox + q.sc * (Math.cos(r) * vx - Math.sin(r) * vy);
	const py = s.cy + q.oy + q.sc * (Math.sin(r) * vx + Math.cos(r) * vy);
	return {
		map,
		crop: [uOf(x0), vOf(y0), uOf(x1), vOf(y1)],
		w: bw,
		h: bh,
		cx: W / 2 + PS * (px - PW / 2),
		cy: H / 2 + PS * (py - PH / 2),
		s: PS * q.sc,
		rot: q.rot,
		plates: O27_PLATES,
		clip: s.pts.map(([x, y]) => [(x - x0) / bw, (y - y0) / bh] as [number, number]),
		seed: 30 + i,
	};
};

const SVG_BOX: React.CSSProperties = {
	position: 'absolute',
	inset: 0,
	width: '100%',
	height: '100%',
	overflow: 'visible',
};

/** The glass: paper shards with a cast shadow, printed from O27 on the press, with the bezel, the crack and the catches. */
const Glass: React.FC<{t: number; map: Density | null}> = ({t, map}) => {
	const poses = SHARDS.map((_, i) => shardPose(i, t));
	const live = SHARDS.map((_, i) => i).filter((i) => poses[i]);
	if (!live.length) return null;
	const pts = (s: Shard) => s.pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
	return (
		<>
			<svg viewBox={`0 0 ${W} ${H}`} style={SVG_BOX}>
				{/* the hanging pieces cast onto the print below (lost on the flood, which is already key) */}
				{live.map((i) => (
					<polygon key={`sh${i}`} points={pts(SHARDS[i])} transform={shardTf(SHARDS[i], poses[i]!, 9, 13)} fill={INK.key} opacity={0.42} />
				))}
				{live.map((i) => (
					<polygon key={`g${i}`} points={pts(SHARDS[i])} transform={shardTf(SHARDS[i], poses[i]!)} fill={INK.paper} />
				))}
			</svg>
			{map && <Press sheets={live.map((i) => shardSheet(map, i, poses[i]!))} />}
			<svg viewBox={`0 0 ${W} ${H}`} style={SVG_BOX}>
				<defs>
					{Array.from({length: LIME_LEVELS}, (_, k) => {
						const r = 0.5 * LIME_CELL * Math.sqrt((k + 1) / LIME_LEVELS) * 1.04;
						return (
							<pattern key={k} id={`hand-lime-${k + 1}`} patternUnits="userSpaceOnUse" width={LIME_CELL} height={LIME_CELL} patternTransform="rotate(45)">
								{[
									[0, 0],
									[LIME_CELL, 0],
									[0, LIME_CELL],
									[LIME_CELL, LIME_CELL],
									[LIME_CELL / 2, LIME_CELL / 2],
								].map(([x, y], j) => (
									<circle key={j} cx={x} cy={y} r={r} fill={INK.lime} />
								))}
							</pattern>
						);
					})}
				</defs>
				{live.map((i) => {
					const s = SHARDS[i];
					const q = poses[i]!;
					const lv = limeLevel(q.lime);
					return (
						<g key={i} transform={shardTf(s, q)}>
							<clipPath id={`hand-shard-${i}`}>
								<polygon points={pts(s)} />
							</clipPath>
							<g clipPath={`url(#hand-shard-${i})`}>
								<path d={BEZEL_D} fill={INK.key} fillRule="evenodd" />
								{CRACK.lines.map((l, k) => (
									<path key={k} d={l.d} fill="none" stroke={INK.key} strokeWidth={l.w} strokeLinejoin="round" />
								))}
								{CRACK.rings.map((r, k) => (
									<circle key={k} cx={CRACK.x} cy={CRACK.y} r={r.r} fill="none" stroke={INK.key} strokeWidth={1} pathLength={1} strokeDasharray={r.dash} />
								))}
							</g>
							<polygon points={pts(s)} fill="none" stroke={INK.key} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
							{lv > 0 && <polygon points={pts(s)} fill={lv > LIME_LEVELS ? INK.lime : `url(#hand-lime-${lv})`} />}
							{q.rim > 0.5 && <polygon points={pts(s)} fill="none" stroke={INK.lime} strokeWidth={q.rim} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
						</g>
					);
				})}
			</svg>
		</>
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

/**
 * The 9:16 exploded view, the phone's own portrait: where each part lands at full spread (screen X, Y and scale S on
 * the stage, inside the 607 px window the vertical camera fills the frame with), in SLOTS order. The status bar's
 * icons across the top, two banners, the app in the middle on the wire with the likes round it, three banners below.
 * Converted back through each part's depth, so the projection lands them exactly there.
 */
const V_FINAL: [number, number, number][] = [
	[905, 185, 0.95],
	[1040, 290, 0.9],
	[880, 830, 0.9],
	[1020, 925, 0.95],
	[920, 1012, 0.9],
	[780, 420, 1.9],
	[1150, 640, 1.6],
	[1185, 520, 1.25],
	[720, 540, 1.4],
	[1135, 385, 1.5],
	[1000, 655, 1.4],
	[905, 70, 0.85],
	[960, 545, 1.2],
	[1140, 745, 1.2],
	[760, 315, 1.1],
	[975, 455, 1.05],
	[905, 750, 0.95],
	[1195, 75, 1.4],
	[800, 635, 1],
	[1215, 860, 1],
	[725, 780, 1],
	[1130, 800, 1],
	[1060, 70, 1.3],
	[725, 70, 1.3],
];
type SlotPos = {x: number; y: number; z: number; s: number};
const V_SLOTS: SlotPos[] = V_FINAL.map(([X, Y, S], i) => {
	const z = SLOTS[i].z;
	const k = 1600 / (1600 - z);
	return {x: W / 2 + (X - W / 2) / k, y: H / 2 + (Y - H / 2) / k, z, s: S / k};
});

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
const wrap = (x: number, lo: number, n: number) => ((((x - lo) % n) + n) % n) + lo;

/**
 * Steps taken through bar b at t (0 to 3): on beats 2-4 a part of a step snaps in (outBack, 0.18 s); the rest creeps
 * on linearly across the bar, so nothing ever stands still between kicks.
 */
const CREEP = [0.4, 0.25, 0.3];
const stepsIn = (b: number, t: number) => {
	const c = CREEP[b];
	const bs = BAR_BEATS[b];
	let s = 3 * c * seg(t, BAR_T[b], BAR_T[b + 1]);
	for (let m = 1; m < bs.length; m++) if (t >= bs[m]) s += (1 - c) * outBack((t - bs[m]) / 0.18);
	return s;
};

/**
 * Where the layouts put things: the 16:9 stage's, and the 9:16 cut's re-layout (the exploded view as a portrait, the
 * feed a full-width column, the loop round the phone's own edge), since a camera alone can't hold them on the phone.
 */
type Lay = {
	vertical: boolean;
	slots: SlotPos[];
	/** the feed column's zigzag, its parts' size cap and fit, and the slot rulers either side */
	feed: {dx: number; cap: number; fit: number; rulers: [number, number]};
	/** the title block's top-left corner */
	title: [number, number];
};
const LAY_H: Lay = {vertical: false, slots: SLOTS, feed: {dx: 110, cap: 3.2, fit: 640, rulers: [505, 1415]}, title: [36, 1024]};
const LAY_V: Lay = {vertical: true, slots: V_SLOTS, feed: {dx: 28, cap: 2.5, fit: 440, rulers: [672, 1248]}, title: [690, 952]};

/** Bar 46, the exploded diagram: out from the axis a step per beat, creeping outward and turning between. */
const exploded = (L: Lay, i: number, s: number): Pose => {
	const sl = L.slots[i];
	// (9:16: the portrait is tighter, so it starts further out and spreads less)
	const k = L.vertical ? 0.85 + 0.05 * s : 0.7 + 0.1 * s;
	return {
		x: W / 2 + (sl.x - W / 2) * k,
		y: H / 2 + (sl.y - H / 2) * k,
		z: sl.z * k,
		s: sl.s * (0.7 + 0.3 * k),
		rot: (random(`rot${i}`) - 0.5) * 16 * (1.3 - k) + (random(`rd${i}`) - 0.5) * 9 * s,
		rotY: 0,
	};
};

/** Bar 47, the feed: one column scrolling up a 250 px slot per beat. Wraps only between two off-frame positions. */
const SLOT_H = 250;
const feed = (L: Lay, i: number, s: number): Pose => {
	const c = COLUMN_ORDER.indexOf(i);
	const pos = wrap(c - 3 - s, -8, N); // y from -1460 to 4540: both ends off frame, so a wrap never shows
	return {
		x: W / 2 + (c % 2 ? L.feed.dx : -L.feed.dx),
		y: H / 2 + pos * SLOT_H,
		z: (c % 3) * 80 - 80,
		s: Math.min(L.feed.cap, L.feed.fit / maxDim(SLOTS[i].p)),
		rot: (c % 2 ? 1 : -1) * 2.5,
		rotY: 0,
	};
};
/** Bar 47's ghost columns: the other feeds, paper hairlines half a slot off, scrolling slower (left) and faster (right). */
const GHOST_SLOT = 170;
const ghost = (side: -1 | 1, i: number, s: number): Pose => {
	const c = (COLUMN_ORDER.indexOf(i) * 7 + (side < 0 ? 3 : 11)) % N;
	const pos = wrap(c - 2.5 - s * (side < 0 ? 0.55 : 1.45), -6, N);
	return {
		x: W / 2 + side * 650,
		y: H / 2 + pos * GHOST_SLOT,
		z: 0,
		s: Math.min(1.9, 290 / maxDim(SLOTS[i].p)),
		rot: 0,
		rotY: 0,
	};
};

/**
 * Bar 48, the loop: a ring turning 45° per beat and creeping on between. The parts are spaced round it by their own
 * size (none overlap), and on each beat the ring itself changes: wider or taller, tilted, its top or its bottom
 * swinging toward the lens.
 */
const RING_REF = {rx: 850, ry: 380};
const RING_SHAPES = [
	{rx: 850, ry: 380, rot: 0, tz: 150},
	{rx: 800, ry: 400, rot: -8, tz: -170},
	{rx: 850, ry: 355, rot: 6, tz: 230},
	{rx: 820, ry: 395, rot: -3, tz: -140},
];
const ringFit = (p: Part) => Math.min(1.7, 170 / maxDim(p));
/**
 * Each part's share of the ellipse's parametric angle: on the top and bottom arcs a part needs its width (rx·Δθ), on
 * the sides its height (ry·Δθ), so it takes the larger of the two, plus a gap.
 */
const RING_GAP = 0.03;
const RING_NEED = COLUMN_ORDER.map((i) => {
	const p = SLOTS[i].p;
	const f = ringFit(p);
	return Math.max((p.w * f) / RING_REF.rx, (p.h * f) / RING_REF.ry);
});
/** Shrinks the parts if their shares would not go round. */
const RING_K = Math.min(1, (2 * Math.PI - N * RING_GAP) / RING_NEED.reduce((a, b) => a + b, 0));
const RING_SPAN = RING_NEED.map((n) => n * RING_K + RING_GAP);
const RING_TOTAL = RING_SPAN.reduce((a, b) => a + b, 0);
/** Each part's place round the ring (parametric angle of its centre from the top), in the feed's order. */
const RING_A = RING_SPAN.map((l, c) => ((RING_SPAN.slice(0, c).reduce((a, b) => a + b, 0) + l / 2) / RING_TOTAL) * Math.PI * 2);
const ringShape = (t: number) => {
	const {i: n, dt} = since(t, BAR_BEATS[2]);
	if (n <= 0) return RING_SHAPES[0];
	const a = RING_SHAPES[n - 1];
	const b = RING_SHAPES[n];
	const e = outBack(dt / 0.18);
	return {rx: lerp(a.rx, b.rx, e), ry: lerp(a.ry, b.ry, e), rot: lerp(a.rot, b.rot, e), tz: lerp(a.tz, b.tz, e)};
};
const ring = (i: number, s: number, t: number): Pose => {
	const c = COLUMN_ORDER.indexOf(i);
	const sh = ringShape(t);
	const th = -Math.PI / 2 + RING_A[c] + (s * Math.PI) / 4;
	const lx = Math.cos(th) * sh.rx;
	const ly = Math.sin(th) * sh.ry;
	const r = (sh.rot * Math.PI) / 180;
	return {
		x: W / 2 + lx * Math.cos(r) - ly * Math.sin(r),
		y: H / 2 + lx * Math.sin(r) + ly * Math.cos(r),
		z: Math.sin(th) * sh.tz,
		s: ringFit(SLOTS[i].p) * RING_K,
		rot: sh.rot,
		rotY: 0,
	};
};

/**
 * 9:16, bar 48: the loop runs round the phone's own edge, a rounded rectangle just inside the frame, an eighth of the
 * way round per beat (45°, as the ring turns), creeping on between. Spaced by arc length, so the long sides carry most
 * of the parts and none overlap; on each beat the loop changes shape (narrower or taller, its corners rounder or
 * squarer, tilted, its top or its bottom swinging toward the lens).
 */
type LoopShape = {hw: number; hh: number; r: number; rot: number; tz: number};
/**
 * Narrow enough that a part on the long sides (half a card, 53 px), tilted and punched on a kick, stays inside the
 * 607 px window (wider, the clock, the logo and the banners were cut by the frame's edges); centred a touch left of
 * the stage, away from the feed's buttons. Each shape's perimeter holds the parts' needs (about 2360 px).
 */
const LOOP_X = 952;
const LOOP_SHAPES: LoopShape[] = [
	{hw: 214, hh: 450, r: 150, rot: 0, tz: 60},
	{hw: 208, hh: 458, r: 180, rot: -3, tz: -70},
	{hw: 218, hh: 442, r: 110, rot: 2.5, tz: 80},
	{hw: 212, hh: 455, r: 165, rot: -1.5, tz: -55},
];
const loopFit = (p: Part) => Math.min(1.4, 105 / maxDim(p));
const LOOP_GAP = 4;
const LOOP_NEED = COLUMN_ORDER.map((i) => Math.max(SLOTS[i].p.w, SLOTS[i].p.h) * loopFit(SLOTS[i].p) + LOOP_GAP);
const LOOP_TOTAL = LOOP_NEED.reduce((a, b) => a + b, 0);
/** Each part's place round the loop: the fraction of the way round from the top centre, clockwise, in the feed's order. */
const LOOP_U = LOOP_NEED.map((l, c) => (LOOP_NEED.slice(0, c).reduce((a, b) => a + b, 0) + l / 2) / LOOP_TOTAL);
const loopShape = (t: number): LoopShape => {
	const {i: n, dt} = since(t, BAR_BEATS[2]);
	if (n <= 0) return LOOP_SHAPES[0];
	const a = LOOP_SHAPES[n - 1];
	const b = LOOP_SHAPES[n];
	const e = outBack(dt / 0.18);
	return {hw: lerp(a.hw, b.hw, e), hh: lerp(a.hh, b.hh, e), r: lerp(a.r, b.r, e), rot: lerp(a.rot, b.rot, e), tz: lerp(a.tz, b.tz, e)};
};
/** The point a fraction u of the way round a rounded rectangle, clockwise from its top centre, about its centre. */
const loopPoint = (q: LoopShape, u: number): [number, number] => {
	const a = q.hw - q.r;
	const b = q.hh - q.r;
	const arc = (Math.PI / 2) * q.r;
	const corner = (cx: number, cy: number, th0: number) => (k: number): [number, number] => [cx + q.r * Math.cos(th0 + k / q.r), cy + q.r * Math.sin(th0 + k / q.r)];
	const run: [number, (k: number) => [number, number]][] = [
		[a, (k) => [k, -q.hh]],
		[arc, corner(a, -b, -Math.PI / 2)],
		[2 * b, (k) => [q.hw, -b + k]],
		[arc, corner(a, b, 0)],
		[2 * a, (k) => [a - k, q.hh]],
		[arc, corner(-a, b, Math.PI / 2)],
		[2 * b, (k) => [-q.hw, b - k]],
		[arc, corner(-a, -b, Math.PI)],
		[a, (k) => [-a + k, -q.hh]],
	];
	let d = wrap(u, 0, 1) * (4 * a + 4 * b + 4 * arc);
	for (const [len, at] of run) {
		if (d <= len) return at(d);
		d -= len;
	}
	return [0, -q.hh];
};
const loop = (i: number, s: number, t: number): Pose => {
	const c = COLUMN_ORDER.indexOf(i);
	const q = loopShape(t);
	const [lx, ly] = loopPoint(q, LOOP_U[c] + s / 8);
	const r = (q.rot * Math.PI) / 180;
	return {
		x: LOOP_X + lx * Math.cos(r) - ly * Math.sin(r),
		y: H / 2 + lx * Math.sin(r) + ly * Math.cos(r),
		z: (ly / q.hh) * q.tz,
		s: loopFit(SLOTS[i].p),
		rot: q.rot,
		rotY: 0,
	};
};

const layout = (L: Lay, b: number, i: number, s: number, t: number) =>
	b === 0 ? exploded(L, i, s) : b === 1 ? feed(L, i, s) : L.vertical ? loop(i, s, t) : ring(i, s, t);

/** The spill (85.705 to 86.634): out of the phone through the cracks, with drag. */
const spillPose = (L: Lay, i: number, t: number): Pose => {
	const sl = L.slots[i];
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

/** Each part in its bar's layout; on each bar's downbeat it flips like a card into the new one. */
const settled = (L: Lay, i: number, t: number): Pose => {
	if (t < T.end) return spillPose(L, i, t);
	const b = t < BAR_T[1] ? 0 : t < BAR_T[2] ? 1 : 2;
	const here = layout(L, b, i, stepsIn(b, t), t);
	const dt = t - BAR_T[b];
	const prev = b === 0 ? spillPose(L, i, T.end) : layout(L, b - 1, i, 3, BAR_T[b] - 1e-4);
	const q = lerpPose(prev, here, outBack(dt / 0.18, 1.7));
	q.rotY = 180 * clamp01(dt / 0.16);
	return q;
};

/** Past the lens: the projection is more than 7x (z > 1371). */
const PAST_LENS = 1600 - 1600 / 7;

/** Where each part is at t (shared by the flood's mask and the drawing, so the windows align exactly). */
const partPose = (L: Lay, i: number, t: number): Pose => {
	if (t < FLY) return settled(L, i, t);
	// 91.940: they fly at the lens, converging on its axis; ease-out, so the cue frame itself jumps
	const k = 1 - Math.pow(1 - seg(t, FLY, FLY + 0.16), 3);
	const q = settled(L, i, FLY - 1e-4);
	return {
		x: lerp(q.x, W / 2 + (q.x - W / 2) * 0.12, k),
		y: lerp(q.y, H / 2 + (q.y - H / 2) * 0.12, k),
		z: lerp(q.z, 1500, k),
		s: q.s,
		rot: q.rot + (random(`fly${i}`) - 0.5) * 140 * k,
		rotY: 0,
	};
};

/** Window state at t: open after each kick for that bar's hold, punching in a little; shut on the fly cue, then swelling. */
const windowAt = (t: number) => {
	if (t >= FLY)
		return {
			open: t >= FLY_OPEN,
			punch: 0,
			dil: 1500 * Math.pow(seg(t, FLY_OPEN, FLY_JOIN), 1.5),
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

/** 9:16: the opening's vertical cut sets FLAT / LINE at 200 px on the 1080 px frame; the word carries on at that size. */
const V_TYPE = 200;

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
	/** 9:16: the word stacked FLAT / LINE as the opening's vertical cut set it, at this size (stage px) */
	stack?: number;
}> = ({t, color, paper, style, stack}) => {
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
					fontSize: stack ?? 300,
					letterSpacing: stack ? -stack * 0.03 : -9,
					lineHeight: stack ? 0.9 : 1,
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
				{stack ? (
					<>
						FLAT
						<br />
						LINE
					</>
				) : (
					'FLATLINE'
				)}
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ bar 47's slot rulers

/** Two rulers either side of the feed column, ticked every 50 px and numbered per slot, scrolling with it. */
const FeedRulers: React.FC<{s: number; at: [number, number]}> = ({s, at}) => {
	const off = s * SLOT_H;
	const ticks: React.ReactNode[] = [];
	for (const [x, dir] of [
		[at[0], 1],
		[at[1], -1],
	] as const) {
		ticks.push(<line key={`l${x}`} x1={x} y1={0} x2={x} y2={H} stroke={INK.paper} strokeWidth={1} opacity={0.32} />);
		// tick k sits at slot k/5 of the column (a major tick on each slot centre)
		for (let k = 0; k < 50; k++) {
			const yy = H / 2 - 3 * SLOT_H + k * 50 - off;
			if (yy < -20 || yy > H + 20) continue;
			const major = k % 5 === 0;
			ticks.push(<line key={`t${x}-${k}`} x1={x} y1={yy} x2={x + dir * (major ? 14 : 6)} y2={yy} stroke={INK.paper} strokeWidth={1} opacity={major ? 0.55 : 0.32} />);
			if (major)
				ticks.push(
					<MonoText key={`n${x}-${k}`} x={x + dir * 4} y={yy - 6} size={11} fill={INK.paper} anchor={dir > 0 ? 'start' : 'end'} opacity={0.55} spacing={0.05}>
						{`S${String(wrap(k / 5, 0, N) + 1).padStart(2, '0')}`}
					</MonoText>,
				);
		}
	}
	return <g>{ticks}</g>;
};

// ------------------------------------------------------------------------------------------------ the section

const TITLES: [number, string][] = [
	[bt(46), 'TOKTIC 4.2  ·  FIG. 1  EXPLODED VIEW  ·  24 PARTS'],
	[bt(47), 'TOKTIC 4.2  ·  FIG. 2  THE FEED  ·  1 SLOT / BEAT'],
	[bt(48), 'TOKTIC 4.2  ·  FIG. 3  THE LOOP  ·  45° / BEAT'],
];

export const HandOver: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P1', 'O27']);
	// 9:16: the re-laid-out parts, the word stacked to fit the phone, the wire at the opening's frame width
	const {vertical} = useStage();
	const cam = camAt(t);
	const L = vertical ? LAY_V : LAY_H;
	const stack = vertical ? V_TYPE / K_FILL : undefined;
	const thin = vertical ? 1 / K_FILL : 1;

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
	const flying = t >= FLY;
	const poses = SLOTS.map((_, i) => partPose(L, i, t));
	const order = SLOTS.map((_, i) => i).sort((a, b) => poses[a].z - poses[b].z);
	const win = spilled ? windowAt(t) : {open: false, punch: 0, dil: 0};
	const extra = 1 + 0.12 * win.punch;
	const phoneHole = t < T.end;
	const onP1 = phoneHole ? plates.map((p) => ({...p, cell: HOLE_CELL})) : plates;
	// the windows have swallowed the flood: from here it is one sheet
	const joined = t >= FLY_JOIN;
	const inFeed = t >= BAR_T[1] && t < BAR_T[2];
	const feedSteps = inFeed ? stepsIn(1, t) : 0;

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
	const wireW = lerp(6 * thin, 4, wk);

	const title = [...TITLES].reverse().find(([at]) => t >= at);
	// the title block: 16:9 bottom left; 9:16 bottom left, and for the loop a two-line caption centred inside it under
	// the wire (one line would be wider than the loop's inside and run into its parts)
	const inLoop = vertical && t >= BAR_T[2];
	const tb = inLoop ? {x: LOOP_X, y: 560, size: 14} : {x: L.title[0], y: L.title[1], size: 16};
	const tk = tb.size / 16;
	const titleLines = !title ? [] : inLoop ? ['TOKTIC 4.2  ·  FIG. 3', 'THE LOOP  ·  45° / BEAT'] : [title[1]];
	const leaders = t >= T.end && t < bt(47) ? 1 - seg(t, bt(46, 4), bt(47)) : 0;

	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{/* the press sheet under everything: P1 already printed, its marks just off frame until the pull-back */}
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[posterSheet(d.P1, vertical ? onP1.map((p) => ({...p, cell: p.cell * vCell(t)})) : onP1)]} />}
			<CamLayer cam={cam}>
				<SheetMarks code="K+O" />
			</CamLayer>

			{/* the key flood: the dead phone's dark as ink. Holes: the phone-shaped gap (bar 45), the parts' silhouettes on each kick */}
			{!joined && (
				<svg viewBox={`0 0 ${W} ${H}`} style={{...SVG_BOX, ...inked(1024, 0, 0, true)}}>
					<defs>
						<mask id="hand-flood" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
							<rect x={0} y={0} width={W} height={H} fill="white" />
							{phoneHole && <rect x={PHONE.x} y={PHONE.y} width={PHONE.w} height={PHONE.h} rx={PHONE.r} fill="black" />}
							{/* from the fly-in, the centre opens too, so the swelling windows never leave a star of flood there */}
							{flying && win.open && <circle cx={W / 2} cy={H / 2} r={1150 * easeOut(seg(t, FLY_OPEN, FLY_JOIN))} fill="black" />}
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

			<Glass t={t} map={d ? d.O27 : null} />

			{/* the wire */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: WIRE_Y - wireW / 2,
					height: wireW,
					background: INK.lime,
					boxShadow: wk < 1 ? `0 0 ${(24 * thin * (1 - wk)).toFixed(1)}px ${INK.lime}` : undefined,
				}}
			/>

			{/* the 1:24 FLATLINE, knocked out of the flood to bare paper, dissolving into a halftone (the spill bursts over it) */}
			{t < T.end && <FlatlineWord t={t} paper stack={stack} style={tr > 0.2 ? dotScreen(TC, tr, true) : undefined} />}

			{/* the parts, the exploded view's leaders, the feed's rulers and ghosts, and the title block */}
			{spilled && (
				<svg viewBox={`0 0 ${W} ${H}`} style={{...SVG_BOX, ...inked(1024, 211, 97, true)}}>
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
					{inFeed && (
						<g>
							<FeedRulers s={feedSteps} at={L.feed.rulers} />
							{/* the other feeds (9:16: they would sit off the phone's edges) */}
							{!vertical && (
								<g opacity={0.34}>
									{([-1, 1] as const).flatMap((side) =>
										SLOTS.map((sl, i) => {
											const q = ghost(side, i, feedSteps);
											if (q.y < -200 || q.y > H + 200) return null;
											return (
												<g key={`${side}-${i}`} transform={transformOf(q)}>
													<PartShape p={sl.p} mode="edge" s={st} edgeW={1.2} edgeInk={INK.paper} />
												</g>
											);
										}),
									)}
								</g>
							)}
						</g>
					)}
					{title && t < FLY && (
						<g>
							{/* the title block sits on its own key plate, so the feed's ghosts scroll under it (the parts pass over) */}
							{titleLines.map((line, k) => {
								const w = line.replace(/\s+/g, ' ').length * 11.6 * tk + 24 * tk;
								const x = inLoop ? tb.x - w / 2 : tb.x;
								const y = tb.y + k * 30 * tk;
								return (
									<g key={k}>
										<rect x={x} y={y} width={w} height={30 * tk} fill={INK.key} />
										<MonoText x={x + 12 * tk} y={y + 22 * tk} size={tb.size} fill={INK.paper}>
											{line}
										</MonoText>
									</g>
								);
							})}
						</g>
					)}
					{order.map((i) => {
						const q = poses[i];
						const {X, Y} = proj(q);
						// off frame, or past the lens: gone
						if (X < -900 || X > W + 900 || Y < -900 || Y > H + 900 || q.z > PAST_LENS) return null;
						const p = SLOTS[i].p;
						// flying at the lens: solid bodies, no hairlines, so the sheet opening behind them stays clean
						if (flying)
							return (
								<g key={i} transform={transformOf(q)}>
									<PartShape p={p} mode="body" s={st} />
								</g>
							);
						return (
							<g key={i} transform={transformOf(q, win.open ? extra : 1)}>
								{!win.open && <PartShape p={p} mode="body" s={st} />}
								{(win.open || !TEXTY.includes(p.kind)) && <PartShape p={p} mode="edge" s={st} />}
							</g>
						);
					})}
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
					<FlatlineWord t={t} color={INK.key} stack={stack} style={inked(900, 31, 7, true)} />
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

// ------------------------------------------------------------------------------------------------ 9:16

/** The seam with Progs (another group's section): the full-bleed frame on the stage centre. */
const SEAM: Frame = {k: K_FILL, x: 960, y: 540};
/** A frame in the dark: the key carries on past the stage's edges. */
const dark = (x: number, y: number, k: number): Frame => ({...bleed(x, y, k), bg: INK.key});
/** Full bleed on the stage centre: the phone-shaped gap, then each layout whole. */
const FULL = dark(960, 540, K_FILL);
/** A kick held by the camera: on t0 it lands 6% tight and settles back onto `f` in 0.16 s. */
const hit = (t0: number, f: Frame): [number, Frame, number?][] => [
	[t0, {...f, k: f.k * 1.06}],
	[t0 + 0.16, f, 0.16],
];

/**
 * The 9:16 camera. Bar 45 opens on the opening's last frame: the phone filling the frame, FLAT / LINE over it at the
 * same size, the wire through the gap between the lines. It stays full bleed (pulled back, the stage's edges and the
 * glass's would show), takes the first lime catch as a kick, and on the spill punches in to put the type and the parts
 * high and Jess laughing low, then back out for the second catch. The exploded view whole on its downbeat, the status
 * bar and the banners up close, the app and the banners below, whole again. The feed whole (a kick on its second
 * scroll), then in close for its last two scrolls; the loop whole on the downbeat, a kick on each beat after. On 1:32's
 * half-beat the parts fly at the lens with the camera on the seam.
 */
const HAND_V = vtrack([
	[T.drop, FULL],
	...hit(bt(45, 2), FULL),
	[SPILL, dark(960, 700, 2.1)],
	[bt(45, 4), FULL],
	[bt(46), FULL],
	[bt(46, 2), dark(960, 330, 2.4)],
	[bt(46, 3), dark(960, 760, 2.4)],
	[bt(46, 4), FULL],
	[bt(47), FULL],
	...hit(bt(47, 2), FULL),
	[bt(47, 3), dark(960, 540, 2)],
	[bt(48), FULL],
	...hit(bt(48, 2), FULL),
	...hit(bt(48, 3), FULL),
	...hit(bt(48, 4), FULL),
	[FLY, SEAM],
]);

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {HandOver: {v: HAND_V}};
