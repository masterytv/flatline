import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {T} from './opening/cues';
import {ScreenOpening} from './opening/ScreenOpening';
import {FPS, f} from './timing';

// 0:00 to the downbeat after the 1:24 breakout, so the shatter plays out.
const OPENING_FRAMES = f(T.end);

export const Root: React.FC = () => (
	<>
		<Composition id="ScreenOpening" component={ScreenOpening} durationInFrames={OPENING_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
		<Composition id="ScreenOpeningVertical" component={ScreenOpening} durationInFrames={OPENING_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{debug: false}} />
	</>
);
