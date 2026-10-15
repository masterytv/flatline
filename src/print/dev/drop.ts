import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// Progs and Heart, with the hand-over before and DANCING after to check the hand-offs. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['drop 1 hand-over', 'progs', 'heart', 'DANCING'].includes(s.name))));
