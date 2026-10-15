import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {bt} from '../timing';
import {TokTicLogo} from '../ui/TokTicLogo';
import {useDensities} from './density';
import {ANTON, INK, MONO, SERIF} from './ink';
import {clamp01, easeIn, easeInOut, easeOut, ecg, inked, lerp} from './kit';
import {Cam, Plate, Sheet, sheetMatrix} from './press';
import {KeepsakePrint} from './s_keepsake';
import {CamLayer, OnSheet, Paper, PaperFill, Press} from './Press';
import {VMap} from './stage';

// 3:21.9 to the end card: sunrise as a split fountain (the night's ultramarine pushed off the top of the sheet by
// the warm ink), the morning-after postcards and TokTic's last stub (0 MIN · BATTERY 100%), the living line drawn
// by hand in the same orange grease pencil that circled her on the keepsake, and the letterpress end card.

type Pt = [number, number];
type Photo = {
	map: string;
	crop?: [number, number, number, number];
	/** Dawn: the fountain's cold/heat line, as a fraction of the sheet height, at the cut and at the next cut. */
	split?: [number, number];
	/** Postcard: the face-down phones in image fractions, overprinted as one solid key slab. */
	stack?: Pt[];
};

/** The outro's photos. Every value below was read off the real still on a u/v grid. */
const PHOTOS: Record<string, Photo> = {
	P50: {map: 'P50', split: [0.53, 0.46]}, // the horizon at v 0.39: the warm ink holds the roofs, the night the sky
	P51: {map: 'P51', split: [0.36, 0.29]}, // her head v 0.15-0.43 (eye 0.30): the blend crosses her face and warms it as it rises
	P52: {map: 'P52', split: [0.4, 0.34]}, // the sky gap between the buildings, above v 0.3
	P53: {
		map: 'P53',
		// the face-down pile (u 0.307-0.637, v 0.375-0.766), its silhouette including the lit charging ends
		stack: [
			[0.307, 0.442],
			[0.317, 0.422],
			[0.394, 0.377],
			[0.409, 0.375],
			[0.629, 0.462],
			[0.637, 0.478],
			[0.637, 0.714],
			[0.631, 0.735],
			[0.561, 0.765],
			[0.552, 0.766],
			[0.313, 0.627],
			[0.309, 0.606],
		],
	},
	// all five asleep: cropped in so the faces read on the card (Sam's curls from u 0.068, Dev's face down to v 0.69)
	P54: {map: 'P54', crop: [0.06, 0.11, 0.79, 0.84]},
};
const photo = (id: string): Photo => PHOTOS[id];

const FR = 1 / 30;

/* ------------------------------------------------------------------------------------------------------------- */
/* Dawn: three photos, a cut every 2 beats (the outro has no kick); the key plate pulls on the beat between.       */

const DAWN = [
	{id: 'P50', t: F.dawn, key: bt(109, 2), from: [-30, 6] as Pt, seed: 50}, // 201.921, key 202.420
	{id: 'P51', t: bt(109, 3), key: bt(109, 4), from: [0, -26] as Pt, seed: 51}, // 202.931, key 203.442
	{id: 'P52', t: bt(110), key: bt(110, 2), from: [30, 6] as Pt, seed: 52}, // 203.964, key 204.428
];
const RISE = bt(110, 3); // 204.881: the split line rises, the warm ink takes the whole sheet
const RISE_END = bt(110, 4); // 205.334
const BLEND = 0.15; // half-width of the fountain's blend, in sheet heights

/** Where the cold/heat line sits on the current dawn photo (sheet-height fraction from the top). */
const dawnSplit = (t: number, i: number): number => {
	const p = photo(DAWN[i].id);
	const [s0, s1] = p.split ?? [0.5, 0.45];
	if (i < 2) return lerp(s0, s1, clamp01((t - DAWN[i].t) / (DAWN[i + 1].t - DAWN[i].t)));
	const drift = lerp(s0, s1, clamp01((t - DAWN[i].t) / (RISE - DAWN[i].t)));
	return lerp(drift, -0.42, easeInOut((t - RISE) / (RISE_END - RISE + 0.06)));
};

