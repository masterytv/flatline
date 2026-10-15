import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// Dawn to the end card, with the camera roll before it. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['dancing and the camera roll', 'dawn', 'postcards', 'living line', 'end card'].includes(s.name))));
