import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, beatsIn, bt, lastBeatIndex, pulse} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, MONO} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, ecg, FlatlineBar, inked, kickNudge, lerp, RegTarget, Slug, stamp} from './kit';
import {bbox, FRIENDS, inPoly, P7_PHONES, Poly} from './masks';
import {Cam, Plate, Sheet} from './halftone';
import {CamLayer, Paper, PaperFill, Press} from './Press';
import {bleed, Frame, K_FILL, useStage, VMap, vtrack} from './stage';

// 1:41.4 to 1:56.1, the first dance (bars 54 to 61).
// DancingWord: DANCING knocked out of a black flood, its letters the only windows onto P2, then an
//   accelerating fly-through of the real N-C gap that lands on P2 full frame on 56.1.
// FirstDance: a print slapped onto the table on every downbeat and a variation of it on every beat 3.
// ReversePull: on the 1:54 "Flatline" a black squeegee buries the pile; the FLATLINE letters open onto P7
//   printed cold, the sheet the couch stencils start from.

/* ----------------------------------------------------------------------------------------------------- */
/* shared                                                                                                */

type Pose = {cx: number; cy: number; s: number; rot: number};
type Move = {t: number; to: Pose; dur: number};

const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
	cx: lerp(a.cx, b.cx, k),
	cy: lerp(a.cy, b.cy, k),
	s: a.s * Math.pow(b.s / a.s, k), // zooms interpolate in log scale
	rot: lerp(a.rot, b.rot, k),
});

/** Camera on short, fast moves: each move starts on its beat from wherever the last one had got to. */
const track = (t: number, moves: Move[]): Pose => {
	let from = moves[0].to;
	let to = moves[0].to;
	let t0 = -1e9;
	let dur = 1;
	for (const m of moves.slice(1)) {
		if (m.t > t) break;
		from = lerpPose(from, to, easeOut((m.t - t0) / dur));
		to = m.to;
		t0 = m.t;
		dur = m.dur;
	}
	return lerpPose(from, to, easeOut((t - t0) / dur));
};

/** The hit every beat gives the rostrum: a few px of shake and a 1% punch, gone in a quarter beat. */
const beatHit = (cam: Pose, t: number, from: number, amp = 1): Cam => {
	const i = lastBeatIndex(t);
	if (i < 0 || BEATS[i].t < from - 1e-6) return cam;
	const k = Math.exp(-(t - BEATS[i].t) / 0.085) * amp;
	const s = cam.s * (1 + 0.012 * k);
	return {
		cx: cam.cx - ((hash2(i, 3, 41) - 0.5) * 16 * k) / s,
		cy: cam.cy - ((hash2(i, 5, 41) - 0.5) * 11 * k) / s,
		s,
		rot: cam.rot + (hash2(i, 7, 41) - 0.5) * 0.5 * k,
	};
};

/** ECG trace points for an SVG polyline, newest moment at the right end (like kit's Rule, any blend). */
const ecgPoints = (t: number, w: number, amp: number, win: number, alive: (b: number) => boolean) => {
	const live = beatsIn(t - win - 0.3, t + 0.05)
		.map((b) => b.t)
		.filter((b) => b <= t && alive(b));
	const pts: string[] = [];
	for (let px = 0; px <= w; px += 2) {
		const tx = t - (1 - px / w) * win;
		let v = 0;
		for (const b of live) {
			const dt = tx - b;
			if (dt > -0.2 && dt < 0.25) v += ecg(dt);
		}
		pts.push(`${px},${(-v * amp).toFixed(1)}`);
	}
	return pts.join(' ');
};

/**
 * A cold channel redrawn for a line screen carrying the whole picture alone, as s_couch's p7Map does for P7 (same
 * formula, so the P7 seen through the FLATLINE letters is line for line the P7 the couch peels back to): the plate's
 * cold density is straight inverse luminance and prints every face as a solid blob, so mids are pulled down and the
 * key channel adds the darks back (0.55 b^1.4 + 0.6 k).
 */
const SCREEN_MAPS = new WeakMap<Density, Density>();
export const screenMap = (d: Density): Density => {
	const hit = SCREEN_MAPS.get(d);
	if (hit) return hit;
	const data = new Uint8ClampedArray(d.data);
	for (let i = 0; i < data.length; i += 4) data[i + 2] = Math.min(255, (0.55 * Math.pow(data[i + 2] / 255, 1.4) + (0.6 * data[i]) / 255) * 255);
	const m: Density = {id: `${d.id}-cold`, w: d.w, h: d.h, data};
	SCREEN_MAPS.set(d, m);
	return m;
};

const heatKey = (cell: number, hx = 0, hy = 0, kx = 0, ky = 0, mask?: (u: number, v: number) => number): Plate[] => [
	{ch: 1, ink: INK.heat, angle: 15, cell, dx: 2 + hx, dy: -1 + hy, mask},
	{ch: 0, ink: INK.key, angle: 45, cell, gain: 0.9, dx: kx, dy: ky, mask},
];

/* ----------------------------------------------------------------------------------------------------- */
/* DANCING (101.378 to 105.070)                                                                          */

// Anton's outlines for DANCING, laid out edge to edge in frame px (cap 84 to 944, 30 px between letters),
// generated with fontTools so the counters and the N-C gap are exact. Boxes are the letters' x extents.
const DANCING_PATHS = [
	'M44 944V84H186.6Q242.5 84 270.8 135.6Q299.1 187.1 299.1 286.3V688.9Q299.1 811.1 273.3 877.5Q247.6 944 183 944ZM148.3 792H166.3Q194.8 792 194.8 746.1V302.4Q194.8 259.4 187.9 247Q181 234.5 159.8 234.5H148.3Z',
	'M329.1 944 379.2 84H555L604.2 944H506.1L498.8 805.2H436.3L429.9 944ZM443.7 667.9H490.8L468.1 230.6H463.4Z',
	'M634.2 944V84H740.9L788.6 495.9V84H888.8V944H787.4L735.6 514V944Z',
	'M1043.7 951.8Q987.4 951.8 953.1 893.7Q918.8 835.5 918.8 731V334.2Q918.8 209.1 948.7 142.6Q978.6 76.2 1046 76.2Q1082.8 76.2 1111.6 98.7Q1140.3 121.1 1156.8 165.8Q1173.3 210.6 1173.3 278.5V427H1070.2V300Q1070.2 261.4 1064.3 247.9Q1058.4 234.5 1046 234.5Q1031.6 234.5 1026.6 251.8Q1021.6 269.2 1021.6 298V728.5Q1021.6 764.2 1027.9 778.8Q1034.2 793.5 1046 793.5Q1059.3 793.5 1064.7 775.4Q1070.2 757.3 1070.2 728.5V573.6H1174.5V736.3Q1174.5 849.7 1140 900.8Q1105.5 951.8 1043.7 951.8Z',
	'M1204.5 944V84H1304.6V944Z',
	'M1334.6 944V84H1441.2L1489 495.9V84H1589.1V944H1487.8L1435.9 514V944Z',
	'M1730.2 951.8Q1619.1 951.8 1619.1 688V317.1Q1619.1 76.2 1746.4 76.2Q1798.8 76.2 1826.8 111.1Q1854.8 146.1 1865.4 213Q1876 279.9 1876 376.2H1774.7V300Q1774.7 272.1 1770.1 253.3Q1765.5 234.5 1751.1 234.5Q1733.1 234.5 1727.4 254.5Q1721.6 274.6 1721.6 298.5V715.3Q1721.6 750 1727.1 771.8Q1732.5 793.5 1748.4 793.5Q1764.9 793.5 1770.4 771.8Q1775.8 750 1775.8 714.3V591.7H1748.2V443.1H1874.8V944H1833.3L1815.6 871.7Q1788.5 951.8 1730.2 951.8Z',
];
/** The real N-C gap: the N's right stem ends at x 888.8 and the C's straight back starts at 918.8 (y 334 to 731). */
const NC_GAP = {x: 903.8, y: 532};
const ZMAX = 100; // the gap (30 px) covers the frame at about 68x, two frames before 56.1
const Z0 = 1.05; // 55.1 stamps the word up a step and the fly-through grows from there, so the move starts on the beat
const RIM = 8; // a paper trap round every letter window, so a letter never drops into the flood where she is dark