/**
 * Split fountain: recolours everything already on the canvas with one roller's ink, ultramarine at the top of the
 * sheet melting into orange below the line (the gradient is attached to the sheet, through the camera).
 */
const fountain = (ctx: CanvasRenderingContext2D, sheet: Sheet, cam: Cam, W: number, H: number, split: number) => {
	const m = sheetMatrix(sheet, cam, W, H);
	// the gradient runs along the sheet's own vertical from y = -h to y = 2h, so the line can leave the sheet
	const at = (y: number): Pt => [m[2] * y + m[4], m[3] * y + m[5]];
	const [ax, ay] = at(-sheet.h);
	const [bx, by] = at(2 * sheet.h);
	const off = (v: number) => clamp01((v + 1) / 3);
	const g = ctx.createLinearGradient(ax, ay, bx, by);
	g.addColorStop(0, INK.cold);
	g.addColorStop(off(split - BLEND), INK.cold);
	g.addColorStop(off(split + BLEND), INK.heat);
	g.addColorStop(1, INK.heat);
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-atop';
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	ctx.restore();
};

export const Dawn: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(DAWN.map((s) => photo(s.id).map));
	let i = 0;
	while (i + 1 < DAWN.length && DAWN[i + 1].t <= t) i++;
	const cut = DAWN[i];
	const p = photo(cut.id);
	// each cut lands a touch large and off-centre, and settles in a third of a second
	const e = easeOut((t - cut.t) / 0.34);
	const cam: Cam = {cx: 960 - cut.from[0] * (1 - e), cy: 540 - cut.from[1] * (1 - e), s: lerp(1.045, 1, e)};
	const sheet = (plates: Plate[]): Sheet | null => (d ? {map: d[p.map], crop: p.crop, w: 2000, h: 1116, cx: 960, cy: 540, seed: cut.seed, speckle: 0.45, plates} : null);
	const tone = sheet([{ch: 2, ink: INK.cold, angle: 15, cell: 8.5, gain: 1.04, gamma: 1.15}]);
	// the key plate pulls on the off-beat, a few px out of register, and snaps in
	const kk = (t - cut.key) / 0.15;
	const miss = 1 - easeOut(kk);
	const key = kk >= 0 ? sheet([{ch: 0, ink: INK.key, angle: 45, cell: 8.5, gain: 0.68, gamma: 1.45, dx: 20 * miss, dy: -11 * miss}]) : null;
	const split = dawnSplit(t, i);
	return (
		<AbsoluteFill>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{tone && <Press cam={cam} sheets={[tone]} draw={(ctx, W, H) => fountain(ctx, tone, cam, W, H, split)} />}
			{key && <Press cam={cam} sheets={[key]} />}
			{/* the keepsake leaves on the cut by itself (keepPose: 2500 px left in 0.42 s) and then renders nothing */}
			<KeepsakePrint t={t} />
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------- */
/* Postcards: the morning after, dealt on the beat, and TokTic's stub counting last night's screen time to zero.  */

const IMG = {w: 896, h: 500};
const BORDER = 22;
const FOOT = 76; // the caption strip under the picture

type Card = {
	id: string;
	t: number;
	cx: number;
	cy: number;
	rot: number;
	from: [number, number, number];
	/** where it lands while it is alone on the table; the stub's arrival shoves it to (cx, cy, rot) */
	first?: [number, number, number];
	caption: string;
	seed: number;
};
const CARDS: Card[] = [
	// 205.787: the stack still face-down on the counter, the bottom phone still on its charger
	{id: 'P53', t: F.screenTime, cx: 580, cy: 574, rot: -4, first: [900, 548, -2.5], from: [-820, 560, -16], caption: '8:52 am, still face down', seed: 53},
	// 207.714: dealt on top, all five asleep on the same sofa
	{id: 'P54', t: bt(112), cx: 772, cy: 494, rot: 3, from: [-520, -900, 13], caption: '9:14 am, everyone', seed: 54},
];

/** A card dealt onto the table: it is most of the way in on its beat frame and lands four frames later. */
const deal = (t: number, c: Card) => {
	const k = clamp01((t - (c.t - FR)) / 0.16);
	const e = easeOut(k);
	const land = clamp01((t - (c.t + 0.12)) / 0.2);
	const shove = c.first ? easeOut((t - (STUB_IN - FR)) / 0.2) : 1;
	const [bx, by, br] = c.first ? [lerp(c.first[0], c.cx, shove), lerp(c.first[1], c.cy, shove), lerp(c.first[2], c.rot, shove)] : [c.cx, c.cy, c.rot];
	return {on: t >= c.t, cx: bx + c.from[0] * (1 - e), cy: by + c.from[1] * (1 - e), rot: br + c.from[2] * (1 - e), s: 1 + 0.035 * (1 - easeOut(land)) + 0.06 * (1 - e), land};
};

const PostcardPrint: React.FC<{t: number; c: Card; map: Sheet['map'] | null}> = ({t, c, map}) => {
	const pl = deal(t, c);
	if (!pl.on) return null;
	const p = photo(c.id);
	const sh = {w: IMG.w, h: IMG.h, cx: pl.cx, cy: pl.cy, s: pl.s, rot: pl.rot};
	const lift = 1 - pl.land;
	const sheet: Sheet | null = map
		? {map, crop: p.crop, ...sh, seed: c.seed, speckle: 0.4, plates: [{ch: 1, ink: INK.heat, angle: 15, cell: 6, dx: 1, dy: -0.5}, {ch: 0, ink: INK.key, angle: 45, cell: 6, gain: 0.8, gamma: 1.3}]}
		: null;
	const [x0, y0, x1, y1] = p.crop ?? [0, 0, 1, 1];
	return (
		<>
			<OnSheet sheet={sh}>
				<div
					style={{
						position: 'absolute',
						left: -BORDER,
						top: -BORDER,
						width: IMG.w + BORDER * 2,
						height: IMG.h + BORDER + FOOT,
						background: '#FBF8F1',
						boxShadow: `0 ${4 + 30 * lift}px ${8 + 46 * lift}px rgba(60,40,20,${0.26 + 0.08 * lift})`,
					}}
				>
					<div style={{position: 'absolute', left: BORDER + 2, bottom: 18, fontFamily: SERIF, fontStyle: 'italic', fontSize: 34, color: INK.key, opacity: 0.88, mixBlendMode: 'multiply', ...inked(700, 13, 5)}}>
						{c.caption}
					</div>
				</div>
			</OnSheet>
			{sheet && (
				<Press
					sheets={[sheet]}
					draw={(ctx, W, H) => {
						if (!p.stack) return;
						// the pile of phones overprinted as one flat key slab: the screens are dead to them
						const m = sheetMatrix(sheet, {cx: 960, cy: 540, s: 1}, W, H);
						ctx.save();
						ctx.globalCompositeOperation = 'multiply';
						ctx.globalAlpha = 0.97;
						ctx.fillStyle = INK.key;
						ctx.beginPath();
						p.stack.forEach(([u, v], n) => {
							const x = ((u - x0) / (x1 - x0)) * IMG.w;
							const y = ((v - y0) / (y1 - y0)) * IMG.h;
							const X = m[0] * x + m[2] * y + m[4];
							const Y = m[1] * x + m[3] * y + m[5];
							if (n) ctx.lineTo(X, Y);
							else ctx.moveTo(X, Y);
						});
						ctx.closePath();
						ctx.fill();
						ctx.restore();
					}}
				/>
			)}
		</>
	);
};

// the stub: TokTic's own ink (lime) lives only here
const STUB_IN = bt(111, 2); // 206.240
const COUNT: [number, string][] = [
	[bt(111, 2), '214'], // 206.240, lands with the stub
	[bt(111, 3), '150'], // 206.692
	[bt(111, 4), '90'], // 207.145
	[bt(112), '40'], // 207.714 (with P54)
	[bt(112, 2), '10'], // 208.283
	[bt(112, 3), '0'], // 208.794: 0 MIN · BATTERY 100%
];
const ZERO = bt(112, 3);
const STUB = {w: 440, h: 760, cx: 1520, cy: 540, rot: 2.2, scale: 1.06};

/** The minutes, rolling up one step per beat like a counter (old figure out the top, new one in from below); zero stamps. */
const Roll: React.FC<{t: number; size: number}> = ({t, size}) => {
	let j = 0;
	while (j + 1 < COUNT.length && COUNT[j + 1][0] <= t) j++;
	const H = size * 1.02;
	const box: React.CSSProperties = {position: 'relative', height: H, fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: '-0.05em', color: INK.cold};
	const line = (txt: string, y: number, o: number, s = 1) => (
		<div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: H, lineHeight: `${H}px`, transform: `translateY(${y}px) scale(${s})`, transformOrigin: '18% 55%', opacity: o, whiteSpace: 'nowrap'}}>{txt}</div>
	);
	if (j === COUNT.length - 1) {
		// 0: no roll, it hits like a stamp so it reads in the six frames before the cut
		const k = easeOut((t - COUNT[j][0] + FR) / 0.12);
		return <div style={box}>{line(COUNT[j][1], 0, 1, 1.32 - 0.32 * k)}</div>;
	}
	const k = easeOut((t - COUNT[j][0] + 1.5 * FR) / 0.09); // a flick: nearly done on the beat frame
	const hit = 1 - easeOut((t - COUNT[j][0]) / 0.16);
	return (
		<div style={{...box, overflow: 'hidden'}}>
			{j > 0 && k < 1 && line(COUNT[j - 1][1], -k * H * 0.9, 1 - k)}
			{line(COUNT[j][1], (1 - k) * H * 0.9, 1, 1 + 0.06 * hit)}
		</div>
	);
};

