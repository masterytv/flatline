import React from 'react';
import {AbsoluteFill, Easing, random} from 'remotion';
import {F} from '../../full/cues';
import {pulse} from '../../timing';
import {ramp} from '../../util';
import {FrameCanvas, Glow, H, K, Svg, W, clamp01, ecg, lerp, pathOf, pqrst, sample, usePixels} from './engine';

// 3:16.5–3:21.9 (bars 106–108). "Dancing" on the loudest beat: the word fills the frame, its letters are windows
// onto R7 (the whole group, the only time they're all together) as a coarse live halftone; we fly through the A,
// the dots swell on every kick, then break loose and drift up like embers as the colour cools to dawn.

const COLS = 160;
const ROWS = 90;
const PITCH = 13;
const FLY0 = F.dancing2 + 0.36;
const FLY1 = F.dancing2 + 1.0;

const hexRgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const ramp3 = (stops: string[], k: number) => {
	const s = stops.map(hexRgb);
	const x = clamp01(k) * (s.length - 1);
	const i = Math.min(s.length - 2, Math.floor(x));
	const f = x - i;
	return s[i].map((v, j) => Math.round(v + (s[i + 1][j] - v) * f));
};
const WARM_STOPS = ['#2C0B22', '#8A2E3A', '#E8843A', '#FFE3B5'];
const DAWN_STOPS = ['#3A1A33', '#B86A86', '#FFB3C1', '#FFF0DA'];

/** R7 as a 45° halftone of round dots, drawn live so the dots can kick and drift. */
export const R7Dots: React.FC<{t: number; opacity?: number; style?: React.CSSProperties}> = ({t, opacity = 1, style}) => {
	const px = usePixels('stills/small/R7.jpg', COLS, ROWS);
	const kick = pulse(t, 0.16);
	const cool = ramp(t, F.slow, F.dawn, Easing.inOut(Easing.sin));
	return (
		<FrameCanvas
			deps={[px, t, opacity]}
			style={{opacity, ...style}}
			draw={(ctx) => {
				if (!px) return;
				const c = Math.SQRT1_2;
				const bh = H;
				const bw = (bh * 2752) / 1536;
				const ox = (W - bw) / 2;
				for (let a = -10; a < 175; a++) {
					for (let b = -10; b < 175; b++) {
						const x0 = W / 2 + (a - b) * c * PITCH;
						const y0 = (a + b) * c * PITCH - H * 0.9;
						if (x0 < -20 || x0 > W + 20 || y0 < -20 || y0 > H + 20) continue;
						const u = (x0 - ox) / bw;
						const v = y0 / bh;
						if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
						const k = (Math.floor(v * ROWS) * COLS + Math.floor(u * COLS)) * 4;
						const L = Math.pow((0.2126 * px.data[k] + 0.7152 * px.data[k + 1] + 0.0722 * px.data[k + 2]) / 255, 0.9);
						let r = PITCH * 0.62 * Math.sqrt(L) * (1 + 0.28 * kick);
						let x = x0;
						let y = y0;
						let alpha = 1;
						// embers: from F.slow each dot breaks loose at its own moment and rises
						const seed = a * 7919 + b * 104729;
						const s = F.slow + random(`e${seed}`) * 2.4;
						if (t > s) {
							const dt = t - s;
							if (random(`k${seed}`) < 0.3 && L > 0.3) {
								// an ember: rises, sways, shrinks slowly
								y -= Math.pow(dt, 1.3) * (90 + 170 * random(`v${seed}`));
								x += Math.sin(dt * 1.6 + random(`p${seed}`) * 6) * 22 * dt;
								r *= Math.max(0.35, 1 - dt * 0.15);
								alpha = Math.max(0, 1 - dt * 0.22);
							} else {
								r *= Math.max(0, 1 - dt / (0.5 + random(`f${seed}`) * 0.9));
							}
						}
						if (r < 0.6 || alpha <= 0.02) continue;
						const w = ramp3(WARM_STOPS, L);
						const d = ramp3(DAWN_STOPS, L);
						const col = w.map((vv, j) => Math.round(vv + (d[j] - vv) * cool));
						ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
						ctx.beginPath();
						ctx.arc(x, y, r, 0, Math.PI * 2);
						ctx.fill();
					}
				}
			}}
		/>
	);
};

