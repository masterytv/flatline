import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// No pain, just light, the time card and the strips, with the join before and the receipt after. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['they join her', 'no pain', 'just light', 'time card', 'strips', 'receipt'].includes(s.name))));
