import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../../full/cues';
import {bt, SONG_DURATION} from '../../timing';
import {TokTicLogo} from '../../ui/TokTicLogo';
import {useDensities} from './density';
import {INK, MONO, SERIF} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, ecg, lerp, Slug} from './kit';
import {Cam, Sheet, sheetMatrix} from './press';
import {CamLayer, OnSheet, Paper, PaperFill, Press} from './Press';

// 3:18.3 onward: a keepsake print lands on the confetti, a split-fountain dawn, a postcard and the
// "0 min" stub, the living line, and the letterpress end card.

export const R7_LAND = bt(107, 3);
const R7S = {w: 1000, h: 558};
export const r7Place = (t: number) => {
	const k = easeOut((t - (R7_LAND - 0.55)) / 0.55);
	const off = easeIn((t - F.dawn) / 0.6);
	return {...R7S, cx: 960 - off * 1500, cy: 520 + (1 - k) * -40, s: lerp(1.35, 1, k), rot: lerp(8, -3, k) - off * 6, k};
};

/** The R7 keepsake: a white-bordered print (still two inks, never a photograph), Maya circled in grease pencil. */
export const KeepsakePrint: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R7']);
	if (t < R7_LAND - 0.55) return null;
	const pl = r7Place(t);
	const circle = clamp01((t - bt(108)) / (bt(109) - bt(108)));
	const sheet: Sheet | null = d
		? {map: d.R7, ...pl, seed: 7, plates: [{ch: 1, ink: INK.heat, angle: 15, cell: 6.5, dx: 1.5, dy: -1}, {ch: 0, ink: INK.key, angle: 45, cell: 6.5, gain: 0.8, gamma: 1.25}]}
		: null;
	const border = 28;
	return (
		<>
			<OnSheet sheet={{...pl, w: pl.w + border * 2, h: pl.h + border * 2 + 60}}>
				<div style={{position: 'absolute', inset: 0, background: '#FBF8F1', boxShadow: `0 ${6 + 40 * (1 - pl.k)}px ${10 + 60 * (1 - pl.k)}px rgba(60,40,20,${0.3})`, transform: `translateY(30px)`}}>
					<div style={{position: 'absolute', left: border, bottom: 22, fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: INK.key, opacity: 0.85}}>3:17 am, everyone</div>
				</div>
			</OnSheet>
			{sheet && <Press sheets={[sheet]} />}
			{circle > 0 && (
				<OnSheet sheet={pl}>
					<svg width={pl.w} height={pl.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'multiply'}}>
						<path
							d="M 470 120 C 560 108, 640 190, 630 300 C 622 410, 540 480, 440 470 C 330 458, 290 370, 300 270 C 310 170, 380 112, 482 128 C 520 134, 545 150, 556 166"
							fill="none"
							stroke={INK.heat}
							strokeWidth={11}
							strokeLinecap="round"
							strokeDasharray={1500}
							strokeDashoffset={1500 * (1 - easeInOut(circle))}
							opacity={0.92}
						/>
					</svg>
				</OnSheet>
			)}
		</>
	);
};

// 3:21.9 split-fountain dawn: one roller blends orange into ultramarine, so the sunrise is the two inks meeting.
export const Dawn: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R10', 'R7']);
	const drift = easeInOut((t - F.dawn) / (F.screenTime - F.dawn));
	const cam: Cam = {cx: 960 + 70 * drift, cy: 540, s: 1.04};
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
							map: d.R10,
							crop: [0, 0, 0.86, 0.9],
							w: 1960,
							h: 1145,
							cx: 960,
							cy: 540,
							seed: 10,
							plates: [
								{ch: 2, ink: INK.cold, angle: 15, cell: 8, fountain: [INK.heat, INK.cold], gain: 1.0},
								{ch: 0, ink: INK.key, angle: 45, cell: 8, gain: 0.55, gamma: 1.6},
							],
						},
					]}
				/>
			)}
			<KeepsakePrint t={t} />
			<Slug x={60} y={1036} text="R10 · SPLIT FOUNTAIN · HEAT → COLD" />
		</AbsoluteFill>
	);
};