const Perf: React.FC<{w: number; y: number; flip?: boolean}> = ({w, y, flip}) => {
	const n = 22;
	const pts: string[] = [];
	for (let i = 0; i <= n; i++) pts.push(`${((i / n) * w).toFixed(1)},${i % 2 ? 0 : 9}`);
	pts.push(`${w},${flip ? -2 : 12}`, `0,${flip ? -2 : 12}`);
	return (
		<svg width={w} height={12} style={{position: 'absolute', left: 0, top: y, overflow: 'visible', transform: flip ? 'scaleY(-1)' : undefined}}>
			<polygon points={pts.join(' ')} fill={INK.paper} />
		</svg>
	);
};

/** A loose grease-pencil loop (the same orange pencil as the keepsake's circle), overshooting where it closes. */
const loop = (cx: number, cy: number, rx: number, ry: number): string => {
	const pts: string[] = [];
	const n = 72;
	for (let i = 0; i <= n; i++) {
		const f = i / n;
		const a = -0.95 - f * (Math.PI * 2 + 0.6);
		const r = 1 + 0.045 * Math.sin(f * 9 + 1.3) + 0.07 * f;
		pts.push(`${(cx + Math.cos(a) * rx * r).toFixed(1)},${(cy + Math.sin(a) * ry * r * (1 - 0.04 * f)).toFixed(1)}`);
	}
	return `M ${pts.join(' L ')}`;
};
const ZERO_LOOP = loop(106, 378, 122, 166);
const RING = 0.12; // the loop closes on the third frame after zero and holds closed until the cut (209.0)

