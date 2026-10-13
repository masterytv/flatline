import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {useDensities} from './density';
import {ANTON, INK, SERIF} from './ink';
import {clamp01, easeInOut, easeOut, inked, kickNudge, lerp, Slug, stamp} from './kit';
import {Cam, Sheet} from './press';
import {CamLayer, Paper, Press} from './Press';

// 2:52.8 "Flatline / My heart stopped... and I started dancing": an open zine spread. The old Maya (S1, cold
// line screen, mirrored to look toward the fold) faces the new one (R12, printed in two pulls on "and I started dancing").

const SPREAD = {x: 150, y: 40, w: 1620, h: 1000};
const PAGE_W = SPREAD.w / 2;
const IMG = {w: 640, h: 690, top: 84};
const LEFT = {cx: SPREAD.x + PAGE_W / 2 + 18, cy: SPREAD.y + IMG.top + IMG.h / 2};
const RIGHT = {cx: SPREAD.x + PAGE_W * 1.5 - 18, cy: LEFT.cy};

const Caption: React.FC<{x: number; y: number; text: string; t: number; t0: number; size?: number; align?: 'left' | 'right'}> = ({x, y, text, t, t0, size = 58, align = 'left'}) => {
	const o = clamp01((t - t0) / 0.25);
	if (o <= 0) return null;
	return (
		<div style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1920 - x : undefined, top: y, fontFamily: SERIF, fontStyle: 'italic', fontSize: size, lineHeight: 1.05, color: INK.key, opacity: o, mixBlendMode: 'multiply', whiteSpace: 'nowrap', ...inked(700)}}>
			{text}
		</div>
	);
};

const SqueegeeH: React.FC<{x: number; y: number; w: number; ink: string}> = ({x, y, w, ink}) => (
	<div style={{position: 'absolute', left: x - 40, top: y - 6, width: w + 80, height: 44}}>
		<div style={{position: 'absolute', left: 40, top: 0, width: w, height: 11, background: ink, borderRadius: 5, mixBlendMode: 'multiply'}} />
		<div style={{position: 'absolute', left: 0, top: 12, width: w + 80, height: 26, background: 'linear-gradient(180deg, #4A4540 0%, #2A2724 60%, #1E1C1A 100%)', borderRadius: 4, boxShadow: '0 10px 20px rgba(40,25,10,0.35)'}} />
	</div>
);

const spreadSheets = (d: Record<string, Sheet['map']>, t: number): Sheet[] => {
	const oPull = easeInOut((t - bt(95)) / 0.26);
	const kPull = easeInOut((t - bt(95, 3)) / 0.26);
	const [kx, ky] = kickNudge(t, 2, 1.5);
	return [
		{
			map: d.S1,
			crop: [0.3, 0.0, 0.8, 0.95],
			flipX: true,
			w: IMG.w,
			h: IMG.h,
			...LEFT,
			seed: 1,
			plates: [{ch: 2, ink: INK.cold, angle: 75, cell: 6.5, kind: 'line', gain: 1.0}],
		},
		{
			map: d.R12,
			crop: [0.25, 0.03, 0.75, 0.98],
			w: IMG.w,
			h: IMG.h,
			...RIGHT,
			seed: 12,
			plates: [
				{ch: 1, ink: INK.heat, angle: 15, cell: 6.5, pull: oPull, pullY: true, dx: 2 + kx, dy: -1 + ky},
				{ch: 0, ink: INK.key, angle: 45, cell: 6.5, pull: kPull, pullY: true, gain: 0.8, gamma: 1.3},
			],
		},
	];
};

export const Diptych: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['S1', 'R12']);
	const push = easeInOut((t - bt(96)) / (F.type3 - bt(96)));
	const cam: Cam = {cx: lerp(960, 960, push), cy: lerp(540, 470, push), s: 1 + 0.14 * push};
	const oPull = (t - bt(95)) / 0.26;
	const kPull = (t - bt(95, 3)) / 0.26;
	const pulling = oPull > 0 && oPull < 1 ? {k: easeInOut(oPull), ink: INK.heat} : kPull > 0 && kPull < 1 ? {k: easeInOut(kPull), ink: INK.key} : null;
	const capY = SPREAD.y + IMG.top + IMG.h + 30;
	return (
		<AbsoluteFill style={{background: '#D9CCB2'}}>
			<CamLayer cam={cam}>
				<Paper tint="#D3C5A8" />
				{/* the open zine */}
				<div style={{position: 'absolute', left: SPREAD.x, top: SPREAD.y, width: SPREAD.w, height: SPREAD.h, boxShadow: '0 24px 50px rgba(60,40,20,0.35)'}}>
					<Paper x={0} y={0} w={SPREAD.w} h={SPREAD.h} />
					<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(60,40,20,0.06) 0%, rgba(60,40,20,0) 18%, rgba(60,40,20,0) 40%, rgba(60,40,20,0.22) 49.2%, rgba(30,20,10,0.38) 50%, rgba(60,40,20,0.2) 50.8%, rgba(60,40,20,0) 60%, rgba(60,40,20,0) 82%, rgba(60,40,20,0.06) 100%)', mixBlendMode: 'multiply'}} />
				</div>
			</CamLayer>
			{d && <Press cam={cam} sheets={spreadSheets(d, t)} />}
			<CamLayer cam={cam}>
				<Caption x={LEFT.cx - IMG.w / 2} y={capY} text="flatline" t={t} t0={F.type2} />
				<Caption x={LEFT.cx - IMG.w / 2} y={capY + 64} text="my heart stopped..." t={t} t0={bt(93, 2)} />
				<Caption x={RIGHT.cx + IMG.w / 2} y={capY + 64} text="and I started dancing" t={t} t0={bt(95)} align="right" />
				<Slug x={SPREAD.x + 36} y={SPREAD.y + SPREAD.h - 34} text="12" size={14} />
				<Slug x={SPREAD.x + SPREAD.w - 60} y={SPREAD.y + SPREAD.h - 34} text="13" size={14} />
				{pulling && <SqueegeeH x={RIGHT.cx - IMG.w / 2 - 10} y={RIGHT.cy - IMG.h / 2 + pulling.k * IMG.h} w={IMG.w + 20} ink={pulling.ink} />}
			</CamLayer>
		</AbsoluteFill>
	);
};

