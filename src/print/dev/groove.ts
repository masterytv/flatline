import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Light, NoPain, Strips, TimeCard} from '../s_groove';
import {devRoot} from './root';

// The groove on the roof, 2:07.1 to 2:23.6: the same from/to as Print.tsx.
registerRoot(
	devRoot([
		{from: F.groove, to: F.light, C: NoPain, name: 'no pain'},
		{from: F.light, to: F.fourMin, C: Light, name: 'just light'},
		{from: F.fourMin, to: F.together, C: TimeCard, name: 'time card'},
		{from: F.together, to: F.beep1, C: Strips, name: 'strips'},
	]),
);
