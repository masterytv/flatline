import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {BEATS, beatsIn, lastBeatIndex} from '../timing';
import {useDensities} from './density';
import {ANTON, hash2, INK, MONO, SERIF} from './ink';
import {clamp01, CropMarks, easeOut, ecg, inked, kickNudge, RegTarget, Slug, stamp} from './kit';
import {Cam, Plate, Sheet} from './halftone';
import {CamLayer, Paper, Press} from './Press';
import {Frame, K_FILL, useStage, VMap, vtrack} from './stage';

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
type TraceGeo = {x0: number; x1: number; l: number; r: number; win: number};
const TRACE: TraceGeo = {x0: PX - 40, x1: PX + POSTER.w + 40, l: -260, r: 2180, win: 2.6};

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
	geo?: TraceGeo;
}> = ({t, y = WIRE_Y, amp, alive, color, width, clip, stubs = true, tremor = 0, blend = true, opacity = 1, geo = TRACE}) => {
	const id = useSafeId('tr');
	const {x0, x1, l, r, win} = geo;
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
const Readout: React.FC<{right: number; base: number; size: number; value: string; ink: string; labelInk?: string; s?: number; cells?: number; label?: number}> = ({
	right,
	base,
	size,
	value,
	ink,
	labelInk = INK.key,
	s = 1,
	cells = 3,
	label = 30,
}) => {
	const box = size * 0.52;
	const chars = value.split('');
	const left = right - cells * box;
	return (
		<>
			<div style={{position: 'absolute', left, top: base - size * 0.924 - size * 0.06 - 36 * (label / 30), fontFamily: MONO, fontWeight: 500, fontSize: label, letterSpacing: '0.24em', color: labelInk, mixBlendMode: 'multiply'}}>
				HR <span style={{fontSize: label * 0.6, letterSpacing: '0.16em'}}>BPM</span>
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

type ProofPlate = {ch: 0 | 1 | 2; ink: string; angle: number; kind?: 'dot' | 'line'; off?: boolean; gain?: number; gamma?: number};
/** `rim`: the misregistered plate prints only where the bar's ink doesn't, a fringe at the edges and in the letters. */
type Proof = {code: string; screen: string; paper?: string; plates: ProofPlate[]; mis: [number, number]; bar: string; ghost?: string; rim?: boolean};

/** Pale orange stock for the cold-on-orange proof: on full heat stock ultramarine multiplies to brown. */
const PALE_STOCK = '#FFB383';

// Orange is real life, ultramarine the screen world (a line screen, like the opening's memories). The cold proofs are
// the phone trying to come back; the last proof is black + orange in register: real life, printed.
// The single-ink proofs run thinner (gain ~0.8, a little gamma) so the crowd under the bar opens up instead of
// printing as a slab.
const PROOFS: Proof[] = [
	{code: 'K', screen: 'K 45°  ·  85 LPI', plates: [{ch: 0, ink: INK.key, angle: 45, gain: 0.8, gamma: 1.2}], mis: [0, 0], bar: INK.key},
	{code: 'O', screen: 'O 15°  ·  85 LPI', plates: [{ch: 1, ink: INK.heat, angle: 15, gain: 0.8, gamma: 1.2}], mis: [0, 0], bar: INK.heat},
	{code: 'U', screen: 'U 75° LINE  ·  85 LPI', plates: [{ch: 2, ink: INK.cold, angle: 75, kind: 'line', gain: 0.84}], mis: [0, 0], bar: INK.cold},
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
	{code: 'K / O STOCK', screen: 'K 45°  ·  ORANGE STOCK', paper: INK.heat, plates: [{ch: 0, ink: INK.key, angle: 45, gain: 0.84, gamma: 1.15}], mis: [0, 0], bar: INK.key},
	{
		code: 'U+O',
		screen: 'U 75° LINE  ·  O 15°  ·  OFF −7 +4',
		plates: [
			{ch: 1, ink: INK.heat, angle: 15, off: true, gain: 0.6, gamma: 1.2},
			{ch: 0, ink: INK.cold, angle: 75, kind: 'line', gain: 1.1},
		],
		mis: [-7, 4],
		bar: INK.cold,
		ghost: INK.heat,
		rim: true,
	},
	{code: 'U / O STOCK', screen: 'U 75° LINE  ·  PALE ORANGE STOCK', paper: PALE_STOCK, plates: [{ch: 2, ink: INK.cold, angle: 75, kind: 'line', gain: 0.9}], mis: [0, 0], bar: INK.cold},
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
/**
 * 9:16 only: the screen per proof. The camera punches in 2-3x, so on the proofs it frames on a face the screen
 * runs finer (faces stay faces); on the hands, the lantern and the details the big dots are the look.
 */
const V_CELL = [1, 0.62, 1, 0.62, 1, 0.62, 1, 0.62];

const BAR = {x: PX - 40, y: WIRE_Y - 125, w: POSTER.w + 80, h: 250, size: 232};
const TRAP = 13; // paper rim round the letters: 6.5 px

/** FLATLINE knocked out of a bar of the proof's ink, the misregistered plate's ghost under it, the monitor in it. */
type BarGeo = {w: number; h: number; size: number; hr: {x: number; y: number; size: number}};
const BAR_GEO: BarGeo = {w: BAR.w, h: BAR.h, size: BAR.size, hr: {x: BAR.w - 34, y: BAR.h / 2 + 76, size: 30}};

const ProofBar: React.FC<{proof: Proof; paper: string; dx: number; dy: number; hr: number; geo?: BarGeo}> = ({proof, paper, dx, dy, hr, geo = BAR_GEO}) => {
	const id = useSafeId('pb');
	const {w, h, size} = geo;
	// trap > 0 opens the ink's hole wider than the letter, leaving a paper rim so the word reads on every proof
	const text = (fill: string, trap = 0) => (
		<text x={w / 2 + size * 0.02} y={h / 2 + size * 0.37} textAnchor="middle" fontFamily="Anton" fontSize={size} letterSpacing={size * 0.04} fill={fill} stroke={trap ? fill : 'none'} strokeWidth={trap} strokeLinejoin="round">
			FLATLINE
		</text>
	);
	const hrText = (fill: string) => (
		<text x={geo.hr.x} y={geo.hr.y} textAnchor="end" fontFamily="IBM Plex Mono" fontWeight={500} fontSize={geo.hr.size} letterSpacing={geo.hr.size * 0.2} fill={fill}>
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
							<mask id={`${id}g`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={w + 120} height={h + 120}>
								<rect x={-60} y={-60} width={w + 120} height={h + 120} fill="white" />
								{proof.rim && (
									// only where the bar's own ink doesn't print: its edges and the trapped letter windows
									<g transform={`translate(${-dx} ${-dy})`}>
										<rect width={w} height={h} fill="black" />
										{text('white', TRAP)}
										{hr > 0 && <g opacity={hr}>{hrText('white')}</g>}
									</g>
								)}
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

/** The proof on the press at t, and each plate's offset (misregistration + the impression's jolt + the kick nudge). */
const proofAt = (t: number) => {
	let n = 0;
	while (n + 1 < PROOF_T.length && PROOF_T[n + 1] <= t) n++;
	const proof = PROOFS[n];
	const since = t - PROOF_T[n];
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
	const offAt = proof.plates.findIndex((p) => p.off);
	const ghost = proof.ghost && offAt >= 0 ? offs[offAt] : [0, 0];
	// the readout slug inks in on 49.2 and is fully on by 92.672 (the plan's cue, F.flatline2 + 0.5)
	const hr = clamp01((t - PROOF_T[1]) / (F.flatline2 + 0.5 - PROOF_T[1]));
	return {n, proof, paper: proof.paper ?? INK.paper, fresh, offs, ghost, hr};
};

export const Progs: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P1']);
	const {vertical} = useStage();
	const {n, proof, paper, fresh, offs, ghost, hr} = proofAt(t);
	const cam = sheetCam(t);
	const plates: Plate[] = proof.plates.map((p, k) => ({
		ch: p.ch,
		ink: p.ink,
		angle: p.angle,
		cell: (p.kind === 'line' ? 9 : 8.5) * (vertical ? V_CELL[n] : 1),
		kind: p.kind,
		gain: (p.gain ?? 1) * fresh,
		gamma: p.gamma,
		dx: offs[k][0],
		dy: offs[k][1],
	}));
	const bar = stamp(t, F.flatline2);
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
				{/* the wire: the hand-over's lime wire becomes the Rule in key ink on the hit. Flat stubs either side of the bar.
				    (9:16: the bar and the wire are re-laid in the vertical frame itself, see ProgsBand) */}
				{!vertical && <Trace t={t} amp={amp} alive={alive} color={INK.key} width={4} />}
				{!vertical && (
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
						</div>
					</div>
				)}
			</CamLayer>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ 9:16: the proofs

/** Hand-over contract for the 9:16 cut: the camera crosses 92.172 full bleed on the stage centre. */
const SEAM: Frame = {k: K_FILL, x: 960, y: 540};

/**
 * A cut on t0 that lands a touch tight and settles onto `f` within `settle` s: the camera's own impression.
 * (vtrack holds each key until the next, reaching it over the given seconds before it.)
 */
const hit = (t0: number, f: Frame, punch = 1.07, settle = 0.16, ax = f.x): [number, Frame, number?][] => [
	// the punch scales about stage x `ax` (default the frame's centre), so a left-aligned page can keep its margin
	[t0, {...f, k: f.k * punch, x: ax - (ax - f.x) / punch}],
	[t0 + settle, f, settle],
];

/**
 * The FLATLINE bar on the phone, in frame px: one line of type (cap ~200 px, 70..890) knocked out of a band that
 * bleeds off the left edge and ends at x 960, where the wire carries on as a key line to the right edge. The wire
 * sits at the frame's centre (y 960), where the hand-over's lime wire crosses the seam, and where Heart's Rule runs.
 * Above and below the band, and through its letters, the camera's window onto each proof.
 */
const VB = {x: -10, w: 970, cy: 960, h: 320, size: 235, amp: 74};
const VB_GEO: BarGeo = {w: VB.w, h: VB.h, size: VB.size, hr: {x: VB.w - 30, y: VB.h - 24, size: 28}};
/** The phone's trace: the same speed (463 px/s) and write head (x 960) in Progs' band and on Heart's page. */
const V_TRACE_SPEED = 463;
const VB_TRACE: TraceGeo = {x0: VB.x, x1: VB.x + VB.w, l: -60, r: 1140, win: VB.w / V_TRACE_SPEED};

const ProgsBand: React.FC<{t: number}> = ({t}) => {
	const {proof, paper, ghost, hr} = proofAt(t);
	const bar = stamp(t, F.flatline2);
	const alive = (b: number) => b >= F.flatline2;
	const top = VB.cy - VB.h / 2;
	return (
		<AbsoluteFill>
			{/* the wire: under the band, out of its right end to the frame edge */}
			<Trace t={t} y={VB.cy} amp={VB.amp} alive={alive} color={INK.key} width={6} geo={VB_TRACE} />
			<div style={{position: 'absolute', left: VB.x, top, width: VB.w, height: VB.h, transform: `scale(${bar.s})`, transformOrigin: '50% 50%'}}>
				{/* the ghost plate's misregistration reads at phone scale doubled, like the photo's under the camera */}
				<ProofBar proof={proof} paper={paper} dx={ghost[0] * 2} dy={ghost[1] * 2} hr={hr} geo={VB_GEO} />
				<div style={{position: 'absolute', left: -VB.x, top: -top}}>
					<Trace t={t} y={VB.cy} amp={VB.amp} alive={alive} color={paper} width={6} clip={[VB.x + 2, VB.x + VB.w - 2]} stubs={false} blend={false} geo={VB_TRACE} />
				</div>
			</div>
		</AbsoluteFill>
	);
};

/**
 * Progs on the phone: every proof is its own window onto P1, cut on its beat and settling from a 7% punch. The band
 * covers the frame's middle (y 800-1120), so each window puts the hands, the lantern or a face above it and the
 * friends' faces below it. P1 in stage px: lantern (1054, 211), Kai (681, 614), Jess (924, 630), Dev (1176, 619),
 * Sam (1212, 730), the big blurred hand (1267, 343), the pointing hands left (604, 300) and right (1510, 255).
 *
 * The print runs from stage y 56 to 904 (848 tall), so a window only bleeds top and bottom at k >= 2.27, centred
 * near y 480; below that the sheet's bare margin shows as a strip of paper at the top or bottom of the frame. Every
 * window after the push is at least k 2.35 on y ~480; the push itself stays at 2.15 with the print's bottom edge just
 * out of frame, because the key plate leaves the ceiling bare, so the top margin above it doesn't read.
 */
const [Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8] = PROOF_T;
const PROGS_V = vtrack([
	// 49.1 K, the shout: continuous with the hand-over, then a snap push onto the big hand and Dev's hands (the key
	// plate leaves the pale ceiling and the faces almost bare, so the window goes where the black is)
	[Q1, SEAM],
	[Q1 + 0.34, {k: 2.15, x: 1130, y: 450}, 0.26],
	// 49.2 O: Kai's pointing hands above the bar, Kai singing below it
	...hit(Q2, {k: 2.35, x: 690, y: 480}),
	// 49.3 U line: the lantern, cold, whole above the bar; Jess and Dev under it
	...hit(Q3, {k: 2.35, x: 1060, y: 480}),
	// 49.4 K+O off register: Jess, her hand up above the bar, her face below it
	...hit(Q4, {k: 2.5, x: 905, y: 488}),
	// 50.1 K on orange stock: the pointing hand top right, a detail
	...hit(Q5, {k: 2.8, x: 1470, y: 420}),
	// 50.2 U+O off: Dev and Sam, the big hand above them
	...hit(Q6, {k: 2.6, x: 1190, y: 500}),
	// 50.3 U on pale stock: the big hand reaching into the lantern
	...hit(Q7, {k: 3.0, x: 1190, y: 400}),
	// 50.4 K+O in register: whip left and out to Kai and Jess laughing, the hands up above the bar and the lantern's
	// edge at the top right (the whole crowd would need k < 2.27, which letterboxes the print)
	[Q8, {k: 2.35, x: 815, y: 480}, 0.14],
]);

// ------------------------------------------------------------------ 1:36 "My heart stopped... and I started": type on ECG paper

/** ECG chart paper printed in a light orange: lurches one major square per beat while the heart beats, dead still while it doesn't. */
const EcgPaper: React.FC<{shift: number; box?: {x: number; y: number; w: number; h: number}}> = ({shift, box = {x: -400, y: -300, w: 2800, h: 1700}}) => {
	const id = useSafeId('ecg');
	const M = 60;
	const m = 12;
	const off = -((shift * M) % M);
	return (
		<svg style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, mixBlendMode: 'multiply', ...inked(1024, 0, 0)}}>
			<defs>
				<pattern id={`${id}m`} width={m} height={m} patternUnits="userSpaceOnUse" x={off - box.x} y={WIRE_Y - box.y}>
					<path d={`M${m} 0V${m}H0`} fill="none" stroke={INK.heat} strokeOpacity={0.16} strokeWidth={1} />
				</pattern>
				<pattern id={`${id}M`} width={M} height={M} patternUnits="userSpaceOnUse" x={off - box.x} y={WIRE_Y - box.y}>
					<path d={`M${M} 0V${M}H0`} fill="none" stroke={INK.heat} strokeOpacity={0.42} strokeWidth={1.6} />
				</pattern>
			</defs>
			<rect width={box.w} height={box.h} fill={`url(#${id}m)`} />
			<rect width={box.w} height={box.h} fill={`url(#${id}M)`} />
		</svg>
	);
};

const HEART = {
	x: 150,
	base: 462, // MY HEART, the readout and "and I" sit on this line, above the Rule
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

/** The monitor finds her rate on the beat after MY HEART lands (51.2); until then it reads – – – (acquiring). */
const ACQ = BEATS[lastBeatIndex(F.heart + 0.001) + 1].t;

/** "and I / started": the human voice takes MY HEART's and STOPPED's slots on the page. */
const AND_I = {size: 300};
const STARTED = {size: 470, base: HEART.stoppedTop - 4 + 470 * 0.743}; // the 'd' ascender (0.743 em) hangs from the Rule like STOPPED

/** Italic set by its baseline. The box is padded so the ink mask doesn't clip the italic overhangs. */
const SerifAt: React.FC<{x: number; base: number; size: number; color: string; s: number; seed: number; children: React.ReactNode}> = ({x, base, size, color, s, seed, children}) => (
	<div
		style={{
			position: 'absolute',
			left: x - size * 0.3,
			top: base - size * 0.84,
			padding: `0 ${size * 0.3}px`,
			fontFamily: SERIF,
			fontStyle: 'italic',
			fontSize: size,
			lineHeight: 1,
			whiteSpace: 'nowrap',
			color,
			mixBlendMode: 'multiply',
			transform: `scale(${s})`,
			transformOrigin: `${size * 0.3}px 85%`,
			...inked(800, seed * 17, seed * 5, true),
		}}
	>
		{children}
	</div>
);

export const Heart: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	if (vertical) return <HeartV t={t} />;
	const stopped = t >= F.stopped;
	const started = t >= F.started;
	const hold = stopped && !started;
	// the paper drifts on from the proofs, stops dead on "stopped" and moves again on "started"
	const live = Math.min(t, F.stopped) - F.heart + (started ? t - F.started : 0);
	// from "started" the camera pushes in on the page from the first frame (gentle ease-in, into the DANCING slam),
	// and every new beat pumps it a little: the heart is back
	const bi = lastBeatIndex(t);
	const push = started ? Math.pow(clamp01((t - F.started) / (F.dancing - F.started)), 1.5) : 0;
	const pump = started && BEATS[bi].t >= F.started ? 0.014 * Math.exp(-(t - BEATS[bi].t) / 0.09) : 0;
	const cx0 = sheetCam(F.flatline2).cx - 7 * live;
	// re-centred on the page (type 140–1830 wide, 200–890 tall) so the push crops both sides evenly
	const cam: Cam = {cx: cx0 + (944 - cx0) * push, cy: 540 + 6 * push, s: 1 + 0.08 * push + pump};
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
	const pulseK = !stopped && BEATS[bi].t >= F.heart ? Math.exp(-(t - BEATS[bi].t) / 0.11) : 0;
	const pa = hash2(bi, 7, 3) * Math.PI * 2;
	const gx = Math.cos(pa) * 11 * pulseK;
	const gy = Math.sin(pa) * 7 * pulseK;
	// HR: – – – while the monitor acquires (one beat), then her rate on every beat while the trace beats, 0 through
	// the stop, then counting up to the live tempo by F.started + 1.4 and ticking it on every beat
	const acquiring = t < ACQ;
	const countK = easeOut((t - F.started) / 1.4);
	const hrVal = !stopped ? (acquiring ? '–––' : String(Math.round(tempoAt(t)))) : !started ? '0' : String(Math.round(tempoAt(t) * countK));
	const hrInk = started ? INK.heat : INK.key;
	const hrS = !stopped ? (acquiring ? my.s : stamp(t, BEATS[bi].t).s) : !started ? st.s : t < F.started + 1.4 ? 1 : stamp(t, BEATS[bi].t).s;
	const head = started ? headValue(t, aliveNew) : stopped ? 0 : headValue(t, aliveOld);
	const startedS = stamp(t, F.started);
	const slug = started ? 'SINUS RHYTHM · PRINT 2/2' : stopped ? 'ASYSTOLE' : acquiring ? 'ACQUIRING' : 'SINUS RHYTHM';
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
				{/* on "and I started" the page is cleared on the hit: no words fall through the new ones */}
				{!started && (
					<>
						{pulseK > 0.02 && (
							<AntonAt x={HEART.x} base={HEART.base} size={HEART.size} color={INK.heat} s={my.s} dx={gx} dy={gy} seed={2}>
								MY HEART
							</AntonAt>
						)}
						<AntonAt x={HEART.x} base={HEART.base} size={HEART.size} color={INK.key} s={my.s} seed={1}>
							MY HEART
						</AntonAt>
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
					</>
				)}
				{/* "and I" takes MY HEART's place on the line; "started" hangs from the Rule where STOPPED was, in heat (life) */}
				{started && (
					<>
						<SerifAt x={HEART.x - 10} base={HEART.base} size={AND_I.size} color={INK.key} s={startedS.s} seed={1}>
							and I
						</SerifAt>
						<SerifAt x={HEART.x - 22} base={STARTED.base} size={STARTED.size} color={INK.heat} s={startedS.s} seed={2}>
							started
						</SerifAt>
					</>
				)}
				<Readout right={HEART.hrRight} base={HEART.base} size={HEART.hrSize} value={hrVal} ink={hrInk} s={hrS} />
				<Slug x={HEART.x} y={1012} size={17} text={`FLATLINE · 1:36 · LEAD II · 25 mm/s · 10 mm/mV`} />
				<Slug x={HEART.hrRight - 250} y={1012} size={17} text={slug} />
			</CamLayer>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ 9:16: the page set upright round the Rule

/**
 * Heart on the phone, laid out in frame px for the camera at k = 1 on the stage centre (stage = frame + (420, -420)),
 * so the Rule stays at WIRE_Y and lands on the frame's centre line, where Progs' band carried it. MY over HEART above
 * the Rule, with the readout beside MY; STOPPED hangs from the Rule and its three dots stamp on the line below.
 * Then "and I" on HEART's line and "started" from the Rule, narrower (120..880 with the readout) so the camera can
 * step in on the beats without cutting a word.
 */
const HV = {
	x: 60,
	my: {size: 250, base: 513},
	heart: {size: 360, base: 856},
	hr: {right: 870, base: 513, size: 250, label: 34},
	stopped: {size: 276, top: 1012},
	dots: {d: 84, top: 1306, step: 140},
	andI: {size: 260, base: 856},
	started: {size: 300, top: 1012},
	slug: 1478,
	amp: VB.amp,
	pen: 22,
};
const SX = (fx: number) => fx + 420;
const SY = (fy: number) => fy - 420;
/** The phone's monitor: the same write head (x 960) and speed as Progs' band, so the trace runs on across the cut. */
const HV_TRACE: TraceGeo = {x0: SX(VB_TRACE.x0), x1: SX(VB_TRACE.x1), l: -800, r: 2800, win: VB_TRACE.win};

const HeartV: React.FC<{t: number}> = ({t}) => {
	const stopped = t >= F.stopped;
	const started = t >= F.started;
	const hold = stopped && !started;
	const live = Math.min(t, F.stopped) - F.heart + (started ? t - F.started : 0);
	const bi = lastBeatIndex(t);
	// the paper drifts as in 16:9; the push into DANCING is the vertical camera's (HEART_V), the beat pump stays here
	const pump = started && BEATS[bi].t >= F.started ? 0.014 * Math.exp(-(t - BEATS[bi].t) / 0.09) : 0;
	const cam: Cam = {cx: 960 - 7 * live, cy: 540, s: 1 + pump};
	let shift = 0;
	for (const b of beatsIn(F.heart - 0.001, t + 0.001)) {
		if (b.t > t || (b.t >= F.stopped && b.t < F.started)) continue;
		shift += easeOut((t - b.t) / 0.14);
	}
	const amp = HV.amp;
	const aliveOld = (b: number) => b >= F.flatline2 && b < F.stopped && !stopped;
	const aliveNew = (b: number) => b >= F.started;
	const xStart = HV_TRACE.x1 - ((t - F.started) / HV_TRACE.win) * (HV_TRACE.x1 - HV_TRACE.x0);
	const tremor = hold ? Math.sin(t * 91) * 1.2 : 0;
	const my = stamp(t, F.heart);
	const st = stamp(t, F.stopped);
	const pulseK = !stopped && BEATS[bi].t >= F.heart ? Math.exp(-(t - BEATS[bi].t) / 0.11) : 0;
	const pa = hash2(bi, 7, 3) * Math.PI * 2;
	const gx = Math.cos(pa) * 13 * pulseK;
	const gy = Math.sin(pa) * 9 * pulseK;
	const acquiring = t < ACQ;
	const countK = easeOut((t - F.started) / 1.4);
	const hrVal = !stopped ? (acquiring ? '–––' : String(Math.round(tempoAt(t)))) : !started ? '0' : String(Math.round(tempoAt(t) * countK));
	const hrInk = started ? INK.heat : INK.key;
	const hrS = !stopped ? (acquiring ? my.s : stamp(t, BEATS[bi].t).s) : !started ? st.s : t < F.started + 1.4 ? 1 : stamp(t, BEATS[bi].t).s;
	const head = started ? headValue(t, aliveNew) : stopped ? 0 : headValue(t, aliveOld);
	const startedS = stamp(t, F.started);
	const slug = started ? 'SINUS RHYTHM · PRINT 2/2' : stopped ? 'ASYSTOLE' : acquiring ? 'ACQUIRING' : 'SINUS RHYTHM';
	const stoppedBase = HV.stopped.top + HV.stopped.size * 0.86;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
				<EcgPaper shift={shift} box={{x: -400, y: -1100, w: 2800, h: 3300}} />
				<Trace t={t} amp={amp} alive={started ? () => false : aliveOld} color={INK.key} width={6} tremor={tremor} clip={started ? [HV_TRACE.l, xStart + 1] : undefined} geo={HV_TRACE} />
				{started && <Trace t={t} amp={amp} alive={aliveNew} color={INK.heat} width={7} clip={[xStart - 1, HV_TRACE.r]} stubs geo={HV_TRACE} />}
				<div
					style={{
						position: 'absolute',
						left: HV_TRACE.x1 - HV.pen / 2,
						top: WIRE_Y - head * amp + tremor - HV.pen / 2,
						width: HV.pen,
						height: HV.pen,
						borderRadius: HV.pen / 2,
						background: started ? INK.heat : INK.key,
						mixBlendMode: 'multiply',
					}}
				/>
				{!started && (
					<>
						{pulseK > 0.02 && (
							<>
								<AntonAt x={SX(HV.x)} base={SY(HV.my.base)} size={HV.my.size} color={INK.heat} s={my.s} dx={gx} dy={gy} seed={2}>
									MY
								</AntonAt>
								<AntonAt x={SX(HV.x)} base={SY(HV.heart.base)} size={HV.heart.size} color={INK.heat} s={my.s} dx={gx} dy={gy} seed={4}>
									HEART
								</AntonAt>
							</>
						)}
						<AntonAt x={SX(HV.x)} base={SY(HV.my.base)} size={HV.my.size} color={INK.key} s={my.s} seed={1}>
							MY
						</AntonAt>
						<AntonAt x={SX(HV.x)} base={SY(HV.heart.base)} size={HV.heart.size} color={INK.key} s={my.s} seed={5}>
							HEART
						</AntonAt>
						{st.on && (
							<AntonAt x={SX(HV.x)} base={SY(stoppedBase)} size={HV.stopped.size} color={INK.heat} s={st.s} seed={3}>
								STOPPED
							</AntonAt>
						)}
						{DOTS.map((b, i) => {
							if (t < b) return null;
							const s = stamp(t, b).s;
							const D = HV.dots.d;
							return (
								<div
									key={i}
									style={{
										position: 'absolute',
										left: SX(HV.x + 6 + i * HV.dots.step),
										top: SY(HV.dots.top),
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
					</>
				)}
				{started && (
					<>
						<SerifAt x={SX(HV.x + 60 - 10)} base={SY(HV.andI.base)} size={HV.andI.size} color={INK.key} s={startedS.s} seed={1}>
							and I
						</SerifAt>
						<SerifAt x={SX(HV.x + 60 - 14)} base={SY(HV.started.top - 4 + HV.started.size * 0.743)} size={HV.started.size} color={INK.heat} s={startedS.s} seed={2}>
							started
						</SerifAt>
					</>
				)}
				<Readout right={SX(HV.hr.right)} base={SY(HV.hr.base)} size={HV.hr.size} value={hrVal} ink={hrInk} s={hrS} label={HV.hr.label} />
				<Slug x={SX(HV.x)} y={SY(HV.slug)} size={22} text={`FLATLINE · 1:36 · LEAD II · 25 mm/s · 10 mm/mV`} />
				<Slug x={SX(HV.x)} y={SY(HV.slug + 36)} size={22} text={slug} />
			</CamLayer>
		</AbsoluteFill>
	);
};

/** Heart's page, whole, on the phone: k = 1 on the stage centre, drawing past the stage's top and bottom edges. */
const HF: Frame = {k: 1, x: 960, y: 540, clip: false};
/** From "started" the camera steps in on each beat, holding the words' centre (stage 920, 308) in the safe area. */
const heartStep = (k: number): Frame => {
	const e = (k - 1) / 0.15;
	return {k, x: 920 + 40 / k, y: 540 + (308 + 40 / 1.15 - 540) * e, clip: false};
};
const [H1, H2] = [F.heart, BEATS[lastBeatIndex(F.heart + 0.001) + 1].t];
const S2 = BEATS[lastBeatIndex(F.started + 0.001) + 1].t;
const S3 = BEATS[lastBeatIndex(F.started + 0.001) + 2].t;
const S4 = BEATS[lastBeatIndex(F.started + 0.001) + 3].t;
const HEART_V = vtrack([
	// 51.1 MY HEART lands with the camera's punch; 51.2 the heat pulse punches again. Both scale about the type's left
	// margin (frame x 60), so MY and HEART never leave the safe area on the hit
	...hit(H1, HF, 1.04, 0.16, SX(HV.x)),
	...hit(H2, HF, 1.035, 0.16, SX(HV.x)),
	// 51.3 STOPPED: the camera is already dead still on the page and stays so through the dots (the hold is the drama)
	// 53.1 'and I started': the page cleared on the hit, then the camera steps in on every beat, the heart back
	...hit(F.started, HF, 1.06),
	[S2, heartStep(1.05), 0.12],
	[S3, heartStep(1.1), 0.12],
	// 1.14, not more: by then 'started' and the readout (with the paper's drift) span 880 px, the safe width
	[S4, heartStep(1.14), 0.12],
]);

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {Progs: {v: PROGS_V, vextra: ProgsBand}, Heart: {v: HEART_V}};
