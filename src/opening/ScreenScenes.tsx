import React from 'react';
import {AbsoluteFill, Easing, random} from 'remotion';
import {C, DISPLAY_FONT, PHONE_H, PHONE_W, UI_FONT} from '../theme';
import {BEATS, beatsIn, pulse} from '../timing';
import {Battery, Moon, StatusBar} from '../ui/StatusBar';
import {Notification, Notif} from '../ui/Notification';
import {TokTicLogo} from '../ui/TokTicLogo';
import {FaceWorld, Framed, KenBurns, LightsWorld, PartyWorld, ReflectionWorld, Still, stillFile, WIDE} from '../ui/Worlds';
import {keys, ramp} from '../util';
import {CAM, CAM_FADE_BLUR, CHAT, FEED_CARDS, FEED_IDS, FeedCard, KICK, POST, T, batteryAt, clockAt, flipAt} from './cues';

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
	{app: 'Messages', title: 'Jess', body: 'hello?? we can see you'},
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

/** C1's stand-in: the old gradient wallpaper. */
const GradientWallpaper: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: 'radial-gradient(circle at 30% 20%, #23264A 0%, #0B0D12 55%), #0B0D12'}}>
		<div style={{position: 'absolute', left: 180 + Math.sin(t * 0.4) * 30, top: 560, width: 380, height: 380, borderRadius: '50%', background: '#3B2A78', filter: 'blur(80px)', opacity: 0.55}} />
	</AbsoluteFill>
);

/**
 * C1 as the wallpaper: the four friends on Jess's front steps, a photo Maya took (upright, cover-cropped
 * 45 units off each side; their faces stack down the middle). It settles slowly; a scrim keeps the clock
 * and notifications readable.
 */
const Wallpaper: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: C.bg}}>
		<AbsoluteFill style={{transform: `scale(${1.06 - 0.06 * ramp(t, 0, T.camera, Easing.out(Easing.quad))})`, transformOrigin: '50% 40%'}}>
			<Still id="C1" fallback={<GradientWallpaper t={t} />} />
		</AbsoluteFill>
		<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,6,10,0.55) 0%, rgba(5,6,10,0.08) 30%, rgba(5,6,10,0.12) 70%, rgba(5,6,10,0.5) 100%)'}} />
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

/** The focus square. O1's and O2's Jess sit under it (screen centre, 43% down), and the zoom is centred on it. */
const FOCUS = {x: PHONE_W / 2, y: 400};
const VF_SCALE = 1.08; // headroom for the handheld shake

/** A whip pan (or tilt) between two viewfinder shots, centred on the beat: 0 → 1 over about 0.22 s. */
const whip = (t: number, at: number) => ramp(t, at - 0.1, at + 0.12, Easing.inOut(Easing.cubic));

/** Focus blur (phone units): soft after the whip, sharp on the tap, hunting, then stepping out as the voices fade. */
const camBlur = (t: number): number => {
	if (t < CAM.o2) return 1.5;
	if (t < CAM.o3) {
		let b = 3.5 - 2.9 * ramp(t, CAM.focus, CAM.focus + 0.25);
		if (t >= CAM.hunt) {
			const h = (t - CAM.hunt) / (CAM.o3 - CAM.hunt);
			b += 5 * Math.abs(Math.sin(h * Math.PI * 2.5)) * (1 - 0.4 * h);
		}
		return b;
	}
	if (t < CAM.o4) return 1.2;
	// O4 lands sharp, then steps out on each of the next four flips
	return CAM.fadeSteps.reduce((b, at, i) => b + (CAM_FADE_BLUR[i] - b) * ramp(t, at, at + 0.15), 0.3);
};

