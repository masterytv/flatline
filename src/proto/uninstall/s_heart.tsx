import React from 'react';
import {F} from '../../full/cues';
import {UI_FONT} from '../../theme';
import {bt} from '../../timing';
import {DisplayText} from './parts';
import {H, HEART_D, Neon, Plane, Stage, U, W, WorldWindow, beatTimes, clamp01, heartT, lerp, outBack, outCubic, pathOf, seg, since, smooth, tempoAt, traceD, tracePoints} from './lib';

// 1:35.9 → 1:56.1  THE LIKE HEART ON A MONITOR · HEART WINDOW (R14) · MONITOR SWEEP (R3) · THE LINE WRITES IT

const R14: Plane = {id: 'R14', z: 1.25, fx: 0.42, fy: 0.37, sx: 760 / W, sy: 431 / H, free: true};
const R3: Plane = {id: 'R3', z: 1.08, fx: 0.52, fy: 0.45};

const ECG_Y = 905;
const PX_PER_S = 520;

/** Heart size (fraction of frame height) and centre x through bars 51–56. */
const heartGeom = (t: number) => {
	if (t < F.started) return {h: 0.4, cx: 760};
	const steps = [
		{at: F.started, h: 0.6, cx: 760},
		{at: bt(54), h: 0.8, cx: 800},
		{at: bt(55), h: 1.0, cx: 900},
		{at: bt(56), h: 1.25, cx: 1000},
	];
	let i = 0;
	for (let k = 0; k < steps.length; k++) if (t >= steps[k].at) i = k;
	if (i === 0) return {h: steps[0].h, cx: steps[0].cx};
	const k = outBack(seg(t, steps[i].at, steps[i].at + 0.22), 1.3);
	return {h: lerp(steps[i - 1].h, steps[i].h, k), cx: lerp(steps[i - 1].cx, steps[i].cx, k)};
};

const HEART_BEATS = beatTimes(F.heart, bt(57));

const Readout: React.FC<{x: number; y: number; value: number; dead: boolean}> = ({x, y, value, dead}) => (
	<g fontFamily={UI_FONT}>
		<path d={HEART_D} transform={`translate(${x} ${y - 46}) scale(1.9)`} fill={dead ? 'none' : U.pink} stroke={U.pink} strokeWidth={dead ? 1.2 : 0} />
		<text x={x + 56} y={y} fontSize={64} fontWeight={700} fill={dead ? U.pink : U.text} style={{fontVariantNumeric: 'tabular-nums'}}>
			{Math.round(value)}
		</text>
		<text x={x + 66 + 40 * String(Math.round(value)).length} y={y - 4} fontSize={20} fontWeight={600} letterSpacing={2} fill={U.muted}>
			BPM
		</text>
	</g>
);

