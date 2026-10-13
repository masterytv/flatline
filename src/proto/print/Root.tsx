import React from 'react';
import {Composition} from 'remotion';
import '../../fonts';
import './fonts';
import {F} from '../../full/cues';
import {Song} from '../../Song';
import {FPS, f} from '../../timing';
import {ProtoPrint} from './ProtoPrint';

const Comp: React.FC<{debug?: boolean}> = (p) => (
	<>
		<Song />
		<ProtoPrint {...p} />
	</>
);

export const Root: React.FC = () => (
	<Composition id="ProtoPrint" component={Comp} durationInFrames={f(F.endCardOut)} fps={FPS} width={1920} height={1080} defaultProps={{debug: false}} />
);
