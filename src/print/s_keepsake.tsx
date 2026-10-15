import React from 'react';
import {F} from '../full/cues';
import {bt} from '../timing';
import {useDensities} from './density';
import {hash2, INK, SERIF} from './ink';
import {clamp01, easeOut, inked, lerp} from './kit';
import {Sheet} from './press';
import {Press} from './Press';
import {K_FILL, useStage} from './stage';

// The 3:17 keepsake (P49, the group photo on the floor, Maya nearest the lens). It slides in from the bottom on
// 108.1 as DANCING jumps to the top band (never crossing the word), is circled in grease pencil on 108.2-108.3,
// and slides off left on its own at dawn (Dawn in s_outro.tsx renders it too, so it leaves on that cut).
// Screen space throughout: it does not follow any section's camera.

/** Maya in the photo: centre and radii as photo fractions, tilt in degrees (the grease-pencil ring). */
export type MayaRing = {u: number; v: number; rx: number; ry: number; tilt: number};

// Traced on a gridded P49 (scratchpad/build/final-fix/g_P49_maya.png): her face is u 0.36-0.45, v 0.29-0.58, her hair
// u 0.315-0.465 (crown at u 0.39, v 0.275). Kai's hair starts at u 0.455 (v 0.30-0.40) and his face at u 0.47, so the
// loop holds her head and hair and leaves Kai outside it (checked over the photo: rings2z.png).
export const P49_MAYA: MayaRing = {u: 0.386, v: 0.44, rx: 0.08, ry: 0.205, tilt: -5};
/** Her face on P49, a soft ellipse in photo fractions: flash-lit and fair, it is the lightest face in the print, so
 *  the heat plate is pushed there (dodge and burn) to keep her eyes, nose and mouth. */
const P49_FACE = {u: 0.405, v: 0.43, rx: 0.07, ry: 0.17, boost: 2.4};
const faceBoost = (u: number, v: number) => {
	const e = ((u - P49_FACE.u) / P49_FACE.rx) ** 2 + ((v - P49_FACE.v) / P49_FACE.ry) ** 2;
	return 1 + P49_FACE.boost * clamp01(1 - e);
};

const LAND = bt(108); // 200.110: lands as DANCING jumps to the top band
const PENCIL = bt(108, 2); // 200.562: the grease pencil starts
const CLOSE = bt(108, 3); // 201.015: the circle closes round Maya
const SLIDE = 0.2;
const LEAD = 0.035; // moves that start on a beat are already under way on the beat's own frame
const EXIT = 0.42; // after F.dawn it is gone in a beat

/** Where it lands (screen px): the image area, centred under the top band. */
export const KEEP = {cx: 960, cy: 722, w: 860, h: 484, rot: -1.6};
const KB = 20; // white border
const KFOOT = 66; // the caption strip
/** The whole print, paper included. */
export const KEEP_BOX = {w: KEEP.w + 2 * KB, h: KEEP.h + KB + KFOOT};

/**
 * 9:16 (stage px as the SEAM camera sees them, K_FILL on 960, 540): the same print at 0.61, 976 x 619 frame px, its image
 * centred on frame (540, 1000) under DANCING's top band (cap y 241-645 on the phone), the camera roll peeking out under
 * it. It still slides in from below and leaves left at dawn, over 1525 stage px (2.5 phone widths) in the same 0.42 s.
 * Dawn (s_outro.tsx) renders it too, so Dawn's vertical camera should be SEAM until F.dawn + EXIT.
 */
export const KEEP_V = {cx: 960, cy: 540 + (1000 - 960) / K_FILL, s: 0.61, rot: -1.6};

export const keepPose = (t: number, vertical = false) => {
	const k = easeOut((t - LAND + LEAD) / SLIDE); // already sliding in on the beat's own frame
	const x = clamp01((t - F.dawn) / EXIT);
	const off = x * x;
	if (vertical) {
		return {
			cx: KEEP_V.cx - 40 * (1 - k) - 1525 * off,
			cy: KEEP_V.cy + 700 * (1 - k) + 40 * off,
			rot: lerp(6, KEEP_V.rot, k) - 10 * off,
			s: KEEP_V.s * lerp(1.05, 1, k),
			air: Math.max(1 - k, 0.6 * off),
		};
	}
	return {
		cx: KEEP.cx - 70 * (1 - k) - 2500 * off,
		cy: KEEP.cy + 700 * (1 - k) + 60 * off,
		rot: lerp(6, KEEP.rot, k) - 10 * off,
		s: lerp(1.05, 1, k),
		air: Math.max(1 - k, 0.6 * off),
	};
};

