import React from 'react';
import {F} from '../full/cues';
import {bt} from '../timing';
import {useDensities} from './density';
import {INK, SERIF} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, lerp} from './kit';
import {Sheet} from './press';
import {OnSheet, Press} from './Press';

// The 3:17 keepsake: lands after "Dancing" and slides off at dawn (Dawn renders it too, so it leaves on the cut).

export const R7_LAND = bt(107, 3);
const R7S = {w: 1000, h: 558};
export const r7Place = (t: number) => {
	const k = easeOut((t - (R7_LAND - 0.55)) / 0.55);
	const off = easeIn((t - F.dawn) / 0.6);
	return {...R7S, cx: 960 - off * 1500, cy: 520 + (1 - k) * -40, s: lerp(1.35, 1, k), rot: lerp(8, -3, k) - off * 6, k};
};

/** The R7 keepsake: a white-bordered print (still two inks, never a photograph), Maya circled in grease pencil. */
export const KeepsakePrint: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R7']);
	if (t < R7_LAND - 0.55) return null;
	const pl = r7Place(t);
	const circle = clamp01((t - bt(108)) / (bt(109) - bt(108)));
	const sheet: Sheet | null = d
		? {map: d.R7, ...pl, seed: 7, plates: [{ch: 1, ink: INK.heat, angle: 15, cell: 6.5, dx: 1.5, dy: -1}, {ch: 0, ink: INK.key, angle: 45, cell: 6.5, gain: 0.8, gamma: 1.25}]}
		: null;
	const border = 28;
	return (
		<>
			<OnSheet sheet={{...pl, w: pl.w + border * 2, h: pl.h + border * 2 + 60}}>
				<div style={{position: 'absolute', inset: 0, background: '#FBF8F1', boxShadow: `0 ${6 + 40 * (1 - pl.k)}px ${10 + 60 * (1 - pl.k)}px rgba(60,40,20,${0.3})`, transform: `translateY(30px)`}}>
					<div style={{position: 'absolute', left: border, bottom: 22, fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: INK.key, opacity: 0.85}}>3:17 am, everyone</div>
				</div>
			</OnSheet>
			{sheet && <Press sheets={[sheet]} />}
			{circle > 0 && (
				<OnSheet sheet={pl}>
					<svg width={pl.w} height={pl.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'multiply'}}>
						<path
							d="M 470 120 C 560 108, 640 190, 630 300 C 622 410, 540 480, 440 470 C 330 458, 290 370, 300 270 C 310 170, 380 112, 482 128 C 520 134, 545 150, 556 166"
							fill="none"
							stroke={INK.heat}
							strokeWidth={11}
							strokeLinecap="round"
							strokeDasharray={1500}
							strokeDashoffset={1500 * (1 - easeInOut(circle))}
							opacity={0.92}
						/>
					</svg>
				</OnSheet>
			)}
		</>
	);
};
