import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {useDensities} from './density';
import {ANTON, INK, MONO, SERIF} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, inked, Rule, Slug, stamp} from './kit';
import {Sheet} from './press';
import {Paper, PaperFill, Press} from './Press';

// 2:07–2:23: the groove. A wood-type poster with no photo, S3's bokeh as giant dots that run dry,
// a punch-clock time card, and R4 cut into strips that learn to move together.

const LINES = ['NO PAIN', 'NO FEAR', 'NO CLOCK', 'NO NAME'];
const LINE_INK = [INK.key, INK.heat, INK.key, INK.heat];
const LINE_Y = (i: number) => 92 + i * 222;
const FONT = 212;
// the O of the last NO, where the camera dives in
export const O_CENTRE = {x: 120 + FONT * 0.66, y: LINE_Y(3) + FONT * 0.52};

const Specimen: React.FC<{i: number; t: number; t0: number}> = ({i, t, t0}) => {
	const strike = easeOut((t - t0) / 0.16);
	const y = 110 + i * 222;
	const c = INK.cold;
	const body = [
		// 99+ badge
		<svg key="a" width={300} height={150} style={{overflow: 'visible'}}>
			<rect x={60} y={20} width={150} height={110} rx={55} fill="none" stroke={c} strokeWidth={5} />
			<text x={135} y={95} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={60} fill="none" stroke={c} strokeWidth={2.4}>
				99+
			</text>
		</svg>,
		// Seen bubble
		<svg key="b" width={360} height={150} style={{overflow: 'visible'}}>
			<path d="M20 30 h260 a26 26 0 0 1 26 26 v40 a26 26 0 0 1 -26 26 h-220 l-30 22 v-22 a26 26 0 0 1 -10 -26 v-40 a26 26 0 0 1 26 -26 z" fill="none" stroke={c} strokeWidth={4} />
			<text x={150} y={92} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={40} fill={c}>
				Seen 1:47
			</text>
		</svg>,
		// clock
		<svg key="c" width={360} height={150} style={{overflow: 'visible'}}>
			<text x={10} y={118} fontFamily="Inter" fontWeight={300} fontSize={128} fill="none" stroke={c} strokeWidth={3}>
				1:47
			</text>
		</svg>,
		// handle pill
		<svg key="d" width={380} height={150} style={{overflow: 'visible'}}>
			<rect x={10} y={30} width={330} height={84} rx={42} fill="none" stroke={c} strokeWidth={4} />
			<circle cx={56} cy={72} r={24} fill="none" stroke={c} strokeWidth={4} />
			<text x={94} y={88} fontFamily="Inter" fontWeight={600} fontSize={42} fill={c}>
				@maya.xo
			</text>
		</svg>,
	][i];
	return (
		<div style={{position: 'absolute', left: 1240, top: y, width: 420, height: 160, mixBlendMode: 'multiply', ...inked(500, i * 30)}}>
			{body}
			<div style={{position: 'absolute', left: 1240 - 1240, top: 4, fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em', color: c, opacity: 0.8, transform: 'translateY(-14px)'}}>{`FIG. ${i + 1}`}</div>
			{strike > 0 && <div style={{position: 'absolute', left: -20, top: 52, width: 430 * strike, height: 46, background: INK.heat, borderRadius: 4, transform: 'rotate(-2deg)', mixBlendMode: 'multiply'}} />}
		</div>
	);
};

export const NoPoster: React.FC<{t: number; zoom?: number}> = ({t, zoom = 1}) => (
	<AbsoluteFill style={{transformOrigin: `${O_CENTRE.x}px ${O_CENTRE.y}px`, transform: `scale(${zoom})`}}>
		<PaperFill />
		{LINES.map((l, i) => {
			const s = stamp(t, F.noWords[i]);
			if (!s.on) return null;
			return (
				<div key={l} style={{position: 'absolute', left: 120, top: LINE_Y(i), fontFamily: ANTON, fontSize: FONT, lineHeight: 1, color: LINE_INK[i], mixBlendMode: 'multiply', transform: `scale(${s.s})`, transformOrigin: '0 50%', ...inked(900, i * 40, i * 13, true)}}>
					{l}
				</div>
			);
		})}
		{[0, 1, 2, 3].map((i) => (
			<Specimen key={i} i={i} t={t} t0={F.noWords[i]} />
		))}
		<div style={{position: 'absolute', left: 1180, top: 60, width: 2, height: 920, background: INK.key, opacity: 0.8}} />
		<Slug x={1240} y={60} text="TOKTIC · UI SPECIMENS · STRUCK" size={13} />
		<Rule x={120} y={1010} w={1680} t={t} amp={22} />
	</AbsoluteFill>
);

export const NoPain: React.FC<{t: number}> = ({t}) => <NoPoster t={t} />;

// 2:12 "Just light, so bright": dive into the O; inside is S3 as giant orange dots that shrink to bare paper.
export const Light: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['S3']);
	const dive = easeIn((t - F.light) / 0.4);
	const zoom = Math.pow(30, dive);
	const dry = clamp01((t - (F.light + 0.45)) / 2.0);
	const a1 = clamp01((t - (F.light + 1.4)) / 0.4);
	const a2 = clamp01((t - (F.light + 2.0)) / 0.4);
	const sheet: Sheet | null = d
		? {map: d.S3, w: 1960, h: 1094, cx: 960, cy: 540, s: 1 + 0.25 * (1 - dive) + 0.05 * dry, seed: 33, plates: [{ch: 1, ink: INK.heat, angle: 15, cell: 64, gain: 1.15, lift: 1.1 * easeInOut(dry)}]}
		: null;
	return (
		<AbsoluteFill>
			<PaperFill />
			{sheet && <Press sheets={[sheet]} />}
			{dive < 1 && (
				<AbsoluteFill style={{opacity: 1 - clamp01((dive - 0.75) / 0.25)}}>
					<NoPoster t={t} zoom={zoom} />
				</AbsoluteFill>
			)}
			<div style={{position: 'absolute', left: 0, width: 1920, top: 430, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 96, color: INK.key, opacity: a1, mixBlendMode: 'multiply'}}>just light, so bright</div>
			<div style={{position: 'absolute', left: 0, width: 1920, top: 560, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, color: INK.heat, opacity: a2, mixBlendMode: 'multiply'}}>I'm not the same</div>
		</AbsoluteFill>
	);
};

