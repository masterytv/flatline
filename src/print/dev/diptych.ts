import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The zine and the fly-posting, with the ink battery before and the macros after. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['ink battery', 'zine', 'fly-posting and hoist', 'macros'].includes(s.name))));