const Stub: React.FC<{t: number}> = ({t}) => {
	if (t < STUB_IN - FR) return null;
	const k = easeOut((t - (STUB_IN - FR)) / 0.17);
	const zero = t >= ZERO ? 1 - easeOut((t - ZERO) / 0.22) : 0;
	// a small knock on every count step, a bigger one on zero
	let j = 0;
	while (j + 1 < COUNT.length && COUNT[j + 1][0] <= t) j++;
	const knock = Math.exp(-(t - COUNT[j][0]) / 0.07) * (j === COUNT.length - 1 ? 0 : 1);
	const x = STUB.cx + 820 * (1 - k);
	const rot = STUB.rot + 9 * (1 - k) + 0.6 * knock;
	const s = STUB.scale * (1 + 0.045 * zero);
	const lift = 1 - clamp01((t - STUB_IN) / 0.25);
	const pad = 34;
	const ink: React.CSSProperties = {position: 'absolute', left: pad, right: pad, fontFamily: MONO, color: INK.cold};
	return (
		<div
			style={{
				position: 'absolute',
				left: x - STUB.w / 2,
				top: STUB.cy - STUB.h / 2 - 5 * knock,
				width: STUB.w,
				height: STUB.h,
				transform: `rotate(${rot}deg) scale(${s})`,
				background: '#F8F5EF',
				boxShadow: `0 ${6 + 26 * lift}px ${12 + 40 * lift}px rgba(60,40,20,0.26)`,
			}}
		>
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', ...inked(640, 9, 31)}}>
				{/* TokTic's header: its own lime */}
				<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 108, background: INK.lime, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${pad}px`, boxSizing: 'border-box'}}>
					<TokTicLogo size={46} t={t} color={INK.key} />
					<div style={{fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: INK.key, textAlign: 'right', lineHeight: 1.35}}>
						SUN
						<br />
						15 JUN
					</div>
				</div>
				<div style={{...ink, top: 138, fontSize: 25, fontWeight: 500, letterSpacing: '0.16em', lineHeight: 1.3}}>
					SCREEN TIME
					<br />
					LAST NIGHT
				</div>
				<div style={{...ink, top: 222, borderTop: `3px dashed ${INK.cold}`}} />
				<div style={{...ink, top: 236}}>
					<Roll t={t} size={196} />
				</div>
				<div style={{...ink, top: 440, fontSize: 44, fontWeight: 500, letterSpacing: '0.1em'}}>MIN</div>
				<div style={{...ink, top: 520, borderTop: `3px dashed ${INK.cold}`}} />
				{/* the battery: charged all night, nobody looked */}
				<div style={{...ink, top: 552, display: 'flex', alignItems: 'center', gap: 22}}>
					<div style={{position: 'relative', width: 132, height: 62, border: `6px solid ${INK.cold}`, borderRadius: 12, boxSizing: 'border-box'}}>
						<div style={{position: 'absolute', left: 5, top: 5, bottom: 5, right: 5, background: INK.lime, borderRadius: 5}} />
						<div style={{position: 'absolute', right: -16, top: 15, width: 9, height: 20, borderRadius: '0 4px 4px 0', background: INK.cold}} />
					</div>
					<div style={{lineHeight: 1}}>
						<div style={{fontSize: 17, letterSpacing: '0.16em'}}>BATTERY</div>
						<div style={{fontSize: 46, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 4}}>100%</div>
					</div>
				</div>
				<div style={{...ink, top: 660, fontSize: 16, letterSpacing: '0.12em', opacity: 0.85}}>@maya.xo · UNREAD 99+</div>
			</div>
			{t >= ZERO && (
				// on zero a hand rings '0 MIN' in grease pencil, and the same pencil draws the living line on the cut
				<svg width={STUB.w} height={STUB.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'multiply', ...inked(520, 7, 3)}}>
					<path d={ZERO_LOOP} pathLength={1} fill="none" stroke={INK.heat} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - easeOut((t - ZERO + 0.5 * FR) / RING)} opacity={0.93} />
				</svg>
			)}
			<Perf w={STUB.w} y={-9} flip />
			<Perf w={STUB.w} y={STUB.h - 3} />
		</div>
	);
};

export const Postcard: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(CARDS.map((c) => photo(c.id).map));
	return (
		<AbsoluteFill>
			<PaperFill />
			{CARDS.map((c) => (
				<PostcardPrint key={c.id} t={t} c={c} map={d ? d[photo(c.id).map] : null} />
			))}
			<Stub t={t} />
		</AbsoluteFill>
	);
};

/* ------------------------------------------------------------------------------------------------------------- */
/* The living line: 'still dancing', drawn by hand, one heartbeat per remaining beat.                             */

const LINE_BEATS = [bt(112, 4), bt(113), bt(113, 2), bt(113, 3), bt(113, 4), bt(114)]; // 209.189 ... 211.464
const PEN = {v: 560, y: 704, amp: 176, stretch: 1.7, xEnd: 1720};
// the pen is over the middle of the frame halfway through the six blips, so they sit centred under the words
const PEN_X0 = 960 - PEN.v * ((LINE_BEATS[0] + LINE_BEATS[5]) / 2 - F.stillDancing);
const PEN_LIFT = F.stillDancing + (PEN.xEnd - PEN_X0) / PEN.v;
const penX = (tau: number) => PEN_X0 + PEN.v * (tau - F.stillDancing);

/** The line drawn up to time t: a hand-wobbled baseline with a heartbeat wherever the pen was on a beat. */
const livingPoints = (t: number): Pt[] => {
	const now = Math.min(t, PEN_LIFT);
	const head = penX(now);
	const pts: Pt[] = [];
	for (let x = PEN_X0; x <= head + 0.01; x += 2) {
		const tau = F.stillDancing + (x - PEN_X0) / PEN.v;
		let y = 0;
		for (const b of LINE_BEATS) {
			const dt = (tau - b) / PEN.stretch;
			// the pen draws each beat's lead-in (P wave, Q dip) as it passes; a beat whose P wave would start before
			// the line does (the first, 0.19 s in) begins at the Q dip instead of halfway up a bump
			const lo = b - 0.2 * PEN.stretch >= F.stillDancing ? -0.2 : -0.06;
			if (dt > lo && dt < 0.26) y += ecg(dt);
		}
		const wob = Math.sin(x * 0.019 + 0.7) * 1.8 + Math.sin(x * 0.0071 + 2.1) * 4.5 + Math.sin(x * 0.043) * 0.7;
		pts.push([x, PEN.y - y * PEN.amp + wob]);
	}
	return pts;
};

const LivingStroke: React.FC<{t: number; transform?: string; width?: number; tip?: boolean; opacity?: number}> = ({t, transform, width = 8, tip = true, opacity = 1}) => {
	const pts = livingPoints(t);
	if (pts.length < 2) return null;
	const head = pts[pts.length - 1];
	const pencil = t < PEN_LIFT;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', mixBlendMode: 'multiply', opacity, ...inked(520, 3, 11)}}>
			<g transform={transform}>
				<polyline points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={INK.heat} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.94} />
				{tip && pencil && <circle cx={head[0]} cy={head[1]} r={width * 0.85} fill={INK.heat} />}
			</g>
		</svg>
	);
};

const Words: React.FC<{t: number; opacity?: number}> = ({t, opacity = 1}) => {
	const word = (txt: string, at: number) => {
		const k = easeOut((t - at) / 0.18);
		return (
			<span style={{display: 'inline-block', opacity: t >= at ? 1 : 0, transform: `translateY(${10 * (1 - k)}px) scale(${1.05 - 0.05 * k})`, transformOrigin: '50% 80%'}}>{txt}</span>
		);
	};
	return (
		<div style={{position: 'absolute', left: 0, width: 1920, top: 236, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 176, lineHeight: 1, color: INK.key, opacity, mixBlendMode: 'multiply', ...inked(900, 40, 12)}}>
			{word('still', F.stillDancing)} {word('dancing', LINE_BEATS[1])}
		</div>
	);
};

export const LivingLine: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill>
		<PaperFill />
		<Words t={t} />
		<LivingStroke t={t} />
	</AbsoluteFill>
);

/* ------------------------------------------------------------------------------------------------------------- */
/* End card: the living line folds down into a small mark and the line is pressed into the paper.                 */

const MARK = {s: 0.24, x: 960, y: 588};
const TAG_IN = F.songEnd + 0.36;
const BRAND_IN = F.songEnd + 0.82;

/** Letterpress: ink in the bite, a shaded upper lip and a lit lower lip (px deep); the light drifts during the hold. */
const deboss = (k: number, px: number, light: number, ink: number | null): React.CSSProperties => {
	const a = ((-112 + 44 * light) * Math.PI) / 180; // light from above, swinging from upper left to upper right
	const lx = Math.cos(a) * px * k;
	const ly = Math.sin(a) * px * k; // negative: towards the top of the frame
	const sh = (x: number, y: number, blur: number, c: string) => `${x.toFixed(2)}px ${y.toFixed(2)}px ${blur}px ${c}`;
	return {
		color: ink === null ? `rgba(110,88,56,${(0.15 * k).toFixed(3)})` : `rgba(27,26,23,${(0.9 * ink).toFixed(3)})`,
		textShadow: [
			sh(lx, ly, 0.7, `rgba(80,60,32,${(0.36 * k).toFixed(3)})`), // the upper wall, in shade
			sh(-lx, -ly, 0.5, `rgba(255,253,246,${(0.92 * k).toFixed(3)})`), // the lower wall, catching the light
			sh(-lx * 2, -ly * 2, 2, `rgba(255,252,242,${(0.3 * k).toFixed(3)})`),
		].join(', '),
	};
};

export const EndCard: React.FC<{t: number}> = ({t}) => {
	const fold = easeInOut((t - F.songEnd) / 0.5);
	const s = lerp(1, MARK.s, fold);
	// the line's bounding box centre (drawn: x PEN_X0..xEnd, baseline PEN.y, blips up to PEN.amp)
	const cx = (PEN_X0 + PEN.xEnd) / 2;
	const cy = PEN.y - PEN.amp * 0.45;
	const tx = lerp(cx, MARK.x, fold);
	const ty = lerp(cy, MARK.y, fold);
	const out = 1 - easeIn((t - (F.endCardOut - 0.7)) / 0.7);
	const light = clamp01((t - F.songEnd) / (F.endCardOut - F.songEnd));
	const press = (at: number) => {
		const k = clamp01((t - at) / 0.2);
		return {depth: easeOut(k) * out, ink: clamp01((t - at) / (2 * FR)) * out, s: 1.012 - 0.012 * easeOut(k)};
	};
	const tag = press(TAG_IN);
	const brand = press(BRAND_IN);
	return (
		<AbsoluteFill>
			<PaperFill />
			<Words t={t} opacity={1 - clamp01((t - F.songEnd) / 0.22)} />
			<LivingStroke t={t} tip={false} width={lerp(8, 3.4, fold)} opacity={out} transform={`translate(${tx} ${ty}) scale(${s}) translate(${-cx} ${-cy})`} />
			<div style={{position: 'absolute', left: 0, width: 1920, top: 380, textAlign: 'center', fontFamily: SERIF, fontSize: 104, lineHeight: 1, transform: `scale(${tag.s})`, opacity: t >= TAG_IN ? 1 : 0, ...deboss(tag.depth, 1.5, light, tag.ink)}}>
				You don’t have to die to wake up.
			</div>
			<div style={{position: 'absolute', left: 0, width: 1920, top: 660, textAlign: 'center', fontFamily: ANTON, fontSize: 54, lineHeight: 1, letterSpacing: '0.42em', textIndent: '0.42em', transform: `scale(${brand.s})`, opacity: t >= BRAND_IN ? 1 : 0, ...deboss(brand.depth, 2.2, light, null)}}>
				PROJECT PROFOUND
			</div>
		</AbsoluteFill>
	);
};

/** The 9:16 cut: each section's reframing camera over the 16:9 stage, and any vertical-only layer (see stage.tsx). */
export const V: VMap = {};
