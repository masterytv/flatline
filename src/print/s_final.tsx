import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, SERIF} from './ink';
import {clamp01, CropMarks, easeOut, inked, kickNudge, lerp, RegTarget, Rule, Slug, stamp} from './kit';
import {Cam, Plate, plateDots, Sheet, sheetMatrix} from './press';
import {CamLayer, Paper, Press} from './Press';
import {KeepsakePrint} from './s_keepsake';

// 3:07.8 to 3:21.9, the final drop back in the living room.
// Macros: one giant halftone close-up per beat (P41-P43), heat + key only, cream and orange stock in turn.
// R9Pull ('Still'): P44 pulled plate by plate (cold wipe, orange to STOP, the black squeegee in steps) and frozen
//   half-printed on 'Still' for a deliberate 4-beat hold, the Rule flat.
// Explosion ('Dancing', the loudest beat): P44's dots blow off at the lens, DANCING stamps and re-stamps on every
//   beat, the night's camera roll is dealt round it (P45-P48), then the word jumps whole to the top band and the
//   3:17 keepsake (P49, s_keepsake.tsx) lands below it and Maya is circled in grease pencil.
//   DANCING is drawn last, in multiply, and nothing is ever placed over its letters.

/* ----------------------------------------------------------------------------------------------------- */
/* shared                                                                                                */

const PH = 1536 / 2752; // photo height / width
const FR = 1 / 30;
/** Moves that start on a beat are already under way on the beat's own frame (it is evaluated mid-frame). */
const LEAD = 0.035;

type Pose = {cx: number; cy: number; s: number; rot: number};
type Move = {t: number; to: Pose; dur: number};

const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
	cx: lerp(a.cx, b.cx, k),
	cy: lerp(a.cy, b.cy, k),
	s: a.s * Math.pow(b.s / a.s, k),
	rot: lerp(a.rot, b.rot, k),
});

/** Short, fast camera moves, each starting on its beat (LEAD early, so it shows on the beat's frame) from wherever
 *  the last one had got to. */
const track = (t: number, moves: Move[]): Pose => {
	let from = moves[0].to;
	let to = moves[0].to;
	let t0 = -1e9;
	let dur = 1;
	for (const m of moves.slice(1)) {
		const start = m.t - LEAD;
		if (start > t) break;
		from = lerpPose(from, to, easeOut((start - t0) / dur));
		to = m.to;
		t0 = start;
		dur = m.dur;
	}
	return lerpPose(from, to, easeOut((t - t0) / dur));
};

/** Every beat hits the rostrum: a few px of shake and a punch, gone in a quarter beat. */
const beatHit = (cam: Pose, t: number, from: number, to: number, amp = 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || BEATS[i].t < from - 1e-6 || t >= to) return cam;
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * amp;
	const s = cam.s * (1 + 0.014 * k);
	return {
		cx: cam.cx - ((hash2(i, 3, 71) - 0.5) * 18 * k) / s,
		cy: cam.cy - ((hash2(i, 5, 71) - 0.5) * 12 * k) / s,
		s,
		rot: cam.rot + (hash2(i, 7, 71) - 0.5) * 0.5 * k,
	};
};

const backOut = (x: number) => {
	const k = clamp01(x) - 1;
	const c = 1.9;
	return 1 + (c + 1) * k * k * k + c * k * k;
};

/* ----------------------------------------------------------------------------------------------------- */
/* MACROS (187.826 to 191.019): one crop per beat, heat + key only, cell 28-32                          */

type MacroDef = {
	id: 'P41' | 'P42' | 'P43';
	t0: number;
	label: string;
	a: [number, number, number]; // u, v (crop centre, photo fractions) and crop width (fraction of the photo) on the hit
	b: [number, number, number]; // where the beat's move ends
	cell: number;
	stock?: string; // orange stock: the key plate alone
	kGain: number;
	kGamma?: number;
	hGain?: number;
	hGamma?: number;
	throwDir: [number, number]; // the heat plate is flung this way on the hit and snaps back into register
};

