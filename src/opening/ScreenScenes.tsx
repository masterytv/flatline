import React from 'react';
import {AbsoluteFill, Easing, getStaticFiles, random} from 'remotion';
import {C, DISPLAY_FONT, PHONE_H, PHONE_W, UI_FONT} from '../theme';
import {BEATS, beatsIn, pulse} from '../timing';
import {Battery, Moon, StatusBar} from '../ui/StatusBar';
import {Notification, Notif} from '../ui/Notification';
import {TokTicLogo} from '../ui/TokTicLogo';
import {FaceWorld, KenBurns, LightsWorld, PartyWorld, ReflectionWorld, Still} from '../ui/Worlds';
import {keys, ramp} from '../util';
import {FEED_IDS, T, batteryAt, clockAt, flipAt} from './cues';

// Everything here is drawn in phone-screen units (PHONE_W × PHONE_H).

const springy = Easing.out(Easing.back(1.6));

const Tap: React.FC<{t: number; at: number; x: number; y: number}> = ({t, at, x, y}) => {
	if (t < at - 0.15 || t > at + 0.5) return null;
	const k = ramp(t, at, at + 0.45);
	const press = t < at ? ramp(t, at - 0.15, at) : 1 - k;
	return (
		<>
			<div style={{position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: `rgba(255,255,255,${0.35 * press})`}} />
			<div style={{position: 'absolute', left: x - 40 * k - 10, top: y - 40 * k - 10, width: 20 + 80 * k, height: 20 + 80 * k, borderRadius: '50%', border: `2px solid rgba(255,255,255,${0.6 * (1 - k)})`}} />
		</>
	);
};

const Button: React.FC<{label: string; primary?: boolean; pressed?: number}> = ({label, primary, pressed = 0}) => (
	<div
		style={{
			flex: 1,
			height: 52,
			borderRadius: 16,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontSize: 18,
			fontWeight: 700,
			background: primary ? C.signal : C.surface2,
			color: primary ? '#0B0D12' : C.muted,
			transform: `scale(${1 - 0.06 * pressed})`,
		}}
	>
		{label}
	</div>
);

const Modal: React.FC<{t: number; at: number; children: React.ReactNode; out?: number}> = ({t, at, children, out}) => {
	const k = ramp(t, at, at + 0.3, springy);
	const o = out !== undefined ? 1 - ramp(t, out, out + 0.2) : 1;
	return (
		<AbsoluteFill style={{background: `rgba(5,6,10,${0.55 * ramp(t, at, at + 0.2) * o})`, alignItems: 'center', justifyContent: 'center', zIndex: 40}}>
			<div
				style={{
					width: 340,
					borderRadius: 28,
					background: C.surface,
					border: '1px solid rgba(255,255,255,0.07)',
					padding: 26,
					fontFamily: UI_FONT,
					color: C.text,
					textAlign: 'center',
					transform: `scale(${0.7 + 0.3 * k})`,
					opacity: Math.min(1, k * 1.5) * o,
					boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
				}}
			>
				{children}
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:00 lock screen

const LOCK_NOTIFS: Notif[] = [
	{app: 'TokTic', title: 'jess.wav liked your post', body: '“out tonight 🖤”'},
	{app: 'TokTic', title: '3 new stories', body: 'from people you follow'},
	{app: 'Messages', title: 'Jess', body: 'are u coming over or not'},
	{app: 'TokTic', title: '@kai.mp4 mentioned you', body: 'in a comment'},
	{app: 'TokTic', title: 'You have 12 new likes', body: 'Keep the streak going 🔥'},
	{app: 'Messages', title: 'Sam', body: 'maya!!'},
	{app: 'TokTic', title: 'Your friends are LIVE', body: "Don't miss it"},
	{app: 'TokTic', title: 'Trending near you', body: 'tap to see what everyone is watching'},
];
// one notification per beep (every other beat in the intro)
const LOCK_TIMES = BEATS.filter((b) => b.t < T.camera)
	.filter((_, i) => i % 2 === 0)
	.map((b) => b.t);

const Wallpaper: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: 'radial-gradient(circle at 30% 20%, #23264A 0%, #0B0D12 55%), #0B0D12'}}>
		<div style={{position: 'absolute', left: 180 + Math.sin(t * 0.4) * 30, top: 560, width: 380, height: 380, borderRadius: '50%', background: '#3B2A78', filter: 'blur(80px)', opacity: 0.55}} />
	</AbsoluteFill>
);

