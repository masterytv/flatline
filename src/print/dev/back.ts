import {registerRoot} from 'remotion';
import {F} from '../../full/cues';
import {Receipt, TearOff} from '../s_back';
import {devRoot} from './root';

registerRoot(
	devRoot([
		{from: F.beep1, to: F.alive, C: Receipt, name: 'receipt'},
		{from: F.alive, to: F.drop3, C: TearOff, name: 'tear-off'},
	]),
);