// Crops read off gridded copies of P41-P43 (scratchpad/build/final/g_P4*.png).
const MACROS: MacroDef[] = [
	// Jess: face u 0.29-0.50, v 0.27-0.72; her hoop at the left edge of the crop
	{id: 'P41', t0: bt(101, 2), label: 'JESS', a: [0.395, 0.475, 0.52], b: [0.4, 0.46, 0.45], cell: 30, kGain: 0.95, hGain: 1.2, throwDir: [1, -0.6]},
	// Kai's open overshirt flung out like a wing (sleeve from u 0.14 to the shoulder, the panel hanging to v 0.9), with his
	// black hair (u 0.43-0.61, v 0.10-0.30) kept as an arch at the top so the shape reads as a figure in a garment: key
	// alone on orange stock, midtones held back (gamma 1.3) so the people behind drop out and the wing stays solid
	{id: 'P42', t0: bt(101, 3), label: 'THE WING', a: [0.38, 0.39, 0.62], b: [0.35, 0.405, 0.55], cell: 32, stock: INK.heat, kGain: 1.1, kGamma: 1.3, throwDir: [0, 0]},
	// Maya's hair flying up, her face in it
	{id: 'P43', t0: bt(101, 4), label: 'MAYA', a: [0.36, 0.31, 0.46], b: [0.355, 0.27, 0.41], cell: 30, kGain: 1.0, hGain: 1.3, hGamma: 0.85, throwDir: [-1, 0.5]},
	// Dev: face u 0.52-0.72, v 0.2-0.72, laughing with his eyes shut (key alone on orange)
	{id: 'P41', t0: bt(102), label: 'DEV', a: [0.6, 0.45, 0.5], b: [0.615, 0.43, 0.44], cell: 30, stock: INK.heat, kGain: 1.3, kGamma: 0.85, throwDir: [0, 0]},
	// Kai's shouting face: fringe to chin u 0.44-0.61, v 0.09-0.47
	{id: 'P42', t0: bt(102, 2), label: 'KAI', a: [0.52, 0.3, 0.46], b: [0.522, 0.29, 0.37], cell: 28, kGain: 1.1, hGain: 1.2, throwDir: [0.8, 0.8]},
	// Sam's laughing face (u 0.65-0.75, v 0.25-0.45) in her flying auburn curls (u 0.55-0.9, v 0-0.55, orange ink), pushing
	// in. The clasped hands (u 0.5, v 0.82) are dropped: at cell 28-32 they print as shapeless dark masses
	{id: 'P43', t0: bt(102, 3), label: 'SAM', a: [0.695, 0.31, 0.48], b: [0.69, 0.335, 0.39], cell: 30, kGain: 0.9, hGain: 1.8, throwDir: [-0.8, 0.6]},
	// Jess's gold hoop (a ring of bare orange stock) and her cheek: key alone
	{id: 'P41', t0: bt(102, 4), label: 'THE HOOP', a: [0.315, 0.575, 0.33], b: [0.33, 0.56, 0.26], cell: 28, stock: INK.heat, kGain: 1.15, kGamma: 0.9, throwDir: [0, 0]},
];
const MACRO_END = bt(103);

const macroSheet = (m: MacroDef, t: number, t1: number, map: Density, n: number): Sheet => {
	const dur = t1 - m.t0;
	const x = (t - m.t0) / dur;
	const k = easeOut(x);
	const [u0, v0, z0] = m.a;
	const [u1, v1, z1] = m.b;
	const u = lerp(u0, u1, k);
	const v = lerp(v0, v1, k);
	const z = z0 * Math.pow(z1 / z0, k);
	const hit = 1 + 0.07 * (1 - easeOut((t - m.t0) / (3 * FR)));
	const w = 1920 / z0;
	const h = w * PH;
	const s = (z0 / z) * hit;
	const bloom = 1 + 0.3 * Math.exp(-(t - m.t0) / 0.07); // ink floods on the hit and settles
	const fling = Math.exp(-(t - m.t0) / 0.08) * 16;
	const [kx, ky] = kickNudge(t, 0, 2);
	const plates: Plate[] = m.stock
		? [{ch: 0, ink: INK.key, angle: 45, cell: m.cell, gain: m.kGain * bloom, gamma: m.kGamma, dx: kx, dy: ky}]
		: [
				{ch: 1, ink: INK.heat, angle: 15, cell: m.cell, gain: (m.hGain ?? 1) * bloom, gamma: m.hGamma, dx: 3 + m.throwDir[0] * fling, dy: -2 + m.throwDir[1] * fling},
				{ch: 0, ink: INK.key, angle: 45, cell: m.cell, gain: m.kGain * bloom, gamma: m.kGamma, dx: kx, dy: ky},
			];
	return {map, w, h, cx: 960 - (u - 0.5) * w * s, cy: 540 - (v - 0.5) * h * s, s, plates, seed: 41 + n * 5, speckle: 0.35};
};

export const Macros: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P41', 'P42', 'P43']);
	let n = 0;
	while (n + 1 < MACROS.length && MACROS[n + 1].t0 <= t) n++;
	const m = MACROS[n];
	const t1 = n + 1 < MACROS.length ? MACROS[n + 1].t0 : MACRO_END;
	const sheet = d ? macroSheet(m, t, t1, d[m.id], n) : null;
	return (
		<AbsoluteFill style={{background: m.stock ?? INK.paper}}>
			<Paper tint={m.stock} />
			{sheet && <Press sheets={[sheet]} />}
			<div style={{position: 'absolute', left: 48, top: 1016, height: 40, padding: '0 14px', background: m.stock ? INK.paper : '#FBF8F1', boxShadow: '0 2px 6px rgba(45,30,15,0.25)'}}>
				<Slug x={14} y={10} text={`${m.id} · MACRO ${n + 1}/7 · ${m.label} · ${m.stock ? 'K ON O' : 'O 15° K 45°'} · 1 DOT = ${m.cell} PX`} size={17} />
				<div style={{visibility: 'hidden', fontFamily: 'IBM Plex Mono', fontSize: 17, letterSpacing: '0.12em', whiteSpace: 'nowrap', lineHeight: '40px'}}>{`${m.id} · MACRO ${n + 1}/7 · ${m.label} · ${m.stock ? 'K ON O' : 'O 15° K 45°'} · 1 DOT = ${m.cell} PX`}</div>
			</div>
		</AbsoluteFill>
	);
};

/* ----------------------------------------------------------------------------------------------------- */
/* STILL (191.019 to 196.464): P44 pulled plate by plate, stopped dead on 'Still'                        */

