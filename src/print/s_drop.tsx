import React from 'react';
import {AbsoluteFill} from 'remotion';
import {F} from '../full/cues';
import {T} from '../opening/cues';
import {bt} from '../timing';
import {KenBurns, RealWorld, Still} from '../ui/Worlds';
import {useDensities} from './density';
import {ANTON, INK, MONO, SERIF} from './ink';
import {BatteryGlyph, clamp01, ColorBar, CropMarks, easeOut, FlatlineBar, inked, kickNudge, lerp, RegTarget, Rule, slap, Slug, stamp, Tape} from './kit';
import {Cam, Plate, Sheet} from './press';
import {CamLayer, Paper, Press} from './Press';

// 1:26.6–1:41.4: the press hits, the paste-up, the progressive proofs, then type on bare paper.
export const POSTER = {w: 1520, h: 848, cx: 920, cy: 480};
const PX = POSTER.cx - POSTER.w / 2;
const PY = POSTER.cy - POSTER.h / 2;

/** The opening's KenBurns framing of R8 at T.end, so the hand-over is invisible. */
const openingCam = (): Cam => {
	const k = (T.end - T.drop) / (T.end + 2 - T.drop);
	const e = k * k * (3 - 2 * k);
	const scale = 1.06 + 0.08 * e + 0.12 * Math.exp(-(T.end - T.drop) / 0.18);
	// R8 covers 1920x1080 by height (2752x1536 -> 1935x1080); the poster is 1520 wide
	const onScreenW = 1935 * scale;
	const ty = (1.5 - 3 * e) / 100 * 1080 * scale;
	return {cx: POSTER.cx, cy: POSTER.cy - ty / (onScreenW / POSTER.w), s: onScreenW / POSTER.w};
};

const pressCam = (t: number): Cam => {
	const c0 = openingCam();
	const k = easeOut((t - (T.end + 0.1)) / 0.38);
	const drift = ((t - T.end) / 1.85) * 0.01 * 1920; // the sheet drifts right ~1% per bar
	return {cx: lerp(c0.cx, 960, k) - drift * k, cy: lerp(c0.cy, 540, k), s: lerp(c0.s, 1, k)};
};

const posterSheet = (map: Sheet['map'], plates: Plate[]): Sheet => ({map, w: POSTER.w, h: POSTER.h, cx: POSTER.cx, cy: POSTER.cy, plates, seed: 8});

const PressMarks: React.FC<{t: number; proof: string}> = ({t, proof}) => (
	<>
		<CropMarks x={PX} y={PY} w={POSTER.w} h={POSTER.h} />
		<RegTarget x={PX - 62} y={POSTER.cy} />
		<RegTarget x={PX + POSTER.w + 62} y={POSTER.cy + 300} />
		<ColorBar x={PX + POSTER.w + 46} y={PY + 20} cell={30} />
		<Slug x={PX} y={PY + POSTER.h + 120} text={`FLATLINE · 0% · ${proof} · 01:48`} />
		<Slug x={PX + POSTER.w - 330} y={PY + POSTER.h + 120} text="K 45°  ·  O 15°  ·  85 LPI" />
	</>
);

