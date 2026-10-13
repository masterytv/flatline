import React from 'react';
import {AbsoluteFill, Audio, Easing, getStaticFiles, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, DISPLAY_FONT, PHONE_H, PHONE_W} from '../theme';
import {BEATS, FPS, lastBeatIndex, pulse} from '../timing';
import {Phone} from '../ui/Phone';
import {PartyWorld, RealWorld, Still} from '../ui/Worlds';
import {keys, ramp} from '../util';
import {T} from './cues';
import {PhoneScreen} from './ScreenScenes';

export type OpeningProps = {debug: boolean};

const FRAME = 14; // phone bezel, matches Phone

/** Hairline cracks creeping in from the phone's corners during the riser. */
const EdgeCracks: React.FC<{t: number}> = ({t}) => {
	const k = ramp(t, T.riser, T.flatline, Easing.in(Easing.quad));
	if (k <= 0) return null;
	const W = PHONE_W + 2 * FRAME;
	const H = PHONE_H + 2 * FRAME;
	const corners = [
		[0, 0, 1, 1],
		[W, 0, -1, 1],
		[0, H, 1, -1],
		[W, H, -1, -1],
		[W / 2, 0, 0, 1],
		[0, H / 2, 1, 0],
		[W, H * 0.6, -1, 0],
	];
	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: W, height: H, zIndex: 70, overflow: 'visible'}}>
			{corners.map(([x, y, dx, dy], i) =>
				[0, 1, 2].map((j) => {
					let px = x;
					let py = y;
					let d = `M${px},${py}`;
					const base = Math.atan2(dy || (random(`ey${i}${j}`) - 0.5), dx || (random(`ex${i}${j}`) - 0.5)) + (random(`ea${i}${j}`) - 0.5) * 1.1;
					for (let s = 0; s < 6; s++) {
						const a = base + (random(`es${i}${j}${s}`) - 0.5) * 0.8;
						const len = 22 + random(`el${i}${j}${s}`) * 30;
						px += Math.cos(a) * len;
						py += Math.sin(a) * len;
						d += ` L${px.toFixed(1)},${py.toFixed(1)}`;
					}
					const start = (i * 3 + j) / 21;
					const g = keys(k, [start * 0.7, start * 0.7 + 0.3], [0, 1]);
					return <path key={`${i}-${j}`} d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - g} />;
				}),
			)}
		</svg>
	);
};

type Shard = {pts: [number, number][]; cx: number; cy: number};

/** Jittered grid of glass shards covering the phone (in phone-with-bezel units). */
const SHARDS: Shard[] = (() => {
	const W = PHONE_W + 2 * FRAME;
	const H = PHONE_H + 2 * FRAME;
	const cols = 4;
	const rows = 7;
	const v = (c: number, r: number): [number, number] => {
		const edge = c === 0 || r === 0 || c === cols || r === rows;
		const jx = edge ? 0 : (random(`vx${c}-${r}`) - 0.5) * (W / cols) * 0.6;
		const jy = edge ? 0 : (random(`vy${c}-${r}`) - 0.5) * (H / rows) * 0.6;
		return [(c / cols) * W + jx, (r / rows) * H + jy];
	};
	const out: Shard[] = [];
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			const a = v(c, r);
			const b = v(c + 1, r);
			const d = v(c + 1, r + 1);
			const e = v(c, r + 1);
			const tris: [number, number][][] = random(`split${c}-${r}`) < 0.5 ? [[a, b, d], [a, d, e]] : [[a, b, e], [b, d, e]];
			for (const pts of tris) {
				out.push({pts, cx: (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy: (pts[0][1] + pts[1][1] + pts[2][1]) / 3});
			}
		}
	}
	return out;
})();

