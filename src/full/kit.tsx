import React from 'react';
import {AbsoluteFill, Easing, random, useVideoConfig} from 'remotion';
import {C, DISPLAY_FONT} from '../theme';
import {BEATS, Beat, beatsIn, pulse} from '../timing';
import {KenBurns, RealWorld, Still} from '../ui/Worlds';
import {ramp} from '../util';

// ---------------------------------------------------------------- photos

export type Frame = {scale: number; x?: number; y?: number};
export type Cut = {at: number; id: string; from: Frame; to: Frame; hold?: number};

// Camera moves for a run of cuts: push, pull, pan left/right, rise. Repeats of a photo get a tighter crop.
const MOVES: [Frame, Frame][] = [
	[{scale: 1.04}, {scale: 1.16}],
	[{scale: 1.2}, {scale: 1.06}],
	[{scale: 1.14, x: 3}, {scale: 1.14, x: -3}],
	[{scale: 1.14, x: -3}, {scale: 1.14, x: 3}],
	[{scale: 1.12, y: 3}, {scale: 1.16, y: -2}],
];

/** One cut on every `every` beats between start and end, cycling through ids with varied moves and crops. */
export const cutsEvery = (ids: string[], start: number, end: number, every = 2, seed = 0): Cut[] =>
	beatsIn(start - 0.001, end - 0.001)
		.filter((_, i) => i % every === 0)
		.map((b, i) => {
			const round = Math.floor(i / ids.length);
			const [from, to] = MOVES[(i + seed) % MOVES.length];
			const crop = 0.12 * round;
			const dx = round ? (random(`cx${seed}-${i}`) - 0.5) * 8 : 0;
			const dy = round ? (random(`cy${seed}-${i}`) - 0.5) * 6 : 0;
			return {
				at: b.t,
				id: ids[(i + seed) % ids.length],
				from: {scale: from.scale + crop, x: (from.x ?? 0) + dx, y: (from.y ?? 0) + dy},
				to: {scale: to.scale + crop, x: (to.x ?? 0) + dx, y: (to.y ?? 0) + dy},
			};
		});

/** Shows whichever cut is current; each one keeps moving for at least `hold` seconds so short cuts still drift. */
export const PhotoTrack: React.FC<{t: number; cuts: Cut[]; end: number; frozen?: number; flash?: number; grade?: string}> = ({t, cuts, end, frozen, flash = 0, grade}) => {
	let i = -1;
	for (let k = 0; k < cuts.length; k++) if (cuts[k].at <= t) i = k;
	if (i < 0 || t >= end) return null;
	const c = cuts[i];
	const next = i + 1 < cuts.length ? cuts[i + 1].at : end;
	const tt = frozen !== undefined && t > frozen ? frozen : t;
	const f = flash * Math.exp(-(t - c.at) / 0.07);
	return (
		<AbsoluteFill style={{filter: grade}}>
			<KenBurns t={tt} start={c.at} end={Math.max(next, c.at + (c.hold ?? 2.2))} from={c.from} to={c.to} punch={0.035}>
				<Still id={c.id} fallback={<RealWorld t={t} seed={c.id} />} />
			</KenBurns>
			{f > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: f}} /> : null}
		</AbsoluteFill>
	);
};

/** A single still with one long move. */
export const Shot: React.FC<{t: number; id: string; start: number; end: number; from: Frame; to: Frame; punch?: number; style?: React.CSSProperties}> = ({t, id, start, end, from, to, punch, style}) => (
	<AbsoluteFill style={style}>
		<KenBurns t={t} start={start} end={end} from={from} to={to} punch={punch}>
			<Still id={id} fallback={<RealWorld t={t} seed={id} />} />
		</KenBurns>
	</AbsoluteFill>
);

// ---------------------------------------------------------------- light

/** Warm light leak drifting across the frame, breathing on the bar. */
export const LightLeak: React.FC<{t: number; amount?: number; seed?: number}> = ({t, amount = 1, seed = 0}) => {
	const x = 30 + 40 * Math.sin(t * 0.23 + seed);
	const y = 30 + 30 * Math.cos(t * 0.17 + seed * 2);
	const o = amount * (0.35 + 0.25 * pulse(t, 0.6));
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,170,90,${o}) 0%, rgba(255,90,60,${o * 0.4}) 30%, rgba(0,0,0,0) 60%)`,
				mixBlendMode: 'screen',
			}}
		/>
	);
};

export const Vignette: React.FC<{amount?: number}> = ({amount = 0.55}) => (
	<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${amount}) 100%)`}} />
);

/** White flashes on every beat between start and end. */
export const Strobe: React.FC<{t: number; start: number; end: number; strength?: number}> = ({t, start, end, strength = 0.85}) => {
	if (t < start || t >= end) return null;
	const list = beatsIn(start - 0.001, end);
	return <AbsoluteFill style={{background: '#fff', opacity: strength * pulse(t, 0.06, list)}} />;
};

/** A one-off flash at `at`. */
export const Flash: React.FC<{t: number; at: number; decay?: number; color?: string}> = ({t, at, decay = 0.25, color = '#fff'}) => {
	if (t < at || t > at + decay * 6) return null;
	return <AbsoluteFill style={{background: color, opacity: Math.exp(-(t - at) / decay)}} />;
};

