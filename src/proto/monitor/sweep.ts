import {BEATS} from '../../timing';
import {W, beatClock, clamp01, ecg} from './engine';

/** Time at a (fractional) beat-clock value: the inverse of beatClock. */
export const timeOfClock = (bc: number) => {
	const i = Math.max(0, Math.min(BEATS.length - 2, Math.floor(bc)));
	const f = bc - i;
	return BEATS[i].t + f * (BEATS[i + 1].t - BEATS[i].t);
};

/**
 * Sweep mode: the write head crosses the frame once every `period` beats (beat clock, so it follows the drift).
 * A period of 2.618 beats puts each beat's spike at a golden-ratio step across the frame, so they never repeat.
 */
export const makeSweep = (t0: number, period: number, phase0: number) => {
	const bc0 = beatClock(t0);
	const phase = (t: number) => (beatClock(t) - bc0) / period + phase0;
	const headX = (t: number) => (((phase(t) % 1) + 1) % 1) * W;
	/** Age (in sweeps, 0..1) of the trace at screen x, and the time the head wrote it. */
	const at = (t: number, x: number) => {
		const s = phase(t);
		const age = (((s - x / W) % 1) + 1) % 1;
		const sx = s - age;
		return {age, tau: timeOfClock(bc0 + (sx - phase0) * period)};
	};
	return {phase, headX, at};
};

/** Opacity stops for a phosphor gradient across [x0, x1], from the trace age. */
export const phosphorStops = (x0: number, x1: number, ageAt: (x: number) => number, decay = 2.2, floor = 0.08, n = 8) =>
	Array.from({length: n + 1}, (_, i) => {
		const x = x0 + ((x1 - x0) * i) / n;
		return {offset: i / n, opacity: floor + (1 - floor) * Math.exp(-decay * ageAt(x))};
	});

export const ecgAt = (tau: number, from?: number, to?: number) => ecg(tau, from, to);
export {clamp01};
