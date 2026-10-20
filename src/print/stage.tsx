import React, {createContext, useContext} from 'react';
import {useVideoConfig} from 'remotion';
import {clamp01, easeInOut} from './kit';

/**
 * Print is designed on a 1920x1080 stage. The 9:16 cut renders each section on that same stage and looks at it
 * through a reframing camera (`Frame`), so one design serves both formats; a section can still read `vertical` to
 * adjust a layout that a camera alone can't hold (a word wider than the phone, a sheet that must be upright).
 */
export const STAGE = {w: 1920, h: 1080};

type Stage = {w: number; h: number; vertical: boolean; res: number};
const StageCtx = createContext<Stage | null>(null);
export const StageProvider = StageCtx.Provider;

/** The size Print draws at, whether this is the vertical cut, and the canvas resolution the camera needs. */
export const useStage = (): Stage => {
	const ctx = useContext(StageCtx);
	const {width, height} = useVideoConfig();
	return ctx ?? {w: width, h: height, vertical: height > width, res: 1};
};

/**
 * The vertical camera: the stage point (x, y) sits at the centre of the 1080x1920 frame, scaled by k.
 * k 0.5625 shows the whole stage width (paper above and below), 1 shows 1080 stage px, 1.78 fills the height.
 * `bg` paints the frame outside the stage (default newsprint); `clip` false lets stage content run past its edges.
 */
export type Frame = {k: number; x: number; y: number; bg?: string; clip?: boolean};
export const FRAME0: Frame = {k: 1, x: 960, y: 540};

/** The vertical frame, and the two landmark zooms: K_FILL fills its height with the stage, K_FIT shows the stage's full width. */
export const VW = 1080;
export const VH = 1920;
export const K_FILL = VH / STAGE.h;
export const K_FIT = VW / STAGE.w;

const clampTo = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/** A full-bleed frame looking at (x, y) at zoom k (at least K_FILL), nudged so no stage edge shows. */
export const bleed = (x: number, y = STAGE.h / 2, k = K_FILL): Frame => {
	const kk = Math.max(k, K_FILL);
	const hw = VW / 2 / kk;
	const hh = VH / 2 / kk;
	return {k: kk, x: clampTo(x, hw, STAGE.w - hw), y: clampTo(y, hh, STAGE.h - hh)};
};

/** Where stage point (x, y) lands in the vertical frame under camera f (frame px), for placing vextra type against the stage. */
export const toFrame = (f: Frame, x: number, y: number): [number, number] => [VW / 2 + (x - f.x) * f.k, VH / 2 + (y - f.y) * f.k];

/**
 * A camera move from keys: each key holds until the next one, reached over `dur` seconds before it (0 = a cut).
 * vtrack([[t0, frameA], [t1, frameB, 0.3]]) eases from A to B over the 0.3 s before t1.
 */
export const vtrack =
	(keys: [number, Frame, number?][]) =>
	(t: number): Frame => {
		let cur = keys[0][1];
		for (let i = 1; i < keys.length; i++) {
			const [ti, f, dur = 0] = keys[i];
			if (t >= ti) {
				cur = f;
				continue;
			}
			if (dur > 0 && t > ti - dur) {
				const e = easeInOut(clamp01((t - (ti - dur)) / dur));
				return {...cur, k: cur.k + (f.k - cur.k) * e, x: cur.x + (f.x - cur.x) * e, y: cur.y + (f.y - cur.y) * e};
			}
			break;
		}
		return cur;
	};

/** A section file's vertical settings, keyed by the section's component name in Print.tsx (e.g. {Couch: {v, vextra}}). */
export type VMap = Record<string, {v?: (t: number) => Frame; vextra?: React.FC<{t: number}>}>;
