import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// DANCING, the first dance and the reverse pull, with Heart before and the couch stencils after. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['heart', 'DANCING', 'first dance', 'reverse pull', 'couch stencils'].includes(s.name))));