/** P2 on the table: the same sheet behind the letters, under the fly-through and at the bottom of the pile. */
const P2_SHEET = {w: 1880, h: 1049, cx: 960, cy: 540};

const wordZoom = (t: number) => {
	const x = clamp01((t - bt(55)) / (bt(56) - bt(55)));
	return {x, z: t < bt(55) ? 1 : Z0 * Math.exp(Math.log(ZMAX / Z0) * Math.pow(x, 2.4))};
};

export const DancingWord: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	const d = useDensities(['P2']);
	const slam = stamp(t, F.dancing);
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	const {x, z} = wordZoom(t);
	// bar 54, every beat: 54.1 stamp, 54.2 pulse and shift, 54.3 heat 8 px off register, 54.4 back in register.
	// Bar 55 punches on every beat too, hardest on 55.1 where the fly-through starts.
	const down55 = i >= 0 && Math.abs(BEATS[i].t - bt(55)) < 1e-6;
	const punch = (t < bt(55) ? 0.035 : down55 ? 0.08 : 0.025) * Math.exp(-since / 0.1);
	const shifted = t >= bt(54, 2) && t < bt(54, 4);
	const shiftK = shifted ? easeOut((t - bt(54, 2)) / 0.1) : t >= bt(54, 4) ? 1 - easeOut((t - bt(54, 4)) / 0.1) : 0;
	const off = t >= bt(54, 3) && t < bt(54, 4) ? 1 : 0;
	// 55.1 and the 55.3 kick nudge the plates hard mid-zoom (and a small nudge on every beat)
	const hard = down55 || (t >= bt(55, 3) && t < bt(55, 4));
	const [kx, ky] = kickNudge(t, 0, hard ? 6 : 2);
	const [hx, hy] = kickNudge(t, 1, hard ? 7 : 2);
	// the print behind pushes in a little for depth: a 3% step on 55.1, then easing in to 1.1
	const ps = t < bt(55) ? 1 : 1 + 0.1 * (0.3 + 0.7 * easeIn(x));
	const cam: Cam = {cx: 960 + 16 * shiftK, cy: 540 - 8 * shiftK, s: ps};
	const ws = z * slam.s * (1 + punch);
	const jx = t >= bt(55, 3) && t < bt(55, 4) ? (hash2(i, 1, 9) - 0.5) * 22 * Math.exp(-since / 0.09) : 0;
	const word = `translate(${NC_GAP.x + jx} ${NC_GAP.y}) scale(${ws}) translate(${-NC_GAP.x} ${-NC_GAP.y})`;
	// the trap stays a thin paper line on screen as the word flies at us (scaled with the word it became 400 px cream bands)
	const rimW = (2 * RIM * (1 + 0.5 * clamp01((ws - 1) / 8))) / ws;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[{map: d.P2, ...P2_SHEET, seed: 3, plates: heatKey(8.5, 8 * off + hx, -5 * off + hy, kx, ky)}]} />}
			{/* 9:16: the word is re-laid in the frame (DancingWordV), the stage keeps only the print behind it */}
			{!vertical && <WordLayers t={t} word={word} rimW={rimW} off={off} />}
		</AbsoluteFill>
	);
};

/** DANCING's trap, flood and band on the 16:9 stage. */
const WordLayers: React.FC<{t: number; word: string; rimW: number; off: number}> = ({t, word, rimW, off}) => {
	const svgBox: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'};
	return (
		<>
			{/* the paper trap round each letter */}
			<svg viewBox="0 0 1920 1080" style={svgBox}>
				<g transform={word}>
					{DANCING_PATHS.map((p, n) => (
						<path key={n} d={p} fill="none" stroke={INK.paper} strokeWidth={rimW} strokeLinejoin="round" />
					))}
				</g>
			</svg>
			{/* the flood, letters knocked out */}
			<svg viewBox="0 0 1920 1080" style={{...svgBox, ...inked(1024, 0, 0, true)}}>
				<defs>
					<mask id="dancing-ko" maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
						<rect x={0} y={0} width={1920} height={1080} fill="white" />
						<g transform={word}>
							{DANCING_PATHS.map((p, n) => (
								<path key={n} d={p} fill="black" stroke="black" strokeWidth={rimW} strokeLinejoin="round" />
							))}
						</g>
					</mask>
				</defs>
				<rect x={0} y={0} width={1920} height={1080} fill={INK.key} mask="url(#dancing-ko)" />
			</svg>
			{/* the band under the word: the new heart, in heat on the black, and the slug knocked out in paper */}
			<svg viewBox="0 0 1920 1080" style={svgBox}>
				<g transform={word}>
					<g transform="translate(1010 1012)">
						<polyline points={ecgPoints(t, 866, 34, 2.6, () => true)} fill="none" stroke={INK.heat} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
					</g>
					<text x={46} y={1020} fontFamily={MONO} fontSize={19} letterSpacing={2.4} fill={INK.paper}>
						P2 · FIRST DANCE · O 15° K 45° · {off ? 'OFF REGISTER +8' : 'IN REGISTER'}
					</text>
				</g>
			</svg>
		</>
	);
};

/**
 * DANCING on the phone (frame px, 1080x1920): DAN over CING, set as a justified block in the safe area (both lines
 * 714 wide, caps 727 and 642, the lines 24 apart like the letters), still knocked out of a black flood over P2. Bar 55
 * flies through the real I-N gap of CING (the I's stem ends at 1304.6, the N's starts at 1334.6, full cap height), the
 * gap drifting to the frame's centre as it grows, so the frame passes through the black between the two letters.
 */
const DV = (() => {
	const W = 714;
	const gap = 24;
	const sD = W / (888.8 - 44);
	const sC = W / (1876 - 918.8);
	const top = 220 + (1400 - (860 * sD + gap + 860 * sC)) / 2;
	const x0 = 510 - W / 2;
	const yC = top + 860 * sD + gap;
	return {
		sD,
		sC,
		x0,
		top,
		yC,
		bottom: yC + 860 * sC,
		W,
		dan: `translate(${x0} ${top}) scale(${sD}) translate(-44 -84)`,
		cing: `translate(${x0} ${yC}) scale(${sC}) translate(-918.8 -84)`,
		gap: [x0 + (1319.6 - 918.8) * sC, yC + (514 - 84) * sC] as [number, number],
	};
})();
const ZMAX_V = 72; // the I-N gap (22 px on the phone) covers the frame on the last two frames before 56.1
const RIM_V = 6; // the paper trap in frame px, each side of the outline

