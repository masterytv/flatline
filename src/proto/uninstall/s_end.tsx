import React from 'react';
import {F} from '../../full/cues';
import {DISPLAY_FONT, UI_FONT} from '../../theme';
import {bt} from '../../timing';
import SKY from './data/r10_skyline.json';
import {DisplayText, LogoMark, P, Part, PartShape} from './parts';
import {H, Neon, Plane, Stage, U, W, WorldWindow, beatTimes, clamp01, inCubic, kickOn, lerp, outBack, outCubic, outExpo, pathOf, planeRect, rnd, seg, since, smooth, tracePoints} from './lib';

// 2:52.8 → end  THE IRIS (R12) · THE LAST UNINSTALL · FREEZE · THE LOGO DETONATES (R7) · DAWN SKYLINE (R10) · END CARD

const R12: Plane = {id: 'R12', z: 1.32, fx: 0.475, fy: 0.47};

/** Aperture: a 7-blade polygon that rounds into a circle as it opens. */
const aperture = (cx: number, cy: number, R: number, rot: number, round: number) => {
	const n = 7;
	const seg7 = (Math.PI * 2) / n;
	const pts: [number, number][] = [];
	for (let i = 0; i <= 140; i++) {
		const th = (i / 140) * Math.PI * 2;
		const local = ((((th - rot) % seg7) + seg7) % seg7) - seg7 / 2;
		const rp = (R * Math.cos(seg7 / 2)) / Math.cos(local);
		const r = lerp(rp, R, round);
		pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]);
	}
	return pathOf(pts) + 'Z';
};

const IRIS_WORDS: {text: string; at: number; until: number}[] = [
	{text: 'my', at: bt(93, 2), until: bt(95)},
	{text: 'heart', at: bt(93, 3), until: bt(95)},
	{text: 'stopped...', at: bt(93, 4), until: bt(95)},
	{text: 'and', at: bt(95), until: F.type3},
	{text: 'I', at: bt(95, 2) - 0.12, until: F.type3},
	{text: 'started', at: bt(95, 2), until: F.type3},
	{text: 'dancing', at: bt(95, 3), until: F.type3},
];

const BIG_WORDS = [
	{text: 'MY HEART STOPPED', at: bt(97, 3), y: 250, size: 176, len: 1640},
	{text: 'AND I STARTED', at: bt(99), y: 930, size: 160, len: 1400},
	{text: 'DANCING', at: bt(100), y: H / 2 + 150, size: 420, len: 1780},
];

export const IrisScene: React.FC<{t: number}> = ({t}) => {
	const cx = W / 2;
	const cy = H / 2;
	const beats = beatTimes(F.type2, F.final + 0.01);
	const kick = kickOn(t, beats, 0.16);
	let R = 0;
	let round = 1;
	let rot = 0;
	const open1 = smooth(seg(t, bt(93, 2), bt(95)));
	const shut = outExpo(seg(t, bt(97, 3), bt(97, 3) + 0.12));
	const open2 = seg(t, bt(99), F.final);
	if (t < bt(97, 3)) {
		R = lerp(0, 297, open1);
		round = open1 ** 2;
		rot = open1 * 1.4;
		if (t >= bt(95)) R *= 1 + 0.03 * kick;
	} else if (t < bt(99)) {
		R = lerp(297, 0, shut);
		round = 1 - shut;
	} else {
		// faster and bigger, then past the frame edges through the swell
		const fast = outCubic(seg(t, bt(99), bt(99) + 0.5));
		const swell = inCubic(seg(t, F.swell, F.final));
		R = lerp(0, 380, fast) + 900 * swell + 40 * swell * kick;
		round = fast;
		rot = fast * 1.4;
		R *= 1 + 0.03 * kick * (1 - swell);
	}
	const lineFront = t >= F.type3 && t < bt(97, 3) + 0.15;
	const glow = 1 + 2.5 * seg(t, F.swell, F.final);
	const flash = t >= F.final - 0.05 ? 1 : 0;
	const words = IRIS_WORDS.filter((w) => t >= w.at && t < w.until);
	const wx = cx + Math.max(R, 30) + 60;
	const lineCol = U.gold;
	return (
		<Stage>
			<rect width={W} height={H} fill={U.warmBlack} />
			{/* huge words on black, swallowed by the circle as it grows */}
			{BIG_WORDS.map((w) =>
				t >= w.at ? (
					<g key={w.text} transform={`translate(${cx} ${w.y}) scale(${1 + 0.25 * Math.exp(-(t - w.at) / 0.1)})`}>
						<DisplayText x={0} y={w.size * 0.36} size={w.size} len={w.len} fill={U.cream}>
							{w.text}
						</DisplayText>
					</g>
				) : null,
			)}
			<Neon d={`M0,${cy} L${W},${cy}`} color={lineCol} width={2.5} glow={glow} />
			{R > 1 ? (
				<WorldWindow plane={R12}>
					<path d={aperture(cx, cy, R, rot, round)} fill="#fff" />
				</WorldWindow>
			) : null}
			{R > 1 && R < 700 ? <path d={aperture(cx, cy, R, rot, round)} fill="none" stroke={U.gold} strokeWidth={1.2} opacity={0.5} /> : null}
			{lineFront ? <Neon d={`M0,${cy} L${W},${cy}`} color={U.cream} width={3} glow={1.5} opacity={1 - seg(t, bt(97, 3), bt(97, 3) + 0.15)} /> : null}
			{/* the punch-hole camera: the last trace of the phone */}
			{R < 14 ? (
				<g>
					<circle cx={cx} cy={cy} r={14} fill="#000" stroke="#3a3a40" strokeWidth={3} />
					<circle cx={cx - 4} cy={cy - 4} r={3} fill="#24242a" />
				</g>
			) : null}
			{/* the lyric runs along the line, word by word */}
			{words.length ? (
				<text x={wx} y={cy - 22} fontFamily={DISPLAY_FONT} fontWeight={500} fontSize={44} fill={U.cream}>
					{words.map((w, i) => (
						<tspan key={w.text} opacity={seg(t, w.at, w.at + 0.12)}>
							{(i ? ' ' : '') + w.text}
						</tspan>
					))}
				</text>
			) : null}
			<rect width={W} height={H} fill="#fff" opacity={flash} />
		</Stage>
	);
};

