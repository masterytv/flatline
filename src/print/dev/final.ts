import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Explosion, Macros, R9Pull} from '../s_final';
import {KEEPSAKE_STANDIN} from '../s_keepsake';
import {Dawn} from '../s_outro';
import {devRoot} from './root';

// The final drop (3:07.8 to 3:21.9) as Print.tsx schedules it, plus Dawn to check that the keepsake leaves on its own.
// P49 does not exist yet: the stand-in prints P23 (the group on the roof, Maya in the middle) where it goes, with
// Maya traced on P23, so the landing and the grease-pencil ring can be checked. Set USE_STANDIN false to see the
// film as it is (bare paper inside the keepsake's border).
const USE_STANDIN = true;
if (USE_STANDIN) {
	Object.assign(KEEPSAKE_STANDIN, {map: 'P23', maya: {u: 0.523, v: 0.56, rx: 0.088, ry: 0.235, tilt: -3}});
}

registerRoot(
	devRoot([
		{from: bt(101, 2), to: bt(103), C: Macros, name: 'macros'},
		{from: bt(103), to: F.dancing2, C: R9Pull, name: 'still'},
		{from: F.dancing2, to: F.dawn, C: Explosion, name: 'dancing and the camera roll'},
		{from: F.dawn, to: F.screenTime, C: Dawn, name: 'dawn'},
	]),
);