const DancingWordV: React.FC<{t: number}> = ({t}) => {
	if (t < F.dancing || t >= bt(56)) return null;
	const slam = stamp(t, F.dancing);
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	const x = clamp01((t - bt(55)) / (bt(56) - bt(55)));
	const z = t < bt(55) ? 1 : Z0 * Math.exp(Math.log(ZMAX_V / Z0) * Math.pow(x, 2.4));
	const down55 = i >= 0 && Math.abs(BEATS[i].t - bt(55)) < 1e-6;
	const punch = (t < bt(55) ? 0.035 : down55 ? 0.08 : 0.025) * Math.exp(-since / 0.1);
	const off = t >= bt(54, 3) && t < bt(54, 4) ? 1 : 0;
	const ws = z * slam.s * (1 + punch);
	const jx = t >= bt(55, 3) && t < bt(55, 4) ? (hash2(i, 1, 9) - 0.5) * 14 * Math.exp(-since / 0.09) : 0;
	// the gap flies to the centre of the frame as it opens. Bar 54's stamp and punches scale about the block's own
	// centre instead, so they grow it evenly (about the gap, low in CING, DAN shot up into the feed's top bar); the
	// pivot changes on 55.1, where bar 54's last punch has died away and the block is at rest.
	const e = easeInOut(clamp01(Math.log(z / Z0) / Math.log(14)));
	const [gx, gy] = t < bt(55) ? [DV.x0 + DV.W / 2, (DV.top + DV.bottom) / 2] : DV.gap;
	const ax = lerp(gx, 540, e) + jx;
	const ay = lerp(gy, 960, e);
	const word = `translate(${ax} ${ay}) scale(${ws}) translate(${-gx} ${-gy})`;
	const rim = 2 * RIM_V * (1 + 0.5 * clamp01((ws - 1) / 8));
	const svgBox: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'};
	const letters = (fill: string, stroke: string, filled: boolean) => (
		<g transform={word}>
			<g transform={DV.dan}>
				{DANCING_PATHS.slice(0, 3).map((p, n) => (
					<path key={n} d={p} fill={filled ? fill : 'none'} stroke={stroke} strokeWidth={rim / (ws * DV.sD)} strokeLinejoin="round" />
				))}
			</g>
			<g transform={DV.cing}>
				{DANCING_PATHS.slice(3).map((p, n) => (
					<path key={n} d={p} fill={filled ? fill : 'none'} stroke={stroke} strokeWidth={rim / (ws * DV.sC)} strokeLinejoin="round" />
				))}
			</g>
		</g>
	);
	return (
		<AbsoluteFill>
			<svg viewBox="0 0 1080 1920" style={svgBox}>
				{letters(INK.paper, INK.paper, false)}
			</svg>
			<svg viewBox="0 0 1080 1920" style={{...svgBox, ...inked(1024, 0, 0, true)}}>
				<defs>
					<mask id="dancing-ko-v" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
						<rect x={0} y={0} width={1080} height={1920} fill="white" />
						{letters('black', 'black', true)}
					</mask>
				</defs>
				<rect x={0} y={0} width={1080} height={1920} fill={INK.key} mask="url(#dancing-ko-v)" />
			</svg>
			{/* the band under the block: the new heart in heat, the slug knocked out in paper */}
			<svg viewBox="0 0 1080 1920" style={svgBox}>
				<g transform={word}>
					<g transform={`translate(${DV.x0} ${DV.bottom + 64})`}>
						<polyline points={ecgPoints(t, DV.W, 30, 2.2, () => true)} fill="none" stroke={INK.heat} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
					</g>
					<text x={DV.x0} y={DV.bottom + 132} fontFamily={MONO} fontSize={19} letterSpacing={2.2} fill={INK.paper}>
						P2 · FIRST DANCE · {off ? 'OFF REGISTER +8' : 'IN REGISTER'}
					</text>
				</g>
			</svg>
		</AbsoluteFill>
	);
};

/* ----------------------------------------------------------------------------------------------------- */
/* FIRST DANCE (105.070 to 114.265): prints thrown onto the table                                        */

type PrintDef = {
	id: string; // density map
	label: string;
	crop?: [number, number, number, number];
	w: number; // image area, paper px
	h: number;
	cx: number; // image centre where it lands (world)
	cy: number;
	rot: number;
	t0: number; // lands on this beat
	from: [number, number]; // where it is thrown from
	spin: number; // extra rotation in the air
	stock?: string; // paper colour
};

const MARGIN = 24; // paper round the image
const FOOT = 64; // the slug strip under it
const THROW = 5 / 30;

const PRINTS: PrintDef[] = [
	{id: 'P2', label: 'P2 · FIRST DANCE · O 15° K 45° · PULL 1', ...P2_SHEET, rot: 0, t0: -1e9, from: [0, 0], spin: 0},
	// her hair, key only on orange stock (crop aspect 1101:705 = the sheet's 1500:960)
	{id: 'P2', label: 'P2 · MACRO · K ON O · 85 → 20 LPI', crop: [0.4, 0.14, 0.8, 0.599], w: 1500, h: 960, cx: 1330, cy: 300, rot: -6, t0: bt(56, 3), from: [1, -0.3], spin: -6, stock: INK.heat},
	{id: 'P3', label: 'P3 · THE FLOOR · O 15° K 45° · PULL 2', w: 1800, h: 1005, cx: 640, cy: 790, rot: 3.5, t0: bt(57), from: [-0.6, 1], spin: 5},
	{id: 'P4', label: 'P4 · EYES SHUT · O 15° K 45° · PULL 3', w: 1800, h: 1005, cx: 1250, cy: 720, rot: -2.4, t0: bt(58), from: [0.9, -0.7], spin: -4},
	{id: 'P5', label: 'P5 · THE ROOM · O 15° K 45° / U 75° LINE', w: 1800, h: 1005, cx: 900, cy: 470, rot: 1.6, t0: bt(59), from: [-1, -0.15], spin: 6},
	{id: 'P6', label: 'P6 · JESS LOOKS UP · O 15° K 45° · PULL 5', w: 1800, h: 1005, cx: 1080, cy: 640, rot: -2.8, t0: bt(60), from: [1, 0.35], spin: -5},
];
const [PR2, PR2M, PR3, PR4, PR5, PR6] = PRINTS;

