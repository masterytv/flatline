import {Easing, interpolate} from 'remotion';

/** 0→1 between t0 and t1, clamped, eased. */
export const ramp = (t: number, t0: number, t1: number, easing: (x: number) => number = Easing.out(Easing.cubic)) =>
	interpolate(t, [t0, t1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** Map t through keyframes, clamped. */
export const keys = (t: number, input: number[], output: number[]) =>
	interpolate(t, input, output, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