export const PressHit: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R8']);
	const cam = pressCam(t);
	const dt = t - T.end;
	const mis = 2 + 6 * Math.exp(-dt / 0.22);
	const [kx, ky] = kickNudge(t, 0, 2, bt(46));
	const [ox, oy] = kickNudge(t, 1, 2, bt(46));
	const crush = clamp01(dt / (3 / 30));
	const strip = slap(t, bt(46, 3));
	const title = stamp(t, bt(47));
	const batt = stamp(t, bt(47, 3));
	const tape = slap(t, bt(48));
	const ruleBlack = clamp01(dt / 0.5);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
			</CamLayer>
			{d && (
				<Press
					cam={cam}
					sheets={[
						posterSheet(d.R8, [
							{ch: 1, ink: INK.heat, angle: 15, cell: 8.5, dx: mis * 0.8 + ox, dy: -mis * 0.5 + oy},
							{ch: 0, ink: INK.key, angle: 45, cell: 8.5, dx: kx, dy: ky},
						]),
					]}
				/>
			)}
			<CamLayer cam={cam}>
				<PressMarks t={t} proof="PROOF 1" />
				<Rule x={PX} y={PY + POSTER.h + 70} w={POSTER.w} t={t} alive={(b) => b >= bt(47)} color={INK.lime} opacity={1 - ruleBlack} amp={34} />
				<Rule x={PX} y={PY + POSTER.h + 70} w={POSTER.w} t={t} alive={(b) => b >= bt(47)} opacity={ruleBlack} amp={34} />
				{strip.on && (
					<div
						style={{
							position: 'absolute',
							left: PX - 70,
							top: 618,
							width: POSTER.w + 150,
							height: 176,
							background: INK.heat,
							transform: `rotate(-1.4deg) scale(${strip.s})`,
							boxShadow: strip.shadow,
						}}
					>
						<Paper x={0} y={0} w={POSTER.w + 150} h={176} tint={INK.heat} />
					</div>
				)}
				{title.on && (
					<div
						style={{
							position: 'absolute',
							left: PX + 70,
							top: 532,
							fontFamily: ANTON,
							fontSize: 300,
							lineHeight: 1,
							color: INK.key,
							transform: `rotate(-1.4deg) scale(${title.s})`,
							transformOrigin: '30% 70%',
							mixBlendMode: 'multiply',
							...inked(900, 13, 40, true),
						}}
					>
						0%
					</div>
				)}
				{batt.on && (
					<div style={{position: 'absolute', left: PX + 560, top: 652, width: 300, height: 130, transform: `rotate(-1.4deg) scale(${batt.s})`, mixBlendMode: 'multiply', ...inked(700)}}>
						<BatteryGlyph x={0} y={0} w={240} stroke={15} />
					</div>
				)}
				{tape.on && (
					<div style={{opacity: 1, transform: `scale(${tape.s})`}}>
						<Tape x={PX - 40} y={630} rot={-38} seed={3} />
						<Tape x={PX + POSTER.w + 50} y={782} rot={-34} seed={7} />
					</div>
				)}
				{strip.on && <Slug x={PX + 1060} y={690} text="SIDE A · TRACK 1 · 3:32" size={22} rot={-1.4} />}
			</CamLayer>
			{crush < 1 && (
				// the colour R8 from the shatter, crushed into two inks over 3 frames
				<AbsoluteFill style={{opacity: 1 - easeOut(crush), filter: `contrast(${1 + crush * 2.5}) saturate(${1 - crush})`}}>
					<KenBurns t={t} start={T.drop} end={T.end + 2} from={{scale: 1.06, y: 1.5}} to={{scale: 1.14, y: -1.5}} punch={0.12}>
						<Still id="R8" fallback={<RealWorld t={t} />} />
					</KenBurns>
				</AbsoluteFill>
			)}
		</AbsoluteFill>
	);
};

// 1:32 "Flatline": the printer's progressive proofs as a strobe, one per beat, under a fixed FLATLINE bar.
const PROGS: {paper?: string; plates: [string | null, string | null]; mis: number}[] = [
	{plates: [INK.key, null], mis: 0}, // black only
	{plates: [null, INK.heat], mis: 0}, // orange only
	{plates: [null, INK.cold], mis: 0}, // ultramarine only
	{plates: [INK.key, INK.heat], mis: 7}, // black + orange, off register
	{paper: INK.heat, plates: [INK.key, null], mis: 0}, // orange paper, black
	{plates: [INK.cold, INK.heat], mis: 5}, // ultramarine key + orange
	{paper: INK.heat, plates: [INK.cold, null], mis: 0},
	{plates: [INK.key, INK.heat], mis: 0}, // 50.4: all plates in perfect register
];
const PROG_T = [bt(49), bt(49, 2), bt(49, 3), bt(49, 4), bt(50), bt(50, 2), bt(50, 3), bt(50, 4)];

