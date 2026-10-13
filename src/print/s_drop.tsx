import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {BEATS, beatsIn, lastBeatIndex} from '../timing';
import {useDensities} from './density';
import {ANTON, hash2, INK, MONO, SERIF} from './ink';
import {clamp01, CropMarks, easeOut, ecg, inked, kickNudge, RegTarget, Slug, stamp} from './kit';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, Press} from './Press';

// 1:32.2–1:41.4: the progressive proofs of P1 on the 1:32 "Flatline", then "My heart stopped... and I started"
// as type on ECG paper (graft 2, Monitor's real stop restyled into ink).

// ------------------------------------------------------------------ the press sheet (shared with the hand-over)
//
// Hand-over contract (s_hand.tsx ends where Progs begins, on 92.172 = F.flatline2):
// - P1 printed by posterSheet(d.P1, P1_PLATES) at POSTER, seen through sheetCam(t), on cream Paper;
// - SheetMarks round it (crop marks, targets, colour bar, slugs);
// - the opening's lime wire flat across the frame at WIRE_Y (3-4 px).
// On 92.172 Progs swaps the plates for proof 1 (key only), stamps the FLATLINE bar centred on the wire and turns
// the wire into the Rule. If the hand-over uses these, the cut changes only what the plan says changes.

/** P1's sheet: 1520x848 paper px, left of centre so the colour bar fits on the right. */
export const POSTER = {w: 1520, h: 848, cx: 920, cy: 480};
export const PX = POSTER.cx - POSTER.w / 2;
export const PY = POSTER.cy - POSTER.h / 2;
/** The wire (the opening's FlatlineType line, then the Rule): world and screen y. */
export const WIRE_Y = 540;

/** The sheet's camera: drifts ~1% of the width per bar from T.end and parks on the 1:32 "Flatline". */
export const sheetCam = (t: number): Cam => ({cx: 960 - (Math.max(0, Math.min(t, F.flatline2) - T.end) / 1.85) * 19.2, cy: 540, s: 1});

export const posterSheet = (map: Sheet['map'], plates: Plate[]): Sheet => ({map, w: POSTER.w, h: POSTER.h, cx: POSTER.cx, cy: POSTER.cy, plates, seed: 8});

/** P1 in both inks, in register: the print the hand-over's windows open onto. */
export const P1_PLATES: Plate[] = [
	{ch: 1, ink: INK.heat, angle: 15, cell: 8.5},
	{ch: 0, ink: INK.key, angle: 45, cell: 8.5},
];

/** Printer's marks round the sheet. Each registration target prints once per plate, at that plate's offset. */
export const SheetMarks: React.FC<{plates?: {ink: string; dx?: number; dy?: number}[]; code?: string; screen?: string}> = ({
	plates = [{ink: INK.heat}, {ink: INK.key}],
	code = 'PROOF 1',
	screen = 'K 45°  ·  O 15°  ·  85 LPI',
}) => (
	<>
		<CropMarks x={PX} y={PY} w={POSTER.w} h={POSTER.h} />
		{plates.map((p, k) => (
			<div key={k} style={{position: 'absolute', left: p.dx ?? 0, top: p.dy ?? 0, mixBlendMode: 'multiply'}}>
				<RegTarget x={PX - 62} y={POSTER.cy - 250} color={p.ink} />
				<RegTarget x={PX + POSTER.w + 62} y={POSTER.cy + 300} color={p.ink} />
			</div>
		))}
		<ProofColorBar x={PX + POSTER.w + 46} y={PY + 20} inks={Array.from(new Set(plates.map((p) => p.ink)))} />
		<Slug x={PX} y={PY + POSTER.h + 92} size={17} text={`FLATLINE · 0% · ${code} · 01:32`} />
		<Slug x={PX + POSTER.w - 440} y={PY + POSTER.h + 92} size={17} text={screen} />
	</>
);

const useSafeId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

// ------------------------------------------------------------------ the Rule as a live trace

/** The live trace runs from x0 to x1 (the write head, "now"); flat wire either side out to the frame edges. */
const TRACE = {x0: PX - 40, x1: PX + POSTER.w + 40, l: -260, r: 2180, win: 2.6};

