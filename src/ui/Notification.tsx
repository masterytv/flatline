import React from 'react';
import {C, UI_FONT} from '../theme';
import {TokTicIcon} from './TokTicLogo';

export type Notif = {app: 'TokTic' | 'Messages'; title: string; body: string};

export const Notification: React.FC<{n: Notif; t: number; ago: string}> = ({n, t, ago}) => (
	<div
		style={{
			width: 398,
			borderRadius: 24,
			background: 'rgba(29,34,48,0.88)',
			border: '1px solid rgba(255,255,255,0.06)',
			padding: '14px 16px',
			display: 'flex',
			gap: 12,
			alignItems: 'center',
			fontFamily: UI_FONT,
			color: C.text,
			boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
		}}
	>
		{n.app === 'TokTic' ? (
			<TokTicIcon size={40} t={t} />
		) : (
			<div style={{width: 40, height: 40, borderRadius: 11, background: '#3E7BFA', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				<div style={{width: 22, height: 17, borderRadius: 9, background: '#fff'}} />
			</div>
		)}
		<div style={{flex: 1, minWidth: 0}}>
			<div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, marginBottom: 2}}>
				<span style={{fontWeight: 600, letterSpacing: 0.2}}>{n.app.toUpperCase()}</span>
				<span>{ago}</span>
			</div>
			<div style={{fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.title}</div>
			<div style={{fontSize: 14, color: '#C9CEDA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.body}</div>
		</div>
	</div>
);
