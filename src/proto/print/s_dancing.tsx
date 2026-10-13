import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../../full/cues';
import {BEATS, bt, lastBeatIndex} from '../../timing';
import {useDensities} from './density';
import {INK, SERIF} from './ink';
import {clamp01, easeInOut, easeOut, inked, kickNudge, Rule, Slug, stamp} from './kit';
import {Cam} from './press';
import {CamLayer, Paper, Press} from './Press';
import {FlatlineBar} from './s_drop';

// 1:41.4 "...dancing": DANCING slams across the frame, the page floods black, and the letters are the only
// windows onto R3. Then the word scales through the N–C gap until R3 fills the frame.

const GAP = {x: 842, y: 560}; // the N–C gap in frame px

export const DancingWord: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R3']);
	const i = lastBeatIndex(t);
	const sinceBeat = t - BEATS[i].t;
	const bounce = Math.exp(-sinceBeat / 0.11);
	const alt = BEATS[i].beat % 2 === 0 ? 1 : 0; // photo shifts on alternate beats
	const zoom = easeInOut((t - bt(55)) / (bt(56) - bt(55)));
	const wordS = Math.pow(7, zoom) * (1 + 0.02 * bounce * (1 - zoom));
	const slam = stamp(t, F.dancing);
	const after = clamp01((t - bt(56)) / 0.01);
	// the print drifts slowly once it fills the frame
	const drift = t > bt(56) ? (t - bt(56)) * 10 : 0;
	const cam: Cam = {cx: 960 + alt * 9 * (1 - zoom) + drift, cy: 540 - alt * 5 * (1 - zoom), s: 1 + 0.08 * zoom};
	const [kx, ky] = kickNudge(t, 0, 2);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && (
				<Press
					cam={cam}
					sheets={[
						{
							map: d.R3,
							w: 1960,
							h: 1094,
							cx: 960,
							cy: 540,
							seed: 3,
							plates: [
								{ch: 1, ink: INK.heat, angle: 15, cell: 8.5, dx: 2 + kx, dy: -1 + ky},
								{ch: 0, ink: INK.key, angle: 45, cell: 8.5, gain: 0.9},
							],
						},
					]}
				/>
			)}
			{after < 1 && (
				<svg
					viewBox="0 0 1920 1080"
					style={{position: 'absolute', inset: 0, width: '100%', height: '100%', ...inked(1024, 0, 0, true)}}
				>
					<defs>
						<mask id="dancing-ko">
							<rect x={-20000} y={-20000} width={40000} height={40000} fill="white" />
							<g transform={`translate(${GAP.x} ${GAP.y}) scale(${wordS * slam.s}) translate(${-GAP.x} ${-GAP.y})`}>
								<text x={40} y={872} fontFamily="Anton" fontSize={880} textLength={1840} lengthAdjust="spacingAndGlyphs" fill="black">
									DANCING
								</text>
							</g>
						</mask>
					</defs>
					<rect x={-20} y={-20} width={1960} height={1120} fill={INK.key} mask="url(#dancing-ko)" />
				</svg>
			)}
			{t > bt(56) && <Slug x={60} y={1030} text="R3 · HEAT 15° · KEY 45° · PROOF 3" />}
		</AbsoluteFill>
	);
};

// 1:54 "Flatline": a black squeegee pull buries the page; FLATLINE stays knocked out in cream.
export const ReversePull: React.FC<{t: number}> = ({t}) => {
	const k = easeOut((t - F.flatline3) / 0.2);
	const i = lastBeatIndex(t);
	const thump = Math.exp(-(t - BEATS[i].t) / 0.1);
	const d = useDensities(['R3']);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<Paper />
			{d && (
				<Press
					sheets={[
						{
							map: d.R3,
							w: 1960,
							h: 1094,
							cx: 960 + (F.flatline3 - bt(56)) * 10,
							cy: 540,
							seed: 3,
							plates: [
								{ch: 1, ink: INK.heat, angle: 15, cell: 8.5},
								{ch: 0, ink: INK.key, angle: 45, cell: 8.5, gain: 0.9},
							],
						},
					]}
				/>
			)}
			<div style={{position: 'absolute', left: 0, top: 0, width: 1920 * k, height: 1080, overflow: 'hidden', transform: `translate(${thump * 2}px, ${thump}px)`}}>
				<div style={{position: 'absolute', inset: 0, width: 1920, background: INK.paper}}>
					<Paper />
				</div>
				<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: 0.94 + 0.06 * thump}}>
					<FlatlineBar x={-40} y={-40} w={2000} h={1160} text="FLATLINE" size={430} />
				</div>
			</div>
			<Rule x={160} y={980} w={1600} t={t} color={INK.paper} amp={30} opacity={k} />
		</AbsoluteFill>
	);
};

export const Aside: React.FC<{text: string; x: number; y: number; size?: number; o?: number}> = ({text, x, y, size = 64, o = 1}) => (
	<div style={{position: 'absolute', left: x, top: y, fontFamily: SERIF, fontStyle: 'italic', fontSize: size, color: INK.key, opacity: o, mixBlendMode: 'multiply', whiteSpace: 'nowrap'}}>{text}</div>
);
