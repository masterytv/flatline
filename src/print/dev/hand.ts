import React from 'react';
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame} from 'remotion';
import '../../fonts';
import '../fonts';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {ScreenOpening} from '../../opening/ScreenOpening';
import {BEATS, f, FPS, lastBeatIndex} from '../../timing';
import {INK, MONO} from '../ink';
import {Progs} from '../s_drop';
import {HandOver} from '../s_hand';

// The hand-over with both of its seams, exactly as Flatline0 cuts them: the opening until T.drop (it reads its own
// frame), HandOver (Print.tsx's 'drop 1 hand-over' row, T.drop to F.flatline2), then Progs. Self-contained rather than
// devRoot([...]) so a section another group has open in Print.tsx cannot stop this bundle.
//   FRAMES_ENTRY=src/print/dev/hand.ts node scripts/frames.mjs PrintDev out/frames/hand 0.5 <seconds...>
const h = React.createElement;

const Comp: React.FC<{debug?: boolean}> = ({debug}) => {
	const t = (useCurrentFrame() + 0.5) / FPS;
	const bi = lastBeatIndex(t);
	const name = t < T.drop ? 'opening' : t < F.flatline2 ? 'drop 1 hand-over' : t < F.heart ? 'progs' : '-';
	const body = t < T.drop ? h(ScreenOpening, {debug: false}) : t < F.flatline2 ? h(HandOver, {t}) : t < F.heart ? h(Progs, {t}) : null;
	return h(
		AbsoluteFill,
		{
			style: {
				background: t < T.drop ? '#000' : INK.paper,
				overflow: 'hidden',
			},
		},
		body,
		debug
			? h(
					'div',
					{
						style: {
							position: 'absolute',
							right: 16,
							top: 12,
							fontFamily: MONO,
							fontSize: 18,
							color: '#000',
							background: 'rgba(255,255,255,0.7)',
							padding: '2px 8px',
						},
					},
					`${t.toFixed(2)}s · bar ${BEATS[bi]?.bar}.${BEATS[bi]?.beat} · ${name}`,
				)
			: null,
	);
};

registerRoot(() =>
	h(Composition, {
		id: 'PrintDev',
		component: Comp,
		durationInFrames: f(F.endCardOut),
		fps: FPS,
		width: 1920,
		height: 1080,
		defaultProps: {debug: true},
	}),
);
