import React from 'react';
import {F} from '../../full/cues';
import {UI_FONT} from '../../theme';
import {bt} from '../../timing';
import {DisplayText, LogoMark, P, Part, PartShape} from './parts';
import {H, Neon, Plane, Stage, U, W, WorldWindow, beatTimes, clamp01, halfBeatTimes, inCubic, kickOn, lerp, outBack, outCubic, pathOf, planeRect, rnd, seg, since, smooth, traceD} from './lib';

// 2:12.2 → 2:52.8  SPINNER → TIMER → ∞ (R9) · GROUP CHAT (R4) · THE REINSTALL · RESTORE FAILED (R13) · FACE DOWN (R6) · BATTERY → LIGHT WALL (R5)

// ---------------------------------------------------------------- spinner on R9's light trail

// the photographed light trail in R9: an ellipse round her waist (image fractions)
const TRAIL = {u: 0.465, v: 0.752, ru: 0.236, rv: 0.15, rot: -4};
const R9: Plane = {id: 'R9', z: 1.3, fx: TRAIL.u, fy: TRAIL.v, sx: 0.5, sy: 0.56, free: true};

const ringGeom = () => {
	const r = planeRect(R9);
	const [cx, cy] = r.at(TRAIL.u, TRAIL.v);
	return {cx, cy, rx: TRAIL.ru * r.w, ry: TRAIL.rv * r.h};
};

/** Points on the ring (k = 0) or the ∞ (k = 1), from angle a0 to a1 (degrees). */
const loopPts = (a0: number, a1: number, k: number, n = 120): [number, number][] => {
	const {cx, cy, rx, ry} = ringGeom();
	const rot = (TRAIL.rot * Math.PI) / 180;
	const out: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const th = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
		const ex = Math.cos(th) * rx;
		const ey = Math.sin(th) * ry;
		const d = 1 + Math.sin(th) * Math.sin(th);
		const lx = (Math.cos(th) * rx * 1.08) / d;
		const ly = (Math.sin(th) * Math.cos(th) * ry * 2.6) / d;
		const x = lerp(ex, lx, k);
		const y = lerp(ey, ly, k);
		out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
	}
	return out;
};

const SPIN_BEATS = beatTimes(bt(71), F.together + 0.01);
const TIMER = [bt(72, 2), bt(72, 3), bt(72, 4), bt(73)];

export const SpinnerScene: React.FC<{t: number}> = ({t}) => {
	const {cx, cy, rx} = ringGeom();
	const contract = outCubic(seg(t, bt(71), bt(72)));
	const b = since(t, SPIN_BEATS);
	const notch = b.i < 0 ? 0 : b.i + outBack(b.dt / 0.2, 1.4);
	const timerOn = t >= TIMER[0];
	const tm = since(t, TIMER);
	const fill = timerOn ? clamp01((tm.i + outCubic(tm.dt / 0.18)) / 4) : 0;
	const inf = smooth(seg(t, F.forever, F.forever + 0.4));
	const beatK = kickOn(t, SPIN_BEATS, 0.14);
	// the band: a 270° spinner arc, then the timer's filling arc, then the full ∞
	let a0 = -90 + notch * 45;
	let a1 = a0 + 270;
	if (timerOn) {
		a0 = -90;
		a1 = -90 + 360 * Math.max(0.02, fill);
	}
	if (t >= F.forever) {
		a0 = -90;
		a1 = 270;
	}
	const band = lerp(70, 120, contract) + (t >= F.forever ? 26 * beatK + 30 * seg(t, F.forever, F.together) : 10 * beatK);
	const d = pathOf(loopPts(a0, a1, inf));
	const white = 1 - contract;
	const mins = timerOn ? Math.min(4, tm.i + 1) : 0;
	const dotK = t >= F.forever ? ((t - F.forever) / (bt(74) - bt(73))) % 1 : 0;
	const dotPts = loopPts(-90, 270, inf, 240);
	const dot = dotPts[Math.floor(dotK * 240)];
	const split = seg(t, F.together - 0.25, F.together);
	return (
		<Stage>
			<rect width={W} height={H} fill={U.warmBlack} />
			<WorldWindow plane={R9} opacity={1 - split}>
				<path d={d} fill="none" stroke="#fff" strokeWidth={band} strokeLinecap="round" />
			</WorldWindow>
			{/* the drawn ring sits exactly on the photographed trail */}
			<path d={d} fill="none" stroke={U.gold} strokeWidth={2} opacity={0.5 * (1 - split)} />
			{timerOn && t < F.forever + 0.4 ? (
				<g opacity={1 - inf}>
					<DisplayText x={cx} y={cy + 42 * (1 - inf)} size={120 * (1 - 0.8 * inf)} fill={U.cream}>
						{`${mins}:00`}
					</DisplayText>
				</g>
			) : null}
			{t >= F.forever && dot ? (
				<g opacity={1 - split}>
					<circle cx={dot[0]} cy={dot[1]} r={28} fill={U.gold} opacity={0.25} />
					<circle cx={dot[0]} cy={dot[1]} r={9} fill="#fff" />
				</g>
			) : null}
			{white > 0 ? (
				<g opacity={white}>
					<rect width={W} height={H} fill="#fff" opacity={1 - seg(contract, 0, 0.6)} />
					<ellipse cx={cx} cy={cy} rx={lerp(2200, rx, contract)} ry={lerp(2200, rx * 0.4, contract)} fill="none" stroke="#fff" strokeWidth={lerp(2000, 120, contract)} />
				</g>
			) : null}
		</Stage>
	);
};

