import React from 'react';
import {random} from 'remotion';
import {F} from '../../full/cues';
import {T} from '../../opening/cues';
import {PHONE_H, PHONE_W} from '../../theme';
import {bt} from '../../timing';
import {DisplayText, P, Part, PartShape, PartState} from './parts';
import {H, Neon, Plane, Stage, U, W, WorldWindow, beatTimes, clamp01, halfBeatTimes, lerp, outBack, rnd, seg, since} from './lib';

// 1:24.8 → 1:35.9  SHATTER · EXPLODED VIEW · BEADS ON A WIRE (R8 behind everything, never moves)

const R8: Plane = {id: 'R8', z: 1.06, fx: 0.5, fy: 0.55};

// ---------------------------------------------------------------- glass (same geometry as the opening's shatter)

const FRAME = 14;
const PW = PHONE_W + 2 * FRAME;
const PH = PHONE_H + 2 * FRAME;
const PS = (1080 * 0.92) / PH; // the opening's phone scale at 1080p
const toScreen = (x: number, y: number): [number, number] => [W / 2 + (x - PW / 2) * PS, H / 2 + (y - PH / 2) * PS];

type Shard = {pts: [number, number][]; cx: number; cy: number};
const SHARDS: Shard[] = (() => {
	const cols = 4;
	const rows = 7;
	const v = (c: number, r: number): [number, number] => {
		const edge = c === 0 || r === 0 || c === cols || r === rows;
		const jx = edge ? 0 : (random(`vx${c}-${r}`) - 0.5) * (PW / cols) * 0.6;
		const jy = edge ? 0 : (random(`vy${c}-${r}`) - 0.5) * (PH / rows) * 0.6;
		return [(c / cols) * PW + jx, (r / rows) * PH + jy];
	};
	const out: Shard[] = [];
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			const a = v(c, r);
			const b = v(c + 1, r);
			const d = v(c + 1, r + 1);
			const e = v(c, r + 1);
			const tris: [number, number][][] = random(`split${c}-${r}`) < 0.5 ? [[a, b, d], [a, d, e]] : [[a, b, e], [b, d, e]];
			for (const pts of tris) out.push({pts, cx: (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy: (pts[0][1] + pts[1][1] + pts[2][1]) / 3});
		}
	}
	return out;
})();

const GLASS_BEATS = [bt(45, 2), bt(45, 3), bt(45, 4)];

/** Shards with drag (v·e^(−3·dt)): they slow and hang, turning, then drop away at 46.1. */
const Glass: React.FC<{t: number}> = ({t}) => {
	const dt = t - T.drop;
	if (dt < 0) return null;
	const drag = 1 - Math.exp(-3 * dt);
	const fall = Math.max(0, t - T.end);
	if (fall > 0.6) return null;
	return (
		<g>
			{SHARDS.map((s, i) => {
				const dx = s.cx - PW / 2;
				const dy = s.cy - PH / 2;
				const k = 0.1 + 0.2 * random(`sv${i}`);
				const ox = dx * k * drag;
				const oy = dy * k * drag + 18 * drag + 0.5 * 9000 * fall * fall * (0.8 + 0.4 * random(`sg${i}`));
				const rot = (random(`sr${i}`) - 0.5) * 36 * drag + (random(`sr2${i}`) - 0.5) * 500 * fall;
				const sc = 1 + 0.08 * random(`sz${i}`) * drag;
				const [X, Y] = toScreen(s.cx + ox, s.cy + oy);
				// edges catch on each beat like mirror-ball facets
				let caught = 0;
				for (const b of GLASS_BEATS) if (t >= b && rnd(`facet${b}-${i}`) < 0.45) caught = Math.max(caught, Math.exp(-(t - b) / 0.14));
				const pts = s.pts.map(([x, y]) => `${(x - s.cx).toFixed(1)},${(y - s.cy).toFixed(1)}`).join(' ');
				return (
					<g key={i} transform={`translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${(PS * sc).toFixed(4)})`}>
						<polygon points={pts} fill="url(#un-glass)" />
						<polygon points={pts} fill={U.lime} opacity={0.22 * caught} />
						<polygon points={pts} fill="none" stroke={U.lime} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.4 + 0.6 * caught} />
					</g>
				);
			})}
		</g>
	);
};

// ---------------------------------------------------------------- the 24 parts

type Slot = {p: Part; x: number; y: number; z: number; s: number};

