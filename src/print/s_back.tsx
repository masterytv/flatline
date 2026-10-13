import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {beatsIn, bt} from '../timing';
import {TokTicLogo} from '../ui/TokTicLogo';
import {useDensities} from './density';
import {INK, MONO, SERIF} from './ink';
import {clamp01, easeIn, easeInOut, ecg, kickNudge, Slug} from './kit';
import {Cam, sheetMatrix} from './press';
import {CamLayer, Paper, PaperFill, Press} from './Press';

// 2:23.6 "Beep, beep, beep, I'm coming back": the phone tries to come back, as a thermal receipt with an ECG trace.
const BEEPS = [bt(77), bt(77, 2), bt(77, 3), bt(79), bt(79, 2), bt(79, 3), bt(81), bt(81, 2), bt(81, 3)];
const V0 = 210; // px of paper per second
const V1 = 1700; // after "hear the monitor sing"
const feed = (t: number) => {
	const a = F.beep1 - 1.2;
	if (t <= F.flood) return (t - a) * V0;
	const ramp = 0.3;
	const k = Math.min(t - F.flood, ramp);
	return (F.flood - a) * V0 + V0 * k + ((V1 - V0) * k * k) / (2 * ramp) + Math.max(0, t - F.flood - ramp) * V1;
};
const LINES: [number, string][] = [
	[bt(77, 4) + 0.1, "I'M COMING BACK"],
	[bt(78) + 0.1, 'jess.wav tagged you'],
	[bt(78, 1) + 0.35, 'in 14 photos'],
	[bt(79, 4) + 0.1, "I'M COMING BACK"],
	[bt(80) + 0.1, 'You missed 212 likes'],
	[bt(80, 3), 'Sam: where did u go??'],
	[bt(80, 4) + 0.1, 'Sam: hello??'],
	[bt(81) + 0.25, 'HEAR THE MONITOR SING'],
	[bt(81, 2) + 0.1, '3 new followers'],
	[bt(81, 3) + 0.1, 'Story expires in 1h'],
	[bt(81, 4), 'jess.wav: lol where r u'],
	[bt(81, 4) + 0.15, 'Your recap is ready'],
];
const RX = 640;
const RW = 640;
const PRINT_Y = -10; // the printer is just off the top edge

export const ReceiptStrip: React.FC<{t: number; dy?: number; rot?: number}> = ({t, dy = 0, rot = 0}) => {
	const P = feed(t);
	const y = (tau: number) => PRINT_Y + (P - feed(tau));
	const flood = t >= F.flood;
	const alive = flood ? beatsIn(F.flood, t + 0.01).map((b) => b.t) : [];
	const beeps = [...BEEPS.filter((b) => b <= t), ...alive];
	// the ECG trace along the strip, newest at the top
	const pts: string[] = [];
	const span = flood ? 0.9 : 6;
	for (let tau = t; tau > t - span; tau -= flood ? 0.0025 : 0.006) {
		let v = 0;
		for (const b of beeps) if (Math.abs(tau - b) < 0.25) v += ecg(tau - b);
		const yy = y(tau);
		if (yy > 1200) break;
		pts.push(`${(130 + v * 150).toFixed(1)},${yy.toFixed(1)}`);
	}
	const blur = flood ? Math.min(6, (t - F.flood) * 30) : 0;
	return (
		<div style={{position: 'absolute', left: RX, top: dy, width: RW, height: 1200, transform: `rotate(${rot}deg)`, transformOrigin: '50% 0%', filter: 'drop-shadow(0 12px 18px rgba(60,40,20,0.25))'}}>
			<div style={{position: 'absolute', inset: 0, background: '#F7F4EE', overflow: 'hidden'}}>
				{/* pale orange ECG grid, printed on the roll, moving with it */}
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: -400,
						width: RW,
						height: 2000,
						backgroundImage: `linear-gradient(rgba(255,95,31,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,95,31,0.22) 1px, transparent 1px)`,
						backgroundSize: '32px 32px',
						backgroundPosition: `0 ${P % 32}px`,
					}}
				/>
				<div style={{position: 'absolute', inset: 0, filter: blur ? `blur(${blur * 0.25}px)` : undefined}}>
					<svg width={RW} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
						<polyline points={pts.join(' ')} fill="none" stroke={INK.key} strokeWidth={3.4} strokeLinejoin="round" />
					</svg>
					{LINES.filter(([lt]) => lt <= t).map(([lt, s], i) => {
						const yy = y(lt);
						if (yy > 1200) return null;
						const loud = s.toUpperCase() === s;
						return (
							<div key={i} style={{position: 'absolute', left: 300, top: yy - (loud ? 34 : 26), width: RW - 320, fontFamily: MONO, fontWeight: loud ? 500 : 400, fontSize: loud ? 30 : 23, lineHeight: 1.1, color: INK.key}}>
								{s}
							</div>
						);
					})}
					{/* header: the app's own ink */}
					<div style={{position: 'absolute', left: 300, top: y(F.beep1 - 1.0) - 70}}>
						<TokTicLogo size={46} t={0} color={INK.lime} />
						<div style={{fontFamily: MONO, fontSize: 16, color: INK.key, marginTop: 8, letterSpacing: '0.12em'}}>RECONNECTING · 1%</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export const Receipt: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill>
		<PaperFill />
		<ReceiptStrip t={t} />
		<Slug x={60} y={1036} text="THERMAL · 1% · BEEP" />
	</AbsoluteFill>
);

