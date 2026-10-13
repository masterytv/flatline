import React, {useCallback, useId, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {C} from '../../theme';
import {BEATS, beatsIn, lastBeatIndex} from '../../timing';

// Everything in UNINSTALL is drawn in one 1920×1080 SVG space per scene.
export const W = 1920;
export const H = 1080;
export const IMG_W = 2752;
export const IMG_H = 1536;

export const U = {
	bg: C.bg,
	surface: C.surface,
	surface2: C.surface2,
	text: C.text,
	muted: C.muted,
	lime: C.signal,
	pink: C.pulse,
	green: C.charge,
	amber: '#FFB547',
	gold: '#FFE0A8',
	goldDeep: '#F2B45A',
	cream: '#FFF4E0',
	warmBlack: '#120C08',
};

// ---------------------------------------------------------------- maths

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (t: number, t0: number, t1: number) => clamp01((t - t0) / (t1 - t0));
export const smooth = (x: number) => {
	const k = clamp01(x);
	return k * k * (3 - 2 * k);
};
export const outCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const inCubic = (x: number) => Math.pow(clamp01(x), 3);
export const outExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(x)));
export const outBack = (x: number, s = 1.9) => {
	const k = clamp01(x) - 1;
	return 1 + (s + 1) * k * k * k + s * k * k;
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, k: number) => {
	const A = hex(a);
	const B = hex(b);
	const c = A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k))));
	return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** Deterministic hash → [0,1). */
export const rnd = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) % 100000) / 100000;
};

// ---------------------------------------------------------------- beats (always from the grid)

/** Beat times in [t0, t1). */
export const beatTimes = (t0: number, t1: number) => beatsIn(t0 - 1e-3, t1 - 1e-3).map((b) => b.t);

/** Beat times plus the midpoints between consecutive grid beats (never a fixed BPM). */
export const halfBeatTimes = (t0: number, t1: number) => {
	const out: number[] = [];
	const i0 = Math.max(0, lastBeatIndex(t0 - 1e-3));
	for (let i = i0; i < BEATS.length - 1; i++) {
		const a = BEATS[i].t;
		const m = (a + BEATS[i + 1].t) / 2;
		if (a >= t0 - 1e-3 && a < t1 - 1e-3) out.push(a);
		if (m >= t0 - 1e-3 && m < t1 - 1e-3) out.push(m);
		if (a > t1) break;
	}
	return out;
};

/** Index of the last time ≤ t in a sorted list, and the seconds since it. */
export const since = (t: number, times: number[]) => {
	let i = -1;
	for (let k = 0; k < times.length; k++) if (times[k] <= t) i = k;
	return {i, dt: i < 0 ? -1 : t - times[i]};
};

/** Exponential kick on each time in the list. */
export const kickOn = (t: number, times: number[], decay: number) => {
	const {i, dt} = since(t, times);
	return i < 0 ? 0 : Math.exp(-dt / decay);
};

/** Live tempo from the grid: 60 / mean gap over the last 8 beats. */
export const tempoAt = (t: number) => {
	const i = Math.max(8, lastBeatIndex(t));
	const gap = (BEATS[i].t - BEATS[i - 8].t) / 8;
	return 60 / gap;
};

// ---------------------------------------------------------------- stills as fixed planes

export type Plane = {id: string; z?: number; fx?: number; fy?: number; sx?: number; sy?: number; free?: boolean};

/** Where a still sits on screen: (fx, fy) of the image lands at (sx, sy) of the frame, scaled z × cover. */
export const planeRect = (p: Plane) => {
	const s = Math.max(W / IMG_W, H / IMG_H) * (p.z ?? 1);
	const w = IMG_W * s;
	const h = IMG_H * s;
	let x = (p.sx ?? 0.5) * W - (p.fx ?? 0.5) * w;
	let y = (p.sy ?? 0.5) * H - (p.fy ?? 0.5) * h;
	if (!p.free) {
		x = Math.min(0, Math.max(W - w, x));
		y = Math.min(0, Math.max(H - h, y));
	}
	return {x, y, w, h, at: (u: number, v: number): [number, number] => [x + u * w, y + v * h]};
};

