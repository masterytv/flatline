import React from 'react';
import {C, PHONE_W, UI_FONT} from '../theme';

export const Battery: React.FC<{pct: number; size?: number; showPct?: boolean}> = ({pct, size = 1, showPct = true}) => {
	const low = pct <= 20;
	const color = low ? C.pulse : C.charge;
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 6 * size}}>
			{showPct ? <span style={{fontSize: 15 * size, fontWeight: 600, color: low ? C.pulse : C.text}}>{Math.round(pct)}%</span> : null}
			<div style={{position: 'relative', width: 27 * size, height: 13 * size, borderRadius: 4 * size, border: `${1.5 * size}px solid ${low ? C.pulse : 'rgba(242,244,248,0.6)'}`, padding: 1.5 * size}}>
				<div style={{width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 2 * size, background: color}} />
				<div style={{position: 'absolute', right: -4.5 * size, top: 3 * size, width: 2.5 * size, height: 4 * size, borderRadius: 1, background: low ? C.pulse : 'rgba(242,244,248,0.6)'}} />
			</div>
		</div>
	);
};

const Signal: React.FC = () => (
	<div style={{display: 'flex', alignItems: 'flex-end', gap: 2, height: 12}}>
		{[4, 6, 9, 12].map((h, i) => (
			<div key={i} style={{width: 3, height: h, borderRadius: 1, background: C.text}} />
		))}
	</div>
);

const Moon: React.FC<{size?: number; color?: string}> = ({size = 14, color = C.text}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill={color} />
	</svg>
);
export {Moon};

export const StatusBar: React.FC<{clock: string; pct: number; dnd?: boolean; dim?: boolean}> = ({clock, pct, dnd, dim}) => (
	<div
		style={{
			position: 'absolute',
			top: 0,
			left: 0,
			width: PHONE_W,
			height: 50,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '8px 30px 0 34px',
			fontFamily: UI_FONT,
			color: C.text,
			opacity: dim ? 0.7 : 1,
			zIndex: 50,
		}}
	>
		<span style={{fontSize: 16, fontWeight: 600}}>{clock}</span>
		<div style={{display: 'flex', alignItems: 'center', gap: 9}}>
			{dnd ? <Moon /> : null}
			<Signal />
			<Battery pct={pct} />
		</div>
	</div>
);
