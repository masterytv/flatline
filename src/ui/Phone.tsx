import React from 'react';
import {C, PHONE_H, PHONE_W} from '../theme';

const BEZEL = 14;

/** A generic phone (punch-hole camera, no brand cues). Children use PHONE_W × PHONE_H units. */
export const Phone: React.FC<{
	scale: number;
	x?: number;
	y?: number;
	rotate?: number;
	children: React.ReactNode;
	overlay?: React.ReactNode;
}> = ({scale, x = 0, y = 0, rotate = 0, children, overlay}) => (
	<div
		style={{
			position: 'absolute',
			left: '50%',
			top: '50%',
			width: PHONE_W + 2 * BEZEL,
			height: PHONE_H + 2 * BEZEL,
			marginLeft: -(PHONE_W / 2 + BEZEL),
			marginTop: -(PHONE_H / 2 + BEZEL),
			transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
			borderRadius: 70,
			background: '#050608',
			boxShadow: '0 0 0 2px #2b303c, 0 0 0 4px #0d0f14, 0 50px 140px rgba(0,0,0,0.7)',
		}}
	>
		<div style={{position: 'absolute', inset: BEZEL, borderRadius: 56, overflow: 'hidden', background: C.bg}}>
			{children}
			{/* punch-hole camera */}
			<div style={{position: 'absolute', left: PHONE_W / 2 - 7, top: 14, width: 14, height: 14, borderRadius: 7, background: '#000', boxShadow: '0 0 0 2px #111'}} />
		</div>
		{overlay}
	</div>
);
