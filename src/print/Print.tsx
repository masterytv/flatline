import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {INK, MONO} from './ink';
import {Sketch} from './kit';
import {PaperFill} from './Press';
import {FRAME0, Frame, STAGE, StageProvider} from './stage';
import {FlipStack, InkBattery, V as VBattery} from './s_battery';
import {Join, Couch, V as VCouch} from './s_couch';
import {DancingWord, FirstDance, ReversePull, V as VDancing} from './s_dancing';
import {Diptych, Hoist, V as VDiptych} from './s_diptych';
import {Heart, Progs, V as VDrop} from './s_drop';
import {Explosion, Macros, R9Pull, V as VFinal} from './s_final';
import {Light, NoPain, Strips, TimeCard, V as VGroove} from './s_groove';
import {HandOver, V as VHand} from './s_hand';
import {Receipt, TearOff, V as VBack} from './s_back';
import {Dawn, EndCard, LivingLine, Postcard, V as VOutro} from './s_outro';

/**
 * One section. For the 9:16 cut, `v` is its reframing camera over the 1920x1080 stage (default FRAME0) and `vextra`
 * an optional layer drawn in the vertical frame itself (1080x1920 px), above the stage, for type or furniture that
 * only the vertical cut needs.
 */
export type Sec = {from: number; to: number; C: React.FC<{t: number}>; name: string; v?: (t: number) => Frame; vextra?: React.FC<{t: number}>};

// PROOF OF LIFE, 1:24.8 to the end card: the night as paper. Every section starts on a bar or a lyric beat
// (docs/shot-list.md has the cut plan for each one).
const BASE: Sec[] = [
	{from: T.drop, to: F.flatline2, C: HandOver, name: 'drop 1 hand-over'},
	{from: F.flatline2, to: F.heart, C: Progs, name: 'progs'},
	{from: F.heart, to: F.dancing, C: Heart, name: 'heart'},
	{from: F.dancing, to: bt(56), C: DancingWord, name: 'DANCING'},
	{from: bt(56), to: F.flatline3, C: FirstDance, name: 'first dance'},
	{from: F.flatline3, to: F.couch, C: ReversePull, name: 'reverse pull'},
	{from: F.couch, to: F.join, C: Couch, name: 'couch stencils'},
	{from: F.join, to: F.groove, C: Join, name: 'they join her'},
	{from: F.groove, to: F.light, C: NoPain, name: 'no pain'},
	{from: F.light, to: F.fourMin, C: Light, name: 'just light'},
	{from: F.fourMin, to: F.together, C: TimeCard, name: 'time card'},
	{from: F.together, to: F.beep1, C: Strips, name: 'strips'},
	{from: F.beep1, to: F.alive, C: Receipt, name: 'receipt'},
	{from: F.alive, to: F.drop3, C: TearOff, name: 'tear-off'},
	{from: F.drop3, to: F.table, C: FlipStack, name: 'flip and stack'},
	{from: F.table, to: F.type2, C: InkBattery, name: 'ink battery'},
	{from: F.type2, to: F.type3, C: Diptych, name: 'zine'},
	{from: F.type3, to: bt(101, 2), C: Hoist, name: 'fly-posting and hoist'},
	{from: bt(101, 2), to: bt(103), C: Macros, name: 'macros'},
	{from: bt(103), to: F.dancing2, C: R9Pull, name: 'still'},
	{from: F.dancing2, to: F.dawn, C: Explosion, name: 'dancing and the camera roll'},
	{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
	{from: F.screenTime, to: F.stillDancing, C: Postcard, name: 'postcards'},
	{from: F.stillDancing, to: F.songEnd, C: LivingLine, name: 'living line'},
	{from: F.songEnd, to: F.endCardOut + 1, C: EndCard, name: 'end card'},
];

// each section file's vertical settings, merged in by component name
const VALL = {...VHand, ...VDrop, ...VDancing, ...VCouch, ...VGroove, ...VBack, ...VBattery, ...VDiptych, ...VFinal, ...VOutro};
const NAMES: Record<string, string> = {
	'drop 1 hand-over': 'HandOver', progs: 'Progs', heart: 'Heart', DANCING: 'DancingWord', 'first dance': 'FirstDance', 'reverse pull': 'ReversePull',
	'couch stencils': 'Couch', 'they join her': 'Join', 'no pain': 'NoPain', 'just light': 'Light', 'time card': 'TimeCard', strips: 'Strips',
	receipt: 'Receipt', 'tear-off': 'TearOff', 'flip and stack': 'FlipStack', 'ink battery': 'InkBattery', zine: 'Diptych', 'fly-posting and hoist': 'Hoist',
	macros: 'Macros', still: 'R9Pull', 'dancing and the camera roll': 'Explosion', dawn: 'Dawn', postcards: 'Postcard', 'living line': 'LivingLine', 'end card': 'EndCard',
};
export const SECTIONS: Sec[] = BASE.map((s) => ({...s, ...VALL[NAMES[s.name]]}));

const VW = 1080;
const VH = 1920;

/** 9:16: the section renders on its 16:9 stage, seen through its reframing camera; newsprint fills the rest. */
const Vertical: React.FC<{t: number; sec: Sec | undefined; C: React.FC<{t: number}>}> = ({t, sec, C}) => {
	const f = sec?.v ? sec.v(t) : FRAME0;
	const X = sec?.vextra;
	// zoomed out, the stage is a printed sheet lying on newsprint; zoomed in, it bleeds off every edge
	const lying = f.k * STAGE.h < VH - 2 || f.k * STAGE.w < VW - 2;
	return (
		<AbsoluteFill style={{background: f.bg ?? INK.paper, overflow: 'hidden'}}>
			{!f.bg && <PaperFill />}
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: STAGE.w,
					height: STAGE.h,
					overflow: f.clip === false ? 'visible' : 'hidden',
					transformOrigin: '0 0',
					transform: `translate(${VW / 2 - f.x * f.k}px, ${VH / 2 - f.y * f.k}px) scale(${f.k})`,
					boxShadow: lying && f.clip !== false ? '0 18px 60px rgba(60,40,20,0.28)' : undefined,
				}}
			>
				<StageProvider value={{w: STAGE.w, h: STAGE.h, vertical: true, res: Math.min(2, Math.max(1, f.k))}}>
					<C t={t} />
				</StageProvider>
			</div>
			{X && <X t={t} />}
		</AbsoluteFill>
	);
};

/** The Print half at time t (seconds, evaluated at mid-frame by the caller). */
export const Print: React.FC<{t: number; debug?: boolean; sections?: Sec[]}> = ({t, debug, sections = SECTIONS}) => {
	const {width, height} = useVideoConfig();
	const sec = sections.find((s) => t >= s.from && t < s.to);
	const C = sec ? sec.C : Sketch('not built');
	const bi = lastBeatIndex(t);
	return (
		<AbsoluteFill style={{background: INK.paper, overflow: 'hidden'}}>
			{height > width ? <Vertical t={t} sec={sec} C={C} /> : <C t={t} />}
			{debug && (
				<div style={{position: 'absolute', right: 16, top: 12, fontFamily: MONO, fontSize: 18, color: '#000', background: 'rgba(255,255,255,0.7)', padding: '2px 8px'}}>
					{t.toFixed(2)}s · bar {BEATS[bi]?.bar}.{BEATS[bi]?.beat} · {sec?.name ?? '-'}
				</div>
			)}
		</AbsoluteFill>
	);
};