/** Maya in P5, traced from the still (image fractions): head, both arms, the black jacket and trousers. */
const MAYA_P5: Poly = [
	[0.49, 0.285], [0.515, 0.255], [0.555, 0.255], [0.585, 0.285], [0.61, 0.33], [0.6, 0.39], [0.585, 0.42], [0.62, 0.47], [0.69, 0.49], [0.745, 0.495],
	[0.75, 0.52], [0.7, 0.535], [0.63, 0.545], [0.585, 0.56], [0.578, 0.6], [0.58, 0.66], [0.575, 0.75], [0.572, 0.85], [0.578, 0.99], [0.498, 0.99],
	[0.505, 0.85], [0.5, 0.7], [0.49, 0.62], [0.48, 0.55], [0.478, 0.45], [0.42, 0.415], [0.375, 0.385], [0.368, 0.35], [0.42, 0.383], [0.46, 0.39],
	[0.468, 0.33],
];
const mayaP5 = (u: number, v: number) => (u > 0.36 && u < 0.76 && v > 0.25 && inPoly(MAYA_P5, u, v) ? 1 : 0);

const poseOf = (p: PrintDef, t: number) => {
	const air = 1 - easeOut((t - p.t0) / THROW);
	return {cx: p.cx + p.from[0] * 340 * air, cy: p.cy + p.from[1] * 340 * air, rot: p.rot + p.spin * air, s: 1 + 0.08 * air, air};
};

/** World point of image fraction (u, v) on a landed print. */
const onPrint = (p: PrintDef, u: number, v: number): [number, number] => {
	const r = (p.rot * Math.PI) / 180;
	const x = (u - 0.5) * p.w;
	const y = (v - 0.5) * p.h;
	return [p.cx + x * Math.cos(r) - y * Math.sin(r), p.cy + x * Math.sin(r) + y * Math.cos(r)];
};

/** World point of image fraction (u, v) on print p at pose q (in the air or landed). */
const onPrintAt = (p: PrintDef, q: Pose, u: number, v: number): [number, number] => {
	const r = (q.rot * Math.PI) / 180;
	const x = (u - 0.5) * p.w * q.s;
	const y = (v - 0.5) * p.h * q.s;
	return [q.cx + x * Math.cos(r) - y * Math.sin(r), q.cy + x * Math.sin(r) + y * Math.cos(r)];
};

/** Frame a print: it fills the frame with its edges just showing, the camera taking out most of its tilt. */
const frameOn = (p: PrintDef, s = 1.05): Pose => ({cx: p.cx, cy: p.cy, s, rot: -0.65 * p.rot});

// The sofa punch-in keeps Maya's face (v 0.25-0.40) and all four friends with their phones (u 0.22-0.66, v 0.48-0.62)
// in frame: at 1.6x the frame spans u 0.13-0.80, v 0.14-0.82 of P5.
const SOFA = onPrint(PR5, 0.465, 0.48);
const MOVES: Move[] = [
	{t: -1e9, to: {cx: 960, cy: 540, s: 1.1, rot: 0}, dur: 1}, // where the fly-through leaves the print
	{t: bt(56), to: frameOn(PR2, 1.035), dur: 0.3},
	{t: bt(56, 3), to: frameOn(PR2M, 1.24), dur: 0.16},
	{t: bt(57), to: frameOn(PR3), dur: 0.16},
	{t: bt(57, 3), to: frameOn(PR3, 1.13), dur: 0.08},
	{t: bt(57, 4), to: frameOn(PR3, 1.06), dur: 0.2},
	{t: bt(58), to: frameOn(PR4), dur: 0.16},
	{t: bt(58, 3), to: {cx: 945, cy: 580, s: 0.62, rot: 1.5}, dur: 0.3}, // pull back: the pile
	{t: bt(59), to: frameOn(PR5), dur: 0.22},
	{t: bt(59, 3), to: {cx: SOFA[0], cy: SOFA[1], s: 1.6, rot: -PR5.rot}, dur: 0.1}, // punch-in on the sofa
	{t: bt(60), to: frameOn(PR6), dur: 0.2},
	{t: bt(60, 3), to: frameOn(PR6, 1.1), dur: 0.07},
	{t: bt(60, 4), to: frameOn(PR6, 1.05), dur: 0.2},
];

// 9:16: the pull back on 58.3 goes further, so the tall frame holds the whole stack with the table above and below it
const PILE_V: Pose = {cx: 1060, cy: 570, s: 0.42, rot: 1.5};
const MOVES_V: Move[] = MOVES.map((m) => (Math.abs(m.t - bt(58, 3)) < 1e-6 ? {...m, to: PILE_V, dur: 0.24} : m));

const pileCam = (t: number, vertical = false): Cam => beatHit(track(t, vertical ? MOVES_V : MOVES), t, bt(56));

const platesFor = (n: number, t: number, vertical = false): Plate[] => {
	const [kx, ky] = kickNudge(t, 0, 2);
	// beats 2 and 4 carry no cut, so the press thumps harder there: the orange plate kicks out and settles
	const offBeat = BEATS[Math.max(0, lastBeatIndex(t))].beat % 2 === 0;
	const [hx, hy] = kickNudge(t, 1, offBeat ? 5 : 2.5);
	switch (n) {
		case 0: {
			// the burst lands with the orange plate flung off register, snapping in over a few frames
			const mis = t >= bt(56) ? 10 * Math.exp(-(t - bt(56)) / 0.12) : 0;
			return heatKey(8.5, hx + mis, hy - mis * 0.6, kx, ky);
		}
		case 1:
			// key on orange: the key plate alone, opened up so the strands separate, on orange stock
			return [{ch: 0, ink: INK.key, angle: 45, cell: 18, gain: 1.5, dx: kx, dy: ky}];
		case 2: {
			// 57.3 dot burst: the screen opens to 34 px for one beat, the dots blooming as they land
			const burst = t >= bt(57, 3) && t < bt(57, 4);
			const bloom = burst ? 1 + 0.6 * Math.exp(-(t - bt(57, 3)) / 0.07) : 1;
			const cell = burst ? 34 : 8.5;
			return heatKey(cell, hx, hy, kx, ky).map((p) => ({...p, gain: (p.gain ?? 1) * bloom}));
		}
		case 4: {
			if (t < bt(59, 3)) return heatKey(8.5, hx, hy, kx, ky);
			// the sofa punch-in: the friends on their phones go cold (line screen on the redrawn cold channel, so the
			// heads-down faces keep their darks and the phones stay paper), Maya stays warm. 9:16 sees the sofa 1.8x
			// closer, so its line screen is finer there (cell 3.5) or the friends' faces break up into bare stripes.
			const cold: Plate = {ch: 2, ink: INK.cold, angle: 75, cell: vertical ? 3.5 : 5, kind: 'line', mask: (u, v) => 1 - mayaP5(u, v)};
			return [cold, ...heatKey(6, hx, hy, kx, ky, mayaP5)];
		}
		case 5: {
			if (t >= bt(60, 3) && t < bt(60, 4)) {
				// key only (the whole tonal range in black), jolting: a double strike that snaps back into one
				const k = Math.exp(-(t - bt(60, 3)) / 0.1);
				const jx = 16 * k;
				const plates: Plate[] = [{ch: 1, ink: INK.key, angle: 45, cell: 8.5, gain: 0.95, dx: jx + kx, dy: -jx * 0.5 + ky}];
				if (k > 0.04) plates.push({ch: 1, ink: INK.key, angle: 45, cell: 8.5, gain: 0.95, dx: -1.6 * jx, dy: jx * 0.8, alpha: 0.45 * k});
				return plates;
			}
			const back = t >= bt(60, 4) ? 9 * Math.exp(-(t - bt(60, 4)) / 0.1) : 0;
			return heatKey(8.5, hx - back, hy + back * 0.6, kx, ky);
		}
		default:
			return heatKey(8.5, hx, hy, kx, ky);
	}
};

