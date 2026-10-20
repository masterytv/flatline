import React from 'react';
import {C, UI_FONT} from '../theme';

/** "TokTic": the dot of the i is a little clock whose hand keeps ticking. */
export const TokTicLogo: React.FC<{size: number; t: number; color?: string}> = ({size, t, color = C.signal}) => {
	const angle = Math.floor(t * 2) * 30; // ticks twice a second
	const d = size * 0.36;
	return (
		<span style={{fontFamily: UI_FONT, fontWeight: 800, fontSize: size, color, letterSpacing: -size * 0.04, lineHeight: 1, whiteSpace: 'nowrap'}}>
			TokT
			<span style={{position: 'relative', display: 'inline-block'}}>
				{'ı'}
				<svg width={d} height={d} viewBox="0 0 20 20" style={{position: 'absolute', left: '50%', top: -size * 0.12, marginLeft: -d / 2}}>
					<circle cx="10" cy="10" r="8.5" fill="none" stroke={color} strokeWidth="3" />
					<line x1="10" y1="10" x2="10" y2="4" stroke={color} strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${angle} 10 10)`} />
				</svg>
			</span>
			c
		</span>
	);
};

/** Square app icon. */
export const TokTicIcon: React.FC<{size: number; t: number}> = ({size, t}) => (
	<div style={{width: size, height: size, borderRadius: size * 0.26, background: '#0E1016', border: `1px solid ${C.surface2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
		<TokTicLogo size={size * 0.27} t={t} />
	</div>
);