// P44: Maya mid-spin on the left (her outstretched hand ends at u 0.55), the friends cheering on the right
// (the nearest, Kai's clapping hands, start at u 0.61). Read off scratchpad/build/final/g_P44.png.
const P44S = {w: 1640, h: 915, cx: 960, cy: 498};
const STOP = 0.578; // the key and orange pulls stop here: just right of Maya's hand, just left of Kai's
const BLAST = {u: 0.36, v: 0.58}; // Maya's torso: the dots blow off from here
const SX = P44S.cx - P44S.w / 2;
const SY = P44S.cy - P44S.h / 2;
const atP44 = (u: number, v: number): [number, number] => [SX + u * P44S.w, SY + v * P44S.h];

const B = {
	cold: bt(103),
	kick1: bt(103, 2),
	heat: bt(103, 3),
	kick2: bt(103, 4),
	sq: bt(104),
	step1: bt(104, 2),
	step2: bt(104, 3),
	still: F.still, // 194.188, bar 104.4
	blast: F.dancing2, // 196.464, bar 106.1, the loudest beat
	rs2: bt(106, 2),
	rs3: bt(106, 3),
	rs4: bt(106, 4),
	p45: bt(107),
	p46: bt(107, 2),
	p47: bt(107, 3),
	p48: bt(107, 4),
	jump: bt(108),
	pencil: bt(108, 2),
	close: bt(108, 3),
	last: bt(108, 4),
};

/** The black squeegee: three strokes on the beats (each already moving on its beat's frame), then a last drag that
 *  stops dead on 'Still'. */
const SQ_IN = B.sq - LEAD;
const squeegee = (t: number): number => {
	if (t < SQ_IN) return 0;
	const tt = Math.min(t, B.still);
	const strokes: [number, number, number][] = [
		// stroke start, where the stroke lands, where it has crept to by the next stroke (fractions of STOP)
		[SQ_IN, 0.31, 0.35],
		[B.step1 - LEAD, 0.6, 0.64],
		[B.step2 - LEAD, 0.87, 0.87],
	];
	let from = 0;
	let x = 0;
	for (let i = 0; i < strokes.length; i++) {
		const [b, land, creep] = strokes[i];
		if (tt < b) break;
		const next = i + 1 < strokes.length ? strokes[i + 1][0] : B.still;
		const k = easeOut((tt - b) / 0.15);
		x = lerp(from, land, k) + (creep - land) * clamp01((tt - b - 0.15) / (next - b - 0.15));
		from = creep;
	}
	// after the third stroke lands, the blade drags the last stretch and stops dead on 'Still'
	const s3 = strokes[2][0] + 0.15;
	if (tt >= s3) x += 0.13 * Math.pow(clamp01((tt - s3) / (B.still - s3)), 1.6);
	return x * STOP;
};

const p44Plates = (t: number, full = false): Plate[] => {
	const frozen = t >= B.still;
	const kicking = (b: number) => t >= b && t < b + 0.45;
	const amp = kicking(B.kick1) || kicking(B.kick2) ? 7 : 2;
	const [bx, by] = frozen || full ? [0, 0] : kickNudge(t, 2, amp);
	const [ox, oy] = frozen || full ? [0, 0] : kickNudge(t, 1, amp);
	const [kx, ky] = frozen || full ? [0, 0] : kickNudge(t, 0, amp * 0.5);
	const cPull = full ? 2 : clamp01((t - B.cold + 0.05) / 0.26) * 1.02; // already a quarter across on the beat's frame
	const hPull = full ? 2 : t < B.heat - LEAD ? 0 : STOP * easeOut((t - B.heat + LEAD) / 0.26);
	// Maya's side keeps a half-weight cold plate (the downbeat lands on ink, not bare paper) until the orange reaches it;
	// behind the orange's edge it drops to the shadows only, or the overprint goes to mud
	const behind = (u: number) => (hPull >= STOP ? 1 : clamp01((hPull - u) / 0.03));
	const kPull = full ? 2 : squeegee(t);
	return [
		{ch: 2, ink: INK.cold, angle: 75, cell: 8.5, kind: full ? 'dot' : 'line', pull: cPull, dx: 2 + bx, dy: 1 + by, gain: 0.86, gamma: 1.2, mask: (u) => (u < STOP ? lerp(0.5, 0.2, behind(u)) : 1)},
		{ch: 1, ink: INK.heat, angle: 15, cell: 8.5, pull: hPull, dx: -1 + ox, dy: 2 + oy, gain: 0.95},
		{ch: 0, ink: INK.key, angle: 45, cell: 8.5, pull: kPull, dx: kx, dy: ky, gain: 0.85, gamma: 1.2},
	];
};

const WIDE: Pose = {cx: 960, cy: 512, s: 0.965, rot: 0};
const [MAYA_X, MAYA_Y] = atP44(0.4, 0.4);
const [KAI_X, KAI_Y] = atP44(0.74, 0.36);
const STILL_MOVES: Move[] = [
	{t: -1e9, to: WIDE, dur: 1},
	{t: B.kick1, to: {cx: KAI_X, cy: KAI_Y + 40, s: 1.2, rot: 0.5}, dur: 0.1}, // kick: in on the friends, full blue
	{t: B.heat, to: {cx: 900, cy: 505, s: 1.0, rot: 0}, dur: 0.12}, // the orange pull: wide again
	{t: B.kick2, to: {cx: MAYA_X - 30, cy: MAYA_Y + 60, s: 1.16, rot: -0.5}, dur: 0.1}, // kick: in on Maya, now in orange
	{t: B.sq, to: {cx: 640, cy: 530, s: 1.1, rot: 0}, dur: 0.14}, // the squeegee comes in from the left
	{t: B.step1, to: {cx: 780, cy: 470, s: 1.24, rot: -0.35}, dur: 0.12}, // her face comes up black
	{t: B.step2, to: {cx: 920, cy: 520, s: 1.1, rot: 0.25}, dur: 0.12},
	{t: B.still, to: WIDE, dur: 2 * FR}, // 'Still': snap wide and stop
];
const stillCam = (t: number): Cam => (t >= B.still ? WIDE : beatHit(track(t, STILL_MOVES), t, B.cold, B.still));