const printShadow = (air: number) => `${5 + 34 * air}px ${9 + 46 * air}px ${16 + 60 * air}px rgba(45,30,15,${0.3 + 0.12 * air})`;

/** The table: every print that has landed by t, in order, through the rostrum camera. */
const Pile: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	const d = useDensities(['P2', 'P3', 'P4', 'P5', 'P6']);
	const cam = pileCam(t, vertical);
	const live = PRINTS.map((p, n) => ({p, n})).filter(({p}) => t >= p.t0);
	const sheets: Sheet[] = [];
	if (d) {
		for (const {p, n} of live) {
			const q = poseOf(p, t);
			const r = (q.rot * Math.PI) / 180;
			const off = ((FOOT - MARGIN) / 2) * q.s;
			// P5's cold plate prints from the redrawn cold channel (key and heat are the same in both maps)
			const map: Density = p.id === 'P5' ? screenMap(d.P5) : d[p.id];
			// the paper first (hides what is under it), then the image
			sheets.push({map, w: p.w + 2 * MARGIN, h: p.h + MARGIN + FOOT, cx: q.cx - Math.sin(r) * off, cy: q.cy + Math.cos(r) * off, s: q.s, rot: q.rot, plates: [], ground: 'white', speckle: 0});
			sheets.push({map, crop: p.crop, w: p.w, h: p.h, cx: q.cx, cy: q.cy, s: q.s, rot: q.rot, plates: platesFor(n, t, vertical), seed: 11 + n * 7});
		}
	}
	return (
		<AbsoluteFill style={{background: INK.paperShade}}>
			<CamLayer cam={cam}>
				<Paper tint={INK.paperShade} />
				{live.map(({p, n}) => {
					const q = poseOf(p, t);
					const W = p.w + 2 * MARGIN;
					const H = p.h + MARGIN + FOOT;
					return (
						<div
							key={n}
							style={{
								position: 'absolute',
								left: q.cx - p.w / 2 - MARGIN,
								top: q.cy - p.h / 2 - MARGIN,
								width: W,
								height: H,
								transformOrigin: `${MARGIN + p.w / 2}px ${MARGIN + p.h / 2}px`,
								transform: `rotate(${q.rot}deg) scale(${q.s})`,
								background: p.stock ?? INK.paper,
								boxShadow: printShadow(q.air),
							}}
						>
							<Paper x={0} y={0} w={W} h={H} tint={p.stock} />
							<Slug x={MARGIN} y={MARGIN + p.h + 22} text={p.label} size={17} />
							<RegTarget x={MARGIN + p.w - 16} y={MARGIN + p.h + 32} r={9} />
						</div>
					);
				})}
			</CamLayer>
			{d && <Press cam={cam} sheets={sheets} />}
		</AbsoluteFill>
	);
};

export const FirstDance: React.FC<{t: number}> = ({t}) => <Pile t={t} />;

/* ----------------------------------------------------------------------------------------------------- */
/* REVERSE PULL (114.265 to 116.100)                                                                      */

/**
 * P7 as the couch stencils print it at 116.100: the same sheet in the same place, uncropped (2752:1536), on a still
 * camera. s_couch.tsx prints P7 on this sheet (its P7S), from the same redrawn cold channel (screenMap here, p7Map
 * there) with the same plate and seed, and knocks the same paper blooms round the phones out of it, so the line screen
 * it peels back to is the one seen through the letters here, line for line.
 */
export const P7_SHEET = {w: 1760, h: 982, cx: 960, cy: 520};
/** The screen-world plate the couch starts from: ultramarine 75° line screen, cell 7, on screenMap(P7) (seed 5). */
export const P7_COLD: Plate = {ch: 2, ink: INK.cold, angle: 75, cell: 7, kind: 'line'};
export const P7_SEED = 5;

// FLATLINE exactly as kit's FlatlineBar sets it here (Anton 430, letter-spacing 0.04 em, centred on x 960,
// baseline 694.8), flattened from the font's outlines to polygons in frame px. Chrome kerns the A-T pair, which the
// outlines did not, so F-L-A sit 2.6 px right and T-L-I-N-E 2.6 px left of the unkerned layout; with that, every edge
// is within 0.3 px of a render.
// The outers wind one way and the A's counter (index 3) the other, so one nonzero path holds all the windows.
const FLAT_POLYS: number[][] = [
	[219.8, 694.8, 219.8, 325.3, 367.6, 325.3, 367.6, 397.3, 294.2, 397.3, 294.2, 456.1, 363.9, 456.1, 363.9, 527.3, 294.2, 527.3, 294.2, 694.8],
	[408.6, 694.8, 408.6, 325.3, 482.5, 325.3, 482.5, 631.8, 558.5, 631.8, 558.5, 694.8],
	[586.6, 694.8, 622.3, 325.3, 747.6, 325.3, 782.7, 694.8, 712.8, 694.8, 707.5, 635.2, 663, 635.2, 658.4, 694.8],
	[668.3, 576.2, 701.9, 576.2, 685.7, 388.3, 682.3, 388.3],
	[849.1, 694.8, 849.1, 396.2, 805.2, 396.2, 805.2, 325.3, 966.9, 325.3, 966.9, 396.2, 923, 396.2, 923, 694.8],
	[1004.6, 694.8, 1004.6, 325.3, 1078.5, 325.3, 1078.5, 631.8, 1154.6, 631.8, 1154.6, 694.8],
	[1189.4, 694.8, 1189.4, 325.3, 1260.8, 325.3, 1260.8, 694.8],
	[1307.4, 694.8, 1307.4, 325.3, 1383.4, 325.3, 1417.4, 502.3, 1417.4, 325.3, 1488.8, 325.3, 1488.8, 694.8, 1416.6, 694.8, 1379.6, 510, 1379.6, 694.8],
	[1538.7, 694.8, 1538.7, 325.3, 1686.5, 325.3, 1686.5, 396.7, 1613.9, 396.7, 1613.9, 468.7, 1683.6, 468.7, 1683.6, 538.2, 1613.9, 538.2, 1613.9, 622.8, 1691.4, 622.8, 1691.4, 694.8],
];

const FLAT_GROW = 1.5; // px past the knockout edge: under the bar's anti-aliased edge, so no paper hairline and no dark line

/** A polygon (flat x, y list) offset outward by d px with mitred corners (whichever way it winds). */
const offsetPoly = (p: number[], d: number): [number, number][] => {
	const n = p.length / 2;
	let area = 0;
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		area += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
	}
	const sg = area > 0 ? 1 : -1;
	const normal = (i: number, j: number): [number, number] => {
		const dx = p[2 * j] - p[2 * i];
		const dy = p[2 * j + 1] - p[2 * i + 1];
		const l = Math.hypot(dx, dy) || 1;
		return [(sg * dy) / l, (-sg * dx) / l];
	};
	return Array.from({length: n}, (_, i): [number, number] => {
		const [ax, ay] = normal((i + n - 1) % n, i);
		const [bx, by] = normal(i, (i + 1) % n);
		const k = d / (1 + ax * bx + ay * by);
		return [p[2 * i] + (ax + bx) * k, p[2 * i + 1] + (ay + by) * k];
	});
};

