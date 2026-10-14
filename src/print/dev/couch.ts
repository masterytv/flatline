import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Couch, Join} from '../s_couch';
import {ReversePull} from '../s_dancing';
import {NoPain} from '../s_groove';
import {devRoot} from './root';

// The couch stencils and "they join her", with the neighbours either side to check the hand-overs.
registerRoot(
	devRoot([
		{from: F.flatline3, to: F.couch, C: ReversePull, name: 'reverse pull'},
		{from: F.couch, to: F.join, C: Couch, name: 'couch stencils'},
		{from: F.join, to: F.groove, C: Join, name: 'they join her'},
		{from: F.groove, to: F.light, C: NoPain, name: 'no pain'},
	]),
);
