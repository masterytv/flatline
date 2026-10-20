import React from 'react';
import {AbsoluteFill, Easing, Img, staticFile} from 'remotion';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {BEATS, bt, lastBeatIndex, pulse} from '../../timing';
import {ramp} from '../../util';
import {EcgGrid, Glow, H, K, Readout, Svg, W, ecg, mix, pathOf, sample, tempoAt} from './engine';
import {ScriptWord} from './Script';

export const BASE = H * 0.56;

/** Scroll mode: newest sample at x1, `window` seconds across. */
export const scroll = (t: number, x0: number, x1: number, y: number, amp: number, window: number, from = -Infinity, step = 3) =>
	sample(x0, x1, step, (x) => y - amp * ecg(t - ((x1 - x) / (x1 - x0)) * window, from));

// ---------------------------------------------------------------- 1:26.6 R8 switches off like a CRT; the string

const STRING_FIELDS: [number, string][] = [
	[bt(46), '#3A5BFF'],
	[bt(47), '#7A3CFF'],
	[bt(48), '#FF8A3D'],
];

const stringY = (t: number, x: number, n: number, offset: number, phase: number) => {
	const i = lastBeatIndex(t);
	const since = i >= 0 ? t - BEATS[i].t : 1;
	const env = Math.exp(-since / 0.22);
	const osc = Math.cos(2 * Math.PI * 7.5 * since + phase);
	return BASE + offset + H * 0.18 * env * osc * Math.sin((n * Math.PI * x) / W);
};

