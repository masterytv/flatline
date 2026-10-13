import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BEATS, bt, lastBeatIndex} from '../../timing';
import {useDensities} from './density';
import {INK} from './ink';
import {easeInOut, easeOut, kickNudge, Slug} from './kit';
import {R6_PHONES, S2_FACES} from './masks';
import {Cam, M, sheetMatrix} from './press';
import {CamLayer, Paper, Press, SheetCanvas} from './Press';

// 2:38.2 drop 3: the marble table from above in black and orange. Its face-down phones are solid black ink;
// every 2 beats one swings open like a door onto a friend's face from the party she was filming (S2).

const R6S = {w: 2600, h: 1451, cx: 1038, cy: 424};
const OPEN_T = [bt(86), bt(86, 3), bt(87), bt(87, 3), bt(88), bt(88, 3), bt(89)];
// which phone opens on each of those beats (round the table), and which face it shows
const OPEN_ORDER = [2, 5, 0, 4, 1, 6, 3];
const FACE_FOR = [3, 1, 0, 2, 4, 5, 6]; // phone index -> S2 face index

const geom = (q: [number, number][]) => {
	const pts = q.map(([u, v]) => [R6S.cx - R6S.w / 2 + u * R6S.w, R6S.cy - R6S.h / 2 + v * R6S.h]);
	const c = [pts.reduce((a, p) => a + p[0], 0) / 4, pts.reduce((a, p) => a + p[1], 0) / 4];
	const e1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
	const e2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
	const [a, b] = e1 >= e2 ? [pts[0], pts[1]] : [pts[1], pts[2]];
	const L = Math.max(e1, e2);
	const W = Math.min(e1, e2);
	const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
	return {c, L, W, ang, pts};
};
const PHONES = R6_PHONES.map(geom);
const TABLE_C = [R6S.cx - R6S.w / 2 + 0.47 * R6S.w, R6S.cy - R6S.h / 2 + 0.58 * R6S.h];

/** A square crop of S2 around a face, sized so the face (eyes to chin) fills the window's short side. */
const faceCrop = (n: number, S: number, W: number): [number, number, number, number] => {
	const [fx, fy, fw] = S2_FACES[n];
	const cs = (fw * 2752 * 1.25 * S) / (W * 1.05);
	const cw = cs / 2752;
	const ch = cs / 1536;
	const cx = Math.min(1 - cw / 2, Math.max(cw / 2, fx));
	const cy = Math.min(1 - ch / 2, Math.max(ch / 2, fy + fw * 0.15));
	return [cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2];
};

export const Table: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R6', 'S2']);
	const turn = easeInOut((t - bt(90)) / (bt(92, 3) - bt(90)));
	const cam: Cam = {cx: 960, cy: 540, s: 1 - 0.16 * turn, rot: 12 * turn};
	const [kx, ky] = kickNudge(t, 1, 2);
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && (
				<Press
					cam={cam}
					sheets={[
						{
							map: d.R6,
							...R6S,
							seed: 6,
							plates: [
								// the table recedes: a light orange field with only the deepest shadows in key
								{ch: 1, ink: INK.heat, angle: 15, cell: 10, dx: 2 + kx, dy: -1 + ky, gain: 0.72, gamma: 1.2},
								{ch: 0, ink: INK.key, angle: 45, cell: 10, gain: 0.55, gamma: 2.2},
							],
						},
					]}
					draw={(ctx) => {
						// the phones as solid black ink shapes
						const m: M = sheetMatrix({w: 1920, h: 1080, cx: 960, cy: 540}, cam, 1920, 1080);
						ctx.save();
						ctx.globalCompositeOperation = 'multiply';
						ctx.fillStyle = INK.key;
						ctx.beginPath();
						for (const p of PHONES) {
							p.pts.forEach(([x, y], k) => {
								const X = m[0] * x + m[2] * y + m[4];
								const Y = m[1] * x + m[3] * y + m[5];
								if (k) ctx.lineTo(X, Y);
								else ctx.moveTo(X, Y);
							});
							ctx.closePath();
						}
						ctx.fill();
						ctx.restore();
					}}
				/>
			)}
			<CamLayer cam={cam}>
				{d &&
					PHONES.map((p, n) => {
						const k = OPEN_ORDER.indexOf(n);
						const t0 = OPEN_T[k];
						const open = easeOut((t - t0) / 0.34);
						if (open <= 0) return null;
						const bob = t >= bt(90) && (BEATS[i].beat + n) % 2 === 0 ? Math.exp(-since / 0.14) : 0;
						const face = FACE_FOR[n];
						const S = Math.hypot(p.L, p.W);
						const deg = (p.ang * 180) / Math.PI;
						return (
							<div key={n} style={{position: 'absolute', left: p.c[0] - p.L / 2, top: p.c[1] - p.W / 2, width: p.L, height: p.W, transform: `rotate(${deg}deg)`, perspective: 900}}>
								{/* the window: a well in the table with a friend in it */}
								<div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: p.W * 0.12, background: INK.paper, boxShadow: 'inset 0 6px 14px rgba(40,25,10,0.55)'}}>
									{/* the face stays upright on screen: counter-rotate inside the rotated window */}
									<div style={{position: 'absolute', left: p.L / 2 - S / 2, top: p.W / 2 - S / 2, width: S, height: S, transform: `rotate(${-deg - (cam.rot ?? 0)}deg) scale(${1 + 0.07 * bob})`}}>
										<SheetCanvas
											sheet={{
												map: d.S2,
												crop: faceCrop(face, S, p.W),
												w: S,
												h: S,
												seed: 20 + n,
												plates: [
													{ch: 1, ink: INK.heat, angle: 15, cell: 4.2, dx: 1},
													{ch: 0, ink: INK.key, angle: 45, cell: 4.2, gain: 0.8, gamma: 1.2},
												],
											}}
											res={1.5}
										/>
									</div>
								</div>
								{/* the door: the phone's black back, hinged on its long edge */}
								<div
									style={{
										position: 'absolute',
										inset: 0,
										borderRadius: p.W * 0.12,
										background: INK.key,
										transformOrigin: '50% 0%',
										transform: `rotateX(${118 * open}deg)`,
										boxShadow: `0 ${10 * Math.sin(open * Math.PI)}px ${24 * Math.sin(open * Math.PI)}px rgba(30,20,10,0.45)`,
									}}
								/>
							</div>
						);
					})}
			</CamLayer>
			<Slug x={60} y={1030} text={`R6 · TABLE · WINDOWS ${OPEN_T.filter((x) => t >= x).length}/7 · FACES FROM S2`} />
		</AbsoluteFill>
	);
};

