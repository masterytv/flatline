import React from 'react';
import {AbsoluteFill, Easing, random, useVideoConfig} from 'remotion';
import {C, DISPLAY_FONT, PHONE_H, PHONE_W, UI_FONT} from '../theme';
import {beatsIn, pulse} from '../timing';
import {Phone} from '../ui/Phone';
import {Notification, Notif} from '../ui/Notification';
import {Battery, StatusBar} from '../ui/StatusBar';
import {TokTicLogo} from '../ui/TokTicLogo';
import {KenBurns, RealWorld, Still} from '../ui/Worlds';
import {keys, ramp} from '../util';
import {F} from './cues';

const usePhoneScale = () => {
	const {width, height} = useVideoConfig();
	return height > width ? (height * 0.8) / (PHONE_H + 28) : (height * 0.86) / (PHONE_H + 28);
};

/** Places children in the coordinate box of a 16:9 photo shown with object-fit: cover. */
const CoverBox: React.FC<{children: React.ReactNode; ratio?: number}> = ({children, ratio = 2752 / 1536}) => {
	const {width, height} = useVideoConfig();
	const s = Math.max(width / ratio, height);
	const bw = s * ratio;
	const bh = s;
	return <div style={{position: 'absolute', left: (width - bw) / 2, top: (height - bh) / 2, width: bw, height: bh}}>{children}</div>;
};

// ---------------------------------------------------------------- 1:54 friends put their phones down (S5)

// Each friend's phone and face in S5, as fractions of the photo.
const FRIENDS = [
	{phone: [0.35, 0.72], face: [0.27, 0.45]},
	{phone: [0.5, 0.63], face: [0.43, 0.43]},
	{phone: [0.62, 0.6], face: [0.57, 0.43]},
	{phone: [0.8, 0.61], face: [0.74, 0.43]},
	{phone: [0.88, 0.58], face: [0.84, 0.45]},
];

