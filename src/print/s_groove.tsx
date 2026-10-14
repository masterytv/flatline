import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {Density, sample, useDensities} from './density';
import {CAP, NO_LINES, O_COUNTER, O_ORIGIN, UPM} from './glyphs_groove';
import {ANTON, hash2, INK, MONO, SERIF} from './ink';
import {clamp01, CropMarks, easeIn, easeInOut, easeOut, inked, lerp, RegTarget, Rule, Slug, stamp, Tape} from './kit';
import {Cam, CAM0, Plate, Sheet} from './press';
import {CamLayer, Paper, PaperFill, Press, SheetCanvas} from './Press';

// 2:07.1 to 2:23.6, the groove (bars 68 to 76): up on the roof.
// NoPain (68.1-70.4): the whip lands on P13, the friends bursting out of the stairwell; then a wood-type poster, one
//   line per word, each word striking out a TokTic UI specimen while a print of the roof is thrown onto the pile;
//   on 70.3 the pile jogs square and the camera pushes into the O of NO NAME, whose counter is a window onto P18.
// Light (70.4-72.2): through the O onto P18 (the lantern, heat only, big dots); the light spreads until the sheet is
//   bare paper; P19 (Maya laughing) prints back in from the edges, and its key plate lands on 72.1.
// TimeCard (72.2-74.3): a punch card stamped OUT 01:48 / IN 01:52, M1 taped into the name box; on 'forever' an ∞
//   stamps as a window onto P20 and the card tips back, then the ∞ marches.
// Strips (74.3-77.1): P21/P22 sliced into 14 strips jolting out of phase; on 'together' every strip snaps into P23
//   and they bounce as one; they scatter to show P24 printed cold, the kitchen, where the receipt picks up.

/* ------------------------------------------------------------------------------------------------------------ */
/* shared                                                                                                       */

const W = 1920;
const H = 1080;
/** A full-bleed sheet (a little overscan). */
const FULL = {w: 1960, h: 1094, cx: 960, cy: 540};
/** P24 as it lies when the strips scatter off it: the receipt (s_back) can start from the same sheet. */
export const P24_SHEET = FULL;

type Crop = [number, number, number, number];

/** A 16:9 crop zoomed z times about (u, v), kept inside the image. */
const cropAt = (u: number, v: number, z: number): Crop => {
	const w = 1 / z;
	const x0 = Math.min(1 - w, Math.max(0, u - w / 2));
	const y0 = Math.min(1 - w, Math.max(0, v - w / 2));
	return [x0, y0, x0 + w, y0 + w];
};

const heatKey = (cell: number, o: {hx?: number; hy?: number; kx?: number; ky?: number; hgain?: number; kgain?: number; mask?: (u: number, v: number) => number; lift?: number} = {}): Plate[] => [
	{ch: 1, ink: INK.heat, angle: 15, cell, dx: 2 + (o.hx ?? 0), dy: -1 + (o.hy ?? 0), gain: o.hgain, mask: o.mask, lift: o.lift},
	{ch: 0, ink: INK.key, angle: 45, cell, gain: o.kgain ?? 0.9, dx: o.kx ?? 0, dy: o.ky ?? 0, mask: o.mask, lift: o.lift},
];

/** Screen point of a world point through a camera (the same transform as CamLayer and sheetMatrix). */
const toScreen = (cam: Cam, [x, y]: [number, number]): [number, number] => {
	const r = ((cam.rot ?? 0) * Math.PI) / 180;
	const dx = (x - cam.cx) * cam.s;
	const dy = (y - cam.cy) * cam.s;
	return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
};

/** The camera that puts world point w at screen point p, at scale s. */
const camAt = (w: [number, number], p: [number, number], s: number): Cam => ({cx: w[0] - (p[0] - W / 2) / s, cy: w[1] - (p[1] - H / 2) / s, s, rot: 0});

/** The rostrum's hit on every beat: a few px of shake and a 1.2% punch, gone in a quarter beat. */
const beatHit = (cam: Cam, t: number, amp = 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || amp <= 0) return cam;
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * amp;
	const s = cam.s * (1 + 0.012 * k);
	return {
		cx: cam.cx - ((hash2(i, 3, 91) - 0.5) * 14 * k) / s,
		cy: cam.cy - ((hash2(i, 5, 91) - 0.5) * 10 * k) / s,
		s,
		rot: (cam.rot ?? 0) + (hash2(i, 7, 91) - 0.5) * 0.4 * k,
	};
};

/** 1 + amt on t0, settling to 1 (a cut's landing). */
const punch = (t: number, t0: number, amt = 0.05, dur = 0.22) => (t >= t0 ? 1 + amt * (1 - easeOut((t - t0) / dur)) : 1);

const easeOutBack = (x: number) => {
	const k = clamp01(x);
	const c1 = 1.9;
	return 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

/** Horizontal motion blur for a whip, as an SVG filter (one per component instance). */
const WhipBlur: React.FC<{id: string; sd: number}> = ({id, sd}) => (
	<svg width={0} height={0} style={{position: 'absolute'}}>
		<defs>
			<filter id={id} x="-20%" y="-5%" width="140%" height="110%">
				<feGaussianBlur stdDeviation={`${sd.toFixed(1)} 0`} />
			</filter>
		</defs>
	</svg>
);

const svgFull: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'visible'};

/* ------------------------------------------------------------------------------------------------------------ */
/* NO PAIN (127.141 to 132.180)                                                                                 */

const NS = 192; // Anton, px
const NK = NS / UPM;
const CAPPX = CAP * NK;
const LX = 74;
const BASE = [256, 470, 684, 898];
const LINE_INK = [INK.key, INK.heat, INK.key, INK.heat];
const WORDS = F.noWords; // 128.058, 128.964, 129.892, 130.810
const P13_CUT = bt(68, 2); // 127.594
const PUSH = bt(70, 3); // 131.727: the pile jogs square, the push into the O starts
/** The counter of the O of NO NAME, world px. */
const O_PTS: [number, number][] = O_COUNTER.map(([x, y]) => [LX + (O_ORIGIN + x) * NK, BASE[3] + y * NK]);
const O_C: [number, number] = [LX + (O_ORIGIN + 498) * NK, BASE[3] - 880 * NK];
const O_W = 166 * NK; // the counter is a slot 16 px wide and 107 tall
const DIVE_MAX = 2400 / O_W;