// 3:25.8 the postcard and the stub: "SCREEN TIME LAST NIGHT" counting down to 0 MIN.
const R11_PHONE: [number, number][] = [
	[0.378, 0.66],
	[0.41, 0.612],
	[0.695, 0.705],
	[0.685, 0.785],
	[0.66, 0.79],
	[0.378, 0.705],
];
export const Postcard: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R11']);
	const pc = {w: 820, h: 458, cx: 640, cy: 520, rot: -2.5};
	const slide = easeOut((t - (F.screenTime + 0.45)) / 0.4);
	const n = Math.round(214 * (1 - easeInOut((t - (F.screenTime + 0.6)) / (207 - (F.screenTime + 0.6)))));
	return (
		<AbsoluteFill>
			<PaperFill />
			<OnSheet sheet={{...pc, w: pc.w + 44, h: pc.h + 44}}>
				<div style={{position: 'absolute', inset: 0, background: '#FBF8F1', boxShadow: '0 10px 24px rgba(60,40,20,0.25)'}} />
			</OnSheet>
			{d && (
				<Press
					sheets={[{map: d.R11, ...pc, seed: 11, plates: [{ch: 1, ink: INK.heat, angle: 15, cell: 6}, {ch: 0, ink: INK.key, angle: 45, cell: 6, gain: 0.75, gamma: 1.3}]}]}
					draw={(ctx) => {
						// the phone overprinted as a flat black silhouette (no camera bump, no brand)
						const m = sheetMatrix(pc, {cx: 960, cy: 540, s: 1}, 1920, 1080);
						ctx.save();
						ctx.globalCompositeOperation = 'multiply';
						ctx.fillStyle = INK.key;
						ctx.beginPath();
						R11_PHONE.forEach(([u, v], i) => {
							const x = u * pc.w;
							const y = v * pc.h;
							const X = m[0] * x + m[2] * y + m[4];
							const Y = m[1] * x + m[3] * y + m[5];
							if (i) ctx.lineTo(X, Y);
							else ctx.moveTo(X, Y);
						});
						ctx.closePath();
						ctx.fill();
						ctx.restore();
					}}
				/>
			)}
			<div style={{position: 'absolute', left: 1190 + (1 - slide) * 900, top: 230, width: 400, height: 560, background: '#F7F4EE', boxShadow: '0 12px 24px rgba(60,40,20,0.22)', transform: 'rotate(1.5deg)', padding: 34, boxSizing: 'border-box'}}>
				<TokTicLogo size={40} t={0} color={INK.lime} />
				<div style={{fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: INK.key, marginTop: 28}}>SCREEN TIME</div>
				<div style={{fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: INK.key}}>LAST NIGHT</div>
				<div style={{borderTop: `2px dashed ${INK.key}`, margin: '22px 0', opacity: 0.6}} />
				<div style={{fontFamily: MONO, fontWeight: 500, fontSize: 120, lineHeight: 1, color: INK.key}}>{n}</div>
				<div style={{fontFamily: MONO, fontSize: 30, color: INK.key, marginTop: 6}}>MIN</div>
				<div style={{borderTop: `2px dashed ${INK.key}`, margin: '22px 0', opacity: 0.6}} />
				<div style={{fontFamily: MONO, fontSize: 15, color: INK.key, opacity: 0.8}}>THANK YOU FOR NOT SCROLLING</div>
			</div>
		</AbsoluteFill>
	);
};

// 3:29 "Still Dancing": the rule drawn alive by hand, one heartbeat per remaining beat.
const LINE_BEATS = [bt(112, 4), bt(113), bt(113, 2), bt(113, 3), bt(113, 4), 211.464];
export const LivingLine: React.FC<{t: number}> = ({t}) => {
	const x0 = 160;
	const x1 = 1760;
	const t0 = F.stillDancing;
	const t1 = 211.9;
	const pen = (tau: number) => x0 + (x1 - x0) * clamp01((tau - t0) / (t1 - t0));
	const v = (x1 - x0) / (t1 - t0);
	const now = pen(t);
	const pts: string[] = [];
	for (let x = x0; x <= now; x += 1.5) {
		let y = 0;
		for (const b of LINE_BEATS) {
			if (b > t) continue;
			const dt = (x - pen(b)) / v;
			if (Math.abs(dt) < 0.3) y += ecg(dt);
		}
		const wob = Math.sin(x * 0.021 + 0.7) * 1.6 + Math.sin(x * 0.0083) * 2.4;
		pts.push(`${x.toFixed(1)},${(560 - y * 120 + wob).toFixed(1)}`);
	}
	const words = clamp01((t - (t0 + 0.2)) / 0.6) * (1 - clamp01((t - (SONG_DURATION - 1.5)) / 1.2));
	return (
		<AbsoluteFill>
			<PaperFill />
			<div style={{position: 'absolute', left: 0, width: 1920, top: 300, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 120, color: INK.key, opacity: words, mixBlendMode: 'multiply'}}>still dancing</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply'}}>
				<polyline points={pts.join(' ')} fill="none" stroke={INK.key} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
				{t < t1 && <circle cx={now} cy={560} r={5} fill={INK.key} />}
			</svg>
		</AbsoluteFill>
	);
};

export const EndCard: React.FC<{t: number}> = ({t}) => {
	const fadeIn = clamp01((t - F.songEnd) / 0.5);
	const out = 1 - clamp01((t - (F.endCardOut - 0.5)) / 0.5);
	const deboss: React.CSSProperties = {color: 'rgba(27,26,23,0.86)', textShadow: '0 1px 0 rgba(255,255,255,0.65), 0 -1px 0 rgba(0,0,0,0.22)'};
	return (
		<AbsoluteFill>
			<PaperFill />
			<AbsoluteFill style={{opacity: fadeIn * out, alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
				<div style={{fontFamily: SERIF, fontSize: 92, ...deboss}}>You don't have to die to wake up.</div>
				<div style={{fontFamily: MONO, fontSize: 22, letterSpacing: '0.5em', marginTop: 44, ...deboss}}>PROJECT PROFOUND</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
