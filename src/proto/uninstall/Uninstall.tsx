import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {Debug, ScreenOpening} from '../../opening/ScreenOpening';
import {FlatlineType} from '../../opening/ScreenOpening';
import {FPS} from '../../timing';
import {Grain} from '../../ui/Worlds';
import {DropScene} from './s_drop';
import {HeartScene, SweepScene, WriteScene} from './s_heart';
import {FloorScene, SettingsScene} from './s_floor';
import {AvatarScene, BatteryScene, RestoreScene, SpinnerScene, TableScene} from './s_mid';
import {DawnScene, DetonateScene, EndCardScene, FinalScene, IrisScene} from './s_end';
import {bt} from '../../timing';

// UNINSTALL: after the shatter, TokTic's own interface comes apart and becomes the dance.
export const Uninstall: React.FC<{debug: boolean}> = ({debug}) => {
	const t = useCurrentFrame() / FPS;
	let scene: React.ReactNode = null;
	if (t < T.drop) scene = <ScreenOpening debug={false} />;
	else if (t < F.heart) scene = <DropScene t={t} />;
	else if (t < bt(57) + 0.35) scene = <HeartScene t={t} />;
	else if (t < F.flatline3) scene = <SweepScene t={t} />;
	else if (t < F.couch) scene = <WriteScene t={t} />;
	else if (t < F.groove) scene = <FloorScene t={t} />;
	else if (t < F.light + 0.45) scene = <SettingsScene t={t} />;
	else if (t < F.together) scene = <SpinnerScene t={t} />;
	else if (t < F.beep1) scene = <AvatarScene t={t} />;
	else if (t < F.drop3 + 0.32) scene = <RestoreScene t={t} />;
	else if (t < bt(87)) scene = <TableScene t={t} />;
	else if (t < F.type2) scene = <BatteryScene t={t} />;
	else if (t < F.final) scene = <IrisScene t={t} />;
	else if (t < F.dancing2) scene = <FinalScene t={t} />;
	else if (t < F.dawn) scene = <DetonateScene t={t} />;
	else if (t < F.songEnd) scene = <DawnScene t={t} />;
	else scene = <EndCardScene t={t} />;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{scene}
			{t >= T.drop && t < T.end ? <FlatlineType t={t} vertical={false} /> : null}
			{t >= T.drop ? <Grain opacity={0.1} /> : null}
			{debug ? <Debug t={Math.min(t, F.songEnd - 0.01)} /> : null}
		</AbsoluteFill>
	);
};