// ---------------------------------------------------------------- 2:19 the group chat, merged (R4)

const R4: Plane = {id: 'R4', z: 1.28, fx: 0.47, fy: 0.47};
const R4_FACES: [number, number][] = [
	[0.293, 0.505],
	[0.398, 0.42],
	[0.539, 0.42],
	[0.648, 0.48],
];

export const AvatarScene: React.FC<{t: number}> = ({t}) => {
	const r = planeRect(R4);
	const beats = beatTimes(F.together, F.beep1);
	const k = kickOn(t, beats, 0.13);
	const downs = [bt(75), bt(76)];
	const dn = since(t, downs);
	const closer = dn.i < 0 ? 0 : (dn.i + outBack(dn.dt / 0.25, 1.3)) / 2;
	const born = outBack(seg(t, F.together, F.together + 0.3), 1.6);
	const shrink = outCubic(seg(t, bt(76, 4), bt(76, 4) + 0.3));
	const faces = R4_FACES.map(([u, v]) => r.at(u, v));
	const mx = faces.reduce((s, f) => s + f[0], 0) / 4;
	const my = faces.reduce((s, f) => s + f[1], 0) / 4 + 30;
	const radius = (150 + 30 * closer) * born * (1 + 0.06 * k);
	return (
		<Stage>
			<defs>
				<filter id="goo" x="-20%" y="-50%" width="140%" height="200%">
					<feGaussianBlur stdDeviation={24} result="b" />
					<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" />
				</filter>
			</defs>
			<rect width={W} height={H} fill={U.warmBlack} />
			<g transform={`translate(${mx} ${my}) scale(${lerp(1, 0.42, shrink)} ${lerp(1, 0.2, shrink)}) translate(${-mx} ${-my})`}>
				<WorldWindow plane={R4}>
					<g filter="url(#goo)">
						{faces.map(([x, y], i) => (
							<circle key={i} cx={lerp(x, mx + (x - mx) * 0.86, closer)} cy={lerp(y + 20, my, closer * 0.8)} r={radius} fill="#fff" />
						))}
						{closer > 0.5 ? <rect x={faces[0][0] - 40} y={my - radius * 1.05} width={faces[3][0] - faces[0][0] + 80} height={radius * 2.1} rx={radius} fill="#fff" opacity={seg(closer, 0.5, 1)} /> : null}
					</g>
				</WorldWindow>
				<rect width={W} height={H} fill={U.surface} opacity={0.94 * shrink} style={{mixBlendMode: 'normal'}} />
			</g>
			<DisplayText x={W / 2} y={150} size={40} weight={500} fill={U.cream} opacity={seg(t, F.together, F.together + 0.3) * (1 - shrink)} spacing={0.02}>
				the gang
			</DisplayText>
		</Stage>
	);
};

// ---------------------------------------------------------------- 2:23 the reinstall · 2:33 restore failed (R13)

const R13: Plane = {id: 'R13', z: 1.15, fx: 0.496, fy: 0.4, sx: 0.5, sy: 0.38};
const GW = 430;
const GH = 932;
const GX = (W - GW) / 2;
const GY = (H - GH) / 2;

