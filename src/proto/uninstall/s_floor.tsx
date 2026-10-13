import React from 'react';
import {F} from '../../full/cues';
import {UI_FONT} from '../../theme';
import {BEATS, bt, lastBeatIndex} from '../../timing';
import {LogoMark} from './parts';
import {H, HEART_D, Neon, Plane, Stage, U, W, WorldWindow, beatTimes, clamp01, inCubic, lerp, mix, outBack, outCubic, planeRect, rnd, seg, since, smooth} from './lib';

// 1:56.1 → 2:12.2  PHONES OFF, BURN HOLES (S5) · THE FEED BECOMES THE FLOOR · SETTINGS

const S5: Plane = {id: 'S5', z: 1.0};

// each friend's phone and face in S5 (fractions of the image), in switch-off order
const FRIENDS = [
	{phone: [0.62, 0.605], face: [0.574, 0.45], tilt: -12},
	{phone: [0.367, 0.714], face: [0.258, 0.46], tilt: -18},
	{phone: [0.887, 0.58], face: [0.84, 0.45], tilt: -16},
	{phone: [0.5, 0.61], face: [0.426, 0.45], tilt: -20},
	{phone: [0.797, 0.605], face: [0.734, 0.42], tilt: -14},
];

/** A tiny live TokTic screen in a friend's hand; switches off like an old CRT. */
const TinyScreen: React.FC<{x: number; y: number; tilt: number; t: number; off: number}> = ({x, y, tilt, t, off}) => {
	const d = t - off;
	if (d > 0.16) return <circle cx={x} cy={y} r={2} fill={U.lime} opacity={Math.max(0, 1 - (d - 0.16) / 0.25)} />;
	let sx = 1;
	let sy = 1;
	if (d >= 0) {
		sy = Math.max(0.03, 1 - d / 0.07);
		sx = d < 0.07 ? 1 : Math.max(0.05, 1 - (d - 0.07) / 0.09);
	}
	const w = 34;
	const h = 60;
	const scroll = (t * 40) % 20;
	return (
		<g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${sx} ${sy})`}>
			<rect x={-w / 2 - 14} y={-h / 2 - 14} width={w + 28} height={h + 28} rx={18} fill="#6FA0FF" opacity={0.18} />
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5} fill={d >= 0 ? U.lime : '#DCE6FF'} />
			{d < 0 ? (
				<g>
					<rect x={-w / 2 + 3} y={-h / 2 + 4} width={w - 6} height={6} rx={2} fill={U.bg} />
					{[0, 1, 2].map((k) => (
						<rect key={k} x={-w / 2 + 3} y={-h / 2 + 14 + k * 20 - scroll} width={w - 6} height={15} rx={2} fill={k % 2 ? '#8FA6D9' : '#5E78B8'} />
					))}
				</g>
			) : null}
		</g>
	);
};

export const CouchScene: React.FC<{t: number}> = ({t}) => {
	const r = planeRect(S5);
	const drop = outCubic(seg(t, F.couch, F.couch + 0.35));
	const lineY = lerp(H / 2, H - 2, drop);
	const swipe = inCubic(seg(t, bt(65, 2), bt(65, 2) + 0.32)) * H;
	const drift = Math.sin(t * 0.7) * 6;
	return (
		<g transform={`translate(0 ${swipe})`}>
			<rect width={W} height={H} fill="#000" />
			{/* the room under a TokTic-dark layer: barely there */}
			<WorldWindow plane={S5} grade="cool" opacity={0.1}>
				<rect width={W} height={H} fill="#fff" />
			</WorldWindow>
			{/* cold blue glow on the faces while the phones are on */}
			<WorldWindow plane={S5} grade="cool" feather={40}>
				{FRIENDS.map((fr, i) => {
					const on = t < F.glowsOff[i] ? 1 : Math.exp(-(t - F.glowsOff[i]) / 0.08);
					const [fx, fy] = r.at(fr.face[0], fr.face[1]);
					return <ellipse key={i} cx={fx + 10} cy={fy + 50} rx={95} ry={140} fill="#fff" opacity={0.55 * on} />;
				})}
			</WorldWindow>
			{/* a warm hole burns open around each friend as their phone dies */}
			<g transform={`translate(${drift} 0)`}>
				<WorldWindow plane={S5} feather={30}>
					{FRIENDS.map((fr, i) => {
						const off = F.glowsOff[i];
						if (t < off) return null;
						const [fx, fy] = r.at(fr.face[0], fr.face[1] + 0.08);
						const gap = (BEATS[lastBeatIndex(off) + 1]?.t ?? off + 0.46) - off;
						const grow = outCubic((t - off) / gap);
						const merge = seg(t, bt(64, 3), bt(65));
						return <circle key={i} cx={fx - drift} cy={fy} r={lerp(30, 230, grow) + 160 * merge} fill="#fff" />;
					})}
				</WorldWindow>
			</g>
			{FRIENDS.map((fr, i) => {
				const [px, py] = r.at(fr.phone[0], fr.phone[1]);
				return <TinyScreen key={i} x={px} y={py} tilt={fr.tilt} t={t} off={F.glowsOff[i]} />;
			})}
			<Neon d={`M0,${lineY} L${W},${lineY}`} color={U.lime} width={3} opacity={1 - seg(t, F.couch + 0.4, F.couch + 1.2)} />
		</g>
	);
};

// ---------------------------------------------------------------- the floor: the opening's feed laid flat

const HANDLES = ['kai.mp4', 'jess.wav', 'nia.gif', 'dev.zip', 'sam.png'];
const FOCAL = 950;
const CAM = 1.55;
const HORIZON = 300;
const COLS = 7;
const TILE = 1.0;
const PITCH = 1.12;

const project = (X: number, Z: number): [number, number] => [W / 2 + (X * FOCAL) / Z, HORIZON + (CAM * FOCAL) / Z];

const FLOOR_BEATS = beatTimes(F.join, F.light + 2);

/** How far the feed has rolled toward camera (one post per beat, eased). */
const rollAt = (t: number) => {
	const {i, dt} = since(t, FLOOR_BEATS);
	if (i < 0) return 0;
	return i + outCubic(dt / 0.22);
};

type Pool = {label: string; maya?: boolean};
const POOLS: Pool[] = [...HANDLES.map((label) => ({label})), {label: 'maya.xo', maya: true}];

/** Pool positions on the floor (world X, Z). They glide into a ring round Maya by 66.1, then turn a quarter per bar. */
const poolPos = (i: number, t: number): [number, number] => {
	const centre: [number, number] = [0, 5.2];
	if (POOLS[i].maya) return [centre[0] + Math.sin(t * 0.8) * 0.15, centre[1]];
	const start: [number, number] = [(rnd(`px${i}`) - 0.5) * 7, 3.5 + rnd(`pz${i}`) * 9];
	const ringA = (i / 5) * Math.PI * 2;
	const barsSince = Math.max(0, (t - bt(66)) / (bt(67) - bt(66)));
	const quarter = Math.floor(barsSince) + outCubic(seg(barsSince % 1, 0, 0.25));
	const a = ringA + (quarter * Math.PI) / 2;
	const ring: [number, number] = [centre[0] + Math.cos(a) * 2.1, centre[1] + Math.sin(a) * 1.7];
	// glide in on the beats of bar 65
	const steps = beatTimes(bt(65), bt(66) + 0.01);
	const {i: si, dt} = since(t, steps);
	const k = si < 0 ? 0 : clamp01((si + outBack(dt / 0.25, 1.2)) / steps.length);
	return [lerp(start[0], ring[0], k), lerp(start[1], ring[1], k)];
};

export const FloorLayer: React.FC<{t: number; dim?: number}> = ({t, dim = 1}) => {
	const roll = rollAt(t);
	const {i: bi, dt: bdt} = since(t, FLOOR_BEATS);
	const groove = t >= F.groove;
	const lightBeat = bi >= 0 && (!groove || bi % 2 === 0);
	const env = lightBeat ? 0.25 + 0.75 * Math.exp(-bdt / 0.28) : 0.12;
	const heartPop = bi >= 0 ? Math.exp(-bdt / 0.12) : 0;
	const pattern = Math.max(0, bi) % 3;
	const tiles: React.ReactNode[] = [];
	const rowShift = roll % 1;
	const base = Math.floor(roll);
	for (let r = 30; r >= 0; r--) {
		const Z0 = 1.3 + r * PITCH - rowShift * PITCH;
		if (Z0 < 0.6) continue;
		const Z1 = Z0 + TILE;
		const absRow = r + base;
		for (let c = 0; c < COLS; c++) {
			const X0 = (c - COLS / 2) * PITCH + (PITCH - TILE) / 2;
			const X1 = X0 + TILE;
			const pts = [project(X0, Z0), project(X1, Z0), project(X1, Z1), project(X0, Z1)];
			const far = clamp01((Z0 - 2) / 26);
			const lit =
				pattern === 0 ? (c + absRow + bi) % 3 === 0 : pattern === 1 ? (c - absRow + bi + 60) % 4 === 0 : (c * 7 + absRow * 3 + bi) % 5 === 0;
			const amber = lit ? env * (1 - far * 0.5) : 0;
			const fill = amber > 0.02 ? mix('#10131A', U.amber, amber * 0.85) : '#0E1117';
			tiles.push(
				<g key={`${r}-${c}`}>
					<polygon points={pts.map((p) => p.join(',')).join(' ')} fill={fill} stroke={amber > 0.02 ? U.amber : U.lime} strokeWidth={1.2} strokeOpacity={(amber > 0.02 ? 0.9 : 0.32) * (1 - far)} />
					{Z0 < 9 ? (() => {
						// the post's heart-and-count row
						const [hx, hy] = project(X0 + 0.12, Z0 + 0.1);
						const s = (0.11 * FOCAL) / Z0 / 24;
						return (
							<g>
								<path d={HEART_D} transform={`translate(${hx} ${hy - 10 * s}) scale(${s * (1 + 0.5 * heartPop)}) translate(-12 -12)`} fill={U.pink} opacity={0.5 + 0.5 * heartPop} />
								<polygon points={[project(X0 + 0.24, Z0 + 0.06), project(X0 + 0.55, Z0 + 0.06), project(X0 + 0.55, Z0 + 0.14), project(X0 + 0.24, Z0 + 0.14)].map((p) => p.join(',')).join(' ')} fill={U.muted} opacity={0.5} />
							</g>
						);
					})() : null}
				</g>,
			);
		}
	}
	return (
		<g opacity={dim}>
			<defs>
				<radialGradient id="pool-amber">
					<stop offset="0" stopColor={U.amber} stopOpacity={0.85} />
					<stop offset="0.5" stopColor={U.amber} stopOpacity={0.35} />
					<stop offset="1" stopColor={U.amber} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="pool-cream">
					<stop offset="0" stopColor={U.cream} stopOpacity={0.95} />
					<stop offset="0.5" stopColor={U.cream} stopOpacity={0.4} />
					<stop offset="1" stopColor={U.cream} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect width={W} height={H} fill="#07080B" />
			{tiles}
			{/* light pools gliding on the floor */}
			{POOLS.map((p, i) => {
				const [X, Z] = poolPos(i, t);
				const [x, y] = project(X, Z);
				const R = 1.5;
				const rx = (R * FOCAL) / Z;
				const ry = (R * CAM * FOCAL) / (Z * Z);
				const joined = seg(t, bt(65, 4), bt(66, 2));
				return (
					<g key={i} style={{mixBlendMode: 'screen'}}>
						<ellipse cx={x} cy={y} rx={rx * 1.5} ry={ry * 1.5} fill={`url(#${p.maya ? 'pool-cream' : 'pool-amber'})`} opacity={0.9} />
						<text x={x} y={y - ry * 1.1 - 10} textAnchor="middle" fontFamily={UI_FONT} fontWeight={600} fontSize={Math.max(16, (0.32 * FOCAL) / Z)} fill={p.maya ? U.cream : U.amber} opacity={p.maya ? 1 : 1 - joined}>
							{p.label}
						</text>
					</g>
				);
			})}
			<defs>
				<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#000" stopOpacity={1} />
					<stop offset="0.8" stopColor={U.amber} stopOpacity={0.06 + 0.08 * env} />
					<stop offset="1" stopColor={U.amber} stopOpacity={0.12 + 0.1 * env} />
				</linearGradient>
			</defs>
			<rect width={W} height={HORIZON} fill="url(#haze)" />
			<Neon d={`M0,${HORIZON} L${W},${HORIZON}`} color={U.lime} width={2.5} />
		</g>
	);
};

