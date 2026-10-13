import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {Density, useDensities} from './density';
import {INK} from './ink';
import {clamp01, CropMarks, easeInOut, easeOut, FlatlineBar, kickNudge, Rule, Sketch, Slug} from './kit';
import {bbox, inPoly, Poly, S5_PEOPLE, S5_PHONES} from './masks';
import {Cam, M, Plate, Sheet, sheetMatrix} from './press';
import {CamLayer, Paper, Press, SheetCanvas} from './Press';

// 1:56.1 drop 2: S5 printed cold (ultramarine line screen, the phones holes of bare paper). Maya is already warm;
// a hand-cut stencil pull warms one friend per glowsOff beat, spreading outward from her, and each phone fills black.

type Who = keyof typeof S5_PEOPLE;
const ORDER: [Who, number][] = [
	['maya', -1e9],
	['black', F.glowsOff[0]],
	['southAsian', F.glowsOff[1]],
	['eastAsian', F.glowsOff[2]],
	['curly', F.glowsOff[3]],
];
const MAYA_X = 0.43;
const CROP: [number, number, number, number] = [0.1, 0.13, 0.96, 1.0];
const S5S = {w: 1760, h: 990, cx: 960, cy: 520};

const BOX = Object.fromEntries(Object.entries(S5_PEOPLE).map(([k, p]) => [k, bbox(p)])) as Record<Who, ReturnType<typeof bbox>>;

/** 0..1 warmth at (u, v): inside a friend's stencil once their pull has passed. */
const warmMask = (t: number) => {
	const live = ORDER.map(([who, t0]) => ({who, poly: S5_PEOPLE[who], b: BOX[who], k: clamp01((t - t0) / 0.24), left: BOX[who].x1 < MAYA_X + 0.05})).filter((x) => x.k > 0);
	return (u: number, v: number) => {
		for (const x of live) {
			if (u < x.b.x0 || u > x.b.x1 || v < x.b.y0 || v > x.b.y1) continue;
			if (!inPoly(x.poly, u, v)) continue;
			if (x.k >= 1) return 1;
			// the pull travels away from Maya
			const f = x.left ? (x.b.x1 - u) / (x.b.x1 - x.b.x0) : (u - x.b.x0) / (x.b.x1 - x.b.x0);
			return f < x.k ? 1 : 0;
		}
		return 0;
	};
};

const anyPerson = (u: number, v: number) => {
	for (const p of Object.values(S5_PEOPLE)) if (inPoly(p, u, v)) return 1;
	return 0;
};

const fillPolys = (ctx: CanvasRenderingContext2D, m: M, polys: Poly[], sheet: {w: number; h: number}, crop: [number, number, number, number], ink: string) => {
	ctx.save();
	ctx.globalCompositeOperation = 'multiply';
	ctx.fillStyle = ink;
	ctx.beginPath();
	for (const poly of polys) {
		poly.forEach(([u, v], i) => {
			const px = ((u - crop[0]) / (crop[2] - crop[0])) * sheet.w;
			const py = ((v - crop[1]) / (crop[3] - crop[1])) * sheet.h;
			const x = m[0] * px + m[2] * py + m[4];
			const y = m[1] * px + m[3] * py + m[5];
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		ctx.closePath();
	}
	ctx.fill();
	ctx.restore();
};

export const s5Sheets = (d: Density, t: number, wash: number, nudge = true): Sheet[] => {
	const warm = warmMask(t);
	const [ox, oy] = nudge ? kickNudge(t, 1, 2) : [0, 0];
	const base = {map: d, crop: CROP, ...S5S, seed: 5};
	const cold: Plate = {ch: 2, ink: INK.cold, angle: 75, cell: 7, kind: 'line', mask: (u, v) => 1 - warm(u, v), alpha: 1 - wash, gain: 0.82};
	const heat: Plate = {ch: 1, ink: INK.heat, angle: 15, cell: 7, mask: warm, dx: 2 + ox, dy: -1 + oy};
	const key: Plate = {ch: 0, ink: INK.key, angle: 45, cell: 7, mask: warm, gain: 0.85};
	const sheets: Sheet[] = [{...base, plates: [cold, heat, key]}];
	if (wash > 0) {
		const room = (u: number, v: number) => 1 - anyPerson(u, v);
		sheets.push({...base, speckle: 0, plates: [{...heat, mask: room, alpha: wash}, {...key, mask: room, alpha: wash}]});
	}
	return sheets;
};

const warmPhones = (t: number) => ORDER.filter(([, t0]) => t >= t0 + 0.12).map(([w]) => S5_PHONES[w]);

export const Couch: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['S5']);
	const wash = easeInOut((t - F.glowsOff[4]) / 0.45);
	const cam: Cam = {cx: 960 + (t - F.couch) * 4, cy: 540, s: 1.0 + (t - F.couch) * 0.006};
	const peel = easeInOut((t - F.couch) / 0.34);
	const sx = S5S.cx - S5S.w / 2;
	const sy = S5S.cy - S5S.h / 2;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && (
				<Press
					cam={cam}
					sheets={s5Sheets(d.S5, t, wash)}
					draw={(ctx) => {
						const m = sheetMatrix({...S5S}, cam, 1920, 1080);
						fillPolys(ctx, m, warmPhones(t), S5S, CROP, INK.key);
					}}
				/>
			)}
			<CamLayer cam={cam}>
				<CropMarks x={sx} y={sy} w={S5S.w} h={S5S.h} />
				<Slug x={sx} y={sy + S5S.h + 26} text={`S5 · COLD 75° LINE · HEAT 15° · KEY 45° · STENCIL ${Math.min(5, ORDER.filter(([, t0]) => t >= t0).length)}/5`} />
				<Rule x={sx + 900} y={sy + S5S.h + 40} w={S5S.w - 900} t={t} amp={20} />
			</CamLayer>
			{peel < 1 && (
				// the black FLATLINE sheet peels up off the print
				<AbsoluteFill style={{perspective: 1600}}>
					<div style={{position: 'absolute', inset: 0, transformOrigin: '50% 0%', transform: `rotateX(${-100 * peel}deg)`, boxShadow: `0 ${40 * peel}px ${80 * peel}px rgba(40,25,10,${0.4 * peel})`}}>
						<div style={{position: 'absolute', inset: 0, background: INK.paper}}>
							<Paper />
						</div>
						<FlatlineBar x={-40} y={-40} w={2000} h={1160} text="FLATLINE" size={430} />
					</div>
				</AbsoluteFill>
			)}
		</AbsoluteFill>
	);
};