type Piece = {p: Part; x: number; y: number; at: number; from: [number, number]; rot: number; s: number};
// pieces deleted earlier fly back in on the beeps of bar 79 and land slightly wrong
const MISFITS: Piece[] = [
	{p: P.toggle(), x: 320, y: 410, at: bt(79), from: [-700, 300], rot: 3, s: 0.9},
	{p: P.toggle(), x: 300, y: 500, at: bt(79), from: [900, 200], rot: -2.5, s: 0.9},
	{p: P.pill('@maya.xo'), x: 196, y: 600, at: bt(79, 2), from: [-300, 1100], rot: -3, s: 1},
	{p: P.badge('99+'), x: 372, y: 196, at: bt(79, 3), from: [1100, -500], rot: 4, s: 0.9},
	{p: P.clock('2:31'), x: 128, y: 210, at: bt(79, 3), from: [-900, -600], rot: -3, s: 0.8},
];
const MISFIT_LABELS = ['Pain', 'Fear'];
const FLOOD = halfBeatTimes(F.flood, F.alive + 0.01);
const FLOOD_NOTES = [
	['jess.wav', 'are you ok??'],
	['kai.mp4', 'maya where did u go'],
	['TokTic', 'You have 214 new likes'],
	['sam.png', 'we can see you dancing lol'],
	['TokTic', 'Your streak is about to end'],
	['nia.gif', 'come back!!'],
	['TokTic', "Don't miss what's trending"],
	['dev.zip', 'ur phone died didnt it'],
];

const restorePct = (t: number) => {
	if (t < bt(77, 4)) return 0;
	if (t < bt(79)) return Math.round(lerp(1, 12, seg(t, bt(77, 4), bt(77, 4) + 0.5)));
	if (t < F.flood) return Math.round(lerp(12, 47, seg(t, bt(79), bt(80))));
	return Math.round(lerp(47, 99, seg(t, F.flood, F.alive)));
};

