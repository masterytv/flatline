import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Density, useDensities} from './density';
import {ANTON, hash2, INK} from './ink';
import {clamp01, CropMarks, easeInOut, easeOut, inked, kickNudge, RegTarget, Rule, Slug, stamp} from './kit';
import {Cam, CAM0, Plate, plateDots, Sheet, sheetMatrix} from './press';
import {CamLayer, Paper, Press} from './Press';
import {KeepsakePrint} from './s_outro';

// 3:07.8–3:18.3: macro proofs of R5 on the beat, then R9 pulled plate by plate, frozen half-printed on "Still",
// and on "Dancing" (the loudest beat) every halftone dot tears loose.

const MACROS: {c: [number, number, number]; paper?: string; plates: [number, string, number][]}[] = [
	{c: [0.415, 0.515, 0.11], plates: [[1, INK.heat, 15], [0, INK.key, 45]]}, // laughing face
	{c: [0.68, 0.33, 0.15], paper: INK.heat, plates: [[0, INK.key, 45]]}, // raised hands
	{c: [0.06, 0.66, 0.12], plates: [[2, INK.cold, 75], [0, INK.key, 45]]}, // sequinned shoulder
	{c: [0.53, 0.14, 0.17], plates: [[1, INK.heat, 15], [0, INK.key, 45]]}, // confetti
	{c: [0.545, 0.515, 0.1], paper: INK.heat, plates: [[0, INK.key, 45]]}, // face looking up
	{c: [0.69, 0.47, 0.1], plates: [[2, INK.cold, 75], [1, INK.heat, 15]]}, // laughing
	{c: [0.2, 0.8, 0.17], plates: [[1, INK.heat, 15], [0, INK.key, 45]]}, // falling confetti
];
const MACRO_T = [bt(101, 2), bt(101, 3), bt(101, 4), bt(102), bt(102, 2), bt(102, 3), bt(102, 4)];

export const Macros: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R5']);
	let n = 0;
	while (n + 1 < MACRO_T.length && MACRO_T[n + 1] <= t) n++;
	const m = MACROS[n];
	const [cx, cy, size] = m.c;
	const k = (t - MACRO_T[n]) / 0.46;
	const s = 1.0 + 0.04 * k; // a hair of push inside each beat
	const sheet: Sheet | null = d
		? {
				map: d.R5,
				crop: [cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2],
				w: 1920,
				h: 1080,
				cx: 960,
				cy: 540,
				s,
				plates: m.plates.map(([ch, ink, angle], i) => ({ch: ch as 0 | 1 | 2, ink, angle, cell: 46, dx: i ? 6 : 0, dy: i ? -4 : 0})),
				seed: n,
			}
		: null;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<Paper tint={m.paper} x={-100} y={-100} w={2120} h={1280} />
			{sheet && <Press sheets={[sheet]} />}
			<Slug x={60} y={1030} text={`R5 · MACRO ${n + 1}/7 · 1 DOT = 46 PX`} />
		</AbsoluteFill>
	);
};

// R9 on a press sheet
const R9S = {w: 1640, h: 915, cx: 960, cy: 498};
const STOP = 0.565; // where the key pull stops dead on "Still": just right of Maya and her trail

const r9Plates = (t: number, frozen: boolean): Plate[] => {
	const bPull = clamp01((t - bt(103)) / 0.24);
	const oPull = Math.min(STOP, clamp01((t - bt(103, 3)) / 0.3) * STOP);
	const kPull = t < F.still ? STOP * easeInOut((t - bt(104)) / (F.still - bt(104))) : STOP;
	const finish = t >= F.dancing2 ? clamp01((t - F.dancing2) / (2 / 30)) : 0;
	const [bx, by] = frozen ? [0, 0] : kickNudge(t, 2, 2);
	const [ox, oy] = frozen ? [0, 0] : kickNudge(t, 1, 2);
	return [
		// where the warm plates land (left of the stop) the cold plate carries only shadows, or the overprint goes to mud
		{ch: 2, ink: INK.cold, angle: 75, cell: 9, kind: 'dot', pull: bPull, dx: 2 + bx, dy: 1 + by, gain: 0.85, gamma: 1.25, mask: (u) => (u < STOP ? 0.42 : 1)},
		{ch: 1, ink: INK.heat, angle: 15, cell: 9, pull: oPull + (1 - oPull) * finish, dx: -1 + ox, dy: 2 + oy, gain: 0.95},
		{ch: 0, ink: INK.key, angle: 45, cell: 9, pull: t < bt(104) ? 0 : kPull + (1 - kPull) * finish, gain: 0.72, gamma: 1.45},
	];
};