// 2:32.7 "I came back to life to feel everything!": the receipt tears off and falls; behind it, R13, her phone
// the only app-coloured thing left. 2:38.2: the phone flips to its flat black back.
const R13_PHONE: [number, number][] = [
	[0.38, 0.637],
	[0.434, 0.624],
	[0.472, 0.76],
	[0.41, 0.778],
];

export const TearOff: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R13']);
	const fall = easeIn((t - F.alive) / 0.7);
	const push = easeInOut((t - F.alive) / (F.table - F.alive));
	const cam: Cam = {cx: 960 + 30 * push, cy: 540 - 120 * push, s: 1 + 0.22 * push};
	const flip = clamp01((t - F.drop3) / 0.32);
	const [kx, ky] = kickNudge(t, 1, 1.5);
	const sheet = {w: 1960, h: 1094, cx: 960, cy: 540};
	const cap = clamp01((t - bt(82, 3)) / 0.4);
	return (
		<AbsoluteFill>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && (
				<Press
					cam={cam}
					sheets={[
						{
							map: d.R13,
							...sheet,
							seed: 13,
							plates: [
								{ch: 1, ink: INK.heat, angle: 15, cell: 8, dx: 2 + kx, dy: -1 + ky},
								{ch: 0, ink: INK.key, angle: 45, cell: 8, gain: 0.8, gamma: 1.3},
							],
						},
					]}
					draw={(ctx) => {
						const m = sheetMatrix(sheet, cam, 1920, 1080);
						const pts = R13_PHONE.map(([u, v]) => [u * sheet.w, v * sheet.h]);
						const c = [pts.reduce((a, p) => a + p[0], 0) / 4, pts.reduce((a, p) => a + p[1], 0) / 4];
						const sx = Math.cos(flip * Math.PI);
						ctx.save();
						ctx.globalCompositeOperation = 'source-over';
						ctx.fillStyle = flip < 0.5 ? INK.lime : INK.key;
						ctx.beginPath();
						pts.forEach(([x, y], i) => {
							const px = c[0] + (x - c[0]) * Math.abs(sx);
							const X = m[0] * px + m[2] * y + m[4];
							const Y = m[1] * px + m[3] * y + m[5];
							if (i) ctx.lineTo(X, Y);
							else ctx.moveTo(X, Y);
						});
						ctx.closePath();
						ctx.fill();
						ctx.restore();
					}}
				/>
			)}
			<CamLayer cam={cam}>
				<div style={{position: 'absolute', left: 1120, top: 860, fontFamily: SERIF, fontStyle: 'italic', fontSize: 84, color: INK.key, opacity: cap, mixBlendMode: 'multiply'}}>to feel everything</div>
			</CamLayer>
			{fall < 1 && <ReceiptStrip t={F.alive} dy={fall * 1300} rot={fall * 14} />}
		</AbsoluteFill>
	);
};