export const PhonesDown: React.FC<{t: number; end: number}> = ({t, end}) => {
	const offCount = F.glowsOff.filter((x) => t >= x).length;
	const cold = 1 - offCount / FRIENDS.length;
	return (
		<AbsoluteFill>
			<KenBurns t={t} start={F.couch} end={end} from={{scale: 1.18, x: 2}} to={{scale: 1.06, x: -1}}>
				<Still id="S5" fallback={<RealWorld t={t} />} />
				<CoverBox>
					{FRIENDS.map((fr, i) => {
						const off = F.glowsOff[i];
						const on = t < off ? 1 : Math.exp(-(t - off) / 0.05);
						const warm = ramp(t, off, off + 0.4);
						const [px, py] = fr.phone;
						const [fx, fy] = fr.face;
						return (
							<React.Fragment key={i}>
								{/* the phone's glow on the face and in the hands */}
								<div style={{position: 'absolute', left: `${fx * 100 - 9}%`, top: `${fy * 100 - 14}%`, width: '18%', height: '40%', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 60%, rgba(110,160,255,0.55) 0%, rgba(110,160,255,0) 65%)', mixBlendMode: 'screen', opacity: on}} />
								<div style={{position: 'absolute', left: `${px * 100 - 3}%`, top: `${py * 100 - 4}%`, width: '6%', height: '8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,235,255,0.95) 0%, rgba(120,170,255,0) 70%)', mixBlendMode: 'screen', opacity: on}} />
								{/* once it's down, warm room light takes over the face */}
								<div style={{position: 'absolute', left: `${fx * 100 - 8}%`, top: `${fy * 100 - 12}%`, width: '16%', height: '34%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,170,90,0.45) 0%, rgba(255,170,90,0) 65%)', mixBlendMode: 'soft-light', opacity: warm}} />
							</React.Fragment>
						);
					})}
				</CoverBox>
			</KenBurns>
			<AbsoluteFill style={{background: 'rgba(40,70,170,0.5)', mixBlendMode: 'soft-light', opacity: cold}} />
			<AbsoluteFill style={{background: 'rgba(255,160,80,0.4)', mixBlendMode: 'soft-light', opacity: 1 - cold}} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:08 "No pain, no fear, no clock, no name"

const Rays: React.FC<{k: number}> = ({k}) => (
	<svg viewBox="-100 -100 200 200" style={{position: 'absolute', left: '50%', top: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450, opacity: 1 - k}}>
		{Array.from({length: 18}).map((_, i) => {
			const a = (i / 18) * Math.PI * 2 + random(`ra${i}`) * 0.2;
			const r0 = 10 + 60 * k;
			const r1 = r0 + 20 + 30 * k;
			return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke="#fff" strokeWidth={2.5 - 2 * k} strokeLinecap="round" />;
		})}
	</svg>
);

const NO_ITEMS: {word: string; el: React.ReactNode}[] = [
	{
		word: 'NO PAIN',
		el: <div style={{width: 150, height: 150, borderRadius: 75, background: C.pulse, color: '#fff', fontFamily: UI_FONT, fontWeight: 800, fontSize: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${C.pulse}`}}>99+</div>,
	},
	{
		word: 'NO FEAR',
		el: (
			<div style={{fontFamily: UI_FONT, textAlign: 'right'}}>
				<div style={{background: C.signal, color: '#0B0D12', fontWeight: 600, fontSize: 40, padding: '18px 30px', borderRadius: '36px 36px 8px 36px'}}>did u see my post??</div>
				<div style={{color: '#fff', fontSize: 28, marginTop: 10, opacity: 0.8}}>Seen 1:47</div>
			</div>
		),
	},
	{word: 'NO CLOCK', el: <div style={{fontFamily: UI_FONT, fontWeight: 300, fontSize: 220, color: '#fff', letterSpacing: -8}}>1:47</div>},
	{
		word: 'NO NAME',
		el: (
			<div style={{display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(21,25,34,0.85)', padding: '18px 34px 18px 18px', borderRadius: 60, fontFamily: UI_FONT}}>
				<div style={{width: 80, height: 80, borderRadius: 40, background: `linear-gradient(135deg, ${C.signal}, #8B7BFF)`}} />
				<span style={{fontSize: 52, fontWeight: 700, color: '#fff'}}>@maya.xo</span>
			</div>
		),
	},
];

/** Each word pops up a piece of phone UI, which bursts into light on the next word. */
export const NoWords: React.FC<{t: number}> = ({t}) => {
	const {width} = useVideoConfig();
	const u = width / 1920;
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 70}}>
			{NO_ITEMS.map((item, i) => {
				const at = F.noWords[i];
				const burst = i + 1 < F.noWords.length ? F.noWords[i + 1] : F.light;
				if (t < at || t > burst + 0.5) return null;
				const inK = ramp(t, at, at + 0.18, Easing.out(Easing.back(1.8)));
				const bk = ramp(t, burst, burst + 0.45, Easing.out(Easing.cubic));
				return (
					<AbsoluteFill key={i} style={{alignItems: 'center', justifyContent: 'center'}}>
						<div style={{position: 'absolute', top: '36%', transform: `translateY(-50%) scale(${1.7 * u * (0.6 + 0.4 * inK) * (1 + 1.4 * bk)})`, opacity: Math.min(1, inK * 1.5) * (1 - bk), filter: `brightness(${1 + 3 * bk}) blur(${8 * bk}px)`}}>{item.el}</div>
						{t >= burst ? (
							<>
								<AbsoluteFill style={{background: `radial-gradient(circle at 50% 36%, rgba(255,255,255,${0.9 * (1 - bk)}) 0%, rgba(255,240,210,${0.4 * (1 - bk)}) 25%, rgba(255,255,255,0) 55%)`}} />
								<div style={{position: 'absolute', left: 0, right: 0, top: '36%', height: 0, transform: `scale(${u * 1.6})`}}>
									<Rays k={bk} />
								</div>
							</>
						) : null}
						<div style={{position: 'absolute', top: '72%', transform: 'translateY(-50%)', fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 150 * u * (width < 1200 ? 1.6 : 1), letterSpacing: -4 * u, color: '#fff', opacity: Math.min(1, inK * 2) * (1 - ramp(t, burst, burst + 0.12)), textShadow: '0 6px 40px rgba(0,0,0,0.5)'}}>{item.word}</div>
					</AbsoluteFill>
				);
			})}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:15 "gone for four minutes... free for forever"

export const Stopwatch: React.FC<{t: number}> = ({t}) => {
	const {width, height} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const count = keys(t, [F.fourMin, F.fourMin + 1.2], [0, 240]);
	const mm = Math.floor(count / 60);
	const ss = Math.floor(count % 60);
	const morph = ramp(t, F.forever, F.forever + 0.4, Easing.inOut(Easing.cubic));
	const glow = pulse(t, 0.2);
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 70}}>
			<div style={{position: 'absolute', fontFamily: DISPLAY_FONT, fontWeight: 500, fontSize: 340 * u, color: '#fff', fontVariantNumeric: 'tabular-nums', transform: `scaleX(${1 - morph})`, opacity: 1 - morph, textShadow: '0 8px 50px rgba(0,0,0,0.5)'}}>
				{mm}:{String(ss).padStart(2, '0')}
			</div>
			<div style={{position: 'absolute', fontFamily: DISPLAY_FONT, fontWeight: 500, fontSize: 560 * u, lineHeight: 1, color: C.signal, transform: `scale(${0.3 + 0.7 * morph + 0.04 * glow})`, opacity: morph, textShadow: `0 0 ${60 + 60 * glow}px rgba(198,255,61,0.7)`}}>∞</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:23 the charger goes in; 2:31 the monitor sings

const PINGS: Notif[] = [
	{app: 'TokTic', title: 'jess.wav tagged you', body: 'in 14 photos'},
	{app: 'Messages', title: 'Sam', body: 'where did u go?? 😭'},
	{app: 'TokTic', title: 'You missed 212 likes', body: 'see what you missed'},
	{app: 'TokTic', title: 'kai.mp4 is LIVE', body: 'join now'},
	{app: 'Messages', title: 'Jess', body: 'MAYA. look at this'},
	{app: 'TokTic', title: 'Your streak is about to end', body: 'post something!'},
];

const ChargingScreen: React.FC<{t: number}> = ({t}) => {
	const wake = ramp(t, F.beep1 - 0.05, F.beep1 + 0.25);
	const pings = [...beatsIn(F.beep1, F.beep1 + 1.5), ...beatsIn(F.beep2, F.beep2 + 1.5)].slice(0, 6).map((b) => b.t);
	const flooding = t >= F.flood;
	const floodTimes = flooding ? Array.from({length: Math.min(40, Math.floor((t - F.flood) / 0.05) + 1)}, (_, i) => F.flood + i * 0.05) : [];
	const all = [...pings.filter((p) => p <= t), ...floodTimes];
	const pct = t < F.flood ? 1 : 2;
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: UI_FONT, color: C.text}}>
			<AbsoluteFill style={{opacity: wake, background: 'radial-gradient(circle at 50% 35%, #1D2A1A 0%, #0B0D12 60%)'}}>
				<StatusBar clock="2:31" pct={pct} />
				<div style={{position: 'absolute', top: 120, width: PHONE_W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
					<svg width="54" height="54" viewBox="0 0 24 24" style={{filter: `drop-shadow(0 0 ${10 + 20 * pulse(t, 0.2)}px ${C.signal})`}}>
						<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={C.signal} />
					</svg>
					<div style={{fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 88, color: C.signal, lineHeight: 1}}>{pct}%</div>
					<Battery pct={pct} size={2.4} showPct={false} />
				</div>
				{all.map((at, k) => {
					const slot = all.length - 1 - k;
					if (slot > 7) return null;
					const appear = ramp(t, at, at + 0.15, Easing.out(Easing.back(1.5)));
					return (
						<div key={k} style={{position: 'absolute', left: 16, top: 380 + slot * (flooding ? 62 : 92), opacity: Math.min(1, appear * 1.4) * (1 - ramp(slot, 5, 7)), transform: `translateY(${-30 * (1 - appear)}px) scale(${0.94 + 0.06 * appear})`}}>
							<Notification n={PINGS[k % PINGS.length]} t={t} ago="now" />
						</div>
					);
				})}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const ChargerPhone: React.FC<{t: number}> = ({t}) => {
	const scale = usePhoneScale();
	const cable = ramp(t, F.beep1 - 0.6, F.beep1 - 0.05, Easing.out(Easing.cubic));
	const shake = t >= F.flood ? (random(`cs${Math.floor(t * 30)}`) - 0.5) * 6 * pulse(t, 0.1) : 0;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{filter: 'blur(14px) brightness(0.45)', transform: 'scale(1.1)'}}>
				<Still id="R6" small fallback={<RealWorld t={t} />} />
			</AbsoluteFill>
			<Phone
				scale={scale}
				x={shake}
				overlay={
					// the charger cable slides up into the port
					<div style={{position: 'absolute', left: (PHONE_W + 28) / 2 - 9, top: PHONE_H + 28 + 260 * (1 - cable), width: 18, height: 420, borderRadius: 6, background: 'linear-gradient(90deg, #d9dbe0, #ffffff, #c7cad1)'}} />
				}
			>
				<ChargingScreen t={t} />
			</Phone>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 2:38 she flips the phone face-down

export const PhoneFlip: React.FC<{t: number}> = ({t}) => {
	const scale = usePhoneScale();
	const a = 180 * ramp(t, F.drop3, F.drop3 + 0.32, Easing.inOut(Easing.cubic));
	const back = a > 90;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{filter: 'blur(12px) brightness(0.6)', transform: 'scale(1.1)'}}>
				<Still id="R13" small fallback={<RealWorld t={t} />} />
			</AbsoluteFill>
			<AbsoluteFill style={{perspective: 1800}}>
				<AbsoluteFill style={{transform: `rotateY(${a}deg)`}}>
					<Phone scale={scale}>
						{back ? (
							<AbsoluteFill style={{background: 'linear-gradient(135deg, #24262c, #0d0e11)', transform: 'scaleX(-1)'}}>
								<div style={{position: 'absolute', left: 30, top: 30, width: 120, height: 120, borderRadius: 34, background: '#16171b', boxShadow: 'inset 0 0 0 2px #2c2f36'}} />
							</AbsoluteFill>
						) : (
							<ChargingScreen t={F.flood + 2} />
						)}
					</Phone>
				</AbsoluteFill>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 3:25 "Screen time last night: 0 min."

export const ScreenTimeCard: React.FC<{t: number; at: number; until: number}> = ({t, at, until}) => {
	const {width} = useVideoConfig();
	const u = Math.min(1, width / 1080) * (width > 1200 ? 1 : 1.25);
	if (t < at || t >= until) return null;
	const k = ramp(t, at, at + 0.5, Easing.out(Easing.cubic));
	const out = ramp(t, until - 0.4, until);
	const mins = Math.round(keys(t, [at + 0.3, at + 1.3], [214, 0]));
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '9%', zIndex: 80}}>
			<div style={{transform: `translateY(${30 * (1 - k)}px) scale(${u})`, opacity: k * (1 - out), background: 'rgba(11,13,18,0.72)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: '28px 44px', fontFamily: UI_FONT, color: C.text, minWidth: 520, boxShadow: '0 30px 80px rgba(0,0,0,0.4)'}}>
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}>
					<TokTicLogo size={26} t={t} />
					<span style={{fontSize: 20, color: C.muted}}>6:12 AM</span>
				</div>
				<div style={{fontSize: 26, color: C.muted}}>Screen time last night</div>
				<div style={{fontFamily: DISPLAY_FONT, fontSize: 96, fontWeight: 700, color: mins === 0 ? C.signal : C.text, lineHeight: 1.1}}>{mins} min</div>
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- end card

export const EndCard: React.FC<{t: number}> = ({t}) => {
	const {width} = useVideoConfig();
	const u = width / 1920;
	const vertical = width < 1200;
	const a = ramp(t, F.songEnd + 0.2, F.songEnd + 1.0);
	const b = ramp(t, F.songEnd + 1.2, F.songEnd + 1.8);
	const out = ramp(t, F.endCardOut - 0.5, F.endCardOut);
	return (
		<AbsoluteFill style={{background: '#000', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 * u, opacity: 1 - out}}>
			<div style={{fontFamily: DISPLAY_FONT, fontWeight: 500, fontSize: (vertical ? 150 : 100) * u, color: '#fff', textAlign: 'center', opacity: a, transform: `translateY(${16 * (1 - a)}px)`, padding: '0 8%', lineHeight: 1.15}}>
				You don't have to die to wake up.
			</div>
			<div style={{fontFamily: UI_FONT, fontWeight: 600, fontSize: (vertical ? 56 : 34) * u, letterSpacing: 10 * u, color: C.muted, opacity: b}}>PROJECT PROFOUND</div>
		</AbsoluteFill>
	);
};