/** The squeegee: a rubber blade with a bead of ink pushed ahead of it. */
const Squeegee: React.FC<{x: number; y: number; h: number}> = ({x, y, h}) => (
	<div style={{position: 'absolute', left: x - 6, top: y - 60, width: 60, height: h + 120}}>
		<div style={{position: 'absolute', left: 0, top: 56, width: 13, height: h + 8, background: INK.key, borderRadius: 6, mixBlendMode: 'multiply', ...inked(400, 0, 3)}} />
		<div style={{position: 'absolute', left: 14, top: 0, width: 30, height: h + 120, background: 'linear-gradient(90deg, #2A2724 0%, #4A4540 35%, #1E1C1A 100%)', borderRadius: 4, boxShadow: '12px 0 24px rgba(40,25,10,0.38)'}} />
		<div style={{position: 'absolute', left: 22, top: 0, width: 5, height: h + 120, background: 'rgba(255,255,255,0.14)'}} />
	</div>
);

// STILL in the same setting as the film's DANCING (Anton at 60% width, cap 84 to 944, 30 px between letters),
// from the font's outlines with fontTools. Ink box x 44 to 1166.
const STILL_PATHS = [
	'M177.7 951.8Q106.7 951.8 75.4 893.2Q44 834.5 44 706.5V622.5H146.5V730Q146.5 759.8 152 776.6Q157.4 793.5 171 793.5Q185.1 793.5 190.5 779.8Q196 766.1 196 734.9Q196 695.3 191.3 668.7Q186.6 642 174.9 617.8Q163.3 593.6 142.7 561.4L96.1 488.1Q44 406.5 44 301.4Q44 191.5 74.8 133.8Q105.6 76.2 163.9 76.2Q235.2 76.2 265.1 139.2Q295 202.2 295 330.8H189.5V271.6Q189.5 254 183.5 244.3Q177.4 234.5 167.1 234.5Q154.8 234.5 149 246Q143.3 257.5 143.3 275.5Q143.3 293.6 149.2 314.6Q155 335.6 172.4 363L232.2 458.3Q250.2 486.6 265.2 518.2Q280.2 549.7 289.4 591.4Q298.5 633.2 298.5 693.3Q298.5 814.5 271.5 883.2Q244.6 951.8 177.7 951.8Z',
	'M390.1 944V249.2H328.5V84H555.3V249.2H493.7V944Z',
	'M585.3 944V84H685.4V944Z',
	'M715.4 944V84H819.1V797.4H925.8V944Z',
	'M955.8 944V84H1059.4V797.4H1166.1V944Z',
];
const STILL_W = 1122;
// over the part the warm plates never reached: clear of the parked blade (its body and highlight reach x + 44, its
// shadow a little further) to inside the sheet's edge. It stamps from its left edge, so it grows away from the blade.
const STILL_BOX = {x: SX + STOP * P44S.w + 62, w: P44S.w * (1 - STOP) - 62 - 26};
const STILL_H = (STILL_BOX.w * 860) / STILL_W;
const STILL_Y = P44S.cy - STILL_H / 2 + 6;

const StillWord: React.FC<{s: number; style?: React.CSSProperties}> = ({s, style}) => (
	<svg
		viewBox={`44 84 ${STILL_W} 860`}
		style={{position: 'absolute', left: STILL_BOX.x, top: STILL_Y, width: STILL_BOX.w, height: STILL_H, overflow: 'visible', transform: `scale(${s})`, transformOrigin: '0% 60%', mixBlendMode: 'multiply', ...inked(900, 11, 70, true), ...style}}
	>
		{STILL_PATHS.map((p, i) => (
			<path key={i} d={p} fill={INK.key} />
		))}
	</svg>
);

const SheetFurniture: React.FC<{t: number; frozen: boolean}> = ({t, frozen}) => {
	const pull = t < B.heat ? 1 : t < B.sq ? 2 : 3;
	return (
		<>
			<CropMarks x={SX} y={SY} w={P44S.w} h={P44S.h} />
			<RegTarget x={SX - 60} y={P44S.cy} />
			<RegTarget x={SX + P44S.w + 60} y={P44S.cy} />
			<Slug x={SX} y={SY + P44S.h + 24} text={`P44 · PULL ${pull}/3 · ${pull === 1 ? 'U 75° LINE' : pull === 2 ? 'O 15°' : 'K 45°'} · ${frozen ? 'STOPPED' : 'RUNNING'}`} size={16} />
			{/* the stop line, scored on the sheet: where the pulls end */}
			<div style={{position: 'absolute', left: SX + STOP * P44S.w, top: SY - 34, width: 0, height: 22, borderLeft: `1.5px solid ${INK.key}`}} />
			<div style={{position: 'absolute', left: SX + STOP * P44S.w, top: SY + P44S.h + 12, width: 0, height: 22, borderLeft: `1.5px solid ${INK.key}`}} />
		</>
	);
};

