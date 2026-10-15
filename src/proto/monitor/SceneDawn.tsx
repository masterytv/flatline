import React from 'react';
import {AbsoluteFill, Easing, staticFile} from 'remotion';
import {F} from '../../full/cues';
import {BEATS, bt, lastBeatIndex} from '../../timing';
import {C as TOK, UI_FONT} from '../../theme';
import {TokTicLogo} from '../../ui/TokTicLogo';
import {keys, ramp} from '../../util';
import sky from './data/r10_skyline.json';
import {Glow, H, K, Svg, W, ecg, pathOf, pqrst, sample} from './engine';
import {R7Dots} from './SceneDancing';
import {ScriptWord} from './Script';

// 3:21.9–3:32.4 (bars 109–113). THE CITY IS THE HEARTBEAT. R10 as a three-tone poster: dawn sky, dusk city,
// one silhouette of friends and ledge. The line runs along the skyline; from bar 110 one heartbeat per bar travels
// along it, a heart at rest. Screen time: 0 min. Then the line lifts off and writes "still dancing" in the sky.

const SKY = sky.skyline as number[];
const PLATE_SCALE = 1.05;

const plateX = (t: number) => W * keys(t, [F.dawn, F.songEnd], [0.02, -0.02]);
const skyAt = (u: number) => {
	const x = Math.max(0, Math.min(1, u)) * (SKY.length - 1);
	const i = Math.min(SKY.length - 2, Math.floor(x));
	return SKY[i] + (SKY[i + 1] - SKY[i]) * (x - i);
};