// 3:00.1 the spread slams shut; the cover is stamped; R14 is hoisted as a tall poster through the swell while its
// plates drift out of register, then snaps into register on the final drop.
const R14P = {w: 620, h: 885};
export const Hoist: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R14']);
	const rise = easeInOut((t - F.swell) / (F.final - F.swell));
	const pre = easeOut((t - bt(99)) / 1.2) * 0.12;
	const y = lerp(1080 + 40, 92, Math.max(pre, rise));
	const drift = t < F.final ? 2 + 26 * easeInOut((t - F.swell) / (F.final - F.swell)) : 0;
	const snap = t >= F.final ? Math.exp(-(t - F.final) / 0.08) : 0;
	const shake = snap * 6 * Math.sin((t - F.final) * 120);
	const st1 = stamp(t, bt(97, 3));
	const st2 = stamp(t, bt(99));
	const st3 = stamp(t, bt(100));
	const shut = easeInOut((t - F.type3) / 0.25);
	const cx = 1430;
	return (
		<AbsoluteFill style={{background: INK.paper, transform: `translate(${shake}px, ${shake * 0.5}px)`}}>
			<Paper />
			{st1.on && (
				<div style={{position: 'absolute', left: 110, top: 70, fontFamily: ANTON, fontSize: 210, lineHeight: 0.98, color: INK.key, mixBlendMode: 'multiply', transform: `scale(${st1.s})`, transformOrigin: '0 50%', ...inked(900, 5, 5)}}>
					MY HEART
					<br />
					STOPPED
				</div>
			)}
			{st2.on && (
				<div style={{position: 'absolute', left: 110, top: 520, fontFamily: ANTON, fontSize: 150, lineHeight: 1, color: INK.heat, mixBlendMode: 'multiply', transform: `scale(${st2.s})`, transformOrigin: '0 50%', ...inked(900, 50, 5)}}>
					AND I STARTED
				</div>
			)}
			{d && (
				<>
					<div style={{position: 'absolute', left: cx - R14P.w / 2 - 14, top: y - 14, width: R14P.w + 28, height: R14P.h + 28, background: INK.paper, boxShadow: '0 20px 40px rgba(60,40,20,0.3)'}}>
						<Paper x={0} y={0} w={R14P.w + 28} h={R14P.h + 28} />
					</div>
					<Press
						sheets={[
							{
								map: d.R14,
								crop: [0.1, 0.0, 0.49, 0.98],
								w: R14P.w,
								h: R14P.h,
								cx,
								cy: y + R14P.h / 2,
								seed: 14,
								plates: [
									{ch: 1, ink: INK.heat, angle: 15, cell: 7, dx: drift * 0.7, dy: -drift},
									{ch: 0, ink: INK.key, angle: 45, cell: 7, gain: 0.8, gamma: 1.3, dx: -drift * 0.2, dy: drift * 0.15},
								],
							},
						]}
					/>
				</>
			)}
			{st3.on && (
				<div style={{position: 'absolute', left: cx - R14P.w / 2 - 30, top: y + R14P.h - 190, width: R14P.w + 60, textAlign: 'center', fontFamily: ANTON, fontSize: 190, lineHeight: 1, color: INK.key, mixBlendMode: 'multiply', transform: `scale(${st3.s})`, ...inked(900, 9, 9)}}>
					DANCING
				</div>
			)}
			{shut < 1 && (
				<AbsoluteFill style={{background: '#D9CCB2', opacity: 1 - shut}}>
					<Paper tint="#D3C5A8" />
				</AbsoluteFill>
			)}
			<Slug x={110} y={1030} text={`COVER · R14 REGISTER ERROR ${Math.round(drift)} PX`} />
		</AbsoluteFill>
	);
};