const Crumble: React.FC<{t: number; at: number; x: number; y: number; w: number; h: number}> = ({t, at, x, y, w, h}) => {
	const d = t - at;
	if (d < 0 || d > 1.2) return null;
	return (
		<g>
			{Array.from({length: 90}).map((_, i) => {
				const px = x - w / 2 + rnd(`cx${i}`) * w;
				const py = y - h / 2 + rnd(`cy${i}`) * h;
				const delay = ((px - (x - w / 2)) / w) * 0.25;
				const dd = Math.max(0, d - delay);
				const vx = (rnd(`cvx${i}`) - 0.3) * 260;
				const vy = -80 + rnd(`cvy${i}`) * 60;
				return <rect key={i} x={px + vx * dd} y={py + vy * dd + 700 * dd * dd} width={7} height={7} fill={i % 7 === 0 ? U.lime : U.surface2} opacity={1 - clamp01(dd / 0.9)} />;
			})}
		</g>
	);
};

export const FloorScene: React.FC<{t: number}> = ({t}) => {
	const cardIn = outBack(seg(t, F.join, F.join + 0.25), 1.5);
	const crumble = bt(65, 2);
	return (
		<Stage>
			<FloorLayer t={t} />
			{t < bt(65, 2) + 0.4 ? <CouchScene t={t} /> : null}
			{t >= F.join && t < crumble ? (
				<g transform={`translate(${W / 2} ${110 + 90 * cardIn}) scale(1.6)`} opacity={cardIn}>
					<rect x={-230} y={-42} width={460} height={84} rx={24} fill="rgba(29,34,48,0.97)" stroke="rgba(255,255,255,0.08)" />
					<g transform="translate(-196 0)">
						<rect x={-20} y={-20} width={40} height={40} rx={11} fill="#0E1016" stroke={U.surface2} />
						<circle r={8} fill="none" stroke={U.lime} strokeWidth={2.6} />
					</g>
					<text x={-160} y={-12} fontFamily={UI_FONT} fontSize={12} fontWeight={600} letterSpacing={0.6} fill={U.muted}>
						TOKTIC
					</text>
					<text x={-160} y={10} fontFamily={UI_FONT} fontSize={17} fontWeight={600} fill={U.text}>
						5 friends went offline
					</text>
					<text x={-160} y={30} fontFamily={UI_FONT} fontSize={14} fill="#C9CEDA">
						Tap to see what you missed
					</text>
				</g>
			) : null}
			<Crumble t={t} at={crumble} x={W / 2} y={110 + 90} w={460 * 1.6} h={84 * 1.6} />
		</Stage>
	);
};

