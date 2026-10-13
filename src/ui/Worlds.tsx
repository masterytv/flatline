import React from 'react';
import {AbsoluteFill, getStaticFiles, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {pulse} from '../timing';

/**
 * A still from public/stills/<ID>[_name].{png,jpg,webp} when the image exists,
 * otherwise a procedural stand-in so the edit can be timed before images arrive.
 */
export const Still: React.FC<{id: string; fallback: React.ReactNode; style?: React.CSSProperties; small?: boolean}> = ({id, fallback, style, small}) => {
	// `small` prefers the 1280px copy from `npm run stills:small` (thumbnails, heavy blur).
	const files = getStaticFiles();
	const file =
		(small ? files.find((f) => f.name === `stills/small/${id}.jpg`) : undefined) ??
		files.find((f) => f.name.startsWith(`stills/${id}_`) || f.name.startsWith(`stills/${id}.`));
	if (file) {
		return <Img src={staticFile(file.name)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style}} />;
	}
	return (
		<AbsoluteFill style={style}>
			{fallback}
			<div style={{position: 'absolute', right: 10, bottom: 8, fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.35)'}}>{id} stand-in</div>
		</AbsoluteFill>
	);
};

const WARM = ['#FFB547', '#FF7A45', '#FF4D8D', '#FFD27A', '#C45CFF', '#FF9E6B'];
const COLD = ['#4D7CFF', '#6FD3FF', '#8B7BFF'];

const Bokeh: React.FC<{t: number; seed: string; count: number; minR: number; maxR: number; cold?: number; opacity?: number}> = ({t, seed, count, minR, maxR, cold = 0.15, opacity = 0.7}) => {
	const p = pulse(t, 0.25);
	return (
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
			<defs>
				<filter id={`soft-${seed}`}>
					<feGaussianBlur stdDeviation="6" />
				</filter>
			</defs>
			{Array.from({length: count}).map((_, i) => {
				const isCold = random(`${seed}c${i}`) < cold;
				const pal = isCold ? COLD : WARM;
				const color = pal[Math.floor(random(`${seed}p${i}`) * pal.length)];
				const r = minR + random(`${seed}r${i}`) * (maxR - minR);
				const x = random(`${seed}x${i}`) * 1600 + Math.sin(t * 0.3 + i) * 20;
				const y = random(`${seed}y${i}`) * 900 + Math.cos(t * 0.25 + i * 1.7) * 14;
				const o = opacity * (0.35 + 0.45 * random(`${seed}o${i}`) + 0.25 * p * (i % 3 === 0 ? 1 : 0.3));
				return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o} filter={`url(#soft-${seed})`} />;
			})}
		</svg>
	);
};

const Dancers: React.FC<{t: number; color: string; count?: number; lit?: boolean}> = ({t, color, count = 9, lit}) => {
	const p = pulse(t, 0.18);
	return (
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
			{Array.from({length: count}).map((_, i) => {
				const x = 90 + (i / (count - 1)) * 1420 + (random(`dx${i}`) - 0.5) * 80;
				const s = 0.8 + random(`ds${i}`) * 0.5;
				const bob = Math.sin(t * 4.2 + i * 1.3) * 10 + p * 16 * (i % 2 ? 1 : -0.6);
				const sway = Math.sin(t * 2.1 + i) * 6;
				const y = 900 - 420 * s + bob;
				const fill = lit ? ['#E7B08C', '#C98E6B', '#F2C7A5', '#A8705A'][i % 4] : color;
				return (
					<g key={i} transform={`translate(${x} ${y}) rotate(${sway}) scale(${s})`}>
						<ellipse cx="0" cy="0" rx="46" ry="54" fill={fill} />
						<ellipse cx="0" cy="-18" rx="50" ry="44" fill={lit ? '#1a1012' : color} />
						<rect x="-82" y="62" width="164" height="420" rx="70" fill={lit ? ['#2B2440', '#5A1E2E', '#1E3A4A', '#3B2A1A'][i % 4] : color} />
						<rect x="-118" y={90 - p * 60 * (i % 3 === 0 ? 1 : 0)} width="40" height="220" rx="20" fill={lit ? fill : color} transform={`rotate(${-20 - p * 40 * (i % 3 === 0 ? 1 : 0)} -98 100)`} />
						<rect x="78" y="90" width="40" height="220" rx="20" fill={lit ? fill : color} transform={`rotate(${20 + p * 30 * (i % 2)} 98 100)`} />
					</g>
				);
			})}
		</svg>
	);
};