export const HeartScene: React.FC<{t: number}> = ({t}) => {
	const stopped = t >= F.stopped && t < F.started;
	const alive = t >= F.started;
	const {h: hf, cx} = heartGeom(stopped ? F.stopped : t);
	const b = since(t, HEART_BEATS);
	const beatK = b.i < 0 ? 0 : Math.exp(-b.dt / 0.12);
	const frozenBeat = (() => {
		const s = since(F.stopped - 0.001, HEART_BEATS);
		return Math.exp(-(F.stopped - 0.001 - HEART_BEATS[s.i]) / 0.12);
	})();
	const beatScale = 1 + 0.06 * (stopped ? frozenBeat : beatK) * (t < F.heart + 0.05 ? 0 : 1);
	const hpx = hf * H * beatScale;
	const cy = 500;
	const drain = stopped ? smooth(seg(t, F.stopped, F.stopped + 0.35)) : 0;
	const intro = outBack(seg(t, F.heart, F.heart + 0.25), 1.6);
	const outlineW = alive ? lerp(3, 1.2, seg(hf, 0.6, 1.25)) : 3;

	// ECG: newest spike under the heart, older ones scroll left
	const spikeBeats = HEART_BEATS.filter((x) => x <= t && (x < F.stopped || x >= F.started));
	const flatten = stopped ? 1 - seg(t, F.stopped, F.stopped + 0.15) : 1;
	const spikes = spikeBeats.map((x) => ({x: cx + (x - t) * PX_PER_S, a: (x < F.stopped ? 95 * flatten : 110) * (x === HEART_BEATS[0] ? 1 : 1)}));
	const head = cx;
	const ecgPast = traceD(-40, head, ECG_Y, spikes, {w: 38});
	const bpm = stopped ? 0 : alive ? tempoAt(t) * seg(t, F.started, bt(54)) : tempoAt(t);

	// heart unravels into the line at 57.1
	const unravel = seg(t, bt(57), bt(57) + 0.35);

	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />

			{/* words on black (the window swallows them as it grows) */}
			{!alive ? (
				<g>
					<DisplayText x={1130} y={430} size={150} anchor="start" opacity={seg(t, F.heart, F.heart + 0.15)}>
						MY HEART
					</DisplayText>
					{stopped ? (
						<DisplayText x={1130} y={590} size={150} anchor="start" fill={U.pink} opacity={seg(t, F.stopped, F.stopped + 0.06)}>
							STOPPED
						</DisplayText>
					) : null}
				</g>
			) : (
				<g opacity={1 - seg(t, bt(55), bt(55) + 0.2)}>
					<DisplayText x={1640} y={330} size={58} opacity={seg(t, F.started, F.started + 0.2)} len={430}>
						AND I STARTED
					</DisplayText>
					{t >= F.dancing ? (
						<g transform={`translate(1640 ${470}) scale(${1 + 0.3 * Math.exp(-(t - F.dancing) / 0.1) + 0.05 * beatK})`}>
							<DisplayText x={0} y={54} size={150} len={430}>
								DANCING
							</DisplayText>
						</g>
					) : null}
				</g>
			)}

			{/* the heart: pink icon, then an outline, then a window onto R14 */}
			{alive && unravel < 1 ? (
				<WorldWindow plane={R14} opacity={1 - seg(unravel, 0, 0.5)}>
					<path d={HEART_D} transform={heartT(cx, cy, hpx)} fill="#fff" />
				</WorldWindow>
			) : null}
			{t < bt(57) ? (
				<g transform={`translate(${cx} ${cy}) scale(${alive ? 1 : intro}) translate(${-cx} ${-cy})`}>
					<path d={HEART_D} transform={heartT(cx, cy, hpx)} fill={U.pink} opacity={alive ? 0 : 1 - drain} />
					<path d={HEART_D} transform={heartT(cx, cy, hpx)} fill="none" stroke={U.pink} strokeWidth={outlineW} vectorEffect="non-scaling-stroke" opacity={alive ? 1 : drain} />
				</g>
			) : null}
			{unravel > 0 && unravel < 1 ? <Unravel t={t} k={unravel} cx={cx} cy={cy} h={hpx} /> : null}

			{/* the live ECG */}
			<g opacity={1 - unravel}>
				<Neon d={ecgPast} color={U.lime} width={3} />
				<path d={`M${head},${ECG_Y} L${W + 20},${ECG_Y}`} stroke={U.lime} strokeWidth={2} opacity={0.25} />
				<circle cx={head} cy={ECG_Y} r={7} fill="#fff" />
				<Readout x={1410} y={1010} value={bpm} dead={stopped} />
			</g>
		</Stage>
	);
};

/** The heart outline pulls taut into a straight line across the frame. */
const Unravel: React.FC<{t: number; k: number; cx: number; cy: number; h: number}> = ({k, cx, cy, h}) => {
	const n = 160;
	const s = h / 16.5;
	const pts: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * Math.PI * 2;
		// parametric heart, roughly matching the icon's proportions
		const hx = 16 * Math.pow(Math.sin(a), 3);
		const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
		const px = cx + hx * s * 0.62;
		const py = cy + hy * s * 0.56 - s * 0.6;
		const lx = (i / n) * W;
		const e = outCubic(k);
		pts.push([lerp(px, lx, e), lerp(py, H / 2, e)]);
	}
	return <Neon d={pathOf(pts)} color={mixC(k)} width={lerp(2, 3, k)} />;
};
const mixC = (k: number) => (k < 0.5 ? U.pink : U.lime);

// ---------------------------------------------------------------- 1:46.9 monitor sweep over R3

const SWEEP_STARTS = [bt(57), bt(58), bt(59), bt(60), bt(60, 2), bt(60, 3), bt(60, 4), bt(61)];

