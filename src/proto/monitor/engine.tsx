import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {BEATS, Beat, lastBeatIndex} from '../../timing';

// ---------------------------------------------------------------- palette (no cyan anywhere; the phones' cold glow is blue)

export const W = 1920;
export const H = 1080;
export const K = {
	ground: '#050608',
	lime: '#C6FF3D',
	red: '#FF4D6D',
	warm: '#FFF1C9',
	amber: '#FFB547',
	coral: '#FF7A45',
	rose: '#FF8FA3',
	gold: '#FFD27A',
	peach: '#FFC09A',
	cold: '#6E9CFF',
	plum: '#2A0E24',
	umber: '#1A0D0A',
	ink: '#0B0D12',
	paper: '#E9E2D6',
};
export const FRIEND_HUES = [K.amber, K.coral, K.rose, K.gold, K.peach];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, k: number) => {
	const A = hex(a);
	const B = hex(b);
	const k1 = clamp01(k);
	return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k1)).join(',')})`;
};

// ---------------------------------------------------------------- the heartbeat, placed on the beat grid (never a fixed BPM)

const g = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));

/** One PQRST complex; dt in seconds from the R peak; R = 1. */
export const pqrst = (dt: number) =>
	0.13 * g(dt + 0.17, 0.028) - 0.14 * g(dt + 0.027, 0.009) + g(dt, 0.012) - 0.3 * g(dt - 0.026, 0.01) + 0.24 * g(dt - 0.21, 0.05);

/** ECG value at time tau: one complex per beat in [from, to). */
export const ecg = (tau: number, from = -Infinity, to = Infinity, list: Beat[] = BEATS) => {
	let i = lastBeatIndex(tau + 0.35, list);
	let v = 0;
	for (; i >= 0 && list[i].t > tau - 0.45; i--) {
		const b = list[i];
		if (b.t < from || b.t >= to) continue;
		v += pqrst(tau - b.t);
	}
	return v;
};

/** Song tempo at t, from the local beat interval (≈128 → 132). Her heart rate IS the song. */
export const tempoAt = (t: number) => {
	const i = Math.max(1, Math.min(BEATS.length - 1, lastBeatIndex(t)));
	return 60 / (BEATS[i].t - BEATS[i - 1].t);
};

/** Continuous beat clock: beat index + fraction (follows the drift). */
export const beatClock = (t: number) => {
	const i = lastBeatIndex(t);
	if (i < 0) return 0;
	const a = BEATS[i].t;
	const b = BEATS[Math.min(i + 1, BEATS.length - 1)].t;
	return i + (b > a ? clamp01((t - a) / (b - a)) : 0);
};

export const pathOf = (pts: [number, number][]) => {
	let d = '';
	for (let i = 0; i < pts.length; i++) d += `${i ? 'L' : 'M'}${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
	return d;
};

/** Samples x from x0 to x1, denser where the signal is sharp is not needed at 2 px steps. */
export const sample = (x0: number, x1: number, step: number, fn: (x: number) => number): [number, number][] => {
	const n = Math.max(2, Math.ceil((x1 - x0) / step));
	const out: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const x = x0 + ((x1 - x0) * i) / n;
		out.push([x, fn(x)]);
	}
	return out;
};

// ---------------------------------------------------------------- drawing

/** Shared blur filters (user-space regions, so flat lines don't get clipped). */
export const GlowDefs: React.FC = () => (
	<defs>
		{[2, 5, 12, 26].map((s) => (
			<filter key={s} id={`mb${s}`} filterUnits="userSpaceOnUse" x={-400} y={-400} width={W + 800} height={H + 800}>
				<feGaussianBlur stdDeviation={s} />
			</filter>
		))}
	</defs>
);

/** The line: a 3 px core plus 6 px and 24 px glow passes. */
export const Glow: React.FC<{
	d: string;
	color: string;
	core?: number;
	glow?: number;
	opacity?: number;
	coreColor?: string;
	dash?: string;
	dashOffset?: number;
	join?: 'round' | 'miter';
	pathLength?: number;
}> = ({d, color, core = 3, glow = 1, opacity = 1, coreColor, dash, dashOffset, pathLength}) => {
	const common = {d, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeDasharray: dash, strokeDashoffset: dashOffset, pathLength};
	return (
		<g opacity={opacity}>
			<path {...common} stroke={color} strokeWidth={core * 8} opacity={0.32 * glow} filter="url(#mb26)" />
			<path {...common} stroke={color} strokeWidth={core * 2.2} opacity={0.8 * Math.min(1, glow)} filter="url(#mb5)" />
			<path {...common} stroke={coreColor ?? mix(color, '#FFFFFF', 0.55)} strokeWidth={core} />
		</g>
	);
};

/** ECG paper: lime grid at 4–5%, 40 px major squares, lurching one square left per beat. */
export const EcgGrid: React.FC<{t: number; opacity?: number; color?: string; lurch?: boolean}> = ({t, opacity = 1, color = K.lime, lurch = true}) => {
	const bc = beatClock(t);
	const k = bc - Math.floor(bc);
	const step = Math.floor(bc) + (lurch ? 1 - Math.pow(1 - Math.min(1, k * 5), 3) : 0);
	const off = -(step * 40) % 40;
	if (opacity <= 0) return null;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity}}>
			<defs>
				<pattern id="ecgMinor" width="8" height="8" patternUnits="userSpaceOnUse" x={off}>
					<path d="M8 0V8H0" fill="none" stroke={color} strokeOpacity={0.022} strokeWidth="1" />
				</pattern>
				<pattern id="ecgMajor" width="40" height="40" patternUnits="userSpaceOnUse" x={off}>
					<path d="M40 0V40H0" fill="none" stroke={color} strokeOpacity={0.05} strokeWidth="1.2" />
				</pattern>
			</defs>
			<rect width={W} height={H} fill="url(#ecgMinor)" />
			<rect width={W} height={H} fill="url(#ecgMajor)" />
		</svg>
	);
};

