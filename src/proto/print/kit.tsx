import React from 'react';
import {BEATS, beatsIn, lastBeatIndex} from '../../timing';
import {INK, MONO, hash2} from './ink';

export const INKMASK_URL = new URL('./plates/inkmask.png', import.meta.url).href;
export const INKMASK_SOLID_URL = new URL('./plates/inkmask_solid.png', import.meta.url).href;

/** Uneven ink coverage for DOM ink (type, rules, stamps). `solid` for big floods. */
export const inked = (size = 1024, x = 0, y = 0, solid = false): React.CSSProperties => ({
	WebkitMaskImage: `url(${solid ? INKMASK_SOLID_URL : INKMASK_URL})`,
	maskImage: `url(${solid ? INKMASK_SOLID_URL : INKMASK_URL})`,
	WebkitMaskSize: `${size}px ${size}px`,
	maskSize: `${size}px ${size}px`,
	WebkitMaskPosition: `${x}px ${y}px`,
	maskPosition: `${x}px ${y}px`,
	WebkitMaskRepeat: 'repeat',
	maskRepeat: 'repeat',
});

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOut = (x: number) => {
	const k = clamp01(x);
	return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};
export const easeIn = (x: number) => Math.pow(clamp01(x), 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** A sheet landing on a beat: 1.05 -> 1 over 4 frames, the shadow tightening. */
export const slap = (t: number, t0: number) => {
	if (t < t0) return {on: false, s: 1, shadow: 'none', k: 0};
	const k = clamp01((t - t0) / (4 / 30));
	const e = easeOut(k);
	return {
		on: true,
		k: e,
		s: 1.05 - 0.05 * e,
		shadow: `0 ${2 + 14 * (1 - e)}px ${3 + 34 * (1 - e)}px rgba(60,40,20,${0.22 + 0.1 * (1 - e)})`,
	};
};

/** Stamp: hits hard on t0 (slight overshoot down, ink darkening for a frame). */
export const stamp = (t: number, t0: number) => {
	if (t < t0) return {on: false, s: 1, o: 0};
	const k = clamp01((t - t0) / (3 / 30));
	return {on: true, s: 1.12 - 0.12 * easeOut(k), o: 1};
};

/** Per-beat register nudge for a plate: a couple of px, decaying after each kick. */
export const kickNudge = (t: number, plate: number, amp = 2, from = 0, to = 1e9): [number, number] => {
	const i = lastBeatIndex(t);
	if (i < 0 || t < from || t > to) return [0, 0];
	const b = BEATS[i];
	const k = Math.exp(-(t - b.t) / 0.09);
	return [(hash2(i, plate, 5) - 0.5) * 2 * amp * k, (hash2(plate, i, 6) - 0.5) * 2 * amp * k];
};

export const CropMarks: React.FC<{x: number; y: number; w: number; h: number; gap?: number; len?: number; color?: string}> = ({x, y, w, h, gap = 14, len = 38, color = INK.key}) => {
	const L: [number, number, number, number][] = [];
	for (const [cx, sx] of [
		[x, -1],
		[x + w, 1],
	] as const) {
		for (const [cy, sy] of [
			[y, -1],
			[y + h, 1],
		] as const) {
			L.push([cx + sx * gap, cy, cx + sx * (gap + len), cy]);
			L.push([cx, cy + sy * gap, cx, cy + sy * (gap + len)]);
		}
	}
	return (
		<svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', width: 1, height: 1}}>
			{L.map(([a, b, c, d], i) => (
				<line key={i} x1={a} y1={b} x2={c} y2={d} stroke={color} strokeWidth={1.3} />
			))}
		</svg>
	);
};

export const RegTarget: React.FC<{x: number; y: number; r?: number; color?: string}> = ({x, y, r = 13, color = INK.key}) => (
	<svg style={{position: 'absolute', left: x - r * 2, top: y - r * 2, width: r * 4, height: r * 4, overflow: 'visible'}}>
		<circle cx={r * 2} cy={r * 2} r={r} fill="none" stroke={color} strokeWidth={1.3} />
		<circle cx={r * 2} cy={r * 2} r={r * 0.45} fill={color} />
		<line x1={0} y1={r * 2} x2={r * 4} y2={r * 2} stroke={color} strokeWidth={1.3} />
		<line x1={r * 2} y1={0} x2={r * 2} y2={r * 4} stroke={color} strokeWidth={1.3} />
	</svg>
);

const PLUM = '#2B1618';
/** Colour bar: solids, tints and the overprint, as on a press sheet. */
export const ColorBar: React.FC<{x: number; y: number; cell?: number; vertical?: boolean; inks?: string[]}> = ({x, y, cell = 30, vertical = true, inks}) => {
	const sw = inks ?? [INK.key, INK.heat, INK.cold, PLUM, 'rgba(27,26,23,0.5)', 'rgba(255,95,31,0.5)', 'rgba(43,58,201,0.5)', 'rgba(27,26,23,0.25)', 'rgba(255,95,31,0.25)', 'rgba(43,58,201,0.25)'];
	return (
		<div style={{position: 'absolute', left: x, top: y, display: 'flex', flexDirection: vertical ? 'column' : 'row', mixBlendMode: 'multiply', ...inked(512)}}>
			{sw.map((c, i) => (
				<div key={i} style={{width: cell, height: cell, background: c, outline: '1px solid rgba(27,26,23,0.25)'}} />
			))}
		</div>
	);
};

export const Slug: React.FC<{x: number; y: number; text: string; size?: number; color?: string; rot?: number}> = ({x, y, text, size = 15, color = INK.key, rot = 0}) => (
	<div style={{position: 'absolute', left: x, top: y, fontFamily: MONO, fontSize: size, letterSpacing: '0.12em', color, whiteSpace: 'nowrap', transform: `rotate(${rot}deg)`, transformOrigin: '0 0', mixBlendMode: 'multiply'}}>
		{text}
	</div>
);

/** Masking tape: translucent, torn ends. */
export const Tape: React.FC<{x: number; y: number; w?: number; h?: number; rot?: number; seed?: number}> = ({x, y, w = 150, h = 44, rot = 0, seed = 1}) => {
	const pts: string[] = [];
	const n = 7;
	for (let i = 0; i <= n; i++) pts.push(`${(hash2(i, seed, 1) * 7).toFixed(1)},${((i / n) * h).toFixed(1)}`);
	for (let i = n; i >= 0; i--) pts.push(`${(w - hash2(i, seed, 2) * 7).toFixed(1)},${((i / n) * h).toFixed(1)}`);
	return (
		<svg style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg)`, overflow: 'visible'}}>
			<polygon points={pts.join(' ')} fill="rgba(226,214,184,0.78)" stroke="rgba(150,130,100,0.25)" strokeWidth={1} />
			<polygon points={pts.join(' ')} fill="rgba(255,255,255,0.12)" transform={`translate(0 ${h * 0.1}) scale(1 0.3)`} />
		</svg>
	);
};

/** QRS-ish heartbeat shape, dt in seconds from the beat. */
export const ecg = (dt: number) =>
	0.1 * Math.exp(-(((dt + 0.1) / 0.022) ** 2)) -
	0.14 * Math.exp(-(((dt + 0.018) / 0.008) ** 2)) +
	1.0 * Math.exp(-((dt / 0.0095) ** 2)) -
	0.32 * Math.exp(-(((dt - 0.018) / 0.009) ** 2)) +
	0.2 * Math.exp(-(((dt - 0.13) / 0.036) ** 2));

/**
 * THE RULE: the opening's ECG line turned to ink. A sweep trace: the newest moment is at the right end.
 * `alive(t)` says whether a beat at time t blips (flat on "stopped" and "Still"). `freeze` stops time.
 */
export const Rule: React.FC<{
	x: number;
	y: number;
	w: number;
	t: number;
	amp?: number;
	win?: number;
	alive?: (bt: number) => boolean;
	beats?: number[];
	freeze?: number;
	color?: string;
	width?: number;
	opacity?: number;
	reveal?: number; // 0..1 drawn length from the left (hand-drawn at the end)
	wobble?: number;
}> = ({x, y, w, t, amp = 46, win = 2.6, alive = () => true, beats, freeze, color = INK.key, width = 2.6, opacity = 1, reveal = 1, wobble = 0}) => {
	const now = freeze !== undefined ? Math.min(t, freeze) : t;
	const list = beats ?? beatsIn(now - win - 0.3, now + 0.05).map((b) => b.t);
	const live = list.filter((b) => b <= now && alive(b));
	const step = 1.5;
	const pts: string[] = [];
	const xmax = w * clamp01(reveal);
	for (let px = 0; px <= xmax; px += step) {
		const tx = now - (1 - px / w) * win;
		let v = 0;
		for (const b of live) {
			const dt = tx - b;
			if (dt > -0.2 && dt < 0.25) v += ecg(dt);
		}
		const wob = wobble ? (Math.sin(px * 0.031 + 1.3) * 0.6 + Math.sin(px * 0.0137) * 0.9) * wobble : 0;
		pts.push(`${px.toFixed(1)},${(-v * amp + wob).toFixed(2)}`);
	}
	return (
		<svg style={{position: 'absolute', left: x, top: y - amp * 1.5, width: w + 4, height: amp * 3, overflow: 'visible', opacity, mixBlendMode: 'multiply'}}>
			<g transform={`translate(0 ${amp * 1.5})`}>
				<polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
			</g>
		</svg>
	);
};

/** Empty battery glyph, printed in outline. */
export const BatteryGlyph: React.FC<{x: number; y: number; w?: number; color?: string; stroke?: number}> = ({x, y, w = 220, color = INK.key, stroke = 12}) => {
	const h = w * 0.48;
	return (
		<svg style={{position: 'absolute', left: x, top: y, width: w + w * 0.1, height: h, overflow: 'visible'}}>
			<rect x={stroke / 2} y={stroke / 2} width={w - stroke} height={h - stroke} rx={h * 0.14} fill="none" stroke={color} strokeWidth={stroke} />
			<rect x={w + stroke * 0.2} y={h * 0.32} width={w * 0.07} height={h * 0.36} rx={4} fill={color} />
		</svg>
	);
};
