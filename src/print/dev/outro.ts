import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Dawn, EndCard, LivingLine, Postcard} from '../s_outro';
import {devRoot} from './root';

// Dawn, the postcards, the living line and the end card (3:21.9 to the end), exactly as Print.tsx schedules them,
// with the real P49-P54 (no stand-ins).
export const OUTRO_SECTIONS = [
	{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
	{from: F.screenTime, to: F.stillDancing, C: Postcard, name: 'postcards'},
	{from: F.stillDancing, to: F.songEnd, C: LivingLine, name: 'living line'},
	{from: F.songEnd, to: F.endCardOut + 1, C: EndCard, name: 'end card'},
];

registerRoot(devRoot(OUTRO_SECTIONS));
