import React from 'react';
import {AbsoluteFill, Easing, staticFile} from 'remotion';
import {F} from '../../full/cues';
import {beatsIn, bt, pulse} from '../../timing';
import {ramp} from '../../util';
import outline from './data/r14_outline.json';
import {FrameCanvas, Glow, H, K, Svg, W, clamp01, coverMap, ecg, pathOf, sample, usePixels} from './engine';
import {makeSweep, phosphorStops} from './sweep';

// 1:43.2–1:54.3 (bars 55–60). R14 seen through her heartbeat: each beat's spike cuts a slit through the black,
// slits widen until they knit Maya out of the dark, then she alone is cut out, friends become soft dots,
// and the line wraps her silhouette as a rim light.

const T0 = bt(55);
const MATTE_AT = bt(59); // slits → her cut-out
const RIM_AT = bt(59);
const END = F.flatline3;
const BASE = H * 0.58;
const AMP = H * 0.4;
const PERIOD = 2.618; // beats per sweep
const sweep = makeSweep(T0, PERIOD, 0.1);
const SLIT_BEATS = beatsIn(T0, END).map((b) => b.t);
const CX = 0.43; // push centre (also the 9:16 crop)
const CY = 0.42;

const FriendDots: React.FC<{t: number; opacity: number; scale: number}> = ({t, opacity, scale}) => {
	const cols = 160;
	const rows = 90;
	const px = usePixels('stills/small/R14.jpg', cols, rows);
	const matte = usePixels('stills/fx/monitor/R14_matte.png', cols, rows);
	const p = pulse(t, 0.3);
	return (
		<FrameCanvas
			deps={[px, matte, t, opacity, scale]}
			style={{opacity, filter: 'blur(5px)'}}
			draw={(ctx) => {
				if (!px || !matte) return;
				const m = coverMap(scale, CX, CY);
				const pitch = 40; // screen px, on a 45° screen
				const c = Math.SQRT1_2;
				for (let a = -10; a < 56; a++) {
					for (let b = -10; b < 56; b++) {
						const x = W / 2 + (a * c - b * c) * pitch + (b % 2 ? 0 : 0);
						const y = (a * c + b * c) * pitch - H * 0.6;
						if (x < -pitch || x > W + pitch || y < -pitch || y > H + pitch) continue;
						const u = (x - m.left) / m.w;
						const v = (y - m.top) / m.h;
						if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
						const k = (Math.floor(v * rows) * cols + Math.floor(u * cols)) * 4;
						if (matte.data[k] > 20) continue; // Maya stays a picture; only her friends turn to light
						const L = (0.2126 * px.data[k] + 0.7152 * px.data[k + 1] + 0.0722 * px.data[k + 2]) / 255;
						const r = pitch * 0.5 * Math.pow(L, 1.25) * (1 + 0.18 * p);
						if (r < 1.5) continue;
						ctx.fillStyle = L > 0.62 ? '#F2C48C' : L > 0.4 ? '#C2652F' : '#6A2630';
						ctx.beginPath();
						ctx.arc(x, y, r, 0, Math.PI * 2);
						ctx.fill();
					}
				}
			}}
		/>
	);
};