// 2:01.6 "they join her": the page tips back and the friends fold upright as a pop-up, bobbing on alternate beats.
export const PopUp: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['S5']);
	const tip = easeOut((t - F.join) / 0.3);
	const shut = easeInOut((t - bt(67, 4)) / (bt(68) - bt(67, 4)));
	const stand = (n: number) => easeOut((t - [bt(65), bt(65, 2), bt(65, 3)][n]) / 0.22);
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	const bob = (k: number) => (t >= bt(66) && (BEATS[i].beat + k) % 2 === 0 ? Math.exp(-since / 0.14) : 0);
	if (!d) return <AbsoluteFill style={{background: INK.paper}} />;
	const full = s5Sheets(d.S5, F.glowsOff[4] + 1, 1, false);
	const scale = 0.62;
	const people: Who[] = ['southAsian', 'maya', 'black', 'eastAsian', 'curly'];
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<Paper />
			<AbsoluteFill style={{perspective: 1700, perspectiveOrigin: '50% 30%'}}>
				<div
					style={{
						position: 'absolute',
						left: 960 - (S5S.w * scale) / 2,
						top: 300,
						width: S5S.w * scale,
						height: S5S.h * scale,
						transformStyle: 'preserve-3d',
						transformOrigin: '50% 100%',
						transform: `rotateX(${55 * tip + 35 * shut}deg) translateY(${shut * 120}px)`,
					}}
				>
					{/* the wall layer: the room print, people cut away */}
					<div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '0 0', boxShadow: '0 30px 60px rgba(60,40,20,0.25)'}}>
						<div style={{position: 'absolute', left: 0, top: 0, width: S5S.w, height: S5S.h, background: INK.paper}}>
							<Paper x={0} y={0} w={S5S.w} h={S5S.h} />
						</div>
						{full.map((s, n) => (
							<SheetCanvas key={n} sheet={{...s, ground: n === 0 ? INK.paper : undefined, plates: s.plates.map((p) => ({...p, mask: (u: number, v: number) => (anyPerson(u, v) ? 0.25 : 1) * (p.mask ? p.mask(u, v) : 1)}))}} res={0.6} blend={false} />
						))}
					</div>
					{/* the sofa layer: each friend a pull-tab that stands up and bobs */}
					{people.map((who, n) => {
						const b = BOX[who];
						const px = ((b.x0 - CROP[0]) / (CROP[2] - CROP[0])) * S5S.w;
						const py = ((b.y0 - CROP[1]) / (CROP[3] - CROP[1])) * S5S.h;
						const pw = ((b.x1 - b.x0) / (CROP[2] - CROP[0])) * S5S.w;
						const ph = ((Math.min(b.y1, CROP[3]) - b.y0) / (CROP[3] - CROP[1])) * S5S.h;
						const up = stand(n === 1 ? 0 : n % 2 ? 1 : 2);
						return (
							<div
								key={who}
								style={{
									position: 'absolute',
									left: px * scale,
									top: py * scale,
									width: pw * scale,
									height: ph * scale,
									transformOrigin: '50% 100%',
									transform: `translateZ(${4 + n}px) rotateX(${-55 * tip * up}deg) translateY(${-bob(n) * 26}px)`,
									filter: 'drop-shadow(0 8px 10px rgba(60,40,20,0.3))',
								}}
							>
								<div style={{position: 'absolute', left: (-px * scale), top: (-py * scale), width: S5S.w, height: S5S.h, transform: `scale(${scale})`, transformOrigin: '0 0'}}>
									{full.slice(0, 1).map((s, k) => (
										<SheetCanvas
											key={k}
											sheet={{...s, ground: INK.paper, clip: S5_PEOPLE[who].map(([u, v]) => [(u - CROP[0]) / (CROP[2] - CROP[0]), (v - CROP[1]) / (CROP[3] - CROP[1])] as [number, number]), plates: s.plates.filter((p) => p.ch !== 2)}}
											res={0.6}
											blend={false}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
			<Slug x={60} y={1030} text="S5 · POP-UP · PULL TABS 1–5" />
		</AbsoluteFill>
	);
};

// 2:01.6–2:07.1 (bars 65–67): they join her (replaces the pop-up book).
export const Join = Sketch('they join her');