export const SweepScene: React.FC<{t: number}> = ({t}) => {
	const s = since(t, SWEEP_STARTS);
	const i = Math.max(0, Math.min(s.i, SWEEP_STARTS.length - 2));
	const t0 = SWEEP_STARTS[i];
	const t1 = SWEEP_STARTS[i + 1];
	const head = clamp01((t - t0) / (t1 - t0)) * W;
	const persist = lerp(0.5, 0.9, seg(t, bt(57), bt(60))) * W;
	const fast = t >= bt(60);
	const flat = seg(t, bt(60, 4), bt(60, 4) + 0.2);
	const beatsInSweep = beatTimes(t0, t1 + 0.001);
	const spikes = beatsInSweep.filter((x) => x <= t).map((x) => ({x: ((x - t0) / (t1 - t0)) * W, a: (fast ? 300 : 190) * (1 - flat)}));
	// the previous sweep's tail on the right
	const prevT0 = i > 0 ? SWEEP_STARTS[i - 1] : t0;
	const prevSpikes = beatTimes(prevT0, t0).map((x) => ({x: ((x - prevT0) / (t0 - prevT0)) * W, a: (i > 3 ? 300 : 190) * (1 - flat)}));
	const y = H / 2;
	const band = (h0: number, len: number, id: string, op = 1) => (
		<>
			<defs>
				<linearGradient id={id} gradientUnits="userSpaceOnUse" x1={h0 - len} y1={0} x2={h0} y2={0}>
					<stop offset="0" stopColor="#fff" stopOpacity={0} />
					<stop offset="1" stopColor="#fff" stopOpacity={op} />
				</linearGradient>
			</defs>
			<rect x={h0 - len} y={0} width={len} height={H} fill={`url(#${id})`} />
		</>
	);
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			{/* phosphor: lime monochrome over the full persistence, warm colour only right at the sweep */}
			<WorldWindow plane={R3} grade="lime" opacity={0.55}>
				{band(head, persist, 'sw-l1')}
				{band(head + W, persist, 'sw-l2', 0.7)}
			</WorldWindow>
			<WorldWindow plane={R3}>
				{band(head, persist * 0.32, 'sw-w1')}
				{band(head + W, persist * 0.32, 'sw-w2', 0.6)}
			</WorldWindow>
			{/* the trace: fades behind the sweep */}
			<defs>
				<linearGradient id="sw-tr" gradientUnits="userSpaceOnUse" x1={head - persist * 1.2} y1={0} x2={head} y2={0}>
					<stop offset="0" stopColor={U.lime} stopOpacity={0} />
					<stop offset="1" stopColor={U.lime} stopOpacity={1} />
				</linearGradient>
				<linearGradient id="sw-tr2" gradientUnits="userSpaceOnUse" x1={head + W - persist * 1.2} y1={0} x2={head + W} y2={0}>
					<stop offset="0" stopColor={U.lime} stopOpacity={0} />
					<stop offset="1" stopColor={U.lime} stopOpacity={1} />
				</linearGradient>
			</defs>
			<path d={traceD(0, head, y, spikes, {w: 46})} fill="none" stroke="url(#sw-tr)" strokeWidth={14} opacity={0.18} strokeLinejoin="round" />
			<path d={traceD(0, head, y, spikes, {w: 46})} fill="none" stroke="url(#sw-tr)" strokeWidth={4} strokeLinejoin="round" />
			<path d={traceD(Math.min(W, head + 40), W, y, prevSpikes, {w: 46})} fill="none" stroke="url(#sw-tr2)" strokeWidth={4} strokeLinejoin="round" />
			{/* the erase bar and the write head */}
			<rect x={head + 6} y={0} width={34} height={H} fill="#000" opacity={0.85} />
			<circle cx={head} cy={tracePoints(head - 1, head + 1, spikes, {w: 46, base: () => y}).slice(-1)[0]?.[1] ?? y} r={6} fill="#fff" />
		</Stage>
	);
};

// ---------------------------------------------------------------- 1:54.3 "flatline" written by the line

// single-stroke lowercase, x-height 1, baseline 0, up is negative; each letter starts and ends on the baseline
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 18): [number, number][] =>
	Array.from({length: n + 1}, (_, i) => {
		const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
		return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
	});

const LETTERS: Record<string, {w: number; pts: [number, number][]; dot?: [number, number]}> = {
	f: {w: 0.75, pts: [[0, 0], [0.2, -0.4], [0.38, -0.95], [0.46, -1.45], [0.42, -1.85], [0.3, -2.02], [0.18, -1.9], [0.14, -1.5], [0.15, -1.0], [-0.12, -1.0], [0.5, -1.0], [0.15, -1.0], [0.16, -0.5], [0.2, 0.55], [0.12, 0.75], [0.04, 0.55], [0.16, -0.05], [0.4, 0], [0.75, 0]]},
	l: {w: 0.5, pts: [[0, 0], [0.2, -0.4], [0.38, -0.95], [0.46, -1.45], [0.42, -1.85], [0.3, -2.02], [0.18, -1.9], [0.14, -1.5], [0.16, -0.8], [0.22, -0.2], [0.36, 0], [0.5, 0]]},
	a: {w: 1.1, pts: [[0, 0], [0.25, -0.2], [0.85, -0.7], ...arc(0.45, -0.5, 0.42, -25, -385, 30), [0.87, -0.78], [0.9, -0.2], [1.1, 0]]},
	t: {w: 0.75, pts: [[0, 0], [0.2, -0.3], [0.3, -1.5], [0.25, -1.0], [0, -1.0], [0.65, -1.0], [0.27, -1.0], [0.3, -0.2], [0.75, 0]]},
	i: {w: 0.45, pts: [[0, 0], [0.2, -0.3], [0.22, -1.0], [0.24, -0.2], [0.45, 0]], dot: [0.24, -1.45]},
	n: {w: 1.0, pts: [[0, 0], [0.1, -0.5], [0.12, -1.0], [0.14, -0.1], [0.15, -0.55], ...arc(0.5, -0.55, 0.36, 180, 360, 14), [0.86, -0.1], [1.0, 0]]},
	e: {w: 0.95, pts: [[0, 0], [0.05, -0.5], [0.85, -0.5], ...arc(0.45, -0.5, 0.42, 0, -300, 24), [0.95, 0]]},
};

