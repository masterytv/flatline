import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {BEATS, bt, lastBeatIndex} from '../timing';
import {INK, MONO} from './ink';
import {Sketch} from './kit';
import {FlipStack, InkBattery} from './s_battery';
import {Join, Couch} from './s_couch';
import {DancingWord, FirstDance, ReversePull} from './s_dancing';
import {Diptych, Hoist} from './s_diptych';
import {Heart, Progs} from './s_drop';
import {Explosion, Macros, R9Pull} from './s_final';
import {Light, NoPain, Strips, TimeCard} from './s_groove';
import {HandOver} from './s_hand';
import {Receipt, TearOff} from './s_back';
import {Dawn, EndCard, LivingLine, Postcard} from './s_outro';

export type Sec = {from: number; to: number; C: React.FC<{t: number}>; name: string};

// PROOF OF LIFE, 1:24.8 to the end card: the night as paper. Every section starts on a bar or a lyric beat
// (docs/shot-list.md has the cut plan for each one).
export const SECTIONS: Sec[] = [
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

/** The Print half at time t (seconds, evaluated at mid-frame by the caller). */
export const Print: React.FC<{t: number; debug?: boolean; sections?: Sec[]}> = ({t, debug, sections = SECTIONS}) => {
	const sec = sections.find((s) => t >= s.from && t < s.to);
	const C = sec ? sec.C : Sketch('not built');
	const bi = lastBeatIndex(t);
	return (
		<AbsoluteFill style={{background: INK.paper, overflow: 'hidden'}}>
			<C t={t} />
			{debug && (
				<div style={{position: 'absolute', right: 16, top: 12, fontFamily: MONO, fontSize: 18, color: '#000', background: 'rgba(255,255,255,0.7)', padding: '2px 8px'}}>
					{t.toFixed(2)}s · bar {BEATS[bi]?.bar}.{BEATS[bi]?.beat} · {sec?.name ?? '-'}
				</div>
			)}
		</AbsoluteFill>
	);
};