export const useSafeId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/** An SVG <image> that holds the render until it has loaded. */
export const SvgImage: React.FC<{href: string; x: number; y: number; width: number; height: number; filter?: string; opacity?: number; style?: React.CSSProperties}> = ({href, ...rest}) => {
	const [handle] = useState(() => delayRender(`uninstall image ${href}`));
	const done = useRef(false);
	const finish = useCallback(() => {
		if (!done.current) {
			done.current = true;
			continueRender(handle);
		}
	}, [handle]);
	return <image href={href} preserveAspectRatio="none" onLoad={finish} onError={finish} {...rest} />;
};

export type Grade = 'warm' | 'raw' | 'lime' | 'grey' | 'dawn' | 'cool';

const stillHref = (id: string, small?: boolean) => staticFile(small ? `stills/small/${id}.jpg` : `stills/${id}.png`);

/** A still drawn as a fixed plane (no mask). */
export const PlaneImage: React.FC<{plane: Plane; small?: boolean; grade?: Grade; opacity?: number}> = ({plane, small, grade = 'warm', opacity}) => {
	const r = planeRect(plane);
	const href = stillHref(plane.id, small);
	return <SvgImage key={href} href={href} x={r.x} y={r.y} width={r.w} height={r.h} filter={grade === 'raw' ? undefined : `url(#un-${grade})`} opacity={opacity} />;
};

/**
 * WorldWindow: a still as a fixed plane, visible only through the shapes passed as children
 * (white = see-through). The hole moves; the photo never does.
 */
export const WorldWindow: React.FC<{plane: Plane; small?: boolean; grade?: Grade; opacity?: number; feather?: number; children: React.ReactNode}> = ({plane, small, grade = 'warm', opacity, feather, children}) => {
	const id = useSafeId('ww');
	return (
		<>
			<defs>
				{feather ? (
					<filter id={`${id}f`} x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation={feather} />
					</filter>
				) : null}
				<mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
					<g filter={feather ? `url(#${id}f)` : undefined}>{children}</g>
				</mask>
			</defs>
			<g mask={`url(#${id})`} opacity={opacity}>
				<PlaneImage plane={plane} small={small} grade={grade} />
			</g>
		</>
	);
};

/** Colour grades for stills inside windows. "warm print": lifted warm blacks, cream highlights, −15% saturation. */
export const GradeDefs: React.FC = () => (
	<defs>
		<filter id="un-warm" colorInterpolationFilters="sRGB">
			<feColorMatrix type="saturate" values="0.85" />
			<feComponentTransfer>
				<feFuncR type="linear" slope="0.9" intercept="0.065" />
				<feFuncG type="linear" slope="0.86" intercept="0.045" />
				<feFuncB type="linear" slope="0.8" intercept="0.03" />
			</feComponentTransfer>
		</filter>
		<filter id="un-dawn" colorInterpolationFilters="sRGB">
			<feColorMatrix type="saturate" values="0.9" />
			<feComponentTransfer>
				<feFuncR type="linear" slope="0.92" intercept="0.06" />
				<feFuncG type="linear" slope="0.9" intercept="0.05" />
				<feFuncB type="linear" slope="0.9" intercept="0.06" />
			</feComponentTransfer>
		</filter>
		<filter id="un-cool" colorInterpolationFilters="sRGB">
			<feColorMatrix type="saturate" values="0.5" />
			<feComponentTransfer>
				<feFuncR type="linear" slope="0.55" intercept="0.01" />
				<feFuncG type="linear" slope="0.65" intercept="0.02" />
				<feFuncB type="linear" slope="0.95" intercept="0.05" />
			</feComponentTransfer>
		</filter>
		<filter id="un-lime" colorInterpolationFilters="sRGB">
			<feColorMatrix type="matrix" values="0.18 0.5 0.08 0 0  0.23 0.64 0.1 0 0  0.05 0.15 0.03 0 0  0 0 0 1 0" />
		</filter>
		<filter id="un-grey" colorInterpolationFilters="sRGB">
			<feColorMatrix type="saturate" values="0" />
			<feComponentTransfer>
				<feFuncR type="linear" slope="0.8" intercept="0.04" />
				<feFuncG type="linear" slope="0.8" intercept="0.04" />
				<feFuncB type="linear" slope="0.8" intercept="0.04" />
			</feComponentTransfer>
		</filter>
	</defs>
);