export const Progs: React.FC<{t: number}> = ({t}) => {
	const d = useDensities(['R8']);
	let n = 0;
	while (n + 1 < PROG_T.length && PROG_T[n + 1] <= t) n++;
	const prog = PROGS[n];
	const cam: Cam = {cx: 960 - (((F.flatline2 - T.end) / 1.85) * 0.01 * 1920), cy: 540, s: 1};
	const st = stamp(t, F.flatline2);
	const plates: Plate[] = [];
	if (prog.plates[1]) plates.push({ch: 1, ink: prog.plates[1], angle: 15, cell: 8.5, dx: prog.mis, dy: -prog.mis * 0.6});
	if (prog.plates[0]) plates.push({ch: 0, ink: prog.plates[0], angle: 45, cell: 8.5});
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper tint={prog.paper} />
			</CamLayer>
			{d && <Press cam={cam} sheets={[posterSheet(d.R8, plates)]} />}
			<CamLayer cam={cam}>
				<PressMarks t={t} proof={`PROG ${n + 1}/8`} />
				<Rule x={PX} y={PY + POSTER.h + 70} w={POSTER.w} t={t} alive={(b) => b < F.flatline2} amp={34} />
				<FlatlineBar x={PX - 40} y={320} w={POSTER.w + 80} h={250} text="FLATLINE" size={232} s={st.s} paper={INK.paper} />
			</CamLayer>
		</AbsoluteFill>
	);
};

// 1:36 "My heart stopped... and I started": type only, on bare paper. "STOPPED" is the first completely still page.
export const Heart: React.FC<{t: number}> = ({t}) => {
	const stopped = t >= F.stopped && t < F.started;
	const drift = stopped ? (F.stopped - F.heart) * 6 : t < F.stopped ? (t - F.heart) * 6 : (F.stopped - F.heart) * 6 + (t - F.started) * 6;
	const cam: Cam = {cx: 960 + drift, cy: 540, s: 1};
	const st = stamp(t, F.stopped);
	const my = stamp(t, F.heart);
	const dots = [bt(52), bt(52, 2), bt(52, 3)];
	const aside = clamp01((t - F.started) / 0.5);
	return (
		<AbsoluteFill style={{background: INK.paper}}>
			<CamLayer cam={cam}>
				<Paper />
				<div style={{position: 'absolute', left: 150, top: 70, fontFamily: ANTON, fontSize: 250, lineHeight: 1, color: INK.key, mixBlendMode: 'multiply', transform: `scale(${my.s})`, transformOrigin: '0 50%', ...inked(900, 3, 9, true)}}>
					MY HEART
				</div>
				{st.on && (
					<div style={{position: 'absolute', left: 150, top: 330, fontFamily: ANTON, fontSize: 250, lineHeight: 1, color: INK.heat, mixBlendMode: 'multiply', transform: `scale(${st.s})`, transformOrigin: '0 50%', ...inked(900, 40, 2, true)}}>
						STOPPED
					</div>
				)}
				{dots.map((b, i) =>
					t >= b ? (
						<div key={i} style={{position: 'absolute', left: 1010 + i * 120, top: 500, width: 74, height: 74, borderRadius: '50%', background: INK.key, mixBlendMode: 'multiply', transform: `scale(${stamp(t, b).s})`, ...inked(300, i * 50, 0)}} />
					) : null,
				)}
				<Rule x={150} y={760} w={1620} t={stopped ? F.stopped : t} freeze={stopped ? F.stopped : undefined} alive={(b) => b < F.stopped || b >= F.started} amp={40} />
				{t >= F.started && (
					<div style={{position: 'absolute', left: 1180, top: 820, fontFamily: SERIF, fontStyle: 'italic', fontSize: 92, color: INK.key, opacity: aside, mixBlendMode: 'multiply', ...inked(600)}}>
						and I started
					</div>
				)}
				<Slug x={150} y={1010} text="PROOF 2 · TYPE ONLY · NO PHOTO" />
			</CamLayer>
		</AbsoluteFill>
	);
};

export const Mono: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <div style={{fontFamily: MONO, ...style}}>{children}</div>;