/** Two fingertips: spreading for a pinch-out (zoom in), closing for a pinch-in. */
const Pinch: React.FC<{t: number; at: number; closing?: boolean}> = ({t, at, closing}) => {
	if (t < at - 0.12 || t > at + 0.6) return null;
	const k = ramp(t, at, at + 0.4, Easing.inOut(Easing.cubic));
	const spread = closing ? 130 - 90 * k : 40 + 90 * k;
	const o = ramp(t, at - 0.12, at) * (1 - ramp(t, at + 0.4, at + 0.6));
	return (
		<>
			{[-1, 1].map((s) => (
				<div
					key={s}
					style={{position: 'absolute', left: FOCUS.x + s * spread * 0.7 - 22, top: FOCUS.y + 70 - s * spread * 0.7 - 22, width: 44, height: 44, borderRadius: 22, background: `rgba(255,255,255,${0.3 * o})`, border: `2px solid rgba(255,255,255,${0.6 * o})`}}
				/>
			))}
		</>
	);
};

const CameraScene: React.FC<{t: number}> = ({t}) => {
	const local = t - T.camera;
	const secs = Math.floor(local);
	const p = pulse(t, 0.15);
	const shakeX = Math.sin(t * 3.1) * 4 + Math.sin(t * 7.3) * 1.5;
	const shakeY = Math.cos(t * 2.7) * 4;
	// pinch to 2x onto Jess, back to 1x two flips later
	const zoom = 1 + ramp(t, CAM.pinch, CAM.pinch + 0.4, Easing.inOut(Easing.cubic)) - ramp(t, CAM.wide, CAM.wide + 0.35, Easing.inOut(Easing.cubic));
	const w1 = whip(t, CAM.o2); // O1 → O2: the camera pans right, so the picture slides left
	const tilt = whip(t, CAM.o3); // O2 → O3 "Bright lights": the camera tilts UP, so the picture slides DOWN
	const w2 = whip(t, CAM.o4); // O3 → O4 "voices fading": the camera pans back left, the picture slides right
	const W = PHONE_W * 1.1;
	const H = PHONE_H * 1.05;
	const shots = [
		{id: 'O1', x: -w1 * W, y: 0, on: t < CAM.o2 + 0.12, fallback: <PartyWorld t={t} seed="O1" />},
		{id: 'O2', x: (1 - w1) * W, y: tilt * H, on: w1 > 0 && t < CAM.o3 + 0.12, fallback: <PartyWorld t={t} seed="O2" />},
		{id: 'O3', x: w2 * W, y: -(1 - tilt) * H, on: tilt > 0 && t < CAM.o4 + 0.12, fallback: <LightsWorld t={t} />},
		{id: 'O4', x: -(1 - w2) * W, y: 0, on: w2 > 0, fallback: <PartyWorld t={t} seed="O4" />},
	];
	// directional motion blur on the whips and the tilt
	const mbX = 26 * (Math.sin(Math.PI * w1) + Math.sin(Math.PI * w2));
	const mbY = 26 * Math.sin(Math.PI * tilt);
	const moving = mbX + mbY > 0.5;
	// auto-exposure: blows out on the lights, pumps on the beat, then settles with a small dark overshoot
	const blow = ramp(t, CAM.blowout, CAM.blowout + 0.22, Easing.out(Easing.quad)) * (1 - ramp(t, CAM.settle, CAM.settle + 0.5, Easing.inOut(Easing.quad)));
	const dip = 0.25 * Math.sin(Math.PI * ramp(t, CAM.settle + 0.2, CAM.settle + 0.8, Easing.inOut(Easing.quad)));
	const exposure = 1 + 1.7 * blow + 0.2 * blow * pulse(t, 0.2) - dip;
	// focus square: breathes on the beat, snaps on the tap, wobbles while the focus hunts
	const tapK = t >= CAM.focus ? 1 - ramp(t, CAM.focus, CAM.focus + 0.22, Easing.out(Easing.cubic)) : 0;
	const huntK = t >= CAM.hunt && t < CAM.o3 ? 0.16 * Math.sin(((t - CAM.hunt) / (CAM.o3 - CAM.hunt)) * Math.PI * 5) : 0;
	const sq = 100 * (1 + 0.12 * p + 0.6 * tapK + huntK);
	const zoomLabel = zoom < 1.03 ? '1' : zoom > 1.97 ? '2' : zoom.toFixed(1);
	return (
		<AbsoluteFill style={{background: '#000', fontFamily: UI_FONT, color: C.text}}>
			<svg width={0} height={0} style={{position: 'absolute'}}>
				<filter id="vf-whip" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation={`${mbX.toFixed(2)} ${mbY.toFixed(2)}`} />
				</filter>
			</svg>
			<AbsoluteFill style={{filter: `${moving ? 'url(#vf-whip) ' : ''}blur(${camBlur(t).toFixed(2)}px) brightness(${exposure.toFixed(3)}) contrast(${1 - 0.2 * blow}) saturate(${1 - 0.35 * blow})`}}>
				{shots
					.filter((s) => s.on)
					.map((s) => (
						<AbsoluteFill key={s.id} style={{transform: `translate(${s.x + shakeX}px, ${s.y + shakeY}px) scale(${VF_SCALE * zoom})`, transformOrigin: `${FOCUS.x}px ${FOCUS.y}px`}}>
							<Still id={s.id} fallback={s.fallback} />
						</AbsoluteFill>
					))}
			</AbsoluteFill>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, rgba(255,248,235,${0.55 * blow}) 0%, rgba(255,248,235,0) 70%)`}} />
			<div style={{position: 'absolute', left: FOCUS.x - sq / 2, top: FOCUS.y - sq / 2, width: sq, height: sq, border: `2px solid ${C.signal}`, borderRadius: 6, opacity: (0.8 - 0.5 * ramp(t, T.mute, T.mute + 1)) * (1 - 0.6 * blow)}} />
			<Pinch t={t} at={CAM.pinch} />
			<Pinch t={t} at={CAM.wide} closing />
			<Tap t={t} at={CAM.focus} x={FOCUS.x} y={FOCUS.y} />
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
				<div style={{position: 'absolute', left: 54, top: 82, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: zoom > 1.03 ? C.signal : C.text}}>{zoomLabel}×</div>
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

const POST_TOP = 160;
const POST_H_CARD = 520;

/**
 * Her post as a 2-photo carousel: O5 (1/2), a swipe to O6 (2/2) on POST.swipe. Both are upright stills,
 * cover-cropped to the 430×520 card (it shows v 0.16–0.84), so her face sits in the card's upper half,
 * clear of the big lime digits.
 */
const PostCarousel: React.FC<{t: number}> = ({t}) => {
	const swipe = ramp(t, POST.swipe, POST.swipe + 0.32, Easing.out(Easing.cubic));
	const n = swipe > 0.5 ? 2 : 1;
	const finger = t > POST.swipe - 0.1 && t < POST.swipe + 0.4;
	const fk = ramp(t, POST.swipe - 0.1, POST.swipe + 0.3, Easing.inOut(Easing.quad));
	return (
		<div style={{position: 'absolute', top: POST_TOP, left: 0, width: PHONE_W, height: POST_H_CARD, overflow: 'hidden'}}>
			{POST.ids.map((id, i) => (
				<div key={id} style={{position: 'absolute', top: 0, left: (i - swipe) * PHONE_W, width: PHONE_W, height: POST_H_CARD, overflow: 'hidden'}}>
					<Still id={id} fallback={<FaceWorld t={t} lookUp={i * 0.4} />} />
				</div>
			))}
			<div style={{position: 'absolute', top: 12, right: 12, background: 'rgba(11,13,18,0.65)', borderRadius: 12, padding: '4px 10px', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{n}/2</div>
			{finger ? (
				<div style={{position: 'absolute', left: 330 - 220 * fk - 22, top: 300 - 22, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.3)', border: '2px solid rgba(255,255,255,0.6)', opacity: Math.sin(Math.PI * fk)}} />
			) : null}
		</div>
	);
};

const LikesScene: React.FC<{t: number}> = ({t}) => {
	const p = t < T.doubt ? pulse(t, 0.14) : 0;
	const dropping = t >= T.doubt;
	const big = t >= T.two ? '2' : t >= T.one ? '1' : null;
	const bigAt = t >= T.two ? T.two : T.one;
	const swiped = ramp(t, POST.swipe, POST.swipe + 0.32, Easing.out(Easing.cubic));
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
			<PostCarousel t={t} />
			<div style={{position: 'absolute', top: 696, left: 18, display: 'flex', alignItems: 'center', gap: 12}}>
				<div style={{transform: `scale(${1 + 0.35 * p})`}}>
					<Heart size={34} color={C.pulse} />
				</div>
				<span style={{fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dropping ? C.pulse : C.text}}>{likeCount(t)}</span>
				<span style={{fontSize: 16, color: C.muted, marginLeft: 4}}>likes</span>
			</div>
			{/* carousel dots */}
			<div style={{position: 'absolute', top: 709, left: PHONE_W / 2 - 13, display: 'flex', gap: 6}}>
				{[0, 1].map((i) => (
					<div key={i} style={{width: 7, height: 7, borderRadius: 4, background: Math.abs(i - swiped) < 0.5 ? C.signal : C.surface2}} />
				))}
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
							// '1' then '2' slam in full; the digits dim on POST.dim
							opacity: 1 - 0.6 * ramp(t, POST.dim, POST.dim + 0.2),
						}}
					>
						{big}
					</div>
				</AbsoluteFill>
			) : null}
			{t >= POST.sent ? (
				<div style={{position: 'absolute', left: 0, bottom: 0, width: PHONE_W, height: 150, background: C.surface, borderRadius: '24px 24px 0 0', transform: `translateY(${150 * (1 - ramp(t, POST.sent, POST.sent + 0.3))}px)`, padding: '20px 20px', zIndex: 25}}>
					<div style={{display: 'flex', justifyContent: 'flex-end'}}>
						<div style={{background: C.signal, color: '#0B0D12', fontWeight: 600, fontSize: 16, padding: '10px 16px', borderRadius: '20px 20px 4px 20px'}}>did u see my post??</div>
					</div>
					<div style={{textAlign: 'right', fontSize: 13, color: C.muted, marginTop: 6, opacity: ramp(t, POST.seen, POST.seen + 0.2)}}>Seen 1:47</div>
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

const TEXTS: {from: string; body: string; at: number; photo?: string}[] = [
	{from: 'Jess', body: 'where r u??', at: T.texts},
	{from: 'Sam', body: "we're literally right here 😂", at: T.texts + 1.15},
	{from: 'Kai', body: 'maya look up', at: CHAT.kai, photo: CHAT.kaiPhoto},
];

// Where Kai's photo bubble sits in the thread (below his text), so the full-screen photo grows out of it.
const KAI_THUMB = {x: 16, y: 434, w: 220, h: 294};

/**
 * Kai's photo of her (O7, upright): it arrives as a bubble with 'maya look up', opens to fill the screen on
 * CHAT.fill and keeps a slow push until the feed. Do Not Disturb then greys and blurs it with the thread.
 */
const KaiPhoto: React.FC<{t: number}> = ({t}) => {
	if (t < CHAT.fill) return null;
	const e = ramp(t, CHAT.fill, CHAT.fill + 0.3, Easing.out(Easing.cubic));
	// Tom: zoom past the friend in the foreground so Maya sits between Jess and Dev, who are talking.
	// The push pivots on Maya (u 0.52, v 0.45 in O7) and lands as the control centre drops.
	const push = (1 + 1.4 * ramp(t, CHAT.fill + 0.08, T.dnd - 0.03, Easing.inOut(Easing.cubic))) * (1 + 0.05 * ramp(t, T.dndTap, T.fly, Easing.linear));
	const chrome = ramp(t, CHAT.fill + 0.2, CHAT.fill + 0.4);
	return (
		<div
			style={{
				position: 'absolute',
				left: KAI_THUMB.x * (1 - e),
				top: KAI_THUMB.y * (1 - e),
				width: KAI_THUMB.w + (PHONE_W - KAI_THUMB.w) * e,
				height: KAI_THUMB.h + (PHONE_H - KAI_THUMB.h) * e,
				borderRadius: 18 * (1 - e),
				overflow: 'hidden',
				background: '#000',
				zIndex: 10,
			}}
		>
			<AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '52% 45%'}}>
				<Still id={CHAT.kaiPhoto} fallback={<FaceWorld t={t} />} />
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: chrome}}>
				<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(180deg, rgba(5,6,10,0.75), rgba(5,6,10,0))'}} />
				<div style={{position: 'absolute', top: 62, left: 20, display: 'flex', alignItems: 'center', gap: 10}}>
					<span style={{fontSize: 30, lineHeight: 1, fontWeight: 300}}>‹</span>
					<div style={{width: 30, height: 30, borderRadius: 15, background: '#8B7BFF'}} />
					<div>
						<div style={{fontSize: 15, fontWeight: 700}}>Kai</div>
						<div style={{fontSize: 12, color: '#C9CEDA'}}>now</div>
					</div>
				</div>
				<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 170, background: 'linear-gradient(0deg, rgba(5,6,10,0.8), rgba(5,6,10,0))'}} />
				<div style={{position: 'absolute', bottom: 58, left: 22, right: 22, fontSize: 20, fontWeight: 600}}>maya look up</div>
			</AbsoluteFill>
		</div>
	);
};

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
						{m.photo && !typing && t < CHAT.fill ? (
							<div style={{position: 'relative', width: KAI_THUMB.w, height: KAI_THUMB.h, marginTop: 6, borderRadius: 18, overflow: 'hidden', transform: `scale(${0.85 + 0.15 * k})`, transformOrigin: 'left top'}}>
								<Still id={m.photo} fallback={<FaceWorld t={t} />} />
							</div>
						) : null}
					</div>
				);
			})}
		</div>
		<KaiPhoto t={t} />
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
	const up = ramp(t, CHAT.lift, CHAT.lift + 0.35);
	const on = t >= T.dndTap;
	// the panel drop softens O7 and the thread a little; Do Not Disturb greys and blurs them,
	// and the world behind dims a step on each of the next two flips
	const quiet = ramp(t, T.dndTap, T.dndTap + 0.5);
	const dims = CHAT.dims.reduce((s, at) => s + ramp(t, at, at + 0.15), 0);
	return (
		<AbsoluteFill style={{fontFamily: UI_FONT, color: C.text}}>
			<AbsoluteFill style={{filter: `blur(${4 * down + 12 * quiet}px) saturate(${1 - 0.8 * quiet})`}}>
				<MessagesScene t={t} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: `rgba(8,9,14,${(0.4 * down + 0.15 * dims) * (1 - 0.5 * up)})`}} />
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

// Posts 0–5 are FEED_IDS (O8–O13), 6–9 the TokTic cards (FEED_CARDS), 10+ procedural cards with made-up handles.
const USERS = ['kai.mp4', 'jess.wav', 'luna.jpeg', 'dev.zip', 'nia.gif', 'theo.exe', 'sam.png', 'rio.mov', 'zara.txt'];
const HANDLES = ['ollie', 'mei', 'ash', 'noor', 'finn', 'lola', 'kofi', 'ivy', 'remy', 'tess', 'jun', 'priya', 'max', 'suki', 'omar', 'bea'];
const EXTS = ['.mp4', '.wav', '.jpeg', '.zip', '.gif', '.exe', '.png', '.mov', '.txt', '.pdf', '.raw', '.svg'];
const userAt = (i: number): string => USERS[i] ?? `${HANDLES[Math.floor(random(`hn${i}`) * HANDLES.length)]}${EXTS[Math.floor(random(`he${i}`) * EXTS.length)]}`;
const cardAt = (i: number): FeedCard | null => (i >= FEED_IDS.length ? (FEED_CARDS[i - FEED_IDS.length] ?? null) : null);
const POST_H = 560;

/** Post 6, sam.png: Sam is LIVE from the same room. */
const LiveArt: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill>
		<AbsoluteFill style={{filter: 'blur(4px)', transform: 'scale(1.1)'}}>
			<PartyWorld t={t} seed="live" />
		</AbsoluteFill>
		<div style={{position: 'absolute', left: 14, top: 14, display: 'flex', gap: 8, fontSize: 13, fontWeight: 800}}>
			<div style={{background: C.signal, color: '#0B0D12', padding: '4px 10px', borderRadius: 6, letterSpacing: 1}}>LIVE</div>
			<div style={{background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 6, fontWeight: 600}}>214 watching</div>
		</div>
		<div style={{position: 'absolute', left: 14, bottom: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14}}>
			{[
				['jess.wav', "where's maya 👀"],
				['kai.mp4', 'MAYA come dance'],
			].map(([u, c]) => (
				<div key={u} style={{background: 'rgba(0,0,0,0.45)', borderRadius: 14, padding: '6px 12px'}}>
					<b>{u}</b> {c}
				</div>
			))}
		</div>
	</AbsoluteFill>
);

/** Post 7, rio.mov: a text post. */
const TextArt: React.FC = () => (
	<AbsoluteFill style={{background: 'linear-gradient(150deg, #8B7BFF 0%, #3B2A78 100%)', padding: 38, justifyContent: 'center'}}>
		<div style={{fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 44, lineHeight: 1.08, letterSpacing: -1}}>who else is home scrolling rn 😭</div>
	</AbsoluteFill>
);

/** Post 8, zara.txt: a poll. */
const PollArt: React.FC = () => (
	<AbsoluteFill style={{background: C.surface, padding: 30, justifyContent: 'center', gap: 16}}>
		<div style={{fontSize: 28, fontWeight: 800, marginBottom: 8}}>best part of a party?</div>
		{[
			['the photos 📸', 71],
			['the people', 29],
		].map(([label, pct]) => (
			<div key={label} style={{position: 'relative', height: 58, borderRadius: 16, background: C.surface2, overflow: 'hidden'}}>
				<div style={{position: 'absolute', inset: 0, width: `${pct}%`, background: Number(pct) > 50 ? C.signal : '#3A4152'}} />
				<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', fontSize: 19, fontWeight: 700, color: Number(pct) > 50 ? '#0B0D12' : C.text}}>
					<span>{label}</span>
					<span>{pct}%</span>
				</div>
			</div>
		))}
		<div style={{fontSize: 14, color: C.muted}}>1,208 votes · 2h left</div>
	</AbsoluteFill>
);

/** Post 9: an ad for the app itself. */
const AdArt: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, #2C3A12 0%, ${C.bg} 70%)`, alignItems: 'center', justifyContent: 'center', gap: 22}}>
		<Battery pct={100} size={5} showPct={false} />
		<div style={{fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 40, letterSpacing: -1, textAlign: 'center', lineHeight: 1.05}}>
			Never miss
			<br />a moment.
		</div>
		<div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: C.muted}}>
			<TokTicLogo size={22} t={t} />
			<span>+ · 30 days free</span>
		</div>
		<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, background: C.signal, color: '#0B0D12', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', fontWeight: 800, fontSize: 16}}>
			<span>Get TokTic+</span>
			<span>›</span>
		</div>
	</AbsoluteFill>
);