/** Gold confetti burst from the centre. */
export const Confetti: React.FC<{t: number; at: number; count?: number}> = ({t, at, count = 140}) => {
	const dt = t - at;
	if (dt < 0 || dt > 6) return null;
	const {width, height} = useVideoConfig();
	return (
		<svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: count}).map((_, i) => {
				const a = random(`ca${i}`) * Math.PI * 2;
				const v = (0.4 + random(`cv${i}`)) * Math.max(width, height) * 0.9;
				const drag = 1 - Math.exp(-dt * 2.2);
				const x = width / 2 + (Math.cos(a) * v * drag) / 2.2;
				const y = height / 2 + (Math.sin(a) * v * drag) / 2.2 + 120 * dt * dt;
				const r = (random(`cr${i}`) - 0.5) * 900 * dt;
				const w = 8 + random(`cw${i}`) * 10;
				const col = ['#FFD27A', '#FFB547', '#FFF1C9', '#E8B04B', '#ffffff'][i % 5];
				return <rect key={i} x={x} y={y} width={w} height={w * 0.5} fill={col} opacity={1 - ramp(dt, 4, 6)} transform={`rotate(${r} ${x} ${y})`} />;
			})}
		</svg>
	);
};

// ---------------------------------------------------------------- type

export type Word = {
	text: string;
	at: number;
	until: number;
	/** font size as a fraction of frame width */
	size: number;
	x?: number;
	y?: number;
	align?: 'left' | 'center' | 'right';
	color?: string;
	weight?: number;
	/** scale with the beat while on screen */
	bounce?: boolean;
	enter?: 'slam' | 'rise' | 'fade';
	/** vertical (9:16) only: centre the word at this y (%) instead, e.g. to clear the phone */
	vy?: number;
};

/** Big kinetic lyric type. Positions are % of the frame; sizes scale with frame width so the vertical cut works. */
export const Kinetic: React.FC<{t: number; words: Word[]}> = ({t, words}) => {
	const {width, height} = useVideoConfig();
	const vertical = height > width;
	return (
		<AbsoluteFill style={{zIndex: 80}}>
			{words.map((word, i) => {
				if (t < word.at || t >= word.until) return null;
				const w = vertical ? {...word, size: word.size * 0.88, ...(word.vy !== undefined ? {y: word.vy, x: 50, align: 'center' as const} : {})} : word;
				const enter = w.enter ?? 'slam';
				const k = ramp(t, w.at, w.at + (enter === 'slam' ? 0.12 : 0.35), enter === 'slam' ? Easing.out(Easing.exp) : Easing.out(Easing.cubic));
				const out = ramp(t, w.until - 0.15, w.until);
				const scale = (enter === 'slam' ? 1.7 - 0.7 * k : 1) * (w.bounce ? 1 + 0.07 * pulse(t, 0.12) : 1);
				const dy = enter === 'rise' ? 40 * (1 - k) : 0;
				const align = w.align ?? 'center';
				const x = w.x ?? 50;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: `${x}%`,
							top: `${w.y ?? 50}%`,
							transform: `translate(${align === 'center' ? -50 : align === 'right' ? -100 : 0}%, -50%) translateY(${dy}px) scale(${scale})`,
							transformOrigin: align === 'left' ? 'left center' : align === 'right' ? 'right center' : 'center',
							fontFamily: DISPLAY_FONT,
							fontWeight: w.weight ?? 700,
							fontSize: w.size * width,
							lineHeight: 0.92,
							letterSpacing: -w.size * width * 0.03,
							color: w.color ?? '#fff',
							whiteSpace: 'pre',
							textAlign: align,
							opacity: Math.min(1, k * 2) * (1 - out),
							textShadow: '0 6px 40px rgba(0,0,0,0.45)',
						}}
					>
						{w.text}
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

/** FLATLINE slam with the flat ECG trace, as at 1:24. */
export const FlatlineSlam: React.FC<{t: number; at: number; until: number; size?: number}> = ({t, at, until, size = 0.16}) => {
	const {width, height} = useVideoConfig();
	if (t < at || t >= until) return null;
	const vertical = height > width;
	const slam = ramp(t, at, at + 0.13, Easing.out(Easing.exp));
	const shake = (1 - ramp(t, at, at + 0.4)) * 14;
	const sx = (random(`fs${Math.floor(t * 30)}`) - 0.5) * shake;
	const out = ramp(t, until - 0.25, until);
	const fs = (vertical ? size * 1.15 : size) * width;
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 90, transform: `translateX(${sx}px)`, opacity: 1 - out}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 6, marginTop: -3, background: C.signal, boxShadow: `0 0 24px ${C.signal}`, transform: `scaleX(${ramp(t, at, at + 0.2)})`}} />
			<div style={{fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: fs, letterSpacing: -fs * 0.03, color: '#fff', lineHeight: 0.9, textAlign: 'center', transform: `scale(${2.6 - 1.6 * slam})`, opacity: Math.min(1, slam * 2), textShadow: '0 0 60px rgba(0,0,0,0.6)'}}>
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

export const beatsBetween = (a: number, b: number): Beat[] => BEATS.filter((x) => x.t >= a && x.t < b);