/**
 * The opening's ECG, in ink: a scroll trace whose newest moment is at the write head (x1), so every beat's
 * spike is born there on the beat. `clip` limits drawing to a world-x range (for the key/heat split).
 */
const Trace: React.FC<{
	t: number;
	y?: number;
	amp: number;
	alive: (b: number) => boolean;
	color: string;
	width: number;
	clip?: [number, number];
	stubs?: boolean;
	tremor?: number;
	blend?: boolean;
	opacity?: number;
}> = ({t, y = WIRE_Y, amp, alive, color, width, clip, stubs = true, tremor = 0, blend = true, opacity = 1}) => {
	const id = useSafeId('tr');
	const {x0, x1, l, r, win} = TRACE;
	const live = beatsIn(t - win - 0.3, t + 0.001)
		.map((b) => b.t)
		.filter((b) => b <= t && alive(b));
	const pts: string[] = [];
	for (let px = x0; px <= x1 + 0.01; px += 1.5) {
		const tx = t - (1 - (px - x0) / (x1 - x0)) * win;
		let v = 0;
		for (const b of live) {
			const dt = tx - b;
			if (dt > -0.2 && dt < 0.25) v += ecg(dt);
		}
		pts.push(`${px.toFixed(1)},${(y - v * amp + tremor).toFixed(2)}`);
	}
	const [c0, c1] = clip ?? [l, r];
	return (
		<svg style={{position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', opacity, mixBlendMode: blend ? 'multiply' : 'normal'}}>
			<defs>
				<clipPath id={id}>
					<rect x={c0} y={y - amp * 2} width={Math.max(0, c1 - c0)} height={amp * 4} />
				</clipPath>
			</defs>
			<g clipPath={`url(#${id})`}>
				{stubs && <line x1={l} y1={y + tremor} x2={x0 + 1} y2={y + tremor} stroke={color} strokeWidth={width} />}
				{stubs && <line x1={x1 - 1} y1={y + tremor} x2={r} y2={y + tremor} stroke={color} strokeWidth={width} />}
				<polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
			</g>
		</svg>
	);
};

/** Trace value at the write head (for the pen dot). */
const headValue = (t: number, alive: (b: number) => boolean) => {
	let v = 0;
	for (const b of beatsIn(t - 0.3, t + 0.001)) if (b.t <= t && alive(b.t)) v += ecg(t - b.t);
	return v;
};

// ------------------------------------------------------------------ type set by its baseline

const AntonAt: React.FC<{x: number; base: number; size: number; color: string; children: React.ReactNode; s?: number; dx?: number; dy?: number; rot?: number; opacity?: number; seed?: number; spacing?: number}> = ({
	x,
	base,
	size,
	color,
	children,
	s = 1,
	dx = 0,
	dy = 0,
	rot = 0,
	opacity = 1,
	seed = 0,
	spacing = 0,
}) => (
	<div
		style={{
			position: 'absolute',
			left: x + dx,
			top: base - size * 0.924 + dy,
			fontFamily: ANTON,
			fontSize: size,
			lineHeight: 1,
			letterSpacing: spacing,
			whiteSpace: 'nowrap',
			color,
			opacity,
			mixBlendMode: 'multiply',
			transform: `rotate(${rot}deg) scale(${s})`,
			transformOrigin: '0% 85%',
			...inked(900, seed * 37, seed * 11, true),
		}}
	>
		{children}
	</div>
);

/** HR readout: label in Plex Mono, value in Anton with every glyph in a fixed box (Anton has no tabular figures). */
const Readout: React.FC<{right: number; base: number; size: number; value: string; ink: string; labelInk?: string; s?: number; cells?: number}> = ({right, base, size, value, ink, labelInk = INK.key, s = 1, cells = 3}) => {
	const box = size * 0.52;
	const chars = value.split('');
	const left = right - cells * box;
	return (
		<>
			<div style={{position: 'absolute', left, top: base - size * 0.924 - size * 0.06 - 36, fontFamily: MONO, fontWeight: 500, fontSize: 30, letterSpacing: '0.24em', color: labelInk, mixBlendMode: 'multiply'}}>
				HR <span style={{fontSize: 18, letterSpacing: '0.16em'}}>BPM</span>
			</div>
			<div
				style={{
					position: 'absolute',
					left: right - chars.length * box,
					top: base - size * 0.924,
					display: 'flex',
					fontFamily: ANTON,
					fontSize: size,
					lineHeight: 1,
					color: ink,
					mixBlendMode: 'multiply',
					transform: `scale(${s})`,
					transformOrigin: '100% 85%',
					...inked(700, 13, 29, true),
				}}
			>
				{chars.map((c, i) => (
					<span key={i} style={{display: 'inline-block', width: box, textAlign: 'center'}}>
						{c}
					</span>
				))}
			</div>
		</>
	);
};

// ------------------------------------------------------------------ 1:32 "Flatline": eight progressive proofs of P1

type ProofPlate = {ch: 0 | 1 | 2; ink: string; angle: number; kind?: 'dot' | 'line'; off?: boolean; gain?: number};
type Proof = {code: string; screen: string; paper?: string; plates: ProofPlate[]; mis: [number, number]; bar: string; ghost?: string};

// Orange is real life, ultramarine the screen world (a line screen, like the opening's memories). The cold proofs are
// the phone trying to come back; the last proof is black + orange in register: real life, printed.
const PROOFS: Proof[] = [
	{code: 'K', screen: 'K 45°  ·  85 LPI', plates: [{ch: 0, ink: INK.key, angle: 45}], mis: [0, 0], bar: INK.key},
	{code: 'O', screen: 'O 15°  ·  85 LPI', plates: [{ch: 1, ink: INK.heat, angle: 15}], mis: [0, 0], bar: INK.heat},
	{code: 'U', screen: 'U 75° LINE  ·  85 LPI', plates: [{ch: 2, ink: INK.cold, angle: 75, kind: 'line'}], mis: [0, 0], bar: INK.cold},
	{
		code: 'K+O',
		screen: 'K 45°  ·  O 15°  ·  OFF +9 −5',
		plates: [
			{ch: 1, ink: INK.heat, angle: 15, off: true},
			{ch: 0, ink: INK.key, angle: 45},
		],
		mis: [9, -5],
		bar: INK.key,
		ghost: INK.heat,
	},
	{code: 'K / O STOCK', screen: 'K 45°  ·  ORANGE STOCK', paper: INK.heat, plates: [{ch: 0, ink: INK.key, angle: 45}], mis: [0, 0], bar: INK.key},
	{
		code: 'U+O',
		screen: 'U 75° LINE  ·  O 15°  ·  OFF −7 +4',
		plates: [
			{ch: 1, ink: INK.heat, angle: 15, off: true},
			{ch: 0, ink: INK.cold, angle: 75, kind: 'line', gain: 1.15},
		],
		mis: [-7, 4],
		bar: INK.cold,
		ghost: INK.heat,
	},
	{code: 'U / O STOCK', screen: 'U 75° LINE  ·  ORANGE STOCK', paper: INK.heat, plates: [{ch: 2, ink: INK.cold, angle: 75, kind: 'line', gain: 0.9}], mis: [0, 0], bar: INK.cold},
	{
		code: 'K+O  OK',
		screen: 'K 45°  ·  O 15°  ·  IN REGISTER',
		plates: [
			{ch: 1, ink: INK.heat, angle: 15},
			{ch: 0, ink: INK.key, angle: 45},
		],
		mis: [0, 0],
		bar: INK.key,
	},
];

/** The proofs land on the eight beats of bars 49 and 50. */
const proofTimes = (): number[] => {
	const i = lastBeatIndex(F.flatline2 + 0.001);
	return PROOFS.map((_, k) => BEATS[i + k].t);
};
const PROOF_T = proofTimes();

const BAR = {x: PX - 40, y: WIRE_Y - 125, w: POSTER.w + 80, h: 250, size: 232};
const TRAP = 13; // paper rim round the letters: 6.5 px

/** FLATLINE knocked out of a bar of the proof's ink, the misregistered plate's ghost under it, the monitor in it. */
const ProofBar: React.FC<{proof: Proof; paper: string; dx: number; dy: number; hr: number}> = ({proof, paper, dx, dy, hr}) => {
	const id = useSafeId('pb');
	const {w, h, size} = BAR;
	// trap > 0 opens the ink's hole wider than the letter, leaving a paper rim so the word reads on every proof
	const text = (fill: string, trap = 0) => (
		<text x={w / 2 + size * 0.02} y={h / 2 + size * 0.37} textAnchor="middle" fontFamily="Anton" fontSize={size} letterSpacing={size * 0.04} fill={fill} stroke={trap ? fill : 'none'} strokeWidth={trap} strokeLinejoin="round">
			FLATLINE
		</text>
	);
	const hrText = (fill: string) => (
		<text x={w - 34} y={h / 2 + 76} textAnchor="end" fontFamily="IBM Plex Mono" fontWeight={500} fontSize={30} letterSpacing={30 * 0.2} fill={fill}>
			HR – – –
		</text>
	);
	const svg = (style: React.CSSProperties, children: React.ReactNode) => (
		<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
			{children}
		</svg>
	);
	return (
		<>
			{/* paper under the solid, so the photo only shows through the letters */}
			{svg(
				{},
				<>
					<defs>
						<mask id={`${id}p`}>
							<rect x={-20} y={-20} width={w + 40} height={h + 40} fill="white" />
							{text('black')}
						</mask>
					</defs>
					<rect width={w} height={h} fill={paper} mask={`url(#${id}p)`} />
				</>,
			)}
			{proof.ghost &&
				svg(
					{left: dx, top: dy, mixBlendMode: 'multiply', ...inked(800, 57, 21, true)},
					<>
						<defs>
							<mask id={`${id}g`}>
								<rect x={-20} y={-20} width={w + 40} height={h + 40} fill="white" />
								{text('black', TRAP)}
								{hr > 0 && hrText('black')}
							</mask>
						</defs>
						<rect width={w} height={h} fill={proof.ghost} mask={`url(#${id}g)`} />
					</>,
				)}
			{svg(
				{mixBlendMode: 'multiply', ...inked(800, 31, 7, true)},
				<>
					<defs>
						<mask id={`${id}k`}>
							<rect x={-20} y={-20} width={w + 40} height={h + 40} fill="white" />
							{text('black', TRAP)}
							{hr > 0 && <g opacity={hr}>{hrText('black')}</g>}
						</mask>
					</defs>
					<rect width={w} height={h} fill={proof.bar} mask={`url(#${id}k)`} />
				</>,
			)}
		</>
	);
};

/** Colour bar that inks only the swatches this proof carries. */
const ProofColorBar: React.FC<{x: number; y: number; inks: string[]; cell?: number}> = ({x, y, inks, cell = 30}) => {
	const has = (c: string) => inks.includes(c);
	const sw: [string, boolean][] = [
		[INK.key, has(INK.key)],
		[INK.heat, has(INK.heat)],
		[INK.cold, has(INK.cold)],
		['#2B1618', has(INK.heat) && (has(INK.key) || has(INK.cold))],
		['rgba(27,26,23,0.5)', has(INK.key)],
		['rgba(255,95,31,0.5)', has(INK.heat)],
		['rgba(43,58,201,0.5)', has(INK.cold)],
		['rgba(27,26,23,0.25)', has(INK.key)],
		['rgba(255,95,31,0.25)', has(INK.heat)],
		['rgba(43,58,201,0.25)', has(INK.cold)],
	];
	return (
		<div style={{position: 'absolute', left: x, top: y, display: 'flex', flexDirection: 'column', mixBlendMode: 'multiply', ...inked(512)}}>
			{sw.map(([c, on], i) => (
				<div key={i} style={{width: cell, height: cell, background: on ? c : 'transparent', outline: '1px solid rgba(27,26,23,0.3)'}} />
			))}
		</div>
	);
};

export const Progs: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P1']);
	let n = 0;
	while (n + 1 < PROOF_T.length && PROOF_T[n + 1] <= t) n++;
	const proof = PROOFS[n];
	const t0 = PROOF_T[n];
	const since = t - t0;
	const cam = sheetCam(t);
	const paper = proof.paper ?? INK.paper;
	// each proof lands: the impression jolts the plates and the fresh ink runs fat for a few frames
	const ang = hash2(n, 3, 41) * Math.PI * 2;
	const jolt = 8 * Math.exp(-since / 0.05);
	const jx = Math.cos(ang) * jolt;
	const jy = Math.sin(ang) * jolt;
	const fresh = 1 + 0.32 * Math.exp(-since / 0.07);
	const offs = proof.plates.map((p, k) => {
		const [kx, ky] = kickNudge(t, k + n * 3, 1.6);
		const [mx, my] = p.off ? proof.mis : [0, 0];
		return [mx + jx + kx, my + jy + ky] as [number, number];
	});
	const plates: Plate[] = proof.plates.map((p, k) => ({
		ch: p.ch,
		ink: p.ink,
		angle: p.angle,
		cell: p.kind === 'line' ? 9 : 8.5,
		kind: p.kind,
		gain: (p.gain ?? 1) * fresh,
		dx: offs[k][0],
		dy: offs[k][1],
	}));
	const bar = stamp(t, F.flatline2);
	// the readout slug inks in on 49.2 and is fully on by 92.672 (the plan's cue, F.flatline2 + 0.5)
	const hr = clamp01((t - PROOF_T[1]) / (F.flatline2 + 0.5 - PROOF_T[1]));
	// the opening's lime wire turns to ink over the first half-beat
	const lime = 1 - easeOut((t - F.flatline2) / 0.45);
	const offAt = proof.plates.findIndex((p) => p.off);
	const ghost = proof.ghost && offAt >= 0 ? offs[offAt] : [0, 0];
	const alive = (b: number) => b >= F.flatline2;
	const amp = 56;
	return (
		<AbsoluteFill style={{background: paper}}>
			<CamLayer cam={cam}>
				<Paper tint={proof.paper} />
			</CamLayer>
			{d && <Press cam={cam} sheets={[posterSheet(d.P1, plates)]} />}
			<CamLayer cam={cam}>
				<SheetMarks plates={proof.plates.map((p, k) => ({ink: p.ink, dx: offs[k][0], dy: offs[k][1]}))} code={`PROG ${n + 1}/8 · ${proof.code}`} screen={proof.screen} />
				{/* the wire: lime from the hand-over, then the Rule in ink. Flat stubs either side of the bar. */}
				<Trace t={t} amp={amp} alive={alive} color={INK.key} width={4} opacity={1 - lime} />
				{lime > 0 && <Trace t={t} amp={amp} alive={alive} color={INK.lime} width={4} opacity={lime} blend={false} />}
				<div
					style={{
						position: 'absolute',
						left: BAR.x,
						top: BAR.y,
						width: BAR.w,
						height: BAR.h,
						transform: `scale(${bar.s})`,
						transformOrigin: '50% 50%',
					}}
				>
					<ProofBar proof={proof} paper={paper} dx={ghost[0]} dy={ghost[1]} hr={hr} />
					{/* the monitor inside the bar: the trace knocked out of the ink, spikes born at the right end on every kick */}
					<div style={{position: 'absolute', left: -BAR.x, top: -BAR.y}}>
						<Trace t={t} amp={amp} alive={alive} color={paper} width={4} clip={[BAR.x + 2, BAR.x + BAR.w - 2]} stubs={false} blend={false} />
						{lime > 0 && <Trace t={t} amp={amp} alive={alive} color={INK.lime} width={4} clip={[BAR.x + 2, BAR.x + BAR.w - 2]} stubs={false} blend={false} opacity={lime} />}
					</div>
				</div>
			</CamLayer>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ 1:36 "My heart stopped... and I started": type on ECG paper

/** ECG chart paper printed in a light orange: lurches one major square per beat while the heart beats, dead still while it doesn't. */
const EcgPaper: React.FC<{shift: number}> = ({shift}) => {
	const id = useSafeId('ecg');
	const M = 60;
	const m = 12;
	const off = -((shift * M) % M);
	return (
		<svg style={{position: 'absolute', left: -400, top: -300, width: 2800, height: 1700, mixBlendMode: 'multiply', ...inked(1024, 0, 0)}}>
			<defs>
				<pattern id={`${id}m`} width={m} height={m} patternUnits="userSpaceOnUse" x={off + 400} y={300 + WIRE_Y}>
					<path d={`M${m} 0V${m}H0`} fill="none" stroke={INK.heat} strokeOpacity={0.16} strokeWidth={1} />
				</pattern>
				<pattern id={`${id}M`} width={M} height={M} patternUnits="userSpaceOnUse" x={off + 400} y={300 + WIRE_Y}>
					<path d={`M${M} 0V${M}H0`} fill="none" stroke={INK.heat} strokeOpacity={0.42} strokeWidth={1.6} />
				</pattern>
			</defs>
			<rect width={2800} height={1700} fill={`url(#${id}m)`} />
			<rect width={2800} height={1700} fill={`url(#${id}M)`} />
		</svg>
	);
};

const HEART = {
	x: 150,
	base: 462, // MY HEART, the readout and "and I started" sit on this line, above the Rule
	size: 290,
	stoppedTop: 592, // STOPPED hangs from the Rule
	hrRight: 1772,
	hrSize: 236,
};
const STOPPED_BASE = HEART.stoppedTop + HEART.size * 0.86;
const STOPPED_W = HEART.size * 3.19; // Anton advance width of "STOPPED" (798/250)
const DOTS = (() => {
	const i = lastBeatIndex(F.stopped + 0.001);
	// the three beats of bar 52 (97.686, 98.139, 98.592): one ink dot each
	return BEATS.slice(i + 1, i + 6)
		.filter((b) => b.bar === BEATS[i].bar + 1 && b.beat <= 3)
		.map((b) => b.t);
})();

/** Her heart rate is the song's tempo at t (60 / the last grid interval: 129, 132, 129...). */
const tempoAt = (t: number) => {
	const i = Math.max(1, Math.min(BEATS.length - 1, lastBeatIndex(t)));
	return 60 / (BEATS[i].t - BEATS[i - 1].t);
};

const easeIn3 = (x: number) => Math.pow(clamp01(x), 2.6);

/** Words knocked off the page on "and I started": a kick down and a spin, gone in about 8 frames. */
const fall = (t: number, k: number) => {
	const dt = Math.max(0, t - F.started);
	if (dt <= 0) return {y: 0, rot: 0, o: 1};
	// knocked: already a third of a line down on the first frame, so "and I started" lands on clear paper
	return {y: 210 + 3000 * dt + 6000 * dt * dt * (1 + 0.15 * k), rot: (k % 2 ? 1 : -1) * (6 + 3 * k) * easeOut(dt / 0.15), o: 0.42 * (1 - clamp01(dt / 0.15))};
};

export const Heart: React.FC<{t: number}> = ({t}) => {
	const stopped = t >= F.stopped;
	const started = t >= F.started;
	const hold = stopped && !started;
	// the paper drifts on from the proofs, stops dead on "stopped" and moves again on "started"
	const live = Math.min(t, F.stopped) - F.heart + (started ? t - F.started : 0);
	// from "started" the camera accelerates in on the line, into the DANCING slam
	const push = started ? easeIn3((t - F.started) / (F.dancing - F.started)) : 0;
	const cx0 = sheetCam(F.flatline2).cx - 7 * live;
	const cam: Cam = {cx: cx0 + (962 - cx0) * push, cy: 540 - 100 * push, s: 1 + 0.14 * push};
	// the chart paper lurches one square per beat while there is a beat
	let shift = 0;
	for (const b of beatsIn(F.heart - 0.001, t + 0.001)) {
		if (b.t > t || (b.t >= F.stopped && b.t < F.started)) continue;
		shift += easeOut((t - b.t) / 0.14);
	}
	const amp = 56;
	const aliveOld = (b: number) => b >= F.flatline2 && b < F.stopped && !stopped;
	const aliveNew = (b: number) => b >= F.started;
	const xStart = TRACE.x1 - ((t - F.started) / TRACE.win) * (TRACE.x1 - TRACE.x0);
	const tremor = hold ? Math.sin(t * 91) * 0.9 : 0;
	const my = stamp(t, F.heart);
	const st = stamp(t, F.stopped);
	// MY HEART beats twice in heat (a misregistered pulse) before it stops
	const bi = lastBeatIndex(t);
	const pulseK = !stopped && BEATS[bi].t >= F.heart ? Math.exp(-(t - BEATS[bi].t) / 0.11) : 0;
	const pa = hash2(bi, 7, 3) * Math.PI * 2;
	const gx = Math.cos(pa) * 11 * pulseK;
	const gy = Math.sin(pa) * 7 * pulseK;
	// HR: – – – until "stopped", 0 through the stop, then counting up to the live tempo by F.started + 1.4
	const countK = easeOut((t - F.started) / 1.4);
	const hrVal = !stopped ? '–––' : !started ? '0' : String(Math.round(tempoAt(t) * countK));
	const hrInk = started ? INK.heat : INK.key;
	const hrS = !stopped ? my.s : !started ? st.s : t < F.started + 1.4 ? 1 : stamp(t, BEATS[bi].t).s;
	const head = started ? headValue(t, aliveNew) : stopped ? 0 : headValue(t, aliveOld);
	const words = fall(t, 0);
	const words2 = fall(t, 1);
	const startedS = stamp(t, F.started);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
				<EcgPaper shift={shift} />
				{/* the Rule: key while the old heart runs, dead flat on "stopped", heat from the first new beat */}
				<Trace t={t} amp={amp} alive={started ? () => false : aliveOld} color={INK.key} width={5} tremor={tremor} clip={started ? [TRACE.l, xStart + 1] : undefined} />
				{started && <Trace t={t} amp={amp} alive={aliveNew} color={INK.heat} width={6} clip={[xStart - 1, TRACE.r]} stubs />}
				<div
					style={{
						position: 'absolute',
						left: TRACE.x1 - 9,
						top: WIRE_Y - head * amp + tremor - 9,
						width: 18,
						height: 18,
						borderRadius: 9,
						background: started ? INK.heat : INK.key,
						mixBlendMode: 'multiply',
					}}
				/>
				{words.o > 0 && (
					<>
						<div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${words.y}px) rotate(${words.rot}deg)`, transformOrigin: `${HEART.x + 500}px ${HEART.base}px`, opacity: words.o}}>
							{pulseK > 0.02 && (
								<AntonAt x={HEART.x} base={HEART.base} size={HEART.size} color={INK.heat} s={my.s} dx={gx} dy={gy} seed={2}>
									MY HEART
								</AntonAt>
							)}
							<AntonAt x={HEART.x} base={HEART.base} size={HEART.size} color={INK.key} s={my.s} seed={1}>
								MY HEART
							</AntonAt>
						</div>
						<div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${words2.y}px) rotate(${words2.rot}deg)`, transformOrigin: `${HEART.x + 450}px ${STOPPED_BASE}px`, opacity: words2.o}}>
							{st.on && (
								<AntonAt x={HEART.x} base={STOPPED_BASE} size={HEART.size} color={INK.heat} s={st.s} seed={3}>
									STOPPED
								</AntonAt>
							)}
							{DOTS.map((b, i) => {
								if (t < b) return null;
								const s = stamp(t, b).s;
								const D = 70;
								return (
									<div
										key={i}
										style={{
											position: 'absolute',
											left: HEART.x + STOPPED_W + 46 + i * 108,
											top: STOPPED_BASE - D,
											width: D,
											height: D,
											borderRadius: '50%',
											background: INK.key,
											mixBlendMode: 'multiply',
											transform: `scale(${s})`,
											...inked(300, i * 50, 0, true),
										}}
									/>
								);
							})}
						</div>
					</>
				)}
				{started && (
					<div
						style={{
							position: 'absolute',
							left: HEART.x - 8,
							top: HEART.base - 236 * 0.84,
							fontFamily: SERIF,
							fontStyle: 'italic',
							fontSize: 236,
							lineHeight: 1,
							whiteSpace: 'nowrap',
							color: INK.key,
							mixBlendMode: 'multiply',
							transform: `scale(${startedS.s})`,
							transformOrigin: '0% 85%',
							...inked(800, 17, 5, true),
						}}
					>
						and I started
					</div>
				)}
				<Readout right={HEART.hrRight} base={HEART.base} size={HEART.hrSize} value={hrVal} ink={hrInk} s={hrS} />
				<Slug x={HEART.x} y={1012} size={17} text={`FLATLINE · 1:36 · LEAD II · 25 mm/s · 10 mm/mV`} />
				<Slug x={HEART.hrRight - 250} y={1012} size={17} text={started ? 'SINUS · PRINT 2/2' : stopped ? 'ASYSTOLE' : 'NO SIGNAL'} />
			</CamLayer>
		</AbsoluteFill>
	);
};
