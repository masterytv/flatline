import {registerRoot} from 'remotion';
import {SECTIONS} from '../Print';
import {devRoot} from './root';

// The couch stencils and "they join her", with the neighbours either side to check the hand-overs. Same times and vertical cameras as Print.tsx.
registerRoot(devRoot(SECTIONS.filter((s) => ['reverse pull', 'couch stencils', 'they join her', 'no pain'].includes(s.name))));