export const RestoreScene: React.FC<{t: number}> = ({t}) => {
	const failAt = bt(82, 3); // "everything"
	const failing = t >= failAt;
	const fd = (i: number) => Math.max(0, t - failAt - i * 0.03);
	const fallY = (i: number) => 0.5 * 5200 * fd(i) ** 2;
	const fallR = (i: number) => fd(i) * (rnd(`fr${i}`) - 0.5) * 520;
	const glassBg = failing ? 1 - seg(t, failAt, failAt + 0.14) : 1;
	const grow = smooth(seg(t, F.kickOut3, F.drop3));
	const scaleUp = lerp(1, 1.5, grow);
	const flip = seg(t, F.drop3, F.drop3 + 0.32);
	const shake = t >= F.flood && !failing ? (rnd(`sh${Math.floor(t * 30)}`) - 0.5) * 10 * kickOn(t, beatTimes(F.flood, F.alive + 0.6), 0.1) : 0;
	const pct = restorePct(t);
	const bootLogo = t >= bt(77, 3);
	const statusOn = t >= bt(77, 2);
	const outline = seg(t, F.beep1, F.beep1 + 0.3);
	const bezelFade = seg(t, F.kickOut3, F.drop3 - 0.6);
	const battery = t >= F.flood + 1 ? 2 : 1;
	const flooded = FLOOD.filter((x) => x <= t).length;
	const floodBeats = FLOOD.filter((x) => x <= t);
	const ecgSpikes = floodBeats.map((x) => ({x: 30 + ((x - F.flood) / (F.alive - F.flood)) * 370, a: 38}));
	// pill → notification card ("We miss you, Maya")
	const card = outBack(seg(t, F.beep1 - 0.1, F.beep1 + 0.2), 1.3);
	let el = 0;
	const fallG = (children: React.ReactNode, x: number, y: number, key: string) => {
		const i = el++;
		return (
			<g key={key} transform={`translate(${x} ${y + fallY(i)}) rotate(${fallR(i)})`}>
				{children}
			</g>
		);
	};
	const phone = (
		<g>
			{/* status bar */}
			{statusOn
				? fallG(
						<g fontFamily={UI_FONT} fontWeight={600} fontSize={17} fill={U.text}>
							<text x={0} y={6}>
								{t < F.flood ? '2:23' : '2:31'}
							</text>
							<g transform="translate(300 -8)">
								<text x={-6} y={14} fontSize={15} fill={U.pink} textAnchor="end">
									{battery}%
								</text>
								<rect x={0} y={0} width={28} height={14} rx={4} fill="none" stroke={U.pink} strokeWidth={1.6} />
								<rect x={2.5} y={2.5} width={1.5 * battery} height={9} rx={1} fill={U.pink} />
								<path d="M15 -1 L9 8 L13 8 L11 15 L18 6 L14 6 Z" fill={U.green} />
							</g>
						</g>,
						36,
						34,
						'status',
					)
				: null}
			{bootLogo ? fallG(<LogoMark size={52 * outBack(seg(t, bt(77, 3), bt(77, 3) + 0.3), 1.6)} t={t} />, GW / 2, 110, 'logo') : null}
			{/* "We miss you, Maya" */}
			{fallG(
				<g transform={`scale(${card})`}>
					<rect x={-199} y={-40} width={398} height={80} rx={22} fill="rgba(29,34,48,0.97)" />
					<rect x={-183} y={-20} width={40} height={40} rx={11} fill="#0E1016" stroke={U.surface2} />
					<circle cx={-163} cy={0} r={8} fill="none" stroke={U.lime} strokeWidth={2.6} />
					<text x={-128} y={-12} fontFamily={UI_FONT} fontSize={12} fontWeight={600} letterSpacing={0.6} fill={U.muted}>
						TOKTIC
					</text>
					<text x={-128} y={8} fontFamily={UI_FONT} fontSize={16} fontWeight={600} fill={U.text}>
						We miss you, Maya
					</text>
					<text x={-128} y={27} fontFamily={UI_FONT} fontSize={13.5} fill="#C9CEDA">
						Plug in to pick up where you left off
					</text>
				</g>,
				GW / 2,
				t < F.flood ? 250 : 250,
				'miss',
			)}
			{/* misfits */}
			{MISFITS.map((m, i) => {
				if (t < m.at - 0.25) return null;
				const k = outCubic(seg(t, m.at - 0.25, m.at));
				const jit = kickOn(t, beatTimes(m.at, F.alive + 0.01), 0.1) * (rnd(`j${i}${Math.floor(t * 4)}`) - 0.5) * 8;
				const x = lerp(m.from[0], m.x, k) + jit;
				const y = lerp(m.from[1], m.y, k) + (i % 2 ? 6 : -5);
				return fallG(
					<g transform={`rotate(${m.rot * k + (1 - k) * 40}) scale(${m.s})`}>
						{m.p.kind === 'toggle' ? (
							<text x={-310} y={12} fontFamily={UI_FONT} fontWeight={700} fontSize={40} fill={U.text}>
								{MISFIT_LABELS[i]}
							</text>
						) : null}
						<PartShape p={m.p} mode="body" s={{t, on: 1}} />
					</g>,
					x,
					y,
					`m${i}`,
				);
			})}
			{/* flood: one notification per half-beat */}
			{FLOOD.map((at, i) => {
				if (t < at) return null;
				const slot = flooded - 1 - i;
				const k = outBack(seg(t, at, at + 0.15), 1.4);
				const [who, msg] = FLOOD_NOTES[i % FLOOD_NOTES.length];
				return fallG(
					<g transform={`scale(${0.94 + 0.06 * k})`} opacity={Math.min(1, k * 1.5)}>
						<rect x={-199} y={-34} width={398} height={68} rx={20} fill="rgba(36,42,58,0.98)" stroke="rgba(255,255,255,0.06)" />
						<circle cx={-170} cy={0} r={16} fill={who === 'TokTic' ? '#0E1016' : `hsl(${(i * 67) % 360} 55% 55%)`} stroke={who === 'TokTic' ? U.lime : 'none'} strokeWidth={2} />
						<text x={-140} y={-6} fontFamily={UI_FONT} fontSize={14} fontWeight={700} fill={U.text}>
							{who}
						</text>
						<text x={-140} y={14} fontFamily={UI_FONT} fontSize={13.5} fill="#C9CEDA">
							{msg}
						</text>
					</g>,
					GW / 2,
					330 + slot * 60 - 30 * (1 - k),
					`f${i}`,
				);
			})}
			{/* the monitor on the screen */}
			{t >= F.flood ? fallG(<Neon d={traceD(30, 400, 0, ecgSpikes, {w: 14})} color={U.lime} width={2.5} glow={0.6} />, 0, 770, 'ecg') : null}
			{/* progress */}
			{t >= bt(77, 4)
				? fallG(
						<g>
							<rect x={0} y={0} width={330} height={8} rx={4} fill={U.surface2} />
							<rect x={0} y={0} width={(330 * pct) / 100} height={8} rx={4} fill={U.lime} />
							<text x={0} y={-16} fontFamily={UI_FONT} fontSize={17} fontWeight={600} fill={U.text}>
								Restoring TokTic… <tspan fill={U.lime}>{pct}%</tspan>
							</text>
						</g>,
						50,
						850,
						'prog',
					)
				: null}
		</g>
	);
	const cx = W / 2;
	const cy = H / 2;
	const flipC = Math.cos(flip * Math.PI);
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			<g transform={`translate(${cx + shake} ${cy}) scale(${scaleUp * Math.abs(flipC)} ${scaleUp}) translate(${-cx} ${-cy})`}>
				{/* the glass: TokTic dark until "everything", then a window onto R13 */}
				{failing && flip < 0.5 ? (
					<WorldWindow plane={R13}>
						<rect x={GX} y={GY} width={GW} height={GH} rx={56} fill="#fff" />
					</WorldWindow>
				) : null}
				<rect x={GX} y={GY} width={GW} height={GH} rx={56} fill={flip >= 0.5 ? '#0c0d10' : U.bg} opacity={flip >= 0.5 ? 1 : glassBg * outline} />
				{flip >= 0.5 ? <rect x={GX + 26} y={GY + 26} width={120} height={120} rx={34} fill="#141519" stroke="#24262c" strokeWidth={2} /> : null}
				{/* lime wireframe phone */}
				<rect x={GX - 14} y={GY - 14} width={GW + 28} height={GH + 28} rx={70} fill="none" stroke={U.lime} strokeWidth={2} strokeDasharray="10 8" opacity={outline * (1 - bezelFade) * (flip >= 0.5 ? 0 : 1)} vectorEffect="non-scaling-stroke" />
				<circle cx={GX + GW / 2} cy={GY + 21} r={7} fill="none" stroke={U.lime} strokeWidth={1.5} opacity={outline * (1 - bezelFade)} />
				{flip < 0.5 ? <g transform={`translate(${GX} ${GY})`}>{phone}</g> : null}
				{failing && flip < 0.5 ? (
					<text x={cx} y={GY + GH - 30} textAnchor="middle" fontFamily={UI_FONT} fontSize={16} fontWeight={600} fill={U.lime} opacity={1 - seg(t, failAt + 0.6, failAt + 1.6)}>
						Restore failed
					</text>
				) : null}
			</g>
			{t >= F.alive + 0.4 && t < F.drop3 ? (
				<DisplayText x={1500} y={560 - 30 * outCubic(seg(t, F.alive + 0.4, F.alive + 1.2))} size={52} weight={500} anchor="start" fill={U.cream} opacity={seg(t, F.alive + 0.4, F.alive + 1.0) * (1 - seg(t, F.drop3 - 0.4, F.drop3))} spacing={0}>
					to feel everything
				</DisplayText>
			) : null}
		</Stage>
	);
};