export const SceneString: React.FC<{t: number}> = ({t}) => {
	const dt = t - T.end;
	const crt = dt < 4 / 30;
	const sy = Math.max(0.004, 1 - dt / 0.1);
	const bloom = dt >= 3 / 30 && dt < 4 / 30;
	const bar = BEATS[Math.max(0, lastBeatIndex(t))].bar;
	const n = bar <= 46 ? 1 : bar === 47 ? 2 : 3;
	const strings: [number, number][] = bar >= 48 ? [[0, 3], [-0.06, 2], [0.06, 4], [-0.12, 1], [0.12, 5]] : [[0, n]];
	const split = ramp(t, bt(48), bt(48) + 0.25, Easing.out(Easing.cubic));
	let field: [number, string] | null = null;
	for (const f of STRING_FIELDS) if (t >= f[0]) field = f;
	const fieldA = field ? 0.35 * Math.exp(-(t - field[0]) / 0.5) : 0;
	return (
		<AbsoluteFill style={{background: K.ground}}>
			{field ? <AbsoluteFill style={{background: field[1], opacity: fieldA}} /> : null}
			<EcgGrid t={t} opacity={ramp(t, T.end + 0.2, T.end + 0.8)} />
			<Svg>
				{[6, 4, 2, 0].map((k) => (
					<g key={k} opacity={k === 0 ? 1 : 0.18 * (1 - k / 8)}>
						{strings.map(([off, nn], si) => {
							const pts = sample(0, W, 6, (x) => stringY(t - k / 30, x, nn, off * H * split, si * 1.3));
							return k === 0 ? <Glow key={si} d={pathOf(pts)} color={K.lime} core={si ? 2 : 3} glow={si ? 0.6 : 1} opacity={si ? split : 1} /> : <path key={si} d={pathOf(pts)} fill="none" stroke={K.lime} strokeWidth={2} />;
						})}
					</g>
				))}
			</Svg>
			{crt ? (
				<AbsoluteFill style={{transform: `scaleY(${sy})`, filter: `brightness(${1 + 2 * (1 - sy)})`, opacity: bloom ? 0 : 1}}>
					<Img src={staticFile('stills/small/R8.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
				</AbsoluteFill>
			) : null}
			{bloom ? <AbsoluteFill style={{background: '#fff'}} /> : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 1:32.2 FLATLINE, drawn by the write head, blinking like an alarm

const BLINKS = [bt(49), bt(49, 3), bt(50), bt(50, 3)];
const UNSPOOL = bt(50, 4);

export const SceneFlatline: React.FC<{t: number}> = ({t}) => {
	const white = t - F.flatline2 < 1 / 30;
	const write = ramp(t, F.flatline2 + 0.03, F.flatline2 + 0.33, Easing.linear);
	const un = ramp(t, UNSPOOL, F.heart - 0.05, Easing.in(Easing.cubic));
	const x0 = W * 0.13;
	const x1 = W * 0.87;
	const revealR = x0 + (x1 - x0) * write;
	const revealRight = x1 - (x1 - x0) * un;
	const fill = BLINKS.some((b) => t >= b && t < b + 2 / 30);
	const y = H / 2;
	const size = 300;
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<EcgGrid t={t} opacity={0.8} />
			<Svg>
				<defs>
					<clipPath id="flatReveal">
						<rect x={0} y={0} width={Math.min(revealR, revealRight)} height={H} />
					</clipPath>
				</defs>
				<Glow d={`M0 ${y}L${W} ${y}`} color={K.lime} core={3} glow={1} />
				<g clipPath="url(#flatReveal)">
					<text x={W / 2} y={y + size * 0.36} textAnchor="middle" fill={fill ? K.lime : 'none'} stroke={K.lime} strokeWidth={3} style={{font: `700 ${size}px 'Space Grotesk', sans-serif`, letterSpacing: 4}}>
						FLATLINE
					</text>
					<text x={W / 2} y={y + size * 0.36} textAnchor="middle" fill="none" stroke={K.lime} strokeWidth={10} opacity={0.25} filter="url(#mb5)" style={{font: `700 ${size}px 'Space Grotesk', sans-serif`, letterSpacing: 4}}>
						FLATLINE
					</text>
				</g>
				{write < 1 ? <rect x={revealR - 2} y={y - size * 0.45} width={4} height={size * 0.9} fill="#fff" opacity={0.9} /> : null}
			</Svg>
			<Readout label="HR" value="– – –" color={K.lime} opacity={ramp(t, F.flatline2 + 0.5, F.flatline2 + 1)} />
			{white ? <AbsoluteFill style={{background: '#fff'}} /> : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 1:35.9 "My heart stopped... and I started"

export const SceneHeart: React.FC<{t: number}> = ({t}) => {
	const stopped = t >= F.stopped;
	const started = t >= F.started;
	const drop = ramp(t, F.started, F.started + 0.35, Easing.in(Easing.cubic));
	const color = stopped ? K.red : K.lime;
	const tremor = stopped && !started ? Math.sin(t * 91) * 0.8 : 0;
	const y = BASE + tremor;
	const window = 2.4;
	const pts = scroll(t, 0, W, y, H * 0.4, window, F.started);
	// split where the new heartbeat has reached: older trace stays red, new trace is warm
	const xStart = W - ((t - F.started) / window) * W;
	const warmPts = started ? pts.filter(([x]) => x >= xStart - 3) : [];
	const redPts = started ? pts.filter(([x]) => x <= xStart + 3) : pts;
	const hr = started ? Math.round(tempoAt(t) * ramp(t, F.started, F.started + 1.4)) : stopped ? 0 : null;
	const size = 150;
	const wordsIn = ramp(t, F.heart, F.heart + 0.12);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<EcgGrid t={stopped ? F.stopped : t} opacity={started ? 0.6 : 0.8} color={stopped && !started ? K.red : K.lime} lurch={!stopped} />
			<Svg>
				<g transform={`translate(0 ${drop * H * 0.6})`} opacity={1 - drop}>
					<text x={W * 0.08} y={y - 14} fill={color} opacity={wordsIn} style={{font: `700 ${size}px 'Space Grotesk', sans-serif`, letterSpacing: -2}}>
						MY HEART <tspan fillOpacity={stopped ? 1 : 0}>STOPPED</tspan>
					</text>
				</g>
				{redPts.length > 1 ? <Glow d={pathOf(redPts)} color={color} core={3} glow={stopped && !started ? 0.6 : 1} /> : null}
				{warmPts.length > 1 ? <Glow d={pathOf(warmPts)} color={K.amber} coreColor={K.warm} core={3} glow={1.1} /> : null}
				{started ? (
					<text x={W * 0.5} y={y - H * 0.3} textAnchor="middle" fill={K.warm} opacity={ramp(t, F.started + 0.3, F.started + 0.8)} style={{font: "500 54px 'Space Grotesk', sans-serif"}}>
						and I started
					</text>
				) : null}
			</Svg>
			{hr !== null ? <Readout label="HR" value={String(hr)} color={started ? K.warm : K.red} /> : <Readout label="HR" value="– – –" color={K.lime} />}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 1:41.4 "...dancing": the write head leaves the baseline and writes

export const SceneScript: React.FC<{t: number}> = ({t}) => {
	const k = ramp(t, F.dancing, bt(54, 4) + 0.1, Easing.inOut(Easing.sin));
	const kick = pulse(t, 0.15);
	const ww = W * 0.7;
	const x = (W - ww) / 2;
	const top = BASE - ww * 0.3;
	const s = 1 + 0.06 * kick * (k >= 1 ? 1 : 0.3);
	const trace = scroll(t, 0, W, H * 0.86, H * 0.08, 2.4);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<EcgGrid t={t} opacity={0.45} />
			<Svg>
				<Glow d={pathOf(trace)} color={K.amber} coreColor={K.warm} core={2} glow={0.6} opacity={0.75} />
				<ScriptWord word="dancing" k={k} x={x} y={top} width={ww} color={K.amber} coreColor={K.warm} core={5} glow={1.2 + 0.5 * kick} transform={`translate(${W / 2} ${BASE - 80}) scale(${s}) translate(${-W / 2} ${-(BASE - 80)})`} />
			</Svg>
			<Readout label="HR" value={String(Math.round(tempoAt(t)))} color={K.warm} />
		</AbsoluteFill>
	);
};

export const _mix = mix;