/** The squeegee: a rubber blade with a bead of ink pushed ahead of it. */
const Squeegee: React.FC<{x: number; y: number; h: number; ink: string}> = ({x, y, h, ink}) => (
	<div style={{position: 'absolute', left: x - 6, top: y - 50, width: 60, height: h + 100}}>
		<div style={{position: 'absolute', left: 0, top: 46, width: 13, height: h + 8, background: ink, borderRadius: 6, mixBlendMode: 'multiply', ...inked(400, 0, 3)}} />
		<div style={{position: 'absolute', left: 14, top: 0, width: 30, height: h + 100, background: 'linear-gradient(90deg, #2A2724 0%, #4A4540 35%, #1E1C1A 100%)', borderRadius: 4, boxShadow: '10px 0 22px rgba(40,25,10,0.35)'}} />
		<div style={{position: 'absolute', left: 22, top: 0, width: 5, height: h + 100, background: 'rgba(255,255,255,0.12)'}} />
	</div>
);

export const R9Pull: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R9']);
	const frozen = t >= F.still;
	const tt = frozen ? F.still : t;
	const cam: Cam = {cx: 960 + (tt - bt(103)) * 3, cy: 540, s: 1.0 + (tt - bt(103)) * 0.004};
	const plates = r9Plates(t, frozen);
	const kPull = plates[2].pull ?? 0;
	const pulling = t >= bt(104) && t < F.dancing2;
	const st = stamp(t, F.still);
	const sx = R9S.cx - R9S.w / 2;
	const sy = R9S.cy - R9S.h / 2;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && <Press cam={cam} sheets={[{map: d.R9, ...R9S, plates, seed: 9}]} />}
			<CamLayer cam={cam}>
				<CropMarks x={sx} y={sy} w={R9S.w} h={R9S.h} />
				<RegTarget x={sx - 60} y={R9S.cy} />
				<Slug x={sx} y={sy + R9S.h + 26} text={`R9 · PULL ${t < bt(103, 3) ? 1 : t < bt(104) ? 2 : 3}/3 · ${frozen ? 'STOPPED' : 'RUNNING'}`} />
				<Rule x={sx + 560} y={sy + R9S.h + 40} w={R9S.w - 560} t={tt} freeze={frozen ? F.still : undefined} alive={() => !frozen} amp={22} />
				{pulling && <Squeegee x={sx + kPull * R9S.w} y={sy} h={R9S.h} ink={INK.key} />}
				{st.on && (
					<svg
						viewBox={`0 0 ${R9S.w * (1 - STOP) - 50} 700`}
						style={{position: 'absolute', left: sx + R9S.w * STOP + 34, top: sy + 120, width: R9S.w * (1 - STOP) - 50, height: 700, overflow: 'visible', transform: `scale(${st.s})`, transformOrigin: '50% 60%', mixBlendMode: 'multiply', ...inked(900, 11, 70, true)}}
					>
						<text x={0} y={640} fontFamily="Anton" fontSize={820} textLength={R9S.w * (1 - STOP) - 50} lengthAdjust="spacingAndGlyphs" fill={INK.key}>
							STILL
						</text>
					</svg>
				)}
			</CamLayer>
		</AbsoluteFill>
	);
};

// "Dancing": every dot of R9 blasts toward the rostrum camera and falls back onto the table as confetti.
type Dot = {x: number; y: number; r: number; ink: string; vx: number; vy: number; vz: number; t0: number; spin: number; ph: number; fall: boolean};
const dotCache = new Map<string, Dot[]>();