/** The push into the O: exponential, landing on 70.4 with the counter wider than the frame. */
const diveCam = (t: number): Cam => {
	const k = clamp01((t - PUSH) / (F.light - PUSH));
	const s = Math.exp(Math.log(DIVE_MAX) * Math.pow(k, 2.6));
	const e = easeInOut(Math.min(1, k * 1.15));
	return camAt(O_C, [lerp(O_C[0], 960, e), lerp(O_C[1], 540, e)], s);
};

// P18 as the dive finds it (the Light section starts from exactly this sheet)
const P18_LANTERN: [number, number] = [0.495, 0.43];
const P18_GAIN = 1.1;
const P18_GAMMA = 4.5;
const P18_CELL = 30;
/** P18 seen through the counter: the lantern rides with the window, so it is the lantern we dive into. At 1.2 the
 * sheet still covers the frame with the lantern (v 0.43) on the centre: no paper band along the top. */
const P18_THROUGH_S = 1.2;
const p18Through = (win: [number, number]) => {
	const lx = FULL.cx + (P18_LANTERN[0] - 0.5) * FULL.w * P18_THROUGH_S;
	const ly = FULL.cy + (P18_LANTERN[1] - 0.5) * FULL.h * P18_THROUGH_S;
	return {...FULL, cx: FULL.cx + (win[0] - lx), cy: FULL.cy + (win[1] - ly), s: P18_THROUGH_S};
};
const p18Plate = (mask?: (u: number, v: number) => number): Plate => ({ch: 1, ink: INK.heat, angle: 15, cell: P18_CELL, gain: P18_GAIN, gamma: P18_GAMMA, mask});

type PrintDef = {id: string; t0: number; cx: number; cy: number; rot: number; tight: [number, number, number]; code: string; seed: number};
const PW = 912;
const PH = 513;
const PM = 14; // paper border
const PFOOT = 40;
const PRINTS: PrintDef[] = [
	{id: 'P14', t0: WORDS[0], cx: 1392, cy: 420, rot: -2.4, tight: [0.46, 0.46, 1.8], code: 'THE ROOF · 02:08 · NO PAIN', seed: 14},
	{id: 'P15', t0: WORDS[1], cx: 1372, cy: 486, rot: 1.9, tight: [0.45, 0.3, 1.9], code: 'THE ROOF · 02:09 · NO FEAR', seed: 15},
	{id: 'P16', t0: WORDS[2], cx: 1400, cy: 552, rot: -1.3, tight: [0.52, 0.5, 1.75], code: 'THE ROOF · 02:10 · NO CLOCK', seed: 16},
	{id: 'P17', t0: WORDS[3], cx: 1380, cy: 604, rot: 2.3, tight: [0.53, 0.26, 1.9], code: 'THE ROOF · 02:11 · NO NAME', seed: 17},
];
const JOG = {cx: 1388, cy: 540}; // where the pile squares up on 70.3
const THROW = 4 / 30;
const beatAfter = (t0: number) => BEATS[lastBeatIndex(t0 + 0.01) + 1].t;

const printPose = (p: PrintDef, n: number, t: number) => {
	const e = easeOut((t - p.t0) / THROW);
	let cx = lerp(p.cx + 360, p.cx, e);
	let cy = lerp(p.cy - 70, p.cy, e);
	let rot = lerp(p.rot + 9, p.rot, e);
	const s = lerp(1.07, 1, e);
	if (t >= PUSH) {
		// jogged square: every print slides into one stack, the lower ones a hair out of true
		const j = easeOut((t - PUSH) / (3 / 30));
		cx = lerp(cx, JOG.cx + (3 - n) * 3, j);
		cy = lerp(cy, JOG.cy - (3 - n) * 2, j);
		rot = lerp(rot, (3 - n) * 0.35, j);
	}
	return {w: PW, h: PH, cx, cy, rot, s, lift: 1 - e};
};

