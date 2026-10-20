import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {F} from '../../full/cues';
import {pulse} from '../../timing';
import {ramp} from '../../util';
import {EcgGrid, FRIEND_HUES, Glow, H, K, Svg, W, ecg, mix, pathOf, sample, tempoAt} from './engine';

// 1:54.3–2:01.6 (bars 61–64). A ward's central monitor: six lanes. Maya's is alive; her five friends are flat,
// cold blue, each lit by a phone. On each glowsOff beat one phone switches off like a CRT, the face-glow above it
// warms, and that lane's line jolts into its first heartbeat in its own warm hue.

const NAMES = ['MAYA', 'JESS', 'KAI', 'PRIYA', 'AMARA', 'SAM'];
const GAP = 6;
const LH = (H - GAP * 5) / 6;
const X0 = 420;
const X1 = 1700;
const WINDOW = 2.6; // seconds of trace on screen

export const laneTop = (i: number) => i * (LH + GAP);

const PhoneFace: React.FC<{t: number; i: number; off: number}> = ({t, i, off}) => {
	const top = laneTop(i);
	const cx = 285;
	const warm = ramp(t, off, off + 0.4, Easing.inOut(Easing.cubic));
	// CRT switch-off: 3 frames collapse to a line, then a dot that fades
	const dt = t - off;
	const on = dt < 0;
	const sy = on ? 1 : Math.max(0.02, 1 - dt / 0.1);
	const sx = on ? 1 : dt < 0.1 ? 1 : Math.max(0, 1 - (dt - 0.1) / 0.12);
	const bright = on ? 1 : dt < 0.22 ? 1.8 : 0;
	const pw = 38;
	const ph = 80;
	const py = top + LH - ph - 6;
	const faceColor = mix(K.cold, FRIEND_HUES[i - 1], warm);
	const flicker = 0.92 + 0.08 * Math.sin(t * 37 + i * 3);
	return (
		<g>
			<defs>
				<radialGradient id={`face${i}`} cx="0.5" cy="0.98" r="0.75">
					<stop offset="0" stopColor={faceColor} stopOpacity={0.85} />
					<stop offset="0.55" stopColor={faceColor} stopOpacity={0.28} />
					<stop offset="1" stopColor={faceColor} stopOpacity={0} />
				</radialGradient>
			</defs>
			{/* a face, suggested only by the light falling on it */}
			<ellipse cx={cx} cy={top + 64} rx={56} ry={64} fill={`url(#face${i})`} filter="url(#mb5)" opacity={(on ? flicker : 0.9) * (0.8 + 0.4 * warm)} />
			{/* the phone */}
			{bright > 0 ? (
				<g transform={`translate(${cx} ${py + ph / 2}) scale(${sx} ${sy})`}>
					<rect x={-pw / 2 - 14} y={-ph / 2 - 14} width={pw + 28} height={ph + 28} rx={18} fill={K.cold} opacity={0.35 * bright} filter="url(#mb12)" />
					<rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={6} fill={mix('#DCE6FF', '#FFFFFF', bright - 1)} opacity={Math.min(1, 0.9 * bright)} />
				</g>
			) : (
				<rect x={cx - pw / 2} y={py} width={pw} height={ph} rx={6} fill="none" stroke="#2A2F3A" strokeWidth={1.5} opacity={ramp(t, off + 0.3, off + 0.8)} />
			)}
		</g>
	);
};

export const SceneLanes: React.FC<{t: number}> = ({t}) => {
	const bpm = Math.round(tempoAt(t));
	const slam = t < F.couch;
	const beatP = pulse(t, 0.08);
	const white = t - F.flatline3 < 1 / 30;
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<EcgGrid t={t} opacity={0.7} />
			<Svg>
				{NAMES.map((name, i) => {
					const top = laneTop(i);
					const mid = top + LH * 0.55;
					const off = i === 0 ? -Infinity : F.glowsOff[i - 1];
					const alive = t >= off;
					const hue = i === 0 ? K.warm : FRIEND_HUES[i - 1];
					const A = LH * 0.42;
					const a = LH * 0.05; // her beat ripples faintly through the cold lanes
					const xOf = (tau: number) => X1 - ((t - tau) / WINDOW) * (X1 - X0);
					const tauOf = (x: number) => t - ((X1 - x) / (X1 - X0)) * WINDOW;
					const yAt = (x: number) => {
						const tau = tauOf(x);
						return mid - (tau >= off ? A : a) * ecg(tau);
					};
					const split = Math.max(X0, Math.min(X1, xOf(off)));
					const coldPts = split > X0 ? sample(X0, split, 3, yAt) : [];
					const warmPts = split < X1 ? sample(split, X1, 3, yAt) : [];
					const head = warmPts.length ? warmPts[warmPts.length - 1] : coldPts[coldPts.length - 1];
					const jolt = alive && i > 0 ? Math.exp(-(t - off) / 0.25) : 0;
					return (
						<g key={name}>
							{i > 0 ? <rect x={0} y={top - GAP} width={W} height={GAP} fill="#000" /> : null}
							<text x={56} y={top + 34} fill={alive ? hue : K.cold} opacity={0.85} style={{font: "600 17px 'Inter', sans-serif", letterSpacing: 5}}>
								{name}
							</text>
							<text x={1760} y={top + 34} fill={alive ? hue : K.cold} opacity={0.6} style={{font: "600 14px 'Inter', sans-serif", letterSpacing: 4}}>
								HR
							</text>
							<text x={1760} y={top + 100} fill={alive ? hue : K.cold} opacity={alive ? 0.95 : 0.55} style={{font: "300 58px 'Inter', sans-serif", fontVariantNumeric: 'tabular-nums'}}>
								{alive ? bpm : '– –'}
							</text>
							{i > 0 ? <PhoneFace t={t} i={i} off={off} /> : null}
							{coldPts.length ? <Glow d={pathOf(coldPts)} color={K.cold} core={2} glow={0.45} opacity={0.8} /> : null}
							{warmPts.length ? <Glow d={pathOf(warmPts)} color={hue === K.warm ? K.amber : hue} coreColor={mix(hue, '#FFFFFF', 0.5)} core={2.6 + 2 * jolt} glow={0.9 + 1.5 * jolt} /> : null}
							{head ? <circle cx={head[0]} cy={head[1]} r={4} fill="#fff" opacity={alive ? 1 : 0.6} /> : null}
						</g>
					);
				})}
				{/* bar 61: one giant FLATLINE across all six lanes, blinking like an alarm */}
				{slam ? (
					<g>
						{/* tall alarm type: the same word stretched through every lane, broken by the gaps between them */}
						<g transform={`translate(${W / 2} ${H / 2}) scale(1 2.9) translate(${-W / 2} ${-H / 2})`} opacity={1 - ramp(t, F.couch - 0.15, F.couch)}>
							<text x={W / 2} y={H / 2 + 430 * 0.35} textAnchor="middle" fill={beatP > 0.5 ? K.lime : 'none'} stroke={K.lime} strokeWidth={3} vectorEffect="non-scaling-stroke" style={{font: "700 430px 'Space Grotesk', sans-serif", letterSpacing: -6}}>
								FLATLINE
							</text>
						</g>
						{NAMES.slice(1).map((_, i) => (
							<rect key={i} x={0} y={laneTop(i + 1) - GAP} width={W} height={GAP} fill="#000" />
						))}
					</g>
				) : null}
			</Svg>
			{white ? <AbsoluteFill style={{background: '#fff'}} /> : null}
		</AbsoluteFill>
	);
};
