import React from 'react';
import {AbsoluteFill, Easing, staticFile} from 'remotion';
import {F} from '../../full/cues';
import {BEATS, bt, lastBeatIndex, pulse} from '../../timing';
import {ramp} from '../../util';
import {FRIEND_HUES, Glow, H, K, Readout, Svg, W, beatClock, clamp01, coverMap, lerp, pathOf, tempoAt} from './engine';

// 3:07.4–3:14.2 (bars 101–104): THE LINE DANCES. XY mode, one Lissajous trace whose ratio changes every bar,
// kicking on every beat, with phosphor persistence. 3:14.2 "Still": it freezes and settles onto R9's light trail.

const RATIOS: [number, number, number][] = [
	[bt(101), 1, 1],
	[bt(102), 1, 2],
	[bt(103), 3, 2],
	[bt(104), 3, 4],
];

const ratioAt = (t: number) => {
	let i = 0;
	for (let k = 0; k < RATIOS.length; k++) if (t >= RATIOS[k][0]) i = k;
	const [t0, a, b] = RATIOS[i];
	if (i === 0) return [a, b];
	const [, pa, pb] = RATIOS[i - 1];
	const k = ramp(t, t0, t0 + 0.22, Easing.inOut(Easing.cubic)); // a brief knot on each downbeat
	return [lerp(pa, a, k), lerp(pb, b, k)];
};

const N = 520;
const liss = (t: number) => {
	const [a, b] = ratioAt(t);
	const kick = 1 + 0.2 * pulse(t, 0.15);
	const phase = beatClock(t) * 0.55; // keeps advancing, so the figure rotates
	const A = W * 0.33 * kick;
	const B = H * 0.38 * kick;
	const pts: [number, number][] = [];
	for (let i = 0; i <= N; i++) {
		const th = (i / N) * Math.PI * 2;
		pts.push([W / 2 + A * Math.sin(a * th + phase), H / 2 + B * Math.sin(b * th)]);
	}
	return pts;
};

export const SceneScope: React.FC<{t: number}> = ({t}) => {
	const i = lastBeatIndex(t);
	const beatIdx = Math.max(0, i - lastBeatIndex(F.final));
	const flash = pulse(t, 0.22);
	const fieldColor = FRIEND_HUES[beatIdx % FRIEND_HUES.length];
	const trails = Array.from({length: 18}, (_, k) => k + 1);
	const white = ramp(t, F.final, F.final + 0.25);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<AbsoluteFill style={{background: fieldColor, opacity: 0.3 * flash}} />
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6) 100%)`}} />
			<Svg>
				{trails.map((k) => (
					<path key={k} d={pathOf(liss(t - k / 30))} fill="none" stroke={k % 2 ? K.rose : K.gold} strokeWidth={2} opacity={0.32 * Math.pow(1 - k / 19, 1.6)} />
				))}
				<Glow d={pathOf(liss(t))} color={beatIdx % 2 ? K.rose : K.gold} coreColor={K.warm} core={3.2} glow={1 + 0.6 * flash} />
			</Svg>
			<Readout label="HR" value={String(Math.round(tempoAt(t)))} color={K.warm} opacity={0.8} />
			{white < 1 ? <AbsoluteFill style={{background: '#fff', opacity: 1 - white}} /> : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 3:14.2 "Still"

// R9's slow-shutter light trail around Maya's hips, in photo coordinates.
const TRAIL = {cx: 0.468, cy: 0.742, rx: 0.245, ry: 0.088, rot: -3.5};

export const SceneStill: React.FC<{t: number}> = ({t}) => {
	const m = coverMap(1, 0.5, 0.5);
	const frozen = liss(F.still);
	const k = ramp(t, F.still, F.still + 4 / 30, Easing.out(Easing.cubic));
	const cx = m.x(TRAIL.cx);
	const cy = m.y(TRAIL.cy);
	const rx = TRAIL.rx * m.w;
	const ry = TRAIL.ry * m.h;
	const r = (TRAIL.rot * Math.PI) / 180;
	const pts = frozen.map(([x, y], i) => {
		const th = (i / N) * Math.PI * 2;
		const ex = rx * Math.cos(th);
		const ey = ry * Math.sin(th);
		const tx = cx + ex * Math.cos(r) - ey * Math.sin(r);
		const ty = cy + ex * Math.sin(r) + ey * Math.cos(r);
		return [lerp(x, tx, k), lerp(y, ty, k)] as [number, number];
	});
	const breathe = 0.85 + 0.15 * Math.sin((t - F.still) * Math.PI * 1.2);
	const appear = clamp01((t - F.still) * 30);
	return (
		<AbsoluteFill style={{background: K.ink}}>
			<img src={staticFile('stills/fx/monitor/R9_ht.png')} style={{position: 'absolute', left: m.left, top: m.top, width: m.w, height: m.h, opacity: appear}} />
			<Svg>
				<text x={W * 0.5} y={H * 0.33} textAnchor="middle" fill="none" stroke={K.ink} strokeWidth={16} strokeLinejoin="round" style={{font: "700 260px 'Space Grotesk', sans-serif", letterSpacing: 8}} opacity={0.85 * appear}>
					STILL
				</text>
				<text x={W * 0.5} y={H * 0.33} textAnchor="middle" fill="none" stroke={K.paper} strokeWidth={3.5} style={{font: "700 260px 'Space Grotesk', sans-serif", letterSpacing: 8}} opacity={appear}>
					STILL
				</text>
				<Glow d={pathOf(pts) + 'Z'} color={K.gold} coreColor={K.warm} core={3.4} glow={1.1 * breathe} />
			</Svg>
		</AbsoluteFill>
	);
};

export const FINAL_BEATS = BEATS.filter((b) => b.t >= F.final && b.t < F.still);