/** The print's paper (border, foot and shadow), in world px. */
const PrintPaper: React.FC<{pose: ReturnType<typeof printPose>; code: string}> = ({pose, code}) => (
	<div
		style={{
			position: 'absolute',
			left: pose.cx - PW / 2 - PM,
			top: pose.cy - PH / 2 - PM,
			width: PW + 2 * PM,
			height: PH + PM + PFOOT,
			transformOrigin: `${PW / 2 + PM}px ${PH / 2 + PM}px`,
			transform: `rotate(${pose.rot}deg) scale(${pose.s})`,
			boxShadow: `0 ${5 + 26 * pose.lift}px ${12 + 50 * pose.lift}px rgba(50,32,15,${0.28 + 0.14 * pose.lift})`,
		}}
	>
		<Paper x={0} y={0} w={PW + 2 * PM} h={PH + PM + PFOOT} tint="#F4EEE1" />
		<div style={{position: 'absolute', left: PM + 2, top: PH + PM + 12, fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', color: INK.key, whiteSpace: 'nowrap', mixBlendMode: 'multiply'}}>{code}</div>
		<div style={{position: 'absolute', right: PM + 2, top: PH + PM + 12, fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', color: INK.heat, mixBlendMode: 'multiply'}}>O 15° · K 45°</div>
	</div>
);

// The TokTic UI each word strikes out, printed in the screen world's ink on a paper specimen card.
const SPEC_W = 300;
const SPEC_H = 126;
const SPEC_ROT = [-2.6, 1.8, -1.4, 2.2];
const SPEC_NAMES = ['FIG. 1 · BADGE', 'FIG. 2 · READ RECEIPT', 'FIG. 3 · LOCK SCREEN', 'FIG. 4 · HANDLE'];

const SpecimenArt: React.FC<{i: number}> = ({i}) => {
	const c = INK.cold;
	const p = INK.paper;
	if (i === 0)
		return (
			<svg width={SPEC_W} height={SPEC_H} style={{position: 'absolute', left: 0, top: 0}}>
				<rect x={70} y={30} width={160} height={84} rx={42} fill={c} />
				<text x={150} y={92} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={54} fill={p}>
					99+
				</text>
			</svg>
		);
	if (i === 1)
		return (
			<svg width={SPEC_W} height={SPEC_H} style={{position: 'absolute', left: 0, top: 0}}>
				<path d="M60 28 h188 a22 22 0 0 1 22 22 v22 a22 22 0 0 1 -22 22 h-150 l-26 16 l6 -16 h-18 a22 22 0 0 1 -22 -22 v-22 a22 22 0 0 1 22 -22 z" fill={c} />
				<text x={154} y={72} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={27} fill={p}>
					where r u??
				</text>
				<text x={268} y={117} textAnchor="end" fontFamily="Inter" fontWeight={700} fontSize={19} fill={c}>
					Seen 1:47
				</text>
			</svg>
		);
	if (i === 2)
		return (
			<svg width={SPEC_W} height={SPEC_H} style={{position: 'absolute', left: 0, top: 0}}>
				<text x={150} y={106} textAnchor="middle" fontFamily="Inter" fontWeight={300} fontSize={100} letterSpacing={-3} fill={c}>
					1:47
				</text>
			</svg>
		);
	return (
		<svg width={SPEC_W} height={SPEC_H} style={{position: 'absolute', left: 0, top: 0}}>
			<rect x={22} y={34} width={256} height={66} rx={33} fill="none" stroke={c} strokeWidth={4} />
			<circle cx={57} cy={67} r={21} fill={c} />
			<text x={90} y={80} fontFamily="Inter" fontWeight={700} fontSize={31} fill={c}>
				@maya.xo
			</text>
		</svg>
	);
};

const Specimen: React.FC<{i: number; t: number; x: number; y: number}> = ({i, t, x, y}) => {
	const s = stamp(t, WORDS[i]);
	if (!s.on) return null;
	const strike = easeOut((t - WORDS[i] - 2 / 30) / (4 / 30));
	return (
		<div style={{position: 'absolute', left: x, top: y, width: SPEC_W, height: SPEC_H, transform: `rotate(${SPEC_ROT[i]}deg) scale(${s.s})`, boxShadow: '0 4px 10px rgba(50,32,15,0.28)'}}>
			<Paper x={0} y={0} w={SPEC_W} h={SPEC_H} tint="#F7F2E8" />
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', ...inked(400, i * 50, i * 30)}}>
				<div style={{position: 'absolute', left: 12, top: 8, fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: INK.cold}}>{SPEC_NAMES[i]}</div>
				<SpecimenArt i={i} />
			</div>
			{strike > 0 && (
				<div
					style={{
						position: 'absolute',
						left: -24,
						top: SPEC_H / 2 - 12,
						width: (SPEC_W + 48) * strike,
						height: 26,
						background: INK.heat,
						transform: 'rotate(-5deg)',
						transformOrigin: '0 50%',
						mixBlendMode: 'multiply',
						...inked(300, i * 70, 11, true),
					}}
				/>
			)}
		</div>
	);
};

/** The four lines of wood type, as outlines through the camera (crisp at any zoom). */
const Words: React.FC<{t: number; cam: Cam}> = ({t, cam}) => {
	const g = `translate(${W / 2} ${H / 2}) scale(${cam.s}) translate(${-cam.cx} ${-cam.cy})`;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{...svgFull, mixBlendMode: 'multiply', ...inked(1024, 0, 0, true)}}>
			<g transform={g}>
				{NO_LINES.map((l, i) => {
					const s = stamp(t, WORDS[i]);
					if (!s.on) return null;
					return (
						<g key={l.text} transform={`translate(${LX} ${BASE[i] - CAPPX / 2}) scale(${s.s}) translate(0 ${CAPPX / 2}) scale(${NK})`}>
							<path d={l.d} fill={LINE_INK[i]} />
						</g>
					);
				})}
			</g>
		</svg>
	);
};

const P13Shot: React.FC<{t: number; map: Density}> = ({t, map}) => {
	const id = `groove-whip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
	// the Join whip (s_couch) leaves to the right: P13 arrives still travelling right and brakes in three frames; the
	// blur is capped so the lit doorway and the group already read on the downbeat frame
	const dt = t - F.groove;
	const D = 330;
	const tau = 0.03;
	const x = -D * Math.exp(-dt / tau);
	const v = ((D / tau) * Math.exp(-dt / tau)) / 30;
	const blur = Math.min(36, v * 0.3);
	const cut = t >= P13_CUT;
	const s = (1 + 0.3 * Math.exp(-dt / tau)) * (cut ? punch(t, P13_CUT, 0.05) : 1);
	const crop: Crop = cut ? cropAt(0.53, 0.5, 1.75) : [0, 0, 1, 1];
	const cam = beatHit(CAM0, t, 0.8);
	return (
		<AbsoluteFill>
			<WhipBlur id={id} sd={blur} />
			<AbsoluteFill style={{filter: blur > 0.5 ? `url(#${id})` : undefined}}>
				<PaperFill />
				<Press cam={cam} sheets={[{map, ...FULL, cx: FULL.cx + x, s, crop, seed: 13, plates: heatKey(8.5)}]} />
			</AbsoluteFill>
			<Slug x={40} y={1046} text={cut ? 'THE ROOF · 02:07 · CUT IN' : 'THE ROOF · 02:07 · O 15° K 45°'} size={14} color={INK.paper} />
		</AbsoluteFill>
	);
};

export const NoPain: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P13', 'P14', 'P15', 'P16', 'P17', 'P18']);
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	if (t < WORDS[0]) return <P13Shot t={t} map={d.P13} />;
	const pushing = t >= PUSH;
	const cam = pushing ? diveCam(t) : beatHit(CAM0, t, 1);
	// the poster slams over P13 on 68.3
	const slam = punch(t, WORDS[0], 0.035, 0.16);
	const camS: Cam = {...cam, s: cam.s * slam};
	const landed = PRINTS.filter((p) => t >= p.t0);
	const top = landed.length - 1;
	// only the prints that can be seen: the top one, the one it lands on, and one more under the jog
	const shown = landed.filter((_, n) => n >= top - 2);
	const win = toScreen(camS, O_C);
	const clip = O_PTS.map((p) => toScreen(camS, p))
		.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`)
		.join(', ');
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{pushing && <PaperFill />}
			<CamLayer cam={camS}>
				{!pushing && <Paper />}
				<Slug x={LX} y={44} text="THE ROOF · 02:08 · WOOD TYPE 192 PT · TWO INKS" size={15} />
				<Slug x={806} y={44} text="TOKTIC · UI SPECIMENS · STRUCK" size={15} color={INK.cold} />
				<Rule x={LX} y={1012} w={1772} t={t} amp={20} width={3} />
			</CamLayer>
			<Words t={t} cam={camS} />
			{shown.map((p) => {
				const n = PRINTS.indexOf(p);
				const pose = printPose(p, n, t);
				const tight = t >= beatAfter(p.t0) && t < PUSH;
				const crop: Crop = tight ? cropAt(p.tight[0], p.tight[1], p.tight[2]) : [0, 0, 1, 1];
				const s = pose.s * (tight ? punch(t, beatAfter(p.t0), 0.03, 0.18) : 1);
				// loose register while the pile builds; on 70.3 every plate snaps home
				const off = pushing ? 0 : 1;
				return (
					<React.Fragment key={p.id}>
						<CamLayer cam={camS}>
							<PrintPaper pose={pose} code={tight ? `${p.code} · DETAIL` : p.code} />
						</CamLayer>
						<Press cam={camS} sheets={[{map: d[p.id], w: PW, h: PH, cx: pose.cx, cy: pose.cy, rot: pose.rot, s, crop, seed: p.seed, plates: heatKey(6.5, {hx: 4 * off, hy: -3 * off, kx: -1 * off})}]} />
					</React.Fragment>
				);
			})}
			<CamLayer cam={camS}>
				{[0, 1, 2, 3].map((i) => (
					<Specimen key={i} i={i} t={t} x={800} y={BASE[i] - CAPPX / 2 - SPEC_H / 2} />
				))}
			</CamLayer>
			{pushing && (
				<div style={{position: 'absolute', inset: 0, clipPath: `polygon(${clip})`}}>
					<PaperFill />
					<Press sheets={[{map: d.P18, ...p18Through(win), seed: 18, plates: [p18Plate()]}]} />
				</div>
			)}
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------ */
/* LIGHT (132.180 to 134.931)                                                                                   */

const JUST = bt(71); // 132.644 'just light'
const BRIGHT = bt(71, 2); // 133.097 'so bright': the light spreads
const WHITE = bt(71, 3); // 133.561 white-out
const GROW = bt(71, 4); // 134.014 'I'm not the same': P19 prints back
const KEY19 = bt(72); // 134.478 its key plate lands
const A16 = 16 / 9;

/** The hand reaching into the lantern: P18's densest heat (0.84-0.97 against 0.72 sky) under the lantern. */
const p18Hand = (map: Density) => (u: number, v: number) => {
	if (u < 0.36 || u > 0.64 || v < 0.48) return 0;
	return clamp01((sample(map, 1, u, v) - 0.79) / 0.05);
};

/** The light. Until 'so bright' the print is whole (the lantern is already bare paper, the hand a silhouette in it);
 * on 'so bright' ink lifts off in a disc that grows from the lantern to past the corners, and the hand, the last
 * thing standing, dissolves into the light as the sheet goes white. */
const lightMask = (t: number, map: Density) => {
	if (t < BRIGHT) return undefined;
	const x = clamp01((t - BRIGHT) / (WHITE - BRIGHT));
	const R = lerp(-0.15, 1.3, Math.pow(x, 1.2)); // at -0.15 the edge of the lift sits inside the bare lantern
	const f = 0.42;
	const keep = 1 - easeIn(clamp01((x - 0.3) / 0.7));
	const hand = p18Hand(map);
	return (u: number, v: number) => {
		const dd = Math.hypot((u - P18_LANTERN[0]) * A16, v - P18_LANTERN[1]);
		const lit = clamp01((dd - R) / f);
		return lit >= 1 || keep <= 0 ? lit : Math.max(lit, hand(u, v) * keep);
	};
};

/** P19 comes back from the edges and closes on her face. */
const P19_FACE: [number, number] = [0.53, 0.3];
const growMask = (t: number) => {
	const R = lerp(0.6, -0.3, easeOut((t - GROW) / 0.4));
	const f = 0.3;
	return (u: number, v: number) => {
		const dd = Math.hypot((u - P19_FACE[0]) * A16, v - P19_FACE[1]);
		return clamp01((dd - R) / f);
	};
};

const LightWord: React.FC<{t: number; t0: number; text: string; y: number; size: number}> = ({t, t0, text, y, size}) => {
	const s = stamp(t, t0);
	if (!s.on) return null;
	return (
		<div style={{position: 'absolute', left: 0, width: W, top: y, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: size, lineHeight: 1, color: INK.key, mixBlendMode: 'multiply', transform: `scale(${s.s})`, ...inked(700, 40, y)}}>
			{text}
		</div>
	);
};

export const Light: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P18', 'P19']);
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	if (t < WHITE) {
		// the dive lands: the lantern settles from where the counter left it, then the slow push of the light
		const from = p18Through([960, 540]);
		const e = easeOut((t - F.light) / 0.32);
		const push = 1 + 0.035 * easeInOut((t - F.light) / (WHITE - F.light));
		const sheet: Sheet = {
			map: d.P18,
			...FULL,
			cx: lerp(from.cx, FULL.cx, e),
			cy: lerp(from.cy, FULL.cy, e),
			s: lerp(from.s, 1, e) * push,
			seed: 18,
			plates: [p18Plate(lightMask(t, d.P18))],
		};
		return (
			<AbsoluteFill style={{background: INK.paper}}>
				<PaperFill />
				<Press sheets={[sheet]} />
				<div style={{position: 'absolute', inset: 0}}>
					<LightWord t={t} t0={JUST} text="just light," y={262} size={150} />
					<LightWord t={t} t0={BRIGHT} text="so bright" y={418} size={150} />
				</div>
			</AbsoluteFill>
		);
	}
	// the white-out: a blank sheet on the press, then P19 printed back into it
	const marks = easeOut((t - WHITE) / (4 / 30));
	const j = (1 - marks) * 14;
	const sheetMarks = (
		<>
			<CropMarks x={70 - j} y={56 - j} w={1780 + 2 * j} h={968 + 2 * j} gap={10} len={46} />
			<RegTarget x={960} y={30 - j} r={12} />
			<RegTarget x={960} y={1050 + j} r={12} />
			<RegTarget x={30 - j} y={540} r={12} />
			<RegTarget x={1890 + j} y={540} r={12} />
		</>
	);
	if (t < GROW) {
		return (
			<AbsoluteFill style={{background: INK.paper}}>
				<PaperFill />
				{sheetMarks}
				<Slug x={96} y={1040} text="SHEET 72 · BLANK · INK 0%" size={14} />
			</AbsoluteFill>
		);
	}
	const keyOn = t >= KEY19;
	const kd = keyOn ? 16 * (1 - easeOut((t - KEY19) / (4 / 30))) : 0;
	const s = lerp(1.05, 1, easeOut((t - GROW) / 0.4)) * punch(t, KEY19, 0.018, 0.2);
	const mask = growMask(t);
	const plates: Plate[] = [{ch: 1, ink: INK.heat, angle: 15, cell: 8.5, dx: 2, dy: -1, mask}];
	if (keyOn) plates.push({ch: 0, ink: INK.key, angle: 45, cell: 8.5, gain: 0.92, dx: kd, dy: -kd * 0.4, mask});
	const words = clamp01((t - GROW) / 0.3);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<PaperFill />
			<Press sheets={[{map: d.P19, ...FULL, s, seed: 19, plates}]} />
			{sheetMarks}
			{/* 'I'm not the same', knocked out of the night sky: it appears as the ink comes back round it */}
			<div style={{position: 'absolute', left: 92, top: 196, fontFamily: SERIF, fontStyle: 'italic', fontSize: 118, lineHeight: 0.98, color: INK.paper, opacity: words > 0 ? 1 : 0}}>
				I'm not
				<br />
				the same
			</div>
			<Slug x={96} y={1040} text={keyOn ? 'SHEET 72 · O 15° K 45° · IN REGISTER' : 'SHEET 72 · O 15° · FIRST PULL'} size={14} color={INK.paper} />
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------ */
/* TIME CARD (134.931 to 139.053)                                                                               */

const OUT = F.fourMin; // 134.931
const GONE = bt(72, 3); // 135.396
const IN = bt(72, 4); // 135.848
const TAPE = bt(73); // 136.313 M1 taped into the name box
const TOTAL = bt(73, 2); // 136.766 '4:00'
const FOREVER = F.forever; // 137.218
const MARCH = [bt(74), bt(74, 2)]; // 138.136, 138.588
const CARD_EXIT = 8 / 30; // the card is off the frame eight frames after 'forever'

const CARD = {w: 760, h: 980, cx: 960, cy: 548};
const CARD_X = CARD.cx - CARD.w / 2;
const CARD_Y = CARD.cy - CARD.h / 2;
const PHOTO = {x: 452, y: 168, w: 262, h: 332}; // in the card
const M1_CROP: Crop = [0.4, 0.05, 0.68, 0.68];

/** Cuts on the stamps: wide, the rows, the name box, wide. */
const cardCam = (t: number): Cam => {
	if (t < GONE) return {cx: 960, cy: CARD_Y + 420, s: 1.3, rot: 0}; // the card fills the frame, header and OUT
	if (t >= TOTAL || t < IN) return {cx: 960, cy: 540, s: t >= TOTAL ? 1.04 : 1, rot: 0};
	if (t < TAPE) return {cx: 905, cy: CARD_Y + 700, s: 1.6, rot: 0};
	return {cx: CARD_X + PHOTO.x + PHOTO.w / 2 - 90, cy: CARD_Y + PHOTO.y + PHOTO.h / 2 + 10, s: 2.05, rot: 0};
};

const TimeStamp: React.FC<{t: number; t0: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number; box?: boolean}> = ({t, t0, x, y, text, color = INK.key, size = 76, rot = -2, box}) => {
	const s = stamp(t, t0);
	if (!s.on) return null;
	// a fresh impression is a touch heavier for a frame
	const wet = 1 - clamp01((t - t0) / (2 / 30));
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				fontFamily: MONO,
				fontWeight: 500,
				fontSize: size,
				lineHeight: 1,
				color,
				whiteSpace: 'pre',
				padding: box ? '8px 18px 6px' : 0,
				border: box ? `6px solid ${color}` : undefined,
				borderRadius: 8,
				transform: `rotate(${rot}deg) scale(${s.s})`,
				transformOrigin: '0 50%',
				mixBlendMode: 'multiply',
				filter: wet > 0 ? `drop-shadow(0 0 ${wet * 1.5}px ${color})` : undefined,
				...inked(520, x * 3, y),
			}}
		>
			{text}
		</div>
	);
};

const TimeCardFace: React.FC<{t: number; m1: Density}> = ({t, m1}) => {
	const ruled = 'rgba(255,95,31,0.55)';
	const tape = t >= TAPE;
	const tp = tape ? easeOut((t - TAPE) / (4 / 30)) : 0;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: CARD.w, height: CARD.h}}>
			<Paper x={0} y={0} w={CARD.w} h={CARD.h} tint="#F5F0E4" />
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply'}}>
				<div style={{position: 'absolute', left: 38, top: 30, fontFamily: ANTON, fontSize: 96, lineHeight: 1, color: INK.key, letterSpacing: '0.01em', ...inked(700, 3, 9, true)}}>TIME CARD</div>
				<div style={{position: 'absolute', right: 40, top: 40, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.key, textAlign: 'right', lineHeight: 1.5}}>
					Nº 0%
					<br />
					<span style={{color: INK.heat}}>SAT 14 JUN</span>
				</div>
				<div style={{position: 'absolute', left: 38, right: 38, top: 140, height: 4, background: INK.key}} />
				<div style={{position: 'absolute', left: 38, top: 168, fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: INK.key}}>NAME</div>
				<div style={{position: 'absolute', left: 34, top: 196, fontFamily: SERIF, fontStyle: 'italic', fontSize: 128, lineHeight: 1, color: INK.key}}>Maya</div>
				<div style={{position: 'absolute', left: 38, top: 340, width: 370, height: 2, background: INK.key, opacity: 0.8}} />
				<div style={{position: 'absolute', left: 38, top: 356, fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: INK.key, lineHeight: 1.7}}>
					DEPT. &nbsp;THE ROOF
					<br />
					SHIFT &nbsp;NIGHT
					<br />
					CLOCK &nbsp;Nº 1:47
				</div>
				{/* the photo box */}
				<div style={{position: 'absolute', left: PHOTO.x - 6, top: PHOTO.y - 6, width: PHOTO.w + 12, height: PHOTO.h + 12, border: `2px solid ${INK.key}`}} />
				{!tape && <div style={{position: 'absolute', left: PHOTO.x, top: PHOTO.y + PHOTO.h / 2 - 10, width: PHOTO.w, textAlign: 'center', fontFamily: MONO, fontSize: 14, letterSpacing: '0.2em', color: INK.key, opacity: 0.7}}>PHOTO</div>}
				<div style={{position: 'absolute', left: 38, right: 38, top: 532, height: 4, background: INK.key}} />
				{['IN / OUT', 'TIME'].map((s, i) => (
					<div key={s} style={{position: 'absolute', left: [38, 300][i], top: 548, fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: INK.key}}>
						{s}
					</div>
				))}
				{[584, 694, 804].map((y) => (
					<div key={y} style={{position: 'absolute', left: 38, right: 38, top: y, height: 2, background: ruled}} />
				))}
				<div style={{position: 'absolute', left: 280, top: 584, width: 2, height: 220, background: ruled}} />
				<div style={{position: 'absolute', left: 38, right: 38, top: 822, height: 4, background: INK.key}} />
				<div style={{position: 'absolute', left: 38, top: 846, fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: INK.key}}>TOTAL</div>
			</div>
			<TimeStamp t={t} t0={OUT} x={44} y={606} text="OUT" size={70} rot={-1.5} />
			<TimeStamp t={t} t0={OUT} x={300} y={604} text="01:48" size={76} rot={-1.5} />
			<TimeStamp t={t} t0={IN} x={44} y={716} text="IN" size={70} rot={1.2} />
			<TimeStamp t={t} t0={IN} x={300} y={714} text="01:52" size={76} rot={1.2} />
			<TimeStamp t={t} t0={TOTAL} x={286} y={850} text="4:00" color={INK.heat} size={80} rot={-6} box />
			{tape && (
				<div style={{position: 'absolute', left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, height: PHOTO.h, transform: `rotate(${lerp(9, 2.5, tp)}deg) scale(${lerp(1.12, 1, tp)})`, transformOrigin: '50% 40%', boxShadow: '0 3px 8px rgba(50,32,15,0.3)'}}>
					<Paper x={0} y={0} w={PHOTO.w} h={PHOTO.h} tint="#F7F2E8" />
					<SheetCanvas res={2} sheet={{map: m1, w: PHOTO.w, h: PHOTO.h, crop: M1_CROP, seed: 1, plates: heatKey(4.6)}} />
					<Tape x={30} y={6} w={110} h={34} rot={-38} seed={3} />
					<Tape x={PHOTO.w - 26} y={PHOTO.h - 8} w={110} h={34} rot={-36} seed={8} />
				</div>
			)}
		</div>
	);
};

// The ∞: two round lobes joined by two straight strokes that cross at the centre (a bold geometric ∞), stroked
// fat; it is a window onto P20. Each march is the same stamp stepping nearer, re-inked.
const INF_C = 1.22; // lobe centre distance / lobe radius
const INF_W = 0.6; // stroke / lobe radius: the band runs 0.7r to 1.3r from each lobe centre
const KEY20 = bt(73, 4); // 137.671: P20's key plate lands
type Step = {t0: number; cx: number; cy: number; r: number};
const STEPS: Step[] = [
	{t0: FOREVER, cx: 960, cy: 548, r: 332},
	{t0: MARCH[0], cx: 984, cy: 590, r: 420},
	{t0: MARCH[1], cx: 960, cy: 668, r: 520},
];
// Traced on P20 (scratchpad build/groove/P20_face_L.jpg, P20_face_R.jpg): face centres, forehead to chin v 0.27-0.46.
const JESS: [number, number] = [0.28, 0.372];
const SAM: [number, number] = [0.735, 0.375];
const FACE_U = (JESS[0] + SAM[0]) / 2;
const FACE_V = (JESS[1] + SAM[1]) / 2;
const FACE_SEP = SAM[0] - JESS[0];
/** P20 behind the ∞ (world px) with Jess's face on the centre line of the left lobe's top arc and Sam's on the right
 * one's, as big as it takes for the photo to cover every part of the window on the frame. When the photo has to be
 * bigger than the lobes are apart, the faces slide out and down along the arcs, so they stay on the band. */
const p20For = (cx: number, cy: number, r: number) => {
	const m = 18;
	const out = r * (1 + INF_W / 2);
	const lobe = INF_C * r;
	const top = Math.max(0, cy - out) - m;
	const bottom = Math.min(H, cy + out) + m;
	const left = Math.max(0, cx - lobe - out) - m;
	const right = Math.min(W, cx + lobe + out) + m;
	let s = (2 * lobe) / (FACE_SEP * FULL.w);
	let faceY = cy - r;
	for (let it = 0; it < 6; it++) {
		const dx = Math.max(0, (FACE_SEP * FULL.w * s) / 2 - lobe);
		faceY = cy - Math.sqrt(Math.max(0, r * r - dx * dx));
		s = Math.max(
			(2 * lobe) / (FACE_SEP * FULL.w),
			(bottom - faceY) / ((1 - FACE_V) * FULL.h),
			(faceY - top) / (FACE_V * FULL.h),
			(cx - left) / (FACE_U * FULL.w),
			(right - cx) / ((1 - FACE_U) * FULL.w),
		);
	}
	return {cx: cx - (FACE_U - 0.5) * FULL.w * s, cy: faceY - (FACE_V - 0.5) * FULL.h * s, s};
};
/** The ∞'s centre line in world px: two straight strokes crossing at the centre and two round lobes. */
const infPts = (cx: number, cy: number, r: number): [number, number][] => {
	const c = INF_C * r;
	const th = Math.asin(1 / INF_C);
	const t1: [number, number] = [c * Math.cos(th) ** 2, -c * Math.cos(th) * Math.sin(th)];
	const phi = Math.atan2(t1[1], t1[0] - c);
	const right: [number, number][] = [];
	for (let i = 0; i <= 64; i++) {
		const a = phi + (i / 64) * (-2 * phi);
		right.push([c + r * Math.cos(a), r * Math.sin(a)]);
	}
	const pts: [number, number][] = [[0, 0], ...right, [0, 0], ...right.map(([x, y]) => [-x, y] as [number, number])];
	return pts.map(([x, y]) => [cx + x, cy + y]);
};
const ptsPath = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`;
const svgMask = (d: string, sw: number) =>
	`url("data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'><path d='${d}' fill='none' stroke='white' stroke-width='${sw.toFixed(1)}' stroke-linejoin='round' stroke-linecap='round'/></svg>`,
	)}")`;