/** A full-frame SVG stage with the grade filters. */
export const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', ...style}}>
		<GradeDefs />
		{children}
	</svg>
);

/** A neon stroke without filters: wide faint halo, mid glow, bright core. */
export const Neon: React.FC<{d: string; color: string; width?: number; glow?: number; opacity?: number; dash?: string; stroke?: string}> = ({d, color, width = 3, glow = 1, opacity = 1, dash}) => (
	<g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
		{glow > 0 ? <path d={d} stroke={color} strokeWidth={width * 7} opacity={0.07 * glow} strokeDasharray={dash} /> : null}
		{glow > 0 ? <path d={d} stroke={color} strokeWidth={width * 3} opacity={0.18 * glow} strokeDasharray={dash} /> : null}
		<path d={d} stroke={color} strokeWidth={width} strokeDasharray={dash} />
	</g>
);

// ---------------------------------------------------------------- Trace: the heart-monitor line

// PQRST template: u in [-1, 1] across one complex, v in units of the spike height (negative = up).
const QRS: [number, number][] = [
	[-1, 0],
	[-0.9, -0.03],
	[-0.8, -0.08],
	[-0.7, -0.1],
	[-0.6, -0.08],
	[-0.5, -0.02],
	[-0.42, 0],
	[-0.14, 0],
	[-0.07, 0.16],
	[0, -1],
	[0.07, 0.38],
	[0.13, 0],
	[0.28, 0],
	[0.38, -0.08],
	[0.5, -0.17],
	[0.62, -0.19],
	[0.74, -0.12],
	[0.86, -0.03],
	[1, 0],
];

export type Spike = {x: number; a: number};

/** Points of an ECG trace from x0 to x1 along a baseline, with a PQRST complex at each spike. */
export const tracePoints = (x0: number, x1: number, spikes: Spike[], opts: {w?: number; base?: (x: number) => number; step?: number} = {}) => {
	const w = opts.w ?? 40;
	const base = opts.base ?? (() => 0);
	const step = opts.step ?? 24;
	const pts: [number, number][] = [];
	const sorted = spikes.filter((s) => s.x > x0 - w && s.x < x1 + w).sort((a, b) => a.x - b.x);
	let x = x0;
	const flatTo = (to: number) => {
		while (x < to) {
			pts.push([x, base(x)]);
			x += step;
		}
	};
	for (const s of sorted) {
		flatTo(Math.min(s.x - w, x1));
		for (const [u, v] of QRS) {
			const px = s.x + u * w;
			if (px < x0 || px > x1 || px < x) continue;
			pts.push([px, base(px) + v * s.a]);
		}
		x = Math.max(x, s.x + w);
	}
	flatTo(x1);
	pts.push([x1, base(x1)]);
	return pts;
};

export const pathOf = (pts: [number, number][]) => (pts.length ? 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') : '');

export const traceD = (x0: number, x1: number, y: number, spikes: Spike[], opts: {w?: number; step?: number} = {}) =>
	pathOf(tracePoints(x0, x1, spikes, {...opts, base: () => y}));

// ---------------------------------------------------------------- the TokTic like heart (symmetric version of the opening's icon)

export const HEART_D = 'M12 21 C12 21 4.4 16.4 2.4 11.7 C0.9 8.2 3 4.5 6.6 4.5 C8.7 4.5 11.2 5.7 12 7.1 C12.8 5.7 15.3 4.5 17.4 4.5 C21 4.5 23.1 8.2 21.6 11.7 C19.6 16.4 12 21 12 21 Z';
/** Transform placing the heart so its bounding box is `h` tall, centred on (cx, cy). */
export const heartT = (cx: number, cy: number, h: number) => {
	const s = h / 16.5;
	return `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${s.toFixed(4)}) translate(-12 -12.75)`;
};