// exploded-diagram layout (screen px, z toward camera)
const SLOTS: Slot[] = [
	{p: P.card('jess.wav liked your post', '“out tonight”'), x: 420, y: 190, z: 120, s: 1.25},
	{p: P.card('@kai.mp4 mentioned you', 'in a comment'), x: 1490, y: 215, z: -150, s: 1.2},
	{p: P.card('You have 12 new likes', 'Keep the streak going'), x: 330, y: 880, z: -80, s: 1.2},
	{p: P.card('3 new stories', 'from people you follow'), x: 1560, y: 880, z: 180, s: 1.25},
	{p: P.card('Low battery', '20% remaining. Stay connected?'), x: 990, y: 975, z: -300, s: 1.05},
	{p: P.heart(70), x: 770, y: 360, z: 250, s: 3.1},
	{p: P.heart(70), x: 1260, y: 720, z: 60, s: 2.4},
	{p: P.heart(70), x: 1800, y: 560, z: -200, s: 1.9},
	{p: P.heart(70), x: 120, y: 530, z: -120, s: 2.2},
	{p: P.battery(), x: 1190, y: 395, z: 0, s: 2.4},
	{p: P.signal(), x: 620, y: 700, z: 100, s: 2.2},
	{p: P.clock('1:48'), x: 1010, y: 110, z: -250, s: 1.3},
	{p: P.logo(), x: 960, y: 545, z: 300, s: 1.5},
	{p: P.button('Stay'), x: 1450, y: 520, z: -60, s: 1.6},
	{p: P.bubble('where r u??'), x: 520, y: 525, z: -200, s: 1.5},
	{p: P.bubble('maya look up'), x: 1660, y: 375, z: 40, s: 1.35},
	{p: P.bubble('did u see my post??', true), x: 790, y: 830, z: 140, s: 1.35},
	{p: P.badge('99+'), x: 1335, y: 115, z: 200, s: 2.1},
	{p: P.pill('@maya.xo'), x: 230, y: 335, z: 60, s: 1.5},
	{p: P.moon(), x: 1720, y: 710, z: -100, s: 2.3},
	{p: P.toggle(), x: 1150, y: 860, z: -150, s: 2.0},
	{p: P.seen('Seen 1:47'), x: 440, y: 655, z: -260, s: 1.5},
	{p: P.spinner(), x: 1835, y: 180, z: -50, s: 2.0},
	{p: P.avatar(), x: 120, y: 125, z: 0, s: 2.0},
];
const N = SLOTS.length;

type Pose = {x: number; y: number; z: number; s: number; rot: number; rotY: number};

const proj = (q: Pose) => {
	const k = 1600 / (1600 - q.z);
	return {X: W / 2 + (q.x - W / 2) * k, Y: H / 2 + (q.y - H / 2) * k, S: q.s * k};
};

const transformOf = (q: Pose) => {
	const {X, Y, S} = proj(q);
	const c = Math.cos((q.rotY * Math.PI) / 180);
	const sk = Math.sin((q.rotY * Math.PI) / 180) * 10;
	return `translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${q.rot.toFixed(2)}) skewY(${sk.toFixed(2)}) scale(${(S * Math.max(0.02, Math.abs(c))).toFixed(4)} ${S.toFixed(4)})`;
};

const maxDim = (p: Part) => Math.max(p.w, p.h * 1.6);

// bar 46: four outward steps; bar 47: a scrolling feed column; bar 48: a ring that turns a notch per beat
const BEATS46 = beatTimes(bt(46), bt(49));
const COLUMN_ORDER = [12, 0, 5, 14, 9, 1, 16, 6, 18, 2, 10, 15, 3, 17, 8, 13, 4, 7, 19, 11, 20, 21, 22, 23];

const poseFor = (i: number, j: number): Pose => {
	const sl = SLOTS[i];
	const jitter = (rnd(`rot${i}-${j}`) - 0.5) * 16;
	if (j < 4) {
		const k = 0.62 + 0.38 * ((j + 1) / 4);
		return {x: W / 2 + (sl.x - W / 2) * k, y: H / 2 + (sl.y - H / 2) * k, z: sl.z * k, s: sl.s * (0.7 + 0.3 * k), rot: jitter * (1 - k * 0.5), rotY: 0};
	}
	if (j < 8) {
		const step = j - 4;
		const c = COLUMN_ORDER.indexOf(i);
		const spacing = 200;
		let pos = c - 3 - step; // scrolls up one slot per beat
		pos = ((((pos + 8) % N) + N) % N) - 8;
		const fit = Math.min(2.4, 470 / maxDim(sl.p));
		return {x: W / 2 + (c % 2 ? 90 : -90), y: H / 2 + pos * spacing, z: (c % 3) * 80 - 80, s: fit, rot: (c % 2 ? 1 : -1) * 2, rotY: 0};
	}
	const step = j - 8;
	const c = COLUMN_ORDER.indexOf(i);
	const a = ((c + step) / N) * Math.PI * 2 - Math.PI / 2;
	const fit = Math.min(1.7, 300 / maxDim(sl.p));
	return {x: W / 2 + Math.cos(a) * 780, y: H / 2 + Math.sin(a) * 330, z: Math.sin(a) * 140, s: fit, rot: 0, rotY: 0};
};

