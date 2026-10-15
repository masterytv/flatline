import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The flip and the ink battery, with the tear-off before and the zine after. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['tear-off', 'flip and stack', 'ink battery', 'zine'].includes(s.name))));