export const R9Pull: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P44']);
	const frozen = t >= B.still;
	const cam = stillCam(t);
	const sq = squeegee(t);
	const st = stamp(t, B.still);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[{map: d.P44, ...P44S, plates: p44Plates(t), seed: 44}]} />}
			<CamLayer cam={cam}>
				<SheetFurniture t={t} frozen={frozen} />
				<Rule x={SX + 640} y={SY + P44S.h + 46} w={P44S.w - 640} t={t} freeze={frozen ? B.still : undefined} alive={() => !frozen} amp={24} width={2.8} />
				{t >= SQ_IN && <Squeegee x={SX + sq * P44S.w} y={SY} h={P44S.h} />}
				{st.on && <StillWord s={st.s} />}
			</CamLayer>
		</AbsoluteFill>
	);
};

/* ----------------------------------------------------------------------------------------------------- */
/* DANCING (196.464 to 201.921): the dots blow off, the word re-stamps, the camera roll is dealt         */

// The film's DANCING (s_dancing.tsx sets it the same way at 1:41): Anton at 60% width, cap 84 to 944.
const DANCING_PATHS = [
	'M44 944V84H186.6Q242.5 84 270.8 135.6Q299.1 187.1 299.1 286.3V688.9Q299.1 811.1 273.3 877.5Q247.6 944 183 944ZM148.3 792H166.3Q194.8 792 194.8 746.1V302.4Q194.8 259.4 187.9 247Q181 234.5 159.8 234.5H148.3Z',
	'M329.1 944 379.2 84H555L604.2 944H506.1L498.8 805.2H436.3L429.9 944ZM443.7 667.9H490.8L468.1 230.6H463.4Z',
	'M634.2 944V84H740.9L788.6 495.9V84H888.8V944H787.4L735.6 514V944Z',
	'M1043.7 951.8Q987.4 951.8 953.1 893.7Q918.8 835.5 918.8 731V334.2Q918.8 209.1 948.7 142.6Q978.6 76.2 1046 76.2Q1082.8 76.2 1111.6 98.7Q1140.3 121.1 1156.8 165.8Q1173.3 210.6 1173.3 278.5V427H1070.2V300Q1070.2 261.4 1064.3 247.9Q1058.4 234.5 1046 234.5Q1031.6 234.5 1026.6 251.8Q1021.6 269.2 1021.6 298V728.5Q1021.6 764.2 1027.9 778.8Q1034.2 793.5 1046 793.5Q1059.3 793.5 1064.7 775.4Q1070.2 757.3 1070.2 728.5V573.6H1174.5V736.3Q1174.5 849.7 1140 900.8Q1105.5 951.8 1043.7 951.8Z',
	'M1204.5 944V84H1304.6V944Z',
	'M1334.6 944V84H1441.2L1489 495.9V84H1589.1V944H1487.8L1435.9 514V944Z',
	'M1730.2 951.8Q1619.1 951.8 1619.1 688V317.1Q1619.1 76.2 1746.4 76.2Q1798.8 76.2 1826.8 111.1Q1854.8 146.1 1865.4 213Q1876 279.9 1876 376.2H1774.7V300Q1774.7 272.1 1770.1 253.3Q1765.5 234.5 1751.1 234.5Q1733.1 234.5 1727.4 254.5Q1721.6 274.6 1721.6 298.5V715.3Q1721.6 750 1727.1 771.8Q1732.5 793.5 1748.4 793.5Q1764.9 793.5 1770.4 771.8Q1775.8 750 1775.8 714.3V591.7H1748.2V443.1H1874.8V944H1833.3L1815.6 871.7Q1788.5 951.8 1730.2 951.8Z',
];
const DW = 1832; // cap box 44..1876 x 84..944
const DH = 860;

type Imp = {ink: string; dx: number; dy: number};
type WordKey = {t: number; cx: number; cy: number; w: number; rot: number; key: [number, number] | null; heat: [number, number] | null; move?: number; jump?: boolean; punch: number};

// Where DANCING sits (screen px): huge on the burst, then in the middle column (x 600 to 1320) while the camera roll
// is dealt into the side columns round it, then the top band of the same column.
const W1 = {cx: 960, cy: 512, w: 1680};
const W2 = {cx: 960, cy: 540, w: 720};
/** The top band (exported so the keepsake can be checked against it): x 590 to 1330, y 50 to 397. */
export const W3 = {cx: 960, cy: 224, w: 740};

const WORD: WordKey[] = [
	{t: B.blast, ...W1, rot: 0, key: [0, 0], heat: null, punch: 0.08}, // the loudest beat: stamped in key
	{t: B.rs2, ...W1, cx: 944, cy: 522, rot: -1.6, key: [0, 0], heat: null, punch: 0.09}, // re-stamped (key)
	{t: B.rs3, ...W1, cx: 975, cy: 504, rot: 1.2, key: null, heat: [0, 0], punch: 0.09}, // re-stamped (heat)
	{t: B.rs4, ...W1, rot: 0, key: [22, -14], heat: [0, 0], punch: 0.09}, // key off register over the heat
	{t: B.p45, ...W2, rot: 0, key: [-12, 8], heat: [0, 0], move: 0.16, punch: 0.05}, // the camera pulls back: the deal
	{t: B.p46, ...W2, rot: -1.2, key: [12, 8], heat: [0, 0], punch: 0.06},
	{t: B.p47, ...W2, rot: 1, key: [-12, -8], heat: [0, 0], punch: 0.06},
	{t: B.p48, ...W2, rot: -0.6, key: [12, -8], heat: [0, 0], punch: 0.06},
	{t: B.jump, ...W3, rot: 0, key: [0, 0], heat: [0, 0], move: 0.17, jump: true, punch: 0}, // jumps whole to the top band
	{t: B.pencil, ...W3, rot: -0.8, key: [-9, 6], heat: [0, 0], punch: 0.045},
	{t: B.close, ...W3, rot: 0.8, key: [9, 6], heat: [0, 0], punch: 0.045},
	{t: B.last, ...W3, rot: 0, key: [0, 0], heat: [0, 0], punch: 0.06}, // the last bounce, back in register
];

