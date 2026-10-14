import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {FlipStack, InkBattery} from '../s_battery';
import {devRoot} from './root';

registerRoot(
	devRoot([
		{from: F.drop3, to: F.table, C: FlipStack, name: 'flip and stack'},
		{from: F.table, to: F.type2, C: InkBattery, name: 'ink battery'},
	]),
);
