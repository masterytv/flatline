import React from 'react';
import {DISPLAY_FONT, UI_FONT} from '../../theme';
import {HEART_D, U} from './lib';

// TokTic interface parts drawn in SVG around their own centre (0, 0), in three modes:
//  sil  – white silhouette, for masks (the part as a window)
//  body – the full UI drawing
//  edge – the 1.5 px lime hairline outline

export type PartKind = 'card' | 'heart' | 'battery' | 'signal' | 'clock' | 'logo' | 'button' | 'bubble' | 'badge' | 'pill' | 'moon' | 'toggle' | 'seen' | 'spinner' | 'avatar';

export type Part = {
	kind: PartKind;
	w: number;
	h: number;
	title?: string;
	body?: string;
	text?: string;
	sent?: boolean;
};

export type PartState = {
	t: number;
	/** 0–1 beat energy (signal-bar EQ, badge pop). */
	beat?: number;
	/** 1 on accented beats (1 and 3). */
	accent?: number;
	/** battery charge 0–1 */
	charge?: number;
	/** toggle position 1 = on */
	on?: number;
};

export const P = {
	card: (title: string, body: string): Part => ({kind: 'card', w: 400, h: 78, title, body}),
	heart: (h = 70): Part => ({kind: 'heart', w: h * 1.28, h}),
	battery: (): Part => ({kind: 'battery', w: 120, h: 54}),
	signal: (): Part => ({kind: 'signal', w: 92, h: 70}),
	clock: (text = '1:48'): Part => ({kind: 'clock', w: 210, h: 92, text}),
	logo: (): Part => ({kind: 'logo', w: 250, h: 72}),
	button: (text = 'Stay'): Part => ({kind: 'button', w: 180, h: 62, text}),
	bubble: (text: string, sent = false): Part => ({kind: 'bubble', w: Math.max(150, text.length * 10.5 + 44), h: 52, text, sent}),
	badge: (text = '99+'): Part => ({kind: 'badge', w: 72, h: 72, text}),
	pill: (text = '@maya.xo'): Part => ({kind: 'pill', w: 220, h: 60, text}),
	moon: (): Part => ({kind: 'moon', w: 70, h: 70}),
	toggle: (): Part => ({kind: 'toggle', w: 124, h: 72}),
	seen: (text = 'Seen 1:47'): Part => ({kind: 'seen', w: 150, h: 40, text}),
	spinner: (): Part => ({kind: 'spinner', w: 80, h: 80}),
	avatar: (): Part => ({kind: 'avatar', w: 84, h: 84}),
};

const MOON_D = 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z';

/** Mini TokTic app icon: dark square, lime clock dot. */
const MiniIcon: React.FC<{x: number; y: number; s: number; t: number}> = ({x, y, s, t}) => {
	const a = Math.floor(t * 2) * 30;
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.27} fill="#0E1016" stroke={U.surface2} strokeWidth={1} />
			<circle cx={0} cy={0} r={s * 0.2} fill="none" stroke={U.lime} strokeWidth={s * 0.07} />
			<line x1={0} y1={0} x2={0} y2={-s * 0.13} stroke={U.lime} strokeWidth={s * 0.065} strokeLinecap="round" transform={`rotate(${a})`} />
		</g>
	);
};

/** The TokTic wordmark: the dot of the i is a ticking clock. `stopped` freezes the hand. */
export const LogoMark: React.FC<{size: number; t: number; color?: string; anchor?: 'middle' | 'start'; handAngle?: number}> = ({size, t, color = U.lime, anchor = 'middle', handAngle}) => {
	// measured advance of "TokTıc" in Inter 800 ≈ 2.86 em with −0.04 em tracking
	const wEm = 2.86;
	const x0 = anchor === 'middle' ? (-wEm * size) / 2 : 0;
	const dotX = x0 + 2.26 * size;
	const dotY = -0.86 * size;
	const r = size * 0.15;
	const a = handAngle ?? Math.floor(t * 2) * 30;
	return (
		<g>
			<text x={x0} y={size * 0.36} fontFamily={UI_FONT} fontWeight={800} fontSize={size} letterSpacing={-size * 0.04} fill={color}>
				TokTıc
			</text>
			<circle cx={dotX} cy={dotY} r={r} fill="none" stroke={color} strokeWidth={size * 0.055} />
			<line x1={dotX} y1={dotY} x2={dotX} y2={dotY - r * 0.68} stroke={color} strokeWidth={size * 0.05} strokeLinecap="round" transform={`rotate(${a} ${dotX} ${dotY})`} />
		</g>
	);
};