// 2:15 "gone for four minutes, free for forever": a punch-clock time card; ∞ stamps march away.
const Stamp: React.FC<{t: number; t0: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number; box?: boolean}> = ({t, t0, x, y, text, color = INK.key, size = 80, rot = -4, box = true}) => {
	const s = stamp(t, t0);
	if (!s.on) return null;
	return (
		<div style={{position: 'absolute', left: x, top: y, fontFamily: MONO, fontWeight: 500, fontSize: size, lineHeight: 1, color, padding: box ? '10px 22px' : 0, border: box ? `6px solid ${color}` : undefined, borderRadius: 10, transform: `rotate(${rot}deg) scale(${s.s})`, mixBlendMode: 'multiply', letterSpacing: '0.04em', ...inked(600, x, y)}}>
			{text}
		</div>
	);
};

export const TimeCard: React.FC<{t: number}> = ({t}) => {
	const slide = easeOut((t - F.fourMin) / 0.22);
	const tip = easeInOut((t - (F.forever + 0.3)) / 0.5);
	const march = [bt(74), bt(74, 2), bt(74, 3)];
	return (
		<AbsoluteFill>
			<PaperFill />
			<AbsoluteFill style={{perspective: 1400}}>
				<div style={{position: 'absolute', left: 560, top: 70 + (1 - slide) * 1100, width: 800, height: 940, transformOrigin: '50% 100%', transform: `rotateX(${48 * tip}deg) rotate(${-2 + 2 * tip}deg)`, boxShadow: '0 20px 40px rgba(60,40,20,0.25)'}}>
					<Paper x={0} y={0} w={800} h={940} tint="#F3EEE2" />
					<div style={{position: 'absolute', left: 40, top: 34, fontFamily: MONO, fontSize: 30, letterSpacing: '0.2em', color: INK.key}}>TIME CARD</div>
					<div style={{position: 'absolute', left: 40, top: 80, fontFamily: MONO, fontSize: 20, letterSpacing: '0.1em', color: INK.key, opacity: 0.8}}>NAME ______ MAYA ______ NO. 0%</div>
					{Array.from({length: 9}).map((_, i) => (
						<div key={i} style={{position: 'absolute', left: 40, right: 40, top: 150 + i * 84, height: 2, background: INK.heat, opacity: 0.55}} />
					))}
					<div style={{position: 'absolute', left: 250, top: 150, width: 2, height: 672, background: INK.heat, opacity: 0.55}} />
					<Stamp t={t} t0={F.fourMin + 0.05} x={70} y={190} text="OUT 01:48" />
					<Stamp t={t} t0={bt(72, 4)} x={70} y={360} text="IN  01:52" />
					<Stamp t={t} t0={F.forever} x={300} y={150} text="∞" color={INK.heat} size={420} rot={-8} box={false} />
					{march.map((b, i) => (
						<Stamp key={i} t={t} t0={b} x={320 + i * 40} y={-150 - i * 200} text="∞" color={INK.heat} size={260 - i * 60} rot={-8} box={false} />
					))}
				</div>
			</AbsoluteFill>
			<Slug x={60} y={1030} text="GONE 4 MIN · FREE ∞" />
		</AbsoluteFill>
	);
};

// 2:19 "back in the beat, and we move together": R4 cut into 14 strips, out of phase until 75.1, then in sync.
export const Strips: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R4']);
	const N = 14;
	const i = lastBeatIndex(t);
	const since = t - BEATS[i].t;
	const hit = Math.exp(-since / 0.13);
	const sync = t >= bt(75);
	const apart = easeIn((t - bt(76, 3)) / 0.5);
	const W = 1800;
	const H = 1004;
	const sheets: Sheet[] = d
		? Array.from({length: N}).map((_, k) => {
				const phase = sync ? 1 : k % 2 === BEATS[i].beat % 2 ? 1 : -1;
				const dy = (sync ? -26 : 30 * phase) * hit + (k % 2 ? 1 : -1) * apart * 1300;
				const x0 = k / N;
				const x1 = (k + 1) / N;
				return {
					map: d.R4,
					crop: [x0, 0, x1, 1],
					w: W / N - 3,
					h: H,
					cx: 960 - W / 2 + (k + 0.5) * (W / N),
					cy: 540 + dy,
					seed: 40 + k,
					plates: [
						{ch: 1, ink: INK.heat, angle: 15, cell: 8, dx: 2, dy: -1},
						{ch: 0, ink: INK.key, angle: 45, cell: 8, gain: 0.85, gamma: 1.2},
					],
				} as Sheet;
			})
		: [];
	return (
		<AbsoluteFill>
			<PaperFill />
			<Press sheets={sheets} />
			<Slug x={60} y={1036} text={sync ? 'R4 · 14 STRIPS · IN PHASE' : 'R4 · 14 STRIPS · OUT OF PHASE'} />
		</AbsoluteFill>
	);
};