export const SceneR14: React.FC<{t: number}> = ({t}) => {
	const push = 1 + 0.06 * ramp(t, T0, MATTE_AT, Easing.inOut(Easing.sin)) + 0.16 * ramp(t, MATTE_AT, END, Easing.inOut(Easing.cubic));
	const m = coverMap(push, CX, CY);
	const head = sweep.headX(t);
	const toMatte = ramp(t, MATTE_AT, MATTE_AT + 0.45, Easing.inOut(Easing.cubic));
	const sweepOut = ramp(t, RIM_AT, RIM_AT + 0.35);
	const rimK = ramp(t, RIM_AT, RIM_AT + 1.4, Easing.inOut(Easing.cubic));

	// Slits: one per beat at the head's position when the spike hit; 3% wide, +0.5% per beat after.
	const slits = SLIT_BEATS.filter((b) => b <= t).map((b, i, all) => {
		const x = sweep.headX(b);
		const after = all.length - 1 - i + ramp(t, all[all.length - 1], all[all.length - 1] + 0.12);
		const w = W * (0.03 + 0.005 * Math.max(0, after - 1) + 0.005 * clamp01(after));
		const open = ramp(t, b, b + 0.1, Easing.out(Easing.cubic));
		const top = (BASE - AMP) * (1 - open);
		const bottom = BASE + (H - BASE) * open;
		return {x, w: w * (0.35 + 0.65 * open), y: top, h: bottom - top, fresh: Math.exp(-(t - b) / 0.35)};
	});

	// Trace in sweep mode, with an erase gap ahead of the head and phosphor decay behind it.
	const gap = 70;
	const yAt = (x: number) => BASE - AMP * ecg(sweep.at(t, x).tau, T0 - 0.5);
	const cur = head > 4 ? sample(0, head - 2, 3, yAt) : [];
	const old = head + gap < W ? sample(head + gap, W, 3, yAt) : [];
	const ageAt = (x: number) => sweep.at(t, x).age;
	const s1 = phosphorStops(0, head, ageAt);
	const s2 = phosphorStops(head + gap, W, ageAt);

	// Rim light around her (stroke-dash along the matte outline).
	const pts = (outline.outline as number[][]).map(([u, v]) => [m.x(u), m.y(v)] as [number, number]);
	const rim = pathOf([...pts, pts[0]]) + 'Z';
	const rimBeat = pulse(t, 0.3);
	const comet = ((t - RIM_AT) / (bt(60) - RIM_AT)) % 1;

	return (
		<AbsoluteFill style={{background: K.ground}}>
			<Svg>
				<defs>
					<clipPath id="r14slits">
						{slits.map((s, i) => (
							<rect key={i} x={s.x - s.w / 2} y={s.y} width={s.w} height={s.h} />
						))}
					</clipPath>
					<linearGradient id="r14rimFadeG" gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={m.y(0.74)} y2={m.y(0.84)}>
						<stop offset={0} stopColor="#fff" />
						<stop offset={1} stopColor="#fff" stopOpacity={0} />
					</linearGradient>
					<mask id="r14rimFade" maskUnits="userSpaceOnUse" x={-100} y={-100} width={W + 200} height={H + 200}>
						<rect x={-100} y={-100} width={W + 200} height={H + 200} fill="url(#r14rimFadeG)" />
					</mask>
					<mask id="r14matte" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
						<rect width={W} height={H} fill="#000" />
						<image href={staticFile('stills/fx/monitor/R14_matte.png')} x={m.left} y={m.top} width={m.w} height={m.h} preserveAspectRatio="none" />
					</mask>
					<linearGradient id="r14cur" gradientUnits="userSpaceOnUse" x1={0} x2={Math.max(1, head)} y1={0} y2={0}>
						{s1.map((s, i) => (
							<stop key={i} offset={s.offset} stopColor="#fff" stopOpacity={s.opacity} />
						))}
					</linearGradient>
					<linearGradient id="r14old" gradientUnits="userSpaceOnUse" x1={head + gap} x2={W} y1={0} y2={0}>
						{s2.map((s, i) => (
							<stop key={i} offset={s.offset} stopColor="#fff" stopOpacity={s.opacity} />
						))}
					</linearGradient>
					<mask id="r14curM" maskUnits="userSpaceOnUse" x={-50} y={0} width={W + 100} height={H}>
						<rect x={-50} y={0} width={head + 50 + 6} height={H} fill="url(#r14cur)" />
					</mask>
					<mask id="r14oldM" maskUnits="userSpaceOnUse" x={-50} y={0} width={W + 100} height={H}>
						<rect x={head + gap} y={0} width={W + 50 - head - gap} height={H} fill="url(#r14old)" />
					</mask>
				</defs>
				{/* the picture through the slits (fades as her cut-out takes over) */}
				<g clipPath="url(#r14slits)" opacity={1 - toMatte}>
					<image href={staticFile('stills/fx/monitor/R14_ht.png')} x={m.left} y={m.top} width={m.w} height={m.h} preserveAspectRatio="none" />
				</g>
				{/* fresh slit edges glow for a moment */}
				{slits.map((s, i) =>
					s.fresh > 0.02 && toMatte < 1 ? (
						<g key={i} opacity={s.fresh * (1 - toMatte)}>
							<rect x={s.x - s.w / 2 - 1} y={s.y} width={2} height={s.h} fill={K.amber} filter="url(#mb5)" />
							<rect x={s.x + s.w / 2 - 1} y={s.y} width={2} height={s.h} fill={K.amber} filter="url(#mb5)" />
						</g>
					) : null,
				)}
			</Svg>
			{/* her friends dissolve into soft amber light */}
			{t >= MATTE_AT - 0.1 ? <FriendDots t={t} opacity={toMatte * 0.6} scale={push} /> : null}
			<Svg>
				{toMatte > 0 ? (
					<g mask="url(#r14matte)" opacity={toMatte}>
						<image href={staticFile('stills/fx/monitor/R14_ht.png')} x={m.left} y={m.top} width={m.w} height={m.h} preserveAspectRatio="none" />
					</g>
				) : null}
				{/* the sweep trace */}
				<g opacity={1 - sweepOut}>
					<g mask="url(#r14curM)">
						<Glow d={cur.length ? pathOf(cur) : 'M0 0'} color={K.amber} coreColor={K.warm} core={3} glow={0.9} />
					</g>
					{old.length ? (
						<g mask="url(#r14oldM)">
							<Glow d={pathOf(old)} color={K.amber} coreColor={K.warm} core={2.5} glow={0.5} />
						</g>
					) : null}
					{/* write head */}
					<circle cx={head} cy={yAt(Math.max(0, head - 1))} r={5} fill="#fff" />
					<circle cx={head} cy={yAt(Math.max(0, head - 1))} r={18} fill={K.amber} opacity={0.5} filter="url(#mb12)" />
				</g>
				{/* rim light */}
				{rimK > 0 ? (
					<g mask="url(#r14rimFade)">
						<Glow d={rim} color={K.amber} core={2.2 + 1.2 * rimBeat} glow={0.6 + 0.6 * rimBeat} pathLength={1} dash={`${rimK} 1`} dashOffset={0} />
						{t > RIM_AT + 1.4 ? <Glow d={rim} color="#FFFFFF" core={4} glow={1.4} pathLength={1} dash="0.06 0.94" dashOffset={-comet} /> : null}
					</g>
				) : null}
			</Svg>
		</AbsoluteFill>
	);
};
