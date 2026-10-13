import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {bt} from '../../timing';
import {Couch} from '../s_couch';
import {DancingWord, FirstDance, ReversePull} from '../s_dancing';
import {devRoot} from './root';

// The first dance (bars 54-61), with the first moments of the couch stencils to check the hand-over.
registerRoot(
	devRoot([
		{from: F.dancing, to: bt(56), C: DancingWord, name: 'DANCING'},
		{from: bt(56), to: F.flatline3, C: FirstDance, name: 'first dance'},
		{from: F.flatline3, to: F.couch, C: ReversePull, name: 'reverse pull'},
		{from: F.couch, to: F.join, C: Couch, name: 'couch stencils'},
	]),
);
