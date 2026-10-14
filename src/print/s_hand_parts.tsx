import React from 'react';
import {UI_FONT} from '../theme';
import {INK, MONO} from './ink';

// The 24 TokTic parts that spill out of the broken phone at 1:25.7 (graft 1, from src/proto/uninstall/parts.tsx),
// redrawn in Print's inks. They are TokTic's own pieces, so they are printed in TokTic's lime on the key flood, with
// their small type knocked out to bare paper. Each part is drawn round its own centre (0, 0) in three modes:
//  sil  - white silhouette, for the flood's mask (the part as a window onto the print)
//  body - the part itself, lime ink
//  edge - a lime hairline round the silhouette (it stays on while the window is open)

export type PartKind =
	| 'card'
	| 'heart'
	| 'battery'
	| 'signal'
	| 'clock'
	| 'logo'
	| 'button'
	| 'bubble'
	| 'badge'
	| 'pill'
	| 'moon'
	| 'toggle'
	| 'seen'
	| 'spinner'
	| 'avatar';

export type Part = {
	kind: PartKind;
	w: number;
	h: number;
	title?: string;
	body?: string;
	text?: string;
	sent?: boolean;
	hollow?: boolean;
};

export type Mode = 'sil' | 'body' | 'edge';

export type PartState = {t: number; beat: number; charge: number};

export const P = {
	card: (title: string, body: string): Part => ({
		kind: 'card',
		w: 400,
		h: 78,
		title,
		body,
	}),
	heart: (h = 70, hollow = false): Part => ({
		kind: 'heart',
		w: h * 1.28,
		h,
		hollow,
	}),
	battery: (): Part => ({kind: 'battery', w: 120, h: 54}),
	signal: (): Part => ({kind: 'signal', w: 92, h: 70}),
	clock: (text = '1:48'): Part => ({kind: 'clock', w: 210, h: 92, text}),
	logo: (): Part => ({kind: 'logo', w: 250, h: 72}),
	button: (text = 'Stay'): Part => ({kind: 'button', w: 180, h: 62, text}),
	bubble: (text: string, sent = false): Part => ({
		kind: 'bubble',
		w: Math.max(150, text.length * 10.5 + 44),
		h: 52,
		text,
		sent,
	}),
	badge: (text = '99+'): Part => ({kind: 'badge', w: 72, h: 72, text}),
	pill: (text = '@maya.xo'): Part => ({kind: 'pill', w: 220, h: 60, text}),
	moon: (): Part => ({kind: 'moon', w: 70, h: 70}),
	toggle: (): Part => ({kind: 'toggle', w: 124, h: 72}),
	seen: (text = 'Seen 1:47'): Part => ({kind: 'seen', w: 150, h: 40, text}),
	spinner: (): Part => ({kind: 'spinner', w: 80, h: 80}),
	avatar: (): Part => ({kind: 'avatar', w: 84, h: 84}),
};

/** TokTic's like heart (the opening's icon, made symmetric). */
const HEART_D =
	'M12 21 C12 21 4.4 16.4 2.4 11.7 C0.9 8.2 3 4.5 6.6 4.5 C8.7 4.5 11.2 5.7 12 7.1 C12.8 5.7 15.3 4.5 17.4 4.5 C21 4.5 23.1 8.2 21.6 11.7 C19.6 16.4 12 21 12 21 Z';
const MOON_D = 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z';

const LIME = INK.lime;
const KEY = INK.key;
const PAPER = INK.paper;

/** The app icon: a lime rounded square with the ticking clock knocked out of it. */
const MiniIcon: React.FC<{x: number; s: number; t: number}> = ({x, s, t}) => {
	const a = Math.floor(t * 2) * 30;
	return (
		<g transform={`translate(${x} 0)`}>
			<rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.27} fill={LIME} />
			<circle r={s * 0.22} fill="none" stroke={KEY} strokeWidth={s * 0.08} />
			<line x1={0} y1={0} x2={0} y2={-s * 0.14} stroke={KEY} strokeWidth={s * 0.075} strokeLinecap="round" transform={`rotate(${a})`} />
		</g>
	);
};

/** The TokTic wordmark: the dot of the i is a ticking clock (measured in the opening: 3.07 em wide, the i at 2.41 em). */
const LogoMark: React.FC<{size: number; t: number; color: string}> = ({size, t, color}) => {
	const x0 = (-3.07 * size) / 2;
	const dotX = x0 + 2.41 * size;
	const dotY = 0.36 * size - 0.545 * size - 0.27 * size;
	const r = size * 0.16;
	const a = Math.floor(t * 2) * 30;
	return (
		<g>
			<text x={x0} y={size * 0.36} fontFamily={UI_FONT} fontWeight={800} fontSize={size} letterSpacing={-size * 0.04} fill={color}>
				TokTıc
			</text>
			<circle cx={dotX} cy={dotY} r={r} fill="none" stroke={color} strokeWidth={size * 0.055} />
			<line
				x1={dotX}
				y1={dotY}
				x2={dotX}
				y2={dotY - r * 0.68}
				stroke={color}
				strokeWidth={size * 0.05}
				strokeLinecap="round"
				transform={`rotate(${a} ${dotX} ${dotY})`}
			/>
		</g>
	);
};

