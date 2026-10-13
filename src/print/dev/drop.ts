import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Heart, Progs} from '../s_drop';
import {devRoot} from './root';

registerRoot(
	devRoot([
		{from: F.flatline2, to: F.heart, C: Progs, name: 'progs'},
		{from: F.heart, to: F.dancing, C: Heart, name: 'heart'},
	]),
);