const wordAt = (t: number) => {
	let i = 0;
	while (i + 1 < WORD.length && WORD[i + 1].t <= t) i++;
	const k = WORD[i];
	const p = i > 0 ? WORD[i - 1] : k;
	const dt = t - k.t;
	// position: a cut on a re-stamp, a fast move on the pull-back and the jump
	let {cx, cy, w, rot} = k;
	if (k.move) {
		const dm = dt + LEAD;
		const e = k.jump ? backOut(dm / k.move) : easeOut(dm / k.move);
		cx = lerp(p.cx, k.cx, e);
		cy = lerp(p.cy, k.cy, e);
		w = p.w * Math.pow(k.w / p.w, clamp01(k.jump ? easeOut(dm / k.move) : e));
		rot = lerp(p.rot, k.rot, e);
	}
	// the key plate steps to its new register like a dance step (3 frames)
	const step = easeOut(dt / (3 * FR));
	const reg = (a: [number, number] | null, b: [number, number] | null): [number, number] | null => {
		if (!b) return null;
		if (!a || k.heat === null || p.heat === null) return b;
		return [lerp(a[0], b[0], step), lerp(a[1], b[1], step)];
	};
	const key = reg(p.key, k.key);
	const heat = reg(p.heat, k.heat);
	const bounce = k.punch * Math.exp(-dt / 0.075);
	const s = 1 + bounce;
	const hop = -bounce * 120 * (w / 1680);
	const imps: Imp[] = [];
	if (heat) imps.push({ink: INK.heat, dx: heat[0], dy: heat[1]});
	if (key) imps.push({ink: INK.key, dx: key[0], dy: key[1]});
	return {cx, cy: cy + hop, w, rot, s, imps};
};

/** DANCING as ink: one impression per plate, multiplied, on top of everything. */
const Word: React.FC<{t: number}> = ({t}) => {
	const {cx, cy, w, rot, s, imps} = wordAt(t);
	const h = (w * DH) / DW;
	const unit = DW / w;
	return (
		<svg
			viewBox={`44 84 ${DW} ${DH}`}
			style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, overflow: 'visible', transform: `rotate(${rot}deg) scale(${s})`, mixBlendMode: 'multiply', ...inked(1000, 23, 51, true)}}
		>
			{imps.map((im, n) => (
				<g key={n} transform={`translate(${im.dx * unit} ${im.dy * unit})`} style={{mixBlendMode: 'multiply'}}>
					{DANCING_PATHS.map((p, j) => (
						<path key={j} d={p} fill={im.ink} />
					))}
				</g>
			))}
		</svg>
	);
};

/* the blast ------------------------------------------------------------------------------------------ */

type Dot = {x: number; y: number; r: number; ink: string; vx: number; vy: number; vz: number; t0: number; spin: number; ph: number; fall: boolean};
const dotCache = new Map<string, Dot[]>();

/** Every dot of the finished P44 print (all three plates), with a velocity away from Maya's torso. */
const explodeDots = (d: Density): Dot[] => {
	const hit = dotCache.get(d.id);
	if (hit) return hit;
	const plates = p44Plates(B.still, true);
	const sheet: Sheet = {map: d, ...P44S, plates, seed: 44};
	const m = sheetMatrix(sheet, {cx: 960, cy: 540, s: 1, rot: 0}, 1920, 1080);
	const out: Dot[] = [];
	const [ox, oy] = atP44(BLAST.u, BLAST.v);
	plates.forEach((p, pi) => {
		const a = plateDots(sheet, p);
		for (let q = 0; q < a.length; q += 5) {
			if (a[q + 2] < 0.9) continue;
			const x = m[0] * a[q] + m[2] * a[q + 1] + m[4] + (p.dx ?? 0);
			const y = m[1] * a[q] + m[3] * a[q + 1] + m[5] + (p.dy ?? 0);
			const h1 = hash2(a[q + 3], a[q + 4], 50 + pi);
			const h2 = hash2(a[q + 4], a[q + 3], 60 + pi);
			const h3 = hash2(a[q + 3] + 7, a[q + 4] - 3, 70 + pi);
			const fall = hash2(a[q + 3] - 11, a[q + 4] + 5, 80 + pi) < 0.05;
			const dist = Math.hypot(x - ox, y - oy) + 1e-3;
			const ang = Math.atan2(y - oy, x - ox) + (h1 - 0.5) * 1.1;
			const sp = fall ? 500 + 1600 * h2 * h2 : 140 + 560 * h2;
			out.push({
				x,
				y,
				r: a[q + 2],
				ink: p.ink,
				vx: Math.cos(ang) * sp,
				vy: Math.sin(ang) * sp,
				// most dots blast up past the rostrum camera; a few tumble back down onto the table as confetti
				vz: fall ? 0.5 + 1.1 * h3 : 2.4 + 3.4 * h3,
				t0: dist / 20000,
				spin: 5 + 14 * h1,
				ph: h2 * Math.PI * 2,
				fall,
			});
		}
	});
	dotCache.set(d.id, out);
	return out;
};