// Word geometry: fixed size and forced length, so the A's counter (the fly-through point) is known.
const WORD = {size: 470, x: 70, len: 1780, baseline: H / 2 + 0.36 * 470};
// we fly through the stem of the I, so the window grows to fill the frame (measured from a render)
const A_COUNTER = {x: 1276, y: 540};
const measure = () => ({size: WORD.size, ax: A_COUNTER.x, ay: A_COUNTER.y});

// One clean ECG strip (flat, P, QRS, T, flat), 120 units wide: the confetti glyph.
const squiggle = sample(-60, 60, 1.2, (x) => -42 * pqrst((x / 120) * 0.7)).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');

const Confetti: React.FC<{t: number; t0: number}> = ({t, t0}) => {
	const dt = t - t0;
	if (dt < 0 || dt > 4.5) return null;
	const cols = [K.gold, K.rose, '#FFFFFF', K.peach];
	return (
		<g>
			{Array.from({length: 36}).map((_, i) => {
				const ang = (i / 36) * Math.PI * 2 + random(`ca${i}`) * 0.5;
				const sp = 1500 + random(`cs${i}`) * 1800;
				const drag = (1 - Math.exp(-dt * 3.2)) / 3.2;
				const x = W / 2 + Math.cos(ang) * sp * drag + Math.sin(dt * 2 + i) * 10;
				const y = H / 2 + Math.sin(ang) * sp * drag * 0.7 + 120 * dt * dt;
				const rot = (random(`cr${i}`) - 0.5) * 30 + dt * (random(`cw${i}`) - 0.5) * 60;
				const sc = 0.9 + random(`cz${i}`) * 0.8;
				const c = cols[i % cols.length];
				return (
					<g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={1 - clamp01((dt - 3) / 1.5)}>
						<path d={`M${squiggle}`} fill="none" stroke={c} strokeWidth={9 / sc} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} filter="url(#mb5)" />
						<path d={`M${squiggle}`} fill="none" stroke={c} strokeWidth={3 / sc} strokeLinecap="round" strokeLinejoin="round" />
					</g>
				);
			})}
		</g>
	);
};

export const SceneDancing: React.FC<{t: number}> = ({t}) => {
	const g = measure();
	const hold = 1 + 0.1 * ramp(t, F.dancing2, FLY0, Easing.out(Easing.quad));
	const fly = ramp(t, FLY0, FLY1, Easing.in(Easing.poly(4)));
	const scale = hold * (1 + 34 * fly);
	const inside = t >= FLY1;
	const white = t - F.dancing2 < 1 / 30;
	const lineY = H - 70;
	const line = sample(0, W, 3, (x) => lineY - 46 * ecg(t - ((W - x) / W) * 2.4));
	const lineIn = ramp(t, F.dancing2 + 0.3, F.dancing2 + 0.8);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<R7Dots t={t} />
			{!inside ? (
				<Svg>
					<defs>
						<mask id="letters" maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
							<rect x={-W} y={-H} width={W * 3} height={H * 3} fill="#fff" />
							<g transform={`translate(${g.ax} ${g.ay}) scale(${scale}) translate(${-g.ax} ${-g.ay})`}>
								<text x={WORD.x} y={WORD.baseline} textLength={WORD.len} lengthAdjust="spacingAndGlyphs" fill="#000" style={{font: `700 ${g.size}px 'Space Grotesk', sans-serif`}}>
									DANCING
								</text>
							</g>
						</mask>
					</defs>
					<rect x={0} y={0} width={W} height={H} fill={K.ground} mask="url(#letters)" />
				</Svg>
			) : null}
			<Svg>
				<Confetti t={t} t0={FLY1 - 0.05} />
				<g opacity={lineIn * (1 - ramp(t, F.dawn - 0.5, F.dawn))}>
					<Glow d={pathOf(line)} color={lerpColor(t)} coreColor={K.warm} core={2.4} glow={0.8} />
				</g>
			</Svg>
			{white ? <AbsoluteFill style={{background: '#fff'}} /> : null}
		</AbsoluteFill>
	);
};

const lerpColor = (t: number) => (lerp(0, 1, ramp(t, F.slow, F.dawn)) > 0.5 ? K.rose : K.amber);