const Shatter: React.FC<{t: number; scale: number}> = ({t, scale}) => {
	const dt = t - T.drop;
	const W = PHONE_W + 2 * FRAME;
	const H = PHONE_H + 2 * FRAME;
	return (
		<div style={{position: 'absolute', left: '50%', top: '50%', width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, transform: `scale(${scale})`}}>
			{SHARDS.map((s, i) => {
				const dx = s.cx - W / 2;
				const dy = s.cy - H / 2;
				const dist = Math.hypot(dx, dy) || 1;
				const speed = 900 + random(`sv${i}`) * 1400;
				const x = (dx / dist) * speed * dt;
				const y = (dy / dist) * speed * dt + 900 * dt * dt;
				const rot = (random(`sr${i}`) - 0.5) * 900 * dt;
				const z = 1 + dt * (0.6 + random(`sz${i}`));
				const clip = `polygon(${s.pts.map(([px, py]) => `${px}px ${py}px`).join(',')})`;
				return (
					<div key={i} style={{position: 'absolute', inset: 0, transformOrigin: `${s.cx}px ${s.cy}px`, transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${z})`, opacity: 1 - ramp(dt, 0.5, 1.1)}}>
						<div style={{position: 'absolute', inset: 0, clipPath: clip, background: '#050608'}}>
							<div style={{position: 'absolute', left: FRAME, top: FRAME, width: PHONE_W, height: PHONE_H, borderRadius: 56, overflow: 'hidden'}}>
								<PhoneScreen t={T.drop - 0.01} />
							</div>
							<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 50%)'}} />
						</div>
						<svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: W, height: H}}>
							<polygon points={s.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
						</svg>
					</div>
				);
			})}
		</div>
	);
};

/** "FLATLINE" slams in on the vocal; a flat ECG trace runs through it. */
const FlatlineType: React.FC<{t: number; vertical: boolean}> = ({t, vertical}) => {
	if (t < T.flatline) return null;
	const slam = ramp(t, T.flatline, T.flatline + 0.13, Easing.out(Easing.exp));
	const shake = (1 - ramp(t, T.flatline, T.flatline + 0.4)) * 14;
	const sx = (random(`fs${Math.floor(t * 30)}`) - 0.5) * shake;
	const sy = (random(`fy${Math.floor(t * 30)}`) - 0.5) * shake;
	const out = ramp(t, T.drop + 0.75, T.end - 0.2);
	const size = vertical ? 200 : 300;
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 90, transform: `translate(${sx}px, ${sy}px)`, opacity: 1 - out}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 6, marginTop: -3, background: C.signal, boxShadow: `0 0 24px ${C.signal}`, transform: `scaleX(${ramp(t, T.flatline, T.flatline + 0.2)})`}} />
			<div
				style={{
					fontFamily: DISPLAY_FONT,
					fontWeight: 700,
					fontSize: size,
					letterSpacing: -size * 0.03,
					color: '#fff',
					lineHeight: vertical ? 0.9 : 1,
					textAlign: 'center',
					transform: `scale(${2.6 - 1.6 * slam + 0.08 * out})`,
					opacity: Math.min(1, slam * 2),
					textShadow: '0 0 60px rgba(0,0,0,0.6)',
					mixBlendMode: t >= T.drop ? 'normal' : 'difference',
				}}
			>
				{vertical ? (
					<>
						FLAT
						<br />
						LINE
					</>
				) : (
					'FLATLINE'
				)}
			</div>
		</AbsoluteFill>
	);
};

const Debug: React.FC<{t: number}> = ({t}) => {
	const b = BEATS[Math.max(0, lastBeatIndex(t))];
	const m = Math.floor(t / 60);
	const s = (t - m * 60).toFixed(2).padStart(5, '0');
	return (
		<div style={{position: 'absolute', left: 16, bottom: 12, fontFamily: 'monospace', fontSize: 22, color: 'rgba(255,255,255,0.55)', zIndex: 200}}>
			{m}:{s} · bar {b.bar}.{b.beat}
		</div>
	);
};

export const ScreenOpening: React.FC<OpeningProps> = ({debug}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const t = frame / FPS;
	const vertical = height > width;
	const phoneScale = vertical ? (height * 0.9) / (PHONE_H + 2 * FRAME) : (height * 0.92) / (PHONE_H + 2 * FRAME);
	const hasSong = getStaticFiles().some((f) => f.name === 'Flatline.mp3');

	// The room around the phone: dark, lit by the screen; the party leaks in once the screen dies.
	const screenGlow = t < T.clear ? 1 - 0.8 * ramp(t, T.fade, T.clear) : 0;
	const room = ramp(t, T.rebuild, T.riser, Easing.inOut(Easing.quad));
	const roomFocus = ramp(t, T.riser, T.kickOut, Easing.inOut(Easing.quad));
	const roomDim = ramp(t, T.kickOut, T.kickOut + 1);
	const shakeAmp = 7 * ramp(t, T.riser, T.flatline, Easing.in(Easing.quad));
	const shakeX = (random(`px${frame}`) - 0.5) * shakeAmp;
	const shakeY = (random(`py${frame}`) - 0.5) * shakeAmp;
	const beatThump = t >= T.build && t < T.fade ? pulse(t, 0.1) * 0.012 : 0;
	const broken = t >= T.drop;
	const flash = broken ? 1 - ramp(t, T.drop, T.drop + 0.45) : 0;

	return (
		<AbsoluteFill style={{background: '#030406'}}>
			{hasSong ? <Audio src={staticFile('Flatline.mp3')} /> : null}
			{/* the party she isn't looking at, barely there until the screen dies */}
			<AbsoluteFill style={{opacity: 0.12 + 0.6 * room * (1 - 0.6 * roomDim), filter: `blur(${36 - 26 * roomFocus}px)`, transform: 'scale(1.1)'}}>
				<Still id="S2" fallback={<PartyWorld t={t} />} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(80,110,255,${0.22 * screenGlow}) 0%, rgba(3,4,6,0) 45%)`}} />
			{!broken ? (
				<Phone scale={phoneScale * (1 + beatThump)} x={shakeX} y={shakeY} overlay={<EdgeCracks t={t} />}>
					<PhoneScreen t={t} />
				</Phone>
			) : (
				<>
					<AbsoluteFill style={{transform: `scale(${1.15 - 0.15 * ramp(t, T.drop, T.drop + 0.6)})`}}>
						<Still id="R1" fallback={<RealWorld t={t} />} />
					</AbsoluteFill>
					<Shatter t={t} scale={phoneScale} />
					<AbsoluteFill style={{background: '#fff', opacity: flash}} />
				</>
			)}
			<FlatlineType t={t} vertical={vertical} />
			{debug ? <Debug t={t} /> : null}
		</AbsoluteFill>
	);
};