/** Film grain; pass `seed` to freeze it. */
export const MGrain: React.FC<{opacity?: number; seed?: number}> = ({opacity = 0.06, seed}) => {
	const frame = useCurrentFrame();
	const s = seed ?? frame % 24;
	return (
		<svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
			<filter id={`mgrain${s}`}>
				<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={s} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect width="100%" height="100%" filter={`url(#mgrain${s})`} />
		</svg>
	);
};

/** Readout in the corner: HR (the live tempo) like a ward monitor. */
export const Readout: React.FC<{label: string; value: string; color: string; x?: number; y?: number; opacity?: number; size?: number}> = ({label, value, color, x = 64, y = 980, opacity = 1, size = 1}) => (
	<div style={{position: 'absolute', left: x, top: y, opacity, fontFamily: "'Inter', sans-serif", color, display: 'flex', alignItems: 'baseline', gap: 12 * size, fontVariantNumeric: 'tabular-nums'}}>
		<span style={{fontSize: 18 * size, fontWeight: 600, letterSpacing: 3 * size, opacity: 0.75}}>{label}</span>
		<span style={{fontSize: 44 * size, fontWeight: 300, letterSpacing: 1}}>{value}</span>
	</div>
);

// ---------------------------------------------------------------- photos

/** Maps photo-normalised coords (2752×1536, object-fit cover on 1920×1080) to screen, with a push around a centre. */
export const coverMap = (scale = 1, cx = 0.5, cy = 0.5, ratio = 2752 / 1536) => {
	const s = Math.max(W / ratio, H);
	const bw = s * ratio;
	const bh = s;
	const ox = (W - bw) / 2;
	const oy = (H - bh) / 2;
	// push centred on (cx, cy) of the photo
	const px = ox + cx * bw;
	const py = oy + cy * bh;
	return {
		x: (u: number) => px + (ox + u * bw - px) * scale,
		y: (v: number) => py + (oy + v * bh - py) * scale,
		w: bw * scale,
		h: bh * scale,
		left: px + (ox - px) * scale,
		top: py + (oy - py) * scale,
	};
};

/** A pre-treated plate from public/stills/fx/monitor/, placed with coverMap. */
export const Plate: React.FC<{name: string; scale?: number; cx?: number; cy?: number; style?: React.CSSProperties}> = ({name, scale = 1, cx = 0.5, cy = 0.5, style}) => {
	const m = coverMap(scale, cx, cy);
	return <img src={staticFile(`stills/fx/monitor/${name}`)} style={{position: 'absolute', left: m.left, top: m.top, width: m.w, height: m.h, ...style}} />;
};

// Pixel data of a small still, for dot fields drawn on canvas (loaded once per worker).
const cache = new Map<string, ImageData>();
export const usePixels = (src: string, w: number, h: number): ImageData | null => {
	const key = `${src}@${w}x${h}`;
	const [data, setData] = useState<ImageData | null>(cache.get(key) ?? null);
	const [handle] = useState(() => (cache.has(key) ? null : delayRender(`pixels ${key}`)));
	useLayoutEffect(() => {
		if (data) return;
		const img = new Image();
		img.onload = () => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const ctx = c.getContext('2d')!;
			ctx.drawImage(img, 0, 0, w, h);
			const d = ctx.getImageData(0, 0, w, h);
			cache.set(key, d);
			setData(d);
			if (handle !== null) continueRender(handle);
		};
		img.onerror = () => handle !== null && continueRender(handle);
		img.src = staticFile(src);
	}, [data, handle, key, src, w, h]);
	return data;
};

/** Canvas that redraws every frame. */
export const FrameCanvas: React.FC<{draw: (ctx: CanvasRenderingContext2D) => void; style?: React.CSSProperties; deps: unknown[]}> = ({draw, style, deps}) => {
	const ref = useRef<HTMLCanvasElement>(null);
	useLayoutEffect(() => {
		const c = ref.current;
		if (!c) return;
		const ctx = c.getContext('2d')!;
		ctx.clearRect(0, 0, W, H);
		draw(ctx);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
	return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', ...style}} />;
};

export const Full: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <AbsoluteFill style={style}>{children}</AbsoluteFill>;

export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', ...style}}>
		<GlowDefs />
		{children}
	</svg>
);

/** Loads and decodes images before the first frame is captured (SVG <image> and CSS masks aren't tracked by delayRender). */
const preloaded = new Set<string>();
export const usePreload = (files: string[]) => {
	const [handle] = useState(() => {
		const todo = files.filter((f) => !preloaded.has(f));
		if (!todo.length) return null;
		const h = delayRender(`preload ${todo.length} plates`);
		Promise.all(
			todo.map(
				(f) =>
					new Promise<void>((res) => {
						const img = new Image();
						img.onload = () => {
							preloaded.add(f);
							img.decode().then(() => res(), () => res());
						};
						img.onerror = () => res();
						img.src = staticFile(f);
					}),
			),
		).then(() => continueRender(h));
		return h;
	});
	return handle;
};