const ScreenTime: React.FC<{t: number}> = ({t}) => {
	const at = F.screenTime;
	const until = F.stillDancing;
	if (t < at || t >= until) return null;
	const k = ramp(t, at, at + 0.5, Easing.out(Easing.cubic));
	const out = ramp(t, until - 0.4, until);
	const mins = Math.round(keys(t, [at + 0.3, at + 1.3], [214, 0]));
	return (
		<div style={{position: 'absolute', right: 90, bottom: 90, transform: `translateY(${40 * (1 - k)}px)`, opacity: k * (1 - out), background: 'rgba(11,13,18,0.78)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 30, padding: '24px 36px 20px', fontFamily: UI_FONT, color: TOK.text, minWidth: 400, boxShadow: '0 30px 80px rgba(0,0,0,0.45)'}}>
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
				<TokTicLogo size={22} t={t} />
				<span style={{fontSize: 18, color: TOK.muted}}>6:12 AM</span>
			</div>
			<div style={{fontSize: 22, color: TOK.muted}}>Screen time last night</div>
			<div style={{fontFamily: "'Space Grotesk', sans-serif", fontSize: 84, fontWeight: 700, color: mins === 0 ? TOK.signal : TOK.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums'}}>{mins} min</div>
		</div>
	);
};

export const SceneDawn: React.FC<{t: number}> = ({t}) => {
	const bw = W * PLATE_SCALE;
	const bh = (bw * 1536) / 2752;
	const left = (W - bw) / 2 + plateX(t);
	const top = (H - bh) / 2 - H * 0.02;
	const reveal = ramp(t, F.dawn, F.dawn + 1.2, Easing.inOut(Easing.sin));
	const draw = ramp(t, F.dawn + 0.4, bt(110), Easing.inOut(Easing.cubic));
	// one heartbeat per bar, travelling along the skyline
	const bi = lastBeatIndex(t);
	const b = BEATS[Math.max(0, bi)];
	const barStart = BEATS.find((x) => x.bar === b.bar && x.beat === 1)?.t ?? b.t;
	const next = BEATS.find((x) => x.bar === b.bar + 1 && x.beat === 1)?.t ?? barStart + 1.85;
	const resting = t >= bt(110) && t < F.stillDancing + 0.3;
	const xp = -100 + (W + 200) * ((t - barStart) / (next - barStart));
	const pxPerSec = (W + 200) / (next - barStart);
	const lift = ramp(t, F.stillDancing - 0.25, F.stillDancing + 0.4, Easing.inOut(Easing.cubic));
	const skyline = sample(0, W, 3, (x) => {
		const u = (x - left) / bw;
		const y = top + skyAt(u) * bh - 3;
		const beat = resting ? 150 * pqrst((xp - x) / pxPerSec) : 0;
		return y - beat;
	});
	const visible = skyline.filter(([x]) => x <= W * draw + 2);
	const fadeAll = ramp(t, F.songEnd - 1.0, F.songEnd, Easing.in(Easing.quad));
	// "still dancing" written across the sky, one last heartbeat runs through it on bt114
	const wk = ramp(t, F.stillDancing, F.stillDancing + 1.2, Easing.inOut(Easing.sin));
	const lastBeat = Math.exp(-Math.max(0, t - bt(114)) / 0.35) * (t >= bt(114) ? 1 : 0);
	const ww = W * 0.62;
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<AbsoluteFill style={{opacity: reveal * (1 - fadeAll)}}>
				<img src={staticFile('stills/fx/monitor/R10_poster.png')} style={{position: 'absolute', left, top, width: bw, height: bh}} />
			</AbsoluteFill>
			{t < F.dawn + 1.5 ? <R7Dots t={t} opacity={1 - ramp(t, F.dawn, F.dawn + 1.4)} /> : null}
			<Svg>
				<g opacity={(1 - lift) * (1 - fadeAll)}>
					{visible.length > 1 ? (
						<>
							<path d={pathOf(visible)} fill="none" stroke="#3A1430" strokeWidth={9} opacity={0.35} filter="url(#mb5)" strokeLinejoin="round" />
							<Glow d={pathOf(visible)} color={K.gold} coreColor="#FFFFFF" core={3.2} glow={1} />
						</>
					) : null}
				</g>
				{t >= F.stillDancing - 0.1 ? (
					<g opacity={1 - fadeAll}>
						<g filter="url(#mb5)" opacity={0.4}>
							<ScriptWord word="still dancing" k={wk} x={(W - ww) / 2} y={H * 0.1 + 4} width={ww} color="#5A1E40" coreColor="#5A1E40" core={7} glow={0} head={false} />
						</g>
						<ScriptWord word="still dancing" k={wk} x={(W - ww) / 2} y={H * 0.1} width={ww} color={K.gold} coreColor="#FFFFFF" core={4.2 + 2 * lastBeat} glow={1 + 1.6 * lastBeat} />
					</g>
				) : null}
			</Svg>
			<div style={{opacity: 1 - fadeAll}}>
				<ScreenTime t={t} />
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- end card: "You don't have to die to wake up."

export const SceneEnd: React.FC<{t: number}> = ({t}) => {
	const t0 = F.songEnd;
	const a = ramp(t, t0 + 0.2, t0 + 1.0);
	const b = ramp(t, t0 + 1.2, t0 + 1.8);
	const out = ramp(t, F.endCardOut - 0.5, F.endCardOut);
	const cy = H * 0.56;
	const x0 = W * 0.672; // under "wake up"
	// a single heartbeat at +1.0 s, then a resting beat about once a second
	const beats = [t0 + 1.0, t0 + 2.0, t0 + 3.0];
	const y = (x: number) => {
		let v = 0;
		for (const bb of beats) {
			if (t < bb) continue;
			const head = x0 - 140 + (t - bb) * 900; // the write head passes through
			if (x > head) continue;
			const amp = (bb === beats[0] ? 1 : 0.45) * Math.exp(-(t - bb) / 1.4);
			v += amp * pqrst((x - x0) / 600);
		}
		return cy - 120 * v;
	};
	const line = sample(W * 0.12, W * 0.88, 2, y);
	return (
		<AbsoluteFill style={{background: '#000', opacity: 1 - out}}>
			<Svg>
				<Glow d={pathOf(line)} color="#FFFFFF" coreColor="#FFFFFF" core={1.6} glow={0.45} />
			</Svg>
			<div style={{position: 'absolute', left: 0, right: 0, top: cy - 140, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 64, color: '#F4F1EA', opacity: a, letterSpacing: -0.5}}>
				You don’t have to die to wake up.
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: cy + 70, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: 10, color: '#B9B4AA', opacity: b}}>
				PROJECT PROFOUND
			</div>
		</AbsoluteFill>
	);
};

export const _ecg = ecg;