const G = 3.2; // pull back toward the table (z units / s^2)
const DRAG = 2.6;
const ZCULL = 0.94;

const drawBlast = (ctx: CanvasRenderingContext2D, dots: Dot[], tau: number, cam: Cam) => {
	const m = sheetMatrix({w: 1920, h: 1080, cx: 960, cy: 540}, cam, 1920, 1080);
	const k = Math.hypot(m[0], m[1]);
	const byInk = new Map<string, Dot[]>();
	for (const d of dots) {
		const a = byInk.get(d.ink) ?? [];
		a.push(d);
		byInk.set(d.ink, a);
	}
	ctx.save();
	ctx.globalCompositeOperation = 'multiply';
	for (const [ink, list] of byInk) {
		ctx.fillStyle = ink;
		ctx.beginPath();
		for (const d of list) {
			const tl = tau - d.t0;
			let x = d.x;
			let y = d.y;
			let z = 0;
			let flip = 1;
			if (tl > 0) {
				const e = (1 - Math.exp(-DRAG * tl)) / DRAG;
				const tland = (2 * d.vz) / G;
				const tz = Math.min(tl, tland);
				z = Math.max(0, d.vz * tz - 0.5 * G * tz * tz);
				if (!d.fall && z > ZCULL) continue; // passed the camera
				if (!d.fall && tl > tland) continue;
				x = d.x + d.vx * e;
				y = d.y + d.vy * e;
				// a tumbling disc: inked face or bare back; it lands one way or the other
				flip = tl < tland ? Math.cos(d.ph + d.spin * tl) : Math.cos(d.ph + d.spin * tland) >= 0 ? 1 : 0;
			}
			const persp = 1 / (1 - Math.min(z, ZCULL));
			const sx = 960 + (x - 960) * persp;
			const sy = 540 + (y - 540) * persp;
			const X = m[0] * sx + m[2] * sy + m[4];
			const Y = m[1] * sx + m[3] * sy + m[5];
			const R = d.r * persp * k;
			if (flip <= 0.02 || R < 0.3) continue;
			if (X < -R || Y < -R || X > 1920 + R || Y > 1080 + R) continue;
			const rx = Math.max(0.3, R * Math.abs(flip));
			ctx.moveTo(X + rx * Math.cos(d.ph), Y + rx * Math.sin(d.ph));
			ctx.ellipse(X, Y, rx, R, d.ph, 0, Math.PI * 2);
		}
		ctx.fill();
	}
	ctx.restore();
};

/* the camera roll ------------------------------------------------------------------------------------ */

type RollDef = {id: string; t0: number; at: [number, number, number]; corner: [number, number, number]; from: [number, number]; cap: string};
const RW = 480; // image area of a camera-roll print (16:9), screen px
const RH = 270;
const RB = 14; // white border
const RFOOT = 46; // the caption strip: the paper is 508 x 330
// Dealt into the side columns (paper x 15 to 545 and 1374 to 1905), clear of the word's column whatever its bounce,
// rotation and key offset, and wholly inside the frame, captions included. On the jump the word rises up its own
// column and the prints are shoved apart vertically into the corners (still inside the frame); the keepsake lands
// between the bottom two, over their inner edges.
const ROLL: RollDef[] = [
	{id: 'P45', t0: B.p45, at: [278, 804, -3], corner: [280, 866, -4], from: [-0.5, 1], cap: '2:04 am, the roof'},
	{id: 'P46', t0: B.p46, at: [1638, 244, 3], corner: [1642, 188, 3.5], from: [0.5, -1], cap: '2:31 am, kitchen'},
	{id: 'P47', t0: B.p47, at: [1640, 798, 3.5], corner: [1640, 864, 4.5], from: [1, 0.55], cap: '2:48 am, the shop'},
	{id: 'P48', t0: B.p48, at: [282, 250, -2.5], corner: [278, 186, -3.5], from: [-1, -0.45], cap: '3:09 am'},
];
const SHOVE = 0.2;

const rollPose = (p: RollDef, t: number) => {
	const air = 1 - easeOut((t - p.t0 + LEAD) / (5 * FR));
	const shove = easeOut((t - B.jump + LEAD) / SHOVE);
	const cx = lerp(p.at[0], p.corner[0], shove) + p.from[0] * 420 * air;
	const cy = lerp(p.at[1], p.corner[1], shove) + p.from[1] * 420 * air;
	const rot = lerp(p.at[2], p.corner[2], shove) + p.from[0] * 7 * air;
	return {cx, cy, rot, s: 1 + 0.09 * air, air: Math.max(air, t >= B.jump ? 0.25 * (1 - shove) : 0)};
};

