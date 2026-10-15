import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The receipt and the tear-off, with the strips before and the flip after. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['strips', 'receipt', 'tear-off', 'flip and stack'].includes(s.name))));
