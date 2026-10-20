import React from 'react';
import {Composition} from 'remotion';
import '../../fonts';
import {F} from '../../full/cues';
import {Song} from '../../Song';
import {FPS, f} from '../../timing';
import {Uninstall} from './Uninstall';

const Proto: React.FC<{debug?: boolean}> = ({debug}) => (
	<>
		<Song />
		<Uninstall debug={!!debug} />
	</>
);

export const Root: React.FC = () => (
	<Composition id="ProtoUninstall" component={Proto} durationInFrames={f(F.endCardOut)} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
);