// ---------------------------------------------------------------- 3:07.4 the last uninstall: laser fan + burning fragments

const FINAL_BEATS = beatTimes(F.final, bt(104, 3));
const FRAGS: Part[] = [P.toggle(), P.heart(70), P.battery(), P.clock('2:08'), P.seen(), P.badge(), P.spinner(), P.card('jess.wav liked your post', '“out tonight”'), P.bubble('where r u??'), P.signal(), P.button('Stay'), P.pill('@maya.xo'), P.avatar(), P.moon()];

const fragPlace = (i: number): [number, number, number] => {
	const a = rnd(`fa${i}`) * Math.PI * 2;
	const r = 260 + rnd(`fr${i}`) * 260;
	return [W / 2 + Math.cos(a) * r * 1.6, H / 2 + Math.sin(a) * r * 0.85, (rnd(`fz${i}`) - 0.5) * 30];
};

const Sparks: React.FC<{t: number; at: number; x: number; y: number; seed: string; grey: number; blow: number}> = ({t, at, x, y, seed, grey, blow}) => {
	const d = t - at;
	if (d < 0 || d > 2.5) return null;
	return (
		<g>
			{Array.from({length: 26}).map((_, i) => {
				const a = rnd(`${seed}a${i}`) * Math.PI * 2;
				const v = 180 + rnd(`${seed}v${i}`) * 420;
				const drag = (1 - Math.exp(-2.4 * d)) / 2.4;
				let px = x + Math.cos(a) * v * drag;
				let py = y + Math.sin(a) * v * drag + 160 * d * d;
				// the detonation blows them outward
				px += (px - W / 2) * blow * 1.8;
				py += (py - H / 2) * blow * 1.8;
				const life = 1 - clamp01(d / 2.5);
				return <circle key={i} cx={px} cy={py} r={2 + 2.5 * life} fill={grey ? '#bdbdbd' : i % 3 ? U.gold : U.goldDeep} opacity={0.9 * life} />;
			})}
		</g>
	);
};