/** Where the stamp is: it steps from one impression to the next in three frames, landing with a stamp's overshoot. */
const stepIndex = (t: number) => STEPS.filter((m) => t >= m.t0).length - 1;
const stepAt = (t: number) => {
	const n = stepIndex(t);
	const cur = STEPS[n];
	const prev = STEPS[Math.max(0, n - 1)];
	const k = n === 0 ? 1 : easeOutBack((t - cur.t0) / (3 / 30));
	const sc = stamp(t, cur.t0).s;
	return {cx: lerp(prev.cx, cur.cx, k), cy: lerp(prev.cy, cur.cy, k), r: lerp(prev.r, cur.r, k) * (n === 0 ? sc : 1 + (sc - 1) * 0.5)};
};

/** The off-beat: the stamp is re-inked half way between beats (a register kick that settles in a few frames). */
const offKick = (t: number) => {
	const i = lastBeatIndex(t);
	if (i < 0 || i + 1 >= BEATS.length) return {k: 0, i};
	const off = (BEATS[i].t + BEATS[i + 1].t) / 2;
	return {k: t >= off ? Math.exp(-(t - off) / 0.07) : 0, i};
};

/** The rostrum over the ∞: the beat hit on every beat, a small re-ink punch on the off-beat, and a 1.5% creep
 * through each hold, so no step sits still. */
