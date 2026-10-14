import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Dawn, EndCard, LivingLine, Postcard} from '../s_outro';
import {devRoot} from './root';

// The outro exactly as the film has it today: no stand-ins, so P50-P54 print as bare paper until they exist.
registerRoot(
	devRoot([
		{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
		{from: F.screenTime, to: F.stillDancing, C: Postcard, name: 'postcards'},
		{from: F.stillDancing, to: F.songEnd, C: LivingLine, name: 'living line'},
		{from: F.songEnd, to: F.endCardOut + 1, C: EndCard, name: 'end card'},
	]),
);