type Mode = 'sil' | 'body' | 'edge';

const paint = (mode: Mode, fill: string) => (mode === 'sil' ? {fill: '#fff'} : mode === 'edge' ? {fill: 'none', stroke: U.lime, strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' as const} : {fill});

export const PartShape: React.FC<{p: Part; mode: Mode; s: PartState; edge?: string}> = ({p, mode, s, edge}) => {
	const {w, h} = p;
	const pr = paint(mode, U.surface2);
	const ec = edge ?? U.lime;
	const stroke = mode === 'edge' ? {...pr, stroke: ec} : pr;
	const body = mode === 'body';
	switch (p.kind) {
		case 'card':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22} {...stroke} {...(body ? {fill: 'rgba(29,34,48,0.97)'} : {})} />
					{body ? (
						<g fontFamily={UI_FONT}>
							<MiniIcon x={-w / 2 + 36} y={0} s={40} t={s.t} />
							<text x={-w / 2 + 68} y={-16} fontSize={11.5} fontWeight={600} letterSpacing={0.6} fill={U.muted}>
								TOKTIC
							</text>
							<text x={w / 2 - 16} y={-16} fontSize={11.5} textAnchor="end" fill={U.muted}>
								now
							</text>
							<text x={-w / 2 + 68} y={5} fontSize={15} fontWeight={600} fill={U.text}>
								{p.title}
							</text>
							<text x={-w / 2 + 68} y={25} fontSize={13.5} fill="#C9CEDA">
								{p.body}
							</text>
						</g>
					) : null}
				</g>
			);
		case 'heart':
			return <path d={HEART_D} transform={`scale(${h / 16.5}) translate(-12 -12.75)`} {...(mode === 'body' ? {fill: U.pink} : stroke)} />;
		case 'battery': {
			const c = s.charge ?? 0;
			const col = c < 0.2 ? U.pink : U.green;
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w - 10} height={h} rx={h * 0.24} {...(body ? {fill: U.bg, stroke: 'rgba(242,244,248,0.7)', strokeWidth: 4} : stroke)} />
					<rect x={w / 2 - 8} y={-h * 0.17} width={8} height={h * 0.34} rx={3} {...(body ? {fill: 'rgba(242,244,248,0.7)'} : stroke)} />
					{body ? <rect x={-w / 2 + 7} y={-h / 2 + 7} width={Math.max(0, (w - 24) * c)} height={h - 14} rx={h * 0.13} fill={col} /> : null}
				</g>
			);
		}
		case 'signal': {
			const bw = 16;
			const gap = 9;
			const e = s.beat ?? 0;
			const ac = s.accent ?? 0;
			return (
				<g>
					{[0.32, 0.52, 0.76, 1].map((k, i) => {
						const pump = 0.35 + 0.65 * Math.min(1, k * (0.5 + (ac ? 1 : 0.55) * e * (1.2 - 0.15 * i)) + 0.15);
						const bh = h * (body ? pump : k);
						return <rect key={i} x={-w / 2 + i * (bw + gap)} y={h / 2 - bh} width={bw} height={bh} rx={3} {...(body ? {fill: U.text} : stroke)} />;
					})}
				</g>
			);
		}
		case 'clock':
			return (
				<text x={0} y={h * 0.36} textAnchor="middle" fontFamily={UI_FONT} fontWeight={300} fontSize={h} letterSpacing={-h * 0.03} {...(body ? {fill: U.text} : stroke)}>
					{p.text}
				</text>
			);
		case 'logo':
			if (mode === 'body') return <LogoMark size={h} t={s.t} />;
			return <rect x={-w / 2 - 14} y={-h / 2 - 22} width={w + 28} height={h + 36} rx={26} {...stroke} />;
		case 'button':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} {...(body ? {fill: U.lime} : stroke)} />
					{body ? (
						<text x={0} y={7} textAnchor="middle" fontFamily={UI_FONT} fontWeight={700} fontSize={20} fill="#0B0D12">
							{p.text}
						</text>
					) : null}
				</g>
			);
		case 'bubble': {
			const r = 22;
			const tail = p.sent ? `M${w / 2 - 4},${h / 2 - 14} L${w / 2 + 6},${h / 2} L${w / 2 - 18},${h / 2 - 2} Z` : `M${-w / 2 + 4},${h / 2 - 14} L${-w / 2 - 6},${h / 2} L${-w / 2 + 18},${h / 2 - 2} Z`;
			const f = p.sent ? U.lime : U.surface2;
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} {...(body ? {fill: f} : stroke)} />
					<path d={tail} {...(body ? {fill: f} : mode === 'sil' ? {fill: '#fff'} : {fill: 'none'})} />
					{body ? (
						<text x={0} y={6} textAnchor="middle" fontFamily={UI_FONT} fontWeight={p.sent ? 600 : 500} fontSize={18} fill={p.sent ? '#0B0D12' : U.text}>
							{p.text}
						</text>
					) : null}
				</g>
			);
		}
		case 'badge':
			return (
				<g>
					<circle r={h / 2} {...(body ? {fill: U.pink} : stroke)} />
					{body ? (
						<text x={0} y={8} textAnchor="middle" fontFamily={UI_FONT} fontWeight={800} fontSize={24} fill="#fff">
							{p.text}
						</text>
					) : null}
				</g>
			);
		case 'pill':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} {...(body ? {fill: U.surface, stroke: U.surface2, strokeWidth: 2} : stroke)} />
					{body ? (
						<g>
							<circle cx={-w / 2 + 30} cy={0} r={17} fill="none" stroke={U.lime} strokeWidth={3} />
							<circle cx={-w / 2 + 30} cy={0} r={12} fill="#2a2f3c" />
							<text x={-w / 2 + 56} y={7} fontFamily={UI_FONT} fontWeight={700} fontSize={20} fill={U.text}>
								{p.text}
							</text>
						</g>
					) : null}
				</g>
			);
		case 'moon':
			return <path d={MOON_D} transform={`scale(${h / 20}) translate(-12 -12)`} {...(body ? {fill: '#8B7BFF'} : stroke)} />;
		case 'toggle': {
			const on = s.on ?? 1;
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} {...(body ? {fill: on > 0.5 ? U.lime : '#3a3f4c'} : stroke)} />
					{body ? <circle cx={-w / 2 + h / 2 + (w - h) * on} cy={0} r={h / 2 - 6} fill="#fff" /> : null}
				</g>
			);
		}
		case 'seen':
			return (
				<text x={0} y={10} textAnchor="middle" fontFamily={UI_FONT} fontWeight={500} fontSize={28} {...(body ? {fill: U.muted} : stroke)}>
					{p.text}
				</text>
			);
		case 'spinner': {
			const r = h / 2 - 6;
			const arc = `M0,${-r} A${r},${r} 0 1 1 ${-r},0`;
			if (mode === 'sil') return <path d={arc} fill="none" stroke="#fff" strokeWidth={12} strokeLinecap="round" />;
			if (mode === 'edge') return <path d={arc} fill="none" stroke={ec} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
			return (
				<g transform={`rotate(${(s.t * 540) % 360})`}>
					<circle r={r} fill="none" stroke={U.surface2} strokeWidth={10} />
					<path d={arc} fill="none" stroke={U.lime} strokeWidth={10} strokeLinecap="round" />
				</g>
			);
		}
		case 'avatar':
			return (
				<g>
					<circle r={h / 2} {...(body ? {fill: 'none', stroke: U.lime, strokeWidth: 5} : stroke)} />
					{body ? <circle r={h / 2 - 9} fill="#262b38" /> : null}
					{body ? <circle cy={-6} r={h * 0.14} fill="#3a4152" /> : null}
				</g>
			);
	}
};

export const DisplayText: React.FC<{x: number; y: number; size: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; fill?: string; weight?: number; opacity?: number; spacing?: number; len?: number}> = ({x, y, size, children, anchor = 'middle', fill = '#fff', weight = 700, opacity, spacing = -0.03, len}) => (
	<text
		x={x}
		y={y}
		textAnchor={anchor}
		fontFamily={DISPLAY_FONT}
		fontWeight={weight}
		fontSize={size}
		letterSpacing={size * spacing}
		fill={fill}
		opacity={opacity}
		textLength={len}
		lengthAdjust={len ? 'spacingAndGlyphs' : undefined}
	>
		{children}
	</text>
);