const LockScreen: React.FC<{t: number}> = ({t}) => {
	return (
		<AbsoluteFill style={{fontFamily: UI_FONT, color: C.text}}>
			<Wallpaper t={t} />
			<div style={{position: 'absolute', top: 92, width: PHONE_W, textAlign: 'center'}}>
				<div style={{fontSize: 19, fontWeight: 500, opacity: 0.85}}>Saturday 14 June</div>
				<div style={{fontSize: 104, fontWeight: 300, letterSpacing: -3, lineHeight: 1.05}}>1:47</div>
			</div>
			{LOCK_TIMES.map((a, k) => {
				if (t < a || k >= LOCK_NOTIFS.length) return null;
				const slot = LOCK_TIMES.slice(k + 1).reduce((s, b) => s + ramp(t, b, b + 0.22), 0);
				if (slot > 4.5) return null;
				const appear = ramp(t, a, a + 0.25, springy);
				return (
					<div key={k} style={{position: 'absolute', left: 16, top: 300 + slot * 92 - 40 * (1 - appear), opacity: Math.min(1, appear * 1.4) * (1 - ramp(slot, 3.5, 4.5)), transform: `scale(${0.92 + 0.08 * appear})`}}>
						<Notification n={LOCK_NOTIFS[k]} t={t} ago="now" />
					</div>
				);
			})}
			<div style={{position: 'absolute', bottom: 14, left: PHONE_W / 2 - 70, width: 140, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.7)'}} />
			{t >= T.popup ? (
				<Modal t={t} at={T.popup}>
					<div style={{display: 'flex', justifyContent: 'center', marginBottom: 14}}>
						<Battery pct={20} size={2.2} showPct={false} />
					</div>
					<div style={{fontSize: 22, fontWeight: 700}}>Low battery</div>
					<div style={{fontSize: 16, color: C.muted, margin: '8px 0 22px'}}>20% remaining. Stay connected?</div>
					<div style={{display: 'flex', gap: 12}}>
						<Button label="Close" />
						<Button label="Stay" primary />
					</div>
				</Modal>
			) : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:08 camera

const SpeakerOff: React.FC = () => (
	<svg width="18" height="18" viewBox="0 0 24 24">
		<path d="M4 9h4l5-4v14l-5-4H4z" fill={C.text} />
		<path d="M16 9l5 6M21 9l-5 6" stroke={C.text} strokeWidth="2" strokeLinecap="round" />
	</svg>
);

const CameraScene: React.FC<{t: number}> = ({t}) => {
	const local = t - T.camera;
	const lights = ramp(t, T.lights - 0.2, T.lights + 0.5, Easing.inOut(Easing.cubic));
	const blur = 1.5 + 12 * ramp(t, T.mute, T.mute + 2.5, Easing.inOut(Easing.quad));
	const shakeX = Math.sin(t * 3.1) * 4 + Math.sin(t * 7.3) * 1.5;
	const shakeY = Math.cos(t * 2.7) * 4 - lights * 60;
	const secs = Math.floor(local);
	const p = pulse(t, 0.15);
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: UI_FONT, color: C.text}}>
			<AbsoluteFill style={{transform: `translate(${shakeX}px, ${shakeY}px) scale(1.15)`, filter: `blur(${blur}px)`}}>
				<Still id="S2" fallback={<PartyWorld t={t} />} />
				<AbsoluteFill style={{opacity: lights}}>
					<Still id="S3" fallback={<LightsWorld t={t} />} />
				</AbsoluteFill>
			</AbsoluteFill>
			{/* focus square breathes on the beat */}
			<div style={{position: 'absolute', left: PHONE_W / 2 - 50 - 6 * p, top: 400 - 50 - 6 * p, width: 100 + 12 * p, height: 100 + 12 * p, border: `2px solid ${C.signal}`, borderRadius: 6, opacity: 0.8 - 0.5 * ramp(t, T.mute, T.mute + 1)}} />
			<div style={{position: 'absolute', top: 60, width: PHONE_W, display: 'flex', justifyContent: 'center'}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.45)', padding: '6px 14px', borderRadius: 14, fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>
					<div style={{width: 10, height: 10, borderRadius: 5, background: C.pulse, opacity: Math.floor(t * 2) % 2 ? 1 : 0.4}} />
					00:{String(secs).padStart(2, '0')}
				</div>
			</div>
			{t >= T.mute ? (
				<div style={{position: 'absolute', top: 104, width: PHONE_W, display: 'flex', justifyContent: 'center', opacity: ramp(t, T.mute, T.mute + 0.25), transform: `scale(${0.8 + 0.2 * ramp(t, T.mute, T.mute + 0.3, springy)})`}}>
					<div style={{display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(20,22,30,0.85)', padding: '8px 16px', borderRadius: 18, fontSize: 15, fontWeight: 600}}>
						<SpeakerOff /> Sound off
					</div>
				</div>
			) : null}
			<div style={{position: 'absolute', bottom: 0, width: PHONE_W, height: 190, background: 'rgba(0,0,0,0.55)'}}>
				<div style={{display: 'flex', justifyContent: 'center', gap: 26, marginTop: 16, fontSize: 13, fontWeight: 700, letterSpacing: 1}}>
					<span style={{color: C.muted}}>PHOTO</span>
					<span style={{color: C.signal}}>VIDEO</span>
					<span style={{color: C.muted}}>SLOW-MO</span>
				</div>
				<div style={{position: 'absolute', left: PHONE_W / 2 - 38, top: 62, width: 76, height: 76, borderRadius: 38, border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
					<div style={{width: 30, height: 30, borderRadius: 7, background: C.pulse}} />
				</div>
				<div style={{position: 'absolute', left: 54, top: 82, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>1×</div>
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:21 likes

const Heart: React.FC<{size: number; color: string; filled?: boolean}> = ({size, color, filled = true}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path
			d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"
			fill={filled ? color : 'none'}
			stroke={color}
			strokeWidth={filled ? 0 : 2}
		/>
	</svg>
);

const TokTicHeader: React.FC<{t: number}> = ({t}) => (
	<div style={{position: 'absolute', top: 52, left: 0, width: PHONE_W, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', zIndex: 30}}>
		<TokTicLogo size={28} t={t} />
		<div style={{display: 'flex', gap: 18}}>
			<Heart size={24} color={C.text} filled={false} />
			<svg width="24" height="24" viewBox="0 0 24 24">
				<path d="M3 11l18-8-8 18-2-8z" fill="none" stroke={C.text} strokeWidth="2" strokeLinejoin="round" />
			</svg>
		</div>
	</div>
);

const likeCount = (t: number) => {
	const up = beatsIn(T.likes, Math.min(t, T.doubt) + 0.001).length;
	const down = t >= T.doubt ? beatsIn(T.doubt, t + 0.001).length : 0;
	return 38 + up - Math.min(down * 1, 9);
};

const LikesScene: React.FC<{t: number}> = ({t}) => {
	const p = t < T.doubt ? pulse(t, 0.14) : 0;
	const dropping = t >= T.doubt;
	const big = t >= T.two ? '2' : t >= T.one ? '1' : null;
	const bigAt = t >= T.two ? T.two : T.one;
	return (
		<AbsoluteFill style={{background: C.bg, fontFamily: UI_FONT, color: C.text}}>
			<TokTicHeader t={t} />
			<div style={{position: 'absolute', top: 112, left: 16, display: 'flex', alignItems: 'center', gap: 10}}>
				<div style={{width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${C.signal}, #8B7BFF)`, padding: 2}}>
					<div style={{width: '100%', height: '100%', borderRadius: 16, background: '#222'}} />
				</div>
				<span style={{fontWeight: 700, fontSize: 15}}>maya.xo</span>
				<span style={{color: C.muted, fontSize: 14}}>· 4m</span>
			</div>
			<div style={{position: 'absolute', top: 160, left: 0, width: PHONE_W, height: 520, overflow: 'hidden'}}>
				<Still id="S1" fallback={<FaceWorld t={t} />} />
			</div>
			<div style={{position: 'absolute', top: 696, left: 18, display: 'flex', alignItems: 'center', gap: 12}}>
				<div style={{transform: `scale(${1 + 0.35 * p})`}}>
					<Heart size={34} color={C.pulse} />
				</div>
				<span style={{fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dropping ? C.pulse : C.text}}>{likeCount(t)}</span>
				<span style={{fontSize: 16, color: C.muted, marginLeft: 4}}>likes</span>
			</div>
			<div style={{position: 'absolute', top: 750, left: 18, right: 18, fontSize: 15}}>
				<b>maya.xo</b> out tonight 🖤
			</div>
			{big && t < T.doubt ? (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 20}}>
					<div
						style={{
							fontFamily: DISPLAY_FONT,
							fontWeight: 700,
							fontSize: 300,
							color: C.signal,
							textShadow: '0 0 40px rgba(198,255,61,0.5)',
							transform: `scale(${1.6 - 0.6 * ramp(t, bigAt, bigAt + 0.12)})`,
							opacity: 1 - 0.6 * ramp(t, bigAt + 0.25, bigAt + 0.45),
						}}
					>
						{big}
					</div>
				</AbsoluteFill>
			) : null}
			{dropping ? (
				<div style={{position: 'absolute', left: 0, bottom: 0, width: PHONE_W, height: 150, background: C.surface, borderRadius: '24px 24px 0 0', transform: `translateY(${150 * (1 - ramp(t, T.doubt, T.doubt + 0.3))}px)`, padding: '20px 20px', zIndex: 25}}>
					<div style={{display: 'flex', justifyContent: 'flex-end'}}>
						<div style={{background: C.signal, color: '#0B0D12', fontWeight: 600, fontSize: 16, padding: '10px 16px', borderRadius: '20px 20px 4px 20px'}}>did u see my post??</div>
					</div>
					<div style={{textAlign: 'right', fontSize: 13, color: C.muted, marginTop: 6, opacity: ramp(t, T.doubt + 0.6, T.doubt + 0.8)}}>Seen 1:47</div>
				</div>
			) : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:29 call

const CallScene: React.FC<{t: number}> = ({t}) => {
	const declined = t >= T.decline;
	const rings = beatsIn(T.call - 2, Math.min(t, T.decline) + 0.001).slice(-3);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg, #1B2340 0%, #0B0D12 70%)', fontFamily: UI_FONT, color: C.text}}>
			<div style={{position: 'absolute', top: 150, width: PHONE_W, textAlign: 'center'}}>
				<div style={{fontSize: 17, color: C.muted}}>{declined ? 'Call declined' : 'incoming call'}</div>
				<div style={{fontSize: 44, fontWeight: 700, marginTop: 6}}>Jess</div>
			</div>
			<div style={{position: 'absolute', top: 330, left: PHONE_W / 2 - 70, width: 140, height: 140}}>
				{!declined
					? rings.map((b) => {
							const k = ramp(t, b.t, b.t + 0.9, Easing.out(Easing.quad));
							return <div key={b.t} style={{position: 'absolute', left: -60 * k, top: -60 * k, width: 140 + 120 * k, height: 140 + 120 * k, borderRadius: '50%', border: `2px solid rgba(198,255,61,${0.6 * (1 - k)})`}} />;
						})
					: null}
				<div style={{width: 140, height: 140, borderRadius: 70, background: 'linear-gradient(135deg, #FF9E6B, #FF4D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 700, opacity: declined ? 0.4 : 1}}>J</div>
			</div>
			<div style={{position: 'absolute', bottom: 120, width: PHONE_W, display: 'flex', justifyContent: 'space-around', opacity: declined ? 1 - ramp(t, T.decline + 0.3, T.decline + 0.6) : 1}}>
				{[
					{c: '#FF3B30', l: 'Decline', r: 135},
					{c: '#30D158', l: 'Accept', r: 0},
				].map((b) => (
					<div key={b.l} style={{textAlign: 'center'}}>
						<div style={{width: 76, height: 76, borderRadius: 38, background: b.c, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<svg width="34" height="34" viewBox="0 0 24 24" style={{transform: `rotate(${b.r}deg)`}}>
								<path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.6 3.6a1 1 0 01-.25 1z" fill="#fff" />
							</svg>
						</div>
						<div style={{fontSize: 14, marginTop: 8}}>{b.l}</div>
					</div>
				))}
			</div>
			<Tap t={t} at={T.decline} x={PHONE_W / 4 + 4} y={PHONE_H - 120 - 60} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:33 texts

const TEXTS = [
	{from: 'Jess', body: 'where r u??', at: T.texts},
	{from: 'Sam', body: "we're literally right here 😂", at: T.texts + 1.15},
	{from: 'Kai', body: 'maya look up', at: T.texts + 2.3},
];

const MessagesScene: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: C.bg, fontFamily: UI_FONT, color: C.text}}>
		<div style={{position: 'absolute', top: 54, width: PHONE_W, textAlign: 'center', paddingBottom: 14, borderBottom: `1px solid ${C.surface2}`}}>
			<div style={{display: 'flex', justifyContent: 'center', marginBottom: 6}}>
				{['#FF9E6B', '#8B7BFF', '#3DFF8A', '#FFD27A'].map((c, i) => (
					<div key={c} style={{width: 34, height: 34, borderRadius: 17, background: c, marginLeft: i ? -10 : 0, border: `2px solid ${C.bg}`}} />
				))}
			</div>
			<div style={{fontSize: 16, fontWeight: 700}}>the gang 🪩</div>
		</div>
		<div style={{position: 'absolute', top: 200, left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 18}}>
			{TEXTS.map((m) => {
				if (t < m.at - 0.5) return null;
				const typing = t < m.at;
				const k = ramp(t, m.at, m.at + 0.25, springy);
				return (
					<div key={m.body}>
						<div style={{fontSize: 13, color: C.muted, marginLeft: 10, marginBottom: 4}}>{m.from}</div>
						<div style={{display: 'inline-block', background: C.surface2, borderRadius: '20px 20px 20px 4px', padding: typing ? '14px 18px' : '11px 16px', fontSize: 18, transform: `scale(${typing ? 1 : 0.85 + 0.15 * k})`, transformOrigin: 'left bottom'}}>
							{typing ? (
								<div style={{display: 'flex', gap: 5}}>
									{[0, 1, 2].map((i) => (
										<div key={i} style={{width: 8, height: 8, borderRadius: 4, background: C.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 8 - i))}} />
									))}
								</div>
							) : (
								m.body
							)}
						</div>
					</div>
				);
			})}
		</div>
	</AbsoluteFill>
);

// ---------------------------------------------------------------- 0:36 do not disturb

const Tile: React.FC<{label: string; active?: boolean; icon: React.ReactNode}> = ({label, active, icon}) => (
	<div style={{width: 176, height: 84, borderRadius: 24, background: active ? '#8B7BFF' : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', fontSize: 15, fontWeight: 600}}>
		{icon}
		{label}
	</div>
);

const DndScene: React.FC<{t: number}> = ({t}) => {
	const down = ramp(t, T.dnd, T.dnd + 0.35);
	const up = ramp(t, T.fly - 0.35, T.fly);
	const on = t >= T.dndTap;
	const quiet = ramp(t, T.dndTap, T.dndTap + 1.5);
	return (
		<AbsoluteFill style={{fontFamily: UI_FONT, color: C.text}}>
			<AbsoluteFill style={{filter: `blur(${14 * down * (1 - up)}px) saturate(${1 - 0.6 * quiet})`}}>
				<MessagesScene t={t} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: `rgba(8,9,14,${0.5 * down * (1 - up)})`}} />
			<div style={{position: 'absolute', top: 0, left: 0, width: PHONE_W, transform: `translateY(${-PHONE_H * (1 - down) - PHONE_H * up}px)`, padding: '110px 26px 0', display: 'flex', flexWrap: 'wrap', gap: 26}}>
				<Tile label="Wi-Fi" active icon={<div style={{width: 20, height: 20, borderRadius: 10, border: '3px solid #fff'}} />} />
				<Tile label="Flashlight" icon={<div style={{width: 10, height: 22, borderRadius: 3, background: '#fff'}} />} />
				<Tile label={on ? 'Do Not Disturb' : 'Focus'} active={on} icon={<Moon size={22} />} />
				<Tile label="Rotation" icon={<div style={{width: 18, height: 18, borderRadius: 4, border: '3px solid #fff'}} />} />
				<div style={{width: 378, height: 64, borderRadius: 24, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
					<div style={{width: '62%', height: '100%', background: 'rgba(255,255,255,0.85)'}} />
				</div>
				<Tap t={t} at={T.dndTap} x={26 + 88} y={110 + 84 + 26 + 42} />
			</div>
			{on ? (
				<div style={{position: 'absolute', top: 60, width: PHONE_W, display: 'flex', justifyContent: 'center', opacity: ramp(t, T.dndTap + 0.6, T.dndTap + 0.9) * (1 - up)}}>
					<div style={{display: 'flex', gap: 8, alignItems: 'center', background: '#8B7BFF', borderRadius: 18, padding: '8px 16px', fontWeight: 600, fontSize: 15}}>
						<Moon size={16} /> Do Not Disturb · On
					</div>
				</div>
			) : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 0:40 feed → tunnel

const USERS = ['kai.mp4', 'jess.wav', 'luna.jpeg', 'dev.zip', 'nia.gif', 'theo.exe', 'sam.png', 'rio.mov', 'zara.txt', 'ollie.pdf'];
const POST_H = 560;

const PostArt: React.FC<{i: number; t: number}> = ({i, t}) => {
	const id = FEED_IDS[i % FEED_IDS.length];
	if (getStaticFiles().some((f) => f.name.startsWith(`stills/${id}`))) return <Still id={id} small fallback={null} />;
	// procedural stand-in when the stills aren't downloaded
	const h1 = Math.floor(random(`h1${i}`) * 360);
	const h2 = (h1 + 60 + Math.floor(random(`h2${i}`) * 120)) % 360;
	const shape = i % 3;
	return (
		<AbsoluteFill style={{background: `linear-gradient(${Math.floor(random(`a${i}`) * 360)}deg, hsl(${h1} 70% 45%), hsl(${h2} 75% 30%))`}}>
			{shape === 0 ? <div style={{position: 'absolute', left: 90, top: 90, width: 250, height: 250, borderRadius: '50%', background: `hsl(${h2} 90% 70% / 0.5)`, filter: 'blur(10px)'}} /> : null}
			{shape === 1 ? <div style={{position: 'absolute', left: -40, right: -40, top: 260, height: 220, background: `hsl(${h1} 80% 15% / 0.7)`, transform: 'rotate(-8deg)'}} /> : null}
			{shape === 2 ? <FaceWorld t={t} /> : null}
		</AbsoluteFill>
	);
};

const Post: React.FC<{i: number; t: number; glow: number}> = ({i, t, glow}) => {
	const likes = 200 + Math.floor(random(`l${i}`) * 9000);
	return (
		<div style={{height: POST_H, padding: '0 0 18px', position: 'relative'}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 50}}>
				<div style={{width: 32, height: 32, borderRadius: 16, background: `hsl(${(i * 47) % 360} 60% 55%)`}} />
				<span style={{fontWeight: 700, fontSize: 15}}>{USERS[i % USERS.length]}</span>
			</div>
			<div style={{position: 'relative', height: 430, overflow: 'hidden', boxShadow: glow > 0.01 ? `0 0 ${40 * glow}px ${C.signal}` : undefined, outline: glow > 0.01 ? `${3 * glow}px solid ${C.signal}` : undefined}}>
				<PostArt i={i} t={t} />
				<AbsoluteFill style={{background: `rgba(255,255,255,${0.55 * glow})`}} />
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px'}}>
				<Heart size={24} color={C.pulse} />
				<span style={{fontWeight: 700, fontSize: 15}}>{likes.toLocaleString('en-GB')}</span>
			</div>
		</div>
	);
};

// Scroll position: a gentle lift, a hold through the break, then exponential acceleration.
const A = 2480;
const K = Math.log(15) / (T.fade - T.build);
const scrollAt = (t: number): number => {
	const lift = 320 * ramp(t, T.fly + 0.2, T.brk, Easing.inOut(Easing.cubic));
	if (t < T.build) return lift;
	const tt = Math.min(t, T.fade) - T.build;
	let s = lift + A * (Math.exp(K * tt) - 1);
	if (t > T.fade) s += 900 * (1 - Math.exp(-(t - T.fade) * 1.2)); // coasting while the screen dies
	return s;
};

const SpeedLines: React.FC<{t: number; amount: number}> = ({t, amount}) => {
	if (amount <= 0.01) return null;
	return (
		<svg viewBox={`0 0 ${PHONE_W} ${PHONE_H}`} style={{position: 'absolute', inset: 0, zIndex: 15}}>
			{Array.from({length: 26}).map((_, i) => {
				const ang = random(`sl${i}`) * Math.PI * 2;
				const ph = (t * (1.5 + 3 * amount) + random(`sp${i}`)) % 1;
				const r0 = 60 + ph * 520;
				const r1 = r0 + 40 + 160 * amount;
				const cx = PHONE_W / 2;
				const cy = PHONE_H / 2;
				return (
					<line key={i} x1={cx + Math.cos(ang) * r0} y1={cy + Math.sin(ang) * r0} x2={cx + Math.cos(ang) * r1} y2={cy + Math.sin(ang) * r1} stroke={C.signal} strokeWidth={1.5 + 2 * amount} strokeLinecap="round" opacity={amount * (1 - ph) * 0.8} />
				);
			})}
		</svg>
	);
};

const FeedScene: React.FC<{t: number}> = ({t}) => {
	const s = scrollAt(t);
	const tunnel = ramp(t, T.build + 2, T.fire, Easing.in(Easing.quad));
	const first = Math.max(0, Math.floor(s / POST_H) - 1);
	const sparking = t >= T.spark && t < T.fade;
	const beatGlow = sparking ? pulse(t, 0.11) : 0;
	const fire = ramp(t, T.fire, T.fire + 0.25, springy);
	const firePulse = t >= T.fire ? pulse(t, 0.16) : 0;
	const liftScale = 1 + 0.03 * ramp(t, T.fly, T.fly + 0.4) * (1 - ramp(t, T.build, T.build + 1));
	return (
		<AbsoluteFill style={{background: C.bg, fontFamily: UI_FONT, color: C.text, overflow: 'hidden'}}>
			<AbsoluteFill style={{perspective: 700, perspectiveOrigin: '50% 40%'}}>
				<div style={{position: 'absolute', top: 110, left: 0, width: PHONE_W, transform: `rotateX(${58 * tunnel}deg) scale(${liftScale * (1 + 0.25 * tunnel)})`, transformOrigin: '50% 0%'}}>
					{Array.from({length: 6}).map((_, k) => {
						const i = first + k;
						const y = i * POST_H - s;
						// the post nearest the middle of the screen flashes on each beat
						const centre = Math.abs(y + POST_H / 2 - 300) < POST_H / 2;
						return (
							<div key={i} style={{position: 'absolute', top: y, left: 0, width: PHONE_W}}>
								<Post i={i} t={t} glow={centre ? beatGlow : 0} />
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, rgba(11,13,18,0) 20%, rgba(11,13,18,${0.85 * tunnel}) 75%)`, zIndex: 12}} />
			<SpeedLines t={t} amount={tunnel} />
			<div style={{position: 'absolute', top: 0, left: 0, width: PHONE_W, height: 110, background: C.bg, zIndex: 20}} />
			<div style={{zIndex: 21, position: 'absolute', inset: 0, opacity: 1 - tunnel * 0.8}}>
				<TokTicHeader t={t} />
			</div>
			{t >= T.fire ? (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', zIndex: 30}}>
					<div style={{transform: `scale(${fire * (1 + 0.3 * firePulse)})`, filter: `drop-shadow(0 0 ${30 + 50 * firePulse}px ${C.pulse})`}}>
						<Heart size={260} color={C.pulse} />
					</div>
					<div style={{marginTop: 10, fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 700, color: C.pulse, opacity: fire}}>1%</div>
				</AbsoluteFill>
			) : null}
			{t >= T.brk && t < T.build + 0.3 ? <BreakModal t={t} /> : null}
		</AbsoluteFill>
	);
};

const BreakModal: React.FC<{t: number}> = ({t}) => {
	const tapped = t >= T.stayTap;
	return (
		<Modal t={t} at={T.brk} out={T.build}>
			{!tapped ? (
				<>
					<div style={{fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 700, color: C.pulse, lineHeight: 1}}>10%</div>
					<div style={{fontSize: 17, color: C.muted, margin: '10px 0 22px'}}>Stay connected?</div>
					<div style={{display: 'flex', gap: 12}}>
						<Button label="Close" />
						<Button label="Stay" primary pressed={ramp(t, T.stayTap - 0.15, T.stayTap)} />
					</div>
				</>
			) : (
				<div style={{height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
					<svg width="64" height="64" viewBox="0 0 50 50" style={{transform: `rotate(${(t - T.stayTap) * 540}deg)`}}>
						<circle cx="25" cy="25" r="20" fill="none" stroke={C.surface2} strokeWidth="5" />
						<path d="M25 5 A20 20 0 0 1 45 25" fill="none" stroke={C.signal} strokeWidth="5" strokeLinecap="round" />
					</svg>
					<div style={{fontSize: 16, color: C.muted}}>Staying connected…</div>
				</div>
			)}
			<Tap t={t} at={T.stayTap} x={250} y={150} />
		</Modal>
	);
};

// ---------------------------------------------------------------- 1:01 fade, 1:05 Clear!

export const Crack: React.FC<{t: number; at: number; x: number; y: number; scale?: number; seed: string; color?: string}> = ({t, at, x, y, scale = 1, seed, color = 'rgba(255,255,255,0.85)'}) => {
	if (t < at) return null;
	const grow = ramp(t, at, at + 0.18, Easing.out(Easing.quad));
	const lines: string[] = [];
	for (let i = 0; i < 11; i++) {
		const ang = (i / 11) * Math.PI * 2 + random(`${seed}a${i}`) * 0.5;
		let px = x;
		let py = y;
		let d = `M${px},${py}`;
		const len = (180 + random(`${seed}l${i}`) * 420) * scale;
		const segs = 5;
		for (let s = 1; s <= segs; s++) {
			const a = ang + (random(`${seed}j${i}-${s}`) - 0.5) * 0.7;
			px += (Math.cos(a) * len) / segs;
			py += (Math.sin(a) * len) / segs;
			d += ` L${px.toFixed(1)},${py.toFixed(1)}`;
		}
		lines.push(d);
	}
	return (
		<svg viewBox={`0 0 ${PHONE_W} ${PHONE_H}`} style={{position: 'absolute', inset: 0, zIndex: 60}}>
			{lines.map((d, i) => (
				<path key={i} d={d} fill="none" stroke={color} strokeWidth={i % 3 === 0 ? 2 : 1} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - grow} />
			))}
			{[30, 60, 95].map((r, i) => (
				<circle key={r} cx={x} cy={y} r={r * scale} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6} pathLength={1} strokeDasharray={`${0.12 + random(`${seed}r${i}`) * 0.2} 0.15`} strokeDashoffset={1 - grow} />
			))}
		</svg>
	);
};

/** The phone screen from 0:00 until the screen dies. */
const LiveScreen: React.FC<{t: number}> = ({t}) => {
	let scene: React.ReactNode;
	if (t < T.camera) scene = <LockScreen t={t} />;
	else if (t < T.likes) scene = <CameraScene t={t} />;
	else if (t < T.call) scene = <LikesScene t={t} />;
	else if (t < T.texts) scene = <CallScene t={t} />;
	else if (t < T.dnd) scene = <MessagesScene t={t} />;
	else if (t < T.fly) scene = <DndScene t={t} />;
	else scene = <FeedScene t={t} />;
	const showBar = !(t >= T.camera && t < T.likes);
	return (
		<AbsoluteFill>
			{scene}
			{showBar ? <StatusBar clock={clockAt(t)} pct={batteryAt(t)} dnd={t >= T.dndTap} /> : null}
		</AbsoluteFill>
	);
};

/** 0:00–1:24 screen content: live UI, the dying screen, then the dead glass. */
export const PhoneScreen: React.FC<{t: number}> = ({t}) => {
	if (t < T.clear) {
		const dim = ramp(t, T.fade, T.clear, Easing.in(Easing.quad));
		const glitching = t >= T.fade;
		const g = glitching ? pulse(t, 0.07) : 0;
		const jx = glitching ? (random(`gx${Math.floor(t * 30)}`) - 0.5) * 24 * g : 0;
		const flicker = glitching && random(`fl${Math.floor(t * 30)}`) < 0.12 + 0.3 * dim ? 0.25 : 0;
		return (
			<AbsoluteFill style={{background: '#000'}}>
				<AbsoluteFill
					style={{
						transform: `translateX(${jx}px)`,
						filter: `brightness(${1 - 0.8 * dim - flicker})${g > 0.05 ? ` drop-shadow(${6 * g}px 0 0 rgba(255,40,90,0.8)) drop-shadow(${-6 * g}px 0 0 rgba(60,200,255,0.8))` : ''}`,
					}}
				>
					<LiveScreen t={t} />
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}
	return <DeadScreen t={t} />;
};

/** One out-of-focus photo of the room, flipped on the beat (see flipAt), with a small punch on each cut. */
export const FlipPhoto: React.FC<{t: number; blur: number}> = ({t, blur}) => {
	const f = flipAt(t);
	if (!f) return null;
	const since = t - f.at;
	const scale = 1.08 + 0.06 * Math.exp(-since / 0.15) + 0.02 * since;
	return (
		<AbsoluteFill style={{filter: `blur(${blur}px)`, transform: `scale(${scale}) translateX(${(f.n % 2 ? 1 : -1) * 1.5}%)`}}>
			<Still id={f.id} small fallback={<PartyWorld t={t} />} />
		</AbsoluteFill>
	);
};

/** The screen after "Clear!": crack, 0%, black, her reflection, then the room leaking in. */
const DeadScreen: React.FC<{t: number}> = ({t}) => {
	const zeroBlink = t < T.clear + 0.25 || (t > T.clear + 0.4 && t < T.clear + 0.65);
	const flash = 1 - ramp(t, T.clear, T.clear + 0.12);
	const reflection = ramp(t, T.clear + 1.0, T.clear + 2.2);
	const party = ramp(t, T.rebuild, T.rebuild + 0.6);
	const face = t >= T.kickOut ? 1 : 0;
	const faceFocus = ramp(t, T.kickOut, T.kickOut + 1.6, Easing.out(Easing.cubic));
	const push = 1 + 0.1 * ramp(t, T.kickOut, T.drop, Easing.inOut(Easing.quad));
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{opacity: reflection * (1 - party)}}>
				<KenBurns t={t} start={T.clear} end={T.rebuild + 3} from={{scale: 1.18, x: 2}} to={{scale: 1.05, x: -2}}>
					<Still id="S6" fallback={<ReflectionWorld t={t} />} />
				</KenBurns>
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: party * (1 - face)}}>
				<FlipPhoto t={t} blur={keys(t, [T.rebuild, T.riser, T.kickOut], [18, 12, 7])} />
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: face, transform: `scale(${push})`, filter: `blur(${10 * (1 - faceFocus)}px)`}}>
				<Still id="S1" fallback={<FaceWorld t={t} lookUp={1} />} />
			</AbsoluteFill>
			{t < T.clear + 0.9 && zeroBlink ? (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 16}}>
					<Battery pct={0} size={4} showPct={false} />
					<div style={{fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 70, color: C.pulse}}>0%</div>
				</AbsoluteFill>
			) : null}
			<AbsoluteFill style={{background: '#fff', opacity: flash * 0.8}} />
			<Crack t={t} at={T.clear} x={262} y={430} seed="clear" />
		</AbsoluteFill>
	);
};
