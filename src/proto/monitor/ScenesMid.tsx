import React from 'react';
import {AbsoluteFill, Easing, random} from 'remotion';
import {F} from '../../full/cues';
import {BEATS, beatsIn, bt, lastBeatIndex, pulse} from '../../timing';
import {Notification, Notif} from '../../ui/Notification';
import {keys, ramp} from '../../util';
import {FRIEND_HUES, Glow, H, K, Readout, Svg, W, beatClock, clamp01, ecg, lerp, mix, pathOf, pqrst, sample, tempoAt} from './engine';
import {laneTop} from './SceneLanes';

const HUES = [K.warm, ...FRIEND_HUES];

// ---------------------------------------------------------------- 2:01.6 THE BRAID: six lanes slide together into one ribbon

export const SceneBraid: React.FC<{t: number}> = ({t}) => {
	const k = ramp(t, F.join, bt(66), Easing.inOut(Easing.cubic));
	const tight = ramp(t, bt(67, 4), bt(67, 4) + 0.35, Easing.inOut(Easing.cubic));
	const big = t >= bt(66) ? 1 : 0;
	const tilt = 8 * Math.sin(((t - F.join) / (bt(67) - bt(65))) * Math.PI) * k;
	const window = lerp(2.6, 1.3, k);
	const flash = t >= bt(66) ? Math.max(0, 1 - (t - BEATS[lastBeatIndex(t)].t) * 15) : 0;
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<AbsoluteFill style={{background: K.amber, opacity: 0.22 * flash}} />
			<Svg>
				<g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
					{HUES.map((hue, i) => {
						const laneMid = laneTop(i) + 175 * 0.55;
						const y = lerp(laneMid, H / 2 + (i - 2.5) * 6 * (1 - tight), k);
						const amp = lerp(175 * 0.42, big ? H * 0.3 : H * 0.2, k);
						const x0 = lerp(420, -40, k);
						const x1 = lerp(1700, W + 40, k);
						const pts = sample(x0, x1, 3, (x) => y - amp * ecg(t - ((x1 - x) / (x1 - x0)) * window));
						return <Glow key={i} d={pathOf(pts)} color={i === 0 ? K.amber : hue} coreColor={mix(hue, '#FFFFFF', 0.4)} core={2.4} glow={0.8} opacity={tight > 0 && i > 0 ? 1 - tight : 1} />;
					})}
				</g>
				{['MAYA', 'JESS', 'KAI', 'PRIYA', 'AMARA', 'SAM'].map((n, i) => (
					<text key={n} x={56} y={laneTop(i) + 34 + k * 400} fill={HUES[i]} opacity={0.85 * (1 - k)} style={{font: "600 17px 'Inter', sans-serif", letterSpacing: 5}}>
						{n}
					</text>
				))}
			</Svg>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:08 "No pain, no fear, no clock, no name": the line eats the phone

const BEADS: {word: string; x: number; el: (k: number) => React.ReactNode}[] = [
	{
		word: 'NO PAIN',
		x: 0.2,
		el: (k) => (
			<g>
				<circle r={58} fill="none" stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray={`${k} 1`} />
				<text y={20} textAnchor="middle" fill="none" stroke="#fff" strokeWidth={1.6} opacity={k} style={{font: "800 58px 'Inter', sans-serif"}}>
					99+
				</text>
			</g>
		),
	},
	{
		word: 'NO FEAR',
		x: 0.4,
		el: (k) => (
			<g>
				<rect x={-170} y={-44} width={340} height={78} rx={36} fill="none" stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray={`${k} 1`} />
				<text y={8} textAnchor="middle" fill="none" stroke="#fff" strokeWidth={1.1} opacity={k} style={{font: "600 34px 'Inter', sans-serif"}}>
					did u see my post??
				</text>
				<text x={170} y={66} textAnchor="end" fill="#fff" opacity={0.7 * k} style={{font: "400 22px 'Inter', sans-serif"}}>
					Seen 1:47
				</text>
			</g>
		),
	},
	{
		word: 'NO CLOCK',
		x: 0.6,
		el: (k) => (
			<text y={40} textAnchor="middle" fill="none" stroke="#fff" strokeWidth={2} opacity={k} style={{font: "300 150px 'Inter', sans-serif", letterSpacing: -4}}>
				1:47
			</text>
		),
	},
	{
		word: 'NO NAME',
		x: 0.8,
		el: (k) => (
			<g>
				<rect x={-150} y={-40} width={300} height={80} rx={40} fill="none" stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray={`${k} 1`} />
				<circle cx={-108} cy={0} r={26} fill="none" stroke="#fff" strokeWidth={2} opacity={k} />
				<text x={-68} y={13} fill="none" stroke="#fff" strokeWidth={1.2} opacity={k} style={{font: "700 36px 'Inter', sans-serif"}}>
					@maya.xo
				</text>
			</g>
		),
	},
];

export const SceneNoWords: React.FC<{t: number}> = ({t}) => {
	const y = H * 0.6;
	const window = 2.6;
	const line = sample(0, W, 3, (x) => y - H * 0.22 * ecg(t - ((W - x) / W) * window));
	return (
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 60%, ${K.umber} 0%, ${K.ground} 75%)`}}>
			<Svg>
				<Glow d={pathOf(line)} color={K.amber} coreColor={K.warm} core={2.6} glow={0.9} />
				{BEADS.map((b, i) => {
					const at = F.noWords[i];
					const eat = i + 1 < F.noWords.length ? F.noWords[i + 1] : F.light;
					if (t < at) return null;
					const k = ramp(t, at, at + 0.15);
					const gone = ramp(t, eat, eat + 0.3, Easing.in(Easing.cubic));
					const cx = W * b.x;
					return (
						<g key={i}>
							<g transform={`translate(${cx} ${y - 150 - gone * 160}) scale(${1 - 0.5 * gone})`} opacity={1 - gone}>
								{b.el(k)}
							</g>
							{gone > 0 && gone < 1 ? <Glow d={`M${cx} ${y}L${cx} ${y - 150 - gone * 160}`} color={K.amber} coreColor="#fff" core={3} glow={1.5} opacity={1 - gone} /> : null}
							<text x={cx} y={y + 90} textAnchor="middle" fill={K.warm} opacity={k} style={{font: "700 40px 'Space Grotesk', sans-serif", letterSpacing: 3}}>
								{b.word}
							</text>
						</g>
					);
				})}
			</Svg>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:12.2 "Just light": the line blooms into a flood; 2:15 the timer

const WarmBokeh: React.FC<{t: number; opacity: number}> = ({t, opacity}) => (
	<Svg style={{opacity}}>
		{Array.from({length: 22}).map((_, i) => {
			const r = 60 + random(`wb${i}`) * 170;
			const x = random(`wx${i}`) * W + Math.sin(t * 0.3 + i) * 30;
			const yy = random(`wy${i}`) * H + Math.cos(t * 0.25 + i) * 20;
			return <circle key={i} cx={x} cy={yy} r={r} fill={FRIEND_HUES[i % 5]} opacity={0.18 + 0.2 * random(`wo${i}`) + 0.1 * pulse(t, 0.3)} filter="url(#mb26)" />;
		})}
	</Svg>
);

export const SceneLight: React.FC<{t: number}> = ({t}) => {
	const grow = ramp(t, F.light, F.light + 0.4, Easing.in(Easing.exp));
	const cool = ramp(t, F.light + 0.9, F.light + 1.8, Easing.inOut(Easing.sin));
	const back = t >= F.fourMin;
	const count = keys(t, [F.fourMin, F.fourMin + 1.2], [0, 240]);
	const mm = Math.floor(count / 60);
	const ss = Math.floor(count % 60);
	const sw = 3 + (H * 1.2 - 3) * grow;
	return (
		<AbsoluteFill style={{background: mix('#FFFFFF', '#C8762E', cool)}}>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 55%, rgba(255,214,150,0.6), rgba(90,30,20,${0.55 * cool}) 80%)`}} />
			<WarmBokeh t={t} opacity={cool} />
			{cool < 1 ? (
				<Svg style={{opacity: 1 - cool}}>
					<path d={`M-50 ${H * 0.6}L${W + 50} ${H * 0.6}`} stroke="#FFFFFF" strokeWidth={sw} fill="none" />
				</Svg>
			) : null}
			{back ? (
				<Svg>
					<Glow d={`M0 ${H * 0.66}L${W} ${H * 0.66}`} color="#FFFFFF" coreColor="#FFFFFF" core={3} glow={0.7} opacity={ramp(t, F.fourMin, F.fourMin + 0.2)} />
				</Svg>
			) : null}
			{back ? (
				<div style={{position: 'absolute', left: 0, right: 0, top: H * 0.24, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: H * 0.3, lineHeight: 1, color: '#FFF8EC', fontVariantNumeric: 'tabular-nums', letterSpacing: -6}}>
					{mm}:{String(ss).padStart(2, '0')}
				</div>
			) : null}
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 40, color: '#FFF4E2', opacity: ramp(t, F.light + 1.0, F.light + 1.5) * (1 - ramp(t, F.fourMin - 0.3, F.fourMin))}}>
				just light, so bright
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:17.2 4:00 → ∞; "we move together": a floor of heartbeats

