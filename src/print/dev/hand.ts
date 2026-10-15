import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The drop-1 hand-over, with Progs after it to check the hand-off. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['drop 1 hand-over', 'progs'].includes(s.name))));