/**
 * The FLATLINE windows grown 1.5 px (FLAT_GROW), as one clip path in P7_SHEET paper fractions: every letter is reached from the F by
 * a bridge walked out and back, which adds nothing under the nonzero rule. The cold lines end just under the bar's
 * knockout edge instead of overprinting its ink. (The A's counter is left as it is: its top is 3 px wide.)
 */
const FLAT_GROWN = FLAT_POLYS.map((p, n) => offsetPoly(p, n === 3 ? 0 : FLAT_GROW));
/** The grown windows as an SVG / CSS path in frame px (for the lids' clip and the orange flush). */
const FLAT_GROWN_PATH = FLAT_GROWN.map((poly) => 'M' + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + 'Z').join(' ');
const clipFrom = (polys: [number, number][][]): [number, number][] => {
	const x0 = P7_SHEET.cx - P7_SHEET.w / 2;
	const y0 = P7_SHEET.cy - P7_SHEET.h / 2;
	const anchor = polys[0][0];
	const pts: [number, number][] = [];
	polys.forEach((poly, n) => {
		pts.push(...poly, poly[0]);
		if (n) pts.push(anchor);
	});
	return pts.map(([x, y]) => [(x - x0) / P7_SHEET.w, (y - y0) / P7_SHEET.h]);
};
const FLAT_CLIP = clipFrom(FLAT_GROWN);

/**
 * FLATLINE on the phone: FLAT over LINE, a justified block (both lines 495 stage px wide: caps 245 and 266) inside the
 * frame's safe area (x 60-940) as the SEAM camera sees the stage (K_FILL on 960, 540, so stage x 656-1264). The couch
 * takes the same sheet over at 116.100 with no camera move. The 16:9 outlines are scaled per line, so every window,
 * the A's counter included, is the font's own.
 */
const FV = (() => {
	const x0 = 960 - (540 - 60) / K_FILL;
	const w = 880 / K_FILL;
	const sF = w / (966.9 - 219.8);
	const sL = w / (1691.4 - 1004.6);
	const gap = 22;
	const hF = 369.5 * sF;
	const hL = 369.5 * sL;
	const top = 515 - (hF + gap + hL) / 2;
	return {x0, w, sF, sL, top, topL: top + hF + gap, hF, hL, cx: x0 + w / 2, cy: 515};
})();
const FLAT_POLYS_V: number[][] = FLAT_POLYS.map((p, n) => {
	const flat = n <= 4;
	const s = flat ? FV.sF : FV.sL;
	const ox = flat ? 219.8 : 1004.6;
	const oy = flat ? FV.top : FV.topL;
	return p.map((c, j) => (j % 2 === 0 ? FV.x0 + (c - ox) * s : oy + (c - 325.3) * s));
});
const pathOf = (polys: [number, number][][]) => polys.map((poly) => 'M' + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + 'Z').join(' ');
const FLAT_GROWN_V = FLAT_POLYS_V.map((p, n) => offsetPoly(p, n === 3 ? 0 : FLAT_GROW));
const FLAT_GROWN_PATH_V = pathOf(FLAT_GROWN_V);
const FLAT_PATH_V = pathOf(FLAT_POLYS_V.map((p) => Array.from({length: p.length / 2}, (_, i): [number, number] => [p[2 * i], p[2 * i + 1]])));
const FLAT_CLIP_V = clipFrom(FLAT_GROWN_V);

// The phones' glow as s_couch prints it before anyone is warmed (its bloom(), all four phones live): bare paper round
// each phone that stays dark, throbbing on the beat. It reaches up into the bottom of the letters.
const A7 = 2752 / 1536;
const PHONES = FRIENDS.map((f) => {
	const q = P7_PHONES[f];
	return {poly: q, b: bbox(q), u: q.reduce((a, p) => a + p[0], 0) / 4, v: q.reduce((a, p) => a + p[1], 0) / 4};
});
const phoneBloom = (t: number) => {
	const g = 0.7 + 0.25 * pulse(t, 0.16);
	return (u: number, v: number): number => {
		let b = 0;
		for (const p of PHONES) {
			const dx = ((u - p.u) * A7) / 0.075;
			const dy = (v - (p.v - 0.04)) / 0.105;
			const e = dx * dx + dy * dy;
			if (e > 5) continue;
			if (u >= p.b.x0 && u <= p.b.x1 && v >= p.b.y0 && v <= p.b.y1 && inPoly(p.poly, u, v)) return 0;
			b = Math.max(b, g * Math.exp(-e));
		}
		return b;
	};
};

/** P7 printed cold, clipped to the FLATLINE windows (nothing ghosts through the black). */
const p7Cold = (map: Density, t: number, clip = FLAT_CLIP): Sheet => {
	const glow = phoneBloom(t);
	return {map: screenMap(map), ...P7_SHEET, seed: P7_SEED, clip, plates: [{...P7_COLD, mask: (u, v) => 1 - glow(u, v)}]};
};

const THUMPS = [bt(61, 2), bt(61, 4)];
const LID_TOP = 300;
const LID_MID = 510;
const LID_BOT = 720;
const WIPE = 0.2;

export const ReversePull: React.FC<{t: number}> = ({t}) => {
	const {vertical} = useStage();
	return vertical ? <ReversePullV t={t} /> : <ReversePull169 t={t} />;
};

