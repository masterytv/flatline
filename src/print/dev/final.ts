import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Explosion, Macros, R9Pull} from '../s_final';
import {Dawn} from '../s_outro';
import {devRoot} from './root';

// The final drop (3:07.8 to 3:21.9) as Print.tsx schedules it, plus Dawn to check that the keepsake leaves on its own.
// Real P41-P49 throughout (no stand-ins).
registerRoot(
	devRoot([
		{from: bt(101, 2), to: bt(103), C: Macros, name: 'macros'},
		{from: bt(103), to: F.dancing2, C: R9Pull, name: 'still'},
		{from: F.dancing2, to: F.dawn, C: Explosion, name: 'dancing and the camera roll'},
		{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
	]),
);
