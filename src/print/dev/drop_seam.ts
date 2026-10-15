import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// Seam check for group drop: the hand-over into Progs (92.172), Progs into Heart, Heart into DANCING (101.378).
registerRoot(devRoot(SECTIONS.filter((s) => ['drop 1 hand-over', 'progs', 'heart', 'DANCING'].includes(s.name))));
