import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {beatsIn, bt, pulse} from '../timing';
import {TokTicLogo} from '../ui/TokTicLogo';
import {Density, useDensities} from './density';
import {ANTON, INK, MONO, SERIF} from './ink';
import {clamp01, CropMarks, easeOut, inked, kickNudge, lerp, stamp} from './kit';
import {Poly} from './masks';
import {Cam, CAM0, Plate, Sheet, sheetMatrix} from './press';
import {CamLayer, PaperFill, Press} from './Press';
import {VMap} from './stage';

// 2:38.2–2:52.8, drop 3 (bars 85–92), instrumental. GRAFT 3, in place of the old phone table.
// On the downbeat Maya flips her lime phone face-down; the friends stack theirs on top. The top phone of the
// stack slams to the centre as a black slab and knocks out to an EMPTY BATTERY: 0%. Then the battery charges
// with real life, not the app: every cell is a slice of the night printed in heat and key, one cell per beat
// (out of the lobby door), per half-beat (the corner shop), per quarter-beat (the middle of the road). The three
// full batteries stack, a bolt stamps on each beat, they open into a triptych and collapse into the flat Rule
// for 2:52.8 "Flatline". The phone's ink is lime; life's is orange. Nothing here is lime after the flip.

type Pt = [number, number];
type Geo = Pick<Sheet, 'w' | 'h' | 'cx' | 'cy' | 's' | 'rot' | 'crop' | 'flipX'>;

// ------------------------------------------------------------------ cues (all from the grid)

const FLIP = F.drop3; // 158.209 85.1: P29, the lime phone flips face-down
const STACK = bt(85, 2); // 158.674: P30, the friends stack theirs on top
const SLAM = F.table; // 159.126 85.3: the top phone slams to the centre as a slab
const EMPTY = bt(85, 4); // 159.591: the slab knocks out to an empty battery, 0%
const END = F.type2; // 172.815 93.1 "Flatline"

/** The grid's beats in [a, b). */
const beatTimes = (a: number, b: number) => beatsIn(a - 1e-4, b - 1e-4).map((x) => x.t);
/** Each beat in [a, b) split into n equal parts (from the grid's own beat spacing, never a fixed BPM). */
const subdivide = (a: number, b: number, n: number) => {
	const ts = beatsIn(a - 1e-4, b + 1).map((x) => x.t);
	const out: number[] = [];
	for (let i = 0; i + 1 < ts.length && ts[i] < b - 1e-4; i++) for (let k = 0; k < n; k++) out.push(ts[i] + (k * (ts[i + 1] - ts[i])) / n);
	return out;
};

const C1 = beatTimes(bt(86), bt(89)); // 160.044–165.059: 12 cells, one per beat
const C2 = subdivide(bt(89), bt(90), 2); // 165.523–167.120: 8 cells, one per half-beat
const C3 = subdivide(bt(90), bt(91), 4); // 167.346–169.056: 16 cells, one per quarter-beat
const BAR87 = bt(87);
const BAR88 = bt(88);
const STK = bt(91); // 169.169: the three batteries stack
const ZOOM0 = STK - 0.07; // the pull-out to the stack starts two frames ahead of the downbeat
const BOLTS = [bt(91, 1), bt(91, 2), bt(91, 3), bt(91, 4)]; // a bolt per beat
const TRIP = bt(92); // 170.992: casings drop, triptych
const PUSHES = [bt(92, 2), bt(92, 3), bt(92, 4)]; // each band pushes in on Maya
const COLLAPSE = END - 0.25; // 172.565: squeeze to the flat Rule

// ------------------------------------------------------------------ easing

const outBack = (x: number, s = 1.7) => {
	const k = clamp01(x) - 1;
	return 1 + (s + 1) * k * k * k + s * k * k;
};
const decay = (t: number, t0: number, tau: number) => (t < t0 ? 0 : Math.exp(-(t - t0) / tau));
const countAt = (times: number[], t: number) => times.filter((x) => x <= t).length;

// ------------------------------------------------------------------ photo data (traced on gridded copies)

/** P29: her phone, outer corners TL, TR, BR, BL (the notch end is the top; the bottom end is under her hand). */
const Q29: Pt[] = [
	[0.514, 0.24],
	[0.623, 0.291],
	[0.562, 0.7],
	[0.4375, 0.64],
];
/** P29: her hand where it lies over the phone. Exact against the screen; generous outside the phone. */
const HAND29: Poly = [
	[0.4423, 0.511],
	[0.45, 0.521],
	[0.4586, 0.543],
	[0.4603, 0.57],
	[0.4637, 0.6],
	[0.4714, 0.612],
	[0.48, 0.615],
	[0.492, 0.61],
	[0.5006, 0.601],
	[0.516, 0.5735],
	[0.5314, 0.552],
	[0.54, 0.521],
	[0.5503, 0.4814],
	[0.5606, 0.4507],
	[0.5691, 0.42],
	[0.574, 0.405],
	[0.582, 0.399],
	[0.5905, 0.408],
	[0.5914, 0.425],
	[0.5889, 0.466],
	[0.5846, 0.5],
	[0.5709, 0.5428],
	[0.5692, 0.559],
	[0.5777, 0.549],
	[0.58, 0.5367],
	[0.5829, 0.512],
	[0.5871, 0.4937],
	[0.592, 0.475],
	[0.605, 0.44],
	[0.625, 0.48],
	[0.64, 0.6],
	[0.63, 0.75],
	[0.45, 0.75],
	[0.425, 0.62],
	[0.43, 0.52],
];
/** P29: the point between the phone and her hand that the shot centres on. */
const P29_AIM = {u: 0.535, v: 0.47};
/**
 * P29: the counter patch laid over the photo's phone once it turns over (TL, TR, BR, BL). Traced on a 0.01 grid:
 * it takes in the gold frame and the shadow it throws to the right (to u 0.617 at v 0.40, 0.630 at the top corner),
 * so no second phone edge shows beside the turning one. Its bottom is under her hand.
 */
