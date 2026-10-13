import React from 'react';
import {Composition} from 'remotion';
import '../../fonts';
import {F} from '../../full/cues';
import {Song} from '../../Song';
import {FPS, f} from '../../timing';
import {Monitor} from './Monitor';

const Proto: React.FC<{debug?: boolean}> = ({debug}) => (
	<>
		<Song />
		<Monitor debug={debug} />
	</>
);

export const Root: React.FC = () => (
	<Composition id="ProtoMonitor" component={Proto} durationInFrames={f(F.endCardOut)} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
);
