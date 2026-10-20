// Registers only the opening (no Print code is bundled), for quick frame checks:
// FRAMES_ENTRY=src/opening/dev.ts node scripts/frames.mjs ScreenOpening out/frames/opening 0.5 <seconds...>
import React from 'react';
import {AnyZodObject, Composition, registerRoot} from 'remotion';
import '../fonts';
import {Song} from '../Song';
import {FPS, f} from '../timing';
import {T} from './cues';
import {OpeningProps, ScreenOpening} from './ScreenOpening';

const h = React.createElement;

// Same as Root.tsx: 0:00 to the downbeat after the 1:24 breakout, so the shatter plays out.
const Opening: React.FC<OpeningProps> = (p) => h(React.Fragment, null, h(Song), h(ScreenOpening, p));

const DevRoot: React.FC = () =>
	h(
		React.Fragment,
		null,
		h(Composition<AnyZodObject, OpeningProps>, {id: 'ScreenOpening', component: Opening, durationInFrames: f(T.end), fps: FPS, width: 1920, height: 1080, defaultProps: {debug: false}}),
		h(Composition<AnyZodObject, OpeningProps>, {id: 'ScreenOpeningVertical', component: Opening, durationInFrames: f(T.end), fps: FPS, width: 1080, height: 1920, defaultProps: {debug: false}}),
	);

registerRoot(DevRoot);