const PATCH29: Pt[] = [
	[0.506, 0.222],
	[0.641, 0.284],
	[0.58, 0.706],
	[0.432, 0.648],
];
/** P30: the top phone of the stack (Sam's freckled fingers on it): left, top, right and bottom corners. */
const Q30 = {left: [0.484, 0.533] as Pt, top: [0.52, 0.4595] as Pt, right: [0.616, 0.5885] as Pt, bottom: [0.58, 0.662] as Pt};
const P30_AIM = {u: 0.55, v: 0.561};

// ------------------------------------------------------------------ geometry

const FW = 1960;
const FH = 1094;

/** Photo point (u, v) lands at screen (sx, sy) with the sheet scaled S (the screen stays on the paper). */
const aim = (u: number, v: number, S: number, sx = 960, sy = 540): Geo => ({w: FW, h: FH, s: S, cx: sx - S * (u - 0.5) * FW, cy: sy - S * (v - 0.5) * FH});

/** Photo fraction -> screen px for a full-photo sheet seen through the fixed camera. */
const toScreen = (g: Geo, u: number, v: number): Pt => {
	const m = sheetMatrix(g, CAM0, 1920, 1080);
	const px = u * g.w;
	const py = v * g.h;
	return [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]];
};

const inflate = (q: Pt[], k: number): Pt[] => {
	const cx = q.reduce((a, p) => a + p[0], 0) / q.length;
	const cy = q.reduce((a, p) => a + p[1], 0) / q.length;
	return q.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};

/** Sutherland–Hodgman: the part of polygon `p` inside the convex polygon `clip` (both in the same units). */
const clipConvex = (p: Pt[], clip: Pt[]): Pt[] => {
	const area = clip.reduce((a, [x, y], i) => {
		const [x2, y2] = clip[(i + 1) % clip.length];
		return a + x * y2 - x2 * y;
	}, 0);
	const side = (a: Pt, b: Pt, q: Pt) => Math.sign(area) * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
	let out = p;
	for (let i = 0; i < clip.length && out.length; i++) {
		const a = clip[i];
		const b = clip[(i + 1) % clip.length];
		const inp = out;
		out = [];
		for (let j = 0; j < inp.length; j++) {
			const cur = inp[j];
			const prev = inp[(j + inp.length - 1) % inp.length];
			const ci = side(a, b, cur) >= 0;
			const pi = side(a, b, prev) >= 0;
			if (ci !== pi) {
				const sp = side(a, b, prev);
				const sc = side(a, b, cur);
				const k = sp / (sp - sc);
				out.push([prev[0] + (cur[0] - prev[0]) * k, prev[1] + (cur[1] - prev[1]) * k]);
			}
			if (ci) out.push(cur);
		}
	}
	return out;
};

/** CSS matrix3d mapping a W x H box onto a screen quad (TL, TR, BR, BL): a homography. */
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

/** World point -> screen px through a camera. */
const camPoint = (cam: Cam, x: number, y: number): Pt => {
	const r = ((cam.rot ?? 0) * Math.PI) / 180;
	const dx = (x - cam.cx) * cam.s;
	const dy = (y - cam.cy) * cam.s;
	return [960 + dx * Math.cos(r) - dy * Math.sin(r), 540 + dx * Math.sin(r) + dy * Math.cos(r)];
};

// ------------------------------------------------------------------ plates

const HEAT = (cell: number, o: Partial<Plate> = {}): Plate => ({ch: 1, ink: INK.heat, angle: 15, cell, ...o});
const KEY = (cell: number, o: Partial<Plate> = {}): Plate => ({ch: 0, ink: INK.key, angle: 45, cell, ...o});

/** A warm print, its orange nudged on every kick. `fresh` (1 -> 0) floods it with new ink. */
const warm = (t: number, cell: number, seed: number, fresh = 0, o: Partial<Plate> = {}, ko: Partial<Plate> = {}): Plate[] => {
	const [kx, ky] = kickNudge(t, seed, 2.2);
	return [HEAT(cell, {dx: kx, dy: ky, gain: 1 + 1.7 * fresh, lift: -0.42 * fresh, ...o}), KEY(cell, {gain: 1 + 0.25 * fresh, ...ko})];
};

// ------------------------------------------------------------------ small ink pieces

