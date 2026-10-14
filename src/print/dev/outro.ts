import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {KEEPSAKE_STANDIN} from '../s_keepsake';
import {Dawn, EndCard, LivingLine, Postcard, STANDINS} from '../s_outro';
import {devRoot} from './root';

// Dawn, the postcards, the living line and the end card (3:21.9 to the end), as Print.tsx schedules them.
// Stand-ins print existing photos where P50-P54 will go, so the effects can be checked before those photos exist
// (set USE_STANDINS false, or use dev/outro_film.ts, to see the film as it is: bare paper in their place).
const USE_STANDINS = true;
if (USE_STANDINS) {
	Object.assign(STANDINS, {
		P50: {map: 'P17', split: [0.45, 0.39]}, // the roof at dusk, the skyline at v 0.40
		P51: {map: 'P19', split: [0.5, 0.42]}, // Maya's face tipped back, chin at v 0.47
		P52: {map: 'P36', split: [0.36, 0.3]}, // the street, the sky between the buildings above v 0.3
		// the phone on charge on the kitchen counter, traced off P24 (u 0.463-0.714, v 0.602-0.745)
		P53: {
			map: 'P24',
			stack: [
				[0.463, 0.668],
				[0.478, 0.645],
				[0.635, 0.602],
				[0.655, 0.608],
				[0.711, 0.647],
				[0.714, 0.668],
				[0.7, 0.683],
				[0.53, 0.745],
				[0.505, 0.742],
				[0.468, 0.705],
			],
		},
		P54: {map: 'P7'}, // the friends on the sofa
	});
	// the keepsake leaving on the first cut, with the final group's stand-in for P49 (src/print/dev/final.ts)
	if (!KEEPSAKE_STANDIN.map) Object.assign(KEEPSAKE_STANDIN, {map: 'P23', maya: {u: 0.523, v: 0.56, rx: 0.088, ry: 0.235, tilt: -3}});
}

export const OUTRO_SECTIONS = [
	{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
	{from: F.screenTime, to: F.stillDancing, C: Postcard, name: 'postcards'},
	{from: F.stillDancing, to: F.songEnd, C: LivingLine, name: 'living line'},
	{from: F.songEnd, to: F.endCardOut + 1, C: EndCard, name: 'end card'},
];

registerRoot(devRoot(OUTRO_SECTIONS));