// ---------------------------------------------------------------- 2:38 face down (R6)

const R6: Plane = {id: 'R6', z: 1.0};
// her phone and the other face-down phones on the table (image fractions, rotation, size as fraction of image width/height)
const HER = {u: 0.445, v: 0.756, rot: 9, w: 0.105, h: 0.24};
const OTHERS = [
	{u: 0.559, v: 0.312, rot: -22, w: 0.105, h: 0.11},
	{u: 0.638, v: 0.387, rot: -20, w: 0.12, h: 0.11},
	{u: 0.263, v: 0.502, rot: -4, w: 0.13, h: 0.09},
	{u: 0.664, v: 0.552, rot: 8, w: 0.15, h: 0.12},
];

export const TableScene: React.FC<{t: number}> = ({t}) => {
	const r = planeRect(R6);
	const [hx, hy] = r.at(HER.u, HER.v);
	const hw = HER.w * r.w;
	const hh = HER.h * r.h;
	const land = smooth(seg(t, F.drop3 + 0.32, F.table));
	const open = outCubic(seg(t, F.table, F.dump3));
	// the black back of her phone shrinks onto the phone in the photo
	const pw = lerp(430 * 1.5, hw, land);
	const ph = lerp(932 * 1.5, hh, land);
	const px = lerp(W / 2, hx, land);
	const py = lerp(H / 2, hy, land);
	const prot = lerp(0, HER.rot, land);
	const turn = -4 * seg(t, F.dump3, bt(87));
	const pings = beatTimes(F.dump3, bt(87));
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			<g transform={`rotate(${turn} ${W / 2} ${H / 2}) scale(${1 + 0.06 * Math.abs(turn) / 4})`}>
				{open > 0 ? (
					<WorldWindow plane={R6}>
						<rect x={lerp(px - pw / 2, -100, open)} y={lerp(py - ph / 2, -100, open)} width={lerp(pw, W + 200, open)} height={lerp(ph, H + 200, open)} rx={lerp(30, 0, open)} fill="#fff" transform={`rotate(${prot * (1 - open)} ${px} ${py})`} />
					</WorldWindow>
				) : null}
				<g transform={`translate(${px} ${py}) rotate(${prot})`} opacity={1 - open}>
					<rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={lerp(84, 16, land)} fill="#0c0d10" stroke="#2a2d34" strokeWidth={2} />
					<rect x={-pw / 2 + pw * 0.06} y={-ph / 2 + ph * 0.03} width={pw * 0.28} height={pw * 0.28} rx={pw * 0.08} fill="#141519" stroke="#24262c" />
				</g>
				{OTHERS.map((o, i) => {
					const at = pings[i];
					if (at === undefined || t < at) return null;
					const k = (t - at) / 0.5;
					const [x, y] = r.at(o.u, o.v);
					const s = 1 + 0.25 * outCubic(k);
					return <rect key={i} x={-o.w * r.w * s / 2} y={-o.h * r.h * s / 2} width={o.w * r.w * s} height={o.h * r.h * s} rx={14} fill="none" stroke={U.lime} strokeWidth={3} opacity={Math.max(0, 1 - k)} transform={`translate(${x} ${y}) rotate(${o.rot})`} />;
				})}
			</g>
		</Stage>
	);
};

