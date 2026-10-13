import React from 'react';
import {Composition, useCurrentFrame} from 'remotion';
import '../../fonts';
import '../fonts';
import {F} from '../../full/cues';
import {FPS, f} from '../../timing';
import {Print, Sec} from '../Print';

/**
 * A composition that renders only the given Print sections (bare paper elsewhere), so one section can be
 * bundled and checked on its own: each src/print/dev/<name>.ts calls registerRoot(devRoot([...])), then
 * FRAMES_ENTRY=src/print/dev/<name>.ts node scripts/frames.mjs PrintDev out/frames/<name> 0.5 <seconds...>
 */
export const devRoot = (sections: Sec[]): React.FC => {
	const Comp: React.FC<{debug?: boolean}> = ({debug}) => {
		const t = (useCurrentFrame() + 0.5) / FPS;
		return <Print t={t} debug={debug} sections={sections} />;
	};
	return () => <Composition id="PrintDev" component={Comp} durationInFrames={f(F.endCardOut)} fps={FPS} width={1920} height={1080} defaultProps={{debug: true}} />;
};