const ReversePull169: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P7']);
	const wipe = easeOut((t - F.flatline3) / WIPE);
	const lean = 90; // the blade leans: its top runs ahead
	const edge = lerp(-2 * lean, 1920 + 2 * lean, wipe);
	const thump = Math.max(...THUMPS.map((b) => (t >= b ? Math.exp(-(t - b) / 0.11) : 0)));
	// 61.3: the letters' paper opens like eyelids from their centre line (y 510), already 40% open on the beat's own
	// frame so P7 shows on it, then fully open over 5 frames
	const opened = t >= bt(61, 3);
	const open = opened ? 0.4 + 0.6 * easeOut((t - bt(61, 3)) / (5 / 30)) : 0;
	const lid = (top: number, h: number, shadow: string) => (
		<div style={{position: 'absolute', left: 0, top, width: 1920, height: h, overflow: 'hidden', boxShadow: shadow}}>
			<div style={{position: 'absolute', left: 0, top: -top, width: 1920, height: 1080}}>
				<PaperFill />
			</div>
		</div>
	);
	const ts = 1 + 0.022 * thump;
	const tx = thump * 5;
	const ty = thump * 3;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{wipe < 1 && <Pile t={t} />}
			<AbsoluteFill style={{clipPath: wipe < 1 ? `polygon(-10px -10px, ${edge + lean}px -10px, ${edge - lean}px 1090px, -10px 1090px)` : undefined}}>
				<AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${ts})`}}>
					<PaperFill />
					{d && opened && <Press sheets={[p7Cold(d.P7, t)]} />}
					{/* the lids: the letter band (y 325-695, centre 510) split at its centre line, each half sliding back; clipped
					    to the windows so neither the paper nor its shadow shows through the (multiplied) bar */}
					{opened && open < 1 && (
						<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, clipPath: `path('${FLAT_GROWN_PATH}')`}}>
							{lid(LID_TOP, (LID_MID - LID_TOP) * (1 - open), '0 5px 9px rgba(40,25,10,0.32)')}
							{lid(LID_MID + (LID_BOT - LID_MID) * open, (LID_BOT - LID_MID) * (1 - open), '0 -5px 9px rgba(40,25,10,0.32)')}
						</div>
					)}
					{/* a heartbeat tries: the letters flush orange on each thump */}
					{thump > 0.02 && (
						<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.9 * thump, mixBlendMode: 'multiply'}}>
							<path d={FLAT_GROWN_PATH} fill={INK.heat} />
						</svg>
					)}
					<FlatlineBar x={-40} y={-40} w={2000} h={1160} text="FLATLINE" size={430} />
					<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
						<g transform="translate(160 980)">
							<polyline points={ecgPoints(t, 1600, 30, 2.6, (b) => THUMPS.some((x) => Math.abs(x - b) < 1e-3))} fill="none" stroke={INK.paper} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
						</g>
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
			{wipe < 1 && (
				// the squeegee blade
				<div
					style={{
						position: 'absolute',
						left: edge - 14,
						top: -160,
						width: 26,
						height: 1400,
						transform: `rotate(${(Math.atan2(2 * lean, 1100) * 180) / Math.PI}deg)`,
						background: 'linear-gradient(90deg, #121110 0%, #3a3631 55%, #8a8276 80%, #2a2724 100%)',
						boxShadow: '14px 0 26px rgba(30,20,10,0.45)',
					}}
				/>
			)}
		</AbsoluteFill>
	);
};

const thumpAt = (t: number) => Math.max(...THUMPS.map((b) => (t >= b ? Math.exp(-(t - b) / 0.11) : 0)));
const alignedEcg = (b: number) => THUMPS.some((x) => Math.abs(x - b) < 1e-3);

/**
 * The black FLAT / LINE sheet of the phone cut, in stage px, with its paper ECG under the block (the thumps blip). The
 * couch's peel can lift this same sheet off P7 in the 9:16 cut: <ReverseSheetV t={F.couch} /> in place of its FlatlineBar
 * and frozen ECG.
 */
export const ReverseSheetV: React.FC<{t: number}> = ({t}) => (
	<>
		<svg viewBox="-40 -40 2000 1160" style={{position: 'absolute', left: -40, top: -40, width: 2000, height: 1160, overflow: 'visible', mixBlendMode: 'multiply', ...inked(800, 31, 7, true)}}>
			<defs>
				<mask id="ko-flatline-v" maskUnits="userSpaceOnUse" x={-40} y={-40} width={2000} height={1160}>
					<rect x={-40} y={-40} width={2000} height={1160} fill="white" />
					<path d={FLAT_PATH_V} fill="black" />
				</mask>
			</defs>
			<rect x={-40} y={-40} width={2000} height={1160} fill={INK.key} mask="url(#ko-flatline-v)" />
		</svg>
		<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
			<g transform={`translate(${FV.x0} ${FV.topL + FV.hL + 70})`}>
				<polyline points={ecgPoints(t, FV.w, 26, 1.5, alignedEcg)} fill="none" stroke={INK.paper} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
			</g>
		</svg>
	</>
);

/**
 * The reverse pull on the phone: the squeegee is pulled DOWN the tall frame (a horizontal blade, its left end running
 * ahead), burying P6; FLAT / LINE flush orange on the thumps and, on 61.3, each line's paper opens like eyelids from its
 * own centre line onto P7 printed cold, line for line the couch's P7.
 */
const ReversePullV: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P7']);
	const wipe = easeOut((t - F.flatline3) / WIPE);
	const lean = 46;
	const edge = lerp(-2 * lean - 30, 1080 + 2 * lean + 30, wipe);
	const thump = thumpAt(t);
	const opened = t >= bt(61, 3);
	const open = opened ? 0.4 + 0.6 * easeOut((t - bt(61, 3)) / (5 / 30)) : 0;
	const lid = (top: number, h: number, shadow: string) => (
		<div key={`${top.toFixed(0)}-${shadow.length}`} style={{position: 'absolute', left: 0, top, width: 1920, height: Math.max(0, h), overflow: 'hidden', boxShadow: shadow}}>
			<div style={{position: 'absolute', left: 0, top: -top, width: 1920, height: 1080}}>
				<PaperFill />
			</div>
		</div>
	);
	const lids = [
		[FV.top, FV.hF, FV.sF],
		[FV.topL, FV.hL, FV.sL],
	].flatMap(([y0, h, s]) => {
		const a = y0 - 25 * s;
		const m = y0 + h / 2;
		const b = y0 + h + 25 * s;
		return [lid(a, (m - a) * (1 - open), '0 5px 9px rgba(40,25,10,0.32)'), lid(m + (b - m) * open, (b - m) * (1 - open), '0 -5px 9px rgba(40,25,10,0.32)')];
	});
	const ts = 1 + 0.022 * thump;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{wipe < 1 && <Pile t={t} />}
			<AbsoluteFill style={{clipPath: wipe < 1 ? `polygon(-10px -10px, 1930px -10px, 1930px ${edge - lean}px, -10px ${edge + lean}px)` : undefined}}>
				<AbsoluteFill style={{transform: `translate(${thump * 3}px, ${thump * 4}px) scale(${ts})`, transformOrigin: `${FV.cx}px ${FV.cy}px`}}>
					<PaperFill />
					{d && opened && <Press sheets={[p7Cold(d.P7, t, FLAT_CLIP_V)]} />}
					{opened && open < 1 && <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, clipPath: `path('${FLAT_GROWN_PATH_V}')`}}>{lids}</div>}
					{thump > 0.02 && (
						<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.9 * thump, mixBlendMode: 'multiply'}}>
							<path d={FLAT_GROWN_PATH_V} fill={INK.heat} />
						</svg>
					)}
					<ReverseSheetV t={t} />
				</AbsoluteFill>
			</AbsoluteFill>
			{wipe < 1 && (
				// the squeegee blade, pulled down the frame
				<div
					style={{
						position: 'absolute',
						left: -160,
						top: edge - 13,
						width: 2240,
						height: 26,
						transform: `rotate(${(-Math.atan2(2 * lean, 1920) * 180) / Math.PI}deg)`,
						background: 'linear-gradient(180deg, #121110 0%, #3a3631 55%, #8a8276 80%, #2a2724 100%)',
						boxShadow: '0 14px 26px rgba(30,20,10,0.45)',
					}}
				/>
			)}
		</AbsoluteFill>
	);
};

/* ----------------------------------------------------------------------------------------------------- */
/* the 9:16 cameras                                                                                      */

const SEAM: Frame = {k: K_FILL, x: 960, y: 540};
/** P2's world x for an image fraction u (the sheet spans x 20-1900). */
const p2x = (u: number) => P2_SHEET.cx + (u - 0.5) * P2_SHEET.w;

/**
 * DANCING: the camera sits behind the letters, full bleed on P2, and jumps on every beat of bar 54 so the windows
 * change while the word holds: Maya (54.1), the two friends looking up at her (54.2), her hand and hair as the heat
 * plate slips (54.3), Maya again (54.4); bar 55 stays on her as the word flies past, landing where FirstDance starts.
 */
const MAYA_P2 = p2x(0.55);
const DW_V = vtrack([
	[F.dancing, bleed(MAYA_P2)],
	[bt(54, 2), bleed(p2x(0.9))],
	[bt(54, 3), bleed(p2x(0.62))],
	[bt(54, 4), bleed(MAYA_P2)],
	[bt(55), bleed(960 + 1.03 * (MAYA_P2 - 960))],
	[bt(56) - 0.02, bleed(960 + 1.1 * (MAYA_P2 - 960)), 1.6],
]);

/** Where world point w lands on the stage under the pile camera c. */
const stageOf = (c: Pose, [wx, wy]: [number, number]): [number, number] => {
	const r = ((c.rot ?? 0) * Math.PI) / 180;
	const dx = (wx - c.cx) * c.s;
	const dy = (wy - c.cy) * c.s;
	return [960 + dx * Math.cos(r) - dy * Math.sin(r), 540 + dx * Math.sin(r) + dy * Math.cos(r)];
};
const landed = (tb: number) => [...MOVES_V].reverse().find((m) => m.t <= tb + 1e-6)!.to;
/** Full bleed on image point (u, v) of print p, as the pile camera has landed for the beat tb. */
const on = (tb: number, p: PrintDef, u: number, v: number, k = K_FILL): Frame => {
	const [x, y] = stageOf(landed(tb), onPrint(p, u, v));
	return bleed(x, y, k);
};

/** Each thrown print's subject (image fractions) and the zoom the phone lands on it with: P2's hair macro, P3 to P6. */
const LANDINGS: [PrintDef, number, number, number][] = [
	[PR2M, 0.62, 0.5, 1],
	[PR3, 0.55, 0.4, 1.15],
	[PR4, 0.57, 0.33, 1],
	[PR5, 0.545, 0.42, 1],
	[PR6, 0.5, 0.42, 1],
];
const land = (i: number): Frame => {
	const [p, u, v, m] = LANDINGS[i];
	return on(p.t0, p, u, v, K_FILL * m);
};

/**
 * FIRST DANCE: the camera lands on every print's subject as it is thrown down (a cut on the beat), and each print gets
 * a second shot on beat 2 or 4: a snap push into the face or a whip to the people around her.
 */
const B = (beat: number, bar: number) => bt(bar, beat);
const FD_KEYS = vtrack([
	// 56.1 P2: Maya from behind, hair whipping, her raised hand; 56.2 the two friends at the edge, looking up at her
	[bt(56), bleed(960 + 1.1 * (MAYA_P2 - 960))],
	[bt(56) + 0.3, on(bt(56), PR2, 0.55, 0.45), 0.3],
	[B(2, 56), on(B(2, 56), PR2, 0.88, 0.72, K_FILL * 1.25)],
	// 56.3 the hair macro on orange stock; 56.4 a whip back along the strands towards her head, at the same zoom
	// (pushing further in left only a field of 50 px dots)
	[B(3, 56), land(0)],
	[B(4, 56), on(B(4, 56), PR2M, 0.45, 0.5), 0.12],
	// 57.1 P3: the boots on the boards; 57.2 push onto the stepping boot; 57.3 the dot burst, pulled back to full
	// bleed so the boots read as a silhouette of fat dots; 57.4 back
	[bt(57), land(1)],
	[B(2, 57), on(bt(57), PR3, 0.6, 0.4, K_FILL * 1.32), 0.12],
	[B(3, 57), on(B(3, 57), PR3, 0.55, 0.4)],
	[B(4, 57), on(B(4, 57), PR3, 0.55, 0.4, K_FILL * 1.15), 0.15],
	// 58.1 P4: her face, eyes shut; 58.2 a snap push onto it; 58.3 the pull back to the pile; 58.4 across the pile
	[bt(58), land(2)],
	[B(2, 58), on(bt(58), PR4, 0.56, 0.3, K_FILL * 1.3), 0.12],
	[B(3, 58), bleed(...stageOf(PILE_V, [1060, 570]))],
	[B(4, 58), bleed(...stageOf(PILE_V, onPrint(PR4, 0.5, 0.35)), K_FILL * 1.45), 0.18],
	// 59.1 P5: Maya dancing, the sofa behind her; 59.2 push onto her; 59.3 the sofa punch-in (friends cold, Maya warm);
	// 59.4 a whip along the sofa to Jess and Dev, heads down in their phones
	[bt(59), land(3)],
	[B(2, 59), on(bt(59), PR5, 0.55, 0.36, K_FILL * 1.22), 0.12],
	[B(3, 59), on(B(3, 59), PR5, 0.52, 0.45)],
	[B(4, 59), on(B(3, 59), PR5, 0.33, 0.56), 0.14],
	// 60.1 P6: Jess looks up from her phone; 60.2 push in; 60.3 the key-only jolt on her eyes; 60.4 back
	[bt(60), land(4)],
	[B(2, 60), on(bt(60), PR6, 0.49, 0.36, K_FILL * 1.18), 0.12],
	[B(3, 60), on(B(3, 60), PR6, 0.53, 0.33, K_FILL * 1.4)],
	[B(4, 60), on(B(4, 60), PR6, 0.5, 0.42), 0.15],
]);
/**
 * While a print is in the air (and the pile camera whips to it), the phone follows its subject instead of waiting where
 * it will land, so the downbeat's own frame already shows the new print rather than the one it buries.
 */
const FD_V = (t: number): Frame => {
	const f = FD_KEYS(t);
	const i = LANDINGS.findIndex(([p]) => t >= p.t0 && t < p.t0 + 0.3);
	if (i < 0) return f;
	const [p, u, v] = LANDINGS[i];
	const [nx, ny] = stageOf(track(t, MOVES_V), onPrintAt(p, poseOf(p, t), u, v));
	const [lx, ly] = stageOf(landed(p.t0), onPrint(p, u, v));
	return bleed(f.x + nx - lx, f.y + ny - ly, f.k);
};

/**
 * REVERSE PULL: SEAM throughout (the block is laid out inside it), a snap punch on each thump, back on SEAM for the
 * couch. The punch zooms about the block's own centre, which stays where SEAM puts it (frame x 500, the middle of the
 * safe area), so FLAT / LINE grows evenly by a few px each side instead of sliding under the feed's buttons.
 */
const punch = (m: number): Frame => ({k: K_FILL * m, x: FV.cx - (FV.cx - SEAM.x) / m, y: FV.cy - (FV.cy - SEAM.y) / m});
const RP_V = vtrack([
	[F.flatline3, SEAM],
	[THUMPS[0], punch(1.03)],
	[THUMPS[0] + 0.3, SEAM, 0.24],
	[THUMPS[1], punch(1.03)],
	[THUMPS[1] + 0.3, SEAM, 0.24],
]);

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {DancingWord: {v: DW_V, vextra: DancingWordV}, FirstDance: {v: FD_V}, ReversePull: {v: RP_V}};
