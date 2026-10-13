import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, beatsIn, bt, lastBeatIndex} from '../timing';
import {Density, useDensities} from './density';
import {hash2, INK, MONO} from './ink';
import {clamp01, easeIn, easeOut, ecg, FlatlineBar, inked, kickNudge, lerp, RegTarget, Slug, stamp} from './kit';
import {inPoly, Poly} from './masks';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, PaperFill, Press} from './Press';

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
const RIM = 8; // a paper trap round every letter window, so a letter never drops into the flood where she is dark

/** P2 on the table: the same sheet behind the letters, under the fly-through and at the bottom of the pile. */
const P2_SHEET = {w: 1880, h: 1049, cx: 960, cy: 540};

const wordZoom = (t: number) => {
	const x = clamp01((t - bt(55)) / (bt(56) - bt(55)));
	return {x, z: Math.exp(Math.log(ZMAX) * Math.pow(x, 2.4))};
};

export const DancingWord: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P2']);
	const slam = stamp(t, F.dancing);
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	const {x, z} = wordZoom(t);
	// bar 54, every beat: 54.1 stamp, 54.2 pulse and shift, 54.3 heat 8 px off register, 54.4 back in register
	const pulse = t < bt(55) ? Math.exp(-since / 0.1) : 0;
	const shifted = t >= bt(54, 2) && t < bt(54, 4);
	const shiftK = shifted ? easeOut((t - bt(54, 2)) / 0.1) : t >= bt(54, 4) ? 1 - easeOut((t - bt(54, 4)) / 0.1) : 0;
	const off = t >= bt(54, 3) && t < bt(54, 4) ? 1 : 0;
	// 55.3 kick nudge mid-zoom (and a small one on every beat)
	const [kx, ky] = kickNudge(t, 0, t >= bt(55, 3) && t < bt(55, 4) ? 6 : 2);
	const [hx, hy] = kickNudge(t, 1, t >= bt(55, 3) && t < bt(55, 4) ? 7 : 2);
	const ps = 1 + 0.1 * easeIn(x); // the print behind pushes in a little: depth for the fly-through
	const cam: Cam = {cx: 960 + 16 * shiftK, cy: 540 - 8 * shiftK, s: ps};
	const ws = z * slam.s * (1 + 0.035 * pulse * (1 - x));
	const jx = t >= bt(55, 3) && t < bt(55, 4) ? (hash2(i, 1, 9) - 0.5) * 22 * Math.exp(-since / 0.09) : 0;
	const word = `translate(${NC_GAP.x + jx} ${NC_GAP.y}) scale(${ws}) translate(${-NC_GAP.x} ${-NC_GAP.y})`;
	const svgBox: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'};
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[{map: d.P2, ...P2_SHEET, seed: 3, plates: heatKey(8.5, 8 * off + hx, -5 * off + hy, kx, ky)}]} />}
			{/* the paper trap round each letter */}
			<svg viewBox="0 0 1920 1080" style={svgBox}>
				<g transform={word}>
					{DANCING_PATHS.map((p, n) => (
						<path key={n} d={p} fill="none" stroke={INK.paper} strokeWidth={RIM * 2} strokeLinejoin="round" />
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
								<path key={n} d={p} fill="black" stroke="black" strokeWidth={RIM * 2} strokeLinejoin="round" />
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

/** Frame a print: it fills the frame with its edges just showing, the camera taking out most of its tilt. */
const frameOn = (p: PrintDef, s = 1.05): Pose => ({cx: p.cx, cy: p.cy, s, rot: -0.65 * p.rot});

const SOFA = onPrint(PR5, 0.445, 0.6);
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
	{t: bt(59, 3), to: {cx: SOFA[0], cy: SOFA[1], s: 2.15, rot: -PR5.rot}, dur: 0.1}, // punch-in on the sofa
	{t: bt(60), to: frameOn(PR6), dur: 0.2},
	{t: bt(60, 3), to: frameOn(PR6, 1.1), dur: 0.07},
	{t: bt(60, 4), to: frameOn(PR6, 1.05), dur: 0.2},
];

const pileCam = (t: number): Cam => beatHit(track(t, MOVES), t, bt(56));

const platesFor = (n: number, t: number): Plate[] => {
	const [kx, ky] = kickNudge(t, 0, 2);
	const [hx, hy] = kickNudge(t, 1, 2.5);
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
			// the sofa punch-in: the friends on their phones go cold (line screen), Maya stays warm
			const cold: Plate = {ch: 2, ink: INK.cold, angle: 75, cell: 5, kind: 'line', gain: 0.74, mask: (u, v) => 1 - mayaP5(u, v)};
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
	const d = useDensities(['P2', 'P3', 'P4', 'P5', 'P6']);
	const cam = pileCam(t);
	const live = PRINTS.map((p, n) => ({p, n})).filter(({p}) => t >= p.t0);
	const sheets: Sheet[] = [];
	if (d) {
		for (const {p, n} of live) {
			const q = poseOf(p, t);
			const r = (q.rot * Math.PI) / 180;
			const off = ((FOOT - MARGIN) / 2) * q.s;
			const map: Density = d[p.id];
			// the paper first (hides what is under it), then the image
			sheets.push({map, w: p.w + 2 * MARGIN, h: p.h + MARGIN + FOOT, cx: q.cx - Math.sin(r) * off, cy: q.cy + Math.cos(r) * off, s: q.s, rot: q.rot, plates: [], ground: 'white', speckle: 0});
			sheets.push({map, crop: p.crop, w: p.w, h: p.h, cx: q.cx, cy: q.cy, s: q.s, rot: q.rot, plates: platesFor(n, t), seed: 11 + n * 7});
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

/** P7 as the couch stencils print it at 116.100 (same sheet, same place: see s_couch.tsx). */
export const P7_SHEET = {w: 1760, h: 982, cx: 960, cy: 520};

// FLATLINE exactly as kit's FlatlineBar sets it here (Anton 430, letter-spacing 0.04 em, centred on x 960,
// baseline 694.8), flattened from the font's outlines to polygons in frame px (checked against a render: within 2 px).
const FLAT_POLYS: number[][] = [
	[217.2, 694.8, 217.2, 325.3, 365, 325.3, 365, 397.3, 291.6, 397.3, 291.6, 456.1, 361.3, 456.1, 361.3, 527.3, 291.6, 527.3, 291.6, 694.8],
	[406, 694.8, 406, 325.3, 479.9, 325.3, 479.9, 631.8, 555.9, 631.8, 555.9, 694.8],
	[584, 694.8, 619.7, 325.3, 745, 325.3, 780.1, 694.8, 710.2, 694.8, 704.9, 635.2, 660.4, 635.2, 655.8, 694.8],
	[665.7, 576.2, 699.3, 576.2, 683.1, 388.3, 679.7, 388.3],
	[851.7, 694.8, 851.7, 396.2, 807.8, 396.2, 807.8, 325.3, 969.5, 325.3, 969.5, 396.2, 925.6, 396.2, 925.6, 694.8],
	[1007.2, 694.8, 1007.2, 325.3, 1081.1, 325.3, 1081.1, 631.8, 1157.2, 631.8, 1157.2, 694.8],
	[1192, 694.8, 1192, 325.3, 1263.4, 325.3, 1263.4, 694.8],
	[1310, 694.8, 1310, 325.3, 1386, 325.3, 1420, 502.3, 1420, 325.3, 1491.4, 325.3, 1491.4, 694.8, 1419.2, 694.8, 1382.2, 510, 1382.2, 694.8],
	[1541.3, 694.8, 1541.3, 325.3, 1689.1, 325.3, 1689.1, 396.7, 1616.5, 396.7, 1616.5, 468.7, 1686.2, 468.7, 1686.2, 538.2, 1616.5, 538.2, 1616.5, 622.8, 1694, 622.8, 1694, 694.8],
];

const FLAT_PATH = FLAT_POLYS.map((p) => 'M' + p.join(' ') + 'Z').join('');

/** The letters as a 4 px grid, grown by 8 px so the black bar trims every dot that straddles an edge. */
let flatGrid: Uint8Array | null = null;
const GRID = 4;
const GW = 1920 / GRID;
const GH = 1080 / GRID;
const inFlat = (x: number, y: number) => {
	let c = false;
	for (const p of FLAT_POLYS) {
		for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
			const xi = p[i];
			const yi = p[i + 1];
			const xj = p[j];
			const yj = p[j + 1];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
		}
	}
	return c;
};
const flatAt = (x: number, y: number) => {
	if (!flatGrid) {
		const raw = new Uint8Array(GW * GH);
		for (let gy = 0; gy < GH; gy++) {
			const y = (gy + 0.5) * GRID;
			if (y < 300 || y > 720) continue;
			for (let gx = 0; gx < GW; gx++) raw[gy * GW + gx] = inFlat((gx + 0.5) * GRID, y) ? 1 : 0;
		}
		flatGrid = new Uint8Array(GW * GH);
		for (let gy = 2; gy < GH - 2; gy++) {
			for (let gx = 2; gx < GW - 2; gx++) {
				let on = 0;
				for (let dy = -2; dy <= 2 && !on; dy++) for (let dx = -2; dx <= 2 && !on; dx++) on = raw[(gy + dy) * GW + gx + dx];
				flatGrid[gy * GW + gx] = on;
			}
		}
	}
	const gx = Math.floor(x / GRID);
	const gy = Math.floor(y / GRID);
	return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? 0 : flatGrid[gy * GW + gx];
};

/** P7 printed cold, only inside the FLATLINE letters (nothing ghosts through the black). */
const p7Cold = (map: Density): Sheet => ({
	map,
	...P7_SHEET,
	seed: 5,
	plates: [{ch: 2, ink: INK.cold, angle: 75, cell: 7, kind: 'line', gain: 0.82, mask: (u, v) => flatAt(P7_SHEET.cx + (u - 0.5) * P7_SHEET.w, P7_SHEET.cy + (v - 0.5) * P7_SHEET.h)}],
});

const THUMPS = [bt(61, 2), bt(61, 4)];
const WIPE = 0.2;

export const ReversePull: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P7']);
	const wipe = easeOut((t - F.flatline3) / WIPE);
	const lean = 90; // the blade leans: its top runs ahead
	const edge = lerp(-2 * lean, 1920 + 2 * lean, wipe);
	const thump = Math.max(...THUMPS.map((b) => (t >= b ? Math.exp(-(t - b) / 0.11) : 0)));
	const open = easeOut((t - bt(61, 3)) / (5 / 30));
	const ts = 1 + 0.022 * thump;
	const tx = thump * 5;
	const ty = thump * 3;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			{wipe < 1 && <Pile t={t} />}
			<AbsoluteFill style={{clipPath: wipe < 1 ? `polygon(-10px -10px, ${edge + lean}px -10px, ${edge - lean}px 1090px, -10px 1090px)` : undefined}}>
				<AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${ts})`}}>
					<PaperFill />
					{d && t >= bt(61, 3) && <Press sheets={[p7Cold(d.P7)]} />}
					{/* the letters' paper opens from their centre line like eyelids */}
					{open < 1 && (
						<div style={{position: 'absolute', left: -40, top: -40, width: 2000, height: 1160, transformOrigin: '50% 510px', transform: `scaleY(${1 - open})`}}>
							<PaperFill />
						</div>
					)}
					{/* a heartbeat tries: the letters flush orange on each thump */}
					{thump > 0.02 && (
						<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.9 * thump, mixBlendMode: 'multiply'}}>
							<path d={FLAT_PATH} fill={INK.heat} fillRule="evenodd" stroke={INK.heat} strokeWidth={10} strokeLinejoin="round" />
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