// ---------------------------------------------------------------- 2:08 Settings

type Row = {label: string; at: number};
const ROWS: Row[] = [
	{label: 'Pain', at: F.noWords[0]},
	{label: 'Fear', at: F.noWords[1]},
	{label: 'Clock', at: F.noWords[2]},
	{label: 'Name', at: F.noWords[3]},
];
const ROW_H = 172;
const SHEET_X = 560;
const SHEET_W = 800;

const Toggle: React.FC<{x: number; y: number; on: number; pop: number}> = ({x, y, on, pop}) => {
	const w = 168;
	const h = 96;
	return (
		<g transform={`translate(${x} ${y}) scale(${1 + 0.1 * pop})`}>
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={mix('#3A3F4C', U.lime, on)} />
			<circle cx={-w / 2 + h / 2 + (w - h) * on} cy={0} r={h / 2 - 8} fill="#fff" />
		</g>
	);
};

export const SettingsScene: React.FC<{t: number}> = ({t}) => {
	const up = outBack(seg(t, F.groove, F.groove + 0.35), 1.1);
	const sheetY = lerp(H + 40, 62, up);
	const offs = ROWS.filter((r) => t >= r.at).length;
	const frost = lerp(24, 8, offs / 4);
	const light = F.light;
	const flood = seg(t, light + 0.18, light + 0.43);
	let y = sheetY + 190;
	const rows: React.ReactNode[] = [];
	ROWS.forEach((r, i) => {
		const d = t - r.at;
		const on = d < 0 ? 1 : 1 - outCubic(d / 0.18);
		const pop = d < 0 ? 0 : Math.exp(-d / 0.12) * Math.sin(Math.min(d, 0.3) * 30);
		const grey = seg(d, 0.1, 0.25);
		const collapse = smooth(seg(d, 0.48, 0.78));
		const h = ROW_H * (1 - collapse);
		let label = r.label;
		if (r.label === 'Fear' && d > 0.05) label = r.label.slice(0, Math.max(0, 4 - Math.floor((d - 0.05) / 0.07)));
		if (h > 1) {
			rows.push(
				<g key={r.label} opacity={1 - collapse} transform={`translate(0 ${y}) scale(1 ${1 - collapse * 0.6})`}>
					<text x={SHEET_X + 56} y={ROW_H / 2 + 36} fontFamily={UI_FONT} fontWeight={700} fontSize={104} letterSpacing={-3} fill={mix(U.text, '#5A6070', grey)}>
						{label}
						{r.label === 'Fear' && d > 0.05 && d < 0.4 ? <tspan fill={U.lime}>|</tspan> : null}
					</text>
					<Toggle x={SHEET_X + SHEET_W - 130} y={ROW_H / 2} on={on} pop={pop} />
					<line x1={SHEET_X + 56} x2={SHEET_X + SHEET_W - 40} y1={ROW_H} y2={ROW_H} stroke={U.surface2} strokeWidth={2} />
				</g>,
			);
		}
		y += h;
	});
	// "Just light, so bright": a new row switches itself on and its knob floods the frame
	const lightIn = outBack(seg(t, light - 0.05, light + 0.18), 1.2);
	const lightOn = outCubic(seg(t, light + 0.1, light + 0.22));
	const clockDrop = t >= ROWS[2].at ? t - ROWS[2].at : -1;
	const nameD = t - ROWS[3].at;
	const handle = '@maya.xo';
	const handleShown = nameD < 0 ? handle : handle.slice(0, Math.max(0, handle.length - Math.floor(nameD / 0.05)));
	const knobX = SHEET_X + SHEET_W - 130 - 168 / 2 + 48 + 72 * lightOn;
	const knobY = y + ROW_H / 2;
	return (
		<Stage>
			<defs>
				<clipPath id="sheet-clip">
					<rect x={SHEET_X} y={sheetY} width={SHEET_W} height={H + 100} rx={48} />
				</clipPath>
				<filter id="frost" x="-5%" y="-5%" width="110%" height="110%">
					<feGaussianBlur stdDeviation={frost} />
				</filter>
			</defs>
			<FloorLayer t={t} />
			{/* frosted sheet: the floor blurred behind it */}
			<g clipPath="url(#sheet-clip)">
				<g filter="url(#frost)">
					<FloorLayer t={t} />
				</g>
				<rect x={SHEET_X} y={sheetY} width={SHEET_W} height={H + 100} fill={U.bg} opacity={lerp(0.72, 0.55, offs / 4)} />
			</g>
			<rect x={SHEET_X} y={sheetY} width={SHEET_W} height={H + 100} rx={48} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
			<g clipPath="url(#sheet-clip)">
				<g transform={`translate(${SHEET_X + SHEET_W - 112} ${sheetY + 48})`}>
					<rect x={0} y={-14} width={52} height={26} rx={7} fill="none" stroke="rgba(242,244,248,0.6)" strokeWidth={2.5} />
					<rect x={4} y={-10} width={30} height={18} rx={3} fill={U.green} />
					<rect x={54} y={-5} width={4} height={8} rx={1.5} fill="rgba(242,244,248,0.6)" />
				</g>
				<text x={SHEET_X + 56} y={sheetY + 150} fontFamily={UI_FONT} fontWeight={700} fontSize={34} fill={U.muted}>
					Settings
				</text>
				<g transform={`translate(${SHEET_X + SHEET_W - 150} ${sheetY + 138})`}>
					<LogoMark size={26} t={t} />
				</g>
				{rows}
				{t >= light - 0.05 ? (
					<g transform={`translate(${(1 - lightIn) * 500} ${y})`}>
						<text x={SHEET_X + 56} y={ROW_H / 2 + 36} fontFamily={UI_FONT} fontWeight={700} fontSize={104} letterSpacing={-3} fill={U.text}>
							Light
						</text>
						<Toggle x={SHEET_X + SHEET_W - 130} y={ROW_H / 2} on={lightOn} pop={0} />
					</g>
				) : null}
				{/* @maya.xo: letters delete on "no name", leaving an empty avatar ring */}
				<g transform={`translate(${SHEET_X + 56} ${sheetY + 880})`}>
					<circle cx={34} cy={0} r={30} fill="none" stroke={U.lime} strokeWidth={4} />
					<circle cx={34} cy={0} r={22} fill="#2a2f3c" opacity={nameD < 0 ? 1 : 1 - seg(nameD, 0.3, 0.5)} />
					<text x={84} y={14} fontFamily={UI_FONT} fontWeight={700} fontSize={38} fill={U.text}>
						{handleShown}
					</text>
				</g>
			</g>
			{/* status bar: the digits fly up out of the top of the frame on "no clock" */}
			<g fontFamily={UI_FONT} fontWeight={600} fontSize={30} fill={U.text}>
				{'2:08'.split('').map((ch, i) => {
					const dd = clockDrop < 0 ? 0 : Math.max(0, clockDrop - 0.12 - i * 0.05);
					const lift = 140 * dd + 650 * dd * dd;
					const x = SHEET_X + 60 + i * 19 + (i > 1 ? -6 : 0) + dd * (i - 1.5) * 90;
					const y = sheetY + 58 - lift;
					return (
						<text key={i} x={x} y={y} transform={dd > 0 ? `rotate(${dd * 260 * (i % 2 ? 1 : -1)} ${x + 8} ${y - 10})` : undefined} fill={dd > 0 ? U.lime : U.text}>
							{ch}
						</text>
					);
				})}
			</g>
			{flood > 0 ? <circle cx={knobX} cy={knobY} r={40 + 2400 * inCubic(flood)} fill="#fff" /> : null}
		</Stage>
	);
};
