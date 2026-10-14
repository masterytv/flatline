import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Diptych, Hoist, STANDINS} from '../s_diptych';
import {devRoot} from './root';

// The zine and the fly-posting run (2:52.8 to 3:07.8), as Print.tsx schedules them.
// Stand-ins print existing photos where P35, P38, P39 and P40 will go, so the effects can be checked before
// those photos exist (set USE_STANDINS false to see the film as it is: bare paper in their place).
const USE_STANDINS = true;
if (USE_STANDINS) {
	Object.assign(STANDINS, {
		P35: {map: 'P19', crop: [0.21, 0, 0.784, 1]}, // Maya's face, head back, on the roof
		P38: {map: 'P21', crop: [0.355, 0, 0.7445, 1]}, // Jess against the white doorway
		P39: {map: 'P42', crop: [0.305, 0, 0.6945, 1]}, // Kai, arms flung wide
		P40: {map: 'P15', crop: [0.29, 0, 0.6795, 1]}, // Maya, one arm up, at the stairwell door
	});
}

registerRoot(
	devRoot([
		{from: F.type2, to: F.type3, C: Diptych, name: 'zine'},
		{from: F.type3, to: bt(101, 2), C: Hoist, name: 'fly-posting and hoist'},
	]),
);