const explodeDots = (d: Density): Dot[] => {
	const hit = dotCache.get(d.id);
	if (hit) return hit;
	const full = r9Plates(F.dancing2 + 1, true).map((p) => ({...p, pull: 2}));
	const sheet: Sheet = {map: d, ...R9S, plates: full, seed: 9};
	const m = sheetMatrix(sheet, CAM0, 1920, 1080);
	const out: Dot[] = [];
	const ox = R9S.cx - R9S.w / 2 + R9S.w * 0.42;
	const oy = R9S.cy - R9S.h / 2 + R9S.h * 0.58;
	full.forEach((p, pi) => {
		const a = plateDots(sheet, p);
		for (let q = 0; q < a.length; q += 5) {
			if (a[q + 2] < 0.9) continue;
			const x = m[0] * a[q] + m[2] * a[q + 1] + m[4] + (p.dx ?? 0);
			const y = m[1] * a[q] + m[3] * a[q + 1] + m[5] + (p.dy ?? 0);
			const h1 = hash2(a[q + 3], a[q + 4], 50 + pi);
			const h2 = hash2(a[q + 4], a[q + 3], 60 + pi);
			const h3 = hash2(a[q + 3] + 7, a[q + 4] - 3, 70 + pi);
			const fall = hash2(a[q + 3] - 11, a[q + 4] + 5, 80 + pi) < 0.045;
			const dx = x - ox;
			const dy = y - oy;
			const dist = Math.hypot(dx, dy) + 1e-3;
			const ang = Math.atan2(dy, dx) + (h1 - 0.5) * 1.1;
			const sp = fall ? 500 + 1500 * h2 * h2 : 120 + 520 * h2;
			out.push({
				x,
				y,
				r: a[q + 2],
				ink: p.ink,
				vx: Math.cos(ang) * sp,
				vy: Math.sin(ang) * sp,
				// most dots blast up past the rostrum camera; a few tumble back down onto the table
				vz: fall ? 0.5 + 1.1 * h3 : 2.4 + 3.2 * h3,
				t0: dist / 7000,
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

export const drawExplosion = (ctx: CanvasRenderingContext2D, dots: Dot[], tau: number, cam: Cam) => {
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
				// tumbling disc: inked face or bare paper back; it lands one way or the other
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

export const Explosion: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R9']);
	const dots = useMemo(() => (d ? explodeDots(d.R9) : []), [d]);
	const tau = t - F.dancing2 - 2 / 30;
	const camShake = tau < 0.3 && tau > 0 ? Math.sin(tau * 90) * 8 * (1 - tau / 0.3) : 0;
	const cam: Cam = {cx: 960 + 3 * (F.still - bt(103)) + camShake, cy: 540, s: 1 + (F.still - bt(103)) * 0.004};
	const beats = [bt(106), bt(106, 2), bt(106, 3), bt(106, 4)];
	let bi = -1;
	beats.forEach((b, i) => (t >= b ? (bi = i) : null));
	const bounce = bi >= 0 ? Math.exp(-(t - beats[bi]) / 0.12) : 0;
	const wst = stamp(t, F.dancing2 + 0.12);
	const word = wst.on ? 1 : 0;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{tau < 0 && d ? (
				<Press cam={cam} sheets={[{map: d.R9, ...R9S, plates: r9Plates(t, false), seed: 9}]} />
			) : (
				<CamLayer cam={cam}>
					<div
						style={{
							position: 'absolute',
							left: 0,
							width: 1920,
							top: 300 - bounce * 26,
							textAlign: 'center',
							fontFamily: ANTON,
							fontSize: 470,
							lineHeight: 1,
							letterSpacing: '0.01em',
							color: INK.key,
							opacity: word,
							transform: `scale(${(1 + bounce * 0.035) * wst.s})`,
							mixBlendMode: 'multiply',
							...inked(900, 70, 20, true),
						}}
					>
						DANCING
					</div>
				</CamLayer>
			)}
			{tau >= 0 && <Press cam={cam} sheets={[]} draw={(ctx) => drawExplosion(ctx, dots, tau, cam)} />}
			<CamLayer cam={cam}>
				<Rule x={140} y={1010} w={1640} t={t} amp={26} />
			</CamLayer>
			<KeepsakePrint t={t} />
		</AbsoluteFill>
	);
};