/** A hand-drawn loop: starts top right, goes round anticlockwise and overshoots past where it began. */
const ringPath = (ring: MayaRing, w: number, h: number) => {
	const cx = ring.u * w;
	const cy = ring.v * h;
	const rx = ring.rx * w;
	const ry = ring.ry * h;
	const tilt = (ring.tilt * Math.PI) / 180;
	const a0 = -0.95; // radians, top right
	const span = Math.PI * 2 + 0.55;
	const pts: string[] = [];
	const n = 90;
	for (let i = 0; i <= n; i++) {
		const f = i / n;
		const a = a0 - f * span;
		// a real hand: the loop drifts outward as it goes round, with a slow wobble
		const g = 1 + 0.09 * f + 0.035 * Math.sin(a * 2 + 0.7) + 0.015 * Math.sin(a * 5 + 1.3);
		const x = Math.cos(a) * rx * g;
		const y = Math.sin(a) * ry * g;
		pts.push(`${(cx + x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(1)},${(cy + x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(1)}`);
	}
	return {d: 'M' + pts.join(' L'), closeAt: (Math.PI * 2) / span};
};

/** The keepsake: a white-bordered print (still two inks, never a photograph), Maya circled in grease pencil. */
export const KeepsakePrint: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['P49']);
	const {vertical} = useStage();
	if (t < LAND) return null;
	const q = keepPose(t, vertical);
	if (q.cx < -1600 || (vertical && t >= F.dawn + EXIT)) return null;
	const r = (q.rot * Math.PI) / 180;
	const off = ((KFOOT - KB) / 2) * q.s;
	const pcx = q.cx - Math.sin(r) * off;
	const pcy = q.cy + Math.cos(r) * off;
	const sheet: Sheet | null = d
		? {
				map: d.P49,
				w: KEEP.w,
				h: KEEP.h,
				cx: q.cx,
				cy: q.cy,
				s: q.s,
				rot: q.rot,
				seed: 49,
				speckle: 0.4,
				plates: [
					// tuned on P49 (zoomed f6044): the heat plate opened up (gamma 0.8) and pushed on Maya's face
					{ch: 1, ink: INK.heat, angle: 15, cell: 6, dx: 1.5, dy: -1, gain: 0.95, gamma: 0.8, mask: faceBoost},
					{ch: 0, ink: INK.key, angle: 45, cell: 6, gain: 0.88},
				],
			}
		: null;
	// the pencil: one beat to go round, closing on 108.3, then a flick past the start. A hand starts fast: a fifth of
	// the loop is already down on 108.2's own frame
	const {d: path, closeAt} = ringPath(P49_MAYA, KEEP.w, KEEP.h);
	const go = clamp01((t - PENCIL + LEAD) / (CLOSE - PENCIL + LEAD));
	const draw = t < CLOSE ? closeAt * (1 - Math.pow(1 - go, 1.6)) : lerp(closeAt, 1, easeOut((t - CLOSE) / 0.12));
	const wob = (i: number) => (hash2(i, 3, 49) - 0.5) * 1.2;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: pcx - KEEP_BOX.w / 2,
					top: pcy - KEEP_BOX.h / 2,
					width: KEEP_BOX.w,
					height: KEEP_BOX.h,
					background: '#FBF8F1',
					transform: `rotate(${q.rot}deg) scale(${q.s})`,
					boxShadow: `${5 + 30 * q.air}px ${10 + 50 * q.air}px ${16 + 60 * q.air}px rgba(45,30,15,${0.32 + 0.12 * q.air})`,
				}}
			>
				<div style={{position: 'absolute', left: KB + 4, top: KB + KEEP.h + 10, fontFamily: SERIF, fontStyle: 'italic', fontSize: 38, lineHeight: 1, color: INK.key, opacity: 0.9, whiteSpace: 'nowrap'}}>
					3:17 am, everyone
				</div>
			</div>
			{sheet && <Press sheets={[sheet]} />}
			{t >= PENCIL - LEAD && draw > 0 && (
				<div
					style={{
						position: 'absolute',
						left: q.cx - KEEP.w / 2,
						top: q.cy - KEEP.h / 2,
						width: KEEP.w,
						height: KEEP.h,
						transform: `rotate(${q.rot}deg) scale(${q.s})`,
						overflow: 'visible',
					}}
				>
					<svg width={KEEP.w} height={KEEP.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'multiply', ...inked(600, 17, 9)}}>
						{/* grease pencil: a waxy main stroke and a thinner second pass a hair off it */}
						<path d={path} pathLength={1} fill="none" stroke={INK.heat} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - clamp01(draw)} opacity={0.95} />
						<path
							d={path}
							pathLength={1}
							transform={`translate(${2.5 + wob(1)} ${-2 + wob(2)})`}
							fill="none"
							stroke={INK.heat}
							strokeWidth={5}
							strokeLinecap="round"
							strokeDasharray="1 1"
							strokeDashoffset={1 - clamp01(draw - 0.01)}
							opacity={0.8}
						/>
					</svg>
				</div>
			)}
		</>
	);
};