/** S2 stand-in: the house party seen in the cold light of the screen world. */
export const PartyWorld: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: 'linear-gradient(180deg, #120A1E 0%, #2A1430 55%, #3A1A22 100%)'}}>
		<Bokeh t={t} seed="party" count={34} minR={14} maxR={60} />
		<Dancers t={t} color="#07060B" />
		<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(40,90,200,0.18), rgba(10,20,60,0.25))', mixBlendMode: 'screen'}} />
	</AbsoluteFill>
);

/** S3 stand-in: party lights straight at the lens. */
export const LightsWorld: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #3A2340 0%, #0B0812 70%)'}}>
		<Bokeh t={t} seed="lights" count={22} minR={50} maxR={150} cold={0.3} opacity={0.85} />
	</AbsoluteFill>
);

/** S1 stand-in: her profile lit blue from below. */
export const FaceWorld: React.FC<{t: number; lookUp?: number}> = ({t, lookUp = 0}) => (
	<AbsoluteFill style={{background: 'radial-gradient(circle at 70% 30%, #2A1424 0%, #07070C 60%)'}}>
		<Bokeh t={t} seed="face" count={14} minR={30} maxR={80} opacity={0.35} />
		<svg viewBox="0 0 900 1600" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
			<defs>
				<radialGradient id="rim" cx="0.55" cy="0.9" r="0.7">
					<stop offset="0" stopColor="#7FB4FF" stopOpacity={0.9 - lookUp * 0.5} />
					<stop offset="1" stopColor="#0A0D18" stopOpacity="1" />
				</radialGradient>
			</defs>
			<g transform={`rotate(${-lookUp * 12} 450 900)`}>
				{/* hair */}
				<path d="M250 520 C 230 330 400 230 520 260 C 650 290 700 420 690 560 L 700 980 C 620 1000 560 980 520 960 L 300 960 C 260 820 250 700 250 520 Z" fill="#05050A" />
				{/* face in profile */}
				<path d="M560 420 C 640 440 680 520 676 600 C 700 640 720 690 690 700 C 700 740 690 770 668 780 C 676 820 650 860 600 862 C 590 900 560 940 520 960 L 470 960 C 520 760 520 560 560 420 Z" fill="url(#rim)" />
				<path d="M380 960 C 420 1100 400 1300 380 1600 L 760 1600 C 720 1300 640 1100 600 960 Z" fill="#06070D" />
			</g>
		</svg>
	</AbsoluteFill>
);

/** S6 stand-in: her faint reflection in dead black glass. */
export const ReflectionWorld: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: '#020203'}}>
		<AbsoluteFill style={{opacity: 0.22, filter: 'blur(3px)'}}>
			<FaceWorld t={t} lookUp={0} />
		</AbsoluteFill>
		<AbsoluteFill style={{background: 'linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0) 100%)'}} />
	</AbsoluteFill>
);

/** R-series stand-in: warm, flash-lit party candid. */
export const RealWorld: React.FC<{t: number; seed?: string}> = ({t, seed = 'real'}) => (
	<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, #E2894E 0%, #7A2E1C 45%, #1E0B08 100%)'}}>
		<Bokeh t={t} seed={seed} count={26} minR={20} maxR={70} cold={0.05} opacity={0.8} />
		<Dancers t={t} color="#2a1410" lit />
		<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, rgba(255,250,235,0.35) 0%, rgba(255,250,235,0) 45%)', mixBlendMode: 'screen'}} />
		<Grain />
	</AbsoluteFill>
);

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.18}) => {
	const frame = useCurrentFrame();
	return (
		<svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, mixBlendMode: 'overlay'}}>
			<filter id="grain">
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect width="100%" height="100%" filter="url(#grain)" />
		</svg>
	);
};

type Frame = {scale: number; x?: number; y?: number};

/**
 * Slow camera move over a still: eased push/pull and pan between two framings.
 * x and y are percentages of the frame. An optional `punch` adds a quick settle on the cut.
 */
export const KenBurns: React.FC<{
	t: number;
	start: number;
	end: number;
	from: Frame;
	to: Frame;
	punch?: number;
	children: React.ReactNode;
}> = ({t, start, end, from, to, punch = 0, children}) => {
	const k = Math.min(1, Math.max(0, (t - start) / (end - start)));
	const e = k * k * (3 - 2 * k); // smoothstep
	const settle = punch * Math.exp(-Math.max(0, t - start) / 0.18);
	const scale = from.scale + (to.scale - from.scale) * e + settle;
	const x = (from.x ?? 0) + ((to.x ?? 0) - (from.x ?? 0)) * e;
	const y = (from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * e;
	return <AbsoluteFill style={{transform: `scale(${scale}) translate(${x}%, ${y}%)`}}>{children}</AbsoluteFill>;
};
