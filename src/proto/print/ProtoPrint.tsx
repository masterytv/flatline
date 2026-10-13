import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {BEATS, FPS, lastBeatIndex} from '../../timing';
import {INK, MONO} from './ink';
import {Slug} from './kit';
import {PaperFill} from './Press';
import {Heart, Progs, PressHit} from './s_drop';
import {Explosion, Macros, R9Pull} from './s_final';
import {DancingWord, ReversePull} from './s_dancing';
import {Couch, PopUp} from './s_couch';
import {Table} from './s_table';
import {Diptych, Hoist} from './s_diptych';
import {bt} from '../../timing';

type Sec = {from: number; to: number; C: React.FC<{t: number}>; name: string};

const Sketch: (name: string) => React.FC<{t: number}> = (name) => () => (
	<AbsoluteFill>
		<PaperFill />
		<Slug x={80} y={80} text={`[ ${name} ]`} size={22} />
	</AbsoluteFill>
);

let SECTIONS: Sec[] = [];
export const registerSections = (s: Sec[]) => {
	SECTIONS = s;
};

const base: Sec[] = [
	{from: T.end, to: F.flatline2, C: PressHit, name: 'press hit'},
	{from: F.flatline2, to: F.heart, C: Progs, name: 'progs'},
	{from: F.heart, to: F.dancing, C: Heart, name: 'heart'},
	{from: F.dancing, to: F.flatline3, C: DancingWord, name: 'DANCING / R3'},
	{from: F.flatline3, to: F.couch, C: ReversePull, name: 'reverse pull'},
	{from: F.couch, to: F.join, C: Couch, name: 'S5 stencils'},
	{from: F.join, to: F.groove, C: PopUp, name: 'pop-up'},
	{from: F.drop3, to: F.type2, C: Table, name: 'R6 table'},
	{from: F.type2, to: F.type3, C: Diptych, name: 'diptych'},
	{from: F.type3, to: bt(101, 2), C: Hoist, name: 'hoist'},
	{from: bt(101, 2), to: 191.019, C: Macros, name: 'macros'},
	{from: 191.019, to: F.dancing2, C: R9Pull, name: 'R9 pull / still'},
	{from: F.dancing2, to: F.slow, C: Explosion, name: 'dots explode'},
];

export const ProtoPrint: React.FC<{debug?: boolean}> = ({debug}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	if (t < T.end) return <AbsoluteFill style={{background: '#000'}} />;
	const list = SECTIONS.length ? SECTIONS : base;
	const sec = list.find((s) => t >= s.from && t < s.to);
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