// ---------------------------------------------------------------- 2:41.9 battery → light wall (R5)

const R5: Plane = {id: 'R5', z: 1.05, fx: 0.52, fy: 0.42};
const CELLS = 12;
const BX = 150;
const BY = 300;
const BW = 1560;
const BH = 480;
const CHARGE = beatTimes(bt(87), bt(90));

export const BatteryScene: React.FC<{t: number}> = ({t}) => {
	const c = since(t, CHARGE);
	const charged = c.i + 1;
	const wall = seg(t, bt(89), bt(89) + 0.3);
	const allBeats = beatTimes(bt(87), F.type2 + 0.01);
	const b = since(t, allBeats);
	const beatK = b.i < 0 ? 0 : Math.exp(-b.dt / 0.16);
	const barPos = b.i < 0 ? 0 : b.i % 4;
	const downs = beatTimes(bt(89), bt(93));
	const dn = since(t, downs);
	const slide = dn.i < 0 ? 0 : dn.i + outBack(dn.dt / 0.25, 1.4);
	const widen = smooth(seg(t, bt(92), bt(92, 4)));
	const collapse = inCubic(seg(t, bt(93) - 0.25, bt(93)));
	const inset = 22;
	const fullH = BH - 2 * inset;
	const gap = lerp(16, 0, widen);
	const cw0 = (BW - 2 * inset - (CELLS - 1) * 16) / CELLS;
	const pitch = cw0 + 16;
	const cells: {x: number; y: number; w: number; h: number; i: number; on: boolean; flash: number}[] = [];
	if (wall === 0) {
		for (let i = 0; i < CELLS; i++) {
			const flash = i === charged - 1 ? Math.exp(-c.dt / 0.18) : 0;
			cells.push({x: BX + inset + i * pitch, y: BY + inset, w: cw0, h: fullH, i, on: i < charged, flash});
		}
	} else {
		// a freestanding LED wall: EQ heights on every beat, one cell sideways on each downbeat
		const span = (CELLS + 2) * pitch;
		for (let i = 0; i < CELLS + 2; i++) {
			const raw = i * pitch + (slide % (CELLS + 2)) * pitch;
			const x = BX + inset - pitch + (((raw % span) + span) % span);
			const accent = barPos === 0 || barPos === 2 ? 1 : 0.5;
			const wave = 0.5 + 0.5 * Math.sin(i * 1.9 + Math.max(0, b.i) * 2.3);
			const eq = lerp(1, 0.38 + 0.62 * clamp01(0.25 + beatK * accent * (0.5 + 0.5 * wave) + 0.25 * wave), wall * (1 - widen));
			const h = (fullH * eq + 120 * widen) * (1 - collapse) + 4 * collapse;
			const w = cw0 + 16 - gap;
			cells.push({x: x - (16 - gap) / 2 + 8 - 8, y: H / 2 - h / 2, w, h, i, on: true, flash: 0});
		}
	}
	const pct = Math.round((Math.min(CELLS, Math.max(0, charged)) / CELLS) * 100);
	const casing = 1 - wall;
	return (
		<Stage>
			<rect width={W} height={H} fill={U.warmBlack} />
			<WorldWindow plane={R5}>
				{cells.filter((x) => x.on).map((x) => <rect key={x.i} x={x.x} y={x.y} width={x.w} height={x.h} rx={lerp(10, 4, wall)} fill="#fff" />)}
			</WorldWindow>
			{cells.map((x) =>
				x.on ? (
					<g key={x.i}>
						<rect x={x.x} y={x.y} width={x.w} height={x.h} rx={10} fill="#fff" opacity={0.75 * x.flash} />
						{wall > 0 ? <rect x={x.x} y={x.y - 3} width={x.w} height={6} rx={3} fill={U.gold} opacity={0.6 + 0.4 * beatK} /> : null}
					</g>
				) : (
					<rect key={x.i} x={x.x} y={x.y} width={x.w} height={x.h} rx={10} fill={U.surface} stroke={U.green} strokeOpacity={0.18} strokeWidth={1.5} />
				),
			)}
			{casing > 0 ? (
				<g opacity={casing}>
					<rect x={BX} y={BY} width={BW} height={BH} rx={56} fill="none" stroke={U.green} strokeWidth={8} />
					<rect x={BX} y={BY} width={BW} height={BH} rx={56} fill="none" stroke={U.green} strokeWidth={26} opacity={0.12} />
					<rect x={BX + BW + 14} y={BY + BH * 0.32} width={36} height={BH * 0.36} rx={12} fill={U.green} />
					<g transform={`translate(${BX} ${BY - 40})`} fontFamily={UI_FONT}>
						<path d="M14 -40 L0 -12 L12 -12 L6 10 L26 -20 L14 -20 Z" fill={U.green} transform="scale(1.3)" />
						<text x={52} y={0} fontSize={56} fontWeight={700} fill={U.green} style={{fontVariantNumeric: 'tabular-nums'}}>
							{pct}%
						</text>
					</g>
				</g>
			) : null}
			{wall > 0 ? <Confetti t={t} downs={downs} cells={cells} /> : null}
			{collapse > 0 ? <Neon d={`M${lerp(BX, 0, collapse)},${H / 2} L${lerp(BX + BW, W, collapse)},${H / 2}`} color={U.gold} width={3} opacity={collapse} /> : null}
		</Stage>
	);
};