// the parts start to slip out through the cracks once the FLATLINE slam has landed
const SPILL = bt(45, 3);

/** Spill (T.drop → T.end): parts come out of the phone with the glass, with drag. */
const spillPose = (i: number, t: number): Pose => {
	const sl = SLOTS[i];
	const dt = Math.max(0, t - SPILL);
	const drag = 1 - Math.exp(-3.5 * dt);
	const k = 0.08 + 0.4 * drag;
	return {x: W / 2 + (sl.x - W / 2) * k, y: H / 2 + (sl.y - H / 2) * k, z: sl.z * k, s: sl.s * (0.2 + 0.5 * drag), rot: (rnd(`sp${i}`) - 0.5) * 50 * (1 - drag * 0.6), rotY: 0};
};

const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), s: lerp(a.s, b.s, k), rot: lerp(a.rot, b.rot, k), rotY: lerp(a.rotY, b.rotY, k)});

const TEXTY = ['clock', 'seen'];

const BEAD_DROPS = halfBeatTimes(bt(50), bt(50, 4) + 0.01);

/** Where each part is at t (shared by the mask and the drawing so windows align exactly). */
const partPose = (i: number, t: number): Pose => {
	if (t < T.end) return spillPose(i, t);
	if (t < F.flatline2) {
		const {i: j, dt} = since(t, BEATS46);
		const prev = j <= 0 ? spillPose(i, T.end) : poseFor(i, j - 1);
		const next = poseFor(i, j);
		const k = outBack(dt / 0.18, 1.7);
		const q = lerpPose(prev, next, k);
		// on each downbeat every piece also flips 180° about Y, like a card
		const down = j % 4 === 0;
		q.rotY = down ? 180 * clamp01(dt / 0.16) : 0;
		return q;
	}
	// beads on a wire
	const ring = poseFor(i, 11);
	const fit = 56 / maxDim(SLOTS[i].p);
	const order = COLUMN_ORDER.indexOf(i);
	const bead: Pose = {x: 130 + (order / (N - 1)) * (W - 260), y: H / 2, z: 0, s: Math.min(0.9, fit), rot: 0, rotY: 0};
	const k = outBack(seg(t, F.flatline2, F.flatline2 + 0.2), 1.4);
	const q = lerpPose(ring, bead, k);
	const dropAt = BEAD_DROPS[Math.min(BEAD_DROPS.length - 1, Math.floor((order * BEAD_DROPS.length) / N))];
	const fall = Math.max(0, t - dropAt);
	q.y += 0.5 * 5200 * fall * fall;
	q.rot += fall * 300 * (rnd(`bf${i}`) - 0.5);
	return q;
};

const SWEEPS = beatTimes(bt(49), bt(51));