const WORD = 'flatline';
const XH = 118; // x-height in px
const GAP = 0.42; // baseline gap between letters, where the spikes go
const WRITE_BEATS = beatTimes(F.flatline3, bt(62));

const wordGeometry = () => {
	const total = WORD.split('').reduce((s, c) => s + LETTERS[c].w + GAP, -GAP);
	const x0 = (W - total * XH) / 2;
	const y0 = H / 2 + 40;
	const pts: [number, number][] = [[0, y0]];
	const dots: [number, number][] = [];
	const gaps: number[] = [];
	let x = x0;
	WORD.split('').forEach((c, i) => {
		const L = LETTERS[c];
		for (const [px, py] of L.pts) pts.push([x + px * XH, y0 + py * XH]);
		if (L.dot) dots.push([x + L.dot[0] * XH, y0 + L.dot[1] * XH]);
		x += L.w * XH;
		if (i < WORD.length - 1) {
			gaps.push(x + (GAP * XH) / 2);
			x += GAP * XH;
		}
	});
	pts.push([W, y0]);
	return {pts, dots, gaps, y0};
};
const WG = wordGeometry();

export const WriteScene: React.FC<{t: number}> = ({t}) => {
	// spikes in four of the gaps between letters, one per beat
	const spikeGaps = [0, 2, 4, 6];
	const prog = seg(t, F.flatline3, bt(62) - 0.05);
	const taut = outCubic(seg(t, bt(62), bt(62) + 0.2));
	// build the path with spikes inserted
	const withSpikes: [number, number][] = [];
	for (let i = 0; i < WG.pts.length; i++) {
		const [x, y] = WG.pts[i];
		const nx = WG.pts[i + 1]?.[0];
		withSpikes.push([x, y]);
		for (const gi of spikeGaps) {
			const gx = WG.gaps[gi];
			if (nx !== undefined && Math.abs(y - WG.y0) < 1 && Math.abs(WG.pts[i + 1][1] - WG.y0) < 1 && x <= gx && nx > gx) {
				const sp = tracePoints(gx - 30, gx + 30, [{x: gx, a: 120}], {w: 26, base: () => WG.y0, step: 60});
				withSpikes.push(...sp);
			}
		}
	}
	// arc-length cut at the write head
	const lens = [0];
	for (let i = 1; i < withSpikes.length; i++) lens.push(lens[i - 1] + Math.hypot(withSpikes[i][0] - withSpikes[i - 1][0], withSpikes[i][1] - withSpikes[i - 1][1]));
	const total = lens[lens.length - 1];
	const L = prog * total;
	const drawn: [number, number][] = [];
	for (let i = 0; i < withSpikes.length; i++) {
		if (lens[i] <= L) drawn.push(withSpikes[i]);
		else {
			const a = withSpikes[i - 1];
			const b = withSpikes[i];
			const k = (L - lens[i - 1]) / (lens[i] - lens[i - 1]);
			drawn.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
			break;
		}
	}
	const pulled = drawn.map(([x, y]): [number, number] => [x, lerp(y, H / 2, taut)]);
	const tip = pulled[pulled.length - 1];
	const dotsShown = WG.dots.filter(([x]) => tip && x < tip[0]);
	const kick = since(t, WRITE_BEATS);
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			<Neon d={pathOf(pulled)} color={U.lime} width={4.5} glow={1 + 0.6 * (kick.i >= 0 ? Math.exp(-kick.dt / 0.15) : 0)} />
			{dotsShown.map(([x, y], i) => (
				<circle key={i} cx={x} cy={lerp(y, H / 2, taut)} r={7} fill={U.lime} opacity={1 - taut} />
			))}
			{tip && prog < 1 ? (
				<g>
					<circle cx={tip[0]} cy={tip[1]} r={26} fill={U.lime} opacity={0.18} />
					<circle cx={tip[0]} cy={tip[1]} r={8} fill="#fff" />
				</g>
			) : null}
		</Stage>
	);
};
