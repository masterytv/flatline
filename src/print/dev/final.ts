import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The macros, "Still" and the camera-roll explosion, with the hoist before and dawn after (dawn shows the keepsake leaving). Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['fly-posting and hoist', 'macros', 'still', 'dancing and the camera roll', 'dawn'].includes(s.name))));