/** How a silhouette prints into a mask: its fill (white = see-through) and an optional swell (stroke width, part units). */
export type Sil = {ink: string; grow: number};
const SIL: Sil = {ink: '#fff', grow: 0};

type Look = {
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	strokeLinejoin?: 'round';
	vectorEffect?: 'non-scaling-stroke';
};

/** Fill/stroke for a mode: the silhouette in its mask ink (swollen by `grow`), the edge a lime hairline, the body `body`. */
const lookOf =
	(sil: Sil, edgeW: number) =>
	(mode: Mode, body: Look): Look =>
		mode === 'sil'
			? sil.grow > 0
				? {
						fill: sil.ink,
						stroke: sil.ink,
						strokeWidth: sil.grow,
						strokeLinejoin: 'round',
					}
				: {fill: sil.ink}
			: mode === 'edge'
				? {
						fill: 'none',
						stroke: LIME,
						strokeWidth: edgeW,
						vectorEffect: 'non-scaling-stroke',
					}
				: body;

const OUTLINE = (w: number): Look => ({
	fill: KEY,
	stroke: LIME,
	strokeWidth: w,
});

export const PartShape: React.FC<{
	p: Part;
	mode: Mode;
	s: PartState;
	sil?: Sil;
	/** the edge hairline's width in screen px */
	edgeW?: number;
}> = ({p, mode, s, sil = SIL, edgeW = 1.6}) => {
	const {w, h} = p;
	const body = mode === 'body';
	const look = lookOf(sil, edgeW);
	switch (p.kind) {
		case 'card':
			// a notification banner: lime frame, the app icon, its type knocked out to paper
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22} {...look(mode, OUTLINE(3))} />
					{body ? (
						<g fontFamily={UI_FONT}>
							<MiniIcon x={-w / 2 + 36} s={40} t={s.t} />
							<text x={-w / 2 + 68} y={-16} fontSize={11.5} fontWeight={700} letterSpacing={0.8} fill={LIME}>
								TOKTIC
							</text>
							<text x={w / 2 - 16} y={-16} fontSize={11.5} textAnchor="end" fill={LIME}>
								now
							</text>
							<text x={-w / 2 + 68} y={5} fontSize={15.5} fontWeight={700} fill={PAPER}>
								{p.title}
							</text>
							<text x={-w / 2 + 68} y={25} fontSize={13.5} fill={PAPER} opacity={0.78}>
								{p.body}
							</text>
						</g>
					) : null}
				</g>
			);
		case 'heart':
			// liked hearts are solid; the far ones are hollow, a heavy lime outline
			return (
				<path
					d={HEART_D}
					transform={`scale(${h / 16.5}) translate(-12 -12.75)`}
					{...look(
						mode,
						p.hollow
							? {
									fill: KEY,
									stroke: LIME,
									strokeWidth: 1.5,
									strokeLinejoin: 'round',
								}
							: {fill: LIME},
					)}
				/>
			);
		case 'battery': {
			// it charges on every kick and drains between them
			const c = s.charge;
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w - 10} height={h} rx={h * 0.24} {...look(mode, OUTLINE(5))} />
					<rect x={w / 2 - 8} y={-h * 0.17} width={8} height={h * 0.34} rx={3} {...look(mode, {fill: LIME})} />
					{body ? <rect x={-w / 2 + 8} y={-h / 2 + 8} width={Math.max(0, (w - 26) * c)} height={h - 16} rx={h * 0.12} fill={LIME} /> : null}
				</g>
			);
		}
		case 'signal': {
			const bw = 16;
			const gap = 9;
			return (
				<g>
					{[0.32, 0.52, 0.76, 1].map((k, i) => {
						const pump = Math.min(1, 0.3 + 0.7 * k * (0.55 + 0.6 * s.beat * (1.15 - 0.12 * i)));
						const bh = h * (body ? pump : k);
						return <rect key={i} x={-w / 2 + i * (bw + gap)} y={h / 2 - bh} width={bw} height={bh} rx={3} {...look(mode, {fill: LIME})} />;
					})}
				</g>
			);
		}
		case 'clock':
			return (
				<text x={0} y={h * 0.36} textAnchor="middle" fontFamily={UI_FONT} fontWeight={300} fontSize={h} letterSpacing={-h * 0.03} {...look(mode, {fill: LIME})}>
					{p.text}
				</text>
			);
		case 'logo':
			if (body) return <LogoMark size={h} t={s.t} color={LIME} />;
			return <rect x={-w / 2 - 14} y={-h / 2 - 22} width={w + 28} height={h + 36} rx={26} {...look(mode, {})} />;
		case 'button':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} {...look(mode, {fill: LIME})} />
					{body ? (
						<text x={0} y={7} textAnchor="middle" fontFamily={UI_FONT} fontWeight={800} fontSize={21} fill={KEY}>
							{p.text}
						</text>
					) : null}
				</g>
			);
		case 'bubble': {
			const tail = p.sent
				? `M${w / 2 - 4},${h / 2 - 14} L${w / 2 + 6},${h / 2} L${w / 2 - 18},${h / 2 - 2} Z`
				: `M${-w / 2 + 4},${h / 2 - 14} L${-w / 2 - 6},${h / 2} L${-w / 2 + 18},${h / 2 - 2} Z`;
			// her own message is solid lime; the friends' are lime frames with their words in paper
			const fill = p.sent ? {fill: LIME} : OUTLINE(3);
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22} {...look(mode, fill)} />
					<path d={tail} {...(mode === 'edge' ? {fill: 'none'} : look(mode, {fill: LIME}))} />
					{body ? (
						<text x={0} y={6} textAnchor="middle" fontFamily={UI_FONT} fontWeight={600} fontSize={18} fill={p.sent ? KEY : PAPER}>
							{p.text}
						</text>
					) : null}
				</g>
			);
		}
		case 'badge':
			return (
				<g>
					<circle r={h / 2} {...look(mode, {fill: LIME})} />
					{body ? (
						<text x={0} y={8} textAnchor="middle" fontFamily={UI_FONT} fontWeight={800} fontSize={24} fill={KEY}>
							{p.text}
						</text>
					) : null}
				</g>
			);
		case 'pill':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} {...look(mode, OUTLINE(3))} />
					{body ? (
						<g>
							<circle cx={-w / 2 + 30} cy={0} r={16} fill="none" stroke={LIME} strokeWidth={3.5} />
							<circle cx={-w / 2 + 30} cy={0} r={9} fill={LIME} />
							<text x={-w / 2 + 56} y={7} fontFamily={UI_FONT} fontWeight={700} fontSize={20} fill={PAPER}>
								{p.text}
							</text>
						</g>
					) : null}
				</g>
			);
		case 'moon':
			return <path d={MOON_D} transform={`scale(${h / 20}) translate(-12 -12)`} {...look(mode, {fill: LIME})} />;
		case 'toggle':
			return (
				<g>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} {...look(mode, {fill: LIME})} />
					{body ? <circle cx={w / 2 - h / 2} cy={0} r={h / 2 - 7} fill={KEY} /> : null}
				</g>
			);
		case 'seen':
			return (
				<text x={0} y={10} textAnchor="middle" fontFamily={UI_FONT} fontWeight={600} fontSize={28} {...look(mode, {fill: LIME})}>
					{p.text}
				</text>
			);
		case 'spinner': {
			const r = h / 2 - 6;
			const arc = `M0,${-r} A${r},${r} 0 1 1 ${-r},0`;
			if (mode === 'sil') return <path d={arc} fill="none" stroke={sil.ink} strokeWidth={14 + sil.grow} strokeLinecap="round" />;
			if (mode === 'edge') return <path d={arc} fill="none" stroke={LIME} strokeWidth={edgeW} vectorEffect="non-scaling-stroke" />;
			return (
				<g transform={`rotate(${(s.t * 540) % 360})`}>
					<circle r={r} fill="none" stroke={LIME} strokeOpacity={0.35} strokeWidth={10} />
					<path d={arc} fill="none" stroke={LIME} strokeWidth={10} strokeLinecap="round" />
				</g>
			);
		}
		case 'avatar':
			return (
				<g>
					<circle r={h / 2} {...look(mode, OUTLINE(5))} />
					{body ? <circle cy={-7} r={h * 0.15} fill={PAPER} /> : null}
					{body ? (
						<path d={`M${-h * 0.27},${h * 0.3} Q0,${h * 0.02} ${h * 0.27},${h * 0.3}`} fill="none" stroke={PAPER} strokeWidth={6} strokeLinecap="round" />
					) : null}
				</g>
			);
	}
};

/** A slug set in Plex Mono straight into the SVG (title blocks, callout numbers). */
export const MonoText: React.FC<{
	x: number;
	y: number;
	size: number;
	fill: string;
	children: React.ReactNode;
	anchor?: 'start' | 'middle' | 'end';
	spacing?: number;
	opacity?: number;
}> = ({x, y, size, fill, children, anchor = 'start', spacing = 0.12, opacity}) => (
	<text x={x} y={y} fontFamily={MONO} fontWeight={500} fontSize={size} letterSpacing={size * spacing} textAnchor={anchor} fill={fill} opacity={opacity}>
		{children}
	</text>
);