/** Gold confetti spilling from the cell tops on each downbeat. */
const Confetti: React.FC<{t: number; downs: number[]; cells: {x: number; y: number; w: number}[]}> = ({t, downs, cells}) => (
	<g>
		{downs.map((at, d) => {
			const dt = t - at;
			if (dt < 0 || dt > 2.2) return null;
			return Array.from({length: 46}).map((_, i) => {
				const cell = cells[(i + d * 3) % cells.length];
				const x0 = cell.x + rnd(`cfx${d}-${i}`) * cell.w;
				const vx = (rnd(`cvx${d}-${i}`) - 0.5) * 300;
				const vy = -300 - rnd(`cvy${d}-${i}`) * 500;
				const x = x0 + vx * dt + Math.sin(dt * 6 + i) * 12;
				const y = cell.y + vy * dt + 700 * dt * dt;
				const spin = dt * (300 + rnd(`cs${d}-${i}`) * 500);
				return <rect key={`${d}-${i}`} x={-5} y={-2.5} width={10} height={5} fill={i % 3 ? U.gold : U.goldDeep} opacity={1 - clamp01(dt / 2.2)} transform={`translate(${x} ${y}) rotate(${spin}) scale(1 ${Math.cos(spin / 30)})`} />;
			});
		})}
	</g>
);

