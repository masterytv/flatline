import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Diptych, Hoist} from '../s_diptych';
import {devRoot} from './root';

// The zine and the fly-posting run (2:52.8 to 3:07.8), as Print.tsx schedules them.
registerRoot(
	devRoot([
		{from: F.type2, to: F.type3, C: Diptych, name: 'zine'},
		{from: F.type3, to: bt(101, 2), C: Hoist, name: 'fly-posting and hoist'},
	]),
);