/** A feed photo, or a TokTic card, or (post 10 on, and any O photo not generated yet) a procedural card. */
const PostArt: React.FC<{i: number; t: number}> = ({i, t}) => {
	const id = FEED_IDS[i];
	if (id) return <Still id={id} small fallback={<CardArt i={i} t={t} />} />;
	const card = cardAt(i);
	if (card === 'live') return <LiveArt t={t} />;
	if (card === 'text') return <TextArt />;
	if (card === 'poll') return <PollArt />;
	if (card === 'ad') return <AdArt t={t} />;
	return <CardArt i={i} t={t} />;
};

/** Procedural post card: a gradient with one bold shape. */
const CardArt: React.FC<{i: number; t: number}> = ({i, t}) => {
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
	const card = cardAt(i);
	return (
		<div style={{height: POST_H, padding: '0 0 18px', position: 'relative'}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 50}}>
				<div style={{width: 32, height: 32, borderRadius: 16, background: card === 'ad' ? C.signal : `hsl(${(i * 47) % 360} 60% 55%)`, boxShadow: card === 'live' ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.signal}` : undefined}} />
				<span style={{fontWeight: 700, fontSize: 15}}>{card === 'ad' ? 'TokTic+' : userAt(i)}</span>
				{card === 'ad' ? <span style={{color: C.muted, fontSize: 13}}>Sponsored</span> : null}
				{card === 'live' ? <span style={{color: C.signal, fontSize: 12, fontWeight: 800, letterSpacing: 1}}>LIVE</span> : null}
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

/**
 * The photo of the room at t (see GLANCES in cues.ts), in a w×h box. A rebuild glance lands on its photo's
 * left half (u 0.32) and pans to the right half (u 0.68) on its second flip, her head turning, so each wide
 * photo gives two framings and is never shown again; a riser flip holds the centre; the last riser beat is
 * a white flash. `room` is the full-frame copy behind the phone: a wider crop and a smaller pan, the same way.
 */
export const FlipPhoto: React.FC<{t: number; blur: number; w: number; h: number; room?: boolean}> = ({t, blur, w, h, room = false}) => {
	const g = flipAt(t);
	if (!g) return null;
	const since = t - g.at;
	if (g.id === null) {
		return (
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, #3A1C12 0%, #050304 70%)'}}>
				<AbsoluteFill style={{background: '#fff', opacity: (room ? 0.6 : 1) * Math.exp(-since / 0.16)}} />
			</AbsoluteFill>
		);
	}
	const turn = g.turnAt === null ? 0 : ramp(t, g.turnAt - 0.08, g.turnAt + 0.18, Easing.inOut(Easing.cubic));
	const sinceTurn = g.turnAt !== null && t >= g.turnAt ? t - g.turnAt : Infinity;
	const drift = 0.02 * (since / (g.end - g.at));
	const punch = 0.06 * Math.exp(-since / 0.15) + 0.03 * Math.exp(-sinceTurn / 0.15);
	const u = g.turnAt === null ? 0.5 : room ? 0.4 + 0.2 * turn + drift : 0.32 + 0.36 * turn + drift;
	const zoom = room ? 1.2 + 0.5 * punch + 0.01 * since : 1.08 + punch + 0.02 * since;
	return (
		<AbsoluteFill style={{filter: blur > 0 ? `blur(${blur}px)` : undefined}}>
			<Framed w={w} h={h} aspect={WIDE} u={u} zoom={zoom}>
				<Still id={g.id} small label={false} fallback={<PartyWorld t={t} seed={g.id} />} />
			</Framed>
			{!room && !stillFile(g.id, true) ? (
				<div style={{position: 'absolute', right: 14, bottom: 12, fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.45)'}}>
					{g.id} stand-in{g.turnAt === null ? '' : t < g.turnAt ? ' · left' : ' · right'}
				</div>
			) : null}
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
	// O27 hard-cuts in, blur 10 → 0, sharp on the bar-44 downbeat; the push runs to the drop
	const faceFocus = ramp(t, T.kickOut, KICK.sharp, Easing.out(Easing.cubic));
	const push = 1 + 0.1 * ramp(t, T.kickOut, T.drop, Easing.inOut(Easing.quad));
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{/* O14: her faint face in the black glass, upright; eyes at x 35–50%, y 30–40%, clear of the crack */}
			<AbsoluteFill style={{opacity: reflection * (1 - party)}}>
				<KenBurns t={t} start={T.clear} end={T.rebuild + 3} from={{scale: 1.18, x: 2}} to={{scale: 1.05, x: -2}}>
					<Still id="O14" fallback={<ReflectionWorld t={t} />} />
				</KenBurns>
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: party * (1 - face)}}>
				<FlipPhoto t={t} w={PHONE_W} h={PHONE_H} blur={keys(t, [T.rebuild, T.riser, T.kickOut], [18, 12, 7])} />
			</AbsoluteFill>
			{/* O27, upright: eyes 38–42% down at x 40–55%, left of the crack centre (61%, 46%) */}
			<AbsoluteFill style={{opacity: face, transform: `scale(${push})`, filter: `blur(${10 * (1 - faceFocus)}px)`}}>
				<Still id="O27" fallback={<FaceWorld t={t} lookUp={1} />} />
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