export const DropScene: React.FC<{t: number}> = ({t}) => {
	const exploded = t >= T.end && t < F.flatline2;
	const beads = t >= F.flatline2;
	const allBeats = beatTimes(T.drop, F.heart);
	const {i: bi, dt: bdt} = since(t, allBeats);
	const decay = lerp(0.1, 0.3, seg(t, T.end, F.flatline2));
	const kickRaw = beads ? 0 : bi < 0 ? 0 : Math.exp(-bdt / (t < T.end ? 0.09 : decay)) * (t < SPILL ? 0 : 1);
	// windows snap open on the kick and close quickly (not a cross-fade)
	const win = clamp01((kickRaw - 0.3) / 0.45);
	const accent = bi >= 0 && (allBeats[bi] === bt(45, 3) || [1, 3].includes(beatPos(allBeats[bi]))) ? 1 : 0;
	// the battery charges on each kick and drains between beats
	const charge = bi < 0 ? 0 : Math.exp(-bdt / 0.32);
	const st = (i: number): PartState => ({t, beat: kickRaw, accent, charge, on: 1});
	const poses = SLOTS.map((_, i) => partPose(i, t));
	const order = SLOTS.map((_, i) => i).sort((a, b) => poses[a].z - poses[b].z);
	const flash = 1 - seg(t, T.drop, T.drop + 0.45);
	const fadeIn = seg(t, SPILL, SPILL + 0.12);

	// sweep dot along the wire (bars 49–50)
	const sw = since(t, SWEEPS);
	const swGap = sw.i >= 0 && sw.i + 1 < SWEEPS.length ? SWEEPS[sw.i + 1] - SWEEPS[sw.i] : 0.46;
	const dotX = beads && sw.i >= 0 ? 100 + clamp01(sw.dt / swGap) * (W - 200) : -100;
	const letters = beads ? 1 - seg(t, bt(50, 4) - 0.2, bt(50, 4)) : 0;
	const phoneRect = (() => {
		const [x0, y0] = toScreen(0, 0);
		return {x: x0, y: y0, w: PW * PS, h: PH * PS};
	})();
	const glassOpen = t < T.end + 0.6;

	return (
		<Stage>
			<defs>
				<linearGradient id="un-glass" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#1a1e27" />
					<stop offset="0.45" stopColor="#090b0f" />
					<stop offset="1" stopColor="#040506" />
				</linearGradient>
			</defs>
			<rect width={W} height={H} fill="#000" />

			{/* the world behind: through the glass gaps (shatter), through the parts (exploded), through the letters (beads) */}
			{glassOpen && t < T.end + 0.6 ? (
				<WorldWindow plane={R8}>
					<rect x={phoneRect.x} y={phoneRect.y} width={phoneRect.w} height={phoneRect.h} rx={70 * PS} fill="#fff" opacity={1 - seg(t, T.end, T.end + 0.5)} />
				</WorldWindow>
			) : null}
			{!beads && win > 0.01 ? (
				<WorldWindow plane={R8}>
					{order.map((i) => (
						<g key={i} transform={transformOf(poses[i])} opacity={win}>
							<PartShape p={SLOTS[i].p} mode="sil" s={st(i)} />
						</g>
					))}
				</WorldWindow>
			) : null}
			{beads && letters > 0 ? (
				<WorldWindow plane={R8} opacity={letters}>
					<DisplayText x={W / 2} y={H / 2 + 118} size={330} len={1720} fill="#fff">
						FLATLINE
					</DisplayText>
				</WorldWindow>
			) : null}

			<Glass t={t} />

			{/* the wire */}
			<Neon d={`M0,${H / 2} L${W},${H / 2}`} color={U.lime} width={3} glow={0.9} />

			{/* exploded-diagram leader lines, bar 46 only */}
			{exploded && t < bt(47) ? (
				<g opacity={0.5 * (1 - seg(t, bt(46, 4), bt(47)))}>
					{order.map((i) => {
						const {X, Y} = proj(poses[i]);
						return <line key={i} x1={W / 2} y1={H / 2} x2={X} y2={Y} stroke={U.lime} strokeWidth={1} strokeDasharray="3 7" />;
					})}
				</g>
			) : null}

			{/* the parts */}
			<g opacity={fadeIn}>
				{order.map((i) => {
					const q = poses[i];
					if (q.y > H + 300) return null;
					const bodyOp = beads ? beadLight(t, q, dotX) : 1 - win;
					return (
						<g key={i} transform={transformOf(q)}>
							<g opacity={bodyOp}>
								<PartShape p={SLOTS[i].p} mode="body" s={st(i)} />
							</g>
							{beads ? <g opacity={beadFlash(t, q, dotX)}><PartShape p={SLOTS[i].p} mode="sil" s={st(i)} /></g> : null}
							{TEXTY.includes(SLOTS[i].p.kind) ? null : <PartShape p={SLOTS[i].p} mode="edge" s={st(i)} />}
						</g>
					);
				})}
			</g>

			{beads && sw.i >= 0 && t < bt(51) ? (
				<g>
					<circle cx={dotX} cy={H / 2} r={30} fill="#fff" opacity={0.12} />
					<circle cx={dotX} cy={H / 2} r={9} fill="#fff" />
				</g>
			) : null}

			<rect width={W} height={H} fill="#fff" opacity={flash} />
		</Stage>
	);
};

/** Beat position (1–4) of a grid beat time. */
const beatPos = (time: number) => {
	for (let bar = 45; bar <= 51; bar++) for (let b = 1; b <= 4; b++) if (Math.abs(bt(bar, b) - time) < 1e-3) return b;
	return 0;
};

// a bead flashes white when the sweep dot reaches it, then goes dark
const beadFlash = (t: number, q: Pose, dotX: number) => {
	const {X} = proj(q);
	const d = dotX - X;
	return d >= 0 && d < 140 ? Math.exp(-d / 40) : 0;
};
const beadLight = (t: number, q: Pose, dotX: number) => {
	const {X} = proj(q);
	return dotX > X ? 0.35 : 1;
};