const RollPrint: React.FC<{p: RollDef; t: number; map?: Density; n: number}> = ({p, t, map, n}) => {
	const q = rollPose(p, t);
	const box = {w: RW + 2 * RB, h: RH + RB + RFOOT};
	// the image centre sits (RFOOT - RB) / 2 above the centre of the paper
	const r = (q.rot * Math.PI) / 180;
	const off = ((RFOOT - RB) / 2) * q.s;
	const pcx = q.cx - Math.sin(r) * off;
	const pcy = q.cy + Math.cos(r) * off;
	const [kx, ky] = kickNudge(t, 0, 1.5, p.t0);
	const [hx, hy] = kickNudge(t, 1, 3, p.t0);
	const sheet: Sheet | null = map
		? {
				map,
				w: RW,
				h: RH,
				cx: q.cx,
				cy: q.cy,
				s: q.s,
				rot: q.rot,
				seed: 45 + n * 3,
				speckle: 0.4,
				plates: [
					{ch: 1, ink: INK.heat, angle: 15, cell: 5.5, dx: 1.5 + hx, dy: -1 + hy, gain: 0.95},
					{ch: 0, ink: INK.key, angle: 45, cell: 5.5, gain: 0.85, gamma: 1.2, dx: kx, dy: ky},
				],
			}
		: null;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: pcx - box.w / 2,
					top: pcy - box.h / 2,
					width: box.w,
					height: box.h,
					background: '#FBF8F1',
					transform: `rotate(${q.rot}deg) scale(${q.s})`,
					boxShadow: `${4 + 26 * q.air}px ${8 + 40 * q.air}px ${14 + 50 * q.air}px rgba(45,30,15,${0.3 + 0.12 * q.air})`,
				}}
			>
				{/* the caption sits at the outer end of the strip: the keepsake lands over the inner edges of the bottom two */}
				<div style={{position: 'absolute', ...(p.at[0] > 960 ? {right: RB + 2} : {left: RB + 2}), top: RB + RH + 9, fontFamily: SERIF, fontStyle: 'italic', fontSize: 24, color: INK.key, opacity: 0.85, whiteSpace: 'nowrap'}}>
					{p.cap}
				</div>
			</div>
			{sheet && <Press sheets={[sheet]} />}
		</>
	);
};

/* the section ---------------------------------------------------------------------------------------- */

// the rostrum camera on the table (the blast, the confetti, the Rule): it pulls back on 107.1 to make room for the deal
const BLAST_MOVES: Move[] = [
	{t: -1e9, to: WIDE, dur: 1},
	{t: B.p45, to: {cx: 960, cy: 545, s: 0.56, rot: 0}, dur: 0.16},
	{t: B.jump, to: {cx: 960, cy: 600, s: 0.5, rot: 0}, dur: 0.2},
];

export const Explosion: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P44', 'P45', 'P46', 'P47', 'P48']);
	const dots = useMemo(() => (d ? explodeDots(d.P44) : []), [d]);
	const tau = t - B.blast + 0.05; // the blast is already lifting the dots on the beat's own frame
	const shake = tau < 0.35 ? Math.sin(tau * 95) * 12 * (1 - tau / 0.35) : 0;
	const base = beatHit(track(t, BLAST_MOVES), t, B.blast, B.jump, 1.2);
	const cam: Cam = {...base, cx: base.cx + shake / base.s, cy: base.cy - (shake * 0.5) / base.s};
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
				<Rule x={SX + 120} y={SY + P44S.h + 46} w={P44S.w - 240} t={t} amp={34} width={3.4} color={INK.heat} />
			</CamLayer>
			{d && <Press cam={cam} sheets={[]} draw={(ctx) => drawBlast(ctx, dots, tau, cam)} />}
			{ROLL.map((p, n) => (t >= p.t0 ? <RollPrint key={p.id} p={p} t={t} map={d?.[p.id]} n={n} /> : null))}
			<KeepsakePrint t={t} />
			<Word t={t} />
		</AbsoluteFill>
	);
};

/** Debug: the word's ink box at t (screen px; its rotation and every impression's offset included), to check that
 *  nothing lands on it. */
export const wordBox = (t: number) => {
	const {cx, cy, w, s, rot, imps} = wordAt(t);
	const h = (w * DH) / DW;
	const r = (Math.abs(rot) * Math.PI) / 180;
	const hw = ((w * Math.cos(r) + h * Math.sin(r)) * s) / 2;
	const hh = ((h * Math.cos(r) + w * Math.sin(r)) * s) / 2;
	const ox = Math.max(0, ...imps.map((im) => Math.abs(im.dx)));
	const oy = Math.max(0, ...imps.map((im) => Math.abs(im.dy)));
	return {x0: cx - hw - ox, y0: cy - hh - oy, x1: cx + hw + ox, y1: cy + hh + oy};
};

/** Debug: the corners of each camera-roll print's paper at t (screen px), for checks against the word and the frame. */
export const rollCorners = (t: number) =>
	ROLL.filter((p) => t >= p.t0).map((p) => {
		const q = rollPose(p, t);
		const r = (q.rot * Math.PI) / 180;
		const off = ((RFOOT - RB) / 2) * q.s;
		const pcx = q.cx - Math.sin(r) * off;
		const pcy = q.cy + Math.cos(r) * off;
		const hw = ((RW + 2 * RB) / 2) * q.s;
		const hh = ((RH + RB + RFOOT) / 2) * q.s;
		const pts = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([a, b]) => [pcx + a * hw * Math.cos(r) - b * hh * Math.sin(r), pcy + a * hw * Math.sin(r) + b * hh * Math.cos(r)]);
		return {id: p.id, pts};
	});