const infCam = (t: number): Cam => {
	const n = stepIndex(t);
	const t0 = STEPS[n].t0;
	const t1 = n + 1 < STEPS.length ? STEPS[n + 1].t0 : F.together;
	const creep = 1 + 0.015 * easeInOut((t - t0) / (t1 - t0));
	const {k} = offKick(t);
	return beatHit({cx: 960, cy: 540, s: creep * (1 + 0.008 * k), rot: 0}, t, 1);
};

const COUNTER_WORDS = [
	{t0: MARCH[0], text: 'free', side: -1, ink: INK.key, size: 0.62},
	{t0: MARCH[1], text: 'forever', side: 1, ink: INK.heat, size: 0.5},
];

const camG = (cam: Cam) => `translate(${W / 2} ${H / 2}) rotate(${cam.rot ?? 0}) scale(${cam.s}) translate(${-cam.cx} ${-cam.cy})`;

const Infinity8: React.FC<{t: number; map: Density; cam: Cam}> = ({t, map, cam}) => {
	const {cx, cy, r} = stepAt(t);
	const pts = infPts(cx, cy, r);
	const sw = INF_W * r;
	const mask = svgMask(ptsPath(pts.map((q) => toScreen(cam, q))), sw * cam.s);
	const p = p20For(cx, cy, r);
	const keyOn = t >= KEY20;
	const kd = keyOn ? 12 * (1 - easeOut((t - KEY20) / (4 / 30))) : 0;
	// the off-beat re-ink: the heat plate kicks a few px out of register and settles
	const {k: ko, i: bi} = offKick(t);
	const hx = (hash2(bi, 2, 37) - 0.5) * 12 * ko;
	const hy = (hash2(bi, 4, 37) - 0.5) * 8 * ko;
	const plates: Plate[] = [{ch: 1, ink: INK.heat, angle: 15, cell: 8, dx: 2 + hx, dy: -1 + hy}];
	if (keyOn) plates.push({ch: 0, ink: INK.key, angle: 45, cell: 8, gain: 0.8, dx: kd, dy: -kd * 0.5});
	return (
		<>
			<svg viewBox={`0 0 ${W} ${H}`} style={{...svgFull, mixBlendMode: 'multiply', ...inked(900, 13, 5, true)}}>
				<g transform={camG(cam)}>
					<path d={ptsPath(pts)} fill="none" stroke={INK.heat} strokeWidth={sw + 24 + 10 * ko} strokeLinejoin="round" strokeLinecap="round" />
				</g>
			</svg>
			<div style={{position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: `${W}px ${H}px`, maskSize: `${W}px ${H}px`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'}}>
				<PaperFill />
				<Press cam={cam} sheets={[{map, ...FULL, ...p, seed: 20, plates}]} />
			</div>
			{/* the lyric fills the counters as the stamp marches: 'free' on 74.1, 'forever' on 74.2 */}
			<CamLayer cam={cam}>
				{COUNTER_WORDS.filter((w) => t >= w.t0).map((w) => {
					const rho = r * (1 - INF_W / 2);
					const st = stamp(t, w.t0);
					return (
						<div
							key={w.text}
							style={{
								position: 'absolute',
								left: cx + w.side * INF_C * r - rho,
								top: cy - rho * 0.62,
								width: 2 * rho,
								textAlign: 'center',
								fontFamily: SERIF,
								fontStyle: 'italic',
								fontSize: rho * w.size,
								lineHeight: 1,
								color: w.ink,
								mixBlendMode: 'multiply',
								transform: `scale(${st.s}) rotate(${w.side * -4}deg)`,
								...inked(700, w.side * 90, 20),
							}}
						>
							{w.text}
						</div>
					);
				})}
			</CamLayer>
		</>
	);
};

export const TimeCard: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['M1', 'P20']);
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	const slap = punch(t, OUT, 0.06, 0.16);
	const spin = -7 * (1 - easeOut((t - OUT) / 0.16)); // it lands turning
	const cut = [OUT, GONE, IN, TAPE, TOTAL].filter((c) => t >= c).pop() ?? OUT;
	const c0 = cardCam(t);
	const drift = 1 + 0.012 * clamp01((t - cut) / 0.9);
	// from 'forever' the page is under the ∞'s rostrum
	const cam = t >= FOREVER ? infCam(t) : beatHit({...c0, s: c0.s * punch(t, cut, 0.035, 0.2) * drift}, t, 0.8);
	// on 'forever' the card tips back and drops off the bottom of the frame in eight frames, so the ∞ reads alone
	const tip = easeOut((t - FOREVER) / (4 / 30));
	const drop = easeIn((t - FOREVER) / CARD_EXIT);
	const cardGone = t >= FOREVER + CARD_EXIT;
	// 'gone' (and its arrow) only on the wide shots: a cut-in would crop it to debris
	const wide = (t >= GONE && t < IN) || (t >= TOTAL && t < FOREVER);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
				{/* the lyric, in the human voice, beside the card */}
				{wide && (
					<div style={{position: 'absolute', left: 168, top: 572, fontFamily: SERIF, fontStyle: 'italic', fontSize: 150, lineHeight: 1, color: INK.heat, transform: `rotate(-7deg) scale(${stamp(t, GONE).s})`, mixBlendMode: 'multiply'}}>
						gone
					</div>
				)}
				{t >= TOTAL && t < FOREVER && (
					<div style={{position: 'absolute', left: CARD_X + CARD.w + 50, top: 820, fontFamily: SERIF, fontStyle: 'italic', fontSize: 112, lineHeight: 0.95, color: INK.heat, transform: `rotate(-5deg) scale(${stamp(t, TOTAL).s})`, transformOrigin: '0 50%', mixBlendMode: 'multiply'}}>
						four
						<br />
						minutes
					</div>
				)}
				{/* the card tips back on 'forever' and drops away under the stamp */}
				<div style={{position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD.w, height: CARD.h, perspective: 1500, perspectiveOrigin: '50% 30%', display: cardGone ? 'none' : 'block'}}>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							transformOrigin: '50% 100%',
							transform: `translateY(${1250 * drop}px) rotateX(${62 * tip}deg) rotate(${-1.5 + spin + 6 * drop}deg) scale(${slap})`,
							boxShadow: `0 ${18 - 10 * tip}px ${40 - 20 * tip}px rgba(50,32,15,0.28)`,
						}}
					>
						<TimeCardFace t={t} m1={d.M1} />
					</div>
				</div>
				{/* the arrow lands on the card, pointing at OUT */}
				{wide && (
					<svg style={{position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', mixBlendMode: 'multiply'}}>
						<path d={`M 470 718 C 520 690, 560 676, ${CARD_X + 30} 660`} fill="none" stroke={INK.heat} strokeWidth={6} strokeLinecap="round" strokeDasharray="420" strokeDashoffset={420 * (1 - easeOut((t - GONE) / 0.18))} />
						<path d={`M ${CARD_X + 6} 642 L ${CARD_X + 34} 660 L ${CARD_X + 8} 682`} fill="none" stroke={INK.heat} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={t >= GONE + 0.15 ? 1 : 0} />
					</svg>
				)}
				{!cardGone && <Slug x={CARD_X} y={CARD_Y + CARD.h + 14} text="GONE 4 MIN · FREE ∞ · PUNCH CLOCK 1:47" size={13} />}
			</CamLayer>
			{t >= FOREVER && <Infinity8 t={t} map={d.P20} cam={cam} />}
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------ */
/* STRIPS (139.053 to 143.627)                                                                                  */

const SN = 14;
const SA = {w: 1840, h: 1035, cx: 960, cy: 540};
const GAP = 4;
const JOLT = 40;
const SWAP = bt(75); // 139.970
const TOGETHER = bt(75, 3); // 140.887
const KEYFLASH = bt(76); // 141.804
const SCATTER = bt(76, 3); // 142.710
const LAST = bt(76, 4); // 143.174

/** Vertical offset of strip k: out of phase (odd against even, flipping every beat), then in phase. */
const stripY = (k: number, t: number) => {
	const i = lastBeatIndex(t);
	const bt0 = BEATS[i].t;
	const x = (t - bt0) / 0.12;
	const side = k % 2 ? 1 : -1;
	if (t < TOGETHER) {
		const j = i - lastBeatIndex(F.together + 0.01); // 0, 1, 2, 3
		const now = side * (j % 2 ? -1 : 1) * JOLT;
		const prev = j === 0 ? 0 : -now;
		return lerp(prev, now, easeOutBack(x));
	}
	// on 'together' they snap from where they were into line and stay there for the whole beat (no hop on it)
	if (i <= lastBeatIndex(TOGETHER)) {
		const from = side * JOLT; // the last out-of-phase beat (75.2) had odd strips up
		return lerp(-from, 0, easeOutBack((t - TOGETHER) / 0.12));
	}
	// in phase: on every later beat they hop together
	const hopX = (t - bt0) / 0.3;
	return hopX < 1 ? -JOLT * 1.1 * Math.sin(Math.PI * hopX) * (1 - 0.3 * hopX) : 0;
};

export const Strips: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P21', 'P22', 'P23', 'P24']);
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	// Kai's strips are P22. If its plate is ever missing (a 2x2 empty map), they fall back to P21 slid two strips
	// over (unmirrored), so Jess reads displaced rather than as a mirrored double
	const p22Missing = d.P22.w <= 2;
	const kai = p22Missing ? {map: d.P21, du: 2 / SN} : {map: d.P22, du: 0};
	const jess = {map: d.P21, du: 0};
	const together = t >= TOGETHER;
	const keyOnly = t >= KEYFLASH && t < bt(76, 2);
	const scatter = t >= SCATTER;
	const sw = SA.w / SN;
	// once they are in line the seams close over the 'together' beat (the fourteen strips heal into one print), and
	// open again when the scatter kicks them apart
	const gap = together && !scatter ? lerp(GAP, 0, easeInOut((t - TOGETHER - 0.12) / 0.3)) : GAP;
	const sheets: Sheet[] = [];
	for (let k = 0; k < SN; k++) {
		const odd = k % 2 === 1;
		const swapped = t >= SWAP;
		const src = together ? {map: d.P23, du: 0} : odd !== swapped ? jess : kai;
		let dy = stripY(k, t);
		let rot = 0;
		if (scatter) {
			// a kick on the beat itself, then they fall away, the middle strips first
			const delay = Math.abs(k - (SN - 1) / 2) * 0.012;
			const x = t - SCATTER;
			const e = easeIn((x - delay) / 0.36);
			dy += (odd ? 1 : -1) * (70 * easeOut(x / 0.07) + e * 1250);
			rot = (hash2(k, 3, 7) - 0.5) * 14 * e;
		}
		const x0 = Math.min(1 - 1 / SN, k / SN + src.du);
		const crop: Crop = [x0, 0, x0 + 1 / SN, 1];
		const plates: Plate[] = keyOnly ? [{ch: 0, ink: INK.key, angle: 45, cell: 8, gain: 1.05}] : heatKey(8, {kgain: 0.88});
		sheets.push({
			map: src.map,
			crop,
			w: sw - gap,
			h: SA.h,
			cx: SA.cx - SA.w / 2 + (k + 0.5) * sw,
			cy: SA.cy + dy,
			rot,
			seed: 40 + k,
			// white in the canvas is no ink once multiplied, but it hides the kitchen under the strip
			ground: keyOnly ? INK.heat : '#FFFFFF',
			plates,
		});
	}
	// on 76.4 a short push toward her phone, about the phone (u 0.6, v 0.66)
	const p24s = (t >= LAST ? 1 + 0.1 * easeInOut((t - LAST) / 0.42) : 1) * punch(t, SCATTER, 0.04, 0.4);
	const ph: [number, number] = [P24_SHEET.cx + 0.1 * P24_SHEET.w, P24_SHEET.cy + 0.16 * P24_SHEET.h];
	const kitchen: Sheet = {
		map: d.P24,
		...P24_SHEET,
		s: p24s,
		cx: ph[0] - (ph[0] - P24_SHEET.cx) * p24s,
		cy: ph[1] - (ph[1] - P24_SHEET.cy) * p24s,
		seed: 24,
		plates: [{ch: 2, ink: INK.cold, angle: 75, cell: 7, kind: 'line', gain: 0.86}],
	};
	const cam = beatHit(CAM0, t, scatter ? 0.5 : 1);
	const label = together ? (keyOnly ? 'THE WALL · 14 STRIPS · IN PHASE · K ONLY ON O' : 'THE WALL · 14 STRIPS · IN PHASE') : 'THE WALL · 14 STRIPS · OUT OF PHASE';
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<PaperFill />
			<Press cam={cam} sheets={scatter ? [kitchen, ...sheets] : sheets} />
			{!scatter && <Slug x={SA.cx - SA.w / 2} y={SA.cy + SA.h / 2 + 4} text={label} size={12} />}
			{scatter && <Slug x={60} y={1046} text="THE KITCHEN · 02:22 · U 75° LINE" size={13} color={INK.cold} />}
		</AbsoluteFill>
	);
};
