import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {F} from './full/cues';
import {Flatline0, FullProps} from './full/Flatline0';
import {T} from './opening/cues';
import {OpeningProps, ScreenOpening} from './opening/ScreenOpening';
import {Song} from './Song';
import {FPS, f} from './timing';

// 0:00 to the downbeat after the 1:24 breakout, so the shatter plays out.
const OPENING_FRAMES = f(T.end);
// The whole song plus the end card.
const FULL_FRAMES = f(F.endCardOut);

const Opening: React.FC<OpeningProps> = (p) => (
	<>
		<Song />
		<ScreenOpening {...p} />
	</>
);

const Full: React.FC<FullProps> = (p) => (
	<>
		<Song />
		<Flatline0 {...p} />
	</>
);

export const Root: React.FC = () => (
	<>
		<Composition id="Flatline0" component={Full} durationInFrames={FULL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
		<Composition id="Flatline0Vertical" component={Full} durationInFrames={FULL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{debug: false}} />
		<Composition id="ScreenOpening" component={Opening} durationInFrames={OPENING_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
		<Composition id="ScreenOpeningVertical" component={Opening} durationInFrames={OPENING_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{debug: false}} />
	</>
);