export const LaserScene: React.FC<{t: number; frozenAt?: number; blow?: number}> = ({t, frozenAt, blow = 0}) => {
	const tt = frozenAt !== undefined ? Math.min(t, frozenAt) : t;
	const grey = frozenAt !== undefined && t >= frozenAt ? 1 : 0;
	const b = since(tt, FINAL_BEATS);
	const step = b.i < 0 ? 0 : b.i + outBack(b.dt / 0.2, 1.3);
	const fan = 8;
	const cx = W / 2;
	const cy = H / 2;
	const len = 1300;
	const lineOp = frozenAt !== undefined ? 1 - (blow > 0 ? clamp01(blow * 3) : 0) : 1;
	const beatTravel = b.i < 0 ? 0 : clamp01(b.dt / 0.45);
	return (
		<g>
			<g opacity={lineOp}>
				{Array.from({length: fan}).map((_, i) => {
					const ang = -90 + (i - (fan - 1) / 2) * 22 + step * 7.5 + (i % 2 ? 180 : 0);
					const spikes = b.i < 0 ? [] : [{x: 120 + beatTravel * (len - 200), a: 70 * (1 - 0.5 * beatTravel)}];
					const d = pathOf(tracePoints(60, len, spikes, {w: 40, base: () => 0, step: 40}));
					return (
						<g key={i} transform={`translate(${cx} ${cy}) rotate(${ang})`}>
							<Neon d={d} color={grey ? '#9a9a9a' : U.gold} width={2.5} glow={grey ? 0.4 : 1.2} />
						</g>
					);
				})}
			</g>
			{FRAGS.map((p, i) => {
				const at = FINAL_BEATS[i];
				if (at === undefined || tt < at) return null;
				const next = FINAL_BEATS[i + 1] ?? at + 0.45;
				const [x, y, rot] = fragPlace(i);
				const life = tt < next ? outBack(seg(tt, at, at + 0.12), 2) : 1 - seg(tt, next, next + 0.12);
				return (
					<g key={i}>
						{life > 0.01 ? (
							<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${1.8 * life})`} opacity={life}>
								<g opacity={0.25}>
									<g transform="scale(1.12)">
										<PartShape p={p} mode="sil" s={{t: tt}} />
									</g>
								</g>
								<g style={{filter: grey ? 'grayscale(1)' : `drop-shadow(0 0 18px ${U.goldDeep})`}}>
									<PartShape p={p} mode="sil" s={{t: tt}} />
								</g>
							</g>
						) : null}
						<Sparks t={tt} at={next} x={x} y={y} seed={`s${i}`} grey={grey} blow={blow} />
					</g>
				);
			})}
		</g>
	);
};

export const FinalScene: React.FC<{t: number}> = ({t}) => {
	const freeze = t >= F.still;
	const push = 1 + 0.03 * seg(t, F.still, F.dancing2);
	const handA = Math.floor(F.still * 2) * 30;
	return (
		<Stage>
			<rect width={W} height={H} fill={U.warmBlack} />
			{freeze ? (
				<DisplayText x={W / 2} y={H / 2 + 160} size={460} fill="#E9E4DA" opacity={0.9} len={1300}>
					STILL
				</DisplayText>
			) : null}
			<g transform={`translate(${W / 2} ${H / 2}) scale(${push}) translate(${-W / 2} ${-H / 2})`}>
				<LaserScene t={t} frozenAt={F.still} />
			</g>
			{t >= bt(104, 3) - 0.3 ? (
				<g transform={`translate(${W / 2} ${H / 2 + 30}) scale(${outBack(seg(t, bt(104, 3) - 0.3, bt(104, 3)), 1.5)})`}>
					<g style={{paintOrder: 'stroke'}} stroke={U.warmBlack} strokeWidth={18} strokeLinejoin="round">
						<LogoMark size={150} t={t} color={U.lime} handAngle={freeze ? handA : undefined} />
					</g>
				</g>
			) : null}
		</Stage>
	);
};

// ---------------------------------------------------------------- 3:16.46 the logo detonates (R7)

const R7: Plane = {id: 'R7', z: 1.04, fx: 0.52, fy: 0.45};
const LETTERS = ['T', 'o', 'k', 'T', 'ı', 'c'];

const Confetti: React.FC<{t: number; at: number}> = ({t, at}) => {
	const d = t - at;
	if (d < 0) return null;
	return (
		<g>
			{Array.from({length: 150}).map((_, i) => {
				const a = rnd(`ca${i}`) * Math.PI * 2;
				const v = 500 + rnd(`cv${i}`) * 1500;
				const drag = (1 - Math.exp(-2.2 * d)) / 2.2;
				const x = W / 2 + Math.cos(a) * v * drag + Math.sin(d * 3 + i) * 16 * d;
				const y = H / 2 + Math.sin(a) * v * drag * 0.7 + 90 * d * d;
				const spin = d * (200 + rnd(`cs${i}`) * 500) + i * 40;
				const life = 1 - clamp01((d - 2.5) / 1.5);
				const s = 0.7 + rnd(`cz${i}`) * 0.9;
				return <rect key={i} x={-7 * s} y={-3.5 * s} width={14 * s} height={7 * s} fill={i % 4 === 0 ? U.cream : i % 2 ? U.gold : U.goldDeep} opacity={life} transform={`translate(${x} ${y}) rotate(${spin}) scale(1 ${Math.cos(spin / 25)})`} />;
			})}
		</g>
	);
};

export const DetonateScene: React.FC<{t: number}> = ({t}) => {
	const at = F.dancing2;
	const d = t - at;
	const gap = bt(106, 2) - bt(106);
	const ring = 1 - (1 - clamp01(d / gap)) ** 2;
	const R = 30 + ring * 1250;
	const flash = 0.95 * Math.exp(-d / 0.06);
	const shake = Math.exp(-d / 0.5) * 18;
	const sx = (rnd(`dx${Math.floor(t * 30)}`) - 0.5) * shake;
	const sy = (rnd(`dy${Math.floor(t * 30)}`) - 0.5) * shake;
	const beats = beatTimes(at, bt(107) + 0.01);
	const bk = kickOn(t, beats, 0.12);
	const slam = Math.exp(-d / 0.09);
	const typeOut = seg(t, bt(107), bt(107) + 0.3);
	const breath = 1 + 0.03 * smooth(seg(t, bt(107), F.dawn));
	const dawn = seg(t, bt(107), F.dawn);
	const cx = W / 2;
	const cy = H / 2;
	return (
		<Stage>
			<g transform={`translate(${sx} ${sy})`}>
				<rect x={-50} y={-50} width={W + 100} height={H + 100} fill={U.warmBlack} />
				{/* frozen sparks and fragments from the freeze, blown outward */}
				{ring < 1 ? <LaserScene t={t} frozenAt={F.still} blow={outCubic(clamp01(d / 0.6))} /> : null}
				<g transform={`translate(${cx} ${cy}) scale(${breath}) translate(${-cx} ${-cy})`}>
					<WorldWindow plane={R7}>
						<circle cx={cx} cy={cy} r={R} fill="#fff" />
					</WorldWindow>
					{dawn > 0 ? (
						<WorldWindow plane={R7} grade="dawn" opacity={dawn}>
							<rect width={W} height={H} fill="#fff" />
						</WorldWindow>
					) : null}
				</g>
				{ring < 1 ? <circle cx={cx} cy={cy} r={R} fill="none" stroke={U.cream} strokeWidth={10 * (1 - ring) + 2} opacity={0.9 * (1 - ring)} /> : null}
				{/* the letters fly out and turn to gold */}
				{LETTERS.map((ch, i) => {
					const a = (i / LETTERS.length) * Math.PI * 2 + 0.4;
					const v = 900 + rnd(`lv${i}`) * 500;
					const drag = (1 - Math.exp(-3 * d)) / 3;
					const x = cx + (i - 2.5) * 80 + Math.cos(a) * v * drag;
					const y = cy + 40 + Math.sin(a) * v * drag;
					const op = 1 - seg(d, 0.1, 0.4);
					return op > 0 ? (
						<text key={i} x={x} y={y} textAnchor="middle" fontFamily={UI_FONT} fontWeight={800} fontSize={150} fill={U.gold} opacity={op} transform={`rotate(${d * 400 * (i % 2 ? 1 : -1)} ${x} ${y})`}>
							{ch}
						</text>
					) : null;
				})}
				<Confetti t={t} at={at} />
			</g>
			{typeOut < 1 ? (
				<g transform={`translate(${cx} ${cy + 250}) scale(${(1 + 0.5 * slam + 0.06 * bk) * (1 + 0.08 * typeOut)})`} opacity={1 - typeOut}>
					<g style={{filter: 'drop-shadow(0 6px 40px rgba(18,12,8,0.55))'}}>
						<DisplayText x={0} y={140} size={400} len={1640} fill="#fff">
							DANCING
						</DisplayText>
					</g>
				</g>
			) : null}
			<rect width={W} height={H} fill="#fff" opacity={flash} />
		</Stage>
	);
};

// ---------------------------------------------------------------- 3:21.9 dawn: the last heart-monitor line traces the skyline (R10)

const R10: Plane = {id: 'R10', z: 1.5, fx: 0.55, fy: 0.69, sx: 0.5, sy: 1.0};
const TOWERS = [0.758, 0.83];

export const DawnScene: React.FC<{t: number}> = ({t}) => {
	const r = planeRect(R10);
	const wipe = smooth(seg(t, F.dawn, F.dawn + 1.0));
	const draw = seg(t, F.dawn + 0.3, bt(111));
	const fade = seg(t, bt(111), 208);
	const beats = beatTimes(F.dawn, bt(111));
	// skyline polyline in screen space, with gentle spikes at the water towers on the beats
	const sky: [number, number][] = (SKY as number[][]).map(([u, v]) => r.at(u, v)).filter(([x]) => x > -20 && x < W + 20);
	const head = draw * W;
	const spikeAt = (x: number) => {
		let a = 0;
		for (const tw of TOWERS) {
			const [tx] = r.at(tw, 0);
			const k = kickOn(t, beats, 0.25);
			const dx = (x - tx) / 26;
			if (Math.abs(dx) < 1) a += k * 26 * (1 - Math.abs(dx)) * (Math.abs(dx) < 0.3 ? 1 : 0.4);
		}
		return a;
	};
	const pts = sky.filter(([x]) => x <= head).map(([x, y]): [number, number] => [x, y - 4 - spikeAt(x)]);
	const words = seg(t, F.stillDancing, F.stillDancing + 0.5);
	const end = seg(t, F.songEnd - 2.5, F.songEnd);
	const col = fade < 1 ? U.gold : U.cream;
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			<g opacity={1 - end}>
				<WorldWindow plane={{id: 'R7', z: 1.04 * 1.03, fx: 0.52, fy: 0.45}} grade="dawn" opacity={1 - wipe}>
					<rect width={W} height={H} fill="#fff" />
				</WorldWindow>
				<defs>
					<linearGradient id="dawn-wipe" x1="0" x2="1" y1="0" y2="0">
						<stop offset={Math.max(0, wipe * 1.4 - 0.4)} stopColor="#fff" stopOpacity={1} />
						<stop offset={Math.min(1, wipe * 1.4)} stopColor="#fff" stopOpacity={0} />
					</linearGradient>
				</defs>
				<WorldWindow plane={R10} grade="dawn">
					<rect width={W} height={H} fill={wipe >= 1 ? '#fff' : 'url(#dawn-wipe)'} />
				</WorldWindow>
				{pts.length > 1 && fade < 1 ? <Neon d={pathOf(pts)} color={col} width={2.5} glow={0.9} opacity={1 - fade} /> : null}
				{pts.length > 1 && draw < 1 ? <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={6} fill="#fff" opacity={1 - fade} /> : null}
				{words > 0 ? (
					<text x={W / 2} y={250} textAnchor="middle" fontFamily={DISPLAY_FONT} fontWeight={500} fontSize={64} fill="#fff" opacity={words} letterSpacing={1}>
						still dancing
					</text>
				) : null}
			</g>
		</Stage>
	);
};

// ---------------------------------------------------------------- end card

export const EndCardScene: React.FC<{t: number}> = ({t}) => {
	const a = seg(t, F.songEnd + 0.2, F.songEnd + 1.0);
	const b = seg(t, F.songEnd + 1.2, F.songEnd + 1.8);
	const out = seg(t, F.endCardOut - 0.5, F.endCardOut);
	const draw = outCubic(seg(t, F.songEnd + 0.6, F.songEnd + 1.9));
	const blipX = W / 2;
	const y = 640;
	const pts = tracePoints(560, 560 + 800 * draw, draw > 0.5 ? [{x: blipX, a: 46}] : [], {w: 30, base: () => y, step: 30});
	return (
		<Stage>
			<rect width={W} height={H} fill="#000" />
			<g opacity={1 - out}>
				<text x={W / 2} y={500} textAnchor="middle" fontFamily={DISPLAY_FONT} fontWeight={500} fontSize={84} fill="#fff" opacity={a}>
					You don't have to die to wake up.
				</text>
				{draw > 0 ? <Neon d={pathOf(pts)} color={U.cream} width={2} glow={0.7} /> : null}
				<text x={W / 2} y={760} textAnchor="middle" fontFamily={UI_FONT} fontWeight={600} fontSize={30} letterSpacing={10} fill={U.muted} opacity={b}>
					PROJECT PROFOUND
				</text>
			</g>
		</Stage>
	);
};