/** DOM placed by an anchor point: (ax, ay) is the fraction of its own box that sits on (x, y). */
const Anchor: React.FC<{x: number; y: number; ax?: number; ay?: number; s?: number; rot?: number; overprint?: boolean; children: React.ReactNode}> = ({
	x,
	y,
	ax = 0,
	ay = 0,
	s = 1,
	rot = 0,
	overprint = false,
	children,
}) => (
	// (overprint: the whole anchor multiplies onto what is below it; inside its transforms the ink's own multiply cannot)
	<div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, mixBlendMode: overprint ? 'multiply' : undefined}}>
		<div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${-ax * 100}%, ${-ay * 100}%)`}}>
			<div style={{transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: `${ax * 100}% ${ay * 100}%`, whiteSpace: 'nowrap'}}>{children}</div>
		</div>
	</div>
);

const BOLT_D = 'M37 0 L3 57 L27 57 L17 100 L57 37 L33 37 L45 0 Z';
const Bolt: React.FC<{h: number; color?: string; seed?: number}> = ({h, color = INK.heat, seed = 0}) => (
	<svg width={h * 0.6} height={h} viewBox="0 0 60 100" style={{display: 'block', overflow: 'visible', mixBlendMode: 'multiply', ...inked(700, 13 * seed, 7 * seed, true)}}>
		<path d={BOLT_D} fill={color} />
	</svg>
);

/** The charge readout: wood-type figures, the % smaller. */
const Pct: React.FC<{v: number; size: number; color?: string; seed?: number}> = ({v, size, color = INK.heat, seed = 0}) => (
	<div style={{fontFamily: ANTON, fontSize: size, lineHeight: 0.86, color, letterSpacing: size * 0.01, mixBlendMode: 'multiply', ...inked(900, 31 * seed, 17 * seed, true)}}>
		{v}
		<span style={{fontSize: size * 0.56, marginLeft: size * 0.03}}>%</span>
	</div>
);

// ------------------------------------------------------------------ the flip (P29) and the stack (P30)

/** P29's framing: centred on the phone and her hand, punched in on the drop and pushing through the beat. */
const g29 = (t: number) => {
	const S = 1.52 * (1 + 0.09 * decay(t, FLIP, 0.09)) * (1 + 0.05 * easeOut((t - FLIP) / 0.46)) * (1 + 0.025 * decay(t, FLIP + 0.23, 0.07));
	const sh = 9 * decay(t, FLIP + 0.23, 0.05);
	return aim(P29_AIM.u, P29_AIM.v, S, 960 + sh, 560 - sh * 0.6);
};
/** The flip: lime for two frames, then over on its long axis in 0.17 s, landing as the black back. */
const FLIP_AT = FLIP + 2 / 30;
const FLIP_DUR = 0.17;

/**
 * Her hand only where it lies over the phone and the patch (in image fractions; clipped in image px so the cut is true).
 * The clip takes the outer of PATCH29 (x1.03) and the phone (x1.14) at each corner, so neither the patch nor the
 * landing phone (slapped to 1.035) can show past her hand at the bottom end.
 */
const HAND29_CLIP: Pt[] = [
	[0.504, 0.206],
	[0.645, 0.27],
	[0.584, 0.735],
	[0.422, 0.665],
];
const HAND29_ON_PHONE: Poly = (() => {
	const px = (q: Pt[]) => q.map(([u, v]) => [u * 2752, v * 1536] as Pt);
	return clipConvex(px(HAND29), px(HAND29_CLIP)).map(([x, y]) => [x / 2752, y / 1536] as [number, number]);
})();
const PhoneFace: React.FC<{t: number; W: number; H: number}> = ({t, W, H}) => (
	<div style={{position: 'absolute', inset: 0, borderRadius: W * 0.13, background: INK.key}}>
		<div style={{position: 'absolute', left: W * 0.045, right: W * 0.045, top: W * 0.045, bottom: W * 0.045, borderRadius: W * 0.1, background: INK.lime, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: W * 0.3, top: 0, width: W * 0.4, height: W * 0.075, borderRadius: `0 0 ${W * 0.05}px ${W * 0.05}px`, background: INK.key}} />
			<div style={{position: 'absolute', left: W * 0.09, top: H * 0.085}}>
				<TokTicLogo size={W * 0.12} t={t} color={INK.key} />
			</div>
			<div style={{position: 'absolute', left: W * 0.07, top: H * 0.15, fontFamily: MONO, fontWeight: 500, fontSize: W * 0.31, letterSpacing: -W * 0.016, lineHeight: 1, color: INK.key}}>100%</div>
			<div style={{position: 'absolute', left: W * 0.09, top: H * 0.31, fontFamily: MONO, fontSize: W * 0.06, color: INK.key, letterSpacing: '0.04em'}}>stay connected</div>
		</div>
	</div>
);

const PhoneBack: React.FC<{W: number; H: number}> = ({W, H}) => (
	<div style={{position: 'absolute', inset: 0, borderRadius: W * 0.13, background: INK.key, ...inked(900, 17, 5, true)}}>
		<div style={{position: 'absolute', left: W * 0.08, top: W * 0.08, width: W * 0.36, height: W * 0.36, borderRadius: W * 0.09, border: `${W * 0.012}px solid rgba(239,231,214,0.55)`}} />
		<div style={{position: 'absolute', left: W * 0.12, top: W * 0.12, width: W * 0.12, height: W * 0.12, borderRadius: '50%', border: `${W * 0.012}px solid rgba(239,231,214,0.45)`}} />
		<div style={{position: 'absolute', left: W * 0.12, top: W * 0.27, width: W * 0.12, height: W * 0.12, borderRadius: '50%', border: `${W * 0.012}px solid rgba(239,231,214,0.45)`}} />
	</div>
);

const FlipShot: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const g = g29(t);
	const k = clamp01((t - FLIP_AT) / FLIP_DUR);
	const plates = warm(t, 5.6, 29, 0, {}, {gamma: 1.1});
	const W = 400;
	const H = 860;
	const quad = inflate(
		Q29.map(([u, v]) => toScreen(g, u, v)),
		1.035,
	);
	const c = Math.cos(Math.PI * k);
	const land = slapK(t, FLIP_AT + FLIP_DUR);
	const sheets: Sheet[] = [{map: d.P29, ...g, plates, seed: 29}];
	// once it lifts, the counter shows where the phone was (the same print, from a clear patch of wood to the left),
	// the photo's gold frame and its shadow included, so only the turning phone is on the counter
	// (the wood is lit by the screen on the left and darker to the right of the phone, so the patch's orange is ramped
	// along it: measured on the plate, 0.21 against 0.35 at its left edge and 0.42 against 0.24 at its right)
	if (k > 0) {
		const [hp, kp] = plates;
		const ramp = (u: number) => lerp(0.6, 1.9, clamp01((u - 0.285) / 0.15));
		sheets.push({map: d.P29, ...g, crop: [-0.205, 0, 0.795, 1], clip: PATCH29, ground: '#ffffff', plates: [{...hp, mask: ramp}, kp], seed: 29});
	}
	// her fingers' shadow on what is under them (the light comes from the top left, as in the photo)
	const patch = PATCH29.map(([u, v]) => toScreen(g, u, v));
	const shade = k > 0 ? 0.34 * clamp01(k * 3) : 0;
	const off = 9 * ((g.s ?? 1.52) / 1.52);
	const cast = HAND29_ON_PHONE.map(([u, v]): Pt => {
		const [x, y] = toScreen(g, u, v);
		return [x + off, y + off * 0.55];
	});
	const shadow = shade > 0 ? clipConvex(cast, patch) : [];
	return (
		<AbsoluteFill>
			<PaperFill />
			<Press sheets={sheets} />
			<div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: quadMatrix(W, H, quad)}}>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						transform: `scale(${Math.abs(c) * (k >= 1 ? land : 1)}, ${k >= 1 ? land : 1})`,
						transformOrigin: '50% 50%',
					}}
				>
					{/* its own shadow on the counter, to the right like the photo's (the patch took the photo's away); only
					    along the free end of the phone, since the other end is under her hand */}
					{k > 0 && (
						<div
							style={{
								position: 'absolute',
								left: W * 0.05,
								top: W * 0.015,
								width: W,
								height: H * 0.5,
								borderRadius: W * 0.13,
								background: `rgba(27,26,23,${(0.45 * clamp01(k * 2)).toFixed(3)})`,
								filter: `blur(${W * 0.02}px)`,
							}}
						/>
					)}
					{k < 0.5 ? <PhoneFace t={t} W={W} H={H} /> : <PhoneBack W={W} H={H} />}
				</div>
			</div>
			{shadow.length > 2 && (
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply'}}>
					<polygon points={shadow.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill={`rgba(27,26,23,${shade.toFixed(3)})`} style={{filter: 'blur(3px)'}} />
				</svg>
			)}
			{/* her hand stays on top of the phone */}
			<Press blend={false} sheets={[{map: d.P29, ...g, plates, seed: 29, clip: HAND29_ON_PHONE, ground: INK.paper, speckle: 0}]} />
		</AbsoluteFill>
	);
};

/** 1.06 -> 1 over 4 frames: something landing. */
const slapK = (t: number, t0: number) => (t < t0 ? 1 : 1 + 0.035 * (1 - easeOut((t - t0) / (4 / 30))));

/** P30's framing: slapped in on 85.2, pushing in on the stack; from 85.3 the page drops back under the slab. */
const S30 = (t: number) => 1.4 * (1 + 0.07 * decay(t, STACK, 0.07)) * (1 + 0.09 * easeOut((Math.min(t, SLAM) - STACK) / 0.45));
const g30 = (t: number) => {
	const back = t < SLAM ? 1 : 1 - 0.12 * easeOut((t - SLAM) / 0.3);
	return aim(P30_AIM.u, P30_AIM.v, S30(t) * back);
};

const StackPage: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const g = g30(t);
	const ghost = t < SLAM ? 0 : easeOut((t - SLAM) / 0.12);
	// the key opened up so the hands keep their modelling and only the phones print solid
	const plates = warm(t, 6, 30, 0, {gain: 1 - 0.5 * ghost}, {gain: 1.05 - 0.6 * ghost, gamma: 1.6});
	return <Press sheets={[{map: d.P30, ...g, plates, seed: 30}]} />;
};

export const FlipStack: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P29', 'P30']);
	if (!d) return <PaperFill />;
	if (t < STACK) return <FlipShot t={t} d={d} />;
	return (
		<AbsoluteFill>
			<PaperFill />
			<StackPage t={t} d={d} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ the batteries

const BW = 1500;
const BH = 600;
const STROKE = 22;
const PAD = 32;
const IW = BW - 2 * PAD; // 1436
const IH = BH - 2 * PAD; // 536
const RAD = 74;

type Bat = {
	id: 'P31' | 'P32' | 'P33';
	times: number[];
	gap: number;
	band: [number, number, number, number]; // image fractions seen through the cells (aspect IW:IH)
	y: number; // world y of its centre in the stack (x is 960)
	stackRot: number;
	slug: string;
	tri: number; // v centre of its triptych band
	push: Pt; // where its triptych band pushes in (on Maya)
};
// Bands traced on the gridded copies: each starts at the first raised arm and keeps every head in the middle third.
// Push points: Maya in P31 (0.513, 0.41) and P32 (0.518, 0.43). In P33 Maya (0.76, 0.36) is the last of the five, with
// railings and steps to her right, so its band aims between Sam (0.64) and her: the crop at z 1.75 runs u 0.44 to 0.93,
// Sam and Maya fill it and Maya sits right of centre.
const BATS: Bat[] = [
	{id: 'P31', times: C1, gap: 14, band: [0.13, 0.19, 0.99, 0.765], y: -110, stackRot: -1.3, slug: 'OUT THE DOOR · 02:41 AM', tri: 0.4, push: [0.513, 0.41]},
	{id: 'P32', times: C2, gap: 14, band: [0.07, 0.13, 0.95, 0.718], y: 530, stackRot: 0.9, slug: 'THE CORNER SHOP · 02:44 AM', tri: 0.43, push: [0.518, 0.43]},
	{id: 'P33', times: C3, gap: 9, band: [0.11, 0.21, 0.97, 0.785], y: 1170, stackRot: -0.7, slug: 'MIDDLE OF THE ROAD · 02:47 AM', tri: 0.4, push: [0.685, 0.36]},
];

type Cell = {x: number; y: number; w: number; h: number; i: number};
/** Cells in battery-local px (centre origin, unrotated). */
const cellsOf = (b: Bat): Cell[] => {
	const n = b.times.length;
	const cw = (IW - (n - 1) * b.gap) / n;
	return Array.from({length: n}, (_, i) => ({x: -IW / 2 + i * (cw + b.gap), y: -IH / 2, w: cw, h: IH, i}));
};
const pctOf = (b: Bat, t: number) => Math.round((countAt(b.times, t) / b.times.length) * 100);
/** Battery-local x of the charge front after m cells. */
const frontX = (b: Bat, m: number) => {
	const cw = (IW - (b.times.length - 1) * b.gap) / b.times.length;
	return m <= 0 ? -IW / 2 : -IW / 2 + m * (cw + b.gap) - b.gap;
};
/** The front, sliding to each new cell as it lands (a little past, then back). */
const frontAt = (b: Bat, t: number, dur = 0.12) => {
	const n = countAt(b.times, t);
	if (n <= 0) return frontX(b, 0);
	return lerp(frontX(b, n - 1), frontX(b, n), outBack((t - b.times[n - 1]) / dur, 1.3));
};

/**
 * Where battery i sits in the world at t: alone in its own shot; in the stack, 2 and 1 fall onto 3 while the camera
 * pulls out (they start falling out of shot), 2 landing a frame before the 91.1 downbeat and 1 on it (thunk, thunk),
 * so the downbeat frame is the whole stack, still shaking.
 */
const LAND = [STK, STK - 1 / 30, STK];
const FALL0 = STK - 0.2;
const DROP = 760; // world px they fall
const place = (i: number, t: number): {x: number; y: number; rot: number} => {
	const b = BATS[i];
	if (t < ZOOM0) return {x: 960, y: b.y, rot: 0};
	const rk = easeOut((t - STK) / 0.2);
	const k = i < 2 ? clamp01((t - FALL0) / (LAND[i] - FALL0)) : 1;
	return {x: 960, y: b.y - DROP * (1 - k * k), rot: b.stackRot * rk};
};

/** Battery-local x of the readout's right edge: it rides the charge front, kept on the battery. */
const readoutX = (b: Bat, t: number) => Math.max(-BW / 2 + 400, Math.min(BW / 2 + 60, frontAt(b, t) + 24));
/** From a battery's centre up to the top of its readout at the stamp peak (bolt pulse included; measured on renders). */
const RTOP = 550;
/** The readout's width at the stamp peak (bolt, figures, %), world px: measured on renders, 385 for '8%'. */
const readoutW = (b: Bat, t: number) => 270 + 115 * String(pctOf(b, t)).length;
const SAFE = 54; // title-safe at the top of frame, screen px
const SIDE = 50; // and at the sides
/**
 * Moves the shot only as far as needed for the readout to clear the top of frame by SAFE and the sides by SIDE
 * (stamp peak and tilt included): down first, then across.
 */
const fitReadout = (c: Cam, b: Bat, t: number): Cam => {
	const rx = 960 + readoutX(b, t);
	const [l, r] = [camPoint(c, rx - readoutW(b, t), b.y - RTOP), camPoint(c, rx, b.y - RTOP)];
	const k = c.s * Math.cos(((c.rot ?? 0) * Math.PI) / 180);
	const top = Math.min(l[1], r[1]);
	const dx = l[0] < SIDE ? SIDE - l[0] : r[0] > 1920 - SIDE ? 1920 - SIDE - r[0] : 0;
	return {...c, cx: c.cx - dx / k, cy: top < SAFE ? c.cy - (SAFE - top) / k : c.cy};
};
/** 0, 1, 2, 3: which beat of the bar starting at `bar` t is in. */
const beatOf = (bar: number, t: number) => Math.max(0, beatTimes(bar, bar + 2.5).filter((x) => x <= t).length - 1);

/** 91.1 to 91.3: up the stack, one battery per beat as its bolt and 100% stamp (a hard cut each); 91.4 the whole stack. */
const STACK_SHOTS: Cam[] = [
	{cx: 1088, cy: BATS[2].y - 130, s: 0.74, rot: 3}, // the bottom battery, the middle one landing on it at the top of frame
	{cx: 1088, cy: BATS[1].y, s: 0.74, rot: -3},
	{cx: 1088, cy: BATS[0].y + 110, s: 0.74, rot: 2.5},
	{cx: 1000, cy: BATS[1].y, s: 0.5, rot: 0},
];

/** The battery shots' camera (world space), before the per-kick push and the landing shakes. */
const baseCam = (t: number): Cam => {
	const [b1, b2, b3] = BATS;
	if (t < C1[0]) return {cx: 990, cy: b1.y, s: 0.92}; // 85.4: the empty battery, 'real life' at 0%
	if (t < BAR87) {
		// 86.1 tight on the left end (its edge held at x 110), a step closer on every beat with the tilt flipping
		const i = beatOf(bt(86), t);
		const s = [1.28, 1.36, 1.44, 1.52][i];
		return fitReadout({cx: 210 + 850 / s, cy: b1.y - 150, s, rot: [0, -1.5, 1.5, -1.5][i]}, b1, t);
	}
	if (t < BAR88) {
		// 87.1 wide with 'real life' and the slug, the tilt flipping and the scale stepping on every beat (a wide shot is
		// at most about 0.97: the readout above and 'real life' below take 1010 world px)
		const i = beatOf(BAR87, t);
		const fx = frontAt(b1, t, 0.14);
		return fitReadout({cx: 975 + 0.1 * fx, cy: b1.y - 20, s: [0.93, 0.97, 0.93, 0.97][i], rot: [-3, 2.5, -2.5, 3][i]}, b1, t);
	}
	if (t < C1[11]) {
		// 88.1 tight on the faces at the charge front, the readout riding above it
		const i = beatOf(BAR88, t);
		const fx = frontAt(b1, t, 0.16);
		return fitReadout({cx: 960 + Math.max(-330, Math.min(330, fx - 120)), cy: b1.y - 250, s: 1.6, rot: [1.5, -1.5, 1.5][i]}, b1, t);
	}
	if (t < C2[0]) return fitReadout({cx: 975, cy: b1.y - 40, s: 0.93, rot: 3}, b1, t); // 88.4 out wide on the 100%: CHARGED
	if (t < C3[0]) {
		// battery 2: a fast pan along the faces as it charges twice as fast; out wide on the last half-beat
		const k = clamp01((t - C2[0]) / (C2[7] - C2[0]));
		const out = outBack((t - C2[7]) / 0.17, 1.4);
		// (the faces sit at the battery's mid-height: the shot centres a little above them so the readout fits on top)
		return fitReadout({cx: 960 + lerp(lerp(-300, 320, k), 25, out), cy: b2.y + lerp(-190, -40, out), s: lerp(1.35, 0.93, out), rot: lerp(2.5, 0, out)}, b2, t);
	}
	if (t < ZOOM0) {
		// battery 3: a step closer on every beat of the bar, the tilt flipping ('real life' is either all in or all out)
		const i = beatOf(bt(90), t);
		return fitReadout({cx: 960 + [10, -20, 90, 200][i], cy: b3.y + [-17, -17, -128, -150][i], s: [0.94, 1.21, 1.31, 1.42][i], rot: [3, -2, 2, -3][i]}, b3, t);
	}
	// 91.1: out to the bottom battery as the other two drop onto it (outBack, leaving two frames early so the downbeat
	// frame already has them landing); then a hard cut up the stack on each bolt, punched in, and out to it all on 91.4
	const k = countAt(BOLTS, t) - 1;
	if (k >= 1) {
		const c = STACK_SHOTS[k];
		const punch = 1 + (k < 3 ? 0.07 : 0.05) * decay(t, BOLTS[k], 0.1); // (91.4's is smaller: the stack fills the height)
		return {...c, s: c.s * punch, rot: (c.rot ?? 0) * (1 + 0.5 * decay(t, BOLTS[k], 0.08))};
	}
	const from = baseCam(ZOOM0 - 1e-3);
	const to = STACK_SHOTS[0];
	const e = outBack((t - ZOOM0) / 0.15, 1.2);
	// scale interpolated in log space, so the pull-out reads as one even move
	const s = Math.exp(lerp(Math.log(from.s), Math.log(to.s), e));
	return {cx: lerp(from.cx, to.cx, e), cy: lerp(from.cy, to.cy, e), s, rot: lerp(from.rot ?? 0, to.rot ?? 0, e)};
};

const camAt = (t: number): Cam => {
	const c = baseCam(t);
	const kick = 1 + 0.018 * pulse(t, 0.09);
	// landing shakes: batteries 2 and 1 dropping onto the stack
	let sh = 0;
	for (const t0 of [LAND[1], LAND[0]]) if (t >= t0) sh += 14 * decay(t, t0, 0.05);
	return {...c, cx: c.cx + sh * 0.7, cy: c.cy - sh, s: c.s * kick};
};

/** One battery's lit cells as sheets: each a slice of its photo, the newest stamped in with fresh ink. */
const cellSheets = (b: Bat, i: number, d: Record<string, Density>, t: number, cell: number): Sheet[] => {
	const n = countAt(b.times, t);
	const p = place(i, t);
	const r = (p.rot * Math.PI) / 180;
	const [u0, v0, u1, v1] = b.band;
	const out: Sheet[] = [];
	// (one per beat: the flood clears by the second frame, so even the first cell is a picture, not an orange bar)
	const tau = b.times.length > 12 ? 0.045 : b.times.length > 8 ? 0.06 : 0.05;
	for (const c of cellsOf(b)) {
		if (c.i >= n) break;
		const at = b.times[c.i];
		const fresh = c.i === n - 1 ? decay(t, at, tau) : 0;
		const lx = c.x + c.w / 2;
		const fu0 = (c.x + IW / 2) / IW;
		const fu1 = (c.x + c.w + IW / 2) / IW;
		out.push({
			map: d[b.id],
			crop: [u0 + fu0 * (u1 - u0), v0, u0 + fu1 * (u1 - u0), v1],
			w: c.w,
			h: c.h,
			cx: p.x + lx * Math.cos(r),
			cy: p.y + lx * Math.sin(r),
			rot: p.rot,
			s: c.i === n - 1 ? stamp(t, at).s : 1,
			plates: warm(t, cell, 31 + i * 7 + c.i, fresh),
			seed: 40 + i * 20 + c.i,
		});
	}
	return out;
};

/** Casing, nub and the empty cells' hairlines, in battery-local px; children are drawn on the battery. */
const Casing: React.FC<{b: Bat; i: number; t: number; knock?: number; children?: React.ReactNode; dy?: number; drot?: number}> = ({b, i, t, knock = 1, children, dy = 0, drot = 0}) => {
	const p = place(i, t);
	const n = countAt(b.times, t);
	const border = lerp(BH / 2, STROKE, knock);
	return (
		<div style={{position: 'absolute', left: p.x - BW / 2, top: p.y - BH / 2 + dy, width: BW, height: BH, transform: `rotate(${p.rot + drot}deg)`, transformOrigin: '50% 50%'}}>
			{knock >= 1 &&
				cellsOf(b)
					.filter((c) => c.i >= n)
					.map((c) => {
						// the next cell flickers heat on the off-beat, like a charging icon (one-per-beat battery only)
						const half = c.i !== n || b.times.length !== 12 || n >= 12 ? Infinity : n === 0 ? (EMPTY + b.times[0]) / 2 : (b.times[n - 1] + b.times[n]) / 2;
						const glow = t >= half ? decay(t, half, 0.12) : 0;
						const border = glow > 0.02 ? `${1.6 + 2.4 * glow}px solid rgba(255,95,31,${(0.35 + 0.65 * glow).toFixed(3)})` : '1.6px solid rgba(27,26,23,0.3)';
						return <div key={c.i} style={{position: 'absolute', left: c.x + BW / 2, top: c.y + BH / 2, width: c.w, height: c.h, border, borderRadius: 6, boxSizing: 'border-box'}} />;
					})}
			<div style={{position: 'absolute', inset: 0, border: `${border}px solid ${INK.key}`, borderRadius: RAD, boxSizing: 'border-box', mixBlendMode: 'multiply', ...inked(1100, 7 * i, 3 * i, true)}} />
			<div style={{position: 'absolute', left: BW + 12, top: BH * 0.31, width: 52, height: BH * 0.38, borderRadius: '0 22px 22px 0', background: INK.key, mixBlendMode: 'multiply', opacity: knock >= 1 ? 1 : 0, ...inked(600, 5, 9, true)}} />
			{children}
		</div>
	);
};

/** Battery-local px -> the div that Casing draws (its top-left is (-BW/2, -BH/2)). */
const L = (x: number, y: number) => ({x: x + BW / 2, y: y + BH / 2});

const READ = 200; // readout size

/**
 * The writing on a battery in its own shot: the readout (a heat bolt and the %) riding the charge front, the brand
 * 'real life' under it in her voice, the slug. The readout and the bolt are heat: what charges it is life.
 */
const Dress: React.FC<{b: Bat; t: number; from: number}> = ({b, t, from}) => {
	const n = countAt(b.times, t);
	const pct = pctOf(b, t);
	const last = n > 0 ? b.times[n - 1] : from;
	const st = stamp(t, last);
	const brand = stamp(t, from);
	const rx = readoutX(b, t);
	const bolt = 1 + 0.14 * pulse(t, 0.08);
	return (
		<>
			{n > 0 && (
				<Anchor {...L(rx, -BH / 2 - 22)} ax={1} ay={1} s={st.s}>
					<div style={{display: 'flex', alignItems: 'flex-end', gap: READ * 0.06}}>
						<div style={{transform: `scale(${bolt})`, transformOrigin: '50% 100%', marginBottom: READ * 0.02}}>
							<Bolt h={READ * 0.84} seed={n} />
						</div>
						<Pct v={pct} size={READ} seed={n} />
					</div>
				</Anchor>
			)}
			<Anchor {...L(-BW / 2 + 4, BH / 2 + 26)} ax={0} ay={0} s={brand.s}>
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 150, lineHeight: 0.95, color: INK.key, mixBlendMode: 'multiply', ...inked(900, 3, 11)}}>real life</div>
			</Anchor>
			<Anchor {...L(BW / 2 + 64, BH / 2 + 40)} ax={1} ay={0}>
				<div style={{fontFamily: MONO, fontSize: 25, lineHeight: 1.6, letterSpacing: '0.14em', color: INK.key, mixBlendMode: 'multiply', textAlign: 'right'}}>
					{b.slug}
					<br />
					{`CELL ${String(n).padStart(2, '0')}/${b.times.length} · ${n >= b.times.length ? 'CHARGED' : 'CHARGING'}`}
				</div>
			</Anchor>
			<div style={{position: 'absolute', left: 0, top: 0}}>
				<CropMarks x={-6} y={-6} w={BW + 76} h={BH + 12} len={30} gap={16} color="rgba(27,26,23,0.7)" />
			</div>
		</>
	);
};

/** 85.3: the top phone of the stack slams to the centre as a black slab (the page drops back under it). */
const Slam: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const g = g30(SLAM);
	const [lx, ly] = toScreen(g, ...Q30.left);
	const [tx, ty] = toScreen(g, ...Q30.top);
	const [rx, ry] = toScreen(g, ...Q30.right);
	const [bx, by] = toScreen(g, ...Q30.bottom);
	const c0: Pt = [(lx + tx + rx + bx) / 4, (ly + ty + ry + by) / 4];
	const long0 = Math.hypot(rx - tx, ry - ty);
	const short0 = Math.hypot(tx - lx, ty - ly);
	const ang0 = (Math.atan2(ry - ty, rx - tx) * 180) / Math.PI;
	const cam = baseCam(EMPTY);
	const c1 = camPoint(cam, 960, BATS[0].y);
	const e = outBack((t - SLAM) / 0.24, 1.3);
	const cx = lerp(c0[0], c1[0], e);
	const cy = lerp(c0[1], c1[1], e);
	const w = lerp(long0, BW * cam.s, e);
	const h = lerp(short0, BH * cam.s, e);
	const rot = lerp(ang0, 0, e);
	const land = SLAM + 0.24;
	const sh = t >= land ? 12 * decay(t, land, 0.05) : 0;
	return (
		<AbsoluteFill>
			<PaperFill />
			<StackPage t={t} d={d} />
			<div
				style={{
					position: 'absolute',
					left: cx - w / 2 + sh,
					top: cy - h / 2 - sh * 0.5,
					width: w,
					height: h,
					transform: `rotate(${rot}deg)`,
					borderRadius: lerp(short0 * 0.16, RAD * cam.s, e),
					background: INK.key,
					boxShadow: `0 ${lerp(30, 4, e)}px ${lerp(60, 8, e)}px rgba(40,25,10,${lerp(0.35, 0.18, e)})`,
					...inked(1100, 0, 0, true),
				}}
			>
				{/* the camera bump: it is the back of her phone */}
				<div style={{position: 'absolute', left: h * 0.08, top: h * 0.08, width: h * 0.34, height: h * 0.34, borderRadius: h * 0.08, border: `${Math.max(2, h * 0.012)}px solid rgba(239,231,214,0.5)`}} />
			</div>
		</AbsoluteFill>
	);
};

/** 85.4 to 92.1: the batteries. */
const Batteries: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const cam = camAt(t);
	const shown = t < C2[0] ? [0] : t < C3[0] ? [1] : t < ZOOM0 ? [2] : [0, 1, 2];
	// the screen coarsens only on the hard cut out to the whole stack (91.4), never during a move
	const cell = t >= BOLTS[3] ? 12 : 6.5;
	const sheets = shown.flatMap((i) => cellSheets(BATS[i], i, d, t, cell));
	const knock = easeOut((t - EMPTY) / 0.1);
	const stacked = t >= ZOOM0;
	return (
		<AbsoluteFill>
			<PaperFill />
			<Press sheets={sheets} cam={cam} />
			<CamLayer cam={cam}>
				{shown.map((i) => {
					const b = BATS[i];
					// battery 1 is branded 'real life' from 85.4, at 0%: the opposite of the phone's 100%
					const from = i === 0 ? EMPTY : b.times[0];
					return (
						<Casing key={i} b={b} i={i} t={t} knock={i === 0 ? knock : 1}>
							{i === 0 && t < C1[0] && (
								<Anchor {...L(0, 14)} ax={0.5} ay={0.5} s={stamp(t, EMPTY).s}>
									<Pct v={0} size={400} color={INK.key} />
								</Anchor>
							)}
							{!stacked && <Dress b={b} t={t} from={from} />}
							{stacked && <StackDress i={i} t={t} />}
						</Casing>
					);
				})}
			</CamLayer>
			{t >= BOLTS[3] && <BigBolt t={t} />}
		</AbsoluteFill>
	);
};

/** In the stack: a bolt stamps on each beat, climbing from the bottom battery to the top. */
const StackDress: React.FC<{i: number; t: number}> = ({i, t}) => {
	const at = BOLTS[2 - i];
	if (t < at) return null;
	const st = stamp(t, at);
	return (
		<>
			<Anchor {...L(-BW / 2 - 40, 0)} ax={1} ay={0.5} s={st.s * (1 + 0.1 * pulse(t, 0.08))}>
				<Bolt h={360} seed={i + 2} />
			</Anchor>
			<Anchor {...L(BW / 2 + 100, 8)} ax={0} ay={0.5} s={st.s}>
				<Pct v={100} size={220} seed={i + 5} />
			</Anchor>
		</>
	);
};

/** 91.4: one bolt overprinted across the whole stack. */
const BigBolt: React.FC<{t: number; fall?: number}> = ({t, fall = 0}) => {
	const st = stamp(t, BOLTS[3]);
	return (
		<Anchor x={960} y={548 + fall} ax={0.5} ay={0.5} s={st.s} rot={-9 + fall * 0.02} overprint>
			<Bolt h={1040} seed={9} />
		</Anchor>
	);
};

// ------------------------------------------------------------------ 92.1: the triptych and the collapse

type Rect = {x: number; y: number; w: number; h: number};
const GUT = 12;
const bandEnd = (i: number): Rect => {
	const h = (1080 - 2 * GUT) / 3;
	return {x: -8, y: i * (h + GUT), w: 1936, h};
};

/** Photo crop for a band rect: the battery's band width, the height from the rect's aspect; z pushes in on Maya. */
const bandCrop = (b: Bat, r: Rect, vc: number, z: number): [number, number, number, number] => {
	const aspect = r.w / Math.max(1, r.h);
	const cwU = (b.band[2] - b.band[0]) / z;
	const chV = Math.min(0.999, (cwU * 2752) / aspect / 1536);
	const k = (z - 1) / 0.75;
	const uc = Math.max(cwU / 2, Math.min(1 - cwU / 2, lerp((b.band[0] + b.band[2]) / 2, b.push[0], k)));
	const vcz = Math.max(chV / 2, Math.min(1 - chV / 2, lerp(vc, b.push[1], k)));
	return [uc - cwU / 2, vcz - chV / 2, uc + cwU / 2, vcz + chV / 2];
};

const Triptych: React.FC<{t: number; d: Record<string, Density>}> = ({t, d}) => {
	const cam = camAt(TRIP - 1e-3);
	const kick = 1 + 0.018 * pulse(t, 0.09);
	// 92.1: the three interiors snap open into full-width bands (outBack: most of the way there on the downbeat frame);
	// the cells' gaps close and the casings stretch thin and vanish as they go
	const x = (t - TRIP) / 0.14;
	const e = outBack(x, 1.1);
	const shut = easeOut(x);
	// 172.565: a fast squeeze (ease-out: it moves on the cue frame and is flat by f5180), so the bare Rule holds 4 frames
	const q = easeOut((t - COLLAPSE) / 0.15);
	const sheets: Sheet[] = [];
	const casings: {r: Rect; rot: number}[] = [];
	BATS.forEach((b, i) => {
		// start: the battery interior on screen at the stack
		const [sx, sy] = camPoint(cam, 960, b.y);
		const r0: Rect = {x: sx - (IW / 2) * cam.s, y: sy - (IH / 2) * cam.s, w: IW * cam.s, h: IH * cam.s};
		const r1 = bandEnd(i);
		let r: Rect = {x: lerp(r0.x, r1.x, e), y: lerp(r0.y, r1.y, e), w: lerp(r0.w, r1.w, e), h: lerp(r0.h, r1.h, e)};
		// collapse: every band squeezes to the centre line
		if (q > 0) {
			const ycen = lerp(r.y + r.h / 2, 540, q);
			const hh = r.h * (1 - q);
			r = {...r, y: ycen - hh / 2, h: hh};
		}
		if (r.h < 14) return;
		const bandV = (b.band[1] + b.band[3]) / 2;
		const vc = lerp(bandV, b.tri, clamp01(e));
		const zk = easeOut((t - PUSHES[i]) / 0.11);
		const z = 1 + 0.75 * zk;
		// fresh heat floods each band as it snaps open (the charge going in), and again on its push
		const fresh = Math.max(decay(t, TRIP, 0.09), t >= PUSHES[i] ? decay(t, PUSHES[i], 0.07) : 0);
		const [cu0, cv0, cu1, cv1] = bandCrop(b, r, vc, z);
		const rot = lerp(place(i, TRIP).rot, 0, e) + (cam.rot ?? 0) * (1 - e);
		const cxr = r.x + r.w / 2;
		const cyr = r.y + r.h / 2;
		if (shut < 0.995) {
			casings.push({r, rot});
			const n = b.times.length;
			const gap = b.gap * cam.s * (1 - shut);
			const cw = (r.w - (n - 1) * gap) / n;
			const rr = (rot * Math.PI) / 180;
			for (let c = 0; c < n; c++) {
				const x0 = r.x + c * (cw + gap);
				const fu0 = (x0 - r.x) / r.w;
				const fu1 = (x0 + cw - r.x) / r.w;
				const lx = x0 + cw / 2 - cxr;
				sheets.push({
					map: d[b.id],
					crop: [cu0 + fu0 * (cu1 - cu0), cv0, cu0 + fu1 * (cu1 - cu0), cv1],
					w: cw,
					h: r.h,
					cx: cxr + lx * Math.cos(rr),
					cy: cyr + lx * Math.sin(rr),
					rot,
					plates: warm(t, 7, 60 + i, fresh),
					seed: 70 + i * 20 + c,
				});
			}
		} else {
			sheets.push({map: d[b.id], crop: [cu0, cv0, cu1, cv1], w: r.w, h: r.h, cx: cxr, cy: cyr, s: kick * (t >= PUSHES[i] ? stamp(t, PUSHES[i]).s : 1), plates: warm(t, 7.5, 60 + i, fresh), seed: 90 + i});
		}
	});
	// the bare Rule holds from about f5180, thinning from 28 px to the 7 px line over its last frames
	const thin = clamp01((t - COLLAPSE - 0.11) / 0.1);
	const pad = PAD * cam.s * (1 - shut);
	const stroke = STROKE * cam.s * (1 - shut);
	return (
		<AbsoluteFill>
			<PaperFill />
			<Press sheets={sheets} />
			{casings.map(({r, rot}, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: r.x - pad,
						top: r.y - pad,
						width: r.w + 2 * pad,
						height: r.h + 2 * pad,
						transform: `rotate(${rot}deg)`,
						border: `${stroke}px solid ${INK.key}`,
						borderRadius: RAD * cam.s * (1 - shut),
						boxSizing: 'border-box',
						mixBlendMode: 'multiply',
						...inked(1100, 7 * i, 3 * i, true),
					}}
				/>
			))}
			{/* the flat Rule: what is left of the night when it is squeezed flat, ready for 'Flatline' */}
			{q > 0.6 && <div style={{position: 'absolute', left: 0, top: 540 - lerp(14, 3.5, thin), width: 1920, height: lerp(28, 7, thin), background: INK.key, mixBlendMode: 'multiply', ...inked(1024, 0, 0, true)}} />}
		</AbsoluteFill>
	);
};

export const InkBattery: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P30', 'P31', 'P32', 'P33']);
	if (!d) return <PaperFill />;
	if (t < EMPTY) return <Slam t={t} d={d} />;
	if (t < TRIP) return <Batteries t={t} d={d} />;
	return <Triptych t={t} d={d} />;
};

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {};
