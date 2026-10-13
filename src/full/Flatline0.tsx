import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {T} from '../opening/cues';
import {Debug, ScreenOpening} from '../opening/ScreenOpening';
import {Print} from '../print/Print';
import {FPS} from '../timing';
import {F} from './cues';

export type FullProps = {debug: boolean};

/** The whole video: the phone-screen opening until the 1:24.8 shatter, then Proof of Life (src/print) to the end card. */
export const Flatline0: React.FC<FullProps> = ({debug}) => {
	const frame = useCurrentFrame();
	// Evaluate cues at mid-frame so a cue at time c first shows on frame round(c × 30), per CLAUDE.md.
	const t = (frame + 0.5) / FPS;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{t < T.drop ? <ScreenOpening debug={false} /> : <Print t={t} debug={debug} />}
			{debug && t < T.drop ? <Debug t={Math.min(t, F.songEnd - 0.01)} /> : null}
		</AbsoluteFill>
	);
};
