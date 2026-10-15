import React from 'react';
import {AbsoluteFill, Easing, staticFile} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {ramp} from '../../util';
import {Glow, H, K, Svg, W, coverMap, ecg, pathOf, sample} from './engine';

// 2:52.8–3:00.1 (bars 93–96). The spiral's point stretches into a thin flat line; at "my heart stopped" the line
// opens like an eyelid onto R12 (eyes closed, serene). The upper lid is her beating line, the lower lid is flat.

const T0 = F.type2; // 172.815
const OPEN = bt(93, 3); // 173.732 "my heart stopped..."
const STARTED = bt(95); // 176.448 "and I started dancing"
const END = F.type3;
const C = H * 0.47;
const CX = 0.485; // her eyes in R12
const CY = 0.41;

export const SceneEyelid: React.FC<{t: number}> = ({t}) => {
	const stretch = ramp(t, T0, T0 + 0.35, Easing.out(Easing.exp));
	const h0 = H * 0.08 * ramp(t, OPEN, OPEN + 0.4, Easing.out(Easing.cubic));
	const h = h0 + H * 0.42 * ramp(t, OPEN + 0.4, END - 0.1, Easing.out(Easing.sin));
	const push = 1 + 0.15 * ramp(t, OPEN, END, Easing.inOut(Easing.sin));
	const m = coverMap(push, CX, CY);
	const dy = C - m.y(CY); // keep her eyes on the band's centre line
	const shape = (x: number) => 1 - 0.32 * Math.pow((x - W / 2) / (W / 2), 2); // a slight almond
	const window = 3.2;
	const lidAmp = H * 0.045 * (0.4 + 0.6 * ramp(t, OPEN, OPEN + 1));
	const upper = sample(-20, W + 20, 4, (x) => C - (h / 2) * shape(x) - lidAmp * ecg(t - ((W - x) / W) * window, OPEN - 2));
	const lower = sample(-20, W + 20, 8, (x) => C + (h / 2) * shape(x));
	const half = W / 2 - (W / 2 + 20) * stretch;
	const flat = sample(half, W - half, 8, () => C);
	const band = pathOf(upper) + 'L' + [...lower].reverse().map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
	const whisper = ramp(t, T0 + 0.15, T0 + 0.5) * (1 - ramp(t, OPEN - 0.2, OPEN + 0.2));
	const yText = C + (h / 2) * shape(W * 0.3) + 58;
	const a1 = ramp(t, OPEN, OPEN + 0.5);
	const a2 = ramp(t, STARTED, STARTED + 0.5);
	const out = ramp(t, END - 0.07, END);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<Svg>
				<defs>
					<clipPath id="lid">
						<path d={band} />
					</clipPath>
				</defs>
				{h > 0.5 ? (
					<g clipPath="url(#lid)" opacity={1 - out}>
						<image href={staticFile('stills/fx/monitor/R12_ht.png')} x={m.left} y={m.top + dy} width={m.w} height={m.h} preserveAspectRatio="none" />
					</g>
				) : null}
				{h > 0.5 ? (
					<>
						<Glow d={pathOf(upper)} color={K.peach} coreColor={K.warm} core={2.2} glow={0.9} />
						<Glow d={pathOf(lower)} color={K.peach} coreColor={K.warm} core={1.5} glow={0.5} />
					</>
				) : (
					<Glow d={pathOf(flat)} color="#FFFFFF" coreColor="#FFFFFF" core={1.5} glow={0.6} />
				)}
			</Svg>
			<div style={{position: 'absolute', left: 0, right: 0, top: C + 34, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 26, letterSpacing: 16, color: K.warm, opacity: whisper * 0.7}}>flatline</div>
			<div style={{position: 'absolute', left: W * 0.14, top: yText, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 44, letterSpacing: 0.5, color: K.warm, whiteSpace: 'nowrap', opacity: 1 - out}}>
				<span style={{opacity: a1 * (1 - 0.45 * a2)}}>my heart stopped…</span>
				<span style={{opacity: a2, marginLeft: 22, display: 'inline-block', transform: `translateY(${10 * (1 - a2)}px)`}}>and I started dancing</span>
			</div>
		</AbsoluteFill>
	);
};