const lemni = (u: number, a: number) => {
	const th = u * Math.PI * 2;
	const d = 1 + Math.sin(th) ** 2;
	return [W / 2 + (a * Math.cos(th)) / d, H * 0.5 + (a * Math.sin(th) * Math.cos(th)) / d] as [number, number];
};

export const SceneForever: React.FC<{t: number}> = ({t}) => {
	const loop = ramp(t, F.forever, F.forever + 0.5, Easing.inOut(Easing.cubic));
	const squash = ramp(t, F.forever, F.forever + 0.25, Easing.in(Easing.cubic));
	const together = ramp(t, F.together, F.together + 0.6, Easing.inOut(Easing.cubic));
	const a = W * 0.3;
	const flat = sample(0, W, 8, () => H * 0.66);
	const inf = Array.from({length: 241}, (_, i) => lemni(i / 240, a));
	const morph = loop < 1 ? flat.map((p, i) => [lerp(p[0], inf[Math.round((i / (flat.length - 1)) * 240)][0], loop), lerp(p[1], inf[Math.round((i / (flat.length - 1)) * 240)][1], loop)] as [number, number]) : inf;
	const lap = (beatClock(t) - beatClock(F.forever)) / 2;
	const head = lemni(lap % 1, a);
	const glow = pulse(t, 0.2);
	const drift = ramp(t, F.together, F.beep1, Easing.linear);
	return (
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, #2A1410 0%, ${K.ground} 80%)`}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: H * 0.24, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: H * 0.3, lineHeight: 1, color: '#FFF8EC', fontVariantNumeric: 'tabular-nums', letterSpacing: -6, transform: `scaleX(${1 - squash})`, opacity: 1 - squash}}>
				4:00
			</div>
			{together < 1 ? (
				<Svg style={{opacity: 1 - together}}>
					<Glow d={pathOf(morph)} color={K.gold} coreColor={K.warm} core={3} glow={1 + 0.5 * glow} />
					{loop >= 1 ? (
						<>
							<circle cx={head[0]} cy={head[1]} r={30 + 12 * glow} fill={K.gold} opacity={0.6} filter="url(#mb12)" />
							<circle cx={head[0]} cy={head[1]} r={6} fill="#fff" />
						</>
					) : null}
				</Svg>
			) : null}
			{together > 0 ? (
				<AbsoluteFill style={{perspective: 1100, opacity: together}}>
					<AbsoluteFill style={{transform: `translateY(${H * 0.12}px) rotateX(55deg) translateY(${-drift * 120}px) scale(1.3)`, transformOrigin: '50% 70%'}}>
						<Svg>
							{Array.from({length: 18}).map((_, i) => {
								const y = H * 0.05 + (i / 17) * H * 0.95;
								const pts = sample(-200, W + 200, 5, (x) => y - 70 * ecg(t - ((W + 200 - x) / (W + 400)) * 2.6 - i * 0.0));
								return <Glow key={i} d={pathOf(pts)} color={FRIEND_HUES[i % 5]} core={2.2} glow={0.6} opacity={0.35 + 0.65 * (i / 17)} />;
							})}
						</Svg>
					</AbsoluteFill>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:23.6 the phone tries to come back; 2:30.9 the monitor sings; 2:32.7 alive

const PINGS: Notif[] = [
	{app: 'TokTic', title: 'jess.wav tagged you', body: 'in 14 photos'},
	{app: 'Messages', title: 'Sam', body: 'where did u go??'},
	{app: 'TokTic', title: 'You missed 212 likes', body: 'see what you missed'},
	{app: 'TokTic', title: 'kai.mp4 is LIVE', body: 'join now'},
	{app: 'Messages', title: 'Jess', body: 'MAYA. look at this'},
	{app: 'TokTic', title: 'Your streak is about to end', body: 'post something!'},
];
const BEEPS = [...beatsIn(F.beep1, F.beep1 + 1.2).slice(0, 3), ...beatsIn(F.beep2, F.beep2 + 1.2).slice(0, 3)].map((b) => b.t);

export const ScenePhone: React.FC<{t: number}> = ({t}) => {
	const grow = ramp(t, F.beep2, F.beep2 + 1.6, Easing.inOut(Easing.cubic));
	const ph = H * lerp(0.6, 0.8, grow);
	const pw = ph / 2.05;
	const cx = W / 2;
	const cy = H / 2 - 10;
	const draw = ramp(t, F.beep1 - 0.5, F.beep1, Easing.inOut(Easing.cubic));
	const shatter = ramp(t, F.alive, F.alive + 0.9, Easing.out(Easing.cubic));
	const alive = t >= F.alive;
	const flood = t >= F.flood;
	const wake = ramp(t, BEEPS[0], BEEPS[0] + 0.2);
	const pings = BEEPS.filter((b) => b <= t);
	const floodN = flood ? Math.min(30, Math.floor((t - F.flood) / 0.06) + 1) : 0;
	const all = [...pings, ...Array.from({length: floodN}, (_, i) => F.flood + i * 0.06)];
	const sing = ramp(t, F.flood, F.alive, Easing.in(Easing.quad));
	const knock = ramp(t, F.alive - 0.6, F.alive, Easing.in(Easing.cubic));
	// cable from the port down and off to the right; the spike travels up it on each beep
	const portY = cy + ph / 2;
	const cable = sample(cx, W + 20, 4, (x) => {
		const u = (x - cx) / (W - cx);
		const base = portY + (H * 0.92 - portY) * Math.min(1, u * 3) ** 0.6;
		let v = 0;
		for (const b of BEEPS) if (t >= b) v += Math.exp(-(t - b) / 0.5) * pqrst((1 - u) * 0.6 - (t - b) * 1.6);
		const wav = flood ? Math.sin(x * 0.045 + t * 21) * Math.sin(x * 0.011 - t * 5) * (20 + 220 * sing) * (0.6 + 0.4 * pulse(t, 0.2)) : 0;
		return base - 90 * v - wav * Math.min(1, u * 6);
	});
	const outline = `M${cx - pw / 2 + 40} ${cy - ph / 2} H${cx + pw / 2 - 40} Q${cx + pw / 2} ${cy - ph / 2} ${cx + pw / 2} ${cy - ph / 2 + 40} V${cy + ph / 2 - 40} Q${cx + pw / 2} ${cy + ph / 2} ${cx + pw / 2 - 40} ${cy + ph / 2} H${cx - pw / 2 + 40} Q${cx - pw / 2} ${cy + ph / 2} ${cx - pw / 2} ${cy + ph / 2 - 40} V${cy - ph / 2 + 40} Q${cx - pw / 2} ${cy - ph / 2} ${cx - pw / 2 + 40} ${cy - ph / 2}Z`;
	const sc = pw / 430;
	// light, not a brand gradient: a slow warm sunrise from below the horizon
	const bg = alive ? `radial-gradient(ellipse 120% 90% at 50% ${105 - (t - F.alive) * 2}%, #FFE7B8 0%, #FFB061 26%, #D9645A 52%, #6A2441 78%, #241020 100%)` : K.ground;
	const horizon = sample(0, W, 4, (x) => H * 0.72 - H * 0.02 * Math.sin(x * 0.004 + t * 1.3) * (t > F.kickOut3 ? 1 : 1 + 6 * (1 - shatter)));
	return (
		<AbsoluteFill style={{background: K.ground}}>
			{alive ? <AbsoluteFill style={{background: bg, opacity: ramp(t, F.alive, F.alive + 1.5)}} /> : null}
			{!alive || shatter < 1 ? (
				<Svg>
					{!alive ? (
						<>
							<Glow d={outline} color={K.lime} core={2.4} glow={0.7} pathLength={1} dash={`${draw} 1`} />
							<Glow d={pathOf(cable)} color={flood ? K.warm : K.lime} coreColor={flood ? '#fff' : undefined} core={2.6} glow={1} />
						</>
					) : (
						// the phone outline breaks into ~40 strokes that fly outward: the 1:24 shatter again, and this time she chooses it
						Array.from({length: 40}).map((_, i) => {
							const ang = random(`sh${i}`) * Math.PI * 2;
							const px = cx + (random(`sx${i}`) - 0.5) * pw;
							const py = cy + (random(`sy${i}`) - 0.5) * ph;
							const len = 40 + random(`sl${i}`) * 90;
							const d = shatter * (500 + random(`sd${i}`) * 900);
							return (
								<g key={i} transform={`translate(${px + Math.cos(ang) * d} ${py + Math.sin(ang) * d}) rotate(${random(`sr${i}`) * 180 + shatter * 200})`}>
									<Glow d={`M${-len / 2} 0L${len / 2} 0`} color={K.lime} core={2.4} glow={0.7} opacity={1 - shatter} />
								</g>
							);
						})
					)}
				</Svg>
			) : null}
			{!alive ? (
				<div style={{position: 'absolute', left: cx - pw / 2, top: cy - ph / 2, width: 430, height: 932, transform: `scale(${sc})`, transformOrigin: '0 0', opacity: wake}}>
					<div style={{position: 'absolute', top: 120, width: 430, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
						<svg width="54" height="54" viewBox="0 0 24 24" style={{filter: `drop-shadow(0 0 ${10 + 20 * pulse(t, 0.2)}px ${K.lime})`}}>
							<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={K.lime} />
						</svg>
						<div style={{fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 88, color: K.lime, lineHeight: 1}}>{flood ? 2 : 1}%</div>
					</div>
					{all.map((at, k) => {
						const slot = all.length - 1 - k;
						if (slot > 6) return null;
						const appear = ramp(t, at, at + 0.15, Easing.out(Easing.back(1.5)));
						const fall = knock * (300 + random(`kn${k}`) * 900);
						return (
							<div key={k} style={{position: 'absolute', left: 16, top: 330 + slot * (flood ? 70 : 92), opacity: Math.min(1, appear * 1.4) * (1 - ramp(slot, 5, 7)) * (1 - knock), transform: `translateY(${-30 * (1 - appear) + fall}px) rotate(${knock * (random(`kr${k}`) - 0.5) * 70}deg)`}}>
								<Notification n={PINGS[k % PINGS.length]} t={t} ago="now" />
							</div>
						);
					})}
				</div>
			) : null}
			{!alive && t >= F.beep1 ? (
				<div style={{position: 'absolute', top: H * 0.44, ...(t < F.beep2 ? {right: cx + pw / 2 + 70} : {left: cx + pw / 2 + 70}), fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 70, lineHeight: 0.95, color: K.lime, textAlign: t < F.beep2 ? 'right' : 'left'}}>
					I&apos;M COMING
					<br />
					BACK
				</div>
			) : null}
			{alive ? (
				<>
					<Svg>
						<Glow d={pathOf(horizon)} color="#FFFFFF" coreColor="#FFFFFF" core={2.6} glow={0.6} opacity={ramp(t, F.alive + 0.3, F.alive + 1)} />
					</Svg>
					<div style={{position: 'absolute', left: 0, right: 0, bottom: 80, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 46, color: '#FFF8EE', opacity: ramp(t, F.alive + 0.5, F.alive + 1.1) * (1 - ramp(t, F.kickOut3, F.kickOut3 + 0.6))}}>
						to feel everything
					</div>
				</>
			) : null}
			{!alive ? <Readout label="HR" value={String(Math.round(tempoAt(t)))} color={K.lime} opacity={0.7} /> : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:38.2 phones down (seen from above), then the wheel

const RING = [F.table, bt(85, 4), F.dump3, bt(86, 2), bt(86, 3)];

const TopPhone: React.FC<{x: number; y: number; rot: number; s: number; face: number; opacity: number}> = ({x, y, rot, s, face, opacity}) => (
	<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * Math.max(0.04, Math.abs(face))} ${s})`} opacity={opacity}>
		<rect x={-62} y={-128} width={124} height={256} rx={20} fill="#000" opacity={0.5} transform="translate(10 14)" filter="url(#mb12)" />
		<rect x={-62} y={-128} width={124} height={256} rx={20} fill={face > 0 ? '#0F1218' : '#15171C'} stroke="#2A2E38" strokeWidth={2} />
		{face > 0 ? (
			<rect x={-54} y={-120} width={108} height={240} rx={14} fill="#1D2A3A" opacity={0.9} />
		) : (
			<>
				<rect x={-48} y={-112} width={42} height={42} rx={12} fill="#0B0C10" stroke="#30343E" strokeWidth={2} />
				<circle cx={-27} cy={-91} r={11} fill="#05060A" stroke="#3A3F4A" strokeWidth={2} />
			</>
		)}
	</g>
);

export const SceneMandala: React.FC<{t: number}> = ({t}) => {
	const flip = ramp(t, F.drop3, F.drop3 + 0.32, Easing.inOut(Easing.cubic));
	const face = Math.cos(flip * Math.PI);
	const spin = ramp(t, F.dump3, F.type2, Easing.linear);
	const bars = (beatClock(t) - beatClock(F.dump3)) / 4;
	const wheel = Math.max(0, bars) * 15;
	const spokes = t >= bt(91) ? 24 : t >= bt(89) ? 12 : 6;
	const grow = ramp(t, F.dump3, F.dump3 + 0.8, Easing.out(Easing.cubic));
	const phonesOut = ramp(t, bt(87), bt(89), Easing.inOut(Easing.sin));
	const coil = ramp(t, bt(92), F.type2, Easing.in(Easing.cubic));
	const R = H * 0.36;
	const cx = W / 2;
	const cy = H / 2;
	return (
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, #4A3022 0%, #241610 45%, #0C0807 90%)`}}>
			<Svg>
				{/* spokes: a heart line from each phone to the centre, QRS pumping outward on every beat */}
				{t >= F.dump3
					? Array.from({length: spokes}).map((_, i) => {
							const a = ((i / spokes) * 360 + wheel + coil * 540) * (Math.PI / 180);
							const off = spokes === 24 && i % 2 ? 0.23 : 0; // offbeat spikes
							const len = R * grow * (1 - coil);
							const pts = sample(0, len, 4, (r) => (r / Math.max(1, len)) * 0 + 50 * ecg(t + off - (r / R) * 0.9));
							const d = pathOf(
								pts.map(([r, v]) => {
									const rr = r + coil * 0;
									const aa = a + coil * (r / R) * 2.5;
									return [cx + Math.cos(aa) * rr - Math.sin(aa) * v, cy + Math.sin(aa) * rr + Math.cos(aa) * v] as [number, number];
								}),
							);
							return <Glow key={i} d={d} color={FRIEND_HUES[i % 5]} coreColor={mix(FRIEND_HUES[i % 5], '#fff', 0.45)} core={2.6} glow={0.45} opacity={1 - coil * 0.3} />;
						})
					: null}
				{/* her phone, flipped face-down; five more drop around it */}
				<TopPhone x={cx} y={cy} rot={-8} s={0.9 * (1 - phonesOut)} face={face} opacity={1 - phonesOut} />
				{RING.map((at, i) => {
					if (t < at) return null;
					const k = ramp(t, at, at + 0.12, Easing.in(Easing.quad));
					const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + (spin * Math.PI) / 6;
					return <TopPhone key={i} x={cx + Math.cos(a) * R} y={cy + Math.sin(a) * R} rot={(a * 180) / Math.PI + 90 + (random(`rp${i}`) - 0.5) * 20} s={0.62 * (1.3 - 0.3 * k)} face={-1} opacity={1 - phonesOut} />;
				})}
				{coil > 0.85 ? <circle cx={cx} cy={cy} r={8 * (1 - coil) * 6 + 2} fill="#fff" /> : null}
			</Svg>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 3:00.1 the line turns vertical, splits; arms rise; DANCING

export const SceneArms: React.FC<{t: number}> = ({t}) => {
	const turn = ramp(t, F.type3 + 0.07, F.type3 + 0.57, Easing.inOut(Easing.cubic));
	const split = ramp(t, F.type3 + 0.57, F.type3 + 0.9, Easing.out(Easing.cubic));
	const swell = ramp(t, bt(99), F.final, Easing.in(Easing.quad));
	const n = Math.round(lerp(6, 24, ramp(t, bt(99), bt(100, 3))));
	const bright = lerp(1, 2.2, swell);
	const white = ramp(t, F.final - 0.12, F.final);
	const rise = lerp(0.3, 1.2, swell);
	const lines = Array.from({length: n}).map((_, i) => {
		const x = n === 1 ? W / 2 : lerp(W / 2, W * (0.08 + (0.84 * i) / (n - 1)), split);
		const top = H - H * rise * (0.75 + 0.25 * random(`ar${i}`));
		const pts = sample(top, H + 10, 4, (y) => x + 26 * ecg(t + i * 0.07 - ((H - y) / H) * 1.4));
		return {x, top, d: pathOf(pts.map(([y, xx]) => [xx, y] as [number, number])), hue: FRIEND_HUES[i % 5]};
	});
	const l1 = ramp(t, F.type3 + 0.9, F.type3 + 1.05);
	const l2 = ramp(t, bt(99), bt(99) + 0.15);
	const l3 = ramp(t, bt(100), bt(100) + 0.2);
	return (
		<AbsoluteFill style={{background: K.ground}}>
			<Svg>
				{turn < 1 ? (
					<g transform={`rotate(${90 * turn} ${W / 2} ${H / 2})`}>
						<Glow d={`M0 ${H / 2}L${W} ${H / 2}`} color={K.peach} coreColor={K.warm} core={2} glow={0.8} />
					</g>
				) : (
					<g style={{filter: `brightness(${bright})`}}>
						{lines.map((l, i) => (
							<g key={i}>
								<Glow d={l.d} color={l.hue} coreColor={mix(l.hue, '#fff', 0.5)} core={2.4} glow={0.8} />
								<circle cx={l.x} cy={l.top} r={5} fill="#fff" />
								<circle cx={l.x} cy={l.top} r={18} fill={l.hue} opacity={0.6} filter="url(#mb12)" />
							</g>
						))}
					</g>
				)}
				<text x={W / 2} y={H * 0.26} textAnchor="middle" fill={K.warm} opacity={l1 * (1 - l3 * 0.6)} style={{font: "700 108px 'Space Grotesk', sans-serif", letterSpacing: -2}}>
					MY HEART STOPPED
				</text>
				<text x={W / 2} y={H * 0.26 + 120} textAnchor="middle" fill={K.warm} opacity={l2 * (1 - l3 * 0.6)} style={{font: "700 108px 'Space Grotesk', sans-serif", letterSpacing: -2}}>
					AND I STARTED
				</text>
				{l3 > 0 ? (
					<text x={W / 2} y={H * 0.72} textAnchor="middle" fill={t >= F.final - 0.12 ? '#fff' : 'none'} stroke="#fff" strokeWidth={4} opacity={l3} style={{font: "700 330px 'Space Grotesk', sans-serif", letterSpacing: 2}}>
						DANCING
					</text>
				) : null}
			</Svg>
			{white > 0 ? <AbsoluteFill style={{background: '#fff', opacity: white}} /> : null}
		</AbsoluteFill>
	);
};

export const _unused = [clamp01];
